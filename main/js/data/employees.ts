// /js/data/employees.js
//
// Staff matter (findings M7, Phase 7):
// - Speed. A task advances at workRate game minutes of work per game minute:
//   the skill the task uses (0 → 0.5×, 50 → 1×, 100 → 1.5×), slowed when
//   morale is below 50 (down to 0.7× at 0).
// - Morale changes once a day, at closing (endOfDay): rest or overwork,
//   and pay against the market rate for their role and skill. Below 25
//   they may quit overnight.

// A new game starts with no staff: the player hires them. A loaded save
// replaces this with its own staff.
window.employeesData = [];

// Morale, once a day at closing
const REST_HOURS = 8; // up to this many hours worked: rested
const RESTED_GAIN = 2;
const OVERWORK_LOSS_PER_HOUR = 1.5; // per hour over REST_HOURS
const PAY_SENSITIVITY = 8; // morale per 100% over or under the market rate
const PAY_MAX_GAIN = 2;
const PAY_MAX_LOSS = 3;
const LOW_MORALE = 40; // the player is warned below this
const QUIT_BELOW = 25; // nightly chance to quit: (QUIT_BELOW - morale) / QUIT_SCALE
const QUIT_SCALE = 50;
const NEW_HIRE_MORALE = 80;

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
            const hours = (employee.minutesWorkedToday ?? 0) / 60;
            const before = employee.morale;
            const reasons: string[] = [];

            const workload = hours > REST_HOURS ? -OVERWORK_LOSS_PER_HOUR * (hours - REST_HOURS) : RESTED_GAIN;
            if (hours > REST_HOURS) reasons.push(`overworked (${hours.toFixed(1)}h)`);

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
};
