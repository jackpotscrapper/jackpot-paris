const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const SITES = [
  { id: 'montmartre', url: 'https://www.clubmontmartre-paris.com/', wait: 5000 },
];

const KEYWORDS = ['minor','major','ultimate','blackjack','blazing','uth','progressive','jackpot','poker','montant','gain'];

async function diagnoseSite(browser, site) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  await page.setRequestInterception(true);
  page.on('request', req => ['image','font','media'].includes(req.resourceType()) ? req.abort() : req.continue());

  console.log(`\n${'='.repeat(70)}`);
  console.log(`SITE: ${site.id} — ${site.url}`);
  console.log('='.repeat(70));

  await page.goto(site.url, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(site.wait);

  const frames = page.frames();
  console.log(`\nFrames disponibles (${frames.length}):`);
  frames.forEach((f, i) => console.log(`  [${i}] ${f.url().slice(0, 100)}`));

  for (let fi = 0; fi < frames.length; fi++) {
    const frame = frames[fi];
    try {
      const hits = await frame.evaluate((KEYWORDS) => {
        const toNum = s => parseInt((s||'').replace(/[^\d]/g,''),10)||0;
        const results = [];

        document.querySelectorAll('*').forEach(el => {
          if (el.children.length > 5) return;
          const own = el.textContent.trim();
          if (!own || own.length > 200) return;

          const low = own.toLowerCase();
          const hasKw = KEYWORDS.some(k => low.includes(k));
          const hasAmt = /\d[\d\s.,]*\s*€/.test(own);

          if (!hasKw && !hasAmt) return;

          let path = '';
          let cur = el;
          let depth = 0;
          while (cur && depth < 5) {
            const tag = cur.tagName ? cur.tagName.toLowerCase() : '';
            const cls = cur.className && typeof cur.className === 'string'
              ? '.' + cur.className.trim().split(/\s+/).slice(0,2).join('.')
              : '';
            const id = cur.id ? '#' + cur.id : '';
            path = `${tag}${id}${cls}` + (path ? ' > ' + path : '');
            cur = cur.parentElement;
            depth++;
          }

          results.push({
            path: path.slice(0, 120),
            text: own.slice(0, 80),
            hasKw,
            hasAmt,
            amtVal: hasAmt ? toNum(own.match(/(\d[\d\s.,]*)\s*€/)[0]) : 0,
          });
        });

        return results;
      }, KEYWORDS);

      if (hits.length) {
        console.log(`\n  Frame [${fi}] — ${hits.length} éléments pertinents:`);
        hits.forEach(h => {
          const flags = [h.hasKw ? 'KW' : '  ', h.hasAmt ? `AMT:${h.amtVal}` : '      '].join(' ');
          console.log(`    [${flags}] "${h.text}"`);
          console.log(`           ${h.path}`);
        });
      }
    } catch(e) {
      console.log(`  Frame [${fi}] — erreur: ${e.message}`);
    }
  }

  await page.close();
}

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu']
  });

  for (const site of SITES) {
    await diagnoseSite(browser, site).catch(e => console.error(`ERREUR ${site.id}:`, e.message));
  }

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
