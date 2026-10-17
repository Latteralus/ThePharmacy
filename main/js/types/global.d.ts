// Ambient typings for the window-global surface shared between converted
// .ts files and the plain .js files not yet converted. Grows by one small
// interface per file as the migration proceeds — see docs/revision.md.

interface InsurancePlan {
  planName: string;
  copayType: "percentage";
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
  researchNextLevel: () => void;
  checkResearchCompletion: (gameState: GameState) => void;
}

interface EquipmentItem {
  id: string;
  name: string;
  cost: number;
  owned: number;
  durability: number;
  capacity: number;
  autoPurchaseThreshold: number;
  autoPurchaseAmount: number;
  researchLevelRequired: number;
  workerType: string;
  dosageForms: string[];
  isUnlocked: () => boolean;
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
  other: number;
}

interface RevenueCategories {
  prescriptions: number;
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
  pending?: boolean;
}

// addTransaction always assigns an id if missing, so every transaction that
// ends up in FinancesData.transactions has one.
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
  borderWidth: number;
}

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
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
  applyDailyCosts: () => void;
  completePrescription: (customerId: string, prescriptionId: string) => { copay: number; price: number } | undefined;
  processInsuranceClaims: () => void;
  addIncome: (amount: number, category?: string, description?: string) => void;
  addExpense: (amount: number, category?: string, description?: string) => boolean;
  addTransaction: (transaction: TransactionInput) => void;
  updateProductPrice: (productId: string, newPrice: number) => void;
  setToSuggestedPrices: () => void;
  applyMarkupToAllProducts: (markupPercentage: number) => void;
  updateProfitMetrics: () => void;
  resetDailyStats: () => void;
  startNewWeek: () => void;
  startNewMonth: () => void;
  getDailySalesChartData: () => ChartData;
  getMonthlySalesChartData: () => ChartData;
  getMonthlyFinancialChartData: () => ChartData;
  getExpenseCategoriesChartData: () => ChartData;
  getRevenueCategoriesChartData: () => ChartData;
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
// lastSimulationTime/renderInfo/dateCreated are genuinely optional: three
// different places construct `window.gameState` (main.js's own fallback,
// gameInitializer.ts's initializeNewGame, and its runFallbackInitialization)
// and each sets a different subset — main.js's gameLoop already defensively
// checks `if (!window.gameState.lastFrameTime)` for exactly this reason.
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

// The shape handed back by gameAPI.loadGame() — a JSON/IPC round-trip of
// whatever game-integration.js (still plain JS, main process) wrote out.
// Loosely typed: Date fields actually arrive as strings at this point
// (gameInitializer.ts revives currentDate/dateCreated immediately after —
// `new Date(x)` accepts a string just as well as a Date, so typing this as
// the "revived" shapes doesn't break that call).
interface SavedGameData {
  gameState?: GameState;
  financesData?: FinancesData;
  employeesData?: Employee[];
  productsData?: Product[];
  materialsData?: Material[];
  equipmentData?: EquipmentItem[];
  brandReputation?: Partial<BrandReputationApi>;
  researchData?: ResearchData;
  activePrescriptions?: Prescription[];
  refillRegistry?: RefillRecord[];
}

interface HelpersApi {
  calculatePotentialProduction: (productId: string) => number;
  calculateMaterialsNeeded: (productId: string, quantity: number) => Record<string, number>;
  orderMaterialsForProduct: (productId: string, quantity: number) => void;
  calculateOrderCost: (materialsNeeded: Record<string, number>) => number;
  calculateStartingWage: (role: string, skillLevel: string) => number;
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
  mood: string;
  // The three static starting employees use an ISO date string; employees
  // hired at runtime (hireEmployee's candidates) get a real Date instead.
  hireDate: string | Date;
  currentTaskId: string | null;
}

interface EmployeesApi {
  getEmployeeById: (employeeId: string) => Employee | undefined;
  getEmployeeFullName: (employee: Employee) => string;
  calculateEmployeeEfficiency: (employee: Employee) => number;
  calculateTaskCompletionTime: (baseTime: number, employeeId: string, taskType: string) => number;
  updateEmployeeMorale: (employeeId: string, moraleChange: number) => void;
  updateEmployeeMoodOnTaskCompletion: (employeeId: string, taskType: string) => void;
  hireEmployee: (role: string, skillLevel: string) => void;
  hireSelectedEmployee: (employeeData: Employee) => void;
  fireEmployee: (employeeId: string) => void;
}

interface BrandReputationApi {
  reputationScore: number;
  calcCustomers: (hour: number) => number;
  gainReputation: (amount: number) => void;
  loseReputation: (amount: number) => void;
}

