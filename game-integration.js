// game-integration.js
const log = require('electron-log');

// Then replace console.log calls with log.info, console.error with log.error, etc.
const { ipcMain, app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

let newGameOptions = null;
// The save the main menu's Load list picked; main.html loads it (mode=load)
let selectedSlot = null;

// Save slots (Phase 10): every save is saves/<slot>.json. A game's saves
// share its gameState.gameId. Saving writes the game's own slot (named
// after the company, or a name the player gives); autosaves rotate
// through AUTOSAVES_KEPT slots per game, overwriting the oldest. A save
// from before slots, pharmacy_save.json, is listed like any other.
const AUTOSAVES_KEPT = 3;
const LEGACY_SLOT = 'pharmacy_save';

// The main menu's Settings page (settings.html). Only settings the game
// actually applies are kept (findings M18): the default speed for new games,
// autosave and skipping the daily summary (read by the renderer), UI scale
// and fullscreen (applied here, to every window). The in-game Settings page
// changes skipDailySummary too.
const DEFAULT_SETTINGS = {
  simulationSpeed: 2,
  autoSaveEnabled: true,
  autoSaveInterval: 5, // minutes of play at 1x
  uiScale: 1,
  fullscreenEnabled: false,
  skipDailySummary: false,
  skipMonthlyReport: false,
  skipYearlyReport: false,
};
// The speeds offered in the game (main.ts GAME_SPEEDS). A stored 0.5 from
// before Phase 9 falls back to the default.
const SPEEDS = [1, 2, 5, 10];
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
  if (typeof raw.skipDailySummary === 'boolean') settings.skipDailySummary = raw.skipDailySummary;
  if (typeof raw.skipMonthlyReport === 'boolean') settings.skipMonthlyReport = raw.skipMonthlyReport;
  if (typeof raw.skipYearlyReport === 'boolean') settings.skipYearlyReport = raw.skipYearlyReport;
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
  // Saves into a slot: options.auto for the next autosave slot, otherwise
  // options.slot, or a new slot from options.name. Returns the slot used.
  ipcMain.handle('save-game', async (event, gameData, options = {}) => {
    return saveGameState(gameData, options || {});
  });

  // Loads a slot: the one given, else the one the Load list picked, else
  // the newest save. Null if there's none.
  ipcMain.handle('load-game', async (event, slot) => {
    const chosen = slot || selectedSlot || getSavedGames()[0]?.slot;
    selectedSlot = null;
    return chosen ? loadGameState(chosen) : null;
  });

  ipcMain.handle('select-save', async (event, slot) => {
    selectedSlot = isSlotId(slot) ? slot : null;
    return selectedSlot !== null;
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

  // Every save, newest first
  ipcMain.handle('get-saved-games', async () => {
    return getSavedGames();
  });

  ipcMain.handle('delete-saved-game', async (event, slot) => {
    try {
      if (!isSlotId(slot)) return false;
      const file = slotPath(slot);
      if (!fs.existsSync(file)) return false;
      fs.unlinkSync(file);
      if (fs.existsSync(file + '.bak')) fs.unlinkSync(file + '.bak');
      return true;
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

// Slot ids are file names: letters, digits, '-' and '_' only
function isSlotId(slot) {
  return typeof slot === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(slot);
}

function slotPath(slot) {
  return path.join(getSavesDir(), slot + '.json');
}

// 'Mountain Care' -> 'mountain-care'
function slug(text) {
  const base = String(text || 'save')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || 'save';
}

function gameIdOf(gameData) {
  const id = gameData && gameData.gameState && gameData.gameState.gameId;
  return isSlotId(id) ? id : 'game';
}

// The next autosave slot for a game: an unused one, else the oldest
function autosaveSlot(gameId) {
  const slots = [];
  for (let n = 1; n <= AUTOSAVES_KEPT; n++) slots.push(`autosave-${gameId}-${n}`);
  const unused = slots.find((slot) => !fs.existsSync(slotPath(slot)));
  if (unused) return unused;
  return slots.sort((a, b) => fs.statSync(slotPath(a)).mtimeMs - fs.statSync(slotPath(b)).mtimeMs)[0];
}

// A new slot for a named save, unique in the folder
function newSlot(name, gameId) {
  const base = `${slug(name)}-${gameId.replace(/^game-/, '')}`.slice(0, 70);
  let slot = base;
  for (let n = 2; fs.existsSync(slotPath(slot)); n++) slot = `${base}-${n}`;
  return slot;
}

// Writes a save into a slot, with the slot's name and kind in the file.
// Returns { success, slot }.
function saveGameState(gameData, options) {
  try {
    fs.mkdirSync(getSavesDir(), { recursive: true });
    const gameId = gameIdOf(gameData);
    const auto = options.auto === true;
    const companyName = (gameData.company && gameData.company.name) || 'Saved game';
    const name = auto ? `Autosave` : String(options.name || companyName).slice(0, 60);
    const slot = auto ? autosaveSlot(gameId) : isSlotId(options.slot) ? options.slot : newSlot(name, gameId);
    const saveFile = slotPath(slot);

    // Write to a temp file and rename it into place, so a crash mid-write
    // can't corrupt the save. The previous save is kept as a .bak.
    const tmpFile = saveFile + '.tmp';
    const data = { ...gameData, slot: { id: slot, name, kind: auto ? 'auto' : 'manual' } };
    fs.writeFileSync(tmpFile, JSON.stringify(data));
    if (fs.existsSync(saveFile)) {
      fs.copyFileSync(saveFile, saveFile + '.bak');
    }
    fs.renameSync(tmpFile, saveFile);

    log.info(`Game saved to ${slot}`);
    return { success: true, slot };
  } catch (error) {
    log.error('Error saving game:', error);
    return { success: false };
  }
}

// Reads a slot, or null
function loadGameState(slot) {
  try {
    if (!isSlotId(slot)) return null;
    const savePath = slotPath(slot);
    if (!fs.existsSync(savePath)) {
      log.info(`No save in ${slot}`);
      return null;
    }
    const data = JSON.parse(fs.readFileSync(savePath, 'utf8'));
    // A save from before slots says nothing about itself
    data.slot = { name: 'Saved game', kind: 'manual', ...(data.slot || {}), id: slot };
    log.info(`Game loaded from ${slot}`);
    return data;
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

// Every save in the folder, newest first, with what the Load lists show.
// Saves from before Phase 10 keep the company's name and cash at the top
// level. A file that can't be read, or isn't a save, is left out.
function getSavedGames() {
  const dir = getSavesDir();
  if (!fs.existsSync(dir)) return [];
  const saves = [];
  fs.readdirSync(dir).forEach((file) => {
    const match = /^([A-Za-z0-9_-]+)\.json$/.exec(file);
    if (!match) return;
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      // Only saves the game wrote: they say which slot they are, or are the
      // one save from before slots. Any other file is left alone.
      if (!data.slot && match[1] !== LEGACY_SLOT) return;
      const slot = data.slot || {};
      const gameState = data.gameState || {};
      saves.push({
        slot: match[1],
        name: slot.name || 'Saved game',
        kind: slot.kind === 'auto' ? 'auto' : 'manual',
        gameId: gameState.gameId || null,
        companyName: (data.company && data.company.name) || gameState.pharmacyName || 'Unnamed Pharmacy',
        day: (Number(gameState.dayIndex) || 0) + 1,
        cash:
          Number((data.company && data.company.finances && data.company.finances.cash) ?? data.financesData?.cash) || 0,
        daysInRed: Number(gameState.daysInRed) || 0,
        lastSaved: data.timestamp || null,
      });
    } catch (error) {
      log.error(`Error reading save ${file}:`, error);
    }
  });
  return saves.sort((a, b) => (b.lastSaved || 0) - (a.lastSaved || 0));
}

function getSavesDir() {
  return path.join(getUserDataPath(), 'saves');
}

// Helper to get user data path
function getUserDataPath() {
  return app.getPath('userData');
}

module.exports = {
  initGameIntegration,
  applyDisplaySettings,
};
