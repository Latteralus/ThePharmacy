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
    const lines = [
        `Revenue Today: $${revenue.today.toFixed(2)}`,
        `Costs Today: $${expenses.today.toFixed(2)}`,
        `Net Today: $${profit.today.toFixed(2)}`,
        `Current Cash: $${cash.toFixed(2)}`,
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
