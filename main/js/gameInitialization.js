// gameInitialization.js
/**
 * @fileoverview This file is responsible for the initialization of the game state.
 * It contains the initializeNewGame function that sets the initial properties for the game.
 */


import { GameState } from './gameState.js'; 



const startDate = new Date(2023, 0, 1, 7, 0);

const gameState = new GameState(startDate);

export { gameState };
/**
 * Initializes the game state with default values.
 */
function initializeNewGame() {
    
    
    
    
    console.log("[gameInitialization] Game state initialized successfully.");
}

export { initializeNewGame };