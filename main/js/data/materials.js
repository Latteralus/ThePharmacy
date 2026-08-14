// /js/data/materials.js

window.materialsData = [
  // =============================
  // ACTIVE INGREDIENTS (mat###)
  // =============================
  {
    id: 'mat001',
    name: 'Acetaminophen Base',
    cost: 1.50,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,          // in hours
    supplier: 'Various',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },    // 5% if buying 50-99
      { minQuantity: 100, discount: 0.10 },   // 10% if buying 100-149
      { minQuantity: 150, discount: 0.15 },   // 15% if buying 150-499
      { minQuantity: 500, discount: 0.20 },   // 20% if buying 500-999
      { minQuantity: 1000, discount: 0.25 }   // 25% if buying 1000+
    ]
  },
  {
    id: 'mat002',
    name: 'Ibuprofen Powder',
    cost: 2.00,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Various',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'mat003',
    name: 'Amoxicillin Trihydrate',
    cost: 3.00,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Various',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'mat004',
    name: 'Metformin Hydrochloride',
    cost: 2.50,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Various',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'mat005',
    name: 'Omeprazole Base',
    cost: 3.50,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Various',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'mat006',
    name: 'Amlodipine Besylate',
    cost: 2.25,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Various',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'mat007',
    name: 'Simvastatin Base',
    cost: 2.75,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Various',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'mat008',
    name: 'Levothyroxine Sodium',
    cost: 3.25,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Various',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'mat009',
    name: 'Losartan Potassium',
    cost: 2.80,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Various',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'mat010',
    name: 'Hydrochlorothiazide',
    cost: 2.70,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Various',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'mat011',
    name: 'Pantoprazole Sodium',
    cost: 3.60,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Various',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'mat012',
    name: 'Rosuvastatin Calcium',
    cost: 3.40,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Various',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'mat013',
    name: 'Clopidogrel Bisulfate',
    cost: 3.20,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Various',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'mat014',
    name: 'Montelukast Sodium',
    cost: 2.90,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Various',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'mat015',
    name: 'Sertraline Hydrochloride',
    cost: 3.10,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Various',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'mat016',
    name: 'Azithromycin Dihydrate',
    cost: 3.75,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Various',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'mat017',
    name: 'Diclofenac Sodium',
    cost: 2.65,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Various',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'mat018',
    name: 'Alprazolam Base',
    cost: 4.00,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Various',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'mat019',
    name: 'Albuterol Sulfate',
    cost: 3.30,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Various',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'mat020',
    name: 'Furosemide Base',
    cost: 3.05,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Various',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },

  // =======================================
  // EXCIPIENTS / NON-ACTIVE INGREDIENTS (ing###)
  // =======================================

  // Common Tablet Excipients
  {
    id: 'ing002',
    name: 'Microcrystalline Cellulose',
    cost: 0.02,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Generic Supplier',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'ing003',
    name: 'Magnesium Stearate',
    cost: 0.01,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Generic Supplier',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'ing004',
    name: 'Talc Powder',
    cost: 0.01,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Generic Supplier',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },

  // Capsule Excipients
  {
    id: 'ing006',
    name: 'Gelatin Caps',
    cost: 0.02,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Generic Supplier',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'ing007',
    name: 'Talc Powder (Capsule Grade)',
    cost: 0.01,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Generic Supplier',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'ing008',
    name: 'Magnesium Stearate (Capsule Grade)',
    cost: 0.01,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Generic Supplier',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },

  // Suspension Excipients
  {
    id: 'ing010',
    name: 'Lactose Monohydrate',
    cost: 0.01,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Generic Supplier',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'ing011',
    name: 'Hypromellose (HPMC)',
    cost: 0.02,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Generic Supplier',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'ing012',
    name: 'Sodium Citrate',
    cost: 0.01,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Generic Supplier',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'ing013',
    name: 'Glycerin',
    cost: 0.02,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Generic Supplier',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },

  // Topical (Gel, Cream) Excipients
  {
    id: 'ing020',
    name: 'Carbomer (Gelling Agent)',
    cost: 0.02,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Generic Supplier',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'ing021',
    name: 'Propylene Glycol',
    cost: 0.02,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Generic Supplier',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },

  // Inhaler Excipients
  {
    id: 'ing030',
    name: 'Propellant',
    cost: 0.05,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Generic Supplier',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'ing031',
    name: 'Ethanol',
    cost: 0.02,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Generic Supplier',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },

  // Extended Release Form
  {
    id: 'ing040',
    name: 'Hypromellose (Extended-Release Matrix)',
    cost: 0.03,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Generic Supplier',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },

  // Flavoring
  {
    id: 'ing050',
    name: 'Flavoring Agent',
    cost: 0.01,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Generic Supplier',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },

  // Sterile (Injectable) Excipients
  {
    id: 'ing060',
    name: 'Sterile Water for Injection',
    cost: 0.01,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Generic Supplier',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'ing061',
    name: 'pH Adjuster (NaOH/HCl)',
    cost: 0.01,
    inventory: 50000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Generic Supplier',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  },
  {
    id: 'ing062',
    name: 'Stabilizing Agent',
    cost: 0.01,
    inventory: 5000,
    autoOrderThreshold: 0,
    autoOrderAmount: 0,
    leadTime: 1,
    supplier: 'Generic Supplier',
    bulkDiscounts: [
      { minQuantity: 50, discount: 0.05 },
      { minQuantity: 100, discount: 0.10 },
      { minQuantity: 150, discount: 0.15 },
      { minQuantity: 500, discount: 0.20 },
      { minQuantity: 1000, discount: 0.25 }
    ]
  }
];

// --------------------------------------------------------
// Helper Function to Calculate Material Cost with Discounts
// --------------------------------------------------------
window.calculateMaterialCost = function(materialId, quantity) {
  const material = window.materialsData.find(m => m.id === materialId);
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
  totalCost *= (1 - discount);

  return totalCost;
}