/**
 * scraper.js — Jackpots Paris v3.1
 * Sélecteurs exacts par club d'après diagnostic terrain
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || '.';
const OUTPUT = path.join(DATA_DIR, 'latest.json');

function log(club, msg) {
  console.log(`[${club}] ${msg}`);
}

const CLUBS = [

  // ── 1. IMPERIAL ──────────────────────────────────────────────────────────
  {
    id: 'imperial',
    name: 'Imperial Club Paris',
    url: 'https://imperialclubparis.com/',
    extract: async (page) => {
      await new Promise(r => setTimeout(r, 2500));

      return await page.evaluate(() => {
        let blackjack_minor = null;
        let blackjack_major = null;
        let ultimate = null;

        // Labels "MINOR xxx €" et "MAJOR xxx €" dans des nœuds texte directs
        const allText = [];
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null
        );
        let node;
        while ((node = walker.nextNode())) {
          const t = node.textContent.trim();
          if (t.length > 2) allText.push(t);
        }

        for (const t of allText) {
          if (/^MINOR\s+[\d.,\s]+€/i.test(t)) {
            const m = t.match(/([\d.,\s]+)\s*€/);
            if (m && !blackjack_minor) blackjack_minor = m[1].trim() + ' €';
          }
          if (/^MAJOR\s+[\d.,\s]+€/i.test(t)) {
            const m = t.match(/([\d.,\s]+)\s*€/);
            if (m && !blackjack_major) blackjack_major = m[1].trim() + ' €';
          }
        }

        // Ultimate : montant seul > 5 000, sans MINOR/MAJOR dans le nœud
        for (const t of allText) {
          if (/MINOR|MAJOR/i.test(t)) continue;
          const m = t.match(/^([\d.,\s]+)\s*€$/);
          if (m) {
            const val = parseFloat(m[1].replace(/[\s.]/g, '').replace(',', '.'));
            if (val > 5000 && !ultimate) ultimate = m[1].trim() + ' €';
          }
        }

        return { blackjack_minor, blackjack_major, ultimate };
      });
    }
  },

  // ── 2. BARRIÈRE ──────────────────────────────────────────────────────────
  {
    id: 'barriere',
    name: 'Club Barrière Paris',
    url: 'https://www.casinosbarriere.com/paris',
    extract: async (page) => {
      await new Promise(r => setTimeout(r, 2000));

      const result = { blackjack: null, ultimate: null };
      const deadline = Date.now() + 18000; // poll max 18 s (carousel ~5 s)

      while (Date.now() < deadline && (!result.blackjack || !result.ultimate)) {
        const snapshot = await page.evaluate(() => {
          const items = [];
          document.querySelectorAll('.CsnJackpot__amount, .CsnJackpot__name').forEach(el => {
            items.push({ cls: el.className, text: el.textContent.trim() });
          });
          return items;
        });

        let lastName = null;
        for (const item of snapshot) {
          if (item.cls.includes('CsnJackpot__name')) {
            lastName = item.text;
          } else if (item.cls.includes('CsnJackpot__amount') && lastName) {
            if (/blackjack/i.test(lastName) && !result.blackjack) result.blackjack = item.text;
            if (/ultimate|poker/i.test(lastName) && !result.ultimate) result.ultimate = item.text;
            lastName = null;
          }
        }

        if (!result.blackjack || !result.ultimate) {
          await new Promise(r => setTimeout(r, 3000));
        }
      }

      log('barriere', `blackjack=${result.blackjack} ultimate=${result.ultimate}`);
      return result;
    }
  },

  // ── 3. PARIS ÉLYSÉES ─────────────────────────────────────────────────────
  {
    id: 'elyseees',
    name: 'Paris Élysées Club',
    url: 'https://www.pariselyseesclub.com/',
    extract: async (page) => {
      await new Promise(r => setTimeout(r, 2000));

      return await page.evaluate(() => {
        let blackjack = null;
        let ultimate = null;

        // Structure exacte : article.jackpot-card > p.jackpot-label + p.jackpot-value
        document.querySelectorAll('article.jackpot-card').forEach(card => {
          const label = card.querySelector('p.jackpot-label')?.textContent.trim() || '';
          const value = card.querySelector('p.jackpot-value')?.textContent.trim() || '';
          if (/blackjack/i.test(label)) blackjack = value;
          if (/ultimate|poker/i.test(label)) ultimate = value;
        });

        return { blackjack, ultimate };
      });
    }
  },

  // ── 4. CIRCUS ────────────────────────────────────────────────────────────
  {
    id: 'circus',
    name: 'Club Circus Paris',
    url: 'https://www.circuscasino.fr/fr/casinos/paris/',
    extract: async (page) => {
      // Attente fin des compteurs animés
      await new Promise(r => setTimeout(r, 6000));

      return await page.evaluate(() => {
        let blazing_blackjack = null;
        let uth_progressive = null;

        const intro = document.querySelector('#intro');
        if (!intro) return { blazing_blackjack, uth_progressive };

        const rawText = intro.innerText || intro.textContent;

        // Extraire tous les montants > 1 000 €
        const numbers = [];
        const re = /(\d[\d\s.,]{2,})\s*€/g;
        let m;
        while ((m = re.exec(rawText)) !== null) {
          const val = parseFloat(m[1].replace(/[\s.]/g, '').replace(',', '.'));
          if (val > 1000) numbers.push({ raw: m[1].trim() + ' €', val });
        }

        // Les 2 plus grands = jackpots (ordre DOM : Blazing BJ puis UTH)
        numbers.sort((a, b) => b.val - a.val);
        if (numbers.length >= 1) blazing_blackjack = numbers[0].raw;
        if (numbers.length >= 2) uth_progressive = numbers[1].raw;

        return { blazing_blackjack, uth_progressive };
      });
    }
  },

  // ── 5. PIERRE CHARRON ────────────────────────────────────────────────────
  {
    id: 'pierre_charron',
    name: 'Club Pierre Charron',
    url: 'https://www.clubpierrecharron.com/',
    extract: async (page) => {
      await new Promise(r => setTimeout(r, 5000));

      try {
        await page.waitForSelector('.jackpot-widget-item', { timeout: 8000 });
      } catch {
        log('pierre_charron', 'widget non trouvé dans les temps');
      }

      return await page.evaluate(() => {
        let blackjack_minor = null;
        let blackjack_major = null;
        let ultimate = null;

        // .jackpot-widget-item avec .content.-multi → Blackjack (Minor + Méga)
        // .jackpot-widget-item sans .-multi → Ultimate Poker
        document.querySelectorAll('.jackpot-widget-item').forEach(item => {
          const isMulti = item.querySelector('.content.-multi') !== null ||
                          item.classList.contains('-multi');

          if (isMulti) {
            const text = item.innerText || item.textContent;
            const minorM = text.match(/MINOR[\s\S]*?([\d.,\s]+\s*€)/i);
            const majorM = text.match(/(MAJOR|M[ÉE]GA)[\s\S]*?([\d.,\s]+\s*€)/i);
            if (minorM) blackjack_minor = minorM[1].trim();
            if (majorM) blackjack_major = majorM[2].trim();
          } else {
            const amountEl = item.querySelector('[class*="amount"], [class*="value"], [class*="montant"]');
            if (amountEl) {
              ultimate = amountEl.textContent.trim();
            } else {
              const m = (item.innerText || item.textContent).match(/([\d.,\s]{4,})\s*€/);
              if (m) ultimate = m[1].trim() + ' €';
            }
          }
        });

        return { blackjack_minor, blackjack_major, ultimate };
      });
    }
  }
];

// ─── runner ───────────────────────────────────────────────────────────────────

async function scrape() {
  console.log('=== Jackpots Paris — scraping démarré ===');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1280,900'
    ]
  });

  const results = {};

  for (const club of CLUBS) {
    log(club.id, `→ ${club.url}`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    try {
      await page.goto(club.url, { waitUntil: 'networkidle2', timeout: 30000 });
      const data = await club.extract(page);
      results[club.id] = { ok: true, data };
      log(club.id, '✓ ' + JSON.stringify(data));
    } catch (err) {
      results[club.id] = { ok: false, error: err.message, data: {} };
      log(club.id, '✗ ' + err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();

  const payload = {
    ts: new Date().toISOString(),
    results
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`=== Écrit dans ${OUTPUT} ===`);
  console.log(JSON.stringify(payload, null, 2));
}

scrape().catch(err => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
