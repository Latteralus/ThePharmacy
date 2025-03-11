// inventoryCard.js
import { createCard } from "./card.js";

export function createInventoryCard(inventory) {
    const content = document.createElement("ul");
    inventory.forEach(item => {
        const li = document.createElement("li");
        li.textContent = `${item.name}: ${item.quantity} units @ $${item.price || "N/A"}`;
        content.appendChild(li);
    });
    return createCard("Inventory", content);
}
