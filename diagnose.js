const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();

  console.log('=== DIAGNOSTIC BARRIERE v4 (Nuxt store + reseau) ===');

  // Intercepter les réponses réseau pour trouver une API jackpot
  const apiResponses = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('jackpot') || url.includes('Jackpot') || url.includes('progressive')) {
      try {
        const text = await response.text();
        apiResponses.push({ url, body: text.slice(0, 500) });
      } catch(e) {}
    }
  });

  await page.goto('https://www.casinosbarriere.com/paris', {
    waitUntil: 'networkidle2', timeout: 60000
  });

  // 1. Lire window.__NUXT__ pour trouver les jackpots
  const nuxtData = await page.evaluate(() => {
    try {
      const raw = JSON.stringify(window.__NUXT__);
      // Chercher toutes les occurrences de montants jackpot dans le store
      const matches = raw.match(/.{0,80}jackpot.{0,80}/gi) || [];
      const amounts = raw.match(/.{0,30}[0-9]{2,3}[\s\u00a0][0-9]{3}.{0,30}/g) || [];
      return { matches: matches.slice(0, 20), amounts: amounts.slice(0, 20) };
    } catch(e) {
      return { error: e.toString() };
    }
  });

  console.log('\n--- NUXT STORE (occurrences "jackpot") ---');
  (nuxtData.matches || []).forEach(m => console.log(' ', m));

  console.log('\n--- NUXT STORE (montants XX XXX) ---');
  (nuxtData.amounts || []).forEach(m => console.log(' ', m));

  // 2. Chercher dans toute la page une API ou données JSON embarquées
  const pageData = await page.evaluate(() => {
    // Chercher dans tous les scripts inline
    const scripts = Array.from(document.querySelectorAll('script:not([src])'));
    const results = [];
    scripts.forEach(s => {
      const t = s.textContent;
      if (t.includes('jackpot') || t.includes('Jackpot')) {
        results.push(t.slice(0, 300));
      }
    });
    return results;
  });

  console.log('\n--- SCRIPTS INLINE contenant "jackpot" ---');
  pageData.forEach((s, i) => console.log(`Script ${i}:`, s));

  await new Promise(r => setTimeout(r, 5000));

  console.log('\n--- APPELS RESEAU vers API jackpot ---');
  if (apiResponses.length === 0) {
    console.log('  Aucun appel réseau jackpot détecté');
  } else {
    apiResponses.forEach(r => {
      console.log('  URL:', r.url);
      console.log('  Body:', r.body);
    });
  }

  await browser.close();
  console.log('\n=== FIN ===');
})();
