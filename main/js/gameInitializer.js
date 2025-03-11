// gameInitializer.js - Handles the initialization of a new game or loading a saved game

window.initializeNewGame = function(gameOptions) {
    console.log("[gameInitializer] Starting new game initialization with options:", gameOptions);
    
    try {
        // Set the desired starting date and time (year, month (0-indexed), day, hour, minute)
        const startDate = new Date(2023, 0, 1, 7, 0); // January 1st, 2023, 7:00 AM
        console.log("[gameInitializer] Setting start date to:", startDate);
        
        // 1. Initialize game state
        console.log("[gameInitializer] Creating game state object");
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
                lastFpsUpdate: 0
            },
            // Game customization options from the new game form
            pharmacyName: gameOptions.pharmacyName || "Your Pharmacy",
            difficulty: gameOptions.difficulty || "normal",
            location: gameOptions.location || "suburban",
            dateCreated: new Date()
        };
        
        console.log("[gameInitializer] Game state initialized:", window.gameState);
        
        // 2. Initialize finances based on difficulty and starting capital
        console.log("[gameInitializer] Initializing finances with difficulty:", gameOptions.difficulty, "and starting capital:", gameOptions.startingCapital);
        
        let startingCash = 100000; // Default (medium)
        
        if (gameOptions.startingCapital === "low") {
            startingCash = 50000;
            console.log("[gameInitializer] Setting low starting cash:", startingCash);
        } else if (gameOptions.startingCapital === "high") {
            startingCash = 200000;
            console.log("[gameInitializer] Setting high starting cash:", startingCash);
        } else {
            console.log("[gameInitializer] Using medium starting cash:", startingCash);
        }
        
        // Apply difficulty modifier to starting cash
        if (gameOptions.difficulty === "hard") {
            startingCash *= 0.7; // 30% less starting cash on hard
            console.log("[gameInitializer] Applying hard difficulty modifier to cash:", startingCash);
        } else if (gameOptions.difficulty === "easy") {
            startingCash *= 1.3; // 30% more starting cash on easy
            console.log("[gameInitializer] Applying easy difficulty modifier to cash:", startingCash);
        }
        
        console.log("[gameInitializer] Creating finances object");
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
                total: 0
            },
            expenses: {
                today: 0,
                thisWeek: 0,
                thisMonth: 0,
                lastMonth: 0,
                total: 0
            },
            profit: {
                today: 0,
                thisWeek: 0,
                thisMonth: 0,
                lastMonth: 0,
                total: 0
            },
            insuranceReimbursements: {
                pending: 0,
                received: 0,
                rejected: 0
            },
            expenseCategories: {
                wages: 0,
                materials: 0,
                overhead: 0,
                equipment: 0,
                research: 0,
                other: 0
            },
            revenueCategories: {
                prescriptions: 0,
                copays: 0,
                insurance: 0,
                other: 0
            },
            targetDailyRevenue: 1000, // Default target
            targetMonthlyRevenue: 30000 // Default target
        };
        
        console.log("[gameInitializer] Finances initialized with $" + startingCash.toFixed(2));
        
        // 3. Modify difficulty-based settings
        console.log("[gameInitializer] Checking if brandReputation exists before modifying...");
        if (typeof window.brandReputation === 'undefined') {
            console.error("[gameInitializer] brandReputation is not defined! Creating a default object.");
            window.brandReputation = {
                brandScore: 10,
                reputationScore: 10,
                calcCustomers: function(hour) {
                    return 2; // Default customer generation rate
                },
                gainReputation: function(amount) {},
                loseReputation: function(amount) {}
            };
        }
        
        console.log("[gameInitializer] Applying difficulty modifiers to reputation and overhead");
        if (gameOptions.difficulty === "easy") {
            window.brandReputation.reputationScore = 15; // Higher starting reputation
            window.brandReputation.brandScore = 15;
            window.financesData.overhead = 400; // Lower overhead costs
            console.log("[gameInitializer] Applied easy difficulty settings: reputation=15, overhead=400");
        } else if (gameOptions.difficulty === "hard") {
            window.brandReputation.reputationScore = 5; // Lower starting reputation
            window.brandReputation.brandScore = 5;
            window.financesData.overhead = 650; // Higher overhead costs
            console.log("[gameInitializer] Applied hard difficulty settings: reputation=5, overhead=650");
        } else {
            console.log("[gameInitializer] Using normal difficulty settings");
        }
        
        // 4. Location-based adjustments
        console.log("[gameInitializer] Applying location-based adjustments for:", gameOptions.location);
        if (gameOptions.location === "urban") {
            // Urban centers have more customers but higher costs
            window.financesData.overhead *= 1.3; // 30% higher rent in urban areas
            console.log("[gameInitializer] Urban location: overhead increased by 30% to", window.financesData.overhead);
            // More frequent customers will be handled in brandReputation
        } else if (gameOptions.location === "rural") {
            // Rural areas have fewer customers but lower costs
            window.financesData.overhead *= 0.7; // 30% lower rent in rural areas
            console.log("[gameInitializer] Rural location: overhead decreased by 30% to", window.financesData.overhead);
            // Fewer customers will be handled in brandReputation
        } else {
            console.log("[gameInitializer] Suburban location: using standard overhead");
        }
        
        // 5. Make sure game element modules are properly initialized
        console.log("[gameInitializer] Ensuring game systems are initialized");
        ensureGameSystemsInitialized();
        
        console.log("[gameInitializer] Game initialization complete");
        window.isGameInitialized = true;
        return true;
    } catch (error) {
        console.error("[gameInitializer] Error initializing game:", error);
        return false;
    }
};

