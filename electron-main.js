const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const { initGameIntegration } = require('./game-integration');
const log = require('electron-log');

// Lets tests run against a throwaway profile instead of the player's real
// saves. Must be set before the app is ready.
if (process.env.THEPHARMACY_USER_DATA) {
  app.setPath('userData', process.env.THEPHARMACY_USER_DATA);
}

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
      devTools: true,
      // Tells the renderer (via preload's gameAPI.isDev) to load developer
      // tools such as the debug overlay. Packaged builds don't get them.
      additionalArguments: app.isPackaged ? [] : ['--thepharmacy-dev'],
    },
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

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    log.info('Main window ready to show');
    mainWindow.show();

    // Open DevTools automatically only in development
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools();
    }
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

  // Log renderer console messages to electron-log. Packaged builds only keep
  // warnings and errors, so routine game logging doesn't fill the log file.
  mainWindow.webContents.on('console-message', (event) => {
    const logLevel = event.level === 'warning' ? 'warn' : event.level;
    if (app.isPackaged && logLevel !== 'warn' && logLevel !== 'error') return;
    (log[logLevel] || log.info)(`[Renderer] ${event.message} (${event.sourceId}:${event.lineNumber})`);
  });

  return mainWindow;
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  log.info('Electron app is ready!');

  // Register IPC handlers once per app, not per window - ipcMain.handle
  // throws on a second registration (e.g. macOS 'activate' re-creating the
  // window).
  try {
    initGameIntegration();
    log.info('Game integration initialized successfully');
  } catch (error) {
    log.error('Failed to initialize game integration:', error);
  }

  try {
    createWindow();
    log.info('Main window created successfully');

    // Check for updates
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
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

// NOTE: 'read-file', 'write-file', 'start-new-game', 'get-new-game-options',
// 'load-game', 'save-game', 'get-settings', and 'update-settings' are handled
// by initGameIntegration() (see game-integration.js), which
// persists to disk under the app's userData directory. They used to also be
// registered here as in-memory-only duplicates, which made Electron throw on
// the second registration and silently aborted the rest of
// gameIntegration's setup (including get-saved-games/delete-saved-game/
// log-error) - the game could never actually save.

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
