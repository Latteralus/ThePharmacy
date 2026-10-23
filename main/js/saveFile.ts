// saveFile.js - the save file format.
//
// A save holds only player state. Static definitions (names, recipes, costs,
// research levels) come from the data files on every launch, and the saved
// state is merged onto them, so rebalancing a data file reaches old saves.
//
// Changing the shape: bump SAVE_VERSION, add a step to `migrations` that
// upgrades the previous version, and revive any new Date field in
// reviveDates (JSON turns Dates into strings).
//
// Loads after the data files and before anything that changes them, so the
// defaults captured below are pristine.

window.saveFile = (function (): SaveFileApi {
    const SAVE_VERSION = 9;

    // The mutable fields of each static definition. Everything else on a
    // product, material or equipment item comes from its data file.
    const PRODUCT_STATE = ['price', 'inventory', 'maxInventory'] as const;
    const MATERIAL_STATE = ['inventory', 'autoOrderThreshold', 'autoOrderAmount'] as const;
    const EQUIPMENT_STATE = ['owned', 'durability', 'autoPurchaseThreshold', 'autoPurchaseAmount'] as const;

    function clone<T>(value: T): T {
        return JSON.parse(JSON.stringify(value));
    }

    const defaults = {
        products: clone(window.productsData),
        materials: clone(window.materialsData),
        equipment: clone(window.equipmentData),
        research: clone(window.researchData),
    };

    function pickState<T extends { id: string }, K extends keyof T>(item: T, keys: readonly K[]): SavedItemState<T, K> {
        const state = { id: item.id } as SavedItemState<T, K>;
        keys.forEach((key) => {
            if (item[key] !== undefined) state[key] = item[key];
        });
        return state;
    }

    // Fresh copies of the static definitions, each overlaid with its saved
    // state. Saved items whose id no longer exists in the data are dropped;
    // items added to the data since the save start at their defaults.
    function mergeState<T extends { id: string }, K extends keyof T>(
        fresh: T[],
        saved: SavedItemState<T, K>[],
        keys: readonly K[],
    ): T[] {
        const byId = new Map(saved.map((s) => [s.id, s]));
        return fresh.map((item) => {
            const state = byId.get(item.id);
            return state ? Object.assign(item, pickState(state as unknown as T, keys)) : item;
        });
    }

    function serialize(): SaveFile {
        // Frame-loop bookkeeping holds performance.now() timestamps that
        // mean nothing in another session.
        const { lastFrameTime, lastSimulationTime, simulationAccumulator, renderInfo, ...gameState } = window.gameState;

        return {
            version: SAVE_VERSION,
            timestamp: Date.now(),
            gameState,
            financesData: window.financesData,
            employeesData: window.employeesData,
            brandReputation: { reputationScore: window.brandReputation.reputationScore },
            products: window.productsData.map((p) => pickState(p, PRODUCT_STATE)),
            materials: window.materialsData.map((m) => pickState(m, MATERIAL_STATE)),
            equipment: window.equipmentData.map((e) => pickState(e, EQUIPMENT_STATE)),
            research: {
                currentLevel: window.researchData.currentLevel,
                inProgress: window.researchData.inProgress,
            },
            tasks: window.taskManager.tasks,
            customers: window.customers.activeCustomers,
            activePrescriptions: window.prescriptions.activePrescriptions,
            refillRegistry: window.prescriptions.refillRegistry,
            insuranceClaims: {
                pending: window.insuranceClaims.pendingClaims,
                processed: window.insuranceClaims.processedClaims,
            },
            records: { days: window.records.days, visits: window.records.visits },
            settings: {
                gameSpeed: window.getGameSpeed(),
                globalMarkup: window.globalMarkup,
            },
        };
    }

    // Upgrades a save of version N to N + 1.
    const migrations: {
        1: (save: SaveFileV1) => SaveFile;
        2: (save: SaveFile) => SaveFile;
        3: (save: SaveFile) => SaveFile;
        4: (save: SaveFile) => SaveFile;
        5: (save: SaveFile) => SaveFile;
        6: (save: SaveFile) => SaveFile;
        7: (save: SaveFile) => SaveFile;
        8: (save: SaveFile) => SaveFile;
    } = {
        // v1 (no version field) stored whole live objects and no tasks,
        // customers, claims or settings.
        1(save) {
            const financesData = save.financesData!;
            // v1 logged a "pending" insurance income transaction at sale time
            // and another when the claim paid. Only the payment moved cash.
            financesData.transactions = (financesData.transactions || []).filter((t) => !t.pending);
            // Overlapped copays + insurance, so the revenue pie counted sales twice.
            delete (financesData.revenueCategories as unknown as Record<string, number>).prescriptions;

            // v1 didn't save tasks, so nobody is working on anything.
            const employeesData = (save.employeesData || []).map((emp) => ({ ...emp, currentTaskId: null }));

            return {
                version: 2,
                timestamp: save.timestamp ?? Date.now(),
                gameState: save.gameState!,
                financesData,
                employeesData,
                brandReputation: { reputationScore: save.brandReputation?.reputationScore ?? 10 },
                products: (save.productsData || []).map((p) => pickState(p, PRODUCT_STATE)),
                materials: (save.materialsData || []).map((m) => pickState(m, MATERIAL_STATE)),
                equipment: (save.equipmentData || []).map((e) => pickState(e, EQUIPMENT_STATE)),
                research: {
                    currentLevel: save.researchData?.currentLevel ?? 0,
                    inProgress: save.researchData?.inProgress ?? null,
                },
                tasks: [],
                customers: [],
                // v1 kept prescriptions but not the customers they belong to.
                activePrescriptions: [],
                refillRegistry: save.refillRegistry || [],
                insuranceClaims: { pending: [], processed: [] },
                records: { days: [], visits: [] }, // a v6 field; migrations[5] sets it again
                settings: { gameSpeed: 1, globalMarkup: 1.35 },
            };
        },

        // v2 predates the task and customer state machines.
        2(save) {
            // The duplicate fill-<id> tasks (H1) shared an id. Keep the first,
            // which is the one an employee's currentTaskId points at.
            const seen = new Set<string>();
            const tasks = save.tasks.filter((task) => {
                if (seen.has(task.id)) return false;
                seen.add(task.id);
                return true;
            });

            // Check-in and checkout were told apart by the customer's
            // status. Their ids say which they are.
            tasks.forEach((task) => {
                if (task.type === 'customerInteraction') {
                    task.interaction = task.id.startsWith('checkout') ? 'checkout' : 'checkIn';
                }
            });

            // v2 fills took their stock when they finished, so none hold any
            // yet; customers.reconcileTasks gives them stock (or a compound)
            // after the load. Customers v2 left waiting for a fill that was
            // already done are moved on there too.
            return { ...save, version: 3, tasks };
        },

        // v3 compounds took their materials when they finished, so one under
        // way holds none. Put it back in the queue, keeping its progress: it
        // takes its materials when someone picks it up again, and waits (or,
        // for a restock, shrinks) if they're short.
        3(save) {
            const requeued = new Set<string>();
            save.tasks.forEach((task) => {
                if (task.type === 'compound' && task.status === 'inProgress') {
                    task.status = 'pending';
                    task.assignedTo = null;
                    requeued.add(task.id);
                }
            });
            const employeesData = save.employeesData.map((emp) =>
                emp.currentTaskId && requeued.has(emp.currentTaskId) ? { ...emp, currentTaskId: null } : emp,
            );
            return { ...save, version: 4, employeesData };
        },

        // v4 had research levels 0-10, and levels 3-10 unlocked products and
        // equipment that didn't exist. The tree is now levels 0-4 (Phase 7).
        // A save past the last level keeps everything there is; research
        // under way toward a level that's gone is cancelled and its cost
        // (5000 x level in v4) refunded when the save is applied.
        4(save) {
            const maxLevel = defaults.research.levels.length - 1;
            const research = { ...save.research, currentLevel: Math.min(save.research.currentLevel, maxLevel) };
            const target = research.inProgress?.targetLevel ?? 0;
            if (target > maxLevel) {
                research.refund = 5000 * target;
                research.inProgress = null;
            }
            return { ...save, version: 5, research };
        },

        // v5 predates stakes and history (Phase 8): no bank loan, no interest
        // bucket, no count of closings in the red, no goals, no records. The
        // history starts at the upgrade.
        5(save) {
            const financesData = {
                ...save.financesData,
                loanBalance: 0,
                expenseCategories: { ...save.financesData.expenseCategories, interest: 0 },
            };
            const gameState = { ...save.gameState, daysInRed: 0, goalsReached: {} };
            return { ...save, version: 6, financesData, gameState, records: { days: [], visits: [] } };
        },

        // v6 had difficulty levels, and Settings multipliers for customers an
        // hour and overhead. Every game now plays at Normal: overhead goes
        // back to the location's and the multipliers are dropped. Cash and
        // reputation are the player's, so they stay.
        6(save) {
            const { difficulty, ...gameState } = save.gameState as GameState & { difficulty?: string };
            const financesData = { ...save.financesData, overhead: window.finances.dailyOverhead(gameState.location) };
            const settings = { gameSpeed: save.settings.gameSpeed, globalMarkup: save.settings.globalMarkup };
            return { ...save, version: 7, gameState, financesData, settings };
        },

        // v7 prices were set when materials cost 4x what they do now
        // (balance pass, 2026-10-23), so every one would be far over market
        // and every self-pay customer would walk out. Prices go back to the
        // player's markup on today's costs, and overhead to today's rent.
        // Cash, salaries and claims owed are the player's, so they stay.
        7(save) {
            const markup = save.settings.globalMarkup;
            const known = new Set(defaults.products.map((p) => p.id));
            const products = save.products.map((p) =>
                p.price === undefined || !known.has(p.id)
                    ? p
                    : { ...p, price: window.calculateProductCost(p.id) * markup },
            );
            const financesData = {
                ...save.financesData,
                overhead: window.finances.dailyOverhead(save.gameState.location),
            };
            return { ...save, version: 8, products, financesData };
        },

        // v8 predates store controls and the overtime rules (Phase 9). The
        // front is open, and nobody has weekly hours yet: a save loaded
        // mid-week under-counts that week once. Nobody is sent home or set
        // to "Don't allow overtime". 0.5x is no longer offered; it loads at 1x.
        8(save) {
            const gameState = { ...save.gameState, frontOpen: true };
            const employeesData = save.employeesData.map((emp) => ({
                ...emp,
                minutesWorkedThisWeek: 0,
                straightMinutesThisWeek: 0,
                noOvertime: false,
            }));
            const settings = { ...save.settings, gameSpeed: Math.max(1, save.settings.gameSpeed) };
            return { ...save, version: 9, gameState, employeesData, settings };
        },
    };

    function migrate(raw: unknown): SaveFile {
        if (!raw || typeof raw !== 'object' || !('gameState' in raw) || !('financesData' in raw)) {
            throw new Error('Not a save file');
        }
        let save = raw as SaveFile;
        let version = typeof save.version === 'number' ? save.version : 1;
        if (version > SAVE_VERSION) {
            throw new Error(`Save version ${version} is newer than this game (${SAVE_VERSION})`);
        }
        while (version < SAVE_VERSION) {
            save = (migrations[version as keyof typeof migrations] as (s: unknown) => SaveFile)(save);
            version = save.version;
        }
        return save;
    }

    // JSON turns every Date into a string. A transaction date left as a
    // string makes the transaction log's sort throw, which softlocks end of day.
    function reviveDates(save: SaveFile): void {
        save.gameState.currentDate = new Date(save.gameState.currentDate);
        if (save.gameState.dateCreated) save.gameState.dateCreated = new Date(save.gameState.dateCreated);
        save.financesData.transactions.forEach((t) => {
            t.date = new Date(t.date);
        });
        save.employeesData.forEach((emp) => {
            if (emp.hireDate) emp.hireDate = new Date(emp.hireDate);
        });
        [...save.insuranceClaims.pending, ...save.insuranceClaims.processed].forEach((claim) => {
            claim.submittedDate = new Date(claim.submittedDate);
            if (claim.processedDate) claim.processedDate = new Date(claim.processedDate);
        });
    }

    // Restores a save (any version) into the live globals.
    function apply(raw: unknown): void {
        const save = migrate(raw);
        reviveDates(save);

        // Zeroed so gameLoop treats its next frame as the first.
        window.gameState = {
            ...save.gameState,
            lastFrameTime: 0,
            lastSimulationTime: 0,
            simulationAccumulator: 0,
            renderInfo: { fps: 0, frameCount: 0, lastFpsUpdate: 0 },
        };
        window.financesData = save.financesData;
        window.employeesData = save.employeesData;

        // Merge rather than replace, so the module's methods survive.
        window.brandReputation.reputationScore = save.brandReputation.reputationScore;

        window.productsData = mergeState(clone(defaults.products), save.products, PRODUCT_STATE);
        window.materialsData = mergeState(clone(defaults.materials), save.materials, MATERIAL_STATE);
        window.equipmentData = mergeState(clone(defaults.equipment), save.equipment, EQUIPMENT_STATE);
        window.researchData = {
            ...clone(defaults.research),
            currentLevel: save.research.currentLevel,
            inProgress: save.research.inProgress,
        };
        if (save.research.refund) {
            window.finances.transact({
                type: 'income',
                category: 'other',
                amount: save.research.refund,
                description: 'Refund: research toward a level that no longer exists',
            });
        }

        // Customers the current session has scheduled to arrive belong to
        // it, not to the loaded game.
        window.timeEvents?.cancelPendingArrivals();

        // In place: taskManager's closure holds this array.
        const tasks = window.taskManager.tasks;
        tasks.length = 0;
        tasks.push(...save.tasks);

        // Customers get the current definition of their insurance plan.
        save.customers.forEach((customer) => {
            customer.insurance = window.customers.getInsuranceByPlanName(customer.insurance.planName);
        });
        window.customers.activeCustomers = save.customers;
        window.prescriptions.activePrescriptions = save.activePrescriptions;
        window.prescriptions.refillRegistry = save.refillRegistry;

        window.insuranceClaims.pendingClaims = save.insuranceClaims.pending;
        window.insuranceClaims.processedClaims = save.insuranceClaims.processed;
        window.insuranceClaims.syncPendingTotals();

        window.records.days = save.records.days;
        window.records.visits = save.records.visits;

        const settings = save.settings;
        window.setGameSpeed(settings.gameSpeed);
        window.globalMarkup = settings.globalMarkup;

        // Gives every loaded customer the tasks their status needs (and
        // v2 fills their stock). A current save needs nothing.
        window.customers.reconcileTasks();
    }

    return { version: SAVE_VERSION, serialize, migrate, apply };
})();
