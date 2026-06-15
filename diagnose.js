const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();

  console.log('=== DIAGNOSTIC BARRIERE v6 (payload.json complet) ===');

  let payloadUrl = null;
  let payloadBody = null;

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('_payload.json')) {
      payloadUrl = url;
      try {
        payloadBody = await response.text();
      } catch(e) {}
    }
  });

  await page.goto('https://www.casinosbarriere.com/paris', {
    waitUntil: 'networkidle2', timeout: 60000
  });

  console.log('URL payload:', payloadUrl);

  if (payloadBody) {
    // Chercher les montants jackpot (format: 107 793 ou 107793)
    const amounts = payloadBody.match(/.{0,60}\d{2,3}[\s\u00a0\\u00a0]\d{3}.{0,60}/g) || [];
    console.log(`\n--- Montants trouvés (${amounts.length}) ---`);
    amounts.forEach(m => console.log(' ', m));

    // Chercher "jackpot" dans le payload
    const jackpots = payloadBody.match(/.{0,80}[Jj]ackpot.{0,80}/g) || [];
    console.log(`\n--- Occurrences "jackpot" (${jackpots.length}) ---`);
    jackpots.slice(0, 30).forEach(m => console.log(' ', m));

    // Chercher "amount" ou "montant"
    const amountFields = payloadBody.match(/.{0,60}[Aa]mount.{0,60}/g) || [];
    console.log(`\n--- Champs "amount" (${amountFields.length}) ---`);
    amountFields.slice(0, 20).forEach(m => console.log(' ', m));

    // Chercher "ultimate" ou "blackjack"
    const games = payloadBody.match(/.{0,80}(ultimate|blackjack|black.jack|Ultimate|BlackJack).{0,80}/gi) || [];
    console.log(`\n--- Noms de jeux (${games.length}) ---`);
    games.slice(0, 20).forEach(m => console.log(' ', m));
  } else {
    console.log('Payload non capturé');
  }

  await browser.close();
  console.log('\n=== FIN ===');
})();
