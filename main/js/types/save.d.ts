// The save file format (saveFile.ts).
//
// Ambient typings for the window globals: every file is a classic
// <script> (no modules), and each module adds its own fields to Window.

// A save holds only player state; static definitions come from the data
// files and saved state is merged onto them on load.
type SavedItemState<T, K extends keyof T> = { id: string } & Partial<Pick<T, K>>;

type SavedProduct = SavedItemState<Product, 'price' | 'inventory' | 'maxInventory'>;
type SavedMaterial = SavedItemState<Material, 'inventory' | 'autoOrderThreshold' | 'autoOrderAmount'>;
type SavedEquipment = SavedItemState<
    EquipmentItem,
    'owned' | 'durability' | 'autoPurchaseThreshold' | 'autoPurchaseAmount'
>;

interface SaveSettings {
    gameSpeed: number;
    globalMarkup: number;
}

// The research a save holds. refund: set by the v4 -> v5 migration for
// research toward a level that no longer exists; apply() pays it back.
interface SavedResearch {
    currentLevel: number;
    inProgress: ResearchInProgress | null;
    refund?: number;
}

// A location (Phase 10): its building and lease, and its own lists.
type SavedLocation = Omit<StoreLocation, 'products' | 'materials' | 'equipment'> & {
    products: SavedProduct[];
    materials: SavedMaterial[];
    equipment: SavedEquipment[];
};

// Date fields are Dates when written and ISO strings when read back;
// saveFile.ts revives them. From v10 (Phase 10) the game is a company and
// its locations.
interface SaveFile {
    version: number;
    timestamp: number;
    // The clock and the session, company-wide
    gameState: GameState;
    company: {
        name: string;
        activeLocationId: string;
        finances: FinancesData;
        reputation: number;
        research: SavedResearch;
        insuranceClaims: { pending: InsuranceClaim[]; processed: InsuranceClaim[] };
        records: { days: DayRecord[]; pruned: Partial<Record<DepartureReason, number>> };
        reports: PeriodReport[];
    };
    locations: SavedLocation[];
    notifications: SavedNotifications;
    settings: SaveSettings;
}

interface SavedNotifications {
    items: NotificationItem[];
    unreadCount: number;
    nextId: number;
}

// v2 to v9: one pharmacy, every list at the top level.
interface SaveFileV9 {
    version: number;
    timestamp: number;
    gameState: GameState & { pharmacyName?: string; location?: string };
    financesData: FinancesData & { overhead?: number };
    employeesData: Employee[];
    brandReputation: { reputationScore: number };
    products: SavedProduct[];
    materials: SavedMaterial[];
    equipment: SavedEquipment[];
    research: SavedResearch;
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
    gameState?: SaveFileV9['gameState'];
    financesData?: SaveFileV9['financesData'];
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
    // Fresh copies of the static product, material and equipment
    // definitions, as the data files have them (a new location's)
    freshDefinitions: () => Pick<StoreLocation, 'products' | 'materials' | 'equipment'>;
}

interface Window {
    saveFile: SaveFileApi;
}
