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

// Partial — only the fields converted .ts files currently read/write.
// Extend in place (not with a second declaration) once finances.js itself
// converts and the full shape is known.
interface FinancesData {
  cash: number;
}

interface TransactionInput {
  id?: string;
  date: Date;
  type: string;
  category: string;
  amount: number;
  description: string;
}

interface FinancesApi {
  addTransaction: (transaction: TransactionInput) => void;
}

// Partial — same rationale as FinancesData; main.js owns the real shape.
interface GameState {
  currentDate: string | Date;
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

interface Window {
  insuranceData: InsurancePlan[];
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
