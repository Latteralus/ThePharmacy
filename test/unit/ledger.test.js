/**
 * Tests for the money ledger (review findings A3, M1-M3): finances.transact()
 * is the only thing that changes cash, and it keeps cash, the period totals,
 * the category buckets and the transaction list in step. Also covers the
 * insurance-claim flow (income counted once, when the claim pays) and the
 * day/week/month rollover.
 */

function sumPeriods(periods) {
  return [periods.today, periods.thisWeek, periods.thisMonth, periods.total];
}

beforeEach(() => {
  jest.resetModules();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});

  // Monday, 2023-01-02, 10:00
  window.gameState = { currentDate: new Date(2023, 0, 2, 10, 0), dayIndex: 1, isDayActive: true, isPaused: false };
  window.updateUI = jest.fn();
  window.employeesData = [];

  require('../../build/main/js/ids.js');
  require('../../build/main/js/data/materials.js');
  require('../../build/main/js/data/products.js');
  require('../../build/main/js/data/finances.js');
  require('../../build/main/js/insuranceClaims.js');
  require('../../build/main/js/data/properties.js');
  require('../../build/main/js/company.js');
  window.financesData.cash = 1000;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('finances.transact', () => {
  test('income adds to cash, every period, its bucket, profit and the log', () => {
    const ok = window.finances.transact({ type: 'income', category: 'copays', amount: 50, description: 'sale' });

    const data = window.financesData;
    expect(ok).toBe(true);
    expect(data.cash).toBe(1050);
    expect(data.dailyIncome).toBe(50);
    expect(sumPeriods(data.revenue)).toEqual([50, 50, 50, 50]);
    expect(data.revenueCategories.copays).toBe(50);
    expect(data.profit.today).toBe(50);
    expect(data.transactions).toHaveLength(1);
    expect(data.transactions[0]).toMatchObject({ type: 'income', category: 'copays', amount: 50 });
    expect(data.transactions[0].date).toBeInstanceOf(Date);
  });

  test('an expense subtracts from cash and counts toward its bucket', () => {
    window.finances.transact({ type: 'expense', category: 'materials', amount: 200, description: 'order' });

    const data = window.financesData;
    expect(data.cash).toBe(800);
    expect(sumPeriods(data.expenses)).toEqual([200, 200, 200, 200]);
    expect(data.expenseCategories.materials).toBe(200);
    expect(data.profit.total).toBe(-200);
    expect(data.dailyIncome).toBe(0);
  });

  test('a category that is not a bucket counts toward "other"', () => {
    window.finances.transact({ type: 'expense', category: 'hiring', amount: 500, description: 'fee' });
    expect(window.financesData.expenseCategories.other).toBe(500);
    expect(window.financesData.transactions[0].category).toBe('hiring');
  });

  test('requireFunds refuses an expense that cash cannot cover, and changes nothing', () => {
    const ok = window.finances.transact({
      type: 'expense',
      category: 'equipment',
      amount: 5000,
      description: 'too expensive',
      requireFunds: true,
    });

    expect(ok).toBe(false);
    expect(window.financesData.cash).toBe(1000);
    expect(window.financesData.expenses.total).toBe(0);
    expect(window.financesData.transactions).toHaveLength(0);
  });

  test('negative and non-numeric amounts are rejected', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(window.finances.transact({ type: 'income', category: 'other', amount: -5, description: 'x' })).toBe(false);
    expect(window.finances.transact({ type: 'income', category: 'other', amount: NaN, description: 'x' })).toBe(false);
    expect(window.financesData.cash).toBe(1000);
  });

  test('daily costs are charged even when they take cash negative', () => {
    window.employeesData = [{ firstName: 'A', lastName: 'B', role: 'Cashier', salary: 365000 }];
    window.company.dailyServices = () => 500;

    window.finances.applyDailyCosts();

    // $1,000 a day of salary, plus 25% payroll taxes and benefits
    const data = window.financesData;
    expect(data.cash).toBe(1000 - 1250 - 500);
    expect(data.expenseCategories.wages).toBe(1250);
    expect(data.expenseCategories.overhead).toBe(500);
    expect(data.expenses.today).toBe(1750);
    expect(data.transactions).toHaveLength(2);
    // Both are the location's
    expect(data.transactions.map((t) => t.locationId)).toEqual(['loc-1', 'loc-1']);
  });

  test('utilities and services come from the building: a flat part and a part by floor space (Phase 10)', () => {
    const location = window.company.active();
    // The first listing: 2,000 sq ft in the suburbs
    expect(location.building.sqft).toBe(2000);
    expect(window.company.dailyServices(location)).toBe(350 + 200);
    // A city is dearer, a small town cheaper
    expect(window.properties.servicesPerDay('urban', 2000)).toBe(Math.round(550 * 1.15));
    expect(window.properties.servicesPerDay('rural', 2000)).toBe(Math.round(550 * 0.8));
  });

  test('hours past 8 are overtime, paid at 1.5x the hourly rate at closing', () => {
    window.employeesData = [
      { firstName: 'A', lastName: 'B', role: 'Cashier', salary: 365000, minutesWorkedToday: 10 * 60 },
      { firstName: 'C', lastName: 'D', role: 'Cashier', salary: 365000, minutesWorkedToday: 8 * 60 },
    ];
    window.company.dailyServices = () => 0;

    window.finances.applyDailyCosts();

    // A day's $1,250 covers 8 hours ($156.25 an hour); 2 hours over at 1.5x
    const overtime = 2 * (1250 / 8) * 1.5;
    expect(window.finances.overtimeHours(window.employeesData[0])).toBe(2);
    expect(window.financesData.expenseCategories.wages).toBeCloseTo(1250 * 2 + overtime);
    const overtimeEntries = window.financesData.transactions.filter((t) => t.description.startsWith('Overtime'));
    expect(overtimeEntries).toHaveLength(1);
    expect(overtimeEntries[0]).toMatchObject({ category: 'wages', amount: expect.closeTo(overtime) });
    expect(overtimeEntries[0].description).toBe('Overtime for A B: 2.0h at 1.5x');
  });
});

