/**
 * @fileoverview This file handles the production of "compound" products in the game. 
 * It manages the process of creating products from their ingredients, 
 * checking material availability from the inventory, and creating production tasks.
 * Now uses the functions and data from the inventory.js file.
 */
(function() {
    // Function to check if a product can be compounded based on material availability
    function canCompound(product) {
        if (!product) return false;
  
        for (let ingredient of product.ingredients) {
            const material = window.inventory.materialsData.find(m => m.id === ingredient.id);
            if (!material || material.quantity < ingredient.quantity) {
                console.log(`[production.js] Not enough ${material ? material.name : 'unknown material'} to compound ${product.name}`);
                return false;
            }
        }
        return true;
    }
  
    // Function to create a compound task for a product
    function createCompoundTask(product, quantity) {
        // Calculate the reduced time (half of the original)
        const originalTime = product.productionTime;
        const reducedTime = Math.max(Math.ceil(originalTime / 2), 1); // Ensure minimum of 1 minute
        
        const compoundTask = {
            id: `compound-${product.id}`, // Removed timestamp
            type: 'compound',
            productId: product.id,
            productName: product.name,
            totalTime: reducedTime, // Use the reduced time (half of original)
            progress: 0,
            roleNeeded: 'Lab Technician',
            status: 'pending',
            assignedTo: null,
            quantityToMake: quantity // How many to compound
        };
  
        window.taskManager.addTask(compoundTask);
        console.log(`[production.js] Created compound task for ${quantity} ${product.name} (Task ID: ${compoundTask.id}), time reduced from ${originalTime} to ${reducedTime} minutes`);
        
        return compoundTask;
    }
  
    // Function to check inventory and create compound tasks if needed
    function checkAndCreateCompoundTasks() {
        console.log("[production.js] Checking inventory for compounding tasks...");
        window.productsData.forEach(product => {
            // Skip if there's already a pending or in-progress compound task for this product
            const existingCompoundTask = window.taskManager.tasks.find(
                t => t.type === 'compound' && t.productId === product.id && t.status !== 'completed'
            );
            if (existingCompoundTask) {
                console.log(`[production.js] Existing compound task found for ${product.name}, skipping.`); // EXISTING LOG
                return;
            } else { // ADDED LOGGING - No existing task
                console.log(`[production.js] No existing compound task found for ${product.name}, checking inventory...`); // ADDED LOG
            }
  
            // Check if inventory is below the threshold
            if (product.inventory < product.maxInventory) {
                const quantityToMake = product.maxInventory - product.inventory;
                if (canCompound(product)) {
                    createCompoundTask(product, quantityToMake);
                    console.log(`[production.js] Created compound task for ${product.name}, quantity: ${quantityToMake}`); // ADDED LOG - Task creation
                } else {
                    console.warn(`[production.js] Cannot create compound task for ${product.name} due to insufficient materials.`); // EXISTING LOG
                    
                    // Log material shortage details
                    for (let ingredient of product.ingredients) {
                        const material = window.inventory.materialsData.find(m => m.id === ingredient.id);
                        if (!material || material.quantity < ingredient.quantity) {
                            console.log(`[production.js] Material shortage: ${material ? material.name : 'unknown material'}, needed: ${ingredient.quantity}, available: ${material ? material.inventory : 0}`); // ADDED LOG - Material shortage
                        }
                    }
  
                }
            } else { // ADDED LOGGING - Inventory not below threshold
                console.log(`[production.js] Inventory for ${product.name} is NOT below maxInventory, skipping compound task creation.`); // ADDED LOG
            }
        });
    }
  
    // Function to handle task completion (called by taskManager when a task is finalized)
    function handleTaskCompletion(task) {
        if (task.type === 'compound') {
            const product = window.productsData.find(p => p.id === task.productId);
            if (product) {
                // Deduct materials used in compounding
                product.ingredients.forEach(ingredient => {
                    const material = window.inventory.materialsData.find(m => m.id === ingredient.id);
                    if (material) {
                        material.quantity -= ingredient.quantity * task.quantityToMake;
                    }
                });
    
                // Increase product inventory
                product.inventory += task.quantityToMake;
                console.log(`[production.js] Compounding completed for ${task.quantityToMake} units of ${product.name}. Inventory updated.`);
                
                // Check if updateUI function exists before calling it
                if (typeof window.updateUI === 'function') {
                    window.updateUI('inventory');
                } else {
                    console.log("[production.js] window.updateUI function not found. Inventory UI may need manual refresh.");
                    
                    // Fallback UI update methods
                    if (typeof window.ui !== 'undefined' && typeof window.ui.updateInventory === 'function') {
                        window.ui.updateInventory();
                    } else if (typeof window.updateInventoryDisplay === 'function') {
                        window.updateInventoryDisplay();
                    } else if (window.currentPage === 'inventory' && typeof window.renderInventoryPage === 'function') {
                        const mainContent = document.querySelector('.main-content');
                        if (mainContent) {
                            window.renderInventoryPage(mainContent);
                        }
                    }
                    
                    // Dispatch a custom event for any listeners
                    try {
                        document.dispatchEvent(new CustomEvent('inventoryUpdated'));
                    } catch (error) {
                        console.error('[production.js] Error dispatching inventoryUpdated event:', error);
                    }
                }
    
                // Check if this compound task was for a prescription
                if (task.prescriptionId) {
                    console.log(`[production.js] Compound task ${task.id} was for prescription ${task.prescriptionId}. Creating fill task.`);
                    const prescription = window.prescriptions.getPrescription(task.prescriptionId);
                    if (prescription) {
                        window.prescriptions.createFillTaskForPrescription(prescription);
                    } else {
                        console.error(`[production.js] Prescription ${task.prescriptionId} not found for compound task ${task.id}`);
                    }
                }
            }
        } else if (task.type === 'fillPrescription') {
            const product = window.productsData.find(p => p.id === task.productId);
            if (product) {
                // Decrease product inventory as it's used to fill prescriptions
                product.inventory -= task.quantityNeeded;
                console.log(`[production.js] ${task.quantityNeeded} units of ${product.name} used to fill prescription. Inventory updated.`);
                
                // Check if updateUI function exists before calling it
                if (typeof window.updateUI === 'function') {
                    window.updateUI('inventory');
                } else {
                    console.log("[production.js] window.updateUI function not found. Inventory UI may need manual refresh.");
                    
                    // Fallback UI update methods
                    if (typeof window.ui !== 'undefined' && typeof window.ui.updateInventory === 'function') {
                        window.ui.updateInventory();
                    } else if (typeof window.updateInventoryDisplay === 'function') {
                        window.updateInventoryDisplay();
                    } else if (window.currentPage === 'inventory' && typeof window.renderInventoryPage === 'function') {
                        const mainContent = document.querySelector('.main-content');
                        if (mainContent) {
                            window.renderInventoryPage(mainContent);
                        }
                    }
                    
                    // Dispatch a custom event for any listeners
                    try {
                        document.dispatchEvent(new CustomEvent('inventoryUpdated'));
                    } catch (error) {
                        console.error('[production.js] Error dispatching inventoryUpdated event:', error);
                    }
                }
            }
        }
    }
  
    // Initialize the production module
    function init() {
        // Perform an initial check and creation of compound tasks when the game starts
        checkAndCreateCompoundTasks();
  
        // Set an interval to periodically check and create compound tasks
        setInterval(checkAndCreateCompoundTasks, 60000); // Check every minute, for example
        
        console.log("[production.js] Production system initialized with 50% reduced compounding times");
    }
  
    return {
        canCompound,
        createCompoundTask, // Expose this if you need to manually create compound tasks
        checkAndCreateCompoundTasks, // Expose this if you want to manually trigger inventory checks
        handleTaskCompletion,
        init
    };
  
}());
