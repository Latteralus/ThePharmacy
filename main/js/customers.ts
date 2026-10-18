// customers.js

// The customer state machine. A visit goes
//   waitingForCheckIn -> waitingForConsultation -> waitingForFill -> readyForCheckout -> completed
// and only customers.advance changes a status, using this table: for each
// event, the statuses it's allowed in and where it moves the customer.
// The fill runs alongside check-in and consultation, so "filled" is
// accepted in the first two states without moving the customer (the
// prescription records it, and entering waitingForFill checks it).
const CUSTOMER_TRANSITIONS: Record<CustomerEvent, Partial<Record<CustomerStatus, CustomerStatus>>> = {
    checkedIn: { waitingForCheckIn: 'waitingForConsultation' },
    consulted: { waitingForConsultation: 'waitingForFill' },
    filled: {
        waitingForCheckIn: 'waitingForCheckIn',
        waitingForConsultation: 'waitingForConsultation',
        waitingForFill: 'readyForCheckout',
    },
    paid: { readyForCheckout: 'completed' },
};

// Reputation lost when a customer leaves without being served.
const DEPARTURE_PENALTY: Record<Exclude<DepartureReason, 'served'>, number> = {
    impatient: 1.5,
    closing: 1,
    price: 0.5, // refused the price at check-in
    unavailable: 0.25, // we couldn't supply their prescription
    reset: 0, // sent home by reconcileTasks (no prescription): not their choice
};

// Products a turned-away customer has been reported for, with the day, so
// the player hears about each product once a day rather than per customer.
const turnedAwayReported = new Map<string, number>();

// The customer's prescription can't be supplied (no stock for the dosage,
// and the equipment to make it is missing or broken), so they go elsewhere.
function turnAway(customer: Customer, prescription: Prescription): void {
    const product = window.productsData.find((p) => p.id === prescription.productId);
    const day = window.gameState?.dayIndex ?? 0;
    if (product && turnedAwayReported.get(product.id) !== day) {
        turnedAwayReported.set(product.id, day);
        window.notifications?.add(
            `Turned away ${customer.firstName} ${customer.lastName}: ${product.name} is out of stock and ` +
                `${window.production.missingEquipmentText(product)}. Further customers for it today won't be reported.`,
            'warning',
        );
    }
    window.customers.customerLeaves(customer.id, 'unavailable');
}

function createInteractionTask(customerId: string, interaction: 'checkIn' | 'checkout'): void {
    const task: Task = {
        id: `${interaction === 'checkIn' ? 'checkin' : 'checkout'}-${customerId}`, // one of each per visit
        type: 'customerInteraction',
        interaction,
        customerId,
        totalTime: 3, // 3 minutes
        progress: 0,
        roleNeeded: 'Cashier',
        status: 'pending',
        assignedTo: null,
    };
    window.taskManager.addTask(task);
    console.log(`[customers.js] Created ${interaction} task: ${task.id}`);
}

// The task a customer in this status is waiting on, if any: its id and how
// to create it. Used on entering the status and by reconcileTasks.
function taskForStatus(customer: Customer): { id: string; create: () => void } | null {
    const id = customer.id;
    switch (customer.status) {
        case 'waitingForCheckIn':
            return { id: `checkin-${id}`, create: () => createInteractionTask(id, 'checkIn') };
        case 'waitingForConsultation':
            return { id: `consult-${id}`, create: () => window.prescriptions.createConsultationTask(id) };
        case 'readyForCheckout':
            return { id: `checkout-${id}`, create: () => createInteractionTask(id, 'checkout') };
        default:
            return null;
    }
}

