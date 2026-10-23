/**
 * Tests for Phase 8, stakes and history: the day records and visit log
 * (records.ts), the bank loan and bankruptcy (stakes.ts), goals and the win
 * (goals.ts), all through the real end of day (timeEvents.endOfDay). Also
 * the balance changes: reputation gains that shrink as reputation grows, and
 * a new game's materials and overhead.
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

// A game at 09:00 on day 2 (dayIndex 1), with the real modules from the
// money and customers up to the end of day.
function loadGame() {
  jest.resetModules();
  document.body.innerHTML = '';
  window.gameState = {
    currentDate: new Date(2023, 0, 2, 9, 0, 0, 0),
    dayIndex: 1,
    lastEndedDayIndex: 0,
    isDayActive: true,
    isPaused: false,
    daysInRed: 0,
    goalsReached: {},
  };
  window.updateUI = jest.fn();
  window.ui = { updateTime: jest.fn() };
  window.notifications = { add: jest.fn() };
  window.showDailySummaryModal = jest.fn();
  window.showGameOverModal = jest.fn();
  window.showVictoryModal = jest.fn();

  require('../../main/js/clock.js');
  require('../../main/js/ids.js');
  require('../../main/components/kit.js'); // fmt
  require('../../main/js/data/names.js');
  require('../../main/js/data/employees.js');
  window.employeesData = [employee('cashier', 'Cashier'), employee('pharmacist', 'Pharmacist')];
  require('../../main/js/data/materials.js');
  require('../../main/js/data/products.js');
  require('../../main/js/data/equipment.js');
  require('../../main/js/data/research.js');
  require('../../main/js/data/helpers.js');
  require('../../main/js/data/insurance.js');
  require('../../main/js/data/finances.js');
  require('../../main/js/insuranceClaims.js');
  require('../../main/js/taskManager.js');
  require('../../main/js/taskAssignment.js');
  require('../../main/js/production.js');
  require('../../main/js/customers.js');
  require('../../main/js/prescriptions.js');
  require('../../main/js/timeEvents.js');
  require('../../main/js/brandReputation.js');
  require('../../main/js/records.js');
  require('../../main/js/stakes.js');
  require('../../main/js/goals.js');

  window.financesData.cash = 10000;
  window.financesData.overhead = 1000;
}

function income(amount, category = 'copays') {
  window.finances.transact({ type: 'income', category, amount, description: 'test income' });
}

function expense(amount, category = 'other') {
  window.finances.transact({ type: 'expense', category, amount, description: 'test cost' });
}

// Closes the day as main.ts does at 22:00, and (unless the game ended)
// starts the next one from the summary's button.
function closeDay({ startNext = true } = {}) {
  window.gameState.currentDate.setHours(22, 0, 0, 0);
  window.gameState.isDayActive = false;
  window.timeEvents.endOfDay(window.gameState);
  const summary = window.showDailySummaryModal.mock.calls.at(-1);
  if (startNext && summary && !window.gameState.bankrupt) {
    window.showDailySummaryModal.mockClear();
    summary[0]();
  }
}

// A customer who walked in at 09:00, with a quoted prescription
function visitor(price = 150) {
  const customer = {
    id: window.nextId('cust'),
    type: 'Normal',
    status: 'readyForCheckout',
    arrivedAt: window.gameState.currentDate.getTime(),
    insurance: window.insuranceData[0],
    prescriptionId: null,
    patience: 100,
    firstName: 'Ann',
    lastName: 'Lee',
    mood: 9,
    lastStateChange: 0,
    isReturning: true,
  };
  const prescription = {
    id: window.nextId('pres'),
    customerId: customer.id,
    productId: 'pd001',
    productName: 'Acetaminophen Tablet',
    dosage: 2,
    status: 'filled',
    quotedPrice: price,
  };
  customer.prescriptionId = prescription.id;
  window.customers.activeCustomers.push(customer);
  window.prescriptions.activePrescriptions.push(prescription);
  return customer;
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('the history (records.ts)', () => {
  beforeEach(loadGame);

  test('every departure goes into the visit log, with what they bought, the wait and the sale', () => {
    const served = visitor(300);
    const lost = visitor();
    window.gameState.currentDate.setHours(9, 45);
    window.customers.customerLeaves(served.id, 'served');
    window.customers.customerLeaves(lost.id, 'impatient');

    const [last, first] = window.records.visits;
    expect(first).toMatchObject({
      name: 'Ann Lee',
      insurer: window.insuranceData[0].planName,
      product: 'Acetaminophen Tablet',
      dosage: 2,
      reason: 'served',
      price: 300,
      mood: 9,
      returning: true,
      day: 1,
    });
    expect((first.leftAt - first.arrivedAt) / 60000).toBe(45);
    expect(last).toMatchObject({ reason: 'impatient', price: 0 });
  });

  test('the visit log keeps the last 500', () => {
    for (let i = 0; i < 510; i++) window.customers.customerLeaves(visitor().id, 'served');
    expect(window.records.visits).toHaveLength(500);
    expect(window.records.visits[0].id).toBe(`cust-${2 * 510 - 1}`); // newest first
  });

  test('each closing records the day: money by category without the loan, cash, reputation, customers', () => {
    income(500);
    expense(200, 'materials');
    window.stakes.borrow(10000);
    window.customers.customerLeaves(visitor().id, 'served');
    window.customers.customerLeaves(visitor().id, 'price');
    closeDay();

    const [day] = window.records.days;
    expect(day).toMatchObject({
      day: 1,
      revenue: 500,
      costs: 200 + 200 + 1000 + 10, // materials, wages, overhead, interest
      revenueByCategory: { copays: 500 },
      costsByCategory: { materials: 200, wages: 200, overhead: 1000, interest: 10 },
      loan: 10000,
      customers: { served: 1, price: 1 },
      staff: 2,
    });
    expect(day.net).toBeCloseTo(500 - 1410);
    expect(day.cash).toBe(window.financesData.cash);
    expect(day.reputation).toBe(window.brandReputation.reputationScore);
  });

  test('lifetime counts add the closed days to today, without counting a day twice', () => {
    window.customers.customerLeaves(visitor().id, 'served');
    closeDay({ startNext: false });
    expect(window.records.totalCustomers('served')).toBe(1); // today's record and today's count are the same day
    window.showDailySummaryModal.mock.calls[0][0]();
    window.customers.customerLeaves(visitor().id, 'served');
    expect(window.records.totalCustomers('served')).toBe(2);
    expect(window.records.yesterday().day).toBe(1);
    expect(window.records.lost({ served: 3, impatient: 1, price: 2, reset: 5 })).toBe(3);
  });
});

describe('the bank loan', () => {
  beforeEach(loadGame);

  test('borrowing adds cash, but not revenue, income today or profit', () => {
    expect(window.stakes.borrow(10000)).toBe(true);
    const data = window.financesData;
    expect(data.cash).toBe(20000);
    expect(window.stakes.loanBalance()).toBe(10000);
    expect(data.revenue.today).toBe(0);
    expect(data.dailyIncome).toBe(0);
    expect(data.profit.total).toBe(0);
    expect(data.revenueCategories.other).toBe(0);
    expect(data.transactions[0]).toMatchObject({ type: 'income', category: 'loan', amount: 10000 });
    expect(window.finances.categoryTotals(0, Infinity)).toEqual({ revenue: {}, expenses: {} });
  });

  test('the bank lends up to its limit, and only positive amounts', () => {
    expect(window.stakes.borrow(window.stakes.LOAN_LIMIT)).toBe(true);
    expect(window.stakes.borrow(1)).toBe(false);
    expect(window.stakes.loanRoom()).toBe(0);
    loadGame();
    expect(window.stakes.borrow(0)).toBe(false);
    expect(window.stakes.borrow(-5)).toBe(false);
    expect(window.stakes.borrow(NaN)).toBe(false);
    expect(window.financesData.cash).toBe(10000);
  });

  test('repaying needs the cash, never repays more than is owed, and is not a cost', () => {
    window.stakes.borrow(30000);
    window.financesData.cash = 5000;
    expect(window.stakes.repay(10000)).toBe(false);
    expect(window.stakes.loanBalance()).toBe(30000);

    window.financesData.cash = 50000;
    expect(window.stakes.repay(100000)).toBe(true);
    expect(window.stakes.loanBalance()).toBe(0);
    expect(window.financesData.cash).toBe(20000);
    expect(window.financesData.expenses.total).toBe(0);
    expect(window.stakes.repay(1)).toBe(false);
  });

  test('interest is charged at closing as a cost, 0.1% of the balance a day', () => {
    window.stakes.borrow(20000);
    closeDay();
    expect(window.financesData.expenseCategories.interest).toBe(20);
    expect(window.financesData.transactions.find((t) => t.category === 'interest').amount).toBe(20);
    expect(window.stakes.fixedDailyCosts()).toBe(200 + 1000 + 20);
  });
});

describe('bankruptcy', () => {
  beforeEach(loadGame);

  test('three closings in a row below $0 end the game, with a warning before each', () => {
    window.financesData.cash = -5000;
    closeDay();
    expect(window.gameState.daysInRed).toBe(1);
    expect(window.notifications.add).toHaveBeenLastCalledWith(expect.stringContaining('by closing on day 4'), 'error');
    expect(window.gameState.dayIndex).toBe(2);

    closeDay();
    expect(window.gameState.daysInRed).toBe(2);
    expect(window.stakes.bankruptcyDay()).toBe(4);

    closeDay({ startNext: false });
    expect(window.gameState.bankrupt).toBe(true);
    expect(window.showGameOverModal).toHaveBeenCalledTimes(1);
    expect(window.showDailySummaryModal).not.toHaveBeenCalled();
    expect(window.gameState.isDayActive).toBe(false);
    expect(window.gameState.dayIndex).toBe(3); // no next day
    expect(window.stakes.borrow(10000)).toBe(false);
  });

  test('a closing at or above $0 resets the count', () => {
    window.financesData.cash = -5000;
    closeDay();
    closeDay();
    window.stakes.borrow(50000);
    closeDay();
    expect(window.gameState.daysInRed).toBe(0);
    expect(window.gameState.bankrupt).toBeUndefined();
    expect(window.showGameOverModal).not.toHaveBeenCalled();
  });

  test('the player is warned when cash covers less than three days of fixed costs', () => {
    window.financesData.cash = 4000; // after $1,200 of costs: $2,800, under 3 x $1,200
    closeDay();
    expect(window.notifications.add).toHaveBeenCalledWith(expect.stringContaining('Cash is low'), 'warning');
    window.notifications.add.mockClear();
    window.financesData.cash = 100000;
    closeDay();
    expect(window.notifications.add).not.toHaveBeenCalledWith(expect.stringContaining('Cash is low'), 'warning');
  });
});

describe('goals (goals.ts)', () => {
  beforeEach(loadGame);

  function goal(id) {
    return window.goals.list().find((g) => g.id === id);
  }

  test('are checked at closing, reached once, and announced', () => {
    window.brandReputation.reputationScore = 60;
    expect(goal('reputation50').reachedOn).toBeNull(); // not until closing
    closeDay();
    expect(goal('reputation50').reachedOn).toBe(1);
    expect(window.notifications.add).toHaveBeenCalledWith('Goal reached: Reach reputation 50.', 'success');

    window.notifications.add.mockClear();
    closeDay();
    expect(goal('reputation50').reachedOn).toBe(1);
    expect(window.notifications.add).not.toHaveBeenCalledWith(expect.stringContaining('Goal reached'), 'success');
  });

  test('money goals count cash less what is owed to the bank', () => {
    window.financesData.cash = 140000;
    window.stakes.borrow(50000);
    closeDay();
    expect(goal('bank150k').reachedOn).toBeNull();
    window.stakes.repay(50000);
    window.financesData.cash = 160000;
    closeDay();
    expect(goal('bank150k').reachedOn).toBe(2);
  });

  test('a week means seven closings', () => {
    window.gameState.dayIndex = 5;
    window.gameState.lastEndedDayIndex = 4;
    closeDay();
    expect(goal('week').reachedOn).toBeNull(); // 6 days
    closeDay();
    expect(goal('week').reachedOn).toBe(6);
  });

  test('reaching the last goal wins once: the winning dialog follows the summary, then the next day', () => {
    window.gameState.goalsReached = Object.fromEntries(
      window.goals
        .list()
        .map((g) => [g.id, 0])
        .filter(([id]) => id !== 'staff8'),
    );
    for (let i = 0; i < 6; i++) window.employeesData.push(employee(`extra${i}`, 'Cashier'));
    closeDay({ startNext: false });
    expect(window.gameState.wonOnDay).toBe(1);

    window.showDailySummaryModal.mock.calls[0][0](); // Start next day
    expect(window.showVictoryModal).toHaveBeenCalledTimes(1);
    expect(window.gameState.dayIndex).toBe(1);
    window.showVictoryModal.mock.calls[0][0](); // Keep playing
    expect(window.gameState.dayIndex).toBe(2);

    window.showDailySummaryModal.mockClear();
    closeDay();
    expect(window.showVictoryModal).toHaveBeenCalledTimes(1);
  });
});

describe('balance (Phase 8)', () => {
  beforeEach(loadGame);

  test('reputation gains shrink as reputation grows', () => {
    const rep = window.brandReputation;
    rep.reputationScore = 10;
    rep.gainReputation(1);
    expect(rep.reputationScore).toBeCloseTo(10.9);
    rep.reputationScore = 90;
    rep.gainReputation(1);
    expect(rep.reputationScore).toBeCloseTo(90.1);
  });

  test('a very happy customer gives 0.3, scaled by the room left', () => {
    window.brandReputation.reputationScore = 50;
    window.customers.customerLeaves(visitor().id, 'served'); // mood 9
    expect(window.brandReputation.reputationScore).toBeCloseTo(50.15);
  });

  test('a new game buys its materials: 2,000 of each, with auto-order on', () => {
    window.materialsData.forEach((m) => {
      expect(m.inventory).toBe(2000);
      expect(m.autoOrderThreshold).toBe(500);
      expect(m.autoOrderAmount).toBe(1000);
    });
  });
});
