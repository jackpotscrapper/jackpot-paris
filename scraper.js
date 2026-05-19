const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || '.';

// page.waitForTimeout supprimé dans Puppeteer v23+
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Convertit "1 203 €" / "1.203 €" / "1,203 €" en nombre entier
const toNum = (str) =>
  parseInt(str.replace(/[^\d]/g, ''), 10) || 0;

// Extrait le plus grand montant >= minVal trouvé dans un bloc de texte
const bestMatch = (text, minVal = 1000) => {
  const matches = [...text.matchAll(/(\d[\d\s.,]*)\s*€/g)];
  let best = null;
  for (const m of matches) {
    const candidate = m[1].trim().replace(/\s+/g, ' ') + ' €';
    if (toNum(candidate) >= minVal && (!best || toNum(candidate) > toNum(best)))
      best = candidate;
  }
  return best;
};

// ─── Configuration des 5 clubs ────────────────────────────────────────────────

const clubs = [
  // ── 1. Imperial Club Paris ────────────────────────────────────────────────
  {
    id: 'imperial',
    name: 'Imperial Club Paris',
    url: 'https://imperialclubparis.com/',
    extract: async (page) => {
      await sleep(2000);
      return await page.evaluate(() => {
        const toNum = (s) => parseInt(s.replace(/[^\d]/g, ''), 10) || 0;
        const bestMatch = (text, min = 1000) => {
          const ms = [...text.matchAll(/(\d[\d\s.,]*)\s*€/g)];
          let best = null;
          for (const m of ms) {
            const c = m[1].trim().replace(/\s+/g, ' ') + ' €';
            if (toNum(c) >= min && (!best || toNum(c) > toNum(best))) best = c;
          }
          return best;
        };

        let blackjack_minor = null;
        let blackjack_major = null;
        let ultimate = null;

        document.querySelectorAll('*').forEach(el => {
          const text = el.textContent.trim();
          if (!text || el.children.length > 10) return;

          if (text.includes('MINOR')) {
            const v = bestMatch(text, 100);
            if (v && (!blackjack_minor || toNum(v) > toNum(blackjack_minor))) blackjack_minor = v;
          }
          if (text.includes('MAJOR')) {
            const v = bestMatch(text, 100);
            if (v && (!blackjack_major || toNum(v) > toNum(blackjack_major))) blackjack_major = v;
          }
          if (text.includes('Ultimate') || text.includes('ULTIMATE')) {
            const v = bestMatch(text, 1000);
            if (v && (!ultimate || toNum(v) > toNum(ultimate))) ultimate = v;
          }
        });

        return { blackjack_minor, blackjack_major, ultimate };
      });
    }
  },

  // ── 2. Club Barrière Paris ────────────────────────────────────────────────
  // Problème : "6 000 €" est une limite de table, le vrai jackpot BJ est > 10 000 €
  {
    id: 'barriere',
    name: 'Club Barrière Paris',
    url: 'https://www.casinosbarriere.com/paris',
    extract: async (page) => {
      await sleep(6000);

      const grab = () => page.evaluate(() => {
        const toNum = (s) => parseInt(s.replace(/[^\d]/g, ''), 10) || 0;
        const bestMatch = (text, min) => {
          const ms = [...text.matchAll(/(\d[\d\s.,]*)\s*€/g)];
          let best = null;
          for (const m of ms) {
            const c = m[1].trim().replace(/\s+/g, ' ') + ' €';
            if (toNum(c) >= min && (!best || toNum(c) > toNum(best))) best = c;
          }
          return best;
        };

        let blackjack = null;
        let ultimate = null;

        document.querySelectorAll('*').forEach(el => {
          const text = el.textContent.trim();
          if (!text || el.children.length > 10) return;

          // Seuil 10 000 € pour BJ (élimine les limites de table ~6 000 €)
          if (text.includes('Blackjack') || text.includes('BLACKJACK')) {
            const v = bestMatch(text, 10000);
            if (v && (!blackjack || toNum(v) > toNum(blackjack))) blackjack = v;
          }
          if (text.includes('Ultimate') || text.includes('ULTIMATE') || text.includes('UTH')) {
            const v = bestMatch(text, 1000);
            if (v && (!ultimate || toNum(v) > toNum(ultimate))) ultimate = v;
          }
        });

        return { blackjack, ultimate };
      });

      const first = await grab();

      // Carousel : attendre le 2e slide si un jackpot manque
      if (!first.blackjack || !first.ultimate) {
        await sleep(6000);
        const second = await grab();
        return {
          blackjack: first.blackjack || second.blackjack,
          ultimate:  first.ultimate  || second.ultimate
        };
      }

      return first;
    }
  },

  // ── 3. Paris Élysées Club ─────────────────────────────────────────────────
  {
    id: 'elyseesclub',
    name: 'Paris Élysées Club',
    url: 'https://www.pariselyseesclub.com/',
    extract: async (page) => {
      await sleep(3000);
      return await page.evaluate(() => {
        const toNum = (s) => parseInt(s.replace(/[^\d]/g, ''), 10) || 0;
        const bestMatch = (text, min = 1000) => {
          const ms = [...text.matchAll(/(\d[\d\s.,]*)\s*€/g)];
          let best = null;
          for (const m of ms) {
            const c = m[1].trim().replace(/\s+/g, ' ') + ' €';
            if (toNum(c) >= min && (!best || toNum(c) > toNum(best))) best = c;
          }
          return best;
        };

        let blackjack = null;
        let ultimate = null;

        document.querySelectorAll('*').forEach(el => {
          const text = el.textContent.trim();
          if (!text || el.children.length > 10) return;

          if (text.includes('Blackjack') || text.includes('BLACKJACK') || text.includes('BJ')) {
            const v = bestMatch(text, 1000);
            if (v && (!blackjack || toNum(v) > toNum(blackjack))) blackjack = v;
          }
          if (text.includes('Ultimate') || text.includes('ULTIMATE') || text.includes('UTH')) {
            const v = bestMatch(text, 1000);
            if (v && (!ultimate || toNum(v) > toNum(ultimate))) ultimate = v;
          }
        });

        return { blackjack, ultimate };
      });
    }
  },

  // ── 4. Club Circus Paris ──────────────────────────────────────────────────
  // Problème : "20 €" = mise minimum — seuil monté à 5 000 €
  {
    id: 'circus',
    name: 'Club Circus Paris',
    url: 'https://www.circuscasino.fr/fr/casinos/paris/',
    extract: async (page) => {
      await sleep(5000);
      return await page.evaluate(() => {
        const toNum = (s) => parseInt(s.replace(/[^\d]/g, ''), 10) || 0;
        const bestMatch = (text, min = 5000) => {
          const ms = [...text.matchAll(/(\d[\d\s.,]*)\s*€/g)];
          let best = null;
          for (const m of ms) {
            const c = m[1].trim().replace(/\s+/g, ' ') + ' €';
            if (toNum(c) >= min && (!best || toNum(c) > toNum(best))) best = c;
          }
          return best;
        };

        let blazing_blackjack = null;
        let uth_progressive = null;

        document.querySelectorAll('*').forEach(el => {
          const text = el.textContent.trim();
          if (!text || el.children.length > 10) return;

          if (text.includes('Blazing') || text.includes('BLAZING') ||
              text.includes('Blackjack') || text.includes('BLACKJACK')) {
            const v = bestMatch(text, 5000);
            if (v && (!blazing_blackjack || toNum(v) > toNum(blazing_blackjack))) blazing_blackjack = v;
          }
          if (text.includes('UTH') || text.includes('Progressive') ||
              text.includes('Ultimate') || text.includes('PROGRESSIVE')) {
            const v = bestMatch(text, 5000);
            if (v && (!uth_progressive || toNum(v) > toNum(uth_progressive))) uth_progressive = v;
          }
        });

        return { blazing_blackjack, uth_progressive };
      });
    }
  },

  // ── 5. Club Pierre Charron ────────────────────────────────────────────────
  // Problème : MAJOR contient MINOR dans le texte, et les montants se croisent
  // Solution : tester MAJOR avant MINOR, et chercher le mot-clé dans un périmètre
  // de texte restreint (élément feuille ou quasi-feuille)
  {
    id: 'pierrecharron',
    name: 'Club Pierre Charron',
    url: 'https://www.clubpierrecharron.com/',
    extract: async (page) => {
      await sleep(5000);
      return await page.evaluate(() => {
        const toNum = (s) => parseInt(s.replace(/[^\d]/g, ''), 10) || 0;
        const bestMatch = (text, min = 1000) => {
          const ms = [...text.matchAll(/(\d[\d\s.,]*)\s*€/g)];
          let best = null;
          for (const m of ms) {
            const c = m[1].trim().replace(/\s+/g, ' ') + ' €';
            if (toNum(c) >= min && (!best || toNum(c) > toNum(best))) best = c;
          }
          return best;
        };

        let blackjack_minor = null;
        let blackjack_major = null;
        let ultimate = null;

        // Cibler uniquement les éléments feuilles ou quasi-feuilles (peu d'enfants)
        // pour éviter que les blocs parents "contiennent" plusieurs jackpots à la fois
        document.querySelectorAll('*').forEach(el => {
          const text = el.textContent.trim();
          if (!text || el.children.length > 3) return; // plus strict : max 3 enfants

          // MAJOR d'abord (évite qu'un bloc "MAJOR ... MINOR" matche les deux)
          if (text.includes('MAJOR') && !text.includes('MINOR')) {
            const v = bestMatch(text, 1000);
            if (v && (!blackjack_major || toNum(v) > toNum(blackjack_major))) blackjack_major = v;
          }
          // MINOR uniquement si pas de MAJOR dans le même bloc
          if (text.includes('MINOR') && !text.includes('MAJOR')) {
            const v = bestMatch(text, 100);
            if (v && (!blackjack_minor || toNum(v) > toNum(blackjack_minor))) blackjack_minor = v;
          }
          if ((text.includes('Ultimate') || text.includes('ULTIMATE')) &&
              !text.includes('MINOR') && !text.includes('MAJOR')) {
            const v = bestMatch(text, 1000);
            if (v && (!ultimate || toNum(v) > toNum(ultimate))) ultimate = v;
          }
        });

        return { blackjack_minor, blackjack_major, ultimate };
      });
    }
  }
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

    const data = await club.extract(page);
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
