// /js/pages/inventoryPage.js

window.renderInventoryPage = function (mainContent) {
    mainContent.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'inventory-page-container';

    // Title
    const title = document.createElement('h2');
    title.textContent = 'Inventory Management';
    container.appendChild(title);

    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.textContent = 'View and manage your product and material inventory.';
    container.appendChild(subtitle);

    // New Section for Setting All Product Prices and Max Inventory
    const settingsSection = document.createElement('div');
    settingsSection.className = 'settings-section';

    // Set All Prices
    const setPricesLabel = document.createElement('label');
    setPricesLabel.textContent = 'Set All Products:';
    settingsSection.appendChild(setPricesLabel);

    const suggestedPriceButton = document.createElement('button');
    suggestedPriceButton.textContent = 'Set to Suggested Price';
    suggestedPriceButton.onclick = () => {
        window.finances.setToSuggestedPrices();
        renderProducts(); // Re-render the products to show updated prices
    };
    settingsSection.appendChild(suggestedPriceButton);

    const markupInput = document.createElement('input');
    markupInput.type = 'number';
    markupInput.placeholder = 'Markup %';
    markupInput.min = '0';
    markupInput.value = '25'; // Default markup
    settingsSection.appendChild(markupInput);

    const applyMarkupButton = document.createElement('button');
    applyMarkupButton.textContent = 'Apply Markup';
    applyMarkupButton.onclick = () => {
        const markupPercentage = parseFloat(markupInput.value);
        if (!isNaN(markupPercentage)) {
            window.finances.applyMarkupToAllProducts(markupPercentage);
            renderProducts(); // Re-render the products to show updated prices
        } else {
            alert('Invalid markup percentage entered.');
        }
    };
    settingsSection.appendChild(applyMarkupButton);

    // Set Max Inventory for All Products
    const setMaxInvLabel = document.createElement('label');
    setMaxInvLabel.textContent = 'Set Max Inventory for All:';
    setMaxInvLabel.style.marginLeft = "15px";
    settingsSection.appendChild(setMaxInvLabel);

    const maxInvInput = document.createElement('input');
    maxInvInput.type = 'number';
    maxInvInput.placeholder = 'Max Inventory';
    maxInvInput.min = '0';
    maxInvInput.value = '25'; // Default max inventory
    settingsSection.appendChild(maxInvInput);

    const applyMaxInvButton = document.createElement('button');
    applyMaxInvButton.textContent = 'Apply to All';
    applyMaxInvButton.onclick = () => {
        const maxInventory = parseInt(maxInvInput.value);
        if (!isNaN(maxInventory)) {
            window.productsData.forEach(product => {
                product.maxInventory = maxInventory;
            });
            renderProducts(); // Re-render the products to show updated max inventory
            console.log(`Max inventory for all products set to ${maxInventory}`);
        } else {
            alert('Invalid max inventory entered.');
        }
    };
    settingsSection.appendChild(applyMaxInvButton);

    container.appendChild(settingsSection);

    // Filter/Search Bar
    const filterRow = document.createElement('div');
    filterRow.className = 'filter-row';
    const filterLabel = document.createElement('label');
    filterLabel.textContent = 'Search:';
    const filterInput = document.createElement('input');
    filterInput.type = 'text';
    filterInput.placeholder = 'Filter by name...';
    filterLabel.appendChild(filterInput);
    filterRow.appendChild(filterLabel);
    container.appendChild(filterRow);

    // Tabs
    const tabsRow = document.createElement('div');
    tabsRow.className = 'tabs-row';
    const productsTab = document.createElement('button');
    productsTab.className = 'tab-button active';
    productsTab.textContent = 'Finished Products';
    const materialsTab = document.createElement('button');
    materialsTab.className = 'tab-button';
    materialsTab.textContent = 'Raw Materials';
    tabsRow.appendChild(productsTab);
    tabsRow.appendChild(materialsTab);
    container.appendChild(tabsRow);

    // Grids
    const productsGrid = document.createElement('div');
    productsGrid.className = 'products-grid';
    const materialsGrid = document.createElement('div');
    materialsGrid.className = 'materials-grid';
    materialsGrid.style.display = 'none'; // Initially hidden

    container.appendChild(productsGrid);
    container.appendChild(materialsGrid);

    // Function to render products
    function renderProducts() {
        productsGrid.innerHTML = '';
        const filterText = filterInput.value.toLowerCase().trim();

        window.productsData.forEach(prod => {
            if (filterText && !prod.name.toLowerCase().includes(filterText)) {
                return;
            }

            const card = document.createElement('div');
            card.className = 'product-card';

            // Title row
            const titleRow = document.createElement('div');
            titleRow.className = 'title-row';
            const nameSpan = document.createElement('span');
            nameSpan.textContent = prod.name;
            titleRow.appendChild(nameSpan);
            card.appendChild(titleRow);

            // Cost and Price
            const cost = window.calculateProductCost(prod.id);
            const suggestedPrice = cost * window.globalMarkup;

            const costLabel = document.createElement('p');
            costLabel.textContent = `Cost to Produce: $${cost.toFixed(2)}`;
            card.appendChild(costLabel);

            const suggestedPriceLabel = document.createElement('p');
            suggestedPriceLabel.textContent = `Suggested Price: $${suggestedPrice.toFixed(2)}`;
            card.appendChild(suggestedPriceLabel);

            const currentPriceLabel = document.createElement('p');
            currentPriceLabel.textContent = `Current Price: $${prod.price.toFixed(2)}`;
            card.appendChild(currentPriceLabel);

            const newPriceRow = document.createElement('div');
            newPriceRow.className = 'new-price-row';
            const newPriceLabel = document.createElement('label');
            newPriceLabel.textContent = 'New Price:';
            const newPriceInput = document.createElement('input');
            newPriceInput.type = 'number';
            newPriceInput.value = prod.price.toFixed(2);
            newPriceInput.min = '0';
            newPriceInput.step = '0.01';
            const updatePriceButton = document.createElement('button');
            updatePriceButton.textContent = 'Update';
            updatePriceButton.onclick = () => {
                const newPrice = parseFloat(newPriceInput.value);
                if (!isNaN(newPrice)) {
                    window.finances.updateProductPrice(prod.id, newPrice);
                    currentPriceLabel.textContent = `Current Price: $${newPrice.toFixed(2)}`;
                } else {
                    alert('Invalid price entered.');
                }
            };
            newPriceRow.appendChild(newPriceLabel);
            newPriceRow.appendChild(newPriceInput);
            newPriceRow.appendChild(updatePriceButton);
            card.appendChild(newPriceRow);

            // Current Stock
            const stockLabel = document.createElement('p');
            stockLabel.textContent = `In Stock: ${prod.inventory}`;
            card.appendChild(stockLabel);

            // Potential Production
            const potentialProduction = window.helpers.calculatePotentialProduction(prod.id);
            const potentialLabel = document.createElement('p');
            potentialLabel.textContent = `Can Make: ${potentialProduction}`;
            card.appendChild(potentialLabel);

            // Quick Order for Compounding
            const quickOrderDiv = document.createElement('div');
            quickOrderDiv.className = 'quick-order-row';
            const quickOrderLabel = document.createElement('strong');
            quickOrderLabel.textContent = 'Quick Compound:';
            const quantityInput = document.createElement('input');
            quantityInput.type = 'number';
            quantityInput.min = '1';
            quantityInput.value = '1'; // Default value
            quantityInput.className = 'quick-order-input';
            const orderButton = document.createElement('button');
            orderButton.textContent = 'Compound';
            orderButton.onclick = () => {
                const quantity = parseInt(quantityInput.value);
                if (!isNaN(quantity) && quantity > 0) {
                    window.production.createCompoundTask(prod, quantity);
                } else {
                    alert('Please enter a valid quantity.');
                }
            };
            quickOrderDiv.appendChild(quickOrderLabel);
            quickOrderDiv.appendChild(quantityInput);
            quickOrderDiv.appendChild(orderButton);
            card.appendChild(quickOrderDiv);

            // Max Inventory
            const maxInvRow = document.createElement('div');
            maxInvRow.className = 'max-inv-row';
            const maxInvLabel = document.createElement('label');
            maxInvLabel.textContent = 'Max Inventory:';
            const maxInvInput = document.createElement('input');
            maxInvInput.type = 'number';
            maxInvInput.value = prod.maxInventory || '0'; // Use existing value or default to 0
            maxInvInput.min = '0';
            maxInvInput.step = '1';
            const updateMaxInvButton = document.createElement('button');
            updateMaxInvButton.textContent = 'Update';
            updateMaxInvButton.onclick = () => {
                const newMaxInv = parseInt(maxInvInput.value);
                if (!isNaN(newMaxInv)) {
                    prod.maxInventory = newMaxInv;
                    console.log(`Max inventory for ${prod.name} updated to ${newMaxInv}`);
                    window.updateUI('inventory'); // Update the UI to reflect changes
                } else {
                    alert('Invalid max inventory entered.');
                }
            };
            maxInvRow.appendChild(maxInvLabel);
            maxInvRow.appendChild(maxInvInput);
            maxInvRow.appendChild(updateMaxInvButton);
            card.appendChild(maxInvRow);

            productsGrid.appendChild(card);
        });
    }

    // Function to render materials
    function renderMaterials() {
        materialsGrid.innerHTML = '';
        const filterText = filterInput.value.toLowerCase().trim();

        window.materialsData.forEach(mat => {
            if (filterText && !mat.name.toLowerCase().includes(filterText)) {
                return;
            }

            const card = document.createElement('div');
            card.className = 'material-card';

            // Title row
            const titleRow = document.createElement('div');
            titleRow.className = 'title-row';
            const nameSpan = document.createElement('span');
            nameSpan.textContent = mat.name;
            const costSpan = document.createElement('span');
            costSpan.textContent = `$${mat.cost.toFixed(2)}`;
            titleRow.appendChild(nameSpan);
            titleRow.appendChild(costSpan);
            card.appendChild(titleRow);

            // Inventory
            const invRow = document.createElement('div');
            const invLabel = document.createElement('strong');
            invLabel.textContent = 'Inventory: ';
            const inventorySpan = document.createElement('span');
            inventorySpan.textContent = `${mat.inventory}`;
            invRow.appendChild(invLabel);
            invRow.appendChild(inventorySpan);
            card.appendChild(invRow);

            // Auto-Order details
            const autoOrderRow = document.createElement('div');
            autoOrderRow.className = 'auto-order-row';
            autoOrderRow.textContent = `Auto-Order Threshold: ${mat.autoOrderThreshold}, Amount: ${mat.autoOrderAmount}`;
            card.appendChild(autoOrderRow);

            materialsGrid.appendChild(card);
        });
    }

    // Tab event listeners
    productsTab.addEventListener('click', () => {
        productsTab.classList.add('active');
        materialsTab.classList.remove('active');
        productsGrid.style.display = 'grid';
        materialsGrid.style.display = 'none';
    });

    materialsTab.addEventListener('click', () => {
        materialsTab.classList.add('active');
        productsTab.classList.remove('active');
        productsGrid.style.display = 'none';
        materialsGrid.style.display = 'grid';
    });

    // Filter event listener
    filterInput.addEventListener('input', () => {
        if (productsTab.classList.contains('active')) {
            renderProducts();
        } else {
            renderMaterials();
        }
    });

    // Initial render
    mainContent.appendChild(container);
    renderProducts();

    // Add styling
    const style = document.createElement('style');
    style.textContent = `
        .inventory-page-container {
            padding: 20px;
            font-family: Arial, sans-serif;
        }
        .filter-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
        }
        .tabs-row {
            margin-bottom: 20px;
        }
        .tab-button {
            padding: 10px 20px;
            border: 1px solid #ccc;
            border-radius: 4px 4px 0 0;
            background-color: #f0f0f0;
            cursor: pointer;
        }
        .tab-button.active {
            background-color: #fff;
            border-bottom: 1px solid #fff;
        }
        .products-grid, .materials-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
        }
        .product-card, .material-card {
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 10px;
            background-color: #fff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .title-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .new-price-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 10px;
        }
        .new-price-row input {
            width: 80px;
        }
        .product-name {
            font-weight: bold;
        }
        .info-row {
            margin-bottom: 10px;
        }
        .buy-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }
        .buy-qty-input {
            width: 60px;
        }
        .auto-row {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        .summary-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 20px;
        }
        .purchase-button {
            padding: 10px 20px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .purchase-button:hover {
            background-color: #367c39;
        }
        .set-prices-section {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
        }
        // New styles for quick order
        .quick-order-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 10px;
        }

.quick-order-row input {
            width: 60px;
            padding: 5px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }

        .quick-order-row button {
            padding: 5px 10px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        .quick-order-row button:hover {
            background-color: #367c39;
        }

        .max-inv-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 10px;
        }

        .max-inv-row input {
            width: 60px;
            padding: 5px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }

        .max-inv-row button {
            padding: 5px 10px;
            background-color: #4CAF50; /* Or any suitable color */
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        .max-inv-row button:hover {
            background-color: #367c39; /* Or a darker shade of the button color */
        }
    `;
    mainContent.appendChild(style);
};