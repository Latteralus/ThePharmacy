/**
 * Tests for the save file format (review findings A2, C5): a save holds only
 * player state, round-trips through JSON with every Date revived, restores
 * tasks/customers/claims/settings, keeps custom prices, takes static data
 * from the data files, and upgrades older saves. From v10 (Phase 10) a save
 * is the company and its locations, with its notifications.
 */

// What game-integration.js does to a save on its way to disk and back.
function throughDisk(save) {
  return JSON.parse(JSON.stringify(save));
}

// A current save in the one-pharmacy shape saves had up to v9, to build
// older saves from (then each test takes it back to its version).
function asV9(save) {
  const location = save.locations[0];
  return throughDisk({
    version: 9,
    timestamp: save.timestamp,
    gameState: { ...save.gameState, pharmacyName: save.company.name, location: location.area },
    financesData: { ...save.company.finances, overhead: 700 },
    employeesData: location.employees,
    brandReputation: { reputationScore: save.company.reputation },
    products: location.products,
    materials: location.materials,
    equipment: location.equipment,
    research: save.company.research,
    tasks: location.tasks,
    customers: location.customers,
    activePrescriptions: location.prescriptions,
    refillRegistry: location.refills,
    insuranceClaims: save.company.insuranceClaims,
    records: { days: save.company.records.days, visits: location.visits },
    settings: save.settings,
  });
}

function loadModules() {
  jest.resetModules();
  window.gameState = {
    currentDate: new Date(2023, 0, 4, 15, 30),
    dayIndex: 3,
    isDayActive: true,
    isPaused: false,
    gameId: 'game-test',
    lastFrameTime: 12345,
    lastSimulationTime: 12345,
    simulationAccumulator: 7,
    renderInfo: { fps: 60, frameCount: 10, lastFpsUpdate: 12000 },
  };
  window.updateUI = jest.fn();
  window.employeesData = [];

  let speed = 1;
  window.getGameSpeed = () => speed;
  window.setGameSpeed = (s) => {
    speed = s;
  };
  window.brandReputation = { reputationScore: 10, calcCustomers: () => 2 };

  window.taskManager = { tasks: [] };

  require('../../build/main/js/ids.js');
  require('../../build/main/js/data/materials.js');
  require('../../build/main/js/data/products.js');
  require('../../build/main/js/data/equipment.js');
  require('../../build/main/js/data/insurance.js');
  require('../../build/main/js/data/research.js');
  require('../../build/main/js/data/properties.js');
  require('../../build/main/js/data/finances.js');
  require('../../build/main/js/insuranceClaims.js');
  require('../../build/main/js/saveFile.js');
  require('../../build/main/js/records.js');

  window.customers = {
    activeCustomers: [],
    getInsuranceByPlanName: (name) => window.insuranceData.find((p) => p.planName === name),
    reconcileTasks: jest.fn(() => 0),
  };
  window.prescriptions = { activePrescriptions: [], refillRegistry: [] };

  // After every list it makes a view of
  require('../../build/main/js/company.js');
  require('../../build/main/js/reports.js');
  window.company.name = 'Test Pharmacy';
}

// A game in progress: a customer mid-visit, their tasks, a pending claim,
// a custom price and non-default settings.
function playABit() {
  window.finances.transact({ type: 'income', category: 'copays', amount: 40, description: 'sale' });
  window.employeesData.push({
    id: 'emp1',
    firstName: 'Ann',
    lastName: 'Lee',
    role: 'Cashier',
    salary: 50000,
    hireDate: new Date(2023, 0, 1),
    currentTaskId: 'checkin-cust-1',
  });
  window.customers.activeCustomers.push({
    id: 'cust-1',
    type: 'Normal',
    status: 'waitingForCheckIn',
    arrivedAt: window.gameState.currentDate.getTime(),
    insurance: window.insuranceData[0],
    prescriptionId: 'pres-1',
    patience: 42,
    firstName: 'Bo',
    lastName: 'Chen',
    mood: 7,
    lastStateChange: window.gameState.currentDate.getTime() - 60000,
  });
  window.taskManager.tasks.push({
    id: 'checkin-cust-1',
    type: 'customerInteraction',
    status: 'inProgress',
    progress: 1.5,
    totalTime: 3,
    customerId: 'cust-1',
    assignedTo: 'emp1',
    createdAt: window.gameState.currentDate.getTime() - 90000,
  });
  window.prescriptions.activePrescriptions.push({ id: 'pres-1', customerId: 'cust-1', productId: 'pd001' });
  window.customers.activeCustomers.push({ ...window.customers.activeCustomers[0], id: 'cust-2' });
  window.insuranceClaims.addClaim('cust-2', 'pres-0', 100, 20);

  window.productsData.find((p) => p.id === 'pd001').price = 123.45;
  window.materialsData[0].autoOrderThreshold = 7;
  window.equipmentData[0].owned = 3;
  window.researchData.currentLevel = 1;
  window.brandReputation.reputationScore = 33;
  window.setGameSpeed(2);
  window.globalMarkup = 1.5;
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  loadModules();
});

