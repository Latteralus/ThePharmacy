// Player-facing controls after the cleanup of earlier phases' loose ends:
// the Load menu shows the one save slot, not every *.json in the folder
// (H7); the Settings page has no cheats (H5); Ctrl+L asks before throwing
// away unsaved progress (H7).

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

test('the Load menu, Settings page and Ctrl+L', async () => {
  // A stray JSON file in the saves folder isn't a save slot.
  const savesDir = path.join(userDataDir, 'saves');
  fs.mkdirSync(savesDir, { recursive: true });
  fs.writeFileSync(
    path.join(savesDir, 'notes.json'),
    JSON.stringify({ gameState: { pharmacyName: 'Stray' }, financesData: { cash: 1 } }),
  );

  const env = { ...process.env, THEPHARMACY_USER_DATA: userDataDir };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ executablePath: require('electron'), args: [APP_DIR], env });
  const page = await app.firstWindow();
  await closeDevTools(app);

  await page.waitForSelector('#loadGameBtn');
  await page.click('#loadGameBtn');
  await expect(page.locator('#save-list .no-saves')).toBeVisible();
  await expect(page.locator('.save-item')).toHaveCount(0);
  await page.click('#load-game-back');

  await page.click('#newGameBtn');
  await page.fill('#pharmacy-name', 'Controls Pharmacy');
  await page.click('.start-button');
  await page.waitForURL(/mode=new/);
  await page.waitForSelector('.top-bar', { timeout: 20_000 });

  // Developer tools only in unpackaged runs, like this one.
  expect(await page.evaluate(() => window.gameAPI.isDev)).toBe(true);
  await expect(page.locator('#debug-toggle')).toHaveCount(1);

  // No cheats on the Settings page or the console.
  await page.evaluate(() => window.showPage('settings'));
  await page.waitForSelector('.settings-page-container');
  const buttons = await page.locator('.settings-page-container button').allTextContents();
  expect(buttons).toEqual(['Pause Game']);
  expect(
    await page.evaluate(() => ({
      forceTimeForward: typeof window.forceTimeForward,
      setCash: typeof window.finances.setCash,
      addTransaction: typeof window.finances.addTransaction,
    })),
  ).toEqual({ forceTimeForward: 'undefined', setCash: 'undefined', addTransaction: 'undefined' });

  // Save, then spend some money.
  expect(await page.evaluate(() => window.saveGame({ silent: true }))).toBe(true);
  const cash = () => page.evaluate(() => window.financesData.cash);
  const savedCash = await cash();
  await page.evaluate(() =>
    window.finances.transact({ type: 'expense', category: 'other', amount: 500, description: 'e2e spend' }),
  );

  // Ctrl+L asks first; Cancel keeps the unsaved progress.
  await page.keyboard.press('Control+l');
  const prompt = page.locator('.confirm-modal');
  await expect(prompt).toBeVisible();
  await prompt.locator('button', { hasText: 'Cancel' }).click();
  await expect(prompt).toHaveCount(0);
  expect(await cash()).toBe(savedCash - 500);

  // Confirming loads the save.
  await page.keyboard.press('Control+l');
  await prompt.locator('button', { hasText: 'Load' }).click();
  await expect.poll(cash).toBe(savedCash);

  // The Load menu now lists the save slot, and only it.
  const savedGames = await page.evaluate(() => window.gameAPI.getSavedGames());
  expect(savedGames.map((s) => s.name)).toEqual(['pharmacy_save.json']);

  await app.close();
});
