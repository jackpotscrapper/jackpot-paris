const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || '.';
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const toNum = (s) => parseInt((s || '').replace(/[^\d]/g, ''), 10) || 0;

// Extrait le plus grand montant >= min dans un texte
const bestAmount = (text, min = 500) => {
  const ms = [...text.matchAll(/(\d[\d\s.,]*)\s*€/g)];
  let best = null;
  for (const m of ms) {
    const c = m[1].trim().replace(/\s+/g, ' ') + ' €';
    if (toNum(c) >= min && (!best || toNum(c) > toNum(best))) best = c;
  }
  return best;
};

// ─── Carousel : snapshots toutes les 800ms ────────────────────────────────────
async function carouselCapture(page, snapshotFn, totalMs = 22000, intervalMs = 800) {
  const collected = {};
  const deadline = Date.now() + totalMs;
  while (Date.now() < deadline) {
    const snap = await snapshotFn(page).catch(() => null);
    if (snap) {
      for (const [label, amount] of Object.entries(snap)) {
        if (amount && toNum(amount) > toNum(collected[label] || '0')) {
          collected[label] = amount;
        }
      }
    }
    await sleep(intervalMs);
  }
  return collected;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stratégie "siblings" : quand le label et le montant sont dans des éléments
// frères ou dans le parent immédiat, on remonte au parent et on cherche
// label + montant dans l'ensemble du bloc.
// ─────────────────────────────────────────────────────────────────────────────
const siblingStrategy = (keywords, min = 500) => async (page) => {
  return page.evaluate((keywords, min) => {
    const toNum = (s) => parseInt((s || '').replace(/[^\d]/g, ''), 10) || 0;
    const result = {};

    // Pour chaque élément contenant un mot-clé jackpot
    document.querySelectorAll('*').forEach(el => {
      const ownText = el.textContent.trim();
      if (!ownText) return;

      for (const [label, kws] of Object.entries(keywords)) {
        const hasKw = kws.some(kw => ownText.toUpperCase().includes(kw.toUpperCase()));
        if (!hasKw) continue;

        // Chercher le montant dans : l'élément lui-même, ses siblings, son parent
        const candidates = [el];
        if (el.parentElement) {
          candidates.push(el.parentElement);
          // siblings
          Array.from(el.parentElement.children).forEach(c => candidates.push(c));
        }

        for (const node of candidates) {
          const t = node.textContent.trim();
          const m = [...t.matchAll(/(\d[\d\s.,]*)\s*€/g)];
          for (const match of m) {
            const c = match[1].trim().replace(/\s+/g, ' ') + ' €';
            if (toNum(c) >= min && (!result[label] || toNum(c) > toNum(result[label]))) {
              result[label] = c;
            }
          }
        }
      }
    });

    // Retourner seulement les labels trouvés à ce tick
    return Object.keys(result).length ? result : null;
  }, keywords, min);
};

// ─── 1. Imperial Club Paris ───────────────────────────────────────────────────
// Carousel : MINOR → MAJOR → ULTIMATE, label et montant parfois en siblings
// Ultimate manquant → on cherche aussi dans les siblings
const imperialSnap = siblingStrategy({
  blackjack_minor: ['MINOR'],
  blackjack_major: ['MAJOR'],
  ultimate:        ['ULTIMATE', 'Ultimate Poker'],
}, 500);

// ─── 2. Club Barrière Paris ───────────────────────────────────────────────────
// Fonctionne déjà bien avec siblings, seuil 10 000 pour BJ
const barriereSnap = siblingStrategy({
  blackjack: ['Blackjack', 'BLACKJACK'],
  ultimate:  ['Ultimate', 'ULTIMATE', 'UTH'],
}, 1000);

// ─── 3. Paris Élysées Club ────────────────────────────────────────────────────
// BJ manquant → siblings
const elyseesSnap = siblingStrategy({
  blackjack: ['Blackjack', 'BLACKJACK', 'Black Jack'],
  ultimate:  ['Ultimate', 'ULTIMATE', 'UTH'],
}, 500);

// ─── 4. Club Circus Paris ─────────────────────────────────────────────────────
// Pas de carousel : compteurs animés toujours visibles.
// Les 2 jackpots sont affichés en permanence → un seul snapshot suffit.
// Seuil bas (100) car on ne sait pas la valeur min exacte,
// mais on prend le PLUS GRAND montant associé à chaque label.
const circusSnap = async (page) => page.evaluate(() => {
  const toNum = (s) => parseInt((s || '').replace(/[^\d]/g, ''), 10) || 0;

  // Chercher tous les éléments contenant un montant >= 1000
  // et un mot-clé jackpot dans leur voisinage immédiat
  const result = {};

  const allEls = Array.from(document.querySelectorAll('*'));

  allEls.forEach(el => {
    const t = el.textContent.trim();
    if (!t) return;

    // Blazing Blackjack
    if ((t.includes('Blazing') || t.includes('blazing') ||
         (t.includes('Blackjack') && !t.includes('Ultimate'))) ) {
      // chercher un montant dans le bloc et ses siblings
      const scope = [el];
      if (el.parentElement) Array.from(el.parentElement.children).forEach(c => scope.push(c));
      for (const node of scope) {
        const nt = node.textContent.trim();
        const ms = [...nt.matchAll(/(\d[\d\s.,]*)\s*€/g)];
        for (const m of ms) {
          const c = m[1].trim().replace(/\s+/g, ' ') + ' €';
          if (toNum(c) >= 1000 && (!result.blazing_blackjack || toNum(c) > toNum(result.blazing_blackjack)))
            result.blazing_blackjack = c;
        }
      }
    }

    // UTH Progressive
    if (t.includes('UTH') || t.includes('Progressive') || t.includes('progressive') ||
        (t.includes('Ultimate') && t.includes('Hold'))) {
      const scope = [el];
      if (el.parentElement) Array.from(el.parentElement.children).forEach(c => scope.push(c));
      for (const node of scope) {
        const nt = node.textContent.trim();
        const ms = [...nt.matchAll(/(\d[\d\s.,]*)\s*€/g)];
        for (const m of ms) {
          const c = m[1].trim().replace(/\s+/g, ' ') + ' €';
          if (toNum(c) >= 1000 && (!result.uth_progressive || toNum(c) > toNum(result.uth_progressive)))
            result.uth_progressive = c;
        }
      }
    }
  });

  return Object.keys(result).length ? result : null;
});

// ─── 5. Club Pierre Charron ───────────────────────────────────────────────────
// Widget bas-droite, potentiellement dans une iframe.
// Stratégie : chercher dans toutes les frames disponibles.
const pierreCharronSnap = async (page) => {
  // Récupérer toutes les frames (page principale + iframes éventuelles)
  const frames = page.frames();

  for (const frame of frames) {
    try {
      const result = await frame.evaluate(() => {
        const toNum = (s) => parseInt((s || '').replace(/[^\d]/g, ''), 10) || 0;
        const found = {};

        document.querySelectorAll('*').forEach(el => {
          const t = el.textContent.trim();
          if (!t) return;

          const scope = [el];
          if (el.parentElement) Array.from(el.parentElement.children).forEach(c => scope.push(c));

          const getAmount = (min) => {
            for (const node of scope) {
              const nt = node.textContent.trim();
              const ms = [...nt.matchAll(/(\d[\d\s.,]*)\s*€/g)];
              for (const m of ms) {
                const c = m[1].trim().replace(/\s+/g, ' ') + ' €';
                if (toNum(c) >= min) return c;
              }
            }
            return null;
          };

          if (t.includes('MAJOR') && !t.includes('MINOR')) {
            const v = getAmount(500);
            if (v && (!found.blackjack_major || toNum(v) > toNum(found.blackjack_major)))
              found.blackjack_major = v;
          }
          if (t.includes('MINOR') && !t.includes('MAJOR')) {
            const v = getAmount(100);
            if (v && (!found.blackjack_minor || toNum(v) > toNum(found.blackjack_minor)))
              found.blackjack_minor = v;
          }
          if ((t.includes('Ultimate') || t.includes('ULTIMATE')) &&
              !t.includes('MINOR') && !t.includes('MAJOR')) {
            const v = getAmount(500);
            if (v && (!found.ultimate || toNum(v) > toNum(found.ultimate)))
              found.ultimate = v;
          }
        });

        return Object.keys(found).length ? found : null;
      });

      if (result && Object.keys(result).length >= 1) return result;
    } catch (_) {}
  }
  return null;
};

// ─── Configuration des clubs ──────────────────────────────────────────────────
const clubs = [
  {
    id: 'imperial',
    name: 'Imperial Club Paris',
    url: 'https://imperialclubparis.com/',
    waitBefore: 2000,
    mode: 'carousel',
    snapshotFn: imperialSnap,
    captureMs: 25000,
  },
  {
    id: 'barriere',
    name: 'Club Barrière Paris',
    url: 'https://www.casinosbarriere.com/paris',
    waitBefore: 4000,
    mode: 'carousel',
    snapshotFn: barriereSnap,
    captureMs: 20000,
  },
  {
    id: 'elyseesclub',
    name: 'Paris Élysées Club',
    url: 'https://www.pariselyseesclub.com/',
    waitBefore: 3000,
    mode: 'carousel',
    snapshotFn: elyseesSnap,
    captureMs: 22000,
  },
  {
    id: 'circus',
    name: 'Club Circus Paris',
    url: 'https://www.circuscasino.fr/fr/casinos/paris/',
    waitBefore: 5000,
    mode: 'static',   // compteurs toujours visibles, pas de carousel
    snapshotFn: circusSnap,
    captureMs: 0,
  },
  {
    id: 'pierrecharron',
    name: 'Club Pierre Charron',
    url: 'https://www.clubpierrecharron.com/',
    waitBefore: 6000,
    mode: 'carousel',
    snapshotFn: pierreCharronSnap,
    captureMs: 25000,
  },
];

// ─── Scraper principal ────────────────────────────────────────────────────────
async function scrapeClub(browser, club) {
  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
      else req.continue();
    });

    console.log(`  → Visite : ${club.url}`);
    await page.goto(club.url, { waitUntil: 'networkidle2', timeout: 45000 });
    await sleep(club.waitBefore);

    let data;
    if (club.mode === 'static') {
      // Circus : compteurs toujours visibles, 3 tentatives pour laisser les animations se stabiliser
      data = null;
      for (let i = 0; i < 3 && !data; i++) {
        await sleep(2000);
        data = await club.snapshotFn(page).catch(() => null);
      }
      data = data || {};
    } else {
      // Carousel : polling sur la durée
      console.log(`  ⏱  Capture carousel ${club.captureMs / 1000}s…`);
      data = await carouselCapture(page, club.snapshotFn, club.captureMs);
    }

    console.log(`  ✓ ${club.name} :`, JSON.stringify(data));
    return { ok: true, data };

  } catch (err) {
    console.error(`  ✗ ${club.name} : ${err.message}`);
    return { ok: false, error: err.message, data: {} };
  } finally {
    await page.close();
  }
}

async function main() {
  console.log('🎰  Jackpots Paris — début du scraping');
  console.log(`    ${new Date().toISOString()}\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const results = {};
  for (const club of clubs) {
    console.log(`\n[${club.id}] ${club.name}`);
    results[club.id] = await scrapeClub(browser, club);
  }

  await browser.close();

  const output = { ts: new Date().toISOString(), results };
  const outPath = path.join(DATA_DIR, 'latest.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n✅  latest.json → ${outPath}`);
  console.log(JSON.stringify(output, null, 2));
}

main().catch(err => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