afterEach(() => {
  jest.restoreAllMocks();
  delete window.notifications;
});

describe('serialize', () => {
  test('writes only player state for static data, and no frame-loop timestamps', () => {
    playABit();
    const save = window.saveFile.serialize();

    expect(save.version).toBe(window.saveFile.version);
    expect(save.gameState.lastSimulationTime).toBeUndefined();
    expect(save.gameState.renderInfo).toBeUndefined();
    const [location] = save.locations;
    expect(location.products.find((p) => p.id === 'pd001')).toEqual({
      id: 'pd001',
      price: 123.45,
      inventory: expect.any(Number),
      maxInventory: expect.any(Number),
    });
    expect(Object.keys(location.equipment[0]).sort()).toEqual(
      ['autoPurchaseAmount', 'autoPurchaseThreshold', 'durability', 'id', 'owned'].sort(),
    );
    expect(save.company.research).toEqual({ currentLevel: 1, inProgress: null });
    // gameAPI.saveGame sends this over IPC, so it must survive the
    // structured clone algorithm (v8.serialize uses it; jsdom has no
    // structuredClone). A function anywhere in it would throw.
    expect(() => require('v8').serialize(save)).not.toThrow();
  });

  test('is the company and its locations (Phase 10)', () => {
    playABit();
    const save = window.saveFile.serialize();
    expect(save.company).toMatchObject({
      name: 'Test Pharmacy',
      activeLocationId: 'loc-1',
      reputation: 33,
      reports: [],
      records: { days: [], pruned: {} },
    });
    expect(save.company.finances.cash).toBe(window.financesData.cash);
    expect(save.locations).toHaveLength(1);
    const [location] = save.locations;
    expect(location).toMatchObject({ id: 'loc-1', businessType: 'retail', area: 'suburban' });
    expect(location.building.zones.lab).toBeGreaterThan(0);
    expect(location.employees.map((e) => e.id)).toEqual(['emp1']);
    expect(location.customers.map((c) => c.id)).toEqual(['cust-1', 'cust-2']);
    expect(location.tasks.map((t) => t.id)).toEqual(['checkin-cust-1']);
    // Nothing is left at the top level from the one-pharmacy shape
    expect(save.financesData).toBeUndefined();
    expect(save.employeesData).toBeUndefined();
    expect(save.gameState.pharmacyName).toBeUndefined();
  });
});

describe('save -> disk -> load round trip', () => {
  let save;

  beforeEach(() => {
    playABit();
    save = throughDisk(window.saveFile.serialize());
    loadModules(); // a fresh launch
    window.company.name = 'Another Session';
    window.saveFile.apply(save);
  });

  test('restores game state with Dates revived and loop timestamps zeroed', () => {
    expect(window.gameState.currentDate).toEqual(new Date(2023, 0, 4, 15, 30));
    expect(window.company.name).toBe('Test Pharmacy');
    expect(window.gameState.lastSimulationTime).toBe(0);
    expect(window.gameState.simulationAccumulator).toBe(0);
    expect(window.financesData.transactions[0].date).toBeInstanceOf(Date);
    expect(window.employeesData[0].hireDate).toBeInstanceOf(Date);
  });

  test('restores tasks, with employees still pointing at them', () => {
    expect(window.taskManager.tasks).toHaveLength(1);
    expect(window.taskManager.tasks[0]).toMatchObject({ id: 'checkin-cust-1', progress: 1.5, assignedTo: 'emp1' });
    expect(window.employeesData[0].currentTaskId).toBe('checkin-cust-1');
  });

  test('restores customers and their prescriptions', () => {
    expect(window.customers.activeCustomers.map((c) => c.id)).toEqual(['cust-1', 'cust-2']);
    expect(window.customers.activeCustomers[0]).toMatchObject({ patience: 42, status: 'waitingForCheckIn' });
    expect(window.customers.activeCustomers[0].insurance).toBe(window.insuranceData[0]);
    expect(window.prescriptions.activePrescriptions).toEqual([
      { id: 'pres-1', customerId: 'cust-1', productId: 'pd001' },
    ]);
  });

  test('restores pending insurance claims, so the money owed survives', () => {
    const [claim] = window.insuranceClaims.pendingClaims;
    expect(claim.amountDue).toBe(80);
    expect(claim.submittedDate).toBeInstanceOf(Date);
    expect(window.financesData.pendingInsuranceIncome).toBe(80);

    window.insuranceClaims.rejectionRate = 0;
    window.gameState.currentDate = new Date(2023, 0, 5, 9, 0);
    window.insuranceClaims.processAllClaims();
    expect(window.financesData.cash).toBe(10000 + 40 + 80);
    expect(window.insuranceClaims.processedClaims[0].processedDate).toBeInstanceOf(Date);
  });

  test('keeps custom prices and other per-item state', () => {
    expect(window.productsData.find((p) => p.id === 'pd001').price).toBe(123.45);
    expect(window.materialsData[0].autoOrderThreshold).toBe(7);
    expect(window.equipmentData[0].owned).toBe(3);
    expect(window.researchData.currentLevel).toBe(1);
    expect(window.researchData.levels.length).toBeGreaterThan(1);
    expect(window.brandReputation.reputationScore).toBe(33);
    expect(typeof window.brandReputation.calcCustomers).toBe('function');
  });

  test('which equipment can be bought follows the loaded research level', () => {
    const levelOne = window.researchData.levels[1].unlockedEquipment[0];
    const levelTwo = window.researchData.levels[2].unlockedEquipment[0];
    expect(window.research.isEquipmentUnlocked(levelOne)).toBe(true);
    expect(window.research.isEquipmentUnlocked(levelTwo)).toBe(false);
  });

  test('restores speed and markup', () => {
    expect(window.getGameSpeed()).toBe(2);
    expect(window.globalMarkup).toBe(1.5);
  });

  test("the per-location globals are views of the location's lists", () => {
    const location = window.company.active();
    expect(window.employeesData).toBe(location.employees);
    expect(window.productsData).toBe(location.products);
    expect(window.taskManager.tasks).toBe(location.tasks);
    expect(window.customers.activeCustomers).toBe(location.customers);
    expect(window.prescriptions.activePrescriptions).toBe(location.prescriptions);
    expect(window.records.visits).toBe(location.visits);
  });
});

