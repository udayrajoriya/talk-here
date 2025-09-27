const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Ollama API methods
  ollamaChatStream: (data) => ipcRenderer.invoke('ollama-chat-stream', data),
  ollamaStopStream: (data) => ipcRenderer.invoke('ollama-stop-stream', data),
  ollamaModels: () => ipcRenderer.invoke('ollama-models'),
  
  // Streaming event listeners
  onStreamChunk: (callback) => ipcRenderer.on('ollama-stream-chunk', callback),
  removeStreamListener: () => ipcRenderer.removeAllListeners('ollama-stream-chunk'),
  
  // Chat persistence methods
  saveChat: (chatData) => ipcRenderer.invoke('save-chat', chatData),
  loadChats: () => ipcRenderer.invoke('load-chats'),
  deleteChat: (chatId) => ipcRenderer.invoke('delete-chat', chatId),
  clearAllChats: () => ipcRenderer.invoke('clear-all-chats')
});