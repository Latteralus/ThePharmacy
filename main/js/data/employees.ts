// /js/data/employees.js
//
// Staff matter (findings M7, Phase 7):
// - Speed. A task advances at workRate game minutes of work per game minute:
//   the skill the task uses (0 → 0.5×, 50 → 1×, 100 → 1.5×), slowed when
//   morale is below 50 (down to 0.7× at 0).
// - Morale changes once a day, at closing (endOfDay): rest or overtime,
//   and pay against the market rate for their role and skill. Below 25
//   they may quit overnight.
// - Overtime (Phase 9, #7): past 8 hours in a day or 40 straight hours in
//   the week (finances.overtimeSplit), for pay and morale alike. The player
//   can send someone home for the day, or set "Don't allow overtime": at
//   the limit they take no new task, finish the one they're on, then go home.

// A new game starts with no staff: the player hires them. A loaded save
// replaces this with its own staff.
window.employeesData = [];

// Morale, once a day at closing
const RESTED_GAIN = 2; // a day with no overtime
const OVERWORK_LOSS_PER_HOUR = 1.5; // per overtime hour, daily or weekly
const PAY_SENSITIVITY = 8; // morale per 100% over or under the market rate
const PAY_MAX_GAIN = 2;
const PAY_MAX_LOSS = 3;
const LOW_MORALE = 40; // the player is warned below this
const QUIT_BELOW = 25; // nightly chance to quit: (QUIT_BELOW - morale) / QUIT_SCALE
const QUIT_SCALE = 50;
const NEW_HIRE_MORALE = 80;

// "Approaching overtime" from this many hours today, or straight hours this week
const APPROACHING_DAY_HOURS = 7;
const APPROACHING_WEEK_HOURS = 36;

// The roles that can do clinical and lab work (#3)
const CAN_CONSULT = ['Pharmacist'];
const CAN_FILL_OR_COMPOUND = ['Lab Technician', 'Pharmacist'];

function hoursToday(employee: Employee): number {
    return (employee.minutesWorkedToday ?? 0) / 60;
}

function straightHoursThisWeek(employee: Employee): number {
    return (employee.straightMinutesThisWeek ?? 0) / 60;
}

