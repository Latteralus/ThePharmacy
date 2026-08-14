// Modified main.js to ensure proper initialization and time flow

// Set the desired starting date and time (year, month (0-indexed), day, hour, minute)
const startDate = new Date(2023, 0, 1, 7, 0);

// Game configuration
const GAME_CONFIG = {
    SIMULATION_SPEED: 1.0, // Default game speed multiplier
    GAME_MINUTE_IN_MS: 1000, // 1 second real time = 1 minute game time
    FIXED_TIMESTEP: 1000 / 60, // 60 fps for logic updates
    MAX_UPDATES_PER_FRAME: 10, // Prevent spiral of death if browser freezes temporarily
    END_DAY_HOUR: 22 // 10 PM is end of day
};

// Global flag to track if the game has been initialized
window.isGameInitialized = false;

// The main game loop using requestAnimationFrame
function gameLoop(timestamp) {
    // First frame won't have a previous timestamp
    if (!window.gameState.lastFrameTime) {
        window.gameState.lastFrameTime = timestamp;
        window.gameState.lastSimulationTime = timestamp;
        window.gameState.renderInfo.lastFpsUpdate = timestamp;
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // Calculate delta time (time since last frame)
    const deltaTime = timestamp - window.gameState.lastFrameTime;
    window.gameState.lastFrameTime = timestamp;
    
    // Only run simulation if game is active and not paused
    if (window.gameState.isDayActive && !window.gameState.isPaused) {
        // Run the simulation updates with fixed timestep for stability
        updateSimulation(timestamp);
    }
    
    // Always render the latest state, regardless of simulation updates
    renderUI();
    
    // Continue the game loop
    requestAnimationFrame(gameLoop);
}

// Update game simulation with fixed timestep
function updateSimulation(timestamp) {
    // Calculate time since last simulation update
    const simulationDelta = timestamp - window.gameState.lastSimulationTime;
    
    // Initialize simulationAccumulator if it doesn't exist
    if (window.gameState.simulationAccumulator === undefined) {
        window.gameState.simulationAccumulator = 0;
    }
    
    window.gameState.simulationAccumulator += simulationDelta;
    window.gameState.lastSimulationTime = timestamp;
    
    console.log(`[main] Simulation update, accumulator: ${window.gameState.simulationAccumulator.toFixed(2)}ms`);
    
    // Limit updates to prevent spiral of death
    let updates = 0;
    
    // While we have accumulated enough time to process a fixed step
    while (window.gameState.simulationAccumulator >= GAME_CONFIG.FIXED_TIMESTEP && updates < GAME_CONFIG.MAX_UPDATES_PER_FRAME) {
        // Calculate the game time to advance (in milliseconds)
        const gameTimeDelta = (GAME_CONFIG.FIXED_TIMESTEP * GAME_CONFIG.SIMULATION_SPEED) / GAME_CONFIG.GAME_MINUTE_IN_MS * 60 * 1000;
        
        console.log(`[main] Advancing game time by ${gameTimeDelta.toFixed(2)}ms (${(gameTimeDelta / (60 * 1000)).toFixed(2)} game minutes)`);
        
        try {
            // Update the game time
            updateGameTime(gameTimeDelta);
        } catch (error) {
            console.error("[main] Error in updateGameTime:", error);
        }
        
        // Decrement the accumulator
        window.gameState.simulationAccumulator -= GAME_CONFIG.FIXED_TIMESTEP;
        updates++;
    }
}

// Update the game time
function updateGameTime(msElapsed) {
    // Make sure currentDate exists before trying to modify it
    if (!window.gameState.currentDate) {
        window.gameState.currentDate = new Date(startDate.getTime());
        console.warn("[main] currentDate was undefined, initializing with startDate");
    }
    
    // Advance the game time
    window.gameState.currentDate.setTime(window.gameState.currentDate.getTime() + msElapsed);
    
    // Convert milliseconds to minutes for task updates
    const minutesElapsed = msElapsed / (60 * 1000);
    
    // ALWAYS update tasks with the exact time elapsed - add safety checks
    if (window.taskManager && typeof window.taskManager.updateTasks === 'function' && minutesElapsed > 0) {
        try {
            window.taskManager.updateTasks(minutesElapsed);
        } catch (error) {
            console.error("[main] Error updating tasks:", error);
        }
    }
    
    // Check for end of day (22:00 is 10 PM)
    const currentHour = window.gameState.currentDate.getHours();
    const currentMinute = window.gameState.currentDate.getMinutes();
    
    if (currentHour === GAME_CONFIG.END_DAY_HOUR && currentMinute === 0) {
        // Trigger end of day only once
        if (window.gameState.isDayActive) {
            console.log("End of day reached");
            window.gameState.isDayActive = false; // Stop advancing time
            if (window.timeEvents && typeof window.timeEvents.endOfDay === 'function') {
                try {
                    window.timeEvents.endOfDay(window.gameState);
                } catch (error) {
                    console.error("[main] Error in endOfDay event:", error);
                }
            }
        }
    } else {
        // Run minute checks at the appropriate frequency
        const minuteDelta = Math.floor(msElapsed / (60 * 1000)); // Convert ms to minutes
        
        if (minuteDelta > 0 && window.timeEvents && typeof window.timeEvents.minuteCheck === 'function') {
            try {
                for (let i = 0; i < minuteDelta; i++) {
                    window.timeEvents.minuteCheck(window.gameState);
                }
            } catch (error) {
                console.error("[main] Error in minuteCheck event:", error);
            }
        }
    }
}

// Render the UI based on current game state
function renderUI() {
    try {
        // Update the time display
        if (window.ui && typeof window.ui.updateTime === 'function') {
            window.ui.updateTime();
        }
        
        // Update any progress bars
        if (typeof window.updateTaskProgressBars === 'function') {
            window.updateTaskProgressBars();
        }
        
        // Update any countdown timers
        if (typeof window.updateCountdownTimers === 'function') {
            window.updateCountdownTimers();
        }
    } catch (error) {
        console.error("[main] Error in renderUI:", error);
    }
}

// Add game speed controls
window.setGameSpeed = function(speedMultiplier) {
    GAME_CONFIG.SIMULATION_SPEED = speedMultiplier;
    console.log(`Game speed set to ${speedMultiplier}x`);
};

// Pause/resume game simulation
window.toggleGamePause = function() {
    window.gameState.isPaused = !window.gameState.isPaused;
    console.log(`Game ${window.gameState.isPaused ? 'paused' : 'resumed'}`);
    
    // Reset accumulators when resuming to prevent sudden jumps
    if (!window.gameState.isPaused) {
        window.gameState.lastFrameTime = performance.now();
        window.gameState.lastSimulationTime = performance.now();
        window.gameState.simulationAccumulator = 0;
    }
};

// Expose the game loop for external use
window.gameLoop = gameLoop;

// Check if we need to initialize the game state manually (fallback)
if (!window.isGameInitialized && typeof window.initializeNewGame !== 'function') {
    console.log("Initializing game state directly from main.js (fallback)");
    
    // Initialize minimal game state for fallback
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
        pharmacyName: "Default Pharmacy",
        difficulty: "normal",
        location: "suburban"
    };
    
    window.isGameInitialized = true;
}