describe('the company and its locations (Phase 10, #10)', () => {
  // A second location, with its own staff and stock
  function twoLocations() {
    const first = window.company.active();
    const listing = window.properties.find('oak-street');
    const second = window.company.fromListing(listing, 5, window.gameState.currentDate.getTime(), 3);
    second.id = 'loc-2';
    second.employees.push({ id: 'emp9', firstName: 'Cy', lastName: 'Ng', role: 'Pharmacist', salary: 120000 });
    second.products.find((p) => p.id === 'pd001').inventory = 42;
    window.company.reset(window.company.name, [first, second], 'loc-1');
    return { first, second };
  }

  test('withLocation runs code against another location, then switches back', () => {
    playABit();
    const { second } = twoLocations();
    expect(window.employeesData.map((e) => e.id)).toEqual(['emp1']);
    const seen = window.company.withLocation('loc-2', () => ({
      staff: window.employeesData.map((e) => e.id),
      stock: window.productsData.find((p) => p.id === 'pd001').inventory,
    }));
    expect(seen).toEqual({ staff: ['emp9'], stock: 42 });
    expect(window.company.activeId).toBe('loc-1');
    // Writes go to the active location too
    window.company.withLocation('loc-2', () => {
      window.customers.activeCustomers = [{ id: 'cust-x' }];
    });
    expect(second.customers).toEqual([{ id: 'cust-x' }]);
    expect(window.customers.activeCustomers.map((c) => c.id)).toEqual(['cust-1', 'cust-2']);
  });

  test('every location round-trips through a save, and the active one stays active', () => {
    playABit();
    twoLocations();
    window.company.select('loc-2');
    const save = throughDisk(window.saveFile.serialize());
    expect(save.locations.map((l) => l.id)).toEqual(['loc-1', 'loc-2']);

    loadModules();
    window.saveFile.apply(save);
    expect(window.company.locations.map((l) => l.id)).toEqual(['loc-1', 'loc-2']);
    expect(window.company.activeId).toBe('loc-2');
    expect(window.employeesData.map((e) => e.id)).toEqual(['emp9']);
    expect(window.productsData.find((p) => p.id === 'pd001').inventory).toBe(42);
    expect(window.company.get('loc-2').lease.termYears).toBe(5);
    expect(window.company.withLocation('loc-1', () => window.employeesData.map((e) => e.id))).toEqual(['emp1']);
    // Every location's customers get the tasks their status needs
    expect(window.customers.reconcileTasks).toHaveBeenCalledTimes(2);
  });

  test('notifications are saved with the game, read or not (C5)', () => {
    window.notifications = {
      items: [
        { id: 4, message: 'Old news', type: 'info', timestamp: new Date(2023, 0, 3, 9), read: true },
        { id: 5, message: 'Cash is low', type: 'warning', timestamp: new Date(2023, 0, 4, 9), read: false },
      ],
      unreadCount: 1,
      nextId: 6,
      restore: jest.fn(),
    };
    const save = throughDisk(window.saveFile.serialize());
    expect(save.notifications).toMatchObject({ unreadCount: 1, nextId: 6 });
    expect(save.notifications.items).toHaveLength(2);

    loadModules();
    window.notifications = { restore: jest.fn() };
    window.saveFile.apply(save);
    const [restored] = window.notifications.restore.mock.calls[0];
    expect(restored.items.map((n) => n.message)).toEqual(['Old news', 'Cash is low']);
    expect(restored.items[0].timestamp).toBeInstanceOf(Date);
  });

  test('reports, pruned customer counts and term loans are saved', () => {
    window.reports.list.push({ kind: 'month', period: '2023-01', net: 5 });
    window.records.pruned = { served: 12 };
    window.financesData.loans = [{ id: 'loan-1', name: 'Startup loan', balance: 1000 }];
    const save = throughDisk(window.saveFile.serialize());
    loadModules();
    window.saveFile.apply(save);
    expect(window.reports.list).toEqual([{ kind: 'month', period: '2023-01', net: 5 }]);
    expect(window.records.pruned).toEqual({ served: 12 });
    expect(window.financesData.loans[0]).toMatchObject({ name: 'Startup loan', balance: 1000 });
  });
});

