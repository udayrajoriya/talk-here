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
            this.addMessage(message.role, message.content, false, message.attachments);
        });
        
        this.scrollToBottom();
    }

    addMessage(role, content, animate = true, attachments = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const avatar = role === 'user' ? 
            '<i class="fas fa-user"></i>' : 
            '<i class="fas fa-robot"></i>';

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Create attachments HTML if present
        let attachmentsHtml = '';
        if (attachments && attachments.length > 0) {
            attachmentsHtml = this.createAttachmentsHtml(attachments);
        }

        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                ${attachmentsHtml}
                ${content ? `<div class="message-bubble">${this.formatMessage(content)}</div>` : ''}
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

    createAttachmentsHtml(attachments) {
        if (!attachments || attachments.length === 0) return '';

        const attachmentItems = attachments.map(attachment => {
            if (attachment.isImage) {
                return `
                    <div class="message-attachment image-attachment">
                        <img src="data:${attachment.type};base64,${attachment.data}" 
                             alt="${attachment.name}" 
                             class="attachment-image"
                             title="${attachment.name} (${this.formatFileSize(attachment.size)})" />
                        <div class="attachment-label">
                            <i class="fas fa-image"></i>
                            <span>${attachment.name.length > 12 ? attachment.name.substring(0, 12) + '...' : attachment.name}</span>
                        </div>
                    </div>
                `;
            } else {
                const icon = this.getFileIcon(attachment.type);
                return `
                    <div class="message-attachment file-attachment">
                        <div class="attachment-info">
                            <i class="${icon} attachment-icon"></i>
                            <div class="attachment-details">
                                <div class="attachment-name">${attachment.name}</div>
                                <div class="attachment-meta">${this.formatFileSize(attachment.size)}</div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }).join('');

        return `<div class="message-attachments">${attachmentItems}</div>`;
    }

    getFileIcon(type) {
        if (type === 'application/pdf') return 'fas fa-file-pdf';
        if (type.includes('word')) return 'fas fa-file-word';
        if (type === 'text/plain') return 'fas fa-file-alt';
        if (type === 'application/json') return 'fas fa-file-code';
        if (type.includes('xml')) return 'fas fa-file-code';
        if (type === 'text/csv') return 'fas fa-file-csv';
        return 'fas fa-file';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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