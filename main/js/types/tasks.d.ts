// Work: the task queue, who does what, and compounding (taskManager.ts,
// taskAssignment.ts, production.ts, taskbars.ts).
//
// Ambient typings for the window globals: every file is a classic
// <script> (no modules), and each module adds its own fields to Window.

// Now the real, full shape (taskManager.ts owns it). The index signature is
// kept even though every field a converted creator (customers.ts,
// prescriptions.ts, production.ts) attaches is now named — cheap insurance
// against the still-plain-JS page files reading/writing ad hoc fields later.
// A task's lifecycle; see TASK_TRANSITIONS in taskManager.ts.
//   pending-dependent: waiting on another task (a fill on its compound)
//   pending: ready for an employee
//   inProgress: an employee is working on it
//   completed: done; finalizeTask removes it straight away
// A cancelled task is removed (taskManager.cancelTask), with no status.
type TaskStatus = 'pending-dependent' | 'pending' | 'inProgress' | 'completed';

interface Task {
    id: string;
    type: string;
    status: TaskStatus;
    progress: number;
    totalTime: number;
    customerId?: string;
    prescriptionId?: string;
    productId?: string;
    productName?: string;
    assignedTo?: string | null;
    roleNeeded?: string;
    quantityToMake?: number;
    quantityNeeded?: number;
    dependencyTaskId?: string;
    fillTaskDependency?: boolean;
    // customerInteraction tasks only: which end of the visit this is.
    interaction?: 'checkIn' | 'checkout';
    // fillPrescription tasks only: true once the task holds its product
    // (taken from inventory, returned if the task is cancelled).
    stockTaken?: boolean;
    // compound tasks only: true once the task holds the whole batch's
    // materials (taken when it starts, returned if it is cancelled).
    materialsTaken?: boolean;
    // Game time (ms), from clock.now().
    createdAt?: number;
    lastUpdateTime?: number;
    lastProgressTime?: number;
    assignedAt?: number;
    [key: string]: unknown;
}

// Now the real, full shape (taskManager.ts owns it).
interface TaskManagerApi {
    tasks: Task[];
    addTask: (task: Task) => Task;
    getTaskById: (taskId: string) => Task | undefined;
    getUnassignedTasks: () => Task[];
    getTasksForEmployee: (employeeId: string) => Task[];
    getTasksForCustomer: (customerId: string) => Task[];
    updateTasks: (minutes: number) => void;
    // Game minutes of work per game minute: the worker's speed and, for a
    // compound, the equipment's condition. 1 when nobody is on it.
    workRate: (task: Task) => number;
    // Game minutes until it's done at that speed.
    minutesLeft: (task: Task) => number;
    // The only thing that changes Task.status. Refuses (logs, returns
    // false) a move TASK_TRANSITIONS doesn't allow.
    setStatus: (task: Task, to: TaskStatus) => boolean;
    // Removes a task that won't be finished: frees its employee, returns a
    // fill's stock or a compound's materials, and cancels anything waiting on it.
    cancelTask: (taskId: string) => void;
    debugTaskStatus: () => void;
    addEventListener: (event: string, callback: (data: unknown) => void) => void;
    removeEventListener: (event: string, callback: (data: unknown) => void) => void;
    EVENTS: {
        TASK_ADDED: string;
        TASK_COMPLETED: string;
        TASK_PROGRESS_UPDATED: string;
        TASK_STATUS_CHANGED: string;
    };
}

// Now the real, full shape (taskAssignment.ts owns it).
interface TaskAssignmentApi {
    assignTaskToEmployee: (taskId: string, employeeId: string) => boolean;
    unassignTask: (taskId: string) => void;
    autoAssignTasks: () => void;
    // Asks for an autoAssignTasks run at the end of the current simulation
    // step (main.ts calls assignIfRequested), so a burst of task changes
    // is assigned once, in game time.
    requestAutoAssign: () => void;
    assignIfRequested: () => void;
    normalizeEmployeeRoles: () => void;
    // The roles that may do a task, in order of preference (Phase 9, #3):
    // 'anyone' for check-in and checkout, [] for nobody.
    eligibleRoles: (task: Task) => string[] | 'anyone';
    logTaskAssignmentState: () => void;
    forceTaskReassignment: () => void;
}

// production.js's public API. canCompound/createCompoundTask/
// handleTaskCompletion are read by prescriptions.ts and taskManager.js
// (still plain JS) respectively.
interface ProductionApi {
    // Whether the materials on hand cover `quantity` units (default 1).
    canCompound: (product: Product, quantity?: number) => boolean;
    // Minutes to make `quantity` units of a product.
    compoundTime: (product: Product, quantity: number) => number;
    // Every item in the product's equipmentNeeded is owned and not broken.
    canMake: (product: Product) => boolean;
    // The needed items that aren't owned or are broken.
    missingEquipment: (product: Product) => EquipmentItem[];
    // "needs Capsule Filler", "Tablet Press is broken", or '' if none.
    missingEquipmentText: (product: Product) => string;
    // Compounds in progress using this item (at most owned x capacity).
    inUse: (item: EquipmentItem) => number;
    // Compounding speed from the condition of the most worn item needed.
    conditionFactor: (productId: string) => number;
    // What a full repair of this item costs now.
    repairCost: (item: EquipmentItem) => number;
    // Pays for and does a full repair. False if refused (cash, or nothing to repair).
    repairEquipment: (equipmentId: string) => boolean;
    // Adds bought units; new units are in perfect condition.
    addEquipment: (item: EquipmentItem, quantity: number) => void;
    // Compound tasks: whether it could start now (its equipment owned,
    // working and free, and it holds its materials or they're on hand).
    canStartCompound: (compound: Task) => boolean;
    // Compound tasks: why it hasn't started ("Waiting for Tablet Press",
    // "Waiting for materials"), or '' if it could start now.
    compoundWaitReason: (compound: Task) => string;
    // Compound tasks: takes the batch's materials out of inventory (true),
    // shrinking a restock to what the materials cover, or returns false if
    // it can't start. True if it already holds them.
    takeMaterials: (compound: Task) => boolean;
    // Compound tasks: puts held materials back (the compound was cancelled).
    returnMaterials: (compound: Task) => void;
    createCompoundTask: (product: Product, quantity: number) => Task;
    checkAndCreateCompoundTasks: () => void;
    // Fill tasks: takes the task's quantity out of inventory (true), or
    // returns false if there isn't enough. True if it already holds it.
    takeStock: (fill: Task) => boolean;
    // Fill tasks: puts held stock back (the fill was cancelled).
    returnStock: (fill: Task) => void;
    handleTaskCompletion: (task: Task) => void;
    init: () => void;
}

interface TaskbarsApi {
    createProgressBar: (task: Task) => HTMLDivElement;
}

interface Window {
    taskManager: TaskManagerApi;
    taskAssignment: TaskAssignmentApi;
    production: ProductionApi;
    taskbars: TaskbarsApi;
    updateTaskProgressBars: () => void;
}
