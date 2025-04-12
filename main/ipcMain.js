// ipcMain.js
// Centralized IPC handler for the main process

const { ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

// Initialize IPC channels for the main process
function initializeIPC(mainWindow) {
    log.info('[ipcMain] Initializing IPC handlers for main process');

    // ============================================================
    // GAME STATE MANAGEMENT
    // ============================================================
    
    // Get saved games list
    ipcMain.handle('game:getSavedGames', async () => {
        try {
            log.info('[ipcMain] Listing saved games');
            const userDataPath = app.getPath('userData');
            const savePath = path.join(userDataPath, 'saves');
            
            if (!fs.existsSync(savePath)) {
                fs.mkdirSync(savePath, { recursive: true });
                return [];
            }
            
            const files = fs.readdirSync(savePath);
            const saveFiles = files.filter(file => file.endsWith('.json'));
            
            const savedGames = saveFiles.map(file => {
                try {
                    const filePath = path.join(savePath, file);
                    const data = fs.readFileSync(filePath, 'utf8');
                    const saveData = JSON.parse(data);
                    return {
                        name: file,
                        path: filePath,
                        lastSaved: saveData.timestamp || null,
                        pharmacyName: saveData.gameState?.pharmacyName || 'Unnamed Pharmacy',
                        difficulty: saveData.gameState?.difficulty || 'normal',
                        cash: saveData.financesData?.cash || 0
                    };
                } catch (err) {
                    log.error(`[ipcMain] Error reading save file ${file}:`, err);
                    return null;
                }
            }).filter(Boolean);
            
            return savedGames;
        } catch (error) {
            log.error('[ipcMain] Error getting saved games:', error);
            return [];
        }
    });

    // Save game state
    ipcMain.handle('game:saveGame', async (event, gameData) => {
        try {
            log.info('[ipcMain] Saving game state');
            const userDataPath = app.getPath('userData');
            const savePath = path.join(userDataPath, 'saves');
            
            // Create saves directory if it doesn't exist
            if (!fs.existsSync(savePath)) {
                fs.mkdirSync(savePath, { recursive: true });
            }
            
            // Add timestamp and version info
            gameData.timestamp = Date.now();
            gameData.appVersion = app.getVersion();
            
            // Write game data to file
            const saveName = gameData.gameState?.pharmacyName 
                ? `${gameData.gameState.pharmacyName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_save.json`
                : 'pharmacy_save.json';
                
            const saveFilePath = path.join(savePath, saveName);
            fs.writeFileSync(saveFilePath, JSON.stringify(gameData, null, 2));
            
            log.info(`[ipcMain] Game saved successfully to ${saveName}`);
            return { success: true, path: saveFilePath };
        } catch (error) {
            log.error('[ipcMain] Error saving game:', error);
            return { success: false, error: error.message };
        }
    });

    // Load game state
    ipcMain.handle('game:loadGame', async (event, savePath) => {
        try {
            log.info(`[ipcMain] Loading game from: ${savePath || 'default save'}`);
            const userDataPath = app.getPath('userData');
            const filePath = savePath || path.join(userDataPath, 'saves', 'pharmacy_save.json');
            
            // Check if save file exists
            if (fs.existsSync(filePath)) {
                const saveData = fs.readFileSync(filePath, 'utf8');
                const gameData = JSON.parse(saveData);
                log.info('[ipcMain] Game loaded successfully');
                return gameData;
            } else {
                log.info('[ipcMain] No save file found');
                return null;
            }
        } catch (error) {
            log.error('[ipcMain] Error loading game:', error);
            return { success: false, error: error.message };
        }
    });

    // Delete saved game
    ipcMain.handle('game:deleteSavedGame', async (event, savePath) => {
        try {
            log.info(`[ipcMain] Deleting saved game: ${savePath}`);
            if (fs.existsSync(savePath)) {
                fs.unlinkSync(savePath);
                return { success: true };
            }
            return { success: false, error: 'Save file not found' };
        } catch (error) {
            log.error('[ipcMain] Error deleting saved game:', error);
            return { success: false, error: error.message };
        }
    });

    // Store new game options
    ipcMain.handle('game:storeNewGameOptions', async (event, options) => {
        try {
            log.info('[ipcMain] Storing new game options');
            global.newGameOptions = options;
            return { success: true };
        } catch (error) {
            log.error('[ipcMain] Error storing new game options:', error);
            return { success: false, error: error.message };
        }
    });

    // Get new game options
    ipcMain.handle('game:getNewGameOptions', async () => {
        return global.newGameOptions || null;
    });

    // ============================================================
    // TASK PROCESSING (CPU-INTENSIVE OPERATIONS)
    // ============================================================
    
    // Process task assignment algorithm
    ipcMain.handle('tasks:assignTasks', async (event, { tasks, employees }) => {
        try {
            log.info(`[ipcMain] Processing task assignment for ${tasks.length} tasks and ${employees.length} employees`);
            
            // This would contain the task assignment algorithm moved from taskAssignment.js
            // For now, we'll just create a placeholder that performs basic assignment
            const assignments = calculateTaskAssignments(tasks, employees);
            
            return { success: true, assignments };
        } catch (error) {
            log.error('[ipcMain] Error in task assignment calculation:', error);
            return { success: false, error: error.message };
        }
    });

    // Update task progress (simulation step)
    ipcMain.handle('tasks:updateProgress', async (event, { tasks, minutes }) => {
        try {
            log.info(`[ipcMain] Updating ${tasks.length} tasks for ${minutes} minute(s)`);
            
            // This would contain the task update logic moved from taskManager.js
            const updatedTasks = updateTaskProgress(tasks, minutes);
            
            return { success: true, tasks: updatedTasks };
        } catch (error) {
            log.error('[ipcMain] Error updating task progress:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================================
    // SIMULATION CALCULATIONS
    // ============================================================
    
    // Advance simulation by time delta
    ipcMain.handle('simulation:advanceTime', async (event, { currentDate, msElapsed, simulationSpeed }) => {
        try {
            log.info(`[ipcMain] Advancing simulation time by ${msElapsed}ms at speed ${simulationSpeed}x`);
            
            // Clone the date to avoid modifying the original
            const newDate = new Date(currentDate);
            newDate.setTime(newDate.getTime() + (msElapsed * simulationSpeed));
            
            return { 
                success: true, 
                newDate,
                minutesElapsed: (msElapsed * simulationSpeed) / (60 * 1000)
            };
        } catch (error) {
            log.error('[ipcMain] Error advancing simulation time:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================================
    // FINANCIAL CALCULATIONS
    // ============================================================
    
    // Process financial calculations
    ipcMain.handle('finances:processTransaction', async (event, { type, amount, category, description }) => {
        try {
            log.info(`[ipcMain] Processing financial transaction: ${type} $${amount} (${category})`);
            
            // This would contain financial calculation logic from finances.js
            const result = processFinancialTransaction(type, amount, category, description);
            
            return { success: true, result };
        } catch (error) {
            log.error('[ipcMain] Error processing financial transaction:', error);
            return { success: false, error: error.message };
        }
    });

    // Calculate product cost based on materials
    ipcMain.handle('finances:calculateProductCost', async (event, { productId, materialsData, productsData }) => {
        try {
            log.info(`[ipcMain] Calculating cost for product: ${productId}`);
            
            // This would contain product cost calculation logic
            const cost = calculateProductCost(productId, materialsData, productsData);
            
            return { success: true, cost };
        } catch (error) {
            log.error('[ipcMain] Error calculating product cost:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================================
    // CUSTOMER SIMULATION
    // ============================================================
    
    // Generate new customers
    ipcMain.handle('customers:generate', async (event, { hour, brandReputation }) => {
        try {
            log.info(`[ipcMain] Generating customers for hour: ${hour}`);
            
            // This would contain customer generation logic from customers.js
            const newCustomers = generateCustomers(hour, brandReputation);
            
            return { success: true, customers: newCustomers };
        } catch (error) {
            log.error('[ipcMain] Error generating customers:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================================
    // SETTINGS & APP MANAGEMENT
    // ============================================================
    
    // Save settings
    ipcMain.handle('settings:save', async (event, settings) => {
        try {
            log.info('[ipcMain] Saving application settings');
            const userDataPath = app.getPath('userData');
            fs.writeFileSync(
                path.join(userDataPath, 'settings.json'), 
                JSON.stringify(settings, null, 2)
            );
            return { success: true };
        } catch (error) {
            log.error('[ipcMain] Error saving settings:', error);
            return { success: false, error: error.message };
        }
    });

    // Load settings
    ipcMain.handle('settings:load', async () => {
        try {
            log.info('[ipcMain] Loading application settings');
            const userDataPath = app.getPath('userData');
            const settingsPath = path.join(userDataPath, 'settings.json');
            
            if (fs.existsSync(settingsPath)) {
                const settingsData = fs.readFileSync(settingsPath, 'utf8');
                return JSON.parse(settingsData);
            } else {
                // Return default settings
                return {
                    volume: 50,
                    musicEnabled: true,
                    soundEnabled: true,
                    simulationSpeed: 1.0
                };
            }
        } catch (error) {
            log.error('[ipcMain] Error loading settings:', error);
            return null;
        }
    });

    // File operations
    ipcMain.handle('file:read', async (event, filePath, options = {}) => {
        try {
            // Resolve path relative to app resources
            const resolvedPath = path.isAbsolute(filePath) 
                ? filePath 
                : path.join(app.getAppPath(), 'main', filePath);
            
            log.info(`[ipcMain] Reading file: ${filePath} (resolved to: ${resolvedPath})`);
            const content = await fs.promises.readFile(resolvedPath, options);
            return content;
        } catch (error) {
            log.error(`[ipcMain] Error reading file ${filePath}:`, error);
            throw error;
        }
    });

    // ============================================================
    // PLACEHOLDER IMPLEMENTATIONS FOR MOVED LOGIC
    // ============================================================
    
    // These functions would contain the actual logic moved from renderer process
    // They are placeholders for now
    
    function calculateTaskAssignments(tasks, employees) {
        // Placeholder for task assignment algorithm
        const assignments = [];
        
        // Basic assignment strategy - assign tasks to first available employee
        tasks.forEach(task => {
            if (task.status === 'pending') {
                // Find eligible employees
                const eligibleEmployees = employees.filter(emp => !emp.currentTaskId);
                
                if (eligibleEmployees.length > 0) {
                    // Simple assignment - first available
                    const employee = eligibleEmployees[0];
                    assignments.push({
                        taskId: task.id,
                        employeeId: employee.id
                    });
                }
            }
        });
        
        return assignments;
    }
    
    function updateTaskProgress(tasks, minutes) {
        // Placeholder for task progress update logic
        return tasks.map(task => {
            if (task.status === 'inProgress' && task.assignedTo) {
                const updatedTask = { ...task };
                updatedTask.progress += minutes;
                
                // Check if task is complete
                if (updatedTask.progress >= updatedTask.totalTime) {
                    updatedTask.status = 'completed';
                }
                
                return updatedTask;
            }
            return task;
        });
    }
    
    function processFinancialTransaction(type, amount, category, description) {
        // Placeholder for financial transaction processing
        return {
            success: true,
            transaction: {
                type,
                amount, 
                category,
                description,
                date: new Date()
            }
        };
    }
    
    function calculateProductCost(productId, materialsData, productsData) {
        // Placeholder for product cost calculation
        const product = productsData.find(p => p.id === productId);
        
        if (!product) {
            return 0;
        }
        
        let totalCost = 0;
        product.ingredients.forEach(ingredient => {
            const material = materialsData.find(m => m.id === ingredient.id);
            if (material) {
                totalCost += material.cost * ingredient.quantity;
            }
        });
        
        return totalCost;
    }
    
    function generateCustomers(hour, brandReputation) {
        // Placeholder for customer generation logic
        const customers = [];
        
        // Simplified customer generation based on hour
        let count = 2; // Base count
        
        // Time-based adjustment
        if (hour >= 12 && hour < 14) count += 2; // Lunch hour
        if (hour >= 17 && hour < 19) count += 3; // After work
        
        // Apply brand reputation modifier
        if (brandReputation) {
            const brandFactor = 1 + (brandReputation.brandScore / 100);
            const repFactor = 1 + (brandReputation.reputationScore / 100);
            count = Math.floor(count * brandFactor * repFactor);
        }
        
        // Create placeholder customers
        for (let i = 0; i < count; i++) {
            customers.push({
                id: `cust-${Date.now()}-${i}`,
                firstName: "Customer",
                lastName: `${i + 1}`,
                type: Math.random() > 0.7 ? "Impatient" : "Normal",
                status: "waitingForCheckIn",
                patience: Math.floor(Math.random() * 100) + 100,
                mood: Math.floor(Math.random() * 7) + 3
            });
        }
        
        return customers;
    }

    log.info('[ipcMain] All IPC handlers initialized successfully');
}

module.exports = {
    initializeIPC
};