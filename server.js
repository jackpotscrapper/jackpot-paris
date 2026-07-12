const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const GITHUB_USER = process.env.GITHUB_USER;
const GITHUB_REPO = process.env.GITHUB_REPO || 'jackpot-paris';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const CHART_TOKEN = process.env.CHART_TOKEN || '';

const RAW_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/latest.json`;
const HISTORY_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/history.jsonl`;

// ── Empêche l'accès direct au fichier history.html sans passer par /historique ──
app.use((req, res, next) => {
  if (req.path === '/history.html') return res.status(403).send('Forbidden');
  next();
});

// ── Fichiers statiques ─────────────────────────────────────────────────────
app.use(express.static(__dirname));

// ── API : lit latest.json depuis GitHub raw ────────────────────────────────
app.get('/api/latest', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    const r = await fetch(RAW_URL + '?t=' + Date.now(), { timeout: 10000 });
    if (!r.ok) return res.json({ ts: null, results: {} });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.json({ ts: null, results: {}, error: err.message });
  }
});

// ── Page privée : courbes d'historique ─────────────────────────────────────
// Accès uniquement avec le bon token : /historique?token=TON_SECRET
app.get('/historique', (req, res) => {
  if (!CHART_TOKEN || req.query.token !== CHART_TOKEN) {
    return res.status(403).send('Forbidden');
  }
  res.sendFile(path.join(__dirname, 'history.html'));
});

// ── API : lit history.jsonl depuis GitHub raw (protégée par token) ─────────
app.get('/api/history', async (req, res) => {
  if (!CHART_TOKEN || req.query.token !== CHART_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    const r = await fetch(HISTORY_RAW_URL + '?t=' + Date.now(), { timeout: 15000 });
    if (!r.ok) return res.json([]);
    const text = await r.text();
    const entries = text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch (e) { return null; } })
      .filter(Boolean);
    res.json(entries);
  } catch (err) {
    res.json([]);
  }
});

// ── Trigger : déclenche le workflow GitHub Actions via API ─────────────────
// Appelé par UptimeRobot toutes les 30 min sur /trigger?token=SECRET
app.get('/trigger', async (req, res) => {
  const secret = process.env.TRIGGER_SECRET || '';
  if (secret && req.query.token !== secret) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GITHUB_TOKEN non configuré' });
  }
  try {
    const r = await fetch(
      `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/actions/workflows/scrape.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'main' })
      }
    );
    if (r.status === 204) {
      console.log(`[${new Date().toISOString()}] Workflow déclenché via /trigger`);
      res.json({ ok: true, ts: new Date().toISOString() });
    } else {
      const txt = await r.text();
      res.status(r.status).json({ error: txt });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Health check ───────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🎰  Jackpots Paris — port ${PORT}`);
  console.log(`    Source : ${RAW_URL}`);
});
