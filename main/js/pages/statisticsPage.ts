// /js/pages/statisticsPage.js - the pharmacy day by day, from the day
// records (records.ts): revenue and costs, customers served and lost,
// reputation and cash, as charts and as a table (Phase 8). One measure per
// chart, so no chart needs a second axis.

window.renderStatisticsPage = function (mainContent: HTMLElement, page: PageScope): void {
    const kit = window.kit;
    const { el } = kit;
    const { fmt } = window;

    const root = kit.page(
        mainContent,
        'Statistics',
        'Every closed day: money, customers, reputation and cash. Today is added at closing.',
    );

    // --------------------- Range ---------------------
    let range = 14;
    const rangeSeg = kit.segmented(
        [
            { value: 14, label: '14 days' },
            { value: 30, label: '30 days' },
            { value: 0, label: 'All' },
        ],
        range,
        (value) => {
            range = value;
            rangeSeg.set(value);
            refresh();
        },
    );
    const toolbar = el('div', 'toolbar');
    toolbar.append(el('span', 'muted', 'Show'), rangeSeg.root);
    root.appendChild(toolbar);

    const empty = el('p', 'muted', 'Statistics start at the first closing. Come back after the end of the day.');
    root.appendChild(empty);

    // --------------------- Charts ---------------------
    const grid = el('div', 'columns');
    root.appendChild(grid);
    const charts: Array<{ chart: Chart | null; canvas: HTMLCanvasElement; spec: (d: DayRecord[]) => ChartSpec }> = [];
    function addChart(title: string, spec: (days: DayRecord[]) => ChartSpec): void {
        const card = kit.card(title);
        const box = window.charts.box(220);
        card.body.appendChild(box.box);
        grid.appendChild(card.root);
        charts.push({ chart: null, canvas: box.canvas, spec });
    }
    const labels = (days: DayRecord[]) => days.map((d) => `Day ${d.day + 1}`);

    addChart('Revenue and costs', (days) => ({
        type: 'bar',
        format: 'money',
        labels: labels(days),
        series: [
            { label: 'Revenue', values: days.map((d) => d.revenue) },
            { label: 'Costs', values: days.map((d) => d.costs) },
        ],
    }));
    addChart('Customers', (days) => ({
        type: 'bar',
        stacked: true,
        labels: labels(days),
        series: [
            { label: 'Served', values: days.map((d) => d.customers.served ?? 0) },
            { label: 'Lost', values: days.map((d) => window.records.lost(d.customers)) },
        ],
    }));
    addChart('Reputation at closing', (days) => ({
        type: 'line',
        labels: labels(days),
        suggestedMax: 100,
        series: [{ label: 'Reputation', values: days.map((d) => Math.round(d.reputation * 10) / 10) }],
    }));
    addChart('Cash at closing', (days) => ({
        type: 'line',
        format: 'money',
        labels: labels(days),
        series: [{ label: 'Cash', values: days.map((d) => d.cash) }],
    }));
    page.onLeave(() => charts.forEach((c) => c.chart?.destroy()));

    // --------------------- Table of days ---------------------
    const tableCard = kit.card('Days', { flush: true });
    root.appendChild(tableCard.root);
    const table = kit.table([
        { label: 'Day' },
        { label: 'Revenue', num: true },
        { label: 'Costs', num: true },
        { label: 'Net', num: true },
        { label: 'Served', num: true },
        { label: 'Lost', num: true },
        { label: 'Reputation', num: true },
        { label: 'Cash', num: true },
        { label: 'Staff', num: true },
    ]);
    tableCard.body.appendChild(table.root);

    function refresh(): void {
        const all = window.records.days;
        const days = range > 0 ? all.slice(-range) : all;
        const hasData = days.length > 0;
        empty.style.display = hasData ? 'none' : '';
        grid.style.display = hasData ? '' : 'none';
        tableCard.root.style.display = hasData ? '' : 'none';
        if (!hasData) return;

        charts.forEach((c) => {
            c.chart = window.charts.draw(c.chart, c.canvas, c.spec(days));
        });

        table.clear();
        tableCard.setCount(days.length);
        [...days].reverse().forEach((d) => {
            table.row([
                kit.primaryCell(`Day ${d.day + 1}`, fmt.day(new Date(d.date))),
                fmt.money(d.revenue),
                fmt.money(-d.costs),
                el('span', d.net < 0 ? 'critical-text' : '', fmt.money(d.net)),
                fmt.int(d.customers.served ?? 0),
                fmt.int(window.records.lost(d.customers)),
                String(Math.round(d.reputation)),
                el('span', d.cash < 0 ? 'critical-text' : '', fmt.money(d.cash)),
                fmt.int(d.staff),
            ]);
        });
    }

    // Records are added at closing, with the day's costs (announced as 'finances')
    page.on('finances', refresh);
    refresh();
};
