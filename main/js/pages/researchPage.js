// /js/pages/researchPage.js

window.renderResearchPage = function(mainContent) {
      // Clear existing content
      mainContent.innerHTML = '';
    
      // Create a container for the research page
      const container = document.createElement('div');
      container.className = 'research-page-container';
    
      // Add a header
      const header = document.createElement('h2');
      header.textContent = 'Research & Development';
      container.appendChild(header);
    
      // Add a subtitle or info
      const subtitle = document.createElement('p');
      subtitle.textContent = 'Invest in research to unlock new products, equipment, and improve your pharmacy\'s capabilities.';
      container.appendChild(subtitle);
    
      // --- Current Research Level ---
      const currentLevelSection = document.createElement('div');
      currentLevelSection.className = 'research-section';
      const currentLevelHeader = document.createElement('h3');
      currentLevelHeader.textContent = 'Current Research Level';
      currentLevelSection.appendChild(currentLevelHeader);
    
      const currentLevelValue = document.createElement('p');
      currentLevelValue.id = 'current-research-level';
      currentLevelValue.textContent = `Level: ${window.researchData.currentLevel}`;
      currentLevelSection.appendChild(currentLevelValue);
      container.appendChild(currentLevelSection);
    
      // --- Next Research Level ---
      const nextLevelSection = document.createElement('div');
      nextLevelSection.className = 'research-section';
      const nextLevelHeader = document.createElement('h3');
      nextLevelHeader.textContent = 'Next Research Level';
      nextLevelSection.appendChild(nextLevelHeader);
    
      const nextLevelInfo = document.createElement('div');
      nextLevelInfo.id = 'next-research-level-info';
      nextLevelSection.appendChild(nextLevelInfo);
      container.appendChild(nextLevelSection);
    
      // --- Research Button ---
      const researchButtonContainer = document.createElement('div');
      const researchButton = document.createElement('button');
      researchButton.id = 'research-button';
      researchButton.textContent = 'Start Research';
      researchButtonContainer.appendChild(researchButton);
      container.appendChild(researchButtonContainer);
    
      // --- Progress Bar (Hidden Initially) ---
      const progressBarContainer = document.createElement('div');
      progressBarContainer.className = 'research-section';
      progressBarContainer.style.display = 'none'; // Hidden initially
    
      const progressBarLabel = document.createElement('p');
      progressBarLabel.textContent = 'Research Progress:';
      progressBarContainer.appendChild(progressBarLabel);
    
      const progressBar = document.createElement('div');
      progressBar.id = 'research-progress-bar';
      progressBar.className = 'progress-bar';
      const progressBarFill = document.createElement('div');
      progressBarFill.className = 'progress-bar-fill';
      progressBar.appendChild(progressBarFill);
      progressBarContainer.appendChild(progressBar);
      container.appendChild(progressBarContainer);
    
      // --- Unlocked Items ---
      const unlockedItemsSection = document.createElement('div');
      unlockedItemsSection.className = 'research-section';
      const unlockedItemsHeader = document.createElement('h3');
      unlockedItemsHeader.textContent = 'Unlocked Items (Current Level)';
      unlockedItemsSection.appendChild(unlockedItemsHeader);
    
      const unlockedProductsList = document.createElement('ul');
      unlockedProductsList.id = 'unlocked-products-list';
      unlockedItemsSection.appendChild(unlockedProductsList);
    
      const unlockedEquipmentList = document.createElement('ul');
      unlockedEquipmentList.id = 'unlocked-equipment-list';
      unlockedItemsSection.appendChild(unlockedEquipmentList);
    
      container.appendChild(unlockedItemsSection);
    
      // --- Styling (Optional) ---
      const style = document.createElement('style');
      style.textContent = `
          .research-page-container {
              padding: 20px;
          }
          .research-section {
              margin-bottom: 20px;
              border: 1px solid #ccc;
              border-radius: 4px;
              padding: 10px;
              background-color: #fff;
          }
          .research-section h3 {
              margin-top: 0;
          }
          .progress-bar {
              width: 100%;
              height: 20px;
              background-color: #e0e0e0;
              border-radius: 4px;
              overflow: hidden;
          }
          .progress-bar-fill {
              height: 100%;
              width: 0%;
              background-color: #4caf50;
              transition: width 0.5s ease;
          }
      `;
      container.appendChild(style);
    
      // --- Event Listener for Research Button ---
      researchButton.addEventListener('click', () => {
          const nextLevel = window.researchData.currentLevel + 1;
          const nextLevelData = window.researchData.levels[nextLevel];
    
          if (nextLevelData && window.financesData.cash >= nextLevelData.cost) {
              // Start research
              window.research.researchNextLevel();
    
              // Disable button and update UI
              researchButton.disabled = true;
              updateResearchUI();
    
              // Simulate research progress
              let progress = 0;
              const researchTime = nextLevelData.researchTime * 24 * 60 * 60; // Convert days to seconds
              const interval = 1000; // Update every second
              const increment = (interval / researchTime) * 100; // Percentage increment per interval
    
              const progressInterval = setInterval(() => {
                  progress += increment;
                  progressBarFill.style.width = `${progress}%`;
    
                  if (progress >= 100) {
                      clearInterval(progressInterval);
                      progressBarContainer.style.display = 'none';
                      researchButton.disabled = false; // Re-enable button
    
                      // Update level after research completion
                      updateResearchUI();
                  }
              }, interval);
    
              progressBarContainer.style.display = 'block';
    
          } else {
              alert('Not enough funds to start research or max level reached.');
          }
      });
    
      // --- Function to Update UI ---
      function updateResearchUI() {
          // Update current research level
          const currentLevelValue = document.getElementById('current-research-level');
            if (currentLevelValue) {
                currentLevelValue.textContent = `Level: ${window.researchData.currentLevel}`;
            }
    
          // Update next research level info
          const nextLevelInfo = document.getElementById('next-research-level-info');
            if (nextLevelInfo) {
                nextLevelInfo.innerHTML = '';
    
              const nextLevel = window.researchData.currentLevel + 1;
              const nextLevelData = window.researchData.levels[nextLevel];
    
              if (nextLevelData) {
                  const levelInfo = document.createElement('p');
                  levelInfo.textContent = `Level: ${nextLevelData.level}`;
                  nextLevelInfo.appendChild(levelInfo);
    
                  const costInfo = document.createElement('p');
                  costInfo.textContent = `Cost: $${nextLevelData.cost}`;
                  nextLevelInfo.appendChild(costInfo);
    
                  const timeInfo = document.createElement('p');
                  timeInfo.textContent = `Research Time: ${nextLevelData.researchTime} days`;
                  nextLevelInfo.appendChild(timeInfo);
    
                  const descriptionInfo = document.createElement('p');
                  descriptionInfo.textContent = `Description: ${nextLevelData.description}`;
                  nextLevelInfo.appendChild(descriptionInfo);
    
                  // Update research button text and state
                  researchButton.disabled = false;
                  researchButton.textContent = 'Start Research';
    
              } else {
                  nextLevelInfo.textContent = 'Maximum research level reached.';
                  researchButton.disabled = true;
                  researchButton.textContent = 'Research Complete';
              }
            }
    
          // Update list of unlocked products
          const unlockedProductsList = document.getElementById('unlocked-products-list');
            if (unlockedProductsList) {
                unlockedProductsList.innerHTML = '';
              const unlockedProducts = window.research.getUnlockedProducts();
              unlockedProducts.forEach(productId => {
                  const product = window.productsData.find(p => p.id === productId);
                  if (product) {
                      const listItem = document.createElement('li');
                      listItem.textContent = product.name;
                      unlockedProductsList.appendChild(listItem);
                  }
              });
            }
    
          // Update list of unlocked equipment
          const unlockedEquipmentList = document.getElementById('unlocked-equipment-list');
            if (unlockedEquipmentList) {
                unlockedEquipmentList.innerHTML = '';
              const unlockedEquipment = window.research.getUnlockedEquipment();
              unlockedEquipment.forEach(equipmentId => {
                  const equipment = window.equipmentData.find(e => e.id === equipmentId);
                  if (equipment) {
                      const listItem = document.createElement('li');
                      listItem.textContent = equipment.name;
                      unlockedEquipmentList.appendChild(listItem);
                  }
              });
            }
      }
    
      // Append the container to the main content area
      mainContent.appendChild(container);
    
        // Initial UI update
      updateResearchUI();
    };