describe('static data comes from the data files', () => {
  test('static fields in a save are ignored, and unknown or missing items are handled', () => {
    const save = throughDisk(window.saveFile.serialize());
    const realName = window.productsData.find((p) => p.id === 'pd001').name;
    const products = save.locations[0].products;
    Object.assign(
      products.find((p) => p.id === 'pd001'),
      { name: 'Old Name', cost: 1, inventory: 9 },
    );
    products.push({ id: 'pd-removed', price: 1, inventory: 1, maxInventory: 1 });
    save.locations[0].products = products.filter((p) => p.id !== 'pd002');
    const pd002Default = window.productsData.find((p) => p.id === 'pd002').inventory;

    loadModules();
    window.saveFile.apply(save);

    const pd001 = window.productsData.find((p) => p.id === 'pd001');
    expect(pd001.name).toBe(realName);
    expect(pd001.cost).not.toBe(1);
    expect(pd001.inventory).toBe(9);
    expect(window.productsData.find((p) => p.id === 'pd-removed')).toBeUndefined();
    expect(window.productsData.find((p) => p.id === 'pd002').inventory).toBe(pd002Default);
  });

  test('loading never touches the pristine defaults', () => {
    playABit();
    const save = throughDisk(window.saveFile.serialize());
    window.saveFile.apply(save);
    window.productsData.find((p) => p.id === 'pd001').price = 999;

    window.saveFile.apply(save);
    expect(window.productsData.find((p) => p.id === 'pd001').price).toBe(123.45);
    // and a new location gets them too
    expect(window.saveFile.freshDefinitions().products.find((p) => p.id === 'pd001').price).not.toBe(999);
  });
});

