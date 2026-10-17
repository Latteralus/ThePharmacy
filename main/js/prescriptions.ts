// prescriptions.js

// A prescription has exactly one fill task, `fill-<prescriptionId>`. It
// holds its product from the moment it can be assigned, so two fills can't
// both count on the last unit (M8). If there isn't enough stock it waits
// (pending-dependent) on one compound task, `compound-<prescriptionId>`,
// that makes exactly its quantity; when the compound finishes,
// taskManager.releaseDependents calls supplyFill again and the fill takes
// what was just made.

function findFill(prescriptionId: string): Task | undefined {
    return window.taskManager.tasks.find((t) => t.type === 'fillPrescription' && t.prescriptionId === prescriptionId);
}

function findPrescriptionCompound(prescriptionId: string): Task | undefined {
    return window.taskManager.tasks.find(
        (t) => t.type === 'compound' && t.prescriptionId === prescriptionId && t.status !== 'completed',
    );
}

function createCompoundForFill(fill: Task, product: Product): Task {
    const compoundTask: Task = {
        id: `compound-${fill.prescriptionId}`,
        type: 'compound',
        prescriptionId: fill.prescriptionId,
        productId: product.id,
        productName: product.name,
        totalTime: window.production.compoundTime(product, fill.quantityNeeded ?? 1),
        progress: 0,
        roleNeeded: 'Lab Technician',
        status: 'pending',
        assignedTo: null,
        quantityToMake: fill.quantityNeeded,
        fillTaskDependency: true,
        customerId: fill.customerId, // Link directly to customer
    };
    window.taskManager.addTask(compoundTask);
    console.log(`[prescriptions.js] Created compound task: ${compoundTask.id}`);

    // It will wait until materials are bought, and the customer's patience
    // runs down meanwhile, so tell the player.
    if (!window.production.canStartCompound(compoundTask)) {
        const customer = fill.customerId ? window.customers.getCustomerById(fill.customerId) : undefined;
        const who = customer ? `${customer.firstName} ${customer.lastName}'s` : 'a';
        window.notifications?.add(
            `Not enough materials to make ${product.name} for ${who} prescription. Buy them in the Marketplace.`,
            'warning',
        );
    }
    return compoundTask;
}

// Shared by generatePrescription and generateRefillPrescription, for a
// prescription that's already been pushed onto activePrescriptions.
function buildTasksForPrescription(prescription: Prescription): void {
    window.prescriptions.ensureFill(prescription);
}

// Registers a pending refill opportunity if the just-filled prescription
// still has refills owed. Snapshots the customer's name/insurance since
// the Customer object itself will be gone once they leave the pharmacy -
// see customers.ts's generateCustomer for how this gets consumed later.
function registerRefillIfEligible(prescription: Prescription, customer: Customer): void {
    if (prescription.refillsAllowed <= 0) return;

    const cooldownDays = 1 + Math.floor(Math.random() * 3); // 1-3 in-game days
    const eligibleAfterTime = window.gameState.currentDate.getTime() + cooldownDays * 24 * 60 * 60 * 1000;

    const record: RefillRecord = {
        id: window.nextId('refill'),
        customerFirstName: customer.firstName,
        customerLastName: customer.lastName,
        insurancePlanName: customer.insurance.planName,
        productId: prescription.productId,
        productName: prescription.productName,
        dosage: prescription.dosage,
        dosageForm: prescription.dosageForm,
        frequency: prescription.frequency,
        doctorName: prescription.doctorName,
        refillsAvailable: prescription.refillsAllowed,
        eligibleAfterTime,
        sourcePrescriptionId: prescription.id,
    };

    window.prescriptions.refillRegistry.push(record);
    console.log(
        `[prescriptions.js] Registered refill opportunity for ${customer.firstName} ${customer.lastName} (${prescription.productName}, ${prescription.refillsAllowed} refill(s) remaining)`,
    );
}

