// /js/pages/buildingPage.js - the location's building (Phase 10, #11): each
// zone's floor space and what's in it, storage shelves and what takes them,
// how many customers the front store holds, and the lease. Purchases that
// won't fit are refused on the Marketplace and Equipment pages.

window.renderBuildingPage = function (mainContent: HTMLElement, page: PageScope): void {
    const kit = window.kit;
    const { el } = kit;
    const { fmt } = window;
    const location = window.company.active();
    const building = location.building;

    const root = kit.page(
        mainContent,
        'Building',
        `${building.type} at ${location.address}: ${fmt.int(building.sqft)} sq ft. Equipment takes floor space in its zone, ` +
            'and stock takes shelves in storage. Changing the layout is a renovation.',
    );

    // --------------------- KPIs ---------------------
    const kpis = el('div', 'kpi-row');
    const floorTile = kit.statTile('Floor space');
    const shelvesTile = kit.statTile('Storage shelves free');
    const labTile = kit.statTile('Lab floor free');
    const customersTile = kit.statTile('Customers in the store');
    const rentTile = kit.statTile('Rent');
    kpis.append(floorTile.root, shelvesTile.root, labTile.root, customersTile.root, rentTile.root);
    root.appendChild(kpis);

    const columns = el('div', 'columns');
    root.appendChild(columns);
    const left = el('div', 'stack');
    const right = el('div', 'stack');
    columns.append(left, right);

    // --------------------- Zones ---------------------
    const zonesCard = kit.card('Zones', { flush: true });
    left.appendChild(zonesCard.root);

    // --------------------- Storage ---------------------
    const storageCard = kit.card('What takes the shelves', { flush: true });
    left.appendChild(storageCard.root);

    // --------------------- Lease and fixtures ---------------------
    const leaseCard = kit.card('Lease');
    const leaseGrid = el('dl', 'definition-grid');
    leaseCard.body.appendChild(leaseGrid);
    right.appendChild(leaseCard.root);

    const fixturesCard = kit.card('Built in', { flush: true });
    const fixtures = kit.table([{ label: 'Fixture' }, { label: 'Zone' }, { label: 'Floor', num: true }]);
    building.fixtures.forEach((f) => {
        const shelves = f.shelves ? `${fmt.int(f.count * f.shelves)} shelves` : '';
        fixtures.row([
            kit.primaryCell(f.count > 1 ? `${f.name} ×${f.count}` : f.name, shelves),
            window.building.zoneLabel(f.zone),
            `${fmt.int(f.count * f.sqft)} sq ft`,
        ]);
    });
    fixturesCard.body.appendChild(fixtures.root);
    right.appendChild(fixturesCard.root);

    function zoneContents(zone: ZoneUse): string {
        if (zone.sqft <= 0)
            return zone.zone === 'cleanroom' ? 'None: sterile work needs a cleanroom build-out' : 'None';
        if (zone.zone === 'frontStore') return `Holds ${fmt.int(zone.customerCapacity ?? 0)} customers at once`;
        if (zone.zone === 'storage') {
            return `${fmt.int(zone.usedShelves ?? 0)} of ${fmt.int(zone.shelves ?? 0)} shelves used`;
        }
        const items = window.equipmentData.filter((eq) => eq.zone === zone.zone && eq.owned > 0);
        if (zone.zone === 'coldStorage') return 'The refrigerator is empty';
        if (items.length === 0) return zone.zone === 'lab' ? 'No equipment yet' : 'Counters and bins';
        return items.map((eq) => (eq.owned > 1 ? `${eq.name} ×${eq.owned}` : eq.name)).join(', ');
    }

    function renderZones(): void {
        zonesCard.body.innerHTML = '';
        const table = kit.table([
            { label: 'Zone' },
            { label: 'Size', num: true },
            { label: 'In use', width: '170px' },
            { label: 'What’s there' },
        ]);
        zonesCard.body.appendChild(table.root);
        window.building.zones().forEach((zone) => {
            // Storage fills by shelves; every other zone by floor space
            const fraction =
                zone.zone === 'storage'
                    ? (zone.usedShelves ?? 0) / Math.max(1, zone.shelves ?? 0)
                    : zone.usedSqft / Math.max(1, zone.sqft);
            const tone: Tone = fraction > 1 ? 'critical' : fraction > 0.85 ? 'warn' : 'good';
            const meter =
                zone.sqft > 0
                    ? kit.meterCell(Math.min(1, fraction), fmt.pct(fraction), tone).root
                    : el('span', 'muted', '—');
            table.row([
                zone.label,
                zone.sqft > 0 ? `${fmt.int(zone.sqft)} sq ft` : '—',
                meter,
                el('span', zone.sqft > 0 ? '' : 'muted', zoneContents(zone)),
            ]);
        });
    }

    const SHELF_ROWS = 12;
    function renderStorage(): void {
        storageCard.body.innerHTML = '';
        const table = kit.table([{ label: 'Item' }, { label: 'In stock', num: true }, { label: 'Shelves', num: true }]);
        storageCard.body.appendChild(table.root);
        const rows = [
            ...window.materialsData.map((m) => ({
                name: m.name,
                kind: 'Material',
                stock: m.inventory,
                shelves: window.building.materialShelves(m),
            })),
            ...window.productsData.map((p) => ({
                name: p.name,
                kind: 'Product',
                stock: p.inventory,
                shelves: window.building.productShelves(p),
            })),
        ]
            .filter((r) => r.shelves > 0)
            .sort((a, b) => b.shelves - a.shelves || b.stock - a.stock);
        if (rows.length === 0) table.empty('Nothing in storage.');
        rows.slice(0, SHELF_ROWS).forEach((r) =>
            table.row([kit.primaryCell(r.name, r.kind), fmt.int(r.stock), fmt.int(r.shelves)]),
        );
        if (rows.length > SHELF_ROWS) {
            const rest = rows.slice(SHELF_ROWS).reduce((sum, r) => sum + r.shelves, 0);
            table.note(`And ${rows.length - SHELF_ROWS} more items on ${fmt.int(rest)} shelves.`);
        }
        storageCard.setCount(rows.length || null);
    }

    function renderLease(): void {
        const lease = location.lease;
        leaseGrid.innerHTML = '';
        const rows: Array<[string, string]> = [
            ['Address', location.address],
            ['Area', location.area === 'urban' ? 'City' : location.area === 'rural' ? 'Small town' : 'Suburbs'],
            ['Rent', `${fmt.moneyWhole(lease.monthlyRent)} a month, due on the 1st`],
            ['Term', `${lease.termYears} year${lease.termYears === 1 ? '' : 's'}, to ${fmt.date(new Date(lease.end))}`],
            ['Renewal', 'Renews for the same term at the end, with the rent up 3% a year'],
            ['Deposit', lease.deposit > 0 ? `${fmt.moneyWhole(lease.deposit)}, returned when the lease ends` : 'None'],
            [
                'Utilities and services',
                `${fmt.money(window.company.dailyServices(location))} a day (licences, insurance, software, power, cleaning)`,
            ],
            [
                'Customers',
                `About ${fmt.pct(window.company.trafficFactor(location))} of a typical suburban store's ` +
                    `(${location.competitors === 0 ? 'no other pharmacy' : `${location.competitors} other ${location.competitors === 1 ? 'pharmacy' : 'pharmacies'}`} within a mile)`,
            ],
        ];
        rows.forEach(([label, value]) => leaseGrid.append(el('dt', '', label), el('dd', '', value)));
    }

    function refresh(): void {
        const storage = window.building.zone('storage');
        const free = (storage.shelves ?? 0) - (storage.usedShelves ?? 0);
        floorTile.set(`${fmt.int(building.sqft)} sq ft`, building.type);
        shelvesTile.set(
            fmt.int(Math.max(0, free)),
            `of ${fmt.int(storage.shelves ?? 0)}`,
            free <= 0 ? 'critical' : 'neutral',
        );
        const lab = window.building.zone('lab');
        labTile.set(`${fmt.int(Math.max(0, lab.sqft - lab.usedSqft))} sq ft`, `of ${fmt.int(lab.sqft)}`);
        customersTile.set(
            fmt.int(window.customers.activeCustomers.length),
            `Room for ${fmt.int(window.building.customerCapacity())}`,
        );
        rentTile.set(fmt.moneyWhole(location.lease.monthlyRent), 'a month');
        renderZones();
        renderStorage();
    }

    renderLease();
    refresh();
    page.on('inventory', refresh);
    page.on('equipment', refresh);
    page.on('customers', refresh);
};
