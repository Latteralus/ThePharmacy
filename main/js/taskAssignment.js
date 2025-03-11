// taskAssignment.js

window.taskAssignment = (function() {

    /**
     * Assigns a task to an employee, updating both the task and employee objects.
     */
    function assignTaskToEmployee(taskId, employeeId) {
        const task = window.taskManager.tasks.find(t => t.id === taskId);
        const employee = window.employeesData.find(emp => emp.id === employeeId);

        if (!task) {
            console.error(`[assignTaskToEmployee] Task not found: ${taskId}`);
            return false;
        }
        if (!employee) {
            console.error(`[assignTaskToEmployee] Employee not found: ${employeeId}`);
            return false;
        }
        
        // Check if the task is already assigned
        if (task.assignedTo) {
            console.warn(`[assignTaskToEmployee] Task ${task.id} already assigned to ${task.assignedTo}. Unassigning first.`);
            // Unassign from the previous employee
            const prevEmployee = window.employeesData.find(emp => emp.id === task.assignedTo);
            if (prevEmployee && prevEmployee.currentTaskId === task.id) {
                prevEmployee.currentTaskId = null;
            }
        }
        
        // Check if employee already has a task
        if (employee.currentTaskId) {
            console.warn(`[assignTaskToEmployee] Employee ${employee.id} already has task ${employee.currentTaskId}. Clearing it first.`);
            // Remove the employee's assignment from the previous task
            const prevTask = window.taskManager.tasks.find(t => t.id === employee.currentTaskId);
            if (prevTask && prevTask.assignedTo === employee.id) {
                prevTask.assignedTo = null;
                prevTask.status = 'pending';
            }
            employee.currentTaskId = null;
        }

        // Now make the new assignment
        task.assignedTo = employeeId;
        task.status = 'inProgress';
        employee.currentTaskId = taskId;
        
        // Set a timestamp for when the task was assigned
        task.assignedAt = Date.now();

        console.log(`[assignTaskToEmployee] Successfully assigned task ${taskId} (${task.type}) to ${employee.firstName} ${employee.lastName} (${employee.role})`);
        return true;
    }

    /**
     * Unassigns an employee from a task, returning the task to 'pending' status.
     */
    function unassignTask(taskId) {
        const task = window.taskManager.tasks.find(t => t.id === taskId);
        if (!task) {
            console.error(`[unassignTask] Task not found: ${taskId}`);
            return;
        }
        
        // Get the assigned employee (if any)
        if (task.assignedTo) {
            const employee = window.employeesData.find(emp => emp.id === task.assignedTo);
            if (employee) {
                console.log(`[unassignTask] Clearing task ${taskId} from employee ${employee.firstName} ${employee.lastName}`);
                // Only clear the employee's currentTaskId if it matches this task
                if (employee.currentTaskId === task.id) {
                    employee.currentTaskId = null;
                }
            }
        }
        
        // Reset the task
        task.assignedTo = null;
        task.status = 'pending';
        console.log(`[unassignTask] Task ${taskId} (${task.type}) is now unassigned and pending.`);
        
        // Schedule auto-assignment to find a new employee
        setTimeout(autoAssignTasks, 100);
    }

    /**
     * Sorts tasks by priority with more specific criteria:
     * 1) Customer checkout (customerInteraction for readyForCheckout customers) - highest priority
     * 2) Customer check-in (customerInteraction for waitingForCheckIn customers)
     * 3) Consultation
     * 4) fillPrescription
     * 5) compound
     * 6) production
     */
    function sortTasksByPriority(unassignedTasks) {
        return unassignedTasks.sort((a, b) => {
            // Define more specific priority based on both task type and context
            function getPriority(task) {
                // Special case: Checkout has highest priority
                if (task.type === 'customerInteraction' && task.customerId) {
                    const customer = window.customers?.getCustomerById(task.customerId);
                    if (customer && customer.status === 'readyForCheckout') {
                        return 0; // Highest priority
                    }
                    if (customer && customer.status === 'waitingForCheckIn') {
                        return 1; // Second highest priority
                    }
                }
                
                // Standard priority order
                const priorityOrder = {
                    'consultation': 2,
                    'fillPrescription': 3,
                    'compound': 4, 
                    'production': 5,
                    'customerInteraction': 6, // Default for other customerInteractions
                };
                
                // Return the priority, or a low priority if not found
                return priorityOrder[task.type] !== undefined ? priorityOrder[task.type] : 99;
            }
            
            // Compare priorities
            const priorityA = getPriority(a);
            const priorityB = getPriority(b);
            
            // If priority is the same, prioritize older tasks
            if (priorityA === priorityB) {
                // Use task ID as a proxy for age (assuming IDs are timestamp-based)
                return a.id.localeCompare(b.id);
            }
            
            return priorityA - priorityB;
        });
    }

    /**
     * Main logic to automatically assign tasks to free employees,
     * with improved handling of customer tasks
     */
    function autoAssignTasks() {
        console.log("[autoAssignTasks] Running auto-assignment logic");

        // Normalize employee roles to ensure proper assignment
        normalizeEmployeeRoles();

        // Get unassigned eligible tasks
        const unassignedTasks = window.taskManager.tasks.filter(task => {
            // Skip tasks that are already assigned or complete
            if (task.assignedTo || task.status === 'completed') {
                return false;
            }
            
            // Skip tasks that aren't ready to be assigned
            if (task.status !== 'pending') {
                return false;
            }
            
            // For compound tasks, check material availability
            if (task.type === 'compound') {
                const product = window.productsData?.find(p => p.id === task.productId);
                if (!product) {
                    console.error(`[autoAssignTasks] Product not found for compound task: ${task.productId}`);
                    return false;
                }
                return window.production?.canCompound(product) ?? false;
            }
            
            // For fillPrescription tasks, check if we can fill the prescription
            if (task.type === 'fillPrescription' && task.prescriptionId) {
                return canFillPrescription(task.prescriptionId);
            }
            
            // All other tasks are eligible
            return true;
        });

        if (unassignedTasks.length === 0) {
            console.log("[autoAssignTasks] No eligible unassigned tasks.");
            return;
        }

        // Get available employees
        const availableEmployees = window.employeesData.filter(emp => !emp.currentTaskId);
        if (availableEmployees.length === 0) {
            console.log("[autoAssignTasks] No available employees.");
            return;
        }

        console.log(`[autoAssignTasks] Found ${unassignedTasks.length} unassigned tasks and ${availableEmployees.length} available employees.`);
        console.log(`[autoAssignTasks] Employee roles: ${availableEmployees.map(e => e.role).join(', ')}`);

        // First, handle prioritized tasks for Cashiers
        const cashiers = availableEmployees.filter(emp => emp.role === 'Cashier');
        
        // If we have cashiers, first try to assign them to checkout tasks (highest priority)
        if (cashiers.length > 0) {
            const checkoutTasks = unassignedTasks.filter(t => {
                if (t.type !== 'customerInteraction') return false;
                const customer = window.customers?.getCustomerById(t.customerId);
                return customer && customer.status === 'readyForCheckout';
            });
            
            if (checkoutTasks.length > 0) {
                console.log(`[autoAssignTasks] Found ${checkoutTasks.length} checkout tasks for ${cashiers.length} available cashiers`);
                for (let i = 0; i < Math.min(cashiers.length, checkoutTasks.length); i++) {
                    assignTaskToEmployee(checkoutTasks[i].id, cashiers[i].id);
                    // Remove assigned cashier from available list
                    const index = availableEmployees.indexOf(cashiers[i]);
                    if (index > -1) {
                        availableEmployees.splice(index, 1);
                    }
                }
            }
        }
        
        // Get updated list of unassigned tasks after checkout assignments
        const remainingTasks = window.taskManager.tasks.filter(t => 
            !t.assignedTo && t.status === 'pending');
        
        if (remainingTasks.length === 0 || availableEmployees.length === 0) {
            return; // Exit if no more tasks or employees
        }

        // Sort tasks by priority
        const prioritizedTasks = sortTasksByPriority(remainingTasks);
        
        // Process each prioritized task
        let assignmentsMade = false;
        
        for (let task of prioritizedTasks) {
            // Try to find the best employee for this task
            const employee = findBestEmployeeForTask(task, availableEmployees);
            
            if (employee) {
                console.log(`[autoAssignTasks] Assigning ${task.type} task (${task.id}) to ${employee.firstName} ${employee.lastName} (${employee.role})`);
                assignTaskToEmployee(task.id, employee.id);
                
                // Remove this employee from available list
                const index = availableEmployees.indexOf(employee);
                if (index > -1) {
                    availableEmployees.splice(index, 1);
                }
                
                assignmentsMade = true;
                
                // Stop if we run out of employees
                if (availableEmployees.length === 0) {
                    break;
                }
            } else {
                console.log(`[autoAssignTasks] No suitable employee found for ${task.type} task (${task.id}).`);
            }
        }
        
        // If we made assignments, we'll run auto-assign again on the next loop
        if (assignmentsMade) {
            console.log("[autoAssignTasks] Assignments made, scheduling another round of assignment checks.");
            setTimeout(autoAssignTasks, 100); // Run again after a short delay
        }
    }

    /**
     * Normalize employee roles to make sure they match expected values
     */
    function normalizeEmployeeRoles() {
        const roleMap = {
            'Sales Rep': 'Cashier', 
            'SalesRep': 'Cashier',
            'Technician': 'Lab Technician',
            'Tech': 'Lab Technician',
            'LabTech': 'Lab Technician',
            'Doctor': 'Pharmacist',
            'PharmD': 'Pharmacist',
            'Pharm': 'Pharmacist',
            'Pharmacy Tech': 'Lab Technician',
            'Pharmacist Assistant': 'Lab Technician',
            'Assistant': 'Cashier',
            'Clerk': 'Cashier',
            'Customer Service': 'Cashier',
            'Cashier/Sales': 'Cashier'
        };

        let normalizedCount = 0;
        
        window.employeesData.forEach(employee => {
            // Check if the role needs to be normalized
            const normalizedRole = roleMap[employee.role];
            if (normalizedRole) {
                console.log(`[normalizeEmployeeRoles] Normalizing employee ${employee.firstName} ${employee.lastName} role from "${employee.role}" to "${normalizedRole}"`);
                employee.role = normalizedRole;
                normalizedCount++;
            }
            
            // Make sure roles are one of the three expected values
            if (!['Pharmacist', 'Lab Technician', 'Cashier'].includes(employee.role)) {
                console.warn(`[normalizeEmployeeRoles] Employee ${employee.firstName} ${employee.lastName} has unrecognized role "${employee.role}". Defaulting to "Cashier".`);
                employee.role = 'Cashier';
                normalizedCount++;
            }
        });
        
        if (normalizedCount > 0) {
            console.log(`[normalizeEmployeeRoles] Normalized ${normalizedCount} employee roles`);
        }
    }

    /**
     * Checks if we have enough product inventory to fill a prescription.
     */
    function canFillPrescription(prescriptionId) {
        const prescription = window.prescriptions?.getPrescription(prescriptionId);
        if (!prescription) {
            console.error(`[canFillPrescription] Prescription ${prescriptionId} not found.`);
            return false;
        }
        
        const product = window.productsData?.find(p => p.id === prescription.productId);
        if (!product) {
            console.error(`[canFillPrescription] Product ${prescription.productId} not found.`);
            return false;
        }

        // Check if there's enough product inventory (assuming dosage=1 if not specified)
        const requiredAmount = prescription.quantityNeeded || prescription.dosage || 1;
        return product.inventory >= requiredAmount;
    }

    /**
     * Finds the best employee for a given task based on role and skills.
     * With improved logic for role matching and skill prioritization.
     */
    function findBestEmployeeForTask(task, availableEmployees) {
        // Define roles eligible for each task type, with priority order
        const eligibleRoles = {
            'customerInteraction': ['Cashier', 'Pharmacist', 'Lab Technician'], // Cashier preferred, but anyone can help
            'consultation': ['Pharmacist'],
            'fillPrescription': ['Lab Technician', 'Pharmacist'], // Lab Technician preferred
            'compound': ['Lab Technician', 'Pharmacist'],
            'production': ['Lab Technician', 'Pharmacist']
        };
        
        // Special handling for customer interactions
        if (task.type === 'customerInteraction' && task.customerId) {
            const customer = window.customers?.getCustomerById(task.customerId);
            
            // For checkout, prefer a Cashier but allow others if none available
            if (customer && customer.status === 'readyForCheckout') {
                const cashiers = availableEmployees.filter(emp => emp.role === 'Cashier');
                if (cashiers.length > 0) {
                    // Find the cashier with best customer service skills
                    return cashiers.sort((a, b) => 
                        (b.skills?.customerService || 0) - (a.skills?.customerService || 0)
                    )[0];
                }
                // If no cashiers, anyone can help with checkout
                return availableEmployees[0];
            }
            
            // For check-in, prefer a Cashier but allow others if none available
            if (customer && customer.status === 'waitingForCheckIn') {
                const cashiers = availableEmployees.filter(emp => emp.role === 'Cashier');
                if (cashiers.length > 0) {
                    return cashiers.sort((a, b) => 
                        (b.skills?.customerService || 0) - (a.skills?.customerService || 0)
                    )[0];
                }
                // If no cashiers, anyone can help with check-in
                return availableEmployees[0];
            }
        }
        
        // Get the appropriate roles for this task type
        const taskRoles = eligibleRoles[task.type] || ['Pharmacist', 'Lab Technician', 'Cashier'];
        
        // Try each role in priority order
        let eligibleEmployees = [];
        for (const role of taskRoles) {
            const employeesWithRole = availableEmployees.filter(emp => emp.role === role);
            if (employeesWithRole.length > 0) {
                eligibleEmployees = employeesWithRole;
                break; // Found employees with the highest priority role
            }
        }
        
        // If no employees with preferred roles, use any available employee
        // This is a fallback to ensure tasks don't get stuck
        if (eligibleEmployees.length === 0 && availableEmployees.length > 0) {
            console.log(`[findBestEmployeeForTask] No employees with preferred roles ${taskRoles.join(', ')} for ${task.type}. Using any available employee.`);
            eligibleEmployees = availableEmployees;
        }
        
        if (eligibleEmployees.length === 0) {
            return null;
        }
        
        // Find the employee with best skills for this task
        let bestEmployee = eligibleEmployees[0];
        let bestScore = -1;
        
        for (let employee of eligibleEmployees) {
            // Calculate a score based on skills relevant to the task
            let score = 0;
            
            // Base score on general efficiency
            const efficiency = calculateEmployeeEfficiency(employee);
            score += efficiency;
            
            // Add bonus for specific skills
            if (task.type === 'fillPrescription') {
                score += (employee.skills?.compounding || 0) * 1.5;
                score += (employee.skills?.dispensing || 0);
            } 
            else if (task.type === 'compound') {
                score += (employee.skills?.compounding || 0) * 2;
            } 
            else if (task.type === 'customerInteraction') {
                score += (employee.skills?.customerService || 0) * 2;
            } 
            else if (task.type === 'consultation') {
                score += (employee.skills?.customerService || 0);
                score += (employee.skills?.dispensing || 0) * 1.5;
            }
            
            // Preference for employee with higher morale
            score += (employee.morale / 20); // 0-5 bonus points based on morale
            
            // Preference for same employee who created a related compound
            if (task.type === 'fillPrescription' && task.dependencyTaskId) {
                const compoundTask = window.taskManager.tasks.find(t => t.id === task.dependencyTaskId);
                if (compoundTask && compoundTask.assignedTo === employee.id) {
                    score += 50; // Strong preference for continuity
                }
            }
            
            // If this is the employee's primary role, give a significant bonus
            if ((task.type === 'fillPrescription' && employee.role === 'Lab Technician') ||
                (task.type === 'consultation' && employee.role === 'Pharmacist') ||
                (task.type === 'customerInteraction' && employee.role === 'Cashier')) {
                score += 30; // Strong bonus for primary role
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestEmployee = employee;
            }
        }
        
        return bestEmployee;
    }
    
    /**
     * Calculate employee efficiency based on skills and morale
     */
    function calculateEmployeeEfficiency(employee) {
        // Calculate average skill
        let skillSum = 0;
        let skillCount = 0;
        
        // Handle case when employee has no skills object
        if (!employee.skills) {
            return 50; // Default efficiency
        }
        
        for (const skill in employee.skills) {
            skillSum += employee.skills[skill];
            skillCount++;
        }
        
        const avgSkill = skillCount > 0 ? skillSum / skillCount : 50;
        
        // Apply morale factor
        const moraleFactor = 0.5 + (employee.morale / 200); // 0.5 to 1.0 based on morale
        
        // Calculate base efficiency (0-100 scale)
        const baseEfficiency = avgSkill * moraleFactor;
        
        return baseEfficiency;
    }

    // Log current task assignment state - useful for debugging
    function logTaskAssignmentState() {
        console.log("=== TASK ASSIGNMENT STATE ===");
        
        // Count employees by role
        const roleCounts = {};
        window.employeesData.forEach(emp => {
            roleCounts[emp.role] = (roleCounts[emp.role] || 0) + 1;
        });
        console.log("Employees by role:", roleCounts);
        
        // Count tasks by type
        const taskTypeCounts = {};
        window.taskManager.tasks.forEach(task => {
            taskTypeCounts[task.type] = (taskTypeCounts[task.type] || 0) + 1;
        });
        console.log("Tasks by type:", taskTypeCounts);
        
        // Count assigned vs unassigned tasks
        const assignedTasks = window.taskManager.tasks.filter(t => t.assignedTo).length;
        const unassignedTasks = window.taskManager.tasks.filter(t => !t.assignedTo && t.status === 'pending').length;
        console.log(`Assigned tasks: ${assignedTasks}, Unassigned tasks: ${unassignedTasks}`);
        
        // Count busy vs free employees
        const busyEmployees = window.employeesData.filter(emp => emp.currentTaskId).length;
        const freeEmployees = window.employeesData.filter(emp => !emp.currentTaskId).length;
        console.log(`Busy employees: ${busyEmployees}, Free employees: ${freeEmployees}`);
        
        // Check for role-task mismatches
        window.taskManager.tasks.forEach(task => {
            if (task.assignedTo) {
                const emp = window.employeesData.find(e => e.id === task.assignedTo);
                if (emp) {
                    const eligibleRoles = {
                        'customerInteraction': ['Cashier'],
                        'consultation': ['Pharmacist'],
                        'fillPrescription': ['Lab Technician', 'Pharmacist'],
                        'compound': ['Lab Technician', 'Pharmacist'],
                        'production': ['Lab Technician', 'Pharmacist']
                    };
                    
                    const preferredRoles = eligibleRoles[task.type] || [];
                    if (!preferredRoles.includes(emp.role)) {
                        console.warn(`Potential role mismatch: ${emp.firstName} ${emp.lastName} (${emp.role}) assigned to ${task.type} task`);
                    }
                }
            }
        });
        
        console.log("============================");
    }

    // Force task reassignment for all tasks - useful for recovery
    function forceTaskReassignment() {
        console.log("[forceTaskReassignment] Forcing reassignment of all tasks");
        
        // Clear all employee task assignments
        window.employeesData.forEach(emp => {
            emp.currentTaskId = null;
        });
        
        // Reset all in-progress tasks to pending
        window.taskManager.tasks.forEach(task => {
            if (task.status === 'inProgress') {
                task.status = 'pending';
                task.assignedTo = null;
            }
        });
        
        // Run auto-assignment
        setTimeout(autoAssignTasks, 100);
    }

    // Expose the public interface
    return {
        assignTaskToEmployee,
        unassignTask,
        autoAssignTasks,
        canFillPrescription,
        normalizeEmployeeRoles,
        logTaskAssignmentState,
        forceTaskReassignment
    };
})();

// Set up periodic checking for role normalization
// This ensures that even if employees are added dynamically, their roles will be normalized
setInterval(() => {
    if (window.taskAssignment && window.taskAssignment.normalizeEmployeeRoles) {
        window.taskAssignment.normalizeEmployeeRoles();
    }
}, 60000); // Check every minute

// Normalize roles on initial load
setTimeout(() => {
    if (window.taskAssignment && window.taskAssignment.normalizeEmployeeRoles) {
        window.taskAssignment.normalizeEmployeeRoles();
    }
}, 1000);