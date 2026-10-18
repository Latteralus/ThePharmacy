// /js/pages/researchPage.js - research levels: where you are, what the next
// level costs and unlocks, progress while it runs, and everything unlocked.

window.renderResearchPage = function (mainContent: HTMLElement, page: PageScope): void {
    const kit = window.kit;
    const { el } = kit;
    const { fmt } = window;

    const root = kit.page(
        mainContent,
        'Research',
        'Each level takes a few days and unlocks new products and equipment.',
    );

    const trackCard = kit.card('Research level');
    const nextCard = kit.card('Next level');
    const unlockedCard = kit.card('Unlocked so far');
    root.append(trackCard.root, nextCard.root, unlockedCard.root);

    const productName = (id: string) => window.productsData.find((p) => p.id === id)?.name;
    const equipmentName = (id: string) => window.equipmentData.find((e) => e.id === id)?.name;

    // Names of what a level unlocks that exists in the game
    function unlocksOf(level: ResearchLevel): string[] {
        return [...level.unlockedProducts.map(productName), ...level.unlockedEquipment.map(equipmentName)].filter(
            (name): name is string => !!name,
        );
    }

    function chips(names: string[], tone: Tone = 'neutral'): HTMLElement {
        const wrap = el('div', 'chips');
        names.forEach((name) => wrap.appendChild(kit.pill(name, tone)));
        return wrap;
    }

    function startResearch(): void {
        const data = window.researchData;
        const next = data.levels[data.currentLevel + 1];
        if (data.inProgress || !next) return;
        if (window.financesData.cash < next.cost) {
            window.toast(`Research level ${next.level} costs ${fmt.moneyWhole(next.cost)}.`, 'error');
            return;
        }
        window.research.researchNextLevel();
        window.toast(`Research on level ${next.level} has started.`, 'success');
        render();
    }

    function render(): void {
        const data = window.researchData;
        const maxLevel = data.levels.length - 1;
        const inProgress = data.inProgress;

        // Track: one cell per level
        trackCard.body.innerHTML = '';
        const track = el('div', 'level-track');
        for (let level = 0; level <= maxLevel; level++) {
            const cell = el('span', '', String(level));
            if (level <= data.currentLevel) cell.className = 'done';
            else if (level === (inProgress?.targetLevel ?? data.currentLevel + 1)) cell.className = 'next';
            cell.title = data.levels[level]?.description ?? '';
            track.appendChild(cell);
        }
        const caption = el('p', 'small muted', `Level ${data.currentLevel} of ${maxLevel}`);
        caption.id = 'current-research-level';
        caption.style.marginTop = '6px';
        trackCard.body.append(track, caption);

        // Next level
        nextCard.body.innerHTML = '';
        const nextLevel = data.levels[inProgress?.targetLevel ?? data.currentLevel + 1];
        if (!nextLevel) {
            nextCard.body.appendChild(el('p', '', 'Every research level is complete.'));
        } else {
            const grid = el('dl', 'definition-grid');
            const row = (label: string, value: Node | string) => {
                const dd = el('dd');
                dd.append(value);
                grid.append(el('dt', '', label), dd);
            };
            row('Level', String(nextLevel.level));
            row('About', nextLevel.description);
            row('Cost', fmt.moneyWhole(nextLevel.cost));
            row('Time', `${nextLevel.researchTime} day${nextLevel.researchTime === 1 ? '' : 's'}`);
            const unlocks = unlocksOf(nextLevel);
            row('Unlocks', unlocks.length > 0 ? chips(unlocks, 'brand') : kit.pill('Nothing available yet', 'warn'));
            nextCard.body.appendChild(grid);

            const actions = el('div', 'toolbar');
            actions.style.marginTop = '12px';
            if (inProgress) {
                const days = Math.max(0, window.gameState.dayIndex - inProgress.startDayIndex);
                const progress = kit.meterCell(
                    days / inProgress.daysRequired,
                    `${days} of ${inProgress.daysRequired} days`,
                );
                progress.root.style.width = '320px';
                progress.root.id = 'research-progress-bar';
                actions.append(kit.pill('In progress', 'info'), progress.root);
            } else {
                const affordable = window.financesData.cash >= nextLevel.cost;
                const start = kit.button(
                    `Start research (${fmt.moneyWhole(nextLevel.cost)})`,
                    'primary',
                    startResearch,
                );
                start.id = 'research-button';
                start.disabled = !affordable;
                actions.appendChild(start);
                if (!affordable) {
                    actions.appendChild(
                        el(
                            'span',
                            'small critical-text',
                            `You need ${fmt.moneyWhole(nextLevel.cost - window.financesData.cash)} more.`,
                        ),
                    );
                }
            }
            nextCard.body.appendChild(actions);
        }

        // Everything unlocked
        unlockedCard.body.innerHTML = '';
        const products = window.research
            .getUnlockedProducts()
            .map(productName)
            .filter((n): n is string => !!n);
        const equipment = window.research
            .getUnlockedEquipment()
            .map(equipmentName)
            .filter((n): n is string => !!n);
        const grid = el('dl', 'definition-grid');
        grid.append(el('dt', '', `Products (${products.length})`));
        const productsDd = el('dd');
        productsDd.appendChild(chips(products));
        grid.appendChild(productsDd);
        grid.append(el('dt', '', `Equipment (${equipment.length})`));
        const equipmentDd = el('dd');
        equipmentDd.appendChild(chips(equipment));
        grid.appendChild(equipmentDd);
        grid.style.alignItems = 'start';
        unlockedCard.body.appendChild(grid);
    }

    render();
    // Each day of progress and completion; cash decides whether you can start
    page.on('research', render);
    page.on('finances', () => {
        if (!window.researchData.inProgress) render();
    });
};
