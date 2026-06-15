const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();

  console.log('=== DIAGNOSTIC BARRIERE v2 ===');
  await page.goto('https://www.casinosbarriere.com/paris', {
    waitUntil: 'networkidle2', timeout: 60000
  });

  console.log('Page chargee. Observation pendant 35s...\n');

  for (let i = 0; i < 14; i++) {
    await new Promise(r => setTimeout(r, 2500));

    const snap = await page.evaluate(() => {
      // 1. Dump complet du bloc CsnJackpotHero (innerHTML)
      const hero = document.querySelector('.CsnJackpotHero__inner');
      const heroHTML = hero ? hero.innerHTML.replace(/\s+/g, ' ').slice(0, 500) : 'NOT FOUND';

      // 2. Montant actuel
      const amount = document.querySelector('.CsnJackpotHero__amount-inner');
      const amountText = amount ? amount.innerText.trim() : 'NOT FOUND';

      // 3. Cherche tous les éléments texte dans .CsnJackpotHero (pas seulement feuilles)
      const heroRoot = document.querySelector('[class*="CsnJackpotHero"]');
      const allTexts = [];
      if (heroRoot) {
        heroRoot.querySelectorAll('*').forEach(el => {
          const t = el.innerText?.trim();
          if (t && t.length > 0 && t.length < 200) {
            allTexts.push({ classes: el.className, text: t });
          }
        });
      }

      return { heroHTML, amountText, allTexts };
    });

    console.log(`--- t=${2.5 * (i + 1)}s ---`);
    console.log('MONTANT:', snap.amountText);
    console.log('TOUS LES TEXTES DANS CsnJackpotHero:');
    snap.allTexts.forEach(t => console.log(' ', JSON.stringify(t)));
    console.log('HTML HERO (500 chars):', snap.heroHTML);
    console.log('');
  }

  await browser.close();
  console.log('=== FIN ===');
})();
