// End-to-end smoke test: launches the real Electron app, starts a new game
// through the actual menu UI, and asserts the game screen renders with no
// console errors. This is the exact flow that used to crash (see the
// 2026-08-14 "materialsData is missing" / "window.updateUI is not a
// function" / "window.ui.formatDateTime is not a function" incident).

const path = require('path');
const os = require('os');
const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');

test('starting a new game reaches the game screen without console errors', async () => {
  // The parent process may have ELECTRON_RUN_AS_NODE set (e.g. inside an
  // agent sandbox); strip it for the child so Electron actually launches
  // as a GUI app instead of a plain Node process.
  // Throwaway profile so the test can't touch the player's real saves.
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thepharmacy-e2e-'));
  const env = { ...process.env, THEPHARMACY_USER_DATA: userDataDir };
  delete env.ELECTRON_RUN_AS_NODE;

  const app = await electron.launch({
    executablePath: require('electron'),
    args: [path.resolve(__dirname, '..', '..')],
    env,
  });

  const page = await app.firstWindow();

  const consoleErrors = [];
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.waitForSelector('#newGameBtn');
  await page.click('#newGameBtn');
  // Every game starts with $100,000: there's no capital to choose (Phase 9, #1)
  await expect(page.locator('#starting-capital')).toHaveCount(0);
  await page.fill('#pharmacy-name', 'Playwright Test Pharmacy');
  await page.click('.start-button');

  await page.waitForURL(/mode=new/);
  await page.waitForSelector('.top-bar', { timeout: 20_000 });
  await page.waitForSelector('.sidebar', { timeout: 20_000 });

  // The top bar names the pharmacy and has the time controls, with hotkeys
  // (findings U1, U2)
  await expect(page.locator('#pharmacyName')).toHaveText('Playwright Test Pharmacy');
  // A new game starts paused, with no staff
  expect(await page.evaluate(() => window.gameState.isPaused)).toBe(true);
  await expect(page.locator('#pauseButton')).toContainText('Resume');
  expect(await page.evaluate(() => window.employeesData.length)).toBe(0);
  expect(await page.evaluate(() => window.financesData.cash)).toBe(100000);
  // At 2×, the default with no settings saved (#49)
  await expect.poll(() => page.evaluate(() => window.getGameSpeed())).toBe(2);
  await page.locator('.main-content').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Space');
  expect(await page.evaluate(() => window.gameState.isPaused)).toBe(false);
  await page.keyboard.press('3');
  expect(await page.evaluate(() => window.getGameSpeed())).toBe(5);
  await page.keyboard.press('4');
  expect(await page.evaluate(() => window.getGameSpeed())).toBe(10);
  await page.keyboard.press('Space');
  expect(await page.evaluate(() => window.gameState.isPaused)).toBe(true);
  await expect(page.locator('#pauseButton')).toContainText('Resume');

  // The welcome is there from the start (it used to wait 2 real seconds)
  await expect(page.locator('#notificationCount')).toHaveText('1');

  // Every page renders through showPage's PageScope (A5) without errors
  const pages = await page.$$eval('.nav-links .nav-item', (items) => items.map((item) => item.id));
  // Placeholder pages are hidden until they have data behind them (findings
  // U7); Dashboard, Customers and Statistics have the history (Phase 8)
  expect(pages).toEqual([
    'dashboard-nav-item',
    'operations-nav-item',
    'customers-nav-item',
    'inventory-nav-item',
    'marketplace-nav-item',
    'equipment-nav-item',
    'employees-nav-item',
    'finances-nav-item',
    'statistics-nav-item',
    'research-nav-item',
    'settings-nav-item',
  ]);
  for (const id of pages) {
    await page.click(`#${id}`);
    await expect(page.locator('.main-content .error-message')).toHaveCount(0);
  }

  // Operations redraws when a customer arrives, with no polling timer
  await page.click('#operations-nav-item');
  const name = await page.evaluate(() => {
    window.productsData.forEach((p) => (p.inventory = 5)); // so they're served, whatever they ask for
    const customer = window.customers.generateCustomer(window.gameState.currentDate.getHours());
    return `${customer.firstName} ${customer.lastName}`;
  });
  await expect(page.locator('.main-content .customer-item').first()).toContainText(name);

  expect(consoleErrors).toEqual([]);

  await app.close();
  fs.rmSync(userDataDir, { recursive: true, force: true });
});
