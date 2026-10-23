// The Electron side: preload.js's gameAPI and electronAPI, the main
// menu's settings, and save/load (electron-integration.ts).
//
// Ambient typings for the window globals: every file is a classic
// <script> (no modules), and each module adds its own fields to Window.

// Partial — preload.js (not yet converted) owns the real, larger shape.
// loadGame returns whatever JSON is on disk (any save version) or null.
// The main menu's Settings page (settings.html), stored by the main
// process in settings.json. game-integration.js fills in defaults.
interface GameSettings {
    // Speed a new game starts at (a loaded game keeps its own)
    simulationSpeed: number;
    autoSaveEnabled: boolean;
    // Minutes of play at 1x between autosaves
    autoSaveInterval: number;
    // Applied by the main process (zoom factor and fullscreen)
    uiScale: number;
    fullscreenEnabled: boolean;
    // Start the next day without showing the daily summary (Phase 9, #49),
    // and don't open the monthly or yearly report (Phase 10, #13)
    skipDailySummary: boolean;
    skipMonthlyReport: boolean;
    skipYearlyReport: boolean;
}

// A save in the saves folder (game-integration.js getSavedGames), Phase 10
// save slots: each game's named saves and its rotating autosaves.
interface SaveSlotInfo {
    slot: string;
    name: string;
    kind: 'manual' | 'auto';
    gameId: string | null;
    companyName: string;
    // The day it was saved on (from 1), cash, and closings in a row in the red
    day: number;
    cash: number;
    daysInRed: number;
    // Wall-clock time (ms)
    lastSaved: number | null;
}

// What game-integration.js adds to a save file it writes
interface SaveSlotMeta {
    id: string;
    name: string;
    kind: 'manual' | 'auto';
}

interface GameApi {
    // Running unpackaged: developer tools (the debug overlay) are available.
    isDev?: boolean;
    getSettings?: () => Promise<Partial<GameSettings> | null>;
    // Stores the whole settings object (missing keys go back to defaults).
    updateSettings?: (settings: GameSettings) => Promise<{ success: boolean } | undefined>;
    getNewGameOptions?: () => Promise<unknown>;
    // A slot's save (any version, with its SaveSlotMeta as `slot`), or the
    // newest if none is given; null if there's none
    loadGame?: (slot?: string) => Promise<unknown>;
    // auto: the game's next autosave slot. Otherwise `slot`, or a new slot
    // from `name`.
    saveGame?: (
        gameData: SaveFile,
        options?: { slot?: string | null; name?: string; auto?: boolean },
    ) => Promise<{ success: boolean; slot?: string } | undefined>;
    getSavedGames?: () => Promise<SaveSlotInfo[]>;
    deleteSavedGame?: (slot: string) => Promise<boolean>;
    // The main menu (menu/mainMenu.ts): the save main.html loads next
    // (mode=load), the new game's options (mode=new), and quitting
    selectSave?: (slot: string) => Promise<boolean>;
    startNewGame?: (options: NewGameOptions) => Promise<boolean>;
    quit?: () => void;
    logError?: (error: { message: string; stack: string }) => void;
}

// Partial — preload.js (not yet converted) owns the real, larger shape.
interface UpdateInfo {
    version: string;
}

interface ElectronApi {
    onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
    onUpdateDownloaded: (callback: () => void) => void;
    quitAndInstall: () => void;
}

interface AutoSaveApi {
    // Interval in game minutes (default 300, i.e. 5 real minutes at 1x).
    start: (intervalGameMinutes?: number) => void;
    stop: () => void;
}

interface Window {
    // The main menu's settings the game reads while it runs, filled in from
    // gameAPI.getSettings at startup (game-bootstrap.ts)
    appSettings: Pick<GameSettings, 'skipDailySummary' | 'skipMonthlyReport' | 'skipYearlyReport'>;
    gameAPI?: GameApi;
    electronAPI?: ElectronApi;
    // Both owned by electron-integration.ts. Saves go to this session's slot
    // (saveSession) unless `name` starts a new one; `auto` to the next
    // autosave slot; `silent` skips the success notification.
    saveGame?: (options?: { silent?: boolean; auto?: boolean; name?: string }) => Promise<boolean>;
    // A slot's save, or the newest
    loadGame?: (slot?: string) => Promise<boolean>;
    autoSave?: AutoSaveApi;
    // The slot Save (Ctrl+S) writes: the save this session was loaded from,
    // or, for a new game or an autosave, a new one named after the company
    // (gameInitializer.ts sets it; electron-integration.ts updates it)
    saveSession: { slot: string | null; name: string };
}
