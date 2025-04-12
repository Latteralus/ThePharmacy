/** 
 * @fileoverview This file serves as the primary entry point for the game application. 
 * It orchestrates the main game loop, manages the simulation's time flow, 
 * and coordinates the interactions between various game systems. It initializes 
 * the game state, handles time-based updates, and controls the rendering of the UI.
 */

import { initializeNewGame } from './gameInitialization.js';
import { gameState } from './gameInitialization.js';
import { taskManager } from './taskManager.js';
import { ui } from './ui.js';
import { timeEvents } from './timeEvents.js';

// Game configuration
const GAME_CONFIG = {
    SIMULATION_SPEED: 1.0, 
    GAME_MINUTE_IN_MS: 1000, 
    FIXED_TIMESTEP: 1000 / 60, 
    MAX_UPDATES_PER_FRAME: 10, 
    END_DAY_HOUR: 22 
};

// Initialize the game state (now always happens)
initializeNewGame();

// The main game loop using requestAnimationFrame
function gameLoop(timestamp) {
    // First frame won't have a previous timestamp
    if (!window.gameState.lastFrameTime) {
        window.gameState.lastFrameTime = timestamp;
        window.gameState.lastSimulationTime = timestamp;
        gameState.renderInfo.lastFpsUpdate = timestamp;
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // Calculate delta time (time since last frame)
    const deltaTime = timestamp - gameState.lastFrameTime;
    gameState.lastFrameTime = timestamp;
    
    if (gameState.isDayActive && !gameState.isPaused) {
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
    const simulationDelta = timestamp - gameState.lastSimulationTime;
    
    // Initialize simulationAccumulator if it doesn't exist
    if (gameState.simulationAccumulator === undefined) {
        gameState.simulationAccumulator = 0;
    }
    
    gameState.simulationAccumulator += simulationDelta;
    gameState.lastSimulationTime = timestamp;
    
    console.log(`[main] Simulation update, accumulator: ${gameState.simulationAccumulator.toFixed(2)}ms`);
    
    // Limit updates to prevent spiral of death
    let updates = 0;
    
    // While we have accumulated enough time to process a fixed step
    while (window.gameState.simulationAccumulator >= GAME_CONFIG.FIXED_TIMESTEP && updates < GAME_CONFIG.MAX_UPDATES_PER_FRAME) {
        // Calculate the game time to advance (in milliseconds)
        const gameTimeDelta = (GAME_CONFIG.FIXED_TIMESTEP * GAME_CONFIG.SIMULATION_SPEED) / GAME_CONFIG.GAME_MINUTE_IN_MS * 60 * 1000;
        
        console.log(`[main] Advancing game time by ${gameTimeDelta.toFixed(2)}ms (${(gameTimeDelta / (60 * 1000)).toFixed(2)} game minutes)`);
        
        // Update the game time with error handling
        try {                
             updateGameTime(gameTimeDelta);
        } catch (error) {            
            console.error("[main] Error in gameTime:", error);
            
        }
        
        gameState.simulationAccumulator -= GAME_CONFIG.FIXED_TIMESTEP;
        updates++;
    }

}

// Update the game time
function updateGameTime(msElapsed) {
    // Make sure currentDate exists before trying to modify it
    if (!window.gameState.currentDate) {
        window.gameState.currentDate = new Date(startDate.getTime());
        console.warn("[main] currentDate was undefined, initializing with gameState.currentDate");
    }
    
    // Advance the game time
    gameState.currentDate.setTime(gameState.currentDate.getTime() + msElapsed);
    
    // Convert milliseconds to minutes for task updates
    const minutesElapsed = msElapsed / (60 * 1000);
    
    
    if (taskManager && typeof taskManager.updateTasks === 'function' && minutesElapsed > 0) {
        try {
            taskManager.updateTasks(minutesElapsed);
        } catch (error) {
            console.error("[main] Error updating tasks:", error);
        }        
    }
    
    // Check for end of day (22:00 is 10 PM)
    const currentHour = gameState.currentDate.getHours();
    const currentMinute = gameState.currentDate.getMinutes();
    
    if (currentHour === GAME_CONFIG.END_DAY_HOUR && currentMinute === 0) {
        // Trigger end of day only once
        if (gameState.isDayActive) {
            console.log("End of day reached");
            window.gameState.isDayActive = false; // Stop advancing time
            if (timeEvents && typeof timeEvents.endOfDay === 'function') {
                try {
                    timeEvents.endOfDay(window.gameState);
                } catch (error) {                    
                     console.error("[main] Error in endOfDay event:", error);
                }
            }
        }
    } else {
        // Run minute checks at the appropriate frequency
        const minuteDelta = Math.floor(msElapsed / (60 * 1000)); // Convert ms to minutes
        
        if (minuteDelta > 0 && timeEvents && typeof timeEvents.minuteCheck === 'function') {
            try {
                for (let i = 0; i < minuteDelta; i++) {
                    timeEvents.minuteCheck(gameState);
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
        if (ui && typeof ui.updateTime === 'function'){
            try {
                ui.updateTime();
            } catch (error) {
                console.error("[main] Error updating UI time:", error);
            }
        }
        
        // Update any progress bars
        if (typeof window.updateTaskProgressBars === 'function') {
            try {
                window.updateTaskProgressBars();
            } catch (error) {
                console.error("[main] Error updating task progress bars:", error);
            }
        }
        
        // Update any countdown timers
        if (typeof window.updateCountdownTimers === 'function') {
            try {
                window.updateCountdownTimers();
            } catch (error) {
                console.error("[main] Error updating countdown timers:", error);
            }
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
    gameState.isPaused = !gameState.isPaused;
    console.log(`Game ${gameState.isPaused ? 'paused' : 'resumed'}`);
    
     if (!gameState.isPaused) {
        gameState.lastFrameTime = performance.now();
        gameState.lastSimulationTime = performance.now();
        gameState.simulationAccumulator = 0;
    }
};

// Expose the game loop for external use
window.gameLoop = gameLoop;

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
    const gameTimeStr = gameState?.currentDate instanceof Date 
        ? gameState.currentDate.toLocaleTimeString() 
        : 'unknown';
    
    console.log(`[main] Game loop health check: ${elapsed}ms since last frame, ` +
                `FPS: ${fps.toFixed(1)}, ` +
                `game time: ${gameTimeStr}`);
    
    if (gameState?.isPaused) {
        console.log("[main] Game is currently PAUSED");
    }
    
    if (!gameState?.isDayActive) {
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