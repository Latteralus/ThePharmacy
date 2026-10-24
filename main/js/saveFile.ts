// saveFile.js - the save file format.
//
// A save holds only player state. Static definitions (names, recipes, costs,
// research levels) come from the data files on every launch, and the saved
// state is merged onto them, so rebalancing a data file reaches old saves.
//
// From v10 (Phase 10) a save is the company (cash and the ledger, the bank,
// reputation, research, claims, day records and reports) and its locations
// (each with its building, lease, staff, stock, equipment, tasks, customers,
// prescriptions and visits), plus the clock, notifications and settings.
//
// Changing the shape: bump SAVE_VERSION, add a step to `migrations` that
// upgrades the previous version, and revive any new Date field in
// reviveDates (JSON turns Dates into strings).
//
// Loads after the data files and before anything that changes them, so the
// defaults captured below are pristine.

window.saveFile = (function (): SaveFileApi {
    const SAVE_VERSION = 10;

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

    function freshDefinitions(): Pick<StoreLocation, 'products' | 'materials' | 'equipment'> {
        return {
            products: clone(defaults.products),
            materials: clone(defaults.materials),
            equipment: clone(defaults.equipment),
        };
    }

    function serializeLocation(location: StoreLocation): SavedLocation {
        const { products, materials, equipment, ...rest } = location;
        return {
            ...rest,
            products: products.map((p) => pickState(p, PRODUCT_STATE)),
            materials: materials.map((m) => pickState(m, MATERIAL_STATE)),
            equipment: equipment.map((e) => pickState(e, EQUIPMENT_STATE)),
        };
    }

    function serialize(): SaveFile {
        // Frame-loop bookkeeping holds performance.now() timestamps that
        // mean nothing in another session.
        const { lastFrameTime, lastSimulationTime, simulationAccumulator, renderInfo, ...gameState } = window.gameState;
        const notifications = window.notifications;

        return {
            version: SAVE_VERSION,
            timestamp: Date.now(),
            gameState,
            company: {
                name: window.company.name,
                activeLocationId: window.company.activeId,
                finances: window.financesData,
                reputation: window.brandReputation.reputationScore,
                research: {
                    currentLevel: window.researchData.currentLevel,
                    inProgress: window.researchData.inProgress,
                },
                insuranceClaims: {
                    pending: window.insuranceClaims.pendingClaims,
                    processed: window.insuranceClaims.processedClaims,
                },
                records: { days: window.records.days, pruned: window.records.pruned },
                reports: window.reports.list,
            },
            locations: window.company.locations.map(serializeLocation),
            notifications: {
                items: notifications?.items ?? [],
                unreadCount: notifications?.unreadCount ?? 0,
                nextId: notifications?.nextId ?? 1,
            },
            settings: {
                gameSpeed: window.getGameSpeed(),
                globalMarkup: window.globalMarkup,
            },
        };
    }

    // Upgrades a save of version N to N + 1.
    const migrations: {
        1: (save: SaveFileV1) => SaveFileV9;
        2: (save: SaveFileV9) => SaveFileV9;
        3: (save: SaveFileV9) => SaveFileV9;
        4: (save: SaveFileV9) => SaveFileV9;
        5: (save: SaveFileV9) => SaveFileV9;
        6: (save: SaveFileV9) => SaveFileV9;
        7: (save: SaveFileV9) => SaveFileV9;
        8: (save: SaveFileV9) => SaveFileV9;
        9: (save: SaveFileV9) => SaveFile;
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
        // hour and overhead. Every game now plays at Normal: the multipliers
        // are dropped (the overhead itself is replaced by rent and utilities
        // in v10). Cash and reputation are the player's, so they stay.
        6(save) {
            const { difficulty, ...gameState } = save.gameState as SaveFileV9['gameState'] & { difficulty?: string };
            const settings = { gameSpeed: save.settings.gameSpeed, globalMarkup: save.settings.globalMarkup };
            return { ...save, version: 7, gameState, settings };
        },

        // v7 prices were set when materials cost 4x what they do now
        // (balance pass, 2026-10-23), so every one would be far over market
        // and every self-pay customer would walk out. Prices go back to the
        // player's markup on today's costs. Cash, salaries and claims owed
        // are the player's, so they stay.
        7(save) {
            const markup = save.settings.globalMarkup;
            const known = new Set(defaults.products.map((p) => p.id));
            const products = save.products.map((p) =>
                p.price === undefined || !known.has(p.id)
                    ? p
                    : { ...p, price: window.calculateProductCost(p.id) * markup },
            );
            return { ...save, version: 8, products };
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

        // v9 was one pharmacy with no building (Phase 10). It becomes a
        // company with one location: the default listing for its old area
        // type (urban, suburban or rural), on a 3-year lease from its first
        // day, with no deposit paid and no startup loan. The flat overhead
        // gives way to monthly rent and utilities by floor space. Its ledger
        // entries are the location's, apart from the line of credit's. Goals
        // reached keep their ids in the longer ladder; a win under the old,
        // shorter one is dropped, so the new one can be won.
        9(save) {
            const { pharmacyName, location, ...gameState } = save.gameState;
            delete gameState.wonOnDay;
            const area: AreaType = location === 'urban' || location === 'rural' ? location : 'suburban';
            const listing = window.properties.defaultListing(area);

            // The game's first opening, 07:00 on day 0
            const opened = new Date(save.gameState.currentDate);
            opened.setDate(opened.getDate() - save.gameState.dayIndex);
            opened.setHours(7, 0, 0, 0);
            const end = new Date(opened);
            end.setFullYear(end.getFullYear() + 3);
            const id = 'loc-1';

            const { overhead, ...finances } = save.financesData;
            finances.loans = [];
            finances.expenseCategories = { ...finances.expenseCategories, rent: 0 };
            finances.transactions.forEach((t) => {
                t.locationId = t.category === 'loan' || t.category === 'interest' ? null : id;
            });

            return {
                version: 10,
                timestamp: save.timestamp,
                gameState: { ...gameState, gameId: `game-${save.timestamp.toString(36)}` },
                company: {
                    name: pharmacyName || 'Your Pharmacy',
                    activeLocationId: id,
                    finances,
                    reputation: save.brandReputation.reputationScore,
                    research: save.research,
                    insuranceClaims: save.insuranceClaims,
                    records: { days: save.records.days, pruned: {} },
                    reports: [],
                },
                locations: [
                    {
                        id,
                        name: listing.address,
                        businessType: 'retail',
                        address: listing.address,
                        area,
                        footTraffic: listing.footTraffic,
                        competitors: listing.competitors,
                        building: clone(listing.building),
                        lease: {
                            listingId: listing.id,
                            monthlyRent: window.properties.monthlyRent(listing, 3),
                            termYears: 3,
                            start: opened.getTime(),
                            end: end.getTime(),
                            deposit: 0,
                        },
                        openedOnDay: 0,
                        employees: save.employeesData,
                        products: save.products,
                        materials: save.materials,
                        equipment: save.equipment,
                        tasks: save.tasks,
                        customers: save.customers,
                        prescriptions: save.activePrescriptions,
                        refills: save.refillRegistry,
                        visits: save.records.visits,
                    },
                ],
                notifications: { items: [], unreadCount: 0, nextId: 1 },
                settings: save.settings,
            };
        },
    };

    function migrate(raw: unknown): SaveFile {
        if (!raw || typeof raw !== 'object' || !('gameState' in raw) || !('financesData' in raw || 'company' in raw)) {
            throw new Error('Not a save file');
        }
        let save = raw as { version?: number };
        let version = typeof save.version === 'number' ? save.version : 1;
        if (version > SAVE_VERSION) {
            throw new Error(`Save version ${version} is newer than this game (${SAVE_VERSION})`);
        }
        while (version < SAVE_VERSION) {
            save = (migrations[version as keyof typeof migrations] as (s: unknown) => { version: number })(save);
            version = save.version!;
        }
        return save as SaveFile;
    }

    // JSON turns every Date into a string. A transaction date left as a
    // string makes the transaction log's sort throw, which softlocks end of day.
    function reviveDates(save: SaveFile): void {
        save.gameState.currentDate = new Date(save.gameState.currentDate);
        if (save.gameState.dateCreated) save.gameState.dateCreated = new Date(save.gameState.dateCreated);
        save.company.finances.transactions.forEach((t) => {
            t.date = new Date(t.date);
        });
        save.locations.forEach((location) => {
            location.employees.forEach((emp) => {
                if (emp.hireDate) emp.hireDate = new Date(emp.hireDate);
            });
        });
        const claims = save.company.insuranceClaims;
        [...claims.pending, ...claims.processed].forEach((claim) => {
            claim.submittedDate = new Date(claim.submittedDate);
            if (claim.processedDate) claim.processedDate = new Date(claim.processedDate);
        });
        save.notifications.items.forEach((item) => {
            item.timestamp = new Date(item.timestamp);
        });
    }

    // A saved location, live: static definitions overlaid with its state,
    // and customers given the current definition of their insurance plan.
    function liveLocation(saved: SavedLocation): StoreLocation {
        saved.customers.forEach((customer) => {
            customer.insurance = window.customers.getInsuranceByPlanName(customer.insurance.planName);
        });
        return {
            ...saved,
            products: mergeState(clone(defaults.products), saved.products, PRODUCT_STATE),
            materials: mergeState(clone(defaults.materials), saved.materials, MATERIAL_STATE),
            equipment: mergeState(clone(defaults.equipment), saved.equipment, EQUIPMENT_STATE),
        };
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
        const company = save.company;
        window.financesData = company.finances;
        // Saves from before the top bar showed it
        window.financesData.dailyInsurance ??= 0;

        // Merge rather than replace, so the module's methods survive.
        window.brandReputation.reputationScore = company.reputation;

        window.researchData = {
            ...clone(defaults.research),
            currentLevel: company.research.currentLevel,
            inProgress: company.research.inProgress,
        };

        // Every location's lists, with the per-location globals (employeesData,
        // productsData, taskManager.tasks, ...) viewing the active one's
        window.company.reset(company.name, save.locations.map(liveLocation), company.activeLocationId);

        if (company.research.refund) {
            window.finances.transact({
                type: 'income',
                category: 'other',
                amount: company.research.refund,
                description: 'Refund: research toward a level that no longer exists',
                locationId: null,
            });
        }

        window.insuranceClaims.pendingClaims = company.insuranceClaims.pending;
        window.insuranceClaims.processedClaims = company.insuranceClaims.processed;
        window.insuranceClaims.syncPendingTotals();

        window.records.days = company.records.days;
        window.records.pruned = company.records.pruned;
        window.reports.list = company.reports;
        window.notifications?.restore(save.notifications);

        const settings = save.settings;
        window.setGameSpeed(settings.gameSpeed);
        window.globalMarkup = settings.globalMarkup;

        // Gives every loaded customer the tasks their status needs (and
        // v2 fills their stock). A current save needs nothing.
        window.company.forEachLocation(() => window.customers.reconcileTasks());
    }

    return { version: SAVE_VERSION, serialize, migrate, apply, freshDefinitions };
})();
