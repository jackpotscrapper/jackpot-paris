// diagnose-network.js (v2 — avec garde-fous anti-blocage)
// Diagnostic réseau + DOM : liste les requêtes XHR/fetch de la page
// et les éléments contenant "jackpot".
// Usage : DIAGNOSE_URL=https://... node diagnose-network.js

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const URL_TO_TEST = process.env.DIAGNOSE_URL;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (p, ms, fallback) =>
  Promise.race([p, new Promise((r) => setTimeout(() => r(fallback), ms))]);

const KEYWORDS = /jackpot|progressive|meter|amount|blackjack|ultimate|blazing|cagnotte/i;

// Garde-fou global : quoi qu'il arrive, le script se termine après 3 minutes
const hardStop = setTimeout(() => {
  console.log('\n!!! Garde-fou global (180 s) atteint : arrêt forcé');
  process.exit(0);
}, 180000);

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

  page.on('response', (response) => {
    (async () => {
      try {
        const req = response.request();
        const type = req.resourceType();
        if (type !== 'xhr' && type !== 'fetch' && type !== 'document') return;

        const url = response.url();
        const status = response.status();
        const ctype = response.headers()['content-type'] || '';
        // Ne pas lire les flux (SSE, etc.) : ils ne se terminent jamais
        if (/event-stream|octet-stream|video|audio/i.test(ctype)) {
          seen.push({ type, status, url, ctype, interesting: false, body: '(flux ignoré)' });
          return;
        }
        const body = await withTimeout(response.text().catch(() => '(illisible)'), 5000, '(timeout lecture)');
        const interesting = KEYWORDS.test(url) || KEYWORDS.test(body.slice(0, 20000));
        seen.push({ type, status, url, ctype, interesting, body: body.slice(0, interesting ? 6000 : 300) });
      } catch (e) {
        // ignore
      }
    })();
  });

  console.log('=== Chargement :', URL_TO_TEST);
  try {
    // domcontentloaded : networkidle peut ne jamais arriver sur des sites avec requêtes continues
    await page.goto(URL_TO_TEST, { waitUntil: 'domcontentloaded', timeout: 45000 });
  } catch (e) {
    console.log('goto warning :', e.message);
  }

  console.log('Titre de la page :', await withTimeout(page.title(), 5000, '(inconnu)'));

  await sleep(10000);

  // Scroll borné : 15 pas maximum, avec limite de temps
  await withTimeout(
    page.evaluate(async () => {
      for (let i = 0; i < 15; i++) {
        window.scrollBy(0, 700);
        await new Promise((r) => setTimeout(r, 300));
      }
      window.scrollTo(0, 0);
    }),
    10000,
    null
  );
  await sleep(5000);

  console.log('\n=== REQUÊTES XHR / FETCH / DOCUMENT (' + seen.length + ') ===');
  for (const s of seen) {
    console.log(
      `\n[${s.type}] ${s.status} ${s.interesting ? '*** INTÉRESSANT ***' : ''}\n  URL : ${s.url}\n  Content-Type : ${s.ctype}`
    );
    if (s.interesting) console.log('  Corps :\n' + s.body);
  }

  const dom = await withTimeout(
    page.evaluate(() => {
      const out = { elements: [], euroLines: [], jackpotSectionText: '' };

      document.querySelectorAll('[class*="jackpot" i], [id*="jackpot" i]').forEach((el) => {
        out.elements.push({
          tag: el.tagName,
          id: el.id,
          cls: el.className && el.className.toString ? el.className.toString() : '',
          text: (el.innerText || '').trim().slice(0, 200),
          html: el.outerHTML.slice(0, 600),
        });
      });

      (document.body.innerText || '')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => /€/.test(l))
        .forEach((l) => out.euroLines.push(l));

      const heading = [...document.querySelectorAll('h1,h2,h3,h4,p,span,div')].find(
        (el) => el.children.length === 0 && /jackpot/i.test(el.textContent || '')
      );
      if (heading) {
        const parent = heading.closest('section') || heading.parentElement;
        out.jackpotSectionText = parent ? parent.outerHTML.slice(0, 3000) : '';
      }
      return out;
    }),
    15000,
    { elements: [], euroLines: [], jackpotSectionText: '(évaluation DOM expirée)' }
  );

  console.log('\n=== ÉLÉMENTS "jackpot" DANS LE DOM (' + dom.elements.length + ') ===');
  dom.elements.slice(0, 40).forEach((e, i) => {
    console.log(`\n#${i} <${e.tag}> id="${e.id}" class="${e.cls}"\n  texte : ${e.text}\n  html : ${e.html}`);
  });

  console.log('\n=== LIGNES DE TEXTE CONTENANT € (' + dom.euroLines.length + ') ===');
  dom.euroLines.slice(0, 60).forEach((l) => console.log('  ' + l));

  console.log('\n=== SECTION JACKPOT (HTML) ===');
  console.log(dom.jackpotSectionText || '(aucune)');

  await withTimeout(browser.close().catch(() => {}), 10000, null);
  clearTimeout(hardStop);
  process.exit(0);
})().catch((e) => {
  console.error('ERREUR FATALE :', e);
  process.exit(1);
});
