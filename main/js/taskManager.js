// optimized-taskManager.js
// Enhanced task manager with improved performance and state management

window.taskManager = (function() {
    // Main task storage - the source of truth for task state
    const tasks = [];
    
    // Event system for task state changes
    const taskEvents = {
        listeners: {},
        
        // Add event listener
        on(event, callback) {
            if (!this.listeners[event]) {
                this.listeners[event] = [];
            }
            this.listeners[event].push(callback);
        },
        
        // Remove event listener
        off(event, callback) {
            if (!this.listeners[event]) return;
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        },
        
        // Trigger event
        emit(event, data) {
            if (!this.listeners[event]) return;
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in task event listener for ${event}:`, error);
                }
            });
        }
    };
    
    // Progress verification storage
    const progressVerification = {
        lastUpdates: {}, // Stores last update time by task ID
        expectedProgress: {}, // Stores expected progress by task ID
        anomalies: [], // Tracks progress anomalies
        
        // Add or update progress tracking for a task
        trackTask(taskId, currentProgress, minutes) {
            if (!this.lastUpdates[taskId]) {
                // First time tracking this task
                this.lastUpdates[taskId] = Date.now();
                this.expectedProgress[taskId] = currentProgress;
            } else {
                // Calculate expected progress based on minutes
                this.expectedProgress[taskId] += minutes;
                
                // Update timestamp
                this.lastUpdates[taskId] = Date.now();
            }
        },
        
        // Verify that progress matches expected value
        verifyProgress(taskId, actualProgress) {
            if (this.expectedProgress[taskId] === undefined) return true;
            
            // Allow small floating point differences (0.001 tolerance)
            const tolerance = 0.001;
            const difference = Math.abs(actualProgress - this.expectedProgress[taskId]);
            
            if (difference > tolerance) {
                // Progress anomaly detected
                const anomaly = {
                    taskId,
                    expected: this.expectedProgress[taskId],
                    actual: actualProgress,
                    difference,
                    timestamp: Date.now()
                };
                
                this.anomalies.push(anomaly);
                console.warn(`[taskManager.js] Progress anomaly detected for task ${taskId}: Expected ${this.expectedProgress[taskId].toFixed(2)}, Actual ${actualProgress.toFixed(2)}, Difference ${difference.toFixed(3)}`);
                
                // Keep anomaly list manageable
                if (this.anomalies.length > 100) {
                    this.anomalies.shift(); // Remove oldest anomaly
                }
                
                return false;
            }
            
            return true;
        },
        
        // Clear tracking for a task
        clearTask(taskId) {
            delete this.lastUpdates[taskId];
            delete this.expectedProgress[taskId];
        },
        
        // Get verification statistics
        getStats() {
            return {
                trackedTasks: Object.keys(this.lastUpdates).length,
                anomaliesDetected: this.anomalies.length,
                latestAnomalies: this.anomalies.slice(-5) // Last 5 anomalies
            };
        }
    };
    
    // Add a task to the system
    function addTask(task) {
        // Add an ID if it doesn't have one
        if (!task.id) {
            task.id = `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        }
        
        // Make sure progress is initialized
        if (task.progress === undefined) {
            task.progress = 0;
        }
        
        // Set initial status if not specified
        if (!task.status) {
            task.status = 'pending';
        }
        
        // Store task creation time for age-based prioritization
        task.createdAt = Date.now();
        
        // Add last update time for animations
        task.lastUpdateTime = Date.now();
        task.lastProgressTime = Date.now();
        
        // Add the task to the array
        tasks.push(task);
        console.log(`[taskManager.js] Task added: ${task.type} - ${task.id}`);
        
        // Log additional customer-related information
        if (task.customerId) {
            const customer = window.customers?.getCustomerById?.(task.customerId);
            if (customer) {
                console.log(`[taskManager.js] Task ${task.id} is for customer ${customer.firstName} ${customer.lastName} (status: ${customer.status})`);
            }
        }
        
        // Emit task added event
        taskEvents.emit('taskAdded', task);
        
        // Auto-assign tasks when a new one is added (with a small delay to batch multiple adds)
        if (window.taskAssignment && typeof window.taskAssignment.autoAssignTasks === 'function') {
            clearTimeout(window._taskAssignTimeout);
            window._taskAssignTimeout = setTimeout(() => {
                window.taskAssignment.autoAssignTasks();
            }, 100);
        }
        
        return task;
    }

    // Get a task by ID - optimized with caching
    function getTaskById(taskId) {
        // Use find since we don't maintain a lookup map
        return tasks.find(t => t.id === taskId);
    }

    // Get all tasks that are unassigned and pending
    function getUnassignedTasks() {
        return tasks.filter(t => !t.assignedTo && t.status === 'pending');
    }

    // Get all tasks assigned to a specific employee
    function getTasksForEmployee(empId) {
        return tasks.filter(t => t.assignedTo === empId && t.status !== 'completed');
    }

    // Get all tasks for a specific customer
    function getTasksForCustomer(customerId) {
        return tasks.filter(t => t.customerId === customerId && t.status !== 'completed');
    }

    // Update task progress based on elapsed game time
    function updateTasks(minutes) {
        if (!minutes || minutes <= 0) {
            console.log(`[taskManager.js] Skipping task updates - invalid minutes: ${minutes}`);
            return; // Skip if no time has passed
        }
        
        console.log(`[taskManager.js] Updating tasks for ${minutes} minute(s). Current tasks: ${tasks.length}`);
        
        // Track tasks to finalize after the loop
        const tasksToFinalize = [];
        
        // Current timestamp for update tracking
        const now = Date.now();
        
        // Process each task in the array
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            
            // Only process tasks that are in progress and have an assigned employee
            if (task.status === 'inProgress' && task.assignedTo) {
                // Verify the assigned employee still has this task
                const employee = window.employeesData?.find(emp => emp.id === task.assignedTo);
                
                if (!employee) {
                    console.warn(`[taskManager.js] Employee ${task.assignedTo} not found for task ${task.id}; unassigning.`);
                    task.status = 'pending';
                    task.assignedTo = null;
                    continue;
                }
                
                if (employee.currentTaskId !== task.id) {
                    console.warn(`[taskManager.js] Employee ${employee.id} (${employee.firstName} ${employee.lastName}) has currentTaskId ${employee.currentTaskId}, not ${task.id}; unassigning.`);
                    task.status = 'pending';
                    task.assignedTo = null;
                    continue;
                }
                
                // For prescription tasks, check product inventory
                if (task.type === 'fillPrescription') {
                    if (window.taskAssignment && typeof window.taskAssignment.canFillPrescription === 'function' && 
                        !window.taskAssignment.canFillPrescription(task.prescriptionId)) {
                        console.warn(`[taskManager.js] Insufficient ${task.productName} in inventory for fillPrescription task; unassigning employee.`);
                        if (typeof window.taskAssignment.unassignTask === 'function') {
                            window.taskAssignment.unassignTask(task.id);
                        } else {
                            task.status = 'pending';
                            task.assignedTo = null;
                            employee.currentTaskId = null;
                        }
                        continue;
                    }
                } 
                // For compound tasks, check material availability
                else if (task.type === 'compound') {
                    const product = window.productsData?.find(p => p.id === task.productId);
                    if (window.production && typeof window.production.canCompound === 'function' && 
                        !window.production.canCompound(product)) {
                        console.warn(`[taskManager.js] Insufficient materials to compound ${product ? product.name : task.productId}; unassigning employee.`);
                        if (window.taskAssignment && typeof window.taskAssignment.unassignTask === 'function') {
                            window.taskAssignment.unassignTask(task.id);
                        } else {
                            task.status = 'pending';
                            task.assignedTo = null;
                            employee.currentTaskId = null;
                        }
                        continue;
                    }
                }
                
                // Calculate the previous progress (before update)
                const previousProgress = task.progress;
                
                // Add progress for the elapsed time - update progress verification first
                progressVerification.trackTask(task.id, previousProgress, minutes);
                
                // Add progress for the elapsed time
                task.progress += minutes;
                task.lastProgressTime = now;
                
                // Verify progress is as expected
                const progressVerified = progressVerification.verifyProgress(task.id, task.progress);
                if (!progressVerified) {
                    console.warn(`[taskManager.js] Progress verification failed for task ${task.id} (${task.type}). Correcting progress.`);
                    // Correct the progress if verification failed
                    task.progress = progressVerification.expectedProgress[task.id];
                }
                
                // Emit progress update event (only if progress actually changed)
                if (task.progress !== previousProgress) {
                    taskEvents.emit('taskProgressUpdated', {
                        task: task,
                        previousProgress: previousProgress,
                        currentProgress: task.progress,
                        deltaProgress: task.progress - previousProgress,
                        progressVerified: progressVerified
                    });
                }
                
                console.log(`[taskManager.js] Task ${task.id} (${task.type}) progress: ${task.progress.toFixed(1)}/${task.totalTime} minutes (${((task.progress / task.totalTime) * 100).toFixed(1)}%)`);
                
                // Check if the task is now complete
                if (task.progress >= task.totalTime) {
                    console.log(`[taskManager.js] Task ${task.id} (${task.type}) is now complete!`);
                    task.status = 'completed';
                    taskEvents.emit('taskStatusChanged', {
                        task: task,
                        previousStatus: 'inProgress',
                        newStatus: 'completed'
                    });
                    
                    // Add to finalization list rather than finalizing here
                    // to avoid modifying the tasks array during iteration
                    tasksToFinalize.push(task);
                }
            } 
            // Check for tasks with "pending-dependent" status that might need to be activated
            else if (task.status === 'pending-dependent' && task.dependencyTaskId) {
                const dependency = tasks.find(t => t.id === task.dependencyTaskId);
                if (!dependency || dependency.status === 'completed') {
                    console.log(`[taskManager.js] Dependency task ${task.dependencyTaskId} is complete. Activating task ${task.id}.`);
                    task.status = 'pending'; // Change to regular pending so it can be assigned
                    
                    taskEvents.emit('taskStatusChanged', {
                        task: task,
                        previousStatus: 'pending-dependent',
                        newStatus: 'pending'
                    });
                    
                    // Schedule auto-assignment
                    clearTimeout(window._taskAssignTimeout);
                    window._taskAssignTimeout = setTimeout(() => {
                        if (window.taskAssignment && typeof window.taskAssignment.autoAssignTasks === 'function') {
                            window.taskAssignment.autoAssignTasks();
                        }
                    }, 100);
                }
            }
        }
        
        // Now, finalize all completed tasks - use safe method to avoid errors
        if (tasksToFinalize && tasksToFinalize.length > 0) {
            try {
                for (let i = 0; i < tasksToFinalize.length; i++) {
                    const task = tasksToFinalize[i];
                    if (task) {
                        finalizeTask(task);
                    }
                }
            } catch (error) {
                console.error(`[taskManager.js] Error finalizing tasks: ${error.message}`);
            }
        }
        
        // Trigger auto-assignment if we completed any tasks
        if (tasksToFinalize && tasksToFinalize.length > 0 && 
            window.taskAssignment && typeof window.taskAssignment.autoAssignTasks === 'function') {
            setTimeout(() => window.taskAssignment.autoAssignTasks(), 200);
        }
    }

    // Finalize a completed task (called after updateTasks)
    function finalizeTask(task) {
        if (!task) {
            console.error(`[finalizeTask] Attempted to finalize undefined or null task`);
            return;
        }
        
        console.log(`[finalizeTask] Finalizing task: ${task.id} (${task.type}), assignedTo: ${task.assignedTo}`);

        try {
            // Remove task from progress verification tracking
            progressVerification.clearTask(task.id);

            // Find the employee assigned to this task
            let employee = null;
            if (task.assignedTo) {
                employee = window.employeesData?.find(emp => emp.id === task.assignedTo);
                if (employee) {
                    // Update employee morale and mood based on task completion
                    if (window.employees && typeof window.employees.updateEmployeeMoodOnTaskCompletion === 'function') {
                        try {
                            window.employees.updateEmployeeMoodOnTaskCompletion(employee.id, task.type);
                        } catch (error) {
                            console.error(`[finalizeTask] Error updating employee mood: ${error.message}`);
                        }
                    }
                    
                    // Free the employee by clearing their currentTaskId
                    employee.currentTaskId = null;
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
                    console.error(`[finalizeTask] Error in production.handleTaskCompletion: ${error.message}`);
                }
            }

            // Handle specific task type completions
            if (task.type === 'fillPrescription') {
                if (task.customerId && task.prescriptionId) {
                    if (window.prescriptions && typeof window.prescriptions.prescriptionFilled === 'function') {
                        try {
                            window.prescriptions.prescriptionFilled(task.prescriptionId, task.customerId);
                            console.log(`[finalizeTask] Prescription ${task.prescriptionId} filled for customer ${task.customerId}`);
                        } catch (error) {
                            console.error(`[finalizeTask] Error in prescriptions.prescriptionFilled: ${error.message}`);
                        }
                    } else {
                        console.error(`[finalizeTask] prescriptions.prescriptionFilled is not available!`);
                    }
                }
            } 
            else if (task.type === 'customerInteraction') {
                if (task.customerId) {
                    const customer = window.customers && typeof window.customers.getCustomerById === 'function' ? 
                        window.customers.getCustomerById(task.customerId) : null;
                        
                    if (customer) {
                        console.log(`[finalizeTask] customerInteraction - Customer status before: ${customer.status}`);
                        
                        if (customer.status === 'waitingForCheckIn') {
                            if (window.customers && typeof window.customers.updateCustomerStatus === 'function') {
                                try {
                                    window.customers.updateCustomerStatus(task.customerId, 'waitingForConsultation');
                                    console.log(`[finalizeTask] Customer ${task.customerId} checked in, now waiting for consultation`);
                                } catch (error) {
                                    console.error(`[finalizeTask] Error updating customer status: ${error.message}`);
                                }
                            }
                        } 
                        else if (customer.status === 'readyForCheckout') {
                            // Process payment
                            if (window.finances && typeof window.finances.completePrescription === 'function') {
                                try {
                                    window.finances.completePrescription(task.customerId, customer.prescriptionId);
                                } catch (error) {
                                    console.error(`[finalizeTask] Error in finances.completePrescription: ${error.message}`);
                                }
                            }
                            
                            // Mark customer as complete and have them leave
                            if (window.customers) {
                                if (typeof window.customers.updateCustomerStatus === 'function') {
                                    try {
                                        window.customers.updateCustomerStatus(task.customerId, 'completed');
                                    } catch (error) {
                                        console.error(`[finalizeTask] Error updating customer status to completed: ${error.message}`);
                                    }
                                }
                                if (typeof window.customers.customerLeaves === 'function') {
                                    try {
                                        window.customers.customerLeaves(task.customerId);
                                    } catch (error) {
                                        console.error(`[finalizeTask] Error in customers.customerLeaves: ${error.message}`);
                                    }
                                }
                            }
                            
                            console.log(`[finalizeTask] Customer ${task.customerId} checked out and has left`);
                        }
                        else {
                            console.warn(`[finalizeTask] Customer interaction completed but customer status is unexpected: ${customer.status}`);
                        }
                    } else {
                        console.warn(`[finalizeTask] Customer ${task.customerId} not found for completed interaction`);
                    }
                }
            } 
            else if (task.type === 'consultation') {
                if (task.customerId && window.customers && typeof window.customers.updateCustomerStatus === 'function') {
                    try {
                        window.customers.updateCustomerStatus(task.customerId, 'waitingForFill');
                        console.log(`[finalizeTask] Consultation completed, customer ${task.customerId} now waiting for prescription fill`);
                    } catch (error) {
                        console.error(`[finalizeTask] Error updating customer status after consultation: ${error.message}`);
                    }
                }
            } 
            else if (task.type === 'compound') {
                // If this was a compound task with dependents, activate them
                const dependentTasks = tasks.filter(t => 
                    t.dependencyTaskId === task.id && 
                    t.status === 'pending-dependent');
                    
                if (dependentTasks.length > 0) {
                    console.log(`[finalizeTask] Found ${dependentTasks.length} dependent tasks to activate.`);
                    dependentTasks.forEach(depTask => {
                        if (depTask) {
                            depTask.status = 'pending'; // Make them available for assignment
                            console.log(`[finalizeTask] Dependent task ${depTask.id} activated`);
                            
                            taskEvents.emit('taskStatusChanged', {
                                task: depTask,
                                previousStatus: 'pending-dependent',
                                newStatus: 'pending'
                            });
                        }
                    });
                }
            }

            // Emit task completed event
            taskEvents.emit('taskCompleted', task);

            // Remove the completed task from the tasks array
            const taskIndex = tasks.findIndex(t => t && t.id === task.id);
            if (taskIndex > -1) {
                tasks.splice(taskIndex, 1);
                console.log(`[finalizeTask] Task ${task.id} removed from task list.`);
            }

            // Trigger auto-assignment of tasks
            if (window.taskAssignment && typeof window.taskAssignment.autoAssignTasks === 'function') {
                clearTimeout(window._taskAssignTimeout);
                window._taskAssignTimeout = setTimeout(() => {
                    window.taskAssignment.autoAssignTasks();
                }, 100);
            }
        } catch (error) {
            console.error(`[finalizeTask] Uncaught error finalizing task ${task.id}: ${error.message}`);
        }
    }

    // Debug function to track task status
    function debugTaskStatus() {
        console.log("=== TASK SYSTEM DEBUG ===");
        console.log(`Total tasks: ${tasks.length}`);
        
        // Count tasks by type and status
        const taskCounts = {};
        tasks.forEach(task => {
            if (!task) return; // Skip null/undefined tasks
            const key = `${task.type}_${task.status}`;
            taskCounts[key] = (taskCounts[key] || 0) + 1;
        });
        
        console.log("Task counts by type and status:", taskCounts);
        
        // Check for any customer with no active tasks
        if (window.customers && window.customers.activeCustomers) {
            const customersWithNoTasks = window.customers.activeCustomers.filter(customer => {
                if (!customer) return false;
                const customerTasks = tasks.filter(t => 
                    t && t.customerId === customer.id && 
                    t.status !== 'completed');
                return customerTasks.length === 0;
            });
            
            if (customersWithNoTasks.length > 0) {
                console.warn(`${customersWithNoTasks.length} customers have no active tasks!`);
                customersWithNoTasks.forEach(c => {
                    if (c) {
                        console.warn(`Customer ${c.id} (${c.firstName} ${c.lastName}) - Status: ${c.status}`);
                    }
                });
            }
        }
        
        // Check for idle employees
        if (window.employeesData) {
            const idleEmployees = window.employeesData.filter(emp => emp && !emp.currentTaskId);
            console.log(`${idleEmployees.length}/${window.employeesData.length} employees are idle`);
            
            // Check for employees with invalid task assignments
            const employeesWithInvalidTasks = window.employeesData.filter(emp => {
                if (!emp || !emp.currentTaskId) return false; // No task assigned
                const task = tasks.find(t => t && t.id === emp.currentTaskId);
                return !task || task.assignedTo !== emp.id;
            });
            
            if (employeesWithInvalidTasks.length > 0) {
                console.error(`${employeesWithInvalidTasks.length} employees have invalid task assignments!`);
                employeesWithInvalidTasks.forEach(emp => {
                    if (emp) {
                        console.error(`Employee ${emp.firstName} ${emp.lastName} has task ID ${emp.currentTaskId} but task doesn't exist or isn't assigned to them.`);
                        // Fix the employee
                        emp.currentTaskId = null;
                    }
                });
            }
        }
        
        // Include progress verification stats
        console.log("Progress verification stats:", progressVerification.getStats());
        
        console.log("========================");
    }

    // Manually force completion of a task (e.g., for debug)
    function forceCompleteTask(taskId) {
        const task = tasks.find(t => t && t.id === taskId);
        if (!task) {
            console.error(`[taskManager.js] Task ${taskId} not found for force completion.`);
            return false;
        }
        
        console.log(`[taskManager.js] Forcing completion of task ${taskId} (${task.type})`);
        task.progress = task.totalTime;
        task.status = 'completed';
        
        try {
            finalizeTask(task);
            return true;
        } catch (error) {
            console.error(`[taskManager.js] Error forcing task completion: ${error.message}`);
            return false;
        }
    }

    // Add an event listener for task events
    function addEventListener(event, callback) {
        if (typeof callback !== 'function') {
            console.error(`[taskManager.js] Cannot add event listener: callback is not a function`);
            return;
        }
        taskEvents.on(event, callback);
    }

    // Remove an event listener
    function removeEventListener(event, callback) {
        if (typeof callback !== 'function') {
            console.error(`[taskManager.js] Cannot remove event listener: callback is not a function`);
            return;
        }
        taskEvents.off(event, callback);
    }
    
    // Reset progress verification for a specific task or all tasks
    function resetProgressVerification(taskId = null) {
        if (taskId) {
            progressVerification.clearTask(taskId);
            console.log(`[taskManager.js] Progress verification reset for task ${taskId}`);
        } else {
            // Reset for all tasks
            tasks.forEach(task => {
                if (task && task.id) {
                    progressVerification.clearTask(task.id);
                }
            });
            
            // Clear anomalies
            progressVerification.anomalies = [];
            console.log(`[taskManager.js] Progress verification reset for all tasks`);
        }
    }
    
    // Get progress verification anomalies
    function getProgressAnomalies() {
        return progressVerification.anomalies;
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
        debugTaskStatus,
        forceCompleteTask,
        addEventListener,
        removeEventListener,
        resetProgressVerification,
        getProgressAnomalies,
        
        // Constants for events
        EVENTS: {
            TASK_ADDED: 'taskAdded',
            TASK_COMPLETED: 'taskCompleted',
            TASK_PROGRESS_UPDATED: 'taskProgressUpdated',
            TASK_STATUS_CHANGED: 'taskStatusChanged'
        }
    };
})();

