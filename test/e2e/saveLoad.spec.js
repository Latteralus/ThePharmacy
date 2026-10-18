// Regression test for the 2026-08-15 "save/load is completely broken"
// finding: electron-main.js registered in-memory-only IPC handlers that
// shadowed game-integration.js's real disk-writing ones, and the renderer
// module that defines window.saveGame()/the only Save UI lived at the wrong
// path and was never loaded. Both are fixed; this exercises the real
// save -> quit -> relaunch -> load round trip end to end.
//
// Also covers the 2026-09-25 review findings C1 (stale frame-loop
// timestamps restored from a save froze the clock) and C2 (transaction
// dates came back as strings, so the first addTransaction after a load -
// including end of day's - threw and softlocked the game at 22:00).

const path = require('path');
const os = require('os');
const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');

const APP_DIR = path.resolve(__dirname, '..', '..');

// A throwaway profile, so the test never touches the player's real saves
// (electron-main.js honours THEPHARMACY_USER_DATA).
let userDataDir;
let savesDir;

function launchOptions() {
  const env = { ...process.env, THEPHARMACY_USER_DATA: userDataDir };
  delete env.ELECTRON_RUN_AS_NODE;
  return { executablePath: require('electron'), args: [APP_DIR], env };
}

// Unpackaged runs auto-open DevTools docked beside the page (on
// 'ready-to-show'), which narrows it enough to push the top bar's Save
// button off-screen. Wait for it to open, then close it.
async function closeDevTools(app) {
  await app.evaluate(async ({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    for (let i = 0; i < 100 && !win.webContents.isDevToolsOpened(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    win.webContents.closeDevTools();
  });
}

test.beforeEach(() => {
  userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thepharmacy-e2e-'));
  savesDir = path.join(userDataDir, 'saves');
});

test.afterEach(() => {
  fs.rmSync(userDataDir, { recursive: true, force: true });
});

test('saving writes a real save file, and loading it restores game state', async () => {
  // --- First launch: start a game, save it ---
  const app1 = await electron.launch(launchOptions());
  const page1 = await app1.firstWindow();
  await closeDevTools(app1);

  await page1.waitForSelector('#newGameBtn');
  await page1.click('#newGameBtn');
  await page1.fill('#pharmacy-name', 'Round Trip Pharmacy');
  await page1.click('.start-button');

  await page1.waitForURL(/mode=new/);
  await page1.waitForSelector('.top-bar', { timeout: 20_000 });
  await page1.waitForSelector('.save-button', { timeout: 20_000 });

  // Make sure the save has at least one transaction (C2 only shows up then),
  // plus state older saves dropped or reset (C5): a customer in the store,
  // a custom price, and the game speed.
  const customerId = await page1.evaluate(() => {
    window.finances.transact({
      type: 'expense',
      category: 'other',
      amount: 1,
      description: 'e2e test transaction',
    });
    window.productsData.find((p) => p.id === 'pd001').price = 123.45;
    window.setGameSpeed(2);
    window.productsData.forEach((p) => (p.inventory = 5)); // so they're served, whatever they ask for
    return window.customers.generateCustomer().id;
  });

  await page1.click('.save-button');
  await page1.waitForTimeout(1000);

  await app1.close();

  const savedFile = path.join(savesDir, 'pharmacy_save.json');
  expect(fs.existsSync(savedFile)).toBe(true);
  const saved = JSON.parse(fs.readFileSync(savedFile, 'utf8'));
  expect(saved.gameState.pharmacyName).toBe('Round Trip Pharmacy');
  expect(saved.financesData.cash).toBe(99999);
  expect(saved.financesData.transactions.length).toBeGreaterThan(0);
  // Frame-loop bookkeeping must not be persisted (C1)
  expect(saved.gameState.lastSimulationTime).toBeUndefined();
  // Only player state for static data (A2)
  expect(saved.version).toBe(5);
  // Ids come from a counter saved with the game (M9)
  expect(customerId).toMatch(/^cust-\d+$/);
  expect(saved.gameState.nextId).toBeGreaterThan(Number(customerId.split('-')[1]));
  expect(saved.products.find((p) => p.id === 'pd001')).toMatchObject({ price: 123.45 });
  expect(saved.products[0].name).toBeUndefined();
  expect(saved.productsData).toBeUndefined();
  expect(saved.customers.map((c) => c.id)).toContain(customerId);
  // One fill per prescription (H1), and the check-in task says what it is (A4)
  const savedCustomerTasks = saved.tasks.filter((t) => t.customerId === customerId);
  expect(savedCustomerTasks.filter((t) => t.type === 'fillPrescription')).toHaveLength(1);
  expect(savedCustomerTasks.find((t) => t.type === 'customerInteraction').interaction).toBe('checkIn');
  expect(saved.settings.gameSpeed).toBe(2);

  // --- Second launch: load it from the main menu ---
  const app2 = await electron.launch(launchOptions());
  const page2 = await app2.firstWindow();
  await closeDevTools(app2);

  const errors = [];
  page2.on('pageerror', (err) => errors.push(err.message));
  page2.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page2.waitForSelector('#loadGameBtn');
  await page2.click('#loadGameBtn');
  await page2.waitForSelector('.save-item', { timeout: 10_000 });
  await page2.click('.save-item');

  await page2.waitForURL(/mode=load/);
  await page2.waitForSelector('.top-bar', { timeout: 20_000 });

  const afterLoad = await page2.evaluate(
    (id) => ({
      time: window.gameState.currentDate.getTime(),
      customerRestored: window.customers.activeCustomers.some((c) => c.id === id),
      fills: window.taskManager.tasks.filter((t) => t.customerId === id && t.type === 'fillPrescription').length,
      price: window.productsData.find((p) => p.id === 'pd001').price,
      productName: window.productsData.find((p) => p.id === 'pd001').name,
      speed: window.getGameSpeed(),
    }),
    customerId,
  );
  expect(afterLoad.customerRestored).toBe(true);
  expect(afterLoad.fills).toBe(1);
  // Custom prices used to be reset to suggested on every load (C5)
  expect(afterLoad.price).toBe(123.45);
  expect(typeof afterLoad.productName).toBe('string');
  expect(afterLoad.speed).toBe(2);
  const timeAfterLoad = afterLoad.time;
  await page2.waitForTimeout(1500);

  const loaded = await page2.evaluate(
    (before) => ({
      pharmacyName: window.gameState?.pharmacyName,
      cash: window.financesData?.cash,
      currentDateIsDate: window.gameState?.currentDate instanceof Date,
      transactionDatesAreDates: window.financesData.transactions.every((t) => t.date instanceof Date),
      clockAdvanced: window.gameState.currentDate.getTime() > before,
      equipmentOwned: window.equipmentData.filter((e) => e.owned > 0).map((e) => e.id),
      brandReputationHasMethods: typeof window.brandReputation?.calcCustomers === 'function',
    }),
    timeAfterLoad,
  );

  expect(loaded.pharmacyName).toBe('Round Trip Pharmacy');
  expect(loaded.cash).toBe(99999);
  expect(loaded.currentDateIsDate).toBe(true);
  expect(loaded.transactionDatesAreDates).toBe(true);
  expect(loaded.clockAdvanced).toBe(true);
  expect(loaded.equipmentOwned).toEqual(['eq001', 'eq002', 'eq003']);
  expect(loaded.brandReputationHasMethods).toBe(true);

  // --- Force end of day: the daily summary must open (C2 softlock) ---
  await page2.evaluate(() => {
    window.gameState.currentDate.setHours(21, 59, 59, 0);
  });
  await page2.waitForSelector('.modal', { timeout: 10_000 });
  const endOfDay = await page2.evaluate(() => ({
    isDayActive: window.gameState.isDayActive,
    lastEndedDayIndex: window.gameState.lastEndedDayIndex,
    dayIndex: window.gameState.dayIndex,
  }));
  expect(endOfDay.isDayActive).toBe(false);
  expect(endOfDay.lastEndedDayIndex).toBe(endOfDay.dayIndex);

  expect(errors).toEqual([]);

  await app2.close();
});
