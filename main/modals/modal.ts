// modal.js - the end-of-day summary, game over, the win, and the in-game
// yes/no prompt.

// The summary, game-over or win dialog on screen, if any. Loading a save
// closes it without running its "next day" action (closeSessionModals).
let sessionDialog: Modal | null = null;

function openSessionDialog(options: Parameters<Kit['modal']>[0]): Modal {
    window.closeSessionModals();
    const dialog = window.kit.modal(options);
    sessionDialog = dialog;
    return {
        root: dialog.root,
        close() {
            if (sessionDialog === dialog) sessionDialog = null;
            dialog.close();
        },
    };
}

window.closeSessionModals = function (): void {
    sessionDialog?.close();
    sessionDialog = null;
};

// A coloured box with a message, for what the player must act on.
function callout(text: string, tone: 'critical' | 'good'): HTMLElement {
    const box = window.kit.el('div', `callout ${tone}`, text);
    box.setAttribute('role', tone === 'critical' ? 'alert' : 'status');
    return box;
}

// The run so far, for game over and the win.
function runRecord(): HTMLElement {
    const { el } = window.kit;
    const reputations = [...window.records.days.map((d) => d.reputation), window.brandReputation.reputationScore];
    const goals = window.goals.list();
    const rows: Array<[string, string]> = [
        ['Days open', window.fmt.int((window.gameState.lastEndedDayIndex ?? window.gameState.dayIndex) + 1)],
        ['Customers served', window.fmt.int(window.records.totalCustomers('served'))],
        ['Best reputation', `${Math.round(Math.max(...reputations))} / 100`],
        ['Goals reached', `${goals.filter((g) => g.reachedOn !== null).length} of ${goals.length}`],
        ['Cash', window.fmt.money(window.financesData.cash)],
    ];
    if (window.stakes.loanBalance() > 0) rows.push(['Owed to the bank', window.fmt.money(window.stakes.loanBalance())]);
    const grid = el('dl', 'definition-grid');
    rows.forEach(([label, value]) => grid.append(el('dt', '', label), el('dd', '', value)));
    return grid;
}

// One day's summary: the closing just now, or a closed day from its record.
interface DaySummary {
    revenue: number;
    costs: number;
    net: number;
    cash: number;
    loan: number;
    customers: Partial<Record<DepartureReason, number>>;
    // At this closing, and the closing before (none on the first day)
    reputation?: number;
    reputationBefore?: number;
    goalsReached: GoalProgress[];
    // "Front closed from 15:30", "Closed early at 18:00"
    notes: string[];
}

// The money, reputation, notes, customers and goals of a day's summary.
function daySummaryParts(day: DaySummary): { money: Node; rest: Node[] } {
    const { el, table, pill } = window.kit;
    const left = day.customers;
    const served = left.served ?? 0;
    const lostParts = [
        { key: 'impatient', label: 'Ran out of patience', count: left.impatient ?? 0, color: 'var(--critical)' },
        { key: 'price', label: 'Refused the price', count: left.price ?? 0, color: 'var(--serious)' },
        { key: 'closing', label: 'Still waiting at closing', count: left.closing ?? 0, color: 'var(--warn)' },
        { key: 'unavailable', label: 'Turned away', count: left.unavailable ?? 0, color: 'var(--ink-muted)' },
    ];
    const lost = lostParts.reduce((sum, part) => sum + part.count, 0);

    // Money
    const money = table([{ label: 'Today' }, { label: '', num: true }]);
    money.row(['Revenue', window.fmt.money(day.revenue)]);
    money.row(['Costs (wages, overhead, purchases)', window.fmt.money(-day.costs)]);
    const net = el('span', day.net >= 0 ? 'good-text' : 'critical-text', window.fmt.money(day.net));
    money.row(['Net', net], 'total');
    money.row(['Cash on hand', el('span', day.cash < 0 ? 'critical-text' : '', window.fmt.money(day.cash))]);
    if (day.loan > 0) money.row(['Owed to the bank', window.fmt.money(day.loan)]);

    // Customers: one bar, served then each way they were lost, with counts as text
    const customers = el('div');
    const heading = el('div', 'toolbar');
    heading.append(
        el('strong', '', 'Customers'),
        pill(`${served} served`, 'good'),
        pill(`${lost} lost`, lost > 0 ? 'critical' : 'neutral'),
    );
    customers.appendChild(heading);

    const total = served + lost;
    if (total > 0) {
        const bar = el('div', 'split-bar');
        bar.style.marginTop = '8px';
        const legend = el('div', 'legend');
        legend.style.marginTop = '6px';
        [{ label: 'Served', count: served, color: 'var(--good)' }, ...lostParts].forEach((part) => {
            if (part.count === 0) return;
            const segment = el('span');
            segment.style.width = `${(part.count / total) * 100}%`;
            segment.style.background = part.color;
            segment.title = `${part.label}: ${part.count}`;
            bar.appendChild(segment);
            const key = el('span');
            const dot = el('span', 'swatch');
            dot.style.background = part.color;
            key.append(dot, `${part.label} ${part.count}`);
            legend.appendChild(key);
        });
        customers.append(bar, legend);
    } else {
        customers.appendChild(el('p', 'muted small', 'No customers today.'));
    }

    const rest: Node[] = [];

    // Reputation over the day, from the history (no change shown on the first day)
    if (day.reputation !== undefined) {
        const repLine = el('div', 'toolbar');
        repLine.append(el('strong', '', 'Reputation'), el('span', '', `${Math.round(day.reputation)} / 100`));
        if (day.reputationBefore !== undefined) {
            const change = day.reputation - day.reputationBefore;
            const tone = change > 0.05 ? 'good-text' : change < -0.05 ? 'critical-text' : 'muted';
            repLine.appendChild(el('span', tone, `${change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(1)} today`));
        }
        rest.push(repLine);
    }

    // A short day (#8), so it isn't read as a slow one
    if (day.notes.length > 0) {
        const noteLine = el('div', 'toolbar');
        noteLine.appendChild(el('strong', '', 'Hours'));
        day.notes.forEach((note) => noteLine.appendChild(pill(note, 'warn')));
        rest.push(noteLine);
    }

    rest.push(customers);

    // Goals reached at this closing (goals.check ran before this)
    if (day.goalsReached.length > 0) {
        const goalLine = el('div', 'toolbar');
        goalLine.appendChild(el('strong', '', day.goalsReached.length === 1 ? 'Goal reached' : 'Goals reached'));
        day.goalsReached.forEach((goal) => goalLine.appendChild(pill(goal.label, 'good')));
        rest.push(goalLine);
    }

    return { money: money.root, rest };
}

