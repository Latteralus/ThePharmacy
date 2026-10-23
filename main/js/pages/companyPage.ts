// /js/pages/companyPage.js - the company as a whole (Phase 10, #10): cash
// against everything owed, each location with its building, lease, staff
// and month so far, the bank's loans, and what a month costs before any
// sales. Money is company-wide; the Finances page has the detail.

window.renderCompanyPage = function (mainContent: HTMLElement, page: PageScope): void {
    const kit = window.kit;
    const { el } = kit;
    const { fmt } = window;
    const stakes = window.stakes;

    const root = kit.page(
        mainContent,
        window.company.name,
        'The company: its locations, what it owes the bank, and what a month costs before any sales.',
    );

    // --------------------- KPIs ---------------------
    const kpis = el('div', 'kpi-row');
    const cashTile = kit.statTile('Cash');
    const debtTile = kit.statTile('Owed to the bank');
    const netTile = kit.statTile('Cash less loans');
    const owedTile = kit.statTile('Insurance owed');
    const monthTile = kit.statTile('Net this month');
    kpis.append(cashTile.root, debtTile.root, netTile.root, owedTile.root, monthTile.root);
    root.appendChild(kpis);

    // --------------------- Locations ---------------------
    const locationsCard = kit.card('Locations', { flush: true });
    root.appendChild(locationsCard.root);

    const columns = el('div', 'columns');
    root.appendChild(columns);

    // --------------------- Loans ---------------------
    const loansCard = kit.card('Loans', {
        actions: [kit.button('Finances', 'ghost', () => window.showPage('finances'), { small: true })],
    });
    columns.appendChild(loansCard.root);

    // --------------------- A month's fixed costs ---------------------
    const costsCard = kit.card('A month’s fixed costs', { flush: true });
    columns.appendChild(costsCard.root);
    const DAYS_A_MONTH = 365 / 12;

    // This month so far for one location: closed days from their records,
    // today from the ledger
    function monthNet(id: string): number {
        const now = window.gameState.currentDate;
        const from = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        let net = 0;
        window.records.days.forEach((d) => {
            if (d.date < from || d.date >= today) return;
            net += d.byLocation?.find((line) => line.id === id)?.net ?? 0;
        });
        const live = window.finances.categoryTotals(today, now.getTime(), id);
        const sum = (rows: Record<string, number>) => Object.values(rows).reduce((a, b) => a + b, 0);
        return net + sum(live.revenue) - sum(live.expenses);
    }

    function renderLocations(): void {
        locationsCard.body.innerHTML = '';
        const table = kit.table([
            { label: 'Location' },
            { label: 'Building' },
            { label: 'Rent a month', num: true },
            { label: 'Lease ends' },
            { label: 'Staff', num: true },
            { label: 'Net this month', num: true },
            { label: '', className: 'actions' },
        ]);
        locationsCard.body.appendChild(table.root);
        window.company.locations.forEach((loc) => {
            const net = monthNet(loc.id);
            table.row([
                kit.primaryCell(loc.name, 'Retail pharmacy'),
                kit.primaryCell(loc.building.type, `${fmt.int(loc.building.sqft)} sq ft`),
                fmt.moneyWhole(loc.lease.monthlyRent),
                fmt.date(new Date(loc.lease.end)),
                fmt.int(loc.employees.length),
                el('span', net < 0 ? 'critical-text' : '', fmt.money(net)),
                kit.button(
                    'Building',
                    'ghost',
                    () => {
                        window.company.select(loc.id);
                        window.showPage('building');
                    },
                    { small: true },
                ),
            ]);
        });
        locationsCard.setCount(window.company.locations.length);
    }

    function renderLoans(): void {
        loansCard.body.innerHTML = '';
        const loans = window.financesData.loans ?? [];
        if (loans.length === 0) {
            loansCard.body.appendChild(el('p', 'muted', 'No term loans.'));
        }
        loans.forEach((loan) => {
            const grid = el('dl', 'definition-grid');
            const left = loan.termMonths - loan.paymentsMade;
            const rows: Array<[string, string]> = [
                ['Borrowed', `${fmt.money(loan.principal)} over ${loan.termMonths / 12} years`],
                ['Rate', `${fmt.pct(loan.rate, 2)} a year`],
                ['Payment', `${fmt.money(loan.monthlyPayment)} on the 1st of each month`],
                ['Owed', fmt.money(loan.balance)],
                ['Payments left', `${fmt.int(left)} of ${fmt.int(loan.termMonths)}`],
            ];
            const terms = [loan.guarantee ? 'personal guarantee' : '', loan.collateral ? 'equipment as collateral' : '']
                .filter(Boolean)
                .join(', ');
            if (terms) rows.push(['Secured by', terms]);
            rows.forEach(([label, value]) => grid.append(el('dt', '', label), el('dd', '', value)));
            const payOff = kit.button(`Pay off ${fmt.money(loan.balance)}`, 'secondary', () => {
                window.showConfirmModal(
                    `Pay off the ${loan.name.toLowerCase()} now, ${fmt.money(loan.balance)} in one go? There's no penalty.`,
                    'Pay off',
                    () => {
                        if (stakes.payOffTermLoan(loan.id)) window.toast(`${loan.name} paid off.`, 'success');
                        else window.toast(`Not enough cash to pay off ${fmt.money(loan.balance)}.`, 'error');
                    },
                    { title: 'Pay off the loan?' },
                );
            });
            payOff.disabled = window.financesData.cash < loan.balance;
            const actions = el('div', 'toolbar');
            actions.appendChild(payOff);
            const block = el('div', 'stack');
            block.append(el('strong', '', loan.name), grid, actions);
            loansCard.body.appendChild(block);
        });
        const line = stakes.loanBalance();
        loansCard.body.appendChild(
            el(
                'p',
                'muted',
                line > 0
                    ? `Line of credit: ${fmt.money(line)} owed of ${fmt.moneyWhole(stakes.LOAN_LIMIT)}, at ${fmt.pct(stakes.LOAN_DAILY_INTEREST, 1)} a day.`
                    : `Line of credit: nothing owed. The bank lends up to ${fmt.moneyWhole(stakes.LOAN_LIMIT)} on the Finances page.`,
            ),
        );
    }

    function renderCosts(): void {
        costsCard.body.innerHTML = '';
        const table = kit.table([{ label: 'Each month' }, { label: '', num: true }]);
        costsCard.body.appendChild(table.root);
        let rent = 0;
        let services = 0;
        let wages = 0;
        window.company.forEachLocation((loc) => {
            rent += loc.lease.monthlyRent;
            services += window.company.dailyServices(loc) * DAYS_A_MONTH;
            wages += window.employeesData.reduce((sum, emp) => sum + window.finances.dailyWage(emp), 0) * DAYS_A_MONTH;
        });
        const payments = (window.financesData.loans ?? []).reduce((sum, loan) => sum + loan.monthlyPayment, 0);
        const interest = stakes.dailyInterest() * DAYS_A_MONTH;
        table.row(['Wages, with payroll taxes and benefits', fmt.money(wages)]);
        table.row(['Rent', fmt.money(rent)]);
        table.row(['Utilities and services', fmt.money(services)]);
        if (payments > 0) table.row(['Loan payments', fmt.money(payments)]);
        if (interest > 0) table.row(['Line of credit interest', fmt.money(interest)]);
        table.row(['Total', fmt.money(wages + rent + services + payments + interest)], 'total');
        table.note('Before materials, equipment and overtime.');
    }

    function refresh(): void {
        const data = window.financesData;
        const debt = stakes.debt();
        cashTile.set(fmt.money(data.cash), '', data.cash < 0 ? 'critical' : 'neutral');
        debtTile.set(fmt.money(debt), debt > 0 ? 'Line of credit and loans' : 'Nothing owed');
        netTile.set(fmt.money(data.cash - debt));
        owedTile.set(
            fmt.money(data.pendingInsuranceIncome),
            `Paid at closing on day ${window.insuranceClaims.nextPayday()}`,
        );
        const month = window.company.locations.reduce((sum, loc) => sum + monthNet(loc.id), 0);
        monthTile.set(fmt.money(month), 'All locations', month < 0 ? 'critical' : 'neutral');
        renderLocations();
        renderLoans();
        renderCosts();
    }

    refresh();
    page.on('finances', refresh);
    page.on('employees', refresh);
};
