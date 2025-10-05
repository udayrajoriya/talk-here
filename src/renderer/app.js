// Import component modules
import SidebarManager from './components/SidebarManager.js';
import MessageManager from './components/MessageManager.js';
import InputManager from './components/InputManager.js';
import StreamingManager from './components/StreamingManager.js';
import ChatManager from './components/ChatManager.js';
import ModelManager from './components/ModelManager.js';
import ConfigManager from './components/ConfigManager.js';
import AttachmentManager from './components/AttachmentManager.js';

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
        this.attachmentManager = new AttachmentManager();
        
        // Make config manager available globally for debugging
        window.debugConfig = this.configManager;
        
        // Make attachment manager available globally for debugging
        window.debugAttachments = this.attachmentManager;
        
        // Initialize chat manager (needs message manager)
        this.chatManager = new ChatManager(this.messageManager, null); // sidebar manager will be set later
        
        // Initialize sidebar manager (needs chat manager)
        this.sidebarManager = new SidebarManager(this.chatManager);
        
        // Set the sidebar manager reference in chat manager
        this.chatManager.sidebarManager = this.sidebarManager;
        
        // Initialize input manager with attachment manager
        this.inputManager = new InputManager(
            () => this.sendMessage(),
            () => this.stopCurrentStream(),
            this.attachmentManager
        );
        
        // Set up attachment manager callback to refresh send button
        this.attachmentManager.updateCallback = () => {
            this.inputManager.refreshSendButton();
        };
        
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
        const hasAttachments = this.attachmentManager.hasAttachments();
        
        if (!content && !hasAttachments) return;
        if (this.isLoading || this.streamingManager.getIsStreaming()) return;

        if (!this.modelManager.hasModel()) {
            this.messageManager.showError('Please select a model first');
            return;
        }

        const chat = this.chatManager.getCurrentChat();
        if (!chat) return;

        // Get attachments data
        let attachments = null;
        if (hasAttachments) {
            try {
                attachments = await this.attachmentManager.getAttachmentsForAPI();
            } catch (error) {
                console.error('Failed to process attachments:', error);
                this.messageManager.showError('Failed to process attachments');
                return;
            }
        }

        // Create message object with attachments
        const messageContent = {
            text: content,
            attachments: attachments
        };

        // Add user message (store full message object for attachments)
        this.chatManager.addMessageToCurrentChat('user', content, attachments);
        this.messageManager.addMessage('user', content, true, attachments);

        // Clear input and attachments
        this.inputManager.clearInput();

        // Create assistant message placeholder
        const assistantMessage = this.chatManager.addMessageToCurrentChat('assistant', '');

        // Prepare messages for API - convert to Ollama format
        const messages = chat.messages.slice(0, -1).map(msg => {
            let messageContent = msg.content;
            const apiMessage = {
                role: msg.role,
                content: messageContent
            };
            
            // Handle attachments if present
            if (msg.attachments && msg.attachments.length > 0) {
                // Handle images for vision models
                const images = msg.attachments
                    .filter(att => att.isImage)
                    .map(att => att.data);
                
                if (images.length > 0) {
                    apiMessage.images = images;
                }
                
                // Handle text-based documents by including their content
                const textDocuments = msg.attachments.filter(att => !att.isImage);
                if (textDocuments.length > 0) {
                    const documentContents = textDocuments.map(doc => {
                        console.log(`Processing document: ${doc.name}, type: ${doc.type}`);
                        // Decode base64 content for text files
                        try {
                            const decodedContent = atob(doc.data);
                            // Check if it's readable text
                            if (this.isTextFile(doc.type)) {
                                return `\n\n--- Document: ${doc.name} ---\n${decodedContent}\n--- End of Document ---\n`;
                            } else {
                                return `\n\n--- Binary Document: ${doc.name} (${doc.type}, ${this.formatFileSize(doc.size)}) attached ---\nNote: This is a binary file and its content cannot be directly read as text.\n`;
                            }
                        } catch (error) {
                            console.warn(`Could not decode document ${doc.name}:`, error);
                            return `\n\n--- Document: ${doc.name} (${doc.type}, ${this.formatFileSize(doc.size)}) attached ---\n`;
                        }
                    }).join('');
                    
                    // Append document contents to the message
                    apiMessage.content = messageContent + documentContents;
                }
            }
            
            return apiMessage;
        });

        // Add current message with attachments
        const currentMessage = {
            role: 'user',
            content: content
        };
        
        console.log('Processing current message with attachments:', attachments);
        
        // Handle current message attachments
        if (attachments && attachments.length > 0) {
            // Handle images for vision models
            const images = attachments
                .filter(att => att.isImage)
                .map(att => att.data);
            
            if (images.length > 0) {
                currentMessage.images = images;
                console.log(`Added ${images.length} images to current message`);
            }
            
            // Handle text-based documents by including their content
            const textDocuments = attachments.filter(att => !att.isImage);
            if (textDocuments.length > 0) {
                const documentContents = textDocuments.map(doc => {
                    console.log(`Processing current message document: ${doc.name}, type: ${doc.type}`);
                    // Decode base64 content for text files
                    try {
                        const decodedContent = atob(doc.data);
                        // Check if it's readable text
                        if (this.isTextFile(doc.type)) {
                            return `\n\n--- Document: ${doc.name} ---\n${decodedContent}\n--- End of Document ---\n`;
                        } else {
                            return `\n\n--- Binary Document: ${doc.name} (${doc.type}, ${this.formatFileSize(doc.size)}) attached ---\nNote: This is a binary file and its content cannot be directly read as text.\n`;
                        }
                    } catch (error) {
                        console.warn(`Could not decode document ${doc.name}:`, error);
                        return `\n\n--- Document: ${doc.name} (${doc.type}, ${this.formatFileSize(doc.size)}) attached ---\n`;
                    }
                }).join('');
                
                // Append document contents to the message
                currentMessage.content = content + documentContents;
                console.log(`Updated current message content with ${textDocuments.length} documents`);
                console.log('Final message content length:', currentMessage.content.length);
            }
        }
        
        messages.push(currentMessage);
        console.log('Final messages array being sent to API:', messages.length, 'messages');

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

    isTextFile(mimeType) {
        const textTypes = [
            'text/plain',
            'text/csv',
            'text/html',
            'text/css',
            'text/javascript',
            'text/xml',
            'application/json',
            'application/xml',
            'application/javascript',
            'text/markdown'
        ];
        return textTypes.includes(mimeType) || mimeType.startsWith('text/');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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