const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  });
  const page = await browser.newPage();

  // Forcer la page à croire qu'elle est visible (avant chargement)
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
    Object.defineProperty(document, 'hidden', { get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });

  await page.setViewport({ width: 1280, height: 800 });

  console.log('=== DIAGNOSTIC BARRIERE v3 (visibilite forcee) ===');
  await page.goto('https://www.casinosbarriere.com/paris', {
    waitUntil: 'networkidle2', timeout: 60000
  });

  // Déclencher visibilitychange sans redéfinir la propriété
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });

  console.log('Page chargee. Observation pendant 60s...\n');

  const seen = {};

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));

    const snap = await page.evaluate(() => {
      const amount = document.querySelector('.CsnJackpotHero__amount-inner');
      const name   = document.querySelector('.CsnJackpotHero__name');
      return {
        amount: amount ? amount.innerText.trim() : 'NOT FOUND',
        name:   name   ? name.innerText.trim()   : 'NOT FOUND'
      };
    });

    const key = `${snap.name}|${snap.amount}`;
    if (!seen[key]) {
      seen[key] = true;
      console.log(`t=${2*(i+1)}s — NOM: "${snap.name}" | MONTANT: "${snap.amount}"`);
    } else {
      process.stdout.write('.');
    }
  }

  console.log('\n\n=== RESUME ===');
  Object.keys(seen).forEach(k => console.log(' ', k));
  console.log('\n=== FIN ===');

  await browser.close();
})();