describe('the ledger over a long game (Phase 10)', () => {
  test('keeps every entry, newest first, with no cap, each for a location or the company', () => {
    for (let i = 0; i < 1500; i++) {
      window.gameState.currentDate = new Date(2023, 0, 2, 10, 0, i);
      window.finances.transact({ type: 'income', category: 'copays', amount: 1, description: `sale ${i}` });
    }
    window.finances.transact({
      type: 'expense',
      category: 'interest',
      amount: 1,
      description: 'interest',
      locationId: null,
    });
    const log = window.financesData.transactions;
    expect(log).toHaveLength(1501);
    expect(log[0].description).toBe('interest');
    expect(log[1].description).toBe('sale 1499');
    expect(log[0].locationId).toBeNull();
    expect(log[1].locationId).toBe('loc-1');
  });

  test('category totals can be for one location, or the company alone', () => {
    window.finances.transact({ type: 'income', category: 'copays', amount: 40, description: 'sale' });
    window.finances.transact({
      type: 'expense',
      category: 'interest',
      amount: 5,
      description: 'interest',
      locationId: null,
    });
    const now = window.gameState.currentDate.getTime();
    expect(window.finances.categoryTotals(0, now)).toEqual({ revenue: { copays: 40 }, expenses: { interest: 5 } });
    expect(window.finances.categoryTotals(0, now, 'loc-1')).toEqual({ revenue: { copays: 40 }, expenses: {} });
    expect(window.finances.categoryTotals(0, now, null)).toEqual({ revenue: {}, expenses: { interest: 5 } });
  });

  test('the lease deposit moves cash but is not a cost', () => {
    window.finances.transact({ type: 'expense', category: 'deposit', amount: 300, description: 'deposit' });
    expect(window.financesData.cash).toBe(700);
    expect(window.financesData.expenses.today).toBe(0);
    expect(window.finances.isFinancing('deposit')).toBe(true);
    const now = window.gameState.currentDate.getTime();
    expect(window.finances.categoryTotals(0, now).expenses).toEqual({});
  });
});

