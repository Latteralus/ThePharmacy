// taskAssignment.js

window.taskAssignment = (function (): TaskAssignmentApi {
    let assignRequested = false;

    function requestAutoAssign(): void {
        assignRequested = true;
    }

    // Called by main.ts at the end of every simulation step.
    function assignIfRequested(): void {
        if (!assignRequested) return;
        assignRequested = false;
        autoAssignTasks();
    }

    /**
     * Keeps Prescription.assignedEmployeeId in sync with a fillPrescription
     * task's own assignedTo - Task remains the source of truth, this just
     * mirrors it onto the prescription so it's no longer permanently null.
     */
    function syncPrescriptionAssignedEmployee(task: Task, employeeId: string | null): void {
        if (task.type !== 'fillPrescription' || !task.prescriptionId) return;
        const prescription = window.prescriptions?.getPrescription(task.prescriptionId);
        if (prescription) {
            prescription.assignedEmployeeId = employeeId;
        }
    }

    /**
     * Assigns a task to an employee, updating both the task and employee objects.
     */
    function assignTaskToEmployee(taskId: string, employeeId: string): boolean {
        const task = window.taskManager.tasks.find((t) => t.id === taskId);
        const employee = window.employeesData.find((emp) => emp.id === employeeId);

        if (!task) {
            console.error(`[assignTaskToEmployee] Task not found: ${taskId}`);
            return false;
        }
        if (!employee) {
            console.error(`[assignTaskToEmployee] Employee not found: ${employeeId}`);
            return false;
        }

        // Only a waiting task can be picked up. Taking a task from someone
        // else mid-way is what made duplicate tasks ping-pong (H1).
        if (task.status !== 'pending' || task.assignedTo) {
            console.warn(`[assignTaskToEmployee] Task ${task.id} is ${task.status}, not waiting for an employee.`);
            return false;
        }

        // A compound needs its equipment free (an earlier compound this
        // round may have just taken it) and takes its batch's materials as
        // it starts. If either is gone since the task was queued, it stays
        // queued.
        if (task.type === 'compound') {
            if (!window.production.canStartCompound(task)) {
                console.warn(`[assignTaskToEmployee] ${task.id} can't start: equipment or materials unavailable.`);
                return false;
            }
            if (!window.production.takeMaterials(task)) {
                console.warn(`[assignTaskToEmployee] Not enough materials to start ${task.id}.`);
                return false;
            }
        }

        // Check if employee already has a task
        if (employee.currentTaskId) {
            console.warn(
                `[assignTaskToEmployee] Employee ${employee.id} already has task ${employee.currentTaskId}. Unassigning it first.`,
            );
            const prevTask = window.taskManager.tasks.find((t) => t.id === employee.currentTaskId);
            if (prevTask && prevTask.assignedTo === employee.id) {
                unassignTask(prevTask.id);
            }
            employee.currentTaskId = null;
        }

        // Now make the new assignment
        task.assignedTo = employeeId;
        window.taskManager.setStatus(task, 'inProgress');
        employee.currentTaskId = taskId;
        syncPrescriptionAssignedEmployee(task, employeeId);

        // Set a timestamp (game time) for when the task was assigned
        task.assignedAt = window.clock.now();

        console.log(
            `[assignTaskToEmployee] Successfully assigned task ${taskId} (${task.type}) to ${employee.firstName} ${employee.lastName} (${employee.role})`,
        );
        return true;
    }

    /**
     * Unassigns an employee from a task, returning the task to 'pending' status.
     */
    function unassignTask(taskId: string): void {
        const task = window.taskManager.tasks.find((t) => t.id === taskId);
        if (!task) {
            console.error(`[unassignTask] Task not found: ${taskId}`);
            return;
        }

        // Get the assigned employee (if any)
        if (task.assignedTo) {
            const employee = window.employeesData.find((emp) => emp.id === task.assignedTo);
            if (employee) {
                console.log(
                    `[unassignTask] Clearing task ${taskId} from employee ${employee.firstName} ${employee.lastName}`,
                );
                // Only clear the employee's currentTaskId if it matches this task
                if (employee.currentTaskId === task.id) {
                    employee.currentTaskId = null;
                }
            }
        }

        // Reset the task (setStatus requests a new assignment round)
        task.assignedTo = null;
        window.taskManager.setStatus(task, 'pending');
        syncPrescriptionAssignedEmployee(task, null);
        console.log(`[unassignTask] Task ${taskId} (${task.type}) is now unassigned and pending.`);
    }

    /**
     * Sorts tasks by priority with more specific criteria:
     * 1) Customer checkout - highest priority
     * 2) Customer check-in
     * 3) Consultation
     * 4) fillPrescription
     * 5) compound for a waiting customer's prescription
     * 6) restock compound
     * 7) production
     */
    function sortTasksByPriority(unassignedTasks: Task[]): Task[] {
        return unassignedTasks.sort((a, b) => {
            // Define more specific priority based on both task type and context
            function getPriority(task: Task): number {
                if (task.interaction === 'checkout') return 0;
                if (task.interaction === 'checkIn') return 1;
                // A customer is waiting on this one; restocking can wait
                if (task.type === 'compound' && task.prescriptionId) return 4;

                // Standard priority order
                const priorityOrder: Record<string, number> = {
                    consultation: 2,
                    fillPrescription: 3,
                    compound: 5,
                    production: 6,
                };

                // Return the priority, or a low priority if not found
                return priorityOrder[task.type] !== undefined ? priorityOrder[task.type] : 99;
            }

            // Compare priorities
            const priorityA = getPriority(a);
            const priorityB = getPriority(b);

            // If priority is the same, the older task first. (Sorting by id
            // put every restock compound, compound-pd..., ahead of every
            // customer's compound, compound-pres....)
            if (priorityA === priorityB) {
                return (a.createdAt ?? 0) - (b.createdAt ?? 0) || a.id.localeCompare(b.id);
            }

            return priorityA - priorityB;
        });
    }

    /**
     * Main logic to automatically assign tasks to free employees,
     * with improved handling of customer tasks
     */
    function autoAssignTasks(): void {
        // Normalize employee roles to ensure proper assignment
        normalizeEmployeeRoles();

        // Anyone who just finished a task at their "Don't allow overtime"
        // limit goes home before the round hands out work.
        window.employees?.sendHomeAtLimit();

        // Get unassigned eligible tasks
        const unassignedTasks = window.taskManager.tasks.filter((task) => {
            // Skip tasks that are already assigned or complete
            if (task.assignedTo || task.status === 'completed') {
                return false;
            }

            // Skip tasks that aren't ready to be assigned
            if (task.status !== 'pending') {
                return false;
            }

            // A compound needs materials for its batch (it takes them when it
            // starts) and its equipment owned, working and free
            if (task.type === 'compound') {
                return window.production?.canStartCompound(task) ?? false;
            }

            // A pending fill already holds its stock (prescriptions.supplyFill).
            // takeStock covers one that somehow doesn't: it takes the stock
            // now if there's enough, and the fill waits if not.
            if (task.type === 'fillPrescription') {
                return window.production?.takeStock(task) ?? false;
            }

            // All other tasks are eligible
            return true;
        });

        if (unassignedTasks.length === 0) {
            return;
        }

        // Free employees who aren't sent home or held at their overtime limit
        const availableEmployees = window.employeesData.filter(
            (emp) => !emp.currentTaskId && (window.employees?.canTakeWork(emp) ?? true),
        );
        if (availableEmployees.length === 0) {
            return;
        }

        // First, handle prioritized tasks for Cashiers
        const cashiers = availableEmployees.filter((emp) => emp.role === 'Cashier');

        // If we have cashiers, first try to assign them to checkout tasks (highest priority)
        if (cashiers.length > 0) {
            const checkoutTasks = unassignedTasks.filter((t) => t.interaction === 'checkout');

            if (checkoutTasks.length > 0) {
                console.log(
                    `[autoAssignTasks] Found ${checkoutTasks.length} checkout tasks for ${cashiers.length} available cashiers`,
                );
                for (let i = 0; i < Math.min(cashiers.length, checkoutTasks.length); i++) {
                    if (!assignTaskToEmployee(checkoutTasks[i].id, cashiers[i].id)) continue;
                    // Remove assigned cashier from available list
                    const index = availableEmployees.indexOf(cashiers[i]);
                    if (index > -1) {
                        availableEmployees.splice(index, 1);
                    }
                }
            }
        }

        // Eligible tasks the checkout pass didn't take
        const remainingTasks = unassignedTasks.filter((t) => !t.assignedTo && t.status === 'pending');

        if (remainingTasks.length === 0 || availableEmployees.length === 0) {
            return; // Exit if no more tasks or employees
        }

        // Sort tasks by priority
        const prioritizedTasks = sortTasksByPriority(remainingTasks);

        for (const task of prioritizedTasks) {
            // Try to find the best employee for this task
            const employee = findBestEmployeeForTask(task, availableEmployees);

            // A compound whose materials an earlier compound in this round
            // just took fails here, and the employee stays free.
            if (employee && assignTaskToEmployee(task.id, employee.id)) {
                // Remove this employee from available list
                const index = availableEmployees.indexOf(employee);
                if (index > -1) {
                    availableEmployees.splice(index, 1);
                }

                // Stop if we run out of employees
                if (availableEmployees.length === 0) {
                    break;
                }
            }
        }
    }

    /**
     * Normalize employee roles to make sure they match expected values
     */
    function normalizeEmployeeRoles(): void {
        const roleMap: Record<string, string> = {
            'Sales Rep': 'Cashier',
            SalesRep: 'Cashier',
            Technician: 'Lab Technician',
            Tech: 'Lab Technician',
            LabTech: 'Lab Technician',
            Doctor: 'Pharmacist',
            PharmD: 'Pharmacist',
            Pharm: 'Pharmacist',
            'Pharmacy Tech': 'Lab Technician',
            'Pharmacist Assistant': 'Lab Technician',
            Assistant: 'Cashier',
            Clerk: 'Cashier',
            'Customer Service': 'Cashier',
            'Cashier/Sales': 'Cashier',
        };

        let normalizedCount = 0;

        window.employeesData.forEach((employee) => {
            // Check if the role needs to be normalized
            const normalizedRole = roleMap[employee.role];
            if (normalizedRole) {
                console.log(
                    `[normalizeEmployeeRoles] Normalizing employee ${employee.firstName} ${employee.lastName} role from "${employee.role}" to "${normalizedRole}"`,
                );
                employee.role = normalizedRole;
                normalizedCount++;
            }

            // Make sure roles are one of the three expected values
            if (!['Pharmacist', 'Lab Technician', 'Cashier'].includes(employee.role)) {
                console.warn(
                    `[normalizeEmployeeRoles] Employee ${employee.firstName} ${employee.lastName} has unrecognized role "${employee.role}". Defaulting to "Cashier".`,
                );
                employee.role = 'Cashier';
                normalizedCount++;
            }
        });

        if (normalizedCount > 0) {
            console.log(`[normalizeEmployeeRoles] Normalized ${normalizedCount} employee roles`);
        }
    }

    /**
     * Who may do a task, in order of preference (Phase 9, #3). This follows
     * US practice: counselling is a pharmacist's job, technicians fill and
     * compound under a pharmacist, and front-desk clerks do neither. There is
     * no "anyone free" fallback except at the desk, where everyone can ring
     * up. With nobody eligible, the task waits.
     */
    function eligibleRoles(task: Task): string[] | 'anyone' {
        // Check-in and checkout: a Cashier, then anyone free
        if (task.interaction) return 'anyone';
        switch (task.type) {
            case 'consultation':
                return ['Pharmacist'];
            case 'fillPrescription':
                return ['Lab Technician', 'Pharmacist'];
            case 'compound':
                // Restocking (and Quick Compound) is lab work only. A batch
                // can take the better part of an hour, and a pharmacist on
                // one leaves every customer waiting for a consultation. A
                // customer's own compound can still go to a pharmacist.
                return task.prescriptionId ? ['Lab Technician', 'Pharmacist'] : ['Lab Technician'];
            case 'production':
                return ['Lab Technician', 'Pharmacist'];
            default:
                return [];
        }
    }

    /**
     * The employee for a task: the first preferred role with anyone free,
     * then whoever in it works fastest.
     */
    function findBestEmployeeForTask(task: Task, availableEmployees: Employee[]): Employee | null {
        const roles = eligibleRoles(task);
        if (roles === 'anyone') {
            const cashiers = availableEmployees.filter((emp) => emp.role === 'Cashier');
            return fastest(cashiers.length > 0 ? cashiers : availableEmployees, task);
        }
        for (const role of roles) {
            const employeesWithRole = availableEmployees.filter((emp) => emp.role === role);
            if (employeesWithRole.length > 0) return fastest(employeesWithRole, task);
        }
        return null;
    }

    // Whoever does this task fastest (skill and morale, employees.workRate).
    // Ties go to the first in the list.
    function fastest(candidates: Employee[], task: Task): Employee | null {
        let best: Employee | null = null;
        let bestRate = -1;
        for (const employee of candidates) {
            const rate = window.employees.workRate(employee, task);
            if (rate > bestRate) {
                bestRate = rate;
                best = employee;
            }
        }
        return best;
    }

    // Log current task assignment state - useful for debugging
    function logTaskAssignmentState(): void {
        console.log('=== TASK ASSIGNMENT STATE ===');

        // Count employees by role
        const roleCounts: Record<string, number> = {};
        window.employeesData.forEach((emp) => {
            roleCounts[emp.role] = (roleCounts[emp.role] || 0) + 1;
        });
        console.log('Employees by role:', roleCounts);

        // Count tasks by type
        const taskTypeCounts: Record<string, number> = {};
        window.taskManager.tasks.forEach((task) => {
            taskTypeCounts[task.type] = (taskTypeCounts[task.type] || 0) + 1;
        });
        console.log('Tasks by type:', taskTypeCounts);

        // Count assigned vs unassigned tasks
        const assignedTasks = window.taskManager.tasks.filter((t) => t.assignedTo).length;
        const unassignedTasks = window.taskManager.tasks.filter((t) => !t.assignedTo && t.status === 'pending').length;
        console.log(`Assigned tasks: ${assignedTasks}, Unassigned tasks: ${unassignedTasks}`);

        // Count busy vs free employees
        const busyEmployees = window.employeesData.filter((emp) => emp.currentTaskId).length;
        const freeEmployees = window.employeesData.filter((emp) => !emp.currentTaskId).length;
        console.log(`Busy employees: ${busyEmployees}, Free employees: ${freeEmployees}`);

        // Check for role-task mismatches
        window.taskManager.tasks.forEach((task) => {
            if (task.assignedTo) {
                const emp = window.employeesData.find((e) => e.id === task.assignedTo);
                if (emp) {
                    const roles = eligibleRoles(task);
                    if (roles !== 'anyone' && !roles.includes(emp.role)) {
                        console.warn(
                            `Potential role mismatch: ${emp.firstName} ${emp.lastName} (${emp.role}) assigned to ${task.type} task`,
                        );
                    }
                }
            }
        });

        console.log('============================');
    }

    // Force task reassignment for all tasks - useful for recovery
    function forceTaskReassignment(): void {
        console.log('[forceTaskReassignment] Forcing reassignment of all tasks');

        // Clear all employee task assignments
        window.employeesData.forEach((emp) => {
            emp.currentTaskId = null;
        });

        // Reset all in-progress tasks to pending
        window.taskManager.tasks.forEach((task) => {
            if (task.status === 'inProgress') unassignTask(task.id);
        });

        autoAssignTasks();
    }

    // Expose the public interface
    return {
        assignTaskToEmployee,
        unassignTask,
        autoAssignTasks,
        requestAutoAssign,
        assignIfRequested,
        normalizeEmployeeRoles,
        eligibleRoles,
        logTaskAssignmentState,
        forceTaskReassignment,
    };
})();

// Roles are normalized at the start of every autoAssignTasks call, so newly
// hired or loaded employees are covered without a separate timer.
