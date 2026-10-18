// game-integration.js
const log = require('electron-log');

// Then replace console.log calls with log.info, console.error with log.error, etc.
const { ipcMain, app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// Game state management
let gameState = null;
let newGameOptions = null;

// The main menu's Settings page (settings.html). Only settings the game
// actually applies are kept (findings M18): the default speed for new games
// and autosave (read by the renderer), UI scale and fullscreen (applied
// here, to every window).
const DEFAULT_SETTINGS = {
  simulationSpeed: 1,
  autoSaveEnabled: true,
  autoSaveInterval: 5, // minutes of play at 1x
  uiScale: 1,
  fullscreenEnabled: false,
};
const SPEEDS = [0.5, 1, 2, 5];
const UI_SCALES = [0.8, 1, 1.2, 1.5];

// Known keys only, each a valid value or its default
function sanitizeSettings(raw) {
  const settings = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== 'object') return settings;
  const speed = Number(raw.simulationSpeed);
  if (SPEEDS.includes(speed)) settings.simulationSpeed = speed;
  if (typeof raw.autoSaveEnabled === 'boolean') settings.autoSaveEnabled = raw.autoSaveEnabled;
  const interval = Math.round(Number(raw.autoSaveInterval));
  if (interval >= 1 && interval <= 60) settings.autoSaveInterval = interval;
  const scale = Number(raw.uiScale);
  if (UI_SCALES.includes(scale)) settings.uiScale = scale;
  if (typeof raw.fullscreenEnabled === 'boolean') settings.fullscreenEnabled = raw.fullscreenEnabled;
  return settings;
}

// UI scale and fullscreen. Called when a page finishes loading (zoom is
// per page) and whenever the settings are saved.
function applyDisplaySettings(win, settings = loadSettings()) {
  if (!win || win.isDestroyed()) return;
  win.webContents.setZoomFactor(settings.uiScale);
  if (win.isFullScreen() !== settings.fullscreenEnabled) win.setFullScreen(settings.fullscreenEnabled);
}

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
    const saved = sanitizeSettings(settings);
    const success = saveSettings(saved);
    if (success) BrowserWindow.getAllWindows().forEach((win) => applyDisplaySettings(win, saved));
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

    fs.mkdirSync(userDataPath, { recursive: true });
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
      return sanitizeSettings(JSON.parse(fs.readFileSync(settingsPath, 'utf8')));
    }
    return { ...DEFAULT_SETTINGS };
  } catch (error) {
    log.error('Error loading settings:', error);
    return { ...DEFAULT_SETTINGS };
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
  applyDisplaySettings,
};
