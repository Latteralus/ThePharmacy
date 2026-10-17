// Phase 2 (review finding C3): every simulation system runs on the one game
// clock, so pausing really pauses - no game time passes, customers don't
// lose patience, nobody new arrives - and closing time sends whoever is
// still in the store home instead of letting them time out overnight.

const path = require('path');
const os = require('os');
const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');

let userDataDir;

test.beforeEach(() => {
  userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thepharmacy-e2e-'));
});

test.afterEach(() => {
  fs.rmSync(userDataDir, { recursive: true, force: true });
});

test('pause freezes the clock and customers; closing time sends customers home', async () => {
  const env = { ...process.env, THEPHARMACY_USER_DATA: userDataDir };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    executablePath: require('electron'),
    args: [path.resolve(__dirname, '..', '..')],
    env,
  });
  const page = await app.firstWindow();

  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.waitForSelector('#newGameBtn');
  await page.click('#newGameBtn');
  await page.fill('#pharmacy-name', 'Clock Test Pharmacy');
  await page.click('.start-button');
  await page.waitForURL(/mode=new/);
  await page.waitForSelector('.top-bar', { timeout: 20_000 });

  // A customer walks in, then the game is paused.
  const before = await page.evaluate(() => {
    window.customers.generateCustomer();
    window.toggleGamePause();
    return {
      time: window.gameState.currentDate.getTime(),
      customers: window.customers.activeCustomers.length,
      patience: window.customers.activeCustomers.map(c => c.patience),
    };
  });
  expect(before.customers).toBeGreaterThan(0);

  // 3 real seconds is 3 game minutes at 1x - enough to see drift.
  await page.waitForTimeout(3000);

  const whilePaused = await page.evaluate(() => ({
    time: window.gameState.currentDate.getTime(),
    customers: window.customers.activeCustomers.length,
    patience: window.customers.activeCustomers.map(c => c.patience),
  }));
  expect(whilePaused).toEqual(before);

  // Resume: time moves again.
  await page.evaluate(() => window.toggleGamePause());
  await page.waitForTimeout(1500);
  const afterResume = await page.evaluate(() => window.gameState.currentDate.getTime());
  expect(afterResume).toBeGreaterThan(before.time);

  // Closing time with customers still waiting: they go home, and the
  // daily summary opens.
  await page.evaluate(() => {
    window.customers.generateCustomer();
    window.gameState.currentDate.setHours(21, 59, 59, 0);
  });
  await page.waitForSelector('.modal', { timeout: 10_000 });
  const atClose = await page.evaluate(() => ({
    isDayActive: window.gameState.isDayActive,
    customers: window.customers.activeCustomers.length,
    customerTasks: window.taskManager.tasks.filter(t => t.customerId).length,
  }));
  expect(atClose).toEqual({ isDayActive: false, customers: 0, customerTasks: 0 });

  expect(errors).toEqual([]);

  await app.close();
});
