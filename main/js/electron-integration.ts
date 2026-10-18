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

        console.log('Initializing Electron integration for The Pharmacy');

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
                // Offer to restart now (in-game prompt: confirm() would block the game loop)
                window.showConfirmModal(
                    'An update has been downloaded. Restart now to install it? Save first if you want to keep your progress.',
                    'Restart',
                    () => window.electronAPI!.quitAndInstall(),
                    { title: 'Update ready' },
                );
            });
        }

        // Initialize save/load system
        function initSaveLoadSystem() {
            // Add save game function to window
            window.saveGame = async function (options = {}) {
                try {
                    // Plain data only (see saveFile.ts), so it crosses IPC's
                    // structured-clone boundary.
                    const result = await window.gameAPI!.saveGame!(window.saveFile.serialize());

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

                        // Everything on screen was replaced: redraw the
                        // top bar and show the current page afresh.
                        window.updateUI('finances');
                        window.updateUI('time');
                        window.showPage(window.currentPage || 'operations');

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

            // Autosave as the main menu's Settings say (M18): every N minutes
            // of play at 1x, which is N x 60 game minutes, or not at all.
            // The default runs until the settings arrive.
            startAutoSave();
            window
                .gameAPI!.getSettings?.()
                .then((settings) => {
                    if (!settings) return;
                    if (settings.autoSaveEnabled === false) {
                        stopAutoSave();
                    } else if (Number(settings.autoSaveInterval) > 0) {
                        const minutes = Math.min(60, Math.max(1, Number(settings.autoSaveInterval)));
                        startAutoSave(minutes * 60);
                    }
                })
                .catch((error) => console.error('Error reading settings for autosave:', error));

            // Add keyboard shortcuts
            document.addEventListener('keydown', (event) => {
                // Ctrl+S for save
                if (event.ctrlKey && event.key === 's') {
                    event.preventDefault();
                    window.saveGame!();
                }

                // Ctrl+L for load. Asks first: loading throws away everything
                // since the last save.
                if (event.ctrlKey && event.key === 'l') {
                    event.preventDefault();
                    window.showConfirmModal('Load your last save? Anything since then will be lost.', 'Load', () =>
                        window.loadGame!(),
                    );
                }
            });
        }
    });
})();
