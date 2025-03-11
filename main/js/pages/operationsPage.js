// /js/pages/operationsPage.js - FIXED VERSION

window.renderOperationsPage = function (mainContent) {
    // Indicate we've navigated to "operations"
    window.currentPage = 'operations';

    // Clear existing content
    mainContent.innerHTML = '';

    // Create a top-level container
    const container = document.createElement('div');
    container.className = 'operations-page-container';

    // Add a header
    const header = document.createElement('h2');
    header.textContent = 'Operations (Live Environment)';
    container.appendChild(header);

    // Add a short subtitle or info
    const subtitle = document.createElement('p');
    subtitle.textContent = 'Real-time status of employees, tasks, and customers.';
    container.appendChild(subtitle);

    // Create a top row that will hold summary statistics
    const summaryRow = document.createElement('div');
    summaryRow.style.display = 'flex';
    summaryRow.style.gap = '1rem';
    summaryRow.style.marginBottom = '1rem';
    container.appendChild(summaryRow);

    // Card for "Active Tasks" count
    const activeTasksCard = document.createElement('div');
    activeTasksCard.style.flex = '1';
    activeTasksCard.style.border = '1px solid #ccc';
    activeTasksCard.style.borderRadius = '4px';
    activeTasksCard.style.padding = '1rem';
    activeTasksCard.style.backgroundColor = '#fff';
    activeTasksCard.innerHTML = '<h4>Active Tasks</h4><p id="activeTasksCount">0</p>';
    summaryRow.appendChild(activeTasksCard);

    // Card for "Idle Employees" count
    const idleEmployeesCard = document.createElement('div');
    idleEmployeesCard.style.flex = '1';
    idleEmployeesCard.style.border = '1px solid #ccc';
    idleEmployeesCard.style.borderRadius = '4px';
    idleEmployeesCard.style.padding = '1rem';
    idleEmployeesCard.style.backgroundColor = '#fff';
    idleEmployeesCard.innerHTML = '<h4>Idle Employees</h4><p id="idleEmployeesCount">0</p>';
    summaryRow.appendChild(idleEmployeesCard);

    // Main content sections: "Employees & Tasks" (left) and "Customers & Prescriptions" (right)
    const mainGrid = document.createElement('div');
    mainGrid.style.display = 'grid';
    mainGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';
    mainGrid.style.gap = '1.5rem';
    container.appendChild(mainGrid);

    // Left column: Employees & Tasks
    const leftCol = document.createElement('div');
    mainGrid.appendChild(leftCol);

    // Right column: Customers & Prescriptions
    const rightCol = document.createElement('div');
    mainGrid.appendChild(rightCol);

    // --------------------- EMPLOYEES & TASKS SECTION ---------------------
    const employeesSection = document.createElement('div');
    employeesSection.style.border = '1px solid #ccc';
    employeesSection.style.borderRadius = '4px';
    employeesSection.style.padding = '1rem';
    employeesSection.style.backgroundColor = '#fff';
    leftCol.appendChild(employeesSection);

    const employeesTitle = document.createElement('h3');
    employeesTitle.textContent = 'Employees & Tasks';
    employeesTitle.style.cursor = 'pointer'; // Make the title clickable to collapse
    employeesTitle.addEventListener('click', () => {
        employeesList.classList.toggle('collapsed');
    });
    employeesSection.appendChild(employeesTitle);

    // A container for the list of employees
    const employeesList = document.createElement('div');
    employeesList.id = 'employeesList'; // Add ID for direct updating
    employeesSection.appendChild(employeesList);

    // Next, a container for "All Active Tasks"
    const tasksSection = document.createElement('div');
    tasksSection.style.marginTop = '1rem';
    employeesSection.appendChild(tasksSection);

    const tasksTitle = document.createElement('h3');
    tasksTitle.textContent = 'All Active Tasks';
    tasksTitle.style.cursor = 'pointer'; // Make clickable
    tasksTitle.addEventListener('click', () => {
        tasksList.classList.toggle('collapsed');
    });
    tasksSection.appendChild(tasksTitle);

    // Create a container for tasks
    const tasksList = document.createElement('div');
    tasksList.id = 'tasksList'; // Add ID for direct updating
    tasksSection.appendChild(tasksList);

    // --------------------- CUSTOMERS SECTION ---------------------
    const customersSection = document.createElement('div');
    customersSection.style.border = '1px solid #ccc';
    customersSection.style.borderRadius = '4px';
    customersSection.style.padding = '1rem';
    customersSection.style.backgroundColor = '#fff';
    rightCol.appendChild(customersSection);

    const customersTitle = document.createElement('h3');
    customersTitle.textContent = 'Customers in the Pharmacy';
    customersTitle.style.cursor = 'pointer'; // Make the title clickable
    customersTitle.addEventListener('click', () => {
        customersList.classList.toggle('collapsed');
    });
    customersSection.appendChild(customersTitle);

    // The DIV we want for ui.updateCustomers
    const customersList = document.createElement('div');
    customersList.id = 'customersList';
    customersSection.appendChild(customersList);

    // --------------------- PRESCRIPTIONS SECTION ---------------------
    const prescriptionsSection = document.createElement('div');
    prescriptionsSection.style.border = '1px solid #ccc';
    prescriptionsSection.style.borderRadius = '4px';
    prescriptionsSection.style.padding = '1rem';
    prescriptionsSection.style.backgroundColor = '#fff';
    rightCol.appendChild(prescriptionsSection);

    const prescriptionsTitle = document.createElement('h3');
    prescriptionsTitle.textContent = 'Active Prescriptions';
    prescriptionsTitle.style.cursor = 'pointer'; // Make the title clickable
    prescriptionsTitle.addEventListener('click', () => {
        prescriptionsList.classList.toggle('collapsed');
    });
    prescriptionsSection.appendChild(prescriptionsTitle);

    // The DIV we want for ui.updatePrescriptions
    const prescriptionsList = document.createElement('div');
    prescriptionsList.id = 'prescriptionsList';
    prescriptionsSection.appendChild(prescriptionsList);

    // Finally, attach our container to the mainContent
    mainContent.appendChild(container);

    // --------------------- INITIAL UI UPDATES ---------------------
    renderEmployees();
    renderTasks();
    renderCustomers();
    renderPrescriptions();

    // --------------------- RENDERING FUNCTIONS ---------------------

    // Render employees with card style
    function renderEmployees() {
        const employeesList = document.getElementById('employeesList');
        if (!employeesList) return;
        
        employeesList.innerHTML = '';
        let idleCount = 0;

        window.employeesData.forEach(emp => {
            const empCard = document.createElement('div');
            empCard.style.border = '1px solid #ddd';
            empCard.style.borderRadius = '4px';
            empCard.style.padding = '0.5rem';
            empCard.style.marginBottom = '0.5rem';
            empCard.style.backgroundColor = '#f9f9f9';

            const empHeader = document.createElement('strong');
            empHeader.textContent = `${emp.firstName} ${emp.lastName} (${emp.role})`;
            empCard.appendChild(empHeader);

            const taskInfo = document.createElement('p');
            if (emp.currentTaskId) {
                const task = window.taskManager.tasks.find(t => t.id === emp.currentTaskId);
                if (task) {
                    // Make the task type more descriptive
                    let taskTypeDescription = task.type;
                    if (taskTypeDescription === 'fillPrescription') {
                        taskTypeDescription = 'Filling Prescription';
                    } else if (taskTypeDescription === 'customerInteraction') {
                        taskTypeDescription = 'Customer Interaction';
                    } else if (taskTypeDescription === 'consultation') {
                        taskTypeDescription = 'Consultation';
                    } else if (taskTypeDescription === 'compound') {
                        taskTypeDescription = 'Compounding';
                    } else if (taskTypeDescription === 'production') {
                        taskTypeDescription = 'Production';
                    }

                    taskInfo.textContent = `Current Task: ${taskTypeDescription}`;
                    empCard.appendChild(taskInfo);

                    // --- PROGRESS BAR ---
                    if (task.status === 'inProgress' && task.totalTime > 0) {
                        const progressBarLabel = document.createElement('p');
                        progressBarLabel.style.marginTop = '0.25rem';
                        progressBarLabel.textContent = 'Progress:';
                        empCard.appendChild(progressBarLabel);

                        // Create a progress element
                        const progressBar = document.createElement('progress');
                        progressBar.value = task.progress;       // current progress
                        progressBar.max = task.totalTime;        // total minutes
                        progressBar.style.width = '100%';
                        empCard.appendChild(progressBar);

                        // Add time estimate
                        const timeLeft = task.totalTime - task.progress;
                        const timeEstimate = document.createElement('small');
                        timeEstimate.style.display = 'block';
                        timeEstimate.style.color = '#666';
                        timeEstimate.textContent = `Est. time remaining: ${timeLeft} minutes`;
                        empCard.appendChild(timeEstimate);
                    }
                } else {
                    taskInfo.textContent = 'Current Task: Error - Not Found';
                    taskInfo.style.color = 'red';
                    empCard.appendChild(taskInfo);
                }
            } else {
                taskInfo.textContent = 'Current Task: None (Idle)';
                taskInfo.style.color = 'grey'; // Make idle status visually distinct
                empCard.appendChild(taskInfo);
                idleCount++;
            }

            employeesList.appendChild(empCard);
        });

        // Update the "Idle Employees" summary
        const idleEl = document.getElementById('idleEmployeesCount');
        if (idleEl) {
            idleEl.textContent = idleCount.toString();
        }
    }

    // Render all active tasks
    function renderTasks() {
        const tasksList = document.getElementById('tasksList');
        if (!tasksList) return;
        
        tasksList.innerHTML = ''; // Clear existing tasks

        const activeTasks = window.taskManager.tasks.filter(t => t.status !== 'completed');
        const activeCount = activeTasks.length;

        // Update the summary for active tasks
        const activeTasksEl = document.getElementById('activeTasksCount');
        if (activeTasksEl) {
            activeTasksEl.textContent = activeCount.toString();
        }

        if (activeCount === 0) {
            const none = document.createElement('p');
            none.className = 'task-entry';
            none.textContent = 'No active tasks at the moment.';
            tasksList.appendChild(none);
            return;
        }

        // Group tasks by type
        const groupedTasks = {};
        activeTasks.forEach(task => {
            if (!groupedTasks[task.type]) {
                groupedTasks[task.type] = [];
            }
            groupedTasks[task.type].push(task);
        });

        // Render tasks group by group
        for (const taskType in groupedTasks) {
            const tasksOfType = groupedTasks[taskType];

            // Add a header for each task type
            const groupHeader = document.createElement('h4');
            let taskTypeDescription = taskType;
            if (taskTypeDescription === 'fillPrescription') {
                taskTypeDescription = 'Filling Prescriptions';
            } else if (taskTypeDescription === 'customerInteraction') {
                taskTypeDescription = 'Customer Interactions';
            } else if (taskTypeDescription === 'consultation') {
                taskTypeDescription = 'Consultations';
            } else if (taskTypeDescription === 'compound') {
                taskTypeDescription = 'Compounding';
            } else if (taskTypeDescription === 'production') {
                taskTypeDescription = 'Production Tasks';
            }

            groupHeader.textContent = taskTypeDescription;
            tasksList.appendChild(groupHeader);

            tasksOfType.forEach(task => {
                const taskDiv = document.createElement('div');
                taskDiv.className = 'task-entry';
                taskDiv.style.border = '1px solid #ddd';
                taskDiv.style.borderRadius = '4px';
                taskDiv.style.padding = '0.5rem';
                taskDiv.style.marginBottom = '0.5rem';
                taskDiv.style.backgroundColor = '#fafafa';

                const titleRow = document.createElement('div');
                titleRow.style.display = 'flex';
                titleRow.style.alignItems = 'center';
                titleRow.style.marginBottom = '0.25rem';

                const colorIcon = document.createElement('span');
                colorIcon.style.display = 'inline-block';
                colorIcon.style.width = '10px';
                colorIcon.style.height = '10px';
                colorIcon.style.borderRadius = '50%';
                colorIcon.style.marginRight = '8px';

                if (task.type === 'compound') {
                    colorIcon.style.backgroundColor = '#ff9800'; // Orange for compounding
                } else if (task.type === 'fillPrescription') {
                    colorIcon.style.backgroundColor = '#4caf50'; // Green for filling
                } else if (task.type === 'customerInteraction') {
                    colorIcon.style.backgroundColor = '#2196f3'; // Blue for customer interaction
                } else if (task.type === 'consultation') {
                    colorIcon.style.backgroundColor = '#9C27B0'; // Purple for consultation
                } else {
                    colorIcon.style.backgroundColor = '#607D8B'; // Grey for other tasks
                }
                titleRow.appendChild(colorIcon);

                const titleText = document.createElement('strong');
                if (task.type === 'fillPrescription') {
                    titleText.textContent = `Prescription ID: ${task.prescriptionId}`;
                } else if (task.type === 'compound') {
                    titleText.textContent = `Compounding: ${task.productName}`;
                } else {
                    titleText.textContent = `Task ID: ${task.id}`;
                }
                titleRow.appendChild(titleText);

                taskDiv.appendChild(titleRow);

                // Add product name if not shown in title
                if (task.productName && task.type !== 'compound') {
                    const productLine = document.createElement('p');
                    productLine.textContent = `Product: ${task.productName}`;
                    taskDiv.appendChild(productLine);
                }

                // Show status with color coding
                const statusLine = document.createElement('p');
                statusLine.textContent = `Status: ${task.status}`;
                if (task.status === 'inProgress') {
                    statusLine.style.color = 'green';
                } else if (task.status === 'pending') {
                    statusLine.style.color = 'blue';
                } else if (task.status === 'pending-dependent') {
                    statusLine.style.color = 'orange';
                    statusLine.textContent = 'Status: waiting for prerequisites';
                }
                taskDiv.appendChild(statusLine);

                // Assigned employee
                if (task.assignedTo) {
                    const assignedEmp = window.employeesData.find(e => e.id === task.assignedTo);
                    if (assignedEmp) {
                        const assignedLine = document.createElement('p');
                        assignedLine.textContent = `Assigned to: ${assignedEmp.firstName} ${assignedEmp.lastName} (${assignedEmp.role})`;
                        taskDiv.appendChild(assignedLine);
                    }
                } else {
                    const unassignedLine = document.createElement('p');
                    unassignedLine.textContent = 'Assigned to: (none)';
                    taskDiv.appendChild(unassignedLine);
                }

                // Progress bar for in-progress tasks
                if (task.status === 'inProgress' && task.totalTime > 0) {
                    const taskProgressLabel = document.createElement('p');
                    taskProgressLabel.textContent = 'Progress:';
                    taskDiv.appendChild(taskProgressLabel);

                    const taskProgressBar = document.createElement('progress');
                    taskProgressBar.value = task.progress;
                    taskProgressBar.max = task.totalTime;
                    taskProgressBar.style.width = '100%';
                    taskDiv.appendChild(taskProgressBar);

                    // Time remaining
                    const timeLeftLabel = document.createElement('small');
                    timeLeftLabel.style.display = 'block';
                    timeLeftLabel.textContent = `${task.progress} / ${task.totalTime} minutes`;
                    taskDiv.appendChild(timeLeftLabel);
                }

                tasksList.appendChild(taskDiv);
            });
        }
    }

    // Use the UI functions for customers and prescriptions
    function renderCustomers() {
        window.ui.updateCustomers();
    }

    function renderPrescriptions() {
        window.ui.updatePrescriptions();
    }

    // Set up periodic refresh for this page
    if (!window.operationsRefreshInterval) {
        window.operationsRefreshInterval = setInterval(() => {
            // Only refresh if we're still on the operations page
            if (window.currentPage === 'operations') {
                renderEmployees();
                renderTasks();
                renderCustomers();
                renderPrescriptions();
            } else {
                // Stop the interval if we navigate away
                clearInterval(window.operationsRefreshInterval);
                window.operationsRefreshInterval = null;
            }
        }, 2000); // Refresh every 2 seconds
    }

    // Return a cleanup function
    return function cleanup() {
        if (window.operationsRefreshInterval) {
            clearInterval(window.operationsRefreshInterval);
            window.operationsRefreshInterval = null;
        }
    };
};