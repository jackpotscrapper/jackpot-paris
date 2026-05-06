/**
 * scraper.js — Jackpots Paris
 * Exécuté par le Cron Job Render (toutes les heures).
 * Scrape les 5 clubs et écrit le résultat dans /data/latest.json
 *
 * Variables d'environnement Render :
 *   ANTHROPIC_API_KEY=sk-ant-api03-...
 */

require('dotenv').config();
const fetch = require('node-fetch');
const fs    = require('fs');
const path  = require('path');

// Dossier partagé avec le web service via le Persistent Disk Render
// Sur Render, montez le disque sur /data dans les deux services
const DATA_DIR  = process.env.DATA_DIR || '/tmp';
const DATA_FILE = path.join(DATA_DIR, 'latest.json');

// ─── Clubs ───────────────────────────────────────────────────────────────────

const CLUBS = [
  {
    id: 'imperial',
    name: 'Imperial Club Paris',
    prompt: `Fetch https://imperialclubparis.com/ and extract the current jackpot amounts displayed on the page.
Return ONLY a JSON object (no markdown, no explanation):
{"blackjack_minor": "...", "blackjack_major": "...", "ultimate": "..."}
Use null if a value is not visible. Include the € sign and spaces (e.g. "3 104 €").`
  },
  {
    id: 'barriere',
    name: 'Club Barrière Paris',
    prompt: `Fetch https://www.casinosbarriere.com/paris and extract the current jackpot amounts.
The page has a carousel alternating Blackjack and Ultimate Poker jackpots — BOTH values are present in the HTML simultaneously.
Look carefully for ALL jackpot amounts including those in hidden carousel slides.
Return ONLY a JSON object (no markdown, no explanation):
{"blackjack": "...", "ultimate": "..."}
Use null if a value is truly absent. Include the € sign (e.g. "48 344 €").`
  },
  {
    id: 'elysees',
    name: 'Paris Élysées Club',
    prompt: `Fetch https://www.pariselyseesclub.com/ and extract the current progressive jackpot amounts for Blackjack and Ultimate Poker.
Return ONLY a JSON object (no markdown, no explanation):
{"blackjack": "...", "ultimate": "..."}
Use null if a value is not visible. Include the € sign.`
  },
  {
    id: 'circus',
    name: 'Club Circus Paris',
    prompt: `Fetch https://www.circuscasino.fr/fr/casinos/paris/ and find jackpot amounts for UTH Progressive (Ultimate Poker) and Blazing Blackjack.
Return ONLY a JSON object (no markdown, no explanation):
{"blackjack": "...", "ultimate": "..."}
Use null if no amount is visible. Include the € sign.`
  },
  {
    id: 'pierrecharron',
    name: 'Club Pierre Charron',
    prompt: `Fetch https://www.clubpierrecharron.com/ and extract the current progressive jackpot amounts for Blackjack (Minor and Major) and Ultimate Poker.
Return ONLY a JSON object (no markdown, no explanation):
{"blackjack_minor": "...", "blackjack_major": "...", "ultimate": "..."}
Use null if a value is not visible. Include the € sign (e.g. "4 230 €").`
  }
];

// ─── Appel Anthropic ──────────────────────────────────────────────────────────

async function fetchJackpotForClub(club) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 400,
      tools:      [{ type: 'web_search_20250305', name: 'web_search' }],
      system:     'You are a web scraping assistant. Always respond with ONLY a valid JSON object — no markdown, no preamble.',
      messages:   [{ role: 'user', content: club.prompt }]
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
  return JSON.parse(text.replace(/```json|```/gi, '').trim());
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const ts      = new Date().toISOString();
  const results = {};

  console.log(`[${ts}] Scraping des jackpots...`);

  await Promise.allSettled(
    CLUBS.map(async (club) => {
      try {
        const data = await fetchJackpotForClub(club);
        results[club.id] = { ok: true, data };
        console.log(`  ✓ ${club.name}`, JSON.stringify(data));
      } catch (e) {
        results[club.id] = { ok: false, error: e.message };
        console.error(`  ✗ ${club.name}: ${e.message}`);
      }
    })
  );

  // Écriture sur le disque partagé
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify({ ts, results }, null, 2));

  console.log(`[${ts}] latest.json mis à jour.`);
}

main().catch(e => {
  console.error('Erreur fatale:', e);
  process.exit(1);
});
