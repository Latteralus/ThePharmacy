// improved-insuranceClaims.js

// financesData tracks money owed by insurers in two fields (the top bar
// reads pendingInsuranceIncome, the Finances page insuranceReimbursements).
// Keep them equal to the sum of pendingClaims' amountDue.
function adjustPending(amount: number): void {
    window.financesData.pendingInsuranceIncome += amount;
    window.financesData.insuranceReimbursements.pending += amount;
}

// Pays or rejects one claim. A paid claim is the only point insurance money
// counts as revenue. A rejection moves no cash, so it isn't a transaction.
// Returns true if paid.
function settleClaim(claim: InsuranceClaim, rejected: boolean): boolean {
    claim.processedDate = new Date(window.gameState.currentDate);
    adjustPending(-claim.amountDue);

    if (rejected) {
        claim.rejected = true;
        claim.status = 'rejected';
        window.financesData.insuranceReimbursements.rejected += claim.amountDue;
        console.log(`[insuranceClaims.js] Claim ${claim.id} rejected`);
        return false;
    }

    claim.paid = true;
    claim.status = 'paid';
    window.financesData.insuranceReimbursements.received += claim.amountDue;
    window.finances.transact({
        type: 'income',
        category: 'insurance',
        amount: claim.amountDue,
        description: `Insurance payment for prescription ${claim.prescriptionId}`,
        customerId: claim.customerId,
        prescriptionId: claim.prescriptionId,
    });
    console.log(`[insuranceClaims.js] Claim ${claim.id} paid: ${claim.amountDue.toFixed(2)}`);
    return true;
}

