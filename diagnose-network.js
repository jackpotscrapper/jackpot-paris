// diagnose-network.js
// Diagnostic réseau + DOM : liste toutes les requêtes XHR/fetch de la page
// et les éléments contenant "jackpot", pour retrouver où sont chargés les montants.
// Usage : DIAGNOSE_URL=https://... node diagnose-network.js

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const URL_TO_TEST = process.env.DIAGNOSE_URL;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const KEYWORDS = /jackpot|progressive|meter|amount|blackjack|ultimate|blazing|cagnotte/i;

(async () => {
  if (!URL_TO_TEST) {
    console.error('DIAGNOSE_URL manquant');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  );

  const seen = [];

  page.on('response', async (response) => {
    try {
      const req = response.request();
      const type = req.resourceType();
      if (type !== 'xhr' && type !== 'fetch' && type !== 'document') return;

      const url = response.url();
      const status = response.status();
      const ctype = response.headers()['content-type'] || '';
      let body = '';
      try {
        body = await response.text();
      } catch (e) {
        body = '(corps illisible)';
      }

      const interesting = KEYWORDS.test(url) || KEYWORDS.test(body.slice(0, 20000));
      const limit = interesting ? 6000 : 300;

      seen.push({ type, status, url, ctype, interesting, body: body.slice(0, limit) });
    } catch (e) {
      // ignore
    }
  });

  console.log('=== Chargement :', URL_TO_TEST);
  try {
    await page.goto(URL_TO_TEST, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) {
    console.log('goto warning :', e.message);
  }

  console.log('Titre de la page :', await page.title());

  // Laisse le temps aux widgets JS de charger les jackpots
  await sleep(8000);

  // Scroll pour déclencher d'éventuels chargements paresseux (lazy-load)
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 250));
    }
    window.scrollTo(0, 0);
  });
  await sleep(5000);

  console.log('\n=== REQUÊTES XHR / FETCH / DOCUMENT (' + seen.length + ') ===');
  for (const s of seen) {
    console.log(
      `\n[${s.type}] ${s.status} ${s.interesting ? '*** INTÉRESSANT ***' : ''}\n  URL : ${s.url}\n  Content-Type : ${s.ctype}`
    );
    if (s.interesting) console.log('  Corps :\n' + s.body);
  }

  const dom = await page.evaluate(() => {
    const out = { elements: [], euroLines: [], jackpotSectionText: '' };

    // Éléments dont la classe / l'id contient "jackpot"
    document.querySelectorAll('[class*="jackpot" i], [id*="jackpot" i]').forEach((el) => {
      out.elements.push({
        tag: el.tagName,
        id: el.id,
        cls: el.className && el.className.toString ? el.className.toString() : '',
        text: (el.innerText || '').trim().slice(0, 200),
        html: el.outerHTML.slice(0, 600),
      });
    });

    // Toutes les lignes de texte contenant un montant en euros
    (document.body.innerText || '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /€/.test(l))
      .forEach((l) => out.euroLines.push(l));

    // Texte autour du titre "jackpot"
    const headings = [...document.querySelectorAll('h1,h2,h3,h4,p,span,div')].filter((el) =>
      /jackpot/i.test(el.childNodes.length === 1 ? el.textContent : '')
    );
    if (headings[0]) {
      const parent = headings[0].closest('section') || headings[0].parentElement;
      out.jackpotSectionText = parent ? parent.outerHTML.slice(0, 3000) : '';
    }
    return out;
  });

  console.log('\n=== ÉLÉMENTS "jackpot" DANS LE DOM (' + dom.elements.length + ') ===');
  dom.elements.slice(0, 40).forEach((e, i) => {
    console.log(`\n#${i} <${e.tag}> id="${e.id}" class="${e.cls}"\n  texte : ${e.text}\n  html : ${e.html}`);
  });

  console.log('\n=== LIGNES DE TEXTE CONTENANT € (' + dom.euroLines.length + ') ===');
  dom.euroLines.slice(0, 60).forEach((l) => console.log('  ' + l));

  console.log('\n=== SECTION JACKPOT (HTML) ===');
  console.log(dom.jackpotSectionText || '(aucune)');

  await browser.close();
})().catch((e) => {
  console.error('ERREUR FATALE :', e);
  process.exit(1);
});
