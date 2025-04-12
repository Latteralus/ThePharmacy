/**
 * @fileoverview This file contains the data for the products in the game,
 * along with helper functions to manage product data.
 */
// /js/data/products.js

// --------------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------------

const products = {
    calculateProductCostHelper: function (productId) {
        const product = products.productsData.find(p => p.id === productId);
        if (!product) {
            console.error(`Product not found: ${productId}`);
            return 0; // Or handle error appropriately
        }
        let totalCost = 0;
        product.ingredients.forEach(ingredient => {
            totalCost += window.inventory.calculateMaterialCost(ingredient.id, ingredient.quantity);
        });

        return totalCost;
    },
    // --------------------------------------------------------
    // PRODUCTS DATA
    // --------------------------------------------------------
    productsData: [
        {
            id: 'pd001',
            name: 'Acetaminophen Tablet',
            description: 'Pain relief and fever reduction.',
            cost: 0, // Placeholder, will be calculated
            suggestedPrice: 0, // Placeholder, will be calculated
            price: 0,          // Placeholder, will be calculated or set by player
            dosageForm: 'tablet',
            ingredients: [
                { id: 'mat001', quantity: 100 }, // Acetaminophen Base
                { id: 'ing002', quantity: 50 },  // Microcrystalline Cellulose
                { id: 'ing003', quantity: 10 },  // Magnesium Stearate
                { id: 'ing004', quantity: 5 }    // Talc Powder
            ],
            equipmentNeeded: ['eq001', 'eq002', 'eq003'], // Mortar & Pestle, Tablet Press, Powder Blender
            productionTime: 15,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd002',
            name: 'Ibuprofen Capsule',
            description: 'Pain and inflammation relief.',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'capsule',
            ingredients: [
                { id: 'mat002', quantity: 200 }, // Ibuprofen Powder
                { id: 'ing006', quantity: 50 },  // Gelatin Caps
                { id: 'ing007', quantity: 10 },  // Talc Powder
                { id: 'ing008', quantity: 5 }    // Magnesium Stearate
            ],
            equipmentNeeded: ['eq004', 'eq003', 'eq001'], // Capsule Filler, Powder Blender, Mortar & Pestle
            productionTime: 20,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd003',
            name: 'Amoxicillin Suspension',
            description: 'Antibiotic for bacterial infections.',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'suspension',
            ingredients: [
                { id: 'mat003', quantity: 100 }, // Amoxicillin Trihydrate
                { id: 'ing010', quantity: 50 },  // Lactose Monohydrate
                { id: 'ing011', quantity: 20 },  // Hypromellose (HPMC)
                { id: 'ing012', quantity: 10 },  // Sodium Citrate
                { id: 'ing013', quantity: 15 }   // Glycerin
            ],
            equipmentNeeded: ['eq005', 'eq006', 'eq007'], // Magnetic Stirrer, Measuring Cylinders, Suspension Mixer
            productionTime: 25,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd004',
            name: 'Metformin Tablet',
            description: 'Helps control blood sugar in Type 2 diabetes.',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'tablet',
            ingredients: [
                { id: 'mat004', quantity: 100 }, // Metformin Hydrochloride
                { id: 'ing002', quantity: 40 },  // Microcrystalline Cellulose
                { id: 'ing003', quantity: 10 },  // Magnesium Stearate
                { id: 'ing004', quantity: 5 }    // Talc Powder
            ],
            equipmentNeeded: ['eq001', 'eq002', 'eq003'],
            productionTime: 15,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd005',
            name: 'Omeprazole Capsule',
            description: 'Reduces stomach acid production (GERD).',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'capsule',
            ingredients: [
                { id: 'mat005', quantity: 100 }, // Omeprazole Base
                { id: 'ing006', quantity: 50 },  // Gelatin Caps
                { id: 'ing007', quantity: 10 },  // Talc Powder
                { id: 'ing008', quantity: 5 }    // Magnesium Stearate
            ],
            equipmentNeeded: ['eq004', 'eq003', 'eq001'],
            productionTime: 20,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd006',
            name: 'Amlodipine Tablet',
            description: 'Controls high blood pressure.',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'tablet',
            ingredients: [
                { id: 'mat006', quantity: 80 },  // Amlodipine Besylate
                { id: 'ing002', quantity: 50 },  // Microcrystalline Cellulose
                { id: 'ing003', quantity: 10 },  // Magnesium Stearate
                { id: 'ing004', quantity: 5 }    // Talc Powder
            ],
            equipmentNeeded: ['eq001', 'eq002', 'eq003'],
            productionTime: 15,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd007',
            name: 'Simvastatin Tablet',
            description: 'Lowers cholesterol and triglycerides.',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'tablet',
            ingredients: [
                { id: 'mat007', quantity: 80 },  // Simvastatin Base
                { id: 'ing002', quantity: 40 },  // Microcrystalline Cellulose
                { id: 'ing003', quantity: 10 },  // Magnesium Stearate
                { id: 'ing004', quantity: 5 }    // Talc Powder
            ],
            equipmentNeeded: ['eq001', 'eq002', 'eq003'],
            productionTime: 18,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd008',
            name: 'Levothyroxine Tablet',
            description: 'Thyroid hormone replacement.',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'tablet',
            ingredients: [
                { id: 'mat008', quantity: 50 },  // Levothyroxine Sodium
                { id: 'ing002', quantity: 30 },  // Microcrystalline Cellulose
                { id: 'ing003', quantity: 10 },  // Magnesium Stearate
                { id: 'ing004', quantity: 5 }    // Talc Powder
            ],
            equipmentNeeded: ['eq001', 'eq002', 'eq003'],
            productionTime: 15,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd009',
            name: 'Losartan Tablet',
            description: 'Lowers high blood pressure (ARB).',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'tablet',
            ingredients: [
                { id: 'mat009', quantity: 90 },  // Losartan Potassium
                { id: 'ing002', quantity: 45 },  // Microcrystalline Cellulose
                { id: 'ing003', quantity: 10 },  // Magnesium Stearate
                { id: 'ing004', quantity: 5 }    // Talc Powder
            ],
            equipmentNeeded: ['eq001', 'eq002', 'eq003'],
            productionTime: 20,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd010',
            name: 'Hydrochlorothiazide Tablet',
            description: 'Diuretic to reduce fluid retention.',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'tablet',
            ingredients: [
                { id: 'mat010', quantity: 70 },  // Hydrochlorothiazide
                { id: 'ing002', quantity: 40 },  // Microcrystalline Cellulose
                { id: 'ing003', quantity: 10 },  // Magnesium Stearate
                { id: 'ing004', quantity: 5 }    // Talc Powder
            ],
            equipmentNeeded: ['eq001', 'eq002', 'eq003'],
            productionTime: 15,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd011',
            name: 'Pantoprazole Tablet',
            description: 'Proton pump inhibitor for GERD.',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'tablet',
            ingredients: [
                { id: 'mat011', quantity: 100 }, // Pantoprazole Sodium
                { id: 'ing002', quantity: 50 },  // Microcrystalline Cellulose
                { id: 'ing003', quantity: 10 },  // Magnesium Stearate
                { id: 'ing004', quantity: 5 }    // Talc Powder
            ],
            equipmentNeeded: ['eq001', 'eq002', 'eq003'],
            productionTime: 20,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd012',
            name: 'Rosuvastatin Tablet',
            description: 'Cholesterol-lowering statin.',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'tablet',
            ingredients: [
                { id: 'mat012', quantity: 80 },  // Rosuvastatin Calcium
                { id: 'ing002', quantity: 40 },  // Microcrystalline Cellulose
                { id: 'ing003', quantity: 10 },  // Magnesium Stearate
                { id: 'ing004', quantity: 5 }    // Talc Powder
            ],
            equipmentNeeded: ['eq001', 'eq002', 'eq003'],
            productionTime: 15,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd013',
            name: 'Clopidogrel Tablet',
            description: 'Reduces blood clotting risk.',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'tablet',
            ingredients: [
                { id: 'mat013', quantity: 70 },  // Clopidogrel Bisulfate
                { id: 'ing002', quantity: 35 },  // Microcrystalline Cellulose
                { id: 'ing003', quantity: 10 },  // Magnesium Stearate
                { id: 'ing004', quantity: 5 }    // Talc Powder
            ],
            equipmentNeeded: ['eq001', 'eq002', 'eq003'],
            productionTime: 20,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd014',
            name: 'Montelukast Tablet',
            description: 'Helps manage asthma and allergies.',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'tablet',
            ingredients: [
                { id: 'mat014', quantity: 50 },  // Montelukast Sodium
                { id: 'ing002', quantity: 40 },  // Microcrystalline Cellulose
                { id: 'ing003', quantity: 10 },  // Magnesium Stearate
                { id: 'ing004', quantity: 5 }    // Talc Powder
            ],
            equipmentNeeded: ['eq001', 'eq002', 'eq003'],
            productionTime: 15,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd015',
            name: 'Sertraline Tablet',
            description: 'SSRI for depression and anxiety.',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'tablet',
            ingredients: [
                { id: 'mat015', quantity: 80 },  // Sertraline Hydrochloride
                { id: 'ing002', quantity: 40 },  // Microcrystalline Cellulose
                { id: 'ing003', quantity: 10 },  // Magnesium Stearate
                { id: 'ing004', quantity: 5 }    // Talc Powder
            ],
            equipmentNeeded: ['eq001', 'eq002', 'eq003'],
            productionTime: 20,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd016',
            name: 'Azithromycin Suspension',
            description: 'Macrolide antibiotic for various infections.',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'suspension',
            ingredients: [
                { id: 'mat016', quantity: 100 }, // Azithromycin Dihydrate
                { id: 'ing010', quantity: 50 },  // Lactose Monohydrate
                { id: 'ing011', quantity: 20 },  // Hypromellose (HPMC)
                { id: 'ing012', quantity: 10 },  // Sodium Citrate
                { id: 'ing013', quantity: 15 }   // Glycerin
            ],
            equipmentNeeded: ['eq005', 'eq006', 'eq007'],
            productionTime: 25,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd017',
            name: 'Diclofenac Gel',
            description: 'Topical NSAID gel for pain and inflammation.',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'gel',
            ingredients: [
                { id: 'mat017', quantity: 70 },  // Diclofenac Sodium
                { id: 'ing020', quantity: 50 },  // Carbomer (gelling agent)
                { id: 'ing021', quantity: 10 },  // Propylene Glycol
                { id: 'ing013', quantity: 5 }    // Glycerin
            ],
            equipmentNeeded: ['eq017', 'eq001', 'eq013'], // Gel Mixer, Mortar & Pestle, Spatula
            productionTime: 15,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd018',
            name: 'Alprazolam Tablet',
            description: 'Benzodiazepine for anxiety and panic disorders.',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'tablet',
            ingredients: [
                { id: 'mat018', quantity: 50 },  // Alprazolam Base
                { id: 'ing002', quantity: 40 },  // Microcrystalline Cellulose
                { id: 'ing003', quantity: 10 },  // Magnesium Stearate
                { id: 'ing004', quantity: 5 }    // Talc Powder
            ],
            equipmentNeeded: ['eq001', 'eq002', 'eq003'],
            productionTime: 25,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd019',
            name: 'Albuterol Inhaler',
            description: 'Bronchodilator for respiratory conditions.',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'inhaler',
            ingredients: [
                { id: 'mat019', quantity: 50 },  // Albuterol Sulfate
                { id: 'ing030', quantity: 30 },  // Propellant
                { id: 'ing031', quantity: 10 }   // Ethanol or other carrier
            ],
            equipmentNeeded: ['eq019', 'eq001', 'eq003'], // Inhaler Filling Machine, Mortar & Pestle, Powder Blender
            productionTime: 30,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd020',
            name: 'Furosemide Tablet',
            description: 'Loop diuretic to reduce excess fluid.',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'tablet',
            ingredients: [
                { id: 'mat020', quantity: 70 },  // Furosemide Base
                { id: 'ing002', quantity: 40 },  // Microcrystalline Cellulose
                { id: 'ing003', quantity: 10 },  // Magnesium Stearate
                { id: 'ing004', quantity: 5 }    // Talc Powder
            ],
            equipmentNeeded: ['eq001', 'eq002', 'eq003'],
            productionTime: 15,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd021',
            name: 'Metformin XR Tablet',
            description: 'Extended-release form of Metformin.',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'tablet',
            ingredients: [
                { id: 'mat004', quantity: 100 },  // Metformin Hydrochloride
                { id: 'ing040', quantity: 50 },   // Hypromellose (Extended-Release)
                { id: 'ing002', quantity: 40 },   // Microcrystalline Cellulose
                { id: 'ing003', quantity: 5 }     // Magnesium Stearate
            ],
            equipmentNeeded: ['eq001', 'eq002', 'eq003'],
            productionTime: 30,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd022',
            name: 'Ibuprofen Suspension (Children’s)',
            description: 'Liquid ibuprofen for pain/fever in children.',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'suspension',
            ingredients: [
                { id: 'mat002', quantity: 80 },  // Ibuprofen Powder
                { id: 'ing010', quantity: 40 },  // Lactose Monohydrate / Sweetener
                { id: 'ing011', quantity: 20 },  // Thickening agent (HPMC)
                { id: 'ing012', quantity: 10 },  // Sodium Citrate
                { id: 'ing013', quantity: 10 }   // Glycerin
            ],
            equipmentNeeded: ['eq005', 'eq006', 'eq007'],
            productionTime: 20,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd023',
            name: 'Omeprazole Syrup',
            description: 'Liquid formulation for patients who can’t swallow capsules.',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'syrup',
            ingredients: [
                { id: 'mat005', quantity: 60 },  // Omeprazole Base
                { id: 'ing010', quantity: 40 },  // Sweetener/Filler
                { id: 'ing011', quantity: 15 },  // Thickening agent
                { id: 'ing013', quantity: 15 },  // Glycerin
                { id: 'ing050', quantity: 5 }    // Flavoring agent
            ],
            equipmentNeeded: ['eq005', 'eq006', 'eq008'], // Magnetic Stirrer, Measuring Cylinders, Syrup Mixer
            productionTime: 25,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd024',
            name: 'Levothyroxine Liquid',
            description: 'Liquid thyroid hormone solution.',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'liquid',
            ingredients: [
                { id: 'mat008', quantity: 40 },  // Levothyroxine Sodium
                { id: 'ing010', quantity: 30 },  // Water/Buffer solution
                { id: 'ing011', quantity: 10 },  // Stabilizing agent
                { id: 'ing050', quantity: 10 }   // Flavoring/sweetener
            ],
            equipmentNeeded: ['eq005', 'eq006'],
            productionTime: 15,
            maxInventory: 5,
            inventory: 0
        },
        {
            id: 'pd025',
            name: 'Pantoprazole Injectable',
            description: 'Sterile IV form of pantoprazole for acid suppression.',
            cost: 0,
            suggestedPrice: 0,
            price: 0,
            dosageForm: 'injectable',
            ingredients: [
                { id: 'mat011', quantity: 80 },  // Pantoprazole Sodium
                { id: 'ing060', quantity: 50 },  // Sterile Water for Injection
                { id: 'ing061', quantity: 10 },  // pH Adjuster (NaOH/HCl)
                { id: 'ing062', quantity: 5 }    // Stabilizing agent
            ],
            equipmentNeeded: ['eq015', 'eq016'], // Sterile Mixing Equipment, Autoclave
            productionTime: 30,
            maxInventory: 5,
            inventory: 0
        }
    ]
};
window.products = products;
