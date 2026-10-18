// modal.js - the end-of-day summary and the in-game yes/no prompt.

// Shown after end of day has charged wages and overhead, before the "today"
// totals roll over.
window.showDailySummaryModal = function (onNextDay?: () => void): void {
    const { el, table, pill } = window.kit;
    const { revenue, expenses, profit, cash } = window.financesData;
    const left = window.gameState.customersToday ?? {};
    const served = left.served ?? 0;
    const lostParts = [
        { key: 'impatient', label: 'Ran out of patience', count: left.impatient ?? 0, color: 'var(--critical)' },
        { key: 'price', label: 'Refused the price', count: left.price ?? 0, color: 'var(--serious)' },
        { key: 'closing', label: 'Still waiting at closing', count: left.closing ?? 0, color: 'var(--warn)' },
    ];
    const lost = lostParts.reduce((sum, part) => sum + part.count, 0);

    // Money
    const money = table([{ label: 'Today' }, { label: '', num: true }]);
    money.row(['Revenue', window.fmt.money(revenue.today)]);
    money.row(['Costs (wages, overhead, purchases)', window.fmt.money(-expenses.today)]);
    const net = el('span', profit.today >= 0 ? 'good-text' : 'critical-text', window.fmt.money(profit.today));
    money.row(['Net', net], 'total');
    money.row(['Cash on hand', window.fmt.money(cash)]);

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

    const date = window.gameState.currentDate;
    const nextDayBtn = window.kit.button('Start next day', 'primary');
    const dialog = window.kit.modal({
        title: `End of day ${(window.gameState.dayIndex ?? 0) + 1}`,
        subtitle: date ? window.fmt.day(date) : undefined,
        body: [money.root, customers],
        actions: [nextDayBtn],
        className: 'daily-summary',
    });
    nextDayBtn.addEventListener('click', () => {
        dialog.close();
        if (onNextDay) onNextDay();
    });
    nextDayBtn.focus();
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
