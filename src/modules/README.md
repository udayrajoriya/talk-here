# Modules Directory

This directory contains the modular components that make up the main process of the Talk Here application.

## Structure

- **`WindowManager.js`** - Handles main window creation, configuration, and lifecycle management
- **`OllamaService.js`** - Manages communication with the Ollama API, including streaming chat responses
- **`ChatPersistence.js`** - Handles saving, loading, and managing chat data persistence to local files
- **`ConfigService.js`** - Handles application configuration persistence, validation, and connection testing
- **`IPCHandlers.js`** - Sets up IPC (Inter-Process Communication) handlers for communication between main and renderer processes

## Usage

The main.js file imports and initializes these modules:

```javascript
const windowManager = new WindowManager();
const configService = new ConfigService();
const ollamaService = new OllamaService(configService);
const chatPersistence = new ChatPersistence();
const ipcHandlers = new IPCHandlers(ollamaService, chatPersistence, configService);
```

Each service is responsible for its own functionality and communicates through well-defined interfaces.