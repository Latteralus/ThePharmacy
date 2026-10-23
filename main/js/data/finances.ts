// improved-finances.js

// Globally configurable markup for suggested prices (default 50%)
window.globalMarkup = 1.5;

// Daily overhead (rent, utilities, licences, insurance, software) for a
// suburban store: about $21,000 a month. It was $3,000 a day, sized for
// prices 4x today's (balance pass, 2026-10-23). Cities pay more rent.
const BASE_OVERHEAD = 700;
const LOCATION_OVERHEAD: Record<string, number> = { urban: 1.3, suburban: 1, rural: 0.7 };

// What an employee costs beyond their salary: payroll taxes and benefits.
const PAYROLL_LOAD = 1.25;
// A day's pay covers this many hours. Each hour over is paid at
// OVERTIME_RATE times the hourly rate (a day's pay / OVERTIME_AFTER_HOURS).
const OVERTIME_AFTER_HOURS = 8;
const OVERTIME_RATE = 1.5;

function dailyWage(employee: Employee): number {
    return (employee.salary * PAYROLL_LOAD) / 365;
}

function overtimeHours(employee: Employee): number {
    return Math.max(0, (employee.minutesWorkedToday ?? 0) / 60 - OVERTIME_AFTER_HOURS);
}

function overtimePay(employee: Employee): number {
    return overtimeHours(employee) * (dailyWage(employee) / OVERTIME_AFTER_HOURS) * OVERTIME_RATE;
}

window.financesData = {
    cash: 10000,
    dailyIncome: 0,
    pendingInsuranceIncome: 0,
    pendingOrders: 0,
    completedOrders: 0,
    overhead: 500, // e.g., daily overhead (rent, utilities)
    loanBalance: 0, // owed to the bank (stakes.ts)
    transactions: [], // Transaction history
    revenue: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        lastMonth: 0,
        total: 0,
    },
    expenses: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        lastMonth: 0,
        total: 0,
    },
    profit: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        lastMonth: 0,
        total: 0,
    },
    insuranceReimbursements: {
        pending: 0,
        received: 0,
        rejected: 0,
    },
    expenseCategories: {
        wages: 0,
        materials: 0,
        overhead: 0,
        equipment: 0,
        research: 0,
        interest: 0,
        other: 0,
    },
    revenueCategories: {
        copays: 0,
        insurance: 0,
        other: 0,
    },
    targetDailyRevenue: 1000, // Default target
    targetMonthlyRevenue: 30000, // Default target
};

// The ledger. transact() is the only function that changes cash. It also
// updates the period totals, the category buckets and the transaction list,
// so they can't drift apart. An ESLint rule flags `cash` writes anywhere
// else. Amounts are always positive; `type` says which way the money moves.
function bucketFor<T extends object>(buckets: T, category: string): keyof T {
    return (category in buckets ? category : 'other') as keyof T;
}

// Appends to the transaction log (newest first, last 1000 kept). Only
// transact() calls it, so every entry matches a change in cash.
function logTransaction(transaction: Transaction): void {
    const data = window.financesData;
    data.transactions.push(transaction);
    data.transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
    if (data.transactions.length > 1000) {
        data.transactions = data.transactions.slice(0, 1000);
    }
}

// Money that moves cash without being revenue or a cost: the bank loan's
// principal (stakes.ts). It's logged, and left out of the period totals,
// the category buckets, today's income and every P&L.
const FINANCING_CATEGORIES = new Set(['loan']);

function addToPeriods(periods: FinancialPeriodTotals, amount: number): void {
    periods.today += amount;
    periods.thisWeek += amount;
    periods.thisMonth += amount;
    periods.total += amount;
}

// Pricing (H3). The market price is the materials' cost at the standard 50%
// markup. It's fixed, so the player's markup setting (globalMarkup) can't
// move it. A drug the customer's plan covers is sold at the plan's contract
// price (planPrice); the player's price is for everyone else (self-pay, or
// not on the formulary), and they judge it against the market price. At
// check-in they always accept a price up to the market price. Above it, the
// chance they accept falls in a straight line, to 0 at MAX_PRICE_RATIO times
// the market price. Those who accept are less happy the more they pay
// (PRICE_MOOD mood points per 100% over market, up to MAX_PRICE_MOOD_LOSS),
// and those who refuse walk out. So the best price is somewhat above
// market, not unlimited.
//
// The markup was 35% with up to 25% off materials, about a 45% gross margin.
// It's now a third, a compounding pharmacy's (every prescription is lab
// work, so it earns more than a retail counter's ~22%). Simulated over 8
// weeks, a well-run store nets about 10% and a short-staffed one about 5%
// (balance pass, 2026-10-23). This is the dial for how hard the game is.
const MARKET_MARKUP = 1.5;
const MAX_PRICE_RATIO = 3;
const PRICE_MOOD = 2;
const MAX_PRICE_MOOD_LOSS = 3;