// What happens on arriving in a status.
function enterStatus(customer: Customer): void {
    // Checked in: they hear the price, and may walk out (H3).
    if (customer.status === 'waitingForConsultation' && customer.prescriptionId) {
        if (!window.finances.quotePrice(customer.id, customer.prescriptionId)) {
            window.notifications?.add(
                `${customer.firstName} ${customer.lastName} left: the price was too high.`,
                'warning',
            );
            window.customers.customerLeaves(customer.id, 'price');
            return;
        }
    }

    taskForStatus(customer)?.create();

    const prescription = customer.prescriptionId
        ? window.prescriptions.getPrescription(customer.prescriptionId)
        : undefined;
    if (customer.status === 'waitingForFill' && prescription?.status === 'filled') {
        // Filled while they were still being checked in or consulted.
        window.customers.advance(customer.id, 'filled');
    } else if (customer.status === 'completed') {
        window.finances.completePrescription(customer.id, customer.prescriptionId!);
        window.customers.customerLeaves(customer.id, 'served');
    }
}

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
            id: window.nextId('cust'),
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

        // Generate and assign a prescription - a returning customer gets a
        // refill of their previous product instead of a random pick.
        const prescriptionId =
            isReturning && refillRecord
                ? window.prescriptions.generateRefillPrescription(newCustomer.id, refillRecord)
                : window.prescriptions.generatePrescription(newCustomer.id);
        // The refill is used up only once it's been written, so a failure
        // leaves it for a later visit.
        if (prescriptionId && isReturning && refillRecord) {
            window.prescriptions.consumeRefillRecord(refillRecord.id);
        }

        if (!prescriptionId) {
            // No prescription could be written (a refill for a product that
            // no longer exists), so they don't come in.
            console.warn(`[customers.js] No prescription could be written for ${newCustomer.id}; they don't come in.`);
            this.activeCustomers.splice(this.activeCustomers.indexOf(newCustomer), 1);
            return null;
        }
        newCustomer.prescriptionId = prescriptionId;

        const prescription = window.prescriptions.getPrescription(prescriptionId)!;
        if (!window.prescriptions.canSupply(prescription)) {
            turnAway(newCustomer, prescription);
            return null;
        }
        window.prescriptions.ensureFill(prescription);

        console.log(
            `[customers.js] New customer generated: ${newCustomer.firstName} ${newCustomer.lastName} (${customerType}, patience: ${newCustomer.patience}${isReturning ? ', returning for a refill' : ''})`,
        );
        enterStatus(newCustomer);

        window.updateUI('customers');

        return newCustomer;
    },

    advance(customerId, event) {
        const customer = this.getCustomerById(customerId);
        if (!customer) {
            // Normal when a task finishes for someone who has just left.
            console.log(`[customers.js] ${event} for customer ${customerId}, who is no longer here`);
            return false;
        }

        const from = customer.status;
        const to = CUSTOMER_TRANSITIONS[event][from];
        if (!to) {
            console.warn(`[customers.js] Refused ${event} for customer ${customerId} in status ${from}`);
            return false;
        }
        if (to === from) return true;

        customer.status = to;
        customer.lastStateChange = window.clock.now();
        console.log(
            `[customers.js] Customer ${customerId} (${customer.firstName} ${customer.lastName}) status changed: ${from} -> ${to}`,
        );

        // Progress buys patience and lifts their mood
        this.extendPatience(customerId, 30);
        this.updateCustomerMood(customerId, 1);

        enterStatus(customer);
        window.updateUI('customers');
        return true;
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

    customerLeaves(customerId, reason) {
        const customerIndex = this.activeCustomers.findIndex((c) => c.id === customerId);
        if (customerIndex > -1) {
            const customer = this.activeCustomers[customerIndex];
            console.log(
                `[customers.js] Customer ${customerId} (${customer.firstName} ${customer.lastName}) is leaving (${reason}), status: ${customer.status}`,
            );

            // Remove customer from active list
            this.activeCustomers.splice(customerIndex, 1);

            // Cancel their unfinished tasks. That frees whoever was working
            // on them and puts a fill's product back on the shelf.
            const customerTasks = window.taskManager.getTasksForCustomer(customerId);
            if (customerTasks.length > 0) {
                console.log(`[customers.js] Cancelling ${customerTasks.length} pending tasks for departed customer`);
                customerTasks.forEach((task) => window.taskManager.cancelTask(task.id));
            }

            // Remove any associated prescriptions
            window.prescriptions.removePrescriptionsByCustomer(customerId);

            this.updateReputationOnDeparture(customer, reason);

            // Counted for the daily summary
            if (window.gameState) {
                const today = (window.gameState.customersToday ??= {});
                today[reason] = (today[reason] ?? 0) + 1;
            }

            window.updateUI('customers');

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
                this.customerLeaves(customer.id, 'impatient');
            }
        });
    },

    // Closing time: everyone still in the store leaves. They count as
    // unserved, but not as having run out of patience.
    sendRemainingCustomersHome() {
        if (this.activeCustomers.length === 0) return;
        console.log(`[customers.js] Closing time - sending ${this.activeCustomers.length} remaining customers home`);
        [...this.activeCustomers].forEach((customer) => this.customerLeaves(customer.id, 'closing'));
    },

    // Determines effect on reputation when a customer leaves. Applied once
    // per departure (running out of patience used to cost 1.5 here and
    // another 1 as "left without service").
    updateReputationOnDeparture(customer, reason) {
        if (reason === 'served') {
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
        } else if (DEPARTURE_PENALTY[reason] > 0) {
            window.brandReputation.loseReputation(DEPARTURE_PENALTY[reason]);
            console.log(
                `[customers.js] Customer left without service (${reason}) - reputation -${DEPARTURE_PENALTY[reason]}`,
            );
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

    // Run by taskManager.js's integrity check and after a load. With the
    // state machine this should find nothing.
    reconcileTasks() {
        let repaired = 0;

        [...this.activeCustomers].forEach((customer) => {
            const prescription = customer.prescriptionId
                ? window.prescriptions.getPrescription(customer.prescriptionId)
                : undefined;
            if (!prescription) {
                console.warn(`[customers.js] Customer ${customer.id} has no prescription; sending them home.`);
                this.customerLeaves(customer.id, 'reset');
                repaired++;
                return;
            }

            const needed = taskForStatus(customer);
            if (needed && !window.taskManager.getTaskById(needed.id)) {
                console.warn(`[customers.js] Customer ${customer.id} (${customer.status}) had no ${needed.id} task`);
                needed.create();
                repaired++;
            }

            if (prescription.status === 'pending' && window.prescriptions.ensureFill(prescription)) {
                repaired++;
            }

            // Filled while being consulted, but never moved on
            if (customer.status === 'waitingForFill' && prescription.status === 'filled') {
                this.advance(customer.id, 'filled');
                repaired++;
            }
        });

        return repaired;
    },
};

window.clock.every(1, () => window.customers.updatePatience());
