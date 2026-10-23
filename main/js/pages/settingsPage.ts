// /js/pages/settingsPage.js - player settings only (no cheats, findings H5):
// pause and speed (also in the top bar, with Space and 1-4), skipping the
// daily summary (Phase 9, #49) and the monthly and yearly reports (Phase
// 10, #13), which are the main menu's settings, shared by every game, and
// the game's saves. There is no difficulty setting: every game plays at Normal.

const SPEED_NAMES: Record<number, string> = { 1: 'slow', 2: 'normal', 5: 'fast', 10: 'very fast' };

window.renderSettingsPage = function (mainContent: HTMLElement, page: PageScope): void {
    const kit = window.kit;
    const { el } = kit;

    const root = kit.page(
        mainContent,
        'Settings',
        'Game speed is saved with your game; the report settings apply to every game. Changes apply at once.',
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
    row(
        time,
        'Current time',
        timeCell,
        'The store opens at 07:00 and closes at 22:00. The last customers come in at 20:00, so everyone can be served.',
    );

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
        window.GAME_SPEEDS.map((value) => ({
            value,
            label: SPEED_NAMES[value] ? `${value}× (${SPEED_NAMES[value]})` : `${value}×`,
        })),
        window.getGameSpeed(),
        (value) => {
            window.setGameSpeed(parseFloat(value));
            window.ui.updateTime();
        },
    );
    row(time, 'Speed', speedSelect, 'Keys 1-4 pick a speed. At 1×, one real second is one game minute.');

    // --------------------- Reports ---------------------
    // The main menu's settings: change them here, and they're stored for every game.
    const reports = settingsCard('Reports');
    type SkipSetting = 'skipDailySummary' | 'skipMonthlyReport' | 'skipYearlyReport';
    function skipRow(key: SkipSetting, label: string, title: string, hint: string): void {
        const box = kit.checkbox(label, !!window.appSettings?.[key], (on) => void saveSkip(key, on));
        box.input.id = key;
        row(reports, title, box.root, hint);
    }
    skipRow(
        'skipDailySummary',
        'Skip the daily summary',
        'Daily summary',
        "The next day starts straight away. Game over and the win still show, warnings come as notifications, and every day's summary stays on the Dashboard.",
    );
    skipRow(
        'skipMonthlyReport',
        'Skip the monthly report',
        'Monthly report',
        'It opens after the last closing of each month. Skipped, it is kept on the Dashboard and the Finances page.',
    );
    skipRow(
        'skipYearlyReport',
        'Skip the yearly report',
        'Yearly report',
        'It opens after the last closing of December. Skipped, it is kept like the monthly one.',
    );

    async function saveSkip(key: SkipSetting, on: boolean): Promise<void> {
        window.appSettings[key] = on;
        const api = window.gameAPI;
        if (!api?.getSettings || !api.updateSettings) return;
        try {
            const current = (await api.getSettings()) ?? {};
            const result = await api.updateSettings({ ...current, [key]: on } as GameSettings);
            if (!result?.success) throw new Error('not saved');
        } catch (error) {
            console.error('[settingsPage] Error saving settings:', error);
            window.toast("The setting applies to this session, but couldn't be saved.", 'warn');
        }
    }

    // --------------------- Saves ---------------------
    const saves = settingsCard('Saves');
    const saveButtons = el('div', 'toolbar');
    saveButtons.append(
        kit.button('Save', 'secondary', () => window.saveGame?.()),
        kit.button('Saves…', 'secondary', () => window.showSavesModal({ gameOnly: true })),
    );
    row(
        saves,
        'This game',
        saveButtons,
        'Save (Ctrl+S) keeps one named save up to date; Saves… (Ctrl+L) saves under a new name or loads one. Autosave keeps the last three.',
    );

    // --------------------- Live status ---------------------
    function showStatus(): void {
        const date = window.gameState?.currentDate;
        if (date) timeDisplay.textContent = `${window.fmt.day(date)} · ${window.fmt.clock(date)}`;

        const open = !!window.gameState?.isDayActive;

        const paused = !!window.gameState?.isPaused;
        pauseStatus.textContent = paused ? 'Paused' : 'Running';
        pauseStatus.className = paused ? 'pill warn' : 'pill good';
        pauseButton.textContent = paused ? 'Resume' : 'Pause';

        const speed = String(window.getGameSpeed());
        if (speedSelect.value !== speed && document.activeElement !== speedSelect) speedSelect.value = speed;

        const frontOpen = window.gameState?.frontOpen !== false;
        dayStatus.textContent = !open ? 'Closed' : frontOpen ? 'Open' : 'Front closed';
        dayStatus.className = `pill ${!open ? 'critical' : frontOpen ? 'good' : 'warn'}`;
    }
    showStatus();

    // The render loop announces 'time' every frame, paused or not
    page.on('time', showStatus);
};
