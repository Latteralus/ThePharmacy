// Phase 9 in the real app: closing and opening the front from the top bar
// (with the Operations banner), End day with its confirmation and the
// "Closed early" note in the summary and on the Dashboard, and sending an
// employee home from the Employees page.

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

// See saveLoad.spec.js: unpackaged runs dock DevTools beside the page, over
// the right side of the top bar.
async function closeDevTools(app) {
  await app.evaluate(async ({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    for (let i = 0; i < 100 && !win.webContents.isDevToolsOpened(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    win.webContents.closeDevTools();
  });
}

test('close the front, end the day early, and send someone home', async () => {
  const env = { ...process.env, THEPHARMACY_USER_DATA: userDataDir };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ executablePath: require('electron'), args: [APP_DIR], env });
  const page = await app.firstWindow();
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.waitForSelector('#newGameBtn');
  await page.click('#newGameBtn');
  await page.fill('#pharmacy-name', 'Store Controls Pharmacy');
  await page.click('.start-button');
  await page.waitForURL(/mode=new/);
  await page.waitForSelector('.top-bar', { timeout: 20_000 });
  await closeDevTools(app);

  // A pharmacist on staff, so there's someone to send home
  await page.evaluate(() => {
    window.employees.hireSelectedEmployee({
      id: window.nextId('emp'),
      firstName: 'Sam',
      lastName: 'Lee',
      role: 'Pharmacist',
      salary: 120000,
      skills: { compounding: 60, dispensing: 70, customerService: 60, inventoryManagement: 50, sales: 50 },
      morale: 80,
      hireDate: new Date(window.gameState.currentDate),
      currentTaskId: null,
    });
  });

  // Close the front: the pill, the button and the Operations banner follow
  const status = page.locator('#storeStatus');
  await expect(status).toHaveText('Open');
  await page.click('#frontButton');
  await expect(status).toHaveText('Front closed');
  await expect(page.locator('#frontButton')).toHaveText('Open front');
  await page.click('#operations-nav-item');
  await expect(page.locator('.main-content .callout.warn')).toContainText('Front closed');
  expect(await page.evaluate(() => window.gameState.frontOpen)).toBe(false);

  // Send home from the Employees page, and call back
  await page.click('#employees-nav-item');
  const row = page.locator('.employee-card').first();
  await row.locator('button', { hasText: 'Send home' }).click();
  await expect(row).toContainText('Sent home');
  await row.locator('button', { hasText: 'Call back' }).click();
  await expect(row).not.toContainText('Sent home');

  // End day asks first; the summary notes the short day
  await page.click('#endDayButton');
  const prompt = page.locator('.confirm-modal');
  await expect(prompt).toContainText('Wages and overhead are charged for the full day');
  await prompt.locator('button', { hasText: 'End day' }).click();
  const summary = page.locator('.daily-summary');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('Closed early at 07:00');
  await expect(summary).toContainText('Front closed from 07:00');
  await expect(status).toHaveText('Closed');
  await summary.locator('button', { hasText: 'Start next day' }).click();

  // The next morning the store is open again, and the Dashboard keeps the day
  await expect(status).toHaveText('Open');
  expect(await page.evaluate(() => window.gameState.dayIndex)).toBe(1);
  await page.click('#dashboard-nav-item');
  await expect(page.locator('.main-content')).toContainText('Recent days');
  await page.locator('.main-content button', { hasText: 'Summary' }).first().click();
  await expect(page.locator('.day-record')).toContainText('Closed early at 07:00');

  expect(errors).toEqual([]);
  await app.close();
});
