// /js/pages/financesPage.js - money in and out: today's figures, the bank
// loan, this month's P&L by category with a daily chart, and the
// transaction log. Everything redraws on 'finances' (every transaction
// announces it).
//
// Closed days come from the day records (records.ts), so the month isn't cut
// short by the transaction log's 1000-entry cap; today, and days from before
// a save had records, come from the log. The loan's principal is neither
// revenue nor a cost, so no P&L or chart counts it.
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
    interest: 'Loan interest',
    loan: 'Bank loan',
    other: 'Other',
};
const REVENUE_ORDER = ['copays', 'insurance', 'other'];
const EXPENSE_ORDER = ['wages', 'overhead', 'materials', 'equipment', 'research', 'hiring', 'interest', 'other'];

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

    // --------------------- Bank loan (stakes.ts) ---------------------
    const loanText = el('p');
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
    const loanCard = kit.card('Bank loan', { actions: [borrowBtn, repayBtn, repayAllBtn] });
    loanCard.body.appendChild(loanText);
    root.appendChild(loanCard.root);

    function refreshLoan(): void {
        const owed = stakes.loanBalance();
        const rate = fmt.pct(stakes.LOAN_DAILY_INTEREST, 1);
        let text =
            owed > 0
                ? `Owed ${fmt.money(owed)} of the ${fmt.moneyWhole(stakes.LOAN_LIMIT)} limit. Interest is ` +
                  `${fmt.money(stakes.dailyInterest())} a day (${rate}), charged at closing.`
                : `Nothing owed. The bank lends up to ${fmt.moneyWhole(stakes.LOAN_LIMIT)} at ${rate} a day, ` +
                  'charged at closing. Repay whenever you like.';
        const red = stakes.daysInRed();
        if (red > 0) {
            text +=
                ` Cash was below $0 at ${red === 1 ? 'the last closing' : `the last ${red} closings`}; ` +
                `${stakes.BANKRUPT_AFTER} in a row is bankruptcy.`;
        }
        if (loanText.textContent !== text) loanText.textContent = text;
        loanText.className = red > 0 ? 'critical-text' : 'muted';
        borrowBtn.disabled = stakes.loanRoom() <= 0;
        repayBtn.disabled = owed <= 0;
        repayAllBtn.disabled = owed <= 0;
    }

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

    // A category breakdown over the calendar days from..to
    function byCategory(from: Date, to: Date): CategoryTotals {
        const revenue: Record<string, number> = {};
        const expenses: Record<string, number> = {};
        const add = (into: Record<string, number>, rows: Record<string, number>) =>
            Object.entries(rows).forEach(([category, amount]) => {
                const key = CATEGORY_LABELS[category] ? category : 'other';
                into[key] = (into[key] ?? 0) + amount;
            });
        for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
            const totals = dayTotals(d);
            add(revenue, totals.revenue);
            add(expenses, totals.expenses);
        }
        return { revenue, expenses };
    }

    const sum = (rows: Record<string, number>) => Object.values(rows).reduce((a, b) => a + b, 0);

    function plTable(title: string, from: Date, to: Date, card: Card, comparison?: { revenue: number }): void {
        card.body.innerHTML = '';
        const { revenue, expenses } = byCategory(from, to);
        const table = kit.table([{ label: title }, { label: 'Amount', num: true }]);
        card.body.appendChild(table.root);

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
    const monthBox = window.charts.box();
    monthChartCard.body.appendChild(monthBox.box);

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

    // --------------------- Refresh ---------------------
    function refresh(): void {
        cashTile.set(fmt.money(data.cash), '', 'neutral');
        revenueTile.set(fmt.money(data.revenue.today));
        costsTile.set(fmt.money(data.expenses.today), 'Wages and overhead are charged at closing');
        netTile.set(fmt.money(data.profit.today), '', data.profit.today < 0 ? 'critical' : 'neutral');
        netTile.root.querySelector('.stat-value')!.className =
            `stat-value${data.profit.today < 0 ? ' critical-text' : ''}`;
        owedTile.set(fmt.money(data.pendingInsuranceIncome), 'Paid as claims clear');
        refreshLoan();

        const now = window.gameState.currentDate;
        if (activeTab === 0) {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            plTable('This month', startOfMonth, now, monthPl, { revenue: data.revenue.lastMonth });
            monthChart = window.charts.draw(monthChart, monthBox.canvas, monthSpec());
        } else if (activeTab === 1) {
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            plTable('Today', startOfDay, now, todayPl);
            todayChart = window.charts.draw(todayChart, todayBox.canvas, todaySpec());
        } else {
            renderTransactions();
        }
    }

    page.on('finances', refresh);
    tabs.select(0);
};
