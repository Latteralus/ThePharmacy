// /components/modal.js (basic summary approach in the text)
window.showDailySummaryModal = function (onNextDay?: () => void): void {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'modal';

    const summaryTitle = document.createElement('h2');
    summaryTitle.textContent = 'Daily Summary';
    modal.appendChild(summaryTitle);

    // Shown after end of day has charged wages and overhead, before the
    // "today" totals roll over.
    const { revenue, expenses, profit, cash } = window.financesData;
    const left = window.gameState.customersToday ?? {};
    const lost = (left.impatient ?? 0) + (left.price ?? 0) + (left.closing ?? 0);
    const lines = [
        `Revenue Today: $${revenue.today.toFixed(2)}`,
        `Costs Today: $${expenses.today.toFixed(2)}`,
        `Net Today: $${profit.today.toFixed(2)}`,
        `Current Cash: $${cash.toFixed(2)}`,
        `Customers Served: ${left.served ?? 0}`,
        `Customers Lost: ${lost}` +
            (lost > 0
                ? ` (${left.impatient ?? 0} ran out of patience, ${left.price ?? 0} refused the price, ` +
                  `${left.closing ?? 0} still waiting at closing)`
                : ''),
    ];
    lines.forEach((line) => {
        const summaryText = document.createElement('p');
        summaryText.textContent = line;
        modal.appendChild(summaryText);
    });

    // "Start Next Day" button
    const nextDayBtn = document.createElement('button');
    nextDayBtn.textContent = 'Start Next Day';
    nextDayBtn.onclick = () => {
        document.body.removeChild(backdrop);
        if (onNextDay) onNextDay();
    };

    modal.appendChild(nextDayBtn);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
};

// In-game yes/no prompt, instead of window.confirm(), which blocks the
// renderer (and with it the game loop). Only one is shown at a time.
window.showConfirmModal = function (message: string, confirmLabel: string, onConfirm: () => void): void {
    if (document.querySelector('.confirm-modal')) return;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop confirm-modal';

    const modal = document.createElement('div');
    modal.className = 'modal';

    const text = document.createElement('p');
    text.textContent = message;
    modal.appendChild(text);

    const close = () => backdrop.remove();

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = confirmLabel;
    confirmBtn.onclick = () => {
        close();
        onConfirm();
    };

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.marginLeft = '10px';
    cancelBtn.onclick = close;

    modal.append(confirmBtn, cancelBtn);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    cancelBtn.focus();
};
