require('dotenv').config();
const express = require('express');
const fetch   = require('node-fetch');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// Remplacez par votre nom d'utilisateur et dépôt GitHub
const GITHUB_USER = process.env.GITHUB_USER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const RAW_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/latest.json`;

app.use(express.static(__dirname));

app.get('/api/latest', async (req, res) => {
  try {
    const r = await fetch(RAW_URL + '?t=' + Date.now());
    if (!r.ok) return res.json({ ts: null, results: {} });
    const data = await r.json();
    res.json(data);
  } catch {
    res.json({ ts: null, results: {} });
  }
});

app.listen(PORT, () => {
  console.log(`Jackpots Paris — démarré sur le port ${PORT}`);
  console.log(`Lecture depuis : ${RAW_URL}`);
});
