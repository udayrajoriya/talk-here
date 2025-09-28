/**
 * Handles application configuration and settings management
 */
class ConfigManager {
    constructor() {
        this.config = this.getDefaultConfig();
        this.originalConfig = null; // Store original config when modal opens
        this.settingsOverlay = document.getElementById('settingsOverlay');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
        this.cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
        this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
        this.resetSettingsBtn = document.getElementById('resetSettingsBtn');
        this.testConnectionBtn = document.getElementById('testConnectionBtn');
        this.connectionStatus = document.getElementById('connectionStatus');
        
        // Form inputs
        this.ollamaUrlInput = document.getElementById('ollamaUrl');
        this.ollamaTimeoutInput = document.getElementById('ollamaTimeout');
        this.ollamaStreamTimeoutInput = document.getElementById('ollamaStreamTimeout');
        
        this.setupEventListeners();
        this.loadConfig();
        this.startInputWatcher();
    }

    getDefaultConfig() {
        return {
            ollama: {
                url: 'http://127.0.0.1:11434',
                timeout: 30000,
                streamTimeout: 2000
            }
        };
    }

    setupEventListeners() {
        // Open settings
        this.settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openSettings();
        });
        
        // Close settings
        this.closeSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closeSettings();
        });
        
        this.cancelSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closeSettings();
        });
        
        // Save settings
        this.saveSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.saveSettings();
        });
        
        // Reset settings
        this.resetSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.resetSettings();
        });
        
        // Test connection
        this.testConnectionBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.testConnection();
        });
        
        // Close modal when clicking outside
        this.settingsOverlay.addEventListener('click', (e) => {
            if (e.target === this.settingsOverlay) {
                e.preventDefault();
                e.stopPropagation();
                this.closeSettings();
            }
        });
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.settingsOverlay.classList.contains('show')) {
                e.preventDefault();
                e.stopPropagation();
                this.closeSettings();
            }
        });
        
        // Add debugging for input focus issues
        [this.ollamaUrlInput, this.ollamaTimeoutInput, this.ollamaStreamTimeoutInput].forEach(input => {
            input.addEventListener('focus', () => {
                console.log('Input focused:', input.id);
            });
            
            input.addEventListener('blur', () => {
                console.log('Input blurred:', input.id);
            });
            
            input.addEventListener('input', () => {
                console.log('Input changed:', input.id, input.value);
            });
            
            // Add click handler to force enable on click
            input.addEventListener('click', () => {
                console.log('Input clicked:', input.id);
                if (input.disabled || input.readOnly) {
                    console.log('Input was disabled/readonly, forcing enable...');
                    this.forceEnableInputs();
                }
            });
            
            // Add mousedown handler as backup
            input.addEventListener('mousedown', () => {
                setTimeout(() => {
                    if (input.disabled || input.readOnly) {
                        console.log('Input still disabled after mousedown, forcing enable...');
                        this.forceEnableInputs();
                    }
                }, 10);
            });
        });
    }

    async loadConfig() {
        try {
            const savedConfig = await window.electronAPI.loadConfig();
            if (savedConfig) {
                this.config = { ...this.getDefaultConfig(), ...savedConfig };
            }
            this.updateFormInputs();
        } catch (error) {
            console.error('Failed to load config:', error);
            this.config = this.getDefaultConfig();
            this.updateFormInputs();
        }
    }

    updateFormInputs() {
        // Set values and ensure inputs are enabled and accessible
        this.ollamaUrlInput.value = this.config.ollama.url;
        this.ollamaUrlInput.disabled = false;
        this.ollamaUrlInput.readOnly = false;
        
        this.ollamaTimeoutInput.value = this.config.ollama.timeout;
        this.ollamaTimeoutInput.disabled = false;
        this.ollamaTimeoutInput.readOnly = false;
        
        this.ollamaStreamTimeoutInput.value = this.config.ollama.streamTimeout;
        this.ollamaStreamTimeoutInput.disabled = false;
        this.ollamaStreamTimeoutInput.readOnly = false;
    }

    openSettings() {
        // Store the current config as original to restore if canceled
        this.originalConfig = JSON.parse(JSON.stringify(this.config));
        this.updateFormInputs();
        this.settingsOverlay.classList.add('show');
        this.clearConnectionStatus();
        
        // Force enable inputs to ensure they're interactable
        this.forceEnableInputs();
        
        // Debug input states
        setTimeout(() => {
            this.debugInputStates();
        }, 100);
        
        // Ensure the first input is focusable when modal opens
        setTimeout(() => {
            if (this.ollamaUrlInput) {
                this.ollamaUrlInput.focus();
            }
        }, 300); // Wait for modal animation
    }

    closeSettings() {
        // Restore original form values if settings were not saved
        if (this.originalConfig) {
            this.config = this.originalConfig;
            this.updateFormInputs();
            this.originalConfig = null;
        }
        this.settingsOverlay.classList.remove('show');
        this.clearConnectionStatus();
    }

    async saveSettings() {
        try {
            // Validate inputs
            const url = this.ollamaUrlInput.value.trim();
            const timeout = parseInt(this.ollamaTimeoutInput.value);
            const streamTimeout = parseInt(this.ollamaStreamTimeoutInput.value);

            if (!url) {
                this.showError('Ollama URL is required');
                return;
            }

            if (!this.isValidUrl(url)) {
                this.showError('Please enter a valid URL');
                return;
            }

            if (isNaN(timeout) || timeout < 5000 || timeout > 120000) {
                this.showError('Request timeout must be between 5000 and 120000 ms');
                return;
            }

            if (isNaN(streamTimeout) || streamTimeout < 500 || streamTimeout > 10000) {
                this.showError('Stream timeout must be between 500 and 10000 ms');
                return;
            }

            // Update config
            const newConfig = {
                ollama: {
                    url: url,
                    timeout: timeout,
                    streamTimeout: streamTimeout
                }
            };

            // Save config
            await window.electronAPI.saveConfig(newConfig);
            this.config = newConfig;
            
            // Clear the original config since we've successfully saved
            this.originalConfig = null;

            // Close settings
            this.settingsOverlay.classList.remove('show');
            this.clearConnectionStatus();

            // Show success message and refresh
            this.showSuccess('Settings saved successfully. Refreshing application...');
            
            // Use a more reliable way to refresh after save
            setTimeout(() => {
                try {
                    window.location.reload();
                } catch (error) {
                    console.error('Failed to reload, trying alternative method:', error);
                    // Alternative refresh method
                    document.location.href = document.location.href;
                }
            }, 1500);

        } catch (error) {
            console.error('Failed to save config:', error);
            this.showError('Failed to save settings. Please try again.');
            
            // Re-enable inputs in case of error
            this.updateFormInputs();
        }
    }

    resetSettings() {
        console.log('Resetting to defaults...');
        
        // Only update the form inputs to show defaults, don't change the actual config
        const defaultConfig = this.getDefaultConfig();
        
        // Force clear any potential disabled states first
        this.forceEnableInputs();
        
        // Set values with explicit enabling
        this.ollamaUrlInput.value = defaultConfig.ollama.url;
        this.ollamaUrlInput.disabled = false;
        this.ollamaUrlInput.readOnly = false;
        
        this.ollamaTimeoutInput.value = defaultConfig.ollama.timeout;
        this.ollamaTimeoutInput.disabled = false;
        this.ollamaTimeoutInput.readOnly = false;
        
        this.ollamaStreamTimeoutInput.value = defaultConfig.ollama.streamTimeout;
        this.ollamaStreamTimeoutInput.disabled = false;
        this.ollamaStreamTimeoutInput.readOnly = false;
        
        this.clearConnectionStatus();
        
        // Show a brief visual feedback that reset happened
        this.showConnectionStatus('success', 'Settings reset to defaults. Remember to save if you want to keep these changes.');
        
        // Force enable again after setting values
        setTimeout(() => {
            this.forceEnableInputs();
            this.debugInputStates();
            
            // Focus the first input
            if (this.ollamaUrlInput) {
                this.ollamaUrlInput.focus();
                this.ollamaUrlInput.select();
            }
        }, 50);
    }

    async testConnection() {
        const url = this.ollamaUrlInput.value.trim();
        const timeout = parseInt(this.ollamaTimeoutInput.value) || 30000;

        if (!url) {
            this.showConnectionStatus('error', 'Please enter a URL first');
            return;
        }

        if (!this.isValidUrl(url)) {
            this.showConnectionStatus('error', 'Please enter a valid URL');
            return;
        }

        this.testConnectionBtn.disabled = true;
        this.showConnectionStatus('testing', 'Testing connection...');

        try {
            const result = await window.electronAPI.testOllamaConnection(url, timeout);
            
            if (result.success) {
                this.showConnectionStatus('success', `Connected successfully! Found ${result.modelCount} models`);
            } else {
                this.showConnectionStatus('error', result.error || 'Connection failed');
            }
        } catch (error) {
            this.showConnectionStatus('error', 'Connection test failed');
        } finally {
            this.testConnectionBtn.disabled = false;
        }
    }

    showConnectionStatus(type, message) {
        this.connectionStatus.className = `connection-status ${type}`;
        
        let icon = '';
        switch (type) {
            case 'success':
                icon = '<i class="fas fa-check-circle"></i>';
                break;
            case 'error':
                icon = '<i class="fas fa-exclamation-circle"></i>';
                break;
            case 'testing':
                icon = '<i class="fas fa-spinner fa-spin"></i>';
                break;
        }
        
        this.connectionStatus.innerHTML = `${icon} ${message}`;
    }

    clearConnectionStatus() {
        this.connectionStatus.innerHTML = '';
        this.connectionStatus.className = 'connection-status';
    }

    showError(message) {
        this.showConnectionStatus('error', message);
    }

    showSuccess(message) {
        this.showConnectionStatus('success', message);
    }

    isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }

    getConfig() {
        return this.config;
    }

    // Watch for inputs getting disabled and automatically re-enable them
    startInputWatcher() {
        setInterval(() => {
            if (this.settingsOverlay.classList.contains('show')) {
                let needsReEnable = false;
                [this.ollamaUrlInput, this.ollamaTimeoutInput, this.ollamaStreamTimeoutInput].forEach(input => {
                    if (input && (input.disabled || input.readOnly)) {
                        needsReEnable = true;
                    }
                });
                
                if (needsReEnable) {
                    console.log('Detected disabled inputs, re-enabling...');
                    this.forceEnableInputs();
                }
            }
        }, 500); // Check every 500ms when settings are open
    }

    // Debug method to check input states
    debugInputStates() {
        console.log('=== Debug Input States ===');
        console.log('URL Input:', {
            disabled: this.ollamaUrlInput.disabled,
            readOnly: this.ollamaUrlInput.readOnly,
            value: this.ollamaUrlInput.value,
            style: getComputedStyle(this.ollamaUrlInput).pointerEvents
        });
        console.log('Timeout Input:', {
            disabled: this.ollamaTimeoutInput.disabled,
            readOnly: this.ollamaTimeoutInput.readOnly,
            value: this.ollamaTimeoutInput.value,
            style: getComputedStyle(this.ollamaTimeoutInput).pointerEvents
        });
        console.log('Stream Timeout Input:', {
            disabled: this.ollamaStreamTimeoutInput.disabled,
            readOnly: this.ollamaStreamTimeoutInput.readOnly,
            value: this.ollamaStreamTimeoutInput.value,
            style: getComputedStyle(this.ollamaStreamTimeoutInput).pointerEvents
        });
    }

    // Method to forcefully re-enable all inputs
    forceEnableInputs() {
        console.log('Force enabling all inputs...');
        [this.ollamaUrlInput, this.ollamaTimeoutInput, this.ollamaStreamTimeoutInput].forEach((input, index) => {
            if (input) {
                console.log(`Enabling input ${index}:`, input.id);
                
                // Remove all potential blocking attributes/properties
                input.disabled = false;
                input.readOnly = false;
                input.removeAttribute('disabled');
                input.removeAttribute('readonly');
                
                // Force CSS properties
                input.style.pointerEvents = 'auto';
                input.style.userSelect = 'text';
                input.style.cursor = 'text';
                input.style.opacity = '1';
                
                // Remove any CSS classes that might disable it
                input.classList.remove('disabled');
                
                // Ensure input can receive focus
                input.tabIndex = 0;
                
                console.log(`Input ${input.id} state after enabling:`, {
                    disabled: input.disabled,
                    readOnly: input.readOnly,
                    tabIndex: input.tabIndex,
                    pointerEvents: input.style.pointerEvents
                });
            } else {
                console.error(`Input ${index} is null!`);
            }
        });
    }
}

export default ConfigManager;