// Script de diagnostic ponctuel — Club Barrière Paris
// On abandonne l'idée de faire tourner le carousel. À la place, on récupère
// le _payload.json brut (chargé au tout début, avant toute animation) et on
// cherche directement les occurrences de "Paris", "BlackJack", "Ultimate",
// "Majeur", "Mineur" dedans — si Nuxt envoie bien toutes les données du
// carousel d'un coup pour l'hydratation, tout devrait être là.
//
// Usage dans diagnose.yml : remplace temporairement diagnose.js par ce
// fichier.

const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const KEYWORDS = ['Paris', 'BlackJack', 'Ultimate', 'Majeur', 'Mineur', 'Jackpot'];
const CONTEXT_CHARS = 80; // caractères affichés avant/après chaque match

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    headless: 'new',
  });

  const page = await browser.newPage();

  let payloadText = null;

  page.on('response', async (response) => {
    if (response.url().includes('_payload.json')) {
      try {
        const text = await response.text();
        // On garde le plus gros payload capturé (au cas où il y en ait plusieurs)
        if (!payloadText || text.length > payloadText.length) {
          payloadText = text;
        }
      } catch (e) {}
    }
  });

  await page.goto('https://www.casinosbarriere.com/paris', {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  await sleep(3000);

  if (!payloadText) {
    console.log('Aucun _payload.json capturé.');
    await browser.close();
    return;
  }

  console.log(`Payload capturé : ${payloadText.length} caractères\n`);

  for (const keyword of KEYWORDS) {
    const regex = new RegExp(keyword, 'gi');
    let match;
    let count = 0;
    console.log(`\n--- Occurrences de "${keyword}" ---`);
    while ((match = regex.exec(payloadText)) !== null && count < 15) {
      const start = Math.max(0, match.index - CONTEXT_CHARS);
      const end = Math.min(payloadText.length, match.index + CONTEXT_CHARS);
      console.log(`[${match.index}] ...${payloadText.slice(start, end)}...`);
      count++;
    }
    if (count === 0) console.log('(aucune occurrence)');
  }

  await browser.close();
})();
