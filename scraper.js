const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || '.';

// page.waitForTimeout a été supprimé dans Puppeteer v23+
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Configuration des 5 clubs ────────────────────────────────────────────────

const clubs = [
  {
    id: 'imperial',
    name: 'Imperial Club Paris',
    url: 'https://imperialclubparis.com/',
    waitMs: 2000,
    extract: async (page) => {
      await sleep(2000);
      return await page.evaluate(() => {
        let blackjack_minor = null;
        let blackjack_major = null;
        let ultimate = null;

        document.querySelectorAll('*').forEach(el => {
          const text = el.textContent.trim();
          if (!text || el.children.length > 10) return;

          if (text.includes('MINOR') && text.match(/\d[\d\s.,]*\s*€/)) {
            const match = text.match(/(\d[\d\s.,]*)\s*€/);
            if (match) blackjack_minor = match[1].trim().replace(/\s+/g, ' ') + ' €';
          }
          if (text.includes('MAJOR') && text.match(/\d[\d\s.,]*\s*€/)) {
            const match = text.match(/(\d[\d\s.,]*)\s*€/);
            if (match) blackjack_major = match[1].trim().replace(/\s+/g, ' ') + ' €';
          }
          if ((text.includes('Ultimate') || text.includes('ULTIMATE')) && text.match(/\d[\d\s.,]*\s*€/)) {
            const match = text.match(/(\d[\d\s.,]*)\s*€/);
            if (match) ultimate = match[1].trim().replace(/\s+/g, ' ') + ' €';
          }
        });

        return { blackjack_minor, blackjack_major, ultimate };
      });
    }
  },

  {
    id: 'barriere',
    name: 'Club Barrière Paris',
    url: 'https://www.casinosbarriere.com/paris',
    waitMs: 6000,
    extract: async (page) => {
      // Le carousel alterne toutes les 5s → attendre jusqu'à 12s pour capturer les 2 jackpots
      await sleep(6000);

      const first = await page.evaluate(() => {
        let blackjack = null;
        let ultimate = null;

        document.querySelectorAll('*').forEach(el => {
          const text = el.textContent.trim();
          if (!text || el.children.length > 10) return;

          if ((text.includes('Blackjack') || text.includes('BLACKJACK')) && text.match(/\d[\d\s.,]*\s*€/)) {
            const match = text.match(/(\d[\d\s.,]*)\s*€/);
            if (match) blackjack = match[1].trim().replace(/\s+/g, ' ') + ' €';
          }
          if ((text.includes('Ultimate') || text.includes('ULTIMATE') || text.includes('UTH') || text.includes('Poker')) && text.match(/\d[\d\s.,]*\s*€/)) {
            const match = text.match(/(\d[\d\s.,]*)\s*€/);
            if (match) ultimate = match[1].trim().replace(/\s+/g, ' ') + ' €';
          }
        });
        return { blackjack, ultimate };
      });

      // Si un jackpot manque, attendre le prochain slide du carousel
      if (!first.blackjack || !first.ultimate) {
        await sleep(6000);
        const second = await page.evaluate(() => {
          let blackjack = null;
          let ultimate = null;
          document.querySelectorAll('*').forEach(el => {
            const text = el.textContent.trim();
            if (!text || el.children.length > 10) return;
            if ((text.includes('Blackjack') || text.includes('BLACKJACK')) && text.match(/\d[\d\s.,]*\s*€/)) {
              const match = text.match(/(\d[\d\s.,]*)\s*€/);
              if (match) blackjack = match[1].trim().replace(/\s+/g, ' ') + ' €';
            }
            if ((text.includes('Ultimate') || text.includes('ULTIMATE') || text.includes('UTH') || text.includes('Poker')) && text.match(/\d[\d\s.,]*\s*€/)) {
              const match = text.match(/(\d[\d\s.,]*)\s*€/);
              if (match) ultimate = match[1].trim().replace(/\s+/g, ' ') + ' €';
            }
          });
          return { blackjack, ultimate };
        });
        return {
          blackjack: first.blackjack || second.blackjack,
          ultimate: first.ultimate || second.ultimate
        };
      }

      return first;
    }
  },

  {
    id: 'elyseesclub',
    name: 'Paris Élysées Club',
    url: 'https://www.pariselyseesclub.com/',
    waitMs: 3000,
    extract: async (page) => {
      await sleep(3000);
      return await page.evaluate(() => {
        let blackjack = null;
        let ultimate = null;

        document.querySelectorAll('*').forEach(el => {
          const text = el.textContent.trim();
          if (!text || el.children.length > 10) return;

          if ((text.includes('Blackjack') || text.includes('BLACKJACK') || text.includes('BJ')) && text.match(/\d[\d\s.,]*\s*€/)) {
            const match = text.match(/(\d[\d\s.,]*)\s*€/);
            if (match) blackjack = match[1].trim().replace(/\s+/g, ' ') + ' €';
          }
          if ((text.includes('Ultimate') || text.includes('ULTIMATE') || text.includes('UTH') || text.includes('Poker')) && text.match(/\d[\d\s.,]*\s*€/)) {
            const match = text.match(/(\d[\d\s.,]*)\s*€/);
            if (match) ultimate = match[1].trim().replace(/\s+/g, ' ') + ' €';
          }
        });

        return { blackjack, ultimate };
      });
    }
  },

  {
    id: 'circus',
    name: 'Club Circus Paris',
    url: 'https://www.circuscasino.fr/fr/casinos/paris/',
    waitMs: 4000,
    extract: async (page) => {
      // Site JS dynamique — attendre le rendu
      await sleep(4000);
      return await page.evaluate(() => {
        let blazing_blackjack = null;
        let uth_progressive = null;

        document.querySelectorAll('*').forEach(el => {
          const text = el.textContent.trim();
          if (!text || el.children.length > 10) return;

          if ((text.includes('Blazing') || text.includes('BLAZING') || text.includes('Blackjack')) && text.match(/\d[\d\s.,]*\s*€/)) {
            const match = text.match(/(\d[\d\s.,]*)\s*€/);
            if (match) blazing_blackjack = match[1].trim().replace(/\s+/g, ' ') + ' €';
          }
          if ((text.includes('UTH') || text.includes('Progressive') || text.includes('Ultimate') || text.includes('PROGRESSIVE')) && text.match(/\d[\d\s.,]*\s*€/)) {
            const match = text.match(/(\d[\d\s.,]*)\s*€/);
            if (match) uth_progressive = match[1].trim().replace(/\s+/g, ' ') + ' €';
          }
        });

        return { blazing_blackjack, uth_progressive };
      });
    }
  },

  {
    id: 'pierrecharron',
    name: 'Club Pierre Charron',
    url: 'https://www.clubpierrecharron.com/',
    waitMs: 5000,
    extract: async (page) => {
      // Widget JS en bas à droite — attendre le rendu complet
      await sleep(5000);
      return await page.evaluate(() => {
        let blackjack_minor = null;
        let blackjack_major = null;
        let ultimate = null;

        document.querySelectorAll('*').forEach(el => {
          const text = el.textContent.trim();
          if (!text || el.children.length > 10) return;

          if (text.includes('MINOR') && text.match(/\d[\d\s.,]*\s*€/)) {
            const match = text.match(/(\d[\d\s.,]*)\s*€/);
            if (match) blackjack_minor = match[1].trim().replace(/\s+/g, ' ') + ' €';
          }
          if (text.includes('MAJOR') && text.match(/\d[\d\s.,]*\s*€/)) {
            const match = text.match(/(\d[\d\s.,]*)\s*€/);
            if (match) blackjack_major = match[1].trim().replace(/\s+/g, ' ') + ' €';
          }
          if ((text.includes('Ultimate') || text.includes('ULTIMATE')) && text.match(/\d[\d\s.,]*\s*€/)) {
            const match = text.match(/(\d[\d\s.,]*)\s*€/);
            if (match) ultimate = match[1].trim().replace(/\s+/g, ' ') + ' €';
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
    // User-Agent réaliste pour éviter les blocages
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    // Bloquer images/fonts pour accélérer le chargement
    await page.setRequestInterception(true);
    page.on('request', req => {
      const type = req.resourceType();
      if (['image', 'font', 'media'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log(`  → Visite : ${club.url}`);
    await page.goto(club.url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

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
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const results = {};

  for (const club of clubs) {
    console.log(`\n[${club.id}] ${club.name}`);
    results[club.id] = await scrapeClub(browser, club);
  }

  await browser.close();

  // Sauvegarder latest.json
  const output = {
    ts: new Date().toISOString(),
    results
  };

  const outPath = path.join(DATA_DIR, 'latest.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n✅  latest.json sauvegardé → ${outPath}`);
  console.log(JSON.stringify(output, null, 2));
}

main().catch(err => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
