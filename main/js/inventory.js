// inventory.js
const inventory = {
    drugs: [],

    addDrug(drug) {
        const existingDrug = this.drugs.find(d => d.id === drug.id);
        if (existingDrug) {
            existingDrug.quantity += drug.quantity;
        } else {
            this.drugs.push({ ...drug });
        }
    },

    setDrugPrice(drugId, price) {
        const drug = this.drugs.find(d => d.id === drugId);
        if (drug) {
            drug.price = price;
        }
    },

    sellDrug(drugId, quantity) {
        const drug = this.drugs.find(d => d.id === drugId);
        if (drug && drug.quantity >= quantity) {
            drug.quantity -= quantity;
            return drug.price * quantity;
        }
        return 0; // Insufficient stock
    },
};

export default inventory;
