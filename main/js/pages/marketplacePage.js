window.renderMarketplacePage = function(mainContent) {
  mainContent.innerHTML = '';

  // Create a container for the Marketplace page
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '1rem';

  // Title
  const title = document.createElement('h2');
  title.textContent = 'Marketplace';
  container.appendChild(title);

  // Short description
  const subtitle = document.createElement('p');
  subtitle.textContent = 'Order more materials here.';
  container.appendChild(subtitle);

  // -------------------------------------------------------------------------
  // 1) Filter / Search bar
  // -------------------------------------------------------------------------
  const filterRow = document.createElement('div');
  filterRow.style.display = 'flex';
  filterRow.style.alignItems = 'center';
  filterRow.style.gap = '1rem';

  const filterLabel = document.createElement('label');
  filterLabel.textContent = 'Search:';
  filterLabel.style.fontWeight = 'bold';

  const filterInput = document.createElement('input');
  filterInput.type = 'text';
  filterInput.placeholder = 'Type to filter materials...';
  filterInput.style.flex = '1';

  filterLabel.appendChild(filterInput);
  filterRow.appendChild(filterLabel);

  container.appendChild(filterRow);

  // -------------------------------------------------------------------------
  // 2) Materials container (grid of cards)
  // -------------------------------------------------------------------------
  const materialsGrid = document.createElement('div');
  materialsGrid.style.display = 'grid';
  materialsGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
  materialsGrid.style.gap = '1rem';

  container.appendChild(materialsGrid);

  // We'll store references to dynamically updated elements:
  const materialCards = []; // an array of { rootDiv, nameSpan, inventorySpan, qtyInput, matObj }

  // -------------------------------------------------------------------------
  // 3) Bottom row for bulk purchase summary
  // -------------------------------------------------------------------------
  const summaryRow = document.createElement('div');
  summaryRow.style.display = 'flex';
  summaryRow.style.justifyContent = 'space-between';
  summaryRow.style.alignItems = 'center';
  summaryRow.style.marginTop = '1rem';

  const totalCostLabel = document.createElement('strong');
  totalCostLabel.textContent = 'Total Purchase: $';

  const totalCostValue = document.createElement('span');
  totalCostValue.textContent = '0.00';

  const purchaseButton = document.createElement('button');
  purchaseButton.textContent = 'Confirm Purchase';
  purchaseButton.style.padding = '0.5rem 1rem';
  purchaseButton.style.fontWeight = 'bold';

  // Append them in a small row
  const purchaseRowLeft = document.createElement('div');
  purchaseRowLeft.appendChild(totalCostLabel);
  purchaseRowLeft.appendChild(totalCostValue);

  summaryRow.appendChild(purchaseRowLeft);
  summaryRow.appendChild(purchaseButton);

  container.appendChild(summaryRow);

  // -------------------------------------------------------------------------
  // Render function: builds each card for materials
  // -------------------------------------------------------------------------
  function renderMaterials() {
    materialsGrid.innerHTML = '';
    materialCards.length = 0; // clear

    // Filter by name if user typed something
    const filterText = filterInput.value.toLowerCase().trim();

    window.materialsData.forEach(mat => {
      if (filterText && !mat.name.toLowerCase().includes(filterText)) {
        return; // skip if not matching the filter
      }

      // Card container
      const card = document.createElement('div');
      card.style.border = '1px solid #ccc';
      card.style.borderRadius = '4px';
      card.style.padding = '1rem';
      card.style.backgroundColor = '#fff';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.gap = '0.5rem';

      // Title row: item name + cost
      const titleRow = document.createElement('div');
      titleRow.style.display = 'flex';
      titleRow.style.justifyContent = 'space-between';
      titleRow.style.fontWeight = 'bold';

      const nameSpan = document.createElement('span');
      nameSpan.textContent = mat.name; // e.g. "Acetaminophen Base"

      const costSpan = document.createElement('span');
      costSpan.textContent = `$${mat.cost.toFixed(2)}`;

      titleRow.appendChild(nameSpan);
      titleRow.appendChild(costSpan);

      card.appendChild(titleRow);

      // Inventory row: "Current inventory: N" with color-coded highlight
      const invRow = document.createElement('div');
      const invLabel = document.createElement('strong');
      invLabel.textContent = 'Inventory: ';
      const inventorySpan = document.createElement('span');
      inventorySpan.textContent = `${mat.inventory}`;

      // color code the inventory text
      // e.g. >100 => green, 50-100 => orange, <50 => red
      if (mat.inventory < 50) {
        inventorySpan.style.color = 'red';
      } else if (mat.inventory < 100) {
        inventorySpan.style.color = 'orange';
      } else {
        inventorySpan.style.color = 'green';
      }

      invRow.appendChild(invLabel);
      invRow.appendChild(inventorySpan);
      card.appendChild(invRow);

      // Order quantity row
      const orderRow = document.createElement('div');
      orderRow.style.display = 'flex';
      orderRow.style.gap = '0.5rem';
      orderRow.style.alignItems = 'center';

      const qtyLabel = document.createElement('span');
      qtyLabel.textContent = 'Order Qty: ';

      const qtyInput = document.createElement('input');
      qtyInput.type = 'number';
      qtyInput.value = '0';
      qtyInput.style.width = '60px';

      orderRow.appendChild(qtyLabel);
      orderRow.appendChild(qtyInput);

      card.appendChild(orderRow);

      materialsGrid.appendChild(card);

      // Track references for calculating total cost later
      materialCards.push({
        rootDiv: card,
        nameSpan,
        inventorySpan,
        qtyInput,
        matObj: mat
      });
    });
  }

  // -------------------------------------------------------------------------
  // Calculate the total cost of all selected items
  // -------------------------------------------------------------------------
  function calculateTotalCost() {
    let sum = 0;
    materialCards.forEach(entry => {
      const qty = parseInt(entry.qtyInput.value, 10) || 0;
      if (qty > 0) {
        sum += qty * entry.matObj.cost;
      }
    });
    return sum;
  }

  // -------------------------------------------------------------------------
  // Purchase logic: subtract cost from finances, add items to inventory
  // -------------------------------------------------------------------------
  function confirmPurchase() {
    const totalCost = calculateTotalCost();
    if (window.financesData.cash < totalCost) {
      alert('Not enough cash to buy these materials!');
      return;
    }

    // Subtract cost, add inventory
    window.financesData.cash -= totalCost;

    // Update each material's inventory
    materialCards.forEach(entry => {
      const qty = parseInt(entry.qtyInput.value, 10) || 0;
      if (qty > 0) {
        entry.matObj.inventory += qty;
        entry.qtyInput.value = '0'; // reset after purchase
      }
    });

    // Possibly re-render finances, or do it in main UI
    window.updateFinancialSummary(window.financesData);

    // Re-render to show updated inventory
    renderMaterials();
    updateTotalCostDisplay();

    alert(`Purchase successful! Spent $${totalCost.toFixed(2)}. Remaining cash: $${window.financesData.cash.toFixed(2)}`);
  }

  // -------------------------------------------------------------------------
  // updateTotalCostDisplay: refresh the displayed total
  // -------------------------------------------------------------------------
  function updateTotalCostDisplay() {
    const sum = calculateTotalCost();
    totalCostValue.textContent = sum.toFixed(2);
  }

  // -------------------------------------------------------------------------
  // Event Listeners
  // -------------------------------------------------------------------------
  // 1) Filter input => re-render
  filterInput.addEventListener('input', () => {
    renderMaterials();
    updateTotalCostDisplay();
  });

  // 2) "Confirm Purchase" => confirmPurchase
  purchaseButton.addEventListener('click', confirmPurchase);

  // 3) Each qtyInput might also update total cost on change
  function watchQuantityChanges() {
    materialCards.forEach(entry => {
      entry.qtyInput.addEventListener('input', () => {
        updateTotalCostDisplay();
      });
    });
  }

  // We'll re-run watchQuantityChanges after each render so newly created inputs are wired up

  // -------------------------------------------------------------------------
  // Initial
  // -------------------------------------------------------------------------
  mainContent.appendChild(container);

  // First render
  renderMaterials();
  watchQuantityChanges(); 
  updateTotalCostDisplay();
};
