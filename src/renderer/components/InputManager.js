/**
 * Handles input controls, auto-resize, and user interaction
 */
class InputManager {
    constructor(onSendMessage, onStopStream) {
        this.onSendMessage = onSendMessage;
        this.onStopStream = onStopStream;
        
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.charCount = document.getElementById('charCount');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Message input
        this.messageInput.addEventListener('input', () => this.handleInputChange());
        this.messageInput.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Send button
        this.sendBtn.addEventListener('click', () => this.onSendMessage());

        // Stop button
        this.stopBtn.addEventListener('click', () => this.onStopStream());

        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => this.autoResizeTextarea());
    }

    handleInputChange() {
        const length = this.messageInput.value.length;
        this.charCount.textContent = `${length}/4000`;
        this.sendBtn.disabled = length === 0;
    }

    handleKeyDown(e) {
        if (e.key === 'Enter') {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                this.onSendMessage();
            } else if (!e.shiftKey) {
                e.preventDefault();
                this.onSendMessage();
            }
        }
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    clearInput() {
        this.messageInput.value = '';
        this.handleInputChange();
        this.autoResizeTextarea();
    }

    getValue() {
        return this.messageInput.value.trim();
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

    setLoading(loading) {
        this.sendBtn.disabled = loading || this.messageInput.value.trim().length === 0;
    }
}

export { InputManager as default };