window.loadSavedGame = async function() {
    console.log("[gameInitializer] Loading saved game");
    
    try {
        // Load the game data using the Electron gameAPI
        if (window.gameAPI && window.gameAPI.loadGame) {
            console.log("[gameInitializer] Using gameAPI to load game data");
            const gameData = await window.gameAPI.loadGame();
            
            if (gameData) {
                console.log("[gameInitializer] Game data loaded successfully, restoring state");
                // Restore the game state from the saved data
                window.gameState = gameData.gameState;
                window.financesData = gameData.financesData;
                window.employeesData = gameData.employeesData;
                window.productsData = gameData.productsData;
                window.materialsData = gameData.materialsData;
                window.equipmentData = gameData.equipmentData;
                window.brandReputation = gameData.brandReputation;
                
                console.log("[gameInitializer] Game data restored:", {
                    gameState: !!window.gameState,
                    financesData: !!window.financesData,
                    employeesData: !!window.employeesData,
                    productsData: !!window.productsData,
                    materialsData: !!window.materialsData,
                    equipmentData: !!window.equipmentData,
                    brandReputation: !!window.brandReputation
                });
                
                // Ensure game systems are initialized
                ensureGameSystemsInitialized();
                
                window.isGameInitialized = true;
                return true;
            } else {
                console.error("[gameInitializer] No saved game data found");
                return false;
            }
        } else {
            console.error("[gameInitializer] gameAPI not available for loading");
            return false;
        }
    } catch (error) {
        console.error("[gameInitializer] Error loading saved game:", error);
        return false;
    }
};

