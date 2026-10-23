// game-bootstrap.js
// This script helps bootstrap the game initialization process

(function () {
    console.log('[bootstrap] Starting game bootstrap process');

    // Function to check if a game component is loaded
    function isLoaded(componentName: string): boolean {
        return typeof (window as unknown as Record<string, unknown>)[componentName] !== 'undefined';
    }

    // Function to check if all required game components are loaded
    function checkGameComponents(): boolean {
        const requiredComponents = [
            'gameState',
            'financesData',
            'employeesData',
            'taskManager',
            'ui',
            'showPage',
            'renderTopBar',
            'renderSidebar',
        ];

        const missingComponents = requiredComponents.filter((comp) => !isLoaded(comp));

        if (missingComponents.length > 0) {
            console.warn('[bootstrap] Missing game components:', missingComponents.join(', '));
            return false;
        }

        console.log('[bootstrap] All required game components are loaded');
        return true;
    }

    // Function to initialize the game
    function initializeGame(): void {
        console.log('[bootstrap] Attempting to initialize game');

        // Check URL parameters to determine startup mode
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');

        if (mode === 'new') {
            console.log('[bootstrap] Starting in NEW GAME mode');

            // Get game options
            if (window.gameAPI && window.gameAPI.getNewGameOptions) {
                window.gameAPI
                    .getNewGameOptions()
                    .then((options) => {
                        if (options) {
                            console.log('[bootstrap] Received game options:', options);

                            // Initialize new game if the function exists
                            if (typeof window.initializeNewGame === 'function') {
                                console.log('[bootstrap] Calling initializeNewGame');
                                window.initializeNewGame(options as NewGameOptions);
                                applyDefaultSpeed();

                                // Build UI and start game
                                buildUIAndStartGame();
                            } else {
                                console.error('[bootstrap] initializeNewGame function not found');
                                showErrorMessage('Game initialization function not found');
                            }
                        } else {
                            console.error('[bootstrap] No game options received');
                            showErrorMessage('No game options received');
                        }
                    })
                    .catch((error) => {
                        console.error('[bootstrap] Error getting game options:', error);
                        showErrorMessage('Error getting game options: ' + error.message);
                    });
            } else {
                console.error('[bootstrap] gameAPI.getNewGameOptions not available');

                // Fallback to default options
                const defaultOptions: NewGameOptions = { pharmacyName: 'Mountain Care' };

                console.log('[bootstrap] Using default options:', defaultOptions);

                if (typeof window.initializeNewGame === 'function') {
                    window.initializeNewGame(defaultOptions);
                    buildUIAndStartGame();
                } else {
                    showErrorMessage('Game initialization function not found');
                }
            }
        } else if (mode === 'load') {
            console.log('[bootstrap] Starting in LOAD GAME mode');

            // Load saved game if the function exists
            if (typeof window.loadSavedGame === 'function') {
                window
                    .loadSavedGame()
                    .then((success) => {
                        if (success) {
                            buildUIAndStartGame();
                        } else {
                            showErrorMessage('Failed to load saved game');
                        }
                    })
                    .catch((error) => {
                        console.error('[bootstrap] Error loading saved game:', error);
                        showErrorMessage('Error loading saved game: ' + error.message);
                    });
            } else {
                console.error('[bootstrap] loadSavedGame function not found');
                showErrorMessage('Game loading function not found');
            }
        } else {
            console.log('[bootstrap] No mode specified, defaulting to new game with default options');

            // Default to new game with default options
            const defaultOptions: NewGameOptions = { pharmacyName: 'Mountain Care' };

            if (typeof window.initializeNewGame === 'function') {
                window.initializeNewGame(defaultOptions);
                buildUIAndStartGame();
            } else {
                showErrorMessage('Game initialization function not found');
            }
        }
    }

    // A new game starts at the speed chosen in the main menu's Settings
    // (M18). A loaded game keeps the speed it was saved at.
    function applyDefaultSpeed(): void {
        window.gameAPI
            ?.getSettings?.()
            .then((settings) => {
                const speed = Number(settings?.simulationSpeed);
                if (window.GAME_SPEEDS.includes(speed)) window.setGameSpeed(speed);
            })
            .catch((error) => console.error('[bootstrap] Error reading settings:', error));
    }

    // The main menu's settings the game reads while it runs (#49). Until
    // they arrive, the defaults apply.
    window.appSettings = { skipDailySummary: false, skipMonthlyReport: false, skipYearlyReport: false };
    function loadAppSettings(): void {
        window.gameAPI
            ?.getSettings?.()
            .then((settings) => {
                window.appSettings.skipDailySummary = settings?.skipDailySummary === true;
                window.appSettings.skipMonthlyReport = settings?.skipMonthlyReport === true;
                window.appSettings.skipYearlyReport = settings?.skipYearlyReport === true;
            })
            .catch((error) => console.error('[bootstrap] Error reading settings:', error));
    }

    // Function to build UI and start the game
    function buildUIAndStartGame(): void {
        console.log('[bootstrap] Building UI and starting game');

        try {
            // Get root element
            const rootElement = document.getElementById('root');
            if (!rootElement) {
                console.error('[bootstrap] Root element not found');
                return;
            }

            // Clear any existing content
            rootElement.innerHTML = '';

            // Add top bar
            if (typeof window.renderTopBar === 'function') {
                const topBar = window.renderTopBar();
                rootElement.appendChild(topBar);
                console.log('[bootstrap] Top bar added');
            }

            // Add sidebar
            if (typeof window.renderSidebar === 'function') {
                const sidebar = window.renderSidebar();
                rootElement.appendChild(sidebar);
                console.log('[bootstrap] Sidebar added');
            }

            // Add main content container
            const mainContent = document.createElement('div');
            mainContent.className = 'main-content';
            rootElement.appendChild(mainContent);
            console.log('[bootstrap] Main content container added');

            // Show default page (operations)
            if (typeof window.showPage === 'function') {
                window.showPage('operations');
                console.log('[bootstrap] Showing operations page');

                // Update active navigation item
                if (typeof window.updateActiveNavItem === 'function') {
                    window.updateActiveNavItem('operations');
                }
            }

            // Start game simulation if game loop exists
            if (typeof window.gameLoop === 'function') {
                // Make sure game is active
                if (window.gameState) {
                    window.gameState.isDayActive = true;
                }

                // Start game loop
                requestAnimationFrame(window.gameLoop);
                console.log('[bootstrap] Game loop started');
            } else {
                console.error('[bootstrap] Game loop function not found');
            }

            // Start day systems if timeEvents exists
            if (window.timeEvents && window.timeEvents.startOfDay && window.gameState) {
                window.timeEvents.startOfDay(window.gameState);
                console.log('[bootstrap] Day systems started');
            }

            console.log('[bootstrap] Game started successfully');
        } catch (error) {
            console.error('[bootstrap] Error building UI:', error);
            showErrorMessage('Error building game UI: ' + (error as Error).message);
        }
    }

    // Function to show an error message
    function showErrorMessage(message: string): void {
        console.error('[bootstrap] Error:', message);

        const errorContainer = document.createElement('div');
        errorContainer.style.position = 'fixed';
        errorContainer.style.top = '0';
        errorContainer.style.left = '0';
        errorContainer.style.width = '100%';
        errorContainer.style.height = '100%';
        errorContainer.style.display = 'flex';
        errorContainer.style.flexDirection = 'column';
        errorContainer.style.justifyContent = 'center';
        errorContainer.style.alignItems = 'center';
        errorContainer.style.backgroundColor = 'rgba(26, 35, 126, 0.9)';
        errorContainer.style.color = 'white';
        errorContainer.style.zIndex = '9999';

        const errorTitle = document.createElement('h2');
        errorTitle.textContent = 'Game Initialization Error';
        errorContainer.appendChild(errorTitle);

        const errorMessage = document.createElement('p');
        errorMessage.textContent = message;
        errorContainer.appendChild(errorMessage);

        const buttons = document.createElement('div');
        buttons.style.marginTop = '20px';

        const retryButton = document.createElement('button');
        retryButton.textContent = 'Retry';
        retryButton.style.padding = '10px 20px';
        retryButton.style.margin = '0 10px';
        retryButton.style.backgroundColor = '#4CAF50';
        retryButton.style.border = 'none';
        retryButton.style.borderRadius = '4px';
        retryButton.style.color = 'white';
        retryButton.style.cursor = 'pointer';
        retryButton.onclick = function () {
            document.body.removeChild(errorContainer);
            start();
        };
        buttons.appendChild(retryButton);

        const menuButton = document.createElement('button');
        menuButton.textContent = 'Return to Menu';
        menuButton.style.padding = '10px 20px';
        menuButton.style.margin = '0 10px';
        menuButton.style.backgroundColor = '#F44336';
        menuButton.style.border = 'none';
        menuButton.style.borderRadius = '4px';
        menuButton.style.color = 'white';
        menuButton.style.cursor = 'pointer';
        menuButton.onclick = function () {
            window.location.href = 'index.html';
        };
        buttons.appendChild(menuButton);

        errorContainer.appendChild(buttons);

        document.body.appendChild(errorContainer);
    }

    function start(): void {
        if (!checkGameComponents()) {
            console.log('[bootstrap] Some components are missing, attempting initialization anyway');
        }
        loadAppSettings();
        try {
            initializeGame();
        } catch (error) {
            console.error('[bootstrap] Error initializing game:', error);
            showErrorMessage('Error initializing game: ' + (error as Error).message);
        }
    }

    // This file loads near the top of main.html, and every <script> tag runs
    // before DOMContentLoaded, so by then every game module is defined.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

    // Make bootstrap functions available globally
    window.bootstrapGame = {
        retry: start,
        checkComponents: checkGameComponents,
        buildUI: buildUIAndStartGame,
    };

    console.log('[bootstrap] Bootstrap module loaded and ready');
})();
