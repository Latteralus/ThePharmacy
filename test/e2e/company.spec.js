// Phase 10, the company and its locations, end to end: the new-game screen
// (a property to lease, the lease's term, a startup loan, and what the money
// has to cover), the Building and Company pages, the report at a month's
// last closing with rent on the 1st, and save slots (a named save, a save
// under a new name, rotating autosaves, and loading one from the menu).
// The app runs from the compiled build/ folder, like a packaged one.

const path = require('path');
const os = require('os');
const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');

const APP_DIR = path.resolve(__dirname, '..', '..');

let userDataDir;

test.beforeEach(() => {
  userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thepharmacy-e2e-'));
});

test.afterEach(() => {
  fs.rmSync(userDataDir, { recursive: true, force: true });
});

function launchOptions() {
  const env = { ...process.env, THEPHARMACY_USER_DATA: userDataDir };
  delete env.ELECTRON_RUN_AS_NODE;
  return { executablePath: require('electron'), args: [APP_DIR], env };
}

// See saveLoad.spec.js: unpackaged runs dock DevTools beside the page.
async function closeDevTools(app) {
  await app.evaluate(async ({ BrowserWindow }) => {
    if (process.env.THEPHARMACY_HIDDEN === '1') return; // no window, no DevTools
    const win = BrowserWindow.getAllWindows()[0];
    for (let i = 0; i < 100 && !win.webContents.isDevToolsOpened(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    win.webContents.closeDevTools();
  });
}

function watchErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

test('a new pharmacy: property, lease and loan; a month-end report; saves and loading one', async () => {
  // The main menu loads the scripts it shares with the game from build/
  expect(fs.existsSync(path.join(APP_DIR, 'build', 'main', 'menu', 'mainMenu.js'))).toBe(true);

  const app1 = await electron.launch(launchOptions());
  const page = await app1.firstWindow();
  await closeDevTools(app1);
  const errors = watchErrors(page);

  // --- The new-game screen ---
  await page.waitForSelector('#newGameBtn');
  await page.click('#newGameBtn');
  await expect(page.locator('.listing-card')).toHaveCount(6);
  await page.fill('#pharmacy-name', 'Expansion Pharmacy');
  await page.click('.listing-card[data-listing="oak-street"]');
  await expect(page.locator('.listing-card[data-listing="oak-street"]')).toHaveClass(/selected/);
  await page.locator('#lease-term button', { hasText: '5 years' }).click();
  // 2,600 sq ft at $24 a square foot, 7% off on a 5-year lease
  const rent = Math.round((2600 * 24 * 0.93) / 12);
  await expect(page.locator('#new-game-panel')).toContainText(`$${rent.toLocaleString('en-US')} a month for 5 years`);

  await expect(page.locator('#loan-amount')).toBeHidden();
  await page.check('#take-loan');
  await page.locator('#loan-amount').fill('200000');
  await page.selectOption('#loan-term', '7');
  await page.check('#loan-guarantee');
  await expect(page.locator('#new-game-panel')).toContainText('Personal guarantee');
  const cashToOpen = 100000 + 200000 - 2 * rent;
  await expect(page.locator('#new-game-panel')).toContainText(
    `Cash to open with$${cashToOpen.toLocaleString('en-US')}`,
  );
  await expect(page.locator('#new-game-panel')).toContainText('closing on day 14');

  await page.click('.start-button');
  await page.waitForURL(/mode=new/);
  await page.waitForSelector('.top-bar', { timeout: 20_000 });

  const game = await page.evaluate(() => ({
    name: window.company.name,
    lease: window.company.active().lease,
    loan: window.financesData.loans[0],
    cash: window.financesData.cash,
  }));
  expect(game.name).toBe('Expansion Pharmacy');
  expect(game.lease).toMatchObject({ listingId: 'oak-street', termYears: 5, monthlyRent: rent, deposit: rent });
  expect(game.loan).toMatchObject({ name: 'Startup loan', principal: 200000, termMonths: 84, guarantee: true });
  expect(game.cash).toBe(cashToOpen);

  // --- The Building and Company pages ---
  await page.click('#building-nav-item');
  await expect(page.locator('.main-content')).toContainText('Standalone corner pharmacy at 1420 Oak Street');
  await expect(page.locator('.main-content')).toContainText('Shelving bay ×60');
  await page.click('#company-nav-item');
  await expect(page.locator('.main-content h2')).toHaveText('Expansion Pharmacy');
  await expect(page.locator('.main-content')).toContainText('Startup loan');
  await expect(page.locator('.main-content')).toContainText('Payments left84 of 84');

  // --- January's last closing: the summary, then the month's report, then
  // February 1st with its rent and the loan's first payment ---
  await page.evaluate(() => window.autoSave.stop());
  // The first day, which paid the deposit and January's rent at signing
  await page.evaluate(() => {
    window.gameState.isPaused = false;
    window.gameState.currentDate.setHours(21, 59, 59, 0);
  });
  await page.waitForSelector('.daily-summary', { timeout: 10_000 });
  await page.click('.daily-summary .btn-primary');
  // then on to the 31st
  await page.evaluate(() => {
    const date = window.gameState.currentDate;
    date.setDate(31);
    date.setHours(21, 59, 59, 0);
    window.gameState.dayIndex = 30;
  });
  await page.waitForSelector('.daily-summary', { timeout: 10_000 });
  await page.click('.daily-summary .btn-primary');
  await page.waitForSelector('.period-report', { timeout: 10_000 });
  await expect(page.locator('.period-report h2')).toHaveText('January 2023');
  await expect(page.locator('.period-report')).toContainText('Rent');
  await expect(page.locator('.period-report')).toContainText('Balance sheet');
  await page.click('.period-report .btn-primary');
  await expect(page.locator('.period-report')).toHaveCount(0);
  const february = await page.evaluate(() => ({
    date: window.gameState.currentDate.getDate(),
    month: window.gameState.currentDate.getMonth(),
    rent: window.financesData.transactions.filter((t) => t.category === 'rent').length,
    payments: window.financesData.loans[0].paymentsMade,
    reports: window.reports.list.map((r) => r.period),
  }));
  expect(february).toEqual({ date: 1, month: 1, rent: 2, payments: 1, reports: ['2023-01'] });

  // --- Saves: the game's own, one under a new name, and rotating autosaves ---
  await page.evaluate(() => window.toggleGamePause());
  expect(await page.evaluate(() => window.saveGame({ silent: true }))).toBe(true);
  const ownSlot = await page.evaluate(() => window.saveSession.slot);
  expect(ownSlot).toMatch(/^expansion-pharmacy-/);
  await page.locator('.main-content').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Control+l');
  const saves = page.locator('.saves-modal');
  await expect(saves.locator('tbody tr')).toHaveCount(1);
  await saves.locator('input[aria-label="Name for a new save"]').fill('Before expanding');
  await saves.locator('button', { hasText: 'Save as new' }).click();
  await expect(saves.locator('tbody tr')).toHaveCount(2);
  await saves.locator('button', { hasText: 'Close' }).click();
  const namedSlot = await page.evaluate(() => window.saveSession.slot);
  expect(namedSlot).toMatch(/^before-expanding-/);
  for (let i = 0; i < 4; i++) {
    expect(await page.evaluate(() => window.saveGame({ silent: true, auto: true }))).toBe(true);
  }
  const files = fs.readdirSync(path.join(userDataDir, 'saves')).filter((f) => f.endsWith('.json'));
  expect(files.filter((f) => f.startsWith('autosave-'))).toHaveLength(3);
  expect(files).toContain(`${ownSlot}.json`);
  expect(files).toContain(`${namedSlot}.json`);

  expect(errors).toEqual([]);
  await app1.close();

  // --- Relaunch: the Load list has every save; load the named one ---
  const app2 = await electron.launch(launchOptions());
  const page2 = await app2.firstWindow();
  await closeDevTools(app2);
  const errors2 = watchErrors(page2);
  await page2.waitForSelector('#loadGameBtn');
  await page2.click('#loadGameBtn');
  await expect(page2.locator('.save-item')).toHaveCount(5);
  await expect(page2.locator('#save-list')).toContainText('Expansion Pharmacy');
  await expect(page2.locator('#save-list')).toContainText('Autosave');
  await page2.locator('.save-item', { hasText: 'Before expanding' }).click();
  await page2.waitForURL(/mode=load/);
  await page2.waitForSelector('.top-bar', { timeout: 20_000 });
  const loaded = await page2.evaluate(() => ({
    name: window.company.name,
    slot: window.saveSession.slot,
    listing: window.company.active().lease.listingId,
    month: window.gameState.currentDate.getMonth(),
    welcome: window.notifications.items[0].message,
  }));
  expect(loaded).toEqual({
    name: 'Expansion Pharmacy',
    slot: namedSlot,
    listing: 'oak-street',
    month: 1,
    welcome: 'Welcome back to The Pharmacy!',
  });
  expect(errors2).toEqual([]);
  await app2.close();
});
