/**
 * @fileoverview This file manages the game's inventory system.
 * It handles the storage, retrieval, and manipulation of various resources,
 * including drugs, materials, and other items. It also contains the materials data, and
 * the function to calculate the materials cost.
 */

const inventory = {
    resources: [],

    addResource(resource) {
        const existingResource = this.resources.find(r => r.id === resource.id);
        if (existingResource) {
            existingResource.quantity += resource.quantity;
        } else {
            this.resources.push({ ...resource });
        }
    },

    setResourcePrice(resourceId, price) {
        const resource = this.resources.find(r => r.id === resourceId);
        if (resource) {
            resource.price = price;
        }
    },

    sellResource(resourceId, quantity) {
        const resource = this.resources.find(r => r.id === resourceId);
        if (resource && resource.quantity >= quantity) {
            resource.quantity -= quantity;
            return resource.price * quantity;
        }
        return 0; // Insufficient stock
    },

    addMaterial(material) {
      this.addResource(material);
    },

    // --------------------------------------------------------
    // Helper Function to Calculate Material Cost with Discounts
    // --------------------------------------------------------
    calculateMaterialCost : function(materialId, quantity) {
      const material = this.resources.find(m => m.id === materialId);
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
    },
    
    materialsData: [
      // =============================
      // ACTIVE INGREDIENTS (mat###)
      // =============================
      {
        id: 'mat001',
        name: 'Acetaminophen Base',
        cost: 1.50,
        quantity: 50000,
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
        quantity: 50000,
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
        quantity: 50000,
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
        quantity: 50000,
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
        quantity: 50000,
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
        quantity: 50000,
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
        quantity: 50000,
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
        quantity: 50000,
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
        quantity: 50000,
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
        quantity: 50000,
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
    ]

};

export default inventory;
        }
        return 0; // Insufficient stock
    },
};

export default inventory;
