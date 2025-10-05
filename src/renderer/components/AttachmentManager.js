/**
 * Handles file attachments, drag & drop, and file preview functionality
 */
class AttachmentManager {
    constructor() {
        this.attachments = [];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.updateCallback = null; // Will be set by the parent component
        this.supportedTypes = {
            images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
            documents: [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain',
                'text/markdown',
                'application/json',
                'application/xml',
                'text/xml',
                'text/csv'
            ]
        };
        
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.attachBtn = document.getElementById('attachBtn');
        this.fileInput = document.getElementById('fileInput');
        this.attachmentsPreview = document.getElementById('attachmentsPreview');
        this.attachmentsList = document.getElementById('attachmentsList');
        this.clearAttachmentsBtn = document.getElementById('clearAttachmentsBtn');
        this.inputArea = document.querySelector('.input-area');
        this.messageInput = document.getElementById('messageInput');
        
        // Debug: Check if elements are found
        console.log('AttachmentManager elements initialized:', {
            attachBtn: !!this.attachBtn,
            fileInput: !!this.fileInput,
            attachmentsPreview: !!this.attachmentsPreview,
            attachmentsList: !!this.attachmentsList,
            clearAttachmentsBtn: !!this.clearAttachmentsBtn,
            inputArea: !!this.inputArea,
            messageInput: !!this.messageInput
        });
        
        if (!this.attachmentsPreview) {
            console.error('attachmentsPreview element not found! Check HTML structure.');
        }
        if (!this.attachmentsList) {
            console.error('attachmentsList element not found! Check HTML structure.');
        }
    }

