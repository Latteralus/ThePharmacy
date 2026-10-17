/**
 * Tests for the save file format (review findings A2, C5): a save holds only
 * player state, round-trips through JSON with every Date revived, restores
 * tasks/customers/claims/settings, keeps custom prices, takes static data
 * from the data files, and upgrades v1 saves.
 */

// What game-integration.js does to a save on its way to disk and back.
function throughDisk(save) {
  return JSON.parse(JSON.stringify(save));
}

function loadModules() {
  jest.resetModules();
  window.gameState = {
    currentDate: new Date(2023, 0, 4, 15, 30),
    dayIndex: 3,
    isDayActive: true,
    isPaused: false,
    pharmacyName: 'Test Pharmacy',
    difficulty: 'normal',
    location: 'suburban',
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

  const tasks = [];
  window.taskManager = { tasks };

  require('../../main/js/ids.js');
  require('../../main/js/data/materials.js');
  require('../../main/js/data/products.js');
  require('../../main/js/data/equipment.js');
  require('../../main/js/data/insurance.js');
  require('../../main/js/data/research.js');
  require('../../main/js/data/finances.js');
  require('../../main/js/insuranceClaims.js');
  require('../../main/js/saveFile.js');

  window.customers = {
    activeCustomers: [],
    getInsuranceByPlanName: (name) => window.insuranceData.find((p) => p.planName === name),
    reconcileTasks: jest.fn(() => 0),
  };
  window.prescriptions = { activePrescriptions: [], refillRegistry: [] };
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
  window.customerFrequencyMultiplier = 1.5;
  window.operatingCostMultiplier = 0.5;
  window.originalOverhead = 500;
  window.globalMarkup = 1.5;
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  loadModules();
});

afterEach(() => {
  jest.restoreAllMocks();
  delete window.customerFrequencyMultiplier;
  delete window.operatingCostMultiplier;
  delete window.originalOverhead;
});

describe('serialize', () => {
  test('writes only player state for static data, and no frame-loop timestamps', () => {
    playABit();
    const save = window.saveFile.serialize();

    expect(save.version).toBe(window.saveFile.version);
    expect(save.gameState.lastSimulationTime).toBeUndefined();
    expect(save.gameState.renderInfo).toBeUndefined();
    expect(save.products.find((p) => p.id === 'pd001')).toEqual({
      id: 'pd001',
      price: 123.45,
      inventory: expect.any(Number),
      maxInventory: expect.any(Number),
    });
    expect(Object.keys(save.equipment[0]).sort()).toEqual(
      ['autoPurchaseAmount', 'autoPurchaseThreshold', 'durability', 'id', 'owned'].sort(),
    );
    expect(save.research).toEqual({ currentLevel: 1, inProgress: null });
    // gameAPI.saveGame sends this over IPC, so it must survive the
    // structured clone algorithm (v8.serialize uses it; jsdom has no
    // structuredClone). A function anywhere in it would throw.
    expect(() => require('v8').serialize(save)).not.toThrow();
  });
});

describe('save -> disk -> load round trip', () => {
  let save;

  beforeEach(() => {
    playABit();
    save = throughDisk(window.saveFile.serialize());
    loadModules(); // a fresh launch
    window.saveFile.apply(save);
  });

  test('restores game state with Dates revived and loop timestamps zeroed', () => {
    expect(window.gameState.currentDate).toEqual(new Date(2023, 0, 4, 15, 30));
    expect(window.gameState.pharmacyName).toBe('Test Pharmacy');
    expect(window.gameState.lastSimulationTime).toBe(0);
    expect(window.gameState.simulationAccumulator).toBe(0);
    expect(window.financesData.transactions[0].date).toBeInstanceOf(Date);
    expect(window.employeesData[0].hireDate).toBeInstanceOf(Date);
  });

  test('restores tasks in place, with employees still pointing at them', () => {
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

  test('equipment keeps its isUnlocked method, reading the loaded research level', () => {
    const levelOne = window.equipmentData.find((e) => e.researchLevelRequired === 1);
    const levelTwo = window.equipmentData.find((e) => e.researchLevelRequired === 2);
    expect(levelOne.isUnlocked()).toBe(true);
    expect(levelTwo.isUnlocked()).toBe(false);
  });

  test('restores speed and the Settings multipliers', () => {
    expect(window.getGameSpeed()).toBe(2);
    expect(window.customerFrequencyMultiplier).toBe(1.5);
    expect(window.operatingCostMultiplier).toBe(0.5);
    expect(window.originalOverhead).toBe(500);
    expect(window.globalMarkup).toBe(1.5);
  });
});

describe('static data comes from the data files', () => {
  test('static fields in a save are ignored, and unknown or missing items are handled', () => {
    const save = throughDisk(window.saveFile.serialize());
    const realName = window.productsData.find((p) => p.id === 'pd001').name;
    Object.assign(
      save.products.find((p) => p.id === 'pd001'),
      { name: 'Old Name', cost: 1, inventory: 9 },
    );
    save.products.push({ id: 'pd-removed', price: 1, inventory: 1, maxInventory: 1 });
    save.products = save.products.filter((p) => p.id !== 'pd002');
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
      gameState: { ...window.gameState, lastSimulationTime: 999999 },
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
    expect(save.tasks).toEqual([]);
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

    const pd001 = window.productsData.find((p) => p.id === 'pd001');
    expect(pd001.price).toBe(77);
    expect(pd001.name).not.toBe('Frozen Old Name');
    expect(window.researchData.currentLevel).toBe(2);
    expect(window.brandReputation.reputationScore).toBe(21);
    expect(typeof window.equipmentData[0].isUnlocked).toBe('function');
    expect(window.gameState.lastSimulationTime).toBe(0);
  });

  test('a v2 save loses its duplicate fill tasks and labels check-in and checkout', () => {
    playABit();
    const v2 = throughDisk(window.saveFile.serialize());
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
    expect(save.tasks.map((t) => [t.id, t.interaction])).toEqual([
      ['checkin-cust-1', 'checkIn'],
      ['checkout-cust-2-1700000000000', 'checkout'],
      ['fill-pres-1', undefined],
    ]);
    expect(save.tasks[2].status).toBe('inProgress');
  });

  test('a v3 save puts compounds under way back in the queue, since they hold no materials', () => {
    playABit();
    const v3 = throughDisk(window.saveFile.serialize());
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
    expect(save.tasks.find((t) => t.id === 'compound-pres-1')).toMatchObject({
      status: 'pending',
      assignedTo: null,
      progress: 4,
    });
    expect(save.tasks.find((t) => t.id === 'checkin-cust-1')).toMatchObject({ status: 'inProgress' });
    expect(save.employeesData.map((e) => e.currentTaskId)).toEqual(['checkin-cust-1', null]);
  });

  test('loading gives customers whatever tasks their status needs', () => {
    playABit();
    const save = throughDisk(window.saveFile.serialize());
    loadModules();
    window.saveFile.apply(save);
    expect(window.customers.reconcileTasks).toHaveBeenCalledTimes(1);
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
