// js/electron-integration.js

// Initialize electron integration
(function() {
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
                    window.notifications.add(`A new version (${info.version}) is available. Downloading now...`, 'info');
                }
            });
            
            window.electronAPI.onUpdateDownloaded(() => {
                console.log('Update downloaded');
                // Prompt user to restart and install
                if (window.confirm('The update has been downloaded. Restart the application to apply the update?')) {
                    window.electronAPI.quitAndInstall();
                }
            });
        }
        
        // Initialize save/load system
        function initSaveLoadSystem() {
            // Add save game function to window
            window.saveGame = async function() {
                try {
                    // Get the current game state
                    const gameData = {
                        gameState: window.gameState,
                        financesData: window.financesData,
                        employeesData: window.employeesData,
                        productsData: window.productsData,
                        materialsData: window.materialsData,
                        equipmentData: window.equipmentData,
                        brandReputation: window.brandReputation,
                        timestamp: Date.now()
                    };
                    
                    const result = await window.gameAPI.saveGame(gameData);
                    
                    if (result && result.success) {
                        console.log('Game saved successfully');
                        
                        // Show notification to user
                        if (window.notifications) {
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
            window.loadGame = async function() {
                try {
                    const gameData = await window.gameAPI.loadGame();
                    
                    if (gameData) {
                        // Restore game state
                        window.gameState = gameData.gameState;
                        window.financesData = gameData.financesData;
                        window.employeesData = gameData.employeesData;
                        window.productsData = gameData.productsData;
                        window.materialsData = gameData.materialsData;
                        window.equipmentData = gameData.equipmentData;
                        window.brandReputation = gameData.brandReputation;
                        
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
            
            // Add auto-save feature
            let autoSaveInterval = null;
            
            function startAutoSave(interval = 5) {
                // Clear existing interval if any
                if (autoSaveInterval) {
                    clearInterval(autoSaveInterval);
                }
                
                // Start new auto-save interval (in minutes)
                autoSaveInterval = setInterval(window.saveGame, interval * 60 * 1000);
                console.log(`Auto-save enabled (every ${interval} minutes)`);
            }
            
            function stopAutoSave() {
                if (autoSaveInterval) {
                    clearInterval(autoSaveInterval);
                    autoSaveInterval = null;
                    console.log('Auto-save disabled');
                }
            }
            
            // Expose auto-save controls
            window.autoSave = {
                start: startAutoSave,
                stop: stopAutoSave
            };
            
            // Start auto-save by default
            startAutoSave();
            
            // Add keyboard shortcuts
            document.addEventListener('keydown', (event) => {
                // Ctrl+S for save
                if (event.ctrlKey && event.key === 's') {
                    event.preventDefault();
                    window.saveGame();
                }
                
                // Ctrl+L for load
                if (event.ctrlKey && event.key === 'l') {
                    event.preventDefault();
                    window.loadGame();
                }
            });
        }
    });
})();