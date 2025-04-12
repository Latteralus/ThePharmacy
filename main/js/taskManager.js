/** 
 * @fileoverview This file defines the TaskManager class, which is responsible for
 * managing the tasks in the game. It also creates a global instance of this
 * class called `taskManager` and adds it to the window object.
 */

class TaskManager {
    constructor() {
    }

    updateTasks(minutesElapsed) {
        console.log(`[taskManager] Updating tasks by ${minutesElapsed} minutes`);
    }
}

window.taskManager = new TaskManager();

