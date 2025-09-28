const { BrowserWindow } = require('electron');
const path = require('path');

/**
 * Handles main window creation and management
 */
class WindowManager {
  constructor() {
    this.mainWindow = null;
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '..', 'preload.js')
      },
      titleBarStyle: 'default',
      show: false,
      backgroundColor: '#1a1a1a'
    });

    this.mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

    // Show window when ready to prevent visual flash
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });

    // Open DevTools in development
    if (process.argv.includes('--dev')) {
      this.mainWindow.webContents.openDevTools();
    }

    return this.mainWindow;
  }

  getMainWindow() {
    return this.mainWindow;
  }

  closeWindow() {
    if (this.mainWindow) {
      this.mainWindow.close();
      this.mainWindow = null;
    }
  }
}

module.exports = WindowManager;