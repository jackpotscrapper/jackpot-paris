const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || '.';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── 1. Imperial Club Paris ───────────────────────────────────────────────────
async function scrapeImperial(page) {
  await sleep(3000);
  return page.evaluate(() => {
    const clean = (raw) => {
      const d = (raw || '').replace(/[^\d]/g, '');
      if (!d || parseInt(d, 10) < 100) return null;
      return parseInt(d, 10).toLocaleString('fr-FR') + ' €';
    };
    let blackjack_minor = null, blackjack_major = null, ultimate = null;

    document.querySelectorAll('*').forEach(el => {
      if (el.children.length > 3) return;
      const t = el.textContent.trim();
      if (!t || t.length > 60) return;
      if (/^MINOR\s+[\d.,\s]+€/.test(t)) {
        const m = t.match(/[\d.,]+/); if (m) blackjack_minor = clean(m[0]);
      }
      if (/^MAJOR\s+[\d.,\s]+€/.test(t)) {
        const m = t.match(/[\d.,]+/); if (m) blackjack_major = clean(m[0]);
      }
    });

    document.querySelectorAll('*').forEach(el => {
      if (el.children.length > 3) return;
      const t = el.textContent.trim();
      if (!t || t.length > 30) return;
      if (t.includes('MINOR') || t.includes('MAJOR')) return;
      if (/^[\d.,\s]+€$/.test(t)) {
        const n = parseInt(t.replace(/[^\d]/g, ''), 10);
        if (n > 5000) ultimate = clean(t);
      }
    });
    return { blackjack_minor, blackjack_major, ultimate };
  });
}

// ─── 2. Club Barrière Paris ───────────────────────────────────────────────────
// Les jackpots sont dans le _payload.json Nuxt (tableau aplati).
// Format : "NomJeu","MONTANT" en paires adjacentes dans le JSON.
async function scrapeBarriere(page) {
  let payloadBody = null;

  page.on('response', async (response) => {
    if (response.url().includes('_payload.json')) {
      try { payloadBody = await response.text(); } catch (e) {}
    }
  });

  await page.goto('https://www.casinosbarriere.com/paris', {
    waitUntil: 'networkidle2', timeout: 60000
  });

  if (!payloadBody) throw new Error('Barriere: _payload.json non capturé');

  const clean = (raw) => {
    if (!raw) return null;
    const d = raw.replace(/[^\d]/g, '');
    if (!d || parseInt(d, 10) < 100) return null;
    return parseInt(d, 10).toLocaleString('fr-FR') + ' €';
  };

  const jackpots = {};

  // Chercher toutes les paires "NomJeu","MONTANT" dans le payload Nuxt aplati.
  // Le nom peut contenir apostrophes et accents (ex: "Ultimate Texas Hold'Em")
  const regex = /"([^"]{3,50})","(\d{4,6})"/g;
  let m;
  while ((m = regex.exec(payloadBody)) !== null) {
    const name = m[1].toLowerCase();
    if (name.includes('black') || name.includes('ultimate') ||
        name.includes('minor') || name.includes('hold')) {
      jackpots[name] = m[2];
    }
  }

  console.log('  Barriere jackpots bruts:', JSON.stringify(jackpots));

  let ultimate = null, blackjack_major = null, blackjack_minor = null;
  for (const [name, amount] of Object.entries(jackpots)) {
    if (name.includes('ultimate') || name.includes('hold'))    ultimate        = clean(amount);
    else if (name.includes('minor'))                           blackjack_minor = clean(amount);
    else if (name.includes('black') || name.includes('jack')) blackjack_major = clean(amount);
  }

  return { ultimate, blackjack_major, blackjack_minor };
}

// ─── 3. Paris Élysées Club ────────────────────────────────────────────────────
async function scrapeElysees(page) {
  await sleep(3000);
  return page.evaluate(() => {
    const clean = (raw) => {
      const d = (raw || '').replace(/[^\d]/g, '');
      if (!d || parseInt(d, 10) < 100) return null;
      return parseInt(d, 10).toLocaleString('fr-FR') + ' €';
    };
    const result = { blackjack: null, ultimate: null };
    document.querySelectorAll('article.jackpot-card').forEach(card => {
      const label = card.querySelector('p.jackpot-label');
      const value = card.querySelector('p.jackpot-value');
      if (!label || !value) return;
      const lbl = label.textContent.trim().toUpperCase();
      const amt = clean(value.textContent.trim());
      if (!amt) return;
      if (lbl.includes('BLACKJACK')) result.blackjack = amt;
      else if (lbl.includes('ULTIMATE')) result.ultimate = amt;
    });
    return result;
  });
}

