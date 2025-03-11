// preload.js
let path;
try {
  path = require('path');
} catch (error) {
  console.error('Error requiring path module:', error);
}

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
  contextBridge.exposeInMainWorld(
    'gameAPI', {
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
      // File system access for game data
      readFile: async (filePath, options = {}) => {
        try {
          return await ipcRenderer.invoke('read-file', filePath, options);
        } catch (error) {
          console.error(`Error reading file ${filePath}:`, error);
          throw error;
        }
      },
      writeFile: async (filePath, data, options = {}) => {
        try {
          return await ipcRenderer.invoke('write-file', filePath, data, options);
        } catch (error) {
          console.error(`Error writing file ${filePath}:`, error);
          throw error;
        }
      },
      // Add simple quit function
      quit: () => {
        ipcRenderer.send('quit-app');
      },
      // Log errors to main process
      logError: (error) => {
        ipcRenderer.send('log-error', error);
      }
    }
  );

  // Expose electron-specific APIs
  contextBridge.exposeInMainWorld(
    'electronAPI', {
      onUpdateAvailable: (callback) => {
        ipcRenderer.on('update-available', (event, ...args) => callback(...args));
      },
      onUpdateDownloaded: (callback) => {
        ipcRenderer.on('update-downloaded', (event, ...args) => callback(...args));
      },
      quitAndInstall: () => {
        ipcRenderer.send('quit-and-install');
      }
    }
  );

  // Expose window file system API for game data - but use IPC instead of direct fs access
  contextBridge.exposeInMainWorld('fs', {
    readFile: async (filepath, options = {}) => {
      try {
        // Use ipcRenderer.invoke instead of direct fs access
        return await ipcRenderer.invoke('read-file', filepath, options);
      } catch (error) {
        console.error(`Error reading file ${filepath}:`, error);
        throw error;
      }
    }
  });

  // Expose app paths to the renderer process
  if (path) {
    try {
      contextBridge.exposeInMainWorld('appPath', {
        resourcesPath: path.join(__dirname, 'main'),
        getResourcePath: (relativePath) => {
          return path.join(__dirname, 'main', relativePath);
        }
      });
    } catch (error) {
      console.error('Error creating appPath object:', error);
      contextBridge.exposeInMainWorld('appPath', {
        resourcesPath: null,
        getResourcePath: () => null
      });
    }
  } else {
    console.warn('Path module not available, app paths will not be exposed');
    contextBridge.exposeInMainWorld('appPath', {
      resourcesPath: null,
      getResourcePath: () => null
    });
  }
} else {
  console.error('Required Electron modules not available. Preload script cannot function properly.');
}