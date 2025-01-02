// /js/main.js

// Set the desired starting date and time (year, month (0-indexed), day, hour, minute)
const startDate = new Date(2000, 0, 1, 7, 0);

// Initial game state
window.gameState = {
    currentDate: startDate,
    dayIndex: 0, // Start at day 0
    isDayActive: false, // Initially set to false
    employees: [],
    tasks: [],
    customers: []
};

document.addEventListener('DOMContentLoaded', () => {
    // Initialize data
    window.production.init();

    // Render the top bar and append it to the root element
    const topBar = window.renderTopBar();
    document.getElementById('root').appendChild(topBar);

    // Render the sidebar and append it to the root element
    const sidebar = window.renderSidebar();
    document.getElementById('root').appendChild(sidebar);

    // Show the initial page
    window.showPage('dashboard');

    // Update product prices to suggested prices initially
    window.finances.setToSuggestedPrices();

    // Set the default active menu item
    window.updateActiveNavItem('dashboard');

    // Start the game day (set isDayActive to true)
    window.gameState.isDayActive = true;

    // Start the game loop
    setInterval(() => {
        console.log("Game loop tick", window.gameState.currentDate);
        if (window.gameState.isDayActive) {
            window.gameState.currentDate.setMinutes(window.gameState.currentDate.getMinutes() + 1);

            // Check for end of day (22:00 is 10 PM)
            if (window.gameState.currentDate.getHours() === 22 && window.gameState.currentDate.getMinutes() === 0) {
                window.gameState.isDayActive = false; // Stop advancing time

                // Trigger end of day logic:
                window.timeEvents.endOfDay(window.gameState);
            } else {
                window.timeEvents.minuteCheck(window.gameState);
            }

            window.ui.updateTime();
            // window.ui.updateFinances(); // Consider removing this if not necessary to update every second
        }
    }, 1000);
});