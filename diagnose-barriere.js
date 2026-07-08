// Script de diagnostic ponctuel — Club Barrière Paris
// Version compatible GitHub Actions (headless, pas d'écran nécessaire).
// On masque navigator.webdriver avant chargement pour tester l'hypothèse
// de détection de bot, et on observe le carousel plus longtemps.
//
// Usage dans diagnose.yml : remplace temporairement le contenu de
// diagnose.js par celui-ci, ou ajoute un step qui exécute ce fichier.

const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const WATCH_DURATION_MS = 30000;
const POLL_INTERVAL_MS = 500;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    headless: 'new',
  });

  const page = await browser.newPage();

  // Masque le signal le plus courant de détection d'automatisation
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  await page.setViewport({ width: 1280, height: 900 });

  await page.goto('https://www.casinosbarriere.com/paris', {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  await sleep(3000);

  const captureHero = () =>
    page.evaluate(() => {
      const h = document.querySelector('.CsnJackpotHero');
      if (!h) return null;
      return {
        amount: h.querySelector('.CsnJackpotHero__amount')?.innerText.trim(),
        name: h.querySelector('.CsnJackpotHero__name')?.innerText.trim(),
        city: h.querySelector('.CsnJackpotHero__city')?.innerText.trim(),
      };
    });

  const allSeen = [];
  const seenKeys = new Set();
  let elapsedMs = 0;

  while (elapsedMs < WATCH_DURATION_MS) {
    const hero = await captureHero();
    if (hero?.name) {
      const key = `${hero.name}|${hero.city}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        allSeen.push(hero);
        console.error(`[+${(elapsedMs / 1000).toFixed(1)}s] Nouveau slide : ${hero.name} — ${hero.amount} — ${hero.city}`);
      }
    }
    await sleep(POLL_INTERVAL_MS);
    elapsedMs += POLL_INTERVAL_MS;
  }

  const parisOnly = allSeen.filter((j) => j.city?.toLowerCase().includes('paris'));

  console.log('\n=== TOUS LES SLIDES VUS ===');
  console.log(JSON.stringify(allSeen, null, 2));
  console.log('\n=== PARIS UNIQUEMENT ===');
  console.log(JSON.stringify(parisOnly, null, 2));

  await browser.close();
})();
