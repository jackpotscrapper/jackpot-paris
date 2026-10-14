// admin.js — saisie manuelle (cachée, protégée par code) du jackpot UTH de Partouche Pasino
//
// Stockage : fichier manual.json dans le dépôt GitHub (écrit via l'API GitHub).
// Fusion   : applyManual(latest) remplace pasino.ultimate UNIQUEMENT si le scraper
//            n'a rien trouvé (null). Dès que l'API Partouche expose l'UTH, le scraper reprend la main.
//
// Variables d'environnement Render requises : GITHUB_USER, GITHUB_REPO, GITHUB_TOKEN, ADMIN_CODE

const express = require('express');
const crypto = require('crypto');
const path = require('path');

const GITHUB_USER = process.env.GITHUB_USER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ADMIN_CODE = process.env.ADMIN_CODE || '';

const API = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/manual.json`;
const GH_HEADERS = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'jackpots-paris',
  'X-GitHub-Api-Version': '2022-11-28',
};

// ---------- Formatage (identique au scraper : "45 230 €") ----------
const fmt = (n) => parseInt(n, 10).toLocaleString('fr-FR') + ' €';

// ---------- Lecture / écriture de manual.json ----------
let cache = { value: {}, at: 0 };
const CACHE_MS = 60_000;

async function readManual() {
  if (Date.now() - cache.at < CACHE_MS) return cache.value;
  try {
    const r = await fetch(API, { headers: GH_HEADERS });
    if (r.status === 404) {
      cache = { value: {}, at: Date.now() };
      return cache.value;
    }
    if (!r.ok) throw new Error('GitHub GET ' + r.status);
    const j = await r.json();
    const value = JSON.parse(Buffer.from(j.content, 'base64').toString('utf8'));
    cache = { value, at: Date.now() };
    return value;
  } catch (e) {
    console.error('[admin] lecture manual.json:', e.message);
    return cache.value || {};
  }
}

async function writeManual(obj) {
  let sha;
  const g = await fetch(API, { headers: GH_HEADERS });
  if (g.ok) sha = (await g.json()).sha;

  const body = {
    message: 'manual: pasino ultimate',
    content: Buffer.from(JSON.stringify(obj, null, 2)).toString('base64'),
    ...(sha ? { sha } : {}),
  };
  const w = await fetch(API, {
    method: 'PUT',
    headers: { ...GH_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!w.ok) throw new Error('GitHub PUT ' + w.status);
  cache = { value: obj, at: Date.now() };
}

// ---------- Fusion dans latest.json (à appeler dans /api/latest) ----------
async function applyManual(latest) {
  try {
    const m = await readManual();
    const manual = m && m.pasino && m.pasino.ultimate;
    const node = latest && latest.results && latest.results.pasino;
    if (manual && node && node.data && !node.data.ultimate) {
      node.data.ultimate = fmt(manual);
      node.data.ultimate_ts = m.pasino.ts; // date/heure du relevé manuel (affichée sous le montant)
    }
  } catch (e) {
    console.error('[admin] applyManual:', e.message);
  }
  return latest;
}

// ---------- Sécurité : comparaison à temps constant + limitation des essais ----------
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const codeOk = (given) => ADMIN_CODE.length > 0 && crypto.timingSafeEqual(sha(given), sha(ADMIN_CODE));

const failsByIp = new Map(); // ip -> [timestamps]
let globalFails = [];
const WINDOW_IP = 15 * 60_000, MAX_IP = 5;
const WINDOW_GLOBAL = 60 * 60_000, MAX_GLOBAL = 30;

function locked(ip) {
  const now = Date.now();
  globalFails = globalFails.filter((t) => now - t < WINDOW_GLOBAL);
  const list = (failsByIp.get(ip) || []).filter((t) => now - t < WINDOW_IP);
  failsByIp.set(ip, list);
  return list.length >= MAX_IP || globalFails.length >= MAX_GLOBAL;
}
function recordFail(ip) {
  const now = Date.now();
  failsByIp.set(ip, [...(failsByIp.get(ip) || []), now]);
  globalFails.push(now);
}

// ---------- Routes ----------
const router = express.Router();
router.use(express.json({ limit: '1kb' }));

// Script de l'interface cachée (chargé par index.html)
router.get('/m.js', (req, res) => {
  res.type('application/javascript').set('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'admin-ui.js'));
});

// Saisie / effacement du montant
router.post('/api/m/uth', async (req, res) => {
  const ip = req.ip || 'unknown';
  if (locked(ip)) return res.status(429).json({ ok: false, error: 'Trop d\'essais, réessaie plus tard.' });

  const { code, amount } = req.body || {};
  if (!codeOk(code || '')) {
    recordFail(ip);
    return res.status(403).json({ ok: false, error: 'Code invalide.' });
  }

  try {
    const raw = String(amount ?? '').trim();

    // Champ vide => effacer la valeur manuelle
    if (raw === '') {
      await writeManual({});
      return res.json({ ok: true, cleared: true });
    }

    // "45 230", "45.230", "45 230,50 €" => 45230
    const digits = raw.split(',')[0].replace(/\D/g, '');
    const value = parseInt(digits, 10);
    if (!Number.isFinite(value) || value < 100 || value > 9_999_999) {
      return res.status(400).json({ ok: false, error: 'Montant invalide (100 à 9 999 999).' });
    }

    await writeManual({ pasino: { ultimate: value, ts: new Date().toISOString() } });
    return res.json({ ok: true, value: fmt(value) });
  } catch (e) {
    console.error('[admin] écriture:', e.message);
    return res.status(500).json({ ok: false, error: 'Échec de l\'enregistrement.' });
  }
});

module.exports = { router, applyManual };
