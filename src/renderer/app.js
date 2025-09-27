class ChatApp {
    constructor() {
        this.currentChatId = null;
        this.chats = new Map();
        this.currentModel = null;
        this.isLoading = false;
        this.currentStreamId = null;
        this.isStreaming = false;

        this.initializeElements();
        this.setupEventListeners();
        this.loadModels();
        this.loadChats();
        this.createNewChat();
    }

    initializeElements() {
        // Sidebar elements
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.chatList = document.getElementById('chatList');
        this.modelSelect = document.getElementById('modelSelect');
        this.statusIndicator = document.getElementById('statusIndicator');

        // Main content elements
        this.mainContent = document.getElementById('mainContent');
        this.chatTitle = document.getElementById('chatTitle');
        this.messages = document.getElementById('messages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.clearChatBtn = document.getElementById('clearChatBtn');
        this.charCount = document.getElementById('charCount');
        this.loadingOverlay = document.getElementById('loadingOverlay');
    }

    setupEventListeners() {
        // Sidebar toggle
        this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());

        // New chat button
        this.newChatBtn.addEventListener('click', () => this.createNewChat());

        // Clear all chats button
        this.clearAllBtn.addEventListener('click', () => this.clearAllChats());

        // Clear chat button
        this.clearChatBtn.addEventListener('click', () => this.clearCurrentChat());

        // Model selection
        this.modelSelect.addEventListener('change', (e) => {
            this.currentModel = e.target.value;
        });

        // Message input
        this.messageInput.addEventListener('input', () => this.handleInputChange());
        this.messageInput.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Send button
        this.sendBtn.addEventListener('click', () => this.sendMessage());

        // Stop button
        this.stopBtn.addEventListener('click', () => this.stopCurrentStream());

        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => this.autoResizeTextarea());

        // Handle window resize for responsive behavior
        window.addEventListener('resize', () => this.handleResize());
        
        // Initialize toggle icon state
        this.updateToggleIcon();
    }

    toggleSidebar() {
        // On mobile, use 'show' class; on desktop, use 'collapsed' class
        if (window.innerWidth <= 768) {
            this.sidebar.classList.toggle('show');
        } else {
            this.sidebar.classList.toggle('collapsed');
        }
        
        // Update toggle button icon
        this.updateToggleIcon();
    }

    updateToggleIcon() {
        const icon = this.sidebarToggle.querySelector('i');
        const isCollapsed = this.sidebar.classList.contains('collapsed');
        const isHidden = !this.sidebar.classList.contains('show') && window.innerWidth <= 768;
        
        if (isCollapsed || isHidden) {
            // Sidebar is hidden, show "open" icon
            icon.className = 'fas fa-bars';
            this.sidebarToggle.title = 'Show Sidebar';
        } else {
            // Sidebar is visible, show "close" icon  
            icon.className = 'fas fa-times';
            this.sidebarToggle.title = 'Hide Sidebar';
        }
    }

    handleResize() {
        // Clean up classes when switching between mobile and desktop
        if (window.innerWidth <= 768) {
            // Mobile: ensure we use 'show' class for visibility
            if (this.sidebar.classList.contains('collapsed')) {
                this.sidebar.classList.remove('collapsed');
                this.sidebar.classList.remove('show'); // Start hidden on mobile
            }
        } else {
            // Desktop: ensure we use 'collapsed' class
            if (this.sidebar.classList.contains('show')) {
                this.sidebar.classList.remove('show');
                // Don't auto-add collapsed, let user control it
            }
        }
        
        // Update toggle icon after resize
        this.updateToggleIcon();
    }

    handleInputChange() {
        const length = this.messageInput.value.length;
        this.charCount.textContent = `${length}/4000`;
        this.sendBtn.disabled = length === 0 || this.isLoading;
    }

    handleKeyDown(e) {
        if (e.key === 'Enter') {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                this.sendMessage();
            } else if (!e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        }
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    async loadModels() {
        try {
            const result = await window.electronAPI.ollamaModels();
            if (result.success && result.models.length > 0) {
                this.populateModelSelect(result.models);
                this.updateStatus('connected', `Connected • ${result.models.length} models available`);
            } else {
                this.updateStatus('error', 'No models found');
                this.modelSelect.innerHTML = '<option value="">No models available</option>';
            }
        } catch (error) {
            console.error('Failed to load models:', error);
            this.updateStatus('error', 'Failed to connect to Ollama');
            this.modelSelect.innerHTML = '<option value="">Connection failed</option>';
        }
    }

    populateModelSelect(models) {
        this.modelSelect.innerHTML = '';
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.name;
            option.textContent = model.name;
            this.modelSelect.appendChild(option);
        });
        
        if (models.length > 0) {
            this.currentModel = models[0].name;
            this.modelSelect.value = this.currentModel;
        }
    }

    updateStatus(type, message) {
        this.statusIndicator.className = `status-indicator ${type}`;
        this.statusIndicator.querySelector('span').textContent = message;
    }

    async loadChats() {
        try {
            const result = await window.electronAPI.loadChats();
            if (result.success) {
                result.chats.forEach(chat => {
                    this.chats.set(chat.id, chat);
                    this.addChatToSidebar(chat);
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
        this.addChatToSidebar(chat);
        this.switchToChat(chatId);
        this.clearMessages();
        this.showWelcomeMessage();
    }

    generateChatId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    addChatToSidebar(chat) {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.dataset.chatId = chat.id;
        
        const title = chat.title || (chat.messages.length > 0 ? 
            chat.messages[0].content.substring(0, 30) + '...' : 
            'New Chat');
        
        const preview = chat.messages.length > 1 ?
            chat.messages[chat.messages.length - 1].content.substring(0, 50) + '...' :
            'No messages yet';

        // Format the date for display
        const date = chat.updatedAt || chat.createdAt;
        const dateStr = date ? new Date(date).toLocaleDateString() : '';

        chatItem.innerHTML = `
            <div class="chat-item-content">
                <div class="chat-item-title">${this.escapeHtml(title)}</div>
                <div class="chat-item-preview">${this.escapeHtml(preview)}</div>
                <div class="chat-item-date">${dateStr}</div>
            </div>
            <div class="chat-item-actions">
                <button class="chat-delete-btn" title="Delete Chat">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Add click handler for the main chat item (but not the delete button)
        const contentArea = chatItem.querySelector('.chat-item-content');
        contentArea.addEventListener('click', () => this.switchToChat(chat.id));
        
        // Add delete button handler
        const deleteBtn = chatItem.querySelector('.chat-delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteChat(chat.id);
        });
        
        this.chatList.insertBefore(chatItem, this.chatList.firstChild);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    switchToChat(chatId) {
        // Update active chat in sidebar
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.chatId === chatId) {
                item.classList.add('active');
            }
        });

        this.currentChatId = chatId;
        const chat = this.chats.get(chatId);
        
        if (chat) {
            this.chatTitle.textContent = chat.title;
            this.displayMessages(chat.messages);
        }
    }

    clearMessages() {
        this.messages.innerHTML = '';
    }

    showWelcomeMessage() {
        this.messages.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">
                    <i class="fas fa-robot"></i>
                </div>
                <h2>Welcome to Talk Here</h2>
                <p>Start a conversation with your local LLM via Ollama. Make sure Ollama is running on your system.</p>
            </div>
        `;
    }

    displayMessages(messages) {
        this.clearMessages();
        
        if (messages.length === 0) {
            this.showWelcomeMessage();
            return;
        }

        messages.forEach(message => {
            this.addMessage(message.role, message.content, false);
        });
        
        this.scrollToBottom();
    }

    addMessage(role, content, animate = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const avatar = role === 'user' ? 
            '<i class="fas fa-user"></i>' : 
            '<i class="fas fa-robot"></i>';

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-bubble">${this.formatMessage(content)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;

        if (animate) {
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateY(20px)';
        }

        this.messages.appendChild(messageDiv);

        if (animate) {
            requestAnimationFrame(() => {
                messageDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                messageDiv.style.opacity = '1';
                messageDiv.style.transform = 'translateY(0)';
            });
        }

        this.scrollToBottom();
    }

    formatMessage(content) {
        // Basic markdown-like formatting
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    addStreamingMessage(role) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const avatar = role === 'user' ? 
            '<i class="fas fa-user"></i>' : 
            '<i class="fas fa-robot"></i>';

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-bubble">
                    <span class="streaming-content"></span>
                    <span class="typing-indicator">▋</span>
                </div>
                <div class="message-time">${time}</div>
            </div>
        `;

        // Add subtle animation
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(20px)';
        
        this.messages.appendChild(messageDiv);

        requestAnimationFrame(() => {
            messageDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
        });

        this.scrollToBottom();
        return messageDiv;
    }

    updateStreamingMessage(messageElement, content) {
        const streamingContent = messageElement.querySelector('.streaming-content');
        const typingIndicator = messageElement.querySelector('.typing-indicator');
        
        if (streamingContent) {
            streamingContent.innerHTML = this.formatMessage(content);
        }
        
        // Keep the typing indicator visible during streaming
        if (typingIndicator) {
            typingIndicator.style.display = content ? 'inline' : 'inline';
        }
        
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.messages.scrollTop = this.messages.scrollHeight;
    }

    async sendMessage() {
        const content = this.messageInput.value.trim();
        if (!content || this.isLoading || this.isStreaming) return;

        if (!this.currentModel) {
            this.showError('Please select a model first');
            return;
        }

        const chat = this.chats.get(this.currentChatId);
        if (!chat) return;

        // Add user message
        const userMessage = { role: 'user', content };
        chat.messages.push(userMessage);
        this.addMessage('user', content);

        // Clear input
        this.messageInput.value = '';
        this.handleInputChange();
        this.autoResizeTextarea();

        // Create assistant message bubble for streaming
        const assistantMessage = { role: 'assistant', content: '' };
        chat.messages.push(assistantMessage);
        const messageElement = this.addStreamingMessage('assistant');

        // Generate unique stream ID
        this.currentStreamId = 'stream_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        this.isStreaming = true;

        // Show stop button, hide send button
        this.toggleStreamingUI(true);

        // Set up streaming listener
        let fullContent = '';
        const streamHandler = (event, data) => {
            // Only handle data for the current stream
            if (data.streamId !== this.currentStreamId) return;

            // console.log('Stream data received:', data); // Debug log

            fullContent += data.content;
            assistantMessage.content = fullContent;
            this.updateStreamingMessage(messageElement, fullContent);
            
            if (data.done || data.aborted) {
                console.log('Stream finished, done:', data.done, 'aborted:', data.aborted); // Debug log
                // Remove typing indicator when done
                const typingIndicator = messageElement.querySelector('.typing-indicator');
                if (typingIndicator) {
                    typingIndicator.style.display = 'none';
                }
                
                // Cleanup when done
                this.finishStreaming();
                
                if (!data.aborted) {
                    // Update chat title if this is the first message
                    if (chat.messages.length === 2) { // First user message + first assistant response
                        chat.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
                        this.chatTitle.textContent = chat.title;
                        this.updateChatInSidebar(chat);
                    }
                    
                    // Save chat
                    this.saveChat(chat);
                }
            }
        };

        // Set up stream listener
        window.electronAPI.onStreamChunk(streamHandler);

        try {
            // Prepare messages for API (exclude the empty assistant message we just added)
            const messages = chat.messages.slice(0, -1).map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // Call Ollama streaming API
            const result = await window.electronAPI.ollamaChatStream({
                model: this.currentModel,
                messages: messages,
                streamId: this.currentStreamId
            });

            if (!result.success && !result.aborted) {
                // Remove the empty assistant message on error
                chat.messages.pop();
                this.messages.removeChild(messageElement);
                this.showError(result.error || 'Failed to get response from model');
                this.finishStreaming();
            }
        } catch (error) {
            console.error('Chat error:', error);
            // Remove the empty assistant message on error
            chat.messages.pop();
            this.messages.removeChild(messageElement);
            this.showError('Failed to send message. Please try again.');
            this.finishStreaming();
        }
    }

    async stopCurrentStream() {
        if (!this.currentStreamId || !this.isStreaming) return;

        try {
            await window.electronAPI.ollamaStopStream({
                streamId: this.currentStreamId
            });
        } catch (error) {
            console.error('Failed to stop stream:', error);
        }
        
        // The stream handler will handle the cleanup when it receives the abort signal
    }

    finishStreaming() {
        this.isStreaming = false;
        this.currentStreamId = null;
        this.toggleStreamingUI(false);
        window.electronAPI.removeStreamListener();
    }

    toggleStreamingUI(isStreaming) {
        if (isStreaming) {
            // Show stop button, hide send button, disable input
            this.sendBtn.style.display = 'none';
            this.stopBtn.style.display = 'flex';
            this.messageInput.disabled = true;
            this.messageInput.placeholder = 'AI is responding... Click stop to interrupt';
        } else {
            // Show send button, hide stop button, enable input
            this.sendBtn.style.display = 'flex';
            this.stopBtn.style.display = 'none';
            this.messageInput.disabled = false;
            this.messageInput.placeholder = 'Type your message here...';
            this.handleInputChange(); // Update send button state
        }
    }

    updateChatInSidebar(chat) {
        const chatItem = document.querySelector(`[data-chat-id="${chat.id}"]`);
        if (chatItem) {
            const title = chatItem.querySelector('.chat-item-title');
            const preview = chatItem.querySelector('.chat-item-preview');
            
            if (title) title.textContent = chat.title;
            if (preview && chat.messages.length > 0) {
                const lastMessage = chat.messages[chat.messages.length - 1];
                preview.textContent = lastMessage.content.substring(0, 50) + '...';
            }
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
                const chatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
                if (chatItem) {
                    chatItem.remove();
                }
                
                // If this was the current chat, create a new one
                if (this.currentChatId === chatId) {
                    this.createNewChat();
                }
            } else {
                this.showError('Failed to delete chat: ' + result.error);
            }
        } catch (error) {
            console.error('Failed to delete chat:', error);
            this.showError('Failed to delete chat');
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
                this.chatList.innerHTML = '';
                
                // Create a new chat
                this.createNewChat();
            } else {
                this.showError('Failed to clear chats: ' + result.error);
            }
        } catch (error) {
            console.error('Failed to clear all chats:', error);
            this.showError('Failed to clear all chats');
        }
    }

    setLoading(loading, showOverlay = true) {
        this.isLoading = loading;
        this.sendBtn.disabled = loading || this.messageInput.value.trim().length === 0;
        
        if (showOverlay) {
            if (loading) {
                this.loadingOverlay.classList.add('show');
            } else {
                this.loadingOverlay.classList.remove('show');
            }
        }
    }

    clearCurrentChat() {
        if (this.currentChatId) {
            const chat = this.chats.get(this.currentChatId);
            if (chat) {
                chat.messages = [];
                this.clearMessages();
                this.showWelcomeMessage();
                this.updateChatInSidebar(chat);
                this.saveChat(chat);
            }
        }
    }

    showError(message) {
        // Create a temporary error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message assistant';
        errorDiv.innerHTML = `
            <div class="message-avatar" style="background-color: #ef4444;">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="message-content">
                <div class="message-bubble" style="background-color: #dc2626; color: white;">
                    <strong>Error:</strong> ${message}
                </div>
                <div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
        `;
        
        this.messages.appendChild(errorDiv);
        this.scrollToBottom();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});