window.insuranceClaims = {
    pendingClaims: [], // Array to store pending claims
    processedClaims: [], // History of processed claims
    rejectionRate: 0.02, // 2% chance of claim rejection

    // Function to add a new claim
    addClaim(customerId, prescriptionId, totalAmount, copayAmount) {
        const customer = window.customers.activeCustomers.find((c) => c.id === customerId);
        if (!customer) {
            console.error(`[insuranceClaims.js] No customer found for claim: ${customerId}`);
            return false;
        }

        const insurancePlan = customer.insurance;

        const claim: InsuranceClaim = {
            id: `claim-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            customerId,
            prescriptionId,
            insurancePlan: insurancePlan.planName,
            totalAmount,
            copayAmount,
            amountDue: totalAmount - copayAmount,
            submittedDate: new Date(window.gameState.currentDate),
            processingTime: this.calculateProcessingTime(insurancePlan.planName),
            processedDate: null,
            paid: false,
            rejected: false,
            status: 'pending',
        };

        this.pendingClaims.push(claim);
        adjustPending(claim.amountDue);
        console.log(
            `[insuranceClaims.js] New claim added: ${claim.id} for ${insurancePlan.planName}, amount: $${claim.amountDue.toFixed(2)}`,
        );

        return claim;
    },

    // Determine processing time based on insurance company
    calculateProcessingTime(insuranceName) {
        // Base processing time is 1-3 days
        let processingDays: number;

        // Different companies have different processing speeds
        switch (insuranceName) {
            case 'MediQuick':
                processingDays = 1; // Fastest processor
                break;
            case 'HealthFirst':
                processingDays = 2;
                break;
            case 'CarePlus':
                processingDays = 2;
                break;
            case 'UnitedCare':
                processingDays = 1.5;
                break;
            case 'StateHealth':
                processingDays = 3; // Slowest processor
                break;
            default:
                processingDays = 2;
        }

        // Convert to milliseconds (speeding up for gameplay)
        // For simulation, we'll use minutes instead of days: 1 day = 60 minutes
        return processingDays * 60 * 60 * 1000;
    },

    // Function to process all pending claims
    processAllClaims() {
        console.log(`[insuranceClaims.js] Processing ${this.pendingClaims.length} pending claims...`);

        const currentTime = window.gameState.currentDate.getTime();
        let totalPaid = 0;
        let rejectionCount = 0;

        // Process claims that have reached their processing time
        const claimsToProcess = this.pendingClaims.filter(
            (claim) => !claim.paid && currentTime - claim.submittedDate.getTime() >= claim.processingTime,
        );

        console.log(`[insuranceClaims.js] Found ${claimsToProcess.length} claims ready for processing`);

        claimsToProcess.forEach((claim) => {
            if (settleClaim(claim, Math.random() < this.rejectionRate)) {
                totalPaid += claim.amountDue;
            } else {
                rejectionCount++;
            }
            this.processedClaims.push(claim);
        });

        // Remove processed claims from pending list
        this.pendingClaims = this.pendingClaims.filter(
            (claim) => !claimsToProcess.some((processed) => processed.id === claim.id),
        );

        console.log(
            `[insuranceClaims.js] Processed ${claimsToProcess.length} claims. Paid: ${totalPaid.toFixed(2)}, Rejected: ${rejectionCount}`,
        );

        return totalPaid;
    },

    // Function to remove a claim (e.g., if a prescription is canceled)
    removeClaim(prescriptionId) {
        const index = this.pendingClaims.findIndex((claim) => claim.prescriptionId === prescriptionId);
        if (index !== -1) {
            const claim = this.pendingClaims[index];

            adjustPending(-claim.amountDue);

            // Remove from pending
            this.pendingClaims.splice(index, 1);

            console.log(`[insuranceClaims.js] Removed claim for prescription ${prescriptionId}`);
            return true;
        }
        return false;
    },

    // Resets both pending totals to what pendingClaims actually owes. Run on
    // load: older saves dropped their claims but kept the totals.
    syncPendingTotals() {
        const owed = this.pendingClaims.reduce((sum, claim) => sum + claim.amountDue, 0);
        window.financesData.pendingInsuranceIncome = owed;
        window.financesData.insuranceReimbursements.pending = owed;
    },

    // Get statistics about claims
    getClaimStats() {
        const totalPending = this.pendingClaims.reduce((sum, claim) => sum + claim.amountDue, 0);
        const totalProcessed = this.processedClaims.reduce(
            (sum, claim) => (claim.paid ? sum + claim.amountDue : sum),
            0,
        );
        const totalRejected = this.processedClaims.reduce(
            (sum, claim) => (claim.rejected ? sum + claim.amountDue : sum),
            0,
        );

        const pendingCount = this.pendingClaims.length;
        const processedCount = this.processedClaims.filter((claim) => claim.paid).length;
        const rejectedCount = this.processedClaims.filter((claim) => claim.rejected).length;

        // Claims by insurance company
        const claimsByInsurance: Record<string, ClaimStatsByInsurance> = {};

        this.pendingClaims.forEach((claim) => {
            if (!claimsByInsurance[claim.insurancePlan]) {
                claimsByInsurance[claim.insurancePlan] = {
                    pending: 0,
                    processed: 0,
                    rejected: 0,
                    pendingAmount: 0,
                    processedAmount: 0,
                    rejectedAmount: 0,
                };
            }

            claimsByInsurance[claim.insurancePlan].pending++;
            claimsByInsurance[claim.insurancePlan].pendingAmount += claim.amountDue;
        });

        this.processedClaims.forEach((claim) => {
            if (!claimsByInsurance[claim.insurancePlan]) {
                claimsByInsurance[claim.insurancePlan] = {
                    pending: 0,
                    processed: 0,
                    rejected: 0,
                    pendingAmount: 0,
                    processedAmount: 0,
                    rejectedAmount: 0,
                };
            }

            if (claim.paid) {
                claimsByInsurance[claim.insurancePlan].processed++;
                claimsByInsurance[claim.insurancePlan].processedAmount += claim.amountDue;
            } else if (claim.rejected) {
                claimsByInsurance[claim.insurancePlan].rejected++;
                claimsByInsurance[claim.insurancePlan].rejectedAmount += claim.amountDue;
            }
        });

        return {
            totalPending,
            totalProcessed,
            totalRejected,
            pendingCount,
            processedCount,
            rejectedCount,
            claimsByInsurance,
        };
    },

    // Get all claims for a customer
    getClaimsForCustomer(customerId) {
        const pendingClaims = this.pendingClaims.filter((claim) => claim.customerId === customerId);
        const processedClaims = this.processedClaims.filter((claim) => claim.customerId === customerId);

        return {
            pending: pendingClaims,
            processed: processedClaims,
        };
    },

    // Initialize insurance claims system
    init() {
        console.log('[insuranceClaims.js] Initializing insurance claims system');

        // Make sure financesData has necessary insurance tracking properties
        if (!window.financesData.insuranceReimbursements) {
            window.financesData.insuranceReimbursements = {
                pending: 0,
                received: 0,
                rejected: 0,
            };
        }

        // Claims are processed from timeEvents' hourlyCheck, on game time.
    },
};
