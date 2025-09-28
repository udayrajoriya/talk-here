/**
 * Handles chat management including creation, switching, saving, and deletion
 */
class ChatManager {
    constructor(messageManager, sidebarManager) {
        this.messageManager = messageManager;
        this.sidebarManager = sidebarManager;
        
        this.currentChatId = null;
        this.chats = new Map();
        
        this.chatTitle = document.getElementById('chatTitle');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.clearChatBtn = document.getElementById('clearChatBtn');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // New chat button
        this.newChatBtn.addEventListener('click', () => this.createNewChat());

        // Clear all chats button
        this.clearAllBtn.addEventListener('click', () => this.clearAllChats());

        // Clear chat button
        this.clearChatBtn.addEventListener('click', () => this.clearCurrentChat());
    }

    async loadChats() {
        try {
            const result = await window.electronAPI.loadChats();
            if (result.success) {
                result.chats.forEach(chat => {
                    this.chats.set(chat.id, chat);
                    this.sidebarManager.addChatToSidebar(chat);
                });
            }
        } catch (error) {
            console.error('Failed to load chats:', error);
        }
    }

    createNewChat() {
        const chatId = this.generateChatId();
        const chat = {
            id: chatId,
            title: 'New Chat',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.chats.set(chatId, chat);
        this.currentChatId = chatId;
        this.sidebarManager.addChatToSidebar(chat);
        this.switchToChat(chatId);
        this.messageManager.clearMessages();
        this.messageManager.showWelcomeMessage();
    }

    generateChatId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    switchToChat(chatId) {
        // Update active chat in sidebar
        this.sidebarManager.setActiveChat(chatId);

        this.currentChatId = chatId;
        const chat = this.chats.get(chatId);
        
        if (chat) {
            this.chatTitle.textContent = chat.title;
            this.messageManager.displayMessages(chat.messages);
        }
    }

    getCurrentChat() {
        return this.chats.get(this.currentChatId);
    }

    addMessageToCurrentChat(role, content) {
        const chat = this.getCurrentChat();
        if (chat) {
            const message = { role, content };
            chat.messages.push(message);
            return message;
        }
        return null;
    }

    updateChatTitle(chatId, title) {
        const chat = this.chats.get(chatId);
        if (chat) {
            chat.title = title;
            this.chatTitle.textContent = title;
            this.sidebarManager.updateChatInSidebar(chat);
        }
    }

    async saveChat(chat) {
        try {
            await window.electronAPI.saveChat(chat);
        } catch (error) {
            console.error('Failed to save chat:', error);
        }
    }

    async deleteChat(chatId) {
        if (!confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
            return;
        }

        try {
            const result = await window.electronAPI.deleteChat(chatId);
            if (result.success) {
                // Remove from local state
                this.chats.delete(chatId);
                
                // Remove from sidebar
                this.sidebarManager.removeChatFromSidebar(chatId);
                
                // If this was the current chat, create a new one
                if (this.currentChatId === chatId) {
                    this.createNewChat();
                }
            } else {
                this.messageManager.showError('Failed to delete chat: ' + result.error);
            }
        } catch (error) {
            console.error('Failed to delete chat:', error);
            this.messageManager.showError('Failed to delete chat');
        }
    }

    async clearAllChats() {
        if (!confirm('Are you sure you want to delete all chats? This action cannot be undone.')) {
            return;
        }

        try {
            const result = await window.electronAPI.clearAllChats();
            if (result.success) {
                // Clear local state
                this.chats.clear();
                
                // Clear sidebar
                this.sidebarManager.clearSidebar();
                
                // Create a new chat
                this.createNewChat();
            } else {
                this.messageManager.showError('Failed to clear chats: ' + result.error);
            }
        } catch (error) {
            console.error('Failed to clear all chats:', error);
            this.messageManager.showError('Failed to clear all chats');
        }
    }

    clearCurrentChat() {
        if (this.currentChatId) {
            const chat = this.chats.get(this.currentChatId);
            if (chat) {
                chat.messages = [];
                this.messageManager.clearMessages();
                this.messageManager.showWelcomeMessage();
                this.sidebarManager.updateChatInSidebar(chat);
                this.saveChat(chat);
            }
        }
    }
}

export { ChatManager as default };