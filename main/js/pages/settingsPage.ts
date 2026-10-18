// /js/pages/settingsPage.js - player settings only (no cheats, findings H5):
// pause and speed (also in the top bar, with Space and 1-4), and the two
// difficulty multipliers.

window.renderSettingsPage = function (mainContent: HTMLElement, page: PageScope): void {
    const kit = window.kit;
    const { el } = kit;

    const root = kit.page(
        mainContent,
        'Settings',
        'Game speed and difficulty. Changes apply at once and are saved with your game.',
    );
    root.classList.add('settings-page-container');
    root.style.maxWidth = '760px';

    function settingsCard(title: string): HTMLDivElement {
        const card = kit.card(title);
        root.appendChild(card.root);
        const grid = el('div', 'settings-grid');
        card.body.appendChild(grid);
        return grid;
    }

    function row(grid: HTMLElement, label: string, control: Node, hint?: string): void {
        grid.append(el('div', 'label', label), control);
        if (hint) grid.appendChild(el('div', 'hint', hint));
    }

    // --------------------- Time ---------------------
    const time = settingsCard('Time');

    const timeDisplay = el('span', 'num');
    timeDisplay.id = 'current-time-display';
    timeDisplay.style.textAlign = 'left';
    const dayStatus = el('span');
    dayStatus.id = 'day-status-indicator';
    const timeCell = el('div', 'toolbar');
    timeCell.append(timeDisplay, dayStatus);
    row(time, 'Current time', timeCell, 'The store opens at 07:00 and closes at 22:00.');

    const pauseStatus = el('span');
    pauseStatus.id = 'pause-status-indicator';
    const pauseButton = kit.button('Pause', 'secondary', () => {
        window.toggleGamePause();
        window.ui.updateTime();
    });
    const pauseCell = el('div', 'toolbar');
    pauseCell.append(pauseStatus, pauseButton);
    row(time, 'Game', pauseCell, 'Space pauses and resumes from any page.');

    const speedSelect = kit.select(
        [
            { value: 0.5, label: '0.5× (slow)' },
            { value: 1, label: '1× (normal)' },
            { value: 2, label: '2× (fast)' },
            { value: 5, label: '5× (very fast)' },
        ],
        window.getGameSpeed(),
        (value) => {
            window.setGameSpeed(parseFloat(value));
            window.ui.updateTime();
        },
    );
    row(time, 'Speed', speedSelect, 'Keys 1-4 pick a speed. At 1×, one real second is one game minute.');

    // --------------------- Difficulty ---------------------
    const difficulty = settingsCard('Difficulty');
    row(
        difficulty,
        'Customer frequency',
        kit.select(
            [
                { value: 0.5, label: 'Low' },
                { value: 1, label: 'Normal' },
                { value: 1.5, label: 'High' },
                { value: 2, label: 'Very high' },
            ],
            window.customerFrequencyMultiplier ?? 1,
            (value) => setCustomerFrequency(parseFloat(value)),
        ),
        'How many customers arrive each hour, on top of what your reputation brings.',
    );
    row(
        difficulty,
        'Operating costs',
        kit.select(
            [
                { value: 0.5, label: 'Low' },
                { value: 1, label: 'Normal' },
                { value: 1.5, label: 'High' },
            ],
            window.operatingCostMultiplier ?? 1,
            (value) => setOperatingCosts(parseFloat(value)),
        ),
        'Scales the overhead charged at closing each day.',
    );

    // --------------------- Live status ---------------------
    function showStatus(): void {
        const date = window.gameState?.currentDate;
        if (date) timeDisplay.textContent = `${window.fmt.day(date)} · ${window.fmt.clock(date)}`;

        const open = !!window.gameState?.isDayActive;
        dayStatus.textContent = open ? 'Open' : 'Closed';
        dayStatus.className = open ? 'pill good' : 'pill critical';

        const paused = !!window.gameState?.isPaused;
        pauseStatus.textContent = paused ? 'Paused' : 'Running';
        pauseStatus.className = paused ? 'pill warn' : 'pill good';
        pauseButton.textContent = paused ? 'Resume' : 'Pause';

        const speed = String(window.getGameSpeed());
        if (speedSelect.value !== speed && document.activeElement !== speedSelect) speedSelect.value = speed;
    }
    showStatus();

    // The render loop announces 'time' every frame, paused or not
    page.on('time', showStatus);
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
