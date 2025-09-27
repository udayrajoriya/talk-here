const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    show: false,
    backgroundColor: '#1a1a1a'
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Store active streams for abortion
const activeStreams = new Map();

// Chat persistence helpers
function getChatsFilePath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'chats.json');
}

async function loadChatsFromFile() {
  try {
    const filePath = getChatsFilePath();
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist yet, return empty structure
      return { chats: [], version: '1.0' };
    }
    console.error('Error loading chats:', error);
    return { chats: [], version: '1.0' };
  }
}

async function saveChatsToFile(chatsData) {
  try {
    const filePath = getChatsFilePath();
    // Ensure the directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Add metadata
    const dataToSave = {
      chats: chatsData.chats || [],
      version: '1.0',
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2), 'utf8');
    console.log('Chats saved successfully to:', filePath);
  } catch (error) {
    console.error('Error saving chats:', error);
    throw error;
  }
}

// IPC handlers for Ollama integration
ipcMain.handle('ollama-chat-stream', async (event, { model, messages, streamId }) => {
  try {
    const controller = new AbortController();
    activeStreams.set(streamId, controller);

    const response = await axios.post('http://127.0.0.1:11434/api/chat', {
      model: model || 'llama2',
      messages: messages,
      stream: true
    }, {
      responseType: 'stream',
      signal: controller.signal
    });

    let fullContent = '';
    let isAborted = false;
    let streamTimeout = null;
    
    response.data.on('data', (chunk) => {
      if (isAborted) return;
      
      const lines = chunk.toString().split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          // console.log('Ollama response:', data); // Debug log
          if (data.message && data.message.content) {
            fullContent += data.message.content;
            
            // Reset timeout on each chunk
            if (streamTimeout) clearTimeout(streamTimeout);
            streamTimeout = setTimeout(() => {
              console.log('Stream timeout - forcing completion');
              if (!isAborted) {
                event.sender.send('ollama-stream-chunk', {
                  content: '',
                  fullContent: fullContent,
                  done: true,
                  streamId: streamId
                });
              }
            }, 2000); // 2 second timeout
            
            // Send streaming chunk to renderer
            event.sender.send('ollama-stream-chunk', {
              content: data.message.content,
              fullContent: fullContent,
              done: data.done || false,
              streamId: streamId
            });
          } else if (data.done) {
            // Handle case where done=true but no content
            console.log('Stream done signal received'); // Debug log
            if (streamTimeout) clearTimeout(streamTimeout);
            event.sender.send('ollama-stream-chunk', {
              content: '',
              fullContent: fullContent,
              done: true,
              streamId: streamId
            });
          }
        } catch (parseError) {
          // Ignore JSON parse errors for incomplete chunks
        }
      }
    });

    return new Promise((resolve, reject) => {
      response.data.on('end', () => {
        console.log('Stream ended, sending final done signal'); // Debug log
        if (streamTimeout) clearTimeout(streamTimeout);
        activeStreams.delete(streamId);
        if (!isAborted) {
          // Send final done signal to frontend
          event.sender.send('ollama-stream-chunk', {
            content: '',
            fullContent: fullContent,
            done: true,
            streamId: streamId
          });
          resolve({ success: true, content: fullContent });
        }
      });
      
      response.data.on('error', (error) => {
        if (streamTimeout) clearTimeout(streamTimeout);
        activeStreams.delete(streamId);
        if (error.code === 'ECONNABORTED' || isAborted) {
          resolve({ success: true, content: fullContent, aborted: true });
        } else {
          console.error('Stream error:', error);
          reject({ success: false, error: error.message });
        }
      });

      // Handle abortion
      controller.signal.addEventListener('abort', () => {
        isAborted = true;
        if (streamTimeout) clearTimeout(streamTimeout);
        activeStreams.delete(streamId);
        event.sender.send('ollama-stream-chunk', {
          content: '',
          fullContent: fullContent,
          done: true,
          aborted: true,
          streamId: streamId
        });
        resolve({ success: true, content: fullContent, aborted: true });
      });
    });

  } catch (error) {
    activeStreams.delete(streamId);
    console.error('Ollama API error:', error);
    return { 
      success: false, 
      error: error.response?.data?.error || error.message || 'Failed to connect to Ollama'
    };
  }
});

ipcMain.handle('ollama-stop-stream', async (event, { streamId }) => {
  const controller = activeStreams.get(streamId);
  if (controller) {
    controller.abort();
    activeStreams.delete(streamId);
    return { success: true };
  }
  return { success: false, error: 'Stream not found' };
});

ipcMain.handle('ollama-models', async () => {
  try {
    const response = await axios.get('http://127.0.0.1:11434/api/tags');
    return { success: true, models: response.data.models || [] };
  } catch (error) {
    console.error('Failed to fetch models:', error);
    return { 
      success: false, 
      error: 'Failed to fetch available models. Make sure Ollama is running.'
    };
  }
});

ipcMain.handle('save-chat', async (event, chatData) => {
  try {
    // Load existing chats
    const existingData = await loadChatsFromFile();
    
    // Find and update existing chat or add new one
    const chatIndex = existingData.chats.findIndex(chat => chat.id === chatData.id);
    
    if (chatIndex >= 0) {
      // Update existing chat
      existingData.chats[chatIndex] = {
        ...chatData,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Add new chat
      existingData.chats.unshift({
        ...chatData,
        createdAt: chatData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    // Keep only the most recent 100 chats to prevent file from getting too large
    if (existingData.chats.length > 100) {
      existingData.chats = existingData.chats.slice(0, 100);
    }
    
    await saveChatsToFile(existingData);
    return { success: true };
  } catch (error) {
    console.error('Failed to save chat:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-chats', async () => {
  try {
    const data = await loadChatsFromFile();
    
    // Sort chats by most recently updated
    const sortedChats = data.chats.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0);
      const dateB = new Date(b.updatedAt || b.createdAt || 0);
      return dateB - dateA;
    });
    
    return { success: true, chats: sortedChats };
  } catch (error) {
    console.error('Failed to load chats:', error);
    return { success: false, error: error.message, chats: [] };
  }
});

ipcMain.handle('delete-chat', async (event, chatId) => {
  try {
    const existingData = await loadChatsFromFile();
    
    // Filter out the chat to delete
    existingData.chats = existingData.chats.filter(chat => chat.id !== chatId);
    
    await saveChatsToFile(existingData);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete chat:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clear-all-chats', async () => {
  try {
    await saveChatsToFile({ chats: [] });
    return { success: true };
  } catch (error) {
    console.error('Failed to clear chats:', error);
    return { success: false, error: error.message };
  }
});