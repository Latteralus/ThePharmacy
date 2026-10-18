// /js/pages/employeesPage.js - the staff table and hiring.
//
// Daily wages are salary / 365, which is what end of day charges
// (finances.applyDailyCosts); the page used to show salary / 30.

const SKILL_COLUMNS: Array<{ key: keyof EmployeeSkills; short: string; long: string }> = [
    { key: 'compounding', short: 'Comp.', long: 'Compounding' },
    { key: 'dispensing', short: 'Disp.', long: 'Dispensing' },
    { key: 'customerService', short: 'Service', long: 'Customer service' },
    { key: 'inventoryManagement', short: 'Inv.', long: 'Inventory management' },
    { key: 'sales', short: 'Sales', long: 'Sales' },
];

const dailyWage = (employee: Employee): number => employee.salary / 365;

function renderEmployeesPage(mainContent: HTMLElement, page: PageScope): void {
    const kit = window.kit;
    const { el } = kit;
    const { fmt } = window;

    const root = kit.page(mainContent, 'Employees', 'Your staff, what they cost, and hiring.');

    const staffView = el('div', 'stack');
    const hireView = el('div', 'stack');
    const tabs = kit.tabs(['Staff', 'Hiring'], (index) => {
        staffView.style.display = index === 0 ? '' : 'none';
        hireView.style.display = index === 1 ? '' : 'none';
    });
    root.append(tabs.root, staffView, hireView);

    // --------------------- Staff ---------------------
    const kpis = el('div', 'kpi-row');
    const staffTile = kit.statTile('Staff');
    const wagesTile = kit.statTile('Wages per day');
    const moraleTile = kit.statTile('Average morale');
    kpis.append(staffTile.root, wagesTile.root, moraleTile.root);
    staffView.appendChild(kpis);

    const staffCard = kit.card('Staff', { flush: true });
    staffView.appendChild(staffCard.root);

    const skillColumns = (): TableColumn[] =>
        SKILL_COLUMNS.map((s) => ({ label: s.short, num: true, title: `${s.long} (0-100)` }));

    function moraleCell(morale: number): HTMLElement {
        const tone: Tone = morale >= 70 ? 'good' : morale >= 40 ? 'warn' : 'critical';
        return kit.meterCell(morale / 100, `${Math.round(morale)}%`, tone).root;
    }

    function renderStaff(): void {
        staffCard.body.innerHTML = '';
        const table = kit.table([
            { label: 'Employee' },
            { label: 'Working on', width: '220px' },
            { label: 'Salary', num: true },
            { label: 'Morale', width: '120px' },
            ...skillColumns(),
            { label: '', className: 'actions' },
        ]);
        staffCard.body.appendChild(table.root);

        const staff = window.employeesData;
        if (staff.length === 0) table.empty('No staff. Hire someone on the Hiring tab.');

        let idle = 0;
        staff.forEach((employee) => {
            const task = employee.currentTaskId ? window.taskManager.getTaskById(employee.currentTaskId) : undefined;
            const working = el('div');
            if (task) {
                const label = el('div');
                label.append(kit.swatch(window.words.taskKind(task)), window.words.taskLabel(task));
                working.appendChild(label);
                if (task.status === 'inProgress') working.appendChild(window.taskbars.createProgressBar(task));
            } else {
                idle++;
                working.appendChild(kit.pill('Idle'));
            }

            const fire = kit.button(
                'Terminate',
                'danger',
                () =>
                    window.showConfirmModal(
                        `Terminate ${employee.firstName} ${employee.lastName}? Anything they're working on goes back in the queue.`,
                        'Terminate',
                        () => window.employees.fireEmployee(employee.id),
                        { title: 'Terminate employee', danger: true },
                    ),
                { small: true },
            );

            const row = table.row([
                kit.primaryCell(`${employee.firstName} ${employee.lastName}`, employee.role),
                working,
                kit.primaryCell(`${fmt.moneyWhole(employee.salary)}/yr`, `${fmt.money(dailyWage(employee))}/day`),
                moraleCell(employee.morale),
                ...SKILL_COLUMNS.map((s) => employee.skills?.[s.key] ?? '—'),
                fire,
            ]);
            row.className = 'employee-card';
        });

        const wages = staff.reduce((sum, e) => sum + dailyWage(e), 0);
        const morale = staff.length > 0 ? staff.reduce((sum, e) => sum + e.morale, 0) / staff.length : 0;
        staffTile.set(fmt.int(staff.length), staff.length > 0 ? `${idle} idle` : '');
        wagesTile.set(fmt.money(wages), `${fmt.moneyWhole(wages * 365)} a year`);
        moraleTile.set(staff.length > 0 ? `${Math.round(morale)}%` : '—');
        staffCard.setCount(staff.length);
    }

    // --------------------- Hiring ---------------------
    const HIRING_FEE = 500;
    const postingCard = kit.card('Post a job');
    hireView.appendChild(postingCard.root);

    const roleSelect = kit.select(
        ['Pharmacist', 'Lab Technician', 'Cashier'].map((role) => ({ value: role, label: role })),
        'Pharmacist',
    );
    const levelSelect = kit.select(
        [
            { value: 'Novice', label: 'Entry level' },
            { value: 'Intermediate', label: 'Experienced' },
            { value: 'Skilled', label: 'Senior' },
        ],
        'Novice',
    );
    const post = kit.button(`Post job (${fmt.moneyWhole(HIRING_FEE)})`, 'primary', () =>
        window.employees.hireEmployee(roleSelect.value, levelSelect.value),
    );
    const form = el('div', 'toolbar');
    const roleField = el('label', 'field', 'Position');
    roleField.appendChild(roleSelect);
    const levelField = el('label', 'field', 'Experience');
    levelField.appendChild(levelSelect);
    form.append(roleField, levelField, post);
    postingCard.body.append(
        form,
        el(
            'p',
            'small muted',
            `Posting costs ${fmt.moneyWhole(HIRING_FEE)} whether or not you hire, and shows five candidates. ` +
                'Pharmacists consult, lab technicians restock and compound, cashiers run the front desk.',
        ),
    );
    form.style.marginBottom = '8px';

    const candidatesCard = kit.card('Candidates', { flush: true });
    hireView.appendChild(candidatesCard.root);
    const candidatesBody = el('div');
    candidatesBody.className = 'candidates-container';
    candidatesCard.body.appendChild(candidatesBody);

    window.displayEmployeeCandidates = function (candidates) {
        candidatesBody.innerHTML = '';
        const table = kit.table([
            { label: 'Candidate' },
            { label: 'Salary', num: true },
            ...skillColumns(),
            { label: '', className: 'actions' },
        ]);
        candidatesBody.appendChild(table.root);
        candidatesCard.setCount(candidates.length || null);

        if (candidates.length === 0) {
            table.empty('Post a job to see candidates.');
            return;
        }

        candidates.forEach((candidate) => {
            const hire = kit.button(
                'Hire',
                'primary',
                () => {
                    window.employees.hireSelectedEmployee(candidate);
                    row.remove();
                },
                { small: true },
            );
            const row = table.row([
                kit.primaryCell(`${candidate.firstName} ${candidate.lastName}`, candidate.role),
                kit.primaryCell(`${fmt.moneyWhole(candidate.salary)}/yr`, `${fmt.money(dailyWage(candidate))}/day`),
                ...SKILL_COLUMNS.map((s) => candidate.skills?.[s.key] ?? '—'),
                hire,
            ]);
            row.className = 'candidate-card';
        });
    };
    window.displayEmployeeCandidates([]);

    // Hires, firings, and staff starting and finishing tasks
    renderStaff();
    page.on('employees', renderStaff);
    page.on('tasks', renderStaff);

    tabs.select(0);
}

window.renderEmployeesPage = renderEmployeesPage;
