// optimized-taskManager.js
// Enhanced task manager with improved performance and state management

type TaskEventListener = (data: unknown) => void;

window.taskManager = (function (): TaskManagerApi {
    // Main task storage - the source of truth for task state
    const tasks: Task[] = [];

    // Every status change goes through setStatus, which allows only these.
    // pending -> pending-dependent: a fill that turns out to lack stock
    // waits on a compound (prescriptions.supplyFill).
    const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
        'pending-dependent': ['pending'],
        pending: ['inProgress', 'pending-dependent'],
        inProgress: ['pending', 'completed'],
        completed: [],
    };

    // Event system for task state changes
    const taskEvents = {
        listeners: {} as Record<string, TaskEventListener[]>,

        // Add event listener
        on(event: string, callback: TaskEventListener): void {
            if (!this.listeners[event]) {
                this.listeners[event] = [];
            }
            this.listeners[event].push(callback);
        },

        // Remove event listener
        off(event: string, callback: TaskEventListener): void {
            if (!this.listeners[event]) return;
            this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
        },

        // Trigger event
        emit(event: string, data: unknown): void {
            if (!this.listeners[event]) return;
            this.listeners[event].forEach((callback) => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in task event listener for ${event}:`, error);
                }
            });
        },
    };

    // Add a task to the system
    function addTask(task: Task): Task {
        // Add an ID if it doesn't have one
        if (!task.id) {
            task.id = window.nextId('task');
        }

        // Make sure progress is initialized
        if (task.progress === undefined) {
            task.progress = 0;
        }

        // A task starts out waiting, never part-way through.
        if (task.status !== 'pending-dependent') {
            task.status = 'pending';
        }

        // Store task creation time (game time) for age-based prioritization
        task.createdAt = window.clock.now();

        // Add last update time for animations
        task.lastUpdateTime = task.createdAt;
        task.lastProgressTime = task.createdAt;

        // Add the task to the array
        tasks.push(task);
        console.log(`[taskManager.js] Task added: ${task.type} - ${task.id}`);

        // Log additional customer-related information
        if (task.customerId) {
            const customer = window.customers?.getCustomerById?.(task.customerId);
            if (customer) {
                console.log(
                    `[taskManager.js] Task ${task.id} is for customer ${customer.firstName} ${customer.lastName} (status: ${customer.status})`,
                );
            }
        }

        // Emit task added event
        taskEvents.emit('taskAdded', task);

        if (task.status === 'pending') {
            window.taskAssignment?.requestAutoAssign();
        }

        return task;
    }

    function setStatus(task: Task, to: TaskStatus): boolean {
        const from = task.status;
        if (from === to) return true;
        if (!TASK_TRANSITIONS[from]?.includes(to)) {
            console.warn(`[taskManager.js] Refused task ${task.id} (${task.type}) status change ${from} -> ${to}`);
            return false;
        }

        task.status = to;
        taskEvents.emit('taskStatusChanged', { task, previousStatus: from, newStatus: to });
        if (to === 'pending') {
            window.taskAssignment?.requestAutoAssign();
        }
        return true;
    }

    function removeTask(task: Task): void {
        const index = tasks.indexOf(task);
        if (index > -1) tasks.splice(index, 1);
    }

    function cancelTask(taskId: string): void {
        const task = getTaskById(taskId);
        if (!task) return;

        if (task.assignedTo) {
            const employee = window.employeesData?.find((emp) => emp.id === task.assignedTo);
            if (employee && employee.currentTaskId === task.id) {
                employee.currentTaskId = null;
                window.taskAssignment?.requestAutoAssign();
            }
            task.assignedTo = null;
        }
        window.production?.returnStock(task);
        window.production?.returnMaterials(task);
        removeTask(task);
        console.log(`[taskManager.js] Task cancelled: ${task.type} - ${task.id}`);
        taskEvents.emit('taskCancelled', task);

        // A fill waiting on this compound would never start.
        tasks.filter((t) => t.dependencyTaskId === task.id).forEach((dependent) => cancelTask(dependent.id));
    }

    // A compound finished: the fills waiting on it take their stock (it
    // made exactly what they need) and become ready.
    function releaseDependents(task: Task): void {
        tasks
            .filter((t) => t.dependencyTaskId === task.id && t.status === 'pending-dependent')
            .forEach((dependent) => window.prescriptions.supplyFill(dependent));
    }

    // Get a task by ID - optimized with caching
    function getTaskById(taskId: string): Task | undefined {
        // Use find since we don't maintain a lookup map
        return tasks.find((t) => t.id === taskId);
    }

    // Get all tasks that are unassigned and pending
    function getUnassignedTasks(): Task[] {
        return tasks.filter((t) => !t.assignedTo && t.status === 'pending');
    }

    // Get all tasks assigned to a specific employee
    function getTasksForEmployee(empId: string): Task[] {
        return tasks.filter((t) => t.assignedTo === empId && t.status !== 'completed');
    }

    // Get all tasks for a specific customer
    function getTasksForCustomer(customerId: string): Task[] {
        return tasks.filter((t) => t.customerId === customerId && t.status !== 'completed');
    }

    // Update task progress based on elapsed game time
    function updateTasks(minutes: number): void {
        if (!minutes || minutes <= 0) {
            return; // Skip if no time has passed
        }

        // Track tasks to finalize after the loop
        const tasksToFinalize: Task[] = [];

        // Current game time for update tracking
        const now = window.clock.now();

        // Process each task in the array
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];

            // Only process tasks that are in progress and have an assigned employee
            if (task.status === 'inProgress' && task.assignedTo) {
                // Verify the assigned employee still has this task
                const employee = window.employeesData?.find((emp) => emp.id === task.assignedTo);

                if (!employee || employee.currentTaskId !== task.id) {
                    console.warn(
                        `[taskManager.js] Employee ${task.assignedTo} is missing or not working on task ${task.id}; unassigning.`,
                    );
                    window.taskAssignment.unassignTask(task.id);
                    continue;
                }

                // No stock or materials check here: a fill holds its product
                // and a compound its materials from before it starts.

                const previousProgress = task.progress;
                task.progress += minutes;
                task.lastProgressTime = now;

                taskEvents.emit('taskProgressUpdated', {
                    task: task,
                    previousProgress: previousProgress,
                    currentProgress: task.progress,
                    deltaProgress: minutes,
                });

                // Check if the task is now complete
                if (task.progress >= task.totalTime) {
                    console.log(`[taskManager.js] Task ${task.id} (${task.type}) is now complete!`);
                    setStatus(task, 'completed');

                    // Add to finalization list rather than finalizing here
                    // to avoid modifying the tasks array during iteration
                    tasksToFinalize.push(task);
                }
            }
            // pending-dependent tasks are released by the task they wait on
            // (finalizeTask -> releaseDependents), not polled here.
        }

        tasksToFinalize.forEach(finalizeTask);
    }

    // Finalize a completed task (called after updateTasks)
    function finalizeTask(task: Task): void {
        if (!task) {
            console.error(`[finalizeTask] Attempted to finalize undefined or null task`);
            return;
        }

        console.log(`[finalizeTask] Finalizing task: ${task.id} (${task.type}), assignedTo: ${task.assignedTo}`);

        try {
            // Find the employee assigned to this task
            let employee: Employee | null = null;
            if (task.assignedTo) {
                employee = window.employeesData?.find((emp) => emp.id === task.assignedTo) ?? null;
                if (employee) {
                    // Update employee morale and mood based on task completion
                    if (window.employees && typeof window.employees.updateEmployeeMoodOnTaskCompletion === 'function') {
                        try {
                            window.employees.updateEmployeeMoodOnTaskCompletion(employee.id, task.type);
                        } catch (error) {
                            console.error(`[finalizeTask] Error updating employee mood: ${(error as Error).message}`);
                        }
                    }

                    // Free the employee by clearing their currentTaskId
                    employee.currentTaskId = null;
                    window.taskAssignment?.requestAutoAssign();
                    console.log(`[finalizeTask] Employee ${employee.firstName} ${employee.lastName} is now free.`);
                } else {
                    console.error(`[finalizeTask] Employee with ID ${task.assignedTo} not found!`);
                }

                // Clear task assignment
                task.assignedTo = null;
            }

            // Handle production-related task completion (inventory updates)
            if (window.production && typeof window.production.handleTaskCompletion === 'function') {
                try {
                    window.production.handleTaskCompletion(task);
                } catch (error) {
                    console.error(
                        `[finalizeTask] Error in production.handleTaskCompletion: ${(error as Error).message}`,
                    );
                }
            }

            // What finishing this task means for its customer. The customer
            // state machine refuses an event their status doesn't allow.
            if (task.type === 'fillPrescription' && task.customerId && task.prescriptionId) {
                window.prescriptions.prescriptionFilled(task.prescriptionId, task.customerId);
            } else if (task.type === 'customerInteraction' && task.customerId) {
                window.customers.advance(task.customerId, task.interaction === 'checkout' ? 'paid' : 'checkedIn');
            } else if (task.type === 'consultation' && task.customerId) {
                window.customers.advance(task.customerId, 'consulted');
            } else if (task.type === 'compound') {
                releaseDependents(task);
            }

            // Emit task completed event
            taskEvents.emit('taskCompleted', task);

            removeTask(task);
            console.log(`[finalizeTask] Task ${task.id} removed from task list.`);
        } catch (error) {
            console.error(`[finalizeTask] Uncaught error finalizing task ${task.id}: ${(error as Error).message}`);
        }
    }

    // Debug function to track task status
    function debugTaskStatus(): void {
        console.log('=== TASK SYSTEM DEBUG ===');
        console.log(`Total tasks: ${tasks.length}`);

        // Count tasks by type and status
        const taskCounts: Record<string, number> = {};
        tasks.forEach((task) => {
            if (!task) return; // Skip null/undefined tasks
            const key = `${task.type}_${task.status}`;
            taskCounts[key] = (taskCounts[key] || 0) + 1;
        });

        console.log('Task counts by type and status:', taskCounts);

        // Check for any customer with no active tasks
        if (window.customers && window.customers.activeCustomers) {
            const customersWithNoTasks = window.customers.activeCustomers.filter((customer) => {
                if (!customer) return false;
                const customerTasks = tasks.filter(
                    (t) => t && t.customerId === customer.id && t.status !== 'completed',
                );
                return customerTasks.length === 0;
            });

            if (customersWithNoTasks.length > 0) {
                console.warn(`${customersWithNoTasks.length} customers have no active tasks!`);
                customersWithNoTasks.forEach((c) => {
                    if (c) {
                        console.warn(`Customer ${c.id} (${c.firstName} ${c.lastName}) - Status: ${c.status}`);
                    }
                });
            }
        }

        // Check for idle employees
        if (window.employeesData) {
            const idleEmployees = window.employeesData.filter((emp) => emp && !emp.currentTaskId);
            console.log(`${idleEmployees.length}/${window.employeesData.length} employees are idle`);

            // Check for employees with invalid task assignments
            const employeesWithInvalidTasks = window.employeesData.filter((emp) => {
                if (!emp || !emp.currentTaskId) return false; // No task assigned
                const task = tasks.find((t) => t && t.id === emp.currentTaskId);
                return !task || task.assignedTo !== emp.id;
            });

            if (employeesWithInvalidTasks.length > 0) {
                console.error(`${employeesWithInvalidTasks.length} employees have invalid task assignments!`);
                employeesWithInvalidTasks.forEach((emp) => {
                    if (emp) {
                        console.error(
                            `Employee ${emp.firstName} ${emp.lastName} has task ID ${emp.currentTaskId} but task doesn't exist or isn't assigned to them.`,
                        );
                        // Fix the employee
                        emp.currentTaskId = null;
                    }
                });
            }
        }

        console.log('========================');
    }

    // Add an event listener for task events
    function addEventListener(event: string, callback: TaskEventListener): void {
        if (typeof callback !== 'function') {
            console.error(`[taskManager.js] Cannot add event listener: callback is not a function`);
            return;
        }
        taskEvents.on(event, callback);
    }

    // Remove an event listener
    function removeEventListener(event: string, callback: TaskEventListener): void {
        if (typeof callback !== 'function') {
            console.error(`[taskManager.js] Cannot remove event listener: callback is not a function`);
            return;
        }
        taskEvents.off(event, callback);
    }

    // Expose the public API
    return {
        tasks,
        addTask,
        getTaskById,
        getUnassignedTasks,
        getTasksForEmployee,
        getTasksForCustomer,
        updateTasks,
        setStatus,
        cancelTask,
        debugTaskStatus,
        addEventListener,
        removeEventListener,

        // Constants for events
        EVENTS: {
            TASK_ADDED: 'taskAdded',
            TASK_COMPLETED: 'taskCompleted',
            TASK_PROGRESS_UPDATED: 'taskProgressUpdated',
            TASK_STATUS_CHANGED: 'taskStatusChanged',
        },
    };
})();

// Set up run-time verification of task integrity
(function () {
    // Once as soon as the game is running (frees employees whose loaded
    // currentTaskId points at a task that wasn't saved), then every game
    // hour (was every real minute - the same at 1x). On the game clock, so
    // it doesn't run while paused or during the end-of-day summary.
    window.clock.after(0, runTaskSystemIntegrityCheck);
    window.clock.every(60, runTaskSystemIntegrityCheck);

    // Function to thoroughly check and fix task system issues
    function runTaskSystemIntegrityCheck(): void {
        console.log('[taskManager.js] Running task system integrity check');

        try {
            // Skip if task system isn't ready
            if (!window.taskManager || !window.taskManager.tasks) {
                console.log('[taskManager.js] Task system not ready for integrity check');
                return;
            }

            // 1. Verify all employees with tasks have valid references
            let fixedEmployeeCount = 0;

            if (window.employeesData) {
                window.employeesData.forEach((employee) => {
                    if (!employee) return; // Skip null/undefined employees

                    if (employee.currentTaskId) {
                        const task = window.taskManager.getTaskById(employee.currentTaskId);

                        // If task doesn't exist or isn't assigned to this employee
                        if (!task || task.assignedTo !== employee.id) {
                            console.warn(
                                `Task integrity error: Employee ${employee.id} (${employee.firstName} ${employee.lastName}) has task ${employee.currentTaskId} but task doesn't exist or isn't assigned correctly.`,
                            );

                            // Fix the employee state
                            employee.currentTaskId = null;
                            fixedEmployeeCount++;
                        }
                    }
                });

                if (fixedEmployeeCount > 0) {
                    console.log(`[taskManager.js] Fixed ${fixedEmployeeCount} employees with invalid task references`);
                }
            }

            // 2. Verify all in-progress tasks have valid employee assignments
            let fixedTaskCount = 0;

            [...window.taskManager.tasks].forEach((task) => {
                if (task.status === 'inProgress' && task.assignedTo) {
                    const employee = window.employeesData?.find((e) => e && e.id === task.assignedTo);

                    // If employee doesn't exist or isn't assigned to this task
                    if (!employee || employee.currentTaskId !== task.id) {
                        console.warn(
                            `Task integrity error: Task ${task.id} (${task.type}) is assigned to employee ${task.assignedTo} but employee doesn't exist or isn't assigned to this task.`,
                        );
                        window.taskAssignment.unassignTask(task.id);
                        fixedTaskCount++;
                    }
                }
            });

            if (fixedTaskCount > 0) {
                console.log(`[taskManager.js] Fixed ${fixedTaskCount} tasks with invalid employee assignments`);
            }

            // 3. Every customer has the tasks their status needs. With the
            // state machines this should find nothing; it's here for loads
            // of older saves.
            const repaired = window.customers.reconcileTasks();
            if (repaired > 0) {
                console.warn(`[taskManager.js] Integrity check repaired ${repaired} missing customer tasks`);
            }

            // 4. Freed employees can pick up work at the end of this step
            if (fixedEmployeeCount > 0) {
                window.taskAssignment.requestAutoAssign();
            }

            console.log('[taskManager.js] Task system integrity check completed');
        } catch (error) {
            console.error('[taskManager.js] Error during task system integrity check:', error);
        }
    }
})();
