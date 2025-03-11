// /js/data/equipment.js

window.equipmentData = [
    {
        id: 'eq001',
        name: 'Mortar and Pestle',
        cost: 500,
        owned: 1,
        durability: 100,             // starts at 100, degrade over time
        capacity: 1,                // can only handle 1 task at a time
        autoPurchaseThreshold: 0,    // if owned < this, auto-buy
        autoPurchaseAmount: 0,       // how many to buy when auto-purchase triggers
        researchLevelRequired: 0,
        workerType: "technician",
        dosageForms: ["liquid", "cream", "ointment"],
        isUnlocked: function() { // Check if research level is high enough
            return window.researchData.currentLevel >= this.researchLevelRequired;
        }
    },
    {
        id: 'eq002',
        name: 'Tablet Press',
        cost: 7500,
        owned: 1,
        durability: 100,
        capacity: 1,                // Number of workers that can use it at once
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        researchLevelRequired: 0,
        workerType: "technician",
        dosageForms: ["tablet"],
        isUnlocked: function() {
            return window.researchData.currentLevel >= this.researchLevelRequired;
        }
    },
    {
        id: 'eq003',
        name: 'Powder Blender',
        cost: 4000,
        owned: 1,
        durability: 100,
        capacity: 1,                // Number of workers that can use it at once
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        researchLevelRequired: 0,
        workerType: "technician",
        dosageForms: ["tablet", "capsule"],
        isUnlocked: function() {
            return window.researchData.currentLevel >= this.researchLevelRequired;
        }
    },
    {
        id: 'eq004',
        name: 'Capsule Filler',
        cost: 6000,
        owned: 0,
        durability: 100,
        capacity: 1,                // Number of workers that can use it at once
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        researchLevelRequired: 0,
        workerType: "technician",
        dosageForms: ["capsule"],
        isUnlocked: function() {
            return window.researchData.currentLevel >= this.researchLevelRequired;
        }
    },
    {
        id: 'eq005',
        name: 'Magnetic Stirrer',
        cost: 1500,
        owned: 0,
        durability: 100,
        capacity: 1,                // Number of workers that can use it at once
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        researchLevelRequired: 0,
        workerType: "technician",
        dosageForms: ["liquid", "suspension", "syrup"],
        isUnlocked: function() {
            return window.researchData.currentLevel >= this.researchLevelRequired;
        }
    },
    {
        id: 'eq006',
        name: 'Measuring Cylinders',
        cost: 200,
        owned: 0,
        durability: 100,
        capacity: 1,                // Number of workers that can use it at once
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        researchLevelRequired: 0,
        workerType: "technician",
        dosageForms: ["liquid", "suspension", "syrup", "injectable"],
        isUnlocked: function() {
            return window.researchData.currentLevel >= this.researchLevelRequired;
        }
    },
    {
        id: 'eq007',
        name: 'Suspension Mixer',
        cost: 3500,
        owned: 0,
        durability: 100,
        capacity: 1,                // Number of workers that can use it at once
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        researchLevelRequired: 1,
        workerType: "technician",
        dosageForms: ["suspension"],
        isUnlocked: function() {
            return window.researchData.currentLevel >= this.researchLevelRequired;
        }
    },
    {
        id: 'eq008',
        name: 'Syrup Mixer',
        cost: 3000,
        owned: 0,
        durability: 100,
        capacity: 1,                // Number of workers that can use it at once
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        researchLevelRequired: 0,
        workerType: "technician",
        dosageForms: ["syrup"],
        isUnlocked: function() {
            return window.researchData.currentLevel >= this.researchLevelRequired;
        }
    },
    {
        id: 'eq009',
        name: 'Coating Pan',
        cost: 8000,
        owned: 0,
        durability: 100,
        capacity: 1,                // Number of workers that can use it at once
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        researchLevelRequired: 1,
        workerType: "technician",
        dosageForms: ["tablet"],
        isUnlocked: function() {
            return window.researchData.currentLevel >= this.researchLevelRequired;
        }
    },
    {
        id: 'eq010',
        name: 'Oil Mixer',
        cost: 2500,
        owned: 0,
        durability: 100,
        capacity: 1,                // Number of workers that can use it at once
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        researchLevelRequired: 2,
        workerType: "technician",
        dosageForms: ["oil", "lotion"],
        isUnlocked: function() {
            return window.researchData.currentLevel >= this.researchLevelRequired;
        }
    },
    {
        id: 'eq011',
        name: 'Capsule Filling Machine',
        cost: 10000,
        owned: 0,
        durability: 100,
        capacity: 1,                // Number of workers that can use it at once
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        researchLevelRequired: 1,
        workerType: "technician",
        dosageForms: ["capsule"],
        isUnlocked: function() {
            return window.researchData.currentLevel >= this.researchLevelRequired;
        }
    },
    {
        id: 'eq012',
        name: 'Cream Mixer',
        cost: 4500,
        owned: 0,
        durability: 100,
        capacity: 1,                // Number of workers that can use it at once
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        researchLevelRequired: 2,
        workerType: "technician",
        dosageForms: ["cream"],
        isUnlocked: function() {
            return window.researchData.currentLevel >= this.researchLevelRequired;
        }
    },
    {
        id: 'eq013',
        name: 'Spatula',
        cost: 50,
        owned: 0,
        durability: 100,
        capacity: 1, // a single spatula is used by one person at a time
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        researchLevelRequired: 0,
        workerType: "technician",
        dosageForms: ["cream", "ointment", "gel"],
        isUnlocked: function() {
            return window.researchData.currentLevel >= this.researchLevelRequired;
        }
    },
    {
        id: 'eq014',
        name: 'Ointment Mill',
        cost: 5500,
        owned: 0,
        durability: 100,
        capacity: 1,                // Number of workers that can use it at once
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        researchLevelRequired: 2,
        workerType: "technician",
        dosageForms: ["ointment"],
        isUnlocked: function() {
            return window.researchData.currentLevel >= this.researchLevelRequired;
        }
    },
    {
        id: 'eq015',
        name: 'Sterile Mixing Equipment',
        cost: 12000,
        owned: 0,
        durability: 100,
        capacity: 1,                // Number of workers that can use it at once
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        researchLevelRequired: 3,
        workerType: "technician",
        dosageForms: ["injectable", "eye drops"],
        isUnlocked: function() {
            return window.researchData.currentLevel >= this.researchLevelRequired;
        }
    },
    {
        id: 'eq016',
        name: 'Autoclave',
        cost: 9000,
        owned: 0,
        durability: 100,
        capacity: 1,                // Number of workers that can use it at once
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        researchLevelRequired: 3,
        workerType: "technician",
        dosageForms: ["injectable", "eye drops"],
        isUnlocked: function() {
            return window.researchData.currentLevel >= this.researchLevelRequired;
        }
    },
    {
        id: 'eq017',
        name: 'Gel Mixer',
        cost: 4000,
        owned: 0,
        durability: 100,
        capacity: 1,                // Number of workers that can use it at once
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        researchLevelRequired: 2,
        workerType: "technician",
        dosageForms: ["gel"],
        isUnlocked: function() {
            return window.researchData.currentLevel >= this.researchLevelRequired;
        }
    },
    {
        id: 'eq018',
        name: 'Lotion Mixer',
        cost: 3500,
        owned: 0,
        durability: 100,
        capacity: 1,                // Number of workers that can use it at once
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        researchLevelRequired: 4,
        workerType: "technician",
        dosageForms: ["lotion"],
        isUnlocked: function() {
            return window.researchData.currentLevel >= this.researchLevelRequired;
        }
    },
    {
        id: 'eq019',
        name: 'Inhaler Filling Machine',
        cost: 15000,
        owned: 0,
        durability: 100,
        capacity: 1,                // Number of workers that can use it at once
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        researchLevelRequired: 5,
        workerType: "technician",
        dosageForms: ["inhaler"],
        isUnlocked: function() {
            return window.researchData.currentLevel >= this.researchLevelRequired;
        }
    },
    {
        id: 'eq020',
        name: 'Nasal Spray Filling Machine',
        cost: 11000,
        owned: 0,
        durability: 100,
        capacity: 1,                // Number of workers that can use it at once
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        researchLevelRequired: 5,
        workerType: "technician",
        dosageForms: ["nasal spray"],
        isUnlocked: function() {
            return window.researchData.currentLevel >= this.researchLevelRequired;
        }
    },
    {
        id: 'eq021',
        name: 'Powder Mixer',
        cost: 2000,
        owned: 0,
        durability: 100,
        capacity: 1,                // Number of workers that can use it at once
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        researchLevelRequired: 6,
        workerType: "technician",
        dosageForms: ["powder"],
        isUnlocked: function() {
            return window.researchData.currentLevel >= this.researchLevelRequired;
        }
    },
    {
        id: 'eq022',
        name: 'Packaging Equipment',
        cost: 6000,
        owned: 0,
        durability: 100,
        capacity: 1,                // Number of workers that can use it at once
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        researchLevelRequired: 6,
        workerType: "technician",
        dosageForms: ["tablet", "capsule", "liquid", "cream", "ointment", "gel", "powder", "inhaler", "nasal spray", "lotion", "syrup", "suspension"],
        isUnlocked: function() {
            return window.researchData.currentLevel >= this.researchLevelRequired;
        }
    }
];