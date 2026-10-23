// /js/pages/dashboardPage.js - how the pharmacy is doing: today against
// yesterday, the bank and how long the cash lasts, the goals, and net
// profit over the last two weeks (Phase 8). Yesterday and the trend come
// from the day records (records.ts), as does Recent days, which reopens each
// closing's summary (Phase 9: summaries can be skipped at closing).

const TREND_DAYS = 14;
const RECENT_DAYS = 7;

window.renderDashboardPage = function (mainContent: HTMLElement, page: PageScope): void {
    const kit = window.kit;
    const { el } = kit;
    const { fmt } = window;
    const stakes = window.stakes;

    const root = kit.page(
        mainContent,
        'Dashboard',
        'Today against yesterday, the bank, and your goals. Wages, overhead and interest are charged at closing.',
    );

    // No pharmacist, or no one to fill and compound (#3)
    const staffingWarning = el('div', 'callout warn');
    staffingWarning.setAttribute('role', 'status');
    root.appendChild(staffingWarning);

    // --------------------- Today vs yesterday ---------------------
    const kpis = el('div', 'kpi-row');
    const revenueTile = kit.statTile('Revenue today');
    const servedTile = kit.statTile('Customers served today');
    const lostTile = kit.statTile('Customers lost today');
    const reputationTile = kit.statTile('Reputation');
    const cashTile = kit.statTile('Cash');
    kpis.append(revenueTile.root, servedTile.root, lostTile.root, reputationTile.root, cashTile.root);
    root.appendChild(kpis);

    const columns = el('div', 'columns');
    root.appendChild(columns);

    // --------------------- The bank ---------------------
    const bankCard = kit.card('Money', {
        actions: [kit.button('Finances', 'ghost', () => window.showPage('finances'), { small: true })],
    });
    const bankWarning = el('div', 'callout critical');
    bankWarning.setAttribute('role', 'alert');
    const bankGrid = el('dl', 'definition-grid');
    bankCard.body.append(bankWarning, bankGrid);

    // --------------------- Trend ---------------------
    const trendCard = kit.card(`Net profit, last ${TREND_DAYS} days`);
    const trendBox = window.charts.box(220);
    const trendEmpty = el('p', 'muted', "The first day's figures appear here after closing.");
    trendCard.body.append(trendBox.box, trendEmpty);
    let trendChart: Chart | null = null;
    page.onLeave(() => trendChart?.destroy());

    const left = el('div', 'stack');
    left.append(bankCard.root, trendCard.root);

    // --------------------- Goals ---------------------
    const goalsCard = kit.card('Goals', { flush: true });
    const goalsTable = kit.table([
        { label: 'Goal' },
        { label: 'Progress', width: '220px' },
        { label: 'Reached', width: '90px' },
    ]);
    goalsCard.body.appendChild(goalsTable.root);

    // --------------------- Recent days ---------------------
    // Each closed day's summary, including those skipped at closing (#49)
    const daysCard = kit.card('Recent days', { flush: true });
    const daysTable = kit.table([
        { label: 'Day' },
        { label: 'Net', num: true },
        { label: 'Served', num: true },
        { label: 'Lost', num: true },
        { label: '', className: 'actions' },
    ]);
    daysCard.body.appendChild(daysTable.root);

    const right = el('div', 'stack');
    right.append(goalsCard.root, daysCard.root);
    columns.append(left, right);

    function goalValue(goal: GoalProgress, value: number): string {
        if (goal.unit === 'money') return fmt.moneyWhole(value);
        if (goal.unit === 'reputation') return String(Math.round(value));
        return fmt.int(value);
    }

    function refresh(): void {
        const data = window.financesData;
        const yesterday = window.records.yesterday();
        const today = window.gameState.customersToday ?? {};
        const versus = (text: (y: DayRecord) => string): string =>
            yesterday ? `Yesterday ${text(yesterday)}` : 'No closed day yet';

        revenueTile.set(
            fmt.money(data.revenue.today),
            versus((y) => fmt.money(y.revenue)),
        );
        servedTile.set(
            fmt.int(today.served ?? 0),
            versus((y) => fmt.int(y.customers.served ?? 0)),
        );
        lostTile.set(
            fmt.int(window.records.lost(today)),
            versus((y) => fmt.int(window.records.lost(y.customers))),
        );

        const reputation = window.brandReputation.reputationScore;
        if (yesterday) {
            const change = reputation - yesterday.reputation;
            const tone: Tone = change > 0.05 ? 'good' : change < -0.05 ? 'critical' : 'neutral';
            reputationTile.set(
                `${Math.round(reputation)} / 100`,
                `${change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(1)} since yesterday`,
                tone,
            );
        } else {
            reputationTile.set(`${Math.round(reputation)} / 100`, 'Out of 100');
        }

        // How many days of fixed costs the cash covers
        const fixed = stakes.fixedDailyCosts();
        const runway = fixed > 0 ? data.cash / fixed : Infinity;
        const owed = stakes.loanBalance();
        cashTile.set(
            fmt.money(data.cash),
            owed > 0 ? `Owed to the bank ${fmt.moneyWhole(owed)}` : '',
            data.cash < 0 ? 'critical' : 'neutral',
        );

        // The bank
        const red = stakes.daysInRed();
        bankWarning.style.display = red > 0 ? '' : 'none';
        bankWarning.textContent =
            red > 0
                ? `Cash was below $0 at ${red === 1 ? 'the last closing' : `the last ${red} closings`}. ` +
                  `${stakes.BANKRUPT_AFTER} in a row is bankruptcy: get it above $0 by closing on day ` +
                  `${stakes.bankruptcyDay()}.`
                : '';
        bankGrid.innerHTML = '';
        const rows: Array<[string, string, string?]> = [
            ['Cash', fmt.money(data.cash), data.cash < 0 ? 'critical-text' : ''],
            [
                'Insurance owed to you',
                `${fmt.money(data.pendingInsuranceIncome)} (paid on day ${window.insuranceClaims.nextPayday()})`,
            ],
            ['Owed to the bank', owed > 0 ? `${fmt.money(owed)} of ${fmt.moneyWhole(stakes.LOAN_LIMIT)}` : 'Nothing'],
            ['Fixed costs a day', `${fmt.money(fixed)} (wages, overhead${owed > 0 ? ', interest' : ''})`],
            [
                'Cash covers',
                data.cash <= 0 ? 'No days' : runway >= 100 ? '100+ days' : `${Math.floor(runway)} days of fixed costs`,
                runway < 3 ? 'critical-text' : '',
            ],
            ['Closings in the red', `${red} of ${stakes.BANKRUPT_AFTER}`, red > 0 ? 'critical-text' : ''],
        ];
        rows.forEach(([label, value, tone]) => bankGrid.append(el('dt', '', label), el('dd', tone ?? '', value)));

        // Goals
        goalsTable.clear();
        const goals = window.goals.list();
        goalsCard.setCount(`${goals.filter((g) => g.reachedOn !== null).length} of ${goals.length}`);
        goals.forEach((goal) => {
            const done = goal.reachedOn !== null;
            const shown = Math.max(0, Math.min(goal.value, goal.target));
            const progress = kit.meterCell(
                goal.target > 0 ? shown / goal.target : 0,
                done ? 'Done' : `${goalValue(goal, shown)} / ${goalValue(goal, goal.target)}`,
                done ? 'good' : undefined,
            );
            goalsTable.row([
                goal.label,
                progress.root,
                done ? kit.pill(`Day ${goal.reachedOn! + 1}`, 'good') : el('span', 'muted', '—'),
            ]);
        });
        if (window.gameState.wonOnDay !== undefined) {
            goalsTable.note(`Every goal reached on day ${window.gameState.wonOnDay + 1}. You won.`);
        } else {
            goalsTable.note('Goals are checked at closing.');
        }

        const warnings = window.employees.staffingWarnings();
        staffingWarning.style.display = warnings.length > 0 ? '' : 'none';
        staffingWarning.textContent = warnings.join(' ');

        // The last week's closings, newest first, each with its summary
        daysTable.clear();
        const recent = window.records.days.slice(-RECENT_DAYS).reverse();
        daysCard.setCount(recent.length || null);
        if (recent.length === 0) daysTable.empty('Each day appears here after closing.');
        recent.forEach((record) => {
            const notes = window.records.notes(record);
            daysTable.row([
                kit.primaryCell(`Day ${record.day + 1}`, notes.join(' · ') || fmt.day(new Date(record.date))),
                el('span', record.net < 0 ? 'critical-text' : '', fmt.money(record.net)),
                fmt.int(record.customers.served ?? 0),
                fmt.int(window.records.lost(record.customers)),
                kit.button('Summary', 'ghost', () => window.showDayRecordModal(record.day), { small: true }),
            ]);
        });

        // Net profit trend: the last TREND_DAYS closed days
        const days = window.records.days.slice(-TREND_DAYS);
        trendBox.box.style.display = days.length > 0 ? '' : 'none';
        trendEmpty.style.display = days.length > 0 ? 'none' : '';
        if (days.length > 0) {
            trendChart = window.charts.draw(trendChart, trendBox.canvas, {
                type: 'bar',
                format: 'money',
                labels: days.map((d) => `Day ${d.day + 1}`),
                series: [{ label: 'Net profit', values: days.map((d) => d.net) }],
            });
        }
    }

    page.on('finances', refresh);
    page.on('customers', refresh);
    page.on('employees', refresh);
    page.on('research', refresh);
    refresh();
};
