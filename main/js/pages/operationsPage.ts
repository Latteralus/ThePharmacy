// /js/pages/operationsPage.js - the live view of the store: who is waiting
// and how patient they are, what each employee is doing, and the work queue
// with customer work ahead of compounding for stock.

window.renderOperationsPage = function (mainContent: HTMLElement, page: PageScope): void {
    const kit = window.kit;
    const { el } = kit;
    const { fmt, words } = window;

    const root = kit.page(mainContent, 'Operations', "Who's in the store, who's working on what, and what's waiting.");

    // --------------------- KPIs ---------------------
    const kpis = el('div', 'kpi-row');
    const inStoreTile = kit.statTile('Customers in store');
    const waitingTile = kit.statTile('Customer tasks waiting for staff');
    const idleTile = kit.statTile('Idle staff');
    const stockTile = kit.statTile('Compounding queued');
    kpis.append(inStoreTile.root, waitingTile.root, idleTile.root, stockTile.root);
    root.appendChild(kpis);

    // --------------------- Customers and staff ---------------------
    // While the front is closed (#8): no new customers
    const frontBanner = el(
        'div',
        'callout warn',
        'Front closed: no new customers are coming in. Those inside are still served, and staff keep working. ' +
            'Open the front from the top bar; it opens again every morning.',
    );
    frontBanner.setAttribute('role', 'status');
    root.appendChild(frontBanner);

    const customersCard = kit.card('Customers', { flush: true });
    root.appendChild(customersCard.root);
    const customersTable = kit.table([
        { label: 'Customer' },
        { label: 'Prescription' },
        { label: 'Stage' },
        { label: 'Waiting', num: true, title: 'Game time since they walked in' },
        { label: 'Patience', width: '200px', title: 'Game minutes before they give up and leave' },
        { label: 'Mood', title: 'Out of 10. Happy customers raise reputation when they leave.' },
    ]);
    customersCard.body.appendChild(customersTable.root);

    const staffCard = kit.card('Staff', { flush: true });
    root.appendChild(staffCard.root);
    const staffTable = kit.table([
        { label: 'Employee' },
        { label: 'Working on' },
        { label: 'Progress', width: '220px' },
        { label: '', className: 'actions' },
    ]);
    staffCard.body.appendChild(staffTable.root);

    // --------------------- Work queue ---------------------
    let showAllStock = false;
    const stockToggle = kit.button(
        'Show all compounding',
        'ghost',
        () => {
            showAllStock = !showAllStock;
            renderQueue();
        },
        { small: true },
    );
    const queueCard = kit.card('Work queue', { flush: true, actions: [stockToggle] });
    root.appendChild(queueCard.root);
    const queueTable = kit.table([
        { label: 'Task' },
        { label: 'For' },
        { label: 'Status' },
        { label: 'Assigned to' },
        { label: 'Progress', width: '220px' },
    ]);
    queueCard.body.appendChild(queueTable.root);

    // Cells that change with the clock rather than with an announcement
    let liveCells: Array<() => void> = [];

    function employeeName(id: string | null | undefined): string {
        const emp = id ? window.employeesData.find((e) => e.id === id) : undefined;
        return emp ? `${emp.firstName} ${emp.lastName}` : '';
    }

    function customerName(id: string | undefined): string {
        const customer = id ? window.customers?.getCustomerById(id) : undefined;
        return customer ? `${customer.firstName} ${customer.lastName}` : '';
    }

    function activeTasks(): Task[] {
        return window.taskManager.tasks.filter((t) => t.status !== 'completed');
    }

    function isForStock(task: Task): boolean {
        return task.type === 'compound' && !task.prescriptionId;
    }

    // Why a queued compound hasn't started: busy equipment or materials.
    // ('' when it's only waiting for someone free.)
    function waitReason(task: Task): string {
        if (task.type !== 'compound' || task.status !== 'pending') return '';
        return window.production?.compoundWaitReason(task) ?? '';
    }

    function taskCell(task: Task): HTMLElement {
        const wrap = el('span');
        wrap.append(kit.swatch(words.taskKind(task)), words.taskLabel(task));
        return wrap;
    }

    // --------------------- Customers ---------------------
    function patienceOf(customer: Customer): { fraction: number; text: string; tone: Tone } {
        const full = window.customers.customerTypes[customer.type]?.patience || customer.patience || 1;
        const fraction = Math.max(0, Math.min(1, customer.patience / full));
        const tone: Tone = fraction > 0.5 ? 'good' : fraction > 0.25 ? 'warn' : 'critical';
        return { fraction, text: fmt.duration(customer.patience), tone };
    }

    function renderCustomers(): void {
        customersTable.clear();
        const customers = window.customers?.activeCustomers ?? [];
        customersCard.setCount(customers.length || null);

        if (customers.length === 0) {
            customersTable.empty('No customers currently.');
            return;
        }

        const prescriptions = window.prescriptions?.activePrescriptions ?? [];
        customers.forEach((customer) => {
            const prescription = prescriptions.find((p) => p.id === customer.prescriptionId);
            const name = `${customer.firstName} ${customer.lastName}`;
            const nameCell = kit.primaryCell(
                name,
                customer.isReturning ? 'Returning customer' : customer.insurance?.planName,
            );
            const prescriptionCell = prescription
                ? kit.primaryCell(
                      `${prescription.productName} ×${prescription.dosage}`,
                      `${words.prescriptionStatus(prescription.status)}${prescription.isRefill ? ' · refill' : ''}`,
                  )
                : '—';
            if (prescription && prescriptionCell instanceof HTMLElement) {
                prescriptionCell.title =
                    `${prescription.productName} ×${prescription.dosage}, ${prescription.frequency}\n` +
                    `Prescribed by ${prescription.doctorName}\n` +
                    `Prescription: ${words.prescriptionStatus(prescription.status)}\n` +
                    `Refills remaining: ${prescription.refillsAllowed}`;
            }

            const stage = words.customerStage(customer.status);
            const waiting = el('span');
            const patience = patienceOf(customer);
            const patienceCell = kit.meterCell(patience.fraction, patience.text, patience.tone);
            const moodCell = el('span');

            const update = (): void => {
                const now = window.gameState.currentDate.getTime();
                waiting.textContent = fmt.duration((now - customer.arrivedAt) / 60000);
                const p = patienceOf(customer);
                patienceCell.set(p.fraction, p.text, p.tone);
                const mood = words.mood(customer.mood);
                const moodText = `${Math.round(customer.mood)} · ${mood.label}`;
                if (moodCell.textContent !== moodText) moodCell.textContent = moodText;
                moodCell.className = mood.tone === 'neutral' ? '' : `${mood.tone}-text`;
            };
            update();
            liveCells.push(update);

            const row = customersTable.row([
                nameCell,
                prescriptionCell,
                kit.pill(stage.label, stage.tone),
                waiting,
                patienceCell.root,
                moodCell,
            ]);
            row.className = 'customer-item';
        });
    }

    // --------------------- Staff ---------------------
    // An Overtime pill that follows the clock, and Send home (highlighted in
    // overtime) for everyone working today (#7)
    function overtimeControls(emp: Employee): { pill: HTMLElement; sendHome: HTMLButtonElement } {
        const pill = el('span');
        const sendHome = kit.button('Send home', 'secondary', () => window.employees.sendHome(emp.id), {
            small: true,
            title: 'Off until tomorrow, paid their normal day. Their task goes back in the queue.',
        });
        const update = (): void => {
            const overtime = window.employees.overtimeStatus(emp) === 'overtime';
            if (overtime !== pill.childElementCount > 0) {
                pill.innerHTML = '';
                if (overtime) pill.append(' ', kit.pill('Overtime', 'critical'));
            }
            sendHome.classList.toggle('btn-primary', overtime);
        };
        update();
        liveCells.push(update);
        return { pill, sendHome };
    }

    function renderStaff(): { idle: number; sentHome: number } {
        staffTable.clear();
        let idle = 0;
        let sentHome = 0;
        window.employeesData.forEach((emp) => {
            const task = emp.currentTaskId ? window.taskManager.getTaskById(emp.currentTaskId) : undefined;
            const who = kit.primaryCell(`${emp.firstName} ${emp.lastName}`, emp.role);
            if (window.employees.isSentHome(emp)) {
                sentHome++;
                const callBack = kit.button('Call back', 'secondary', () => window.employees.callBack(emp.id), {
                    small: true,
                });
                staffTable.row([who, kit.pill('Sent home'), '', callBack]);
                return;
            }
            const controls = overtimeControls(emp);
            if (task) {
                const forWhom = customerName(task.customerId);
                const working = el('span');
                working.append(taskCell(task), controls.pill);
                if (window.employees.isGoingHome(emp)) {
                    working.appendChild(el('span', 'sub', 'Finishing up, then going home'));
                } else if (forWhom) {
                    working.appendChild(el('span', 'sub', `for ${forWhom}`));
                }
                const progress = task.status === 'inProgress' ? window.taskbars.createProgressBar(task) : '';
                staffTable.row([who, working, progress, controls.sendHome]);
            } else {
                idle++;
                const working = el('span');
                working.append(kit.pill('Idle'), controls.pill);
                staffTable.row([who, working, '', controls.sendHome]);
            }
        });
        staffCard.setCount(window.employeesData.length);
        return { idle, sentHome };
    }

    // --------------------- Queue ---------------------
    function queueRow(task: Task): void {
        const forWhom = isForStock(task) ? 'Stock' : customerName(task.customerId) || '—';
        const status = words.taskStatus(task.status);
        const reason = waitReason(task);
        const statusCell =
            task.status === 'pending-dependent'
                ? kit.pill(status, 'warn')
                : reason
                  ? kit.primaryCell(status, reason)
                  : status;
        const progress = task.status === 'inProgress' ? window.taskbars.createProgressBar(task) : '';
        queueTable.row(
            [taskCell(task), forWhom, statusCell, employeeName(task.assignedTo) || '—', progress],
            'task-entry',
        );
    }

    function byProgressThenAge(a: Task, b: Task): number {
        const rank = (t: Task) => (t.status === 'inProgress' ? 0 : t.status === 'pending' ? 1 : 2);
        return rank(a) - rank(b) || (a.createdAt ?? 0) - (b.createdAt ?? 0);
    }

    function renderQueue(): void {
        queueTable.clear();
        const tasks = activeTasks();
        queueCard.setCount(tasks.length || null);

        const customerWork = tasks.filter((t) => !isForStock(t)).sort(byProgressThenAge);
        const forStock = tasks.filter(isForStock).sort(byProgressThenAge);
        stockToggle.style.display = forStock.some((t) => t.status !== 'inProgress') ? '' : 'none';
        stockToggle.textContent = showAllStock ? 'Hide queued compounding' : 'Show all compounding';

        if (tasks.length === 0) {
            queueTable.empty('No active tasks at the moment.');
            return;
        }

        queueTable.group(`Customer work · ${customerWork.length}`);
        if (customerWork.length === 0) queueTable.empty('Nothing waiting for customers.');
        customerWork.forEach(queueRow);

        if (forStock.length > 0) {
            queueTable.group(`Compounding for stock · ${forStock.length}`);
            const running = forStock.filter((t) => t.status === 'inProgress');
            const queued = forStock.filter((t) => t.status !== 'inProgress');
            (showAllStock ? forStock : running).forEach(queueRow);
            if (!showAllStock && queued.length > 0) {
                const names = queued.map((t) => t.productName).filter(Boolean);
                const reasons = [...new Set(queued.map(waitReason).filter(Boolean))];
                const summary =
                    `${queued.length} queued: ${names.slice(0, 6).join(', ')}${names.length > 6 ? ', …' : ''}` +
                    (reasons.length ? ` · ${reasons.join('; ')}` : '');
                queueTable.note(summary);
            }
        }
    }

    // --------------------- KPIs ---------------------
    function renderKpis({ idle, sentHome }: { idle: number; sentHome: number }): void {
        const customers = window.customers?.activeCustomers ?? [];
        const ready = customers.filter((c) => c.status === 'readyForCheckout').length;
        inStoreTile.set(fmt.int(customers.length), ready > 0 ? `${ready} ready to pay` : '');

        const tasks = activeTasks();
        const waiting = tasks.filter((t) => !isForStock(t) && t.status === 'pending');
        const blocked = tasks.filter((t) => t.status === 'pending-dependent').length;
        waitingTile.set(
            fmt.int(waiting.length),
            blocked > 0 ? `${blocked} more waiting on a compound` : '',
            waiting.length > 0 && idle === 0 ? 'warn' : 'neutral',
        );

        // People sent home aren't idle; they're counted on their own
        const working = window.employeesData.length - sentHome;
        const notes = [
            idle > 0 && idle === working ? 'Nothing to do' : '',
            sentHome > 0 ? `${sentHome} sent home` : '',
        ].filter(Boolean);
        idleTile.set(`${idle} of ${working}`, notes.join(' · '));

        const forStock = tasks.filter(isForStock);
        const running = forStock.filter((t) => t.status === 'inProgress').length;
        stockTile.set(fmt.int(forStock.length), running > 0 ? `${running} being made` : '');
    }

    function renderAll(): void {
        liveCells = [];
        frontBanner.style.display = window.gameState.frontOpen === false ? '' : 'none';
        renderCustomers();
        const staff = renderStaff();
        renderQueue();
        renderKpis(staff);
    }
    renderAll();

    // Redraw when anything shown here changes (at most once a frame).
    // Progress bars follow their tasks every frame on their own (taskbars.ts),
    // and waiting time, patience and mood follow the clock.
    page.on('tasks', renderAll);
    page.on('employees', renderAll);
    page.on('customers', renderAll);
    page.on('prescriptions', renderAll);
    page.on('time', () => liveCells.forEach((update) => update()));
};