// This function ensures all game systems are properly initialized
function ensureGameSystemsInitialized() {
    console.log("[gameInitializer] Ensuring game systems are initialized");
    
    // Make sure UI is initialized
    if (typeof window.ui === 'undefined') {
        console.error("[gameInitializer] UI module is missing!");
    } else if (window.ui && window.ui.init) {
        console.log("[gameInitializer] Initializing UI system");
        window.ui.init();
        console.log("[gameInitializer] UI system initialized");
    } else {
        console.warn("[gameInitializer] UI system not available for initialization or init method missing");
    }
    
    // Check if basic data arrays exist
    if (typeof window.employeesData === 'undefined') {
        console.error("[gameInitializer] employeesData is missing!");
        window.employeesData = [];
    }
    
    if (typeof window.productsData === 'undefined') {
        console.error("[gameInitializer] productsData is missing!");
        window.productsData = [];
    }
    
    if (typeof window.materialsData === 'undefined') {
        console.error("[gameInitializer] materialsData is missing!");
        window.materialsData = [];
    }
    
    if (typeof window.equipmentData === 'undefined') {
        console.error("[gameInitializer] equipmentData is missing!");
        window.equipmentData = [];
    }
    
    // Set suggested prices for products
    if (window.finances && window.finances.setToSuggestedPrices) {
        console.log("[gameInitializer] Setting suggested product prices");
        window.finances.setToSuggestedPrices();
        console.log("[gameInitializer] Product prices initialized");
    } else {
        console.warn("[gameInitializer] finances.setToSuggestedPrices not available");
    }
    
    // Initialize insurance claims system
    if (window.insuranceClaims && window.insuranceClaims.init) {
        console.log("[gameInitializer] Initializing insurance claims system");
        window.insuranceClaims.init();
        console.log("[gameInitializer] Insurance claims system initialized");
    } else {
        console.warn("[gameInitializer] insuranceClaims.init not available");
    }
    
    // Initialize production system
    if (window.production && window.production.init) {
        console.log("[gameInitializer] Initializing production system");
        window.production.init();
        console.log("[gameInitializer] Production system initialized");
    } else {
        console.warn("[gameInitializer] production.init not available");
    }
    
    // Check if task assignment system exists
    if (typeof window.taskAssignment === 'undefined') {
        console.error("[gameInitializer] taskAssignment module is missing!");
    } else {
        // Auto-assign tasks if any are pending
        if (window.taskAssignment.autoAssignTasks) {
            console.log("[gameInitializer] Running initial task assignment");
            window.taskAssignment.autoAssignTasks();
            console.log("[gameInitializer] Initial task assignment completed");
        } else {
            console.warn("[gameInitializer] taskAssignment.autoAssignTasks not available");
        }
    }
    
    // Check if taskManager exists
    if (typeof window.taskManager === 'undefined') {
        console.error("[gameInitializer] taskManager module is missing!");
    }
    
    // Check if timeEvents exists
    if (typeof window.timeEvents === 'undefined') {
        console.error("[gameInitializer] timeEvents module is missing!");
    }
    
    console.log("[gameInitializer] Game systems initialization check complete");
}

// Detect game startup mode and initialize accordingly
window.addEventListener('DOMContentLoaded', function() {
    console.log("[gameInitializer] DOM loaded, checking startup mode");
    
    // Parse URL parameters to determine if we're starting a new game or loading
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    
    console.log("[gameInitializer] Startup mode from URL parameters:", mode);
    
    if (mode === 'new') {
        console.log("[gameInitializer] Starting in 'new game' mode");
        
        // Try to get the game options that were saved when starting a new game
        if (window.gameAPI && window.gameAPI.getNewGameOptions) {
            console.log("[gameInitializer] Attempting to get new game options from gameAPI");
            window.gameAPI.getNewGameOptions()
                .then(options => {
                    console.log("[gameInitializer] Received game options from gameAPI:", options);
                    if (options) {
                        if (window.initializeNewGame(options)) {
                            console.log("[gameInitializer] New game initialized successfully, starting game");
                            startGame();
                        } else {
                            console.error("[gameInitializer] Failed to initialize new game");
                            showErrorScreen("Failed to initialize new game");
                        }
                    } else {
                        console.error("[gameInitializer] No game options found");
                        showErrorScreen("No game options found for new game");
                    }
                })
                .catch(error => {
                    console.error("[gameInitializer] Error getting new game options:", error);
                    showErrorScreen("Error starting new game: " + error.message);
                });
        } else {
            // Fallback if gameAPI is not available
            console.log("[gameInitializer] gameAPI not available, using default options");
            const defaultOptions = {
                pharmacyName: "Your Pharmacy",
                difficulty: "normal",
                startingCapital: "medium",
                location: "suburban"
            };
            if (window.initializeNewGame(defaultOptions)) {
                console.log("[gameInitializer] New game initialized with default options, starting game");
                startGame();
            } else {
                console.error("[gameInitializer] Failed to initialize new game with default options");
                showErrorScreen("Failed to initialize new game with default options");
            }
        }
    } else if (mode === 'load') {
        console.log("[gameInitializer] Starting in 'load game' mode");
        
        // Load saved game
        window.loadSavedGame()
            .then(success => {
                if (success) {
                    console.log("[gameInitializer] Game loaded successfully, starting game");
                    startGame();
                } else {
                    console.error("[gameInitializer] Failed to load saved game");
                    showErrorScreen("Failed to load saved game");
                }
            })
            .catch(error => {
                console.error("[gameInitializer] Error loading saved game:", error);
                showErrorScreen("Error loading saved game: " + error.message);
            });
    } else {
        console.warn("[gameInitializer] No mode specified, defaulting to new game");
        // Default to new game with default options
        const defaultOptions = {
            pharmacyName: "Your Pharmacy",
            difficulty: "normal",
            startingCapital: "medium",
            location: "suburban"
        };
        if (window.initializeNewGame(defaultOptions)) {
            console.log("[gameInitializer] New game initialized with default options (no mode), starting game");
            startGame();
        } else {
            console.error("[gameInitializer] Failed to initialize game (no mode specified)");
            showErrorScreen("Failed to initialize game (no mode specified)");
        }
    }
});

