/**
 * Handles Ollama model management and status updates
 */
class ModelManager {
    constructor() {
        this.currentModel = null;
        this.modelSelect = document.getElementById('modelSelect');
        this.statusIndicator = document.getElementById('statusIndicator');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Model selection
        this.modelSelect.addEventListener('change', (e) => {
            this.currentModel = e.target.value;
        });
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

    getCurrentModel() {
        return this.currentModel;
    }

    hasModel() {
        return !!this.currentModel;
    }
}

export { ModelManager as default };