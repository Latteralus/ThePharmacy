// The company and its locations (Phase 10): company.ts, buildings and zones
// (building.ts), property listings (data/properties.ts), the startup loan
// (data/lending.ts), and monthly and yearly reports (reports.ts).
//
// Ambient typings for the window globals: every file is a classic
// <script> (no modules), and each module adds its own fields to Window.

// What a location does. Phase 19 adds 'outsourcing503B', Phase 20 'research'.
type BusinessType = 'retail';

type AreaType = 'urban' | 'suburban' | 'rural';

// A building's floor is split into zones (#11). Equipment and fixtures
// take floor space in theirs; stock takes shelves in storage.
type ZoneId = 'frontStore' | 'dispensing' | 'lab' | 'cleanroom' | 'storage' | 'coldStorage';

// Something built into a building: counters, benches, shelving bays.
interface Fixture {
    name: string;
    zone: ZoneId;
    count: number;
    // Floor space each, square feet
    sqft: number;
    // Shelving only: shelves each holds
    shelves?: number;
}

interface Building {
    // "Strip-mall storefront"
    type: string;
    sqft: number;
    // Square feet of each zone; they add up to sqft. 0 means the building
    // has none (a cleanroom needs a build-out).
    zones: Record<ZoneId, number>;
    fixtures: Fixture[];
}

// A lease listing on the new-game screen (data/properties.ts).
interface PropertyListing {
    id: string;
    address: string;
    area: AreaType;
    building: Building;
    // Customers against a typical suburban street (1)
    footTraffic: number;
    // Other pharmacies within a mile
    competitors: number;
    // Rent a square foot a year, on a 3-year lease
    rentPerSqftYear: number;
    description: string;
}

interface Lease {
    listingId: string;
    monthlyRent: number;
    termYears: number;
    // Game time (ms) the lease began and ends; it renews for the same
    // term at the end, with the rent up RENT_RISE a year
    start: number;
    end: number;
    // Held by the landlord, returned when the lease ends (one month's rent)
    deposit: number;
}

// A pharmacy the company runs. The per-location globals (employeesData,
// productsData, taskManager.tasks, ...) are views of the active one's live
// state (company.ts).
interface StoreLocation {
    id: string;
    name: string;
    businessType: BusinessType;
    address: string;
    area: AreaType;
    footTraffic: number;
    competitors: number;
    building: Building;
    lease: Lease;
    // dayIndex it opened
    openedOnDay: number;

    employees: Employee[];
    products: Product[];
    materials: Material[];
    equipment: EquipmentItem[];
    tasks: Task[];
    customers: Customer[];
    prescriptions: Prescription[];
    refills: RefillRecord[];
    visits: CustomerVisit[];
}

// The live lists a location holds, in StoreLocation
type LocationList =
    | 'employees'
    | 'products'
    | 'materials'
    | 'equipment'
    | 'tasks'
    | 'customers'
    | 'prescriptions'
    | 'refills'
    | 'visits';

interface CompanyApi {
    // The company's name (the player's, from the new-game screen)
    name: string;
    locations: StoreLocation[];
    activeId: string;
    active: () => StoreLocation;
    get: (id: string) => StoreLocation | undefined;
    // Runs fn with another location active, then switches back.
    withLocation: <T>(id: string, fn: () => T) => T;
    // fn for each location in turn, each active while it runs
    forEachLocation: (fn: (location: StoreLocation) => void) => void;
    // The player's choice of location to look at (the top bar's switcher,
    // shown with more than one location)
    select: (id: string) => void;
    // Replaces every location (a new game, or a load)
    reset: (name: string, locations: StoreLocation[], activeId?: string) => void;
    // A location from a lease listing, with empty lists and fresh copies
    // of the static definitions
    fromListing: (listing: PropertyListing, termYears: number, startTime: number, startDay: number) => StoreLocation;
    // Customers an hour against a typical suburban store: foot traffic,
    // less a share for each competitor nearby
    trafficFactor: (location: StoreLocation) => number;
    // Utilities and services a day (the daily overhead): a flat part for
    // licences, insurance and software, and a part by floor space
    dailyServices: (location: StoreLocation) => number;
    // Charged on the 1st: each location's rent, renewing leases that end
    payRent: () => void;
}

// ---------------------------------------------------------------
// Buildings and zones (building.ts)
// ---------------------------------------------------------------

interface ZoneUse {
    zone: ZoneId;
    label: string;
    sqft: number;
    // Floor space taken by fixtures and equipment
    usedSqft: number;
    // Storage: shelves, and shelves taken by stock
    shelves?: number;
    usedShelves?: number;
    // Front store: customers it holds at once
    customerCapacity?: number;
}

