const path = require('path');
const fs = require('fs');
const os = require('os');
const { _electron: electron } = require('playwright');

const userDataDir = path.join(os.homedir(), 'AppData', 'Roaming', 'thepharmacy');
const savesDir = path.join(userDataDir, 'saves');

function cleanSaves() {
  if (fs.existsSync(savesDir)) {
    fs.rmSync(savesDir, { recursive: true, force: true });
  }
}

(async () => {
  cleanSaves();

  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  const app = await electron.launch({
    executablePath: require('electron'),
    args: [path.resolve('c:/Users/Chris/Desktop/Projects/Games/ThePharmacy')],
    env,
  });

  const page = await app.firstWindow();
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.waitForSelector('#newGameBtn');
  await page.click('#newGameBtn');
  await page.fill('#pharmacy-name', 'Save Test Pharmacy');
  await page.click('.start-button');

  await page.waitForURL(/mode=new/);
  await page.waitForSelector('.top-bar', { timeout: 20000 });
  await page.waitForTimeout(1500);

  const saveBtnInfo = await page.evaluate(() => {
    const btn = document.querySelector('.save-button');
    return btn ? btn.textContent : null;
  });
  console.log('Save button found:', saveBtnInfo);

  console.log('Clicking Save button...');
  await page.click('.save-button');
  await page.waitForTimeout(1500);

  console.log('errors after save click:', errors);

  // Check filesystem directly (this driver script runs as plain node, has full fs access)
  console.log('userData saves dir exists:', fs.existsSync(savesDir));
  if (fs.existsSync(savesDir)) {
    const files = fs.readdirSync(savesDir);
    console.log('Files in saves dir:', files);
    files.forEach(f => {
      const content = JSON.parse(fs.readFileSync(path.join(savesDir, f), 'utf8'));
      console.log(`  ${f}: pharmacyName=${content.gameState?.pharmacyName}, cash=${content.financesData?.cash}`);
    });
  }

  await app.close();
})();
