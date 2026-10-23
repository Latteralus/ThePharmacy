// /js/pages/financesPage.js - money in and out: today's figures, the bank,
// a month's P&L by category and by location with a daily chart, the
// transaction log, and the monthly and yearly reports. Everything redraws
// on 'finances' (every transaction announces it).
//
// Closed days come from the day records (records.ts); today, and days from
// before a save had records, come from the log. Past months come from their
// reports (reports.ts), which are all that's left of them once the log and
// the day records are trimmed (Phase 10, #13). Loan principal and the lease
// deposit are neither revenue nor a cost, so no P&L or chart counts them.
//
// Prices are set on the Inventory page.

type CategoryTotals = { revenue: Record<string, number>; expenses: Record<string, number> };

// Revenue and costs by category for one calendar day: its record once it has
// closed, otherwise the transaction log. Today always comes from the log.
function dayTotals(date: Date): CategoryTotals {
    const today = window.gameState.currentDate;
    const record = date.toDateString() === today.toDateString() ? undefined : window.records.forDate(date);
    if (record) return { revenue: record.revenueByCategory, expenses: record.costsByCategory };
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    return window.finances.categoryTotals(start.getTime(), end.getTime() - 1);
}

// Each location's part of one calendar day, the same way. A record from
// before Phase 10 has no split: it's all the first location's.
function dayLocations(date: Date): ReportLocationLine[] {
    const today = window.gameState.currentDate;
    const record = date.toDateString() === today.toDateString() ? undefined : window.records.forDate(date);
    if (record?.byLocation) return record.byLocation;
    if (record) {
        const first = window.company.locations[0];
        return [{ id: first.id, name: first.name, revenue: record.revenue, costs: record.costs, net: record.net }];
    }
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime() - 1;
    const sum = (rows: Record<string, number>) => Object.values(rows).reduce((a, b) => a + b, 0);
    return window.company.locations.map((loc) => {
        const totals = window.finances.categoryTotals(start, end, loc.id);
        const revenue = sum(totals.revenue);
        const costs = sum(totals.expenses);
        return { id: loc.id, name: loc.name, revenue, costs, net: revenue - costs };
    });
}

