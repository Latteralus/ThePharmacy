// /components/modal.js (basic summary approach in the text)
window.showDailySummaryModal = function(onNextDay) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const summaryTitle = document.createElement('h2');
  summaryTitle.textContent = 'Daily Summary';
  modal.appendChild(summaryTitle);

  const summaryText = document.createElement('p');
  const netIncome = window.financesData.dailyIncome;
  const cashNow = window.financesData.cash.toFixed(2);
  summaryText.textContent = `Net Income Today: $${netIncome.toFixed(2)}. Current Cash: $${cashNow}.`;
  modal.appendChild(summaryText);

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
