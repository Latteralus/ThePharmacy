/**
 * @fileoverview This file defines the TimeEvents class, which is responsible for
 * managing the time-related events in the game. It also creates a global instance of this
 * class called `timeEvents` and adds it to the window object.
 */

class TimeEvents {
    constructor() {
    }

    endOfDay(gameState) {
        console.log("[timeEvents] End of Day.");
    }

    minuteCheck(gameState) {
        console.log("[timeEvents] Minute check.");
    }
}

window.timeEvents = new TimeEvents();
