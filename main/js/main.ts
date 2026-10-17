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
function gameLoop(timestamp: number): void {
    // First frame won't have a previous timestamp
    if (!window.gameState.lastFrameTime) {
        window.gameState.lastFrameTime = timestamp;
        window.gameState.lastSimulationTime = timestamp;
        window.gameState.renderInfo!.lastFpsUpdate = timestamp;
        requestAnimationFrame(gameLoop);
        return;
    }

    frameCount++;

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
function updateSimulation(timestamp: number): void {
    // Calculate time since last simulation update
    const simulationDelta = timestamp - window.gameState.lastSimulationTime!;

    // Initialize simulationAccumulator if it doesn't exist
    if (window.gameState.simulationAccumulator === undefined) {
        window.gameState.simulationAccumulator = 0;
    }

    window.gameState.simulationAccumulator += simulationDelta;
    window.gameState.lastSimulationTime = timestamp;

    // Limit updates to prevent spiral of death
    let updates = 0;

    // While we have accumulated enough time to process a fixed step
    while (window.gameState.simulationAccumulator >= GAME_CONFIG.FIXED_TIMESTEP && updates < GAME_CONFIG.MAX_UPDATES_PER_FRAME) {
        // Calculate the game time to advance (in milliseconds)
        const gameTimeDelta = (GAME_CONFIG.FIXED_TIMESTEP * GAME_CONFIG.SIMULATION_SPEED) / GAME_CONFIG.GAME_MINUTE_IN_MS * 60 * 1000;

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
function updateGameTime(msElapsed: number): void {
    // Make sure currentDate exists before trying to modify it
    if (!window.gameState.currentDate) {
        window.gameState.currentDate = new Date(startDate.getTime());
        console.warn("[main] currentDate was undefined, initializing with startDate");
    }

    // Advance the game time
    const previousTime = window.gameState.currentDate.getTime();
    window.gameState.currentDate.setTime(previousTime + msElapsed);

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

    // Check for end of day (22:00 is 10 PM). `>=` rather than an exact
    // 22:00 match, so a time jump (Settings' "+1 Hour", a load) that lands
    // past 22:00 still ends the day instead of running on through the night.
    const currentHour = window.gameState.currentDate.getHours();

    if (currentHour >= GAME_CONFIG.END_DAY_HOUR) {
        // Trigger end of day only once
        if (window.gameState.isDayActive) {
            console.log("End of day reached");
            window.gameState.isDayActive = false; // Stop advancing time
            if (window.timeEvents) {
                try {
                    if (window.gameState.lastEndedDayIndex === window.gameState.dayIndex) {
                        // This day was already settled (a save made while
                        // the daily summary was open) - don't charge wages
                        // and overhead again, just roll over.
                        window.timeEvents.skipToNextDay(window.gameState);
                    } else {
                        window.timeEvents.endOfDay(window.gameState);
                    }
                } catch (error) {
                    console.error("[main] Error in endOfDay event:", error);
                }
            }
        }
    } else {
        // Each fixed step advances only a game second or so, so detect the
        // step that crosses a minute boundary rather than counting whole
        // minutes per step (which was always 0, so minuteCheck never ran).
        const minuteIndex = Math.floor(window.gameState.currentDate.getTime() / 60000);
        const previousMinuteIndex = Math.floor(previousTime / 60000);

        if (minuteIndex !== previousMinuteIndex && window.timeEvents && typeof window.timeEvents.minuteCheck === 'function') {
            try {
                window.timeEvents.minuteCheck(window.gameState);
            } catch (error) {
                console.error("[main] Error in minuteCheck event:", error);
            }
        }

        // Run whatever is due on the game clock (customer patience,
        // integrity checks, autosave, staggered arrivals). Not run once the
        // day has ended, so nothing fires during the end-of-day summary.
        window.clock.tick();
    }
}

// Render the UI based on current game state
function renderUI(): void {
    try {
        // Update the time display
        if (window.ui && typeof window.ui.updateTime === 'function') {
            window.ui.updateTime();
        }

        // Update any progress bars
        if (typeof window.updateTaskProgressBars === 'function') {
            window.updateTaskProgressBars();
        }
    } catch (error) {
        console.error("[main] Error in renderUI:", error);
    }
}

// Add game speed controls
window.setGameSpeed = function(speedMultiplier: number): void {
    GAME_CONFIG.SIMULATION_SPEED = speedMultiplier;
    console.log(`Game speed set to ${speedMultiplier}x`);
};

window.getGameSpeed = function(): number {
    return GAME_CONFIG.SIMULATION_SPEED;
};

// Pause/resume game simulation
window.toggleGamePause = function(): void {
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
    window.showPage = function(pageName: string): void {
        console.log(`Navigating to page: ${pageName}`);

        // Update the active navigation item in the sidebar
        if (typeof window.updateActiveNavItem === 'function') {
            window.updateActiveNavItem(pageName);
        }

        // Get the main content container
        const mainContent = document.querySelector<HTMLElement>('.main-content');
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

        const renderer = (window as unknown as Record<string, unknown>)[rendererName];
        if (typeof renderer === 'function') {
            try {
                // Call the page renderer
                (renderer as (container: HTMLElement) => void)(mainContent);
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
                    <pre>${(error as Error).message}</pre>
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

// Game loop monitoring. frameCount is incremented by gameLoop itself.
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

console.log("main.js loaded successfully");