// Shown after end of day has charged wages and overhead, before the "today"
// totals roll over.
window.showDailySummaryModal = function (onNextDay?: () => void): void {
    const { el, table, pill } = window.kit;
    const { revenue, expenses, profit, cash } = window.financesData;
    const todayRecord = window.records?.days.find((d) => d.day === window.gameState.dayIndex);
    const parts = daySummaryParts({
        revenue: revenue.today,
        costs: expenses.today,
        net: profit.today,
        cash,
        loan: window.stakes?.loanBalance() ?? 0,
        customers: window.gameState.customersToday ?? {},
        reputation: todayRecord?.reputation,
        reputationBefore: window.records?.yesterday()?.reputation,
        goalsReached: window.goals?.reachedToday() ?? [],
        notes: todayRecord ? window.records.notes(todayRecord) : [],
    });

    const body: Node[] = [];

    // In the red: how long until bankruptcy (stakes.closeDay ran before this)
    if (cash < 0 && window.stakes) {
        body.push(
            callout(
                `Cash is below $0 at closing: ${window.stakes.daysInRed()} of ${window.stakes.BANKRUPT_AFTER} in a row. ` +
                    `Get it back above $0 by closing on day ${window.stakes.bankruptcyDay()}, or the pharmacy goes ` +
                    'bankrupt. The bank lends on the Finances page.',
                'critical',
            ),
        );
    }
    body.push(parts.money, ...parts.rest);

    // Staff: today's hours and how morale moved (employees.endOfDay ran
    // just before this)
    const report = window.employees?.lastDayReport ?? [];
    if (report.length > 0) {
        const staff = el('div');
        staff.appendChild(el('strong', '', 'Staff'));
        const staffTable = table([
            { label: 'Employee' },
            { label: 'Hours', num: true },
            { label: 'Morale', width: '120px' },
            { label: 'Why' },
        ]);
        report.forEach((entry) => {
            const change = entry.moraleAfter - entry.moraleBefore;
            const moraleText = `${Math.round(entry.moraleBefore)}% → ${Math.round(entry.moraleAfter)}%`;
            const morale = entry.quit
                ? pill('Quit', 'critical')
                : el('span', change < -0.5 ? 'critical-text' : change > 0.5 ? 'good-text' : '', moraleText);
            const overtime = entry.overtimeHours ?? 0;
            staffTable.row([
                window.kit.primaryCell(entry.name, entry.role),
                overtime > 0
                    ? window.kit.primaryCell(`${entry.hoursWorked.toFixed(1)}h`, `${overtime.toFixed(1)}h overtime`)
                    : `${entry.hoursWorked.toFixed(1)}h`,
                morale,
                entry.reasons.length > 0 ? entry.reasons.join(', ') : 'Rested, paid fairly',
            ]);
        });
        staff.appendChild(staffTable.root);
        body.push(staff);
    }

    const date = window.gameState.currentDate;
    const nextDayBtn = window.kit.button('Start next day', 'primary');
    const dialog = openSessionDialog({
        title: `End of day ${(window.gameState.dayIndex ?? 0) + 1}`,
        subtitle: date ? window.fmt.day(date) : undefined,
        body,
        actions: [nextDayBtn],
        className: 'daily-summary',
    });
    nextDayBtn.addEventListener('click', () => {
        dialog.close();
        if (onNextDay) onNextDay();
    });
    // Without scrolling, so a long summary opens at its top (where a warning goes)
    nextDayBtn.focus({ preventScroll: true });
};

