// Ambient typings for the window-global surface shared between converted
// .ts files and the plain .js files not yet converted. Grows by one small
// interface per file as the migration proceeds — see docs/revision.md.

interface InsurancePlan {
    planName: string;
    copayType: 'percentage';
    copayPercentage: number;
    formulary: string[] | null;
}

interface BulkDiscount {
    minQuantity: number;
    discount: number;
}

interface Material {
    id: string;
    name: string;
    cost: number;
    inventory: number;
    autoOrderThreshold: number;
    autoOrderAmount: number;
    leadTime: number;
    supplier: string;
    bulkDiscounts: BulkDiscount[];
}

interface NamesData {
    firstNames: string[];
    lastNames: string[];
}

interface Ingredient {
    id: string;
    quantity: number;
}

interface Product {
    id: string;
    name: string;
    description: string;
    cost: number;
    suggestedPrice: number;
    price: number;
    dosageForm: string;
    ingredients: Ingredient[];
    equipmentNeeded: string[];
    productionTime: number;
    maxInventory: number;
    inventory: number;
}

interface ResearchLevel {
    level: number;
    unlockedProducts: string[];
    unlockedEquipment: string[];
    cost: number;
    researchTime: number;
    description: string;
}

// Tracks an in-progress research level-up so it can be paced over real
// in-game days instead of applying instantly. startDayIndex is
// GameState.dayIndex at the moment research began; the level unlocks once
// dayIndex - startDayIndex >= daysRequired.
interface ResearchInProgress {
    targetLevel: number;
    startDayIndex: number;
    daysRequired: number;
}

interface ResearchData {
    currentLevel: number;
    levels: ResearchLevel[];
    inProgress: ResearchInProgress | null;
}

interface ResearchApi {
    getUnlockedProducts: () => string[];
    getUnlockedEquipment: () => string[];
    // Whether research has made this item available to buy.
    isEquipmentUnlocked: (equipmentId: string) => boolean;
    researchNextLevel: () => void;
    checkResearchCompletion: (gameState: GameState) => void;
}

// Research decides which items can be bought (research.isEquipmentUnlocked).
interface EquipmentItem {
    id: string;
    name: string;
    cost: number;
    owned: number;
    // Condition, 0-100. Shared by every unit owned; 0 is broken.
    durability: number;
    // Compounds one unit can be used for at a time.
    capacity: number;
    autoPurchaseThreshold: number;
    autoPurchaseAmount: number;
}

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
    overhead: number;
    // Owed to the bank (stakes.ts). Only stakes.borrow/repay change it.
    loanBalance: number;
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

interface ChartDataset {
    label: string;
    data: number[];
    backgroundColor: string | string[];
    borderColor: string | string[];
    // A number, or per side ({ top: 2 })
    borderWidth: number | Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;
    // Any other Chart.js dataset option (borderRadius, maxBarThickness, ...)
    [option: string]: unknown;
}

interface ChartData {
    labels: string[];
    datasets: ChartDataset[];
}

// charts.ts: what a chart shows. Series take --series-1, --series-2 in order.
type ChartFormat = 'money' | 'number';

interface ChartSeries {
    label: string;
    values: number[];
}

interface ChartSpec {
    type: 'bar' | 'line';
    labels: string[];
    series: ChartSeries[];
    format?: ChartFormat;
    stacked?: boolean;
    // Lines: false lets the y axis start above 0 (bars always start at 0)
    beginAtZero?: boolean;
    suggestedMax?: number;
}

interface ChartsApi {
    draw: (existing: Chart | null, canvas: HTMLCanvasElement, spec: ChartSpec) => Chart | null;
    box: (height?: number) => { box: HTMLDivElement; canvas: HTMLCanvasElement };
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
    // The chance a customer accepts a price of priceRatio x market price.
    acceptanceChance: (priceRatio: number) => number;
    // At check-in: the customer accepts (true; the price is fixed on the
    // prescription and affects their mood) or refuses (false) the price.
    quotePrice: (customerId: string, prescriptionId: string) => boolean;
    updateProfitMetrics: () => void;
    resetDailyStats: () => void;
    startNewWeek: () => void;
    startNewMonth: () => void;
    // The bank loan's principal: moves cash, but isn't revenue or a cost.
    isFinancing: (category: string) => boolean;
    // Revenue and costs by category between two game times (ms), from the
    // transaction log, without the loan's principal.
    categoryTotals: (from: number, to: number) => { revenue: Record<string, number>; expenses: Record<string, number> };
    getDailySales: (date: Date) => number;
    getDailyProfitLoss: (date: Date) => number;
    getFilteredTransactions: (options?: TransactionFilterOptions) => Transaction[];
    getFinancialSummary: () => FinancialSummary;
}

interface RenderInfo {
    fps: number;
    frameCount: number;
    lastFpsUpdate: number;
}

