// optimized-timeEvents.js
// Enhanced time event system with improved performance and control

window.timeEvents = (function() {
    // Configuration settings
    const CONFIG = {
        OPENING_HOUR: 7,               // Day starts at 7 AM
        CLOSING_HOUR: 22,              // Day ends at 10 PM
        TASK_UPDATE_INTERVAL: 1,       // Update tasks every minute of game time
        CUSTOMER_SPAWN_CHECK_INTERVAL: 60000, // Check for new customers every minute
        AUTO_TASK_ASSIGN_INTERVAL: 300000, // Auto-assign tasks every 5 minutes
        INVENTORY_CHECK_INTERVAL: 900000 // Check inventory every 15 minutes
    };
    
    // Tracking variables for various timers
    const timers = {
        customerSpawn: null,
        taskAssign: null,
        inventoryCheck: null,
        customerCheck: null,
        insuranceProcessing: null
    };
    
    // Event system for time-related events
    const events = {
        listeners: {},
        
        // Add event listener
        on(event, callback) {
            if (!this.listeners[event]) {
                this.listeners[event] = [];
            }
            this.listeners[event].push(callback);
        },
        
        // Remove event listener
        off(event, callback) {
            if (!this.listeners[event]) return;
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        },
        
        // Trigger event
        emit(event, data) {
            if (!this.listeners[event]) return;
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in time event listener for ${event}:`, error);
                }
            });
        }
    };
    
    // ---------------------------------------------------------
    // Called at 22:00 in main.js, or whenever a day ends
    // ---------------------------------------------------------
    function endOfDay(gameState) {
        console.log("[timeEvents] End of day triggered");

        // Clear all interval timers
        Object.values(timers).forEach(timer => {
            if (timer) clearInterval(timer);
        });
        
        // Emit the end-of-day event
        events.emit('endOfDay', { gameState });

        // End-of-day finance operations
        if (window.finances && window.finances.applyDailyCosts) {
            window.finances.applyDailyCosts();
        }

        // Show the daily summary, then wait for the user to start next day
        if (window.showDailySummaryModal) {
            window.showDailySummaryModal(() => {
                skipToNextDay(gameState);
            });
        } else {
            // Fallback if the modal function is missing
            skipToNextDay(gameState);
        }
    }

    // ---------------------------------------------------------
    // Starts the next day at 07:00
    // ---------------------------------------------------------
    function skipToNextDay(gameState) {
        console.log("[timeEvents] Starting new day");

        // Move to next day
        const day = gameState.currentDate.getDate();
        gameState.currentDate.setDate(day + 1);
        gameState.currentDate.setHours(CONFIG.OPENING_HOUR, 0, 0, 0);
        gameState.dayIndex++;
        gameState.isDayActive = true;

        // Reset some daily counters
        if (window.financesData) {
            window.financesData.dailyIncome = 0;
            window.financesData.pendingOrders = 0;
            window.financesData.completedOrders = 0;
        }
        
        // Emit the start-of-day event
        events.emit('startOfDay', { gameState });

        // Start new day time-based systems
        startDaySystems(gameState);

        // Update the UI to reflect the new day
        window.ui.updateTime();
        window.updateUI("finances");
    }
    
    // ---------------------------------------------------------
    // Start day systems - everything that runs on intervals
    // ---------------------------------------------------------
    function startDaySystems(gameState) {
        // Auto-assign any pending tasks right at the start of day
        if (window.taskAssignment && window.taskAssignment.autoAssignTasks) {
            window.taskAssignment.autoAssignTasks();
        }

        // Kick off auto-production checks
        if (window.production && window.production.checkAndCreateCompoundTasks) {
            window.production.checkAndCreateCompoundTasks();
        }
        
        // Start the customer spawn timer
        startCustomerSpawnTimer(gameState);
        
        // Start auto task assignment timer
        startTaskAssignmentTimer();
        
        // Start inventory check timer
        startInventoryCheckTimer();
        
        // Start customer patience check timer
        startCustomerCheckTimer();
        
        // Start insurance processing timer
        startInsuranceProcessingTimer();
    }

    // ---------------------------------------------------------
    // Called each in-game minute from main.js
    // ---------------------------------------------------------
    function minuteCheck(gameState) {
        try {
            // Always update tasks with 1 minute
            // Note: main.js now directly updates tasks with exact minutes,
            // but we'll keep this as a backup in case that doesn't happen
            if (window.taskManager && window.taskManager.updateTasks) {
                window.taskManager.updateTasks(1);
            }
    
            // If it's exactly XX:00, run hourly check
            if (gameState.currentDate.getMinutes() === 0) {
                const hour = gameState.currentDate.getHours();
                hourlyCheck(gameState, hour);
            }
        } catch (error) {
            console.error("[timeEvents] Error in minuteCheck:", error);
        }
    }

    // ---------------------------------------------------------
    // Called each in-game hour (from minuteCheck if minutes=0)
    // ---------------------------------------------------------
    function hourlyCheck(gameState, hour) {
        console.log(`[timeEvents] Hourly check for hour ${hour}`);
        
        try {
            // Check for auto-ordering materials
            autoOrderCheck();
            
            // Every 3 hours, do inventory check and create production tasks
            if (hour % 3 === 0) {
                if (window.production && window.production.checkAndCreateCompoundTasks) {
                    window.production.checkAndCreateCompoundTasks();
                }
            }
            
            // Emit the hourly event
            events.emit('hourlyCheck', { gameState, hour });
        } catch (error) {
            console.error("[timeEvents] Error in hourlyCheck:", error);
        }
    }

    // ---------------------------------------------------------
    // Timer function for spawning customers
    // ---------------------------------------------------------
    function startCustomerSpawnTimer(gameState) {
        // Clear any existing timer
        if (timers.customerSpawn) {
            clearInterval(timers.customerSpawn);
        }
        
        // Start a new timer
        timers.customerSpawn = setInterval(() => {
            try {
                // Skip if the day isn't active
                if (!gameState.isDayActive) return;
                
                // Get current hour
                const hour = gameState.currentDate.getHours();
                
                // Skip if outside business hours
                if (hour < CONFIG.OPENING_HOUR || hour >= CONFIG.CLOSING_HOUR) return;
                
                // Generate customers based on current hour
                spawnCustomersForHour(hour);
            } catch (error) {
                console.error("[timeEvents] Error in customer spawn timer:", error);
            }
        }, CONFIG.CUSTOMER_SPAWN_CHECK_INTERVAL);
    }
    
    // ---------------------------------------------------------
    // Timer function for auto task assignment
    // ---------------------------------------------------------
    function startTaskAssignmentTimer() {
        // Clear any existing timer
        if (timers.taskAssign) {
            clearInterval(timers.taskAssign);
        }
        
        // Start a new timer
        timers.taskAssign = setInterval(() => {
            try {
                if (window.taskAssignment && window.taskAssignment.autoAssignTasks) {
                    window.taskAssignment.autoAssignTasks();
                }
            } catch (error) {
                console.error("[timeEvents] Error in task assignment timer:", error);
            }
        }, CONFIG.AUTO_TASK_ASSIGN_INTERVAL);
    }
    
    // ---------------------------------------------------------
    // Timer function for inventory checks
    // ---------------------------------------------------------
    function startInventoryCheckTimer() {
        // Clear any existing timer
        if (timers.inventoryCheck) {
            clearInterval(timers.inventoryCheck);
        }
        
        // Start a new timer
        timers.inventoryCheck = setInterval(() => {
            try {
                if (window.production && window.production.checkAndCreateCompoundTasks) {
                    window.production.checkAndCreateCompoundTasks();
                }
            } catch (error) {
                console.error("[timeEvents] Error in inventory check timer:", error);
            }
        }, CONFIG.INVENTORY_CHECK_INTERVAL);
    }
    
    // ---------------------------------------------------------
    // Timer function for checking customers (patience, etc)
    // ---------------------------------------------------------
    function startCustomerCheckTimer() {
        // Clear any existing timer
        if (timers.customerCheck) {
            clearInterval(timers.customerCheck);
        }
        
        // Start a new timer
        timers.customerCheck = setInterval(() => {
            try {
                if (window.customers && window.customers.detectAndFixStuckCustomers) {
                    window.customers.detectAndFixStuckCustomers();
                }
            } catch (error) {
                console.error("[timeEvents] Error in customer check timer:", error);
            }
        }, 2 * 60 * 1000); // Every 2 minutes
    }
    
    // ---------------------------------------------------------
    // Timer function for processing insurance claims
    // ---------------------------------------------------------
    function startInsuranceProcessingTimer() {
        // Clear any existing timer
        if (timers.insuranceProcessing) {
            clearInterval(timers.insuranceProcessing);
        }
        
        // Start a new timer
        timers.insuranceProcessing = setInterval(() => {
            try {
                if (window.insuranceClaims && window.insuranceClaims.processAllClaims) {
                    window.insuranceClaims.processAllClaims();
                }
            } catch (error) {
                console.error("[timeEvents] Error in insurance processing timer:", error);
            }
        }, 30 * 60 * 1000); // Every 30 minutes
    }

    // ---------------------------------------------------------
    // Basic spawn logic for new customers each hour
    // ---------------------------------------------------------
    function spawnCustomersForHour(hour) {
        // Skip if customers module isn't available
        if (!window.customers || !window.customers.generateCustomer || 
            !window.brandReputation || !window.brandReputation.calcCustomers) {
            return;
        }
        
        let count = window.brandReputation.calcCustomers(hour);
        // Add a small random variation
        count += Math.floor(Math.random() * 2);

        console.log(`[timeEvents] Spawning ${count} customers for hour ${hour}`);

        for (let i = 0; i < count; i++) {
            // Add a small random delay between customer spawns
            // to prevent all customers arriving at exactly the same time
            setTimeout(() => {
                window.customers.generateCustomer();
            }, i * 500); // 500ms between each customer
        }
    }

    // ---------------------------------------------------------
    // Start the day
    // ---------------------------------------------------------
    function startOfDay(gameState) {
        console.log("[timeEvents] Starting day");
        gameState.isDayActive = true;
        
        // Start all the day systems
        startDaySystems(gameState);
        
        // Emit the start-of-day event
        events.emit('startOfDay', { gameState });
    }

    // ---------------------------------------------------------
    // Check if we need to auto-order materials
    // ---------------------------------------------------------
    function autoOrderCheck() {
        // Skip if materials or finances aren't available
        if (!window.materialsData || !window.financesData) {
            return;
        }
        
        console.log("[timeEvents] Running auto-order check");
        
        let totalOrderCost = 0;
        let ordersPlaced = 0;
        
        window.materialsData.forEach(mat => {
            // If auto-order is configured
            if (typeof mat.autoOrderThreshold === 'number' && 
                typeof mat.autoOrderAmount === 'number' && 
                mat.autoOrderThreshold > 0 && 
                mat.autoOrderAmount > 0) {
                
                if (mat.inventory < mat.autoOrderThreshold) {
                    const cost = window.calculateMaterialCost ? 
                        window.calculateMaterialCost(mat.id, mat.autoOrderAmount) : 
                        (mat.cost * mat.autoOrderAmount);
                    
                    if (window.financesData.cash >= cost) {
                        // Subtract cost & add to inventory
                        window.financesData.cash -= cost;
                        mat.inventory += mat.autoOrderAmount;
                        totalOrderCost += cost;
                        ordersPlaced++;
                        
                        // Add a transaction record
                        if (window.finances && window.finances.addTransaction) {
                            window.finances.addTransaction({
                                date: new Date(window.gameState.currentDate),
                                type: 'expense',
                                category: 'auto-order',
                                amount: cost,
                                description: `Auto-ordered ${mat.autoOrderAmount} units of ${mat.name}`
                            });
                        }
                        
                        console.log(`[autoOrderCheck] Auto-ordered ${mat.autoOrderAmount} units of ${mat.name} for $${cost.toFixed(2)}`);
                    } else {
                        console.warn(`[autoOrderCheck] Not enough cash to auto-order ${mat.name}. Needed: $${cost.toFixed(2)}, Available: $${window.financesData.cash.toFixed(2)}`);
                    }
                }
            }
        });
        
        if (ordersPlaced > 0) {
            // Update UI to reflect changes
            window.financesData.dailyIncome -= totalOrderCost;
            
            if (window.updateUI) {
                window.updateUI("finances");
                
                if (window.currentPage === 'inventory' || window.currentPage === 'marketplace') {
                    window.showPage(window.currentPage); // Refresh the current inventory-related page
                }
            }
            
            // Emit event for auto-orders
            events.emit('autoOrdersPlaced', {
                totalCost: totalOrderCost,
                ordersCount: ordersPlaced
            });
        }
    }

    // Force a time-step update to ensure task progress
    function forceTimeUpdate(minutes = 1) {
        console.log(`[timeEvents] Forcing time update of ${minutes} minutes`);
        
        if (window.taskManager && window.taskManager.updateTasks) {
            window.taskManager.updateTasks(minutes);
        }
        
        return true;
    }

    // ---------------------------------------------------------
    // Add an event listener for time-related events
    // ---------------------------------------------------------
    function addEventListener(event, callback) {
        events.on(event, callback);
    }

    // ---------------------------------------------------------
    // Remove an event listener
    // ---------------------------------------------------------
    function removeEventListener(event, callback) {
        events.off(event, callback);
    }

    // Public API
    return {
        endOfDay,
        skipToNextDay,
        minuteCheck,
        hourlyCheck,
        spawnCustomersForHour,
        startOfDay,
        autoOrderCheck,
        forceTimeUpdate,
        CONFIG, // Expose configuration settings
        
        // Event system
        addEventListener,
        removeEventListener,
        
        // Event constants
        EVENTS: {
            START_OF_DAY: 'startOfDay',
            END_OF_DAY: 'endOfDay',
            HOURLY_CHECK: 'hourlyCheck',
            AUTO_ORDERS_PLACED: 'autoOrdersPlaced'
        }
    };
})();

// Helper function to manually force time forward (for debugging)
window.forceTimeForward = function(minutes = 5) {
    console.log(`[FORCE] Manually advancing time by ${minutes} minutes`);
    
    // Update game time
    const msToAdd = minutes * 60 * 1000;
    window.gameState.currentDate.setTime(window.gameState.currentDate.getTime() + msToAdd);
    
    // Force task updates
    if (window.taskManager && window.taskManager.updateTasks) {
        window.taskManager.updateTasks(minutes);
    }
    
    // Force UI updates
    if (window.ui && window.ui.updateTime) {
        window.ui.updateTime();
    }
    
    if (window.ui && window.ui.forceUpdate) {
        window.ui.forceUpdate('time');
        window.ui.forceUpdate('customers');
        window.ui.forceUpdate('prescriptions');
    }
    
    return true;
};