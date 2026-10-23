// /js/data/materials.js

// A new game's stock of each material: a day or two of business, so the
// pharmacy buys its materials from the start (it used to start with 50,000
// of each, about $3M at list price and 30x the starting cash, which made
// every sale for months nearly pure profit). Auto-order is on, at the top
// bulk tier, so a new player isn't stopped by a shortage they didn't know
// to plan for. Saves keep their own stock and settings.
const MATERIAL_STARTING_STOCK = 2000;
const MATERIAL_REORDER_BELOW = 500;
const MATERIAL_REORDER_AMOUNT = 1000;

// Margins are a real pharmacy's (balance pass, 2026-10-23). Active
// ingredients were 4x these costs, so a prescription sold for about $650
// against a real ~$60, and wages were 1-3% of revenue against a real ~11%.
// Bulk buying took up to 25% off, which every auto-order got, and nearly
// doubled the gross margin; a wholesaler's volume discount is a few percent.
const BULK_DISCOUNTS: BulkDiscount[] = [
    { minQuantity: 500, discount: 0.02 },
    { minQuantity: 1000, discount: 0.05 },
];

window.materialsData = [
    // =============================
    // ACTIVE INGREDIENTS (mat###)
    // =============================
    {
        id: 'mat001',
        name: 'Acetaminophen Base',
        cost: 0.375,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1, // in hours
        supplier: 'Various',
        bulkDiscounts: BULK_DISCOUNTS,
    },
    {
        id: 'mat002',
        name: 'Ibuprofen Powder',
        cost: 0.5,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: BULK_DISCOUNTS,
    },
    {
        id: 'mat003',
        name: 'Amoxicillin Trihydrate',
        cost: 0.75,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: BULK_DISCOUNTS,
    },
    {
        id: 'mat004',
        name: 'Metformin Hydrochloride',
        cost: 0.625,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: BULK_DISCOUNTS,
    },
    {
        id: 'mat005',
        name: 'Omeprazole Base',
        cost: 0.875,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: BULK_DISCOUNTS,
    },
    {
        id: 'mat006',
        name: 'Amlodipine Besylate',
        cost: 0.5625,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: BULK_DISCOUNTS,
    },
    {
        id: 'mat007',
        name: 'Simvastatin Base',
        cost: 0.6875,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: BULK_DISCOUNTS,
    },
    {
        id: 'mat008',
        name: 'Levothyroxine Sodium',
        cost: 0.8125,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: BULK_DISCOUNTS,
    },
    {
        id: 'mat009',
        name: 'Losartan Potassium',
        cost: 0.7,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: BULK_DISCOUNTS,
    },
    {
        id: 'mat010',
        name: 'Hydrochlorothiazide',
        cost: 0.675,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: BULK_DISCOUNTS,
    },
    {
        id: 'mat011',
        name: 'Pantoprazole Sodium',
        cost: 0.9,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: BULK_DISCOUNTS,
    },
    {
        id: 'mat012',
        name: 'Rosuvastatin Calcium',
        cost: 0.85,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: BULK_DISCOUNTS,
    },
    {
        id: 'mat013',
        name: 'Clopidogrel Bisulfate',
        cost: 0.8,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: BULK_DISCOUNTS,
    },
    {
        id: 'mat014',
        name: 'Montelukast Sodium',
        cost: 0.725,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: BULK_DISCOUNTS,
    },
    {
        id: 'mat015',
        name: 'Sertraline Hydrochloride',
        cost: 0.775,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: BULK_DISCOUNTS,
    },
    {
        id: 'mat016',
        name: 'Azithromycin Dihydrate',
        cost: 0.9375,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: BULK_DISCOUNTS,
    },
    {
        id: 'mat017',
        name: 'Diclofenac Sodium',
        cost: 0.6625,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: BULK_DISCOUNTS,
    },
    {
        id: 'mat018',
        name: 'Alprazolam Base',
        cost: 1,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: BULK_DISCOUNTS,
    },
    {
        id: 'mat019',
        name: 'Albuterol Sulfate',
        cost: 0.825,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: BULK_DISCOUNTS,
    },
    {
        id: 'mat020',
        name: 'Furosemide Base',
        cost: 0.7625,
        inventory: MATERIAL_STARTING_STOCK,
        autoOrderThreshold: MATERIAL_REORDER_BELOW,
        autoOrderAmount: MATERIAL_REORDER_AMOUNT,
        leadTime: 1,
        supplier: 'Various',
        bulkDiscounts: BULK_DISCOUNTS,
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
        bulkDiscounts: BULK_DISCOUNTS,
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
        bulkDiscounts: BULK_DISCOUNTS,
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
        bulkDiscounts: BULK_DISCOUNTS,
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
        bulkDiscounts: BULK_DISCOUNTS,
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
        bulkDiscounts: BULK_DISCOUNTS,
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
        bulkDiscounts: BULK_DISCOUNTS,
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
        bulkDiscounts: BULK_DISCOUNTS,
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
        bulkDiscounts: BULK_DISCOUNTS,
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
        bulkDiscounts: BULK_DISCOUNTS,
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
        bulkDiscounts: BULK_DISCOUNTS,
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
        bulkDiscounts: BULK_DISCOUNTS,
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
        bulkDiscounts: BULK_DISCOUNTS,
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
        bulkDiscounts: BULK_DISCOUNTS,
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
        bulkDiscounts: BULK_DISCOUNTS,
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
        bulkDiscounts: BULK_DISCOUNTS,
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
        bulkDiscounts: BULK_DISCOUNTS,
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
        bulkDiscounts: BULK_DISCOUNTS,
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
        bulkDiscounts: BULK_DISCOUNTS,
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
        bulkDiscounts: BULK_DISCOUNTS,
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