// ─── 4. Club Circus Paris ─────────────────────────────────────────────────────
async function scrapeCircus(page) {
  await sleep(7000);
  return page.evaluate(() => {
    const intro = document.querySelector('#intro');
    if (!intro) return { blazing_blackjack: null, uth_progressive: null };

    const amounts = new Set();

    intro.querySelectorAll('*').forEach(el => {
      ['value','target','count','number','amount','final'].forEach(attr => {
        const v = el.dataset[attr];
        if (!v) return;
        const n = parseFloat(v.replace(/[^0-9.]/g, ''));
        if (n > 1000 && n < 10000000) amounts.add(Math.floor(n));
      });
    });

    const seen = new WeakSet();
    const walker = document.createTreeWalker(intro, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const t = node.textContent.trim();
      if (!/^[\d\s.,]+$/.test(t) || t.length === 0) continue;
      let el = node.parentElement;
      for (let i = 0; i < 4 && el && el !== intro; i++, el = el.parentElement) {
        if (seen.has(el)) continue;
        seen.add(el);
        const raw = el.innerText || el.textContent || '';
        const matches = [...raw.matchAll(/(\d[\d\s.]*),(\d{2})/g)];
        matches.forEach(m => {
          const n = parseInt(m[1].replace(/[\s.]/g, ''), 10);
          if (n > 1000 && n < 10000000) amounts.add(n);
        });
        const intMatches = [...raw.matchAll(/\b(\d{2}\s?\d{3})\b/g)];
        intMatches.forEach(m => {
          const n = parseInt(m[1].replace(/\s/g, ''), 10);
          if (n > 5000 && n < 10000000) amounts.add(n);
        });
      }
    }

    if (amounts.size < 2) {
      const raw = intro.innerText || intro.textContent || '';
      const matches = [...raw.matchAll(/(\d[\d\s.]*),(\d{2})/g)];
      matches.forEach(m => {
        const n = parseInt(m[1].replace(/[\s.]/g, ''), 10);
        if (n > 1000 && n < 10000000) amounts.add(n);
      });
    }

    const sorted = [...amounts].sort((a, b) => b - a);
    return {
      uth_progressive:   sorted[0] ? sorted[0].toLocaleString('fr-FR') + ' €' : null,
      blazing_blackjack: sorted[1] ? sorted[1].toLocaleString('fr-FR') + ' €' : null,
    };
  });
}

// ─── 5. Club Pierre Charron ───────────────────────────────────────────────────
async function scrapePierreCharron(page) {
  await sleep(6000);
  return page.evaluate(() => {
    const clean = (raw) => {
      if (!raw) return null;
      const d = raw.replace(/[^\d]/g, '');
      if (!d || parseInt(d, 10) < 100) return null;
      return parseInt(d, 10).toLocaleString('fr-FR') + ' €';
    };
    const result = { blackjack_minor: null, blackjack_major: null, ultimate: null };

    const multiItem = document.querySelector('.jackpot-widget-item .content.-multi');
    if (multiItem) {
      multiItem.querySelectorAll('.jackpot-aside-amount').forEach(aside => {
        const titleEl = aside.querySelector('.jackpot-title');
        const amtEl   = aside.querySelector('.jackpot-small');
        if (!titleEl || !amtEl) return;
        const title = titleEl.textContent.trim().toLowerCase();
        const amt   = clean(amtEl.textContent.trim());
        if (title.includes('minor')) result.blackjack_minor = amt;
        if (title.includes('méga') || title.includes('mega') || title.includes('major')) result.blackjack_major = amt;
      });
      if (!result.blackjack_major) {
        const mainAmt = multiItem.querySelector('.jackpot-main-amount');
        if (mainAmt) {
          const cloned = mainAmt.cloneNode(true);
          cloned.querySelectorAll('.jackpot-aside-amount').forEach(e => e.remove());
          const v = clean(cloned.textContent.trim());
          if (v) result.blackjack_major = v;
        }
      }
    }

    document.querySelectorAll('.jackpot-widget-item').forEach(item => {
      if (item.querySelector('.content.-multi')) return;
      const amtEl = item.querySelector('.jackpot-main-amount');
      if (amtEl) {
        const v = clean(amtEl.textContent.trim());
        if (v) result.ultimate = v;
      }
    });

    return result;
  });
}

