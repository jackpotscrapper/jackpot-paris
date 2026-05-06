require('dotenv').config();
const fetch = require('node-fetch');
const fs    = require('fs');
const path  = require('path');

const DATA_DIR  = process.env.DATA_DIR || '.';
const DATA_FILE = path.join(DATA_DIR, 'latest.json');

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

async function fetchJackpotForClub(club) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
