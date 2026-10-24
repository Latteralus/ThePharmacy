// optimized-timeEvents.js
// Enhanced time event system with improved performance and control

type TimeEventListener = (data: unknown) => void;

window.timeEvents = (function (): TimeEventsApi {
    // Configuration settings
    const CONFIG: TimeEventsConfig = {
        OPENING_HOUR: 7, // Day starts at 7 AM
        CLOSING_HOUR: 22, // Day ends at 10 PM
        // Last entry an hour before closing (#50): the 20:00 hour's customers
        // are the last, so everyone who comes in can be served before 22:00. Phase 14
        // makes this each location's opening hours.
        LAST_ENTRY_HOUR: 21,
    };

    const HOUR_MS = 60 * 60 * 1000;

    // The day the player was last told storage was too full to auto-order
    // (once a day)
    let storageFullWarnedDay = -1;

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
        // Today's hours and pay move staff morale; the unhappiest may quit.
        // After wages, so a quitter is paid for the day.
        window.employees?.endOfDay?.();
        gameState.lastEndedDayIndex = gameState.dayIndex;

        // The day goes into the history, then goals and the bank have their
        // say (Phase 8). The last closing of a month writes its report (and
        // December's, the year's) from the history (Phase 10, #13). Three
        // closings in a row in the red is bankruptcy, and the game ends here.
        window.records?.recordDay();
        const reached = window.goals?.check();
        const written = window.reports?.closeDay() ?? [];
        // A report can complete a goal (a profitable month or year)
        const fromReports = written.length > 0 ? window.goals?.check() : undefined;
        const won = !!reached?.won || !!fromReports?.won;
        if (window.stakes?.closeDay()) {
            window.updateUI('finances');
            window.showGameOverModal?.();
            return;
        }

        // Show the daily summary, then wait for the user to start next day:
        // after it come the month's and year's reports, if written today,
        // and the winning dialog on the day all goals are reached. With the
        // summary skipped (#49), the next day starts by itself: the day's
        // record keeps the summary for the Dashboard, and the closing
        // warnings (in the red, low cash, staff quitting) are notifications
        // already (stakes.closeDay, employees.endOfDay). A skipped report is
        // kept, to open from the Dashboard or Finances page.
        const nextDay = (): void => skipToNextDay(gameState);
        const afterReports = won && window.showVictoryModal ? () => window.showVictoryModal(nextDay) : nextDay;
        const afterSummary = written.reduceRight<() => void>((next, report) => {
            const skip =
                report.kind === 'month' ? window.appSettings?.skipMonthlyReport : window.appSettings?.skipYearlyReport;
            if (skip || !window.showReportModal) {
                window.notifications?.add(`The ${report.label} report is ready on the Finances page.`, 'info');
                return next;
            }
            return () => window.showReportModal(report.kind, report.period, next);
        }, afterReports);
        if (window.appSettings?.skipDailySummary) {
            afterSummary();
        } else if (window.showDailySummaryModal) {
            window.showDailySummaryModal(afterSummary);
        } else {
            // Fallback if the modal function is missing
            afterSummary();
        }
    }

    // ---------------------------------------------------------
    // Closing, from the 22:00 check in main.ts or End day. A day already
    // settled (a save made while its summary was open) only rolls over, so
    // wages and overhead are never charged twice.
    // ---------------------------------------------------------
    function closeDay(gameState: GameState): void {
        if (!gameState.isDayActive) return;
        gameState.isDayActive = false; // Stop advancing time
        // Nobody still due this hour (End day mid-hour) walks in tomorrow
        cancelPendingArrivals();
        if (gameState.lastEndedDayIndex === gameState.dayIndex) {
            skipToNextDay(gameState);
        } else {
            endOfDay(gameState);
        }
    }

    // ---------------------------------------------------------
    // Store controls (#8). Closing the front stops new customers, including
    // returning refill customers, and this hour's who haven't walked in yet.
    // Customers inside are served and staff keep working. Reopening takes
    // effect from the next hourly batch. Neither costs reputation.
    // ---------------------------------------------------------
    function setFrontOpen(open: boolean): void {
        const gameState = window.gameState;
        if ((gameState.frontOpen ?? true) === open) return;
        gameState.frontOpen = open;
        if (open) {
            delete gameState.frontClosedAt;
        } else {
            gameState.frontClosedAt = window.clock.now();
            cancelPendingArrivals();
        }
        window.updateUI('customers');
    }

    // Ends the day now, by the same path as 22:00. Customers still inside
    // leave unserved (with the usual closing-time reputation cost); tasks
    // keep their progress and resume at the next opening.
    function endDayNow(): void {
        const gameState = window.gameState;
        if (!gameState.isDayActive) return;
        gameState.closedEarlyAt = window.clock.now();
        closeDay(gameState);
    }

    function closingPreview(): { customers: number; tasksInProgress: number } {
        return {
            customers: window.customers?.activeCustomers.length ?? 0,
            tasksInProgress: window.taskManager.tasks.filter((t) => t.status === 'inProgress').length,
        };
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
        // The store opens every morning
        gameState.frontOpen = true;
        delete gameState.frontClosedAt;
        delete gameState.closedEarlyAt;
        // Staff sent home are back; weekly hours reset on Sunday
        window.employees?.startNewDay(gameState.currentDate);

        // Roll over today / this week / this month, and the daily counters
        if (window.finances && window.finances.startNewDay) {
            window.finances.startNewDay(previousDate, gameState.currentDate);
        }
        // The 1st: rent and term-loan payments (Phase 10)
        if (gameState.currentDate.getMonth() !== previousDate.getMonth()) {
            window.company?.payRent();
            window.stakes?.payTermLoans();
        }
        if (window.financesData) {
            window.financesData.pendingOrders = 0;
            window.financesData.completedOrders = 0;
        }

        // Emit the start-of-day event
        events.emit('startOfDay', { gameState });

        // Start new day time-based systems
        startDaySystems(gameState);

        // Update the UI to reflect the new day (and the front open again)
        window.ui.updateTime();
        window.updateUI('finances');
        window.updateUI('customers');
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

        // This hour's customers, until last entry and while the front is open
        if (hour >= CONFIG.OPENING_HOUR && hour < CONFIG.LAST_ENTRY_HOUR && (gameState.frontOpen ?? true)) {
            step('customers', () => spawnCustomersForHour(hour));
        }

        // Safety net for anything event-driven assignment missed
        step('auto-assign', () => window.taskAssignment?.autoAssignTasks?.());

        events.emit('hourlyCheck', { gameState, hour });
    }

    // ---------------------------------------------------------
    // This hour's customers: how many is decided at the top of the hour,
    // and each gets its own random arrival time within it, so they wander
    // in over the hour instead of all at once. The times are kept on
    // gameState (saved), and admitArrivals lets each customer in as their
    // time comes.
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

        const start = window.clock.now();
        const arrivals = window.gameState.customerArrivals ?? [];
        for (let i = 0; i < count; i++) {
            arrivals.push(start + Math.random() * HOUR_MS);
        }
        arrivals.sort((a, b) => a - b);
        window.gameState.customerArrivals = arrivals;
    }

    // Lets in everyone whose arrival time has come. Checked every game
    // second on the clock, so it stops while paused and between days.
    function admitArrivals(): void {
        const arrivals = window.gameState?.customerArrivals;
        if (!arrivals?.length || !window.customers?.generateCustomer) return;
        const now = window.clock.now();
        while (arrivals.length > 0 && arrivals[0] <= now) {
            arrivals.shift();
            window.customers.generateCustomer();
        }
    }
    window.clock.every(1 / 60, admitArrivals);

    function cancelPendingArrivals(): void {
        if (window.gameState) window.gameState.customerArrivals = [];
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
                    // Only what storage has shelves for (#11)
                    const refusal = window.building?.refuseMaterials({ [mat.id]: mat.autoOrderAmount }) ?? '';
                    if (refusal) {
                        warnStorageFull(mat.name);
                        return;
                    }
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

    function warnStorageFull(materialName: string): void {
        const day = window.gameState.dayIndex;
        if (storageFullWarnedDay === day) return;
        storageFullWarnedDay = day;
        window.notifications?.add(
            `Storage is full, so ${materialName} couldn't be reordered. Free some shelves (the Building page shows ` +
                'what takes them), or lower reorder amounts on the Inventory page.',
            'warning',
        );
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
                // Only what the building has room for (#11)
                if (window.building?.refuseEquipment({ [eq.id]: eq.autoPurchaseAmount })) {
                    console.warn(`[autoPurchaseEquipmentCheck] No room for ${eq.name}`);
                    return;
                }
                const cost = eq.cost * eq.autoPurchaseAmount;

                const paid = window.finances.transact({
                    type: 'expense',
                    category: 'equipment',
                    amount: cost,
                    description: `Auto-purchased ${eq.autoPurchaseAmount} unit(s) of ${eq.name}`,
                    requireFunds: true,
                });
                if (paid) {
                    window.production.addEquipment(eq, eq.autoPurchaseAmount);
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
        closeDay,
        setFrontOpen,
        endDayNow,
        closingPreview,
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
