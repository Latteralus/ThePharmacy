// /js/pages/settingsPage.js

window.renderSettingsPage = function (mainContent: HTMLElement): void {
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

    // Whether the store is open (read-only: days end at closing time)
    const dayActiveControl = createSettingItem('Store:');

    const dayStatus = document.createElement('span');
    dayStatus.id = 'day-status-indicator';
    updateDayStatus(dayStatus);
    dayActiveControl.appendChild(dayStatus);

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
    togglePauseButton.onclick = function () {
        toggleGamePause();
        updatePauseStatus(pauseStatus);
        togglePauseButton.textContent = window.gameState?.isPaused ? 'Resume Game' : 'Pause Game';
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
        { value: 5.0, label: '5.0x (Very Fast)' },
    ];

    speedOptions.forEach((option) => {
        const optElement = document.createElement('option');
        optElement.value = String(option.value);
        optElement.textContent = option.label;

        optElement.selected = option.value === window.getGameSpeed();

        speedSelect.appendChild(optElement);
    });

    speedSelect.onchange = function () {
        window.setGameSpeed(parseFloat(speedSelect.value));
    };

    speedControl.appendChild(speedSelect);
    timeSection.appendChild(speedControl);

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
        { value: 2.0, label: 'Very High' },
    ];

    customerFreqOptions.forEach((option) => {
        const optElement = document.createElement('option');
        optElement.value = String(option.value);
        optElement.textContent = option.label;

        optElement.selected = option.value === (window.customerFrequencyMultiplier ?? 1);

        customerFreqSelect.appendChild(optElement);
    });

    customerFreqSelect.onchange = function () {
        setCustomerFrequency(parseFloat(customerFreqSelect.value));
    };

    customerFreqControl.appendChild(customerFreqSelect);
    difficultySection.appendChild(customerFreqControl);

    // Operating Costs
    const costsControl = createSettingItem('Operating Costs:');

    const costsSelect = document.createElement('select');
    costsSelect.className = 'settings-select';

    const costsOptions = [
        { value: 0.5, label: 'Low' },
        { value: 1.0, label: 'Normal' },
        { value: 1.5, label: 'High' },
    ];

    costsOptions.forEach((option) => {
        const optElement = document.createElement('option');
        optElement.value = String(option.value);
        optElement.textContent = option.label;

        optElement.selected = option.value === (window.operatingCostMultiplier ?? 1);

        costsSelect.appendChild(optElement);
    });

    costsSelect.onchange = function () {
        setOperatingCosts(parseFloat(costsSelect.value));
    };

    costsControl.appendChild(costsSelect);
    difficultySection.appendChild(costsControl);

    // Add difficulty section to page
    settingsSections.appendChild(difficultySection);

    // Add the container to the main content
    mainContent.appendChild(container);

    // Add CSS styling
    addStyles(mainContent);

    // Keep the time and status current. showPage has no teardown hook, so the
    // interval stops itself once this page has been replaced (M16).
    const refreshInterval = setInterval(() => {
        if (!container.isConnected) {
            clearInterval(refreshInterval);
            return;
        }
        updateTimeDisplay(document.getElementById('current-time-display'));
        updateDayStatus(document.getElementById('day-status-indicator'));
        updatePauseStatus(document.getElementById('pause-status-indicator'));
    }, 1000);

    // -----------------------------------
    // Helper Functions
    // -----------------------------------

    // Create a settings section with title
    function createSettingsSection(title: string): HTMLDivElement {
        const section = document.createElement('div');
        section.className = 'settings-section';

        const sectionTitle = document.createElement('h3');
        sectionTitle.textContent = title;
        section.appendChild(sectionTitle);

        return section;
    }

    // Create a setting item with label
    function createSettingItem(label: string): HTMLDivElement {
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
    function updateDayStatus(element: HTMLElement | null): void {
        if (!element) return;

        const isActive = window.gameState?.isDayActive || false;
        element.textContent = isActive ? '🟢 Open' : '🔴 Closed';
        element.style.color = isActive ? '#4caf50' : '#f44336';
        element.className = 'settings-value';
    }

    // Update pause status indicator
    function updatePauseStatus(element: HTMLElement | null): void {
        if (!element) return;

        const isPaused = window.gameState?.isPaused || false;
        element.textContent = isPaused ? '⏸️ Paused' : '▶️ Running';
        element.style.color = isPaused ? '#ff9800' : '#4caf50';
        element.className = 'settings-value';
    }

    // Update time display
    function updateTimeDisplay(element: HTMLElement | null): void {
        if (!element || !window.gameState?.currentDate) return;

        element.textContent = window.ui.formatDateTime(window.gameState.currentDate);
    }

    // Add styles for the settings page
    function addStyles(mainContent: HTMLElement): void {
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
            
            .settings-select {
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

// Toggle game pause
//
// Declared as `const ... = function` rather than `function toggleGamePause()`
// deliberately: settingsPage.js loads after main.js in main.html, and a
// top-level `function` declaration in a plain (non-module) script becomes a
// `window` property, same as `window.toggleGamePause = ...` would. That was
// silently clobbering main.ts's real `window.toggleGamePause` on every page
// load — found while converting this file to TS (main.ts's own assignment
// stopped type-checking against the resulting merged global type). `const`
// keeps this local-only, matching what every caller of the bare identifier
// here already got in practice (this file's own onclick handlers only ever
// called the local one). See docs/Changelog.md.
const toggleGamePause = function (): boolean {
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
};

// Set customer frequency multiplier (brandReputation.calcCustomers reads it)
function setCustomerFrequency(multiplier: number): boolean {
    window.customerFrequencyMultiplier = multiplier;
    console.log(`Customer frequency multiplier set to ${multiplier}x`);
    return true;
}

// Set operating costs multiplier
function setOperatingCosts(multiplier: number): boolean {
    if (!window.financesData) {
        console.error('Finances data not found');
        return false;
    }

    // Store original overhead if not already stored
    if (!window.originalOverhead) {
        window.originalOverhead = window.financesData.overhead;
    }

    // Apply multiplier to original overhead
    window.operatingCostMultiplier = multiplier;
    window.financesData.overhead = window.originalOverhead * multiplier;

    console.log(
        `Operating costs multiplier set to ${multiplier}x (overhead: $${window.financesData.overhead.toFixed(2)})`,
    );
    return true;
}