// Now the real, full shape (main.js owns it). currentDate stays narrowed to
// Date, not string | Date: by the time any converted file reads it during
// normal gameplay, save/load's date revival (see docs/Changelog.md,
// 2026-08-15 "Save/load fixed") has already run, so it's always a real Date
// instance — `new Date(x)` still accepts a Date argument, so this doesn't
// break existing callers. simulationAccumulator/lastFrameTime/
// lastSimulationTime/renderInfo/dateCreated are genuinely optional: the unit
// tests build `window.gameState` with only the fields they need, and
// main.js's gameLoop treats a missing lastFrameTime as the first frame.
interface GameState {
    currentDate: Date;
    dayIndex: number;
    isDayActive: boolean;
    isPaused: boolean;
    pharmacyName: string;
    difficulty: string;
    location: string;
    simulationAccumulator?: number;
    lastFrameTime?: number;
    lastSimulationTime?: number;
    renderInfo?: RenderInfo;
    dateCreated?: Date;
    // dayIndex of the last day whose end-of-day costs were applied. Lets a
    // save made while the daily summary was open load without charging that
    // day's wages and overhead a second time.
    lastEndedDayIndex?: number;
    // The next number window.nextId hands out (ids.ts). Missing in a new
    // game and in saves from before the counter; both start at 1.
    nextId?: number;
    // Customers who left today, by reason (for the daily summary). Reset
    // when a new day starts; missing until the first departure.
    customersToday?: Partial<Record<DepartureReason, number>>;
    // Closings in a row with cash below $0 (stakes.ts); the third is bankruptcy.
    daysInRed?: number;
    // Game over. Never saved: saveGame refuses a bankrupt pharmacy.
    bankrupt?: boolean;
    // dayIndex each goal was reached on, by goal id (goals.ts)
    goalsReached?: Record<string, number>;
    // dayIndex every goal had been reached by (the win)
    wonOnDay?: number;
}

// Options passed from the new-game form, through gameAPI, to
// initializeNewGame. Every field is read with an `||` fallback, so all
// optional.
interface NewGameOptions {
    pharmacyName?: string;
    difficulty?: string;
    location?: string;
    startingCapital?: string;
}

// saveFile.ts - the save file format. A save holds only player state;
// static definitions come from the data files and saved state is merged
// onto them on load.
type SavedItemState<T, K extends keyof T> = { id: string } & Partial<Pick<T, K>>;

interface SaveSettings {
    gameSpeed: number;
    customerFrequencyMultiplier: number;
    operatingCostMultiplier: number;
    // Overhead before the operating-cost multiplier. null until the player
    // first changes the multiplier.
    baseOverhead: number | null;
    globalMarkup: number;
}

// Date fields are Dates when written and ISO strings when read back;
// saveFile.ts revives them.
interface SaveFile {
    version: number;
    timestamp: number;
    gameState: GameState;
    financesData: FinancesData;
    employeesData: Employee[];
    brandReputation: { reputationScore: number };
    products: SavedItemState<Product, 'price' | 'inventory' | 'maxInventory'>[];
    materials: SavedItemState<Material, 'inventory' | 'autoOrderThreshold' | 'autoOrderAmount'>[];
    equipment: SavedItemState<EquipmentItem, 'owned' | 'durability' | 'autoPurchaseThreshold' | 'autoPurchaseAmount'>[];
    // refund: set by the v4 -> v5 migration for research toward a level
    // that no longer exists; apply() pays it back.
    research: { currentLevel: number; inProgress: ResearchInProgress | null; refund?: number };
    tasks: Task[];
    customers: Customer[];
    activePrescriptions: Prescription[];
    refillRegistry: RefillRecord[];
    insuranceClaims: { pending: InsuranceClaim[]; processed: InsuranceClaim[] };
    // History (records.ts), from save v6
    records: { days: DayRecord[]; visits: CustomerVisit[] };
    settings: SaveSettings;
}

// Saves written before the format was versioned: whole live objects.
interface SaveFileV1 {
    timestamp?: number;
    gameState?: GameState;
    financesData?: FinancesData;
    employeesData?: Employee[];
    productsData?: Product[];
    materialsData?: Material[];
    equipmentData?: EquipmentItem[];
    brandReputation?: { reputationScore?: number };
    researchData?: Partial<ResearchData>;
    activePrescriptions?: Prescription[];
    refillRegistry?: RefillRecord[];
}

interface SaveFileApi {
    version: number;
    serialize: () => SaveFile;
    // Upgrades any older save to the current version. Throws on something
    // that isn't a save, or one from a newer game.
    migrate: (raw: unknown) => SaveFile;
    // Restores a save (any version) into the live globals.
    apply: (raw: unknown) => void;
}

interface HelpersApi {
    calculatePotentialProduction: (productId: string) => number;
    calculateMaterialsNeeded: (productId: string, quantity: number) => Record<string, number>;
    calculateOrderCost: (materialsNeeded: Record<string, number>) => number;
    calculateStartingWage: (role: string, skillLevel: string) => number;
    // The skill (0-100) a role is hired for.
    keySkill: (employee: Employee) => number;
    // What the market pays for this role at this key skill, a year.
    fairSalary: (employee: Employee) => number;
    generateNewEmployeeId: () => string;
    generateFirstName: () => string;
    generateLastName: () => string;
}

interface EmployeeSkills {
    compounding: number;
    dispensing: number;
    customerService: number;
    inventoryManagement: number;
    sales: number;
}

interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    salary: number;
    skills: EmployeeSkills;
    morale: number;
    // Game minutes spent on tasks since the day opened. employees.endOfDay
    // turns it into rest or overwork, then resets it. Missing in saves from
    // before Phase 7 (read as 0).
    minutesWorkedToday?: number;
    // The three static starting employees use an ISO date string; employees
    // hired at runtime (hireEmployee's candidates) get a real Date instead.
    hireDate: string | Date;
    currentTaskId: string | null;
}

// One employee's day, from employees.endOfDay (shown in the daily summary).
interface StaffDayReport {
    id: string;
    name: string;
    role: string;
    hoursWorked: number;
    moraleBefore: number;
    moraleAfter: number;
    // What moved their morale, in player words ("overworked (11.5h)")
    reasons: string[];
    quit: boolean;
}

interface EmployeesApi {
    // The last closing time's report (empty until the first one).
    lastDayReport: StaffDayReport[];
    getEmployeeById: (employeeId: string) => Employee | undefined;
    getEmployeeFullName: (employee: Employee) => string;
    // The skill (0-100) a task uses.
    taskSkill: (employee: Employee, task: Task) => number;
    // Game minutes of work done per game minute on this task (1 = normal).
    workRate: (employee: Employee, task: Task) => number;
    updateEmployeeMorale: (employeeId: string, moraleChange: number) => void;
    // Salary against helpers.fairSalary: 0.1 is 10% over the market rate.
    payVsMarket: (employee: Employee) => number;
    // Closing time: morale from today's hours and pay; very unhappy staff may quit.
    endOfDay: () => StaffDayReport[];
    // False for a salary that isn't above $0.
    setSalary: (employeeId: string, salary: number) => boolean;
    hireEmployee: (role: string, skillLevel: string) => void;
    hireSelectedEmployee: (employeeData: Employee) => void;
    fireEmployee: (employeeId: string) => void;
    // Fired or quit. False if there's no such employee.
    removeEmployee: (employeeId: string) => boolean;
}

// ---------------------------------------------------------------
// History, stakes and goals (Phase 8)
// ---------------------------------------------------------------

// One closed day (records.recordDay). Money is the day's, from the ledger;
// cash, loan, reputation and staff are as they stood at closing.
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
    // Newest first, the last 500
    visits: CustomerVisit[];
    recordVisit: (customer: Customer, reason: DepartureReason) => void;
    recordDay: () => DayRecord;
    // Everyone who has left for this reason, today included
    totalCustomers: (reason: DepartureReason) => number;
    // Customers who left unserved, from counts by reason (not 'reset')
    lost: (counts: Partial<Record<DepartureReason, number>>) => number;
    // The last closed day before today
    yesterday: () => DayRecord | undefined;
    forDate: (date: Date) => DayRecord | undefined;
}

