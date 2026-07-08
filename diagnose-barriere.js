// Script de diagnostic ponctuel — Club Barrière Paris
// Objectif : inspecter le nouveau carousel .CsnJackpotHero (site refondu, Nuxt 3)
// et ne remonter que les jackpots dont la ville est "Paris".
//
// Usage local (si tu testes hors GitHub Actions) :
//   PUPPETEER_EXECUTABLE_PATH=/chemin/vers/chrome node diagnose-barriere.js
//
// Usage dans le workflow diagnose.yml : remplace temporairement le contenu
// de diagnose.js par celui-ci (ou ajoute un step dédié qui l'exécute).

const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    headless: 'new',
  });

  const page = await browser.newPage();

  await page.goto('https://www.casinosbarriere.com/paris', {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  // Laisse le temps au carousel de finir de s'hydrater côté client
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const heroes = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.CsnJackpotHero'))
      .map((h) => ({
        amount: h.querySelector('.CsnJackpotHero__amount')?.innerText.trim(),
        name: h.querySelector('.CsnJackpotHero__name')?.innerText.trim(),
        city: h.querySelector('.CsnJackpotHero__city')?.innerText.trim(),
      }))
      .filter((j) => j.city && j.city.toLowerCase().includes('paris'))
  );

  console.log(JSON.stringify(heroes, null, 2));

  await browser.close();
})();