    setupEventListeners() {
        // Attach button click
        this.attachBtn.addEventListener('click', () => {
            this.fileInput.click();
        });

        // File input change
        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(Array.from(e.target.files));
            this.fileInput.value = ''; // Reset input
        });

        // Clear attachments
        this.clearAttachmentsBtn.addEventListener('click', () => {
            this.clearAttachments();
        });

        // Drag and drop
        this.setupDragAndDrop();

        // Paste handling
        this.messageInput.addEventListener('paste', (e) => {
            this.handlePaste(e);
        });
    }

    setupDragAndDrop() {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.inputArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Highlight drop area
        ['dragenter', 'dragover'].forEach(eventName => {
            this.inputArea.addEventListener(eventName, () => {
                this.inputArea.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.inputArea.addEventListener(eventName, () => {
                this.inputArea.classList.remove('drag-over');
            });
        });

        // Handle dropped files
        this.inputArea.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files);
        });
    }

    handlePaste(e) {
        const items = Array.from(e.clipboardData.items);
        const files = items
            .filter(item => item.kind === 'file')
            .map(item => item.getAsFile());
        
        if (files.length > 0) {
            e.preventDefault();
            this.handleFiles(files);
        }
    }

    handleFiles(files) {
        console.log('handleFiles called with:', files.length, 'files');
        files.forEach((file, index) => {
            console.log(`File ${index}:`, {
                name: file.name,
                type: file.type,
                size: file.size
            });
        });

        const validFiles = files.filter(file => this.validateFile(file));
        console.log('Valid files after filtering:', validFiles.length);
        
        if (validFiles.length !== files.length) {
            const invalidCount = files.length - validFiles.length;
            this.showError(`${invalidCount} file(s) were rejected. Check file type and size limits.`);
        }

        if (validFiles.length === 0) {
            console.warn('No valid files to add');
            return;
        }

        // Process files one by one to handle async operations properly
        this.processFilesSequentially(validFiles);
    }

    async processFilesSequentially(files) {
        for (const file of files) {
            try {
                await this.addAttachment(file);
                console.log('Successfully added attachment:', file.name);
            } catch (error) {
                console.error('Failed to add attachment:', file.name, error);
                this.showError(`Failed to add ${file.name}: ${error.message}`);
            }
        }
        this.updatePreview();
    }

    validateFile(file) {
        console.log('Validating file:', file.name, 'Type:', file.type, 'Size:', file.size);
        
        // Check file size
        if (file.size > this.maxFileSize) {
            console.warn(`File ${file.name} is too large (${this.formatFileSize(file.size)}). Max size: ${this.formatFileSize(this.maxFileSize)}`);
            return false;
        }

        // Check file type
        const allSupportedTypes = [...this.supportedTypes.images, ...this.supportedTypes.documents];
        console.log('Supported types:', allSupportedTypes);
        console.log('File type check:', file.type, 'supported:', allSupportedTypes.includes(file.type));
        
        if (!allSupportedTypes.includes(file.type)) {
            console.warn(`File ${file.name} has unsupported type: ${file.type}`);
            // Show user-friendly error
            this.showError(`File type "${file.type}" is not supported. Please use images (JPEG, PNG, GIF, WebP, BMP) or documents (PDF, DOC, TXT, JSON, etc.)`);
            return false;
        }

        console.log('File validation passed:', file.name);
        return true;
    }

    async addAttachment(file) {
        console.log('Adding attachment:', file.name);
        
        const attachment = {
            id: Date.now() + Math.random(),
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            isImage: this.supportedTypes.images.includes(file.type)
        };

        console.log('Attachment object created:', {
            id: attachment.id,
            name: attachment.name,
            type: attachment.type,
            isImage: attachment.isImage
        });

        // For images, create a preview
        if (attachment.isImage) {
            try {
                console.log('Creating image preview for:', file.name);
                attachment.preview = await this.createImagePreview(file);
                console.log('Image preview created successfully');
            } catch (error) {
                console.error('Failed to create image preview:', error);
                // Continue without preview
            }
        }

        this.attachments.push(attachment);
        console.log('Attachment added to array. Total attachments:', this.attachments.length);
    }

    createImagePreview(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    updatePreview() {
        console.log('updatePreview called. Attachments count:', this.attachments.length);
        console.log('Attachments preview element:', this.attachmentsPreview);
        console.log('Attachments list element:', this.attachmentsList);
        
        if (this.attachments.length === 0) {
            console.log('No attachments, hiding preview');
            this.attachmentsPreview.style.display = 'none';
        } else {
            console.log('Showing preview with', this.attachments.length, 'attachments');
            this.attachmentsPreview.style.display = 'block';
            this.attachmentsList.innerHTML = '';

            this.attachments.forEach((attachment, index) => {
                console.log(`Creating UI for attachment ${index}:`, attachment.name);
                try {
                    const item = this.createAttachmentItem(attachment);
                    this.attachmentsList.appendChild(item);
                    console.log(`Successfully added UI for attachment ${index}`);
                } catch (error) {
                    console.error(`Failed to create UI for attachment ${index}:`, error);
                }
            });
        }
        
        // Notify parent component that attachments changed
        if (this.updateCallback) {
            console.log('Calling update callback');
            this.updateCallback();
        } else {
            console.log('No update callback set');
        }
    }

    createAttachmentItem(attachment) {
        const item = document.createElement('div');
        item.className = 'attachment-item';
        item.dataset.id = attachment.id;

        const icon = this.getFileIcon(attachment.type);
        
        item.innerHTML = `
            ${attachment.isImage && attachment.preview ? 
                `<img src="${attachment.preview}" alt="${attachment.name}" class="attachment-preview" />` : 
                `<i class="${icon} attachment-icon"></i>`
            }
            <div class="attachment-info">
                <div class="attachment-name" title="${attachment.name}">${attachment.name}</div>
                <div class="attachment-size">${this.formatFileSize(attachment.size)}</div>
            </div>
            <button class="attachment-remove" title="Remove attachment">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Remove button handler
        const removeBtn = item.querySelector('.attachment-remove');
        removeBtn.addEventListener('click', () => {
            this.removeAttachment(attachment.id);
        });

        return item;
    }

    getFileIcon(type) {
        if (this.supportedTypes.images.includes(type)) return 'fas fa-image';
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

    removeAttachment(id) {
        this.attachments = this.attachments.filter(att => att.id !== id);
        this.updatePreview();
    }

    clearAttachments() {
        this.attachments = [];
        this.updatePreview();
    }

    getAttachments() {
        return this.attachments;
    }

    hasAttachments() {
        return this.attachments.length > 0;
    }

    showError(message) {
        // You can integrate this with your existing error display system
        console.error('AttachmentManager Error:', message);
        
        // Show error in console and optionally as an alert for now
        // In a real implementation, you'd show a toast notification
        if (typeof window !== 'undefined' && window.alert) {
            alert('File Error: ' + message);
        }
    }

    // Convert attachments to base64 for sending to API
    async getAttachmentsForAPI() {
        const attachmentsData = [];
        
        for (const attachment of this.attachments) {
            const base64 = await this.fileToBase64(attachment.file);
            attachmentsData.push({
                name: attachment.name,
                type: attachment.type,
                size: attachment.size,
                data: base64,
                isImage: attachment.isImage
            });
        }
        
        return attachmentsData;
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                // Remove the data URL prefix (data:type;base64,)
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    }

    // Debug method to test attachment functionality
    testAttachmentManager() {
        console.log('Testing AttachmentManager...');
        console.log('Elements check:', {
            attachBtn: !!this.attachBtn,
            fileInput: !!this.fileInput,
            attachmentsPreview: !!this.attachmentsPreview,
            attachmentsList: !!this.attachmentsList
        });
        
        // Try to show the preview area manually
        if (this.attachmentsPreview) {
            this.attachmentsPreview.style.display = 'block';
            this.attachmentsList.innerHTML = '<div style="padding: 10px; color: #e1e1e1;">Test: AttachmentManager is working</div>';
            
            setTimeout(() => {
                this.attachmentsPreview.style.display = 'none';
                this.attachmentsList.innerHTML = '';
            }, 3000);
        }
    }
}

// Make AttachmentManager available globally for debugging
if (typeof window !== 'undefined') {
    window.AttachmentManager = AttachmentManager;
}

export default AttachmentManager;