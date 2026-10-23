// goals.js - milestones, and the win (Phase 8).
//
// Checked once a day, at closing. Each goal is reached once, on the day
// recorded in gameState.goalsReached; reaching the last of them wins the
// game (gameState.wonOnDay), and play goes on. Targets are first guesses,
// set from a simulated game: a steady player reaches the first few in the
// first week or two and the last around day 50.

const GOALS: GoalDef[] = [
    {
        id: 'week',
        label: 'Open for a week',
        target: 7,
        unit: 'days',
        value: () => (window.gameState.lastEndedDayIndex ?? -1) + 1,
    },
    {
        id: 'served500',
        label: 'Serve 500 customers',
        target: 500,
        unit: 'customers',
        value: () => window.records.totalCustomers('served'),
    },
    {
        id: 'reputation50',
        label: 'Reach reputation 50',
        target: 50,
        unit: 'reputation',
        value: () => window.brandReputation.reputationScore,
    },
    {
        id: 'research2',
        label: 'Reach research level 2',
        target: 2,
        unit: 'level',
        value: () => window.researchData.currentLevel,
    },
    {
        id: 'staff8',
        label: 'Build a team of 8',
        target: 8,
        unit: 'staff',
        value: () => window.employeesData.length,
    },
    {
        id: 'bank250k',
        label: 'Have $250,000 in the bank',
        target: 250000,
        unit: 'money',
        value: () => window.financesData.cash - window.stakes.loanBalance(),
    },
    {
        id: 'served2500',
        label: 'Serve 2,500 customers',
        target: 2500,
        unit: 'customers',
        value: () => window.records.totalCustomers('served'),
    },
    {
        id: 'reputation75',
        label: 'Reach reputation 75',
        target: 75,
        unit: 'reputation',
        value: () => window.brandReputation.reputationScore,
    },
    {
        id: 'research4',
        label: 'Reach research level 4',
        target: 4,
        unit: 'level',
        value: () => window.researchData.currentLevel,
    },
    {
        id: 'bank1m',
        label: 'Have $1,000,000 in the bank',
        target: 1000000,
        unit: 'money',
        value: () => window.financesData.cash - window.stakes.loanBalance(),
    },
];

window.goals = {
    list() {
        const reached = window.gameState.goalsReached ?? {};
        return GOALS.map((goal) => ({
            id: goal.id,
            label: goal.label,
            target: goal.target,
            unit: goal.unit,
            value: goal.value(),
            reachedOn: reached[goal.id] ?? null,
        }));
    },

    // At closing: records goals reached today and notifies the player.
    // Returns those goals, and whether today's closing won the game.
    check() {
        const state = window.gameState;
        const reached = (state.goalsReached ??= {});
        const today: GoalProgress[] = [];
        this.list().forEach((goal) => {
            if (goal.reachedOn !== null || goal.value < goal.target) return;
            reached[goal.id] = state.dayIndex;
            today.push({ ...goal, reachedOn: state.dayIndex });
            window.notifications?.add(`Goal reached: ${goal.label}.`, 'success');
        });

        const won = state.wonOnDay === undefined && GOALS.every((goal) => reached[goal.id] !== undefined);
        if (won) state.wonOnDay = state.dayIndex;
        return { reached: today, won };
    },

    // Goals reached at today's closing (the daily summary lists them).
    reachedToday() {
        return this.list().filter((goal) => goal.reachedOn === window.gameState.dayIndex);
    },
};
