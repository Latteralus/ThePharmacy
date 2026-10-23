// @ts-check
const { defineConfig } = require('@playwright/test');

// The app's window stays hidden while the tests drive it (electron-main.js),
// so nothing pops up. THEPHARMACY_HIDDEN=0 shows it, to watch a test run.
process.env.THEPHARMACY_HIDDEN ??= '1';

module.exports = defineConfig({
  testDir: './test/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
});
