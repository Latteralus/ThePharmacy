// /js/data/helpers.js

window.helpers = {
    // Calculates how many units of a product can be made based on available materials
    calculatePotentialProduction(productId: string): number {
        const product = window.productsData.find((p) => p.id === productId);
        if (!product) {
            console.error('Product not found:', productId);
            return 0;
        }

        let maxPossible = Infinity; // Start with a very large number

        product.ingredients.forEach((ingredient) => {
            const material = window.materialsData.find((m) => m.id === ingredient.id);
            if (!material) {
                console.error('Material not found:', ingredient.id);
                maxPossible = 0; // Set to 0 if a required material is not found
                return; // Exit early
            }

            const possibleFromThisMaterial = Math.floor(material.inventory / ingredient.quantity);
            maxPossible = Math.min(maxPossible, possibleFromThisMaterial);
        });

        return maxPossible;
    },

    // Calculates the materials needed to make a specified quantity of a product
    calculateMaterialsNeeded(productId: string, quantity: number): Record<string, number> {
        const product = window.productsData.find((p) => p.id === productId);
        if (!product) {
            console.error('Product not found:', productId);
            return {};
        }

        const materialsNeeded: Record<string, number> = {};
        product.ingredients.forEach((ingredient) => {
            materialsNeeded[ingredient.id] = ingredient.quantity * quantity;
        });

        return materialsNeeded;
    },

    // Helper function to calculate the total cost of an order
    calculateOrderCost(materialsNeeded: Record<string, number>): number {
        let totalCost = 0;
        for (const materialId in materialsNeeded) {
            totalCost += window.calculateMaterialCost(materialId, materialsNeeded[materialId]);
        }
        return totalCost;
    },

    // New helper function to calculate starting wages based on role and skill level
    calculateStartingWage(role: string, skillLevel: string): number {
        let minWage: number = NaN,
            maxWage: number = NaN;

        if (role === 'Pharmacist') {
            if (skillLevel === 'Novice') {
                minWage = 89980;
                maxWage = 125860;
            } else if (skillLevel === 'Intermediate') {
                minWage = 125860;
                maxWage = 155550;
            } else if (skillLevel === 'Skilled') {
                minWage = 155550;
                maxWage = 168650;
            }
        } else if (role === 'Lab Technician') {
            if (skillLevel === 'Novice') {
                minWage = 32720;
                maxWage = 36290;
            } else if (skillLevel === 'Intermediate') {
                minWage = 36290;
                maxWage = 47680;
            } else if (skillLevel === 'Skilled') {
                minWage = 47680;
                maxWage = 57130;
            }
        } else if (role === 'Cashier') {
            if (skillLevel === 'Novice') {
                minWage = 50000;
                maxWage = 60000;
            } else if (skillLevel === 'Intermediate') {
                minWage = 60000;
                maxWage = 70000;
            } else if (skillLevel === 'Skilled') {
                minWage = 70000;
                maxWage = 90000;
            }
        }

        // Return a random wage within the calculated range, or a default value
        return Math.floor(Math.random() * (maxWage - minWage + 1)) + minWage || 60000;
    },

    // New helper function to generate a new employee ID
    generateNewEmployeeId(): string {
        return window.nextId('emp');
    },

    // Use functions from names.js to generate names
    generateFirstName(): string {
        return window.getRandomFirstName();
    },

    generateLastName(): string {
        return window.getRandomLastName();
    },
};
