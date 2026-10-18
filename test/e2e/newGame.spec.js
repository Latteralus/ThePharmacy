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
  await page.fill('#pharmacy-name', 'Playwright Test Pharmacy');
  await page.click('.start-button');

  await page.waitForURL(/mode=new/);
  await page.waitForSelector('.top-bar', { timeout: 20_000 });
  await page.waitForSelector('.sidebar', { timeout: 20_000 });

  // The welcome is there from the start (it used to wait 2 real seconds)
  await expect(page.locator('#notificationCount')).toHaveText('1');

  // Every page renders through showPage's PageScope (A5) without errors
  const pages = await page.$$eval('.nav-links .nav-item', (items) => items.map((item) => item.id));
  expect(pages.length).toBeGreaterThan(10);
  for (const id of pages) {
    await page.click(`#${id}`);
    await expect(page.locator('.main-content .error-message')).toHaveCount(0);
  }

  // Operations redraws when a customer arrives, with no polling timer
  await page.click('#operations-nav-item');
  const name = await page.evaluate(() => {
    const customer = window.customers.generateCustomer(window.gameState.currentDate.getHours());
    return `${customer.firstName} ${customer.lastName}`;
  });
  await expect(page.locator('.main-content .customer-item').first()).toContainText(name);

  expect(consoleErrors).toEqual([]);

  await app.close();
  fs.rmSync(userDataDir, { recursive: true, force: true });
});