// A closed day's summary, from its record (the Dashboard). Kept for days
// whose summary was skipped (#49). It changes nothing, so it isn't a
// session dialog, and Esc closes it.
window.showDayRecordModal = function (dayIndex: number): void {
    const records = window.records;
    const record = records.days.find((d) => d.day === dayIndex);
    if (!record) return;
    const before = [...records.days].reverse().find((d) => d.day < dayIndex);
    const parts = daySummaryParts({
        revenue: record.revenue,
        costs: record.costs,
        net: record.net,
        cash: record.cash,
        loan: record.loan,
        customers: record.customers,
        reputation: record.reputation,
        reputationBefore: before?.reputation,
        goalsReached: window.goals?.list().filter((goal) => goal.reachedOn === dayIndex) ?? [],
        notes: records.notes(record),
    });
    const closeBtn = window.kit.button('Close', 'primary');
    const dialog = window.kit.modal({
        title: `Day ${dayIndex + 1}`,
        subtitle: window.fmt.day(new Date(record.date)),
        body: [parts.money, ...parts.rest],
        actions: [closeBtn],
        className: 'day-record',
        onEscape: () => dialog.close(),
    });
    closeBtn.addEventListener('click', () => dialog.close());
    closeBtn.focus({ preventScroll: true });
};

// Bankrupt: three closings in a row in the red (stakes.closeDay). The game
// is over; the player can load their last save or leave.
window.showGameOverModal = function (): void {
    const { el } = window.kit;
    const loadBtn = window.kit.button('Load last save', 'primary');
    const menuBtn = window.kit.button('Main menu', 'secondary');
    const date = window.gameState.currentDate;
    const dialog = openSessionDialog({
        title: 'Bankrupt',
        subtitle: `${window.gameState.pharmacyName || 'Your pharmacy'} · ${window.fmt.day(date)}`,
        body: [
            callout(
                `Cash was below $0 at closing ${window.stakes.BANKRUPT_AFTER} days in a row, so the bank has ` +
                    `closed the pharmacy, with ${window.fmt.money(window.financesData.cash)} in the account.`,
                'critical',
            ),
            el('strong', '', 'How it went'),
            runRecord(),
        ],
        actions: [menuBtn, loadBtn],
        className: 'game-over',
    });
    loadBtn.addEventListener('click', async () => {
        loadBtn.disabled = true;
        // A successful load closes this dialog (closeSessionModals)
        const loaded = window.loadGame ? await window.loadGame() : false;
        if (!loaded) {
            loadBtn.disabled = false;
            window.toast('There is no save to load.', 'warn');
        }
    });
    menuBtn.addEventListener('click', () => {
        dialog.close();
        window.location.href = 'index.html';
    });
    loadBtn.focus();
};

// Every goal reached (goals.check): shown once, after that day's summary.
window.showVictoryModal = function (onContinue?: () => void): void {
    const { el } = window.kit;
    const continueBtn = window.kit.button('Keep playing', 'primary');
    const dialog = openSessionDialog({
        title: 'You built a thriving pharmacy',
        subtitle: `Every goal reached, on day ${(window.gameState.wonOnDay ?? window.gameState.dayIndex) + 1}`,
        body: [
            callout('You reached all the goals. The pharmacy is yours to keep running.', 'good'),
            el('strong', '', 'How it went'),
            runRecord(),
        ],
        actions: [continueBtn],
        className: 'victory',
    });
    continueBtn.addEventListener('click', () => {
        dialog.close();
        if (onContinue) onContinue();
    });
    continueBtn.focus();
};

// In-game yes/no prompt, instead of window.confirm(), which blocks the
// renderer (and with it the game loop). Only one is shown at a time. Esc
// and Cancel close it without doing anything.
window.showConfirmModal = function (
    message: string,
    confirmLabel: string,
    onConfirm: () => void,
    options: { title?: string; danger?: boolean } = {},
): void {
    if (document.querySelector('.confirm-modal')) return;

    const cancelBtn = window.kit.button('Cancel', 'secondary');
    const confirmBtn = window.kit.button(confirmLabel, options.danger ? 'danger' : 'primary');
    if (options.danger) confirmBtn.classList.add('solid');

    const dialog = window.kit.modal({
        title: options.title ?? 'Are you sure?',
        body: [window.kit.el('p', '', message)],
        actions: [cancelBtn, confirmBtn],
        className: 'confirm-modal',
        onEscape: () => dialog.close(),
    });
    cancelBtn.addEventListener('click', () => dialog.close());
    confirmBtn.addEventListener('click', () => {
        dialog.close();
        onConfirm();
    });
    cancelBtn.focus();
};
