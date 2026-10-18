// /js/pages/employeesPage.js - the staff table and hiring.
//
// Daily wages are salary / 365, which is what end of day charges
// (finances.applyDailyCosts); the page used to show salary / 30.
//
// Staff matter (Phase 7): each row shows hours worked today, speed at their
// main job and pay against the market, which is what moves morale at
// closing time (employees.endOfDay). Salaries can be changed here. The
// table is redrawn only when the staff change; otherwise rows update in
// place, so a salary being typed isn't wiped.

const SKILL_COLUMNS: Array<{ key: keyof EmployeeSkills; short: string; long: string }> = [
    { key: 'compounding', short: 'Comp.', long: 'Compounding' },
    { key: 'dispensing', short: 'Disp.', long: 'Dispensing' },
    { key: 'customerService', short: 'Service', long: 'Customer service' },
    { key: 'inventoryManagement', short: 'Inv.', long: 'Inventory management' },
    { key: 'sales', short: 'Sales', long: 'Sales' },
];

// Each role's main job, for the Speed column
const MAIN_TASK: Record<string, { type: string; label: string }> = {
    Pharmacist: { type: 'consultation', label: 'consultations' },
    'Lab Technician': { type: 'compound', label: 'compounding' },
    Cashier: { type: 'customerInteraction', label: 'the front desk' },
};

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
    staffView.append(
        staffCard.root,
        el(
            'p',
            'small muted',
            'Morale changes at closing: up when someone worked 8 hours or less, down for every hour over, and up or down with pay against the market. ' +
                'Below 50% they slow down, and below 25% they may quit.',
        ),
    );

    const skillColumns = (): TableColumn[] =>
        SKILL_COLUMNS.map((s) => ({ label: s.short, num: true, title: `${s.long} (0-100)` }));

    function moraleTone(morale: number): Tone {
        return morale >= 70 ? 'good' : morale >= 40 ? 'warn' : 'critical';
    }

    function payCue(employee: Employee): { text: string; className: string; title: string } {
        const pay = window.employees.payVsMarket(employee);
        const fair = window.helpers.fairSalary(employee);
        const className = pay <= -0.05 ? 'critical-text' : pay >= 0.05 ? 'good-text' : 'muted';
        return {
            text: `${fmt.money(dailyWage(employee))}/day · ${fmt.signedPct(pay)} vs market`,
            className: `sub ${className}`,
            title: `The market pays about ${fmt.moneyWhole(fair)} a year for this role at their skill.`,
        };
    }

    function speed(employee: Employee): { text: string; title: string } {
        const main = MAIN_TASK[employee.role] ?? MAIN_TASK.Cashier;
        const rate = window.employees.workRate(employee, { type: main.type } as Task);
        return {
            text: `${rate.toFixed(2)}×`,
            title: `Speed at ${main.label}, from their skill${employee.morale < 50 ? ' and low morale' : ''}. 1× is normal.`,
        };
    }

    // Writes a value into an input unless the player is typing in it
    function setIdle(input: HTMLInputElement, value: string): void {
        if (document.activeElement !== input && input.value !== value) input.value = value;
    }

    // Rows update on every frame's clock tick: only touch what changed
    function setText(node: HTMLElement, text: string, className?: string, title?: string): void {
        if (node.textContent !== text) node.textContent = text;
        if (className !== undefined && node.className !== className) node.className = className;
        if (title !== undefined && node.title !== title) node.title = title;
    }

    let renderedStaff = '';
    let liveRows: Array<() => void> = [];

    function buildStaffTable(): void {
        staffCard.body.innerHTML = '';
        liveRows = [];
        const staff = window.employeesData;
        renderedStaff = staff.map((e) => e.id).join();

        const table = kit.table([
            { label: 'Employee' },
            { label: 'Working on', width: '200px' },
            { label: 'Salary a year', num: true },
            { label: 'Today', num: true, title: 'Hours worked today. Over 8 lowers morale at closing.' },
            { label: 'Speed', num: true, title: 'Speed at their main job. 1× is normal.' },
            { label: 'Morale', width: '120px' },
            ...skillColumns(),
            { label: '', className: 'actions' },
        ]);
        staffCard.body.appendChild(table.root);
        if (staff.length === 0) table.empty('No staff. Hire someone on the Hiring tab.');

        staff.forEach((employee) => {
            const working = el('div');
            let shownTask: string | null | undefined;

            const salaryInput = kit.numberInput(Math.round(employee.salary), {
                min: 1,
                step: 1000,
                small: true,
                width: '96px',
            });
            salaryInput.setAttribute('aria-label', `Salary for ${employee.firstName} ${employee.lastName}`);
            salaryInput.addEventListener('change', () => {
                const value = parseFloat(salaryInput.value);
                if (!window.employees.setSalary(employee.id, value)) {
                    window.toast('Enter a salary above $0.', 'error');
                    salaryInput.value = String(Math.round(employee.salary));
                    return;
                }
                window.toast(
                    `${employee.firstName} ${employee.lastName} now earns ${fmt.moneyWhole(employee.salary)} a year (${fmt.money(dailyWage(employee))} a day).`,
                    'success',
                );
            });
            const pay = el('span');
            const salaryCell = el('span');
            salaryCell.append(salaryInput, pay);

            const hours = el('span');
            const speedCell = el('span');
            const morale = kit.meterCell(0, '');

            const update = (): void => {
                const task = employee.currentTaskId
                    ? window.taskManager.getTaskById(employee.currentTaskId)
                    : undefined;
                const taskKey = task ? `${task.id}:${task.status}` : null;
                if (taskKey !== shownTask) {
                    shownTask = taskKey;
                    working.innerHTML = '';
                    if (task) {
                        const label = el('div');
                        label.append(kit.swatch(window.words.taskKind(task)), window.words.taskLabel(task));
                        working.appendChild(label);
                        if (task.status === 'inProgress') working.appendChild(window.taskbars.createProgressBar(task));
                    } else {
                        working.appendChild(kit.pill('Idle'));
                    }
                }

                setIdle(salaryInput, String(Math.round(employee.salary)));
                const cue = payCue(employee);
                setText(pay, cue.text, cue.className, cue.title);

                const worked = (employee.minutesWorkedToday ?? 0) / 60;
                setText(hours, `${worked.toFixed(1)}h`, worked > 8 ? 'warn-text' : '');

                const s = speed(employee);
                setText(speedCell, s.text, undefined, s.title);

                morale.set(employee.morale / 100, `${Math.round(employee.morale)}%`, moraleTone(employee.morale));
            };
            update();
            liveRows.push(update);

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
                salaryCell,
                hours,
                speedCell,
                morale.root,
                ...SKILL_COLUMNS.map((s) => employee.skills?.[s.key] ?? '—'),
                fire,
            ]);
            row.className = 'employee-card';
            row.dataset.employeeId = employee.id;
        });
    }

    function renderStaff(): void {
        const staff = window.employeesData;
        if (staff.map((e) => e.id).join() !== renderedStaff) buildStaffTable();
        else liveRows.forEach((update) => update());

        const idle = staff.filter((e) => !e.currentTaskId).length;
        const wages = staff.reduce((sum, e) => sum + dailyWage(e), 0);
        const avgMorale = staff.length > 0 ? staff.reduce((sum, e) => sum + e.morale, 0) / staff.length : 0;
        staffTile.set(fmt.int(staff.length), staff.length > 0 ? `${idle} idle` : '');
        wagesTile.set(fmt.money(wages), `${fmt.moneyWhole(wages * 365)} a year`);
        moraleTile.set(staff.length > 0 ? `${Math.round(avgMorale)}%` : '—');
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
                'Pharmacists consult, lab technicians restock and compound, cashiers run the front desk. ' +
                'More skilled staff work faster.',
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
            { label: 'Speed', num: true, title: 'Speed at their main job. 1× is normal.' },
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
            const s = speed(candidate);
            const speedCell = el('span', '', s.text);
            speedCell.title = s.title;
            const row = table.row([
                kit.primaryCell(`${candidate.firstName} ${candidate.lastName}`, candidate.role),
                kit.primaryCell(`${fmt.moneyWhole(candidate.salary)}/yr`, payCue(candidate).text),
                speedCell,
                ...SKILL_COLUMNS.map((s) => candidate.skills?.[s.key] ?? '—'),
                hire,
            ]);
            row.className = 'candidate-card';
        });
    };
    window.displayEmployeeCandidates([]);

    // Hires, firings, raises and closing time; staff starting and finishing
    // tasks; the clock (hours worked today)
    renderStaff();
    page.on('employees', renderStaff);
    page.on('tasks', renderStaff);
    page.on('time', () => liveRows.forEach((update) => update()));

    tabs.select(0);
}

window.renderEmployeesPage = renderEmployeesPage;
