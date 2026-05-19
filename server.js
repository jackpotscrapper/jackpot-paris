const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const GITHUB_USER = process.env.GITHUB_USER;
const GITHUB_REPO = process.env.GITHUB_REPO || 'jackpot-paris';

if (!GITHUB_USER) {
  console.warn('⚠️  Variable GITHUB_USER non définie — /api/latest retournera des données vides.');
}

const RAW_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/latest.json`;

// Servir les fichiers statiques (index.html, etc.)
app.use(express.static(__dirname));

// Endpoint principal — lit latest.json depuis GitHub raw
app.get('/api/latest', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (!GITHUB_USER) {
    return res.json({ ts: null, results: {}, error: 'GITHUB_USER non configuré' });
  }

  try {
    // Ajout du timestamp pour contourner le cache CDN GitHub
    const url = `${RAW_URL}?t=${Date.now()}`;
    const r = await fetch(url, { timeout: 10000 });

    if (!r.ok) {
      console.error(`GitHub raw — HTTP ${r.status}`);
      return res.json({ ts: null, results: {} });
    }

    const data = await r.json();
    res.json(data);

  } catch (err) {
    console.error('Erreur fetch latest.json :', err.message);
    res.json({ ts: null, results: {}, error: err.message });
  }
});

// Health check pour Render
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🎰  Jackpots Paris — serveur démarré sur le port ${PORT}`);
  console.log(`    Source : ${RAW_URL}`);
});
