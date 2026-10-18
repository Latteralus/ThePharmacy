/**
 * Tests for the render side (review findings A1 and A5): systems announce
 * changes with window.updateUI(topic), pages subscribe through the
 * PageScope showPage hands them, and leaving a page drops its
 * subscriptions. No page runs a timer. Also M13 (inventory refreshes), M15
 * (Operations lists empty after navigating back) and M16 (interval leaks).
 * Phase 6 (findings section 9): the UI kit, the top bar's pause/speed and
 * hotkeys, the modals, and every page built from tables and meters.
 */

function loadUi() {
  jest.resetModules();
  document.head.innerHTML = '';
  document.body.innerHTML = '<div id="root"><div class="main-content"></div></div>';
  window.gameState = {
    currentDate: new Date(2023, 0, 2, 9, 0, 0, 0),
    dayIndex: 1,
    isDayActive: true,
    isPaused: false,
  };
  require('../../main/js/clock.js');
  require('../../main/js/ui.js');
  require('../../main/components/kit.js');
}

function main() {
  return document.querySelector('.main-content');
}

function text() {
  return main().textContent;
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('change announcements', () => {
  beforeEach(loadUi);

  test('are batched: a handler runs once per flush, however often and on however many topics', () => {
    const fn = jest.fn();
    window.ui.subscribe('tasks', fn);
    window.ui.subscribe('customers', fn);

    window.updateUI('tasks');
    window.updateUI('tasks');
    window.updateUI('customers');
    expect(fn).not.toHaveBeenCalled();

    window.ui.flush();
    expect(fn).toHaveBeenCalledTimes(1);

    window.ui.flush();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('only reach subscribers of that topic, and stop when unsubscribed', () => {
    const tasks = jest.fn();
    const customers = jest.fn();
    const unsubscribe = window.ui.subscribe('tasks', tasks);
    window.ui.subscribe('customers', customers);

    window.updateUI('tasks');
    window.ui.flush();
    expect(tasks).toHaveBeenCalledTimes(1);
    expect(customers).not.toHaveBeenCalled();

    unsubscribe();
    window.updateUI('tasks');
    window.ui.flush();
    expect(tasks).toHaveBeenCalledTimes(1);
  });

  test('a failing handler does not stop the others', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const after = jest.fn();
    window.ui.subscribe('tasks', () => {
      throw new Error('boom');
    });
    window.ui.subscribe('tasks', after);

    window.updateUI('tasks');
    window.ui.flush();
    expect(after).toHaveBeenCalled();
  });

  test('finances and time redraw the top bar with formatted money and the clock', () => {
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<span id="currentCash"></span><span id="dailyIncome"></span><span id="pendingInsurance"></span><span id="gameTime"></span><span id="gameDay"></span>',
    );
    window.financesData = { cash: 1234.5, dailyIncome: 10, pendingInsuranceIncome: 2 };

    window.updateUI('finances');
    window.ui.updateTime();
    window.ui.flush();

    expect(document.getElementById('currentCash').textContent).toBe('$1,234.50');
    expect(document.getElementById('dailyIncome').textContent).toBe('$10.00');
    expect(document.getElementById('pendingInsurance').textContent).toBe('$2.00');
    expect(document.getElementById('gameTime').textContent).toBe('09:00');
    expect(document.getElementById('gameDay').textContent).toBe('Day 2 · Mon, Jan 2');
  });

  test('a top bar element that is replaced is found again', () => {
    window.financesData = { cash: 1, dailyIncome: 0, pendingInsuranceIncome: 0 };
    document.body.insertAdjacentHTML('afterbegin', '<span id="currentCash"></span>');
    window.updateUI('finances');
    window.ui.flush();

    document.getElementById('currentCash').remove();
    document.body.insertAdjacentHTML('afterbegin', '<span id="currentCash"></span>');
    window.financesData.cash = 2;
    window.updateUI('finances');
    window.ui.flush();

    expect(document.getElementById('currentCash').textContent).toBe('$2.00');
  });
});

describe('page lifecycle', () => {
  beforeEach(loadUi);

  test('leaving a page drops its subscriptions and runs its onLeave cleanups', () => {
    const refresh = jest.fn();
    const leave = jest.fn();
    window.renderAlphaPage = (container, page) => {
      container.textContent = 'alpha';
      page.on('tasks', refresh);
      page.onLeave(leave);
    };
    window.renderBetaPage = (container) => {
      container.textContent = 'beta';
    };

    window.showPage('alpha');
    window.updateUI('tasks');
    window.ui.flush();
    expect(refresh).toHaveBeenCalledTimes(1);

    window.showPage('beta');
    expect(leave).toHaveBeenCalledTimes(1);
    expect(window.currentPage).toBe('beta');
    expect(text()).toBe('beta');

    window.updateUI('tasks');
    window.ui.flush();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test('a handler that navigates away stops the old page hearing the rest of that frame', () => {
    const later = jest.fn();
    window.renderAlphaPage = (container, page) => {
      page.on('tasks', () => window.showPage('beta'));
      page.on('customers', later);
    };
    window.renderBetaPage = () => {};

    window.showPage('alpha');
    window.updateUI('tasks');
    window.updateUI('customers');
    window.ui.flush();

    expect(window.currentPage).toBe('beta');
    expect(later).not.toHaveBeenCalled();
  });

  test('an unknown page shows a message instead of throwing', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    window.showPage('nowhere');
    expect(text()).toContain('does not exist');
  });

  test('a new page starts at the top, not at the last page scroll position (U3)', () => {
    window.renderAlphaPage = (container) => {
      container.textContent = 'alpha';
    };
    window.renderBetaPage = (container) => {
      container.textContent = 'beta';
    };
    window.showPage('alpha');
    main().scrollTop = 500;
    window.showPage('beta');
    expect(main().scrollTop).toBe(0);
  });
});

describe('the UI kit (U5, 9.1)', () => {
  beforeEach(loadUi);

  test('formats money, counts, percentages and game durations one way everywhere', () => {
    expect(window.fmt.money(101905.654)).toBe('$101,905.65');
    expect(window.fmt.money(-1089.04)).toBe('-$1,089.04');
    expect(window.fmt.money(-0.001)).toBe('$0.00');
    expect(window.fmt.moneyWhole(15000)).toBe('$15,000');
    expect(window.fmt.int(49500)).toBe('49,500');
    expect(window.fmt.pct(0.25)).toBe('25%');
    expect(window.fmt.signedPct(0.12)).toBe('+12%');
    expect(window.fmt.signedPct(-0.05)).toBe('−5%');
    expect(window.fmt.duration(12.4)).toBe('12m');
    expect(window.fmt.duration(65)).toBe('1h 05m');
    expect(window.fmt.clock(new Date(2023, 0, 2, 9, 5))).toBe('09:05');
  });

  test('puts internal states in the player words, never raw ids or camelCase', () => {
    const { words } = window;
    expect(words.customerStage('waitingForFill').label).toBe('Waiting for prescription');
    expect(words.taskLabel({ type: 'customerInteraction', interaction: 'checkout' })).toBe('Checkout');
    expect(words.taskLabel({ type: 'customerInteraction', interaction: 'checkIn' })).toBe('Check-in');
    expect(words.taskLabel({ type: 'compound', productName: 'Aspirin', quantityToMake: 5 })).toBe('Restock Aspirin ×5');
    expect(words.taskLabel({ type: 'compound', productName: 'Aspirin', prescriptionId: 'p', quantityNeeded: 2 })).toBe(
      'Compound Aspirin ×2',
    );
    expect(words.taskStatus('pending-dependent')).toBe('Waiting on compound');
    expect(words.mood(9).label).toBe('Happy');
    expect(words.mood(2).tone).toBe('critical');
  });

  test('meters clamp and carry their tone', () => {
    const meter = window.kit.meter(1.7, 'warn');
    expect(meter.className).toBe('meter warn');
    expect(meter.firstChild.style.width).toBe('100%');
    window.kit.setMeter(meter, -1, 'good');
    expect(meter.firstChild.style.width).toBe('0%');
    expect(meter.className).toBe('meter good');
  });

  test('tables right-align number columns and show an empty message', () => {
    const table = window.kit.table([{ label: 'Name' }, { label: 'Cash', num: true }]);
    table.row(['A', '$1.00']);
    expect(table.root.querySelector('th.num').textContent).toBe('Cash');
    expect(table.root.querySelector('td.num').textContent).toBe('$1.00');
    table.clear();
    table.empty('Nothing here');
    expect(table.root.querySelector('td').colSpan).toBe(2);
    expect(table.root.textContent).toContain('Nothing here');
  });

  test('toasts need no timer: they go when their fade-out animation ends, or on close', () => {
    const setTimeout = jest.spyOn(global, 'setTimeout');
    const first = window.toast('Saved', 'success');
    expect(document.querySelector('.toast-stack').textContent).toContain('Saved');
    first.dispatchEvent(new Event('animationend'));
    expect(first.isConnected).toBe(false);

    const second = window.toast('Oops', 'error');
    second.querySelector('.toast-close').click();
    expect(second.isConnected).toBe(false);
    expect(setTimeout).not.toHaveBeenCalled();
  });
});

describe('modals (U19-U21)', () => {
  beforeEach(() => {
    loadUi();
    require('../../main/modals/modal.js');
  });

  test('the confirm prompt runs the action only on confirm; Esc and Cancel do nothing', () => {
    const onConfirm = jest.fn();
    window.showConfirmModal('Terminate Ada?', 'Terminate', onConfirm, { danger: true });
    expect(document.querySelector('.confirm-modal')).not.toBeNull();
    // Only one at a time
    window.showConfirmModal('Again?', 'Yes', onConfirm);
    expect(document.querySelectorAll('.confirm-modal')).toHaveLength(1);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.querySelector('.confirm-modal')).toBeNull();

    window.showConfirmModal('Terminate Ada?', 'Terminate', onConfirm);
    [...document.querySelectorAll('.confirm-modal button')].find((b) => b.textContent === 'Cancel').click();
    expect(onConfirm).not.toHaveBeenCalled();

    window.showConfirmModal('Terminate Ada?', 'Terminate', onConfirm);
    [...document.querySelectorAll('.confirm-modal button')].find((b) => b.textContent === 'Terminate').click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('the daily summary shows the P&L and who was served and lost', () => {
    window.financesData = {
      cash: 104340.59,
      revenue: { today: 5429.63 },
      expenses: { today: 1089.04 },
      profit: { today: 4340.59 },
    };
    window.gameState.customersToday = { served: 8, closing: 6 };
    const next = jest.fn();
    window.showDailySummaryModal(next);

    const modal = document.querySelector('.daily-summary');
    expect(modal.textContent).toContain('$5,429.63');
    expect(modal.textContent).toContain('$4,340.59');
    expect(modal.textContent).toContain('8 served');
    expect(modal.textContent).toContain('6 lost');
    expect(modal.textContent).toContain('Still waiting at closing 6');

    // Esc doesn't skip it
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.querySelector('.daily-summary')).not.toBeNull();

    [...modal.querySelectorAll('button')].find((b) => b.textContent === 'Start next day').click();
    expect(next).toHaveBeenCalled();
    expect(document.querySelector('.daily-summary')).toBeNull();
  });
});

describe('the Operations page', () => {
  let customer;

  beforeEach(() => {
    loadUi();
    customer = {
      id: 'cust-1',
      type: 'regular',
      firstName: 'Ada',
      lastName: 'Lovelace',
      status: 'waitingForCheckIn',
      arrivedAt: window.gameState.currentDate.getTime(),
      patience: 90,
      mood: 7,
      prescriptionId: 'pres-1',
    };
    window.employeesData = [];
    window.taskManager = {
      tasks: [],
      getTaskById: (id) => window.taskManager.tasks.find((t) => t.id === id),
    };
    window.customers = {
      activeCustomers: [],
      customerTypes: { regular: { patience: 180 } },
      getCustomerById: (id) => window.customers.activeCustomers.find((c) => c.id === id),
    };
    window.prescriptions = { activePrescriptions: [] };
    window.getGameSpeed = () => 1;
    require('../../main/js/taskbars.js');
    require('../../main/js/pages/operationsPage.js');
    require('../../main/js/pages/settingsPage.js');
  });

  test('shows a new customer once customers are announced, in player words, with no timer', () => {
    const setInterval = jest.spyOn(global, 'setInterval');
    const setTimeout = jest.spyOn(global, 'setTimeout');

    window.showPage('operations');
    expect(text()).toContain('No customers currently.');

    window.customers.activeCustomers.push(customer);
    window.updateUI('customers');
    window.ui.flush();
    expect(text()).toContain('Ada Lovelace');
    expect(text()).toContain('Waiting for check-in');

    customer.status = 'readyForCheckout';
    window.updateUI('customers');
    window.ui.flush();
    expect(text()).toContain('Ready to pay');
    expect(text()).not.toContain('readyForCheckout');

    expect(setInterval).not.toHaveBeenCalled();
    expect(setTimeout).not.toHaveBeenCalled();
  });

  test('shows patience and mood, and follows patience with the clock (U10)', () => {
    window.customers.activeCustomers.push(customer);
    window.showPage('operations');
    const row = main().querySelector('.customer-item');
    expect(row.textContent).toContain('1h 30m');
    expect(row.textContent).toContain('7 · Content');
    expect(row.querySelector('.meter').className).toBe('meter warn'); // 90 of 180 minutes

    customer.patience = 30;
    window.gameState.currentDate = new Date(window.gameState.currentDate.getTime() + 25 * 60000);
    window.ui.updateTime();
    window.ui.flush();
    expect(row.textContent).toContain('30m');
    expect(row.textContent).toContain('25m'); // waiting
    expect(row.querySelector('.meter').className).toBe('meter critical');
  });

  test('lists customers and their prescriptions again after navigating away and back (M15)', () => {
    window.customers.activeCustomers.push(customer);
    window.prescriptions.activePrescriptions.push({
      id: 'pres-1',
      customerId: 'cust-1',
      productName: 'Aspirin',
      status: 'pending',
      dosage: 1,
    });

    window.showPage('operations');
    window.showPage('settings');
    window.showPage('operations');

    expect(text()).toContain('Ada Lovelace');
    expect(text()).toContain('Aspirin ×1');
    expect(text()).toContain('Being prepared');
    expect(text()).not.toContain('pres-1');
  });

  test("doesn't redraw once the player has left it (M16)", () => {
    window.showPage('operations');
    window.showPage('settings');

    window.customers.activeCustomers.push(customer);
    window.updateUI('customers');
    window.ui.flush();

    expect(text()).not.toContain('Ada Lovelace');
  });

  test('puts customer work ahead of restocks and folds queued restocks into one line (U8, U9)', () => {
    window.customers.activeCustomers.push(customer);
    window.showPage('operations');
    window.taskManager.tasks.push(
      {
        id: 'compound-pd1',
        type: 'compound',
        status: 'pending',
        productName: 'Metformin',
        quantityToMake: 5,
        totalTime: 5,
      },
      {
        id: 'compound-pd2',
        type: 'compound',
        status: 'pending',
        productName: 'Omeprazole',
        quantityToMake: 5,
        totalTime: 5,
      },
      { id: 'consult-cust-1', type: 'consultation', status: 'pending', customerId: 'cust-1', totalTime: 5 },
    );
    window.updateUI('tasks');
    window.ui.flush();

    const rows = [...main().querySelectorAll('.task-entry')].map((r) => r.textContent);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain('Consultation');
    expect(rows[0]).toContain('Ada Lovelace');
    expect(text()).toContain('2 queued: Metformin, Omeprazole');
    expect(text()).not.toContain('consult-cust-1');

    [...main().querySelectorAll('button')].find((b) => b.textContent === 'Show all restocks').click();
    expect(main().querySelectorAll('.task-entry')).toHaveLength(3);
    expect(text()).toContain('Restock Metformin ×5');
  });
});

describe('the top bar (U1, U2)', () => {
  beforeEach(() => {
    loadUi();
    window.financesData = { cash: 101905.65, dailyIncome: 1905.65, pendingInsuranceIncome: 1295 };
    window.gameState.pharmacyName = 'Barnett Family Pharmacy';
    let speed = 1;
    window.getGameSpeed = () => speed;
    window.setGameSpeed = jest.fn((s) => {
      speed = s;
    });
    window.toggleGamePause = jest.fn(() => {
      window.gameState.isPaused = !window.gameState.isPaused;
    });
    require('../../main/components/topBar.js');
    document.body.prepend(window.renderTopBar());
    window.ui.flush();
  });

  test('names the pharmacy and labels its money', () => {
    const bar = document.querySelector('.top-bar');
    expect(bar.textContent).toContain('Barnett Family Pharmacy');
    expect(bar.textContent).toContain('Cash');
    expect(document.getElementById('currentCash').textContent).toBe('$101,905.65');
    expect(document.getElementById('storeStatus').textContent).toBe('Open');
  });

  test('pauses and changes speed from the bar and from Space and 1-4', () => {
    document.getElementById('pauseButton').click();
    expect(window.gameState.isPaused).toBe(true);
    window.ui.flush();
    expect(document.getElementById('pauseButton').textContent).toContain('Resume');

    document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
    expect(window.gameState.isPaused).toBe(false);

    document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit4', bubbles: true }));
    expect(window.setGameSpeed).toHaveBeenLastCalledWith(5);
    window.ui.flush();
    expect(document.querySelector('#speedControl button.active').textContent).toBe('5×');

    [...document.querySelectorAll('#speedControl button')].find((b) => b.textContent === '0.5×').click();
    expect(window.setGameSpeed).toHaveBeenLastCalledWith(0.5);
  });

  test('hotkeys are ignored while typing and while a dialog is open', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
    expect(window.toggleGamePause).not.toHaveBeenCalled();

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    document.body.appendChild(backdrop);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2', bubbles: true }));
    expect(window.setGameSpeed).not.toHaveBeenCalled();
  });
});

describe('the Settings page', () => {
  beforeEach(() => {
    loadUi();
    window.getGameSpeed = () => 1;
    window.toggleGamePause = () => {
      window.gameState.isPaused = !window.gameState.isPaused;
    };
    require('../../main/js/pages/settingsPage.js');
    window.renderBlankPage = () => {};
  });

  test('labels every control (U18)', () => {
    window.showPage('settings');
    ['Current time', 'Game', 'Speed', 'Customer frequency', 'Operating costs'].forEach((label) =>
      expect([...main().querySelectorAll('.settings-grid .label')].map((l) => l.textContent)).toContain(label),
    );
  });

  test('keeps the time and pause status current from time announcements, with no interval', () => {
    const setInterval = jest.spyOn(global, 'setInterval');
    window.showPage('settings');
    const time = document.getElementById('current-time-display');
    const pause = document.getElementById('pause-status-indicator');

    window.gameState.currentDate = new Date(2023, 0, 2, 10, 30);
    window.gameState.isPaused = true;
    window.ui.updateTime();
    window.ui.flush();

    expect(time.textContent).toBe('Mon, Jan 2 · 10:30');
    expect(pause.textContent).toContain('Paused');
    expect(setInterval).not.toHaveBeenCalled();

    // Gone once the player leaves
    window.showPage('blank');
    window.gameState.currentDate = new Date(2023, 0, 2, 11, 0);
    window.ui.updateTime();
    window.ui.flush();
    expect(time.textContent).toBe('Mon, Jan 2 · 10:30');
  });
});

describe('stock and equipment pages', () => {
  beforeEach(() => {
    loadUi();
    window.updateUI = jest.fn((topic) => window.ui.updateUI(topic));
    require('../../main/js/ids.js');
    require('../../main/js/data/materials.js');
    require('../../main/js/data/products.js');
    require('../../main/js/data/equipment.js');
    require('../../main/js/data/research.js');
    require('../../main/js/data/helpers.js');
    require('../../main/js/data/finances.js');
    window.globalMarkup = window.globalMarkup || 1.35;
    window.financesData.cash = 100000;
    window.taskAssignment = { requestAutoAssign: jest.fn() };
    require('../../main/js/pages/inventoryPage.js');
    require('../../main/js/pages/marketplacePage.js');
    require('../../main/js/pages/equipmentPage.js');
  });

  function row(name, selector) {
    return [...main().querySelectorAll(selector)].find((c) => c.textContent.includes(name));
  }

  function setInput(input, value, event = 'change') {
    input.value = String(value);
    input.dispatchEvent(new Event(event));
  }

  test('Inventory updates stock and price in place, keeping what the player is typing (M13)', () => {
    const product = window.productsData[0];
    product.inventory = 3;
    product.maxInventory = 5;
    window.showPage('inventory');

    const productRow = main().querySelector(`.product-row[data-product-id="${product.id}"]`);
    const priceInput = productRow.querySelector(`input[aria-label="Price for ${product.name}"]`);
    priceInput.focus();
    priceInput.value = '99.99';

    product.inventory = 7;
    window.finances.updateProductPrice(product.id, 12.5);
    window.ui.flush();

    expect(productRow.isConnected).toBe(true);
    expect(productRow.textContent).toContain('7 / 5');
    expect(priceInput.value).toBe('99.99');

    // Once the player leaves the field, outside changes show again
    priceInput.blur();
    product.price = 14;
    window.updateUI('inventory');
    window.ui.flush();
    expect(priceInput.value).toBe('14.00');
  });

  test('Inventory shows stock against target as a meter, and the price against market', () => {
    const product = window.productsData[0];
    product.inventory = 0;
    product.maxInventory = 5;
    product.price = window.finances.marketPrice(product.id) * 2;
    window.showPage('inventory');
    const productRow = main().querySelector(`.product-row[data-product-id="${product.id}"]`);
    expect(productRow.querySelector('.meter').className).toBe('meter critical');
    expect(productRow.textContent).toContain('+100%');
  });

  test('Inventory sets material auto-order, and refuses negative values (U11)', () => {
    const material = window.materialsData[0];
    window.showPage('inventory');
    [...main().querySelectorAll('.tabs button')].find((b) => b.textContent === 'Raw materials').click();

    const materialRow = main().querySelector(`.material-row[data-material-id="${material.id}"]`);
    setInput(materialRow.querySelector(`input[aria-label="Reorder point for ${material.name}"]`), 200);
    setInput(materialRow.querySelector(`input[aria-label="Reorder amount for ${material.name}"]`), 500);
    expect(material.autoOrderThreshold).toBe(200);
    expect(material.autoOrderAmount).toBe(500);
    expect(materialRow.textContent).toContain('Auto-order on');

    const point = materialRow.querySelector(`input[aria-label="Reorder point for ${material.name}"]`);
    setInput(point, -5);
    expect(material.autoOrderThreshold).toBe(200);
    expect(point.value).toBe('200');

    material.inventory = 4321;
    window.updateUI('inventory');
    window.ui.flush();
    expect(materialRow.textContent).toContain('4,321');
  });

  test('Marketplace updates material stock in place, keeping typed order quantities', () => {
    const material = window.materialsData[0];
    window.showPage('marketplace');
    const materialRow = row(material.name, '.material-row');
    const qtyInput = materialRow.querySelector('input[type="number"]');
    setInput(qtyInput, 5, 'input');

    material.inventory = 2;
    window.updateUI('inventory');
    window.ui.flush();

    expect(materialRow.textContent).toContain(material.name);
    expect(materialRow.cells[2].textContent).toBe('2');
    expect(qtyInput.value).toBe('5');
    expect(main().querySelector('.order-total').textContent).toBe(
      window.fmt.money(window.calculateMaterialCost(material.id, 5)),
    );
  });

  test('Marketplace buys the order and says so in a toast, not an alert', () => {
    const material = window.materialsData[0];
    const before = material.inventory;
    window.showPage('marketplace');
    setInput(row(material.name, '.material-row').querySelector('input'), 10, 'input');
    [...main().querySelectorAll('button')].find((b) => b.textContent === 'Buy materials').click();

    expect(material.inventory).toBe(before + 10);
    expect(document.querySelector('.toast-stack').textContent).toContain('Bought materials');
    expect(main().querySelector('.order-total').textContent).toBe('$0.00');
  });

  test('Equipment updates owned and wear in place, and redraws when research unlocks more', () => {
    window.researchData.currentLevel = 0;
    const unlocked = window.equipmentData.filter((eq) => eq.isUnlocked());
    const eq = unlocked[0];
    window.showPage('equipment');
    const eqRow = row(eq.name, '.equipment-card');
    const buyQty = eqRow.querySelector('.buy-qty-input');
    buyQty.value = '2';

    eq.owned += 1;
    eq.durability = 90;
    window.updateUI('equipment');
    window.ui.flush();

    expect(eqRow.cells[2].textContent).toBe(String(eq.owned));
    expect(eqRow.textContent).toContain('90%');
    expect(buyQty.value).toBe('2');

    window.researchData.currentLevel = 10;
    window.updateUI('equipment');
    window.ui.flush();
    expect(main().querySelectorAll('.equipment-card').length).toBe(
      window.equipmentData.filter((e) => e.isUnlocked()).length,
    );
  });

  test('Equipment auto-purchase settings apply without buying anything (U14)', () => {
    window.researchData.currentLevel = 0;
    const eq = window.equipmentData.find((e) => e.isUnlocked());
    window.showPage('equipment');
    const eqRow = row(eq.name, '.equipment-card');
    setInput(eqRow.querySelector(`input[aria-label="Auto-buy point for ${eq.name}"]`), 2);
    setInput(eqRow.querySelector(`input[aria-label="Auto-buy amount for ${eq.name}"]`), 1);
    expect(eq.autoPurchaseThreshold).toBe(2);
    expect(eq.autoPurchaseAmount).toBe(1);
  });
});

describe('the Employees page (U15)', () => {
  beforeEach(() => {
    loadUi();
    require('../../main/modals/modal.js');
    window.employeesData = [
      {
        id: 'emp-1',
        firstName: 'John',
        lastName: 'Doe',
        role: 'Pharmacist',
        salary: 85000,
        morale: 100,
        skills: { compounding: 70, dispensing: 85, customerService: 75, inventoryManagement: 60, sales: 50 },
        currentTaskId: null,
      },
    ];
    window.taskManager = { tasks: [], getTaskById: () => undefined };
    window.employees = { fireEmployee: jest.fn(), hireEmployee: jest.fn(), hireSelectedEmployee: jest.fn() };
    require('../../main/js/taskbars.js');
    require('../../main/js/pages/employeesPage.js');
  });

  test('shows the daily wage end of day actually charges (salary / 365)', () => {
    window.showPage('employees');
    expect(text()).toContain(window.fmt.money(85000 / 365));
    expect(text()).not.toContain(window.fmt.money(85000 / 30));
  });

  test('keeps the staff tiles current as people are hired', () => {
    window.showPage('employees');
    window.employeesData.push({ ...window.employeesData[0], id: 'emp-2', firstName: 'Alice', salary: 60000 });
    window.updateUI('employees');
    window.ui.flush();
    expect(main().querySelector('.stat-value').textContent).toBe('2');
    expect(text()).toContain(window.fmt.money(145000 / 365));
  });

  test('asks in-game before terminating', () => {
    window.showPage('employees');
    [...main().querySelectorAll('button')].find((b) => b.textContent === 'Terminate').click();
    expect(window.employees.fireEmployee).not.toHaveBeenCalled();
    [...document.querySelectorAll('.confirm-modal button')].find((b) => b.textContent === 'Terminate').click();
    expect(window.employees.fireEmployee).toHaveBeenCalledWith('emp-1');
  });

  test('says the posting fee up front, and lists candidates with all their skills', () => {
    window.showPage('employees');
    expect(text()).toContain('Post job ($500)');
    window.displayEmployeeCandidates([{ ...window.employeesData[0], id: 'c-1', firstName: 'Cara' }]);
    const candidate = main().querySelector('.candidate-card');
    expect(candidate.textContent).toContain('Cara Doe');
    expect(candidate.cells).toHaveLength(8); // name, salary, five skills, hire
  });
});

describe('the Finances and Research pages (U16, U17)', () => {
  beforeEach(() => {
    loadUi();
    require('../../main/js/ids.js');
    require('../../main/js/data/materials.js');
    require('../../main/js/data/products.js');
    require('../../main/js/data/equipment.js');
    require('../../main/js/data/research.js');
    require('../../main/js/data/helpers.js');
    require('../../main/js/data/finances.js');
    window.financesData.cash = 1000;
    require('../../main/js/pages/financesPage.js');
    require('../../main/js/pages/researchPage.js');
  });

  test('Finances follows every transaction while it is open', () => {
    window.showPage('finances');
    window.finances.transact({ type: 'income', category: 'copays', amount: 1234.5, description: 'Copay' });
    window.ui.flush();
    expect(main().querySelector('.stat-value').textContent).toBe(window.fmt.money(window.financesData.cash));
    expect(text()).toContain('Copays');
    expect(text()).toContain('$1,234.50');
  });

  test('Finances lists transactions with signed, formatted amounts', () => {
    window.finances.transact({ type: 'expense', category: 'materials', amount: 2500, description: 'Bulk order' });
    window.showPage('finances');
    [...main().querySelectorAll('.tabs button')].find((b) => b.textContent === 'Transactions').click();
    expect(text()).toContain('Bulk order');
    expect(text()).toContain('−$2,500.00');
  });

  test('Research says what the next level costs, and why it cannot start yet', () => {
    window.researchData.currentLevel = 0;
    window.showPage('research');
    const next = window.researchData.levels[1];
    const button = main().querySelector('#research-button');
    expect(button.textContent).toBe(`Start research (${window.fmt.moneyWhole(next.cost)})`);
    expect(button.disabled).toBe(true);
    expect(text()).toContain('more.');
  });
});

describe('notifications', () => {
  beforeEach(() => {
    loadUi();
    window.financesData = { cash: 0, dailyIncome: 0, pendingInsuranceIncome: 0 };
    window.getGameSpeed = () => 1;
    require('../../main/components/topBar.js');
  });

  test('the welcome is there as soon as the top bar is, stamped with game time', () => {
    const setTimeout = jest.spyOn(global, 'setTimeout');
    const topBar = window.renderTopBar();

    expect(setTimeout).not.toHaveBeenCalled();
    expect(topBar.querySelector('#notificationCount').textContent).toBe('1');
    expect(topBar.querySelector('#notificationCount').style.display).toBe('block');
    expect(window.notifications.items[0].message).toBe('Welcome to The Pharmacy!');
    expect(window.notifications.items[0].timestamp.getTime()).toBe(window.gameState.currentDate.getTime());

    // Only once a session
    window.renderTopBar();
    expect(window.notifications.items).toHaveLength(1);
  });

  test('the unread count stays right when old notifications fall off the list', () => {
    for (let i = 0; i < 60; i++) window.notifications.add(`n${i}`);
    expect(window.notifications.items).toHaveLength(50);
    expect(window.notifications.unreadCount).toBe(50);
  });
});
