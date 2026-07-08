// Script de diagnostic ponctuel — Club Barrière Paris
// Le carousel défile automatiquement (autoplay), un jackpot à la fois dans
// le DOM. Ce script ne clique sur rien : il observe le DOM à intervalles
// réguliers pendant que le carousel tourne tout seul, et collecte chaque
// jackpot distinct dont la ville est "Paris".
//
// Usage : node diagnose-barriere.js

const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Durée totale d'observation et fréquence des captures.
// Ajuste WATCH_DURATION_MS si le carousel semble avoir plus de slides
// que ce qui est capturé (essaie 30000 ou 40000).
const WATCH_DURATION_MS = 20000;
const POLL_INTERVAL_MS = 1000;

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

  const results = [];
  const seen = new Set();
  const elapsed = { ms: 0 };

  while (elapsed.ms < WATCH_DURATION_MS) {
    const hero = await captureHero();
    if (hero?.city?.toLowerCase().includes('paris') && hero.name) {
      const key = `${hero.name}|${hero.city}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(hero);
        console.error(`Nouveau slide capturé : ${hero.name} — ${hero.amount}`);
      }
    }
    await sleep(POLL_INTERVAL_MS);
    elapsed.ms += POLL_INTERVAL_MS;
  }

  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();