function acceptanceChance(priceRatio: number): number {
    if (priceRatio <= 1) return 1;
    return Math.max(0, 1 - (priceRatio - 1) / (MAX_PRICE_RATIO - 1));
}

// Whether the plan pays its share of this product: false for self-pay, and
// for drugs that aren't on its formulary.
function planCovers(plan: InsurancePlan, productId: string): boolean {
    if (plan.reimbursementRate === null || plan.copayPercentage >= 100) return false;
    return !plan.formulary || plan.formulary.includes(productId);
}

window.finances = {
    dailyOverhead(location) {
        return Math.round(BASE_OVERHEAD * (LOCATION_OVERHEAD[location] ?? 1));
    },

    transact(entry) {
        const data = window.financesData;
        const amount = Number(entry.amount);
        if (!Number.isFinite(amount) || amount < 0) {
            console.error(`[finances.js] Invalid transaction amount: ${entry.amount}`);
            return false;
        }
        if (entry.type === 'expense' && entry.requireFunds && data.cash < amount) {
            console.warn(`[finances.js] Insufficient funds for ${entry.description}: $${amount.toFixed(2)}`);
            return false;
        }
        if (amount === 0) return true;

        if (FINANCING_CATEGORIES.has(entry.category)) {
            data.cash += entry.type === 'income' ? amount : -amount;
        } else if (entry.type === 'income') {
            data.cash += amount;
            data.dailyIncome += amount;
            addToPeriods(data.revenue, amount);
            data.revenueCategories[bucketFor(data.revenueCategories, entry.category)] += amount;
        } else {
            data.cash -= amount;
            addToPeriods(data.expenses, amount);
            data.expenseCategories[bucketFor(data.expenseCategories, entry.category)] += amount;
        }

        logTransaction({
            id: window.nextId('trans'),
            date: new Date(window.gameState.currentDate),
            type: entry.type,
            category: entry.category,
            amount,
            description: entry.description,
            customerId: entry.customerId,
            prescriptionId: entry.prescriptionId,
        });
        this.updateProfitMetrics();
        window.updateUI('finances');
        return true;
    },

    dailyWage,
    overtimeHours,
    overtimePay,
    OVERTIME_AFTER_HOURS,
    OVERTIME_RATE,

    // Apply daily costs (called at end of day). Wages and overhead are owed
    // whether or not there's cash for them, so they can take cash negative.
    // Runs before employees.endOfDay, which resets the hours worked today.
    applyDailyCosts() {
        console.log('[finances.js] Applying daily costs...');

        let totalWages = 0;
        window.employeesData.forEach((emp) => {
            const name = `${emp.firstName} ${emp.lastName}`;
            const dailyPay = dailyWage(emp);
            totalWages += dailyPay;
            this.transact({
                type: 'expense',
                category: 'wages',
                amount: dailyPay,
                description: `Wage for ${name} (${emp.role}), with payroll taxes and benefits`,
            });

            const overtime = overtimePay(emp);
            if (overtime > 0) {
                totalWages += overtime;
                this.transact({
                    type: 'expense',
                    category: 'wages',
                    amount: overtime,
                    description: `Overtime for ${name}: ${overtimeHours(emp).toFixed(1)}h at ${OVERTIME_RATE}x`,
                });
            }
        });

        const overheadCost = window.financesData.overhead;
        this.transact({
            type: 'expense',
            category: 'overhead',
            amount: overheadCost,
            description: 'Daily overhead costs',
        });

        // Interest on the bank loan, if there is one
        window.stakes?.chargeInterest();

        // Every other week, the insurers pay what they owe
        this.processInsuranceClaims();

        console.log(
            `[finances.js] Daily costs applied: Wages $${totalWages.toFixed(2)}, Overhead $${overheadCost.toFixed(2)}`,
        );
    },

    // Call this whenever an order is completed
    completePrescription(customerId, prescriptionId) {
        const customer = window.customers.activeCustomers.find((c) => c.id === customerId);
        const prescription = window.prescriptions.getPrescription(prescriptionId);

        if (!customer) {
            console.error(`[finances.js] Customer not found for ID: ${customerId}`);
            return;
        }

        if (!prescription) {
            console.error(`[finances.js] Prescription not found for ID: ${prescriptionId}`);
            return;
        }

        const product = window.productsData.find((p) => p.id === prescription.productId);
        if (!product) {
            console.error(`[finances.js] Product not found for ID: ${prescription.productId}`);
            return;
        }

        // The price fixed at check-in (quotePrice): the plan's, or the
        // pharmacy's for self-pay. A prescription from an older save that
        // was never quoted pays today's price.
        const plan = customer.insurance;
        const isCovered = planCovers(plan, product.id);
        const unitPrice = isCovered ? this.planPrice(plan, product.id) : product.price;
        const price = prescription.quotedPrice ?? unitPrice * prescription.dosage;
        const copayPercentage = isCovered ? plan.copayPercentage : 100;
        const copay = price * (copayPercentage / 100);

        const item = `${prescription.productName} ×${prescription.dosage}, ${customer.firstName} ${customer.lastName}`;
        this.transact({
            type: 'income',
            category: 'copays',
            amount: copay,
            description: isCovered
                ? `Copay: ${item}`
                : plan.reimbursementRate === null
                  ? `Self-pay: ${item}`
                  : `Full price (not on ${plan.planName}'s formulary): ${item}`,
            customerId: customerId,
            prescriptionId: prescription.id,
        });

        // The insurer owes the rest. It isn't income until the claim is paid
        // (insuranceClaims.processAllClaims); until then it only counts
        // toward the pending totals. Self-pay and off-formulary sales owe
        // nothing, so they file no claim.
        if (price - copay > 0) {
            window.insuranceClaims.addClaim(customerId, prescriptionId, price, copay);
        }

        // Update prescription status to completed
        window.prescriptions.updatePrescriptionStatus(prescriptionId, 'completed');

        window.financesData.completedOrders++;

        console.log(
            `[finances.js] Order completed for customer ${customerId}. Copay: $${copay.toFixed(2)}, Price: $${price.toFixed(2)}`,
        );

        return { copay, price };
    },

    marketPrice(productId) {
        return window.calculateProductCost(productId) * MARKET_MARKUP;
    },

    planCovers,

    // What a plan pays for one unit of a product it covers, copay included.
    planPrice(plan, productId) {
        return this.marketPrice(productId) * (plan.reimbursementRate ?? 1);
    },

    acceptanceChance,

    // At check-in the customer hears the price, which is then fixed on the
    // prescription (changing the price afterwards doesn't change what they
    // pay). A covered drug is at the plan's price, which they always accept.
    // Otherwise it's the pharmacy's price: it affects their mood, and they
    // may refuse it. Returns false if they refuse; customers.ts then sends
    // them home.
    quotePrice(customerId, prescriptionId) {
        const prescription = window.prescriptions.getPrescription(prescriptionId);
        const product = prescription && window.productsData.find((p) => p.id === prescription.productId);
        if (!prescription || !product) return true; // nothing to charge for; reconcileTasks deals with it

        const plan = window.customers.activeCustomers.find((c) => c.id === customerId)?.insurance;
        if (plan && planCovers(plan, product.id)) {
            prescription.quotedPrice = this.planPrice(plan, product.id) * prescription.dosage;
            return true;
        }

        const market = this.marketPrice(product.id);
        const ratio = market > 0 ? product.price / market : 1;
        if (Math.random() >= acceptanceChance(ratio)) {
            console.log(
                `[finances.js] Customer ${customerId} refused $${product.price.toFixed(2)} for ${product.name} (market $${market.toFixed(2)})`,
            );
            return false;
        }

        prescription.quotedPrice = product.price * prescription.dosage;
        const moodChange = Math.max(-MAX_PRICE_MOOD_LOSS, Math.min(1, PRICE_MOOD * (1 - ratio)));
        if (moodChange !== 0) window.customers.updateCustomerMood(customerId, moodChange);
        return true;
    },

    // At closing on payday (every other week), the insurers pay every claim
    // filed since the last one. The payments go through transact() inside
    // processAllClaims.
    processInsuranceClaims() {
        const claims = window.insuranceClaims;
        if (!claims.isPayday(window.gameState.dayIndex) || claims.pendingClaims.length === 0) return;
        const count = claims.pendingClaims.length;
        const paid = claims.processAllClaims();
        window.notifications?.add(
            `Insurers paid ${window.fmt.money(paid)} for ${count} claim${count === 1 ? '' : 's'}. ` +
                `The next payment is at closing on day ${claims.nextPayday(window.gameState.dayIndex + 1)}.`,
            'success',
        );
    },

    addIncome(amount, category = 'other', description = 'Other income') {
        this.transact({ type: 'income', amount, category, description });
    },

    // Refuses (returns false) if there isn't enough cash.
    addExpense(amount, category = 'other', description = 'Other expense') {
        return this.transact({ type: 'expense', amount, category, description, requireFunds: true });
    },

    // Rolls the period totals over when a new day starts: "today" every day,
    // "this week" on Sundays, "this month" on the 1st.
    startNewDay(previousDate, newDate) {
        this.resetDailyStats();
        if (newDate.getDay() === 0) this.startNewWeek();
        if (newDate.getMonth() !== previousDate.getMonth() || newDate.getFullYear() !== previousDate.getFullYear()) {
            this.startNewMonth();
        }
    },

    // Update a product's price (manually or by the user). Refuses (returns
    // false) a price that isn't a positive number.
    updateProductPrice(productId, newPrice) {
        const product = window.productsData.find((p) => p.id === productId);
        if (!product) {
            console.error(`[finances.js] Product not found: ${productId}`);
            return false;
        }
        if (!Number.isFinite(newPrice) || newPrice <= 0) {
            console.warn(`[finances.js] Refused price $${newPrice} for ${product.name}: prices must be above $0`);
            return false;
        }

        const oldPrice = product.price;
        product.price = newPrice;
        console.log(
            `[finances.js] Price for ${product.name} updated: $${oldPrice.toFixed(2)} -> $${newPrice.toFixed(2)}`,
        );

        // Optionally re-render finances or inventory UI
        window.updateUI('finances');
        window.updateUI('inventory');
        return true;
    },

    // Set all product prices to their suggested price
    setToSuggestedPrices() {
        let changeCount = 0;
        window.productsData.forEach((product) => {
            const cost = window.calculateProductCost(product.id);
            const suggestedPrice = cost * window.globalMarkup;

            if (product.price !== suggestedPrice) {
                product.price = suggestedPrice;
                changeCount++;
            }
        });

        console.log(
            `[finances.js] Set ${changeCount} product prices to suggested markup (${(window.globalMarkup * 100 - 100).toFixed(0)}%)`,
        );
        window.updateUI('inventory');
    },

    // Apply a markup to all product prices. Refuses (returns false) a
    // markup that isn't a number of 0% or more, so prices stay above $0.
    applyMarkupToAllProducts(markupPercentage) {
        if (!Number.isFinite(markupPercentage) || markupPercentage < 0) {
            console.warn(`[finances.js] Refused markup ${markupPercentage}%: it must be 0% or more`);
            return false;
        }
        const markupFactor = 1 + markupPercentage / 100;

        window.productsData.forEach((product) => {
            const cost = window.calculateProductCost(product.id);
            const newPrice = cost * markupFactor;
            product.price = newPrice;
        });

        // Update global markup for future reference
        window.globalMarkup = markupFactor;

        console.log(`[finances.js] Applied ${markupPercentage.toFixed(0)}% markup to all product prices.`);
        window.updateUI('inventory');
        return true;
    },

    // Calculate and update profit metrics
    updateProfitMetrics() {
        // Today's profit
        window.financesData.profit.today = window.financesData.revenue.today - window.financesData.expenses.today;

        // This week's profit
        window.financesData.profit.thisWeek =
            window.financesData.revenue.thisWeek - window.financesData.expenses.thisWeek;

        // This month's profit
        window.financesData.profit.thisMonth =
            window.financesData.revenue.thisMonth - window.financesData.expenses.thisMonth;

        // Total profit
        window.financesData.profit.total = window.financesData.revenue.total - window.financesData.expenses.total;
    },

    // Reset daily stats (called at start of day)
    resetDailyStats() {
        window.financesData.dailyIncome = 0;
        window.financesData.revenue.today = 0;
        window.financesData.expenses.today = 0;
        window.financesData.profit.today = 0;
    },

    // Start a new week (reset weekly stats)
    startNewWeek() {
        window.financesData.revenue.thisWeek = 0;
        window.financesData.expenses.thisWeek = 0;
        window.financesData.profit.thisWeek = 0;
    },

    // Start a new month (move this month to last month, reset this month)
    startNewMonth() {
        window.financesData.revenue.lastMonth = window.financesData.revenue.thisMonth;
        window.financesData.expenses.lastMonth = window.financesData.expenses.thisMonth;
        window.financesData.profit.lastMonth = window.financesData.profit.thisMonth;

        window.financesData.revenue.thisMonth = 0;
        window.financesData.expenses.thisMonth = 0;
        window.financesData.profit.thisMonth = 0;
    },

    isFinancing(category) {
        return FINANCING_CATEGORIES.has(category);
    },

    // Revenue and costs by transaction category between two game times (ms),
    // from the log. The loan's principal isn't in either.
    categoryTotals(from, to) {
        const revenue: Record<string, number> = {};
        const expenses: Record<string, number> = {};
        window.financesData.transactions.forEach((t) => {
            const time = t.date.getTime();
            if (time < from || time > to || FINANCING_CATEGORIES.has(t.category)) return;
            const bucket = t.type === 'income' ? revenue : expenses;
            bucket[t.category] = (bucket[t.category] ?? 0) + t.amount;
        });
        return { revenue, expenses };
    },

    // Get total sales for a specific date
    getDailySales(date) {
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

        return window.financesData.transactions
            .filter(
                (t) =>
                    t.type === 'income' && !this.isFinancing(t.category) && t.date >= startOfDay && t.date <= endOfDay,
            )
            .reduce((total, t) => total + t.amount, 0);
    },

    // Get total profit/loss for a specific date
    getDailyProfitLoss(date) {
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

        const income = window.financesData.transactions
            .filter(
                (t) =>
                    t.type === 'income' && !this.isFinancing(t.category) && t.date >= startOfDay && t.date <= endOfDay,
            )
            .reduce((total, t) => total + t.amount, 0);

        const expenses = window.financesData.transactions
            .filter(
                (t) =>
                    t.type === 'expense' && !this.isFinancing(t.category) && t.date >= startOfDay && t.date <= endOfDay,
            )
            .reduce((total, t) => total + t.amount, 0);

        return income - expenses;
    },

    // Get transactions filtered by criteria
    getFilteredTransactions(options = {}) {
        let filtered = [...window.financesData.transactions];

        // Filter by date range
        if (options.startDate) {
            filtered = filtered.filter((t) => t.date >= options.startDate!);
        }

        if (options.endDate) {
            filtered = filtered.filter((t) => t.date <= options.endDate!);
        }

        // Filter by type
        if (options.type) {
            filtered = filtered.filter((t) => t.type === options.type);
        }

        // Filter by category
        if (options.category) {
            filtered = filtered.filter((t) => t.category === options.category);
        }

        // Filter by minimum amount
        if (options.minAmount) {
            filtered = filtered.filter((t) => t.amount >= options.minAmount!);
        }

        // Filter by maximum amount
        if (options.maxAmount) {
            filtered = filtered.filter((t) => t.amount <= options.maxAmount!);
        }

        // Filter by search term (checks description)
        if (options.searchTerm) {
            const term = options.searchTerm.toLowerCase();
            filtered = filtered.filter(
                (t) =>
                    t.description.toLowerCase().includes(term) ||
                    (t.customerId && t.customerId.toLowerCase().includes(term)) ||
                    (t.prescriptionId && t.prescriptionId.toLowerCase().includes(term)),
            );
        }

        return filtered;
    },

    // Get financial summary object
    getFinancialSummary() {
        return {
            cash: window.financesData.cash,
            pendingInsurance: window.financesData.pendingInsuranceIncome,
            revenue: window.financesData.revenue,
            expenses: window.financesData.expenses,
            profit: window.financesData.profit,
            revenueCategories: window.financesData.revenueCategories,
            expenseCategories: window.financesData.expenseCategories,
            targetDailyRevenue: window.financesData.targetDailyRevenue,
            targetMonthlyRevenue: window.financesData.targetMonthlyRevenue,
            completedOrders: window.financesData.completedOrders,
        };
    },
};
