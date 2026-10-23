// stakes.js - what can go wrong for the pharmacy, and the bank (Phase 8).
//
// Wages, rent and utilities are owed whether or not there's cash for them,
// so cash can go below $0 at closing. The bank allows BANKRUPT_AFTER closings in a
// row in the red; the next one is bankruptcy and the game is over. A loan
// (borrow and repay on the Finances page) is the way out of a bad stretch.
// Its principal moves cash but isn't revenue or a cost (finances.ts logs
// category 'loan' outside the P&L); the interest is a cost, charged at closing.
//
// Term loans (Phase 10, #12): the startup loan, negotiated on the new-game
// screen (data/lending.ts). Repaid in equal monthly payments on the 1st,
// from the month after it was taken: each payment's interest is a cost
// and its principal financing. It can be paid off early, with no penalty.

const LOAN_STEP = 10000;
const LOAN_LIMIT = 50000;
const LOAN_DAILY_INTEREST = 0.001; // 0.1% of the balance a day
const BANKRUPT_AFTER = 3; // closings in a row with cash below $0
const LOW_CASH_DAYS = 3; // warn when cash covers fewer days of fixed costs
const DAYS_A_MONTH = 365 / 12;

// What's left on a term loan, to the cent
function roundCents(amount: number): number {
    return Math.round(amount * 100) / 100;
}

function termLoans(): TermLoan[] {
    return (window.financesData.loans ??= []);
}

window.stakes = {
    LOAN_STEP,
    LOAN_LIMIT,
    LOAN_DAILY_INTEREST,
    BANKRUPT_AFTER,

    loanBalance() {
        return window.financesData.loanBalance ?? 0;
    },

    termLoanBalance() {
        return termLoans().reduce((sum, loan) => sum + loan.balance, 0);
    },

    // Everything owed to the bank: the line of credit and term loans
    debt() {
        return this.loanBalance() + this.termLoanBalance();
    },

    // The startup loan, on the terms quoted (lending.quote). Its principal
    // comes in as financing. Null for no amount.
    takeTermLoan(terms, name) {
        if (!(terms.amount > 0)) return null;
        const quote = window.lending.quote(terms);
        const loan: TermLoan = {
            id: window.nextId('loan'),
            name,
            principal: terms.amount,
            rate: quote.rate,
            termMonths: terms.termYears * 12,
            monthlyPayment: roundCents(quote.monthlyPayment),
            balance: terms.amount,
            paymentsMade: 0,
            start: window.clock.now(),
            guarantee: terms.guarantee,
            collateral: terms.collateral,
        };
        window.finances.transact({
            type: 'income',
            category: 'loan',
            amount: terms.amount,
            description: `${name}: borrowed ${window.fmt.money(terms.amount)} over ${terms.termYears} years at ${window.fmt.pct(quote.rate, 2)}`,
            locationId: null,
        });
        termLoans().push(loan);
        window.updateUI('finances');
        return loan;
    },

    // On the 1st: each term loan's monthly payment, owed whether or not
    // there's cash, like rent. The last one clears what's left.
    payTermLoans() {
        termLoans().forEach((loan) => {
            if (loan.balance <= 0) return;
            const interest = roundCents((loan.balance * loan.rate) / 12);
            const last = loan.paymentsMade + 1 >= loan.termMonths;
            const principal = last ? loan.balance : Math.min(loan.balance, loan.monthlyPayment - interest);
            loan.paymentsMade++;
            window.finances.transact({
                type: 'expense',
                category: 'interest',
                amount: interest,
                description: `${loan.name}: interest, payment ${loan.paymentsMade} of ${loan.termMonths}`,
                locationId: null,
            });
            window.finances.transact({
                type: 'expense',
                category: 'loan',
                amount: principal,
                description: `${loan.name}: principal, payment ${loan.paymentsMade} of ${loan.termMonths}`,
                locationId: null,
            });
            loan.balance = roundCents(loan.balance - principal);
            if (loan.balance <= 0) {
                window.notifications?.add(`${loan.name} is paid off.`, 'success');
            }
        });
        window.financesData.loans = termLoans().filter((loan) => loan.balance > 0);
        window.updateUI('finances');
    },

    // Pays a term loan off now. False if there isn't the cash.
    payOffTermLoan(id) {
        const loan = termLoans().find((l) => l.id === id);
        if (!loan || loan.balance <= 0) return false;
        const paid = window.finances.transact({
            type: 'expense',
            category: 'loan',
            amount: loan.balance,
            description: `${loan.name}: paid off early`,
            requireFunds: true,
            locationId: null,
        });
        if (!paid) return false;
        loan.balance = 0;
        window.financesData.loans = termLoans().filter((l) => l.balance > 0);
        window.notifications?.add(`${loan.name} is paid off.`, 'success');
        window.updateUI('finances');
        return true;
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
            description: `Line of credit: borrowed ${window.fmt.money(amount)}`,
            locationId: null,
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
            description: `Line of credit: repaid ${window.fmt.money(due)}`,
            requireFunds: true,
            locationId: null,
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
            description: `Line of credit interest on ${window.fmt.money(this.loanBalance())}`,
            locationId: null,
        });
    },

    // What a day costs before any sales: every location's wages (without
    // overtime), utilities and services and a day's share of its rent, the
    // line of credit's interest, and a day's share of term-loan payments.
    fixedDailyCosts() {
        let total = this.dailyInterest();
        window.company.forEachLocation((location) => {
            total += window.employeesData.reduce((sum, emp) => sum + window.finances.dailyWage(emp), 0);
            total += window.company.dailyServices(location) + location.lease.monthlyRent / DAYS_A_MONTH;
        });
        return total + termLoans().reduce((sum, loan) => sum + loan.monthlyPayment, 0) / DAYS_A_MONTH;
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
                `Cash is low: ${window.fmt.money(cash)} covers less than ${LOW_CASH_DAYS} days of fixed costs (wages, rent, utilities and loans).`,
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
