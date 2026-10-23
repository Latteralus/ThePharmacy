// /js/data/equipment.js
//
// Lab equipment. Products list what they need (Product.equipmentNeeded);
// production.ts only compounds a product when all of it is owned and not
// broken. capacity is how many compounds one unit handles at a time. Each
// unit takes floor space in the lab (Phase 10, #11): a bench-top item a
// couple of square feet, a floor-standing machine 15-40 with its working
// room. Buying refuses what won't fit (building.ts). Today's sterile items
// stand in the lab too; Phase 11's equipment list moves sterile work into a
// cleanroom. Research (research.ts) decides which items can be bought. Only
// items some product needs are here: nine that no product used were
// removed in Phase 7.

window.equipmentData = [
    {
        id: 'eq001',
        name: 'Mortar and Pestle',
        cost: 500,
        owned: 1,
        durability: 100, // condition, 0-100 (0 is broken)
        capacity: 1, // compounds one unit handles at a time
        autoPurchaseThreshold: 0, // if owned < this, auto-buy
        autoPurchaseAmount: 0, // how many to buy when auto-purchase triggers
        zone: 'lab', // where it goes in the building (building.ts)
        sqft: 2, // floor space, with room to work around it
    },
    {
        id: 'eq002',
        name: 'Tablet Press',
        cost: 7500,
        owned: 1,
        durability: 100,
        capacity: 1,
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        zone: 'lab',
        sqft: 25,
    },
    {
        id: 'eq003',
        name: 'Powder Blender',
        cost: 4000,
        owned: 1,
        durability: 100,
        capacity: 1,
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        zone: 'lab',
        sqft: 20,
    },
    {
        id: 'eq004',
        name: 'Capsule Filler',
        cost: 6000,
        owned: 0,
        durability: 100,
        capacity: 1,
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        zone: 'lab',
        sqft: 12,
    },
    {
        id: 'eq005',
        name: 'Magnetic Stirrer',
        cost: 1500,
        owned: 0,
        durability: 100,
        capacity: 1,
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        zone: 'lab',
        sqft: 3,
    },
    {
        id: 'eq006',
        name: 'Measuring Cylinders',
        cost: 200,
        owned: 0,
        durability: 100,
        capacity: 1,
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        zone: 'lab',
        sqft: 2,
    },
    {
        id: 'eq007',
        name: 'Suspension Mixer',
        cost: 3500,
        owned: 0,
        durability: 100,
        capacity: 1,
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        zone: 'lab',
        sqft: 15,
    },
    {
        id: 'eq008',
        name: 'Syrup Mixer',
        cost: 3000,
        owned: 0,
        durability: 100,
        capacity: 1,
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        zone: 'lab',
        sqft: 15,
    },
    {
        id: 'eq013',
        name: 'Spatula',
        cost: 50,
        owned: 0,
        durability: 100,
        capacity: 1,
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        zone: 'lab',
        sqft: 1,
    },
    {
        id: 'eq015',
        name: 'Sterile Mixing Equipment',
        cost: 12000,
        owned: 0,
        durability: 100,
        capacity: 1,
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        zone: 'lab',
        sqft: 30,
    },
    {
        id: 'eq016',
        name: 'Autoclave',
        cost: 9000,
        owned: 0,
        durability: 100,
        capacity: 1,
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        zone: 'lab',
        sqft: 15,
    },
    {
        id: 'eq017',
        name: 'Gel Mixer',
        cost: 4000,
        owned: 0,
        durability: 100,
        capacity: 1,
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        zone: 'lab',
        sqft: 12,
    },
    {
        id: 'eq019',
        name: 'Inhaler Filling Machine',
        cost: 15000,
        owned: 0,
        durability: 100,
        capacity: 1,
        autoPurchaseThreshold: 0,
        autoPurchaseAmount: 0,
        zone: 'lab',
        sqft: 40,
    },
];
