// Stakes and history in the real app (Phase 8): a day closing in the red
// warns, the third in a row is bankruptcy, saving is then refused (the save
// on disk is the player's way back), and "Load last save" restores it. Also
// that closing a day records it and the new pages show it.

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

// See saveLoad.spec.js: unpackaged runs dock DevTools beside the page.
async function closeDevTools(app) {
  await app.evaluate(async ({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    for (let i = 0; i < 100 && !win.webContents.isDevToolsOpened(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    win.webContents.closeDevTools();
  });
}

// Lets the clock run into 22:00
async function closeTheDay(page) {
  await page.evaluate(() => window.gameState.currentDate.setHours(21, 59, 59, 0));
}

test('closing in the red, bankruptcy, and loading the last save', async () => {
  const env = { ...process.env, THEPHARMACY_USER_DATA: userDataDir };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ executablePath: require('electron'), args: [APP_DIR], env });
  const page = await app.firstWindow();
  await closeDevTools(app);

  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.waitForSelector('#newGameBtn');
  await page.click('#newGameBtn');
  await page.fill('#pharmacy-name', 'Stakes Pharmacy');
  await page.click('.start-button');
  await page.waitForURL(/mode=new/);
  await page.waitForSelector('.top-bar', { timeout: 20_000 });

  // --- A first day that closes in the black is recorded ---
  await closeTheDay(page);
  await page.waitForSelector('.daily-summary', { timeout: 10_000 });
  await expect(page.locator('.daily-summary .callout')).toHaveCount(0);
  expect(await page.evaluate(() => window.records.days.length)).toBe(1);
  await page.click('.daily-summary .btn-primary');
  await page.click('#statistics-nav-item');
  await expect(page.locator('.main-content tbody tr')).toHaveCount(1);
  await page.click('#dashboard-nav-item');
  await expect(page.locator('.main-content')).toContainText('Open for a week');

  // A save to come back to. Autosave is off from here: jumping the clock to
  // 21:59:59 would run it, and the test needs this save to stay put.
  await page.evaluate(() => window.autoSave.stop());
  await page.click('.save-button');
  const saveFile = path.join(userDataDir, 'saves', 'pharmacy_save.json');
  await expect.poll(() => fs.existsSync(saveFile)).toBe(true);
  const savedCash = JSON.parse(fs.readFileSync(saveFile, 'utf8')).financesData.cash;

  // --- In the red: the summary warns ---
  await page.evaluate(() => {
    const cash = window.financesData.cash;
    window.finances.transact({ type: 'expense', category: 'other', amount: cash + 100000, description: 'e2e loss' });
  });
  await closeTheDay(page);
  await page.waitForSelector('.daily-summary', { timeout: 10_000 });
  await expect(page.locator('.daily-summary .callout.critical')).toContainText('1 of 3 in a row');
  await page.click('.daily-summary .btn-primary');

  // --- Two more red closings: bankrupt ---
  await page.evaluate(() => (window.gameState.daysInRed = 2));
  await closeTheDay(page);
  await page.waitForSelector('.game-over', { timeout: 10_000 });
  await expect(page.locator('.daily-summary')).toHaveCount(0);
  expect(await page.evaluate(() => window.gameState.bankrupt)).toBe(true);

  // Saving is refused, so the save on disk is untouched
  expect(await page.evaluate(() => window.saveGame())).toBe(false);
  expect(JSON.parse(fs.readFileSync(saveFile, 'utf8')).financesData.cash).toBe(savedCash);

  // --- Load last save: back in business ---
  await page.click('.game-over .btn-primary');
  await expect(page.locator('.game-over')).toHaveCount(0);
  const restored = await page.evaluate(() => ({
    bankrupt: window.gameState.bankrupt,
    cash: window.financesData.cash,
    daysInRed: window.gameState.daysInRed,
    days: window.records.days.length,
  }));
  expect(restored).toEqual({ bankrupt: undefined, cash: savedCash, daysInRed: 0, days: 1 });
  const before = await page.evaluate(() => window.gameState.currentDate.getTime());
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.gameState.currentDate.getTime())).toBeGreaterThan(before);

  expect(errors).toEqual([]);
  await app.close();
});
