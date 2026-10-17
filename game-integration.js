// game-integration.js
const log = require('electron-log');

// Then replace console.log calls with log.info, console.error with log.error, etc.
const { ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs');

// Game state management
let gameState = null;
let newGameOptions = null;

// Initialize game integration. Call once per app - ipcMain.handle throws if a
// channel is registered twice.
function initGameIntegration() {
  setupIpcListeners();
}

// Set up IPC listeners to handle game-related events
function setupIpcListeners() {
  // Handle save game requests - using handle instead of on for invoke compatibility
  ipcMain.handle('save-game', async (event, gameData) => {
    const success = saveGameState(gameData);
    return { success };
  });

  // Handle load game requests - using handle instead of on for invoke compatibility
  ipcMain.handle('load-game', async () => {
    return loadGameState();
  });

  // Handle game settings changes - using handle instead of on for invoke compatibility
  ipcMain.handle('update-settings', async (event, settings) => {
    const success = saveSettings(settings);
    return { success };
  });

  // Handle get settings request
  ipcMain.handle('get-settings', async () => {
    return loadSettings();
  });

  // Handle get saved games list
  ipcMain.handle('get-saved-games', async () => {
    try {
      const userDataPath = getUserDataPath();
      const savePath = path.join(userDataPath, 'saves');

      if (!fs.existsSync(savePath)) {
        return [];
      }

      const files = fs.readdirSync(savePath);
      const saveFiles = files.filter((file) => file.endsWith('.json'));

      const savedGames = saveFiles
        .map((file) => {
          try {
            const filePath = path.join(savePath, file);
            const data = fs.readFileSync(filePath, 'utf8');
            const saveData = JSON.parse(data);
            return {
              name: file,
              path: filePath,
              lastSaved: saveData.timestamp || null,
              pharmacyName: saveData.gameState?.pharmacyName || 'Unnamed Pharmacy',
              difficulty: saveData.gameState?.difficulty || 'normal',
              cash: saveData.financesData?.cash || 0,
            };
          } catch (err) {
            log.error(`Error reading save file ${file}:`, err);
            return null;
          }
        })
        .filter(Boolean);

      return savedGames;
    } catch (error) {
      log.error('Error getting saved games:', error);
      return [];
    }
  });

  // Handle delete saved game
  ipcMain.handle('delete-saved-game', async (event, index) => {
    try {
      const savedGames = getSavedGames();
      if (savedGames && savedGames[index]) {
        fs.unlinkSync(savedGames[index].path);
        return true;
      }
      return false;
    } catch (error) {
      log.error('Error deleting saved game:', error);
      return false;
    }
  });

  // Handle start new game
  ipcMain.handle('start-new-game', async (event, gameData) => {
    try {
      newGameOptions = gameData;
      log.info('Stored new game options:', newGameOptions);
      return true;
    } catch (error) {
      log.error('Error storing new game options:', error);
      return false;
    }
  });

  // Handle get new game options
  ipcMain.handle('get-new-game-options', async () => {
    return newGameOptions;
  });

  // Log error from renderer
  ipcMain.on('log-error', (event, error) => {
    log.error('Error from renderer process:', error);
  });
}

// Save game state to file
function saveGameState(gameData) {
  try {
    const userDataPath = getUserDataPath();
    const savePath = path.join(userDataPath, 'saves');

    // Create saves directory if it doesn't exist
    if (!fs.existsSync(savePath)) {
      fs.mkdirSync(savePath, { recursive: true });
    }

    // Write to a temp file and rename it into place, so a crash mid-write
    // can't corrupt the save. The previous save is kept as a .bak (outside
    // the *.json pattern the Load menu lists).
    const saveFile = path.join(savePath, 'pharmacy_save.json');
    const tmpFile = saveFile + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(gameData, null, 2));
    if (fs.existsSync(saveFile)) {
      fs.copyFileSync(saveFile, saveFile + '.bak');
    }
    fs.renameSync(tmpFile, saveFile);

    log.info('Game saved successfully');
    return true;
  } catch (error) {
    log.error('Error saving game:', error);
    return false;
  }
}

// Load game state from file
function loadGameState() {
  try {
    const userDataPath = getUserDataPath();
    const savePath = path.join(userDataPath, 'saves', 'pharmacy_save.json');

    // Check if save file exists
    if (fs.existsSync(savePath)) {
      const saveData = fs.readFileSync(savePath, 'utf8');
      gameState = JSON.parse(saveData);
      log.info('Game loaded successfully');
      return gameState;
    } else {
      log.info('No save file found, starting new game');
      return null;
    }
  } catch (error) {
    log.error('Error loading game:', error);
    return null;
  }
}

// Save game settings
function saveSettings(settings) {
  try {
    const userDataPath = getUserDataPath();
    const settingsPath = path.join(userDataPath, 'settings.json');

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    log.info('Settings saved successfully');
    return true;
  } catch (error) {
    log.error('Error saving settings:', error);
    return false;
  }
}

// Load game settings
function loadSettings() {
  try {
    const userDataPath = getUserDataPath();
    const settingsPath = path.join(userDataPath, 'settings.json');

    if (fs.existsSync(settingsPath)) {
      const settingsData = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(settingsData);
    } else {
      // Return default settings
      return {
        volume: 50,
        musicEnabled: true,
        soundEnabled: true,
        simulationSpeed: 1.0,
      };
    }
  } catch (error) {
    log.error('Error loading settings:', error);
    return null;
  }
}

// Get saved games list
function getSavedGames() {
  try {
    const userDataPath = getUserDataPath();
    const savePath = path.join(userDataPath, 'saves');

    if (!fs.existsSync(savePath)) {
      return [];
    }

    const files = fs.readdirSync(savePath);
    const saveFiles = files.filter((file) => file.endsWith('.json'));

    const savedGames = saveFiles
      .map((file) => {
        try {
          const filePath = path.join(savePath, file);
          const data = fs.readFileSync(filePath, 'utf8');
          const saveData = JSON.parse(data);
          return {
            name: file,
            path: filePath,
            lastSaved: saveData.timestamp || null,
            pharmacyName: saveData.gameState?.pharmacyName || 'Unnamed Pharmacy',
            difficulty: saveData.gameState?.difficulty || 'normal',
            cash: saveData.financesData?.cash || 0,
          };
        } catch (err) {
          log.error(`Error reading save file ${file}:`, err);
          return null;
        }
      })
      .filter(Boolean);

    return savedGames;
  } catch (error) {
    log.error('Error getting saved games:', error);
    return [];
  }
}

// Helper to get user data path
function getUserDataPath() {
  return app.getPath('userData');
}

module.exports = {
  initGameIntegration,
};
