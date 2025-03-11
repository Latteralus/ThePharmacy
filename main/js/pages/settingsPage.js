// /js/pages/settingsPage.js

window.renderSettingsPage = function(mainContent) {
    // Clear existing content
    mainContent.innerHTML = '';

    // Create a container for the Settings page
    const container = document.createElement('div');
    container.className = 'settings-page-container';

    // Page Title and Description
    const title = document.createElement('h2');
    title.textContent = 'Game Settings';
    container.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Configure game settings and simulation parameters.';
    container.appendChild(subtitle);

    // Settings Sections Container
    const settingsSections = document.createElement('div');
    settingsSections.className = 'settings-sections';
    container.appendChild(settingsSections);

    // 1. Game Time Controls
    const timeSection = createSettingsSection('Game Time Controls');
    
    // Day Activation Setting
    const dayActiveControl = createSettingItem('Day Status:');
    
    const dayStatus = document.createElement('span');
    dayStatus.id = 'day-status-indicator';
    updateDayStatus(dayStatus);
    dayActiveControl.appendChild(dayStatus);
    
    const toggleDayButton = document.createElement('button');
    toggleDayButton.textContent = window.gameState?.isDayActive ? 'End Day' : 'Start Day';
    toggleDayButton.className = 'settings-button';
    toggleDayButton.onclick = function() {
        toggleDayActive();
        updateDayStatus(dayStatus);
        this.textContent = window.gameState?.isDayActive ? 'End Day' : 'Start Day';
    };
    dayActiveControl.appendChild(toggleDayButton);
    
    timeSection.appendChild(dayActiveControl);
    
    // Game Pause Setting
    const pauseControl = createSettingItem('Game Status:');
    
    const pauseStatus = document.createElement('span');
    pauseStatus.id = 'pause-status-indicator';
    updatePauseStatus(pauseStatus);
    pauseControl.appendChild(pauseStatus);
    
    const togglePauseButton = document.createElement('button');
    togglePauseButton.textContent = window.gameState?.isPaused ? 'Resume Game' : 'Pause Game';
    togglePauseButton.className = 'settings-button';
    togglePauseButton.onclick = function() {
        toggleGamePause();
        updatePauseStatus(pauseStatus);
        this.textContent = window.gameState?.isPaused ? 'Resume Game' : 'Pause Game';
    };
    pauseControl.appendChild(togglePauseButton);
    
    timeSection.appendChild(pauseControl);
    
    // Simulation Speed Setting
    const speedControl = createSettingItem('Simulation Speed:');
    
    const speedSelect = document.createElement('select');
    speedSelect.className = 'settings-select';
    
    const speedOptions = [
        { value: 0.5, label: '0.5x (Slow)' },
        { value: 1.0, label: '1.0x (Normal)' },
        { value: 2.0, label: '2.0x (Fast)' },
        { value: 5.0, label: '5.0x (Very Fast)' }
    ];
    
    speedOptions.forEach(option => {
        const optElement = document.createElement('option');
        optElement.value = option.value;
        optElement.textContent = option.label;
        
        // Set currently selected option
        if (window.GAME_CONFIG && option.value === window.GAME_CONFIG.SIMULATION_SPEED) {
            optElement.selected = true;
        } else if (option.value === 1.0) {
            // Default to normal speed if config not available
            optElement.selected = true;
        }
        
        speedSelect.appendChild(optElement);
    });
    
    speedSelect.onchange = function() {
        setGameSpeed(parseFloat(this.value));
    };
    
    speedControl.appendChild(speedSelect);
    timeSection.appendChild(speedControl);
    
    // Advanced Time Control
    const advanceTimeControl = createSettingItem('Manual Time Control:');
    
    const advanceHourButton = document.createElement('button');
    advanceHourButton.textContent = '+1 Hour';
    advanceHourButton.className = 'settings-button';
    advanceHourButton.onclick = function() {
        advanceGameTimeByHour();
    };
    advanceTimeControl.appendChild(advanceHourButton);
    
    const advanceDayButton = document.createElement('button');
    advanceDayButton.textContent = 'Skip to Next Day';
    advanceDayButton.className = 'settings-button';
    advanceDayButton.onclick = function() {
        skipToNextDay();
    };
    advanceTimeControl.appendChild(advanceDayButton);
    
    timeSection.appendChild(advanceTimeControl);
    
    // Current Time Display
    const currentTimeItem = createSettingItem('Current Game Time:');
    const timeDisplay = document.createElement('span');
    timeDisplay.id = 'current-time-display';
    timeDisplay.className = 'settings-value';
    updateTimeDisplay(timeDisplay);
    currentTimeItem.appendChild(timeDisplay);
    timeSection.appendChild(currentTimeItem);
    
    // Add time section to page
    settingsSections.appendChild(timeSection);
    
    // 2. Game Difficulty Settings
    const difficultySection = createSettingsSection('Difficulty Settings');
    
    // Customer Frequency
    const customerFreqControl = createSettingItem('Customer Frequency:');
    
    const customerFreqSelect = document.createElement('select');
    customerFreqSelect.className = 'settings-select';
    
    const customerFreqOptions = [
        { value: 0.5, label: 'Low' },
        { value: 1.0, label: 'Normal' },
        { value: 1.5, label: 'High' },
        { value: 2.0, label: 'Very High' }
    ];
    
    customerFreqOptions.forEach(option => {
        const optElement = document.createElement('option');
        optElement.value = option.value;
        optElement.textContent = option.label;
        
        // Set default selection
        if (option.value === 1.0) {
            optElement.selected = true;
        }
        
        customerFreqSelect.appendChild(optElement);
    });
    
    customerFreqSelect.onchange = function() {
        setCustomerFrequency(parseFloat(this.value));
    };
    
    customerFreqControl.appendChild(customerFreqSelect);
    difficultySection.appendChild(customerFreqControl);
    
    // Starting Cash
    const cashControl = createSettingItem('Modify Cash:');
    
    const cashInput = document.createElement('input');
    cashInput.type = 'number';
    cashInput.min = '0';
    cashInput.step = '1000';
    cashInput.value = window.financesData?.cash || 10000;
    cashInput.className = 'settings-input';
    
    const setCashButton = document.createElement('button');
    setCashButton.textContent = 'Set Cash';
    setCashButton.className = 'settings-button';
    setCashButton.onclick = function() {
        const value = parseFloat(cashInput.value);
        if (!isNaN(value) && value >= 0) {
            setGameCash(value);
        }
    };
    
    cashControl.appendChild(cashInput);
    cashControl.appendChild(setCashButton);
    difficultySection.appendChild(cashControl);
    
    // Operating Costs
    const costsControl = createSettingItem('Operating Costs:');
    
    const costsSelect = document.createElement('select');
    costsSelect.className = 'settings-select';
    
    const costsOptions = [
        { value: 0.5, label: 'Low' },
        { value: 1.0, label: 'Normal' },
        { value: 1.5, label: 'High' }
    ];
    
    costsOptions.forEach(option => {
        const optElement = document.createElement('option');
        optElement.value = option.value;
        optElement.textContent = option.label;
        
        // Set default selection
        if (option.value === 1.0) {
            optElement.selected = true;
        }
        
        costsSelect.appendChild(optElement);
    });
    
    costsSelect.onchange = function() {
        setOperatingCosts(parseFloat(this.value));
    };
    
    costsControl.appendChild(costsSelect);
    difficultySection.appendChild(costsControl);
    
    // Add difficulty section to page
    settingsSections.appendChild(difficultySection);
    
    // 3. Debug Options
    const debugSection = createSettingsSection('Debug Options');
    
    // Add employees
    const addEmployeeControl = createSettingItem('Quick Add Employee:');
    
    const roleSelect = document.createElement('select');
    roleSelect.className = 'settings-select';
    
    const roles = ['Pharmacist', 'Lab Technician', 'Cashier'];
    roles.forEach(role => {
        const option = document.createElement('option');
        option.value = role;
        option.textContent = role;
        roleSelect.appendChild(option);
    });
    
    const addEmployeeButton = document.createElement('button');
    addEmployeeButton.textContent = 'Add Employee';
    addEmployeeButton.className = 'settings-button';
    addEmployeeButton.onclick = function() {
        addRandomEmployee(roleSelect.value);
    };
    
    addEmployeeControl.appendChild(roleSelect);
    addEmployeeControl.appendChild(addEmployeeButton);
    debugSection.appendChild(addEmployeeControl);
    
    // Reset game state
    const resetControl = createSettingItem('Reset Options:');
    
    const resetTasksButton = document.createElement('button');
    resetTasksButton.textContent = 'Reset All Tasks';
    resetTasksButton.className = 'settings-button warning';
    resetTasksButton.onclick = function() {
        resetAllTasks();
    };
    
    const resetCustomersButton = document.createElement('button');
    resetCustomersButton.textContent = 'Reset Customers';
    resetCustomersButton.className = 'settings-button warning';
    resetCustomersButton.onclick = function() {
        resetAllCustomers();
    };
    
    resetControl.appendChild(resetTasksButton);
    resetControl.appendChild(resetCustomersButton);
    debugSection.appendChild(resetControl);
    
    // Full reset
    const fullResetControl = createSettingItem('Factory Reset:');
    
    const fullResetButton = document.createElement('button');
    fullResetButton.textContent = 'Reset Game State';
    fullResetButton.className = 'settings-button danger';
    fullResetButton.onclick = function() {
        if (confirm('This will reset the entire game state. This cannot be undone. Continue?')) {
            resetGameState();
        }
    };
    
    fullResetControl.appendChild(fullResetButton);
    debugSection.appendChild(fullResetControl);
    
    // Add debug section to page
    settingsSections.appendChild(debugSection);
    
    // Add the container to the main content
    mainContent.appendChild(container);
    
    // Add CSS styling
    addStyles(mainContent);
    
    // Set up automatic time display updates
    setInterval(() => {
        updateTimeDisplay(document.getElementById('current-time-display'));
        updateDayStatus(document.getElementById('day-status-indicator'));
        updatePauseStatus(document.getElementById('pause-status-indicator'));
    }, 1000);
    
    // -----------------------------------
    // Helper Functions 
    // -----------------------------------
    
    // Create a settings section with title
    function createSettingsSection(title) {
        const section = document.createElement('div');
        section.className = 'settings-section';
        
        const sectionTitle = document.createElement('h3');
        sectionTitle.textContent = title;
        section.appendChild(sectionTitle);
        
        return section;
    }
    
    // Create a setting item with label
    function createSettingItem(label) {
        const item = document.createElement('div');
        item.className = 'settings-item';
        
        const itemLabel = document.createElement('div');
        itemLabel.className = 'settings-label';
        itemLabel.textContent = label;
        item.appendChild(itemLabel);
        
        const itemControls = document.createElement('div');
        itemControls.className = 'settings-controls';
        item.appendChild(itemControls);
        
        return itemControls;
    }
    
    // Update day status indicator
    function updateDayStatus(element) {
        if (!element) return;
        
        const isActive = window.gameState?.isDayActive || false;
        element.textContent = isActive ? '🟢 Active' : '🔴 Inactive';
        element.style.color = isActive ? '#4caf50' : '#f44336';
        element.className = 'settings-value';
    }
    
    // Update pause status indicator
    function updatePauseStatus(element) {
        if (!element) return;
        
        const isPaused = window.gameState?.isPaused || false;
        element.textContent = isPaused ? '⏸️ Paused' : '▶️ Running';
        element.style.color = isPaused ? '#ff9800' : '#4caf50';
        element.className = 'settings-value';
    }
    
    // Update time display
    function updateTimeDisplay(element) {
        if (!element || !window.gameState?.currentDate) return;
        
        element.textContent = window.ui.formatDateTime(window.gameState.currentDate);
    }
    
    // Add styles for the settings page
    function addStyles(mainContent) {
        const style = document.createElement('style');
        style.textContent = `
            .settings-page-container {
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
            }
            
            .settings-sections {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .settings-section {
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                padding: 20px;
            }
            
            .settings-section h3 {
                margin-top: 0;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid #eee;
                color: var(--primary);
            }
            
            .settings-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 15px;
                border-bottom: 1px solid #f5f5f5;
            }
            
            .settings-label {
                font-weight: 500;
                flex: 1;
            }
            
            .settings-controls {
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 2;
            }
            
            .settings-value {
                font-weight: 500;
                margin-right: 10px;
                min-width: 100px;
            }
            
            .settings-button {
                background-color: var(--primary);
                color: white;
                border: none;
                padding: 8px 15px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }
            
            .settings-button:hover {
                background-color: var(--secondary);
            }
            
            .settings-button.warning {
                background-color: var(--warning);
            }
            
            .settings-button.warning:hover {
                background-color: #e68a00;
            }
            
            .settings-button.danger {
                background-color: var(--danger);
            }
            
            .settings-button.danger:hover {
                background-color: #d32f2f;
            }
            
            .settings-select, .settings-input {
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                min-width: 150px;
            }
        `;
        
        mainContent.appendChild(style);
    }
};

