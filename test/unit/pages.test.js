/**
 * Tests for the render side (review findings A1 and A5): systems announce
 * changes with window.updateUI(topic), pages subscribe through the
 * PageScope showPage hands them, and leaving a page drops its
 * subscriptions. No page runs a timer. Also M13 (inventory refreshes), M15
 * (Operations lists empty after navigating back) and M16 (interval leaks).
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

  test('finances and time redraw the top bar in its own "$X" format', () => {
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<span id="currentCash"></span><span id="dailyIncome"></span><span id="pendingInsurance"></span><span id="gameTime"></span>',
    );
    window.financesData = { cash: 1234.5, dailyIncome: 10, pendingInsuranceIncome: 2 };

    window.updateUI('finances');
    window.ui.updateTime();
    window.ui.flush();

    expect(document.getElementById('currentCash').textContent).toBe('$1234.50');
    expect(document.getElementById('dailyIncome').textContent).toBe('$10.00');
    expect(document.getElementById('pendingInsurance').textContent).toBe('$2.00');
    expect(document.getElementById('gameTime').textContent).toBe('[01/02/2023] [09:00]');
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
});

describe('the Operations page', () => {
  let customer;

  beforeEach(() => {
    loadUi();
    customer = {
      id: 'cust-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      status: 'waitingForCheckIn',
      arrivedAt: window.gameState.currentDate.getTime(),
    };
    window.employeesData = [];
    window.taskManager = { tasks: [] };
    window.customers = { activeCustomers: [] };
    window.prescriptions = { activePrescriptions: [] };
    window.getGameSpeed = () => 1;
    require('../../main/js/pages/operationsPage.js');
    require('../../main/js/pages/settingsPage.js');
  });

  test('shows a new customer once customers are announced, with no timer', () => {
    const setInterval = jest.spyOn(global, 'setInterval');
    const setTimeout = jest.spyOn(global, 'setTimeout');

    window.showPage('operations');
    expect(text()).toContain('No customers currently.');

    window.customers.activeCustomers.push(customer);
    window.updateUI('customers');
    window.ui.flush();
    expect(text()).toContain('Ada Lovelace');

    customer.status = 'readyForCheckout';
    window.updateUI('customers');
    window.ui.flush();
    expect(text()).toContain('Status: readyForCheckout');

    expect(setInterval).not.toHaveBeenCalled();
    expect(setTimeout).not.toHaveBeenCalled();
  });

  test('lists customers and prescriptions again after navigating away and back (M15)', () => {
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
    expect(text()).toContain('Product: Aspirin');
  });

  test("doesn't redraw once the player has left it (M16)", () => {
    window.showPage('operations');
    window.showPage('settings');

    window.customers.activeCustomers.push(customer);
    window.updateUI('customers');
    window.ui.flush();

    expect(text()).not.toContain('Ada Lovelace');
  });

  test('keeps opened prescription details open across redraws', () => {
    window.prescriptions.activePrescriptions.push({
      id: 'pres-1',
      customerId: 'cust-1',
      productName: 'Aspirin',
      status: 'pending',
      dosage: 2,
    });
    window.showPage('operations');
    const button = () => [...main().querySelectorAll('button')].find((b) => /Details/.test(b.textContent));

    button().click();
    window.prescriptions.activePrescriptions[0].status = 'filled';
    window.updateUI('prescriptions');
    window.ui.flush();

    expect(button().textContent).toBe('Hide Details');
    expect(text()).toContain('Status: filled');
  });

  test('counts tasks as they are announced', () => {
    window.showPage('operations');
    window.taskManager.tasks.push({ id: 't1', type: 'compound', status: 'pending', productName: 'X', totalTime: 5 });
    window.updateUI('tasks');
    window.ui.flush();

    expect(document.getElementById('activeTasksCount').textContent).toBe('1');
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

  test('keeps the time and pause status current from time announcements, with no interval', () => {
    const setInterval = jest.spyOn(global, 'setInterval');
    window.showPage('settings');
    const time = document.getElementById('current-time-display');
    const pause = document.getElementById('pause-status-indicator');

    window.gameState.currentDate = new Date(2023, 0, 2, 10, 30);
    window.gameState.isPaused = true;
    window.ui.updateTime();
    window.ui.flush();

    expect(time.textContent).toBe('[01/02/2023] [10:30]');
    expect(pause.textContent).toContain('Paused');
    expect(setInterval).not.toHaveBeenCalled();

    // Gone once the player leaves
    window.showPage('blank');
    window.gameState.currentDate = new Date(2023, 0, 2, 11, 0);
    window.ui.updateTime();
    window.ui.flush();
    expect(time.textContent).toBe('[01/02/2023] [10:30]');
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
    window.taskAssignment = { requestAutoAssign: jest.fn() };
    require('../../main/js/pages/inventoryPage.js');
    require('../../main/js/pages/marketplacePage.js');
    require('../../main/js/pages/equipmentPage.js');
  });

  function card(name, selector) {
    return [...main().querySelectorAll(selector)].find((c) => c.textContent.includes(name));
  }

  test('Inventory updates stock and price in place, keeping what the player is typing (M13)', () => {
    const product = window.productsData[0];
    product.inventory = 3;
    window.showPage('inventory');

    const productCard = card(product.name, '.product-card');
    const priceInput = productCard.querySelector('.new-price-row input');
    priceInput.value = '99.99';

    product.inventory = 7;
    window.finances.updateProductPrice(product.id, 12.5);
    window.ui.flush();

    expect(productCard.isConnected).toBe(true);
    expect(productCard.textContent).toContain('In Stock: 7');
    expect(productCard.textContent).toContain('Current Price: $12.50');
    expect(priceInput.value).toBe('99.99');
  });

  test('Inventory follows material stock on the Raw Materials tab', () => {
    const material = window.materialsData[0];
    window.showPage('inventory');
    [...main().querySelectorAll('.tab-button')].find((b) => b.textContent === 'Raw Materials').click();

    material.inventory = 4321;
    window.updateUI('inventory');
    window.ui.flush();

    expect(card(material.name, '.material-card').textContent).toContain('Inventory: 4321');
  });

  test('Marketplace updates material stock in place, keeping typed order quantities', () => {
    const material = window.materialsData[0];
    window.showPage('marketplace');
    const materialCard = [...main().querySelectorAll('input[type="number"]')][0].closest('div').parentElement;
    const qtyInput = materialCard.querySelector('input[type="number"]');
    qtyInput.value = '5';
    qtyInput.dispatchEvent(new Event('input'));

    material.inventory = 2;
    window.updateUI('inventory');
    window.ui.flush();

    expect(materialCard.textContent).toContain('Inventory: 2');
    expect(qtyInput.value).toBe('5');
    expect(main().textContent).not.toContain('Total Purchase: $0.00');
  });

  test('Equipment updates owned and wear in place, and redraws when research unlocks more', () => {
    window.researchData.currentLevel = 0;
    const unlocked = window.equipmentData.filter((eq) => eq.isUnlocked());
    const eq = unlocked[0];
    window.showPage('equipment');
    const eqCard = card(eq.name, '.equipment-card');
    const buyQty = eqCard.querySelector('.buy-qty-input');
    buyQty.value = '2';

    eq.owned += 1;
    eq.durability = 90;
    window.updateUI('equipment');
    window.ui.flush();

    expect(eqCard.textContent).toContain(`Owned: ${eq.owned}`);
    expect(eqCard.textContent).toContain('Durability: 90%');
    expect(buyQty.value).toBe('2');

    window.researchData.currentLevel = 10;
    window.updateUI('equipment');
    window.ui.flush();
    expect(main().querySelectorAll('.equipment-card').length).toBe(
      window.equipmentData.filter((e) => e.isUnlocked()).length,
    );
  });
});

describe('notifications', () => {
  beforeEach(() => {
    loadUi();
    window.financesData = { cash: 0, dailyIncome: 0, pendingInsuranceIncome: 0 };
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
