// /js/pages/financesPage.js - money in and out: today's figures, this
// month's P&L by category with a daily chart, and the transaction log.
// Everything redraws on 'finances' (every transaction announces it).
//
// Prices are set on the Inventory page.

const CATEGORY_LABELS: Record<string, string> = {
    copays: 'Copays',
    insurance: 'Insurance payments',
    wages: 'Wages',
    overhead: 'Overhead',
    materials: 'Materials',
    equipment: 'Equipment',
    research: 'Research',
    hiring: 'Hiring',
    other: 'Other',
};
const REVENUE_ORDER = ['copays', 'insurance', 'other'];
const EXPENSE_ORDER = ['wages', 'overhead', 'materials', 'equipment', 'research', 'hiring', 'other'];

window.renderFinancesPage = function (mainContent: HTMLElement, page: PageScope): void {
    const kit = window.kit;
    const { el } = kit;
    const { fmt } = window;
    const data = window.financesData;

    const root = kit.page(
        mainContent,
        'Finances',
        'Cash, profit and where the money goes. Prices are set on the Inventory page.',
    );

    // --------------------- KPIs ---------------------
    const kpis = el('div', 'kpi-row');
    const cashTile = kit.statTile('Cash on hand');
    const revenueTile = kit.statTile('Revenue today');
    const costsTile = kit.statTile('Costs today');
    const netTile = kit.statTile('Net today');
    const owedTile = kit.statTile('Insurance owed');
    kpis.append(cashTile.root, revenueTile.root, costsTile.root, netTile.root, owedTile.root);
    root.appendChild(kpis);

    // --------------------- Tabs ---------------------
    const monthView = el('div', 'columns');
    const todayView = el('div', 'stack');
    const transactionsView = el('div', 'stack');
    const views = [monthView, todayView, transactionsView];
    let activeTab = 0;
    const tabs = kit.tabs(['This month', 'Today', 'Transactions'], (index) => {
        activeTab = index;
        views.forEach((view, i) => (view.style.display = i === index ? '' : 'none'));
        refresh();
    });
    root.append(tabs.root, ...views);

    // Rows of a category breakdown, computed from the transaction log
    function byCategory(from: Date, to: Date): { revenue: Record<string, number>; expenses: Record<string, number> } {
        const revenue: Record<string, number> = {};
        const expenses: Record<string, number> = {};
        data.transactions.forEach((t) => {
            if (t.date < from || t.date > to) return;
            const bucket = t.type === 'income' ? revenue : expenses;
            const key = CATEGORY_LABELS[t.category] ? t.category : 'other';
            bucket[key] = (bucket[key] ?? 0) + t.amount;
        });
        return { revenue, expenses };
    }

    function plTable(title: string, from: Date, to: Date, card: Card, comparison?: { revenue: number }): void {
        card.body.innerHTML = '';
        const { revenue, expenses } = byCategory(from, to);
        const table = kit.table([{ label: title }, { label: 'Amount', num: true }]);
        card.body.appendChild(table.root);

        const sum = (rows: Record<string, number>) => Object.values(rows).reduce((a, b) => a + b, 0);
        const totalRevenue = sum(revenue);
        const totalExpenses = sum(expenses);

        table.group('Revenue');
        REVENUE_ORDER.forEach((key) => revenue[key] && table.row([CATEGORY_LABELS[key], fmt.money(revenue[key])]));
        const revenueTotal = el('span', '', fmt.money(totalRevenue));
        if (comparison && comparison.revenue > 0) {
            revenueTotal.title = `Last month ${fmt.money(comparison.revenue)}`;
            revenueTotal.appendChild(
                el('span', 'sub', `${fmt.signedPct(totalRevenue / comparison.revenue - 1)} vs last month`),
            );
        }
        table.row(['Total revenue', revenueTotal], 'total');

        table.group('Costs');
        EXPENSE_ORDER.forEach((key) => expenses[key] && table.row([CATEGORY_LABELS[key], fmt.money(-expenses[key])]));
        table.row(['Total costs', fmt.money(-totalExpenses)], 'total');

        const net = totalRevenue - totalExpenses;
        const netCell = el('span', net >= 0 ? 'good-text' : 'critical-text', fmt.money(net));
        if (totalRevenue > 0) netCell.appendChild(el('span', 'sub', `${fmt.pct(net / totalRevenue)} margin`));
        table.row(['Net profit', netCell], 'total');
    }

    // --------------------- This month ---------------------
    const monthPl = kit.card('Profit and loss', { flush: true });
    const monthChartCard = kit.card('Revenue and costs by day');
    monthView.append(monthPl.root, monthChartCard.root);
    const monthCanvas = el('canvas');
    const monthBox = el('div', 'chart-box');
    monthBox.appendChild(monthCanvas);
    monthChartCard.body.appendChild(monthBox);

    // --------------------- Today ---------------------
    const todayColumns = el('div', 'columns');
    const todayPl = kit.card('Today so far', { flush: true });
    const todayChartCard = kit.card('Revenue by hour');
    todayColumns.append(todayPl.root, todayChartCard.root);
    todayView.appendChild(todayColumns);
    const todayCanvas = el('canvas');
    const todayBox = el('div', 'chart-box');
    todayBox.appendChild(todayCanvas);
    todayChartCard.body.appendChild(todayBox);

    // --------------------- Transactions ---------------------
    let typeFilter = '';
    const typeSeg = kit.segmented(
        [
            { value: '', label: 'All' },
            { value: 'income', label: 'Income' },
            { value: 'expense', label: 'Costs' },
        ],
        '',
        (value) => {
            typeFilter = value;
            typeSeg.set(value);
            renderTransactions();
        },
    );
    const search = el('input', 'input search');
    search.type = 'search';
    search.placeholder = 'Search transactions…';
    search.setAttribute('aria-label', 'Search transactions');
    search.addEventListener('input', () => renderTransactions());
    const txToolbar = el('div', 'toolbar');
    txToolbar.append(typeSeg.root, search);
    const txCard = kit.card('Transactions', { flush: true, actions: [txToolbar] });
    transactionsView.appendChild(txCard.root);

    const TRANSACTIONS_SHOWN = 100;
    function renderTransactions(): void {
        txCard.body.innerHTML = '';
        const table = kit.table([
            { label: 'When', width: '140px' },
            { label: 'Category', width: '150px' },
            { label: 'Description' },
            { label: 'Amount', num: true },
        ]);
        txCard.body.appendChild(table.root);

        const text = search.value.toLowerCase().trim();
        const rows = data.transactions
            .filter((t) => !typeFilter || t.type === typeFilter)
            .filter(
                (t) => !text || t.description.toLowerCase().includes(text) || t.category.toLowerCase().includes(text),
            )
            .sort((a, b) => b.date.getTime() - a.date.getTime());

        if (rows.length === 0) table.empty('No transactions found.');
        rows.slice(0, TRANSACTIONS_SHOWN).forEach((t) => {
            const income = t.type === 'income';
            const amount = el('span', income ? 'good-text' : '', `${income ? '+' : '−'}${fmt.money(t.amount)}`);
            table.row([
                `${fmt.day(t.date)} ${fmt.clock(t.date)}`,
                CATEGORY_LABELS[t.category] ?? t.category,
                t.description,
                amount,
            ]);
        });
        txCard.setCount(
            rows.length > TRANSACTIONS_SHOWN ? `${TRANSACTIONS_SHOWN} of ${fmt.int(rows.length)}` : rows.length,
        );
    }

    // --------------------- Charts ---------------------
    const css = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: string): string => css.getPropertyValue(name).trim() || fallback;
    const SERIES_1 = token('--series-1', '#2a78d6');
    const SERIES_2 = token('--series-2', '#eb6834');
    const GRID = token('--line', '#e3e5ec');
    const INK_MUTED = token('--ink-muted', '#7a8294');

    function barOptions(showLegend: boolean): Record<string, unknown> {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: showLegend,
                    position: 'top',
                    align: 'start',
                    labels: { boxWidth: 10, boxHeight: 10, color: INK_MUTED },
                },
                tooltip: {
                    callbacks: {
                        label: (ctx: { dataset: { label: string }; raw: number }) =>
                            `${ctx.dataset.label}: ${fmt.money(ctx.raw)}`,
                    },
                },
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: INK_MUTED } },
                y: {
                    beginAtZero: true,
                    grid: { color: GRID },
                    border: { display: false },
                    ticks: {
                        color: INK_MUTED,
                        callback: (value: number) => (value >= 1000 ? `$${value / 1000}K` : `$${value}`),
                    },
                },
            },
        };
    }

    function dataset(label: string, values: number[], color: string): ChartDataset {
        return {
            label,
            data: values,
            backgroundColor: color,
            borderColor: color,
            borderWidth: 0,
            borderRadius: { topLeft: 4, topRight: 4 },
            borderSkipped: 'bottom',
            maxBarThickness: 24,
        };
    }

    // Days of this month up to today
    function monthSeries(): ChartData {
        const now = window.gameState.currentDate;
        const days = now.getDate();
        const revenue = new Array(days).fill(0);
        const costs = new Array(days).fill(0);
        data.transactions.forEach((t) => {
            if (t.date.getFullYear() !== now.getFullYear() || t.date.getMonth() !== now.getMonth()) return;
            const i = t.date.getDate() - 1;
            if (i >= days) return;
            if (t.type === 'income') revenue[i] += t.amount;
            else costs[i] += t.amount;
        });
        const month = now.toLocaleDateString('en-US', { month: 'short' });
        return {
            labels: revenue.map((_, i) => `${month} ${i + 1}`),
            datasets: [dataset('Revenue', revenue, SERIES_1), dataset('Costs', costs, SERIES_2)],
        };
    }

    // Opening hours today (07:00-22:00)
    function todaySeries(): ChartData {
        const now = window.gameState.currentDate;
        const hours = Array.from({ length: 15 }, (_, i) => i + 7);
        const revenue = hours.map(() => 0);
        data.transactions.forEach((t) => {
            if (t.type !== 'income' || t.date.toDateString() !== now.toDateString()) return;
            const i = t.date.getHours() - 7;
            if (i >= 0 && i < revenue.length) revenue[i] += t.amount;
        });
        return {
            labels: hours.map((h) => `${String(h).padStart(2, '0')}:00`),
            datasets: [dataset('Revenue', revenue, SERIES_1)],
        };
    }

    let monthChart: Chart | null = null;
    let todayChart: Chart | null = null;
    function drawChart(
        existing: Chart | null,
        canvas: HTMLCanvasElement,
        series: ChartData,
        legend: boolean,
    ): Chart | null {
        if (typeof Chart === 'undefined') return null;
        if (existing) {
            existing.data.labels = series.labels;
            series.datasets.forEach((ds, i) => (existing.data.datasets[i].data = ds.data));
            existing.update('none');
            return existing;
        }
        const ctx = canvas.getContext('2d');
        return ctx ? new Chart(ctx, { type: 'bar', data: series, options: barOptions(legend) }) : null;
    }
    page.onLeave(() => {
        monthChart?.destroy();
        todayChart?.destroy();
    });

    // --------------------- Refresh ---------------------
    function refresh(): void {
        cashTile.set(fmt.money(data.cash), '', 'neutral');
        revenueTile.set(fmt.money(data.revenue.today));
        costsTile.set(fmt.money(data.expenses.today), 'Wages and overhead are charged at closing');
        netTile.set(fmt.money(data.profit.today), '', data.profit.today < 0 ? 'critical' : 'neutral');
        netTile.root.querySelector('.stat-value')!.className =
            `stat-value${data.profit.today < 0 ? ' critical-text' : ''}`;
        owedTile.set(fmt.money(data.pendingInsuranceIncome), 'Paid as claims clear');

        const now = window.gameState.currentDate;
        if (activeTab === 0) {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            plTable('This month', startOfMonth, now, monthPl, { revenue: data.revenue.lastMonth });
            monthChart = drawChart(monthChart, monthCanvas, monthSeries(), true);
        } else if (activeTab === 1) {
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            plTable('Today', startOfDay, now, todayPl);
            todayChart = drawChart(todayChart, todayCanvas, todaySeries(), false);
        } else {
            renderTransactions();
        }
    }

    page.on('finances', refresh);
    tabs.select(0);
};