// -----------------------------------
// Game Settings Functions
// -----------------------------------

// Toggle day active state
function toggleDayActive() {
    if (!window.gameState) {
        console.error('Game state not found');
        return false;
    }
    
    window.gameState.isDayActive = !window.gameState.isDayActive;
    console.log(`Day is now ${window.gameState.isDayActive ? 'active' : 'inactive'}`);
    
    // If day was just activated, reset timing variables to prevent large time jumps
    if (window.gameState.isDayActive) {
        const now = performance.now();
        if (window.gameState.lastFrameTime !== undefined) window.gameState.lastFrameTime = now;
        if (window.gameState.lastSimulationTime !== undefined) window.gameState.lastSimulationTime = now;
        if (window.gameState.simulationAccumulator !== undefined) window.gameState.simulationAccumulator = 0;
    }
    
    return true;
}

// Toggle game pause
function toggleGamePause() {
    if (!window.gameState) {
        console.error('Game state not found');
        return false;
    }
    
    window.gameState.isPaused = !window.gameState.isPaused;
    console.log(`Game is now ${window.gameState.isPaused ? 'paused' : 'running'}`);
    
    // If unpaused, reset timing variables to prevent large time jumps
    if (!window.gameState.isPaused) {
        const now = performance.now();
        if (window.gameState.lastFrameTime !== undefined) window.gameState.lastFrameTime = now;
        if (window.gameState.lastSimulationTime !== undefined) window.gameState.lastSimulationTime = now;
        if (window.gameState.simulationAccumulator !== undefined) window.gameState.simulationAccumulator = 0;
    }
    
    return true;
}

