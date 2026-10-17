/**
 * Tests for the game clock/scheduler (main/js/clock.js) and the systems
 * moved onto it in Phase 2 (review finding C3: customers, patience and the
 * integrity check ran on wall-clock setIntervals that ignored pause and
 * speed). Time only moves when a test advances gameState.currentDate and
 * calls clock.tick(), the same way main.ts's updateGameTime does.
 */

const MINUTE = 60 * 1000;

function startGameAt(hour, minute = 0) {
  window.gameState = {
    currentDate: new Date(2023, 0, 1, hour, minute, 0, 0),
    dayIndex: 0,
    isDayActive: true,
    isPaused: false,
  };
}

// Advance game time in 1-second steps (one fixed step at 1x), ticking the
// clock each step.
function advanceMinutes(minutes) {
  for (let i = 0; i < minutes * 60; i++) {
    window.gameState.currentDate.setTime(window.gameState.currentDate.getTime() + 1000);
    window.clock.tick();
  }
}

describe('clock', () => {
  beforeEach(() => {
    jest.resetModules();
    startGameAt(8);
    require('../../main/js/clock.js');
  });

  test('now() is the game time', () => {
    expect(window.clock.now()).toBe(window.gameState.currentDate.getTime());
  });

  test('every() runs once per interval of game time', () => {
    const fn = jest.fn();
    window.clock.every(10, fn);

    advanceMinutes(9);
    expect(fn).toHaveBeenCalledTimes(0);
    advanceMinutes(1);
    expect(fn).toHaveBeenCalledTimes(1);
    advanceMinutes(20);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('nothing runs while game time stands still (paused)', () => {
    const fn = jest.fn();
    window.clock.every(1, fn);
    window.clock.after(1, fn);

    for (let i = 0; i < 1000; i++) window.clock.tick();
    expect(fn).not.toHaveBeenCalled();
  });

  test('after() runs once', () => {
    const fn = jest.fn();
    window.clock.after(2, fn);

    advanceMinutes(10);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('after(0) runs on the next tick', () => {
    const fn = jest.fn();
    window.clock.after(0, fn);
    window.clock.tick();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('cancel() stops a job', () => {
    const fn = jest.fn();
    const id = window.clock.every(1, fn);
    advanceMinutes(1);
    window.clock.cancel(id);
    advanceMinutes(5);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('a forward jump (overnight skip) runs a repeating job once, not once per missed interval', () => {
    const fn = jest.fn();
    window.clock.every(60, fn);
    window.clock.tick();

    window.gameState.currentDate.setTime(window.gameState.currentDate.getTime() + 9 * 60 * MINUTE);
    window.clock.tick();
    expect(fn).toHaveBeenCalledTimes(1);

    // ...and re-aligns to the jump rather than firing again immediately.
    advanceMinutes(59);
    expect(fn).toHaveBeenCalledTimes(1);
    advanceMinutes(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('a backward jump (in-game load) keeps each job\'s remaining delay', () => {
    const fn = jest.fn();
    window.clock.every(60, fn);
    advanceMinutes(50);

    // Load a save from earlier in the day.
    window.gameState.currentDate.setHours(7, 0, 0, 0);
    window.clock.tick();

    advanceMinutes(9);
    expect(fn).not.toHaveBeenCalled();
    advanceMinutes(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('jobs registered before a game exists start counting from the first tick', () => {
    jest.resetModules();
    delete window.gameState;
    require('../../main/js/clock.js');

    const fn = jest.fn();
    window.clock.every(5, fn);

    startGameAt(14);
    window.clock.tick();
    advanceMinutes(4);
    expect(fn).not.toHaveBeenCalled();
    advanceMinutes(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('a throwing job does not stop the others', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const fn = jest.fn();
    window.clock.every(1, () => { throw new Error('boom'); });
    window.clock.every(1, fn);

    advanceMinutes(1);
    expect(fn).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });
});

describe('customer patience on the game clock', () => {
  let loseReputation;

  function addCustomer(overrides = {}) {
    const customer = {
      id: `cust-${window.customers.activeCustomers.length}`,
      type: 'Normal',
      status: 'waitingForCheckIn',
      arrivedAt: window.clock.now(),
      insurance: { planName: 'Test' },
      prescriptionId: null,
      patience: 10,
      firstName: 'Test',
      lastName: 'Customer',
      mood: 7,
      lastStateChange: window.clock.now(),
      ...overrides,
    };
    window.customers.activeCustomers.push(customer);
    return customer;
  }

  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    startGameAt(9);

    loseReputation = jest.fn();
    window.brandReputation = { loseReputation, gainReputation: jest.fn() };
    window.taskManager = { tasks: [] };
    window.taskAssignment = { unassignTask: jest.fn() };
    window.prescriptions = { removePrescriptionsByCustomer: jest.fn() };
    window.ui = { updateCustomers: jest.fn() };

    require('../../main/js/clock.js');
    require('../../main/js/customers.js');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('patience drains by one per game minute', () => {
    const customer = addCustomer({ patience: 10 });
    window.clock.tick(); // first tick starts the patience job's interval

    advanceMinutes(3);
    expect(customer.patience).toBe(7);
  });

  test('patience does not drain while paused', () => {
    const customer = addCustomer({ patience: 10 });
    window.clock.tick();

    // Paused: gameLoop stops calling updateGameTime, so game time and the
    // clock both stand still however much real time passes.
    for (let i = 0; i < 5000; i++) window.clock.tick();
    expect(customer.patience).toBe(10);
  });

  test('a customer who runs out of patience leaves and costs reputation', () => {
    addCustomer({ patience: 2 });
    window.clock.tick();

    advanceMinutes(2);
    expect(window.customers.activeCustomers).toHaveLength(0);
    expect(loseReputation).toHaveBeenCalledWith(1.5);
  });

  test('sendRemainingCustomersHome empties the store', () => {
    addCustomer();
    addCustomer();

    window.customers.sendRemainingCustomersHome();
    expect(window.customers.activeCustomers).toHaveLength(0);
    // The usual "left without service" hit, once each - not the
    // out-of-patience one.
    expect(loseReputation).toHaveBeenCalledTimes(2);
    expect(loseReputation).toHaveBeenCalledWith(1);
  });
});
