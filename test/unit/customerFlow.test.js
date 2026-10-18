/**
 * Tests for the customer and task state machines (review finding A4) and
 * the bugs they fix: duplicate fill tasks (H1), the fill/consultation
 * desync (H4), fills racing for the last unit of stock (M8) and resets
 * leaving customers with nothing to wait on (M11). Also compounding
 * materials (H2) and customers' response to price (H3). Runs the real task,
 * assignment, production, customer and prescription modules on the game
 * clock, one fixed step per game second like main.ts's updateGameTime.
 * Phase 7: staff speed and morale (M7), and equipment gating, capacity,
 * wear and repair, with customers turned away when they can't be supplied (H8).
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
  window.ui = { updateTime: jest.fn() };
  window.brandReputation = { loseReputation: jest.fn(), gainReputation: jest.fn() };
  window.research = { getUnlockedProducts: () => ['pd001'] };

  require('../../main/js/clock.js');
  require('../../main/js/ids.js');
  require('../../main/js/data/names.js');
  require('../../main/js/data/employees.js'); // work speed and morale
  window.employeesData = employees;
  require('../../main/js/data/materials.js');
  require('../../main/js/data/products.js');
  require('../../main/js/data/equipment.js'); // completed tasks wear it down
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
    // As loaded from a v2 save: no fill holds stock yet. Set directly:
    // returnStock would hand a's unit straight to b's waiting fill.
    fillFor(a).stockTaken = false;
    product().inventory += fillFor(a).quantityNeeded;
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

describe('stock that comes in goes to fills still waiting', () => {
  test('a restock supplies a fill whose compound has not started, and that compound is dropped', () => {
    loadGame({ stock: 1 });
    window.customers.generateCustomer();
    const waiting = window.customers.generateCustomer();
    expect(fillFor(waiting).status).toBe('pending-dependent');

    window.production.handleTaskCompletion({ type: 'compound', productId: 'pd001', quantityToMake: 3 });

    expect(fillFor(waiting)).toMatchObject({ status: 'pending', stockTaken: true, dependencyTaskId: undefined });
    expect(task(`compound-${waiting.prescriptionId}`)).toBeUndefined();
    expect(product().inventory).toBe(2);
    expect(refusals()).toHaveLength(0);
  });

  test('a compound already under way is kept, and its fill keeps waiting for it', () => {
    loadGame({ stock: 1 });
    window.customers.generateCustomer();
    const waiting = window.customers.generateCustomer();
    const compoundId = `compound-${waiting.prescriptionId}`;
    expect(window.taskAssignment.assignTaskToEmployee(compoundId, LAB_TECH)).toBe(true);

    window.production.handleTaskCompletion({ type: 'compound', productId: 'pd001', quantityToMake: 3 });

    expect(fillFor(waiting).status).toBe('pending-dependent');
    expect(task(compoundId).status).toBe('inProgress');
    expect(product().inventory).toBe(3);
  });

  test('a customer who walks out hands their stock to the next fill waiting for it', () => {
    loadGame({ stock: 1 });
    const leaving = window.customers.generateCustomer();
    const waiting = window.customers.generateCustomer();

    window.customers.customerLeaves(leaving.id, 'impatient');

    expect(fillFor(waiting)).toMatchObject({ status: 'pending', stockTaken: true });
    expect(task(`compound-${waiting.prescriptionId}`)).toBeUndefined();
    expect(product().inventory).toBe(0);
  });
});

describe('loose ends from earlier phases', () => {
  afterEach(() => {
    delete window.notifications;
  });

  test("the player is told when a customer's compound has no materials", () => {
    loadGame({ stock: 0 });
    materialsFor(0);
    window.notifications = { add: jest.fn() };

    const customer = window.customers.generateCustomer();

    expect(task(`compound-${customer.prescriptionId}`).status).toBe('pending');
    expect(window.notifications.add).toHaveBeenCalledWith(expect.stringContaining('Not enough materials'), 'warning');
  });

  test('no warning when the materials are there', () => {
    loadGame({ stock: 0 });
    window.notifications = { add: jest.fn() };

    window.customers.generateCustomer();

    expect(window.notifications.add).not.toHaveBeenCalled();
  });

  test('no materials warning when the equipment is only busy with another compound (Phase 7)', () => {
    loadGame({ stock: 0 });
    window.notifications = { add: jest.fn() };
    const restock = window.production.createCompoundTask(product(), 1);
    run(1 / 60);
    expect(restock.status).toBe('inProgress');

    const customer = window.customers.generateCustomer();
    run(1 / 60);

    expect(task(`compound-${customer.prescriptionId}`).status).toBe('pending');
    expect(window.notifications.add).not.toHaveBeenCalled();
  });

  test('a refill is only used up once its prescription has been written', () => {
    loadGame(); // random() = 0: the next arrival is a returning customer
    const record = {
      id: 'refill-1',
      customerFirstName: 'Rita',
      customerLastName: 'Refill',
      insurancePlanName: window.insuranceData[0].planName,
      productId: 'pd999', // not a product (yet)
      productName: 'Missing',
      dosage: 1,
      dosageForm: 'Tablet',
      frequency: 'once daily',
      doctorName: 'Dr. Test',
      refillsAvailable: 1,
      eligibleAfterTime: 0,
      sourcePrescriptionId: 'pres-0',
    };
    window.prescriptions.refillRegistry.push(record);

    expect(window.customers.generateCustomer()).toBeNull();
    expect(window.prescriptions.refillRegistry).toEqual([record]);

    record.productId = 'pd001';
    const customer = window.customers.generateCustomer();
    expect(customer).toMatchObject({ firstName: 'Rita', isReturning: true });
    expect(window.prescriptions.refillRegistry).toHaveLength(0);
  });

  test('departures are counted by reason for the daily summary, and reset the next day', () => {
    loadGame({ stock: 5 });
    window.ui.updateTime = jest.fn();
    require('../../main/js/timeEvents.js');
    const reasons = ['served', 'served', 'impatient', 'price'];
    reasons.forEach((reason) => window.customers.customerLeaves(window.customers.generateCustomer().id, reason));

    expect(window.gameState.customersToday).toEqual({ served: 2, impatient: 1, price: 1 });

    window.timeEvents.skipToNextDay(window.gameState);
    expect(window.gameState.customersToday).toEqual({});
  });

  test("loading a save cancels the old session's customers who haven't arrived yet", () => {
    loadGame();
    require('../../main/js/timeEvents.js');
    window.brandReputation.calcCustomers = () => 3;

    window.timeEvents.spawnCustomersForHour(9);
    run(0.25, { autoAssign: false });
    expect(window.customers.activeCustomers).toHaveLength(1); // spaced half a minute apart

    window.timeEvents.cancelPendingArrivals();
    run(5, { autoAssign: false });
    expect(window.customers.activeCustomers).toHaveLength(1);
  });
});

describe('staff matter (M7, Phase 7)', () => {
  afterEach(() => {
    delete window.notifications;
  });

  function skilled(id, role, skill, morale = 80) {
    const e = employee(id, role);
    e.skills = { ...e.skills, compounding: skill, dispensing: skill, customerService: skill };
    e.morale = morale;
    return e;
  }

  test('speed follows the skill the task uses, and morale below 50 slows it', () => {
    loadGame();
    const rate = (skill, morale, type = 'compound') =>
      window.employees.workRate(skilled('x', 'Lab Technician', skill, morale), { type });
    expect(rate(50, 80)).toBe(1);
    expect(rate(100, 80)).toBe(1.5);
    expect(rate(0, 80)).toBe(0.5);
    expect(rate(50, 50)).toBe(1);
    expect(rate(50, 25)).toBeCloseTo(0.85);
    expect(rate(50, 0)).toBeCloseTo(0.7);

    const e = employee('y', 'Cashier');
    e.skills = { ...e.skills, customerService: 90, dispensing: 10, compounding: 0 };
    expect(window.employees.workRate(e, { type: 'customerInteraction' })).toBeCloseTo(1.4);
    expect(window.employees.workRate(e, { type: 'fillPrescription' })).toBeCloseTo(0.6);
    expect(window.employees.workRate(e, { type: 'consultation' })).toBeCloseTo(1);
  });

  test('a skilled lab technician finishes a 15-minute compound in 10 minutes, and the bar says so', () => {
    loadGame({ stock: 0, employees: [skilled(LAB_TECH, 'Lab Technician', 100)] });
    const restock = window.production.createCompoundTask(product(), 1);
    expect(restock.totalTime).toBe(15);

    run(1 / 60); // assigned at the end of the first step
    expect(window.taskManager.minutesLeft(restock)).toBeCloseTo(10);
    run(9.9);
    expect(task(restock.id)).toBeDefined();
    run(0.2);
    expect(task(restock.id)).toBeUndefined();
    expect(product().inventory).toBe(1);
  });

  test('the fastest free employee in the role gets the task', () => {
    loadGame({
      stock: 0,
      employees: [skilled('slow', 'Lab Technician', 40), skilled('fast', 'Lab Technician', 90)],
    });
    const restock = window.production.createCompoundTask(product(), 1);
    run(1 / 60);
    expect(restock.assignedTo).toBe('fast');
  });

  test('hours worked are counted, and finishing a task no longer raises morale', () => {
    loadGame({ stock: 5 });
    window.customers.generateCustomer();
    run(30);
    expect(window.customers.activeCustomers).toHaveLength(0);
    expect(staff(CASHIER).minutesWorkedToday).toBeCloseTo(6, 0); // check-in and checkout, 3 minutes each
    expect(staff(PHARMACIST).minutesWorkedToday).toBeCloseTo(5, 0);
    expect(staff(LAB_TECH).minutesWorkedToday).toBeCloseTo(10, 0);
    expect(window.employeesData.map((e) => e.morale)).toEqual([80, 80, 80]);
  });

  test('at closing, overwork lowers morale, rest raises it, and so does pay against the market', () => {
    loadGame();
    window.notifications = { add: jest.fn() };
    const tech = staff(LAB_TECH);
    const fair = window.helpers.fairSalary(tech);
    expect(fair).toBe(34480); // compounding 50
    tech.salary = fair;
    tech.morale = 70;

    tech.minutesWorkedToday = 11 * 60;
    let [report] = window.employees.endOfDay().filter((r) => r.id === LAB_TECH);
    expect(tech.morale).toBeCloseTo(70 - 1.5 * 3);
    expect(tech.minutesWorkedToday).toBe(0);
    expect(report).toMatchObject({ hoursWorked: 11, moraleBefore: 70, reasons: ['overworked (11.0h)'] });

    window.employees.endOfDay(); // a quiet day
    expect(tech.morale).toBeCloseTo(65.5 + 2);

    tech.salary = fair * 0.8;
    [report] = window.employees.endOfDay().filter((r) => r.id === LAB_TECH);
    expect(tech.morale).toBeCloseTo(67.5 + 2 - 1.6);
    expect(report.reasons).toEqual(['paid 20% under market']);

    tech.salary = fair * 2; // pay helps, up to +2 a day
    window.employees.endOfDay();
    expect(tech.morale).toBeCloseTo(67.9 + 2 + 2);
    expect(window.employees.lastDayReport).toHaveLength(3);
  });

  test('the player is warned when morale falls below 40', () => {
    loadGame();
    window.notifications = { add: jest.fn() };
    const tech = staff(LAB_TECH);
    tech.salary = window.helpers.fairSalary(tech);
    tech.morale = 41;
    tech.minutesWorkedToday = 10 * 60;
    window.employees.endOfDay();
    expect(tech.morale).toBeCloseTo(38);
    expect(window.notifications.add).toHaveBeenCalledWith(expect.stringContaining('morale is low'), 'warning');
  });

  test('someone with very low morale may quit overnight, and their work goes back in the queue', () => {
    loadGame({ stock: 0 }); // random() = 0: the quit roll succeeds
    window.notifications = { add: jest.fn() };
    const restock = window.production.createCompoundTask(product(), 1);
    run(1 / 60);
    expect(restock.assignedTo).toBe(LAB_TECH);

    staff(LAB_TECH).morale = 10;
    const report = window.employees.endOfDay();

    expect(staff(LAB_TECH)).toBeUndefined();
    expect(report.find((r) => r.id === LAB_TECH).quit).toBe(true);
    expect(restock).toMatchObject({ status: 'pending', assignedTo: null });
    expect(window.notifications.add).toHaveBeenCalledWith(expect.stringContaining('quit'), 'error');
  });

  test('nobody quits above 25 morale, or when the roll fails', () => {
    loadGame();
    staff(LAB_TECH).morale = 30;
    window.employees.endOfDay();
    expect(staff(LAB_TECH)).toBeDefined();

    Math.random.mockReturnValue(0.99);
    staff(LAB_TECH).morale = 5;
    window.employees.endOfDay();
    expect(staff(LAB_TECH)).toBeDefined();
  });

  test('salaries can be changed, but not to $0 or less', () => {
    loadGame();
    expect(window.employees.setSalary(LAB_TECH, 0)).toBe(false);
    expect(window.employees.setSalary(LAB_TECH, -5)).toBe(false);
    expect(window.employees.setSalary(LAB_TECH, NaN)).toBe(false);
    expect(staff(LAB_TECH).salary).toBe(50000);
    expect(window.employees.setSalary(LAB_TECH, 41000.4)).toBe(true);
    expect(staff(LAB_TECH).salary).toBe(41000);
  });

  test('closing time charges wages, then moves morale', () => {
    loadGame();
    window.ui.updateTime = jest.fn();
    require('../../main/js/timeEvents.js');
    staff(LAB_TECH).minutesWorkedToday = 600;

    window.timeEvents.endOfDay(window.gameState);

    expect(window.financesData.transactions.some((t) => t.category === 'wages')).toBe(true);
    expect(window.employees.lastDayReport.map((r) => r.id)).toEqual([CASHIER, PHARMACIST, LAB_TECH]);
    expect(staff(LAB_TECH).minutesWorkedToday).toBe(0);
  });
});

describe('equipment matters (H8, Phase 7)', () => {
  afterEach(() => {
    delete window.notifications;
  });

  function equipment(id) {
    return window.equipmentData.find((e) => e.id === id);
  }

  test('a product needs every item in its equipment list, owned and not broken', () => {
    loadGame();
    expect(product().equipmentNeeded).toEqual(['eq001', 'eq002', 'eq003']);
    expect(window.production.canMake(product())).toBe(true);

    equipment('eq002').owned = 0;
    expect(window.production.canMake(product())).toBe(false);
    expect(window.production.missingEquipmentText(product())).toBe('needs Tablet Press');

    equipment('eq002').owned = 1;
    equipment('eq003').durability = 0;
    expect(window.production.canMake(product())).toBe(false);
    expect(window.production.missingEquipmentText(product())).toBe('Powder Blender is broken');
  });

  test("a customer whose prescription can't be supplied is turned away, and the player told once a day", () => {
    loadGame({ stock: 0 });
    window.notifications = { add: jest.fn() };
    equipment('eq002').owned = 0;

    expect(window.customers.generateCustomer()).toBeNull();
    expect(window.customers.generateCustomer()).toBeNull();

    expect(window.customers.activeCustomers).toHaveLength(0);
    expect(tasks()).toHaveLength(0);
    expect(window.prescriptions.activePrescriptions).toHaveLength(0);
    expect(window.gameState.customersToday).toEqual({ unavailable: 2 });
    expect(window.brandReputation.loseReputation).toHaveBeenCalledTimes(2);
    expect(window.brandReputation.loseReputation).toHaveBeenCalledWith(0.25);
    expect(window.notifications.add).toHaveBeenCalledTimes(1);
    expect(window.notifications.add).toHaveBeenCalledWith(expect.stringContaining('needs Tablet Press'), 'warning');

    window.gameState.dayIndex++;
    window.customers.generateCustomer();
    expect(window.notifications.add).toHaveBeenCalledTimes(2);
  });

  test('stock on the shelf is sold even without the equipment to make more', () => {
    loadGame({ stock: 3 });
    equipment('eq002').owned = 0;
    const customer = window.customers.generateCustomer();
    expect(fillFor(customer).stockTaken).toBe(true);
    run(30);
    expect(window.gameState.customersToday).toEqual({ served: 1 });
  });

  test('demand is drawn evenly from what research has unlocked, not from what can be made', () => {
    loadGame({ stock: 5, random: 0.5 }); // picks the second of two products
    window.notifications = { add: jest.fn() };
    window.research.getUnlockedProducts = () => ['pd001', 'pd002'];

    window.customers.generateCustomer();

    // pd002 (a capsule) needs a Capsule Filler, which a new game doesn't own
    expect(window.gameState.customersToday).toEqual({ unavailable: 1 });
    expect(window.notifications.add).toHaveBeenCalledWith(expect.stringContaining('Capsule Filler'), 'warning');
  });

  test('each unit takes one compound at a time; buying more lets two run at once', () => {
    loadGame({
      stock: 0,
      employees: [employee(LAB_TECH, 'Lab Technician'), employee('labtech2', 'Lab Technician')],
    });
    const a = window.production.createCompoundTask(product(), 1);
    const b = window.production.createCompoundTask(product(), 1);
    run(1);
    expect([a.status, b.status].sort()).toEqual(['inProgress', 'pending']);
    expect(b.materialsTaken || a.materialsTaken).toBe(true);
    expect(window.production.inUse(equipment('eq002'))).toBe(1);
    expect(window.employeesData.filter((e) => e.currentTaskId)).toHaveLength(1);

    ['eq001', 'eq002', 'eq003'].forEach((id) => window.production.addEquipment(equipment(id), 1));
    run(1 / 60);
    expect([a.status, b.status]).toEqual(['inProgress', 'inProgress']);
  });

  test('a finished compound wears its equipment, shared by the units owned', () => {
    loadGame({ stock: 0 });
    equipment('eq002').owned = 2;
    const restock = window.production.createCompoundTask(product(), 1);
    run(16);
    expect(task(restock.id)).toBeUndefined();
    expect(equipment('eq001').durability).toBe(99.5);
    expect(equipment('eq002').durability).toBe(99.75);
  });

  test('worn equipment slows compounding; broken equipment stops it until repaired', () => {
    loadGame({ stock: 0 });
    window.notifications = { add: jest.fn() };
    const restock = window.production.createCompoundTask(product(), 1);
    run(1 / 60);

    equipment('eq001').durability = 25;
    expect(window.production.conditionFactor('pd001')).toBe(0.75);
    expect(window.taskManager.workRate(restock)).toBe(0.75);

    equipment('eq001').durability = 0.5;
    run(31);
    expect(task(restock.id)).toBeUndefined();
    expect(equipment('eq001').durability).toBe(0);
    expect(window.notifications.add).toHaveBeenCalledWith(
      expect.stringContaining('Mortar and Pestle is broken'),
      'error',
    );

    const next = window.production.createCompoundTask(product(), 1);
    run(1);
    expect(next.status).toBe('pending');

    // A repair costs a quarter of the price per unit for full wear: $125
    window.financesData.cash = 100;
    expect(window.production.repairCost(equipment('eq001'))).toBe(125);
    expect(window.production.repairEquipment('eq001')).toBe(false);
    expect(equipment('eq001').durability).toBe(0);

    window.financesData.cash = 1000;
    expect(window.production.repairEquipment('eq001')).toBe(true);
    expect(equipment('eq001').durability).toBe(100);
    expect(window.financesData.cash).toBe(875);
    expect(window.financesData.transactions.find((t) => t.description === 'Repaired Mortar and Pestle')).toMatchObject({
      category: 'equipment',
      amount: 125,
    });
    run(1 / 60);
    expect(next.status).toBe('inProgress');
  });

  test('new units are in perfect condition, so buying one improves the average', () => {
    loadGame();
    equipment('eq002').durability = 40;
    window.production.addEquipment(equipment('eq002'), 1);
    expect(equipment('eq002')).toMatchObject({ owned: 2, durability: 70 });
  });

  test('restocks only cover products that are unlocked and can be made', () => {
    loadGame({ stock: 0, employees: [] });
    window.research.getUnlockedProducts = () => ['pd001', 'pd002'];
    window.productsData.forEach((p) => (p.maxInventory = 5));

    window.production.checkAndCreateCompoundTasks();
    expect(tasks().map((t) => t.productId)).toEqual(['pd001']);

    // The Tablet Press breaks: the queued restock is dropped until it's fixed
    equipment('eq002').durability = 0;
    window.production.checkAndCreateCompoundTasks();
    expect(tasks()).toHaveLength(0);
  });
});
