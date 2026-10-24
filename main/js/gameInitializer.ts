// gameInitializer.js - Handles the initialization of a new game or loading a saved game

// Every new game starts with this much cash (Phase 9, #1)
const STARTING_CASH = 100000;

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
            isPaused: true, // A new game starts paused; the player resumes it
            simulationAccumulator: 0, // Accumulator for simulation time
            lastFrameTime: 0, // Last frame timestamp for delta calculation
            lastSimulationTime: 0, // Last time the simulation state was updated
            renderInfo: {
                fps: 0,
                frameCount: 0,
                lastFpsUpdate: 0,
            },
            // Its saves and autosaves are listed together (save slots)
            gameId: `game-${Math.random().toString(36).slice(2, 10)}`,
            dateCreated: new Date(),
            // Stakes (stakes.ts): closings in a row with cash below $0, and
            // the day each goal was reached
            daysInRed: 0,
            goalsReached: {},
            // Store controls (Phase 9): the front door opens every morning
            frontOpen: true,
        };

        console.log('[gameInitializer] Game state initialized:', window.gameState);

        // 2. Finances. Every game starts with the same cash (#1).
        const startingCash = STARTING_CASH;

        console.log('[gameInitializer] Creating finances object');
        window.financesData = {
            cash: startingCash,
            dailyIncome: 0,
            dailyInsurance: 0,
            pendingInsuranceIncome: 0,
            pendingOrders: 0,
            completedOrders: 0,
            loanBalance: 0,
            loans: [],
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
                rent: 0,
                materials: 0,
                overhead: 0,
                equipment: 0,
                research: 0,
                interest: 0,
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

        // The company and its first location, from the lease listing chosen
        // on the new-game screen (#11, #12). Signing the lease takes the
        // deposit (held by the landlord) and the first month's rent; rent is
        // then due on the 1st.
        const properties = window.properties;
        const listing = properties.find(gameOptions.propertyId ?? '') ?? properties.listings[0];
        const leaseYears = properties.LEASE_YEARS.includes(gameOptions.leaseYears ?? 0)
            ? gameOptions.leaseYears!
            : properties.DEFAULT_LEASE_YEARS;
        window.company.reset(gameOptions.pharmacyName || 'Your Pharmacy', [
            window.company.fromListing(listing, leaseYears, startDate.getTime(), 0),
        ]);
        window.records.days = [];
        window.records.pruned = {};
        window.reports.list = [];
        const location = window.company.active();
        const month = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        window.finances.transact({
            type: 'expense',
            category: 'deposit',
            amount: location.lease.deposit,
            description: `Lease deposit for ${location.name}, held by the landlord until the lease ends`,
        });
        window.finances.transact({
            type: 'expense',
            category: 'rent',
            amount: location.lease.monthlyRent,
            description: `Rent for ${location.name}, ${month}`,
        });

        // The startup loan, if one was negotiated, up to what the bank lends
        // for this property
        const loan = gameOptions.loan;
        if (loan && loan.amount > 0) {
            const termYears = Math.min(
                window.lending.MAX_TERM_YEARS,
                Math.max(window.lending.MIN_TERM_YEARS, Math.round(loan.termYears)),
            );
            const amount = Math.min(loan.amount, window.lending.maxAmount('retail', listing, leaseYears));
            window.stakes.takeTermLoan(
                { amount, termYears, guarantee: !!loan.guarantee, collateral: !!loan.collateral },
                'Startup loan',
            );
        }

        // 3. Starting reputation
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

        window.brandReputation.reputationScore = 10;

        // 4. Starting prices. New games only: a loaded save keeps the
        // player's prices.
        window.finances.setToSuggestedPrices();

        // 5. Make sure game element modules are properly initialized
        console.log('[gameInitializer] Ensuring game systems are initialized');
        ensureGameSystemsInitialized();

        window.saveSession = { slot: null, name: window.company.name };

        console.log('[gameInitializer] Game initialization complete');
        window.isGameInitialized = true;
        return true;
    } catch (error) {
        console.error('[gameInitializer] Error initializing game:', error);
        return false;
    }
};

// The slot Save writes (save slots, Phase 10): none yet in a new game, so
// the first save makes one named after the company.
window.saveSession = { slot: null, name: '' };

// Restores a save into the live globals. The single load path, shared by
// the main-menu load (loadSavedGame below) and the in-game load
// (electron-integration.ts). The format itself lives in saveFile.ts. Saving
// afterwards goes back into a named save; an autosave's game gets a new one.
window.applySavedGame = function (gameData: unknown): void {
    window.saveFile.apply(gameData);
    const slot = (gameData as { slot?: SaveSlotMeta }).slot;
    window.saveSession =
        slot && slot.kind === 'manual' ? { slot: slot.id, name: slot.name } : { slot: null, name: window.company.name };
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
