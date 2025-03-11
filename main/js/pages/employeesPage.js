// /js/pages/employeesPage.js - IMPROVED VERSION

function renderEmployeesPage(mainContent) {
    mainContent.innerHTML = '';

    // Main container for the Employees page
    const container = document.createElement('div');
    container.className = 'employees-page-container';

    // Page Title
    const title = document.createElement('h2');
    title.textContent = 'Employee Management';
    container.appendChild(title);
    
    const subtitle = document.createElement('p');
    subtitle.textContent = 'Hire, manage, and assign employees to maximize your pharmacy\'s productivity.';
    container.appendChild(subtitle);

    // Tabs Container
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'tabs-container';
    container.appendChild(tabsContainer);

    // Tab Buttons
    const employeesTabButton = document.createElement('button');
    employeesTabButton.className = 'tab-button active';
    employeesTabButton.textContent = 'Current Staff';
    tabsContainer.appendChild(employeesTabButton);

    const hireTabButton = document.createElement('button');
    hireTabButton.className = 'tab-button';
    hireTabButton.textContent = 'Hire New Staff';
    tabsContainer.appendChild(hireTabButton);

    // Tab Content Containers
    const employeesTabContent = document.createElement('div');
    employeesTabContent.className = 'tab-content employees-content';
    container.appendChild(employeesTabContent);

    const hireTabContent = document.createElement('div');
    hireTabContent.className = 'tab-content hire-content';
    hireTabContent.style.display = 'none';
    container.appendChild(hireTabContent);

    // --------------------------------------------------------------
    // EMPLOYEES TAB CONTENT
    // --------------------------------------------------------------
    
    // Staff Summary Cards
    const summaryContainer = document.createElement('div');
    summaryContainer.className = 'staff-summary-container';
    
    // Total Staff 
    const totalStaffCard = document.createElement('div');
    totalStaffCard.className = 'summary-card';
    totalStaffCard.innerHTML = `
        <div class="summary-content">
            <h3>Total Staff</h3>
            <p class="summary-value">${window.employeesData.length}</p>
        </div>
    `;
    summaryContainer.appendChild(totalStaffCard);
    
    // Daily Wage
    const dailyWageTotal = window.employeesData.reduce((total, emp) => total + (emp.salary / 30), 0);
    const dailyWageCard = document.createElement('div');
    dailyWageCard.className = 'summary-card';
    dailyWageCard.innerHTML = `
        <div class="summary-content">
            <h3>Daily Wages</h3>
            <p class="summary-value">$${dailyWageTotal.toFixed(2)}</p>
        </div>
    `;
    summaryContainer.appendChild(dailyWageCard);
    
    // Average Morale
    const avgMorale = window.employeesData.reduce((total, emp) => total + emp.morale, 0) / window.employeesData.length;
    const moraleCard = document.createElement('div');
    moraleCard.className = 'summary-card';
    moraleCard.innerHTML = `
        <div class="summary-content">
            <h3>Avg. Morale</h3>
            <p class="summary-value">${avgMorale.toFixed(1)}%</p>
        </div>
    `;
    summaryContainer.appendChild(moraleCard);
    
    employeesTabContent.appendChild(summaryContainer);

    // Search Bar
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search employees...';
    searchInput.className = 'search-input';
    searchContainer.appendChild(searchInput);
    
    employeesTabContent.appendChild(searchContainer);

    // Employee Cards Container
    const employeesGrid = document.createElement('div');
    employeesGrid.className = 'employees-grid';
    employeesTabContent.appendChild(employeesGrid);

    // --------------------------------------------------------------
    // HIRE TAB CONTENT
    // --------------------------------------------------------------
    
    // Job Posting Section
    const jobPostingSection = document.createElement('div');
    jobPostingSection.className = 'job-posting-section';
    
    const jobPostingTitle = document.createElement('h3');
    jobPostingTitle.textContent = 'Create Job Posting';
    jobPostingSection.appendChild(jobPostingTitle);
    
    const jobPostingDescription = document.createElement('p');
    jobPostingDescription.textContent = 'Select the role and experience level you want to hire for.';
    jobPostingSection.appendChild(jobPostingDescription);
    
    // Role Selection
    const roleSelectionContainer = document.createElement('div');
    roleSelectionContainer.className = 'form-group';
    
    const roleSelectLabel = document.createElement('label');
    roleSelectLabel.textContent = 'Position:';
    roleSelectLabel.className = 'form-label';
    roleSelectionContainer.appendChild(roleSelectLabel);
    
    const roleSelect = document.createElement('select');
    roleSelect.className = 'form-select';
    
    const availableRoles = ['Pharmacist', 'Lab Technician', 'Cashier'];
    availableRoles.forEach(role => {
        const option = document.createElement('option');
        option.value = role;
        option.text = role;
        roleSelect.appendChild(option);
    });
    
    roleSelectionContainer.appendChild(roleSelect);
    jobPostingSection.appendChild(roleSelectionContainer);
    
    // Experience Level Selection
    const skillLevelContainer = document.createElement('div');
    skillLevelContainer.className = 'form-group';
    
    const skillLevelLabel = document.createElement('label');
    skillLevelLabel.textContent = 'Experience Level:';
    skillLevelLabel.className = 'form-label';
    skillLevelContainer.appendChild(skillLevelLabel);
    
    const skillLevelSelect = document.createElement('select');
    skillLevelSelect.className = 'form-select';
    
    const skillLevels = [
        { value: 'Novice', text: 'Entry Level' },
        { value: 'Intermediate', text: 'Experienced' },
        { value: 'Skilled', text: 'Senior' }
    ];
    
    skillLevels.forEach(level => {
        const option = document.createElement('option');
        option.value = level.value;
        option.text = level.text;
        skillLevelSelect.appendChild(option);
    });
    
    skillLevelContainer.appendChild(skillLevelSelect);
    jobPostingSection.appendChild(skillLevelContainer);
    
    // Hiring Fee Display
    const hiringFeeContainer = document.createElement('div');
    hiringFeeContainer.className = 'hiring-fee-container';
    
    const hiringFeeLabel = document.createElement('span');
    hiringFeeLabel.textContent = 'Hiring Fee: $500';
    hiringFeeContainer.appendChild(hiringFeeLabel);
    
    jobPostingSection.appendChild(hiringFeeContainer);
    
    // Generate Candidates Button
    const generateCandidatesButton = document.createElement('button');
    generateCandidatesButton.className = 'primary-button';
    generateCandidatesButton.textContent = 'Find Candidates';
    generateCandidatesButton.onclick = () => {
        const role = roleSelect.value;
        const skillLevel = skillLevelSelect.value;
        window.employees.hireEmployee(role, skillLevel);
    };
    
    jobPostingSection.appendChild(generateCandidatesButton);
    
    hireTabContent.appendChild(jobPostingSection);
    
    // Candidates Container
    const candidatesSection = document.createElement('div');
    candidatesSection.className = 'candidates-section';
    
    const candidatesTitle = document.createElement('h3');
    candidatesTitle.textContent = 'Available Candidates';
    candidatesSection.appendChild(candidatesTitle);
    
    const candidatesContainer = document.createElement('div');
    candidatesContainer.className = 'candidates-container';
    candidatesSection.appendChild(candidatesContainer);
    
    hireTabContent.appendChild(candidatesSection);

    // --------------------------------------------------------------
    // RENDERING FUNCTIONS
    // --------------------------------------------------------------

    // Render Employee Cards
    function renderEmployees(searchText = '') {
        employeesGrid.innerHTML = ''; // Clear existing cards
        
        let filteredEmployees = window.employeesData.filter(employee => {
            if (!searchText) return true;
            
            const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
            return fullName.includes(searchText.toLowerCase()) || 
                   employee.role.toLowerCase().includes(searchText.toLowerCase());
        });
        
        if (filteredEmployees.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.textContent = 'No employees match your search criteria.';
            employeesGrid.appendChild(noResults);
            return;
        }
        
        filteredEmployees.forEach(employee => {
            const card = createEmployeeCard(employee);
            employeesGrid.appendChild(card);
        });
    }
    
    // Create an employee card
    function createEmployeeCard(employee) {
        const card = document.createElement('div');
        card.className = 'employee-card';
        
        // Header with name and role
        const header = document.createElement('div');
        header.className = 'card-header';
        
        const name = document.createElement('h3');
        name.textContent = `${employee.firstName} ${employee.lastName}`;
        header.appendChild(name);
        
        const role = document.createElement('div');
        role.className = 'employee-role';
        role.textContent = employee.role;
        header.appendChild(role);
        
        // Status badge (busy or available)
        const status = document.createElement('div');
        status.className = `status-badge ${employee.currentTaskId ? 'busy' : 'available'}`;
        status.textContent = employee.currentTaskId ? 'Busy' : 'Available';
        header.appendChild(status);
        
        card.appendChild(header);
        
        // Details section
        const details = document.createElement('div');
        details.className = 'employee-details';
        
        // Salary
        const salary = document.createElement('div');
        salary.className = 'detail-item';
        salary.innerHTML = `<span class="label">Salary:</span> $${employee.salary.toLocaleString()}/year`;
        details.appendChild(salary);
        
        // Morale with colored indicator and mood emoji
        const morale = document.createElement('div');
        morale.className = 'detail-item';
        
        let moraleColor = '#f44336'; // Red
        if (employee.morale >= 70) moraleColor = '#4caf50'; // Green
        else if (employee.morale >= 40) moraleColor = '#ff9800'; // Orange
        
        morale.innerHTML = `
            <span class="label">Morale:</span> 
            <span style="color: ${moraleColor};">${employee.morale}%</span> 
            <span class="mood-emoji">${employee.mood}</span>`;
        details.appendChild(morale);
        
        // Hired date
        const hired = document.createElement('div');
        hired.className = 'detail-item';
        hired.innerHTML = `<span class="label">Hired:</span> ${new Date(employee.hireDate).toLocaleDateString()}`;
        details.appendChild(hired);
        
        card.appendChild(details);
        
        // Skills section
        const skillsSection = document.createElement('div');
        skillsSection.className = 'skills-section';
        
        const skillsHeader = document.createElement('h4');
        skillsHeader.textContent = 'Skills';
        skillsSection.appendChild(skillsHeader);
        
        const skillsGrid = document.createElement('div');
        skillsGrid.className = 'skills-grid';
        
        for (const [skill, value] of Object.entries(employee.skills)) {
            const skillBar = document.createElement('div');
            skillBar.className = 'skill-bar';
            
            // Format skill name (camelCase to Title Case)
            const formattedSkill = skill.replace(/([A-Z])/g, ' $1')
                                       .replace(/^./, str => str.toUpperCase());
            
            skillBar.innerHTML = `
                <div class="skill-name">${formattedSkill}</div>
                <div class="skill-progress">
                    <div class="skill-progress-fill" style="width: ${value}%"></div>
                </div>
                <div class="skill-value">${value}</div>
            `;
            
            skillsGrid.appendChild(skillBar);
        }
        
        skillsSection.appendChild(skillsGrid);
        card.appendChild(skillsSection);
        
        // Current task section (if any)
        if (employee.currentTaskId) {
            const task = window.taskManager.tasks.find(t => t.id === employee.currentTaskId);
            
            if (task) {
                const taskSection = document.createElement('div');
                taskSection.className = 'task-section';
                
                const taskHeader = document.createElement('h4');
                taskHeader.textContent = 'Current Task';
                taskSection.appendChild(taskHeader);
                
                let taskTypeDisplay = task.type;
                if (task.type === 'fillPrescription') taskTypeDisplay = 'Filling Prescription';
                else if (task.type === 'customerInteraction') taskTypeDisplay = 'Customer Interaction';
                else if (task.type === 'consultation') taskTypeDisplay = 'Consultation';
                else if (task.type === 'compound') taskTypeDisplay = 'Compounding';
                
                const taskInfo = document.createElement('div');
                taskInfo.className = 'task-info';
                taskInfo.textContent = taskTypeDisplay;
                taskSection.appendChild(taskInfo);
                
                // Progress bar
                const progressContainer = document.createElement('div');
                progressContainer.className = 'progress-container';
                
                const progressLabel = document.createElement('div');
                progressLabel.className = 'progress-label';
                progressLabel.textContent = `Progress: ${task.progress}/${task.totalTime} min`;
                progressContainer.appendChild(progressLabel);
                
                const progressBar = document.createElement('div');
                progressBar.className = 'progress-bar';
                
                const progressFill = document.createElement('div');
                progressFill.className = 'progress-fill';
                progressFill.style.width = `${(task.progress / task.totalTime) * 100}%`;
                
                progressBar.appendChild(progressFill);
                progressContainer.appendChild(progressBar);
                
                taskSection.appendChild(progressContainer);
                card.appendChild(taskSection);
            }
        }
        
        // Action buttons
        const actionsSection = document.createElement('div');
        actionsSection.className = 'actions-section';
        
        // Fire button
        const fireButton = document.createElement('button');
        fireButton.className = 'action-button fire-button';
        fireButton.textContent = 'Terminate';
        fireButton.onclick = () => confirmFireEmployee(employee);
        actionsSection.appendChild(fireButton);
        
        card.appendChild(actionsSection);
        
        return card;
    }

    // Function to display employee candidates
    window.displayEmployeeCandidates = function(candidates) {
        const candidatesContainer = document.querySelector('.candidates-container');
        if (!candidatesContainer) {
            console.error('Candidates container not found!');
            return;
        }
        
        candidatesContainer.innerHTML = ''; // Clear previous candidates
        
        if (candidates.length === 0) {
            const noCandidates = document.createElement('p');
            noCandidates.className = 'no-candidates';
            noCandidates.textContent = 'No candidates available. Create a job posting to find candidates.';
            candidatesContainer.appendChild(noCandidates);
            return;
        }

        candidates.forEach(candidate => {
            const candidateCard = document.createElement('div');
            candidateCard.className = 'candidate-card';
            
            // Candidate header
            const header = document.createElement('div');
            header.className = 'candidate-header';
            
            const name = document.createElement('h3');
            name.textContent = `${candidate.firstName} ${candidate.lastName}`;
            header.appendChild(name);
            
            const role = document.createElement('div');
            role.className = 'candidate-role';
            role.textContent = candidate.role;
            header.appendChild(role);
            
            candidateCard.appendChild(header);
            
            // Candidate details
            const details = document.createElement('div');
            details.className = 'candidate-details';
            
            // Salary expectation
            const salary = document.createElement('div');
            salary.className = 'detail-item';
            salary.innerHTML = `<span class="label">Salary:</span> $${candidate.salary.toLocaleString()}/year`;
            details.appendChild(salary);
            
            // Skills summary
            const skills = document.createElement('div');
            skills.className = 'candidate-skills';
            
            const skillsHeader = document.createElement('h4');
            skillsHeader.textContent = 'Key Skills';
            skills.appendChild(skillsHeader);
            
            // Find top 3 skills
            const topSkills = Object.entries(candidate.skills)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);
            
            topSkills.forEach(([skill, value]) => {
                const skillItem = document.createElement('div');
                skillItem.className = 'skill-item';
                
                // Format skill name
                const formattedSkill = skill.replace(/([A-Z])/g, ' $1')
                                          .replace(/^./, str => str.toUpperCase());
                
                skillItem.innerHTML = `
                    <span class="skill-name">${formattedSkill}:</span>
                    <span class="skill-value">${value}</span>
                `;
                
                skills.appendChild(skillItem);
            });
            
            details.appendChild(skills);
            candidateCard.appendChild(details);
            
            // Hire button
            const hireButton = document.createElement('button');
            hireButton.className = 'hire-button';
            hireButton.textContent = 'Hire';
            hireButton.onclick = () => {
                window.employees.hireSelectedEmployee(candidate);
                candidatesContainer.removeChild(candidateCard); // Remove the card after hiring
                
                // Show success message
                alert(`Successfully hired ${candidate.firstName} ${candidate.lastName} as a ${candidate.role}!`);
                
                // Refresh the employees tab to show the new hire
                renderEmployees(searchInput.value);
            };
            
            candidateCard.appendChild(hireButton);
            
            candidatesContainer.appendChild(candidateCard);
        });
    };
    
    // Function to confirm firing an employee
    function confirmFireEmployee(employee) {
        if (confirm(`Are you sure you want to terminate ${employee.firstName} ${employee.lastName}?`)) {
            window.employees.fireEmployee(employee.id);
            renderEmployees(searchInput.value); // Update the employee list
        }
    }

    // --------------------------------------------------------------
    // EVENT LISTENERS
    // --------------------------------------------------------------

    // Tab event listeners
    employeesTabButton.addEventListener('click', function() {
        this.classList.add('active');
        hireTabButton.classList.remove('active');
        employeesTabContent.style.display = 'block';
        hireTabContent.style.display = 'none';
        renderEmployees(searchInput.value);
    });
    
    hireTabButton.addEventListener('click', function() {
        this.classList.add('active');
        employeesTabButton.classList.remove('active');
        hireTabContent.style.display = 'block';
        employeesTabContent.style.display = 'none';
    });
    
    // Search input event listener
    searchInput.addEventListener('input', function() {
        renderEmployees(this.value);
    });

    // Initial rendering
    renderEmployees();

    // Add CSS styling for the page
    const style = document.createElement('style');
    style.textContent = `
        /* Main Container */
        .employees-page-container {
            padding: 20px;
            font-family: sans-serif;
        }
        
        /* Tabs */
        .tabs-container {
            display: flex;
            margin-bottom: 20px;
            border-bottom: 1px solid #ddd;
        }
        
        .tab-button {
            padding: 10px 20px;
            background: none;
            border: none;
            border-bottom: 3px solid transparent;
            cursor: pointer;
            font-weight: 500;
        }
        
        .tab-button.active {
            border-bottom-color: #1a237e;
            color: #1a237e;
        }
        
        /* Summary Cards */
        .staff-summary-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .summary-card {
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            padding: 15px;
        }
        
        .summary-card h3 {
            margin-top: 0;
            font-size: 14px;
            color: #666;
        }
        
        .summary-value {
            font-size: 22px;
            font-weight: bold;
            color: #1a237e;
        }
        
        /* Search Bar */
        .search-container {
            margin-bottom: 20px;
        }
        
        .search-input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
        }
        
        /* Employee Cards */
        .employees-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .employee-card {
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .card-header {
            padding: 15px;
            border-bottom: 1px solid #eee;
            position: relative;
        }
        
        .card-header h3 {
            margin: 0 0 5px 0;
            font-size: 18px;
        }
        
        .employee-role {
            font-size: 14px;
            color: #666;
        }
        
        .status-badge {
            position: absolute;
            top: 15px;
            right: 15px;
            font-size: 12px;
            padding: 3px 8px;
            border-radius: 12px;
        }
        
        .status-badge.busy {
            background-color: #fff3e0;
            color: #ff9800;
        }
        
        .status-badge.available {
            background-color: #e8f5e9;
            color: #4caf50;
        }
        
        .employee-details {
            padding: 15px;
            border-bottom: 1px solid #eee;
        }
        
        .detail-item {
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .label {
            font-weight: 500;
            color: #666;
        }
        
        .mood-emoji {
            margin-left: 5px;
        }
        
        /* Skills Section */
        .skills-section {
            padding: 15px;
            border-bottom: 1px solid #eee;
        }
        
        .skills-section h4 {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 16px;
        }
        
        .skills-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
        }
        
        .skill-bar {
            display: grid;
            grid-template-columns: 120px 1fr 30px;
            align-items: center;
            gap: 10px;
        }
        
        .skill-name {
            font-size: 13px;
            color: #666;
        }
        
        .skill-progress {
            height: 8px;
            background-color: #eee;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .skill-progress-fill {
            height: 100%;
            background-color: #1a237e;
        }
        
        .skill-value {
            font-size: 13px;
            font-weight: 500;
            text-align: right;
        }
        
        /* Task Section */
        .task-section {
            padding: 15px;
            background-color: #f9f9f9;
            border-bottom: 1px solid #eee;
        }
        
        .task-section h4 {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 16px;
        }
        
        .task-info {
            font-size: 14px;
            margin-bottom: 10px;
            font-weight: 500;
        }
        
        .progress-container {
            margin-top: 10px;
        }
        
        .progress-label {
            font-size: 13px;
            color: #666;
            margin-bottom: 5px;
        }
        
        .progress-bar {
            height: 8px;
            background-color: #eee;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background-color: #4caf50;
        }
        
        /* Actions Section */
        .actions-section {
            padding: 15px;
            display: flex;
            justify-content: flex-end;
        }
        
        .action-button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
        }
        
        .fire-button {
            background-color: #ffebee;
            color: #f44336;
        }
        
        /* Hire Tab Styles */
        .job-posting-section {
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .job-posting-section h3 {
            margin-top: 0;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
        }
        
        .form-select {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
            margin-bottom: 15px;
        }
        
        .hiring-fee-container {
            margin: 15px 0;
            font-weight: 500;
        }
        
        .primary-button {
            padding: 10px 20px;
            background-color: #1a237e;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 10px;
        }
        
        /* Candidates Section */
        .candidates-section {
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            padding: 20px;
        }
        
        .candidates-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 15px;
        }
        
        .candidate-card {
            border: 1px solid #eee;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .candidate-header {
            padding: 15px;
            border-bottom: 1px solid #eee;
            background-color: #f9f9f9;
        }
        
        .candidate-header h3 {
            margin: 0 0 5px 0;
            font-size: 18px;
        }
        
        .candidate-role {
            font-size: 14px;
            color: #666;
        }
        
        .candidate-details {
            padding: 15px;
        }
        
        .candidate-skills {
            margin-top: 15px;
        }
        
        .candidate-skills h4 {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 16px;
        }
        
        .skill-item {
            margin-bottom: 5px;
            font-size: 14px;
        }
        
        .hire-button {
            width: 100%;
            padding: 10px;
            background-color: #1a237e;
            color: white;
            border: none;
            font-size: 16px;
            cursor: pointer;
        }
    `;
    
    mainContent.appendChild(style);
    mainContent.appendChild(container);

    return container;
}

// Export the function to make it accessible to other modules
window.renderEmployeesPage = renderEmployeesPage;