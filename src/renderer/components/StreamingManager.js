/**
 * Handles streaming communication with Ollama API
 */
class StreamingManager {
    constructor(messageManager, inputManager) {
        this.messageManager = messageManager;
        this.inputManager = inputManager;
        
        this.currentStreamId = null;
        this.isStreaming = false;
        this.streamHandler = null;
    }

    async startStreaming(model, messages, onComplete, onError) {
        if (this.isStreaming) return;

        // Generate unique stream ID
        this.currentStreamId = 'stream_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        this.isStreaming = true;

        // Show streaming UI
        this.inputManager.toggleStreamingUI(true);

        // Create assistant message bubble for streaming
        const messageElement = this.messageManager.addStreamingMessage('assistant');

        // Set up streaming listener
        let fullContent = '';
        this.streamHandler = (event, data) => {
            // Only handle data for the current stream
            if (data.streamId !== this.currentStreamId) return;

            fullContent += data.content;
            this.messageManager.updateStreamingMessage(messageElement, fullContent);
            
            if (data.done || data.aborted) {
                // Remove typing indicator when done
                this.messageManager.finishStreamingMessage(messageElement);
                
                // Cleanup when done
                this.finishStreaming();
                
                if (data.aborted) {
                    onComplete(fullContent, true); // true = aborted
                } else {
                    onComplete(fullContent, false);
                }
            }
        };

        // Set up stream listener
        window.electronAPI.onStreamChunk(this.streamHandler);

        try {
            // Call Ollama streaming API
            const result = await window.electronAPI.ollamaChatStream({
                model: model,
                messages: messages,
                streamId: this.currentStreamId
            });

            if (!result.success && !result.aborted) {
                // Remove the message element on error
                this.messageManager.removeMessage(messageElement);
                this.finishStreaming();
                onError(result.error || 'Failed to get response from model');
            }
        } catch (error) {
            console.error('Chat error:', error);
            // Remove the message element on error
            this.messageManager.removeMessage(messageElement);
            this.finishStreaming();
            onError('Failed to send message. Please try again.');
        }

        return { messageElement, fullContent: '' };
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
        this.inputManager.toggleStreamingUI(false);
        
        if (this.streamHandler) {
            window.electronAPI.removeStreamListener();
            this.streamHandler = null;
        }
    }

    getIsStreaming() {
        return this.isStreaming;
    }
}

export { StreamingManager as default };