describe('migrating v1 saves', () => {
  // The shape electron-integration.ts wrote before saves were versioned.
  function v1Save() {
    const financesData = throughDisk(window.financesData);
    financesData.revenueCategories.prescriptions = 300;
    financesData.pendingInsuranceIncome = 250;
    financesData.insuranceReimbursements.pending = 250;
    financesData.transactions = [
      { id: 't1', date: '2023-01-02T10:00:00.000Z', type: 'income', category: 'copay', amount: 20, description: 'x' },
      {
        id: 't2',
        date: '2023-01-02T10:00:00.000Z',
        type: 'income',
        category: 'insurance',
        amount: 80,
        description: 'Pending insurance claim',
        pending: true,
      },
    ];
    const productsData = throughDisk(window.productsData);
    productsData.find((p) => p.id === 'pd001').price = 77;
    productsData.find((p) => p.id === 'pd001').name = 'Frozen Old Name';

    return throughDisk({
      gameState: {
        ...window.gameState,
        pharmacyName: 'Old Pharmacy',
        location: 'suburban',
        lastSimulationTime: 999999,
      },
      financesData,
      employeesData: [{ id: 'emp1', firstName: 'A', lastName: 'B', currentTaskId: 'gone', hireDate: '2023-01-01' }],
      productsData,
      materialsData: window.materialsData,
      equipmentData: window.equipmentData,
      brandReputation: { reputationScore: 21 },
      researchData: { ...window.researchData, currentLevel: 2 },
      activePrescriptions: [{ id: 'orphan' }],
      refillRegistry: [{ id: 'refill-1' }],
      timestamp: 1,
    });
  }

  test('upgrades to the current version', () => {
    const save = window.saveFile.migrate(v1Save());
    expect(save.version).toBe(window.saveFile.version);
    expect(save.locations[0].tasks).toEqual([]);
    expect(save.settings.gameSpeed).toBe(1);
  });

  test('loads, keeping player state and dropping what v1 got wrong', () => {
    const v1 = v1Save();
    loadModules();
    window.saveFile.apply(v1);

    const data = window.financesData;
    expect(data.transactions.map((t) => t.id)).toEqual(['t1']);
    expect(data.transactions[0].date).toBeInstanceOf(Date);
    expect(data.revenueCategories.prescriptions).toBeUndefined();
    // v1 lost its claims, so nothing is actually owed any more.
    expect(data.pendingInsuranceIncome).toBe(0);
    expect(data.insuranceReimbursements.pending).toBe(0);

    expect(window.employeesData[0].currentTaskId).toBeNull();
    expect(window.prescriptions.activePrescriptions).toEqual([]);
    expect(window.prescriptions.refillRegistry).toEqual([{ id: 'refill-1' }]);

    // Repriced on today's costs at v1's 35% markup (migrations[7])
    const pd001 = window.productsData.find((p) => p.id === 'pd001');
    expect(pd001.price).toBeCloseTo(window.calculateProductCost('pd001') * 1.35);
    expect(pd001.name).not.toBe('Frozen Old Name');
    expect(window.researchData.currentLevel).toBe(2);
    expect(window.brandReputation.reputationScore).toBe(21);
    expect(window.gameState.lastSimulationTime).toBe(0);
    expect(window.company.name).toBe('Old Pharmacy');
  });

  test('a v2 save loses its duplicate fill tasks and labels check-in and checkout', () => {
    playABit();
    const v2 = asV9(window.saveFile.serialize());
    v2.version = 2;
    const task = (id, type, customerId) => ({ id, type, customerId, status: 'pending', progress: 0, totalTime: 3 });
    v2.tasks = [
      task('checkin-cust-1', 'customerInteraction', 'cust-1'),
      task('checkout-cust-2-1700000000000', 'customerInteraction', 'cust-2'),
      { ...task('fill-pres-1', 'fillPrescription', 'cust-1'), status: 'inProgress', assignedTo: 'emp1' },
      task('fill-pres-1', 'fillPrescription', 'cust-1'), // the H1 duplicate
    ];

    const save = window.saveFile.migrate(v2);
    expect(save.version).toBe(window.saveFile.version);
    const tasks = save.locations[0].tasks;
    expect(tasks.map((t) => [t.id, t.interaction])).toEqual([
      ['checkin-cust-1', 'checkIn'],
      ['checkout-cust-2-1700000000000', 'checkout'],
      ['fill-pres-1', undefined],
    ]);
    expect(tasks[2].status).toBe('inProgress');
  });

  test('a v3 save puts compounds under way back in the queue, since they hold no materials', () => {
    playABit();
    const v3 = asV9(window.saveFile.serialize());
    v3.version = 3;
    v3.employeesData.push({
      ...v3.employeesData[0],
      id: 'emp2',
      role: 'Lab Technician',
      currentTaskId: 'compound-pres-1',
    });
    v3.tasks.push({
      id: 'compound-pres-1',
      type: 'compound',
      status: 'inProgress',
      progress: 4,
      totalTime: 15,
      productId: 'pd001',
      prescriptionId: 'pres-1',
      quantityToMake: 1,
      assignedTo: 'emp2',
    });

    const save = window.saveFile.migrate(v3);

    expect(save.version).toBe(window.saveFile.version);
    const [location] = save.locations;
    expect(location.tasks.find((t) => t.id === 'compound-pres-1')).toMatchObject({
      status: 'pending',
      assignedTo: null,
      progress: 4,
    });
    expect(location.tasks.find((t) => t.id === 'checkin-cust-1')).toMatchObject({ status: 'inProgress' });
    expect(location.employees.map((e) => e.currentTaskId)).toEqual(['checkin-cust-1', null]);
  });

  test('loading gives customers whatever tasks their status needs', () => {
    playABit();
    const save = throughDisk(window.saveFile.serialize());
    loadModules();
    window.saveFile.apply(save);
    expect(window.customers.reconcileTasks).toHaveBeenCalledTimes(1);
  });

  test("a mid-hour save keeps the hour's customers who haven't arrived yet, not the session's", () => {
    playABit();
    const now = window.gameState.currentDate.getTime();
    window.gameState.customerArrivals = [now + 60000, now + 20 * 60000];
    const save = throughDisk(window.saveFile.serialize());
    loadModules();
    window.gameState.customerArrivals = [now + 5000];
    window.saveFile.apply(save);
    expect(window.gameState.customerArrivals).toEqual([now + 60000, now + 20 * 60000]);
  });

  test('rejects something that is not a save, or a save from a newer game', () => {
    expect(() => window.saveFile.migrate(null)).toThrow('Not a save file');
    expect(() => window.saveFile.migrate({ foo: 1 })).toThrow('Not a save file');

    const future = throughDisk(window.saveFile.serialize());
    future.version = window.saveFile.version + 1;
    expect(() => window.saveFile.migrate(future)).toThrow('newer');
  });
});