// Set up run-time verification of task integrity
(function() {
    // Run task integrity check on startup
    setTimeout(() => {
        console.log("[taskManager.js] Running initial task system integrity check");
        runTaskSystemIntegrityCheck();
    }, 2000);
    
    // Run periodic task integrity checks
    setInterval(runTaskSystemIntegrityCheck, 60000); // Check every minute
    
    // Function to thoroughly check and fix task system issues
    function runTaskSystemIntegrityCheck() {
        console.log("[taskManager.js] Running task system integrity check");
        
        try {
            // Skip if task system isn't ready
            if (!window.taskManager || !window.taskManager.tasks) {
                console.log("[taskManager.js] Task system not ready for integrity check");
                return;
            }
            
            // 1. Verify all employees with tasks have valid references
            if (window.employeesData) {
                let fixedEmployeeCount = 0;
                
                window.employeesData.forEach(employee => {
                    if (!employee) return; // Skip null/undefined employees
                    
                    if (employee.currentTaskId) {
                        const task = window.taskManager.getTaskById(employee.currentTaskId);
                        
                        // If task doesn't exist or isn't assigned to this employee
                        if (!task || task.assignedTo !== employee.id) {
                            console.warn(`Task integrity error: Employee ${employee.id} (${employee.firstName} ${employee.lastName}) has task ${employee.currentTaskId} but task doesn't exist or isn't assigned correctly.`);
                            
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
            
            window.taskManager.tasks.forEach(task => {
                if (!task) return; // Skip null/undefined tasks
                
                if (task.status === 'inProgress' && task.assignedTo) {
                    const employee = window.employeesData?.find(e => e && e.id === task.assignedTo);
                    
                    // If employee doesn't exist or isn't assigned to this task
                    if (!employee || employee.currentTaskId !== task.id) {
                        console.warn(`Task integrity error: Task ${task.id} (${task.type}) is assigned to employee ${task.assignedTo} but employee doesn't exist or isn't assigned to this task.`);
                        
                        // Fix the task state - set back to pending
                        task.status = 'pending';
                        task.assignedTo = null;
                        fixedTaskCount++;
                    }
                }
            });
            
            if (fixedTaskCount > 0) {
                console.log(`[taskManager.js] Fixed ${fixedTaskCount} tasks with invalid employee assignments`);
            }
            
            // 3. Check for tasks that might be stuck (in progress for too long)
            const now = Date.now();
            const stuckTaskThreshold = 10 * 60 * 1000; // 10 minutes
            
            window.taskManager.tasks.forEach(task => {
                if (!task) return; // Skip null/undefined tasks
                
                if (task.status === 'inProgress' && task.lastProgressTime) {
                    const timeSinceUpdate = now - task.lastProgressTime;
                    
                    if (timeSinceUpdate > stuckTaskThreshold) {
                        console.warn(`Task may be stuck: ${task.id} (${task.type}) - Last updated ${Math.round(timeSinceUpdate / 1000)} seconds ago`);
                        
                        // Option: force completion if severely stuck
                        if (timeSinceUpdate > 30 * 60 * 1000) { // 30 minutes
                            console.error(`Task severely stuck for over 30 minutes: ${task.id} - forcing completion`);
                            try {
                                window.taskManager.forceCompleteTask(task.id);
                            } catch (error) {
                                console.error(`Error force-completing stuck task: ${error.message}`);
                            }
                        }
                    }
                }
            });
            
            // 4. Check for customers who have been waiting too long
            if (window.customers && window.customers.activeCustomers) {
                const customerWaitThreshold = 15 * 60 * 1000; // 15 minutes
                
                window.customers.activeCustomers.forEach(customer => {
                    if (!customer) return; // Skip null/undefined customers
                    
                    if (customer.lastStateChange) {
                        const waitTime = now - customer.lastStateChange;
                        
                        if (waitTime > customerWaitThreshold) {
                            console.warn(`Customer ${customer.id} (${customer.firstName} ${customer.lastName}) has been in state "${customer.status}" for ${Math.round(waitTime / 60000)} minutes`);
                            
                            // Trigger customer check if it's available
                            if (window.customers && typeof window.customers.detectAndFixStuckCustomers === 'function') {
                                try {
                                    window.customers.detectAndFixStuckCustomers();
                                } catch (error) {
                                    console.error(`Error detecting and fixing stuck customers: ${error.message}`);
                                }
                            }
                        }
                    }
                });
            }
            
            // 5. Check for progress anomalies
            const progressAnomalies = window.taskManager.getProgressAnomalies();
            if (progressAnomalies && progressAnomalies.length > 0) {
                console.warn(`[taskManager.js] ${progressAnomalies.length} progress anomalies detected. Latest anomaly: Task ${progressAnomalies[progressAnomalies.length-1]?.taskId}`);
                
                // Reset progress tracking if too many anomalies
                if (progressAnomalies.length > 20) {
                    console.warn("[taskManager.js] Too many progress anomalies detected. Resetting progress verification.");
                    window.taskManager.resetProgressVerification();
                }
            }
            
            // 6. Run auto-assignment again to pick up any fixed tasks
            if (window.taskAssignment && typeof window.taskAssignment.autoAssignTasks === 'function' && (fixedEmployeeCount > 0 || fixedTaskCount > 0)) {
                console.log("[taskManager.js] Running auto-assignment after integrity fixes");
                setTimeout(() => window.taskAssignment.autoAssignTasks(), 100);
            }
            
            console.log("[taskManager.js] Task system integrity check completed");
        } catch (error) {
            console.error("[taskManager.js] Error during task system integrity check:", error);
        }
    }
})();