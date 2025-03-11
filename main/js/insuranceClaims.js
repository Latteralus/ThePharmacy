// improved-insuranceClaims.js

window.insuranceClaims = {
    pendingClaims: [], // Array to store pending claims
    processedClaims: [], // History of processed claims
    rejectionRate: 0.02, // 2% chance of claim rejection

    // Function to add a new claim
    addClaim(customerId, prescriptionId, totalAmount, copayAmount) {
        const customer = window.customers.activeCustomers.find(c => c.id === customerId);
        if (!customer) {
            console.error(`[insuranceClaims.js] No customer found for claim: ${customerId}`);
            return false;
        }
        
        const insurancePlan = customer.insurance;
        
        const claim = {
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
            status: 'pending'
        };
        
        this.pendingClaims.push(claim);
        console.log(`[insuranceClaims.js] New claim added: ${claim.id} for ${insurancePlan.planName}, amount: $${claim.amountDue.toFixed(2)}`);
        
        return claim;
    },

    // Determine processing time based on insurance company
    calculateProcessingTime(insuranceName) {
        // Base processing time is 1-3 days
        let processingDays = 1;
        
        // Different companies have different processing speeds
        switch(insuranceName) {
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
        const claimsToProcess = this.pendingClaims.filter(claim => 
            !claim.paid && 
            (currentTime - claim.submittedDate.getTime() >= claim.processingTime)
        );
        
        console.log(`[insuranceClaims.js] Found ${claimsToProcess.length} claims ready for processing`);
        
        claimsToProcess.forEach(claim => {
            // Determine if claim is rejected (small random chance)
            const isRejected = Math.random() < this.rejectionRate;
            
            if (isRejected) {
                claim.rejected = true;
                claim.status = 'rejected';
                claim.processedDate = new Date(window.gameState.currentDate);
                
                // Update rejection stats
                if (window.financesData.insuranceReimbursements) {
                    window.financesData.insuranceReimbursements.rejected += claim.amountDue;
                    window.financesData.insuranceReimbursements.pending -= claim.amountDue;
                }
                
                // Create a transaction record for the rejected claim
                window.finances.addTransaction({
                    date: new Date(window.gameState.currentDate),
                    type: 'expense',
                    category: 'insurance-rejected',
                    amount: claim.amountDue,
                    description: `Rejected insurance claim for prescription ${claim.prescriptionId}`,
                    customerId: claim.customerId,
                    prescriptionId: claim.prescriptionId
                });
                
                rejectionCount++;
                console.log(`[insuranceClaims.js] Claim ${claim.id} rejected`);
            } else {
                claim.paid = true;
                claim.status = 'paid';
                claim.processedDate = new Date(window.gameState.currentDate);
                
                // Add the claim amount to the pharmacy's cash
                window.financesData.cash += claim.amountDue;
                
                // Update insurance stats
                if (window.financesData.insuranceReimbursements) {
                    window.financesData.insuranceReimbursements.received += claim.amountDue;
                    window.financesData.insuranceReimbursements.pending -= claim.amountDue;
                }
                
                // Create a transaction record for the paid claim
                window.finances.addTransaction({
                    date: new Date(window.gameState.currentDate),
                    type: 'income',
                    category: 'insurance',
                    amount: claim.amountDue,
                    description: `Insurance payment for prescription ${claim.prescriptionId}`,
                    customerId: claim.customerId,
                    prescriptionId: claim.prescriptionId
                });
                
                totalPaid += claim.amountDue;
                console.log(`[insuranceClaims.js] Claim ${claim.id} paid: ${claim.amountDue.toFixed(2)}`);
            }
            
            // Move to processed claims history
            this.processedClaims.push(claim);
        });
        
        // Remove processed claims from pending list
        this.pendingClaims = this.pendingClaims.filter(claim => 
            !claimsToProcess.some(processed => processed.id === claim.id)
        );
        
        console.log(`[insuranceClaims.js] Processed ${claimsToProcess.length} claims. Paid: ${totalPaid.toFixed(2)}, Rejected: ${rejectionCount}`);
        
        return totalPaid;
    },

    // Function to process claims for a specific insurance company
    processClaims(insuranceName) {
        const claimsToProcess = this.pendingClaims.filter(claim => 
            claim.insurancePlan === insuranceName && !claim.paid
        );

        let totalPaid = 0;
        let rejectionCount = 0;
        
        claimsToProcess.forEach(claim => {
            // Determine if claim is rejected (small random chance)
            const isRejected = Math.random() < this.rejectionRate;
            
            if (isRejected) {
                claim.rejected = true;
                claim.status = 'rejected';
                claim.processedDate = new Date(window.gameState.currentDate);
                
                // Update rejection stats
                if (window.financesData.insuranceReimbursements) {
                    window.financesData.insuranceReimbursements.rejected += claim.amountDue;
                    window.financesData.insuranceReimbursements.pending -= claim.amountDue;
                }
                
                rejectionCount++;
            } else {
                claim.paid = true;
                claim.status = 'paid';
                claim.processedDate = new Date(window.gameState.currentDate);
                
                // Add the claim amount to the pharmacy's cash
                window.financesData.cash += claim.amountDue;
                
                // Update insurance stats
                if (window.financesData.insuranceReimbursements) {
                    window.financesData.insuranceReimbursements.received += claim.amountDue;
                    window.financesData.insuranceReimbursements.pending -= claim.amountDue;
                }
                
                totalPaid += claim.amountDue;
            }
            
            // Move to processed claims history
            this.processedClaims.push(claim);
        });
        
        // Remove processed claims from pending list
        this.pendingClaims = this.pendingClaims.filter(claim => 
            !claimsToProcess.some(processed => processed.id === claim.id)
        );
        
        console.log(`[insuranceClaims.js] Processed ${claimsToProcess.length} claims for ${insuranceName}. Paid: ${totalPaid.toFixed(2)}, Rejected: ${rejectionCount}`);
        
        return totalPaid;
    },

    // Function to remove a claim (e.g., if a prescription is canceled)
    removeClaim(prescriptionId) {
        const index = this.pendingClaims.findIndex(claim => claim.prescriptionId === prescriptionId);
        if (index !== -1) {
            const claim = this.pendingClaims[index];
            
            // Update pending insurance amount
            if (window.financesData.insuranceReimbursements) {
                window.financesData.insuranceReimbursements.pending -= claim.amountDue;
            }
            
            // Remove from pending
            this.pendingClaims.splice(index, 1);
            
            console.log(`[insuranceClaims.js] Removed claim for prescription ${prescriptionId}`);
            return true;
        }
        return false;
    },
    
    // Get statistics about claims
    getClaimStats() {
        const totalPending = this.pendingClaims.reduce((sum, claim) => sum + claim.amountDue, 0);
        const totalProcessed = this.processedClaims.reduce((sum, claim) => claim.paid ? sum + claim.amountDue : sum, 0);
        const totalRejected = this.processedClaims.reduce((sum, claim) => claim.rejected ? sum + claim.amountDue : sum, 0);
        
        const pendingCount = this.pendingClaims.length;
        const processedCount = this.processedClaims.filter(claim => claim.paid).length;
        const rejectedCount = this.processedClaims.filter(claim => claim.rejected).length;
        
        // Claims by insurance company
        const claimsByInsurance = {};
        
        this.pendingClaims.forEach(claim => {
            if (!claimsByInsurance[claim.insurancePlan]) {
                claimsByInsurance[claim.insurancePlan] = {
                    pending: 0,
                    processed: 0,
                    rejected: 0,
                    pendingAmount: 0,
                    processedAmount: 0,
                    rejectedAmount: 0
                };
            }
            
            claimsByInsurance[claim.insurancePlan].pending++;
            claimsByInsurance[claim.insurancePlan].pendingAmount += claim.amountDue;
        });
        
        this.processedClaims.forEach(claim => {
            if (!claimsByInsurance[claim.insurancePlan]) {
                claimsByInsurance[claim.insurancePlan] = {
                    pending: 0,
                    processed: 0,
                    rejected: 0,
                    pendingAmount: 0,
                    processedAmount: 0,
                    rejectedAmount: 0
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
            claimsByInsurance
        };
    },
    
    // Get all claims for a customer
    getClaimsForCustomer(customerId) {
        const pendingClaims = this.pendingClaims.filter(claim => claim.customerId === customerId);
        const processedClaims = this.processedClaims.filter(claim => claim.customerId === customerId);
        
        return {
            pending: pendingClaims,
            processed: processedClaims
        };
    },
    
    // Initialize insurance claims system
    init() {
        console.log("[insuranceClaims.js] Initializing insurance claims system");
        
        // Make sure financesData has necessary insurance tracking properties
        if (!window.financesData.insuranceReimbursements) {
            window.financesData.insuranceReimbursements = {
                pending: 0,
                received: 0,
                rejected: 0
            };
        }
        
        // Process claims automatically every hour
        setInterval(() => {
            this.processAllClaims();
        }, 60 * 60 * 1000 / 24); // Every simulation hour
    }
};