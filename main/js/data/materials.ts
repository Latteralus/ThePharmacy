// /js/data/materials.js

// A new game's stock of each material: a day or two of business, so the
// pharmacy buys its materials from the start (it used to start with 50,000
// of each, about $3M at list price and 30x the starting cash, which made
// every sale for months nearly pure profit). Auto-order is on, at the 25%
// bulk tier, so a new player isn't stopped by a shortage they didn't know
// to plan for. Saves keep their own stock and settings.
const MATERIAL_STARTING_STOCK = 2000;
const MATERIAL_REORDER_BELOW = 500;
const MATERIAL_REORDER_AMOUNT = 1000;

window.materialsData = [
    // =============================
    // ACTIVE INGREDIENTS (mat###)
    // =============================
    {
        id: 'mat001',
        name: 'Acetaminophen Base',
        cost: 1.5,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1, // in hours
        supplier: 'Various',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 }, // 5% if buying 50-99
            { minQuantity: 100, discount: 0.1 }, // 10% if buying 100-149
            { minQuantity: 150, discount: 0.15 }, // 15% if buying 150-499
            { minQuantity: 500, discount: 0.2 }, // 20% if buying 500-999
            { minQuantity: 1000, discount: 0.25 }, // 25% if buying 1000+
        ],
    },
    {
        id: 'mat002',
        name: 'Ibuprofen Powder',
        cost: 2.0,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'mat003',
        name: 'Amoxicillin Trihydrate',
        cost: 3.0,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'mat004',
        name: 'Metformin Hydrochloride',
        cost: 2.5,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'mat005',
        name: 'Omeprazole Base',
        cost: 3.5,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'mat006',
        name: 'Amlodipine Besylate',
        cost: 2.25,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'mat007',
        name: 'Simvastatin Base',
        cost: 2.75,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'mat008',
        name: 'Levothyroxine Sodium',
        cost: 3.25,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'mat009',
        name: 'Losartan Potassium',
        cost: 2.8,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'mat010',
        name: 'Hydrochlorothiazide',
        cost: 2.7,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'mat011',
        name: 'Pantoprazole Sodium',
        cost: 3.6,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'mat012',
        name: 'Rosuvastatin Calcium',
        cost: 3.4,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'mat013',
        name: 'Clopidogrel Bisulfate',
        cost: 3.2,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'mat014',
        name: 'Montelukast Sodium',
        cost: 2.9,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'mat015',
        name: 'Sertraline Hydrochloride',
        cost: 3.1,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'mat016',
        name: 'Azithromycin Dihydrate',
        cost: 3.75,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'mat017',
        name: 'Diclofenac Sodium',
        cost: 2.65,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'mat018',
        name: 'Alprazolam Base',
        cost: 4.0,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'mat019',
        name: 'Albuterol Sulfate',
        cost: 3.3,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'mat020',
        name: 'Furosemide Base',
        cost: 3.05,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },

    // =======================================
    // EXCIPIENTS / NON-ACTIVE INGREDIENTS (ing###)
    // =======================================

    // Common Tablet Excipients
    {
        id: 'ing002',
        name: 'Microcrystalline Cellulose',
        cost: 0.02,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Generic Supplier',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'ing003',
        name: 'Magnesium Stearate',
        cost: 0.01,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Generic Supplier',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'ing004',
        name: 'Talc Powder',
        cost: 0.01,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Generic Supplier',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },

    // Capsule Excipients
    {
        id: 'ing006',
        name: 'Gelatin Caps',
        cost: 0.02,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Generic Supplier',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'ing007',
        name: 'Talc Powder (Capsule Grade)',
        cost: 0.01,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Generic Supplier',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'ing008',
        name: 'Magnesium Stearate (Capsule Grade)',
        cost: 0.01,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Generic Supplier',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },

    // Suspension Excipients
    {
        id: 'ing010',
        name: 'Lactose Monohydrate',
        cost: 0.01,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Generic Supplier',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'ing011',
        name: 'Hypromellose (HPMC)',
        cost: 0.02,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Generic Supplier',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'ing012',
        name: 'Sodium Citrate',
        cost: 0.01,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Generic Supplier',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'ing013',
        name: 'Glycerin',
        cost: 0.02,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Generic Supplier',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },

    // Topical (Gel, Cream) Excipients
    {
        id: 'ing020',
        name: 'Carbomer (Gelling Agent)',
        cost: 0.02,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Generic Supplier',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'ing021',
        name: 'Propylene Glycol',
        cost: 0.02,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Generic Supplier',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },

    // Inhaler Excipients
    {
        id: 'ing030',
        name: 'Propellant',
        cost: 0.05,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Generic Supplier',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'ing031',
        name: 'Ethanol',
        cost: 0.02,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Generic Supplier',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },

    // Extended Release Form
    {
        id: 'ing040',
        name: 'Hypromellose (Extended-Release Matrix)',
        cost: 0.03,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Generic Supplier',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },

    // Flavoring
    {
        id: 'ing050',
        name: 'Flavoring Agent',
        cost: 0.01,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Generic Supplier',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },

    // Sterile (Injectable) Excipients
    {
        id: 'ing060',
        name: 'Sterile Water for Injection',
        cost: 0.01,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Generic Supplier',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'ing061',
        name: 'pH Adjuster (NaOH/HCl)',
        cost: 0.01,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Generic Supplier',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
    {
        id: 'ing062',
        name: 'Stabilizing Agent',
        cost: 0.01,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Generic Supplier',
        bulkDiscounts: [
            { minQuantity: 50, discount: 0.05 },
            { minQuantity: 100, discount: 0.1 },
            { minQuantity: 150, discount: 0.15 },
            { minQuantity: 500, discount: 0.2 },
            { minQuantity: 1000, discount: 0.25 },
        ],
    },
];

// --------------------------------------------------------
// The price of buying `quantity` of a material, after its bulk discount.
// Every purchase uses this: the Marketplace, auto-orders and ordering a
// product's materials.
// --------------------------------------------------------
window.calculateMaterialCost = function (materialId: string, quantity: number): number {
    const material = window.materialsData.find((m) => m.id === materialId);
    if (!material) {
        console.error(`Material not found: ${materialId}`);
        return 0; // or handle error appropriately
    }

    let totalCost = material.cost * quantity;
    let discount = 0;

    // Find the applicable bulk discount
    for (let i = 0; i < material.bulkDiscounts.length; i++) {
        if (quantity >= material.bulkDiscounts[i].minQuantity) {
            discount = material.bulkDiscounts[i].discount;
        } else {
            break; // Stop once we no longer meet the minQuantity
        }
    }

    // Apply discount
    totalCost *= 1 - discount;

    return totalCost;
};
