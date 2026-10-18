// /js/pages/operationsPage.js

window.renderOperationsPage = function (mainContent: HTMLElement, page: PageScope): void {
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
    prescriptionsSection.appendChild(prescriptionsList);

    // Finally, attach our container to the mainContent
    mainContent.appendChild(container);

    // Prescriptions whose details the player has opened, kept across redraws
    const expandedPrescriptions = new Set<string>();

    // --------------------- INITIAL UI UPDATES ---------------------
    function renderAll(): void {
        renderEmployees();
        renderTasks();
        renderCustomers();
        renderPrescriptions();
    }
    renderAll();

    // Redraw when anything shown here changes (at most once a frame).
    // Progress bars update themselves every frame (taskbars.ts).
    page.on('tasks', renderAll);
    page.on('employees', renderAll);
    page.on('customers', renderAll);
    page.on('prescriptions', renderAll);

    // --------------------- RENDERING FUNCTIONS ---------------------

    // Render employees with card style
    function renderEmployees(): void {
        const employeesList = document.getElementById('employeesList');
        if (!employeesList) return;

        employeesList.innerHTML = '';
        let idleCount = 0;

        window.employeesData.forEach((emp) => {
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
                const task = window.taskManager.tasks.find((t) => t.id === emp.currentTaskId);
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
                    }

                    taskInfo.textContent = `Current Task: ${taskTypeDescription}`;
                    empCard.appendChild(taskInfo);

                    // --- PROGRESS BAR ---
                    if (task.status === 'inProgress' && task.totalTime > 0 && window.taskbars) {
                        empCard.appendChild(window.taskbars.createProgressBar(task));
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
    function renderTasks(): void {
        const tasksList = document.getElementById('tasksList');
        if (!tasksList) return;

        tasksList.innerHTML = ''; // Clear existing tasks

        const activeTasks = window.taskManager.tasks.filter((t) => t.status !== 'completed');
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
        const groupedTasks: Record<string, Task[]> = {};
        activeTasks.forEach((task) => {
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
            }

            groupHeader.textContent = taskTypeDescription;
            tasksList.appendChild(groupHeader);

            tasksOfType.forEach((task: Task) => {
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
                    const assignedEmp = window.employeesData.find((e) => e.id === task.assignedTo);
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
                if (task.status === 'inProgress' && task.totalTime > 0 && window.taskbars) {
                    taskDiv.appendChild(window.taskbars.createProgressBar(task));
                }

                tasksList.appendChild(taskDiv);
            });
        }
    }

    function renderCustomers(): void {
        customersList.innerHTML = '';
        const customers = window.customers?.activeCustomers ?? [];

        if (customers.length === 0) {
            const noCustomersMessage = document.createElement('p');
            noCustomersMessage.textContent = 'No customers currently.';
            customersList.appendChild(noCustomersMessage);
            return;
        }

        customers.forEach((customer) => {
            const customerItem = document.createElement('div');
            customerItem.className = 'customer-item';
            customerItem.style.border = '1px solid #ddd';
            customerItem.style.borderRadius = '4px';
            customerItem.style.padding = '0.5rem';
            customerItem.style.marginBottom = '0.5rem';
            customerItem.style.backgroundColor = '#f9f9f9';

            const customerName = document.createElement('strong');
            customerName.textContent = customer.isReturning
                ? `${customer.firstName} ${customer.lastName} (Returning)`
                : `${customer.firstName} ${customer.lastName}`;
            customerItem.appendChild(customerName);

            // Make customer status more prominent
            const customerStatus = document.createElement('p');
            customerStatus.style.marginTop = '0.25rem';
            customerStatus.style.fontSize = '1.1em';
            customerStatus.textContent = `Status: ${customer.status}`;
            if (customer.status === 'waitingForConsultation') {
                customerStatus.style.color = 'orange';
            } else if (customer.status === 'readyForCheckout') {
                customerStatus.style.color = 'blue';
            } else if (customer.status === 'completed') {
                customerStatus.style.color = 'green';
            }
            customerItem.appendChild(customerStatus);

            const arrivalTime = document.createElement('p');
            arrivalTime.textContent = `Arrived at: ${window.ui.formatDateTime(new Date(customer.arrivedAt))}`;
            arrivalTime.style.fontSize = '0.9em';
            arrivalTime.style.color = 'grey';
            customerItem.appendChild(arrivalTime);

            customersList.appendChild(customerItem);
        });
    }

    function renderPrescriptions(): void {
        prescriptionsList.innerHTML = '';
        const prescriptions = window.prescriptions?.activePrescriptions ?? [];

        if (prescriptions.length === 0) {
            const noPrescriptionsMessage = document.createElement('p');
            noPrescriptionsMessage.textContent = 'No active prescriptions.';
            prescriptionsList.appendChild(noPrescriptionsMessage);
            return;
        }

        prescriptions.forEach((prescription) => {
            const prescriptionItem = document.createElement('div');
            prescriptionItem.className = 'prescription-item';
            prescriptionItem.style.border = '1px solid #ddd';
            prescriptionItem.style.borderRadius = '4px';
            prescriptionItem.style.padding = '0.5rem';
            prescriptionItem.style.marginBottom = '0.5rem';
            prescriptionItem.style.backgroundColor = '#f9f9f9';

            const prescriptionId = document.createElement('strong');
            prescriptionId.textContent = `ID: ${prescription.id}`;
            prescriptionItem.appendChild(prescriptionId);

            const productName = document.createElement('p');
            productName.textContent = `Product: ${prescription.productName}`;
            prescriptionItem.appendChild(productName);

            const status = document.createElement('p');
            status.textContent = `Status: ${prescription.status}`;
            if (prescription.status === 'pending') {
                status.style.color = 'orange';
            } else if (prescription.status === 'filled') {
                status.style.color = 'blue';
            }
            prescriptionItem.appendChild(status);

            const detailsDiv = document.createElement('div');
            const expanded = expandedPrescriptions.has(prescription.id);
            detailsDiv.style.display = expanded ? 'block' : 'none';

            const dosage = document.createElement('p');
            dosage.textContent = `Dosage: ${prescription.dosage}`;
            detailsDiv.appendChild(dosage);

            const frequency = document.createElement('p');
            frequency.textContent = `Frequency: ${prescription.frequency}`;
            detailsDiv.appendChild(frequency);

            const doctorName = document.createElement('p');
            doctorName.textContent = `Doctor: ${prescription.doctorName}`;
            detailsDiv.appendChild(doctorName);

            const refills = document.createElement('p');
            refills.textContent = prescription.isRefill
                ? `Refills Remaining: ${prescription.refillsAllowed} (this is a refill visit)`
                : `Refills Remaining: ${prescription.refillsAllowed}`;
            detailsDiv.appendChild(refills);

            const assignedEmployee = document.createElement('p');
            const assignedEmp = prescription.assignedEmployeeId
                ? window.employeesData.find((e) => e.id === prescription.assignedEmployeeId)
                : undefined;
            assignedEmployee.textContent = `Assigned To: ${assignedEmp ? `${assignedEmp.firstName} ${assignedEmp.lastName}` : 'Unassigned'}`;
            detailsDiv.appendChild(assignedEmployee);

            prescriptionItem.appendChild(detailsDiv);

            const toggleButton = document.createElement('button');
            toggleButton.textContent = expanded ? 'Hide Details' : 'Show Details';
            toggleButton.style.marginTop = '0.5rem';
            toggleButton.addEventListener('click', () => {
                const open = detailsDiv.style.display === 'none';
                detailsDiv.style.display = open ? 'block' : 'none';
                toggleButton.textContent = open ? 'Hide Details' : 'Show Details';
                if (open) expandedPrescriptions.add(prescription.id);
                else expandedPrescriptions.delete(prescription.id);
            });
            prescriptionItem.appendChild(toggleButton);

            prescriptionsList.appendChild(prescriptionItem);
        });
    }
};
