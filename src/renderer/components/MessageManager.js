/**
 * Handles message display, formatting, and streaming functionality
 */
class MessageManager {
    constructor() {
        this.messages = document.getElementById('messages');
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

    finishStreamingMessage(messageElement) {
        const typingIndicator = messageElement.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.style.display = 'none';
        }
    }

    formatMessage(content) {
        // Basic markdown-like formatting
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
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

    removeMessage(messageElement) {
        if (messageElement && messageElement.parentNode) {
            this.messages.removeChild(messageElement);
        }
    }

    scrollToBottom() {
        this.messages.scrollTop = this.messages.scrollHeight;
    }
}

export { MessageManager as default };