window.prescriptions = {
    activePrescriptions: [],
    refillRegistry: [],

    generatePrescription(customerId) {
        console.log(`[prescriptions.js] Generating prescription for customer: ${customerId}`);

        const customer = window.customers.getCustomerById(customerId);
        if (!customer) {
            console.error(`[prescriptions.js] No customer found for generatePrescription: ${customerId}`);
            return null;
        }

        const dosage = Math.floor(Math.random() * 3) + 1; // 1-3 units

        // Prefer a product we can supply in full: enough stock for the
        // dosage, or the materials to compound it.
        const unlockedProducts = window.research.getUnlockedProducts();
        const availableProducts = unlockedProducts.filter((id) => {
            const product = window.productsData.find((p) => p.id === id);
            return product && (product.inventory >= dosage || window.production.canCompound(product, dosage));
        });

        // If no products available or can be compounded, use any unlocked product
        const productId =
            availableProducts.length > 0
                ? availableProducts[Math.floor(Math.random() * availableProducts.length)]
                : unlockedProducts[Math.floor(Math.random() * unlockedProducts.length)];

        const product = window.productsData.find((p) => p.id === productId);
        if (!product) {
            console.error(`[prescriptions.js] No product found for generatePrescription: ${productId}`);
            return null;
        }

        console.log(`[prescriptions.js] Selected product: ${product.name} (${productId})`);

        const newPrescription: Prescription = {
            id: window.nextId('pres'),
            customerId: customerId,
            productId: productId,
            productName: product.name,
            dosage,
            dosageForm: product.dosageForm,
            frequency: this.getRandomFrequency(),
            status: 'pending',
            doctorName: window.generateDoctorName(),
            refillsAllowed: Math.floor(Math.random() * 3), // 0-2 refills
            assignedEmployeeId: null,
            createdAt: window.clock.now(),
        };
        this.activePrescriptions.push(newPrescription);

        console.log(`[prescriptions.js] Created prescription: ${newPrescription.id} for customer: ${customerId}`);

        buildTasksForPrescription(newPrescription);

        return newPrescription.id;
    },

    // Same shape as generatePrescription, but for a customer returning to
    // refill a prescription they were previously given refills on - uses
    // the stored product/dosage/etc. from the RefillRecord instead of
    // picking a random product.
    generateRefillPrescription(customerId, record) {
        console.log(
            `[prescriptions.js] Generating refill prescription for customer: ${customerId} (product ${record.productId})`,
        );

        const product = window.productsData.find((p) => p.id === record.productId);
        if (!product) {
            console.error(`[prescriptions.js] No product found for generateRefillPrescription: ${record.productId}`);
            return null;
        }

        const newPrescription: Prescription = {
            id: window.nextId('pres'),
            customerId: customerId,
            productId: record.productId,
            productName: record.productName,
            dosage: record.dosage,
            dosageForm: record.dosageForm,
            frequency: record.frequency,
            status: 'pending',
            doctorName: record.doctorName,
            refillsAllowed: Math.max(0, record.refillsAvailable - 1),
            assignedEmployeeId: null,
            createdAt: window.clock.now(),
            isRefill: true,
        };
        this.activePrescriptions.push(newPrescription);

        console.log(
            `[prescriptions.js] Created refill prescription: ${newPrescription.id} for customer: ${customerId}`,
        );

        buildTasksForPrescription(newPrescription);

        return newPrescription.id;
    },

    ensureFill(prescription) {
        const existing = findFill(prescription.id);
        if (existing) {
            if (existing.stockTaken) return false;
            const compound = existing.dependencyTaskId && window.taskManager.getTaskById(existing.dependencyTaskId);
            if (existing.status === 'pending-dependent' && compound) return false; // waiting on its compound
            this.supplyFill(existing);
            return true;
        }

        const product = window.productsData.find((p) => p.id === prescription.productId);
        if (!product) {
            console.error(`[prescriptions.js] No product found for ensureFill: ${prescription.productId}`);
            return false;
        }

        // Starts out waiting; supplyFill makes it ready if the stock is there.
        const fillTask: Task = {
            id: `fill-${prescription.id}`,
            type: 'fillPrescription',
            prescriptionId: prescription.id,
            productId: product.id,
            productName: product.name,
            totalTime: 10, // Base time
            progress: 0,
            roleNeeded: 'Lab Technician',
            status: 'pending-dependent',
            assignedTo: null,
            requiredEquipment: product.equipmentNeeded,
            quantityNeeded: Math.max(1, prescription.dosage),
            customerId: prescription.customerId,
        };
        window.taskManager.addTask(fillTask);
        console.log(`[prescriptions.js] Created fillPrescription task: ${fillTask.id}`);
        this.supplyFill(fillTask);
        return true;
    },

    supplyFill(fill) {
        if (window.production.takeStock(fill)) {
            fill.dependencyTaskId = undefined;
            if (fill.status === 'pending-dependent') window.taskManager.setStatus(fill, 'pending');
            return;
        }

        const product = window.productsData.find((p) => p.id === fill.productId);
        if (!product) {
            console.error(`[prescriptions.js] No product found for fill ${fill.id}: ${fill.productId}`);
            return;
        }
        console.log(`[prescriptions.js] Not enough ${product.name} for ${fill.id}. It waits on a compound task.`);

        // Only an older save's fill can be mid-way without its stock.
        if (fill.status === 'inProgress') window.taskAssignment.unassignTask(fill.id);
        if (fill.status === 'pending') window.taskManager.setStatus(fill, 'pending-dependent');

        const compound = findPrescriptionCompound(fill.prescriptionId!) ?? createCompoundForFill(fill, product);
        fill.dependencyTaskId = compound.id;
    },

    // Stock of a product just came in (a restock finished, or a departing
    // customer's fill put theirs back). Fills still waiting on a compound
    // that hasn't started take it instead, oldest first, and their compound
    // is dropped. A compound already under way holds its materials and
    // finishes as planned.
    useStockForWaitingFills(productId) {
        window.taskManager.tasks
            .filter(
                (t) => t.type === 'fillPrescription' && t.productId === productId && t.status === 'pending-dependent',
            )
            .forEach((fill) => {
                const compound = fill.dependencyTaskId
                    ? window.taskManager.getTaskById(fill.dependencyTaskId)
                    : undefined;
                if (compound && (compound.status !== 'pending' || compound.materialsTaken)) return;
                if (!window.production.takeStock(fill)) return;

                fill.dependencyTaskId = undefined; // so cancelling the compound leaves the fill alone
                window.taskManager.setStatus(fill, 'pending');
                if (compound) window.taskManager.cancelTask(compound.id);
                console.log(`[prescriptions.js] ${fill.id} took ${fill.productName} from stock instead of waiting.`);
            });
    },

    updatePrescriptionStatus(prescriptionId, newStatus) {
        console.log(`[prescriptions.js] Updating prescription status: ${prescriptionId} to ${newStatus}`);

        const prescription = this.activePrescriptions.find((p) => p.id === prescriptionId);
        if (prescription) {
            prescription.status = newStatus;
            window.ui.updatePrescriptions();
        } else {
            console.error(`[prescriptions.js] Prescription not found: ${prescriptionId}`);
        }
    },

    // When fillPrescription completes
    prescriptionFilled(prescriptionId, customerId) {
        console.log(`[prescriptions.js] Prescription filled: ${prescriptionId} for customer: ${customerId}`);

        this.updatePrescriptionStatus(prescriptionId, 'filled');

        const customer = window.customers.getCustomerById(customerId);
        if (!customer) {
            console.warn(`[prescriptions.js] Customer not found during prescriptionFilled: ${customerId}`);
            return;
        }

        // If refills are owed, register the opportunity for this customer
        // to come back for another fill later (see customers.generateCustomer).
        const prescription = this.getPrescription(prescriptionId);
        if (prescription) {
            registerRefillIfEligible(prescription, customer);
        }

        // Moves them to checkout if they've already had their consultation;
        // otherwise they get there when the consultation finishes.
        window.customers.advance(customerId, 'filled');
    },

    // Creates a consultation task for Pharmacist after check-in
    createConsultationTask(customerId) {
        console.log(`[prescriptions.js] Creating consultation task for customer: ${customerId}`);

        const consultationTask: Task = {
            id: `consult-${customerId}`, // one consultation per visit
            type: 'consultation',
            customerId: customerId,
            totalTime: 5, // 5 minutes consultation time
            progress: 0,
            roleNeeded: 'Pharmacist',
            status: 'pending',
            assignedTo: null,
        };
        window.taskManager.addTask(consultationTask);
        console.log(`[prescriptions.js] Created consultation task: ${consultationTask.id}`);
    },

    getPrescription(prescriptionId) {
        return this.activePrescriptions.find((p) => p.id === prescriptionId);
    },

    // Helper functions for prescription generation
    getRandomFrequency() {
        const frequencies = [
            'once daily',
            'twice daily',
            'three times daily',
            'four times daily',
            'every 8 hours',
            'every 12 hours',
            'as needed',
        ];
        return frequencies[Math.floor(Math.random() * frequencies.length)];
    },

    // Remove prescriptions when customers leave
    removePrescriptionsByCustomer(customerId) {
        // Find prescriptions for this customer
        const customerPrescriptions = this.activePrescriptions.filter((p) => p.customerId === customerId);

        // Remove them from active prescriptions
        this.activePrescriptions = this.activePrescriptions.filter((p) => p.customerId !== customerId);

        console.log(
            `[prescriptions.js] Removed ${customerPrescriptions.length} prescriptions for departed customer ${customerId}`,
        );

        // Update UI if needed
        window.ui.updatePrescriptions();
    },

    // Returns the first refill opportunity that's both owed and past its
    // cooldown, or undefined if none is ready yet.
    getEligibleRefillRecord(currentTime) {
        return this.refillRegistry.find((r) => r.refillsAvailable > 0 && r.eligibleAfterTime <= currentTime);
    },

    // Removes and returns a refill record - it's being turned into an
    // active prescription now (see customers.generateCustomer), so it's no
    // longer "pending." If the resulting prescription itself has refills
    // left, prescriptionFilled will register a fresh record for it when it
    // gets filled, continuing the chain.
    consumeRefillRecord(recordId) {
        const index = this.refillRegistry.findIndex((r) => r.id === recordId);
        if (index === -1) return undefined;
        const [record] = this.refillRegistry.splice(index, 1);
        console.log(
            `[prescriptions.js] Consumed refill record ${recordId} for ${record.customerFirstName} ${record.customerLastName}`,
        );
        return record;
    },
};
