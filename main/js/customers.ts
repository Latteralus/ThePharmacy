// customers.js

window.customers = {
    activeCustomers: [],

    // Patience is in game minutes (at 1x, 1 real second = 1 game minute).
    customerTypes: {
        Normal: {
            patience: 180, // Increased patience
            baseBoost: 0,
        },
        Impatient: {
            patience: 90, // Increased but still lower
            baseBoost: -20, // Starts with lower mood
        },
        Patient: {
            patience: 300, // Increased patience
            baseBoost: 10, // Starts with higher mood
        },
    },

    generateCustomer(hour) {
        // Determine customer type
        const customerType = this.getRandomCustomerType();

        // If a previous customer is eligible to come back for a refill,
        // there's a chance this spawn is them returning instead of a
        // brand-new walk-in.
        const refillRecord =
            window.prescriptions && window.prescriptions.getEligibleRefillRecord
                ? window.prescriptions.getEligibleRefillRecord(window.gameState.currentDate.getTime())
                : undefined;
        const isReturning = !!refillRecord && Math.random() < 0.5;

        // Assign insurance - a returning customer keeps their original plan
        const insurance =
            isReturning && refillRecord
                ? this.getInsuranceByPlanName(refillRecord.insurancePlanName)
                : this.getRandomInsurance();

        // Base mood 0-10, with type-based adjustment
        const baseMood = Math.min(10, Math.max(1, 7 + this.customerTypes[customerType].baseBoost / 10));

        const newCustomer: Customer = {
            id: `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            type: customerType,
            status: 'waitingForCheckIn',
            arrivedAt: window.gameState.currentDate.getTime(),
            insurance: insurance,
            prescriptionId: null,
            patience: this.customerTypes[customerType].patience,
            firstName: isReturning && refillRecord ? refillRecord.customerFirstName : window.getRandomFirstName(),
            lastName: isReturning && refillRecord ? refillRecord.customerLastName : window.getRandomLastName(),
            mood: baseMood,
            lastStateChange: window.clock.now(), // Track when state last changed
            isReturning: isReturning,
        };

        this.activeCustomers.push(newCustomer);
        console.log(
            `[customers.js] New customer generated: ${newCustomer.firstName} ${newCustomer.lastName} (${customerType}, patience: ${newCustomer.patience}${isReturning ? ', returning for a refill' : ''})`,
        );

        // Generate and assign a prescription - a returning customer gets a
        // refill of their previous product instead of a random pick.
        const prescriptionId =
            isReturning && refillRecord
                ? window.prescriptions.generateRefillPrescription(
                      newCustomer.id,
                      window.prescriptions.consumeRefillRecord(refillRecord.id)!,
                  )
                : window.prescriptions.generatePrescription(newCustomer.id);
        this.assignPrescription(newCustomer.id, prescriptionId);

        // Create a "customerInteraction" task (Cashier) to check in
        const checkInTask: Task = {
            id: `checkin-${newCustomer.id}`,
            type: 'customerInteraction',
            customerId: newCustomer.id,
            totalTime: 3, // 3 minutes to check in
            progress: 0,
            roleNeeded: 'Cashier',
            status: 'pending',
            assignedTo: null,
        };
        window.taskManager.addTask(checkInTask);
        console.log(`[customers.js] Created check-in task: ${checkInTask.id}`);

        // Only update UI if on operations page
        if (window.currentPage === 'operations') {
            window.ui.updateCustomers();
        }

        return newCustomer;
    },

    // Assign a prescription to the customer
    assignPrescription(customerId, prescriptionId) {
        const customer = this.activeCustomers.find((c) => c.id === customerId);
        if (customer) {
            customer.prescriptionId = prescriptionId;
            console.log(`[customers.js] Assigned prescription ${prescriptionId} to customer ${customerId}`);
        } else {
            console.error(`[customers.js] Cannot assign prescription: customer ${customerId} not found`);
        }
    },

    updateCustomerStatus(customerId, newStatus) {
        const customer = this.activeCustomers.find((c) => c.id === customerId);
        if (customer) {
            const oldStatus = customer.status;
            customer.status = newStatus;
            customer.lastStateChange = window.clock.now();

            console.log(
                `[customers.js] Customer ${customerId} (${customer.firstName} ${customer.lastName}) status changed: ${oldStatus} -> ${newStatus}`,
            );

            // If they've moved to waitingForConsultation, create that task
            if (newStatus === 'waitingForConsultation') {
                window.prescriptions.createConsultationTask(customerId);
            }

            // Extend patience when making progress
            this.extendPatience(customerId, 30); // Add 30 minutes of patience when status changes

            // Give a mood boost when customer's status changes positively
            this.updateCustomerMood(customerId, 1);

            // Update UI
            window.ui.updateCustomers();
        } else {
            console.error(`[customers.js] Cannot update status: customer ${customerId} not found`);
        }
    },

    updateCustomerMood(customerId, moodChange) {
        const customer = this.activeCustomers.find((c) => c.id === customerId);
        if (customer) {
            customer.mood = Math.max(1, Math.min(10, customer.mood + moodChange));
            console.log(`[customers.js] Customer ${customerId} mood updated to ${customer.mood}`);
        }
    },

    // Add time to the customer's patience
    extendPatience(customerId, minutesToAdd) {
        const customer = this.activeCustomers.find((c) => c.id === customerId);
        if (customer) {
            customer.patience += minutesToAdd;
            console.log(
                `[customers.js] Extended customer ${customerId}'s patience by ${minutesToAdd} minutes to ${customer.patience}`,
            );
        }
    },

    // Decrease patience faster for customers in certain states
    adjustPatienceDecayRate(customer) {
        // Default decay is 1 per game minute
        let decayRate = 1;

        // Customers waiting for consultation get more impatient
        if (customer.status === 'waitingForConsultation') {
            decayRate = 1.5;
        }

        // Customers waiting for checkout also get more impatient
        if (customer.status === 'readyForCheckout') {
            decayRate = 2;
        }

        // Impatient customers have faster patience decay
        if (customer.type === 'Impatient') {
            decayRate *= 1.5;
        }

        // Patient customers have slower patience decay
        if (customer.type === 'Patient') {
            decayRate *= 0.75;
        }

        return decayRate;
    },

    customerLeaves(customerId) {
        const customerIndex = this.activeCustomers.findIndex((c) => c.id === customerId);
        if (customerIndex > -1) {
            const customer = this.activeCustomers[customerIndex];
            console.log(
                `[customers.js] Customer ${customerId} (${customer.firstName} ${customer.lastName}) is leaving, status: ${customer.status}`,
            );

            // Remove customer from active list
            this.activeCustomers.splice(customerIndex, 1);

            // Check for and cancel any pending tasks for this customer
            const customerTasks = window.taskManager.tasks.filter(
                (t) => t.customerId === customerId && t.status !== 'completed',
            );

            if (customerTasks.length > 0) {
                console.log(`[customers.js] Cancelling ${customerTasks.length} pending tasks for departed customer`);
                customerTasks.forEach((task) => {
                    if (task.assignedTo) {
                        // Unassign any employee working on this customer's tasks
                        window.taskAssignment.unassignTask(task.id);
                    }
                    // Remove the task
                    const taskIndex = window.taskManager.tasks.indexOf(task);
                    if (taskIndex > -1) {
                        window.taskManager.tasks.splice(taskIndex, 1);
                    }
                });
            }

            // Remove any associated prescriptions
            window.prescriptions.removePrescriptionsByCustomer(customerId);

            // Update reputation based on customer mood and status
            this.updateReputationOnDeparture(customer);

            // UI update
            window.ui.updateCustomers();

            console.log(`[customers.js] Customer ${customerId} has left.`);
        } else {
            console.error(`[customers.js] Cannot find customer ${customerId} to remove`);
        }
    },

    // Runs once per game minute from the game clock (see the bottom of this
    // file), so pause and game speed apply to patience like everything else.
    updatePatience() {
        const now = window.clock.now();

        // Iterate a copy: customerLeaves splices activeCustomers.
        [...this.activeCustomers].forEach((customer) => {
            customer.patience -= this.adjustPatienceDecayRate(customer);

            // Mood slowly drops once they've been in one state for an hour
            if (now - customer.lastStateChange > 60 * 60 * 1000) {
                if (Math.random() < 0.05) {
                    this.updateCustomerMood(customer.id, -0.1);
                }
            }

            if (customer.patience <= 0) {
                console.log(
                    `[customers.js] Customer ${customer.id} (${customer.firstName} ${customer.lastName}) has run out of patience and is leaving`,
                );

                // Negatively impact reputation when a customer leaves unhappy
                window.brandReputation.loseReputation(1.5);

                this.customerLeaves(customer.id);
            }
        });
    },

    // Closing time: everyone still in the store leaves. They count as
    // unserved (customerLeaves applies the usual reputation hit), but not as
    // having run out of patience.
    sendRemainingCustomersHome() {
        if (this.activeCustomers.length === 0) return;
        console.log(`[customers.js] Closing time - sending ${this.activeCustomers.length} remaining customers home`);
        [...this.activeCustomers].forEach((customer) => this.customerLeaves(customer.id));
    },

    // Determines effect on reputation when a customer leaves
    updateReputationOnDeparture(customer) {
        // Only affect reputation if customer left after being served
        if (customer.status === 'completed') {
            // Base reputation gain/loss on mood (1-10 scale)
            let reputationChange = 0;

            if (customer.mood >= 8) {
                // Very happy customer
                reputationChange = 1;
                console.log(`[customers.js] Very happy customer departure - reputation +${reputationChange}`);
            } else if (customer.mood >= 6) {
                // Satisfied customer
                reputationChange = 0.5;
                console.log(`[customers.js] Satisfied customer departure - reputation +${reputationChange}`);
            } else if (customer.mood <= 3) {
                // Very unhappy customer
                reputationChange = -1;
                console.log(`[customers.js] Very unhappy customer departure - reputation ${reputationChange}`);
            } else if (customer.mood <= 5) {
                // Unhappy customer
                reputationChange = -0.5;
                console.log(`[customers.js] Unhappy customer departure - reputation ${reputationChange}`);
            }

            // Apply the change
            if (reputationChange > 0) {
                window.brandReputation.gainReputation(reputationChange);
            } else if (reputationChange < 0) {
                window.brandReputation.loseReputation(Math.abs(reputationChange));
            }
        } else {
            // If customer left without being served, lose some reputation
            window.brandReputation.loseReputation(1);
            console.log(`[customers.js] Customer left without service - reputation -1`);
        }
    },

    getRandomCustomerType() {
        // Adjusted weights for customer types
        const weights: Record<string, number> = {
            Normal: 0.6, // 60% chance
            Impatient: 0.25, // 25% chance
            Patient: 0.15, // 15% chance
        };

        const rand = Math.random();
        let total = 0;

        for (const type in weights) {
            total += weights[type];
            if (rand <= total) {
                return type;
            }
        }

        // Fallback
        return 'Normal';
    },

    getRandomInsurance() {
        const plans = window.insuranceData;
        const randomIndex = Math.floor(Math.random() * plans.length);
        return plans[randomIndex];
    },

    // Used to give a returning customer back their original plan. Falls
    // back to a random plan if the name isn't found (the plan list could
    // theoretically change between saves).
    getInsuranceByPlanName(planName) {
        return window.insuranceData.find((p) => p.planName === planName) || this.getRandomInsurance();
    },

    getCustomerById(customerId) {
        return this.activeCustomers.find((c) => c.id === customerId);
    },

    // Check for stuck customers and fix their state
    detectAndFixStuckCustomers() {
        console.log(`[customers.js] Checking for stuck customers...`);

        const now = window.clock.now();
        // 5 game hours (the old threshold was 5 real minutes, the same at 1x)
        const stuckThresholdMs = 5 * 60 * 60 * 1000;

        this.activeCustomers.forEach((customer) => {
            // How long has the customer been in their current state?
            const timeInCurrentState = now - customer.lastStateChange;

            // If stuck in a state for over 5 minutes, take action
            if (timeInCurrentState > stuckThresholdMs) {
                console.warn(
                    `[customers.js] Customer ${customer.id} (${customer.firstName} ${customer.lastName}) appears stuck in state "${customer.status}" for ${Math.floor(timeInCurrentState / 60000)} minutes`,
                );

                // Check if the customer has tasks
                const customerTasks = window.taskManager.tasks.filter(
                    (t) => t.customerId === customer.id && t.status !== 'completed',
                );

                if (customerTasks.length === 0) {
                    console.warn(
                        `[customers.js] Customer ${customer.id} has no active tasks! Creating recovery task...`,
                    );

                    // Create appropriate recovery task based on state
                    if (customer.status === 'waitingForCheckIn') {
                        // Create a new check-in task with highest priority
                        const checkInTask: Task = {
                            id: `checkin-recovery-${customer.id}-${Date.now()}`,
                            type: 'customerInteraction',
                            customerId: customer.id,
                            totalTime: 2, // Fast recovery task
                            progress: 0,
                            roleNeeded: 'Cashier',
                            status: 'pending',
                            assignedTo: null,
                        };
                        window.taskManager.addTask(checkInTask);
                        console.log(`[customers.js] Created recovery check-in task: ${checkInTask.id}`);
                    } else if (customer.status === 'waitingForConsultation') {
                        // Create a consultation task with highest priority
                        window.prescriptions.createConsultationTask(customer.id);
                    } else if (customer.status === 'waitingForFill' && customer.prescriptionId) {
                        // Reactivate prescription fill
                        const prescription = window.prescriptions.getPrescription(customer.prescriptionId);
                        if (prescription) {
                            window.prescriptions.createFillTaskForPrescription(prescription);
                        }
                    } else if (customer.status === 'readyForCheckout') {
                        // Create a checkout task with highest priority
                        const checkoutTask: Task = {
                            id: `checkout-recovery-${customer.id}-${Date.now()}`,
                            type: 'customerInteraction',
                            customerId: customer.id,
                            totalTime: 2, // Fast recovery task
                            progress: 0,
                            roleNeeded: 'Cashier',
                            status: 'pending',
                            assignedTo: null,
                        };
                        window.taskManager.addTask(checkoutTask);
                        console.log(`[customers.js] Created recovery checkout task: ${checkoutTask.id}`);
                    }
                } else {
                    // Has tasks but they're not being completed
                    console.log(
                        `[customers.js] Customer ${customer.id} has ${customerTasks.length} pending tasks but seems stuck. Reassigning...`,
                    );

                    // Force reassignment of tasks
                    customerTasks.forEach((task) => {
                        if (task.assignedTo) {
                            window.taskAssignment.unassignTask(task.id);
                        }
                    });
                }

                // Extend the customer's patience to give more time to fix
                this.extendPatience(customer.id, 60);

                // Update last state change time to prevent continuous recovery attempts
                customer.lastStateChange = now;
            }
        });
    },
};

// Stuck-customer detection runs as part of taskManager.js's single
// integrity-check job, not on its own interval here.

window.clock.every(1, () => window.customers.updatePatience());
