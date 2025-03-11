// /js/pages/equipmentPage.js

window.renderEquipmentPage = function (mainContent) {
  // Clear existing content
  mainContent.innerHTML = '';

  // Create a container for the Equipment page
  const container = document.createElement('div');
  container.className = 'equipment-page-container';

  // Title
  const title = document.createElement('h2');
  title.textContent = 'Equipment Management';
  container.appendChild(title);

  // Subtitle
  const subtitle = document.createElement('p');
  subtitle.textContent = 'Purchase, manage, and view the status of your equipment here.';
  container.appendChild(subtitle);

  // Filter/Search bar
  const filterRow = document.createElement('div');
  filterRow.className = 'filter-row';
  const filterLabel = document.createElement('label');
  filterLabel.textContent = 'Search:';
  const filterInput = document.createElement('input');
  filterInput.type = 'text';
  filterInput.placeholder = 'Filter equipment...';
  filterLabel.appendChild(filterInput);
  filterRow.appendChild(filterLabel);
  container.appendChild(filterRow);

  // Equipment grid container
  const equipmentGrid = document.createElement('div');
  equipmentGrid.className = 'equipment-grid';
  container.appendChild(equipmentGrid);

  // Array to store references to dynamically updated elements
  const equipmentCards = [];

  // Bottom row for bulk purchase summary
  const summaryRow = document.createElement('div');
  summaryRow.className = 'summary-row';

  const totalCostLabel = document.createElement('strong');
  totalCostLabel.textContent = 'Total Purchase: $';
  const totalCostValue = document.createElement('span');
  totalCostValue.id = 'total-cost-value';
  totalCostValue.textContent = '0.00';

  const purchaseButton = document.createElement('button');
  purchaseButton.textContent = 'Confirm Purchase';
  purchaseButton.className = 'purchase-button';

  const purchaseRowLeft = document.createElement('div');
  purchaseRowLeft.appendChild(totalCostLabel);
  purchaseRowLeft.appendChild(totalCostValue);

  summaryRow.appendChild(purchaseRowLeft);
  summaryRow.appendChild(purchaseButton);
  container.appendChild(summaryRow);

  // Function to render equipment cards
  function renderEquipment() {
      equipmentGrid.innerHTML = '';
      equipmentCards.length = 0;

      const filterText = filterInput.value.toLowerCase().trim();

      window.equipmentData.forEach(eq => {
          if (!eq.isUnlocked()) {
              return; // Skip this equipment if it's not unlocked
          }
          
          if (filterText && !eq.name.toLowerCase().includes(filterText)) {
              return;
          }

          // Create card element
          const card = document.createElement('div');
          card.className = 'equipment-card';

          // Title row with name and cost
          const titleRow = document.createElement('div');
          titleRow.className = 'title-row';
          const nameSpan = document.createElement('span');
          nameSpan.className = 'equipment-name';
          nameSpan.textContent = eq.name;
          const costSpan = document.createElement('span');
          costSpan.className = 'equipment-cost';
          costSpan.textContent = `$${eq.cost.toFixed(2)}`;
          titleRow.appendChild(nameSpan);
          titleRow.appendChild(costSpan);
          card.appendChild(titleRow);

          // Info row with owned, capacity, and durability
          const infoRow = document.createElement('div');
          infoRow.className = 'info-row';
          const ownedLine = document.createElement('p');
          ownedLine.textContent = `Owned: ${eq.owned}`;
          const capacityLine = document.createElement('p');
          capacityLine.textContent = `Capacity: ${eq.capacity}`;
          const durabilityLine = document.createElement('p');
          durabilityLine.textContent = `Durability: ${eq.durability}%`;
          infoRow.appendChild(ownedLine);
          infoRow.appendChild(capacityLine);
          infoRow.appendChild(durabilityLine);
          card.appendChild(infoRow);

          // Buy row
          const buyRow = document.createElement('div');
          buyRow.className = 'buy-row';
          const buyQtyLabel = document.createElement('span');
          buyQtyLabel.textContent = 'Buy Qty:';
          const buyQtyInput = document.createElement('input');
          buyQtyInput.type = 'number';
          buyQtyInput.value = '0';
          buyQtyInput.min = '0';
          buyQtyInput.className = 'buy-qty-input';
          buyRow.appendChild(buyQtyLabel);
          buyRow.appendChild(buyQtyInput);
          card.appendChild(buyRow);

          // Auto-purchase settings row
          const autoRow = document.createElement('div');
          autoRow.className = 'auto-row';
          const autoTitle = document.createElement('strong');
          autoTitle.textContent = 'Auto-Purchase Settings';
          const autoThreshWrapper = document.createElement('div');
          const autoThreshLabel = document.createElement('span');
          autoThreshLabel.textContent = 'Threshold:';
          const autoThreshInput = document.createElement('input');
          autoThreshInput.type = 'number';
          autoThreshInput.value = eq.autoPurchaseThreshold || 0;
          autoThreshInput.min = '0';
          autoThreshInput.className = 'auto-thresh-input';
          autoThreshWrapper.appendChild(autoThreshLabel);
          autoThreshWrapper.appendChild(autoThreshInput);
          const autoAmtWrapper = document.createElement('div');
          const autoAmtLabel = document.createElement('span');
          autoAmtLabel.textContent = 'Amount:';
          const autoAmtInput = document.createElement('input');
          autoAmtInput.type = 'number';
          autoAmtInput.value = eq.autoPurchaseAmount || 0;
          autoAmtInput.min = '0';
          autoAmtInput.className = 'auto-amt-input';
          autoAmtWrapper.appendChild(autoAmtLabel);
          autoAmtWrapper.appendChild(autoAmtInput);
          autoRow.appendChild(autoTitle);
          autoRow.appendChild(autoThreshWrapper);
          autoRow.appendChild(autoAmtWrapper);
          card.appendChild(autoRow);

          equipmentGrid.appendChild(card);

          // Store references for later use
          equipmentCards.push({
              rootDiv: card,
              buyQtyInput,
              autoThreshInput,
              autoAmtInput,
              eqObj: eq
          });
      });
  }

  // Function to calculate the total cost
  function calculateTotalCost() {
      let sum = 0;
      equipmentCards.forEach(entry => {
          const qty = parseInt(entry.buyQtyInput.value, 10) || 0;
          if (qty > 0) {
              sum += qty * entry.eqObj.cost;
          }
      });
      return sum;
  }

  // Function to confirm the purchase
  function confirmPurchase() {
      const totalCost = calculateTotalCost();
      if (window.financesData.cash < totalCost) {
          alert('Insufficient funds to complete the purchase.');
          return;
      }

      window.financesData.cash -= totalCost;

      equipmentCards.forEach(entry => {
          const qty = parseInt(entry.buyQtyInput.value, 10) || 0;
          if (qty > 0) {
              entry.eqObj.owned += qty;
              entry.buyQtyInput.value = '0';
          }

          entry.eqObj.autoPurchaseThreshold = parseInt(entry.autoThreshInput.value, 10) || 0;
          entry.eqObj.autoPurchaseAmount = parseInt(entry.autoAmtInput.value, 10) || 0;
      });

      window.updateFinancialSummary(window.financesData);
      renderEquipment();
      updateTotalCostDisplay();

      alert(`Purchase successful! Total cost: $${totalCost.toFixed(2)}`);
  }

  // Function to update the total cost display
  function updateTotalCostDisplay() {
      const sum = calculateTotalCost();
      totalCostValue.textContent = sum.toFixed(2);
  }

  // Event listeners for input changes
  function watchEquipmentChanges() {
      equipmentCards.forEach(entry => {
          entry.buyQtyInput.addEventListener('input', updateTotalCostDisplay);
          entry.autoThreshInput.addEventListener('input', updateTotalCostDisplay);
          entry.autoAmtInput.addEventListener('input', updateTotalCostDisplay);
      });
  }

  // Event listener for filter input
  filterInput.addEventListener('input', () => {
      renderEquipment();
      watchEquipmentChanges();
  });

  // Event listener for purchase button
  purchaseButton.addEventListener('click', confirmPurchase);

  // Initial rendering
  mainContent.appendChild(container);
  renderEquipment();
  watchEquipmentChanges();
  updateTotalCostDisplay();
  
  // Add CSS styling
  const style = document.createElement('style');
  style.textContent = `
      .equipment-page-container {
          padding: 20px;
          font-family: Arial, sans-serif;
      }
      .filter-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
      }
      .equipment-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
      }
      .equipment-card {
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
      .equipment-name {
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
  `;
  mainContent.appendChild(style);
};