// Set game simulation speed
function setGameSpeed(speed) {
    if (!window.GAME_CONFIG) {
        console.error('Game config not found');
        return false;
    }
    
    window.GAME_CONFIG.SIMULATION_SPEED = speed;
    console.log(`Game speed set to ${speed}x`);
    return true;
}

// Advance game time by one hour
function advanceGameTimeByHour() {
    if (!window.gameState || !window.gameState.currentDate) {
        console.error('Game state or current date not found');
        return false;
    }
    
    const oldDate = new Date(window.gameState.currentDate);
    window.gameState.currentDate.setHours(window.gameState.currentDate.getHours() + 1);
    
    // Update UI if available
    if (window.ui && window.ui.updateTime) {
        window.ui.updateTime();
    }
    
    console.log(`Advanced time from ${oldDate.toLocaleString()} to ${window.gameState.currentDate.toLocaleString()}`);
    return true;
}

// Skip to next day
function skipToNextDay() {
    if (!window.gameState || !window.gameState.currentDate) {
        console.error('Game state or current date not found');
        return false;
    }
    
    // Call the game's next day function if available
    if (window.timeEvents && window.timeEvents.skipToNextDay) {
        window.timeEvents.skipToNextDay(window.gameState);
        return true;
    }
    
    // Fallback: Manually set to next day at opening hour
    const oldDate = new Date(window.gameState.currentDate);
    window.gameState.currentDate.setDate(window.gameState.currentDate.getDate() + 1);
    window.gameState.currentDate.setHours(7, 0, 0, 0); // Set to 7 AM
    
    // Ensure day is active
    window.gameState.isDayActive = true;
    
    // Update UI if available
    if (window.ui && window.ui.updateTime) {
        window.ui.updateTime();
    }
    
    console.log(`Skipped to next day: ${window.gameState.currentDate.toLocaleString()}`);
    return true;
}

