const { app, BrowserWindow } = require('electron');

// Import our modular components
const WindowManager = require('./modules/WindowManager');
const OllamaService = require('./modules/OllamaService');
const ChatPersistence = require('./modules/ChatPersistence');
const IPCHandlers = require('./modules/IPCHandlers');

// Initialize services
const windowManager = new WindowManager();
const ollamaService = new OllamaService();
const chatPersistence = new ChatPersistence();

// Set up IPC handlers
const ipcHandlers = new IPCHandlers(ollamaService, chatPersistence);

// App event handlers
app.whenReady().then(() => {
  windowManager.createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager.createWindow();
  }
});