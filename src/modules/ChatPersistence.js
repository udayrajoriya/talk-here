const { app } = require('electron');
const path = require('path');
const fs = require('fs').promises;

/**
 * Handles chat persistence operations
 */
class ChatPersistence {
  constructor() {
    this.chatsFilePath = this.getChatsFilePath();
  }

  getChatsFilePath() {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'chats.json');
  }

  async loadChatsFromFile() {
    try {
      const data = await fs.readFile(this.chatsFilePath, 'utf8');
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

  async saveChatsToFile(chatsData) {
    try {
      // Ensure the directory exists
      await fs.mkdir(path.dirname(this.chatsFilePath), { recursive: true });
      
      // Add metadata
      const dataToSave = {
        chats: chatsData.chats || [],
        version: '1.0',
        lastUpdated: new Date().toISOString()
      };
      
      await fs.writeFile(this.chatsFilePath, JSON.stringify(dataToSave, null, 2), 'utf8');
      console.log('Chats saved successfully to:', this.chatsFilePath);
    } catch (error) {
      console.error('Error saving chats:', error);
      throw error;
    }
  }

  async saveChat(chatData) {
    try {
      // Load existing chats
      const existingData = await this.loadChatsFromFile();
      
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
      
      await this.saveChatsToFile(existingData);
      return { success: true };
    } catch (error) {
      console.error('Failed to save chat:', error);
      return { success: false, error: error.message };
    }
  }

  async loadChats() {
    try {
      const data = await this.loadChatsFromFile();
      
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
  }

  async deleteChat(chatId) {
    try {
      const existingData = await this.loadChatsFromFile();
      
      // Filter out the chat to delete
      existingData.chats = existingData.chats.filter(chat => chat.id !== chatId);
      
      await this.saveChatsToFile(existingData);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete chat:', error);
      return { success: false, error: error.message };
    }
  }

  async clearAllChats() {
    try {
      await this.saveChatsToFile({ chats: [] });
      return { success: true };
    } catch (error) {
      console.error('Failed to clear chats:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ChatPersistence;