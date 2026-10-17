// preload.js
let contextBridge;
let ipcRenderer;
try {
  const electron = require('electron');
  contextBridge = electron.contextBridge;
  ipcRenderer = electron.ipcRenderer;
} catch (error) {
  console.error('Error requiring electron modules:', error);
}

// Only run the rest of the code if we have the required modules
if (contextBridge && ipcRenderer) {
  // Expose protected methods that allow the renderer process to use
  // the ipcRenderer without exposing the entire object
  contextBridge.exposeInMainWorld('gameAPI', {
    // True when running unpackaged (npm start, tests). See electron-main.js.
    isDev: process.argv.includes('--thepharmacy-dev'),
    saveGame: (gameData) => {
      return ipcRenderer.invoke('save-game', gameData);
    },
    loadGame: () => {
      return ipcRenderer.invoke('load-game');
    },
    updateSettings: (settings) => {
      return ipcRenderer.invoke('update-settings', settings);
    },
    getSettings: () => {
      return ipcRenderer.invoke('get-settings');
    },
    getSavedGames: () => {
      return ipcRenderer.invoke('get-saved-games');
    },
    deleteSavedGame: (index) => {
      return ipcRenderer.invoke('delete-saved-game', index);
    },
    startNewGame: (gameData) => {
      return ipcRenderer.invoke('start-new-game', gameData);
    },
    getNewGameOptions: () => {
      return ipcRenderer.invoke('get-new-game-options');
    },
    // Add simple quit function
    quit: () => {
      ipcRenderer.send('quit-app');
    },
    // Log errors to main process
    logError: (error) => {
      ipcRenderer.send('log-error', error);
    },
  });

  // Expose electron-specific APIs
  contextBridge.exposeInMainWorld('electronAPI', {
    onUpdateAvailable: (callback) => {
      ipcRenderer.on('update-available', (event, ...args) => callback(...args));
    },
    onUpdateDownloaded: (callback) => {
      ipcRenderer.on('update-downloaded', (event, ...args) => callback(...args));
    },
    quitAndInstall: () => {
      ipcRenderer.send('quit-and-install');
    },
  });
} else {
  console.error('Required Electron modules not available. Preload script cannot function properly.');
}