describe('ids (M9)', () => {
  test('come from one counter, so ids made in the same millisecond differ', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const ids = Array.from({ length: 5 }, () => window.nextId('emp'));
    expect(new Set(ids).size).toBe(5);
    expect(ids[0]).toBe('emp-1');
  });

  test('the counter is saved with the game, and carries on after a load', () => {
    window.nextId('cust');
    window.nextId('cust');
    const save = throughDisk(window.saveFile.serialize());
    expect(save.gameState.nextId).toBe(3);

    loadModules();
    window.saveFile.apply(save);
    expect(window.nextId('cust')).toBe('cust-3');
  });

  test('a save from before the counter starts it at 1', () => {
    const save = throughDisk(window.saveFile.serialize());
    delete save.gameState.nextId;
    window.saveFile.apply(save);
    expect(window.nextId('pres')).toBe('pres-1');
  });
});

describe('v4 saves (Phase 7: the research tree is levels 0-4)', () => {
  function v4Save({ level, target }) {
    const save = asV9(window.saveFile.serialize());
    save.version = 4;
    save.research = {
      currentLevel: level,
      inProgress: target ? { targetLevel: target, startDayIndex: 1, daysRequired: 20 } : null,
    };
    // An item v4 had that no product used
    save.equipment.push({ id: 'eq022', owned: 2, durability: 50 });
    return save;
  }

  test('a level past the last one keeps everything there is', () => {
    const save = window.saveFile.migrate(v4Save({ level: 7 }));
    expect(save.version).toBe(window.saveFile.version);
    expect(save.company.research).toEqual({ currentLevel: 4, inProgress: null });
  });

  test('research under way toward a level that no longer exists is cancelled and refunded', () => {
    const cash = window.financesData.cash;
    window.saveFile.apply(v4Save({ level: 4, target: 5 }));
    expect(window.researchData).toMatchObject({ currentLevel: 4, inProgress: null });
    expect(window.financesData.cash).toBe(cash + 25000); // v4 charged 5000 x level
    expect(window.financesData.transactions[0]).toMatchObject({ type: 'income', amount: 25000 });
  });

  test('research toward a level that still exists carries on', () => {
    const cash = window.financesData.cash;
    window.saveFile.apply(v4Save({ level: 2, target: 3 }));
    expect(window.researchData.inProgress).toMatchObject({ targetLevel: 3 });
    expect(window.financesData.cash).toBe(cash);
  });

  test('equipment that was removed is dropped', () => {
    window.saveFile.apply(v4Save({ level: 0 }));
    expect(window.equipmentData.find((e) => e.id === 'eq022')).toBeUndefined();
    expect(window.equipmentData.map((e) => e.id)).toContain('eq001');
  });

  test('hours worked today are saved with the staff', () => {
    playABit();
    window.employeesData[0].minutesWorkedToday = 123;
    const save = throughDisk(window.saveFile.serialize());
    loadModules();
    window.saveFile.apply(save);
    expect(window.employeesData[0].minutesWorkedToday).toBe(123);
  });
});

describe('v5 saves and the history (Phase 8)', () => {
  test('a v5 save gets an empty history, no loan, an interest bucket and no goals', () => {
    playABit();
    const save = asV9(window.saveFile.serialize());
    save.version = 5;
    delete save.records;
    delete save.financesData.loanBalance;
    delete save.financesData.expenseCategories.interest;
    delete save.gameState.daysInRed;
    delete save.gameState.goalsReached;

    const upgraded = window.saveFile.migrate(throughDisk(save));
    expect(upgraded.version).toBe(window.saveFile.version);
    expect(upgraded.company.records).toEqual({ days: [], pruned: {} });
    expect(upgraded.locations[0].visits).toEqual([]);
    expect(upgraded.company.finances.loanBalance).toBe(0);
    expect(upgraded.company.finances.expenseCategories.interest).toBe(0);
    expect(upgraded.gameState).toMatchObject({ daysInRed: 0, goalsReached: {} });

    window.saveFile.apply(save);
    expect(window.records.days).toEqual([]);
    expect(window.financesData.cash).toBe(save.financesData.cash);
  });

  test('the day records, the visit log, the loan and the goals survive save and load', () => {
    playABit();
    window.records.days.push({ day: 2, date: 1, revenue: 10, costs: 5, net: 5, customers: { served: 3 } });
    window.records.visits.push({ id: 'cust-9', name: 'Bo Chen', reason: 'served', price: 40 });
    window.financesData.loanBalance = 20000;
    window.gameState.daysInRed = 1;
    window.gameState.goalsReached = { week: 2 };
    const save = throughDisk(window.saveFile.serialize());

    loadModules();
    window.saveFile.apply(save);
    expect(window.records.days[0]).toMatchObject({ day: 2, net: 5, customers: { served: 3 } });
    expect(window.records.visits[0]).toMatchObject({ id: 'cust-9', price: 40 });
    expect(window.financesData.loanBalance).toBe(20000);
    expect(window.gameState).toMatchObject({ daysInRed: 1, goalsReached: { week: 2 } });
  });
});

