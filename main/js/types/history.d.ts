// History, stakes and goals (Phase 8): records.ts, stakes.ts, goals.ts,
// and reputation (brandReputation.ts).
//
// Ambient typings for the window globals: every file is a classic
// <script> (no modules), and each module adds its own fields to Window.

// One closed day (records.recordDay). Money is the day's, from the ledger;
// cash, loan, reputation and staff are as they stood at closing. `loan` is
// everything owed to the bank (from Phase 10 term loans too; before, only
// the line of credit).
interface DayRecord {
    day: number; // dayIndex
    date: number; // game time at closing (ms)
    revenue: number;
    costs: number;
    net: number;
    revenueByCategory: Record<string, number>;
    costsByCategory: Record<string, number>;
    cash: number;
    loan: number;
    reputation: number;
    customers: Partial<Record<DepartureReason, number>>;
    staff: number;
    // Each location's revenue, costs and net (Phase 10); the company's own
    // (loan interest) is the rest. Missing before save v10.
    byLocation?: ReportLocationLine[];
    // Game time (ms) the front closed and stayed closed, and the day ended
    // early with End day (Phase 9, #8). Missing on a full day.
    frontClosedAt?: number;
    closedEarlyAt?: number;
}

// One customer's visit, recorded when they left (records.recordVisit).
interface CustomerVisit {
    id: string;
    name: string;
    insurer: string;
    product: string | null;
    dosage: number;
    day: number; // dayIndex
    arrivedAt: number; // game time (ms)
    leftAt: number; // game time (ms)
    reason: DepartureReason;
    // What the sale was worth (their copay plus the insurer's share); 0 unless served
    price: number;
    mood: number;
    returning: boolean;
}

interface RecordsApi {
    days: DayRecord[];
    // Newest first, the last 500 (the active location's)
    visits: CustomerVisit[];
    // Customers counted in day records that have been dropped (pruneDays)
    pruned: Partial<Record<DepartureReason, number>>;
    // Drops day records over a year old whose month has a report
    pruneDays: () => number;
    recordVisit: (customer: Customer, reason: DepartureReason) => void;
    recordDay: () => DayRecord;
    // Everyone who has left for this reason, today included
    totalCustomers: (reason: DepartureReason) => number;
    // Customers who left unserved, from counts by reason (not 'reset')
    lost: (counts: Partial<Record<DepartureReason, number>>) => number;
    // What made a closed day short: the front closed, or End day
    notes: (record: DayRecord) => string[];
    // The last closed day before today
    yesterday: () => DayRecord | undefined;
    forDate: (date: Date) => DayRecord | undefined;
}

interface StakesApi {
    LOAN_STEP: number;
    LOAN_LIMIT: number;
    LOAN_DAILY_INTEREST: number;
    BANKRUPT_AFTER: number;
    // The line of credit
    loanBalance: () => number;
    // Term loans (the startup loan), and everything owed to the bank
    termLoanBalance: () => number;
    debt: () => number;
    takeTermLoan: (terms: LoanTerms, name: string) => TermLoan | null;
    // On the 1st (timeEvents.skipToNextDay)
    payTermLoans: () => void;
    payOffTermLoan: (id: string) => boolean;
    // How much more the bank will lend
    loanRoom: () => number;
    borrow: (amount: number) => boolean;
    repay: (amount: number) => boolean;
    dailyInterest: () => number;
    chargeInterest: () => void;
    // Wages, utilities, rent, interest and loan payments for one day
    fixedDailyCosts: () => number;
    daysInRed: () => number;
    // At closing; true if the pharmacy has just gone bankrupt
    closeDay: () => boolean;
    // The day number (from 1) of the closing that would be bankruptcy
    bankruptcyDay: () => number;
}

interface GoalDef {
    id: string;
    label: string;
    target: number;
    unit: 'days' | 'customers' | 'reputation' | 'level' | 'staff' | 'money' | 'months';
    value: () => number;
}

interface GoalProgress {
    id: string;
    label: string;
    target: number;
    unit: GoalDef['unit'];
    value: number;
    // dayIndex it was reached on, or null
    reachedOn: number | null;
}

interface GoalsApi {
    list: () => GoalProgress[];
    // At closing: the goals reached today, and whether that won the game
    check: () => { reached: GoalProgress[]; won: boolean };
    reachedToday: () => GoalProgress[];
}

interface BrandReputationApi {
    reputationScore: number;
    calcCustomers: (hour: number) => number;
    gainReputation: (amount: number) => void;
    loseReputation: (amount: number) => void;
}

interface Window {
    brandReputation: BrandReputationApi;
    records: RecordsApi;
    stakes: StakesApi;
    goals: GoalsApi;
}
