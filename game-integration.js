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

  // The game has one save slot (saveGameState always writes
  // pharmacy_save.json, and load-game always reads it), so the Load menu
  // lists that file alone, not every *.json in the folder.
  ipcMain.handle('get-saved-games', async () => {
    return getSavedGames();
  });

  // Deletes the save slot. The index is kept for the preload API's shape;
  // there is only ever one entry.
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
    const saveFile = getSaveFilePath();
    fs.mkdirSync(path.dirname(saveFile), { recursive: true });

    // Write to a temp file and rename it into place, so a crash mid-write
    // can't corrupt the save. The previous save is kept as a .bak.
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
    const savePath = getSaveFilePath();

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

// The save slot, as a one-entry list for the Load menu (empty if there's
// no save yet, or it can't be read).
function getSavedGames() {
  const filePath = getSaveFilePath();
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const saveData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return [
      {
        name: path.basename(filePath),
        path: filePath,
        lastSaved: saveData.timestamp || null,
        pharmacyName: saveData.gameState?.pharmacyName || 'Unnamed Pharmacy',
        difficulty: saveData.gameState?.difficulty || 'normal',
        cash: saveData.financesData?.cash || 0,
      },
    ];
  } catch (error) {
    log.error('Error reading save file:', error);
    return [];
  }
}

function getSaveFilePath() {
  return path.join(getUserDataPath(), 'saves', 'pharmacy_save.json');
}

// Helper to get user data path
function getUserDataPath() {
  return app.getPath('userData');
}

module.exports = {
  initGameIntegration,
};