describe('v6 saves (difficulty removed: every game plays at Normal)', () => {
  function v6Save({ difficulty, location, overhead }) {
    playABit();
    const save = asV9(window.saveFile.serialize());
    save.version = 6;
    save.gameState.difficulty = difficulty;
    save.gameState.location = location;
    save.financesData.overhead = overhead;
    save.settings = {
      ...save.settings,
      customerFrequencyMultiplier: 2,
      operatingCostMultiplier: 0.5,
      baseOverhead: 3900,
    };
    return save;
  }

  test('the difficulty and multipliers are dropped', () => {
    const save = window.saveFile.migrate(v6Save({ difficulty: 'hard', location: 'urban', overhead: 1950 }));
    expect(save.version).toBe(window.saveFile.version);
    expect(save.gameState.difficulty).toBeUndefined();
    expect(save.settings).toEqual({ gameSpeed: 2, globalMarkup: 1.5 });
    // and the flat overhead gives way to the city's default property (v10)
    expect(save.company.finances.overhead).toBeUndefined();
    expect(save.locations[0].lease.listingId).toBe('market-street');
  });

  test('cash and reputation are kept', () => {
    const v6 = v6Save({ difficulty: 'expert', location: 'suburban', overhead: 4800 });
    loadModules();
    window.saveFile.apply(v6);
    expect(window.financesData.cash).toBe(v6.financesData.cash);
    expect(window.brandReputation.reputationScore).toBe(33);
  });
});

describe('v7 saves (balance pass: materials a quarter of the price)', () => {
  function v7Save() {
    playABit();
    const save = asV9(window.saveFile.serialize());
    save.version = 7;
    save.gameState.location = 'rural';
    save.financesData.overhead = 2100; // the old rural rent
    save.settings.globalMarkup = 1.5;
    save.products.find((p) => p.id === 'pd001').price = 400; // at the old costs
    save.products.push({ id: 'pd-removed', price: 1, inventory: 1, maxInventory: 1 });
    return save;
  }

  test("prices go back to the player's markup on today's costs", () => {
    const save = window.saveFile.migrate(v7Save());
    expect(save.version).toBe(window.saveFile.version);
    const products = save.locations[0].products;
    const price = (id) => products.find((p) => p.id === id).price;
    expect(price('pd001')).toBeCloseTo(window.calculateProductCost('pd001') * 1.5);
    expect(price('pd002')).toBeCloseTo(window.calculateProductCost('pd002') * 1.5);
    expect(price('pd-removed')).toBe(1); // left alone; apply() drops it
    expect(save.locations[0].lease.listingId).toBe('cedar-falls');
  });

  test('cash, salaries and the claims owed are kept', () => {
    const v7 = v7Save();
    loadModules();
    window.saveFile.apply(v7);
    expect(window.financesData.cash).toBe(v7.financesData.cash);
    expect(window.employeesData.map((e) => e.salary)).toEqual(v7.employeesData.map((e) => e.salary));
    expect(window.insuranceClaims.pendingClaims).toHaveLength(v7.insuranceClaims.pending.length);
  });
});

describe('v8 saves (Phase 9: store controls and overtime)', () => {
  function v8Save() {
    playABit();
    const save = asV9(window.saveFile.serialize());
    save.version = 8;
    delete save.gameState.frontOpen;
    save.employeesData.forEach((emp) => {
      delete emp.minutesWorkedThisWeek;
      delete emp.straightMinutesThisWeek;
      delete emp.noOvertime;
      delete emp.offUntilDay;
    });
    save.settings.gameSpeed = 0.5;
    return save;
  }

  test('the front is open, nobody has weekly hours or is sent home, and 0.5x loads at 1x', () => {
    const v8 = v8Save();
    expect(v8.employeesData.length).toBeGreaterThan(0);
    const save = window.saveFile.migrate(v8);
    expect(save.version).toBe(window.saveFile.version);
    expect(save.gameState.frontOpen).toBe(true);
    save.locations[0].employees.forEach((emp) => {
      expect(emp).toMatchObject({ minutesWorkedThisWeek: 0, straightMinutesThisWeek: 0, noOvertime: false });
      expect(emp.offUntilDay).toBeUndefined();
    });
    expect(save.settings.gameSpeed).toBe(1);

    loadModules();
    window.saveFile.apply(v8Save());
    expect(window.gameState.frontOpen).toBe(true);
    expect(window.getGameSpeed()).toBe(1);
  });

  test('a current save keeps the front, the weekly hours and who is sent home', () => {
    playABit();
    window.gameState.frontOpen = false;
    window.gameState.frontClosedAt = window.gameState.currentDate.getTime();
    Object.assign(window.employeesData[0], {
      minutesWorkedThisWeek: 1200,
      straightMinutesThisWeek: 1100,
      offUntilDay: 4,
      noOvertime: true,
    });
    const save = throughDisk(window.saveFile.serialize());
    loadModules();
    window.saveFile.apply(save);
    expect(window.gameState).toMatchObject({ frontOpen: false, frontClosedAt: save.gameState.frontClosedAt });
    expect(window.employeesData[0]).toMatchObject({
      minutesWorkedThisWeek: 1200,
      straightMinutesThisWeek: 1100,
      offUntilDay: 4,
      noOvertime: true,
    });
  });
});

