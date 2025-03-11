// Add this to the end of main.html - it will only run if the main initialization fails

(function() {
    // Wait for everything to load
    window.addEventListener('load', function() {
      console.log("Window load event triggered - checking if initialization completed");
      
      // Check if the game started properly
      setTimeout(function() {
        // Look for signs that the game is already initialized
        const topBarExists = document.querySelector('.top-bar');
        const sidebarExists = document.querySelector('.sidebar');
        const mainContentFilled = document.querySelector('.main-content');
        
        // If the game interface is not visible, try fallback initialization
        if (!topBarExists || !sidebarExists) {
          console.log("Game interface not detected - running fallback initialization");
          
          // Create a fallback initialization button
          const fallbackButton = document.createElement('div');
          fallbackButton.style.position = 'fixed';
          fallbackButton.style.top = '50%';
          fallbackButton.style.left = '50%';
          fallbackButton.style.transform = 'translate(-50%, -50%)';
          fallbackButton.style.padding = '20px';
          fallbackButton.style.backgroundColor = '#1a237e';
          fallbackButton.style.color = 'white';
          fallbackButton.style.borderRadius = '8px';
          fallbackButton.style.cursor = 'pointer';
          fallbackButton.style.textAlign = 'center';
          fallbackButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
          fallbackButton.style.zIndex = '9999';
          fallbackButton.innerHTML = `
            <h3 style="margin-top: 0;">Game Initialization Issue</h3>
            <p>The game interface didn't load correctly.</p>
            <button id="try-fallback" style="padding: 10px 20px; background-color: #4caf50; color: white; border: none; border-radius: 4px; margin: 10px; cursor: pointer;">Try Manual Initialization</button>
            <button id="go-back" style="padding: 10px 20px; background-color: #f44336; color: white; border: none; border-radius: 4px; margin: 10px; cursor: pointer;">Return to Main Menu</button>
          `;
          
          document.body.appendChild(fallbackButton);
          
          // Add event listeners to buttons
          document.getElementById('try-fallback').addEventListener('click', function() {
            runFallbackInitialization();
            fallbackButton.style.display = 'none';
          });
          
          document.getElementById('go-back').addEventListener('click', function() {
            window.location.href = 'index.html';
          });
        }
      }, 3000); // Wait 3 seconds after load to check
    });
    
    // Fallback initialization function
    function runFallbackInitialization() {
      console.log("Running fallback initialization");
      
      try {
        // Clear the root element
        const root = document.getElementById('root');
        if (root) {
          root.innerHTML = '';
        }
        
        // Create a basic game state if it doesn't exist
        if (!window.gameState) {
          const startDate = new Date(2023, 0, 1, 7, 0); // January 1st, 2023, 7:00 AM
          
          window.gameState = {
            currentDate: new Date(startDate.getTime()),
            dayIndex: 0,
            isDayActive: true,
            isPaused: false,
            simulationAccumulator: 0,
            lastFrameTime: 0,
            lastSimulationTime: 0,
            renderInfo: {
              fps: 0,
              frameCount: 0,
              lastFpsUpdate: 0
            },
            pharmacyName: "Emergency Pharmacy",
            difficulty: "normal",
            location: "suburban"
          };
          
          console.log("Created fallback game state");
        }
        
        // Create finances data if it doesn't exist
        if (!window.financesData) {
          window.financesData = {
            cash: 100000,
            dailyIncome: 0,
            pendingInsuranceIncome: 0,
            pendingOrders: 0,
            completedOrders: 0,
            overhead: 500,
            transactions: [],
            revenue: { today: 0, thisWeek: 0, thisMonth: 0, lastMonth: 0, total: 0 },
            expenses: { today: 0, thisWeek: 0, thisMonth: 0, lastMonth: 0, total: 0 },
            profit: { today: 0, thisWeek: 0, thisMonth: 0, lastMonth: 0, total: 0 },
            insuranceReimbursements: { pending: 0, received: 0, rejected: 0 },
            expenseCategories: { wages: 0, materials: 0, overhead: 0, equipment: 0, research: 0, other: 0 },
            revenueCategories: { prescriptions: 0, copays: 0, insurance: 0, other: 0 },
            targetDailyRevenue: 1000,
            targetMonthlyRevenue: 30000
          };
          
          console.log("Created fallback finances data");
        }
        
        // Initialize basic UI
        if (window.renderTopBar && window.renderSidebar) {
          const topBar = window.renderTopBar();
          const sidebar = window.renderSidebar();
          
          if (root) {
            root.appendChild(topBar);
            root.appendChild(sidebar);
            
            // Create main content
            const mainContent = document.createElement('div');
            mainContent.className = 'main-content';
            root.appendChild(mainContent);
            
            // Show operations page
            if (window.showPage) {
              window.showPage('operations');
              if (window.updateActiveNavItem) {
                window.updateActiveNavItem('operations');
              }
            } else if (window.renderOperationsPage) {
              window.renderOperationsPage(mainContent);
            }
            
            console.log("Created basic UI components");
          }
        }
        
        // Try to start the game loop
        if (window.gameLoop && typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(window.gameLoop);
          console.log("Started game loop");
        }
        
        console.log("Fallback initialization complete");
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.style.position = 'fixed';
        successMessage.style.top = '20px';
        successMessage.style.left = '50%';
        successMessage.style.transform = 'translateX(-50%)';
        successMessage.style.padding = '10px 20px';
        successMessage.style.backgroundColor = '#4caf50';
        successMessage.style.color = 'white';
        successMessage.style.borderRadius = '4px';
        successMessage.style.zIndex = '9999';
        successMessage.textContent = 'Fallback initialization complete!';
        
        document.body.appendChild(successMessage);
        
        // Remove after 3 seconds
        setTimeout(function() {
          document.body.removeChild(successMessage);
        }, 3000);
        
      } catch (error) {
        console.error("Fallback initialization failed:", error);
        
        // Show error message
        alert(`Fallback initialization failed: ${error.message}\n\nReturning to main menu.`);
        window.location.href = 'index.html';
      }
    }
  })();