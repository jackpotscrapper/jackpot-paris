/**
 * server.js — Jackpots Paris
 * Web Service Render : sert index.html + l'API /api/latest
 *
 * Variables d'environnement Render :
 *   PORT      (injecté automatiquement par Render)
 *   DATA_DIR  (chemin du disque partagé, ex: /data)
 */

require('dotenv').config();
const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app       = express();
const PORT      = process.env.PORT || 3000;
const DATA_DIR  = process.env.DATA_DIR || '/tmp';
const DATA_FILE = path.join(DATA_DIR, 'latest.json');

// Sert index.html et les fichiers statiques
app.use(express.static(__dirname));

// GET /api/latest — retourne le contenu de latest.json
app.get('/api/latest', (req, res) => {
  if (!fs.existsSync(DATA_FILE)) {
    return res.json({ ts: null, results: {} });
  }
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Fichier de données corrompu' });
  }
});

app.listen(PORT, () => {
  console.log(`Jackpots Paris — Web service démarré sur le port ${PORT}`);
  console.log(`Lecture des données depuis : ${DATA_FILE}`);
});
