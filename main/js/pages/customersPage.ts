// /js/pages/customersPage.js - the visit log: everyone who has come in,
// newest first, with what they wanted, how it ended, how long they waited
// and what the sale was worth (Phase 8). The log is records.visits (the
// last 500); who is in the store now is on Operations.

const VISITS_SHOWN = 100;

window.renderCustomersPage = function (mainContent: HTMLElement, page: PageScope): void {
    const kit = window.kit;
    const { el } = kit;
    const { fmt, words } = window;

    const root = kit.page(
        mainContent,
        'Customers',
        "Everyone who has visited, newest first (the last 500). Who's in the store now is on Operations.",
    );

    // --------------------- KPIs (over the log) ---------------------
    const kpis = el('div', 'kpi-row');
    const servedTile = kit.statTile('Served');
    const waitTile = kit.statTile('Average wait, served');
    const saleTile = kit.statTile('Average sale');
    const returningTile = kit.statTile('Returning customers');
    kpis.append(servedTile.root, waitTile.root, saleTile.root, returningTile.root);
    root.appendChild(kpis);

    // --------------------- Filters ---------------------
    let outcome: 'all' | 'served' | 'lost' = 'all';
    const outcomeSeg = kit.segmented<'all' | 'served' | 'lost'>(
        [
            { value: 'all', label: 'All' },
            { value: 'served', label: 'Served' },
            { value: 'lost', label: 'Lost' },
        ],
        outcome,
        (value) => {
            outcome = value;
            outcomeSeg.set(value);
            renderTable();
        },
    );
    const search = el('input', 'input search');
    search.type = 'search';
    search.placeholder = 'Search name, product or insurer…';
    search.setAttribute('aria-label', 'Search visits');
    search.addEventListener('input', () => renderTable());
    const toolbar = el('div', 'toolbar');
    toolbar.append(outcomeSeg.root, search);

    const card = kit.card('Visits', { flush: true, actions: [toolbar] });
    root.appendChild(card.root);
    const table = kit.table([
        { label: 'Left', width: '110px' },
        { label: 'Customer' },
        { label: 'Prescription' },
        { label: 'Outcome' },
        { label: 'Waited', num: true, title: 'Game time from walking in to leaving' },
        { label: 'Sale', num: true, title: 'Copay plus the insurer’s share' },
        { label: 'Mood', title: 'Out of 10, as they left' },
    ]);
    card.body.appendChild(table.root);

    const waited = (visit: CustomerVisit): number => (visit.leftAt - visit.arrivedAt) / 60000;

    function refreshTiles(): void {
        const visits = window.records.visits;
        const served = visits.filter((v) => v.reason === 'served');
        const counted = visits.filter((v) => v.reason !== 'reset');
        const average = (values: number[]): number => values.reduce((a, b) => a + b, 0) / (values.length || 1);

        servedTile.set(
            counted.length > 0 ? fmt.pct(served.length / counted.length) : '—',
            `${fmt.int(served.length)} of ${fmt.int(counted.length)} visits`,
        );
        waitTile.set(served.length > 0 ? fmt.duration(average(served.map(waited))) : '—', 'Walking in to paying');
        saleTile.set(served.length > 0 ? fmt.money(average(served.map((v) => v.price))) : '—', 'Per served customer');
        returningTile.set(
            counted.length > 0 ? fmt.pct(counted.filter((v) => v.returning).length / counted.length) : '—',
            'Back for a refill',
        );
    }

    function renderTable(): void {
        table.clear();
        const text = search.value.toLowerCase().trim();
        const rows = window.records.visits
            .filter((v) => outcome === 'all' || (outcome === 'served') === (v.reason === 'served'))
            .filter(
                (v) =>
                    !text ||
                    v.name.toLowerCase().includes(text) ||
                    (v.product ?? '').toLowerCase().includes(text) ||
                    v.insurer.toLowerCase().includes(text),
            );

        card.setCount(rows.length > VISITS_SHOWN ? `${VISITS_SHOWN} of ${fmt.int(rows.length)}` : rows.length || null);
        if (rows.length === 0) {
            table.empty(
                window.records.visits.length === 0 ? 'Visits appear here as customers leave.' : 'No visits match.',
            );
            return;
        }

        rows.slice(0, VISITS_SHOWN).forEach((visit) => {
            const departure = words.departure(visit.reason);
            const mood = words.mood(visit.mood);
            table.row([
                kit.primaryCell(fmt.clock(new Date(visit.leftAt)), `Day ${visit.day + 1}`),
                kit.primaryCell(visit.name, visit.returning ? `${visit.insurer} · returning` : visit.insurer),
                visit.product ? `${visit.product} ×${visit.dosage}` : '—',
                kit.pill(departure.label, departure.tone),
                fmt.duration(waited(visit)),
                visit.reason === 'served' ? fmt.money(visit.price) : '—',
                `${Math.round(visit.mood)}/10 ${mood.label}`,
            ]);
        });
    }

    function refresh(): void {
        refreshTiles();
        renderTable();
    }

    // Every departure announces 'customers'
    page.on('customers', refresh);
    refresh();
};
