// Script de diagnostic ponctuel — Club Barrière Paris
// Hypothèse : le carousel tourne normalement dans un vrai navigateur, mais
// pas (ou moins vite) sous Puppeteer — signe possible de détection de bot
// via navigator.webdriver. Ce script :
//   1. Ouvre une fenêtre de navigateur VISIBLE (pas headless) pour que tu
//      puisses regarder ce qui se passe à l'écran.
//   2. Masque navigator.webdriver avant que la page ne charge.
//   3. Log tous les slides distincts vus, comme la version précédente.
//
// Usage : node diagnose-barriere.js
// (une fenêtre Chrome va s'ouvrir — ne la ferme pas avant la fin du script)

const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const WATCH_DURATION_MS = 30000;
const POLL_INTERVAL_MS = 500;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    headless: false,        // fenêtre visible
    defaultViewport: null,  // utilise la taille réelle de la fenêtre
  });

  const page = await browser.newPage();

  // Masque le signal le plus courant de détection d'automatisation
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

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

  console.error('Observation en cours — regarde la fenêtre Chrome qui vient de s\'ouvrir...\n');

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