// Set customer frequency multiplier
function setCustomerFrequency(multiplier) {
    if (!window.brandReputation) {
        console.error('Brand reputation module not found');
        return false;
    }
    
    // Store the multiplier in a global variable
    window.customerFrequencyMultiplier = multiplier;
    
    // Patch the calcCustomers function to use the multiplier
    const originalCalcCustomers = window.brandReputation.calcCustomers;
    window.brandReputation.calcCustomers = function(hour) {
        const baseCount = originalCalcCustomers.call(this, hour);
        return Math.floor(baseCount * window.customerFrequencyMultiplier);
    };
    
    console.log(`Customer frequency multiplier set to ${multiplier}x`);
    return true;
}

// Set game cash
function setGameCash(amount) {
    if (!window.financesData) {
        console.error('Finances data not found');
        return false;
    }
    
    window.financesData.cash = amount;
    
    // Update UI if available
    if (window.updateUI) {
        window.updateUI("finances");
    }
    
    console.log(`Cash set to $${amount.toFixed(2)}`);
    return true;
}

// Set operating costs multiplier
function setOperatingCosts(multiplier) {
    if (!window.financesData) {
        console.error('Finances data not found');
        return false;
    }
    
    // Store original overhead if not already stored
    if (!window.originalOverhead) {
        window.originalOverhead = window.financesData.overhead;
    }
    
    // Apply multiplier to original overhead
    window.financesData.overhead = window.originalOverhead * multiplier;
    
    console.log(`Operating costs multiplier set to ${multiplier}x (overhead: $${window.financesData.overhead.toFixed(2)})`);
    return true;
}

