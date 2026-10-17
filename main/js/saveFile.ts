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
    const SAVE_VERSION = 2;

    // The mutable fields of each static definition. Everything else on a
    // product, material or equipment item comes from its data file.
    const PRODUCT_STATE = ['price', 'inventory', 'maxInventory'] as const;
    const MATERIAL_STATE = ['inventory', 'autoOrderThreshold', 'autoOrderAmount'] as const;
    const EQUIPMENT_STATE = ['owned', 'durability', 'autoPurchaseThreshold', 'autoPurchaseAmount'] as const;

    function clone<T>(value: T): T {
        return JSON.parse(JSON.stringify(value));
    }

    // Equipment is copied shallowly so each item keeps its isUnlocked()
    // method (JSON would drop it).
    const defaults = {
        products: clone(window.productsData),
        materials: clone(window.materialsData),
        equipment: window.equipmentData.map((item) => ({ ...item })),
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
            settings: {
                gameSpeed: window.getGameSpeed(),
                customerFrequencyMultiplier: window.customerFrequencyMultiplier ?? 1,
                operatingCostMultiplier: window.operatingCostMultiplier ?? 1,
                baseOverhead: window.originalOverhead ?? null,
                globalMarkup: window.globalMarkup,
            },
        };
    }

    // Upgrades a save of version N to N + 1.
    const migrations: Record<number, (save: SaveFileV1) => SaveFile> = {
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
                settings: {
                    gameSpeed: 1,
                    customerFrequencyMultiplier: 1,
                    operatingCostMultiplier: 1,
                    baseOverhead: null,
                    globalMarkup: 1.35,
                },
            };
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
            save = migrations[version](save as unknown as SaveFileV1);
            version = save.version;
        }
        return save;
    }

    // JSON turns every Date into a string. A transaction date left as a
    // string makes addTransaction's sort throw, which softlocks end of day.
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
        window.equipmentData = mergeState(
            defaults.equipment.map((item) => ({ ...item })),
            save.equipment,
            EQUIPMENT_STATE,
        );
        window.researchData = {
            ...clone(defaults.research),
            currentLevel: save.research.currentLevel,
            inProgress: save.research.inProgress,
        };

        // In place: taskManager's closure holds this array. Clearing progress
        // tracking before and after drops entries for the outgoing tasks and
        // any loaded task that happens to share an id.
        const tasks = window.taskManager.tasks;
        window.taskManager.resetProgressVerification();
        tasks.length = 0;
        tasks.push(...save.tasks);
        window.taskManager.resetProgressVerification();

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

        const settings = save.settings;
        window.setGameSpeed(settings.gameSpeed);
        window.customerFrequencyMultiplier = settings.customerFrequencyMultiplier;
        window.operatingCostMultiplier = settings.operatingCostMultiplier;
        window.originalOverhead = settings.baseOverhead ?? undefined;
        window.globalMarkup = settings.globalMarkup;
    }

    return { version: SAVE_VERSION, serialize, migrate, apply };
})();
