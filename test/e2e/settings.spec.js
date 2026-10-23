// The main menu's Settings page (findings M18): its settings used to be
// saved and never read. Now the main process applies the interface size
// (and fullscreen), and a new game starts at the chosen speed.

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

function zoom(app) {
  return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.getZoomFactor());
}

test('menu settings are applied: interface size, and the speed a new game starts at', async () => {
  // Settings from an earlier session, including keys that no longer exist
  fs.writeFileSync(
    path.join(userDataDir, 'settings.json'),
    JSON.stringify({ simulationSpeed: 5, uiScale: 1.2, autoSaveEnabled: false, musicVolume: 80 }),
  );

  const app = await electron.launch(launchOptions());
  try {
    await checkSettings(app);
  } finally {
    await app.close();
  }
});

async function checkSettings(app) {
  const page = await app.firstWindow();
  await closeDevTools(app);
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.waitForSelector('#newGameBtn');
  await expect.poll(() => zoom(app)).toBeCloseTo(1.2);

  // The Settings page shows what's saved, and only settings that work
  await page.click('#settingsBtn');
  await page.waitForSelector('#settingsForm');
  await expect(page.locator('#simulationSpeed')).toHaveValue('5');
  await expect(page.locator('#simulationSpeed option')).toHaveText([
    '1× (Slow)',
    '2× (Normal)',
    '5× (Fast)',
    '10× (Very fast)',
  ]);
  await expect(page.locator('#skipDailySummary')).not.toBeChecked();
  await expect(page.locator('#skipMonthlyReport')).not.toBeChecked();
  await expect(page.locator('#skipYearlyReport')).not.toBeChecked();
  await expect(page.locator('#uiScale')).toHaveValue('1.2');
  await expect(page.locator('#autoSaveEnabled')).not.toBeChecked();
  await expect(page.locator('#autoSaveInterval')).toBeDisabled();
  await expect(page.locator('#musicVolume, #difficulty, #colorTheme')).toHaveCount(0);

  // Saving applies the interface size at once, and stores known keys only
  await page.selectOption('#uiScale', '1');
  await page.check('#skipDailySummary');
  await page.check('#skipYearlyReport');
  await page.click('.save-button');
  await expect(page.locator('#status')).toHaveText('Settings saved.');
  await expect.poll(() => zoom(app)).toBeCloseTo(1);
  const stored = JSON.parse(fs.readFileSync(path.join(userDataDir, 'settings.json'), 'utf8'));
  expect(stored).toEqual({
    simulationSpeed: 5,
    autoSaveEnabled: false,
    autoSaveInterval: 5,
    uiScale: 1,
    fullscreenEnabled: false,
    skipDailySummary: true,
    skipMonthlyReport: false,
    skipYearlyReport: true,
  });

  // A bad interval isn't saved
  await page.check('#autoSaveEnabled');
  await page.fill('#autoSaveInterval', '0');
  await page.click('.save-button');
  await expect(page.locator('#status')).toContainText('1 to 60');
  expect(JSON.parse(fs.readFileSync(path.join(userDataDir, 'settings.json'), 'utf8')).autoSaveEnabled).toBe(false);

  // A new game starts at the chosen speed
  await page.click('#backBtn');
  await page.waitForSelector('#newGameBtn');
  await page.click('#newGameBtn');
  await page.fill('#pharmacy-name', 'Settings Pharmacy');
  await page.click('.start-button');
  await page.waitForURL(/mode=new/);
  await page.waitForSelector('.top-bar', { timeout: 20_000 });
  await expect.poll(() => page.evaluate(() => window.getGameSpeed())).toBe(5);
  // and reads the report settings
  await expect.poll(() => page.evaluate(() => window.appSettings.skipDailySummary)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.appSettings.skipYearlyReport)).toBe(true);
  expect(await page.evaluate(() => window.appSettings.skipMonthlyReport)).toBe(false);

  expect(errors).toEqual([]);
}
