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
  window.GAME_SPEEDS = [1, 2, 5, 10]; // main.ts
  require('../../build/main/js/clock.js');
  require('../../build/main/js/ui.js');
  require('../../build/main/components/kit.js');
  // The company and its one location (Phase 10): the per-location lists a
  // test sets go to it, and pages read its building and lease
  require('../../build/main/js/data/properties.js');
  require('../../build/main/js/company.js');
  require('../../build/main/js/building.js');
  require('../../build/main/js/reports.js');
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
    require('../../build/main/modals/modal.js');
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

  test("the daily summary counts customers turned away, and shows each employee's day (Phase 7)", () => {
    window.financesData = { cash: 1, revenue: { today: 0 }, expenses: { today: 0 }, profit: { today: 0 } };
    window.gameState.customersToday = { served: 2, unavailable: 3 };
    window.employees = {
      lastDayReport: [
        {
          id: 'a',
          name: 'Alice Wong',
          role: 'Lab Technician',
          hoursWorked: 11.5,
          moraleBefore: 60,
          moraleAfter: 54,
          reasons: ['overworked (11.5h)'],
          quit: false,
        },
        {
          id: 'b',
          name: 'Bob Ray',
          role: 'Cashier',
          hoursWorked: 9,
          moraleBefore: 12,
          moraleAfter: 9,
          reasons: ['paid 30% under market'],
          quit: true,
        },
      ],
    };
    window.showDailySummaryModal(jest.fn());

    const modal = document.querySelector('.daily-summary');
    expect(modal.textContent).toContain('3 lost');
    expect(modal.textContent).toContain('Turned away 3');
    expect(modal.textContent).toContain('Alice Wong');
    expect(modal.textContent).toContain('60% → 54%');
    expect(modal.textContent).toContain('overworked (11.5h)');
    expect(modal.textContent).toContain('Quit');
    delete window.employees;
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
    require('../../build/main/js/taskbars.js');
    require('../../build/main/js/pages/operationsPage.js');
    require('../../build/main/js/pages/settingsPage.js');
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
    window.company.name = 'Barnett Family Pharmacy';
    let speed = 1;
    window.getGameSpeed = () => speed;
    window.setGameSpeed = jest.fn((s) => {
      speed = s;
    });
    window.toggleGamePause = jest.fn(() => {
      window.gameState.isPaused = !window.gameState.isPaused;
    });
    require('../../build/main/components/topBar.js');
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

    // Phase 9 (#49): 1×, 2×, 5× and 10×
    expect([...document.querySelectorAll('#speedControl button')].map((b) => b.textContent)).toEqual([
      '1×',
      '2×',
      '5×',
      '10×',
    ]);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit4', bubbles: true }));
    expect(window.setGameSpeed).toHaveBeenLastCalledWith(10);
    window.ui.flush();
    expect(document.querySelector('#speedControl button.active').textContent).toBe('10×');

    [...document.querySelectorAll('#speedControl button')].find((b) => b.textContent === '1×').click();
    expect(window.setGameSpeed).toHaveBeenLastCalledWith(1);
  });

  test('closes and opens the front, and End day asks first, saying what is still going (#8)', () => {
    window.timeEvents = {
      setFrontOpen: jest.fn((open) => {
        window.gameState.frontOpen = open;
      }),
      endDayNow: jest.fn(),
      closingPreview: () => ({ customers: 2, tasksInProgress: 1 }),
    };
    require('../../build/main/modals/modal.js');
    const front = document.getElementById('frontButton');
    expect(front.textContent).toBe('Close front');

    front.click();
    expect(window.timeEvents.setFrontOpen).toHaveBeenLastCalledWith(false);
    window.ui.flush();
    expect(document.getElementById('storeStatus').textContent).toBe('Front closed');
    expect(front.textContent).toBe('Open front');
    front.click();
    expect(window.timeEvents.setFrontOpen).toHaveBeenLastCalledWith(true);

    document.getElementById('endDayButton').click();
    const dialog = document.querySelector('.confirm-modal');
    expect(dialog.textContent).toContain('2 customers are still in the store and will leave unserved');
    expect(dialog.textContent).toContain('Close the front first and let the line clear');
    expect(dialog.textContent).toContain('1 task is in progress');
    expect(window.timeEvents.endDayNow).not.toHaveBeenCalled();
    [...dialog.querySelectorAll('button')].find((b) => b.textContent === 'End day').click();
    expect(window.timeEvents.endDayNow).toHaveBeenCalled();

    // Both wait while the day is closed
    window.gameState.isDayActive = false;
    window.ui.flush();
    expect(document.getElementById('storeStatus').textContent).toBe('Closed');
    expect(front.disabled).toBe(true);
    expect(document.getElementById('endDayButton').disabled).toBe(true);
    delete window.timeEvents;
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
    require('../../build/main/js/pages/settingsPage.js');
    window.renderBlankPage = () => {};
  });

  test('labels every control (U18), and has no difficulty settings', () => {
    window.showPage('settings');
    const labels = [...main().querySelectorAll('.settings-grid .label')].map((l) => l.textContent);
    expect(labels).toEqual([
      'Current time',
      'Game',
      'Speed',
      'Daily summary',
      'Monthly report',
      'Yearly report',
      'This game',
    ]);
    expect([...main().querySelectorAll('select option')].map((o) => o.value)).toEqual(['1', '2', '5', '10']);
  });

  test("skipping the daily summary applies at once and is stored with the menu's settings (#49)", async () => {
    window.appSettings = { skipDailySummary: false };
    const stored = { simulationSpeed: 5, autoSaveEnabled: true, autoSaveInterval: 5, uiScale: 1.2 };
    window.gameAPI = {
      getSettings: jest.fn(async () => ({ ...stored })),
      updateSettings: jest.fn(async () => ({ success: true })),
    };
    window.showPage('settings');
    const toggle = document.getElementById('skipDailySummary');
    expect(toggle.checked).toBe(false);
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    expect(window.appSettings.skipDailySummary).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    // The rest of the menu's settings are kept
    expect(window.gameAPI.updateSettings).toHaveBeenCalledWith({ ...stored, skipDailySummary: true });
    delete window.gameAPI;
    delete window.appSettings;
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
    require('../../build/main/js/ids.js');
    require('../../build/main/js/data/materials.js');
    require('../../build/main/js/data/products.js');
    require('../../build/main/js/data/equipment.js');
    require('../../build/main/js/data/research.js');
    require('../../build/main/js/data/helpers.js');
    require('../../build/main/js/data/finances.js');
    window.globalMarkup = window.globalMarkup || 1.35;
    window.financesData.cash = 100000;
    window.taskAssignment = { requestAutoAssign: jest.fn() };
    window.taskManager = { tasks: [] };
    require('../../build/main/js/production.js');
    require('../../build/main/js/pages/inventoryPage.js');
    require('../../build/main/js/pages/marketplacePage.js');
    require('../../build/main/js/pages/equipmentPage.js');
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
    const unlocked = window.equipmentData.filter((eq) => window.research.isEquipmentUnlocked(eq.id));
    const eq = unlocked[0];
    window.showPage('equipment');
    const eqRow = row(eq.name, '.equipment-card');
    const buyQty = eqRow.querySelector('.buy-qty-input');
    buyQty.value = '2';

    eq.owned += 1;
    eq.durability = 90;
    window.updateUI('equipment');
    window.ui.flush();

    expect(eqRow.cells[3].textContent).toBe(String(eq.owned)); // after Price and Floor
    expect(eqRow.textContent).toContain('90%');
    expect(buyQty.value).toBe('2');

    window.researchData.currentLevel = 4;
    window.updateUI('equipment');
    window.ui.flush();
    expect(main().querySelectorAll('.equipment-card').length).toBe(window.equipmentData.length);
  });

  test('Inventory lists only what research has unlocked, and says when equipment is missing (Phase 7)', () => {
    window.researchData.currentLevel = 0;
    window.showPage('inventory');
    const rows = [...main().querySelectorAll('.product-row')].map((r) => r.dataset.productId);
    expect(rows).toEqual(window.researchData.levels[0].unlockedProducts.slice().sort());

    // Capsules need a Capsule Filler, which a new game doesn't own
    const capsuleRow = main().querySelector('.product-row[data-product-id="pd002"]');
    expect(capsuleRow.textContent).toContain('Needs equipment');
    const compound = [...capsuleRow.querySelectorAll('button')].find((b) => b.textContent === 'Compound');
    expect(compound.disabled).toBe(true);

    // Bought: the row updates in place
    window.production.addEquipment(
      window.equipmentData.find((e) => e.id === 'eq004'),
      1,
    );
    window.ui.flush();
    expect(capsuleRow.textContent).not.toContain('Needs equipment');
    expect(compound.disabled).toBe(false);
  });

  test('Equipment shows what each item is for, how much is in use, and repairs worn items (Phase 7)', () => {
    window.researchData.currentLevel = 0;
    const press = window.equipmentData.find((e) => e.id === 'eq002');
    press.durability = 60;
    window.showPage('equipment');
    const pressRow = main().querySelector('.equipment-card[data-equipment-id="eq002"]');
    expect(pressRow.textContent).toContain('Needed for 7 products');
    expect(pressRow.cells[4].textContent).toBe('0 / 1');
    expect(pressRow.textContent).toContain('60%');

    const repair = [...pressRow.querySelectorAll('button')].find((b) => b.textContent.startsWith('Repair'));
    expect(repair.textContent).toBe('Repair $750.00'); // 25% of $7,500 for 40% wear
    repair.click();
    window.ui.flush();
    expect(press.durability).toBe(100);
    expect(window.financesData.cash).toBe(100000 - 750);
    expect(document.querySelector('.toast-stack').textContent).toContain('Repaired Tablet Press');
    expect(repair.style.visibility).toBe('hidden');

    window.taskManager.tasks.push({ id: 'c1', type: 'compound', status: 'inProgress', productId: 'pd001' });
    window.updateUI('tasks');
    window.ui.flush();
    expect(pressRow.cells[4].textContent).toBe('1 / 1');
  });

  test('Equipment auto-purchase settings apply without buying anything (U14)', () => {
    window.researchData.currentLevel = 0;
    const eq = window.equipmentData.find((e) => window.research.isEquipmentUnlocked(e.id));
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
    require('../../build/main/modals/modal.js');
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
    require('../../build/main/js/data/helpers.js');
    const staff = window.employeesData;
    require('../../build/main/js/data/employees.js');
    window.employeesData = staff;
    jest.spyOn(window.employees, 'fireEmployee').mockImplementation(() => {});
    require('../../build/main/js/taskbars.js');
    require('../../build/main/js/pages/employeesPage.js');
  });

  test('shows the daily wage end of day actually charges (salary / 365, with payroll taxes and benefits)', () => {
    window.showPage('employees');
    expect(text()).toContain(window.fmt.money((85000 * 1.25) / 365));
    expect(text()).not.toContain(window.fmt.money(85000 / 30));
  });

  test('keeps the staff tiles current as people are hired', () => {
    window.showPage('employees');
    window.employeesData.push({ ...window.employeesData[0], id: 'emp-2', firstName: 'Alice', salary: 60000 });
    window.updateUI('employees');
    window.ui.flush();
    expect(main().querySelector('.stat-value').textContent).toBe('2');
    expect(text()).toContain(window.fmt.money((145000 * 1.25) / 365));
  });

  test('asks in-game before terminating', () => {
    window.showPage('employees');
    [...main().querySelectorAll('button')].find((b) => b.textContent === 'Terminate').click();
    expect(window.employees.fireEmployee).not.toHaveBeenCalled();
    [...document.querySelectorAll('.confirm-modal button')].find((b) => b.textContent === 'Terminate').click();
    expect(window.employees.fireEmployee).toHaveBeenCalledWith('emp-1');
  });

  test('salaries can be changed in place, with pay against the market beside them (Phase 7)', () => {
    window.showPage('employees');
    const row = main().querySelector('.employee-card[data-employee-id="emp-1"]');
    const salary = row.querySelector('input[aria-label="Salary for John Doe"]');
    expect(row.textContent).toContain('vs market');
    expect(row.textContent).toContain(window.fmt.money((85000 * 1.25) / 365));

    salary.value = '160000';
    salary.dispatchEvent(new Event('change'));
    window.ui.flush();
    expect(window.employeesData[0].salary).toBe(160000);
    expect(row.isConnected).toBe(true);
    expect(document.querySelector('.toast-stack').textContent).toContain('now earns $160,000');

    salary.value = '0';
    salary.dispatchEvent(new Event('change'));
    expect(window.employeesData[0].salary).toBe(160000);
    expect(salary.value).toBe('160000');
  });

  test('shows hours worked today and speed, and keeps a salary being typed', () => {
    window.showPage('employees');
    const row = main().querySelector('.employee-card');
    const salary = row.querySelector('input[type="number"]');
    salary.focus();
    salary.value = '99999';

    window.employeesData[0].minutesWorkedToday = 9 * 60;
    window.employeesData[0].minutesWorkedThisWeek = 30 * 60;
    window.updateUI('tasks');
    window.ui.flush();
    expect(row.isConnected).toBe(true);
    const hours = [...row.querySelectorAll('span')].find((n) => n.textContent === '9.0h today · 30.0h week');
    expect(hours.className).toBe('critical-text'); // in overtime
    expect(row.textContent).toContain('Overtime');
    expect(hours.title).toBe(`1.0h overtime so far: ${window.fmt.money(((85000 * 1.25) / 365 / 8) * 1.5)} at closing`);
    expect(row.textContent).toContain('1.30×'); // consultations: (85 + 75) / 2 = 80
    expect(salary.value).toBe('99999');
  });

  test('sends staff home and calls them back, and sets No overtime (Phase 9, #7)', () => {
    window.taskAssignment = { requestAutoAssign: jest.fn(), unassignTask: jest.fn() };
    window.showPage('employees');
    const row = main().querySelector('.employee-card');
    const button = (label) => [...row.querySelectorAll('button')].find((b) => b.textContent === label);
    expect(button('Call back').style.display).toBe('none');

    button('Send home').click();
    window.ui.flush();
    expect(window.employeesData[0].offUntilDay).toBe(2);
    expect(row.textContent).toContain('Sent home');
    expect(button('Send home').style.display).toBe('none');
    expect(main().querySelector('.stat-sub').textContent).toBe('0 idle · 1 sent home');

    button('Call back').click();
    window.ui.flush();
    expect(window.employeesData[0].offUntilDay).toBeUndefined();
    expect(row.textContent).toContain('Idle');

    const toggle = row.querySelector('.check input');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    expect(window.employeesData[0].noOvertime).toBe(true);
    delete window.taskAssignment;
  });

  test('warns when no one can consult, or fill and compound (Phase 9, #3)', () => {
    window.showPage('employees');
    const warning = main().querySelector('.callout.warn');
    expect(warning.style.display).toBe('none');

    window.employeesData[0].role = 'Cashier';
    window.updateUI('employees');
    window.ui.flush();
    expect(warning.style.display).toBe('');
    expect(warning.textContent).toContain("No pharmacist on staff: customers can't get consultations.");
    expect(warning.textContent).toContain('no one can fill or compound');
  });

  test('says the posting fee up front, and lists candidates with all their skills', () => {
    window.showPage('employees');
    expect(text()).toContain('Post job ($500)');
    window.displayEmployeeCandidates([{ ...window.employeesData[0], id: 'c-1', firstName: 'Cara' }]);
    const candidate = main().querySelector('.candidate-card');
    expect(candidate.textContent).toContain('Cara Doe');
    expect(candidate.cells).toHaveLength(9); // name, salary, speed, five skills, hire
  });
});

