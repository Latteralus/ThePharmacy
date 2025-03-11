// /js/data/helpers.js

window.helpers = {
    // Calculates how many units of a product can be made based on available materials
    calculatePotentialProduction: function(productId) {
        const product = window.productsData.find(p => p.id === productId);
        if (!product) {
            console.error("Product not found:", productId);
            return 0;
        }

        let maxPossible = Infinity; // Start with a very large number

        product.ingredients.forEach(ingredient => {
            const material = window.materialsData.find(m => m.id === ingredient.id);
            if (!material) {
                console.error("Material not found:", ingredient.id);
                maxPossible = 0; // Set to 0 if a required material is not found
                return; // Exit early
            }

            const possibleFromThisMaterial = Math.floor(material.inventory / ingredient.quantity);
            maxPossible = Math.min(maxPossible, possibleFromThisMaterial);
        });

        return maxPossible;
    },

    // Calculates the materials needed to make a specified quantity of a product
    calculateMaterialsNeeded: function(productId, quantity) {
        const product = window.productsData.find(p => p.id === productId);
        if (!product) {
            console.error("Product not found:", productId);
            return {};
        }

        const materialsNeeded = {};
        product.ingredients.forEach(ingredient => {
            materialsNeeded[ingredient.id] = ingredient.quantity * quantity;
        });

        return materialsNeeded;
    },

    // Handles ordering materials for a product
    orderMaterialsForProduct: function(productId, quantity) {
        if (isNaN(quantity) || quantity <= 0) {
            alert("Please enter a valid quantity.");
            return;
        }

        const materialsNeeded = this.calculateMaterialsNeeded(productId, quantity);
        const totalCost = this.calculateOrderCost(materialsNeeded);

        if (totalCost > window.financesData.cash) {
            alert("Not enough cash to complete the order.");
            return;
        }

        // Deduct cost from cash
        window.financesData.cash -= totalCost;

        // Update material inventory
        for (const materialId in materialsNeeded) {
            const material = window.materialsData.find(m => m.id === materialId);
            if (material) {
                material.inventory += materialsNeeded[materialId];
            }
        }

        // Add transaction record
        window.finances.addTransaction({
            date: new Date(window.gameState.currentDate),
            type: 'expense',
            category: 'materials',
            amount: totalCost,
            description: `Ordered materials for ${quantity} x ${productId}`
        });

        // Update UI
        window.updateUI("inventory");
        window.updateUI("finances");

        // Display success message
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.textContent = `Successfully ordered materials for ${quantity} units of product ${productId}. Cost: $${totalCost.toFixed(2)}`;
        document.querySelector('.inventory-page-container').appendChild(successMessage);

        // Optional: Remove the message after a few seconds
        setTimeout(() => {
            successMessage.remove();
        }, 5000);
    },

    // Helper function to calculate the total cost of an order
    calculateOrderCost: function(materialsNeeded) {
        let totalCost = 0;
        for (const materialId in materialsNeeded) {
            const material = window.materialsData.find(m => m.id === materialId);
            if (material) {
                totalCost += material.cost * materialsNeeded[materialId];
            }
        }
        return totalCost;
    },

    // New helper function to calculate starting wages based on role and skill level
    calculateStartingWage: function(role, skillLevel) {
        let minWage, maxWage;

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
        } else if (role === 'Sales Rep') {
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
    generateNewEmployeeId: function() {
        return `emp${Date.now()}`;
    },

    // Use functions from names.js to generate names
    generateFirstName: function() {
        return window.getRandomFirstName();
    },

    generateLastName: function() {
        return window.getRandomLastName();
    }
};