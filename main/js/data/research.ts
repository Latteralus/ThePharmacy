// /js/data/research.js
// Five levels, each unlocking products (customers start asking for them)
// and the equipment that makes them. Levels 3-10 used to unlock products and
// equipment that didn't exist (H8); the tree was trimmed in Phase 7 to the
// content the game has. Most new products need equipment bought on the
// Equipment page before they can be made. Each level also brings more
// customers (brandReputation.calcCustomers).
window.researchData = {
    currentLevel: 0,
    inProgress: null,
    levels: [
        {
            level: 0,
            unlockedProducts: ['pd001', 'pd002', 'pd004', 'pd005', 'pd006', 'pd007', 'pd008', 'pd009', 'pd010'],
            unlockedEquipment: ['eq001', 'eq002', 'eq003', 'eq004'],
            cost: 0,
            researchTime: 0,
            description: 'Everyday tablets and capsules.',
        },
        {
            level: 1,
            unlockedProducts: ['pd003', 'pd011', 'pd012', 'pd022', 'pd024'],
            unlockedEquipment: ['eq005', 'eq006', 'eq007'],
            cost: 5000,
            researchTime: 5, // in-game days
            description: 'Liquids and suspensions, and two more tablets.',
        },
        {
            level: 2,
            unlockedProducts: ['pd013', 'pd014', 'pd015', 'pd016', 'pd023'],
            unlockedEquipment: ['eq008'],
            cost: 10000,
            researchTime: 7,
            description: 'Syrups, another antibiotic suspension, and three more tablets.',
        },
        {
            level: 3,
            unlockedProducts: ['pd017', 'pd018', 'pd020', 'pd021'],
            unlockedEquipment: ['eq013', 'eq017'],
            cost: 15000,
            researchTime: 10,
            description: 'Topical gels and specialist tablets.',
        },
        {
            level: 4,
            unlockedProducts: ['pd019', 'pd025'],
            unlockedEquipment: ['eq015', 'eq016', 'eq019'],
            cost: 25000,
            researchTime: 14,
            description: 'Inhalers and sterile injectables.',
        },
    ],
};

window.research = {
    getUnlockedProducts: function () {
        let unlocked: string[] = [];
        for (let i = 0; i <= window.researchData.currentLevel; i++) {
            unlocked = unlocked.concat(window.researchData.levels[i].unlockedProducts);
        }
        return unlocked;
    },

    getUnlockedEquipment: function () {
        let unlocked: string[] = [];
        for (let i = 0; i <= window.researchData.currentLevel; i++) {
            unlocked = unlocked.concat(window.researchData.levels[i].unlockedEquipment);
        }
        return unlocked;
    },

    isEquipmentUnlocked: function (equipmentId) {
        return this.getUnlockedEquipment().includes(equipmentId);
    },

    // Starts research toward the next level. Cash is deducted immediately,
    // but the level itself only unlocks once checkResearchCompletion()
    // observes that enough in-game days have passed - see
    // ResearchInProgress in types/catalog.d.ts.
    researchNextLevel: function () {
        if (window.researchData.inProgress) {
            console.log('Research already in progress.');
            return;
        }

        const nextLevel = window.researchData.currentLevel + 1;
        if (nextLevel < window.researchData.levels.length) {
            const levelData = window.researchData.levels[nextLevel];
            const paid = window.finances.transact({
                type: 'expense',
                category: 'research',
                amount: levelData.cost,
                description: `Research: level ${nextLevel}`,
                requireFunds: true,
            });
            if (paid) {
                window.researchData.inProgress = {
                    targetLevel: nextLevel,
                    startDayIndex: window.gameState.dayIndex,
                    daysRequired: levelData.researchTime,
                };

                // Show the new "in progress" state
                window.updateUI('research');

                console.log(`Started researching level ${nextLevel} (${levelData.researchTime} days).`);
            } else {
                console.log('Not enough money to research the next level.');
            }
        } else {
            console.log('Max research level reached.');
        }
    },

    // Called once per in-game day (see timeEvents.ts's startDaySystems) to
    // check whether an in-progress research level has finished.
    checkResearchCompletion: function (gameState: GameState) {
        const inProgress = window.researchData.inProgress;
        if (!inProgress) return;

        // Another day of progress, whether or not it's done
        window.updateUI('research');

        const daysElapsed = gameState.dayIndex - inProgress.startDayIndex;
        if (daysElapsed >= inProgress.daysRequired) {
            window.researchData.currentLevel = inProgress.targetLevel;
            window.researchData.inProgress = null;

            console.log(`Research complete: reached level ${window.researchData.currentLevel}.`);

            const level = window.researchData.levels[inProgress.targetLevel];
            const products = level.unlockedProducts
                .map((id) => window.productsData.find((p) => p.id === id)?.name)
                .filter((name): name is string => !!name);
            window.notifications?.add(
                `Research level ${level.level} complete. Customers can now ask for ${products.join(', ')}. ` +
                    'Check the Equipment page for what you need to make them.',
                'success',
            );

            // Newly unlocked equipment can be bought, and new products stocked
            window.updateUI('equipment');
            window.updateUI('inventory');
        }
    },
};
