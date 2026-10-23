// /js/data/lending.ts - the startup loan the bank offers on the new-game
// screen (Phase 10, #12). Loaded by the main menu (index.html) as well as
// the game; stakes.ts keeps the loan once it's taken.
//
// Modelled on a US small-business term loan in 2023: about prime (8.25%)
// plus a spread, 5 to 10 years, repaid monthly. The player moves the rate:
//   - a longer term costs more (TERM_POINTS a year past MIN_TERM_YEARS)
//   - borrowing more than the owner puts in (the $100,000 start) costs
//     more: LEVERAGE_POINTS for each LEVERAGE_STEP above it. Putting more
//     of your own money in, so borrowing less, is the "bigger down payment"
//   - a personal guarantee, or the equipment as collateral, costs less
// The cap is set by the business type and the property, so a 503B start
// (Phase 19) can borrow far more than a retail one.

const BASE_RATE = 0.095;
const MIN_RATE = 0.065;
const MIN_TERM_YEARS = 5;
const MAX_TERM_YEARS = 10;
const TERM_POINTS = 0.25;
const OWNER_EQUITY = 100000;
const LEVERAGE_STEP = 50000;
const LEVERAGE_POINTS = 0.5;
const GUARANTEE_POINTS = -1;
const COLLATERAL_POINTS = -0.75;
const AMOUNT_STEP = 10000;

// The most the bank lends: a base for the business type, plus two years of
// the property's rent (a bigger, dearer place needs more to fit out and
// carry). Rounded down to the step.
const LOAN_BASE: Record<BusinessType, number> = { retail: 150000 };
const RENT_MONTHS_LENT = 24;

function monthlyPayment(principal: number, annualRate: number, months: number): number {
    if (!(principal > 0) || !(months > 0)) return 0;
    const r = annualRate / 12;
    if (r === 0) return principal / months;
    return (principal * r) / (1 - Math.pow(1 + r, -months));
}

window.lending = {
    BASE_RATE,
    MIN_TERM_YEARS,
    MAX_TERM_YEARS,
    AMOUNT_STEP,

    maxAmount(business, listing, termYears) {
        const cap = LOAN_BASE[business] + RENT_MONTHS_LENT * window.properties.monthlyRent(listing, termYears);
        return Math.floor(cap / AMOUNT_STEP) * AMOUNT_STEP;
    },

    quote(terms) {
        const parts: LoanQuote['parts'] = [{ label: 'Base rate', points: BASE_RATE * 100 }];
        const years = Math.min(MAX_TERM_YEARS, Math.max(MIN_TERM_YEARS, Math.round(terms.termYears)));
        if (years > MIN_TERM_YEARS) {
            parts.push({ label: `${years}-year term`, points: (years - MIN_TERM_YEARS) * TERM_POINTS });
        }
        const over = Math.max(0, terms.amount - OWNER_EQUITY);
        const steps = Math.ceil(over / LEVERAGE_STEP);
        if (steps > 0) {
            parts.push({ label: 'Borrowing more than you put in', points: steps * LEVERAGE_POINTS });
        }
        if (terms.guarantee) parts.push({ label: 'Personal guarantee', points: GUARANTEE_POINTS });
        if (terms.collateral) parts.push({ label: 'Equipment as collateral', points: COLLATERAL_POINTS });

        const rate = Math.max(MIN_RATE, parts.reduce((sum, p) => sum + p.points, 0) / 100);
        const months = years * 12;
        const payment = monthlyPayment(terms.amount, rate, months);
        return {
            rate,
            monthlyPayment: payment,
            totalInterest: terms.amount > 0 ? payment * months - terms.amount : 0,
            parts,
        };
    },

    monthlyPayment,
};
