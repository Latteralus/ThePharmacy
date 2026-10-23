/**
 * Tests for Phase 10, the company and its locations: the company model
 * with the per-location globals as views (#10), buildings and zones with
 * storage shelves, floor space and the front store's capacity (#11), monthly
 * rent, the startup loan and its repayments (#12), and monthly and yearly
 * reports, ledger summaries and the goal ladder for a long game (#13). Runs
 * the real modules and the real closing, like storeControls.test.js.
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

// A new game (gameInitializer.initializeNewGame) at 07:00 on Jan 1, 2023,
// with the modules main.html loads from the money to the reports.
function loadGame(options = {}) {
  jest.resetModules();
  document.body.innerHTML = '';
  window.gameState = { currentDate: new Date(2023, 0, 1, 7), dayIndex: 0 };
  window.updateUI = jest.fn();
  window.ui = { updateTime: jest.fn() };
  window.notifications = { add: jest.fn() };
  window.showDailySummaryModal = jest.fn();
  window.showGameOverModal = jest.fn();
  window.showVictoryModal = jest.fn();
  window.showReportModal = jest.fn();
  window.appSettings = { skipDailySummary: true, skipMonthlyReport: false, skipYearlyReport: false };

  require('../../build/main/js/clock.js');
  require('../../build/main/js/ids.js');
  require('../../build/main/components/kit.js'); // fmt
  require('../../build/main/js/data/names.js');
  require('../../build/main/js/data/employees.js');
  require('../../build/main/js/data/materials.js');
  require('../../build/main/js/data/products.js');
  require('../../build/main/js/data/equipment.js');
  require('../../build/main/js/data/research.js');
  require('../../build/main/js/data/helpers.js');
  require('../../build/main/js/data/insurance.js');
  require('../../build/main/js/data/properties.js');
  require('../../build/main/js/data/lending.js');
  require('../../build/main/js/data/finances.js');
  require('../../build/main/js/saveFile.js');
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
  require('../../build/main/js/gameInitializer.js');

  expect(window.initializeNewGame({ pharmacyName: 'Mountain Care', ...options })).toBe(true);
  window.gameState.isDayActive = true;
  window.gameState.isPaused = false;
}

function location() {
  return window.company.active();
}

// Closes today as main.ts does at 22:00. The summary is skipped, so the
// next day starts by itself unless a report or the win waits for an answer.
function closeDay() {
  window.gameState.currentDate.setHours(22, 0, 0, 0);
  window.timeEvents.closeDay(window.gameState);
}

// Closes days until the date is `day` of the month after today's
function closeUntil(month, day) {
  for (let i = 0; i < 400; i++) {
    const date = window.gameState.currentDate;
    if (date.getMonth() === month && date.getDate() === day) return;
    closeDay();
    // A report at closing waits for its Continue
    const report = window.showReportModal.mock.calls.at(-1);
    if (report && !window.gameState.isDayActive) {
      window.showReportModal.mockClear();
      report[2]();
    }
  }
  throw new Error('never got there');
}

function income(amount) {
  window.finances.transact({ type: 'income', category: 'copays', amount, description: 'sale' });
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('the company and its locations (#10)', () => {
  test("a new game is a company with one location, and the globals are views of that location's lists", () => {
    loadGame();
    expect(window.company.name).toBe('Mountain Care');
    expect(window.company.locations).toHaveLength(1);
    expect(location()).toMatchObject({ id: 'loc-1', businessType: 'retail', openedOnDay: 0 });
    expect(window.employeesData).toBe(location().employees);
    expect(window.productsData).toBe(location().products);
    expect(window.materialsData).toBe(location().materials);
    expect(window.equipmentData).toBe(location().equipment);
    expect(window.taskManager.tasks).toBe(location().tasks);
    expect(window.customers.activeCustomers).toBe(location().customers);
    // The company's day records are its own; visits are the location's
    expect(window.records.visits).toBe(location().visits);
    // Its saves are listed together
    expect(window.gameState.gameId).toMatch(/^game-/);
  });

  test("each location's wages and utilities are charged at closing, against that location", () => {
    loadGame();
    window.employeesData.push(employee('a', 'Cashier'));
    const second = window.company.fromListing(window.properties.find('route-9'), 3, 0, 0);
    second.id = 'loc-2';
    second.employees.push(employee('b', 'Pharmacist', 58400));
    window.company.reset(window.company.name, [location(), second], 'loc-1');

    const before = window.financesData.transactions.length;
    window.finances.applyDailyCosts();
    const charged = window.financesData.transactions.slice(0, window.financesData.transactions.length - before);
    const by = (id, category) =>
      charged.filter((t) => t.locationId === id && t.category === category).reduce((sum, t) => sum + t.amount, 0);
    expect(by('loc-1', 'wages')).toBeCloseTo(100);
    expect(by('loc-2', 'wages')).toBeCloseTo(200);
    expect(by('loc-1', 'overhead')).toBe(window.company.dailyServices(window.company.get('loc-1')));
    expect(by('loc-2', 'overhead')).toBe(window.company.dailyServices(second));
    expect(window.company.activeId).toBe('loc-1');
  });
});

describe('buildings and zones (#11)', () => {
  test('stock takes shelves: materials by the thousand, products by the 25', () => {
    loadGame();
    const material = window.materialsData[0];
    const product = window.productsData[0];
    expect(window.building.materialShelves(material, 1)).toBe(1);
    expect(window.building.materialShelves(material, 1000)).toBe(1);
    expect(window.building.materialShelves(material, 1001)).toBe(2);
    expect(window.building.productShelves(product, 26)).toBe(2);
    expect(window.building.materialShelves(material, 0)).toBe(0);

    // The first listing: 450 sq ft of storage, 45 bays of 5 shelves
    const storage = window.building.zone('storage');
    expect(storage.shelves).toBe(225);
    const used =
      window.materialsData.reduce((sum, m) => sum + window.building.materialShelves(m), 0) +
      window.productsData.reduce((sum, p) => sum + window.building.productShelves(p), 0);
    expect(storage.usedShelves).toBe(used);
    expect(window.building.freeShelves()).toBe(225 - used);
  });

  test('a material order that would need more shelves than are free is refused', () => {
    loadGame();
    const free = window.building.freeShelves();
    const material = window.materialsData[0];
    const fits = { [material.id]: 1000 * free - (material.inventory % 1000 ? 1000 - (material.inventory % 1000) : 0) };
    expect(window.building.refuseMaterials(fits)).toBe('');
    const tooMuch = { [material.id]: 1000 * (free + 1) };
    expect(window.building.refuseMaterials(tooMuch)).toContain('Not enough storage');
    expect(window.building.shelvesNeeded(tooMuch)).toBeGreaterThan(free);
  });

  test('auto-ordering stops when storage is full, and says so once a day', () => {
    loadGame();
    const low = window.materialsData[0];
    low.inventory = 100; // below its reorder point
    // Fill the shelves: one material takes every one left
    const hog = window.materialsData[1];
    hog.inventory += 1000 * window.building.freeShelves();
    expect(window.building.freeShelves()).toBe(0);
    const cash = window.financesData.cash;

    window.timeEvents.autoOrderCheck();
    window.timeEvents.autoOrderCheck();
    expect(low.inventory).toBe(100);
    expect(window.financesData.cash).toBe(cash);
    const warnings = window.notifications.add.mock.calls.filter(([m]) => m.startsWith('Storage is full'));
    expect(warnings).toHaveLength(1);
  });

  test('equipment takes floor space in the lab, and a purchase that will not fit is refused', () => {
    loadGame();
    const lab = window.building.zone('lab');
    // 300 sq ft: two benches and a sink, and the starting equipment
    const fixtures = 2 * 24 + 10;
    const owned = window.equipmentData.reduce((sum, eq) => sum + eq.owned * eq.sqft, 0);
    expect(lab.usedSqft).toBe(fixtures + owned);
    const press = window.equipmentData.find((eq) => eq.id === 'eq002');
    const fit = Math.floor(window.building.freeSqft('lab') / press.sqft);
    expect(window.building.refuseEquipment({ eq002: fit })).toBe('');
    expect(window.building.refuseEquipment({ eq002: fit + 1 })).toContain('Not enough room in the lab');

    // Auto-purchase respects it too
    press.autoPurchaseThreshold = 50;
    press.autoPurchaseAmount = fit + 1;
    const ownedBefore = press.owned;
    window.timeEvents.autoPurchaseEquipmentCheck();
    expect(press.owned).toBe(ownedBefore);
  });

  test('the front store holds so many customers; past that they go elsewhere, counted as turned away', () => {
    loadGame();
    window.productsData.forEach((p) => (p.inventory = 1000)); // so every one is served
    const capacity = window.building.customerCapacity();
    // 800 sq ft less the counter, seating and shelving, 8 sq ft each
    expect(capacity).toBe(Math.floor((800 - 40 - 40 - 8 * 12) / 8));
    for (let i = 0; i < capacity; i++) window.customers.generateCustomer();
    expect(window.customers.activeCustomers).toHaveLength(capacity);
    expect(window.customers.generateCustomer()).toBeNull();
    expect(window.customers.activeCustomers).toHaveLength(capacity);
    expect(window.gameState.customersToday.unavailable).toBe(1);
    expect(window.notifications.add).toHaveBeenCalledWith(expect.stringContaining('front store is full'), 'warning');
  });
});

describe('rent and the startup loan on the 1st (#11, #12)', () => {
  test('rent is charged on the 1st of each month, for the location', () => {
    loadGame();
    const rent = location().lease.monthlyRent;
    expect(window.financesData.expenseCategories.rent).toBe(rent); // January's, at signing
    closeUntil(1, 1); // Feb 1
    expect(window.financesData.expenseCategories.rent).toBe(2 * rent);
    const february = window.financesData.transactions.find((t) => t.category === 'rent' && t.date.getMonth() === 1);
    expect(february).toMatchObject({ amount: rent, locationId: 'loc-1' });
    expect(february.date.getDate()).toBe(1);
  });

  test('a lease renews for the same term at its end, with the rent up 3% a year', () => {
    loadGame({ leaseYears: 1 });
    const lease = location().lease;
    const rent = lease.monthlyRent;
    window.gameState.currentDate = new Date(lease.end);
    window.company.payRent();
    expect(lease.monthlyRent).toBe(Math.round(rent * 1.03));
    expect(new Date(lease.end).getFullYear()).toBe(2025);
    expect(window.notifications.add).toHaveBeenCalledWith(expect.stringContaining('has renewed for 1 year'), 'info');
  });

  test('the startup loan is repaid monthly from next month: interest a cost, principal not', () => {
    loadGame({ loan: { amount: 120000, termYears: 5, guarantee: false, collateral: false } });
    const [loan] = window.financesData.loans;
    const quote = window.lending.quote({ amount: 120000, termYears: 5, guarantee: false, collateral: false });
    expect(loan.monthlyPayment).toBeCloseTo(quote.monthlyPayment, 2);
    expect(window.stakes.termLoanBalance()).toBe(120000);

    closeUntil(1, 1); // Feb 1: the first payment
    const interest = Math.round(((120000 * loan.rate) / 12) * 100) / 100;
    expect(loan.paymentsMade).toBe(1);
    expect(window.financesData.expenseCategories.interest).toBeCloseTo(interest);
    expect(loan.balance).toBeCloseTo(120000 - (loan.monthlyPayment - interest), 2);
    const principal = window.financesData.transactions.find((t) => t.category === 'loan' && t.type === 'expense');
    expect(principal).toMatchObject({ locationId: null });
    expect(principal.amount).toBeCloseTo(loan.monthlyPayment - interest, 2);
    // and the runway counts a day's share of it
    expect(window.stakes.fixedDailyCosts()).toBeGreaterThan(loan.monthlyPayment / 31);
  });

  test('the last payment clears the loan, and it can be paid off early', () => {
    loadGame({ loan: { amount: 100000, termYears: 5, guarantee: true, collateral: true } });
    const [loan] = window.financesData.loans;
    loan.paymentsMade = loan.termMonths - 1;
    loan.balance = 500;
    window.stakes.payTermLoans();
    expect(window.financesData.loans).toEqual([]);
    expect(window.notifications.add).toHaveBeenCalledWith('Startup loan is paid off.', 'success');

    loadGame({ loan: { amount: 100000, termYears: 5, guarantee: false, collateral: false } });
    const [second] = window.financesData.loans;
    window.financesData.cash = 50000;
    expect(window.stakes.payOffTermLoan(second.id)).toBe(false); // not the cash
    window.financesData.cash = 200000;
    expect(window.stakes.payOffTermLoan(second.id)).toBe(true);
    expect(window.financesData.cash).toBe(100000);
    expect(window.stakes.debt()).toBe(0);
  });
});

describe('negotiating the startup loan (#12)', () => {
  beforeEach(() => loadGame());

  const quote = (terms) =>
    window.lending.quote({ amount: 100000, termYears: 5, guarantee: false, collateral: false, ...terms });

  test('each choice moves the rate as designed', () => {
    const base = quote().rate;
    expect(base).toBeCloseTo(0.095);
    // A longer term costs a quarter point a year past five
    expect(quote({ termYears: 10 }).rate).toBeCloseTo(base + 0.0125);
    // Borrowing more than the $100,000 put in: half a point a $50,000 step
    expect(quote({ amount: 150000 }).rate).toBeCloseTo(base + 0.005);
    expect(quote({ amount: 200000 }).rate).toBeCloseTo(base + 0.01);
    // A guarantee and collateral cost less
    expect(quote({ guarantee: true }).rate).toBeCloseTo(base - 0.01);
    expect(quote({ collateral: true }).rate).toBeCloseTo(base - 0.0075);
    // never below the floor
    expect(quote({ amount: 10000, guarantee: true, collateral: true }).rate).toBeGreaterThanOrEqual(0.065);
    expect(quote({ guarantee: true }).parts.map((p) => p.label)).toEqual(['Base rate', 'Personal guarantee']);
  });

  test('payments are amortised: every month the same, adding up to the principal and interest', () => {
    const q = quote({ termYears: 7 });
    const r = q.rate / 12;
    let balance = 100000;
    for (let month = 0; month < 84; month++) balance = balance * (1 + r) - q.monthlyPayment;
    expect(balance).toBeCloseTo(0, 4);
    expect(q.totalInterest).toBeCloseTo(q.monthlyPayment * 84 - 100000);
    expect(window.lending.quote({ amount: 0, termYears: 5 }).monthlyPayment).toBe(0);
  });

  test('the cap is set by the business type and the property', () => {
    const cheap = window.lending.maxAmount('retail', window.properties.find('route-9'), 3);
    const dear = window.lending.maxAmount('retail', window.properties.find('market-street'), 3);
    expect(cheap).toBe(190000); // $150,000 + 24 x $1,800
    expect(dear).toBe(320000); // $150,000 + 24 x $7,250, rounded down
    expect(cheap % window.lending.AMOUNT_STEP).toBe(0);
  });
});

describe('monthly and yearly reports (#13)', () => {
  test("the month's last closing writes its report, which opens after the summary and before the next day", () => {
    loadGame();
    window.appSettings.skipDailySummary = false;
    window.gameState.currentDate = new Date(2023, 0, 31, 9);
    window.gameState.dayIndex = 30;
    income(500);
    closeDay();
    const report = window.reports.find('month', '2023-01');
    expect(report).toMatchObject({ kind: 'month', label: 'January 2023', lastDay: 30 });
    // The summary first, then the report, then the next day
    expect(window.showReportModal).not.toHaveBeenCalled();
    window.showDailySummaryModal.mock.calls[0][0]();
    expect(window.showReportModal).toHaveBeenCalledWith('month', '2023-01', expect.any(Function));
    expect(window.gameState.currentDate.getDate()).toBe(31);
    window.showReportModal.mock.calls[0][2]();
    expect(window.gameState.currentDate.getMonth()).toBe(1);
  });

  test('a skipped report is kept and announced, and the next day starts by itself', () => {
    loadGame();
    window.appSettings.skipMonthlyReport = true;
    window.gameState.currentDate = new Date(2023, 0, 31, 9);
    closeDay();
    expect(window.showReportModal).not.toHaveBeenCalled();
    expect(window.reports.find('month', '2023-01')).toBeDefined();
    expect(window.notifications.add).toHaveBeenCalledWith(
      'The January 2023 report is ready on the Finances page.',
      'info',
    );
    expect(window.gameState.currentDate.getMonth()).toBe(1);
  });

  test("a report has the month's P&L by category and location, the balance sheet, loans and highlights", () => {
    loadGame({ loan: { amount: 50000, termYears: 5, guarantee: false, collateral: false } });
    window.employeesData.push(employee('a', 'Cashier'));
    income(1000);
    closeDay();
    income(3000);
    closeUntil(0, 31);
    income(200);
    closeDay();
    const report = window.reports.find('month', '2023-01');
    const days = window.records.days.filter((d) => new Date(d.date).getMonth() === 0);
    expect(report.daysOpen).toBe(31);
    expect(report.revenue).toBeCloseTo(days.reduce((sum, d) => sum + d.revenue, 0));
    expect(report.costs).toBeCloseTo(days.reduce((sum, d) => sum + d.costs, 0));
    expect(report.costsByCategory.rent).toBe(location().lease.monthlyRent);
    expect(report.byLocation).toEqual([expect.objectContaining({ id: 'loc-1', revenue: 4200 })]);
    expect(report.highlights.bestDay).toMatchObject({ day: 1 });
    expect(report.balance).toMatchObject({ termLoans: 50000, creditLine: 0, deposits: location().lease.deposit });
    expect(report.loans).toEqual([expect.objectContaining({ name: 'Startup loan', paymentsLeft: 60 })]);
    expect(report.highlights.goals).toContain('Open for a week');
  });

  test("December's last closing writes the year's report from its months", () => {
    loadGame();
    window.appSettings.skipMonthlyReport = true;
    window.appSettings.skipYearlyReport = true;
    window.gameState.currentDate = new Date(2023, 10, 30, 9);
    closeDay(); // November
    income(700);
    window.gameState.currentDate = new Date(2023, 11, 31, 9);
    closeDay(); // December and the year
    const year = window.reports.find('year', '2023');
    const months = window.reports.list.filter((r) => r.kind === 'month');
    expect(months.map((m) => m.period)).toEqual(['2023-11', '2023-12']);
    expect(year.revenue).toBeCloseTo(months.reduce((sum, m) => sum + m.revenue, 0));
    expect(year.daysOpen).toBe(2);
    expect(window.notifications.add).toHaveBeenCalledWith('The 2023 report is ready on the Finances page.', 'info');
  });

  test("a month's P&L is the same before and after its ledger entries are summarised", () => {
    loadGame();
    window.employeesData.push(employee('a', 'Cashier'));
    window.appSettings.skipMonthlyReport = true;
    for (let day = 0; day < 31; day++) {
      income(100 + day);
      closeDay();
    }
    // Feb 1: January's report is written; its entries are still in the log
    const from = new Date(2023, 0, 1).getTime();
    const to = new Date(2023, 0, 31, 23, 59).getTime();
    const fromLedger = window.finances.categoryTotals(from, to);
    const january = window.reports.find('month', '2023-01');
    expect(january.revenueByCategory).toEqual(fromLedger.revenue);
    Object.entries(fromLedger.expenses).forEach(([category, amount]) =>
      expect(january.costsByCategory[category]).toBeCloseTo(amount),
    );

    // At the end of March, January's entries go; the report keeps the month
    closeUntil(3, 1);
    expect(window.financesData.transactions.some((t) => t.date.getTime() <= to)).toBe(false);
    expect(window.financesData.transactions.some((t) => t.date.getMonth() === 1)).toBe(true); // February kept
    expect(window.reports.find('month', '2023-01')).toEqual(january);
  });

  test('day records over a year old are dropped once reported, keeping their customer counts', () => {
    loadGame();
    window.reports.list.push({ kind: 'month', period: '2023-01' });
    window.records.days = [
      { day: 0, date: new Date(2023, 0, 1, 22).getTime(), customers: { served: 7, impatient: 2 } },
      { day: 1, date: new Date(2023, 0, 2, 22).getTime(), customers: { served: 3 } },
      { day: 460, date: new Date(2024, 3, 5, 22).getTime(), customers: { served: 9 } },
    ];
    window.gameState.dayIndex = 461;
    window.gameState.customersToday = { served: 1 };
    expect(window.records.totalCustomers('served')).toBe(20);
    expect(window.records.pruneDays()).toBe(2);
    expect(window.records.days.map((d) => d.day)).toEqual([460]);
    expect(window.records.pruned).toEqual({ served: 10, impatient: 2 });
    expect(window.records.totalCustomers('served')).toBe(20);
  });
});

describe('goals for a long game (#13)', () => {
  test('the ladder runs for years and keeps the old goals', () => {
    loadGame();
    const ids = window.goals.list().map((g) => g.id);
    [
      'week',
      'served500',
      'reputation50',
      'research2',
      'staff8',
      'bank150k',
      'served2500',
      'reputation75',
      'research4',
      'bank300k',
    ].forEach((id) => expect(ids).toContain(id));
    expect(ids.at(-1)).toBe('years5');
    expect(window.goals.list().find((g) => g.id === 'years5').target).toBe(5 * 365);
  });

  test("a profitable month is reached at the closing that writes the month's report", () => {
    loadGame();
    window.appSettings.skipMonthlyReport = true;
    window.gameState.currentDate = new Date(2023, 0, 31, 9);
    income(100000);
    closeDay();
    expect(window.goals.list().find((g) => g.id === 'profitMonth').reachedOn).toBe(0);
  });

  test('money goals count cash less every loan, the startup loan too', () => {
    loadGame({ loan: { amount: 100000, termYears: 5, guarantee: false, collateral: false } });
    window.financesData.cash = 200000;
    closeDay();
    expect(window.goals.list().find((g) => g.id === 'bank150k').reachedOn).toBeNull();
    window.financesData.cash = 260000;
    closeDay();
    expect(window.goals.list().find((g) => g.id === 'bank150k').reachedOn).toBe(1);
  });
});
