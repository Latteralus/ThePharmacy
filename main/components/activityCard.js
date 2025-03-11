// activityCard.js
import { createCard } from "./card.js";

export function createActivityCard(activityLog) {
    const content = document.createElement("ul");
    activityLog.forEach(entry => {
        const li = document.createElement("li");
        li.textContent = entry;
        content.appendChild(li);
    });
    return createCard("Recent Activity", content);
}