// Add a random employee of the specified role
function addRandomEmployee(role) {
    if (!window.employees || !window.helpers) {
        console.error('Employees module or helpers not found');
        return false;
    }
    
    const skillLevel = 'Intermediate'; // Default to intermediate skill level
    
    const newEmployee = {
        id: window.helpers.generateNewEmployeeId(),
        firstName: window.helpers.generateFirstName(),
        lastName: window.helpers.generateLastName(),
        role: role,
        salary: window.helpers.calculateStartingWage(role, skillLevel),
        skills: generateRandomSkills(role, skillLevel),
        morale: 80,
        mood: "😀",
        hireDate: new Date(window.gameState.currentDate),
        currentTaskId: null
    };
    
    // Add the employee to the data
    window.employeesData.push(newEmployee);
    
    // Update UI if available
    if (window.updateUI) {
        window.updateUI("employees");
    }
    
    console.log(`Added new ${role}: ${newEmployee.firstName} ${newEmployee.lastName}`);
    return true;
    
    // Helper function to generate skills based on role and level
    function generateRandomSkills(role, level) {
        let skills = {};
        let baseValue = 0;
        
        switch (level) {
            case 'Novice': baseValue = 40; break;
            case 'Intermediate': baseValue = 60; break;
            case 'Skilled': baseValue = 80; break;
            default: baseValue = 50;
        }
        
        // Generate random variation around base value
        function randomSkill(primary = false) {
            // Primary skills get a boost, others are lower
            const base = primary ? baseValue + 10 : baseValue - 10;
            // Add random variation of +/- 10%
            return Math.min(100, Math.max(10, base + (Math.random() * 20 - 10)));
        }
        
        // Assign skills based on role
        if (role === 'Pharmacist') {
            skills.compounding = randomSkill(true);
            skills.dispensing = randomSkill(true);
            skills.customerService = randomSkill();
            skills.inventoryManagement = randomSkill();
            skills.sales = randomSkill();
        } 
        else if (role === 'Lab Technician') {
            skills.compounding = randomSkill(true);
            skills.dispensing = randomSkill();
            skills.customerService = randomSkill(false);
            skills.inventoryManagement = randomSkill(true);
            skills.sales = randomSkill(false);
        }
        else if (role === 'Cashier') {
            skills.compounding = randomSkill(false);
            skills.dispensing = randomSkill();
            skills.customerService = randomSkill(true);
            skills.inventoryManagement = randomSkill();
            skills.sales = randomSkill(true);
        }
        
        return skills;
    }
}

