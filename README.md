# Talk Here

A simple application for chatting with local Large Language Models.

## Features

- 💬 **Chat Interface** - Intuitive chat experience with message bubbles
- 🤖 **Ollama Integration** - Connect to local Ollama models
- 📝 **Chat History** - Save and manage your conversations
- ⚙️ **Model Selection** - Choose from available Ollama models
- 🚀 **Cross-platform** - Works on Windows, macOS, and Linux

## Prerequisites

Before running this application, make sure you have:

1. **Node.js** (v16 or later) installed on your system
2. **Ollama** installed and running locally
   - Download from: https://ollama.ai/
   - Make sure it's running on `http://localhost:11434`
   - Have at least one model pulled (e.g., `ollama pull llama2`)

## Installation

1. Clone or download this repository
2. Open a terminal in the project directory
3. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

### Development Mode
```bash
npm run dev
```
This will launch the app with developer tools enabled.

### Production Mode
```bash
npm start
```

## Building and Releasing the Application

### Prerequisites for Building
```bash
# Make sure all dependencies are installed
npm install
```

### Build Commands

#### Platform-Specific Builds
```bash
# Build for Windows (creates .exe installer and portable)
npm run build:win

# Build for macOS (creates .dmg)
npm run build:mac

# Build for Linux (creates AppImage and .deb)
npm run build:linux
```

#### Cross-Platform Build
```bash
# Build for current platform only
npm run build

# Create unpacked directory (for testing)
npm run pack
```

#### Distribution Packages
```bash
# Create distributable packages (no publishing)
npm run dist:win    # Windows installer + portable
npm run dist:mac    # macOS DMG
npm run dist:linux  # Linux AppImage + DEB
```

### Build Output

After building, you'll find the distributables in the `dist` directory:

**Windows:**
- `Talk Here Setup X.X.X.exe` - NSIS installer
- `Talk Here X.X.X.exe` - Portable executable

**macOS:**
- `Talk Here-X.X.X.dmg` - Disk image installer
- `Talk Here-X.X.X-mac.zip` - Application bundle

**Linux:**
- `Talk Here-X.X.X.AppImage` - Portable application
- `Talk-Here_X.X.X_amd64.deb` - Debian package

### Working Build Method (Recommended)

Due to issues with electron-builder on some Windows systems, use **electron-packager** instead:

```bash
# Build for Windows (working method)
npm run package-win

# Build for macOS
npm run package-mac

# Build for Linux  
npm run package-linux
```

The built application will be in the `dist-packager` directory.

### Creating Distribution Packages

After building, create a ZIP for distribution:

```powershell
# Windows PowerShell
Compress-Archive -Path "dist-packager\Talk Here-win32-x64" -DestinationPath "Talk-Here-v1.0.0-win64.zip"
```

```bash
# macOS/Linux
zip -r "Talk-Here-v1.0.0-mac.zip" "dist-packager/Talk Here-darwin-x64"
```

**Windows Security Warnings:**
- Unsigned apps may show security warnings
- Users can bypass by clicking "More info" → "Run anyway"
- Consider code signing for production releases

**macOS Notarization:**
- Apps may need notarization for distribution outside App Store
- Requires Apple Developer account

**Linux Permissions:**
- Make executables runnable: `chmod +x "Talk Here"`

### Distribution

Your users can run the app by:
1. **Windows**: Extract ZIP, run `Talk Here.exe`
2. **macOS**: Extract ZIP, run `Talk Here.app`
3. **Linux**: Extract ZIP, run `./Talk\ Here`

No additional software installation required on target machines!

## Usage

1. **Start Ollama**: Make sure Ollama is running on your system
2. **Launch the App**: Run the application using one of the methods above
3. **Select a Model**: Choose an available model from the dropdown in the sidebar
4. **Start Chatting**: Click "New Chat" or start typing in the input area
5. **Manage Chats**: Use the sidebar to switch between different chat sessions

## Features Overview

### Chat Interface
- Clean, modern design with dark theme
- Real-time messaging with typing indicators
- Message timestamps and user/assistant avatars
- Support for basic text formatting

### Sidebar
- List of all chat sessions with previews
- Quick access to create new chats
- Model selection dropdown
- Connection status indicator

### Keyboard Shortcuts
- `Ctrl+Enter` (or `Cmd+Enter` on Mac): Send message
- `Enter`: Send message (can be changed to new line in settings)

### Responsive Design
- **Desktop**: Sidebar collapses to maximize chat area width
- **Mobile**: Sidebar slides over chat area for better mobile experience
- **Smooth animations**: All layout changes are animated for professional feel
- **Auto-expand**: Chat messages and input area automatically expand to use available space

## Troubleshooting

### "Failed to connect to Ollama"
- Ensure Ollama is installed and running
- Check that Ollama is accessible at `http://localhost:11434`
- Try running `ollama serve` in a terminal

### "No models available"
- Make sure you have at least one model installed
- Run `ollama list` to see available models
- Install a model with `ollama pull <model-name>` (e.g., `ollama pull llama2`)

### Application won't start
- Ensure Node.js is installed and up to date
- Run `npm install` to ensure all dependencies are installed
- Check the console for error messages

## Development

### Project Structure
```
├── src/
│   ├── main.js          # Electron main process
│   ├── preload.js       # Preload script for secure IPC
│   └── renderer/        # Frontend code
│       ├── index.html   # Main HTML file
│       ├── styles.css   # Application styles
│       └── app.js       # Frontend JavaScript
├── assets/              # Application icons and resources
├── package.json         # Project configuration
└── README.md           # This file
```

### Technologies Used
- **Electron** - Desktop app framework
- **Node.js** - Backend runtime
- **HTML/CSS/JavaScript** - Frontend
- **Axios** - HTTP client for Ollama API
- **Font Awesome** - Icons

## License

MIT License - feel free to use this project for your own needs.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.