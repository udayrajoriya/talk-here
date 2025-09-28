/**
 * Handles sidebar functionality including toggle, responsive behavior, and chat list management
 */
class SidebarManager {
    constructor(chatManager) {
        this.chatManager = chatManager;
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.chatList = document.getElementById('chatList');
        
        this.setupEventListeners();
        this.updateToggleIcon();
    }

    setupEventListeners() {
        // Sidebar toggle
        this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());

        // Handle window resize for responsive behavior
        window.addEventListener('resize', () => this.handleResize());
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
        contentArea.addEventListener('click', () => this.chatManager.switchToChat(chat.id));
        
        // Add delete button handler
        const deleteBtn = chatItem.querySelector('.chat-delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.chatManager.deleteChat(chat.id);
        });
        
        this.chatList.insertBefore(chatItem, this.chatList.firstChild);
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

    setActiveChat(chatId) {
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.chatId === chatId) {
                item.classList.add('active');
            }
        });
    }

    removeChatFromSidebar(chatId) {
        const chatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
        if (chatItem) {
            chatItem.remove();
        }
    }

    clearSidebar() {
        this.chatList.innerHTML = '';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export { SidebarManager as default };