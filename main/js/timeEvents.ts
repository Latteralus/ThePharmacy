// optimized-timeEvents.js
// Enhanced time event system with improved performance and control

type TimeEventListener = (data: unknown) => void;

window.timeEvents = (function (): TimeEventsApi {
    // Configuration settings
    const CONFIG: TimeEventsConfig = {
        OPENING_HOUR: 7, // Day starts at 7 AM
        CLOSING_HOUR: 22, // Day ends at 10 PM
    };

    // Game minutes between the customers of one hourly batch (was 500 ms of
    // real time, which is half a game minute at 1x).
    const CUSTOMER_ARRIVAL_SPACING_MINUTES = 0.5;

    // Clock jobs for this hour's customers who haven't arrived yet. Loading
    // a save cancels them (cancelPendingArrivals), so the old session's
    // customers don't walk into the loaded game.
    const pendingArrivals = new Set<number>();

    // Event system for time-related events
    const events = {
        listeners: {} as Record<string, TimeEventListener[]>,

        // Add event listener
        on(event: string, callback: TimeEventListener): void {
            if (!this.listeners[event]) {
                this.listeners[event] = [];
            }
            this.listeners[event].push(callback);
        },

        // Remove event listener
        off(event: string, callback: TimeEventListener): void {
            if (!this.listeners[event]) return;
            this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
        },

        // Trigger event
        emit(event: string, data: unknown): void {
            if (!this.listeners[event]) return;
            this.listeners[event].forEach((callback) => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in time event listener for ${event}:`, error);
                }
            });
        },
    };

    // ---------------------------------------------------------
    // Called at 22:00 in main.js, or whenever a day ends
    // ---------------------------------------------------------
    function endOfDay(gameState: GameState): void {
        console.log('[timeEvents] End of day triggered');

        // The store is closed: anyone still waiting goes home now rather
        // than sitting in the store overnight.
        if (window.customers && window.customers.sendRemainingCustomersHome) {
            window.customers.sendRemainingCustomersHome();
        }

        // Emit the end-of-day event
        events.emit('endOfDay', { gameState });

        // End-of-day finance operations
        if (window.finances && window.finances.applyDailyCosts) {
            window.finances.applyDailyCosts();
        }
        gameState.lastEndedDayIndex = gameState.dayIndex;

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
    function skipToNextDay(gameState: GameState): void {
        console.log('[timeEvents] Starting new day');

        // Move to next day
        const previousDate = new Date(gameState.currentDate);
        const day = gameState.currentDate.getDate();
        gameState.currentDate.setDate(day + 1);
        gameState.currentDate.setHours(CONFIG.OPENING_HOUR, 0, 0, 0);
        gameState.dayIndex++;
        gameState.isDayActive = true;
        gameState.customersToday = {};

        // Roll over today / this week / this month, and the daily counters
        if (window.finances && window.finances.startNewDay) {
            window.finances.startNewDay(previousDate, gameState.currentDate);
        }
        if (window.financesData) {
            window.financesData.pendingOrders = 0;
            window.financesData.completedOrders = 0;
        }

        // Emit the start-of-day event
        events.emit('startOfDay', { gameState });

        // Start new day time-based systems
        startDaySystems(gameState);

        // Update the UI to reflect the new day
        window.ui.updateTime();
        window.updateUI('finances');
    }

    // ---------------------------------------------------------
    // Start-of-day work. Recurring work runs from hourlyCheck or the game
    // clock, which only advance while the day is active.
    // ---------------------------------------------------------
    function startDaySystems(gameState: GameState): void {
        // Auto-assign any pending tasks right at the start of day
        if (window.taskAssignment && window.taskAssignment.autoAssignTasks) {
            window.taskAssignment.autoAssignTasks();
        }

        // Kick off auto-production checks
        if (window.production && window.production.checkAndCreateCompoundTasks) {
            window.production.checkAndCreateCompoundTasks();
        }

        // Check whether any in-progress research has finished (day-based
        // pacing - research.ts loads before this file, so it can't
        // subscribe to the startOfDay event itself; called into directly
        // like the other guarded calls in this function)
        if (window.research && window.research.checkResearchCompletion) {
            window.research.checkResearchCompletion(gameState);
        }
    }

    // ---------------------------------------------------------
    // Called each in-game minute from main.js. Task progress is not
    // advanced here - main.ts's updateGameTime already does that every step.
    // ---------------------------------------------------------
    function minuteCheck(gameState: GameState): void {
        try {
            // If it's exactly XX:00, run hourly check
            if (gameState.currentDate.getMinutes() === 0) {
                const hour = gameState.currentDate.getHours();
                hourlyCheck(gameState, hour);
            }
        } catch (error) {
            console.error('[timeEvents] Error in minuteCheck:', error);
        }
    }

    // ---------------------------------------------------------
    // Called each in-game hour (from minuteCheck if minutes=0)
    // ---------------------------------------------------------
    function hourlyCheck(gameState: GameState, hour: number): void {
        console.log(`[timeEvents] Hourly check for hour ${hour}`);

        // Each step is isolated, so one failing (say, auto-ordering) doesn't
        // also cancel this hour's customers.
        function step(name: string, fn: () => void): void {
            try {
                fn();
            } catch (error) {
                console.error(`[timeEvents] Error in hourlyCheck (${name}):`, error);
            }
        }

        step('auto-order', autoOrderCheck);
        step('auto-purchase equipment', autoPurchaseEquipmentCheck);

        // Restock anything below its max inventory
        step('restock', () => window.production?.checkAndCreateCompoundTasks?.());

        // Pay out insurance claims that have finished processing
        step('insurance', () => window.insuranceClaims?.processAllClaims?.());

        // This hour's customers
        if (hour >= CONFIG.OPENING_HOUR && hour < CONFIG.CLOSING_HOUR) {
            step('customers', () => spawnCustomersForHour(hour));
        }

        // Safety net for anything event-driven assignment missed
        step('auto-assign', () => window.taskAssignment?.autoAssignTasks?.());

        events.emit('hourlyCheck', { gameState, hour });
    }

    // ---------------------------------------------------------
    // Basic spawn logic for new customers each hour
    // ---------------------------------------------------------
    function spawnCustomersForHour(hour: number): void {
        // Skip if customers module isn't available
        if (
            !window.customers ||
            !window.customers.generateCustomer ||
            !window.brandReputation ||
            !window.brandReputation.calcCustomers
        ) {
            return;
        }

        let count = window.brandReputation.calcCustomers(hour);
        // Add a small random variation
        count += Math.floor(Math.random() * 2);

        console.log(`[timeEvents] Spawning ${count} customers for hour ${hour}`);

        for (let i = 0; i < count; i++) {
            // Space the arrivals out so they don't all walk in at once
            const job = window.clock.after(i * CUSTOMER_ARRIVAL_SPACING_MINUTES, () => {
                pendingArrivals.delete(job);
                window.customers.generateCustomer();
            });
            pendingArrivals.add(job);
        }
    }

    function cancelPendingArrivals(): void {
        pendingArrivals.forEach((job) => window.clock.cancel(job));
        pendingArrivals.clear();
    }

    // ---------------------------------------------------------
    // Start the day
    // ---------------------------------------------------------
    function startOfDay(gameState: GameState): void {
        console.log('[timeEvents] Starting day');
        gameState.isDayActive = true;

        // Start all the day systems
        startDaySystems(gameState);

        // Emit the start-of-day event
        events.emit('startOfDay', { gameState });
    }

    // ---------------------------------------------------------
    // Check if we need to auto-order materials
    // ---------------------------------------------------------
    function autoOrderCheck(): void {
        // Skip if materials or finances aren't available
        if (!window.materialsData || !window.financesData) {
            return;
        }

        console.log('[timeEvents] Running auto-order check');

        let totalOrderCost = 0;
        let ordersPlaced = 0;

        window.materialsData.forEach((mat) => {
            // If auto-order is configured
            if (
                typeof mat.autoOrderThreshold === 'number' &&
                typeof mat.autoOrderAmount === 'number' &&
                mat.autoOrderThreshold > 0 &&
                mat.autoOrderAmount > 0
            ) {
                if (mat.inventory < mat.autoOrderThreshold) {
                    const cost = window.calculateMaterialCost(mat.id, mat.autoOrderAmount);

                    const paid = window.finances.transact({
                        type: 'expense',
                        category: 'materials',
                        amount: cost,
                        description: `Auto-ordered ${mat.autoOrderAmount} units of ${mat.name}`,
                        requireFunds: true,
                    });
                    if (paid) {
                        mat.inventory += mat.autoOrderAmount;
                        totalOrderCost += cost;
                        ordersPlaced++;

                        console.log(
                            `[autoOrderCheck] Auto-ordered ${mat.autoOrderAmount} units of ${mat.name} for $${cost.toFixed(2)}`,
                        );
                    } else {
                        console.warn(
                            `[autoOrderCheck] Not enough cash to auto-order ${mat.name}. Needed: $${cost.toFixed(2)}, Available: $${window.financesData.cash.toFixed(2)}`,
                        );
                    }
                }
            }
        });

        if (ordersPlaced > 0) {
            // A compound waiting on these materials can start now
            window.taskAssignment.requestAutoAssign();

            window.updateUI('inventory');

            // Emit event for auto-orders
            events.emit('autoOrdersPlaced', {
                totalCost: totalOrderCost,
                ordersCount: ordersPlaced,
            });
        }
    }

    // ---------------------------------------------------------
    // Check if we need to auto-purchase equipment (same pattern as
    // autoOrderCheck, for equipment.autoPurchaseThreshold/autoPurchaseAmount
    // instead of materials.autoOrderThreshold/autoOrderAmount)
    // ---------------------------------------------------------
    function autoPurchaseEquipmentCheck(): void {
        if (!window.equipmentData || !window.financesData) {
            return;
        }

        console.log('[timeEvents] Running auto-purchase equipment check');

        let totalPurchaseCost = 0;
        let purchasesPlaced = 0;

        window.equipmentData.forEach((eq) => {
            if (eq.autoPurchaseThreshold > 0 && eq.autoPurchaseAmount > 0 && eq.owned < eq.autoPurchaseThreshold) {
                const cost = eq.cost * eq.autoPurchaseAmount;

                const paid = window.finances.transact({
                    type: 'expense',
                    category: 'equipment',
                    amount: cost,
                    description: `Auto-purchased ${eq.autoPurchaseAmount} unit(s) of ${eq.name}`,
                    requireFunds: true,
                });
                if (paid) {
                    eq.owned += eq.autoPurchaseAmount;
                    totalPurchaseCost += cost;
                    purchasesPlaced++;

                    console.log(
                        `[autoPurchaseEquipmentCheck] Auto-purchased ${eq.autoPurchaseAmount} unit(s) of ${eq.name} for $${cost.toFixed(2)}`,
                    );
                } else {
                    console.warn(
                        `[autoPurchaseEquipmentCheck] Not enough cash to auto-purchase ${eq.name}. Needed: $${cost.toFixed(2)}, Available: $${window.financesData.cash.toFixed(2)}`,
                    );
                }
            }
        });

        if (purchasesPlaced > 0) {
            window.updateUI('equipment');

            events.emit('autoEquipmentPurchased', {
                totalCost: totalPurchaseCost,
                purchasesCount: purchasesPlaced,
            });
        }
    }

    // ---------------------------------------------------------
    // Add an event listener for time-related events
    // ---------------------------------------------------------
    function addEventListener(event: string, callback: TimeEventListener): void {
        events.on(event, callback);
    }

    // ---------------------------------------------------------
    // Remove an event listener
    // ---------------------------------------------------------
    function removeEventListener(event: string, callback: TimeEventListener): void {
        events.off(event, callback);
    }

    // Public API
    return {
        endOfDay,
        skipToNextDay,
        minuteCheck,
        hourlyCheck,
        spawnCustomersForHour,
        cancelPendingArrivals,
        startOfDay,
        autoOrderCheck,
        autoPurchaseEquipmentCheck,
        CONFIG, // Expose configuration settings

        // Event system
        addEventListener,
        removeEventListener,

        // Event constants
        EVENTS: {
            START_OF_DAY: 'startOfDay',
            END_OF_DAY: 'endOfDay',
            HOURLY_CHECK: 'hourlyCheck',
            AUTO_ORDERS_PLACED: 'autoOrdersPlaced',
            AUTO_EQUIPMENT_PURCHASED: 'autoEquipmentPurchased',
        },
    };
})();