describe('insurance claims', () => {
  const PRICE_PER_DOSE = 10;
  const RATE = 0.9;
  // What the plan pays for the 2 units sold, copay included
  const planTotal = () => window.finances.marketPrice('pd001') * RATE * 2;

  function sell(planName, formulary, copayPercentage, reimbursementRate = RATE) {
    const customer = {
      id: `cust-${planName}`,
      insurance: { planName, copayType: 'percentage', copayPercentage, reimbursementRate, formulary },
    };
    window.customers = { activeCustomers: [customer] };
    window.prescriptions = {
      getPrescription: () => ({ id: 'pres-1', productId: 'pd001', productName: 'Test', dosage: 2 }),
      updatePrescriptionStatus: jest.fn(),
    };
    window.productsData.find((p) => p.id === 'pd001').price = PRICE_PER_DOSE;
    return window.finances.completePrescription(customer.id, 'pres-1');
  }

  beforeEach(() => {
    window.insuranceClaims.rejectionRate = 0;
    window.notifications = { add: jest.fn() };
    window.fmt = { money: (n) => `$${n.toFixed(2)}` };
  });

  test("a covered sale is at the plan's price: the copay now, the rest when the claim pays", () => {
    const { copay, price } = sell('MediQuick', ['pd001'], 20);
    const data = window.financesData;
    const total = planTotal();

    // The plan's price, not the pharmacy's $10 a unit
    expect(price).toBeCloseTo(total);
    expect(copay).toBeCloseTo(total * 0.2);
    expect(data.cash).toBeCloseTo(1000 + total * 0.2);
    expect(data.revenue.total).toBeCloseTo(total * 0.2);
    expect(data.revenueCategories.insurance).toBe(0);
    expect(data.pendingInsuranceIncome).toBeCloseTo(total * 0.8);
    expect(data.insuranceReimbursements.pending).toBeCloseTo(total * 0.8);
    // Claimed today, but not income today
    expect(data.dailyInsurance).toBeCloseTo(total * 0.8);
    expect(data.dailyIncome).toBeCloseTo(total * 0.2);
    // No "pending" income in the log: only money that arrived.
    expect(data.transactions.filter((t) => t.type === 'income')).toHaveLength(1);

    window.insuranceClaims.processAllClaims();

    expect(data.cash).toBeCloseTo(1000 + total);
    expect(data.revenue.total).toBeCloseTo(total);
    expect(data.revenueCategories.insurance).toBeCloseTo(total * 0.8);
    expect(data.pendingInsuranceIncome).toBeCloseTo(0);
    expect(data.insuranceReimbursements).toMatchObject({
      pending: expect.closeTo(0),
      received: expect.closeTo(total * 0.8),
    });

    // Running again pays nothing twice.
    window.insuranceClaims.processAllClaims();
    window.gameState.dayIndex = 13;
    window.finances.processInsuranceClaims();
    expect(data.cash).toBeCloseTo(1000 + total);
  });

  test('claims are paid every other week, at closing on days 14, 28, ...', () => {
    sell('StateHealth', ['pd001'], 40);
    const owed = planTotal() * 0.6;

    // Day 2's closing (dayIndex 1) isn't payday
    window.finances.processInsuranceClaims();
    expect(window.insuranceClaims.pendingClaims).toHaveLength(1);
    expect(window.financesData.pendingInsuranceIncome).toBeCloseTo(owed);
    expect(window.insuranceClaims.nextPayday()).toBe(14);

    // Day 14's is
    window.gameState.dayIndex = 13;
    window.finances.processInsuranceClaims();
    expect(window.insuranceClaims.pendingClaims).toHaveLength(0);
    expect(window.financesData.cash).toBeCloseTo(1000 + planTotal());
    expect(window.notifications.add).toHaveBeenCalledWith(
      `Insurers paid $${owed.toFixed(2)} for 1 claim. The next payment is at closing on day 28.`,
      'success',
    );

    // Once day 14 has closed, the next payday is day 28
    window.gameState.lastEndedDayIndex = 13;
    expect(window.insuranceClaims.nextPayday()).toBe(28);
    expect(window.insuranceClaims.isPayday(27)).toBe(true);
    expect(window.insuranceClaims.isPayday(14)).toBe(false);
  });

  test('a rejected claim moves no cash and leaves pending', () => {
    sell('MediQuick', ['pd001'], 20);
    window.insuranceClaims.rejectionRate = 1;
    window.insuranceClaims.processAllClaims();

    const data = window.financesData;
    const owed = planTotal() * 0.8;
    expect(data.cash).toBeCloseTo(1000 + planTotal() * 0.2);
    expect(data.insuranceReimbursements).toMatchObject({
      pending: expect.closeTo(0),
      rejected: expect.closeTo(owed),
      received: 0,
    });
    expect(data.expenses.total).toBe(0);
  });

  test('only the 500 most recent settled claims are kept', () => {
    window.insuranceClaims.processedClaims = Array.from({ length: 500 }, (_, i) => ({ id: `old-${i}` }));
    sell('MediQuick', ['pd001'], 20);
    window.insuranceClaims.processAllClaims();

    const kept = window.insuranceClaims.processedClaims;
    expect(kept).toHaveLength(500);
    expect(kept[0].id).toBe('old-1');
    expect(kept[499].prescriptionId).toBe('pres-1');
    // Lifetime totals don't depend on the history
    expect(window.financesData.insuranceReimbursements.received).toBeCloseTo(planTotal() * 0.8);
  });

  test("self-pay customers pay the pharmacy's price in full and file no claim", () => {
    sell('Uninsured', null, 100, null);

    expect(window.financesData.cash).toBe(1020);
    expect(window.insuranceClaims.pendingClaims).toHaveLength(0);
    expect(window.financesData.pendingInsuranceIncome).toBe(0);
  });

  test("a drug off the plan's formulary is paid in full, at the pharmacy's price", () => {
    sell('StateHealth', ['pd002'], 40);

    expect(window.financesData.cash).toBe(1020);
    expect(window.insuranceClaims.pendingClaims).toHaveLength(0);
    expect(window.financesData.transactions[0].description).toContain("not on StateHealth's formulary");
  });

  test('syncPendingTotals resets both totals to what the pending claims owe', () => {
    sell('MediQuick', ['pd001'], 20);
    window.financesData.pendingInsuranceIncome = 999;
    window.financesData.insuranceReimbursements.pending = 999;

    window.insuranceClaims.syncPendingTotals();
    expect(window.financesData.pendingInsuranceIncome).toBeCloseTo(planTotal() * 0.8);
    expect(window.financesData.insuranceReimbursements.pending).toBeCloseTo(planTotal() * 0.8);
  });
});

