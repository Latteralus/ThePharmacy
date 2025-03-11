// task-error-recovery.js
// Adds error recovery for employee task assignments

(function() {
    // How often to check for and fix error states (in milliseconds)
    const ERROR_CHECK_INTERVAL = 5000; // Check every 5 seconds
    
    // Keep track of employees we've already tried to fix
    const recoveryAttempts = {};
    
    // Initialize the recovery system
    function initTaskErrorRecovery() {
        console.log("[task-error-recovery] Initializing task error recovery system");
        
        // Set up periodic checks
        setInterval(checkAndFixEmployeeErrors, ERROR_CHECK_INTERVAL);
        
        // Run an initial check
        setTimeout(checkAndFixEmployeeErrors, 1000);
    }
    
    // Check for and fix employee task errors
    function checkAndFixEmployeeErrors() {
        if (!window.employeesData || !window.taskManager) {
            return; // Skip if data not available
        }
        
        let errorsFound = 0;
        
        // Check each employee for error states
        window.employeesData.forEach(employee => {
            const hasError = checkEmployeeForErrors(employee);
            
            if (hasError) {
                errorsFound++;
                attemptToFixEmployee(employee);
            }
        });
        
        if (errorsFound > 0) {
            console.log(`[task-error-recovery] Found and attempted to fix ${errorsFound} employee error states`);
        }
    }
    
    // Check if an employee is in an error state
    function checkEmployeeForErrors(employee) {
        // Case 1: Employee has a task ID but the task doesn't exist
        if (employee.currentTaskId) {
            const task = window.taskManager.tasks.find(t => t.id === employee.currentTaskId);
            if (!task) {
                console.warn(`[task-error-recovery] Employee ${employee.firstName} ${employee.lastName} has non-existent task ID: ${employee.currentTaskId}`);
                return true;
            }
            
            // Case 2: Task exists but is assigned to a different employee
            if (task.assignedTo !== employee.id) {
                console.warn(`[task-error-recovery] Employee ${employee.firstName} ${employee.lastName} has task ${employee.currentTaskId} but task is assigned to ${task.assignedTo || 'no one'}`);
                return true;
            }
        }
        
        // Case 3: Employee shows "Error - Not Found" in the UI
        const employeeElement = findEmployeeElementInDOM(employee.id);
        if (employeeElement) {
            const taskText = employeeElement.textContent;
            if (taskText && taskText.includes("Error - Not Found")) {
                console.warn(`[task-error-recovery] Employee ${employee.firstName} ${employee.lastName} has UI error state`);
                return true;
            }
        }
        
        return false;
    }
    
    // Attempt to fix an employee in an error state
    function attemptToFixEmployee(employee) {
        // Check if we've recently tried to fix this employee to avoid endless loops
        const now = Date.now();
        const lastAttempt = recoveryAttempts[employee.id] || 0;
        
        if (now - lastAttempt < 30000) { // Don't try more than once per 30 seconds
            return;
        }
        
        // Record this attempt
        recoveryAttempts[employee.id] = now;
        
        console.log(`[task-error-recovery] Attempting to fix employee ${employee.firstName} ${employee.lastName}`);
        
        // Step 1: Clear the employee's current task ID
        employee.currentTaskId = null;
        
        // Step 2: Find any tasks that might be assigned to this employee and unassign them
        const assignedTasks = window.taskManager.tasks.filter(task => task.assignedTo === employee.id);
        
        assignedTasks.forEach(task => {
            console.log(`[task-error-recovery] Resetting task ${task.id} that was assigned to ${employee.firstName} ${employee.lastName}`);
            task.assignedTo = null;
            task.status = 'pending';
        });
        
        // Step 3: Trigger auto-assignment to give the employee a new task
        setTimeout(() => {
            console.log(`[task-error-recovery] Triggering auto-assignment after fixing ${employee.firstName} ${employee.lastName}`);
            if (window.taskAssignment && window.taskAssignment.autoAssignTasks) {
                window.taskAssignment.autoAssignTasks();
            }
            
            // Update the UI if the employee element exists
            updateEmployeeUI(employee);
            
        }, 500); // Small delay to let the system stabilize
    }
    
    // Find the employee's element in the DOM
    function findEmployeeElementInDOM(employeeId) {
        // Try different possible selectors for employee elements
        return document.querySelector(`[data-employee-id="${employeeId}"]`) || 
               document.querySelector(`#${employeeId}`) ||
               document.querySelector(`.employee-card[data-id="${employeeId}"]`);
    }
    
    // Update the UI for an employee after fixing
    function updateEmployeeUI(employee) {
        const employeeElement = findEmployeeElementInDOM(employee.id);
        if (!employeeElement) {
            // If we can't find a specific element, try to refresh the operations page
            if (window.currentPage === 'operations' && window.renderOperationsPage) {
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    window.renderOperationsPage(mainContent);
                }
            }
            return;
        }
        
        // Find task status element and update it
        const taskStatus = employeeElement.querySelector('.task-info') || 
                           employeeElement.querySelector('[class*="task"]');
        
        if (taskStatus) {
            if (employee.currentTaskId) {
                const task = window.taskManager.tasks.find(t => t.id === employee.currentTaskId);
                if (task) {
                    taskStatus.textContent = `Current Task: ${formatTaskType(task.type)}`;
                    taskStatus.style.color = ''; // Reset color
                } else {
                    taskStatus.textContent = 'Current Task: None (Idle)';
                    taskStatus.style.color = 'grey';
                }
            } else {
                taskStatus.textContent = 'Current Task: None (Idle)';
                taskStatus.style.color = 'grey';
            }
        }
    }
    
    // Format task type for display
    function formatTaskType(type) {
        if (!type) return 'Unknown';
        
        switch (type) {
            case 'fillPrescription': return 'Filling Prescription';
            case 'customerInteraction': return 'Customer Interaction';
            case 'consultation': return 'Consultation';
            case 'compound': return 'Compounding';
            case 'production': return 'Production';
            default: return type.charAt(0).toUpperCase() + type.slice(1);
        }
    }
    
    // Add a manual recovery button to employee cards
    function addRecoveryButtons() {
        const employeeCards = document.querySelectorAll('.employee-card, [class*="employee-item"]');
        
        employeeCards.forEach(card => {
            // Skip if already has a recovery button
            if (card.querySelector('.recovery-button')) return;
            
            // Check if this card has an error state
            const hasError = card.textContent.includes('Error - Not Found');
            
            if (hasError) {
                // Find the employee ID
                const employeeId = card.dataset.employeeId || card.dataset.id || extractEmployeeIdFromCard(card);
                if (!employeeId) return;
                
                // Create a recovery button
                const recoveryButton = document.createElement('button');
                recoveryButton.className = 'recovery-button';
                recoveryButton.textContent = 'Reset & Find New Task';
                recoveryButton.style.backgroundColor = '#f44336';
                recoveryButton.style.color = 'white';
                recoveryButton.style.border = 'none';
                recoveryButton.style.padding = '5px 10px';
                recoveryButton.style.borderRadius = '3px';
                recoveryButton.style.cursor = 'pointer';
                recoveryButton.style.marginTop = '10px';
                
                recoveryButton.addEventListener('click', () => {
                    const employee = window.employeesData.find(e => e.id === employeeId);
                    if (employee) {
                        attemptToFixEmployee(employee);
                    }
                });
                
                card.appendChild(recoveryButton);
            }
        });
    }
    
    // Extract employee ID from a card based on content
    function extractEmployeeIdFromCard(card) {
        // Try to find the employee by name
        const cardText = card.textContent;
        for (const employee of window.employeesData) {
            const employeeName = `${employee.firstName} ${employee.lastName}`;
            if (cardText.includes(employeeName)) {
                return employee.id;
            }
        }
        return null;
    }
    
    // Check periodically for UI elements that need recovery buttons
    function monitorForErrorElements() {
        setInterval(addRecoveryButtons, 3000);
    }
    
    // Initialize when the page loads
    window.addEventListener('DOMContentLoaded', function() {
        // Initialize error recovery system
        setTimeout(initTaskErrorRecovery, 1000);
        
        // Start monitoring for errors in the UI
        setTimeout(monitorForErrorElements, 2000);
    });
    
    // Also initialize if the page changes to operations
    document.addEventListener('pageChanged', function(e) {
        if (e.detail && e.detail.page === 'operations') {
            setTimeout(initTaskErrorRecovery, 1000);
            setTimeout(monitorForErrorElements, 2000);
        }
    });
    
    // Export for manual use
    window.taskErrorRecovery = {
        checkAndFixEmployeeErrors,
        attemptToFixEmployee,
        resetAllEmployees: function() {
            window.employeesData.forEach(attemptToFixEmployee);
        }
    };
    // At the end of the file
// Immediately initialize when the file loads
initTaskErrorRecovery();

// Call this periodically to ensure task system is running
setInterval(checkAndFixEmployeeErrors, 30000); // Check every 30 seconds
})();