// Partial — preload.js (not yet converted) owns the real, larger shape.
// saveGame's payload is intentionally untyped: it's not quite SavedGameData
// (equipmentData has isUnlocked() stripped out before it crosses IPC, since
// functions can't survive structured clone — see electron-integration.ts).
interface GameApi {
  getNewGameOptions?: () => Promise<unknown>;
  loadGame?: () => Promise<SavedGameData | null>;
  saveGame?: (gameData: unknown) => Promise<{ success: boolean } | undefined>;
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

interface Customer {
  id: string;
  type: string;
  status: string;
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
  generateCustomer: (hour?: number) => Customer;
  assignPrescription: (customerId: string, prescriptionId: string | null) => void;
  updateCustomerStatus: (customerId: string, newStatus: string) => void;
  updateCustomerMood: (customerId: string, moodChange: number) => void;
  extendPatience: (customerId: string, minutesToAdd: number) => void;
  adjustPatienceDecayRate: (customer: Customer) => number;
  customerLeaves: (customerId: string) => void;
  updatePatience: () => void;
  sendRemainingCustomersHome: () => void;
  updateReputationOnDeparture: (customer: Customer) => void;
  getRandomCustomerType: () => string;
  getRandomInsurance: () => InsurancePlan;
  getInsuranceByPlanName: (planName: string) => InsurancePlan;
  getCustomerById: (customerId: string) => Customer | undefined;
  detectAndFixStuckCustomers: () => void;
}

// Now the real, full shape (taskManager.ts owns it). The index signature is
// kept even though every field a converted creator (customers.ts,
// prescriptions.ts, production.ts) attaches is now named — cheap insurance
// against the still-plain-JS page files reading/writing ad hoc fields later.
interface Task {
  id: string;
  type: string;
  status: string;
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
  // Game time (ms), from clock.now().
  createdAt?: number;
  lastUpdateTime?: number;
  lastProgressTime?: number;
  assignedAt?: number;
  [key: string]: unknown;
}

interface ProgressAnomaly {
  taskId: string;
  expected: number;
  actual: number;
  difference: number;
  timestamp: number;
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
  debugTaskStatus: () => void;
  forceCompleteTask: (taskId: string) => boolean;
  addEventListener: (event: string, callback: (data: unknown) => void) => void;
  removeEventListener: (event: string, callback: (data: unknown) => void) => void;
  resetProgressVerification: (taskId?: string | null) => void;
  getProgressAnomalies: () => ProgressAnomaly[];
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
  canFillPrescription: (prescriptionId: string) => boolean;
  normalizeEmployeeRoles: () => void;
  logTaskAssignmentState: () => void;
  forceTaskReassignment: () => void;
}

interface Prescription {
  id: string;
  customerId: string;
  productId: string;
  productName: string;
  dosage: number;
  dosageForm: string;
  frequency: string;
  status: string;
  doctorName: string;
  refillsAllowed: number;
  assignedEmployeeId: string | null;
  createdAt: number;
  // True when this prescription was generated from a RefillRecord rather
  // than freshly picked at random (see PrescriptionsApi.generateRefillPrescription).
  isRefill?: boolean;
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
  generatePrescription: (customerId: string) => string | null;
  generateRefillPrescription: (customerId: string, record: RefillRecord) => string | null;
  createFillTaskForPrescription: (prescription: Prescription) => string | null;
  updatePrescriptionStatus: (prescriptionId: string, newStatus: string) => void;
  prescriptionFilled: (prescriptionId: string, customerId: string) => void;
  createConsultationTask: (customerId: string) => void;
  getPrescription: (prescriptionId: string) => Prescription | undefined;
  getRandomFrequency: () => string;
  removePrescriptionsByCustomer: (customerId: string) => void;
  getEligibleRefillRecord: (currentTime: number) => RefillRecord | undefined;
  consumeRefillRecord: (recordId: string) => RefillRecord | undefined;
}

// production.js's public API. canCompound/createCompoundTask/
// handleTaskCompletion are read by prescriptions.ts and taskManager.js
// (still plain JS) respectively.
interface ProductionApi {
  canCompound: (product: Product) => boolean;
  createCompoundTask: (product: Product, quantity: number) => Task;
  checkAndCreateCompoundTasks: () => void;
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

interface UiApi {
  init: () => void;
  formatDate: (dateObj: Date) => string;
  formatTime: (dateObj: Date) => string;
  formatDateTime: (dateObj: Date) => string;
  updateTime: () => void;
  updateFinances: () => void;
  updateCustomers: () => void;
  updatePrescriptions: () => void;
  updateUI: (page?: string) => void;
  forceUpdate: (page: string) => void;
  refreshCache: () => void;
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
  addClaim: (customerId: string, prescriptionId: string, totalAmount: number, copayAmount: number) => InsuranceClaim | false;
  calculateProcessingTime: (insuranceName: string) => number;
  processAllClaims: () => number;
  processClaims: (insuranceName: string) => number;
  removeClaim: (prescriptionId: string) => boolean;
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
  autoOrderCheck: () => void;
  autoPurchaseEquipmentCheck: () => void;
  forceTimeUpdate: (minutes?: number) => boolean;
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
  constructor(ctx: CanvasRenderingContext2D, config: { type: string; data: ChartData; options?: Record<string, unknown> });
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
  // Never actually assigned anywhere in the codebase (topBar.js always
  // falls back to 'Manager') — a pre-existing "silently does nothing" gap,
  // not something this migration fixes. See docs/Changelog.md.
  username?: string;
  // Both owned by electron-integration.ts. `silent` skips the success
  // notification (autosave).
  saveGame?: (options?: { silent?: boolean }) => Promise<boolean>;
  loadGame?: () => Promise<boolean>;
  autoSave?: AutoSaveApi;
  notifications?: NotificationsApi;
  renderOperationsPage?: (container: HTMLElement) => (() => void);
  // Set by operationsPage.ts's own render call; the cleanup function
  // returned by renderOperationsPage is never actually captured by
  // showPage (main.ts casts the renderer's return type away), so this
  // interval is the page's only way to stop refreshing itself once you
  // navigate away.
  operationsRefreshInterval?: ReturnType<typeof setInterval> | null;
  renderEmployees?: () => void;
  // Owned by employeesPage.js, not converted yet, but called unconditionally
  // by employees.ts's hireEmployee (no typeof guard in the original either)
  // — required for the same reason as showPage/ui/taskManager above.
  displayEmployeeCandidates: (candidates: Employee[]) => void;
  // Owned by inventoryPage.js, not converted yet.
  renderInventoryPage?: (container: HTMLElement) => void;
  updateInventoryDisplay?: () => void;
  // Owned by dashboardPage.js/ordersPage.js. Never referenced by name
  // anywhere (main.ts's showPage looks page renderers up dynamically by
  // constructed string, see `render${Page}Page`) — declared for the same
  // reason every other directly-assigned global is, not because anything
  // reads them through this property.
  renderDashboardPage?: (container: HTMLElement) => void;
  renderOrdersPage?: (container: HTMLElement) => void;
  renderCustomersPage?: (container: HTMLElement) => void;
  renderMarketingPage?: (container: HTMLElement) => void;
  renderStatisticsPage?: (container: HTMLElement) => void;
  renderEquipmentPage?: (container: HTMLElement) => void;
  renderResearchPage?: (container: HTMLElement) => void;
  renderMarketplacePage?: (container: HTMLElement) => void;
  renderEmployeesPage?: (container: HTMLElement) => HTMLElement;
  renderFinancesPage?: (container: HTMLElement) => void;
  renderSettingsPage?: (container: HTMLElement) => void;
  timeEvents?: TimeEventsApi;
  clock: ClockApi;
  // Debug-only global set by timeEvents.ts (console-driven time skip), no
  // callers elsewhere in the codebase.
  forceTimeForward?: (minutes?: number) => boolean;
  // taskManager.ts's debounce handle for batching auto-assignment after
  // rapid-fire task adds/completions.
  _taskAssignTimeout?: ReturnType<typeof setTimeout>;
  ui: UiApi;
  taskManager: TaskManagerApi;
  taskAssignment: TaskAssignmentApi;
  prescriptions: PrescriptionsApi;
  production: ProductionApi;
  taskbars: TaskbarsApi;
  updateTaskProgressBars: () => void;
  renderTopBar: () => HTMLElement;
  renderSidebar: () => HTMLElement;
  updateActiveNavItem: (pageName: string) => void;
  updateSidebarReputation: () => void;
  updateFinancialSummary: (financesData: FinancesData) => void;
  updateTimeDisplay: (date: Date) => void;
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
  updateUI: (page: string) => void;
  helpers: HelpersApi;
  isGameInitialized: boolean;
  gameLoop: (timestamp: number) => void;
  setGameSpeed: (speedMultiplier: number) => void;
  getGameSpeed: () => number;
  toggleGamePause: () => void;
  initializeNewGame: (gameOptions: NewGameOptions) => boolean;
  loadSavedGame: () => Promise<boolean>;
  applySavedGame: (gameData: SavedGameData) => void;
  runFallbackInitialization: () => boolean;
  bootstrapGame: BootstrapApi;
  // Set by settingsPage.ts's setCustomerFrequency the first time the
  // frequency dropdown changes.
  customerFrequencyMultiplier?: number;
  _originalCalcCustomers?: (hour: number) => number;
  // Set by settingsPage.ts's setOperatingCosts the first time it runs, to
  // remember the pre-multiplier overhead value.
  originalOverhead?: number;
}