window.renderFinancesPage = function (mainContent: HTMLElement, page: PageScope): void {
    const kit = window.kit;
    const { el } = kit;
    const { fmt } = window;
    const data = window.financesData;
    const stakes = window.stakes;

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

    // --------------------- The bank (stakes.ts) ---------------------
    const loanText = el('p');
    const termText = el('p', 'muted');
    const borrowBtn = kit.button(`Borrow ${fmt.moneyWhole(stakes.LOAN_STEP)}`, 'secondary', () => {
        const amount = Math.min(stakes.LOAN_STEP, stakes.loanRoom());
        if (stakes.borrow(amount)) window.toast(`Borrowed ${fmt.moneyWhole(amount)} from the bank.`, 'success');
    });
    const repayBtn = kit.button(`Repay ${fmt.moneyWhole(stakes.LOAN_STEP)}`, 'secondary', () =>
        repay(stakes.LOAN_STEP),
    );
    const repayAllBtn = kit.button('Repay all', 'ghost', () => repay(stakes.loanBalance()));
    function repay(amount: number): void {
        const due = Math.min(amount, stakes.loanBalance());
        if (stakes.repay(due)) window.toast(`Repaid ${fmt.money(due)} to the bank.`, 'success');
        else window.toast(`Not enough cash to repay ${fmt.money(due)}.`, 'error');
    }
    const loanCard = kit.card('The bank', { actions: [borrowBtn, repayBtn, repayAllBtn] });
    loanCard.body.append(loanText, termText);
    root.appendChild(loanCard.root);

    function refreshLoan(): void {
        const owed = stakes.loanBalance();
        const rate = fmt.pct(stakes.LOAN_DAILY_INTEREST, 1);
        let text =
            owed > 0
                ? `Line of credit: owed ${fmt.money(owed)} of the ${fmt.moneyWhole(stakes.LOAN_LIMIT)} limit. Interest is ` +
                  `${fmt.money(stakes.dailyInterest())} a day (${rate}), charged at closing.`
                : `Line of credit: nothing owed. The bank lends up to ${fmt.moneyWhole(stakes.LOAN_LIMIT)} at ${rate} a day, ` +
                  'charged at closing. Repay whenever you like.';
        const red = stakes.daysInRed();
        if (red > 0) {
            text +=
                ` Cash was below $0 at ${red === 1 ? 'the last closing' : `the last ${red} closings`}; ` +
                `${stakes.BANKRUPT_AFTER} in a row is bankruptcy.`;
        }
        if (loanText.textContent !== text) loanText.textContent = text;
        loanText.className = red > 0 ? 'critical-text' : '';
        const loans = data.loans ?? [];
        termText.textContent = loans
            .map(
                (loan) =>
                    `${loan.name}: owed ${fmt.money(loan.balance)}, ${fmt.money(loan.monthlyPayment)} on the 1st ` +
                    `(${loan.termMonths - loan.paymentsMade} payments left). Pay it off on the Company page.`,
            )
            .join(' ');
        termText.style.display = loans.length > 0 ? '' : 'none';
        borrowBtn.disabled = stakes.loanRoom() <= 0;
        repayBtn.disabled = owed <= 0;
        repayAllBtn.disabled = owed <= 0;
    }

    // --------------------- Tabs ---------------------
    const monthView = el('div', 'stack');
    const todayView = el('div', 'stack');
    const transactionsView = el('div', 'stack');
    const reportsView = el('div', 'stack');
    const views = [monthView, todayView, transactionsView, reportsView];
    let activeTab = 0;
    const tabs = kit.tabs(['Month', 'Today', 'Transactions', 'Reports'], (index) => {
        activeTab = index;
        views.forEach((view, i) => (view.style.display = i === index ? '' : 'none'));
        refresh();
    });
    root.append(tabs.root, ...views);

    // A category breakdown over the calendar days from..to
    function byCategory(from: Date, to: Date): CategoryTotals {
        const revenue: Record<string, number> = {};
        const expenses: Record<string, number> = {};
        const add = (into: Record<string, number>, rows: Record<string, number>) =>
            Object.entries(rows).forEach(([category, amount]) => {
                const key = window.words.isCategory(category) ? category : 'other';
                into[key] = (into[key] ?? 0) + amount;
            });
        for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
            const totals = dayTotals(d);
            add(revenue, totals.revenue);
            add(expenses, totals.expenses);
        }
        return { revenue, expenses };
    }

    function byLocation(from: Date, to: Date): ReportLocationLine[] {
        const lines = new Map<string, ReportLocationLine>();
        for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
            dayLocations(d).forEach((line) => {
                const total = lines.get(line.id) ?? { id: line.id, name: line.name, revenue: 0, costs: 0, net: 0 };
                total.revenue += line.revenue;
                total.costs += line.costs;
                total.net += line.net;
                lines.set(line.id, total);
            });
        }
        return Array.from(lines.values());
    }

    const sum = (rows: Record<string, number>) => Object.values(rows).reduce((a, b) => a + b, 0);

    function plTable(
        title: string,
        totals: CategoryTotals,
        card: Card,
        comparison?: { revenue: number },
        locations?: ReportLocationLine[],
    ): void {
        card.body.innerHTML = '';
        const { revenue, expenses } = totals;
        const table = kit.table([{ label: title }, { label: 'Amount', num: true }]);
        card.body.appendChild(table.root);

        const totalRevenue = sum(revenue);
        const totalExpenses = sum(expenses);

        table.group('Revenue');
        window.words.REVENUE_CATEGORIES.forEach(
            (key) => revenue[key] && table.row([window.words.category(key), fmt.money(revenue[key])]),
        );
        const revenueTotal = el('span', '', fmt.money(totalRevenue));
        if (comparison && comparison.revenue > 0) {
            revenueTotal.title = `The month before ${fmt.money(comparison.revenue)}`;
            revenueTotal.appendChild(
                el('span', 'sub', `${fmt.signedPct(totalRevenue / comparison.revenue - 1)} vs the month before`),
            );
        }
        table.row(['Total revenue', revenueTotal], 'total');

        table.group('Costs');
        window.words.EXPENSE_CATEGORIES.forEach(
            (key) => expenses[key] && table.row([window.words.category(key), fmt.money(-expenses[key])]),
        );
        table.row(['Total costs', fmt.money(-totalExpenses)], 'total');

        const net = totalRevenue - totalExpenses;
        const netCell = el('span', net >= 0 ? 'good-text' : 'critical-text', fmt.money(net));
        if (totalRevenue > 0) netCell.appendChild(el('span', 'sub', `${fmt.pct(net / totalRevenue)} margin`));
        table.row(['Net profit', netCell], 'total');

        // Each location's net; the rest is the company's own (loan interest)
        if (locations && locations.length > 0) {
            table.group('Net by location');
            locations.forEach((line) => table.row([line.name, fmt.money(line.net)]));
            const company = net - locations.reduce((total, line) => total + line.net, 0);
            if (Math.abs(company) >= 0.005) table.row(['Company (loan interest)', fmt.money(company)]);
        }
    }

    // --------------------- Month ---------------------
    // This month from the records and the log; a past one from its report
    let monthChoice = 'current';
    const monthToolbar = el('div', 'toolbar');
    const monthSelect = kit.select([{ value: 'current', label: 'This month' }], 'current', (value) => {
        monthChoice = value;
        refresh();
    });
    monthSelect.setAttribute('aria-label', 'Month');
    monthToolbar.appendChild(monthSelect);
    const monthColumns = el('div', 'columns');
    const monthPl = kit.card('Profit and loss', { flush: true });
    const monthChartCard = kit.card('Revenue and costs by day');
    monthColumns.append(monthPl.root, monthChartCard.root);
    monthView.append(monthToolbar, monthColumns);
    const monthBox = window.charts.box();
    monthChartCard.body.appendChild(monthBox.box);

    function monthOptions(): void {
        const months = window.reports.list
            .filter((r) => r.kind === 'month')
            .sort((a, b) => b.period.localeCompare(a.period));
        const options = [
            { value: 'current', label: 'This month' },
            ...months.map((m) => ({ value: m.period, label: m.label })),
        ];
        const have = Array.from(monthSelect.options)
            .map((o) => o.value)
            .join();
        if (options.map((o) => o.value).join() === have) return;
        monthSelect.innerHTML = '';
        options.forEach((option) => {
            const node = el('option', '', option.label);
            node.value = option.value;
            monthSelect.appendChild(node);
        });
        monthSelect.value = monthChoice;
    }

    // --------------------- Today ---------------------
    const todayColumns = el('div', 'columns');
    const todayPl = kit.card('Today so far', { flush: true });
    const todayChartCard = kit.card('Revenue by hour');
    todayColumns.append(todayPl.root, todayChartCard.root);
    todayView.appendChild(todayColumns);
    const todayBox = window.charts.box();
    todayChartCard.body.appendChild(todayBox.box);

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
                window.words.category(t.category),
                t.description,
                amount,
            ]);
        });
        txCard.setCount(
            rows.length > TRANSACTIONS_SHOWN ? `${TRANSACTIONS_SHOWN} of ${fmt.int(rows.length)}` : rows.length,
        );
    }

    // --------------------- Reports ---------------------
    const reportsCard = kit.card('Monthly and yearly reports', { flush: true });
    reportsView.appendChild(reportsCard.root);
    function renderReports(): void {
        reportsCard.body.innerHTML = '';
        const table = kit.table([
            { label: 'Report' },
            { label: 'Revenue', num: true },
            { label: 'Net', num: true },
            { label: '', className: 'actions' },
        ]);
        reportsCard.body.appendChild(table.root);
        // Newest first, a year before its December
        const list = [...window.reports.list].sort((a, b) => b.lastDay - a.lastDay || (a.kind === 'year' ? -1 : 1));
        if (list.length === 0) table.empty('A report is written at the last closing of each month.');
        list.forEach((report) => {
            const year = report.kind === 'year';
            table.row([
                kit.primaryCell(year ? `${report.label} in review` : report.label, year ? 'Year' : 'Month'),
                fmt.money(report.revenue),
                el('span', report.net < 0 ? 'critical-text' : '', fmt.money(report.net)),
                kit.button('Open', 'ghost', () => window.showReportModal(report.kind, report.period), { small: true }),
            ]);
        });
        reportsCard.setCount(list.length || null);
    }

    // --------------------- Charts ---------------------
    // Days of this month up to today
    function monthSpec(): ChartSpec {
        const now = window.gameState.currentDate;
        const month = now.toLocaleDateString('en-US', { month: 'short' });
        const labels: string[] = [];
        const revenue: number[] = [];
        const costs: number[] = [];
        for (let day = 1; day <= now.getDate(); day++) {
            const totals = dayTotals(new Date(now.getFullYear(), now.getMonth(), day));
            labels.push(`${month} ${day}`);
            revenue.push(sum(totals.revenue));
            costs.push(sum(totals.expenses));
        }
        return {
            type: 'bar',
            format: 'money',
            labels,
            series: [
                { label: 'Revenue', values: revenue },
                { label: 'Costs', values: costs },
            ],
        };
    }

    // A past month's days that still have records
    function pastMonthSpec(report: PeriodReport): ChartSpec | null {
        const days = window.records.days.filter((d) => d.day >= report.firstDay && d.day <= report.lastDay);
        if (days.length === 0) return null;
        return {
            type: 'bar',
            format: 'money',
            labels: days.map((d) => fmt.day(new Date(d.date))),
            series: [
                { label: 'Revenue', values: days.map((d) => d.revenue) },
                { label: 'Costs', values: days.map((d) => d.costs) },
            ],
        };
    }

    // Opening hours today (07:00-22:00)
    function todaySpec(): ChartSpec {
        const now = window.gameState.currentDate;
        const hours = Array.from({ length: 15 }, (_, i) => i + 7);
        const revenue = hours.map(() => 0);
        data.transactions.forEach((t) => {
            if (t.type !== 'income' || window.finances.isFinancing(t.category)) return;
            if (t.date.toDateString() !== now.toDateString()) return;
            const i = t.date.getHours() - 7;
            if (i >= 0 && i < revenue.length) revenue[i] += t.amount;
        });
        return {
            type: 'bar',
            format: 'money',
            labels: hours.map((h) => `${String(h).padStart(2, '0')}:00`),
            series: [{ label: 'Revenue', values: revenue }],
        };
    }

    let monthChart: Chart | null = null;
    let todayChart: Chart | null = null;
    page.onLeave(() => {
        monthChart?.destroy();
        todayChart?.destroy();
    });

    function showMonth(): void {
        const now = window.gameState.currentDate;
        monthOptions();
        const report = monthChoice === 'current' ? undefined : window.reports.find('month', monthChoice);
        if (!report) {
            monthChoice = 'current';
            monthSelect.value = 'current';
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const before = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const previous = window.reports.find(
                'month',
                `${before.getFullYear()}-${String(before.getMonth() + 1).padStart(2, '0')}`,
            );
            plTable(
                'This month',
                byCategory(startOfMonth, now),
                monthPl,
                { revenue: previous?.revenue ?? data.revenue.lastMonth },
                byLocation(startOfMonth, now),
            );
            monthChartCard.root.style.display = '';
            monthChart = window.charts.draw(monthChart, monthBox.canvas, monthSpec());
            return;
        }
        plTable(
            report.label,
            { revenue: report.revenueByCategory, expenses: report.costsByCategory },
            monthPl,
            undefined,
            report.byLocation,
        );
        const spec = pastMonthSpec(report);
        monthChartCard.root.style.display = spec ? '' : 'none';
        if (spec) monthChart = window.charts.draw(monthChart, monthBox.canvas, spec);
    }

    // --------------------- Refresh ---------------------
    function refresh(): void {
        cashTile.set(fmt.money(data.cash), '', 'neutral');
        revenueTile.set(fmt.money(data.revenue.today));
        costsTile.set(fmt.money(data.expenses.today), 'Wages and utilities are charged at closing');
        netTile.set(fmt.money(data.profit.today), '', data.profit.today < 0 ? 'critical' : 'neutral');
        netTile.root.querySelector('.stat-value')!.className =
            `stat-value${data.profit.today < 0 ? ' critical-text' : ''}`;
        owedTile.set(
            fmt.money(data.pendingInsuranceIncome),
            `Paid at closing on day ${window.insuranceClaims.nextPayday()}`,
        );
        refreshLoan();

        const now = window.gameState.currentDate;
        if (activeTab === 0) {
            showMonth();
        } else if (activeTab === 1) {
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            plTable('Today', byCategory(startOfDay, now), todayPl);
            todayChart = window.charts.draw(todayChart, todayBox.canvas, todaySpec());
        } else if (activeTab === 2) {
            renderTransactions();
        } else {
            renderReports();
        }
    }

    page.on('finances', refresh);
    tabs.select(0);
};
