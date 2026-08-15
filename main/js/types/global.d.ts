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

interface ResearchData {
  currentLevel: number;
  levels: ResearchLevel[];
}

interface ResearchApi {
  getUnlockedProducts: () => string[];
  getUnlockedEquipment: () => string[];
  researchNextLevel: () => void;
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
  promoteEmployee: (employeeId: string, newSalary: number, newRole?: string | null) => void;
  updateEmployeeMoodOnTaskCompletion: (employeeId: string, taskType: string) => void;
  hireEmployee: (role: string, skillLevel: string) => void;
  hireSelectedEmployee: (employeeData: Employee) => void;
  fireEmployee: (employeeId: string) => void;
  updateEmployeeSkills: (employeeId: string, newSkills: Partial<EmployeeSkills>) => void;
}

interface BrandReputationApi {
  brandScore: number;
  reputationScore: number;
  calcCustomers: (hour: number) => number;
  gainReputation: (amount: number) => void;
  loseReputation: (amount: number) => void;
}

// Partial — electron-integration.js/preload.js own the real, larger shape.
interface GameApi {
  getNewGameOptions?: () => Promise<unknown>;
  loadGame?: () => Promise<SavedGameData | null>;
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
  patience: number;
  timer: ReturnType<typeof setInterval> | null;
  firstName: string;
  lastName: string;
  mood: number;
  lastStateChange: number;
}

interface CustomersApi {
  activeCustomers: Customer[];
  customerTypes: Record<string, CustomerTypeDef>;
  generateCustomer: (hour: number) => Customer;
  assignPrescription: (customerId: string, prescriptionId: string | null) => void;
  updateCustomerStatus: (customerId: string, newStatus: string) => void;
  updateCustomerMood: (customerId: string, moodChange: number) => void;
  extendPatience: (customerId: string, secondsToAdd: number) => void;
  adjustPatienceDecayRate: (customer: Customer) => number;
  customerLeaves: (customerId: string) => void;
  startCustomerTimer: (customerId: string) => void;
  updateReputationOnDeparture: (customer: Customer) => void;
  getRandomCustomerType: () => string;
  getRandomInsurance: () => InsurancePlan;
  getCustomerById: (customerId: string) => Customer | undefined;
  detectAndFixStuckCustomers: () => void;
}

// Partial — task shape is owned by taskManager.js/taskAssignment.js, still
// plain JS. Only the fields converted .ts files actually read are named;
// the index signature lets each creator (customers.ts, prescriptions.ts,
// production.ts, ...) keep attaching whatever extra fields it needs
// (dependencyTaskId, fillTaskDependency, etc.) without every field being
// named here. Tighten once taskManager.js itself converts and owns the
// authoritative shape.
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
  priority?: string;
  quantityToMake?: number;
  quantityNeeded?: number;
  [key: string]: unknown;
}

// Partial — taskManager.js owns the real shape; extend in place once it
// converts.
interface TaskManagerApi {
  tasks: Task[];
  addTask: (task: Task) => void;
  updateTasks: (minutes: number) => void;
}

// Partial — taskAssignment.js owns the real shape; extend in place once it
// converts.
interface TaskAssignmentApi {
  unassignTask: (taskId: string) => void;
  autoAssignTasks: () => void;
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
}

interface PrescriptionsApi {
  activePrescriptions: Prescription[];
  generatePrescription: (customerId: string) => string | null;
  createFillTaskForPrescription: (prescription: Prescription) => string | null;
  updatePrescriptionStatus: (prescriptionId: string, newStatus: string) => void;
  prescriptionFilled: (prescriptionId: string, customerId: string) => void;
  createConsultationTask: (customerId: string) => void;
  getPrescription: (prescriptionId: string) => Prescription | undefined;
  getRandomFrequency: () => string;
  removePrescriptionsByCustomer: (customerId: string) => void;
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

// Partial — timeEvents.js owns the real shape; extend in place once it
// converts. Every call site in this batch guards with `window.timeEvents &&
// ...` first, so this stays optional even though the calls that do happen
// are otherwise unconditional.
interface TimeEventsApi {
  startOfDay: (gameState: GameState) => void;
  endOfDay: (gameState: GameState) => void;
  minuteCheck: (gameState: GameState) => void;
}

interface BootstrapApi {
  retry: () => void;
  checkComponents: () => boolean;
  buildUI: () => void;
}

interface Window {
  insuranceData: InsurancePlan[];
  brandReputation: BrandReputationApi;
  createPanel: (args: { title: string; body: string }) => HTMLDivElement;
  showDailySummaryModal: (onNextDay?: () => void) => void;
  gameAPI?: GameApi;
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
  saveGame?: () => void;
  notifications?: NotificationsApi;
  renderOperationsPage?: (container: HTMLElement) => void;
  renderEmployees?: () => void;
  // Owned by employeesPage.js, not converted yet, but called unconditionally
  // by employees.ts's hireEmployee (no typeof guard in the original either)
  // — required for the same reason as showPage/ui/taskManager above.
  displayEmployeeCandidates: (candidates: Employee[]) => void;
  // Owned by inventoryPage.js, not converted yet.
  renderInventoryPage?: (container: HTMLElement) => void;
  updateInventoryDisplay?: () => void;
  timeEvents?: TimeEventsApi;
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
  toggleGamePause: () => void;
  initializeNewGame: (gameOptions: NewGameOptions) => boolean;
  loadSavedGame: () => Promise<boolean>;
  runFallbackInitialization: () => boolean;
  bootstrapGame: BootstrapApi;
}
