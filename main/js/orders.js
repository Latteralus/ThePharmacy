// orders.js
import inventory from "./inventory.js";

const orders = {
    availableDrugs: [
        { id: 1, name: "Paracetamol 500mg", cost: 2, quantity: 50 },
        { id: 2, name: "Ibuprofen 200mg", cost: 3, quantity: 50 },
    ],

    placeOrder(drugId, quantity) {
        const drug = this.availableDrugs.find(d => d.id === drugId);
        if (drug) {
            const orderCost = drug.cost * quantity;
            const orderedDrug = { ...drug, quantity, cost: undefined };
            inventory.addDrug(orderedDrug);
            return orderCost;
        }
        return 0; // Drug not found
    },
};

export default orders;