describe('the Finances and Research pages (U16, U17)', () => {
  beforeEach(() => {
    loadUi();
    require('../../build/main/js/ids.js');
    require('../../build/main/js/data/materials.js');
    require('../../build/main/js/data/products.js');
    require('../../build/main/js/data/equipment.js');
    require('../../build/main/js/data/research.js');
    require('../../build/main/js/data/helpers.js');
    require('../../build/main/js/data/finances.js');
    window.financesData.cash = 1000;
    window.taskManager = { tasks: [] };
    require('../../build/main/js/production.js');
    require('../../build/main/js/insuranceClaims.js');
    require('../../build/main/js/records.js');
    require('../../build/main/js/stakes.js');
    require('../../build/main/components/charts.js');
    require('../../build/main/js/pages/financesPage.js');
    require('../../build/main/js/pages/researchPage.js');
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

  test("Research lists the products customers ask for that can't be made yet (Phase 7)", () => {
    window.researchData.currentLevel = 0;
    window.showPage('research');
    const card = [...main().querySelectorAll('.card')].find((c) => c.textContent.includes("Can't make yet"));
    expect(card.textContent).toContain('Ibuprofen Capsule');
    expect(card.textContent).toContain('Capsule Filler');
    expect(card.textContent).not.toContain('Acetaminophen Tablet');

    window.equipmentData.find((e) => e.id === 'eq004').owned = 1;
    window.updateUI('equipment');
    window.ui.flush();
    const after = [...main().querySelectorAll('.card')].find((c) => c.textContent.includes("Can't make yet"));
    expect(after.textContent).toContain('You have the equipment for every product you carry.');
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
    require('../../build/main/components/topBar.js');
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

describe('stakes and history on screen (Phase 8)', () => {
  beforeEach(() => {
    loadUi();
    require('../../build/main/js/ids.js');
    require('../../build/main/js/data/materials.js');
    require('../../build/main/js/data/products.js');
    require('../../build/main/js/data/research.js');
    require('../../build/main/js/data/finances.js');
    window.financesData.cash = 50000;
    // $1,000 a day of utilities and services, and no rent (it's the 1st's)
    window.company.dailyServices = () => 1000;
    window.company.active().lease.monthlyRent = 0;
    // $100 a day, with payroll taxes and benefits
    window.employeesData = [{ id: 'a', firstName: 'Ann', lastName: 'Lee', role: 'Cashier', salary: 29200 }];
    window.brandReputation = { reputationScore: 42 };
    window.gameState.customersToday = { served: 4, impatient: 1 };
    window.gameState.lastEndedDayIndex = 0;
    window.notifications = { add: jest.fn() };
    require('../../build/main/js/insuranceClaims.js');
    require('../../build/main/js/records.js');
    require('../../build/main/js/stakes.js');
    require('../../build/main/js/goals.js');
    require('../../build/main/components/charts.js');
    require('../../build/main/modals/modal.js');
    require('../../build/main/js/pages/dashboardPage.js');
    require('../../build/main/js/pages/customersPage.js');
    require('../../build/main/js/pages/statisticsPage.js');
    require('../../build/main/js/pages/financesPage.js');
  });

  afterEach(() => {
    delete window.notifications;
  });

  function yesterday(overrides = {}) {
    return {
      day: 0,
      date: new Date(2023, 0, 1, 22).getTime(),
      revenue: 9000,
      costs: 4000,
      net: 5000,
      revenueByCategory: { copays: 9000 },
      costsByCategory: { wages: 100, overhead: 3900 },
      cash: 45000,
      loan: 0,
      reputation: 40,
      customers: { served: 30, price: 2, impatient: 1 },
      staff: 1,
      ...overrides,
    };
  }

  function visit(overrides = {}) {
    return {
      id: 'cust-1',
      name: 'Bo Chen',
      insurer: 'CarePlus',
      product: 'Acetaminophen Tablet',
      dosage: 2,
      day: 1,
      arrivedAt: new Date(2023, 0, 2, 9, 0).getTime(),
      leftAt: new Date(2023, 0, 2, 9, 40).getTime(),
      reason: 'served',
      price: 300,
      mood: 9,
      returning: false,
      ...overrides,
    };
  }

  function button(root, label) {
    return [...root.querySelectorAll('button')].find((b) => b.textContent === label);
  }

  test('the Dashboard compares today with yesterday and shows the bank and the goals', () => {
    window.records.days.push(yesterday());
    window.showPage('dashboard');
    expect(text()).toContain('Yesterday $9,000.00');
    expect(text()).toContain('Yesterday 30'); // served
    expect(text()).toContain('Yesterday 3'); // lost
    expect(text()).toContain('+2.0 since yesterday');
    expect(text()).toContain('$1,100.00 (wages, rent, utilities)');
    expect(text()).toContain('45 days of fixed costs');
    expect(text()).toContain('Reach reputation 50');
    expect(text()).toContain('42 / 50');
    expect(text()).toContain('0 of 17'); // the ladder for a long game (Phase 10)
    expect(main().querySelector('.callout.critical').style.display).toBe('none');
  });

  test('the Dashboard warns when the last closing was in the red, and marks goals reached', () => {
    window.gameState.daysInRed = 1;
    window.gameState.goalsReached = { week: 0 };
    window.showPage('dashboard');
    const warning = main().querySelector('.callout.critical');
    expect(warning.style.display).toBe('');
    expect(warning.textContent).toContain('the last closing');
    expect(warning.textContent).toContain('by closing on day 3');
    // The next goals on the ladder show; every one with Show all
    expect(text()).toContain('1 reached so far');
    expect(text()).not.toContain('Open for a week');
    button(main(), 'Show all').click();
    expect(text()).toContain('Open for a week');
    expect(text()).toContain('Day 1'); // when "Open for a week" was reached
    expect(text()).toContain('1 of 17');
  });

  test('Customers lists visits newest first, filters by outcome and searches, and follows departures', () => {
    window.records.visits.push(visit(), visit({ id: 'cust-2', name: 'Cy Dee', reason: 'impatient', price: 0 }));
    window.showPage('customers');
    expect(text()).toContain('50%'); // served of visits
    expect(text()).toContain('40m'); // average wait, served
    expect(text()).toContain('$300.00');
    expect(main().querySelectorAll('tbody tr')).toHaveLength(2);
    expect(text()).toContain('Ran out of patience');

    button(main(), 'Lost').click();
    expect(main().querySelectorAll('tbody tr')).toHaveLength(1);
    expect(text()).toContain('Cy Dee');

    button(main(), 'All').click();
    const search = main().querySelector('input.search');
    search.value = 'bo ch';
    search.dispatchEvent(new Event('input'));
    expect(main().querySelectorAll('tbody tr')).toHaveLength(1);

    search.value = '';
    search.dispatchEvent(new Event('input'));
    window.records.visits.unshift(visit({ id: 'cust-3', name: 'Di Eve' }));
    window.updateUI('customers');
    window.ui.flush();
    expect(main().querySelector('tbody tr').textContent).toContain('Di Eve');
  });

  test('Statistics waits for the first closing, then lists every day', () => {
    window.showPage('statistics');
    expect(text()).toContain('Statistics start at the first closing');
    window.records.days.push(yesterday(), yesterday({ day: 1, net: -200, cash: -150 }));
    window.updateUI('finances');
    window.ui.flush();
    const rows = main().querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Day 2'); // newest first
    expect(rows[0].querySelectorAll('.critical-text')).toHaveLength(2); // the loss and the negative cash
  });

  test('Finances borrows and repays, and the loan is not in the P&L', () => {
    window.showPage('finances');
    expect(text()).toContain('Line of credit: nothing owed');
    button(main(), 'Borrow $10,000').click();
    window.ui.flush();
    expect(window.financesData.cash).toBe(60000);
    expect(text()).toContain('Line of credit: owed $10,000.00 of the $50,000 limit');
    expect(text()).toContain('Total revenue$0.00');

    button(main(), 'Repay all').click();
    window.ui.flush();
    expect(window.stakes.loanBalance()).toBe(0);
    expect(text()).toContain('Line of credit: nothing owed');
  });

  test("Finances' month adds closed days from their records, so a capped log doesn't shorten it", () => {
    window.gameState.currentDate = new Date(2023, 0, 2, 9);
    window.records.days.push(yesterday()); // Jan 1, with no transactions left in the log
    window.finances.transact({ type: 'income', category: 'copays', amount: 100, description: 'today' });
    window.showPage('finances');
    expect(text()).toContain('Total revenue$9,100.00');
    expect(text()).toContain('Utilities and services-$3,900.00');
    // A record from before locations is all the first location's
    expect(text()).toContain(`Net by location${window.company.active().name}$5,100.00`);
    expect(text()).not.toContain('Company (loan interest)');
  });

  test('the daily summary warns when in the red and lists goals reached at this closing', () => {
    window.financesData.cash = -2000;
    window.gameState.daysInRed = 1;
    window.gameState.lastEndedDayIndex = 1;
    window.gameState.goalsReached = { reputation50: 1 };
    window.records.days.push(yesterday(), yesterday({ day: 1, reputation: 42 }));
    window.showDailySummaryModal(jest.fn());
    const modal = document.querySelector('.daily-summary');
    expect(modal.querySelector('.callout.critical').textContent).toContain('1 of 3 in a row');
    expect(modal.textContent).toContain('by closing on day 4');
    expect(modal.textContent).toContain('Goal reachedReach reputation 50');
    expect(modal.textContent).toContain('+2.0 today');
  });

  test("game over offers the game's saves and the main menu, and a load closes it", async () => {
    window.gameState.bankrupt = true;
    window.loadGame = jest.fn(async () => {
      window.closeSessionModals();
      return true;
    });
    window.showGameOverModal();
    const modal = document.querySelector('.game-over');
    expect(modal.textContent).toContain('Bankrupt');
    expect(modal.textContent).toContain('Customers served4');
    expect(button(modal, 'Main menu')).toBeDefined();
    // The game's saves, to pick one from before the trouble (Phase 10)
    window.showSavesModal = jest.fn();
    button(modal, 'Load a save').click();
    expect(window.showSavesModal).toHaveBeenCalledWith({ title: 'Load a save', gameOnly: true });
    // and a load closes game over
    await window.loadGame();
    expect(document.querySelector('.game-over')).toBeNull();
    delete window.loadGame;
    delete window.showSavesModal;
  });

  test('a load closes the daily summary without starting a next day', () => {
    const next = jest.fn();
    window.showDailySummaryModal(next);
    window.closeSessionModals();
    expect(document.querySelector('.daily-summary')).toBeNull();
    expect(next).not.toHaveBeenCalled();
  });
});

describe('the company, its building, reports and saves on screen (Phase 10)', () => {
  beforeEach(() => {
    loadUi();
    window.updateUI = jest.fn((topic) => window.ui.updateUI(topic));
    require('../../build/main/js/ids.js');
    require('../../build/main/js/data/materials.js');
    require('../../build/main/js/data/products.js');
    require('../../build/main/js/data/equipment.js');
    require('../../build/main/js/data/research.js');
    require('../../build/main/js/data/lending.js');
    require('../../build/main/js/data/finances.js');
    window.financesData.cash = 50000;
    window.employeesData = [{ id: 'a', firstName: 'Ann', lastName: 'Lee', role: 'Cashier', salary: 29200 }];
    window.brandReputation = { reputationScore: 42 };
    window.customers = { activeCustomers: [] };
    window.notifications = { add: jest.fn() };
    window.company.name = 'Mountain Care';
    require('../../build/main/js/insuranceClaims.js');
    require('../../build/main/js/records.js');
    require('../../build/main/js/stakes.js');
    require('../../build/main/js/goals.js');
    require('../../build/main/components/charts.js');
    require('../../build/main/modals/modal.js');
    require('../../build/main/modals/reportModal.js');
    require('../../build/main/modals/savesModal.js');
    require('../../build/main/js/pages/buildingPage.js');
    require('../../build/main/js/pages/companyPage.js');
    require('../../build/main/js/pages/financesPage.js');
  });

  afterEach(() => {
    delete window.notifications;
    delete window.gameAPI;
  });

  function button(root, label) {
    return [...root.querySelectorAll('button')].find((b) => b.textContent === label);
  }

  function startupLoan(overrides = {}) {
    return {
      id: 'loan-1',
      name: 'Startup loan',
      principal: 100000,
      rate: 0.095,
      termMonths: 60,
      monthlyPayment: 2100.19,
      balance: 100000,
      paymentsMade: 0,
      start: 0,
      guarantee: true,
      collateral: false,
      ...overrides,
    };
  }

  function januaryReport() {
    return {
      kind: 'month',
      period: '2023-01',
      label: 'January 2023',
      firstDay: 0,
      lastDay: 30,
      daysOpen: 31,
      revenueByCategory: { copays: 30000, insurance: 12000 },
      costsByCategory: { wages: 15000, rent: 4500, overhead: 17000, interest: 800 },
      revenue: 42000,
      costs: 37300,
      net: 4700,
      byLocation: [{ id: 'loc-1', name: 'Maple Grove Plaza, Unit 4', revenue: 42000, costs: 36500, net: 5500 }],
      customers: { served: 900, impatient: 40, price: 10 },
      balance: { cash: 61000, insuranceOwed: 9000, deposits: 4500, creditLine: 0, termLoans: 98500 },
      loans: [{ name: 'Startup loan', balance: 98500, monthlyPayment: 2100.19, paymentsLeft: 59 }],
      principalRepaid: 1500,
      interestPaid: 800,
      highlights: {
        bestDay: { day: 13, net: 6100 },
        worstDay: { day: 0, net: -9000 },
        reputationStart: 10,
        reputationEnd: 31,
        staffStart: 3,
        staffEnd: 5,
        goals: ['Open for a week'],
      },
    };
  }

  test('Building shows each zone and what is in it, the shelves stock takes, and the lease', () => {
    window.showPage('building');
    expect(text()).toContain('Strip-mall storefront at Maple Grove Plaza, Unit 4: 2,000 sq ft');
    expect(text()).toContain(`Holds ${window.building.customerCapacity()} customers at once`);
    expect(text()).toContain('None: sterile work needs a cleanroom build-out');
    expect(text()).toContain('Shelving bay ×45');
    expect(text()).toContain('$4,500 a month, due on the 1st');
    const storage = window.building.zone('storage');
    expect(text()).toContain(`${storage.usedShelves} of 225 shelves used`);

    // Stock arriving updates the shelves in place
    window.materialsData[0].inventory += 5000;
    window.updateUI('inventory');
    window.ui.flush();
    expect(text()).toContain(`${storage.usedShelves + 5} of 225 shelves used`);
  });

  test('Company shows the location, what is owed, a month of fixed costs, and pays off the loan', () => {
    window.financesData.loans = [startupLoan()];
    window.showPage('company');
    expect(main().querySelector('h2').textContent).toBe('Mountain Care');
    expect(text()).toContain('Maple Grove Plaza, Unit 4');
    expect(text()).toContain('9.50% a year');
    expect(text()).toContain('Secured bypersonal guarantee');
    expect(text()).toContain('Rent$4,500.00');
    expect(text()).toContain('Loan payments$2,100.19');
    expect(text()).toContain('Owed to the bank$100,000.00');

    const payOff = button(main(), 'Pay off $100,000.00');
    expect(payOff.disabled).toBe(true); // not the cash
    window.financesData.cash = 150000;
    window.updateUI('finances');
    window.ui.flush();
    button(main(), 'Pay off $100,000.00').click();
    button(document.querySelector('.confirm-modal'), 'Pay off').click();
    expect(window.financesData.loans).toEqual([]);
    expect(window.financesData.cash).toBe(50000);
  });

  test('a report shows its P&L, balance sheet, loans and highlights; at closing it waits for Continue', () => {
    window.reports.list.push(januaryReport());
    window.showReportModal('month', '2023-01');
    let modal = document.querySelector('.period-report');
    expect(modal.textContent).toContain('January 2023');
    expect(modal.textContent).toContain('Rent-$4,500.00');
    expect(modal.textContent).toContain('Utilities and services-$17,000.00');
    expect(modal.textContent).toContain('Company (loan interest)-$800.00');
    // Cash, insurance owed and the deposit, less the loan
    expect(modal.textContent).toContain('Net-$24,000.00');
    expect(modal.textContent).toContain('Best dayDay 14, $6,100.00');
    expect(modal.textContent).toContain('Reputation10 → 31');
    expect(modal.textContent).toContain('Goal reachedOpen for a week');
    button(modal, 'Close').click();
    expect(document.querySelector('.period-report')).toBeNull();

    // At closing: Continue goes on, and a load closes it without going on
    const next = jest.fn();
    window.showReportModal('month', '2023-01', next);
    modal = document.querySelector('.period-report');
    button(modal, 'Continue').click();
    expect(next).toHaveBeenCalledTimes(1);
    window.showReportModal('month', '2023-01', next);
    window.closeSessionModals();
    expect(document.querySelector('.period-report')).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('Finances lists the reports, and shows a past month from its report once its entries are gone', () => {
    window.reports.list.push(januaryReport());
    window.gameState.currentDate = new Date(2023, 2, 10, 9);
    window.showPage('finances');
    const month = main().querySelector('select[aria-label="Month"]');
    expect([...month.options].map((o) => o.textContent)).toEqual(['This month', 'January 2023']);
    month.value = '2023-01';
    month.dispatchEvent(new Event('change'));
    expect(text()).toContain('Total revenue$42,000.00');
    expect(text()).toContain('Net by locationMaple Grove Plaza, Unit 4$5,500.00');

    button(main(), 'Reports').click();
    expect(text()).toContain('January 2023');
    button(main(), 'Open').click();
    expect(document.querySelector('.period-report')).not.toBeNull();
  });

  test("the Saves dialog lists this game's saves with their day, cash and days in the red, and loads one after asking", async () => {
    window.gameState.gameId = 'game-a';
    window.saveSession = { slot: 'mountain-care-a', name: 'Mountain Care' };
    const save = (overrides) => ({
      slot: 'mountain-care-a',
      name: 'Mountain Care',
      kind: 'manual',
      gameId: 'game-a',
      companyName: 'Mountain Care',
      day: 12,
      cash: 5000,
      daysInRed: 0,
      lastSaved: 2,
      ...overrides,
    });
    window.gameAPI = {
      getSavedGames: jest.fn(async () => [
        save({
          slot: 'autosave-game-a-1',
          name: 'Autosave',
          kind: 'auto',
          day: 14,
          cash: -300,
          daysInRed: 2,
          lastSaved: 3,
        }),
        save(),
        save({ slot: 'other-game', gameId: 'game-b', companyName: 'Other' }),
      ]),
      deleteSavedGame: jest.fn(async () => true),
    };
    window.loadGame = jest.fn(async () => true);
    window.saveGame = jest.fn(async () => true);

    window.showSavesModal({ gameOnly: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const dialog = document.querySelector('.saves-modal');
    const rows = dialog.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2); // not the other game's
    expect(rows[0].textContent).toContain('Autosave');
    expect(rows[0].textContent).toContain('2 in the red');
    expect(rows[0].textContent).toContain('-$300.00');
    // Only named saves can be deleted
    expect(button(rows[0], 'Delete')).toBeUndefined();
    expect(button(rows[1], 'Delete')).toBeDefined();

    button(rows[0], 'Load').click();
    button(document.querySelector('.confirm-modal'), 'Load').click();
    await Promise.resolve();
    expect(window.loadGame).toHaveBeenCalledWith('autosave-game-a-1');

    window.showSavesModal({ gameOnly: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const again = document.querySelector('.saves-modal');
    const name = again.querySelector('input[aria-label="Name for a new save"]');
    name.value = 'Before the expansion';
    button(again, 'Save as new').click();
    expect(window.saveGame).toHaveBeenCalledWith({ name: 'Before the expansion' });
    delete window.loadGame;
    delete window.saveGame;
  });
});