describe('period rollover', () => {
  function earn(amount) {
    window.finances.transact({ type: 'income', category: 'other', amount, description: 'x' });
  }

  test('a new day resets "today" but not the week or month', () => {
    earn(100);
    window.financesData.dailyInsurance = 40;
    window.finances.startNewDay(new Date(2023, 0, 2), new Date(2023, 0, 3)); // Mon -> Tue

    const { revenue, profit } = window.financesData;
    expect(revenue.today).toBe(0);
    expect(profit.today).toBe(0);
    expect(window.financesData.dailyIncome).toBe(0);
    expect(window.financesData.dailyInsurance).toBe(0);
    expect(revenue.thisWeek).toBe(100);
    expect(revenue.thisMonth).toBe(100);
    expect(revenue.total).toBe(100);
  });

  test('Sunday starts a new week', () => {
    earn(100);
    window.finances.startNewDay(new Date(2023, 0, 7), new Date(2023, 0, 8)); // Sat -> Sun

    expect(window.financesData.revenue.thisWeek).toBe(0);
    expect(window.financesData.revenue.thisMonth).toBe(100);
  });

  test('the 1st moves this month into last month', () => {
    earn(100);
    window.finances.startNewDay(new Date(2023, 0, 31), new Date(2023, 1, 1));

    const { revenue, profit } = window.financesData;
    expect(revenue.thisMonth).toBe(0);
    expect(revenue.lastMonth).toBe(100);
    expect(profit.lastMonth).toBe(100);
    expect(revenue.total).toBe(100);
  });
});
