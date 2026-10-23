// /js/brandReputation.js (expanded for small updates)

// Customers an hour, relative to a suburban store (L6: location used to
// change only the rent).
const LOCATION_CUSTOMERS: Record<string, number> = { urban: 1.3, suburban: 1, rural: 0.75 };
// Each research level widens what the pharmacy carries, which brings more
// prescriptions its way.
const CUSTOMERS_PER_RESEARCH_LEVEL = 0.1;

window.brandReputation = {
    reputationScore: 10,

    calcCustomers(hour) {
        let base = 2;
        // Example time-of-day surge
        if (hour >= 12 && hour < 14) base += 2; // Lunch
        if (hour >= 17 && hour < 20) base += 3; // After work
        const repFactor = 1 + this.reputationScore / 100;
        const location = LOCATION_CUSTOMERS[window.gameState?.location ?? ''] ?? 1;
        const research = 1 + CUSTOMERS_PER_RESEARCH_LEVEL * (window.researchData?.currentLevel ?? 0);
        // Settings' "Customer Frequency" (saved with the game)
        const frequency = window.customerFrequencyMultiplier ?? 1;
        return Math.floor(base * repFactor * location * research * frequency);
    },

    // Gains shrink as reputation grows: each is scaled by the room left
    // below 100, so the last points are the hardest to earn. (Flat gains
    // took a new pharmacy from 10 to about 80 in two days.)
    gainReputation(amount) {
        this.reputationScore += amount * (1 - this.reputationScore / 100);
        if (this.reputationScore > 100) this.reputationScore = 100;
    },
    loseReputation(amount) {
        this.reputationScore -= amount;
        if (this.reputationScore < 0) this.reputationScore = 0;
    },
};
