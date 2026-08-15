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

// Partial — only the fields converted .ts files currently read/write.
// Extend in place (not with a second declaration) once finances.js itself
// converts and the full shape is known.
interface FinancesData {
  cash: number;
  dailyIncome: number;
  pendingInsuranceIncome: number;
  completedOrders: number;
  pendingOrders: number;
  insuranceReimbursements?: InsuranceReimbursements;
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
}

interface FinancesApi {
  addTransaction: (transaction: TransactionInput) => void;
}

// Partial — same rationale as FinancesData; main.js owns the real shape.
// Narrowed to Date (not string | Date): by the time any converted file
// reads gameState.currentDate during normal gameplay, save/load's date
// revival (see docs/Changelog.md, 2026-08-15 "Save/load fixed") has
// already run, so it's always a real Date instance — `new Date(x)` still
// accepts a Date argument, so this doesn't break existing callers.
interface GameState {
  currentDate: Date;
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

// Partial — task shape is owned by taskManager.js/taskAssignment.js and the
// various task-creating files (customers.js, prescriptions.js, ...), none
// of which have converted yet. Only the fields converted .ts files actually
// read are named; the index signature lets each creator keep attaching
// whatever extra fields it needs (dependencyTaskId, quantityNeeded, etc.)
// without every field being named here. Tighten once taskManager.js itself
// converts and owns the authoritative shape.
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
  [key: string]: unknown;
}

// Partial — taskManager.js owns the real shape; extend in place once it
// converts.
interface TaskManagerApi {
  tasks: Task[];
  addTask: (task: Task) => void;
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

// Partial — prescriptions.js owns the real shape; extend in place once it
// converts.
interface PrescriptionsApi {
  activePrescriptions: Prescription[];
  generatePrescription: (customerId: string) => string | null;
  createConsultationTask: (customerId: string) => void;
  removePrescriptionsByCustomer: (customerId: string) => void;
  getPrescription: (prescriptionId: string) => Prescription | undefined;
  createFillTaskForPrescription: (prescription: Prescription) => void;
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

interface Window {
  insuranceData: InsurancePlan[];
  brandReputation: BrandReputationApi;
  createPanel: (args: { title: string; body: string }) => HTMLDivElement;
  showDailySummaryModal: (onNextDay?: () => void) => void;
  // Optional: owned by files that haven't converted yet (main.js,
  // employees.js). debug.js only ever does a `typeof window.x !==
  // 'undefined'` existence check on these, never assumes a shape — tighten
  // when each owner converts.
  gameAPI?: GameApi;
  employeesData?: unknown;
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
  ui: UiApi;
  taskManager: TaskManagerApi;
  taskAssignment: TaskAssignmentApi;
  prescriptions: PrescriptionsApi;
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
}
