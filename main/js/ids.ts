// ids.js - ids for everything the game creates (customers, prescriptions,
// tasks, claims, transactions, employees).
//
// One counter, kept on gameState so it's saved with the game. Date.now()
// ids collided whenever two things were made in the same millisecond, which
// happens every time the hiring screen generates its five candidates (M9).
// Saves from before the counter have Date.now()-based ids ("cust-1729...-42"),
// which can't equal a counter id ("cust-42"), so they start it at 1.

window.nextId = function (prefix: string): string {
    const state = window.gameState;
    const n = state.nextId ?? 1;
    state.nextId = n + 1;
    return `${prefix}-${n}`;
};
