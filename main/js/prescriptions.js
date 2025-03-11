// prescriptions.js

window.prescriptions = {
    activePrescriptions: [],

    generatePrescription: function(customerId) {
        console.log(`[prescriptions.js] Generating prescription for customer: ${customerId}`);

        const customer = window.customers.getCustomerById(customerId);
        if (!customer) {
            console.error(`[prescriptions.js] No customer found for generatePrescription: ${customerId}`);
            return null;
        }

        // Pick an available product
        const unlockedProducts = window.research.getUnlockedProducts();
        const availableProducts = unlockedProducts.filter(id => {
            const product = window.productsData.find(p => p.id === id);
            // Only consider products that are in stock or can be compounded
            return product && (product.inventory > 0 || window.production.canCompound(product));
        });

        // If no products available or can be compounded, use any unlocked product
        const productId = availableProducts.length > 0 ? 
            availableProducts[Math.floor(Math.random() * availableProducts.length)] : 
            unlockedProducts[Math.floor(Math.random() * unlockedProducts.length)];

        const product = window.productsData.find(p => p.id === productId);
        if (!product) {
            console.error(`[prescriptions.js] No product found for generatePrescription: ${productId}`);
            return null;
        }

        console.log(`[prescriptions.js] Selected product: ${product.name} (${productId})`);

        const newPrescription = {
            id: `pres-${Date.now()}`,
            customerId: customerId,
            productId: productId,
            productName: product.name,
            dosage: Math.floor(Math.random() * 3) + 1, // Random dosage between 1-3
            dosageForm: product.dosageForm,
            frequency: this.getRandomFrequency(),
            status: 'pending',
            doctorName: window.generateDoctorName(),
            refillsAllowed: Math.floor(Math.random() * 3), // 0-2 refills
            assignedEmployeeId: null,
            createdAt: Date.now()
        };
        this.activePrescriptions.push(newPrescription);

        console.log(`[prescriptions.js] Created prescription: ${newPrescription.id} for customer: ${customerId}`);

        // Check if product is in stock
        if (product.inventory <= 0) {
            console.log(`[prescriptions.js] Product ${product.name} is out of stock. Creating compound task first.`);

            // Create a compound task to make the product first
            const compoundTask = {
                id: `compound-${newPrescription.id}`,
                type: 'compound',
                prescriptionId: newPrescription.id,
                productId: product.id,
                productName: product.name,
                totalTime: product.productionTime,
                progress: 0,
                roleNeeded: 'Lab Technician',
                status: 'pending',
                assignedTo: null,
                quantityToMake: Math.max(1, newPrescription.dosage),
                fillTaskDependency: true,
                priority: 'high', // Mark as high priority
                customerId: customerId // Link directly to customer
            };
            window.taskManager.addTask(compoundTask);
            console.log(`[prescriptions.js] Created compound task: ${compoundTask.id}`);

            // Create fill task, but mark it as dependent (won't be assigned until compound completes)
            const fillTask = {
                id: `fill-${newPrescription.id}`,
                type: 'fillPrescription',
                prescriptionId: newPrescription.id,
                productId: product.id,
                productName: product.name,
                totalTime: 8, // Slightly faster than normal fill time
                progress: 0,
                roleNeeded: 'Lab Technician',
                status: 'pending-dependent', // Special status marking dependency
                assignedTo: null,
                requiredEquipment: product.equipmentNeeded,
                quantityNeeded: Math.max(1, newPrescription.dosage),
                customerId: customerId,
                dependencyTaskId: compoundTask.id,
                priority: 'high' // Mark as high priority
            };
            window.taskManager.addTask(fillTask);
            console.log(`[prescriptions.js] Created dependent fillPrescription task: ${fillTask.id}`);
        } else {
            console.log(`[prescriptions.js] Product ${product.name} is in stock (inventory: ${product.inventory}). Creating fill task directly.`);

            // Create fill task directly if in stock
            this.createFillTaskForPrescription(newPrescription);
        }

        // Auto-assign tasks
        window.taskAssignment.autoAssignTasks();

        return newPrescription.id;
    },

    createFillTaskForPrescription: function(prescription) {
        const product = window.productsData.find(p => p.id === prescription.productId);
        if (!product) {
            console.error(`[prescriptions.js] No product found for createFillTaskForPrescription: ${prescription.productId}`);
            return null;
        }

        const fillTask = {
            id: `fill-${prescription.id}`,
            type: 'fillPrescription',
            prescriptionId: prescription.id,
            productId: product.id,
            productName: product.name,
            totalTime: 10, // Base time
            progress: 0,
            roleNeeded: 'Lab Technician',
            status: 'pending',
            assignedTo: null,
            requiredEquipment: product.equipmentNeeded,
            quantityNeeded: Math.max(1, prescription.dosage),
            customerId: prescription.customerId,
            priority: 'high' // Mark as high priority
        };
        window.taskManager.addTask(fillTask);
        console.log(`[prescriptions.js] Created fillPrescription task: ${fillTask.id}`);
        
        return fillTask.id;
    },

    updatePrescriptionStatus: function(prescriptionId, newStatus) {
        console.log(`[prescriptions.js] Updating prescription status: ${prescriptionId} to ${newStatus}`);

        const prescription = this.activePrescriptions.find(p => p.id === prescriptionId);
        if (prescription) {
            prescription.status = newStatus;
            window.ui.updatePrescriptions();
        } else {
            console.error(`[prescriptions.js] Prescription not found: ${prescriptionId}`);
        }
    },

    // When fillPrescription completes
    prescriptionFilled: function(prescriptionId, customerId) {
        console.log(`[prescriptions.js] Prescription filled: ${prescriptionId} for customer: ${customerId}`);

        this.updatePrescriptionStatus(prescriptionId, 'filled');

        const customer = window.customers.getCustomerById(customerId);
        if (!customer) {
            console.warn(`[prescriptions.js] Customer not found during prescriptionFilled: ${customerId}`);
            return;
        }

        // Mark them ready for checkout
        window.customers.updateCustomerStatus(customerId, 'readyForCheckout');

        // Create a checkout interaction for the Cashier with high priority
        const checkoutTask = {
            id: `checkout-${customerId}-${Date.now()}`, // Unique ID with timestamp
            type: 'customerInteraction',
            customerId: customerId,
            totalTime: 3, // Short checkout time
            progress: 0,
            roleNeeded: 'Cashier',
            status: 'pending',
            assignedTo: null,
            priority: 'highest' // Mark as highest priority
        };
        window.taskManager.addTask(checkoutTask);
        console.log(`[prescriptions.js] Created checkout task: ${checkoutTask.id}`);

        // Auto-assign tasks immediately
        window.taskAssignment.autoAssignTasks();
    },

    // Creates a consultation task for Pharmacist after check-in
    createConsultationTask: function(customerId) {
        console.log(`[prescriptions.js] Creating consultation task for customer: ${customerId}`);

        const consultationTask = {
            id: `consult-${customerId}-${Date.now()}`, // Unique ID with timestamp
            type: 'consultation',
            customerId: customerId,
            totalTime: 5, // 5 minutes consultation time
            progress: 0,
            roleNeeded: 'Pharmacist',
            status: 'pending',
            assignedTo: null,
            priority: 'very-high' // Mark as very high priority
        };
        window.taskManager.addTask(consultationTask);
        console.log(`[prescriptions.js] Created consultation task: ${consultationTask.id}`);

        // Auto-assign tasks immediately
        window.taskAssignment.autoAssignTasks();
    },

    getPrescription: function(prescriptionId) {
        return this.activePrescriptions.find(p => p.id === prescriptionId);
    },
    
    // Helper functions for prescription generation
    getRandomFrequency: function() {
        const frequencies = [
            'once daily',
            'twice daily',
            'three times daily',
            'four times daily',
            'every 8 hours',
            'every 12 hours',
            'as needed'
        ];
        return frequencies[Math.floor(Math.random() * frequencies.length)];
    },
    
    // Remove prescriptions when customers leave
    removePrescriptionsByCustomer: function(customerId) {
        // Find prescriptions for this customer
        const customerPrescriptions = this.activePrescriptions.filter(p => p.customerId === customerId);
        
        // Remove them from active prescriptions
        this.activePrescriptions = this.activePrescriptions.filter(p => p.customerId !== customerId);
        
        console.log(`[prescriptions.js] Removed ${customerPrescriptions.length} prescriptions for departed customer ${customerId}`);
        
        // Update UI if needed
        window.ui.updatePrescriptions();
    }
};