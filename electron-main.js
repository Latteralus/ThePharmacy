const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const gameIntegration = require('./game-integration');
const log = require('electron-log');
const { initializeIPC } = require('./main/ipcMain');
// Later in createWindow()
initializeIPC(mainWindow);

// Configure electron-log
log.transports.file.level = 'info';
log.transports.console.level = 'info';
log.info('Application starting...');

// Replace console.log with log functions
console.log = log.info;
console.error = log.error;
console.warn = log.warn;
console.debug = log.debug;

// Configure auto-updater to use electron-log
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Keep a global reference of the window object to prevent garbage collection
let mainWindow = null;

function createWindow() {
  log.info('Creating main application window...');
  log.info('App path:', app.getAppPath());
  
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // Don't show until ready-to-show
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Enable DevTools in production for debugging
      devTools: true
    }
  });

  // Log the preload script path
  const preloadPath = path.join(__dirname, 'preload.js');
  log.info('Preload script path:', preloadPath);
  const preloadExists = fs.existsSync(preloadPath);
  log.info('Preload script exists:', preloadExists);
  
  if (!preloadExists) {
    log.error('Preload script is missing! Application may not function correctly.');
  }

  // Load the index.html of the app
  const indexPath = path.join(__dirname, 'index.html');
  log.info('Index path:', indexPath);
  const indexExists = fs.existsSync(indexPath);
  log.info('Index exists:', indexExists);
  
  if (!indexExists) {
    log.error('Index.html is missing! Application cannot start properly.');
  }
  
  // Add a global variable for the resource path
  global.resourcesPath = path.join(__dirname, 'main');
  log.info('Resources path set to:', global.resourcesPath);
  
  mainWindow.loadFile(indexPath);

  // Initialize game integration
  try {
    gameIntegration.initGameIntegration(mainWindow);
    log.info('Game integration initialized successfully');
  } catch (error) {
    log.error('Failed to initialize game integration:', error);
  }
  
  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    log.info('Main window ready to show');
    mainWindow.show();
    
    // Open DevTools for debugging
    mainWindow.webContents.openDevTools();
    log.info('DevTools opened for debugging');
  });
  
  // Handle window close
  mainWindow.on('closed', () => {
    log.info('Main window closed');
    mainWindow = null;
  });
  
  // Handle errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log.error('Failed to load application:', errorCode, errorDescription);
  });
  
  // Log renderer console messages to electron-log
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levels = ['debug', 'info', 'warning', 'error'];
    const logLevel = levels[level] || 'info';
    log[logLevel](`[Renderer] ${message} (${sourceId}:${line})`);
  });
  
  return mainWindow;
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  log.info('Electron app is ready!');
  
  // Register resource protocol to load files from the main directory
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = request.url.substring(6); // Remove 'app://'
    const filePath = path.join(__dirname, 'main', url);
    log.info(`Resolving app:// path request: ${url} to ${filePath}`);
    callback({ path: filePath });
  });
  
  try {
    createWindow();
    log.info('Main window created successfully');
    
    // Check for updates
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      log.error('Error checking for updates:', err);
    });
    
    // On macOS, re-create a window when dock icon is clicked
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        log.info('Recreating window on macOS activate event');
        createWindow();
      }
    });
  } catch (error) {
    log.error('Error during app initialization:', error);
  }
});

// Add handler for 'read-file' IPC calls to ensure correct file path resolution
ipcMain.handle('read-file', async (event, filePath, options = {}) => {
  try {
    // Check if it's a relative path and prepend the resources directory
    const resolvedPath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(__dirname, 'main', filePath);
    
    log.info(`Reading file: ${filePath} (resolved to: ${resolvedPath})`);
    return await fs.promises.readFile(resolvedPath, options);
  } catch (error) {
    log.error(`Error reading file ${filePath}:`, error);
    throw error;
  }
});

// Add handler for 'write-file' IPC calls
ipcMain.handle('write-file', async (event, filePath, data, options = {}) => {
  try {
    // Resolve the file path relative to the main directory
    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(__dirname, 'main', filePath);
      
    log.info(`Writing file: ${filePath} (resolved to: ${resolvedPath})`);
    await fs.promises.writeFile(resolvedPath, data, options);
    return true;
  } catch (error) {
    log.error(`Error writing file ${filePath}:`, error);
    throw error;
  }
});

// Handle start new game
ipcMain.handle('start-new-game', async (event, gameData) => {
  try {
    log.info('Starting new game with options:', gameData);
    // Store the game options for later use
    global.newGameOptions = gameData;
    return true;
  } catch (error) {
    log.error('Error starting new game:', error);
    throw error;
  }
});

// Handle get new game options
ipcMain.handle('get-new-game-options', async () => {
  log.info('Retrieving new game options:', global.newGameOptions);
  return global.newGameOptions;
});

// Handle load game
ipcMain.handle('load-game', async () => {
  try {
    log.info('Loading saved game');
    // This would be implemented according to your game's save/load system
    return global.savedGameData || null;
  } catch (error) {
    log.error('Error loading game:', error);
    throw error;
  }
});

// Handle save game
ipcMain.handle('save-game', async (event, gameData) => {
  try {
    log.info('Saving game data');
    global.savedGameData = gameData;
    return { success: true };
  } catch (error) {
    log.error('Error saving game:', error);
    throw error;
  }
});

// Handle get settings
ipcMain.handle('get-settings', async () => {
  return global.gameSettings || {
    volume: 50,
    musicEnabled: true,
    soundEnabled: true,
    simulationSpeed: 1.0
  };
});

// Handle update settings
ipcMain.handle('update-settings', async (event, settings) => {
  try {
    global.gameSettings = settings;
    return { success: true };
  } catch (error) {
    log.error('Error updating settings:', error);
    throw error;
  }
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  log.info('All windows closed');
  if (process.platform !== 'darwin') {
    log.info('Quitting application (non-macOS platform)');
    app.quit();
  }
});

// Log unhandled exceptions
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error);
});

// Log unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled rejection at:', promise, 'reason:', reason);
});

// Handle quit request from renderer
ipcMain.on('quit-app', () => {
  log.info('Quit requested from renderer');
  app.quit();
});

// Handle auto-updater events
autoUpdater.on('checking-for-update', () => {
  log.info('Checking for application updates');
});

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info);
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-not-available', (info) => {
  log.info('Update not available:', info);
});

autoUpdater.on('error', (err) => {
  log.error('Auto-updater error:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  let logMessage = `Download speed: ${progressObj.bytesPerSecond} - `;
  logMessage += `Downloaded ${progressObj.percent}% `;
  logMessage += `(${progressObj.transferred}/${progressObj.total})`;
  log.info(logMessage);
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info);
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded');
  }
});

ipcMain.on('quit-and-install', () => {
  log.info('Quit and install update requested');
  autoUpdater.quitAndInstall();
});