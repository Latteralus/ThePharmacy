// /js/data/helpers.js

// Market pay by role at key skill 40 and 90 (see helpers.fairSalary).
const ROLE_PAY: Record<string, { atSkill40: number; atSkill90: number }> = {
    Pharmacist: { atSkill40: 101000, atSkill90: 169000 },
    'Lab Technician': { atSkill40: 33500, atSkill90: 53700 },
    Cashier: { atSkill40: 27750, atSkill90: 41500 },
};

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
            // BLS, May 2024: $35,100 at the 10th percentile, $43,460 median,
            // $59,450 at the 90th
            if (skillLevel === 'Novice') {
                minWage = 35100;
                maxWage = 40000;
            } else if (skillLevel === 'Intermediate') {
                minWage = 40000;
                maxWage = 48000;
            } else if (skillLevel === 'Skilled') {
                minWage = 48000;
                maxWage = 59450;
            }
        } else if (role === 'Cashier') {
            // Cashiers used to be paid $50-90k, more than lab technicians (L9).
            if (skillLevel === 'Novice') {
                minWage = 28000;
                maxWage = 33000;
            } else if (skillLevel === 'Intermediate') {
                minWage = 33000;
                maxWage = 38000;
            } else if (skillLevel === 'Skilled') {
                minWage = 38000;
                maxWage = 45000;
            }
        }

        // Return a random wage within the calculated range, or a default value
        return Math.floor(Math.random() * (maxWage - minWage + 1)) + minWage || 60000;
    },

    // The skill a role is hired for, 0-100: what its market pay follows.
    keySkill(employee: Employee): number {
        const skills = employee.skills;
        if (!skills) return 50;
        if (employee.role === 'Pharmacist') return (skills.dispensing + skills.customerService) / 2;
        if (employee.role === 'Lab Technician') return skills.compounding;
        return skills.customerService;
    },

    // What the market pays for this role at this key skill, a year. A
    // straight line through the middle of calculateStartingWage's ranges at
    // the key skill hireEmployee gives each experience level, so a new hire
    // is paid about fairly. Employees compare their salary with this every
    // night (employees.endOfDay).
    fairSalary(employee: Employee): number {
        const pay = ROLE_PAY[employee.role] ?? ROLE_PAY.Cashier;
        const t = Math.min(1, Math.max(0, (this.keySkill(employee) - 40) / 50));
        return Math.round(pay.atSkill40 + (pay.atSkill90 - pay.atSkill40) * t);
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
