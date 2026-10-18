// gameInitializer.js - Handles the initialization of a new game or loading a saved game

window.initializeNewGame = function (gameOptions: NewGameOptions): boolean {
    console.log('[gameInitializer] Starting new game initialization with options:', gameOptions);

    try {
        // Set the desired starting date and time (year, month (0-indexed), day, hour, minute)
        const startDate = new Date(2023, 0, 1, 7, 0); // January 1st, 2023, 7:00 AM
        console.log('[gameInitializer] Setting start date to:', startDate);

        // 1. Initialize game state
        console.log('[gameInitializer] Creating game state object');
        window.gameState = {
            currentDate: new Date(startDate.getTime()),
            dayIndex: 0, // Start at day 0
            isDayActive: false, // Initially set to false
            isPaused: false, // Whether game simulation is paused
            simulationAccumulator: 0, // Accumulator for simulation time
            lastFrameTime: 0, // Last frame timestamp for delta calculation
            lastSimulationTime: 0, // Last time the simulation state was updated
            renderInfo: {
                fps: 0,
                frameCount: 0,
                lastFpsUpdate: 0,
            },
            // Game customization options from the new game form
            pharmacyName: gameOptions.pharmacyName || 'Your Pharmacy',
            difficulty: gameOptions.difficulty || 'normal',
            location: gameOptions.location || 'suburban',
            dateCreated: new Date(),
        };

        console.log('[gameInitializer] Game state initialized:', window.gameState);

        // 2. Initialize finances based on difficulty and starting capital
        console.log(
            '[gameInitializer] Initializing finances with difficulty:',
            gameOptions.difficulty,
            'and starting capital:',
            gameOptions.startingCapital,
        );

        let startingCash = 100000; // Default (medium)

        if (gameOptions.startingCapital === 'low') {
            startingCash = 50000;
            console.log('[gameInitializer] Setting low starting cash:', startingCash);
        } else if (gameOptions.startingCapital === 'high') {
            startingCash = 200000;
            console.log('[gameInitializer] Setting high starting cash:', startingCash);
        } else {
            console.log('[gameInitializer] Using medium starting cash:', startingCash);
        }

        // Apply difficulty modifier to starting cash
        if (gameOptions.difficulty === 'hard') {
            startingCash *= 0.7; // 30% less starting cash on hard
            console.log('[gameInitializer] Applying hard difficulty modifier to cash:', startingCash);
        } else if (gameOptions.difficulty === 'easy') {
            startingCash *= 1.3; // 30% more starting cash on easy
            console.log('[gameInitializer] Applying easy difficulty modifier to cash:', startingCash);
        }

        console.log('[gameInitializer] Creating finances object');
        window.financesData = {
            cash: startingCash,
            dailyIncome: 0,
            pendingInsuranceIncome: 0,
            pendingOrders: 0,
            completedOrders: 0,
            overhead: 500, // Base daily overhead (rent, utilities)
            transactions: [], // Transaction history
            revenue: {
                today: 0,
                thisWeek: 0,
                thisMonth: 0,
                lastMonth: 0,
                total: 0,
            },
            expenses: {
                today: 0,
                thisWeek: 0,
                thisMonth: 0,
                lastMonth: 0,
                total: 0,
            },
            profit: {
                today: 0,
                thisWeek: 0,
                thisMonth: 0,
                lastMonth: 0,
                total: 0,
            },
            insuranceReimbursements: {
                pending: 0,
                received: 0,
                rejected: 0,
            },
            expenseCategories: {
                wages: 0,
                materials: 0,
                overhead: 0,
                equipment: 0,
                research: 0,
                other: 0,
            },
            revenueCategories: {
                copays: 0,
                insurance: 0,
                other: 0,
            },
            targetDailyRevenue: 1000, // Default target
            targetMonthlyRevenue: 30000, // Default target
        };

        console.log('[gameInitializer] Finances initialized with $' + startingCash.toFixed(2));

        // 3. Modify difficulty-based settings
        console.log('[gameInitializer] Checking if brandReputation exists before modifying...');
        if (typeof window.brandReputation === 'undefined') {
            console.error('[gameInitializer] brandReputation is not defined! Creating a default object.');
            window.brandReputation = {
                reputationScore: 10,
                calcCustomers: function (hour: number) {
                    return 2; // Default customer generation rate
                },
                gainReputation: function (amount: number) {},
                loseReputation: function (amount: number) {},
            };
        }

        console.log('[gameInitializer] Applying difficulty modifiers to reputation and overhead');
        if (gameOptions.difficulty === 'easy') {
            window.brandReputation.reputationScore = 15; // Higher starting reputation
            window.financesData.overhead = 400; // Lower overhead costs
            console.log('[gameInitializer] Applied easy difficulty settings: reputation=15, overhead=400');
        } else if (gameOptions.difficulty === 'hard') {
            window.brandReputation.reputationScore = 5; // Lower starting reputation
            window.financesData.overhead = 650; // Higher overhead costs
            console.log('[gameInitializer] Applied hard difficulty settings: reputation=5, overhead=650');
        } else {
            console.log('[gameInitializer] Using normal difficulty settings');
        }

        // 4. Location-based adjustments
        console.log('[gameInitializer] Applying location-based adjustments for:', gameOptions.location);
        if (gameOptions.location === 'urban') {
            // Urban centers have more customers but higher costs
            window.financesData.overhead *= 1.3; // 30% higher rent in urban areas
            console.log('[gameInitializer] Urban location: overhead increased by 30% to', window.financesData.overhead);
            // More frequent customers will be handled in brandReputation
        } else if (gameOptions.location === 'rural') {
            // Rural areas have fewer customers but lower costs
            window.financesData.overhead *= 0.7; // 30% lower rent in rural areas
            console.log('[gameInitializer] Rural location: overhead decreased by 30% to', window.financesData.overhead);
            // Fewer customers will be handled in brandReputation
        } else {
            console.log('[gameInitializer] Suburban location: using standard overhead');
        }

        // 5. Starting prices. New games only: a loaded save keeps the
        // player's prices.
        window.finances.setToSuggestedPrices();

        // 6. Make sure game element modules are properly initialized
        console.log('[gameInitializer] Ensuring game systems are initialized');
        ensureGameSystemsInitialized();

        console.log('[gameInitializer] Game initialization complete');
        window.isGameInitialized = true;
        return true;
    } catch (error) {
        console.error('[gameInitializer] Error initializing game:', error);
        return false;
    }
};

