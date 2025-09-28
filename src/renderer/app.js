// Import component modules
import SidebarManager from './components/SidebarManager.js';
import MessageManager from './components/MessageManager.js';
import InputManager from './components/InputManager.js';
import StreamingManager from './components/StreamingManager.js';
import ChatManager from './components/ChatManager.js';
import ModelManager from './components/ModelManager.js';
import ConfigManager from './components/ConfigManager.js';

/**
 * Main application class that orchestrates all components
 */
class ChatApp {
    constructor() {
        this.isLoading = false;
        
        this.initializeComponents();
        this.setupApplication();
    }

    initializeComponents() {
        // Initialize core components
        this.messageManager = new MessageManager();
        this.modelManager = new ModelManager();
        this.configManager = new ConfigManager();
        
        // Make config manager available globally for debugging
        window.debugConfig = this.configManager;
        
        // Initialize chat manager (needs message manager)
        this.chatManager = new ChatManager(this.messageManager, null); // sidebar manager will be set later
        
        // Initialize sidebar manager (needs chat manager)
        this.sidebarManager = new SidebarManager(this.chatManager);
        
        // Set the sidebar manager reference in chat manager
        this.chatManager.sidebarManager = this.sidebarManager;
        
        // Initialize input manager
        this.inputManager = new InputManager(
            () => this.sendMessage(),
            () => this.stopCurrentStream()
        );
        
        // Initialize streaming manager
        this.streamingManager = new StreamingManager(this.messageManager, this.inputManager);
        
        // Other UI elements
        this.loadingOverlay = document.getElementById('loadingOverlay');
    }

    async setupApplication() {
        // Load initial data
        await this.modelManager.loadModels();
        await this.chatManager.loadChats();
        
        // Create initial chat if none exist
        if (this.chatManager.chats.size === 0) {
            this.chatManager.createNewChat();
        }
    }

    async sendMessage() {
        const content = this.inputManager.getValue();
        if (!content || this.isLoading || this.streamingManager.getIsStreaming()) return;

        if (!this.modelManager.hasModel()) {
            this.messageManager.showError('Please select a model first');
            return;
        }

        const chat = this.chatManager.getCurrentChat();
        if (!chat) return;

        // Add user message
        this.chatManager.addMessageToCurrentChat('user', content);
        this.messageManager.addMessage('user', content);

        // Clear input
        this.inputManager.clearInput();

        // Create assistant message placeholder
        const assistantMessage = this.chatManager.addMessageToCurrentChat('assistant', '');

        // Prepare messages for API (exclude the empty assistant message we just added)
        const messages = chat.messages.slice(0, -1).map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        // Start streaming
        await this.streamingManager.startStreaming(
            this.modelManager.getCurrentModel(),
            messages,
            (fullContent, aborted) => {
                // Update the assistant message with final content
                assistantMessage.content = fullContent;
                
                if (!aborted) {
                    // Update chat title if this is the first message
                    if (chat.messages.length === 2) { // First user message + first assistant response
                        const title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
                        this.chatManager.updateChatTitle(chat.id, title);
                    }
                    
                    // Save chat
                    this.chatManager.saveChat(chat);
                }
            },
            (error) => {
                // Remove the empty assistant message on error
                chat.messages.pop();
                this.messageManager.showError(error);
            }
        );
    }

    async stopCurrentStream() {
        await this.streamingManager.stopCurrentStream();
    }

    setLoading(loading, showOverlay = true) {
        this.isLoading = loading;
        this.inputManager.setLoading(loading);
        
        if (showOverlay) {
            if (loading) {
                this.loadingOverlay.classList.add('show');
            } else {
                this.loadingOverlay.classList.remove('show');
            }
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});