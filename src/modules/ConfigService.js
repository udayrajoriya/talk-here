const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');
const axios = require('axios');

/**
 * Handles application configuration persistence and validation
 */
class ConfigService {
    constructor() {
        this.configPath = path.join(app.getPath('userData'), 'config.json');
        this.defaultConfig = {
            ollama: {
                url: 'http://127.0.0.1:11434',
                timeout: 30000,
                streamTimeout: 2000
            }
        };
    }

    async loadConfig() {
        try {
            const configData = await fs.readFile(this.configPath, 'utf8');
            const config = JSON.parse(configData);
            
            // Merge with defaults to ensure new properties are added
            return this.mergeWithDefaults(config);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Config file doesn't exist, create it with defaults
                await this.saveConfig(this.defaultConfig);
                return this.defaultConfig;
            }
            console.error('Failed to load config:', error);
            return this.defaultConfig;
        }
    }

    async saveConfig(config) {
        try {
            // Merge with defaults to ensure structure is correct
            const mergedConfig = this.mergeWithDefaults(config);
            
            // Ensure config directory exists
            const configDir = path.dirname(this.configPath);
            await fs.mkdir(configDir, { recursive: true });
            
            // Save config
            await fs.writeFile(this.configPath, JSON.stringify(mergedConfig, null, 2), 'utf8');
            return { success: true, config: mergedConfig };
        } catch (error) {
            console.error('Failed to save config:', error);
            return { success: false, error: error.message };
        }
    }

    async testOllamaConnection(url, timeout = 30000) {
        try {
            // Clean up URL
            const cleanUrl = url.replace(/\/+$/, ''); // Remove trailing slashes
            
            // Test basic connectivity
            const response = await axios.get(`${cleanUrl}/api/tags`, {
                timeout: timeout,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const models = response.data.models || [];
            
            return {
                success: true,
                modelCount: models.length,
                models: models.map(m => m.name)
            };
        } catch (error) {
            console.error('Ollama connection test failed:', error);
            
            let errorMessage = 'Connection failed';
            
            if (error.code === 'ECONNREFUSED') {
                errorMessage = 'Connection refused. Is Ollama running?';
            } else if (error.code === 'ENOTFOUND') {
                errorMessage = 'Host not found. Check the URL.';
            } else if (error.code === 'ETIMEDOUT') {
                errorMessage = 'Connection timed out.';
            } else if (error.response) {
                errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    mergeWithDefaults(config) {
        return {
            ollama: {
                ...this.defaultConfig.ollama,
                ...(config.ollama || {})
            }
        };
    }

    getDefaultConfig() {
        return JSON.parse(JSON.stringify(this.defaultConfig));
    }
}

module.exports = ConfigService;