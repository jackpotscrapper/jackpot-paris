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
// Site refondu (été 2026) : toujours du Nuxt, mais payload Nuxt 3 (format
// "devalue" imbriqué, plus l'ancien tableau JSON plat de Nuxt 2). Le carousel
// visuel qui affiche les jackpots un par un ne tourne pas de façon fiable
// sous Puppeteer (probablement lié à une vidéo de fond par slide) — on
// ignore complètement l'animation et on lit directement les jackpots
// progressifs déjà présents dans le payload au chargement :
// Majeur | BlackJack, Mineur | BlackJack, Ultimate Texas Hold'Em.
// (Il existe aussi un "Royale | BlackJack" dans le payload, volontairement ignoré.)
// Comme le payload est capturé sur /paris (page dédiée à ce club), pas besoin
// de filtrer par ville.
async function scrapeBarriere(page) {
  let payloadBody = null;

  page.on('response', async (response) => {
    if (response.url().includes('_payload.json')) {
      try {
        const text = await response.text();
        if (!payloadBody || text.length > payloadBody.length) payloadBody = text;
      } catch (e) {}
    }
  });

  await page.goto('https://www.casinosbarriere.com/paris', {
    waitUntil: 'networkidle2', timeout: 60000
  });

  await sleep(2000);

  if (!payloadBody) throw new Error('Barriere: _payload.json non capturé');

  const clean = (raw) => {
    const num = parseFloat(raw);
    if (isNaN(num) || num < 100) return null;
    return Math.floor(num).toLocaleString('fr-FR') + ' €';
  };

  // Chaque jackpot suit ce schéma dans le payload aplati :
  // "Nom du jackpot","montant.brut",{"_uid":N,"name":N+1,"amount":N+2,"component":289}
  // (le jackpot "vedette" a un tag texte en plus avant l'objet - géré par le (?:...)? optionnel)
  const regex = /"([^"]{3,60})","(\d+(?:\.\d+)?)",(?:"[a-zA-Z]+",)?\{"_uid":\d+,"name":\d+,"amount":\d+,"component":289\}/g;

  const result = {
    ultimate: null,
    blackjack_major: null,
    blackjack_minor: null,
  };

  let m;
  while ((m = regex.exec(payloadBody)) !== null) {
    const name = m[1].toLowerCase();
    const amount = m[2];
    if (name.includes('ultimate') || name.includes('hold'))     result.ultimate = clean(amount);
    else if (name.includes('majeur'))                            result.blackjack_major = clean(amount);
    else if (name.includes('mineur'))                            result.blackjack_minor = clean(amount);
    // 'royale' volontairement ignoré
  }

  console.log('  Barriere jackpots bruts:', JSON.stringify(result));

  if (!result.blackjack_major && !result.blackjack_minor) {
    throw new Error('Barriere: aucun jackpot capturé');
  }

  return result;
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
// Les jackpots sont chargés via un appel API externe : /api/AtlasSign/GetMeters
// L'URL de base est un tunnel Cloudflare (dynamique) — on intercepte la réponse.
async function scrapeMontmartre(page) {
  let metersData = null;

  page.on('response', async (response) => {
    if (response.url().includes('AtlasSign/GetMeters')) {
      try {
        const text = await response.text();
        metersData = JSON.parse(text);
      } catch (e) {}
    }
  });

  await page.goto('https://www.clubmontmartre-paris.com/', {
    waitUntil: 'networkidle2', timeout: 60000
  });

  // Attendre un peu au cas où l'appel API arrive après networkidle2
  await sleep(3000);

  if (!metersData) throw new Error('Montmartre: GetMeters non capturé');

  const clean = (formattedValue) => {
    if (!formattedValue) return null;
    // Format source : "105.284,90 €" → on garde la partie entière en fr-FR
    const n = parseInt(formattedValue.replace(/[^\d]/g, ''), 10);
    if (!n || n < 100) return null;
    // Diviser par 100 car la valeur est en centimes (Value=10528490 → 105 284,90 €)
    return Math.floor(n / 100).toLocaleString('fr-FR') + ' €';
  };

  const groups = metersData['$values'] || [];
  const result = { mega_ultimate: null, mega_blackjack: null, minor: null };

  for (const group of groups) {
    const name = (group.MeterGroupName || '').toLowerCase();
    const meters = group.liveMeters?.['$values'] || [];

    for (const meter of meters) {
      const formatted = meter.FormattedValue || '';
      const amount = clean(formatted);

      if (name.includes('ultimate') || name.includes('hold')) {
        result.mega_ultimate = amount;
      } else if (name.includes('blazing') || name.includes('blackjack') || name.includes('black')) {
        if (meter.MeterIndex === 1) result.mega_blackjack = amount;
        if (meter.MeterIndex === 2) result.minor = amount;
      }
    }
  }

  console.log('  Montmartre meters bruts:', JSON.stringify(result));
  return result;
}

// ─── 7. Partouche Pasino Club ─────────────────────────────────────────────────
// Jackpots via l'API appolonia-api.partouche.com (site_id 00066).
// Le nom du jeu est dans le champ "name" de la réponse, pas dans le path de
// l'URL (trompeur : /uth/ retourne en fait les compteurs Blackjack "Blazing 7's").
// Ultimate Poker : endpoint pas encore branché côté Partouche (club ouvert le
// 12/05/2026) — renvoie null en attendant, sans faire échouer le scrape.
async function scrapePasino(page) {
  const responses = [];

  page.on('response', async (response) => {
    if (response.url().includes('appolonia-api.partouche.com/site/00066') &&
        response.url().includes('progressive/amount')) {
      try {
        const json = await response.json();
        responses.push(json);
      } catch (e) {}
    }
  });

  await page.goto('https://www.partouchepasinoclub.com/', {
    waitUntil: 'networkidle2', timeout: 60000
  });

  await sleep(3000);

  const clean = (value) => {
    if (typeof value !== 'number' || value < 100) return null;
    return Math.floor(value).toLocaleString('fr-FR') + ' €';
  };

  const result = { ultimate: null, blackjack_major: null, blackjack_minor: null };

  for (const json of responses) {
    const entry = json?.data?.[0];
    if (!entry?.meters) continue;
    const name = (entry.name || '').toLowerCase();
    if (name.includes('blazing') || name.includes('black')) {
      result.blackjack_major = clean(entry.meters[0]?.value);
      result.blackjack_minor = clean(entry.meters[1]?.value);
    } else if (name.includes('ultimate') || name.includes('uth') || name.includes('hold')) {
      result.ultimate = clean(entry.meters[0]?.value);
    }
  }

  if (!result.blackjack_major) {
    throw new Error('Pasino: aucun jackpot capturé');
  }

  console.log('  Pasino jackpots bruts:', JSON.stringify(result));
  return result;
}

// ─── Scraper principal ────────────────────────────────────────────────────────
const clubs = [
  { id: 'pasino',        name: 'Partouche Pasino Club',  url: 'https://www.partouchepasinoclub.com/',          scrapeFn: scrapePasino },
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
    // Barrière et Montmartre : ne pas bloquer les requêtes réseau
    // (Barrière a besoin du _payload.json, Montmartre de l'appel GetMeters)
    if (club.id !== 'barriere' && club.id !== 'montmartre' && club.id !== 'pasino') {
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
  const maxRetries = club.id === 'pierrecharron' ? 3 : 2;
  const retryDelay = club.id === 'pierrecharron' ? 10000 : 5000;
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
      console.log(`  ↻ Nouvelle tentative dans ${retryDelay / 1000}s...`);
      await sleep(retryDelay);
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
