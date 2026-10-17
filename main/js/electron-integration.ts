// js/electron-integration.js

// Initialize electron integration
(function () {
    // Wait for DOM ready to ensure window objects are available
    document.addEventListener('DOMContentLoaded', () => {
        // Check if we're running in Electron
        const isElectron = typeof window.gameAPI !== 'undefined';

        if (!isElectron) {
            console.error('Not running in Electron environment. Game API not available.');
            // Show error message to user
            const rootElement = document.getElementById('root');
            if (rootElement) {
                rootElement.innerHTML = `
                    <div style="padding: 20px; color: white; text-align: center; background-color: #1a237e; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                        <h2>Error: Electron API Not Available</h2>
                        <p>This application requires the Electron environment to run properly.</p>
                        <p>Please run the application using the provided executable file.</p>
                    </div>
                `;
            }
            return;
        }

        console.log('Initializing Electron integration for The Pharmacy Sim');

        // Initialize save/load functionality
        initSaveLoadSystem();

        // Listen for update events from Electron
        if (window.electronAPI) {
            window.electronAPI.onUpdateAvailable((info) => {
                console.log('Update available:', info);
                // Show update notification to user
                if (window.notifications) {
                    window.notifications.add(
                        `A new version (${info.version}) is available. Downloading now...`,
                        'info',
                    );
                }
            });

            window.electronAPI.onUpdateDownloaded(() => {
                console.log('Update downloaded');
                // Prompt user to restart and install
                if (window.confirm('The update has been downloaded. Restart the application to apply the update?')) {
                    window.electronAPI!.quitAndInstall();
                }
            });
        }

        // Initialize save/load system
        function initSaveLoadSystem() {
            // Add save game function to window
            window.saveGame = async function (options = {}) {
                try {
                    // Get the current game state
                    // window.brandReputation carries live methods (calcCustomers,
                    // gainReputation, loseReputation), and every equipmentData
                    // item carries an isUnlocked() method - none of that can
                    // cross IPC's structured-clone boundary, so only send plain
                    // data fields.
                    // Frame-loop bookkeeping (performance.now() timestamps)
                    // is only meaningful in this session - leave it out.
                    const { lastFrameTime, lastSimulationTime, simulationAccumulator, renderInfo, ...gameState } =
                        window.gameState;
                    const gameData = {
                        gameState,
                        financesData: window.financesData,
                        employeesData: window.employeesData,
                        productsData: window.productsData,
                        materialsData: window.materialsData,
                        equipmentData: (window.equipmentData || []).map(({ isUnlocked, ...rest }) => rest),
                        brandReputation: {
                            reputationScore: window.brandReputation.reputationScore,
                        },
                        researchData: window.researchData,
                        activePrescriptions: window.prescriptions ? window.prescriptions.activePrescriptions : [],
                        refillRegistry: window.prescriptions ? window.prescriptions.refillRegistry : [],
                        timestamp: Date.now(),
                    };

                    const result = await window.gameAPI!.saveGame!(gameData);

                    if (result && result.success) {
                        console.log('Game saved successfully');

                        // Show notification to user (not for autosaves)
                        if (window.notifications && !options.silent) {
                            window.notifications.add('Game saved successfully', 'success');
                        }
                        return true;
                    } else {
                        throw new Error('Save operation failed');
                    }
                } catch (error) {
                    console.error('Error saving game:', error);

                    // Show error to user
                    if (window.notifications) {
                        window.notifications.add('Error saving game', 'error');
                    }
                    return false;
                }
            };

            // Add load game function to window
            window.loadGame = async function () {
                try {
                    const gameData = await window.gameAPI!.loadGame!();

                    if (gameData) {
                        // Same restore path as the main-menu load
                        // (gameInitializer.ts) - revives dates and resets the
                        // frame-loop timestamps.
                        window.applySavedGame(gameData);

                        console.log('Game loaded successfully');

                        // Update UI
                        if (window.updateUI) {
                            window.updateUI('finances');
                            window.updateUI('operations');
                            window.updateUI('time');
                        }

                        // Show notification to user
                        if (window.notifications) {
                            window.notifications.add('Game loaded successfully', 'success');
                        }

                        // Restart game systems
                        if (window.timeEvents && window.timeEvents.startOfDay) {
                            window.timeEvents.startOfDay(window.gameState);
                        }

                        return true;
                    } else {
                        console.log('No saved game found');

                        // Show notification to user
                        if (window.notifications) {
                            window.notifications.add('No saved game found', 'info');
                        }
                        return false;
                    }
                } catch (error) {
                    console.error('Error loading game:', error);

                    // Show error to user
                    if (window.notifications) {
                        window.notifications.add('Error loading game', 'error');
                    }
                    return false;
                }
            };

            // Add auto-save feature. Runs on the game clock, so it never
            // fires while paused or while the end-of-day summary is open.
            let autoSaveJob: number | null = null;

            // Default 300 game minutes = 5 real minutes at 1x.
            function startAutoSave(intervalGameMinutes: number = 300): void {
                stopAutoSave();
                autoSaveJob = window.clock.every(intervalGameMinutes, () => {
                    window.saveGame!({ silent: true });
                });
                console.log(`Auto-save enabled (every ${intervalGameMinutes} game minutes)`);
            }

            function stopAutoSave(): void {
                if (autoSaveJob !== null) {
                    window.clock.cancel(autoSaveJob);
                    autoSaveJob = null;
                    console.log('Auto-save disabled');
                }
            }

            // Expose auto-save controls
            window.autoSave = {
                start: startAutoSave,
                stop: stopAutoSave,
            };

            // Start auto-save by default
            startAutoSave();

            // Add keyboard shortcuts
            document.addEventListener('keydown', (event) => {
                // Ctrl+S for save
                if (event.ctrlKey && event.key === 's') {
                    event.preventDefault();
                    window.saveGame!();
                }

                // Ctrl+L for load
                if (event.ctrlKey && event.key === 'l') {
                    event.preventDefault();
                    window.loadGame!();
                }
            });
        }
    });
})();