describe('v9 saves (Phase 10: the company and its locations)', () => {
  function v9Save({ location = 'suburban' } = {}) {
    playABit();
    const save = asV9(window.saveFile.serialize());
    save.gameState.location = location;
    save.gameState.dayIndex = 40;
    save.gameState.currentDate = new Date(2023, 1, 10, 15, 30).toISOString();
    save.gameState.goalsReached = { week: 6, served500: 30 };
    save.gameState.wonOnDay = 35;
    save.timestamp = 1_700_000_000_000;
    save.financesData.loanBalance = 10000;
    save.financesData.transactions.push(
      {
        id: 't-loan',
        date: '2023-02-01T12:00:00.000Z',
        type: 'income',
        category: 'loan',
        amount: 10000,
        description: 'Bank loan',
      },
      {
        id: 't-int',
        date: '2023-02-01T23:00:00.000Z',
        type: 'expense',
        category: 'interest',
        amount: 10,
        description: 'Loan interest',
      },
    );
    return save;
  }

  test("becomes a company with one location: the area's default property, on a 3-year lease from day 0", () => {
    const save = window.saveFile.migrate(v9Save({ location: 'urban' }));
    expect(save.version).toBe(10);
    expect(save.company.name).toBe('Test Pharmacy');
    expect(save.company.reputation).toBe(33);
    expect(save.locations).toHaveLength(1);
    const [location] = save.locations;
    const listing = window.properties.find('market-street');
    expect(location).toMatchObject({
      id: 'loc-1',
      businessType: 'retail',
      area: 'urban',
      address: listing.address,
      footTraffic: listing.footTraffic,
      competitors: listing.competitors,
      openedOnDay: 0,
    });
    expect(location.building).toEqual(listing.building);
    // Opened 40 days before Feb 10: Jan 1, 07:00; no deposit was ever paid
    expect(location.lease).toMatchObject({
      termYears: 3,
      monthlyRent: window.properties.monthlyRent(listing, 3),
      deposit: 0,
    });
    expect(new Date(location.lease.start)).toEqual(new Date(2023, 0, 1, 7, 0));
    expect(new Date(location.lease.end)).toEqual(new Date(2026, 0, 1, 7, 0));
    expect(location.employees.map((e) => e.id)).toEqual(['emp1']);
    expect(location.customers.map((c) => c.id)).toEqual(['cust-1', 'cust-2']);
  });

  test('the flat overhead gives way to rent and utilities; no startup loan; entries get their location', () => {
    const save = window.saveFile.migrate(v9Save());
    const finances = save.company.finances;
    expect(finances.overhead).toBeUndefined();
    expect(finances.loans).toEqual([]);
    expect(finances.expenseCategories.rent).toBe(0);
    expect(finances.loanBalance).toBe(10000); // the line of credit stays
    const byId = Object.fromEntries(finances.transactions.map((t) => [t.id ?? t.description, t.locationId]));
    expect(byId['t-loan']).toBeNull();
    expect(byId['t-int']).toBeNull();
    expect(finances.transactions.find((t) => t.category === 'copays').locationId).toBe('loc-1');
  });

  test('goals reached carry over; a win under the old, shorter ladder is dropped', () => {
    const save = window.saveFile.migrate(v9Save());
    expect(save.gameState.goalsReached).toEqual({ week: 6, served500: 30 });
    expect(save.gameState.wonOnDay).toBeUndefined();
    expect(save.gameState.location).toBeUndefined();
    expect(save.gameState.pharmacyName).toBeUndefined();
    // Its saves are listed together from now on
    expect(save.gameState.gameId).toBe(`game-${(1_700_000_000_000).toString(36)}`);
    expect(save.notifications).toEqual({ items: [], unreadCount: 0, nextId: 1 });
    expect(save.company.reports).toEqual([]);
  });

  test('loads into the company, with the globals viewing its one location', () => {
    const v9 = v9Save({ location: 'rural' });
    loadModules();
    window.saveFile.apply(v9);
    expect(window.company.name).toBe('Test Pharmacy');
    expect(window.company.active().lease.listingId).toBe('cedar-falls');
    expect(window.employeesData).toBe(window.company.active().employees);
    expect(window.financesData.loanBalance).toBe(10000);
    expect(window.company.dailyServices(window.company.active())).toBe(
      window.properties.servicesPerDay('rural', window.properties.find('cedar-falls').building.sqft),
    );
  });
});
