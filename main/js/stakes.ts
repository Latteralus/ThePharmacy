// stakes.js - what can go wrong for the pharmacy, and the bank (Phase 8).
//
// Wages and overhead are owed whether or not there's cash for them, so cash
// can go below $0 at closing. The bank allows BANKRUPT_AFTER closings in a
// row in the red; the next one is bankruptcy and the game is over. A loan
// (borrow and repay on the Finances page) is the way out of a bad stretch.
// Its principal moves cash but isn't revenue or a cost (finances.ts logs
// category 'loan' outside the P&L); the interest is a cost, charged at closing.

const LOAN_STEP = 10000;
const LOAN_LIMIT = 50000;
const LOAN_DAILY_INTEREST = 0.001; // 0.1% of the balance a day
const BANKRUPT_AFTER = 3; // closings in a row with cash below $0
const LOW_CASH_DAYS = 3; // warn when cash covers fewer days of fixed costs

window.stakes = {
    LOAN_STEP,
    LOAN_LIMIT,
    LOAN_DAILY_INTEREST,
    BANKRUPT_AFTER,

    loanBalance() {
        return window.financesData.loanBalance ?? 0;
    },

    loanRoom() {
        return Math.max(0, LOAN_LIMIT - this.loanBalance());
    },

    // False if it's not a positive amount, or more than the bank will lend.
    borrow(amount) {
        if (window.gameState.bankrupt || !Number.isFinite(amount) || amount <= 0 || amount > this.loanRoom()) {
            return false;
        }
        const lent = window.finances.transact({
            type: 'income',
            category: 'loan',
            amount,
            description: `Bank loan: borrowed ${window.fmt.money(amount)}`,
        });
        if (!lent) return false;
        window.financesData.loanBalance = this.loanBalance() + amount;
        window.updateUI('finances');
        return true;
    },

    // Repays up to the balance. False if there's nothing owed, or not enough cash.
    repay(amount) {
        const due = Math.min(amount, this.loanBalance());
        if (!Number.isFinite(due) || due <= 0) return false;
        const paid = window.finances.transact({
            type: 'expense',
            category: 'loan',
            amount: due,
            description: `Bank loan: repaid ${window.fmt.money(due)}`,
            requireFunds: true,
        });
        if (!paid) return false;
        // Rounded to cents, so repaying "all" leaves exactly 0
        window.financesData.loanBalance = Math.round((this.loanBalance() - due) * 100) / 100;
        window.updateUI('finances');
        return true;
    },

    dailyInterest() {
        return this.loanBalance() * LOAN_DAILY_INTEREST;
    },

    // At closing, with the wages and overhead (finances.applyDailyCosts).
    // Owed whether or not there's cash, like them.
    chargeInterest() {
        const interest = this.dailyInterest();
        if (interest <= 0) return;
        window.finances.transact({
            type: 'expense',
            category: 'interest',
            amount: interest,
            description: `Loan interest on ${window.fmt.money(this.loanBalance())}`,
        });
    },

    // What a day costs before any sales: wages (without overtime), overhead
    // and loan interest.
    fixedDailyCosts() {
        const wages = window.employeesData.reduce((sum, emp) => sum + window.finances.dailyWage(emp), 0);
        return wages + window.financesData.overhead + this.dailyInterest();
    },

    // Closings in a row in the red so far, 0 when cash is at or above $0.
    daysInRed() {
        return window.gameState.daysInRed ?? 0;
    },

    // At closing, after the day's costs: counts closings in the red, warns,
    // and declares bankruptcy on the BANKRUPT_AFTER-th in a row. Returns true
    // if the pharmacy has gone bankrupt.
    closeDay() {
        const state = window.gameState;
        const cash = window.financesData.cash;
        state.daysInRed = cash < 0 ? this.daysInRed() + 1 : 0;

        if (state.daysInRed >= BANKRUPT_AFTER) {
            state.bankrupt = true;
            state.isDayActive = false;
            return true;
        }

        if (cash < 0) {
            window.notifications?.add(
                `Cash is ${window.fmt.money(cash)} at closing (${state.daysInRed} of ${BANKRUPT_AFTER} in a row). ` +
                    `Get it back above $0 by closing on day ${this.bankruptcyDay()}, or the pharmacy goes bankrupt. ` +
                    'The bank lends on the Finances page.',
                'error',
            );
        } else if (cash < LOW_CASH_DAYS * this.fixedDailyCosts()) {
            window.notifications?.add(
                `Cash is low: ${window.fmt.money(cash)} covers less than ${LOW_CASH_DAYS} days of wages, overhead and interest.`,
                'warning',
            );
        }
        return false;
    },

    // The day number (as the player sees it, from 1) of the closing that
    // would be the last straw, if cash stays below $0 until then. Counted
    // from the last closing (endOfDay sets lastEndedDayIndex first).
    bankruptcyDay() {
        const state = window.gameState;
        const lastClosed = (state.lastEndedDayIndex ?? state.dayIndex - 1) + 1;
        return lastClosed + (BANKRUPT_AFTER - this.daysInRed());
    },
};
