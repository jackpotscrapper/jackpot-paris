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

// ─────────────────────────────────────────────────────────────────────────────
// Stratégie carousel : on prend N snapshots espacés dans le temps et on
// associe chaque snapshot au label visible à cet instant.
// On collecte ainsi tous les jackpots même s'ils ne sont jamais tous
// affichés en même temps.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prend des snapshots réguliers pendant `totalMs` ms (toutes les `intervalMs` ms)
 * et appelle `snapshotFn(page)` → { label, amount } | null à chaque fois.
 * Retourne un objet { labelA: montant, labelB: montant, ... }
 */
async function carouselCapture(page, snapshotFn, totalMs = 20000, intervalMs = 800) {
  const collected = {};
  const deadline = Date.now() + totalMs;
  while (Date.now() < deadline) {
    const snap = await snapshotFn(page);
    if (snap && snap.label && snap.amount) {
      // Garder le plus grand montant vu pour chaque label
      if (!collected[snap.label] || toNum(snap.amount) > toNum(collected[snap.label])) {
        collected[snap.label] = snap.amount;
      }
    }
    await sleep(intervalMs);
  }
  return collected;
}

// ─── 1. Imperial Club Paris ───────────────────────────────────────────────────
// Le carousel affiche : label (MINOR / MAJOR / ULTIMATE) + montant
// On lit le label visible et le montant visible à chaque tick
const imperialSnapshot = async (page) => page.evaluate(() => {
  // Cherche un élément feuille qui contient UN seul mot-clé jackpot + UN montant
  let label = null;
  let amount = null;
  const toNum = (s) => parseInt((s || '').replace(/[^\d]/g, ''), 10) || 0;

  document.querySelectorAll('*').forEach(el => {
    if (el.children.length > 2) return;
    const t = el.textContent.trim();
    if (!t) return;
    const hasAmount = t.match(/\d[\d\s.,]*\s*€/);
    if (!hasAmount) return;
    const amt = toNum(hasAmount[0]);
    if (amt < 500) return;

    if (t.includes('MINOR'))    label = 'blackjack_minor';
    else if (t.includes('MAJOR')) label = 'blackjack_major';
    else if (t.includes('Ultimate') || t.includes('ULTIMATE')) label = 'ultimate';

    if (label) {
      const m = t.match(/(\d[\d\s.,]*)\s*€/);
      if (m) amount = m[1].trim().replace(/\s+/g, ' ') + ' €';
    }
  });
  return label && amount ? { label, amount } : null;
});

// ─── 2. Club Barrière Paris ───────────────────────────────────────────────────
const barriereSnapshot = async (page) => page.evaluate(() => {
  let label = null;
  let amount = null;
  const toNum = (s) => parseInt((s || '').replace(/[^\d]/g, ''), 10) || 0;

  document.querySelectorAll('*').forEach(el => {
    if (el.children.length > 2) return;
    const t = el.textContent.trim();
    if (!t) return;
    const hasAmount = t.match(/\d[\d\s.,]*\s*€/);
    if (!hasAmount) return;
    const amt = toNum(hasAmount[0]);
    if (amt < 1000) return;

    if (t.includes('Blackjack') || t.includes('BLACKJACK')) label = 'blackjack';
    else if (t.includes('Ultimate') || t.includes('ULTIMATE') || t.includes('UTH')) label = 'ultimate';

    if (label) {
      const m = t.match(/(\d[\d\s.,]*)\s*€/);
      if (m) amount = m[1].trim().replace(/\s+/g, ' ') + ' €';
    }
  });
  return label && amount ? { label, amount } : null;
});

// ─── 3. Paris Élysées Club ────────────────────────────────────────────────────
const elyseesSnapshot = async (page) => page.evaluate(() => {
  let label = null;
  let amount = null;
  const toNum = (s) => parseInt((s || '').replace(/[^\d]/g, ''), 10) || 0;

  document.querySelectorAll('*').forEach(el => {
    if (el.children.length > 2) return;
    const t = el.textContent.trim();
    if (!t) return;
    const hasAmount = t.match(/\d[\d\s.,]*\s*€/);
    if (!hasAmount) return;
    const amt = toNum(hasAmount[0]);
    if (amt < 1000) return;

    if (t.includes('Blackjack') || t.includes('BLACKJACK') || t.includes('BJ')) label = 'blackjack';
    else if (t.includes('Ultimate') || t.includes('ULTIMATE') || t.includes('UTH')) label = 'ultimate';

    if (label) {
      const m = t.match(/(\d[\d\s.,]*)\s*€/);
      if (m) amount = m[1].trim().replace(/\s+/g, ' ') + ' €';
    }
  });
  return label && amount ? { label, amount } : null;
});

