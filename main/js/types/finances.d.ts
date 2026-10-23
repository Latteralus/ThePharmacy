// Money: the ledger and period totals (data/finances.ts) and insurance
// claims (insuranceClaims.ts).
//
// Ambient typings for the window globals: every file is a classic
// <script> (no modules), and each module adds its own fields to Window.

interface InsuranceReimbursements {
    pending: number;
    received: number;
    rejected: number;
}

interface FinancialPeriodTotals {
    today: number;
    thisWeek: number;
    thisMonth: number;
    lastMonth: number;
    total: number;
}

interface ExpenseCategories {
    wages: number;
    // Monthly rent (Phase 10). Missing before save v10.
    rent: number;
    materials: number;
    overhead: number;
    equipment: number;
    research: number;
    // Bank loan interest (stakes.ts). Missing before save v6.
    interest: number;
    other: number;
}

interface RevenueCategories {
    copays: number;
    insurance: number;
    other: number;
}

interface TransactionInput {
    id?: string;
    date: Date;
    type: string;
    category: string;
    amount: number;
    description: string;
    customerId?: string;
    prescriptionId?: string;
    // The location it was for, or null for the company's own (loan
    // interest). Missing before save v10 (read as the first location).
    locationId?: string | null;
    // v1 saves only: insurance "income" logged at sale time, before any cash
    // arrived. The v1 migration drops these.
    pending?: boolean;
}

// One movement of money through finances.transact(). `amount` is positive;
// `type` gives the direction. `category` is the transaction's category and,
// when it names one, the expense/revenue bucket it counts toward (otherwise
// 'other').
interface LedgerEntry {
    type: 'income' | 'expense';
    amount: number;
    category: string;
    description: string;
    customerId?: string;
    prescriptionId?: string;
    // Which location it's for: the active one if left out, null for the
    // company's own (loan interest and principal, the line of credit)
    locationId?: string | null;
    // Expenses only: refuse (transact returns false) if cash < amount.
    // Leave unset for costs that are owed regardless, like wages.
    requireFunds?: boolean;
}

// transact() gives every logged transaction an id.
interface Transaction extends TransactionInput {
    id: string;
}

// Now the real, full shape (finances.js owns it).
interface FinancesData {
    cash: number;
    dailyIncome: number;
    pendingInsuranceIncome: number;
    pendingOrders: number;
    completedOrders: number;
    // Owed on the bank's line of credit (stakes.ts). Only stakes.borrow/repay
    // change it.
    loanBalance: number;
    // Term loans, like the startup loan (stakes.ts, Phase 10)
    loans: TermLoan[];
    transactions: Transaction[];
    revenue: FinancialPeriodTotals;
    expenses: FinancialPeriodTotals;
    profit: FinancialPeriodTotals;
    insuranceReimbursements: InsuranceReimbursements;
    expenseCategories: ExpenseCategories;
    revenueCategories: RevenueCategories;
    targetDailyRevenue: number;
    targetMonthlyRevenue: number;
}

interface TransactionFilterOptions {
    startDate?: Date;
    endDate?: Date;
    type?: string;
    category?: string;
    minAmount?: number;
    maxAmount?: number;
    searchTerm?: string;
}

interface FinancialSummary {
    cash: number;
    pendingInsurance: number;
    revenue: FinancialPeriodTotals;
    expenses: FinancialPeriodTotals;
    profit: FinancialPeriodTotals;
    revenueCategories: RevenueCategories;
    expenseCategories: ExpenseCategories;
    targetDailyRevenue: number;
    targetMonthlyRevenue: number;
    completedOrders: number;
}