interface StakesApi {
    LOAN_STEP: number;
    LOAN_LIMIT: number;
    LOAN_DAILY_INTEREST: number;
    BANKRUPT_AFTER: number;
    loanBalance: () => number;
    // How much more the bank will lend
    loanRoom: () => number;
    borrow: (amount: number) => boolean;
    repay: (amount: number) => boolean;
    dailyInterest: () => number;
    chargeInterest: () => void;
    // Wages, overhead and loan interest for one day
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
    unit: 'days' | 'customers' | 'reputation' | 'level' | 'staff' | 'money';
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

// Partial — preload.js (not yet converted) owns the real, larger shape.
// loadGame returns whatever JSON is on disk (any save version) or null.
// The main menu's Settings page (settings.html), stored by the main
// process in settings.json. game-integration.js fills in defaults.
interface GameSettings {
    // Speed a new game starts at (a loaded game keeps its own)
    simulationSpeed: number;
    autoSaveEnabled: boolean;
    // Minutes of play at 1x between autosaves
    autoSaveInterval: number;
    // Applied by the main process (zoom factor and fullscreen)
    uiScale: number;
    fullscreenEnabled: boolean;
}

interface GameApi {
    // Running unpackaged: developer tools (the debug overlay) are available.
    isDev?: boolean;
    getSettings?: () => Promise<Partial<GameSettings> | null>;
    getNewGameOptions?: () => Promise<unknown>;
    loadGame?: () => Promise<unknown>;
    saveGame?: (gameData: SaveFile) => Promise<{ success: boolean } | undefined>;
}

// Partial — preload.js (not yet converted) owns the real, larger shape.
interface UpdateInfo {
    version: string;
}

interface ElectronApi {
    onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
    onUpdateDownloaded: (callback: () => void) => void;
    quitAndInstall: () => void;
}

interface AutoSaveApi {
    // Interval in game minutes (default 300, i.e. 5 real minutes at 1x).
    start: (intervalGameMinutes?: number) => void;
    stop: () => void;
}

interface CustomerTypeDef {
    patience: number;
    baseBoost: number;
}

// A customer's visit, in order. customers.advance moves between them; see
// CUSTOMER_TRANSITIONS in customers.ts. The prescription's fill runs
// alongside check-in and consultation, so "filled" can arrive in any of the
// first three states, but only waitingForFill moves on because of it.
type CustomerStatus =
    'waitingForCheckIn' | 'waitingForConsultation' | 'waitingForFill' | 'readyForCheckout' | 'completed';

// What finishing a customer's task means for them.
type CustomerEvent = 'checkedIn' | 'consulted' | 'filled' | 'paid';

// Why a customer left, which decides the reputation change.
//   served: paid and left (mood-based)
//   impatient: ran out of patience
//   closing: still in the store at 22:00
//   price: refused the price at check-in
//   unavailable: turned away at the door; the pharmacy couldn't supply
//     their prescription (no stock, and no working equipment to make it)
//   reset: had no prescription after a load (reconcileTasks; no change)
type DepartureReason = 'served' | 'impatient' | 'closing' | 'price' | 'unavailable' | 'reset';

interface Customer {
    id: string;
    type: string;
    status: CustomerStatus;
    arrivedAt: number;
    insurance: InsurancePlan;
    prescriptionId: string | null;
    // In game minutes. Drained by customers.updatePatience once per game minute.
    patience: number;
    firstName: string;
    lastName: string;
    mood: number;
    // Game time (ms), from clock.now().
    lastStateChange: number;
    // True when this customer was generated from an eligible RefillRecord
    // rather than as a brand-new walk-in.
    isReturning?: boolean;
}

interface CustomersApi {
    activeCustomers: Customer[];
    customerTypes: Record<string, CustomerTypeDef>;
    // hour is accepted but never actually read by the implementation
    // (customers.ts) — timeEvents.ts's spawnCustomersForHour calls this with
    // no argument at all, which has always worked for that reason. Optional
    // here to match, not a behavior change.
    // null when no prescription could be written (the customer doesn't
    // come in), or when it can't be supplied (they're turned away, which
    // counts as an 'unavailable' departure).
    generateCustomer: (hour?: number) => Customer | null;
    // Applies an event if the customer's current status allows it (logs and
    // returns false otherwise). The only thing that changes Customer.status.
    advance: (customerId: string, event: CustomerEvent) => boolean;
    updateCustomerMood: (customerId: string, moodChange: number) => void;
    extendPatience: (customerId: string, minutesToAdd: number) => void;
    adjustPatienceDecayRate: (customer: Customer) => number;
    customerLeaves: (customerId: string, reason: DepartureReason) => void;
    updatePatience: () => void;
    sendRemainingCustomersHome: () => void;
    updateReputationOnDeparture: (customer: Customer, reason: DepartureReason) => void;
    getRandomCustomerType: () => string;
    getRandomInsurance: () => InsurancePlan;
    getInsuranceByPlanName: (planName: string) => InsurancePlan;
    getCustomerById: (customerId: string) => Customer | undefined;
    // Creates any task a customer's status or prescription needs but lacks
    // (after a load, or a bug). Returns how many it repaired.
    reconcileTasks: () => number;
}

// Now the real, full shape (taskManager.ts owns it). The index signature is
// kept even though every field a converted creator (customers.ts,
// prescriptions.ts, production.ts) attaches is now named — cheap insurance
// against the still-plain-JS page files reading/writing ad hoc fields later.
// A task's lifecycle; see TASK_TRANSITIONS in taskManager.ts.
//   pending-dependent: waiting on another task (a fill on its compound)
//   pending: ready for an employee
//   inProgress: an employee is working on it
//   completed: done; finalizeTask removes it straight away
// A cancelled task is removed (taskManager.cancelTask), with no status.
type TaskStatus = 'pending-dependent' | 'pending' | 'inProgress' | 'completed';

interface Task {
    id: string;
    type: string;
    status: TaskStatus;
    progress: number;
    totalTime: number;
    customerId?: string;
    prescriptionId?: string;
    productId?: string;
    productName?: string;
    assignedTo?: string | null;
    roleNeeded?: string;
    quantityToMake?: number;
    quantityNeeded?: number;
    dependencyTaskId?: string;
    fillTaskDependency?: boolean;
    // customerInteraction tasks only: which end of the visit this is.
    interaction?: 'checkIn' | 'checkout';
    // fillPrescription tasks only: true once the task holds its product
    // (taken from inventory, returned if the task is cancelled).
    stockTaken?: boolean;
    // compound tasks only: true once the task holds the whole batch's
    // materials (taken when it starts, returned if it is cancelled).
    materialsTaken?: boolean;
    // Game time (ms), from clock.now().
    createdAt?: number;
    lastUpdateTime?: number;
    lastProgressTime?: number;
    assignedAt?: number;
    [key: string]: unknown;
}

// Now the real, full shape (taskManager.ts owns it).
interface TaskManagerApi {
    tasks: Task[];
    addTask: (task: Task) => Task;
    getTaskById: (taskId: string) => Task | undefined;
    getUnassignedTasks: () => Task[];
    getTasksForEmployee: (employeeId: string) => Task[];
    getTasksForCustomer: (customerId: string) => Task[];
    updateTasks: (minutes: number) => void;
    // Game minutes of work per game minute: the worker's speed and, for a
    // compound, the equipment's condition. 1 when nobody is on it.
    workRate: (task: Task) => number;
    // Game minutes until it's done at that speed.
    minutesLeft: (task: Task) => number;
    // The only thing that changes Task.status. Refuses (logs, returns
    // false) a move TASK_TRANSITIONS doesn't allow.
    setStatus: (task: Task, to: TaskStatus) => boolean;
    // Removes a task that won't be finished: frees its employee, returns a
    // fill's stock or a compound's materials, and cancels anything waiting on it.
    cancelTask: (taskId: string) => void;
    debugTaskStatus: () => void;
    addEventListener: (event: string, callback: (data: unknown) => void) => void;
    removeEventListener: (event: string, callback: (data: unknown) => void) => void;
    EVENTS: {
        TASK_ADDED: string;
        TASK_COMPLETED: string;
        TASK_PROGRESS_UPDATED: string;
        TASK_STATUS_CHANGED: string;
    };
}

// Now the real, full shape (taskAssignment.ts owns it).
interface TaskAssignmentApi {
    assignTaskToEmployee: (taskId: string, employeeId: string) => boolean;
    unassignTask: (taskId: string) => void;
    autoAssignTasks: () => void;
    // Asks for an autoAssignTasks run at the end of the current simulation
    // step (main.ts calls assignIfRequested), so a burst of task changes
    // is assigned once, in game time.
    requestAutoAssign: () => void;
    assignIfRequested: () => void;
    normalizeEmployeeRoles: () => void;
    logTaskAssignmentState: () => void;
    forceTaskReassignment: () => void;
}

// pending until its fill task finishes, filled until the customer pays.
type PrescriptionStatus = 'pending' | 'filled' | 'completed';

interface Prescription {
    id: string;
    customerId: string;
    productId: string;
    productName: string;
    dosage: number;
    dosageForm: string;
    frequency: string;
    status: PrescriptionStatus;
    doctorName: string;
    refillsAllowed: number;
    assignedEmployeeId: string | null;
    createdAt: number;
    // True when this prescription was generated from a RefillRecord rather
    // than freshly picked at random (see PrescriptionsApi.generateRefillPrescription).
    isRefill?: boolean;
    // What the customer agreed to pay (all units) at check-in (finances.quotePrice).
    quotedPrice?: number;
}

// A pending refill opportunity, registered when a prescription with
// refillsAllowed > 0 is filled. Lets a customer "return" later for another
// fill of the same product without the game tracking full customer
// identity/history beyond what's snapshotted here.
interface RefillRecord {
    id: string;
    customerFirstName: string;
    customerLastName: string;
    insurancePlanName: string;
    productId: string;
    productName: string;
    dosage: number;
    dosageForm: string;
    frequency: string;
    doctorName: string;
    refillsAvailable: number;
    eligibleAfterTime: number;
    sourcePrescriptionId: string;
}

interface PrescriptionsApi {
    activePrescriptions: Prescription[];
    refillRegistry: RefillRecord[];
    // Write a prescription (no tasks yet: customers.generateCustomer checks
    // canSupply, then calls ensureFill). null if none could be written.
    generatePrescription: (customerId: string) => string | null;
    generateRefillPrescription: (customerId: string, record: RefillRecord) => string | null;
    // Stock covers the dosage, or the equipment to make it is owned and working.
    canSupply: (prescription: Prescription) => boolean;
    // Makes sure a pending prescription has a fill task that either holds
    // its stock or waits on a compound task. Returns true if it had to
    // create or repair anything.
    ensureFill: (prescription: Prescription) => boolean;
    // Gives a fill task its stock if there's enough, otherwise puts it
    // behind a compound task that makes it.
    supplyFill: (fill: Task) => void;
    updatePrescriptionStatus: (prescriptionId: string, newStatus: PrescriptionStatus) => void;
    prescriptionFilled: (prescriptionId: string, customerId: string) => void;
    createConsultationTask: (customerId: string) => void;
    getPrescription: (prescriptionId: string) => Prescription | undefined;
    getRandomFrequency: () => string;
    removePrescriptionsByCustomer: (customerId: string) => void;
    getEligibleRefillRecord: (currentTime: number) => RefillRecord | undefined;
    consumeRefillRecord: (recordId: string) => RefillRecord | undefined;
    // New stock of productId: waiting fills whose compound hasn't started take it.
    useStockForWaitingFills: (productId: string) => void;
}

// production.js's public API. canCompound/createCompoundTask/
// handleTaskCompletion are read by prescriptions.ts and taskManager.js
// (still plain JS) respectively.
interface ProductionApi {
    // Whether the materials on hand cover `quantity` units (default 1).
    canCompound: (product: Product, quantity?: number) => boolean;
    // Minutes to make `quantity` units of a product.
    compoundTime: (product: Product, quantity: number) => number;
    // Every item in the product's equipmentNeeded is owned and not broken.
    canMake: (product: Product) => boolean;
    // The needed items that aren't owned or are broken.
    missingEquipment: (product: Product) => EquipmentItem[];
    // "needs Capsule Filler", "Tablet Press is broken", or '' if none.
    missingEquipmentText: (product: Product) => string;
    // Compounds in progress using this item (at most owned x capacity).
    inUse: (item: EquipmentItem) => number;
    // Compounding speed from the condition of the most worn item needed.
    conditionFactor: (productId: string) => number;
    // What a full repair of this item costs now.
    repairCost: (item: EquipmentItem) => number;
    // Pays for and does a full repair. False if refused (cash, or nothing to repair).
    repairEquipment: (equipmentId: string) => boolean;
    // Adds bought units; new units are in perfect condition.
    addEquipment: (item: EquipmentItem, quantity: number) => void;
    // Compound tasks: whether it could start now (its equipment owned,
    // working and free, and it holds its materials or they're on hand).
    canStartCompound: (compound: Task) => boolean;
    // Compound tasks: takes the batch's materials out of inventory (true),
    // shrinking a restock to what the materials cover, or returns false if
    // it can't start. True if it already holds them.
    takeMaterials: (compound: Task) => boolean;
    // Compound tasks: puts held materials back (the compound was cancelled).
    returnMaterials: (compound: Task) => void;
    createCompoundTask: (product: Product, quantity: number) => Task;
    checkAndCreateCompoundTasks: () => void;
    // Fill tasks: takes the task's quantity out of inventory (true), or
    // returns false if there isn't enough. True if it already holds it.
    takeStock: (fill: Task) => boolean;
    // Fill tasks: puts held stock back (the fill was cancelled).
    returnStock: (fill: Task) => void;
    handleTaskCompletion: (task: Task) => void;
    init: () => void;
}

// Named NotificationItem, not Notification — that name is already lib.dom's
// browser Notification API and would silently declaration-merge with it.
interface NotificationItem {
    id: number;
    message: string;
    type: string;
    timestamp: Date;
    read: boolean;
}

interface NotificationsApi {
    items: NotificationItem[];
    unreadCount: number;
    add: (message: string, type?: string) => number;
    markAsRead: (id: number) => void;
    markAllAsRead: () => void;
    updateUI: () => void;
}

interface TaskbarsApi {
    createProgressBar: (task: Task) => HTMLDivElement;
}

// ---------------------------------------------------------------
// The UI kit (main/components/kit.ts, findings section 9.1)
// ---------------------------------------------------------------

// Colour roles for pills, meters and stat-tile subtitles. Status tones are
// for state and always sit next to a label or number.
type Tone = 'neutral' | 'info' | 'brand' | 'good' | 'warn' | 'critical';

// Task kinds, each with a fixed identity colour (--task-*).
type TaskKind = 'compound' | 'fill' | 'desk' | 'consult';

interface Formatters {
    money: (amount: number) => string; // $1,234.56
    moneyWhole: (amount: number) => string; // $1,235
    int: (n: number) => string; // 1,234
    pct: (fraction: number, digits?: number) => string; // 0.25 -> 25%
    signedPct: (fraction: number, digits?: number) => string; // +12% / −5%
    clock: (date: Date) => string; // 09:26
    day: (date: Date) => string; // Mon, Jan 2
    duration: (gameMinutes: number) => string; // 12m / 1h 05m
}

interface PlayerWords {
    customerStage: (status: CustomerStatus) => { label: string; tone: Tone };
    taskKind: (task: Task) => TaskKind;
    taskLabel: (task: Task) => string;
    taskStatus: (status: TaskStatus) => string;
    prescriptionStatus: (status: PrescriptionStatus) => string;
    departure: (reason: DepartureReason) => { label: string; tone: Tone };
    mood: (mood: number) => { label: string; tone: Tone };
}

type TableCell = Node | string | number | null | undefined;

interface TableColumn {
    label: string;
    num?: boolean;
    width?: string;
    title?: string;
    className?: string;
}

interface DataTable {
    root: HTMLDivElement;
    table: HTMLTableElement;
    tbody: HTMLTableSectionElement;
    row: (cells: TableCell[], className?: string) => HTMLTableRowElement;
    group: (label: string) => HTMLTableRowElement;
    empty: (text: string) => void;
    // A muted full-width row (a summary line inside the table).
    note: (text: string) => HTMLTableRowElement;
    clear: () => void;
}

interface Card {
    root: HTMLElement;
    body: HTMLDivElement;
    setCount: (count: number | string | null) => void;
}

interface StatTile {
    root: HTMLDivElement;
    set: (value: string, sub?: string, subTone?: Tone) => void;
}

interface MeterCell {
    root: HTMLDivElement;
    set: (fraction: number, text: string, tone?: Tone) => void;
}

interface Segmented<T> {
    root: HTMLDivElement;
    set: (value: T) => void;
}

interface Modal {
    root: HTMLDivElement;
    close: () => void;
}

interface Kit {
    el: <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => HTMLElementTagNameMap[K];
    // A page root with its header, appended to container.
    page: (container: HTMLElement, title: string, subtitle?: string, actions?: Node[]) => HTMLDivElement;
    card: (title?: string, options?: { actions?: Node[]; flush?: boolean }) => Card;
    statTile: (label: string) => StatTile;
    meter: (fraction: number, tone?: Tone) => HTMLDivElement;
    setMeter: (meter: HTMLElement, fraction: number, tone?: Tone) => void;
    meterCell: (fraction: number, text: string, tone?: Tone) => MeterCell;
    pill: (text: string, tone?: Tone) => HTMLSpanElement;
    button: (
        label: string,
        variant?: 'primary' | 'secondary' | 'danger' | 'ghost',
        onClick?: (event: MouseEvent) => void,
        options?: { small?: boolean; title?: string },
    ) => HTMLButtonElement;
    numberInput: (
        value: number | string,
        options?: {
            min?: number;
            max?: number;
            step?: number | string;
            width?: string;
            small?: boolean;
            label?: string;
        },
    ) => HTMLInputElement;
    select: <T extends string | number>(
        options: Array<{ value: T; label: string }>,
        current: T,
        onChange?: (value: string) => void,
    ) => HTMLSelectElement;
    segmented: <T>(
        options: Array<{ value: T; label: string; title?: string }>,
        current: T,
        onChange: (value: T) => void,
    ) => Segmented<T>;
    tabs: (
        labels: string[],
        onChange: (index: number) => void,
    ) => { root: HTMLDivElement; select: (index: number) => void };
    table: (columns: TableColumn[]) => DataTable;
    swatch: (kind: TaskKind) => HTMLSpanElement;
    // Bold primary text with an optional muted line under it, for table cells.
    primaryCell: (primary: string, sub?: string) => HTMLSpanElement;
    modal: (options: {
        title: string;
        subtitle?: string;
        body: Node[];
        actions: Node[];
        className?: string;
        onEscape?: () => void;
    }) => Modal;
}

type ToastTone = 'info' | 'success' | 'warn' | 'error';

// What a system announces with window.updateUI(topic) when it changes
// state a page shows. 'inventory' covers product stock and prices and
// material stock.
type ChangeTopic =
    | 'time'
    | 'finances'
    | 'customers'
    | 'prescriptions'
    | 'tasks'
    | 'employees'
    | 'inventory'
    | 'equipment'
    | 'research';

// Handed to each page renderer by showPage, for as long as the page is shown.
interface PageScope {
    // Calls fn (once per frame at most) whenever `topic` is announced.
    on: (topic: ChangeTopic, fn: () => void) => void;
    // Calls fn when the player navigates away.
    onLeave: (fn: () => void) => void;
}

type PageRenderer = (container: HTMLElement, page: PageScope) => void;

interface UiApi {
    formatDate: (dateObj: Date) => string;
    formatTime: (dateObj: Date) => string;
    formatDateTime: (dateObj: Date) => string;
    updateTime: () => void;
    updateUI: (topic: ChangeTopic) => void;
    // Returns an unsubscribe function. Pages use PageScope.on instead.
    subscribe: (topic: ChangeTopic, fn: () => void) => () => void;
    // Handles queued announcements now instead of on the next frame (tests).
    flush: () => void;
    showPage: (pageName: string) => void;
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
    processingTime: number;
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
    calculateProcessingTime: (insuranceName: string) => number;
    processAllClaims: () => number;
    removeClaim: (prescriptionId: string) => boolean;
    syncPendingTotals: () => void;
    getClaimStats: () => ClaimStats;
    getClaimsForCustomer: (customerId: string) => { pending: InsuranceClaim[]; processed: InsuranceClaim[] };
    init: () => void;
}

interface TimeEventsConfig {
    OPENING_HOUR: number;
    CLOSING_HOUR: number;
}

// clock.ts - the game clock and scheduler. Delays are in game minutes; jobs
// only run while the simulation is advancing (day active, not paused).
interface ClockApi {
    now: () => number;
    every: (gameMinutes: number, fn: () => void) => number;
    after: (gameMinutes: number, fn: () => void) => number;
    cancel: (id: number) => void;
    tick: () => void;
}

// Now the real, full shape (timeEvents.ts owns it). Window.timeEvents stays
// optional below — every call site across the codebase guards with
// `window.timeEvents && ...` first, predating this file's own conversion.
interface TimeEventsApi {
    startOfDay: (gameState: GameState) => void;
    endOfDay: (gameState: GameState) => void;
    skipToNextDay: (gameState: GameState) => void;
    minuteCheck: (gameState: GameState) => void;
    hourlyCheck: (gameState: GameState, hour: number) => void;
    spawnCustomersForHour: (hour: number) => void;
    // Cancels this hour's arrivals that haven't happened yet (used on load).
    cancelPendingArrivals: () => void;
    autoOrderCheck: () => void;
    autoPurchaseEquipmentCheck: () => void;
    CONFIG: TimeEventsConfig;
    addEventListener: (event: string, callback: (data: unknown) => void) => void;
    removeEventListener: (event: string, callback: (data: unknown) => void) => void;
    EVENTS: {
        START_OF_DAY: string;
        END_OF_DAY: string;
        HOURLY_CHECK: string;
        AUTO_ORDERS_PLACED: string;
        AUTO_EQUIPMENT_PURCHASED: string;
    };
}

// chart.js is loaded via a plain <script> tag (main.html), not imported, so
// TS has no ambient knowledge of it. Minimal shape covering only what
// financesPage.ts actually calls (`new Chart(ctx, {type, data, options})`).
declare class Chart {
    constructor(
        ctx: CanvasRenderingContext2D,
        config: { type: string; data: ChartData; options?: Record<string, unknown> },
    );
    data: ChartData;
    // 'none' redraws without animating
    update(mode?: string): void;
    destroy(): void;
}

interface BootstrapApi {
    retry: () => void;
    checkComponents: () => boolean;
    buildUI: () => void;
}

interface Window {
    insuranceData: InsurancePlan[];
    brandReputation: BrandReputationApi;
    showDailySummaryModal: (onNextDay?: () => void) => void;
    // Game over (bankruptcy), and the win (every goal reached)
    showGameOverModal: () => void;
    showVictoryModal: (onContinue?: () => void) => void;
    // Closes the daily summary, game-over or win dialog without acting on it (a load)
    closeSessionModals: () => void;
    records: RecordsApi;
    stakes: StakesApi;
    goals: GoalsApi;
    showConfirmModal: (
        message: string,
        confirmLabel: string,
        onConfirm: () => void,
        options?: { title?: string; danger?: boolean },
    ) => void;
    gameAPI?: GameApi;
    electronAPI?: ElectronApi;
    employeesData: Employee[];
    employees: EmployeesApi;
    globalMarkup: number;
    // Required even though their owning file (main.js/game-bootstrap.js)
    // hasn't converted yet: sideBar.ts/topBar.ts/customers.ts call these
    // unconditionally (no typeof guard), so they must always be defined by
    // the time those files run — which script load order already guarantees
    // at runtime. debug.ts's `typeof window.x !== 'undefined'` checks still
    // compile fine against a required type.
    showPage: (pageName: string) => void;
    currentPage: string;
    // Both owned by electron-integration.ts. `silent` skips the success
    // notification (autosave).
    saveGame?: (options?: { silent?: boolean }) => Promise<boolean>;
    loadGame?: () => Promise<boolean>;
    autoSave?: AutoSaveApi;
    notifications?: NotificationsApi;
    // Owned by employeesPage.js, not converted yet, but called unconditionally
    // by employees.ts's hireEmployee (no typeof guard in the original either)
    // — required for the same reason as showPage/ui/taskManager above.
    displayEmployeeCandidates: (candidates: Employee[]) => void;
    // Page renderers. showPage looks them up by name (`render${Page}Page`)
    // and passes each a PageScope for the time it's on screen.
    renderOperationsPage?: PageRenderer;
    renderInventoryPage?: PageRenderer;
    renderEquipmentPage?: PageRenderer;
    renderResearchPage?: PageRenderer;
    renderMarketplacePage?: PageRenderer;
    renderEmployeesPage?: PageRenderer;
    renderFinancesPage?: PageRenderer;
    renderSettingsPage?: PageRenderer;
    renderDashboardPage?: PageRenderer;
    renderCustomersPage?: PageRenderer;
    renderStatisticsPage?: PageRenderer;
    timeEvents?: TimeEventsApi;
    clock: ClockApi;
    // A new id, `${prefix}-${n}`, from the counter saved on gameState (ids.ts).
    nextId: (prefix: string) => string;
    ui: UiApi;
    taskManager: TaskManagerApi;
    taskAssignment: TaskAssignmentApi;
    prescriptions: PrescriptionsApi;
    production: ProductionApi;
    taskbars: TaskbarsApi;
    updateTaskProgressBars: () => void;
    fmt: Formatters;
    words: PlayerWords;
    kit: Kit;
    charts: ChartsApi;
    toast: (message: string, tone?: ToastTone, options?: { sticky?: boolean }) => HTMLDivElement;
    renderTopBar: () => HTMLElement;
    renderSidebar: () => HTMLElement;
    updateActiveNavItem: (pageName: string) => void;
    customers: CustomersApi;
    insuranceClaims: InsuranceClaimsApi;
    materialsData: Material[];
    calculateMaterialCost: (materialId: string, quantity: number) => number;
    namesData: NamesData;
    getRandomFirstName: () => string;
    getRandomLastName: () => string;
    generateDoctorName: () => string;
    productsData: Product[];
    calculateProductCost: (productId: string) => number;
    researchData: ResearchData;
    research: ResearchApi;
    equipmentData: EquipmentItem[];
    financesData: FinancesData;
    finances: FinancesApi;
    gameState: GameState;
    updateUI: (topic: ChangeTopic) => void;
    helpers: HelpersApi;
    isGameInitialized: boolean;
    gameLoop: (timestamp: number) => void;
    setGameSpeed: (speedMultiplier: number) => void;
    getGameSpeed: () => number;
    toggleGamePause: () => void;
    initializeNewGame: (gameOptions: NewGameOptions) => boolean;
    loadSavedGame: () => Promise<boolean>;
    applySavedGame: (gameData: unknown) => void;
    saveFile: SaveFileApi;
    bootstrapGame: BootstrapApi;
    // Settings-page multipliers, saved with the game (SaveSettings).
    // brandReputation.calcCustomers reads customerFrequencyMultiplier.
    customerFrequencyMultiplier?: number;
    operatingCostMultiplier?: number;
    // Set by settingsPage.ts's setOperatingCosts the first time it runs, to
    // remember the pre-multiplier overhead value.
    originalOverhead?: number;
}