// ─── 4. Club Circus Paris ─────────────────────────────────────────────────────
const circusSnapshot = async (page) => page.evaluate(() => {
  let label = null;
  let amount = null;
  const toNum = (s) => parseInt((s || '').replace(/[^\d]/g, ''), 10) || 0;

  document.querySelectorAll('*').forEach(el => {
    if (el.children.length > 2) return;
    const t = el.textContent.trim();
    if (!t) return;
    const hasAmount = t.match(/\d[\d\s.,]*\s*€/);
    if (!hasAmount) return;
    const amt = toNum(hasAmount[0]);
    if (amt < 5000) return; // mises min à ~20 €, vrais jackpots > 5 000 €

    if (t.includes('Blazing') || t.includes('BLAZING') ||
        t.includes('Blackjack') || t.includes('BLACKJACK')) label = 'blazing_blackjack';
    else if (t.includes('UTH') || t.includes('Progressive') ||
             t.includes('Ultimate') || t.includes('PROGRESSIVE')) label = 'uth_progressive';

    if (label) {
      const m = t.match(/(\d[\d\s.,]*)\s*€/);
      if (m) amount = m[1].trim().replace(/\s+/g, ' ') + ' €';
    }
  });
  return label && amount ? { label, amount } : null;
});

// ─── 5. Club Pierre Charron ───────────────────────────────────────────────────
const pierreCharronSnapshot = async (page) => page.evaluate(() => {
  let label = null;
  let amount = null;
  const toNum = (s) => parseInt((s || '').replace(/[^\d]/g, ''), 10) || 0;

  document.querySelectorAll('*').forEach(el => {
    if (el.children.length > 2) return;
    const t = el.textContent.trim();
    if (!t) return;
    const hasAmount = t.match(/\d[\d\s.,]*\s*€/);
    if (!hasAmount) return;
    const amt = toNum(hasAmount[0]);
    if (amt < 100) return;

    // Tester MAJOR avant MINOR pour éviter le faux-match "MAJOR" dans un bloc "MINOR+MAJOR"
    if      (t.includes('MAJOR') && !t.includes('MINOR') && !t.includes('Ultimate')) label = 'blackjack_major';
    else if (t.includes('MINOR') && !t.includes('MAJOR') && !t.includes('Ultimate')) label = 'blackjack_minor';
    else if ((t.includes('Ultimate') || t.includes('ULTIMATE')) && !t.includes('MINOR') && !t.includes('MAJOR')) label = 'ultimate';

    if (label) {
      const m = t.match(/(\d[\d\s.,]*)\s*€/);
      if (m) amount = m[1].trim().replace(/\s+/g, ' ') + ' €';
    }
  });
  return label && amount ? { label, amount } : null;
});

// ─── Configuration des clubs ──────────────────────────────────────────────────

const clubs = [
  {
    id: 'imperial',
    name: 'Imperial Club Paris',
    url: 'https://imperialclubparis.com/',
    snapshotFn: imperialSnapshot,
    waitBefore: 2000,
    captureMs: 22000, // ~2-3 cycles de carousel
  },
  {
    id: 'barriere',
    name: 'Club Barrière Paris',
    url: 'https://www.casinosbarriere.com/paris',
    snapshotFn: barriereSnapshot,
    waitBefore: 4000,
    captureMs: 18000,
  },
  {
    id: 'elyseesclub',
    name: 'Paris Élysées Club',
    url: 'https://www.pariselyseesclub.com/',
    snapshotFn: elyseesSnapshot,
    waitBefore: 3000,
    captureMs: 18000,
  },
  {
    id: 'circus',
    name: 'Club Circus Paris',
    url: 'https://www.circuscasino.fr/fr/casinos/paris/',
    snapshotFn: circusSnapshot,
    waitBefore: 4000,
    captureMs: 22000,
  },
  {
    id: 'pierrecharron',
    name: 'Club Pierre Charron',
    url: 'https://www.clubpierrecharron.com/',
    snapshotFn: pierreCharronSnapshot,
    waitBefore: 5000,
    captureMs: 22000,
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
    await page.goto(club.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Attendre le rendu initial
    await sleep(club.waitBefore);

    // Capturer le carousel sur la durée
    console.log(`  ⏱  Capture carousel pendant ${club.captureMs / 1000}s…`);
    const data = await carouselCapture(page, club.snapshotFn, club.captureMs, 800);

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

  console.log(`\n✅  latest.json sauvegardé → ${outPath}`);
  console.log(JSON.stringify(output, null, 2));
}

main().catch(err => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
