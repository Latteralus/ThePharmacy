// reportModal.js - a monthly or yearly report (Phase 10, #13), from its
// saved PeriodReport (reports.ts), never from live totals. At the closing
// that ends the month it opens after the daily summary, with Continue
// (a session dialog, so a load closes it); reopened from the Dashboard or
// the Finances page, it changes nothing and Esc closes it.

window.showReportModal = function (kind, period, onClose) {
    const report = window.reports.find(kind, period);
    if (!report) return;
    const { el, table, pill } = window.kit;
    const { fmt } = window;
    const body: Node[] = [];

    // Profit and loss by category
    const pl = table([{ label: report.kind === 'month' ? 'This month' : 'This year' }, { label: '', num: true }]);
    pl.group('Revenue');
    window.words.REVENUE_CATEGORIES.forEach((key) => {
        const amount = report.revenueByCategory[key];
        if (amount) pl.row([window.words.category(key), fmt.money(amount)]);
    });
    pl.row(['Total revenue', fmt.money(report.revenue)], 'total');
    pl.group('Costs');
    const shown = new Set<string>();
    window.words.EXPENSE_CATEGORIES.forEach((key) => {
        const amount = report.costsByCategory[key];
        shown.add(key);
        if (amount) pl.row([window.words.category(key), fmt.money(-amount)]);
    });
    Object.entries(report.costsByCategory).forEach(([key, amount]) => {
        if (!shown.has(key) && amount) pl.row([window.words.category(key), fmt.money(-amount)]);
    });
    pl.row(['Total costs', fmt.money(-report.costs)], 'total');
    const netCell = el('span', report.net >= 0 ? 'good-text' : 'critical-text', fmt.money(report.net));
    if (report.revenue > 0) netCell.appendChild(el('span', 'sub', `${fmt.pct(report.net / report.revenue)} margin`));
    pl.row(['Net profit', netCell], 'total');

    // Each location's part; the rest is the company's own (loan interest)
    const locations = table([{ label: 'By location' }, { label: 'Revenue', num: true }, { label: 'Net', num: true }]);
    report.byLocation.forEach((line) => {
        locations.row([line.name, fmt.money(line.revenue), fmt.money(line.net)]);
    });
    const companyNet = report.net - report.byLocation.reduce((sum, line) => sum + line.net, 0);
    if (Math.abs(companyNet) >= 0.005) locations.row(['Company (loan interest)', '', fmt.money(companyNet)]);

    const columns = el('div', 'columns');
    const left = el('div', 'stack');
    left.append(pl.root, locations.root);

    // The balance sheet at its last closing
    const balance = report.balance;
    const assets = balance.cash + balance.insuranceOwed + balance.deposits;
    const owed = balance.creditLine + balance.termLoans;
    const sheet = table([{ label: 'Balance sheet' }, { label: '', num: true }]);
    sheet.group('What the company has');
    sheet.row(['Cash', el('span', balance.cash < 0 ? 'critical-text' : '', fmt.money(balance.cash))]);
    sheet.row(['Insurance owed to you', fmt.money(balance.insuranceOwed)]);
    if (balance.deposits > 0) sheet.row(['Lease deposits', fmt.money(balance.deposits)]);
    sheet.group('What it owes');
    sheet.row(['Line of credit', fmt.money(-balance.creditLine)]);
    sheet.row(['Term loans', fmt.money(-balance.termLoans)]);
    sheet.row(['Net', fmt.money(assets - owed)], 'total');
    sheet.note('Equipment and stock are not counted.');

    // Loans, and what was repaid
    const loans = table([
        { label: 'Loan' },
        { label: 'Owed', num: true },
        { label: 'A month', num: true },
        { label: 'Payments left', num: true },
    ]);
    report.loans.forEach((loan) =>
        loans.row([loan.name, fmt.money(loan.balance), fmt.money(loan.monthlyPayment), fmt.int(loan.paymentsLeft)]),
    );
    if (balance.creditLine > 0) loans.row(['Line of credit', fmt.money(balance.creditLine), '—', '—']);
    if (report.loans.length === 0 && balance.creditLine <= 0) loans.empty('Nothing owed to the bank.');
    loans.note(
        `${report.kind === 'month' ? 'This month' : 'This year'}: ${fmt.money(report.principalRepaid)} of loans repaid, ` +
            `${fmt.money(report.interestPaid)} of interest paid.`,
    );

    const right = el('div', 'stack');
    right.append(sheet.root, loans.root);
    columns.append(left, right);

    // Highlights
    const h = report.highlights;
    const served = report.customers.served ?? 0;
    const lost = window.records.lost(report.customers);
    const grid = el('dl', 'definition-grid');
    const rows: Array<[string, string]> = [
        ['Days open', fmt.int(report.daysOpen)],
        ['Customers', `${fmt.int(served)} served, ${fmt.int(lost)} lost`],
        ['Reputation', `${Math.round(h.reputationStart)} → ${Math.round(h.reputationEnd)}`],
        ['Staff', `${fmt.int(h.staffStart)} → ${fmt.int(h.staffEnd)}`],
    ];
    if (h.bestDay) rows.push(['Best day', `Day ${h.bestDay.day + 1}, ${fmt.money(h.bestDay.net)}`]);
    if (h.worstDay) rows.push(['Worst day', `Day ${h.worstDay.day + 1}, ${fmt.money(h.worstDay.net)}`]);
    rows.forEach(([label, value]) => grid.append(el('dt', '', label), el('dd', '', value)));
    const highlights = el('div', 'stack');
    highlights.append(el('strong', '', 'Highlights'), grid);
    if (h.goals.length > 0) {
        const goalLine = el('div', 'toolbar');
        goalLine.appendChild(el('strong', '', h.goals.length === 1 ? 'Goal reached' : 'Goals reached'));
        h.goals.forEach((label) => goalLine.appendChild(pill(label, 'good')));
        highlights.appendChild(goalLine);
    }

    body.push(highlights, columns);

    const title = report.kind === 'month' ? report.label : `${report.label} in review`;
    const subtitle = `Days ${report.firstDay + 1}–${report.lastDay + 1} · ${window.company.name}`;
    const button = window.kit.button(onClose ? 'Continue' : 'Close', 'primary');
    const options = { title, subtitle, body, actions: [button], className: 'period-report' };
    // At closing it's part of the session (a load closes it without going on)
    const dialog = onClose
        ? window.openSessionDialog(options)
        : window.kit.modal({ ...options, onEscape: () => dialog.close() });
    button.addEventListener('click', () => {
        dialog.close();
        if (onClose) onClose();
    });
    button.focus({ preventScroll: true });
};
