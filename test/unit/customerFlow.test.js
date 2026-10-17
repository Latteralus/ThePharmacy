/**
 * Tests for the customer and task state machines (review finding A4) and
 * the bugs they fix: duplicate fill tasks (H1), the fill/consultation
 * desync (H4), fills racing for the last unit of stock (M8) and resets
 * leaving customers with nothing to wait on (M11). Also compounding
 * materials (H2) and customers' response to price (H3). Runs the real task,
 * assignment, production, customer and prescription modules on the game
 * clock, one fixed step per game second like main.ts's updateGameTime.
 */

function employee(id, role) {
  return {
    id,
    firstName: id,
    lastName: 'Test',
    role,
    salary: 50000,
    skills: { compounding: 50, dispensing: 50, customerService: 50, inventoryManagement: 50, sales: 50 },
    morale: 80,
    currentTaskId: null,
    hireDate: new Date(2023, 0, 1),
  };
}

const CASHIER = 'cashier';
const PHARMACIST = 'pharmacist';
const LAB_TECH = 'labtech';
const FULL_STAFF = () => [
  employee(CASHIER, 'Cashier'),
  employee(PHARMACIST, 'Pharmacist'),
  employee(LAB_TECH, 'Lab Technician'),
];

let warnSpy;

// A game at 09:00 where every prescription is for pd001 (price $10, plenty
// of materials). random() picks the first option everywhere: dosage 1, no
// refills, a Normal customer on the first insurance plan.
function loadGame({ employees = FULL_STAFF(), stock = 5, random = 0 } = {}) {
  jest.resetModules();
  window.gameState = {
    currentDate: new Date(2023, 0, 2, 9, 0, 0, 0),
    dayIndex: 1,
    isDayActive: true,
    isPaused: false,
  };
  window.updateUI = jest.fn();
  window.ui = { updateCustomers: jest.fn(), updatePrescriptions: jest.fn() };
  window.brandReputation = { loseReputation: jest.fn(), gainReputation: jest.fn() };
  window.employees = { updateEmployeeMoodOnTaskCompletion: jest.fn() };
  window.research = { getUnlockedProducts: () => ['pd001'] };
  window.employeesData = employees;

  require('../../main/js/clock.js');
  require('../../main/js/ids.js');
  require('../../main/js/data/names.js');
  require('../../main/js/data/materials.js');
  require('../../main/js/data/products.js');
  require('../../main/js/data/helpers.js');
  require('../../main/js/data/insurance.js');
  require('../../main/js/data/finances.js');
  require('../../main/js/insuranceClaims.js');
  require('../../main/js/taskManager.js');
  require('../../main/js/taskAssignment.js');
  require('../../main/js/production.js');
  require('../../main/js/customers.js');
  require('../../main/js/prescriptions.js');

  window.materialsData.forEach((m) => {
    m.inventory = 10000;
  });
  product().inventory = stock;
  product().price = 10;
  window.financesData.cash = 1000;

  jest.spyOn(Math, 'random').mockReturnValue(random);
}

function product() {
  return window.productsData.find((p) => p.id === 'pd001');
}

function tasks() {
  return window.taskManager.tasks;
}

function task(id) {
  return window.taskManager.getTaskById(id);
}

function fillFor(customer) {
  return task(`fill-${customer.prescriptionId}`);
}

function staff(id) {
  return window.employeesData.find((e) => e.id === id);
}

function material(id) {
  return window.materialsData.find((m) => m.id === id);
}

// Leaves exactly enough of pd001's materials for `units` units.
function materialsFor(units) {
  product().ingredients.forEach((ing) => {
    material(ing.id).inventory = ing.quantity * units;
  });
}

// How many units of pd001 the materials left would make.
function unitsOfMaterials() {
  return Math.min(...product().ingredients.map((ing) => material(ing.id).inventory / ing.quantity));
}

// Advance game time one second per step, as updateGameTime does. With
// autoAssign off, tasks only start when a test assigns them.
function run(minutes, { autoAssign = true } = {}) {
  for (let i = 0; i < minutes * 60; i++) {
    window.gameState.currentDate.setTime(window.gameState.currentDate.getTime() + 1000);
    window.taskManager.updateTasks(1 / 60);
    window.clock.tick();
    if (autoAssign) window.taskAssignment.assignIfRequested();
  }
}