interface FinancesApi {
    // The only way to change cash. Returns false if refused.
    transact: (entry: LedgerEntry) => boolean;
    // An employee's cost for a day: salary / 365, with payroll taxes and benefits
    dailyWage: (employee: Employee) => number;
    // Overtime hours today: past 8 today (daily), and past 40 straight
    // hours this week (weekly), with no hour counted twice
    overtimeSplit: (employee: Employee) => { daily: number; weekly: number };
    // Their sum, and what it costs at closing
    overtimeHours: (employee: Employee) => number;
    overtimePay: (employee: Employee) => number;
    OVERTIME_AFTER_HOURS: number;
    OVERTIME_WEEK_HOURS: number;
    OVERTIME_RATE: number;
    applyDailyCosts: () => void;
    completePrescription: (customerId: string, prescriptionId: string) => { copay: number; price: number } | undefined;
    processInsuranceClaims: () => void;
    addIncome: (amount: number, category?: string, description?: string) => void;
    addExpense: (amount: number, category?: string, description?: string) => boolean;
    startNewDay: (previousDate: Date, newDate: Date) => void;
    // Refuse (return false) a price that isn't above $0 / a negative markup.
    updateProductPrice: (productId: string, newPrice: number) => boolean;
    setToSuggestedPrices: () => void;
    applyMarkupToAllProducts: (markupPercentage: number) => boolean;
    // What customers judge a product's unit price against (materials at
    // the standard markup; the player's markup doesn't move it).
    marketPrice: (productId: string) => number;
    // Whether the plan pays its share of the product (false for self-pay
    // and drugs off its formulary)
    planCovers: (plan: InsurancePlan, productId: string) => boolean;
    // What the plan pays for one unit, copay included
    planPrice: (plan: InsurancePlan, productId: string) => number;
    // The chance a customer accepts a price of priceRatio x market price.
    acceptanceChance: (priceRatio: number) => number;
    // At check-in: fixes the price on the prescription. A covered drug is at
    // the plan's price; otherwise the customer accepts (true; the price
    // affects their mood) or refuses (false) the pharmacy's price.
    quotePrice: (customerId: string, prescriptionId: string) => boolean;
    updateProfitMetrics: () => void;
    resetDailyStats: () => void;
    startNewWeek: () => void;
    startNewMonth: () => void;
    // The bank loan's principal: moves cash, but isn't revenue or a cost.
    isFinancing: (category: string) => boolean;
    // Revenue and costs by category between two game times (ms), from the
    // transaction log, without the loan's principal.
    categoryTotals: (
        from: number,
        to: number,
        locationId?: string | null,
    ) => { revenue: Record<string, number>; expenses: Record<string, number> };
    getDailySales: (date: Date) => number;
    getDailyProfitLoss: (date: Date) => number;
    getFilteredTransactions: (options?: TransactionFilterOptions) => Transaction[];
    getFinancialSummary: () => FinancialSummary;
}

interface InsuranceClaim {
    id: string;
    customerId: string;
    prescriptionId: string;
    insurancePlan: string;
    totalAmount: number;
    copayAmount: number;
    amountDue: number;
    submittedDate: Date;
    // Saves from before biweekly payouts have it; it's no longer used
    processingTime?: number;
    processedDate: Date | null;
    paid: boolean;
    rejected: boolean;
    status: string;
}

interface ClaimStatsByInsurance {
    pending: number;
    processed: number;
    rejected: number;
    pendingAmount: number;
    processedAmount: number;
    rejectedAmount: number;
}

interface ClaimStats {
    totalPending: number;
    totalProcessed: number;
    totalRejected: number;
    pendingCount: number;
    processedCount: number;
    rejectedCount: number;
    claimsByInsurance: Record<string, ClaimStatsByInsurance>;
}

interface InsuranceClaimsApi {
    pendingClaims: InsuranceClaim[];
    processedClaims: InsuranceClaim[];
    rejectionRate: number;
    addClaim: (
        customerId: string,
        prescriptionId: string,
        totalAmount: number,
        copayAmount: number,
    ) => InsuranceClaim | false;
    // Days between payouts
    PAYOUT_EVERY_DAYS: number;
    // Whether this day's closing (gameState.dayIndex) is payday
    isPayday: (dayIndex: number) => boolean;
    // The day number (from 1) of the next payday closing not yet happened
    nextPayday: (fromDayIndex?: number) => number;
    // Pays (or rejects) every pending claim now; the amount paid
    processAllClaims: () => number;
    removeClaim: (prescriptionId: string) => boolean;
    syncPendingTotals: () => void;
    getClaimStats: () => ClaimStats;
    getClaimsForCustomer: (customerId: string) => { pending: InsuranceClaim[]; processed: InsuranceClaim[] };
    init: () => void;
}

interface Window {
    globalMarkup: number;
    insuranceClaims: InsuranceClaimsApi;
    financesData: FinancesData;
    finances: FinancesApi;
}
