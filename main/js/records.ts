// records.js - the pharmacy's history (Phase 8).
//
//   days    one DayRecord per closing: money by category, cash, the loan,
//           reputation, customers by outcome and staff. Kept for the whole
//           game (a few hundred bytes a day).
//   visits  one CustomerVisit per departure, newest first, the last
//           VISITS_KEPT of them.
//
// The Dashboard, Statistics and Customers pages and the Finances month view
// read it. Saved with the game (saveFile.ts). Times are game-time epoch
// milliseconds, like Customer.arrivedAt, so there's nothing to revive on load.

const VISITS_KEPT = 500;
const LOST_REASONS: DepartureReason[] = ['impatient', 'price', 'closing', 'unavailable'];

window.records = {
    days: [],
    visits: [],

    // Called by customers.customerLeaves for every departure, before the
    // customer's prescription is removed.
    recordVisit(customer, reason) {
        const prescription = customer.prescriptionId
            ? window.prescriptions.getPrescription(customer.prescriptionId)
            : undefined;
        const product = prescription ? window.productsData.find((p) => p.id === prescription.productId) : undefined;
        const price =
            reason === 'served' && prescription
                ? (prescription.quotedPrice ?? (product ? product.price * prescription.dosage : 0))
                : 0;

        this.visits.unshift({
            id: customer.id,
            name: `${customer.firstName} ${customer.lastName}`,
            insurer: customer.insurance?.planName ?? '',
            product: prescription?.productName ?? product?.name ?? null,
            dosage: prescription?.dosage ?? 0,
            day: window.gameState.dayIndex,
            arrivedAt: customer.arrivedAt,
            leftAt: window.clock.now(),
            reason,
            price,
            mood: customer.mood,
            returning: !!customer.isReturning,
        });
        if (this.visits.length > VISITS_KEPT) this.visits.length = VISITS_KEPT;
    },

    // Called at closing, after wages, overhead and interest are charged and
    // before "today" rolls over. Replaces the day's record if it already has one.
    recordDay() {
        const state = window.gameState;
        const data = window.financesData;
        const now = state.currentDate;
        const opening = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const byCategory = window.finances.categoryTotals(opening, now.getTime());

        const record: DayRecord = {
            day: state.dayIndex,
            date: now.getTime(),
            revenue: data.revenue.today,
            costs: data.expenses.today,
            net: data.profit.today,
            revenueByCategory: byCategory.revenue,
            costsByCategory: byCategory.expenses,
            cash: data.cash,
            loan: data.loanBalance ?? 0,
            reputation: window.brandReputation.reputationScore,
            customers: { ...(state.customersToday ?? {}) },
            staff: window.employeesData.length,
        };

        const existing = this.days.findIndex((d) => d.day === record.day);
        if (existing >= 0) this.days[existing] = record;
        else this.days.push(record);
        return record;
    },

    // Every customer who has left for this reason, today included. Counts
    // start when the history does (a new game, or the upgrade of an older save).
    totalCustomers(reason) {
        const today = window.gameState.dayIndex;
        const before = this.days.reduce((sum, d) => sum + (d.day !== today ? (d.customers[reason] ?? 0) : 0), 0);
        return before + (window.gameState.customersToday?.[reason] ?? 0);
    },

    // Customers who left unserved, from counts by reason. Those sent home by
    // a repair ('reset') didn't choose to leave and aren't counted.
    lost(counts) {
        return LOST_REASONS.reduce((sum, reason) => sum + (counts[reason] ?? 0), 0);
    },

    // The last closed day before today.
    yesterday() {
        const today = window.gameState.dayIndex;
        for (let i = this.days.length - 1; i >= 0; i--) {
            if (this.days[i].day < today) return this.days[i];
        }
        return undefined;
    },

    // The record for a calendar date, if that day has closed.
    forDate(date) {
        const key = date.toDateString();
        return this.days.find((d) => new Date(d.date).toDateString() === key);
    },
};
