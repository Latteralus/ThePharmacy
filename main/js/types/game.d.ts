// The game itself: its state, the clock and the day (main.ts, clock.ts,
// timeEvents.ts, gameInitializer.ts, game-bootstrap.ts).
//
// Ambient typings for the window globals: every file is a classic
// <script> (no modules), and each module adds its own fields to Window.

interface RenderInfo {
    fps: number;
    frameCount: number;
    lastFpsUpdate: number;
}

// Now the real, full shape (main.js owns it). currentDate stays narrowed to
// Date, not string | Date: by the time any converted file reads it during
// normal gameplay, save/load's date revival (see documents/Changelog.md,
// 2026-08-15 "Save/load fixed") has already run, so it's always a real Date
// instance — `new Date(x)` still accepts a Date argument, so this doesn't
// break existing callers. simulationAccumulator/lastFrameTime/
// lastSimulationTime/renderInfo/dateCreated are genuinely optional: the unit
// tests build `window.gameState` with only the fields they need, and
// main.js's gameLoop treats a missing lastFrameTime as the first frame.
interface GameState {
    currentDate: Date;
    dayIndex: number;
    isDayActive: boolean;
    isPaused: boolean;
    // Which game a save belongs to, so its saves and autosaves are listed
    // together (Phase 10 save slots). Set at a new game.
    gameId?: string;
    simulationAccumulator?: number;
    lastFrameTime?: number;
    lastSimulationTime?: number;
    renderInfo?: RenderInfo;
    dateCreated?: Date;
    // dayIndex of the last day whose end-of-day costs were applied. Lets a
    // save made while the daily summary was open load without charging that
    // day's wages and overhead a second time.
    lastEndedDayIndex?: number;
    // The next number window.nextId hands out (ids.ts). Missing in a new
    // game and in saves from before the counter; both start at 1.
    nextId?: number;
    // Customers who left today, by reason (for the daily summary). Reset
    // when a new day starts; missing until the first departure.
    customersToday?: Partial<Record<DepartureReason, number>>;
    // Closings in a row with cash below $0 (stakes.ts); the third is bankruptcy.
    daysInRed?: number;
    // Game over. Never saved: saveGame refuses a bankrupt pharmacy.
    bankrupt?: boolean;
    // dayIndex each goal was reached on, by goal id (goals.ts)
    goalsReached?: Record<string, number>;
    // dayIndex every goal had been reached by (the win)
    wonOnDay?: number;
    // The front door (Phase 9, #8). Closed: no new customers, while those
    // inside are served and staff keep working. Opens every morning.
    // Missing in saves from before Phase 9 (migrated to true).
    frontOpen?: boolean;
    // Game time (ms) the front was closed today, if it still is
    frontClosedAt?: number;
    // Game time (ms) the player ended the day early (End day)
    closedEarlyAt?: number;
}

// Options passed from the new-game form, through gameAPI, to
// initializeNewGame. Every field is read with an `||` fallback, so all
// optional.
interface NewGameOptions {
    // The company's name
    pharmacyName?: string;
    // The lease listing chosen (data/properties.ts) and its term in years
    propertyId?: string;
    leaseYears?: number;
    // The startup loan, if one was negotiated
    loan?: LoanTerms | null;
}

interface TimeEventsConfig {
    OPENING_HOUR: number;
    CLOSING_HOUR: number;
    // No hourly batch of customers from this hour (last entry an hour
    // before closing, Phase 9 #50)
    LAST_ENTRY_HOUR: number;
}

// clock.ts - the game clock and scheduler. Delays are in game minutes; jobs
// only run while the simulation is advancing (day active, not paused).
interface ClockApi {
    now: () => number;
    every: (gameMinutes: number, fn: () => void) => number;
    after: (gameMinutes: number, fn: () => void) => number;
    cancel: (id: number) => void;
    tick: () => void;
}

// Now the real, full shape (timeEvents.ts owns it). Window.timeEvents stays
// optional below — every call site across the codebase guards with
// `window.timeEvents && ...` first, predating this file's own conversion.
interface TimeEventsApi {
    startOfDay: (gameState: GameState) => void;
    endOfDay: (gameState: GameState) => void;
    skipToNextDay: (gameState: GameState) => void;
    minuteCheck: (gameState: GameState) => void;
    hourlyCheck: (gameState: GameState, hour: number) => void;
    spawnCustomersForHour: (hour: number) => void;
    // Cancels this hour's arrivals that haven't happened yet (used on load).
    cancelPendingArrivals: () => void;
    autoOrderCheck: () => void;
    autoPurchaseEquipmentCheck: () => void;
    // Closing: the 22:00 check and End day. Settles the day once
    // (lastEndedDayIndex), then the summary or the next day.
    closeDay: (gameState: GameState) => void;
    // Store controls (Phase 9, #8)
    setFrontOpen: (open: boolean) => void;
    // Ends the day now: customers still inside leave, work resumes tomorrow.
    endDayNow: () => void;
    // What End day would leave unfinished, for its confirmation
    closingPreview: () => { customers: number; tasksInProgress: number };
    CONFIG: TimeEventsConfig;
    addEventListener: (event: string, callback: (data: unknown) => void) => void;
    removeEventListener: (event: string, callback: (data: unknown) => void) => void;
    EVENTS: {
        START_OF_DAY: string;
        END_OF_DAY: string;
        HOURLY_CHECK: string;
        AUTO_ORDERS_PLACED: string;
        AUTO_EQUIPMENT_PURCHASED: string;
    };
}

interface BootstrapApi {
    retry: () => void;
    checkComponents: () => boolean;
    buildUI: () => void;
}

interface Window {
    // Speeds offered to the player (main.ts), keys 1-4 in order
    GAME_SPEEDS: number[];
    timeEvents?: TimeEventsApi;
    clock: ClockApi;
    // A new id, `${prefix}-${n}`, from the counter saved on gameState (ids.ts).
    nextId: (prefix: string) => string;
    gameState: GameState;
    isGameInitialized: boolean;
    gameLoop: (timestamp: number) => void;
    setGameSpeed: (speedMultiplier: number) => void;
    getGameSpeed: () => number;
    toggleGamePause: () => void;
    initializeNewGame: (gameOptions: NewGameOptions) => boolean;
    loadSavedGame: () => Promise<boolean>;
    applySavedGame: (gameData: unknown) => void;
    bootstrapGame: BootstrapApi;
}