// Define the showPage function if it doesn't exist
if (typeof window.showPage !== 'function') {
    window.showPage = function(pageName) {
        console.log(`Navigating to page: ${pageName}`);
        
        // Update the active navigation item in the sidebar
        if (typeof window.updateActiveNavItem === 'function') {
            window.updateActiveNavItem(pageName);
        }
        
        // Get the main content container
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) {
            console.error('Main content container not found');
            return;
        }
        
        // Clear existing content
        mainContent.innerHTML = '';
        
        // Store current page name for reference
        window.currentPage = pageName;
        
        // Call the appropriate page renderer based on the page name
        const rendererName = `render${pageName.charAt(0).toUpperCase() + pageName.slice(1)}Page`;
        
        if (typeof window[rendererName] === 'function') {
            try {
                // Call the page renderer
                window[rendererName](mainContent);
                console.log(`Rendered page: ${pageName}`);
                
                // Dispatch custom event that page has changed (for components that need to react)
                const event = new CustomEvent('pageChanged', { 
                    detail: { page: pageName } 
                });
                document.dispatchEvent(event);
            } catch (error) {
                console.error(`Error rendering page ${pageName}:`, error);
                mainContent.innerHTML = `<div class="error-message">
                    <h3>Error Loading Page</h3>
                    <p>There was an error loading the ${pageName} page.</p>
                    <pre>${error.message}</pre>
                </div>`;
            }
        } else {
            console.error(`Page renderer not found: ${rendererName}`);
            mainContent.innerHTML = `<div class="error-message">
                <h3>Page Not Found</h3>
                <p>The requested page "${pageName}" does not exist or is still under development.</p>
            </div>`;
        }
    };
}

// Set up game loop monitoring
console.log("[main] Setting up game loop monitoring");
let lastFrameTime = Date.now();
let frameCount = 0;

setInterval(() => {
    const now = Date.now();
    const elapsed = now - lastFrameTime;
    const fps = frameCount / (elapsed / 1000);
    frameCount = 0;
    lastFrameTime = now;
    
    // Add safety checks for all gameState properties
    const gameTimeStr = window.gameState?.currentDate instanceof Date 
        ? window.gameState.currentDate.toLocaleTimeString() 
        : 'unknown';
    
    console.log(`[main] Game loop health check: ${elapsed}ms since last frame, ` +
                `FPS: ${fps.toFixed(1)}, ` +
                `game time: ${gameTimeStr}`);
    
    // Check if game is paused or day is inactive
    if (window.gameState?.isPaused) {
        console.log("[main] Game is currently PAUSED");
    }
    
    if (!window.gameState?.isDayActive) {
        console.log("[main] Day is currently INACTIVE");
    }
}, 5000);

// Monkey-patch gameLoop to count frames
const originalGameLoop = window.gameLoop;
window.gameLoop = function(timestamp) {
    frameCount++;
    return originalGameLoop(timestamp);
};

console.log("main.js loaded successfully");