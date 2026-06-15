const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();

  console.log('=== DIAGNOSTIC BARRIERE ===');
  console.log('Chargement de la page...');

  await page.goto('https://www.casinosbarriere.com/paris', {
    waitUntil: 'networkidle2', timeout: 60000
  });

  console.log('Page chargee. Observation du carousel pendant 25s...');

  // Snapshots toutes les 2s pendant 25s pour voir le carousel tourner
  const snapshots = [];
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 2000));

    const snap = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('*').forEach(el => {
        const text = el.innerText?.trim();
        if (text && /\d{3,}/.test(text) && el.children.length === 0) {
          results.push({
            tag: el.tagName,
            classes: el.className,
            text: text.slice(0, 120),
            parent_tag: el.parentElement?.tagName,
            parent_classes: el.parentElement?.className,
            grandparent_classes: el.parentElement?.parentElement?.className
          });
        }
      });
      return results;
    });

    console.log(`\n--- Snapshot ${i + 1} (t=${2 * (i + 1)}s) ---`);
    console.log(JSON.stringify(snap, null, 2));
  }

  await browser.close();
  console.log('\n=== FIN DIAGNOSTIC ===');
})();
