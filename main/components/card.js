// card.js
export function createCard(title, content) {
    const card = document.createElement("div");
    card.classList.add("card");

    const cardHeader = document.createElement("div");
    cardHeader.classList.add("card-header");
    cardHeader.innerHTML = `<div class="card-title">${title}</div>`;

    const cardContent = document.createElement("div");
    cardContent.classList.add("card-content");
    cardContent.appendChild(content);

    card.appendChild(cardHeader);
    card.appendChild(cardContent);
    return card;
}
