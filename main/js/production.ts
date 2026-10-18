// /js/production.js

window.production = (function (): ProductionApi {
    const DURABILITY_DECAY_PER_USE = 0.5;

    // Wears down the equipment used to make a product by a small flat
    // amount per completed task. Purely informational for now - durability
    // has no gameplay effect yet, it just actually moves instead of
    // sitting at 100 forever.
    function decayEquipmentDurability(equipmentIds: string[]): void {
        equipmentIds.forEach((eqId) => {
            const eq = window.equipmentData.find((e) => e.id === eqId);
            if (eq) {
                eq.durability = Math.max(0, eq.durability - DURABILITY_DECAY_PER_USE);
            }
        });
        window.updateUI('equipment');
    }

    // Making a batch shares its setup: the first unit takes the product's
    // productionTime and each one after it a fifth of that. (Restocks used
    // to take half the time whatever the quantity, so 50 units took as long
    // as one.)
    const EXTRA_UNIT_TIME = 0.2;

    function compoundTime(product: Product, quantity: number): number {
        return Math.max(1, Math.ceil(product.productionTime * (1 + EXTRA_UNIT_TIME * (Math.max(1, quantity) - 1))));
    }

    // Whether the materials on hand cover `quantity` units. Materials held
    // by compounds already under way have left inventory, so they don't count.
    function canCompound(product: Product, quantity = 1): boolean {
        if (!product) return false;
        return product.ingredients.every((ingredient) => {
            const material = window.materialsData.find((m) => m.id === ingredient.id);
            return !!material && material.inventory >= ingredient.quantity * quantity;
        });
    }

    // How many units a compound can start with now. A customer's compound
    // needs exactly its quantity. A restock or Quick Compound makes as many
    // as the materials cover, so a shortage shrinks it instead of leaving it
    // queued (and blocking the next restock) until someone buys materials.
    function startableQuantity(compound: Task, product: Product): number {
        const wanted = compound.quantityToMake ?? 1;
        if (compound.prescriptionId) return canCompound(product, wanted) ? wanted : 0;
        return Math.min(wanted, window.helpers.calculatePotentialProduction(product.id));
    }

    function canStartCompound(compound: Task): boolean {
        if (compound.materialsTaken) return true;
        const product = window.productsData.find((p) => p.id === compound.productId);
        return !!product && startableQuantity(compound, product) >= 1;
    }

    // Takes the whole batch's materials out of inventory when someone starts
    // the compound, so two compounds can't both count on the same stock and
    // inventory can't go negative (H2). True if it already holds them.
    function takeMaterials(compound: Task): boolean {
        if (compound.materialsTaken) return true;
        const product = window.productsData.find((p) => p.id === compound.productId);
        if (!product) return false;

        const quantity = startableQuantity(compound, product);
        if (quantity < 1) return false;
        if (quantity !== compound.quantityToMake) {
            console.log(
                `[production.js] Materials cover ${quantity} of the ${compound.quantityToMake} ${product.name} wanted; making ${quantity}.`,
            );
            compound.quantityToMake = quantity;
            compound.totalTime = compoundTime(product, quantity);
        }

        product.ingredients.forEach((ingredient) => {
            const material = window.materialsData.find((m) => m.id === ingredient.id)!;
            material.inventory -= ingredient.quantity * quantity;
        });
        compound.materialsTaken = true;
        refreshInventoryUI();
        return true;
    }

    // Compound tasks: puts held materials back (the compound was cancelled).
    function returnMaterials(compound: Task): void {
        if (compound.type !== 'compound' || !compound.materialsTaken) return;

        const product = window.productsData.find((p) => p.id === compound.productId);
        if (product) {
            product.ingredients.forEach((ingredient) => {
                const material = window.materialsData.find((m) => m.id === ingredient.id);
                if (material) material.inventory += ingredient.quantity * (compound.quantityToMake ?? 1);
            });
            refreshInventoryUI();
        }
        compound.materialsTaken = false;
    }

    // Function to create a compound task for a product (restocks and the
    // Inventory page's Quick Compound)
    function createCompoundTask(product: Product, quantity: number): Task {
        const compoundTask: Task = {
            id: window.nextId(`compound-${product.id}`),
            type: 'compound',
            productId: product.id,
            productName: product.name,
            totalTime: compoundTime(product, quantity),
            progress: 0,
            roleNeeded: 'Lab Technician',
            status: 'pending',
            assignedTo: null,
            quantityToMake: quantity, // How many to compound
        };

        window.taskManager.addTask(compoundTask);
        console.log(
            `[production.js] Created compound task for ${quantity} ${product.name} (Task ID: ${compoundTask.id}), ${compoundTask.totalTime} minutes`,
        );

        return compoundTask;
    }

    // Function to check inventory and create compound tasks if needed
    function checkAndCreateCompoundTasks(): void {
        console.log('[production.js] Checking inventory for compounding tasks...');
        window.productsData.forEach((product) => {
            // Skip if there's already a pending or in-progress compound task for this product
            const existingCompoundTask = window.taskManager.tasks.find(
                (t) => t.type === 'compound' && t.productId === product.id && t.status !== 'completed',
            );
            if (existingCompoundTask) return;

            // Restock up to maxInventory, as far as the materials go
            if (product.inventory < product.maxInventory) {
                const quantityToMake = Math.min(
                    product.maxInventory - product.inventory,
                    window.helpers.calculatePotentialProduction(product.id),
                );
                if (quantityToMake >= 1) {
                    createCompoundTask(product, quantityToMake);
                } else {
                    console.warn(
                        `[production.js] Cannot create compound task for ${product.name} due to insufficient materials.`,
                    );
                }
            }
        });
    }

    // Product or material stock changed
    function refreshInventoryUI(): void {
        window.updateUI('inventory');
    }

    // Function to handle task completion (called by taskManager when a task is finalized)
    function handleTaskCompletion(task: Task): void {
        if (task.type === 'compound') {
            const product = window.productsData.find((p) => p.id === task.productId);
            if (product) {
                // The materials left inventory when the compound started (takeMaterials).
                product.inventory += task.quantityToMake!;
                console.log(
                    `[production.js] Compounding completed for ${task.quantityToMake} units of ${product.name}. Inventory updated.`,
                );

                decayEquipmentDurability(product.equipmentNeeded);
                refreshInventoryUI();
                // A prescription's fill waiting on this compound is released
                // by taskManager (releaseDependents), which runs next. A
                // restock can supply other customers' waiting fills.
                if (!task.prescriptionId) window.prescriptions.useStockForWaitingFills(product.id);
            }
        } else if (task.type === 'fillPrescription') {
            // The stock left inventory when the fill took it (takeStock).
            const product = window.productsData.find((p) => p.id === task.productId);
            if (product) {
                decayEquipmentDurability(product.equipmentNeeded);
            }
        }
    }

    function takeStock(fill: Task): boolean {
        if (fill.stockTaken) return true;

        const product = window.productsData.find((p) => p.id === fill.productId);
        const quantity = fill.quantityNeeded ?? 1;
        if (!product || product.inventory < quantity) return false;

        product.inventory -= quantity;
        fill.stockTaken = true;
        refreshInventoryUI();
        return true;
    }

    function returnStock(fill: Task): void {
        if (fill.type !== 'fillPrescription' || !fill.stockTaken) return;

        const product = window.productsData.find((p) => p.id === fill.productId);
        fill.stockTaken = false;
        if (product) {
            product.inventory += fill.quantityNeeded ?? 1;
            refreshInventoryUI();
            window.prescriptions.useStockForWaitingFills(product.id);
        }
    }

    // Initialize the production module
    function init(): void {
        // Perform an initial check and creation of compound tasks when the game starts.
        // After that, timeEvents' hourlyCheck re-checks every game hour.
        checkAndCreateCompoundTasks();

        console.log('[production.js] Production system initialized');
    }

    return {
        canCompound,
        compoundTime,
        canStartCompound,
        takeMaterials,
        returnMaterials,
        createCompoundTask, // Expose this if you need to manually create compound tasks
        checkAndCreateCompoundTasks, // Expose this if you want to manually trigger inventory checks
        takeStock,
        returnStock,
        handleTaskCompletion,
        init,
    };
})();
