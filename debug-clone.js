const path = require('path');
const { _electron: electron } = require('playwright');

(async () => {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  const app = await electron.launch({
    executablePath: require('electron'),
    args: [path.resolve('c:/Users/Chris/Desktop/Projects/Games/ThePharmacy')],
    env,
  });

  const page = await app.firstWindow();
  await page.waitForSelector('#newGameBtn');
  await page.click('#newGameBtn');
  await page.fill('#pharmacy-name', 'Clone Test');
  await page.click('.start-button');
  await page.waitForURL(/mode=new/);
  await page.waitForSelector('.top-bar', { timeout: 20000 });
  await page.waitForTimeout(1000);

  const result = await page.evaluate(() => {
    const fields = {
      gameState: window.gameState,
      financesData: window.financesData,
      employeesData: window.employeesData,
      productsData: window.productsData,
      materialsData: window.materialsData,
      equipmentData: window.equipmentData,
      brandReputation: { brandScore: window.brandReputation.brandScore, reputationScore: window.brandReputation.reputationScore },
    };
    const out = {};
    for (const [key, val] of Object.entries(fields)) {
      try {
        structuredClone(val);
        out[key] = 'OK';
      } catch (e) {
        out[key] = 'FAIL: ' + e.message;
      }
    }
    return out;
  });
  console.log(result);

  await app.close();
})();
