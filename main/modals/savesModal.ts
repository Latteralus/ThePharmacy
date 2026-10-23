// savesModal.js - the game's saves (Phase 10 save slots, #13): its named
// saves and its rotating autosaves, newest first, to load one, or to save
// under a new name. Opened with Ctrl+L, from game over and from Settings.
// Each save shows its day and cash, and warns of closings in the red, so
// after a bankruptcy the player can pick a save from before the trouble.

window.showSavesModal = function (options = {}) {
    if (document.querySelector('.saves-modal')) return;
    const { el, table, pill } = window.kit;
    const { fmt } = window;
    const gameOnly = options.gameOnly ?? true;
    const bankrupt = !!window.gameState?.bankrupt;

    const list = el('div');
    list.appendChild(el('p', 'muted', 'Reading saves…'));
    const body: Node[] = [];

    // Save under a new name (not once the game is over)
    if (!bankrupt && window.saveGame) {
        const form = el('div', 'toolbar');
        const nameInput = el('input', 'input');
        nameInput.type = 'text';
        nameInput.maxLength = 60;
        nameInput.placeholder = `${window.company.name}, day ${(window.gameState.dayIndex ?? 0) + 1}`;
        nameInput.setAttribute('aria-label', 'Name for a new save');
        const saveAs = window.kit.button('Save as new', 'secondary', async () => {
            const name = nameInput.value.trim() || nameInput.placeholder;
            saveAs.disabled = true;
            const saved = await window.saveGame!({ name });
            saveAs.disabled = false;
            if (saved) {
                nameInput.value = '';
                window.toast(`Saved as “${name}”.`, 'success');
                refresh();
            }
        });
        form.append(nameInput, saveAs);
        body.push(form);
    }
    body.push(list);

    const closeBtn = window.kit.button('Close', 'secondary');
    const dialog = window.kit.modal({
        title: options.title ?? 'Saves',
        subtitle: gameOnly ? `${window.company.name}: saves and autosaves` : 'Every saved game',
        body,
        actions: [closeBtn],
        className: 'saves-modal',
        onEscape: () => dialog.close(),
    });
    closeBtn.addEventListener('click', () => dialog.close());

    async function refresh(): Promise<void> {
        let saves: SaveSlotInfo[] = [];
        try {
            saves = (await window.gameAPI?.getSavedGames?.()) ?? [];
        } catch (error) {
            console.error('[savesModal] Error reading saves:', error);
        }
        const gameId = window.gameState?.gameId;
        if (gameOnly) saves = saves.filter((save) => save.gameId === gameId);

        list.innerHTML = '';
        const rows = table([
            { label: 'Save' },
            { label: 'Day', num: true },
            { label: 'Cash', num: true },
            { label: 'Saved', width: '150px' },
            { label: '', className: 'actions' },
        ]);
        list.appendChild(rows.root);
        if (saves.length === 0) rows.empty('No saves yet. Save with Ctrl+S, or autosave as you play.');

        saves.forEach((save) => {
            const name = el('span');
            name.append(window.kit.primaryCell(save.name, gameOnly ? '' : save.companyName));
            if (save.kind === 'auto') name.appendChild(pill('Autosave', 'info'));
            if (save.daysInRed > 0) name.appendChild(pill(`${save.daysInRed} in the red`, 'critical'));

            const cash = el('span', save.cash < 0 ? 'critical-text' : '', fmt.money(save.cash));
            const when = save.lastSaved ? new Date(save.lastSaved).toLocaleString('en-US') : '—';

            const actions = el('div', 'row-actions');
            actions.appendChild(
                window.kit.button(
                    'Load',
                    'primary',
                    () =>
                        window.showConfirmModal(
                            `Load “${save.name}” (day ${save.day})? Anything since your last save will be lost.`,
                            'Load',
                            async () => {
                                dialog.close();
                                const loaded = window.loadGame ? await window.loadGame(save.slot) : false;
                                if (!loaded) window.toast("That save couldn't be loaded.", 'error');
                            },
                            { title: 'Load this save?' },
                        ),
                    { small: true },
                ),
            );
            if (save.kind === 'manual') {
                actions.appendChild(
                    window.kit.button(
                        'Delete',
                        'ghost',
                        () =>
                            window.showConfirmModal(
                                `Delete “${save.name}” (day ${save.day})? This can't be undone.`,
                                'Delete',
                                async () => {
                                    await window.gameAPI?.deleteSavedGame?.(save.slot);
                                    if (window.saveSession.slot === save.slot) window.saveSession.slot = null;
                                    refresh();
                                },
                                { title: 'Delete this save?', danger: true },
                            ),
                        { small: true },
                    ),
                );
            }
            rows.row([name, fmt.int(save.day), cash, when, actions]);
        });
    }

    refresh();
};
