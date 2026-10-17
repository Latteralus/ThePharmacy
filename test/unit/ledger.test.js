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

  require('../../main/js/ids.js');
  require('../../main/js/data/materials.js');
  require('../../main/js/data/products.js');
  require('../../main/js/data/finances.js');
  require('../../main/js/insuranceClaims.js');
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
    window.financesData.overhead = 500;

    window.finances.applyDailyCosts();

    const data = window.financesData;
    expect(data.cash).toBe(1000 - 1000 - 500);
    expect(data.expenseCategories.wages).toBe(1000);
    expect(data.expenseCategories.overhead).toBe(500);
    expect(data.expenses.today).toBe(1500);
    expect(data.transactions).toHaveLength(2);
  });
});

describe('insurance claims', () => {
  const PRICE_PER_DOSE = 10;

  function sell(planName, formulary, copayPercentage) {
    const customer = {
      id: `cust-${planName}`,
      insurance: { planName, copayType: 'percentage', copayPercentage, formulary },
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
  });

  test('a covered sale books the copay now and the rest only when the claim pays', () => {
    const { copay, price } = sell('MediQuick', ['pd001'], 20);
    const data = window.financesData;

    expect(price).toBe(20);
    expect(copay).toBe(4);
    expect(data.cash).toBe(1004);
    expect(data.revenue.total).toBe(4);
    expect(data.revenueCategories.insurance).toBe(0);
    expect(data.pendingInsuranceIncome).toBe(16);
    expect(data.insuranceReimbursements.pending).toBe(16);
    // No "pending" income in the log: only money that arrived.
    expect(data.transactions.filter((t) => t.type === 'income')).toHaveLength(1);

    // MediQuick takes one game hour to process.
    window.gameState.currentDate = new Date(2023, 0, 2, 11, 0);
    window.insuranceClaims.processAllClaims();

    expect(data.cash).toBe(1020);
    expect(data.revenue.total).toBe(20);
    expect(data.revenueCategories).toMatchObject({ copays: 4, insurance: 16 });
    expect(data.pendingInsuranceIncome).toBe(0);
    expect(data.insuranceReimbursements).toMatchObject({ pending: 0, received: 16 });

    // Running again (end of day, the next hour) pays nothing twice.
    window.insuranceClaims.processAllClaims();
    window.finances.processInsuranceClaims();
    expect(data.cash).toBe(1020);
  });

  test('a claim that is not due yet stays pending', () => {
    sell('StateHealth', ['pd001'], 40);
    window.insuranceClaims.processAllClaims();

    expect(window.insuranceClaims.pendingClaims).toHaveLength(1);
    expect(window.financesData.pendingInsuranceIncome).toBe(12);
  });

  test('a rejected claim moves no cash and leaves pending', () => {
    sell('MediQuick', ['pd001'], 20);
    window.insuranceClaims.rejectionRate = 1;
    window.gameState.currentDate = new Date(2023, 0, 3, 10, 0);
    window.insuranceClaims.processAllClaims();

    const data = window.financesData;
    expect(data.cash).toBe(1004);
    expect(data.insuranceReimbursements).toMatchObject({ pending: 0, rejected: 16, received: 0 });
    expect(data.expenses.total).toBe(0);
  });

  test('only the 500 most recent settled claims are kept', () => {
    window.insuranceClaims.processedClaims = Array.from({ length: 500 }, (_, i) => ({ id: `old-${i}` }));
    sell('MediQuick', ['pd001'], 20);
    window.gameState.currentDate = new Date(2023, 0, 2, 11, 0);
    window.insuranceClaims.processAllClaims();

    const kept = window.insuranceClaims.processedClaims;
    expect(kept).toHaveLength(500);
    expect(kept[0].id).toBe('old-1');
    expect(kept[499].prescriptionId).toBe('pres-1');
    // Lifetime totals don't depend on the history
    expect(window.financesData.insuranceReimbursements.received).toBe(16);
  });

  test('self-pay customers pay in full and file no claim', () => {
    sell('Uninsured', null, 100);

    expect(window.financesData.cash).toBe(1020);
    expect(window.insuranceClaims.pendingClaims).toHaveLength(0);
    expect(window.financesData.pendingInsuranceIncome).toBe(0);
  });

  test('syncPendingTotals resets both totals to what the pending claims owe', () => {
    sell('MediQuick', ['pd001'], 20);
    window.financesData.pendingInsuranceIncome = 999;
    window.financesData.insuranceReimbursements.pending = 999;

    window.insuranceClaims.syncPendingTotals();
    expect(window.financesData.pendingInsuranceIncome).toBe(16);
    expect(window.financesData.insuranceReimbursements.pending).toBe(16);
  });
});

describe('period rollover', () => {
  function earn(amount) {
    window.finances.transact({ type: 'income', category: 'other', amount, description: 'x' });
  }

  test('a new day resets "today" but not the week or month', () => {
    earn(100);
    window.finances.startNewDay(new Date(2023, 0, 2), new Date(2023, 0, 3)); // Mon -> Tue

    const { revenue, profit } = window.financesData;
    expect(revenue.today).toBe(0);
    expect(profit.today).toBe(0);
    expect(window.financesData.dailyIncome).toBe(0);
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
