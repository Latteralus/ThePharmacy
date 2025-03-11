// cashCard.js
import { createCard } from "./card.js";

export function createCashCard(cash, revenue) {
    const content = document.createElement("div");
    content.innerHTML = `
        <div class="stat">Cash on Hand: $${cash.toFixed(2)}</div>
        <div class="stat">Daily Revenue: $${revenue.toFixed(2)}</div>
    `;
    return createCard("Finances", content);
}