// Start the game simulation
function startGame() {
    console.log("[gameInitializer] Starting game simulation");
    
    try {
        // Initialize the UI components
        if (window.renderTopBar && window.renderSidebar) {
            console.log("[gameInitializer] Rendering top bar and sidebar");
            
            const rootElement = document.getElementById('root');
            if (!rootElement) {
                throw new Error("Root element not found");
            }
            
            // Clear any existing content
            rootElement.innerHTML = '';
            
            const topBar = window.renderTopBar();
            rootElement.appendChild(topBar);
            console.log("[gameInitializer] Top bar rendered");
            
            const sidebar = window.renderSidebar();
            rootElement.appendChild(sidebar);
            console.log("[gameInitializer] Sidebar rendered");
            
            // Add main content container
            const mainContent = document.createElement('div');
            mainContent.className = 'main-content';
            rootElement.appendChild(mainContent);
            console.log("[gameInitializer] Main content container added");
            
            // Show the default page (operations)
            if (window.showPage) {
                console.log("[gameInitializer] Showing operations page");
                window.showPage('operations');
                if (window.updateActiveNavItem) {
                    window.updateActiveNavItem('operations');
                }
                console.log("[gameInitializer] Default page (operations) displayed");
            } else {
                throw new Error("showPage function not available");
            }
        } else {
            throw new Error("UI rendering functions not available");
        }
        
        // Start the day
        console.log("[gameInitializer] Setting day to active");
        window.gameState.isDayActive = true;
        
        // Start the game loop
        if (typeof requestAnimationFrame === 'function' && window.gameLoop) {
            console.log("[gameInitializer] Starting game loop");
            requestAnimationFrame(window.gameLoop);
            console.log("[gameInitializer] Game loop started");
        } else {
            throw new Error("Game loop function not found");
        }
        
        console.log("[gameInitializer] Game started successfully");
    } catch (error) {
        console.error("[gameInitializer] Error starting game:", error);
        showErrorScreen("Error starting game: " + error.message);
    }
}

// Show an error screen when initialization fails
function showErrorScreen(message) {
    console.error("[gameInitializer] Showing error screen:", message);
    
    const root = document.getElementById('root');
    if (root) {
        root.innerHTML = `
            <div style="padding: 20px; color: white; text-align: center; background-color: #1a237e; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <h2>Error Starting Game</h2>
                <p>${message}</p>
                <p>Please check the console for more details or try restarting the application.</p>
                <button style="margin-top: 20px; padding: 10px 20px; background-color: #ffffff; color: #1a237e; border: none; border-radius: 4px; cursor: pointer;" onclick="window.location.href='index.html'">Return to Main Menu</button>
            </div>
        `;
    }
}

// Export runFallbackInitialization for the fallback mechanism
window.runFallbackInitialization = function() {
    console.log("[gameInitializer] Running fallback initialization");
    
    try {
        // Basic game state
        if (!window.gameState) {
            const startDate = new Date(2023, 0, 1, 7, 0);
            window.gameState = {
                currentDate: new Date(startDate.getTime()),
                dayIndex: 0,
                isDayActive: true,
                isPaused: false,
                pharmacyName: "Emergency Pharmacy",
                difficulty: "normal",
                location: "suburban"
            };
        }
        
        // Basic finances
        if (!window.financesData) {
            window.financesData = {
                cash: 100000,
                dailyIncome: 0,
                pendingInsuranceIncome: 0
            };
        }
        
        // Basic brand reputation
        if (!window.brandReputation) {
            window.brandReputation = {
                brandScore: 10,
                reputationScore: 10,
                calcCustomers: function() { return 2; },
                gainReputation: function() {},
                loseReputation: function() {}
            };
        }
        
        // Start the game
        startGame();
        return true;
    } catch (error) {
        console.error("[gameInitializer] Fallback initialization failed:", error);
        return false;
    }
};