// goals.js - milestones, and the win (Phase 8; a ladder for a long game
// in Phase 10, #13).
//
// Checked once a day, at closing. Each goal is reached once, on the day
// recorded in gameState.goalsReached; reaching the last of them wins the
// game (gameState.wonOnDay), and play goes on. The ladder runs for years: a
// steady player reaches the first few in the first weeks, $300,000 in the
// bank in the first year or so (a well-run store nets about $1,500 a day,
// balance pass 2026-10-23), and the last, five years open, can't come
// sooner. Later phases add theirs before it: a second location (Phase 18),
// a 503B licence (19), an approved drug (20). Ids are saved, so keep them:
// the ten goals from before Phase 10 kept theirs, so a save's reached goals
// carry over.

const DAYS_A_YEAR = 365;

// Cash less everything owed to the bank (the line of credit and term loans)
function netCash(): number {
    return window.financesData.cash - window.stakes.debt();
}

function daysOpen(): number {
    return (window.gameState.lastEndedDayIndex ?? -1) + 1;
}

function servedCustomers(): number {
    return window.records.totalCustomers('served');
}

function totalStaff(): number {
    return window.company.locations.reduce((sum, loc) => sum + loc.employees.length, 0);
}

function reportsWhere(kind: PeriodReport['kind']): PeriodReport[] {
    return (window.reports?.list ?? []).filter((r) => r.kind === kind);
}

const GOALS: GoalDef[] = [
    { id: 'week', label: 'Open for a week', target: 7, unit: 'days', value: daysOpen },
    { id: 'served500', label: 'Serve 500 customers', target: 500, unit: 'customers', value: servedCustomers },
    {
        id: 'reputation50',
        label: 'Reach reputation 50',
        target: 50,
        unit: 'reputation',
        value: () => window.brandReputation.reputationScore,
    },
    {
        id: 'profitMonth',
        label: 'Make a profit over a month',
        target: 1,
        unit: 'months',
        value: () => reportsWhere('month').filter((r) => r.net > 0).length,
    },
    {
        id: 'research2',
        label: 'Reach research level 2',
        target: 2,
        unit: 'level',
        value: () => window.researchData.currentLevel,
    },
    { id: 'staff8', label: 'Build a team of 8', target: 8, unit: 'staff', value: totalStaff },
    {
        id: 'bank150k',
        label: 'Have $150,000 in the bank, net of loans',
        target: 150000,
        unit: 'money',
        value: netCash,
    },
    { id: 'served2500', label: 'Serve 2,500 customers', target: 2500, unit: 'customers', value: servedCustomers },
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
    { id: 'year1', label: 'Open for a year', target: DAYS_A_YEAR, unit: 'days', value: daysOpen },
    {
        id: 'bank300k',
        label: 'Have $300,000 in the bank, net of loans',
        target: 300000,
        unit: 'money',
        value: netCash,
    },
    {
        id: 'profitYear250k',
        label: 'Net $250,000 profit in a year',
        target: 250000,
        unit: 'money',
        value: () => Math.max(0, ...reportsWhere('year').map((r) => r.net)),
    },
    { id: 'served10k', label: 'Serve 10,000 customers', target: 10000, unit: 'customers', value: servedCustomers },
    {
        id: 'reputation90',
        label: 'Reach reputation 90',
        target: 90,
        unit: 'reputation',
        value: () => window.brandReputation.reputationScore,
    },
    {
        id: 'bank1m',
        label: 'Have $1,000,000 in the bank, net of loans',
        target: 1000000,
        unit: 'money',
        value: netCash,
    },
    { id: 'years5', label: 'Open for five years', target: 5 * DAYS_A_YEAR, unit: 'days', value: daysOpen },
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
