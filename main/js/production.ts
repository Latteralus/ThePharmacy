// /js/production.js

window.production = (function (): ProductionApi {
    // Equipment matters (findings H8, Phase 7). A product can be compounded
    // only when every item in its equipmentNeeded is owned and not broken,
    // and an item takes on at most owned x capacity compounds at a time.
    // Each finished compound wears what it used; worn equipment is slower
    // and broken equipment can't be used until it's repaired.
    // Condition points per finished compound, shared by the units owned. Was
    // 0.5, sized for prices 4x today's: repairs then ate most of the margin
    // (balance pass, 2026-10-23). A unit now lasts about 1,000 compounds.
    const WEAR_PER_BATCH = 0.1;
    const SLOW_BELOW = 50; // condition under which compounding slows, to 0.5x at 0
    const WORN_WARNING = 25; // the player is told when condition falls below this
    const REPAIR_SHARE = 0.25; // a full repair costs this share of the price, per unit owned

    function equipmentFor(product: Product): EquipmentItem[] {
        return product.equipmentNeeded
            .map((id) => window.equipmentData.find((e) => e.id === id))
            .filter((item): item is EquipmentItem => !!item);
    }

    // Needed items that aren't owned, or are broken
    function missingEquipment(product: Product): EquipmentItem[] {
        return equipmentFor(product).filter((item) => item.owned < 1 || item.durability <= 0);
    }

    function canMake(product: Product): boolean {
        return !!product && missingEquipment(product).length === 0;
    }

    // What the player needs to do before the product can be made, for messages
    function missingEquipmentText(product: Product): string {
        const missing = missingEquipment(product);
        const toBuy = missing.filter((item) => item.owned < 1).map((item) => item.name);
        const toRepair = missing.filter((item) => item.owned >= 1).map((item) => item.name);
        const parts: string[] = [];
        if (toBuy.length) parts.push(`needs ${toBuy.join(' and ')}`);
        if (toRepair.length) parts.push(`${toRepair.join(' and ')} ${toRepair.length === 1 ? 'is' : 'are'} broken`);
        return parts.join('; ');
    }

    // Compounds being worked on right now that use this item
    function inUse(item: EquipmentItem): number {
        return window.taskManager.tasks.filter((task) => {
            if (task.type !== 'compound' || task.status !== 'inProgress') return false;
            const product = window.productsData.find((p) => p.id === task.productId);
            return !!product && product.equipmentNeeded.includes(item.id);
        }).length;
    }

    function equipmentFree(product: Product): boolean {
        return equipmentFor(product).every((item) => inUse(item) < item.owned * item.capacity);
    }

    // Speed from the condition of the most worn item a product needs
    function conditionFactor(productId: string): number {
        const product = window.productsData.find((p) => p.id === productId);
        if (!product) return 1;
        const worst = Math.min(100, ...equipmentFor(product).map((item) => item.durability));
        return worst >= SLOW_BELOW ? 1 : 0.5 + (0.5 * Math.max(0, worst)) / SLOW_BELOW;
    }

    function wearEquipment(product: Product): void {
        equipmentFor(product).forEach((item) => {
            if (item.owned < 1) return;
            const before = item.durability;
            item.durability = Math.max(0, item.durability - WEAR_PER_BATCH / item.owned);
            if (before > 0 && item.durability <= 0) {
                window.notifications?.add(
                    `${item.name} is broken. Nothing that needs it can be made until you repair it (Equipment).`,
                    'error',
                );
            } else if (before >= WORN_WARNING && item.durability < WORN_WARNING) {
                window.notifications?.add(
                    `${item.name} is worn (${Math.round(item.durability)}%) and slowing the lab. Repair it on the Equipment page.`,
                    'warning',
                );
            }
        });
        window.updateUI('equipment');
    }

    function repairCost(item: EquipmentItem): number {
        const wear = Math.max(0, 100 - item.durability) / 100;
        return Math.round(REPAIR_SHARE * item.cost * Math.max(1, item.owned) * wear * 100) / 100;
    }

    function repairEquipment(equipmentId: string): boolean {
        const item = window.equipmentData.find((e) => e.id === equipmentId);
        if (!item || item.owned < 1 || item.durability >= 100) return false;
        const paid = window.finances.transact({
            type: 'expense',
            category: 'equipment',
            amount: repairCost(item),
            description: `Repaired ${item.name}`,
            requireFunds: true,
        });
        if (!paid) return false;
        item.durability = 100;
        window.updateUI('equipment');
        window.updateUI('inventory');
        // Compounds waiting on it can start
        window.taskAssignment.requestAutoAssign();
        return true;
    }

    // Bought (by the player or auto-purchase). New units are in perfect
    // condition, so the item's condition becomes the average.
    function addEquipment(item: EquipmentItem, quantity: number): void {
        if (!(quantity > 0)) return;
        const owned = Math.max(0, item.owned);
        item.durability = (item.durability * owned + 100 * quantity) / (owned + quantity);
        item.owned = owned + quantity;
        window.updateUI('equipment');
        window.updateUI('inventory');
        window.taskAssignment.requestAutoAssign();
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

    // Its equipment owned, working and free, and the materials taken or on hand
    function canStartCompound(compound: Task): boolean {
        const product = window.productsData.find((p) => p.id === compound.productId);
        if (!product || !canMake(product) || !equipmentFree(product)) return false;
        return !!compound.materialsTaken || startableQuantity(compound, product) >= 1;
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

    // Restocks: every product the pharmacy carries (unlocked by research)
    // and can make, up to its target stock, as far as the materials go.
    // Restocks queued for something that can no longer be made (equipment
    // broke) are dropped until it can.
    function checkAndCreateCompoundTasks(): void {
        const unlocked = new Set(window.research.getUnlockedProducts());
        window.productsData.forEach((product) => {
            const makeable = unlocked.has(product.id) && canMake(product);
            if (!makeable) {
                window.taskManager.tasks
                    .filter(
                        (t) =>
                            t.type === 'compound' &&
                            t.productId === product.id &&
                            !t.prescriptionId &&
                            t.status === 'pending' &&
                            !t.materialsTaken,
                    )
                    .forEach((t) => window.taskManager.cancelTask(t.id));
                return;
            }

            // Skip if there's already a pending or in-progress compound task for this product
            const existingCompoundTask = window.taskManager.tasks.find(
                (t) => t.type === 'compound' && t.productId === product.id && t.status !== 'completed',
            );
            if (existingCompoundTask) return;

            if (product.inventory < product.maxInventory) {
                const quantityToMake = Math.min(
                    product.maxInventory - product.inventory,
                    window.helpers.calculatePotentialProduction(product.id),
                );
                if (quantityToMake >= 1) createCompoundTask(product, quantityToMake);
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

                wearEquipment(product);
                refreshInventoryUI();
                // A prescription's fill waiting on this compound is released
                // by taskManager (releaseDependents), which runs next. A
                // restock can supply other customers' waiting fills.
                if (!task.prescriptionId) window.prescriptions.useStockForWaitingFills(product.id);
            }
        }
        // A fill's stock left inventory when the fill took it (takeStock),
        // and counting out a prescription doesn't use the lab's equipment.
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
        canMake,
        missingEquipment,
        missingEquipmentText,
        inUse,
        conditionFactor,
        repairCost,
        repairEquipment,
        addEquipment,
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
