const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();

  console.log('=== DIAGNOSTIC BARRIERE v5 (tous appels JSON) ===');

  // Intercepter TOUTES les réponses JSON
  const apiResponses = [];
  page.on('response', async (response) => {
    const url = response.url();
    const ct = response.headers()['content-type'] || '';
    if (ct.includes('json') || url.includes('.json')) {
      try {
        const text = await response.text();
        // Ne garder que celles qui contiennent des chiffres ressemblant à des montants
        if (/\d{4,}/.test(text)) {
          apiResponses.push({ url, body: text.slice(0, 800) });
        }
      } catch(e) {}
    }
  });

  await page.goto('https://www.casinosbarriere.com/paris', {
    waitUntil: 'networkidle2', timeout: 60000
  });

  // Attendre encore 10s pour les appels différés post-hydratation
  await new Promise(r => setTimeout(r, 10000));

  console.log(`\n${apiResponses.length} appels JSON avec chiffres détectés :\n`);
  apiResponses.forEach((r, i) => {
    console.log(`--- Appel ${i+1} ---`);
    console.log('URL:', r.url);
    console.log('Body:', r.body);
    console.log('');
  });

  await browser.close();
  console.log('=== FIN ===');
})();
