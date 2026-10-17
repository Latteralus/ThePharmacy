// /js/pages/researchPage.js

window.renderResearchPage = function (mainContent: HTMLElement): void {
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
    subtitle.textContent =
        "Invest in research to unlock new products, equipment, and improve your pharmacy's capabilities.";
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
        if (window.researchData.inProgress) {
            alert('Research is already in progress.');
            return;
        }

        const nextLevel = window.researchData.currentLevel + 1;
        const nextLevelData = window.researchData.levels[nextLevel];

        if (nextLevelData && window.financesData.cash >= nextLevelData.cost) {
            // Deducts cash and starts the in-game-day timer -
            // researchData.inProgress now drives everything below, so
            // there's no local animation state left to keep in sync.
            window.research.researchNextLevel();
            updateResearchUI();
        } else {
            alert('Not enough funds to start research or max level reached.');
        }
    });

    // --- Function to Update UI ---
    function updateResearchUI(): void {
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
            const inProgress = window.researchData.inProgress;

            if (inProgress) {
                const targetLevelData = window.researchData.levels[inProgress.targetLevel];
                const daysElapsed = Math.max(0, window.gameState.dayIndex - inProgress.startDayIndex);
                const percent = Math.min(100, (daysElapsed / inProgress.daysRequired) * 100);

                const statusInfo = document.createElement('p');
                statusInfo.textContent = `Researching Level ${inProgress.targetLevel}${targetLevelData ? ` (${targetLevelData.description})` : ''}...`;
                nextLevelInfo.appendChild(statusInfo);

                const daysInfo = document.createElement('p');
                daysInfo.textContent = `Progress: ${daysElapsed} of ${inProgress.daysRequired} days`;
                nextLevelInfo.appendChild(daysInfo);

                progressBarFill.style.width = `${percent}%`;
                progressBarContainer.style.display = 'block';

                researchButton.disabled = true;
                researchButton.textContent = 'Research In Progress...';
            } else if (nextLevelData) {
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

                progressBarContainer.style.display = 'none';

                // Update research button text and state
                researchButton.disabled = false;
                researchButton.textContent = 'Start Research';
            } else {
                nextLevelInfo.textContent = 'Maximum research level reached.';
                progressBarContainer.style.display = 'none';
                researchButton.disabled = true;
                researchButton.textContent = 'Research Complete';
            }
        }

        // Update list of unlocked products
        const unlockedProductsList = document.getElementById('unlocked-products-list');
        if (unlockedProductsList) {
            unlockedProductsList.innerHTML = '';
            const unlockedProducts = window.research.getUnlockedProducts();
            unlockedProducts.forEach((productId) => {
                const product = window.productsData.find((p) => p.id === productId);
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
            unlockedEquipment.forEach((equipmentId) => {
                const equipment = window.equipmentData.find((e) => e.id === equipmentId);
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