// Restores a save into the live globals. The single load path, shared by
// the main-menu load (loadSavedGame below) and the in-game Ctrl+L load
// (electron-integration.ts). The format itself lives in saveFile.ts.
window.applySavedGame = function (gameData: unknown): void {
    window.saveFile.apply(gameData);
};

window.loadSavedGame = async function (): Promise<boolean> {
    console.log('[gameInitializer] Loading saved game');

    try {
        // Load the game data using the Electron gameAPI
        if (window.gameAPI && window.gameAPI.loadGame) {
            console.log('[gameInitializer] Using gameAPI to load game data');
            const gameData = await window.gameAPI.loadGame();

            if (gameData) {
                console.log('[gameInitializer] Game data loaded successfully, restoring state');
                window.applySavedGame(gameData);

                console.log('[gameInitializer] Game data restored:', {
                    gameState: !!window.gameState,
                    financesData: !!window.financesData,
                    employeesData: !!window.employeesData,
                    productsData: !!window.productsData,
                    materialsData: !!window.materialsData,
                    equipmentData: !!window.equipmentData,
                    brandReputation: !!window.brandReputation,
                });

                // Ensure game systems are initialized
                ensureGameSystemsInitialized();

                window.isGameInitialized = true;
                return true;
            } else {
                console.error('[gameInitializer] No saved game data found');
                return false;
            }
        } else {
            console.error('[gameInitializer] gameAPI not available for loading');
            return false;
        }
    } catch (error) {
        console.error('[gameInitializer] Error loading saved game:', error);
        return false;
    }
};

// This function ensures all game systems are properly initialized
function ensureGameSystemsInitialized(): void {
    console.log('[gameInitializer] Ensuring game systems are initialized');

    // Check if basic data arrays exist
    if (typeof window.employeesData === 'undefined') {
        console.error('[gameInitializer] employeesData is missing!');
        window.employeesData = [];
    }

    if (typeof window.productsData === 'undefined') {
        console.error('[gameInitializer] productsData is missing!');
        window.productsData = [];
    }

    if (typeof window.materialsData === 'undefined') {
        console.error('[gameInitializer] materialsData is missing!');
        window.materialsData = [];
    }

    if (typeof window.equipmentData === 'undefined') {
        console.error('[gameInitializer] equipmentData is missing!');
        window.equipmentData = [];
    }

    // Initialize insurance claims system
    if (window.insuranceClaims && window.insuranceClaims.init) {
        console.log('[gameInitializer] Initializing insurance claims system');
        window.insuranceClaims.init();
        console.log('[gameInitializer] Insurance claims system initialized');
    } else {
        console.warn('[gameInitializer] insuranceClaims.init not available');
    }

    // Initialize production system
    if (window.production && window.production.init) {
        console.log('[gameInitializer] Initializing production system');
        window.production.init();
        console.log('[gameInitializer] Production system initialized');
    } else {
        console.warn('[gameInitializer] production.init not available');
    }

    // Check if task assignment system exists
    if (typeof window.taskAssignment === 'undefined') {
        console.error('[gameInitializer] taskAssignment module is missing!');
    } else {
        // Auto-assign tasks if any are pending
        if (window.taskAssignment.autoAssignTasks) {
            console.log('[gameInitializer] Running initial task assignment');
            window.taskAssignment.autoAssignTasks();
            console.log('[gameInitializer] Initial task assignment completed');
        } else {
            console.warn('[gameInitializer] taskAssignment.autoAssignTasks not available');
        }
    }

    // Check if taskManager exists
    if (typeof window.taskManager === 'undefined') {
        console.error('[gameInitializer] taskManager module is missing!');
    }

    // Check if timeEvents exists
    if (typeof window.timeEvents === 'undefined') {
        console.error('[gameInitializer] timeEvents module is missing!');
    }

    console.log('[gameInitializer] Game systems initialization check complete');
}

// NOTE: Actual game startup (mode detection, calling initializeNewGame/loadSavedGame,
// and building the UI) is driven by game-bootstrap.js, which runs after this file
// loads. This file used to also self-trigger the same flow on DOMContentLoaded,
// which caused the entire game to initialize twice on every launch.
