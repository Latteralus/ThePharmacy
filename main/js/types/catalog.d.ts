// Static game content: products, materials, equipment, research,
// insurance plans, names, and the helpers that read them (data/*.ts).
//
// Ambient typings for the window globals: every file is a classic
// <script> (no modules), and each module adds its own fields to Window.

interface InsurancePlan {
    planName: string;
    copayType: 'percentage';
    copayPercentage: number;
    // What the plan pays for a drug it covers, copay included, as a share
    // of the market price. null for self-pay.
    reimbursementRate: number | null;
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
    // Where a unit goes in the building, and the floor space it takes with
    // room to work around it (Phase 10, #11; building.ts)
    zone: ZoneId;
    sqft: number;
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
    helpers: HelpersApi;
}
