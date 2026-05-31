const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

const GITHUB_USER = process.env.GITHUB_USER;
const GITHUB_REPO = process.env.GITHUB_REPO || 'jackpot-paris';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const RAW_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/latest.json`;

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
