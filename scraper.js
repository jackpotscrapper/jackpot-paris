/**
 * scraper.js — Jackpots Paris
 * Utilise l'API Google Gemini (gratuite) pour scraper les jackpots
 *
 * Variables d'environnement :
 *   GEMINI_API_KEY=AIza...
 */

require('dotenv').config();
const fetch = require('node-fetch');
const fs    = require('fs');
const path  = require('path');

const DATA_DIR  = process.env.DATA_DIR || '.';
const DATA_FILE = path.join(DATA_DIR, 'latest.json');

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;

const CLUBS = [
  {
    id: 'imperial',
    name: 'Imperial Club Paris',
    prompt: `Fetch https://imperialclubparis.com/ and extract the current jackpot amounts displayed on the page.
Return ONLY a JSON object (no markdown, no explanation):
{"blackjack_minor": "...", "blackjack_major": "...", "ultimate": "..."}
Use null if a value is not visible. Include the euro sign and spaces (e.g. "3 104 euros").`
  },
  {
    id: 'barriere',
    name: 'Club Barriere Paris',
    prompt: `Fetch https://www.casinosbarriere.com/paris and extract the current jackpot amounts.
The page has a carousel alternating Blackjack and Ultimate Poker jackpots - BOTH values are present in the HTML simultaneously.
Look carefully for ALL jackpot amounts including those in hidden carousel slides.
Return ONLY a JSON object (no markdown, no explanation):
{"blackjack": "...", "ultimate": "..."}
Use null if a value is truly absent. Include the euro sign (e.g. "48 344 euros").`
  },
  {
    id: 'elysees',
    name: 'Paris Elysees Club',
    prompt: `Fetch https://www.pariselyseesclub.com/ and extract the current progressive jackpot amounts for Blackjack and Ultimate Poker.
Return ONLY a JSON object (no markdown, no explanation):
{"blackjack": "...", "ultimate": "..."}
Use null if a value is not visible. Include the euro sign.`
  },
  {
    id: 'circus',
    name: 'Club Circus Paris',
    prompt: `Fetch https://www.circuscasino.fr/fr/casinos/paris/ and find jackpot amounts for UTH Progressive (Ultimate Poker) and Blazing Blackjack.
Return ONLY a JSON object (no markdown, no explanation):
{"blackjack": "...", "ultimate": "..."}
Use null if no amount is visible. Include the euro sign.`
  },
  {
    id: 'pierrecharron',
    name: 'Club Pierre Charron',
    prompt: `Fetch https://www.clubpierrecharron.com/ and extract the current progressive jackpot amounts for Blackjack (Minor and Major) and Ultimate Poker.
Return ONLY a JSON object (no markdown, no explanation):
{"blackjack_minor": "...", "blackjack_major": "...", "ultimate": "..."}
Use null if a value is not visible. Include the euro sign (e.g. "4 230 euros").`
  }
];

async function fetchJackpotForClub(club) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tools: [{ url_context: {} }, { google_search: {} }],
      contents: [{
        parts: [{ text: club.prompt }]
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 400
      }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const clean = text.replace(/```json|```/gi, '').trim();
  return JSON.parse(clean);
}

async function main() {
  const ts      = new Date().toISOString();
  const results = {};

  console.log(`[${ts}] Scraping des jackpots avec Gemini...`);

  await Promise.allSettled(
    CLUBS.map(async (club) => {
      try {
        const data = await fetchJackpotForClub(club);
        results[club.id] = { ok: true, data };
        console.log(`  OK ${club.name}`, JSON.stringify(data));
      } catch (e) {
        results[club.id] = { ok: false, error: e.message };
        console.error(`  ERREUR ${club.name}: ${e.message}`);
      }
    })
  );

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify({ ts, results }, null, 2));

  console.log(`[${ts}] latest.json mis a jour.`);
}

main().catch(e => {
  console.error('Erreur fatale:', e);
  process.exit(1);
});