function refusals() {
  return warnSpy.mock.calls.filter(([message]) => String(message).includes('Refused'));
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('a customer visit', () => {
  test('in stock: checked in, consulted, filled and checked out, then they pay and leave', () => {
    loadGame({ stock: 5 });
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const setIntervalSpy = jest.spyOn(global, 'setInterval');

    const customer = window.customers.generateCustomer();
    // The fill took its unit as soon as it was created
    expect(fillFor(customer).stockTaken).toBe(true);
    expect(product().inventory).toBe(4);

    run(30);

    expect(window.customers.activeCustomers).toHaveLength(0);
    expect(tasks()).toHaveLength(0);
    expect(window.prescriptions.activePrescriptions).toHaveLength(0);
    expect(product().inventory).toBe(4);
    expect(window.financesData.cash).toBe(1002); // 20% copay on $10
    expect(window.insuranceClaims.pendingClaims).toHaveLength(1);
    expect(window.brandReputation.loseReputation).not.toHaveBeenCalled();
    expect(window.employeesData.every((e) => e.currentTaskId === null)).toBe(true);
    expect(refusals()).toEqual([]);
    // Assignment runs in game time, not on real-time timers (the old
    // 100 ms "run again" loop)
    expect(setTimeoutSpy).not.toHaveBeenCalled();
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  test('out of stock (H1): one fill, waiting on one compound, each worked once, stock used once', () => {
    loadGame({ stock: 0 });
    const material = window.materialsData.find((m) => m.id === 'mat001');
    const started = {};
    window.taskManager.addEventListener('taskStatusChanged', ({ task: t, newStatus }) => {
      if (newStatus === 'inProgress') started[t.id] = (started[t.id] || 0) + 1;
    });

    const customer = window.customers.generateCustomer();
    const fills = tasks().filter((t) => t.type === 'fillPrescription');
    expect(fills).toHaveLength(1);
    expect(fills[0].status).toBe('pending-dependent');
    expect(fills[0].dependencyTaskId).toBe(`compound-${customer.prescriptionId}`);

    run(60);

    expect(window.customers.activeCustomers).toHaveLength(0);
    expect(tasks()).toHaveLength(0);
    // Made one, sold one. It used to end at -1 (the second fill-<id>
    // deducted again).
    expect(product().inventory).toBe(0);
    expect(material.inventory).toBe(10000 - 100);
    expect(window.financesData.completedOrders).toBe(1);
    expect(Object.values(started).every((n) => n === 1)).toBe(true);
    expect(started[`fill-${customer.prescriptionId}`]).toBe(1);
  });

  test('fill done before the consultation (H4): the customer still reaches checkout', () => {
    loadGame({ employees: [employee(CASHIER, 'Cashier'), employee(LAB_TECH, 'Lab Technician')] });
    const manual = { autoAssign: false };
    const customer = window.customers.generateCustomer();
    const fillId = fillFor(customer).id;

    window.taskAssignment.assignTaskToEmployee(`checkin-${customer.id}`, CASHIER);
    window.taskAssignment.assignTaskToEmployee(fillId, LAB_TECH);
    run(4, manual);
    expect(customer.status).toBe('waitingForConsultation');
    expect(task(`consult-${customer.id}`).status).toBe('pending');

    // The fill finishes while the consultation hasn't started
    run(8, manual);
    expect(task(fillId)).toBeUndefined();
    expect(window.prescriptions.getPrescription(customer.prescriptionId).status).toBe('filled');
    expect(customer.status).toBe('waitingForConsultation');

    window.taskAssignment.assignTaskToEmployee(`consult-${customer.id}`, CASHIER);
    run(6, manual);
    // It used to land in waitingForFill here and never leave
    expect(customer.status).toBe('readyForCheckout');
    expect(task(`checkout-${customer.id}`)).toBeDefined();

    window.taskAssignment.assignTaskToEmployee(`checkout-${customer.id}`, CASHIER);
    run(4, manual);
    expect(window.customers.activeCustomers).toHaveLength(0);
    expect(window.financesData.completedOrders).toBe(1);
    expect(window.brandReputation.loseReputation).not.toHaveBeenCalled();
    expect(refusals()).toEqual([]);
  });

  test('an event the status does not allow is refused and changes nothing', () => {
    loadGame();
    const customer = window.customers.generateCustomer();

    expect(window.customers.advance(customer.id, 'paid')).toBe(false);
    expect(window.customers.advance(customer.id, 'consulted')).toBe(false);
    expect(customer.status).toBe('waitingForCheckIn');
    expect(window.financesData.cash).toBe(1000);
    expect(refusals()).toHaveLength(2);
  });

  test("a customer's compound goes ahead of restocking", () => {
    loadGame({ employees: [employee(CASHIER, 'Cashier'), employee(LAB_TECH, 'Lab Technician')], stock: 0 });
    window.production.checkAndCreateCompoundTasks(); // what a new game queues
    const customer = window.customers.generateCustomer();

    run(1);
    // It used to take every compound-pd... restock first (sorted by id)
    expect(staff(LAB_TECH).currentTaskId).toBe(`compound-${customer.prescriptionId}`);
  });

  test('a task can only be picked up while it is waiting', () => {
    loadGame();
    const customer = window.customers.generateCustomer();
    const checkInId = `checkin-${customer.id}`;
    expect(window.taskAssignment.assignTaskToEmployee(checkInId, CASHIER)).toBe(true);

    // Taking it from someone mid-way is what made duplicates ping-pong
    expect(window.taskAssignment.assignTaskToEmployee(checkInId, PHARMACIST)).toBe(false);
    expect(task(checkInId).assignedTo).toBe(CASHIER);
    expect(staff(PHARMACIST).currentTaskId).toBeNull();
  });
});

describe('stock is reserved by the fill (M8)', () => {
  test('two prescriptions for the last unit: the first holds it, the second waits on a compound', () => {
    loadGame({ stock: 1 });
    const first = window.customers.generateCustomer();
    const second = window.customers.generateCustomer();

    expect(fillFor(first)).toMatchObject({ status: 'pending', stockTaken: true });
    expect(fillFor(second)).toMatchObject({
      status: 'pending-dependent',
      dependencyTaskId: `compound-${second.prescriptionId}`,
    });
    expect(product().inventory).toBe(0);
  });

  test('stock below the dosage gets a compound (it used to wait for the hourly restock)', () => {
    loadGame({ stock: 1, random: 0.5 }); // dosage 2
    const customer = window.customers.generateCustomer();

    expect(fillFor(customer).status).toBe('pending-dependent');
    expect(task(`compound-${customer.prescriptionId}`).quantityToMake).toBe(2);
    expect(product().inventory).toBe(1);
  });

  test('a customer who walks out puts their stock back and frees their staff', () => {
    loadGame({ stock: 3 });
    const customer = window.customers.generateCustomer();
    run(1);
    expect(staff(LAB_TECH).currentTaskId).toBe(fillFor(customer).id);
    expect(product().inventory).toBe(2);

    window.customers.customerLeaves(customer.id, 'impatient');

    expect(product().inventory).toBe(3);
    expect(tasks()).toHaveLength(0);
    expect(window.employeesData.every((e) => e.currentTaskId === null)).toBe(true);
    expect(window.brandReputation.loseReputation).toHaveBeenCalledTimes(1);
    expect(window.brandReputation.loseReputation).toHaveBeenCalledWith(1.5);
  });
});

describe('repairs (M11)', () => {
  test('after every task is cancelled, reconciling gives a waiting customer what they need', () => {
    loadGame({ stock: 5 });
    const customer = window.customers.generateCustomer();
    run(4);
    expect(customer.status).toBe('waitingForConsultation');

    // What Settings > Reset All Tasks does
    [...tasks()].forEach((t) => window.taskManager.cancelTask(t.id));
    expect(product().inventory).toBe(5);
    expect(window.employeesData.every((e) => e.currentTaskId === null)).toBe(true);

    expect(window.customers.reconcileTasks()).toBe(2); // consultation + fill
    expect(task(`consult-${customer.id}`)).toBeDefined();
    expect(fillFor(customer).stockTaken).toBe(true);
    expect(window.customers.reconcileTasks()).toBe(0);

    run(30);
    expect(window.customers.activeCustomers).toHaveLength(0);
    expect(window.financesData.completedOrders).toBe(1);
  });

  test('a customer left waiting for a fill that is already done is moved on to checkout', () => {
    loadGame();
    const customer = window.customers.generateCustomer();
    // The state an older save can hold
    [...tasks()].forEach((t) => window.taskManager.cancelTask(t.id));
    customer.status = 'waitingForFill';
    window.prescriptions.getPrescription(customer.prescriptionId).status = 'filled';

    window.customers.reconcileTasks();

    expect(customer.status).toBe('readyForCheckout');
    expect(task(`checkout-${customer.id}`)).toMatchObject({ interaction: 'checkout', status: 'pending' });
  });

  test('a v2-style fill with no stock taken gets it, or a compound, when reconciled', () => {
    loadGame({ stock: 1 });
    const a = window.customers.generateCustomer();
    const b = window.customers.generateCustomer();
    // As loaded from a v2 save: no fill holds stock yet
    [fillFor(a), fillFor(b)].forEach((fill) => window.production.returnStock(fill));
    [...tasks()].filter((t) => t.type === 'compound').forEach((t) => window.taskManager.cancelTask(t.id));
    expect(fillFor(b)).toBeUndefined(); // cancelling the compound took its waiting fill with it

    window.customers.reconcileTasks();

    expect(fillFor(a).stockTaken).toBe(true);
    expect(fillFor(b).status).toBe('pending-dependent');
    expect(task(`compound-${b.prescriptionId}`)).toBeDefined();
    expect(product().inventory).toBe(0);
  });
});

describe('compounding takes materials for the whole batch (H2)', () => {
  test('a compound that needs 2 units waits with materials for 1, then takes both when it starts', () => {
    loadGame({ stock: 0, random: 0.5 }); // dosage 2
    materialsFor(1);
    const customer = window.customers.generateCustomer();
    const compound = task(`compound-${customer.prescriptionId}`);
    expect(compound.quantityToMake).toBe(2);

    run(1);
    expect(compound).toMatchObject({ status: 'pending', assignedTo: null });
    expect(staff(LAB_TECH).currentTaskId).toBeNull();
    expect(unitsOfMaterials()).toBe(1);

    // The player buys more (purchases request an assignment round)
    materialsFor(3);
    window.taskAssignment.requestAutoAssign();
    run(1);
    expect(staff(LAB_TECH).currentTaskId).toBe(compound.id);
    expect(compound.materialsTaken).toBe(true);
    expect(unitsOfMaterials()).toBe(1); // both units' worth left when it started

    run(60);
    expect(window.customers.activeCustomers).toHaveLength(0);
    expect(window.financesData.completedOrders).toBe(1);
    expect(unitsOfMaterials()).toBe(1); // nothing more taken at completion
    expect(product().inventory).toBe(0);
  });

  test('two compounds cannot both count on the same materials', () => {
    loadGame({
      stock: 0,
      employees: [...FULL_STAFF(), employee('labtech2', 'Lab Technician')],
    });
    materialsFor(1);
    const a = window.customers.generateCustomer();
    const b = window.customers.generateCustomer();

    run(1);
    const started = [a, b].map((c) => task(`compound-${c.prescriptionId}`).status);
    expect(started.sort()).toEqual(['inProgress', 'pending']);
    expect(unitsOfMaterials()).toBe(0);
    // The second lab tech wasn't tied up by the compound that couldn't start
    expect([staff(LAB_TECH), staff('labtech2')].filter((e) => e.currentTaskId)).toHaveLength(1);
  });

  test('a compound that is cancelled puts its materials back', () => {
    loadGame({ stock: 0 });
    materialsFor(4);
    const customer = window.customers.generateCustomer();
    run(1);
    expect(task(`compound-${customer.prescriptionId}`).materialsTaken).toBe(true);
    expect(unitsOfMaterials()).toBe(3);

    window.customers.customerLeaves(customer.id, 'impatient');

    expect(unitsOfMaterials()).toBe(4);
    expect(tasks()).toHaveLength(0);
    expect(staff(LAB_TECH).currentTaskId).toBeNull();
  });

  test('a restock makes what the materials cover', () => {
    loadGame({ stock: 0, employees: [employee(LAB_TECH, 'Lab Technician')] });
    product().maxInventory = 5;
    materialsFor(2);
    window.production.checkAndCreateCompoundTasks();
    const restock = tasks().find((t) => t.type === 'compound' && t.productId === 'pd001');
    expect(restock.quantityToMake).toBe(2);

    // Queued for 5, but materials for only 3 are left when it starts
    [...tasks()].forEach((t) => window.taskManager.cancelTask(t.id));
    materialsFor(5);
    const big = window.production.createCompoundTask(product(), 5);
    materialsFor(3);
    run(1);
    expect(big).toMatchObject({ status: 'inProgress', quantityToMake: 3, materialsTaken: true });
    expect(big.totalTime).toBe(window.production.compoundTime(product(), 3));
    expect(unitsOfMaterials()).toBe(0);

    run(big.totalTime);
    expect(product().inventory).toBe(3);
  });

  test('a restock waits for a lab technician, so the pharmacist stays free to consult', () => {
    loadGame({ stock: 0, employees: [employee(CASHIER, 'Cashier'), employee(PHARMACIST, 'Pharmacist')] });
    const restock = window.production.createCompoundTask(product(), 5);
    const customer = window.customers.generateCustomer();

    run(1);
    expect(restock.status).toBe('pending');
    // The customer's own compound is fine for a pharmacist
    expect(staff(PHARMACIST).currentTaskId).toBe(`compound-${customer.prescriptionId}`);
  });

  test('compounding time grows with the batch', () => {
    loadGame();
    const minutes = (n) => window.production.compoundTime(product(), n);
    expect(minutes(1)).toBe(product().productionTime);
    expect(minutes(5)).toBe(Math.ceil(product().productionTime * 1.8));
    expect(minutes(50)).toBeGreaterThan(minutes(5));
  });
});

describe('price affects whether customers buy (H3)', () => {
  const market = () => window.finances.marketPrice('pd001');

  test('the market price ignores the player markup, and acceptance falls from 1 at market to 0 at 3x', () => {
    loadGame();
    const before = market();
    window.finances.applyMarkupToAllProducts(900);
    expect(market()).toBe(before);
    expect(market()).toBeCloseTo(window.calculateProductCost('pd001') * 1.35);

    const chance = window.finances.acceptanceChance;
    expect(chance(0.5)).toBe(1);
    expect(chance(1)).toBe(1);
    expect(chance(2)).toBe(0.5);
    expect(chance(3)).toBe(0);
    expect(chance(10)).toBe(0);
  });

  test('at 3x the market price the customer walks out at check-in, and their stock goes back', () => {
    loadGame({ stock: 5 });
    product().price = market() * 3;
    const customer = window.customers.generateCustomer();
    expect(product().inventory).toBe(4);

    run(4); // check-in takes 3 minutes

    expect(window.customers.activeCustomers).toHaveLength(0);
    expect(tasks()).toHaveLength(0);
    expect(product().inventory).toBe(5);
    expect(window.financesData.cash).toBe(1000);
    expect(window.insuranceClaims.pendingClaims).toHaveLength(0);
    expect(window.brandReputation.loseReputation).toHaveBeenCalledTimes(1);
    expect(window.brandReputation.loseReputation).toHaveBeenCalledWith(0.5);
    expect(customer.status).toBe('waitingForConsultation'); // left right after check-in
  });

  test('up to the market price everyone accepts, and pays the price agreed at check-in', () => {
    loadGame({ stock: 5, random: 0.99 }); // the least likely roll to accept, dosage 3, uninsured
    product().price = market();
    const customer = window.customers.generateCustomer();
    run(4);
    const prescription = window.prescriptions.getPrescription(customer.prescriptionId);
    expect(customer.status).toBe('waitingForConsultation');
    expect(prescription.quotedPrice).toBeCloseTo(market() * 3);

    // Raising the price afterwards doesn't change what they pay
    product().price = market() * 10;
    run(30);
    expect(window.customers.activeCustomers).toHaveLength(0);
    expect(window.financesData.cash).toBeCloseTo(1000 + market() * 3); // uninsured: full price
  });

  test('paying over the market price costs mood', () => {
    loadGame({ stock: 5 });
    product().price = market() * 2;
    const customer = window.customers.generateCustomer();
    const arrivalMood = customer.mood;

    run(4);

    // +1 for being checked in, -2 for paying twice the market price
    expect(customer.status).toBe('waitingForConsultation');
    expect(customer.mood).toBe(arrivalMood + 1 - 2);
  });

  test('prices must be above $0', () => {
    loadGame();
    expect(window.finances.updateProductPrice('pd001', 0)).toBe(false);
    expect(window.finances.updateProductPrice('pd001', -5)).toBe(false);
    expect(window.finances.updateProductPrice('pd001', NaN)).toBe(false);
    expect(product().price).toBe(10);
    expect(window.finances.applyMarkupToAllProducts(-50)).toBe(false);
    expect(product().price).toBe(10);
    expect(window.finances.updateProductPrice('pd001', 12.5)).toBe(true);
    expect(product().price).toBe(12.5);
  });
});
