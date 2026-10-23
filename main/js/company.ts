// company.js - the company and its locations (Phase 10, #10).
//
// The game is a company that owns one or more locations. The company has
// the name, cash and the ledger (financesData), the bank (stakes.ts),
// reputation, research, goals and the monthly reports. Each location has
// its building and lease, staff, stock, materials, equipment, task queue,
// customers, prescriptions and refills, and customer visits. Day records
// are the company's, with each location's part (records.ts).
//
// The simulation works on one location at a time, the active one. The
// per-location globals (LOCATION_VIEWS below) are views of its lists, so
// code written for one pharmacy reads and writes the active location's.
// withLocation(id, fn) runs fn with another location active;
// forEachLocation runs fn for each in turn. A game has one location until
// Phase 18, which opens more and runs the simulation for each.
//
// Static definitions (product, material and equipment data) stay global:
// each location holds its own copies, with its own stock and prices.

// A lease renews for the same term at its end, with the rent up this much a year
const RENT_RISE = 0.03;

// The globals that are views of the active location's lists. Their owners
// are read when the views are installed, so this file loads after them.
const LOCATION_VIEWS: Array<{ owner: () => object; prop: string; list: LocationList }> = [
    { owner: () => window, prop: 'employeesData', list: 'employees' },
    { owner: () => window, prop: 'productsData', list: 'products' },
    { owner: () => window, prop: 'materialsData', list: 'materials' },
    { owner: () => window, prop: 'equipmentData', list: 'equipment' },
    { owner: () => window.taskManager, prop: 'tasks', list: 'tasks' },
    { owner: () => window.customers, prop: 'activeCustomers', list: 'customers' },
    { owner: () => window.prescriptions, prop: 'activePrescriptions', list: 'prescriptions' },
    { owner: () => window.prescriptions, prop: 'refillRegistry', list: 'refills' },
    { owner: () => window.records, prop: 'visits', list: 'visits' },
];

function cloneData<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

window.company = (function (): CompanyApi {
    let locations: StoreLocation[] = [];
    let activeId = '';

    function get(id: string): StoreLocation | undefined {
        return locations.find((loc) => loc.id === id);
    }

    function active(): StoreLocation {
        return get(activeId) ?? locations[0];
    }

    // A location from a lease listing: its building and lease, fresh copies
    // of the static definitions, and nothing else yet.
    function fromListing(
        listing: PropertyListing,
        termYears: number,
        startTime: number,
        startDay: number,
    ): StoreLocation {
        return { ...emptyLocation(listing, termYears, startTime, startDay), ...window.saveFile.freshDefinitions() };
    }

    function emptyLocation(
        listing: PropertyListing,
        termYears: number,
        startTime: number,
        startDay: number,
    ): StoreLocation {
        const monthlyRent = window.properties.monthlyRent(listing, termYears);
        const end = new Date(startTime);
        end.setFullYear(end.getFullYear() + termYears);
        return {
            id: 'loc-1',
            name: listing.address,
            businessType: 'retail',
            address: listing.address,
            area: listing.area,
            footTraffic: listing.footTraffic,
            competitors: listing.competitors,
            building: cloneData(listing.building),
            lease: {
                listingId: listing.id,
                monthlyRent,
                termYears,
                start: startTime,
                end: end.getTime(),
                deposit: monthlyRent,
            },
            openedOnDay: startDay,
            employees: [],
            products: [],
            materials: [],
            equipment: [],
            tasks: [],
            customers: [],
            prescriptions: [],
            refills: [],
            visits: [],
        };
    }

    // Before any game starts, the first location holds what the modules
    // were loaded with, so they work as they always have (and tests that
    // set the globals directly keep working).
    function adoptGlobals(): void {
        const location = emptyLocation(window.properties.listings[0], 3, 0, 0);
        LOCATION_VIEWS.forEach(({ owner, prop, list }) => {
            const value = (owner() as Record<string, unknown> | undefined)?.[prop];
            if (Array.isArray(value)) (location as unknown as Record<string, unknown>)[list] = value;
        });
        locations = [location];
        activeId = location.id;
    }

    // Owners that aren't loaded (a test that loads only some modules) get
    // no view; the location still holds the list.
    function installViews(): void {
        LOCATION_VIEWS.forEach(({ owner, prop, list }) => {
            if (!owner()) return;
            Object.defineProperty(owner(), prop, {
                configurable: true,
                enumerable: true,
                get: () => active()[list],
                set: (value) => {
                    (active() as unknown as Record<string, unknown>)[list] = value;
                },
            });
        });
    }

    function withLocation<T>(id: string, fn: () => T): T {
        const previous = activeId;
        activeId = id;
        try {
            return fn();
        } finally {
            activeId = previous;
        }
    }

    const api: CompanyApi = {
        name: 'Your Pharmacy',
        get locations() {
            return locations;
        },
        get activeId() {
            return active()?.id ?? '';
        },
        active,
        get,
        withLocation,

        forEachLocation(fn) {
            locations.forEach((location) => withLocation(location.id, () => fn(location)));
        },

        select(id) {
            if (!get(id) || id === activeId) return;
            activeId = id;
            (['finances', 'customers', 'tasks', 'employees', 'inventory', 'equipment'] as ChangeTopic[]).forEach(
                (topic) => window.updateUI(topic),
            );
            if (window.currentPage) window.showPage(window.currentPage);
        },

        reset(name, newLocations, newActiveId) {
            api.name = name;
            locations = newLocations;
            activeId = newActiveId && get(newActiveId) ? newActiveId : (newLocations[0]?.id ?? '');
        },

        fromListing,

        // Both from data/properties.ts, which the new-game screen shares
        trafficFactor(location) {
            return window.properties.trafficFactor(location.footTraffic, location.competitors);
        },

        dailyServices(location) {
            return window.properties.servicesPerDay(location.area, location.building.sqft);
        },

        payRent() {
            const now = window.gameState.currentDate.getTime();
            locations.forEach((location) => {
                const lease = location.lease;
                if (now >= lease.end) {
                    const end = new Date(lease.end);
                    end.setFullYear(end.getFullYear() + lease.termYears);
                    lease.start = lease.end;
                    lease.end = end.getTime();
                    lease.monthlyRent = Math.round(lease.monthlyRent * Math.pow(1 + RENT_RISE, lease.termYears));
                    window.notifications?.add(
                        `The lease on ${location.name} has renewed for ${lease.termYears} ` +
                            `year${lease.termYears === 1 ? '' : 's'}, at ${window.fmt.moneyWhole(lease.monthlyRent)} a month.`,
                        'info',
                    );
                }
                window.finances.transact({
                    type: 'expense',
                    category: 'rent',
                    amount: lease.monthlyRent,
                    description: `Rent for ${location.name}, ${window.gameState.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
                    locationId: location.id,
                });
            });
        },
    };

    adoptGlobals();
    installViews();
    return api;
})();
