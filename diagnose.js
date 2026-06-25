const puppeteer = require('puppeteer');

(async () => {
  const url = process.env.DIAGNOSE_URL || 'https://www.clubmontmartre-paris.com/';
  console.log('=== DIAGNOSTIC DOM ===');
  console.log('URL :', url);

  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Intercepter toutes les requêtes réseau
  const apiCalls = [];
  page.on('response', async (response) => {
    const u = response.url();
    const status = response.status();
    const ct = response.headers()['content-type'] || '';
    if (ct.includes('json') || u.includes('api') || u.includes('jackpot') || u.includes('payload')) {
      try {
        const body = await response.text();
        apiCalls.push({ url: u, status, body: body.slice(0, 500) });
      } catch(e) {}
    }
  });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000)); // attendre les appels tardifs

  // Requêtes JSON / API capturées
  console.log(`\n--- Requêtes JSON/API (${apiCalls.length}) ---`);
  apiCalls.forEach(c => {
    console.log(`\n  [${c.status}] ${c.url}`);
    console.log('  ', c.body);
  });

  // DOM complet
  const html = await page.content();
  console.log('\n--- DOM (premiers 5000 caractères) ---');
  console.log(html.slice(0, 5000));

  // Chercher les montants dans le DOM
  const amounts = html.match(/\d{2,3}[\s\u00a0]\d{3}/g) || [];
  console.log(`\n--- Montants dans le DOM (${amounts.length}) ---`);
  console.log([...new Set(amounts)].join(', '));

  // Chercher jackpot/ultimate/blackjack dans le DOM
  const keywords = html.match(/.{0,60}(jackpot|ultimate|blackjack|minor|major).{0,60}/gi) || [];
  console.log(`\n--- Mots-clés jackpot/jeux (${keywords.length}) ---`);
  keywords.slice(0, 30).forEach(m => console.log(' ', m.trim()));

  await browser.close();
  console.log('\n=== FIN ===');
})();
