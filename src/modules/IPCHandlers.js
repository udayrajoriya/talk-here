const { ipcMain } = require('electron');

/**
 * Sets up IPC handlers for communication between main and renderer processes
 */
class IPCHandlers {
  constructor(ollamaService, chatPersistence) {
    this.ollamaService = ollamaService;
    this.chatPersistence = chatPersistence;
    this.setupHandlers();
  }

  setupHandlers() {
    // Ollama-related handlers
    ipcMain.handle('ollama-chat-stream', async (event, data) => {
      return await this.ollamaService.startChatStream(event, data);
    });

    ipcMain.handle('ollama-stop-stream', async (event, { streamId }) => {
      return this.ollamaService.stopStream(streamId);
    });

    ipcMain.handle('ollama-models', async () => {
      return await this.ollamaService.getModels();
    });

    // Chat persistence handlers
    ipcMain.handle('save-chat', async (event, chatData) => {
      return await this.chatPersistence.saveChat(chatData);
    });

    ipcMain.handle('load-chats', async () => {
      return await this.chatPersistence.loadChats();
    });

    ipcMain.handle('delete-chat', async (event, chatId) => {
      return await this.chatPersistence.deleteChat(chatId);
    });

    ipcMain.handle('clear-all-chats', async () => {
      return await this.chatPersistence.clearAllChats();
    });
  }
}

module.exports = IPCHandlers;