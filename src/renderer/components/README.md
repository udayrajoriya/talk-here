# Components Directory

This directory contains the modular frontend components that make up the renderer process of the Talk Here application.

## Component Architecture

The application uses a component-based architecture where each component has a single responsibility:

### 📱 **SidebarManager.js**
- **Purpose**: Handles sidebar functionality and responsive behavior
- **Responsibilities**: 
  - Sidebar toggle (collapse/expand)
  - Chat list rendering and management
  - Delete chat UI interactions

### 💬 **MessageManager.js**
- **Purpose**: Manages message display and formatting
- **Responsibilities**:
  - Message rendering (user/assistant)
  - Streaming message updates
  - Welcome screen display
  - Message formatting (markdown-like)
  - Error message display

### ⌨️ **InputManager.js**
- **Purpose**: Handles user input controls and interactions
- **Responsibilities**:
  - Text input management and validation
  - Auto-resize textarea functionality
  - Send/stop button state management
  - Keyboard shortcuts (Enter, Ctrl+Enter)
  - Character count display

### 🌊 **StreamingManager.js**
- **Purpose**: Manages streaming communication with Ollama
- **Responsibilities**:
  - Stream lifecycle management
  - Real-time message updates
  - Stream interruption handling
  - IPC communication with main process

### 🗂️ **ChatManager.js**
- **Purpose**: Handles chat session management
- **Responsibilities**:
  - Chat creation, switching, and deletion
  - Chat persistence operations
  - Chat title management
  - Chat history loading

### 🤖 **ModelManager.js**
- **Purpose**: Manages Ollama model selection and status
- **Responsibilities**:
  - Model loading from Ollama API
  - Model selection UI
  - Connection status updates
  - Model availability checking

### ⚙️ **ConfigManager.js**
- **Purpose**: Handles application configuration and settings
- **Responsibilities**:
  - Settings UI management (modal display/hide)
  - Configuration validation and persistence
  - Ollama connection testing
  - Application refresh after config changes

## Component Communication

```
ChatApp (Main Orchestrator)
├── MessageManager ← StreamingManager
├── ModelManager
├── ConfigManager
├── ChatManager ← SidebarManager
├── InputManager ← ChatApp
└── StreamingManager ← MessageManager + InputManager
```

## Usage Pattern

```javascript
// Initialize core components first
this.messageManager = new MessageManager();
this.modelManager = new ModelManager();
this.configManager = new ConfigManager();

// Initialize components that depend on others
this.chatManager = new ChatManager(this.messageManager, sidebarManager);
this.sidebarManager = new SidebarManager(this.chatManager);

// Initialize complex components last
this.streamingManager = new StreamingManager(this.messageManager, this.inputManager);
```