// Reset all tasks
function resetAllTasks() {
    if (!window.taskManager) {
        console.error('Task manager not found');
        return false;
    }
    
    // Clear the tasks array
    window.taskManager.tasks.length = 0;
    
    // Clear employee task assignments
    if (window.employeesData) {
        window.employeesData.forEach(employee => {
            employee.currentTaskId = null;
        });
    }
    
    // Re-initialize production tasks if available
    if (window.production && window.production.checkAndCreateCompoundTasks) {
        window.production.checkAndCreateCompoundTasks();
    }
    
    // Update UI if available
    if (window.updateUI) {
        window.updateUI("operations");
    }
    
    console.log('All tasks have been reset');
    return true;
}

// Reset all customers
function resetAllCustomers() {
    if (!window.customers) {
        console.error('Customers module not found');
        return false;
    }
    
    // Clear active customers
    window.customers.activeCustomers.length = 0;
    
    // Clear related prescriptions
    if (window.prescriptions) {
        window.prescriptions.activePrescriptions.length = 0;
    }
    
    // Update UI if available
    if (window.updateUI) {
        window.updateUI("customers");
        window.updateUI("prescriptions");
    }
    
    console.log('All customers have been reset');
    return true;
}

// Complete game state reset
function resetGameState() {
    // Reset day start time to morning
    if (window.gameState) {
        window.gameState.currentDate = new Date(window.gameState.currentDate);
        window.gameState.currentDate.setHours(7, 0, 0, 0); // 7 AM
        window.gameState.isDayActive = true;
        window.gameState.isPaused = false;
        
        // Reset timing variables
        const now = performance.now();
        window.gameState.lastFrameTime = now;
        window.gameState.lastSimulationTime = now;
        window.gameState.simulationAccumulator = 0;
    }
    
    // Reset tasks
    resetAllTasks();
    
    // Reset customers
    resetAllCustomers();
    
    // Reset finances
    if (window.financesData) {
        // Keep cash but reset other metrics
        window.financesData.dailyIncome = 0;
        window.financesData.pendingInsuranceIncome = 0;
        window.financesData.pendingOrders = 0;
        window.financesData.completedOrders = 0;
        
        // Reset revenue/expenses for the day
        if (window.financesData.revenue) {
            window.financesData.revenue.today = 0;
        }
        
        if (window.financesData.expenses) {
            window.financesData.expenses.today = 0;
        }
        
        if (window.financesData.profit) {
            window.financesData.profit.today = 0;
        }
    }
    
    // Update all UI components
    if (window.updateUI) {
        window.updateUI("finances");
        window.updateUI("operations");
        window.updateUI("time");
    }
    
    console.log('Game state has been reset');
    
    // Reload the current page to ensure UI is fresh
    if (window.currentPage && window.showPage) {
        window.showPage(window.currentPage);
    }
    
    return true;
}