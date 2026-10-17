// /js/data/research.js
window.researchData = {
    currentLevel: 0,
    inProgress: null,
    levels: [
        {
            level: 0,
            unlockedProducts: [
                'pd001',
                'pd002',
                'pd003',
                'pd004',
                'pd005',
                'pd006',
                'pd007',
                'pd008',
                'pd009',
                'pd010',
            ],
            unlockedEquipment: ['eq001', 'eq002', 'eq003', 'eq004', 'eq005', 'eq006'],
            cost: 0,
            researchTime: 0,
            description: 'Basic pharmacy operations unlocked.',
        },
        {
            level: 1,
            unlockedProducts: ['pd011', 'pd012', 'pd013', 'pd014', 'pd015'],
            unlockedEquipment: ['eq007', 'eq008', 'eq009'],
            cost: 5000,
            researchTime: 5, // Example: 5 in-game days
            description: 'Unlock new medicines and equipment.',
        },
        {
            level: 2,
            unlockedProducts: ['pd016', 'pd017', 'pd018', 'pd019', 'pd020', 'pd021'],
            unlockedEquipment: ['eq010', 'eq011', 'eq012', 'eq013', 'eq014'],
            cost: 10000,
            researchTime: 7,
            description: 'Further expand your product line and improve efficiency.',
        },
        {
            level: 3,
            unlockedProducts: ['pd022', 'pd023', 'pd024', 'pd025', 'pd026'],
            unlockedEquipment: ['eq015', 'eq016'],
            cost: 15000,
            researchTime: 10,
            description: 'Unlock advanced medications and equipment.',
        },
        {
            level: 4,
            unlockedProducts: ['pd027', 'pd028', 'pd029', 'pd030', 'pd031', 'pd032', 'pd033', 'pd034', 'pd035'],
            unlockedEquipment: ['eq017', 'eq018'],
            cost: 20000,
            researchTime: 12,
            description: 'Specialize in more complex treatments and formulations.',
        },
        {
            level: 5,
            unlockedProducts: ['pd036', 'pd037', 'pd038', 'pd039', 'pd040'],
            unlockedEquipment: ['eq019', 'eq020'],
            cost: 25000,
            researchTime: 14,
            description: 'Unlock cutting-edge medications and state-of-the-art equipment.',
        },
        {
            level: 6,
            unlockedProducts: ['pd041', 'pd042', 'pd043', 'pd044', 'pd045'],
            unlockedEquipment: ['eq021', 'eq022'],
            cost: 30000,
            researchTime: 16,
            description: 'Become a leader in pharmaceutical research and development.',
        },
        {
            level: 7,
            unlockedProducts: [
                'pd046',
                'pd047',
                'pd048',
                'pd049',
                'pd050',
                'pd051',
                'pd052',
                'pd053',
                'pd054',
                'pd055',
            ],
            unlockedEquipment: [],
            cost: 35000,
            researchTime: 18,
            description: 'Master advanced pharmaceutical techniques and expand your market reach.',
        },
        {
            level: 8,
            unlockedProducts: ['pd056', 'pd057', 'pd058', 'pd059', 'pd060', 'pd061', 'pd062'],
            unlockedEquipment: [],
            cost: 40000,
            researchTime: 20,
            description: 'Develop groundbreaking treatments and solidify your industry leadership.',
        },
        {
            level: 9,
            unlockedProducts: ['pd067', 'pd068', 'pd069', 'pd070', 'pd071', 'pd072', 'pd073', 'pd074', 'pd075'],
            unlockedEquipment: [],
            cost: 45000,
            researchTime: 22,
            description: 'Reach the pinnacle of pharmaceutical innovation and patient care.',
        },
        {
            level: 10,
            unlockedProducts: [
                'pd076',
                'pd077',
                'pd078',
                'pd079',
                'pd080',
                'pd081',
                'pd082',
                'pd083',
                'pd084',
                'pd085',
            ],
            unlockedEquipment: [],
            cost: 50000,
            researchTime: 24,
            description: 'Unlock the full potential of your pharmacy and set new industry standards.',
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

    // Starts research toward the next level. Cash is deducted immediately,
    // but the level itself only unlocks once checkResearchCompletion()
    // observes that enough in-game days have passed - see
    // ResearchInProgress in global.d.ts.
    researchNextLevel: function () {
        if (window.researchData.inProgress) {
            console.log('Research already in progress.');
            return;
        }

        const nextLevel = window.researchData.currentLevel + 1;
        if (nextLevel < window.researchData.levels.length) {
            const levelData = window.researchData.levels[nextLevel];
            if (window.financesData.cash >= levelData.cost) {
                window.financesData.cash -= levelData.cost;
                window.researchData.inProgress = {
                    targetLevel: nextLevel,
                    startDayIndex: window.gameState.dayIndex,
                    daysRequired: levelData.researchTime,
                };

                // Update UI to reflect the cash deduction and the new "in progress" state
                window.updateUI('finances');
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

        const daysElapsed = gameState.dayIndex - inProgress.startDayIndex;
        if (daysElapsed >= inProgress.daysRequired) {
            window.researchData.currentLevel = inProgress.targetLevel;
            window.researchData.inProgress = null;

            console.log(`Research complete: reached level ${window.researchData.currentLevel}.`);

            window.updateUI('research');
            window.updateUI('finances');

            // Force a re-render if the player is currently looking at the
            // Research page, since its progress bar reflects inProgress
            // directly rather than polling on its own.
            if (window.currentPage === 'research') {
                window.showPage('research');
            }
        }
    },
};
