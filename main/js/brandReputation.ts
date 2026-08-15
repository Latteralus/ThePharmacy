// /js/brandReputation.js (expanded for small updates)

window.brandReputation = {
  brandScore: 10,
  reputationScore: 10,

  calcCustomers(hour) {
    let base = 2;
    // Example time-of-day surge
    if (hour >= 12 && hour < 14) base += 2; // Lunch
    if (hour >= 17 && hour < 20) base += 3; // After work
    // Factor brand & rep
    const brandFactor = 1 + (this.brandScore / 100);
    const repFactor = 1 + (this.reputationScore / 100);
    return Math.floor(base * brandFactor * repFactor);
  },

  gainReputation(amount) {
    this.reputationScore += amount;
    if (this.reputationScore > 100) this.reputationScore = 100; // or no cap
  },
  loseReputation(amount) {
    this.reputationScore -= amount;
    if (this.reputationScore < 0) this.reputationScore = 0;
  }
};
