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

interface Customer {
  id: string;
  insurance: InsurancePlan;
}

// Partial — customers.js owns the real, much larger shape (see
// customers.js:309's getRandomInsurance, activeCustomers usage elsewhere);
// extend in place once it converts.
interface CustomersApi {
  activeCustomers: Customer[];
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
  // Optional: owned by files that haven't converted yet (main.js, ui.js,
  // taskManager.js, employees.js, topBar.js, sideBar.js). debug.js only
  // ever does a `typeof window.x !== 'undefined'` existence check on
  // these, never assumes a shape — tighten when each owner converts.
  gameAPI?: GameApi;
  employeesData?: unknown;
  ui?: unknown;
  taskManager?: unknown;
  showPage?: (...args: unknown[]) => void;
  renderTopBar?: (...args: unknown[]) => void;
  renderSidebar?: (...args: unknown[]) => void;
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
