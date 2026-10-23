// /js/pages/dashboardPage.js - how the pharmacy is doing: today against
// yesterday, the bank and how long the cash lasts, the goals, and net
// profit over the last two weeks (Phase 8). Yesterday and the trend come
// from the day records (records.ts), as does Recent days, which reopens each
// closing's summary (Phase 9: summaries can be skipped at closing), and
// Reports the monthly and yearly reports (Phase 10). Goals show the next
// few on the ladder, or all of them.

const TREND_DAYS = 14;
const RECENT_DAYS = 7;
const RECENT_REPORTS = 3;
const NEXT_GOALS = 6;

window.renderDashboardPage = function (mainContent: HTMLElement, page: PageScope): void {
    const kit = window.kit;
    const { el } = kit;
    const { fmt } = window;
    const stakes = window.stakes;

    const root = kit.page(
        mainContent,
        'Dashboard',
        'Today against yesterday, the bank, and your goals. Wages and utilities are charged at closing, rent and loan payments on the 1st.',
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
    let allGoals = false;
    const goalsToggle = kit.button(
        'Show all',
        'ghost',
        () => {
            allGoals = !allGoals;
            goalsToggle.textContent = allGoals ? 'Show next' : 'Show all';
            refresh();
        },
        { small: true },
    );
    const goalsCard = kit.card('Goals', { flush: true, actions: [goalsToggle] });
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

    // --------------------- Reports ---------------------
    const reportsCard = kit.card('Reports', {
        flush: true,
        actions: [kit.button('Finances', 'ghost', () => window.showPage('finances'), { small: true })],
    });
    const reportsTable = kit.table([
        { label: 'Report' },
        { label: 'Net', num: true },
        { label: '', className: 'actions' },
    ]);
    reportsCard.body.appendChild(reportsTable.root);

    const right = el('div', 'stack');
    right.append(goalsCard.root, daysCard.root, reportsCard.root);
    columns.append(left, right);

    function goalValue(goal: GoalProgress, value: number): string {
        if (goal.unit === 'money') return fmt.moneyWhole(value);
        if (goal.unit === 'days' && goal.target >= 365) return `${fmt.int(Math.floor(value / 365))} yr`;
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
        const owed = stakes.debt();
        const line = stakes.loanBalance();
        const term = stakes.termLoanBalance();
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
            [
                'Owed to the bank',
                owed <= 0
                    ? 'Nothing'
                    : [
                          term > 0 ? `${fmt.money(term)} in loans` : '',
                          line > 0
                              ? `${fmt.money(line)} of the ${fmt.moneyWhole(stakes.LOAN_LIMIT)} line of credit`
                              : '',
                      ]
                          .filter(Boolean)
                          .join(', '),
            ],
            ['Fixed costs a day', `${fmt.money(fixed)} (wages, rent, utilities${owed > 0 ? ', loans' : ''})`],
            [
                'Cash covers',
                data.cash <= 0 ? 'No days' : runway >= 100 ? '100+ days' : `${Math.floor(runway)} days of fixed costs`,
                runway < 3 ? 'critical-text' : '',
            ],
            ['Closings in the red', `${red} of ${stakes.BANKRUPT_AFTER}`, red > 0 ? 'critical-text' : ''],
        ];
        rows.forEach(([label, value, tone]) => bankGrid.append(el('dt', '', label), el('dd', tone ?? '', value)));

        // Goals: the next few not yet reached, or all of them
        goalsTable.clear();
        const goals = window.goals.list();
        const reachedCount = goals.filter((g) => g.reachedOn !== null).length;
        goalsCard.setCount(`${reachedCount} of ${goals.length}`);
        const shownGoals = allGoals ? goals : goals.filter((g) => g.reachedOn === null).slice(0, NEXT_GOALS);
        shownGoals.forEach((goal) => {
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
        } else if (!allGoals && reachedCount > 0) {
            goalsTable.note(`${reachedCount} reached so far. Goals are checked at closing.`);
        } else {
            goalsTable.note('Goals are checked at closing.');
        }

        // The latest reports, each reopened from its record
        reportsTable.clear();
        const reports = [...window.reports.list]
            .sort((a, b) => b.lastDay - a.lastDay || (a.kind === 'year' ? -1 : 1))
            .slice(0, RECENT_REPORTS);
        if (reports.length === 0) reportsTable.empty('A report is written at the last closing of each month.');
        reports.forEach((report) => {
            reportsTable.row([
                report.kind === 'year' ? `${report.label} in review` : report.label,
                el('span', report.net < 0 ? 'critical-text' : '', fmt.money(report.net)),
                kit.button('Open', 'ghost', () => window.showReportModal(report.kind, report.period), { small: true }),
            ]);
        });

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