// ─── 6. Club Montmartre Paris ─────────────────────────────────────────────────
async function scrapeMontmartre(page) {
  await sleep(4000);
  return page.evaluate(() => {
    const clean = (raw) => {
      if (!raw) return null;
      const m = raw.match(/([\d\s]+),\d{2}/);
      if (m) {
        const n = parseInt(m[1].replace(/\s/g, ''), 10);
        if (n < 100) return null;
        return n.toLocaleString('fr-FR') + ' €';
      }
      const d = raw.replace(/[^\d]/g, '');
      if (!d || parseInt(d, 10) < 100) return null;
      return parseInt(d, 10).toLocaleString('fr-FR') + ' €';
    };

    const result = { mega_blackjack: null, mega_ultimate: null, minor: null };

    const minorEl = document.querySelector('span.jk-meter-amount.minor');
    if (minorEl) result.minor = clean(minorEl.textContent.trim());

    let megaIndex = 0;
    document.querySelectorAll('div.jk-card').forEach(card => {
      const labelEl = card.querySelector('span.jk-meter-label');
      const amtEl = card.querySelector('span.jk-meter-amount:not(.minor)');
      if (!labelEl || !amtEl) return;
      const label = labelEl.textContent.trim().toLowerCase();
      const amt   = clean(amtEl.textContent.trim());
      if (!amt) return;
      if (label.includes('mega') || label.includes('jackpot')) {
        if (megaIndex === 0) result.mega_ultimate  = amt;
        if (megaIndex === 1) result.mega_blackjack = amt;
        megaIndex++;
      }
    });

    return result;
  });
}

// ─── Scraper principal ────────────────────────────────────────────────────────
const clubs = [
  { id: 'imperial',      name: 'Imperial Club Paris',    url: 'https://imperialclubparis.com/',                scrapeFn: scrapeImperial },
  { id: 'barriere',      name: 'Club Barrière Paris',    url: 'https://www.casinosbarriere.com/paris',         scrapeFn: scrapeBarriere },
  { id: 'elyseesclub',   name: 'Paris Élysées Club',     url: 'https://www.pariselyseesclub.com/',             scrapeFn: scrapeElysees },
  { id: 'circus',        name: 'Club Circus Paris',      url: 'https://www.circuscasino.fr/fr/casinos/paris/', scrapeFn: scrapeCircus },
  { id: 'pierrecharron', name: 'Club Pierre Charron',    url: 'https://www.clubpierrecharron.com/',            scrapeFn: scrapePierreCharron },
  { id: 'montmartre',    name: 'Club Montmartre Paris',  url: 'https://www.clubmontmartre-paris.com/',         scrapeFn: scrapeMontmartre },
];

async function scrapeClubOnce(browser, club) {
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    // Barrière : ne pas bloquer les requêtes — on a besoin du _payload.json
    if (club.id !== 'barriere') {
      await page.setRequestInterception(true);
      page.on('request', req => {
        if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
        else req.continue();
      });
    }
    const timeout   = club.id === 'pierrecharron' ? 90000 : 60000;
    const waitUntil = club.id === 'pierrecharron' ? 'domcontentloaded' : 'networkidle2';
    await page.goto(club.url, { waitUntil, timeout });
    return await club.scrapeFn(page);
  } finally {
    await page.close();
  }
}

async function scrapeClub(browser, club) {
  const maxRetries = 2;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  → ${club.url}${attempt > 1 ? ' (tentative ' + attempt + ')' : ''}`);
      const data = await scrapeClubOnce(browser, club);
      console.log(`  ✓ ${club.name} :`, JSON.stringify(data));
      return { ok: true, data };
    } catch (err) {
      console.error(`  ✗ ${club.name} tentative ${attempt} : ${err.message}`);
      if (attempt === maxRetries) {
        return { ok: false, error: err.message, data: {} };
      }
      console.log(`  ↻ Nouvelle tentative dans 5s...`);
      await sleep(5000);
    }
  }
}

async function main() {
  console.log('🎰  Jackpots Paris — ' + new Date().toISOString());

  const outPath = path.join(DATA_DIR, 'latest.json');
  let previousResults = {};
  try {
    const prev = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    previousResults = prev.results || {};
    console.log('  📂 Données précédentes chargées');
  } catch (_) {}

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const results = {};
  for (const club of clubs) {
    console.log(`\n[${club.id}]`);
    const result = await scrapeClub(browser, club);

    if (!result.ok && previousResults[club.id] && previousResults[club.id].ok) {
      console.log(`  ↩  Échec — conservation des dernières valeurs connues pour ${club.name}`);
      results[club.id] = {
        ok: false,
        stale: true,
        error: result.error,
        data: previousResults[club.id].data
      };
    } else {
      results[club.id] = result;
    }
  }

  await browser.close();
  const output = { ts: new Date().toISOString(), results };
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log('\n✅  latest.json sauvegardé');
  console.log(JSON.stringify(output, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
