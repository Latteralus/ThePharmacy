/**
 * Tests for Phase 9, store controls and staff rules: realistic role limits
 * (#3), overtime past 8 hours a day or 40 a week with Send home and "Don't
 * allow overtime" (#7), closing the front and ending the day early (#8),
 * game speeds and skipping the daily summary (#49), and last entry an hour
 * before closing (#50). Runs the real modules on the game clock, one fixed
 * step per game second like main.ts's updateGameTime, and the real closing.
 */

function employee(id, role, salary = 29200) {
  return {
    id,
    firstName: id,
    lastName: 'Test',
    role,
    salary, // $100 a day, with payroll taxes and benefits
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

// A game at 09:00 on Monday, day 2 (dayIndex 1), where every prescription
// is for pd001 with stock on the shelf. random() picks the first option
// everywhere: dosage 1, no refills, a Normal customer on the first plan.
function loadGame({ employees = FULL_STAFF(), stock = 5 } = {}) {
  jest.resetModules();
  document.body.innerHTML = '';
  window.gameState = {
    currentDate: new Date(2023, 0, 2, 9, 0, 0, 0),
    dayIndex: 1,
    lastEndedDayIndex: 0,
    isDayActive: true,
    isPaused: false,
    frontOpen: true,
    daysInRed: 0,
    goalsReached: {},
  };
  window.updateUI = jest.fn();
  window.ui = { updateTime: jest.fn() };
  window.notifications = { add: jest.fn() };
  window.showDailySummaryModal = jest.fn();
  window.showGameOverModal = jest.fn();
  window.showVictoryModal = jest.fn();
  window.appSettings = { skipDailySummary: false };

  require('../../build/main/js/clock.js');
  require('../../build/main/js/ids.js');
  require('../../build/main/components/kit.js'); // fmt
  require('../../build/main/js/data/names.js');
  require('../../build/main/js/data/employees.js');
  window.employeesData = employees;
  require('../../build/main/js/data/materials.js');
  require('../../build/main/js/data/products.js');
  require('../../build/main/js/data/equipment.js');
  require('../../build/main/js/data/research.js'); // goals read the level
  window.research.getUnlockedProducts = () => ['pd001'];
  require('../../build/main/js/data/helpers.js');
  require('../../build/main/js/data/insurance.js');
  require('../../build/main/js/data/properties.js');
  require('../../build/main/js/data/lending.js');
  require('../../build/main/js/data/finances.js');
  require('../../build/main/js/insuranceClaims.js');
  require('../../build/main/js/taskManager.js');
  require('../../build/main/js/taskAssignment.js');
  require('../../build/main/js/production.js');
  require('../../build/main/js/customers.js');
  require('../../build/main/js/prescriptions.js');
  require('../../build/main/js/timeEvents.js');
  require('../../build/main/js/brandReputation.js');
  require('../../build/main/js/records.js');
  require('../../build/main/js/stakes.js');
  require('../../build/main/js/goals.js');
  require('../../build/main/js/company.js');
  require('../../build/main/js/building.js');
  require('../../build/main/js/reports.js');

  window.materialsData.forEach((m) => {
    m.inventory = 10000;
  });
  product().inventory = stock;
  product().price = 10;
  window.financesData.cash = 100000;
  // $1,000 a day of utilities and services; rent is the 1st's (company.test.js)
  window.company.dailyServices = () => 1000;

  jest.spyOn(Math, 'random').mockReturnValue(0);
}

function product() {
  return window.productsData.find((p) => p.id === 'pd001');
}

function task(id) {
  return window.taskManager.getTaskById(id);
}

function staff(id) {
  return window.employeesData.find((e) => e.id === id);
}

// Advance game time one second per step, as updateGameTime does.
function run(minutes) {
  for (let i = 0; i < minutes * 60; i++) {
    window.gameState.currentDate.setTime(window.gameState.currentDate.getTime() + 1000);
    window.taskManager.updateTasks(1 / 60);
    window.clock.tick();
    window.taskAssignment.assignIfRequested();
  }
}

function restock() {
  return window.production.createCompoundTask(product(), 1);
}

function wageEntries() {
  return window.financesData.transactions.filter((t) => t.category === 'wages');
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  delete window.appSettings;
});

describe('realistic role limits (#3)', () => {
  test('who may do each task, in order of preference', () => {
    loadGame();
    const roles = (t) => window.taskAssignment.eligibleRoles(t);
    expect(roles({ type: 'customerInteraction', interaction: 'checkIn' })).toBe('anyone');
    expect(roles({ type: 'customerInteraction', interaction: 'checkout' })).toBe('anyone');
    expect(roles({ type: 'consultation' })).toEqual(['Pharmacist']);
    expect(roles({ type: 'fillPrescription' })).toEqual(['Lab Technician', 'Pharmacist']);
    expect(roles({ type: 'compound', prescriptionId: 'pres-1' })).toEqual(['Lab Technician', 'Pharmacist']);
    expect(roles({ type: 'compound' })).toEqual(['Lab Technician', 'Pharmacist']); // for stock
    expect(roles({ type: 'something new' })).toEqual([]);
  });

  test('a cashier rings up, but never consults, fills or compounds', () => {
    loadGame({ employees: [employee(CASHIER, 'Cashier')] });
    const customer = window.customers.generateCustomer();
    run(5); // check-in takes 3 minutes
    expect(task(`consult-${customer.id}`)).toMatchObject({ status: 'pending', assignedTo: null });
    expect(task(`fill-${customer.prescriptionId}`)).toMatchObject({ assignedTo: null });
    expect(staff(CASHIER).currentTaskId).toBeNull();

    restock();
    run(1);
    expect(staff(CASHIER).currentTaskId).toBeNull();
  });

  test('a pharmacist fills when no lab technician is free, and compounds for stock only when idle', () => {
    loadGame({ employees: [employee(PHARMACIST, 'Pharmacist')], stock: 5 });
    const customer = window.customers.generateCustomer();
    const fill = task(`fill-${customer.prescriptionId}`);
    const r = restock();
    run(4); // check-in (anyone can), then the consultation or the fill
    expect([fill.assignedTo, task(`consult-${customer.id}`)?.assignedTo]).toContain(PHARMACIST);
    expect(r.assignedTo).toBeNull();
  });

  test('customer work takes a pharmacist off compounding for stock, and the batch keeps its progress', () => {
    loadGame({ employees: [employee(PHARMACIST, 'Pharmacist')], stock: 5 });
    const r = restock();
    run(2);
    expect(r.assignedTo).toBe(PHARMACIST);
    const progress = r.progress;

    window.customers.generateCustomer();
    run(1 / 60);
    expect(staff(PHARMACIST).currentTaskId).not.toBe(r.id);
    expect(r).toMatchObject({ status: 'pending', assignedTo: null, materialsTaken: true });
    expect(r.progress).toBeCloseTo(progress, 1); // plus the second it worked first
  });

  test('a batch says what it is waiting for', () => {
    loadGame({ employees: [employee('a', 'Lab Technician'), employee('b', 'Lab Technician')] });
    const first = restock();
    const second = restock();
    run(1 / 60);
    expect(first.status).toBe('inProgress');
    expect(second.status).toBe('pending'); // one Tablet Press, one batch at a time
    expect(window.production.compoundWaitReason(second)).toBe(
      'Waiting for Mortar and Pestle, Tablet Press, Powder Blender',
    );
  });

  test('a lab technician takes compounding for stock ahead of a pharmacist', () => {
    loadGame();
    const r = restock();
    run(1 / 60);
    expect(r.assignedTo).toBe(LAB_TECH);
    expect(staff(PHARMACIST).currentTaskId).toBeNull();
    expect(staff(CASHIER).currentTaskId).toBeNull();
  });
});

describe('overtime (#7)', () => {
  test('daily, weekly, and no hour counted twice', () => {
    loadGame();
    const e = staff(LAB_TECH);
    const split = (todayHours, straightWeekHours) => {
      e.minutesWorkedToday = todayHours * 60;
      e.straightMinutesThisWeek = straightWeekHours * 60;
      return window.finances.overtimeSplit(e);
    };
    expect(split(10, 8)).toEqual({ daily: 2, weekly: 0 });
    expect(split(6, 44)).toEqual({ daily: 0, weekly: 4 });
    // 38 straight hours, then 9 today: 1 daily and 6 weekly
    expect(split(9, 46)).toEqual({ daily: 1, weekly: 6 });
    expect(window.finances.overtimeHours(e)).toBe(7);
    // Already past 40: every straight hour today is weekly overtime
    expect(split(5, 47)).toEqual({ daily: 0, weekly: 5 });
  });

  test('work counts today, this week, and as straight time up to 8 hours a day', () => {
    loadGame();
    const e = staff(LAB_TECH);
    e.straightMinutesThisWeek = 38 * 60;
    e.minutesWorkedThisWeek = 40 * 60;
    for (let i = 0; i < 9 * 60; i++) window.employees.recordWork(e, 1);
    expect(e.minutesWorkedToday).toBe(9 * 60);
    expect(e.minutesWorkedThisWeek).toBe(49 * 60);
    expect(e.straightMinutesThisWeek).toBe(46 * 60);
    expect(window.finances.overtimeHours(e)).toBe(7);

    // Told once, the first time they go into overtime today
    const told = window.notifications.add.mock.calls.filter(([m]) => m.includes('is in overtime'));
    expect(told).toHaveLength(1);
  });

  test('approaching from 7 hours today or 36 this week; in overtime past 8 or 40', () => {
    loadGame();
    const e = staff(LAB_TECH);
    const status = (today, week) => {
      e.minutesWorkedToday = today * 60;
      e.straightMinutesThisWeek = week * 60;
      return window.employees.overtimeStatus(e);
    };
    expect(status(6.9, 20)).toBe('none');
    expect(status(7, 20)).toBe('approaching');
    expect(status(2, 36)).toBe('approaching');
    expect(status(8.1, 20)).toBe('overtime');
    expect(status(3, 40.5)).toBe('overtime');
  });

  test('weekly hours reset on Sunday, with the finances week', () => {
    loadGame();
    const e = staff(LAB_TECH);
    e.minutesWorkedThisWeek = 50 * 60;
    e.straightMinutesThisWeek = 45 * 60;
    window.employees.startNewDay(new Date(2023, 0, 7)); // Saturday
    expect(e.straightMinutesThisWeek).toBe(45 * 60);
    window.employees.startNewDay(new Date(2023, 0, 8)); // Sunday
    expect(e).toMatchObject({ minutesWorkedThisWeek: 0, straightMinutesThisWeek: 0 });
  });

  test('closing pays weekly overtime at 1.5x, and charges morale for every overtime hour', () => {
    loadGame({ employees: [employee('a', 'Lab Technician'), employee('b', 'Lab Technician')] });
    const [tired, rested] = window.employeesData;
    Object.assign(tired, { minutesWorkedToday: 9 * 60, straightMinutesThisWeek: 46 * 60 });
    Object.assign(rested, { minutesWorkedToday: 6 * 60, straightMinutesThisWeek: 30 * 60 });
    window.finances.applyDailyCosts();
    const overtime = wageEntries().filter((t) => t.description.startsWith('Overtime'));
    expect(overtime).toHaveLength(1);
    expect(overtime[0].description).toContain('7.0h at 1.5x');
    expect(overtime[0].amount).toBeCloseTo((100 / 8) * 1.5 * 7);

    const report = window.employees.endOfDay();
    // Same pay, so the difference is overtime: -1.5 x 7, against +2 for a rested day
    expect(tired.morale - rested.morale).toBeCloseTo(-10.5 - 2);
    expect(report[0]).toMatchObject({
      overtimeHours: 7,
      reasons: expect.arrayContaining([expect.stringContaining('this week')]),
    });
  });
});

describe('Send home and Call back (#7)', () => {
  test('their task goes back in the queue with its progress, and they get no work until tomorrow', () => {
    loadGame({ employees: [employee(LAB_TECH, 'Lab Technician')], stock: 0 });
    const r = restock();
    run(5);
    expect(r.assignedTo).toBe(LAB_TECH);
    const progress = r.progress;

    expect(window.employees.sendHome(LAB_TECH)).toBe(true);
    expect(staff(LAB_TECH)).toMatchObject({ offUntilDay: 2, currentTaskId: null });
    expect(r).toMatchObject({ status: 'pending', assignedTo: null, materialsTaken: true });
    expect(r.progress).toBeCloseTo(progress);
    run(5);
    expect(r.assignedTo).toBeNull();
    expect(window.employees.isSentHome(staff(LAB_TECH))).toBe(true);

    // Called back the same day, they pick it up where it was
    expect(window.employees.callBack(LAB_TECH)).toBe(true);
    run(1 / 60);
    expect(r.assignedTo).toBe(LAB_TECH);

    // Sent home again, they're back at the next opening
    window.employees.sendHome(LAB_TECH);
    window.timeEvents.closeDay(window.gameState);
    window.showDailySummaryModal.mock.calls[0][0](); // Start next day
    expect(staff(LAB_TECH).offUntilDay).toBeUndefined();
    expect(r.assignedTo).toBe(LAB_TECH);
  });

  test('they are paid their normal day', () => {
    loadGame();
    window.employees.sendHome(LAB_TECH);
    window.finances.applyDailyCosts();
    expect(wageEntries().find((t) => t.description.includes(LAB_TECH)).amount).toBeCloseTo(100);
  });
});

describe("Don't allow overtime (#7)", () => {
  test('at the limit: no new task, the current one finishes, then home, with the minutes past paid', () => {
    loadGame({ employees: [employee(LAB_TECH, 'Lab Technician')], stock: 0 });
    const tech = staff(LAB_TECH);
    tech.minutesWorkedToday = 8 * 60 - 2;
    window.employees.setNoOvertime(LAB_TECH, true);
    expect(window.employees.isSentHome(tech)).toBe(false); // under the limit

    const first = restock(); // 15 minutes
    run(5);
    expect(first.assignedTo).toBe(LAB_TECH);
    expect(window.employees.atOvertimeLimit(tech)).toBe(true);
    expect(window.employees.isGoingHome(tech)).toBe(true);

    product().inventory = 0;
    window.production.createCompoundTask(
      window.productsData.find((p) => p.id === 'pd004'),
      1,
    );
    run(11);
    expect(window.taskManager.tasks.some((t) => t.assignedTo === LAB_TECH)).toBe(false);
    expect(task(first.id)).toBeUndefined(); // finished
    expect(window.employees.isSentHome(tech)).toBe(true);
    expect(window.notifications.add).toHaveBeenCalledWith(
      expect.stringContaining('went home at their overtime limit'),
      'info',
    );
    // Not told they're in overtime: they're on their way home
    expect(window.notifications.add).not.toHaveBeenCalledWith(expect.stringContaining('is in overtime'), 'warning');
    // The minutes past 8 hours while finishing are overtime
    expect(window.finances.overtimeHours(tech)).toBeGreaterThan(0.15);
    expect(window.finances.overtimePay(tech)).toBeGreaterThan(0);
  });

  test('someone already idle at the limit goes home at once', () => {
    loadGame();
    const tech = staff(LAB_TECH);
    tech.minutesWorkedToday = 8 * 60;
    window.employees.setNoOvertime(LAB_TECH, true);
    expect(window.employees.isSentHome(tech)).toBe(true);
  });

  test('40 straight hours in the week is a limit too', () => {
    loadGame();
    const tech = staff(LAB_TECH);
    tech.minutesWorkedToday = 3 * 60;
    tech.straightMinutesThisWeek = 40 * 60;
    expect(window.employees.atOvertimeLimit(tech)).toBe(true);
    tech.noOvertime = true;
    expect(window.employees.canTakeWork(tech)).toBe(false);
  });
});

describe('the front door (#8)', () => {
  test('closed: nobody new comes in, not even the rest of this hour', () => {
    loadGame();
    window.timeEvents.spawnCustomersForHour(9);
    window.timeEvents.setFrontOpen(false);
    expect(window.gameState.frontClosedAt).toBe(window.gameState.currentDate.getTime());
    run(5);
    window.timeEvents.hourlyCheck(window.gameState, 10);
    run(5);
    expect(window.customers.activeCustomers).toHaveLength(0);
  });

  test('customers already inside are served, and staff keep working', () => {
    loadGame();
    window.customers.generateCustomer();
    window.timeEvents.setFrontOpen(false);
    run(30);
    expect(window.gameState.customersToday.served).toBe(1);
  });

  test('reopening lets the next hour in; it opens every morning, and the record notes the closing', () => {
    loadGame();
    window.timeEvents.setFrontOpen(false);
    window.timeEvents.setFrontOpen(true);
    expect(window.gameState.frontClosedAt).toBeUndefined();
    window.timeEvents.hourlyCheck(window.gameState, 10);
    expect(window.gameState.customerArrivals.length).toBeGreaterThan(0);

    window.gameState.currentDate.setHours(15, 30, 0, 0);
    window.timeEvents.setFrontOpen(false);
    window.gameState.currentDate.setHours(22, 0, 0, 0);
    window.timeEvents.closeDay(window.gameState);
    expect(window.records.days.at(-1).frontClosedAt).toBe(new Date(2023, 0, 2, 15, 30).getTime());
    expect(window.records.notes(window.records.days.at(-1))).toEqual(['Front closed from 15:30']);
    window.showDailySummaryModal.mock.calls[0][0]();
    expect(window.gameState.frontOpen).toBe(true);
    expect(window.gameState.frontClosedAt).toBeUndefined();
  });
});

describe('End day (#8)', () => {
  test('settles the day exactly once, and work keeps its progress for tomorrow', () => {
    loadGame({ stock: 0 });
    const r = restock();
    run(5);
    const progress = r.progress;
    window.gameState.currentDate.setHours(18, 0, 0, 0);

    window.timeEvents.endDayNow();
    expect(window.gameState.isDayActive).toBe(false);
    expect(wageEntries()).toHaveLength(3);
    expect(window.showDailySummaryModal).toHaveBeenCalledTimes(1);
    expect(window.records.notes(window.records.days.at(-1))).toEqual(['Closed early at 18:00']);
    expect(r).toMatchObject({ status: 'inProgress', assignedTo: LAB_TECH });
    expect(r.progress).toBeCloseTo(progress);

    // The 22:00 check, or End day again, does nothing more
    window.timeEvents.endDayNow();
    window.timeEvents.closeDay(window.gameState);
    expect(wageEntries()).toHaveLength(3);

    window.showDailySummaryModal.mock.calls[0][0]();
    expect(window.gameState).toMatchObject({ dayIndex: 2, isDayActive: true });
    expect(window.gameState.closedEarlyAt).toBeUndefined();
    expect(r.progress).toBeCloseTo(progress);
  });

  test('customers still inside leave unserved, as at closing time', () => {
    loadGame();
    window.customers.generateCustomer();
    expect(window.timeEvents.closingPreview()).toEqual({ customers: 1, tasksInProgress: 0 });
    window.timeEvents.endDayNow();
    expect(window.customers.activeCustomers).toHaveLength(0);
    expect(window.records.days.at(-1).customers.closing).toBe(1);
  });

  test('a day already settled (a save made during its summary) only rolls over', () => {
    loadGame();
    window.gameState.lastEndedDayIndex = 1;
    window.timeEvents.closeDay(window.gameState);
    expect(wageEntries()).toHaveLength(0);
    expect(window.gameState.dayIndex).toBe(2);
  });
});

describe('skipping the daily summary (#49)', () => {
  test('the next day starts by itself, and the day is still recorded', () => {
    loadGame();
    window.appSettings.skipDailySummary = true;
    window.timeEvents.closeDay(window.gameState);
    expect(window.showDailySummaryModal).not.toHaveBeenCalled();
    expect(window.gameState).toMatchObject({ dayIndex: 2, isDayActive: true });
    expect(window.records.days.map((d) => d.day)).toEqual([1]);
  });

  test('the closing warnings still come as notifications, and game over still shows', () => {
    loadGame();
    window.appSettings.skipDailySummary = true;
    window.financesData.cash = -5000;
    window.timeEvents.closeDay(window.gameState);
    expect(window.notifications.add).toHaveBeenCalledWith(expect.stringContaining('1 of 3 in a row'), 'error');
    window.timeEvents.closeDay(window.gameState);
    window.timeEvents.closeDay(window.gameState);
    expect(window.showGameOverModal).toHaveBeenCalledTimes(1);
    expect(window.gameState.isDayActive).toBe(false);
  });

  test('the win still shows, and the next day waits for it', () => {
    loadGame();
    window.appSettings.skipDailySummary = true;
    window.goals.check = () => ({ reached: [], won: true });
    window.timeEvents.closeDay(window.gameState);
    expect(window.showVictoryModal).toHaveBeenCalledTimes(1);
    expect(window.gameState.dayIndex).toBe(1);
    window.showVictoryModal.mock.calls[0][0]();
    expect(window.gameState.dayIndex).toBe(2);
  });
});

describe('game speeds (#49)', () => {
  test('1x, 2x (the default), 5x and 10x; anything else becomes the next one up', () => {
    jest.resetModules();
    require('../../build/main/js/main.js');
    expect(window.GAME_SPEEDS).toEqual([1, 2, 5, 10]);
    expect(window.getGameSpeed()).toBe(2);
    window.setGameSpeed(10);
    expect(window.getGameSpeed()).toBe(10);
    window.setGameSpeed(0.5); // a save from before Phase 9
    expect(window.getGameSpeed()).toBe(1);
    window.setGameSpeed(3);
    expect(window.getGameSpeed()).toBe(5);
    window.setGameSpeed(50);
    expect(window.getGameSpeed()).toBe(10);
  });
});

describe('last entry an hour before closing (#50)', () => {
  test("the 20:00 hour's customers are the last", () => {
    loadGame({ stock: 100 });
    window.gameState.currentDate.setHours(21, 0, 0, 0);
    window.timeEvents.hourlyCheck(window.gameState, 21);
    expect(window.gameState.customerArrivals ?? []).toHaveLength(0);

    window.gameState.currentDate.setHours(20, 0, 0, 0);
    window.timeEvents.hourlyCheck(window.gameState, 20);
    const arrivals = window.gameState.customerArrivals;
    expect(arrivals.length).toBeGreaterThan(0);
    expect(Math.max(...arrivals)).toBeLessThan(new Date(2023, 0, 2, 21, 0).getTime());
  });
});
