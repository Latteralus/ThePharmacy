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

// Shown after end of day has charged wages and overhead, before the "today"
// totals roll over.
window.showDailySummaryModal = function (onNextDay?: () => void): void {
    const { el, table, pill } = window.kit;
    const { revenue, expenses, profit, cash } = window.financesData;
    const loan = window.stakes?.loanBalance() ?? 0;
    const left = window.gameState.customersToday ?? {};
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
    money.row(['Revenue', window.fmt.money(revenue.today)]);
    money.row(['Costs (wages, overhead, purchases)', window.fmt.money(-expenses.today)]);
    const net = el('span', profit.today >= 0 ? 'good-text' : 'critical-text', window.fmt.money(profit.today));
    money.row(['Net', net], 'total');
    money.row(['Cash on hand', el('span', cash < 0 ? 'critical-text' : '', window.fmt.money(cash))]);
    if (loan > 0) money.row(['Owed to the bank', window.fmt.money(loan)]);

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
    body.push(money.root);

    // Reputation over the day, from the history (no change shown on the first day)
    const todayRecord = window.records?.days.find((d) => d.day === window.gameState.dayIndex);
    const before = window.records?.yesterday()?.reputation;
    if (todayRecord) {
        const repLine = el('div', 'toolbar');
        repLine.append(el('strong', '', 'Reputation'), el('span', '', `${Math.round(todayRecord.reputation)} / 100`));
        if (before !== undefined) {
            const change = todayRecord.reputation - before;
            const tone = change > 0.05 ? 'good-text' : change < -0.05 ? 'critical-text' : 'muted';
            repLine.appendChild(el('span', tone, `${change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(1)} today`));
        }
        body.push(repLine);
    }

    body.push(customers);

    // Goals reached at this closing (goals.check ran before this)
    const reached = window.goals?.reachedToday() ?? [];
    if (reached.length > 0) {
        const goalLine = el('div', 'toolbar');
        goalLine.appendChild(el('strong', '', reached.length === 1 ? 'Goal reached' : 'Goals reached'));
        reached.forEach((goal) => goalLine.appendChild(pill(goal.label, 'good')));
        body.push(goalLine);
    }

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
            staffTable.row([
                window.kit.primaryCell(entry.name, entry.role),
                `${entry.hoursWorked.toFixed(1)}h`,
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
