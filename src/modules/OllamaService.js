const axios = require('axios');

/**
 * Handles communication with Ollama API
 */
class OllamaService {
  constructor(configService) {
    this.configService = configService;
    this.config = null;
    this.activeStreams = new Map();
    this.initializeConfig();
  }

  async initializeConfig() {
    try {
      this.config = await this.configService.loadConfig();
    } catch (error) {
      console.error('Failed to load config, using defaults:', error);
      this.config = this.configService.getDefaultConfig();
    }
  }

  async ensureConfig() {
    if (!this.config) {
      await this.initializeConfig();
    }
  }

  async getModels() {
    try {
      await this.ensureConfig();
      const baseURL = this.config.ollama.url.replace(/\/+$/, ''); // Remove trailing slashes
      const timeout = this.config.ollama.timeout;
      
      const response = await axios.get(`${baseURL}/api/tags`, { timeout });
      return { success: true, models: response.data.models || [] };
    } catch (error) {
      console.error('Failed to fetch models:', error);
      return { 
        success: false, 
        error: 'Failed to fetch available models. Make sure Ollama is running.'
      };
    }
  }

  async startChatStream(event, { model, messages, streamId }) {
    try {
      await this.ensureConfig();
      
      const controller = new AbortController();
      this.activeStreams.set(streamId, controller);

      const baseURL = this.config.ollama.url.replace(/\/+$/, ''); // Remove trailing slashes
      const timeout = this.config.ollama.timeout;
      const configStreamTimeout = this.config.ollama.streamTimeout;

      const response = await axios.post(`${baseURL}/api/chat`, {
        model: model || 'llama2',
        messages: messages,
        stream: true
      }, {
        responseType: 'stream',
        signal: controller.signal,
        timeout: timeout
      });

      let fullContent = '';
      let isAborted = false;
      let streamTimeout = null;
      
      response.data.on('data', (chunk) => {
        if (isAborted) return;
        
        const lines = chunk.toString().split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message && data.message.content) {
              fullContent += data.message.content;
              
              // Reset timeout on each chunk
              if (streamTimeout) clearTimeout(streamTimeout);
              streamTimeout = setTimeout(() => {
                console.log('Stream timeout - forcing completion');
                if (!isAborted) {
                  event.sender.send('ollama-stream-chunk', {
                    content: '',
                    fullContent: fullContent,
                    done: true,
                    streamId: streamId
                  });
                }
              }, configStreamTimeout);
              
              // Send streaming chunk to renderer
              event.sender.send('ollama-stream-chunk', {
                content: data.message.content,
                fullContent: fullContent,
                done: data.done || false,
                streamId: streamId
              });
            } else if (data.done) {
              // Handle case where done=true but no content
              console.log('Stream done signal received');
              if (streamTimeout) clearTimeout(streamTimeout);
              event.sender.send('ollama-stream-chunk', {
                content: '',
                fullContent: fullContent,
                done: true,
                streamId: streamId
              });
            }
          } catch (parseError) {
            // Ignore JSON parse errors for incomplete chunks
          }
        }
      });

      return new Promise((resolve, reject) => {
        response.data.on('end', () => {
          console.log('Stream ended, sending final done signal');
          if (streamTimeout) clearTimeout(streamTimeout);
          this.activeStreams.delete(streamId);
          if (!isAborted) {
            // Send final done signal to frontend
            event.sender.send('ollama-stream-chunk', {
              content: '',
              fullContent: fullContent,
              done: true,
              streamId: streamId
            });
            resolve({ success: true, content: fullContent });
          }
        });
        
        response.data.on('error', (error) => {
          if (streamTimeout) clearTimeout(streamTimeout);
          this.activeStreams.delete(streamId);
          if (error.code === 'ECONNABORTED' || isAborted) {
            resolve({ success: true, content: fullContent, aborted: true });
          } else {
            console.error('Stream error:', error);
            reject({ success: false, error: error.message });
          }
        });

        // Handle abortion
        controller.signal.addEventListener('abort', () => {
          isAborted = true;
          if (streamTimeout) clearTimeout(streamTimeout);
          this.activeStreams.delete(streamId);
          event.sender.send('ollama-stream-chunk', {
            content: '',
            fullContent: fullContent,
            done: true,
            aborted: true,
            streamId: streamId
          });
          resolve({ success: true, content: fullContent, aborted: true });
        });
      });

    } catch (error) {
      this.activeStreams.delete(streamId);
      console.error('Ollama API error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Failed to connect to Ollama'
      };
    }
  }

  stopStream(streamId) {
    const controller = this.activeStreams.get(streamId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(streamId);
      return { success: true };
    }
    return { success: false, error: 'Stream not found' };
  }

  async refreshConfig() {
    await this.initializeConfig();
  }
}

module.exports = OllamaService;