window.employees = {
    lastDayReport: [],

    // Get an employee by ID
    getEmployeeById(employeeId) {
        return window.employeesData.find((employee) => employee.id === employeeId);
    },

    // Get an employee's full name
    getEmployeeFullName(employee) {
        return `${employee.firstName} ${employee.lastName}`;
    },

    // The skill a task uses, 0-100
    taskSkill(employee, task) {
        const skills = employee.skills;
        if (!skills) return 50;
        switch (task.type) {
            case 'compound':
                return skills.compounding;
            case 'fillPrescription':
                return skills.dispensing;
            case 'consultation':
                return (skills.dispensing + skills.customerService) / 2;
            case 'customerInteraction':
                return skills.customerService;
            default:
                return 50;
        }
    },

    // Game minutes of work done per game minute on this task
    workRate(employee, task) {
        const skill = Math.min(100, Math.max(0, this.taskSkill(employee, task)));
        const morale = Math.min(100, Math.max(0, employee.morale));
        const moraleFactor = morale >= 50 ? 1 : 0.7 + (0.3 * morale) / 50;
        return (0.5 + skill / 100) * moraleFactor;
    },

    updateEmployeeMorale(employeeId, moraleChange) {
        const employee = this.getEmployeeById(employeeId);
        if (employee) {
            employee.morale = Math.max(0, Math.min(100, employee.morale + moraleChange));
        }
    },

    // Pay against the market rate: 0.1 is 10% over
    payVsMarket(employee) {
        const fair = window.helpers.fairSalary(employee);
        return fair > 0 ? employee.salary / fair - 1 : 0;
    },

    // Closing time: today's hours and pay move each employee's morale, and
    // anyone whose morale is very low may quit. Wages for the day are
    // charged before this (finances.applyDailyCosts), so a quitter is paid.
    endOfDay() {
        const report: StaffDayReport[] = [];

        [...window.employeesData].forEach((employee) => {
            const hours = hoursToday(employee);
            const before = employee.morale;
            const reasons: string[] = [];

            // Every overtime hour, daily or weekly, costs morale; only a day
            // with none is restful.
            const overtime = window.finances.overtimeHours(employee);
            const workload = overtime > 0 ? -OVERWORK_LOSS_PER_HOUR * overtime : RESTED_GAIN;
            if (overtime > 0) {
                const week =
                    window.finances.overtimeSplit(employee).weekly > 0
                        ? `, ${((employee.minutesWorkedThisWeek ?? 0) / 60).toFixed(1)}h this week`
                        : '';
                reasons.push(`overworked (${hours.toFixed(1)}h${week})`);
            }

            const pay = this.payVsMarket(employee);
            const payChange = Math.max(-PAY_MAX_LOSS, Math.min(PAY_MAX_GAIN, PAY_SENSITIVITY * pay));
            if (pay <= -0.05) reasons.push(`paid ${Math.round(-pay * 100)}% under market`);
            else if (pay >= 0.05) reasons.push(`paid ${Math.round(pay * 100)}% over market`);

            this.updateEmployeeMorale(employee.id, workload + payChange);
            employee.minutesWorkedToday = 0;

            const name = this.getEmployeeFullName(employee);
            const entry: StaffDayReport = {
                id: employee.id,
                name,
                role: employee.role,
                hoursWorked: hours,
                overtimeHours: overtime,
                moraleBefore: before,
                moraleAfter: employee.morale,
                reasons,
                quit: false,
            };
            report.push(entry);

            if (employee.morale < QUIT_BELOW && Math.random() < (QUIT_BELOW - employee.morale) / QUIT_SCALE) {
                entry.quit = true;
                this.removeEmployee(employee.id);
                window.notifications?.add(
                    `${name} quit (morale ${Math.round(employee.morale)}%${reasons.length ? `: ${reasons.join(', ')}` : ''}).`,
                    'error',
                );
            } else if (before >= LOW_MORALE && employee.morale < LOW_MORALE) {
                window.notifications?.add(
                    `${name}'s morale is low (${Math.round(employee.morale)}%${reasons.length ? `: ${reasons.join(', ')}` : ''}). Below ${QUIT_BELOW}% they may quit.`,
                    'warning',
                );
            }
        });

        this.lastDayReport = report;
        window.updateUI('employees');
        return report;
    },

    // A raise (or a cut). Morale responds at the next closing time.
    setSalary(employeeId, salary) {
        const employee = this.getEmployeeById(employeeId);
        if (!employee || !Number.isFinite(salary) || salary <= 0) return false;
        employee.salary = Math.round(salary);
        window.updateUI('employees');
        return true;
    },

    // Hire an employee
    hireEmployee(role, skillLevel) {
        const hiringFee = 500;
        const paid = window.finances.transact({
            type: 'expense',
            category: 'hiring',
            amount: hiringFee,
            description: `Hiring fee for new ${skillLevel} ${role}`,
            requireFunds: true,
        });
        if (paid) {
            // Generate candidates
            const candidates: Employee[] = [];
            for (let i = 0; i < 5; i++) {
                const skills: Partial<EmployeeSkills> = {};
                if (role === 'Pharmacist') {
                    skills.compounding = skillLevel === 'Novice' ? 40 : skillLevel === 'Intermediate' ? 60 : 80;
                    skills.dispensing = skillLevel === 'Novice' ? 50 : skillLevel === 'Intermediate' ? 70 : 90;
                    skills.customerService = skillLevel === 'Novice' ? 40 : skillLevel === 'Intermediate' ? 60 : 80;
                    skills.inventoryManagement = skillLevel === 'Novice' ? 30 : skillLevel === 'Intermediate' ? 50 : 70;
                    skills.sales = skillLevel === 'Novice' ? 30 : skillLevel === 'Intermediate' ? 50 : 70;
                } else if (role === 'Lab Technician') {
                    skills.compounding = skillLevel === 'Novice' ? 50 : skillLevel === 'Intermediate' ? 70 : 90;
                    skills.dispensing = skillLevel === 'Novice' ? 30 : skillLevel === 'Intermediate' ? 50 : 70;
                    skills.customerService = skillLevel === 'Novice' ? 20 : skillLevel === 'Intermediate' ? 40 : 60;
                    skills.inventoryManagement = skillLevel === 'Novice' ? 40 : skillLevel === 'Intermediate' ? 60 : 80;
                    skills.sales = skillLevel === 'Novice' ? 10 : skillLevel === 'Intermediate' ? 20 : 30;
                } else if (role === 'Cashier') {
                    // Replaces 'Sales Rep'
                    skills.compounding = skillLevel === 'Novice' ? 10 : skillLevel === 'Intermediate' ? 20 : 30;
                    skills.dispensing = skillLevel === 'Novice' ? 20 : skillLevel === 'Intermediate' ? 40 : 60;
                    skills.customerService = skillLevel === 'Novice' ? 50 : skillLevel === 'Intermediate' ? 70 : 90;
                    skills.inventoryManagement = skillLevel === 'Novice' ? 30 : skillLevel === 'Intermediate' ? 50 : 70;
                    skills.sales = skillLevel === 'Novice' ? 20 : skillLevel === 'Intermediate' ? 40 : 60;
                }

                candidates.push({
                    id: window.helpers.generateNewEmployeeId(),
                    firstName: window.helpers.generateFirstName(),
                    lastName: window.helpers.generateLastName(),
                    role: role,
                    salary: window.helpers.calculateStartingWage(role, skillLevel),
                    // Same edge case the original had: an unrecognized `role`
                    // leaves `skills` empty (`{}`), not a full EmployeeSkills —
                    // preserved as-is rather than guarded against.
                    skills: skills as EmployeeSkills,
                    morale: NEW_HIRE_MORALE,
                    hireDate: new Date(window.gameState.currentDate),
                    currentTaskId: null,
                });
            }

            console.log('Candidates generated:', candidates);
            window.displayEmployeeCandidates(candidates);
        } else {
            window.toast(`Not enough cash for the ${window.fmt.money(hiringFee)} job posting fee.`, 'error');
        }
    },

    // Add an employee to the employeesData array
    hireSelectedEmployee(employeeData) {
        window.employeesData.push(employeeData);
        window.taskAssignment.requestAutoAssign();
        window.updateUI('employees');
        window.toast(
            `Hired ${employeeData.firstName} ${employeeData.lastName} as ${employeeData.role} at ${window.fmt.moneyWhole(employeeData.salary)} a year.`,
            'success',
        );
    },

    // Fire an employee
    fireEmployee(employeeId) {
        if (this.removeEmployee(employeeId)) {
            console.log(`Employee with ID ${employeeId} has been fired.`);
        } else {
            console.error(`Employee not found with ID: ${employeeId}`);
        }
    },

    // Fired or quit: their task goes back in the queue for someone else.
    removeEmployee(employeeId) {
        const employeeIndex = window.employeesData.findIndex((emp) => emp.id === employeeId);
        if (employeeIndex === -1) return false;
        const taskId = window.employeesData[employeeIndex].currentTaskId;
        if (taskId) window.taskAssignment.unassignTask(taskId);
        window.employeesData.splice(employeeIndex, 1);
        window.updateUI('employees');
        return true;
    },

    // ---------------- Hours and overtime (Phase 9, #7) ----------------

    // Game minutes on a task, counted today, this week, and as straight time
    // (up to 8 hours a day). Tells the player the first time each day someone
    // goes into overtime, unless they're set to go home at their limit.
    recordWork(employee, minutes) {
        const wasInOvertime = this.overtimeStatus(employee) === 'overtime';
        const dayLimit = window.finances.OVERTIME_AFTER_HOURS * 60;
        const before = employee.minutesWorkedToday ?? 0;
        const after = before + minutes;
        employee.minutesWorkedToday = after;
        employee.minutesWorkedThisWeek = (employee.minutesWorkedThisWeek ?? 0) + minutes;
        employee.straightMinutesThisWeek =
            (employee.straightMinutesThisWeek ?? 0) +
            Math.max(0, Math.min(after, dayLimit) - Math.min(before, dayLimit));

        const day = window.gameState?.dayIndex;
        if (
            !wasInOvertime &&
            !employee.noOvertime &&
            employee.overtimeNotifiedDay !== day &&
            this.overtimeStatus(employee) === 'overtime'
        ) {
            employee.overtimeNotifiedDay = day;
            window.notifications?.add(
                `${this.getEmployeeFullName(employee)} is in overtime, paid at ${window.finances.OVERTIME_RATE}× and hard on morale. You can send them home from the Employees page.`,
                'warning',
            );
            window.updateUI('employees');
        }
    },

    overtimeStatus(employee) {
        const today = hoursToday(employee);
        const week = straightHoursThisWeek(employee);
        if (today > window.finances.OVERTIME_AFTER_HOURS || week > window.finances.OVERTIME_WEEK_HOURS) {
            return 'overtime';
        }
        if (today >= APPROACHING_DAY_HOURS || week >= APPROACHING_WEEK_HOURS) return 'approaching';
        return 'none';
    },

    atOvertimeLimit(employee) {
        return (
            hoursToday(employee) >= window.finances.OVERTIME_AFTER_HOURS ||
            straightHoursThisWeek(employee) >= window.finances.OVERTIME_WEEK_HOURS
        );
    },

    isSentHome(employee) {
        return employee.offUntilDay !== undefined && window.gameState.dayIndex < employee.offUntilDay;
    },

    isGoingHome(employee) {
        return (
            !!employee.noOvertime &&
            !!employee.currentTaskId &&
            !this.isSentHome(employee) &&
            this.atOvertimeLimit(employee)
        );
    },

    canTakeWork(employee) {
        return !this.isSentHome(employee) && !(employee.noOvertime && this.atOvertimeLimit(employee));
    },

    // They're paid their normal day (wages are a flat daily amount): going
    // home only stops further overtime pay and morale loss.
    sendHome(employeeId, auto = false) {
        const employee = this.getEmployeeById(employeeId);
        if (!employee || this.isSentHome(employee)) return false;
        employee.offUntilDay = window.gameState.dayIndex + 1;
        // Back in the queue with its progress: a compound keeps its
        // materials and a fill its stock.
        if (employee.currentTaskId) window.taskAssignment.unassignTask(employee.currentTaskId);
        if (auto) {
            const overtime = window.finances.overtimeHours(employee);
            window.notifications?.add(
                `${this.getEmployeeFullName(employee)} went home at their overtime limit (${overtime.toFixed(1)}h overtime).`,
                'info',
            );
        }
        window.updateUI('employees');
        return true;
    },

    callBack(employeeId) {
        const employee = this.getEmployeeById(employeeId);
        if (!employee || !this.isSentHome(employee)) return false;
        delete employee.offUntilDay;
        window.taskAssignment.requestAutoAssign();
        window.updateUI('employees');
        return true;
    },

    setNoOvertime(employeeId, on) {
        const employee = this.getEmployeeById(employeeId);
        if (!employee) return;
        employee.noOvertime = on;
        // Already at the limit: idle, they go now; busy, after this task.
        if (on) this.sendHomeAtLimit();
        else window.taskAssignment.requestAutoAssign();
        window.updateUI('employees');
    },

    // Runs at the start of every assignment round, and one follows every
    // task an employee finishes or drops.
    sendHomeAtLimit() {
        window.employeesData.forEach((employee) => {
            if (
                employee.noOvertime &&
                !employee.currentTaskId &&
                !this.isSentHome(employee) &&
                this.atOvertimeLimit(employee)
            ) {
                this.sendHome(employee.id, true);
            }
        });
    },

    startNewDay(date) {
        window.employeesData.forEach((employee) => {
            if (employee.offUntilDay !== undefined && !this.isSentHome(employee)) delete employee.offUntilDay;
            if (date.getDay() === 0) {
                employee.minutesWorkedThisWeek = 0;
                employee.straightMinutesThisWeek = 0;
            }
        });
    },

    staffingWarnings() {
        const warnings: string[] = [];
        if (window.employeesData.length === 0) return warnings;
        const roles = new Set(window.employeesData.map((e) => e.role));
        if (!CAN_CONSULT.some((role) => roles.has(role))) {
            warnings.push("No pharmacist on staff: customers can't get consultations.");
        }
        if (!CAN_FILL_OR_COMPOUND.some((role) => roles.has(role))) {
            warnings.push('No lab technician or pharmacist on staff: no one can fill or compound prescriptions.');
        }
        return warnings;
    },
};