interface BuildingApi {
    ZONES: ZoneId[];
    zoneLabel: (zone: ZoneId) => string;
    // The active location's zones and what's in them
    zones: () => ZoneUse[];
    zone: (zone: ZoneId) => ZoneUse;
    // Shelves an item's stock takes
    materialShelves: (material: Material, quantity?: number) => number;
    productShelves: (product: Product, quantity?: number) => number;
    // Shelves free in storage
    freeShelves: () => number;
    // Extra shelves a purchase of these quantities (material id -> qty) needs
    shelvesNeeded: (order: Map<string, number> | Record<string, number>) => number;
    // Floor space free in a zone
    freeSqft: (zone: ZoneId) => number;
    // Floor space a purchase of equipment (id -> qty) needs, by zone
    floorNeeded: (order: Map<string, number> | Record<string, number>) => Partial<Record<ZoneId, number>>;
    // Why an order can't be bought, or '' if it fits
    refuseMaterials: (order: Map<string, number> | Record<string, number>) => string;
    refuseEquipment: (order: Map<string, number> | Record<string, number>) => string;
    // Customers the front store holds at once
    customerCapacity: () => number;
}

// ---------------------------------------------------------------
// The startup loan (data/lending.ts, stakes.ts)
// ---------------------------------------------------------------

// What the player offers the bank for a lower rate (#12)
interface LoanTerms {
    amount: number;
    termYears: number;
    // Personally liable if the business can't repay
    guarantee: boolean;
    // The equipment as security
    collateral: boolean;
}

interface LoanQuote {
    // Annual rate, 0.105 = 10.5%
    rate: number;
    monthlyPayment: number;
    totalInterest: number;
    // How the rate was built, in player words, for the screen
    parts: Array<{ label: string; points: number }>;
}

// A term loan, repaid monthly on the 1st (stakes.ts)
interface TermLoan {
    id: string;
    name: string;
    principal: number;
    rate: number;
    termMonths: number;
    monthlyPayment: number;
    balance: number;
    paymentsMade: number;
    // Game time (ms) it was taken out
    start: number;
    guarantee: boolean;
    collateral: boolean;
}

interface PropertiesApi {
    listings: PropertyListing[];
    // The lease terms offered, in years, and the one picked if none is
    LEASE_YEARS: number[];
    DEFAULT_LEASE_YEARS: number;
    find: (id: string) => PropertyListing | undefined;
    // Each area's default listing (saves from before Phase 10)
    defaultListing: (area: AreaType) => PropertyListing;
    // A listing's rent a month on a lease of this many years
    monthlyRent: (listing: PropertyListing, termYears: number) => number;
    // Utilities and services a day (the daily overhead)
    servicesPerDay: (area: AreaType, sqft: number) => number;
    // Customers against a typical suburban store
    trafficFactor: (footTraffic: number, competitors: number) => number;
    // Storage shelves a building's shelving holds
    shelves: (building: Building) => number;
}

interface LendingApi {
    BASE_RATE: number;
    MIN_TERM_YEARS: number;
    MAX_TERM_YEARS: number;
    AMOUNT_STEP: number;
    // The most the bank lends for this business type and property
    maxAmount: (business: BusinessType, listing: PropertyListing, termYears: number) => number;
    quote: (terms: LoanTerms) => LoanQuote;
    // Amortised monthly payment
    monthlyPayment: (principal: number, annualRate: number, months: number) => number;
}

// ---------------------------------------------------------------
// Monthly and yearly reports (reports.ts, #13)
// ---------------------------------------------------------------

interface ReportLocationLine {
    id: string;
    name: string;
    revenue: number;
    costs: number;
    net: number;
}

interface ReportLoanLine {
    name: string;
    balance: number;
    monthlyPayment: number;
    paymentsLeft: number;
}

// One month or year, written at the closing that ends it from the ledger
// and the day records. Kept for the whole game: it's also the summary of
// ledger entries and day records too old to keep (#13).
interface PeriodReport {
    kind: 'month' | 'year';
    // '2023-01' or '2023'
    period: string;
    label: string;
    // dayIndex of the first and last closing in it
    firstDay: number;
    lastDay: number;
    daysOpen: number;
    revenueByCategory: Record<string, number>;
    costsByCategory: Record<string, number>;
    revenue: number;
    costs: number;
    net: number;
    byLocation: ReportLocationLine[];
    customers: Partial<Record<DepartureReason, number>>;
    // The balance sheet at its last closing
    balance: {
        cash: number;
        insuranceOwed: number;
        deposits: number;
        creditLine: number;
        termLoans: number;
    };
    loans: ReportLoanLine[];
    // Loan principal repaid and interest paid in the period
    principalRepaid: number;
    interestPaid: number;
    highlights: {
        bestDay?: { day: number; net: number };
        worstDay?: { day: number; net: number };
        reputationStart: number;
        reputationEnd: number;
        staffStart: number;
        staffEnd: number;
        goals: string[];
    };
}

interface ReportsApi {
    list: PeriodReport[];
    // At closing: writes the month's report if today ends a month (and the
    // year's if it ends the year), and returns what was written
    closeDay: () => PeriodReport[];
    find: (kind: PeriodReport['kind'], period: string) => PeriodReport | undefined;
    // Ledger entries before the start of last month are dropped once the
    // month report covering them exists (closeDay does it)
    pruneLedger: () => number;
}

interface Window {
    company: CompanyApi;
    building: BuildingApi;
    properties: PropertiesApi;
    lending: LendingApi;
    reports: ReportsApi;
    showReportModal: (kind: PeriodReport['kind'], period: string, onClose?: () => void) => void;
    showSavesModal: (options?: { title?: string; gameOnly?: boolean }) => void;
    renderCompanyPage?: PageRenderer;
    renderBuildingPage?: PageRenderer;
}
