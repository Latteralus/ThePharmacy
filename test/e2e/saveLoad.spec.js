// Regression test for the 2026-08-15 "save/load is completely broken"
// finding: electron-main.js registered in-memory-only IPC handlers that
// shadowed game-integration.js's real disk-writing ones, and the renderer
// module that defines window.saveGame()/the only Save UI lived at the wrong
// path and was never loaded. Both are fixed; this exercises the real
// save -> quit -> relaunch -> load round trip end to end.

const path = require('path');
const os = require('os');
const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');

const APP_DIR = path.resolve(__dirname, '..', '..');
const savesDir = path.join(os.homedir(), 'AppData', 'Roaming', 'thepharmacy', 'saves');

function launchOptions() {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  return { executablePath: require('electron'), args: [APP_DIR], env };
}

test.beforeEach(() => {
  fs.rmSync(savesDir, { recursive: true, force: true });
});

test.afterAll(() => {
  fs.rmSync(savesDir, { recursive: true, force: true });
});

test('saving writes a real save file, and loading it restores game state', async () => {
  // --- First launch: start a game, save it ---
  const app1 = await electron.launch(launchOptions());
  const page1 = await app1.firstWindow();

  await page1.waitForSelector('#newGameBtn');
  await page1.click('#newGameBtn');
  await page1.fill('#pharmacy-name', 'Round Trip Pharmacy');
  await page1.click('.start-button');

  await page1.waitForURL(/mode=new/);
  await page1.waitForSelector('.top-bar', { timeout: 20_000 });
  await page1.waitForSelector('.save-button', { timeout: 20_000 });

  await page1.click('.save-button');
  await page1.waitForTimeout(1000);

  await app1.close();

  const savedFile = path.join(savesDir, 'pharmacy_save.json');
  expect(fs.existsSync(savedFile)).toBe(true);
  const saved = JSON.parse(fs.readFileSync(savedFile, 'utf8'));
  expect(saved.gameState.pharmacyName).toBe('Round Trip Pharmacy');
  expect(saved.financesData.cash).toBe(100000);

  // --- Second launch: load it from the main menu ---
  const app2 = await electron.launch(launchOptions());
  const page2 = await app2.firstWindow();

  const errors = [];
  page2.on('pageerror', (err) => errors.push(err.message));
  page2.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('module not found: path')) {
      errors.push(msg.text());
    }
  });

  await page2.waitForSelector('#loadGameBtn');
  await page2.click('#loadGameBtn');
  await page2.waitForSelector('.save-item', { timeout: 10_000 });
  await page2.click('.save-item');

  await page2.waitForURL(/mode=load/);
  await page2.waitForSelector('.top-bar', { timeout: 20_000 });
  await page2.waitForTimeout(1000);

  const loaded = await page2.evaluate(() => ({
    pharmacyName: window.gameState?.pharmacyName,
    cash: window.financesData?.cash,
    currentDateIsDate: window.gameState?.currentDate instanceof Date,
    equipmentIsUnlockedIsFunction: typeof window.equipmentData?.[0]?.isUnlocked === 'function',
    brandReputationHasMethods: typeof window.brandReputation?.calcCustomers === 'function',
  }));

  expect(loaded.pharmacyName).toBe('Round Trip Pharmacy');
  expect(loaded.cash).toBe(100000);
  expect(loaded.currentDateIsDate).toBe(true);
  expect(loaded.equipmentIsUnlockedIsFunction).toBe(true);
  expect(loaded.brandReputationHasMethods).toBe(true);
  expect(errors).toEqual([]);

  await app2.close();
});
