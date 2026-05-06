<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jackpots Paris — Historique</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
  <style>
    :root {
      --gold: #c9a84c;
      --gold-light: #e8c96e;
      --gold-dim: #4a3e20;
      --bg: #07070a;
      --surface: #0e0e13;
      --surface2: #15151c;
      --surface3: #1c1c26;
      --text: #ede7d3;
      --text-mid: #a89e86;
      --text-dim: #5a5448;
      --green: #3ddc84;
      --blue: #5b9cf6;
      --red: #ff6b6b;
      --orange: #f5a623;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'DM Mono', monospace;
      min-height: 100vh;
    }

    /* Grain overlay */
    body::after {
      content: '';
      position: fixed;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
      z-index: 9999;
      opacity: 0.4;
    }

    /* ── Header ── */
    header {
      padding: 40px 48px 28px;
      border-bottom: 1px solid rgba(201,168,76,0.12);
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 20px;
    }

    .brand h1 {
      font-family: 'Playfair Display', serif;
      font-size: clamp(24px, 4vw, 44px);
      font-weight: 900;
      color: var(--gold);
      letter-spacing: -0.02em;
      line-height: 1;
    }

    .brand p {
      font-size: 10px;
      letter-spacing: 0.35em;
      color: var(--text-dim);
      text-transform: uppercase;
      margin-top: 6px;
    }

    .header-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }

    .live-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--green);
    }

    .pulse-dot {
      width: 6px; height: 6px;
      background: var(--green);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%,100% { opacity:1; transform:scale(1); }
      50%      { opacity:0.3; transform:scale(0.6); }
    }

    .next-scrape {
      font-size: 10px;
      color: var(--text-dim);
      letter-spacing: 0.08em;
    }

    .btn {
      background: none;
      border: 1px solid var(--gold-dim);
      color: var(--gold);
      padding: 7px 14px;
      font-family: 'DM Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn:hover { border-color: var(--gold); background: rgba(201,168,76,0.07); }
    .btn:disabled { opacity: 0.3; cursor: not-allowed; }

    /* ── Nav tabs ── */
    .tabs {
      display: flex;
      gap: 0;
      padding: 0 48px;
      border-bottom: 1px solid rgba(201,168,76,0.08);
      overflow-x: auto;
    }

    .tab {
      padding: 14px 20px;
      font-size: 10px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--text-dim);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      white-space: nowrap;
      background: none;
      border-top: none;
      border-left: none;
      border-right: none;
      font-family: 'DM Mono', monospace;
    }

    .tab:hover { color: var(--text-mid); }
    .tab.active { color: var(--gold); border-bottom-color: var(--gold); }

    /* ── Main layout ── */
    main { padding: 36px 48px; max-width: 1400px; margin: 0 auto; }

    /* ── Section: Snapshot actuel ── */
    .section-title {
      font-size: 9px;
      letter-spacing: 0.4em;
      text-transform: uppercase;
      color: var(--text-dim);
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .section-title::after {
      content: '';
      flex: 1;
      height: 1px;
      background: rgba(201,168,76,0.1);
    }

    /* ── Cards grille ── */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 2px;
      margin-bottom: 48px;
    }

    .club-card {
      background: var(--surface);
      border: 1px solid rgba(201,168,76,0.07);
      padding: 22px 24px 18px;
      position: relative;
      animation: fadeUp 0.4s ease both;
    }

    @keyframes fadeUp {
      from { opacity:0; transform:translateY(6px); }
      to   { opacity:1; transform:translateY(0); }
    }

    .club-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent);
      opacity: 0;
      transition: opacity 0.3s;
    }

    .club-card:hover::before { opacity: 1; }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .card-name {
      font-family: 'Playfair Display', serif;
      font-size: 14px;
      font-weight: 700;
      color: var(--text);
      line-height: 1.2;
    }

    .card-status {
      font-size: 9px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      padding: 2px 7px;
      border: 1px solid;
    }

    .status-ok    { color: var(--green); border-color: var(--green); }
    .status-error { color: var(--red);   border-color: var(--red);   }
    .status-wait  { color: var(--text-dim); border-color: var(--text-dim); animation: blink 1.5s infinite; }

    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

    .jackpot-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-top: 1px solid rgba(255,255,255,0.04);
    }

    .jackpot-label {
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-dim);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .game-dot {
      width: 5px; height: 5px;
      border-radius: 50%;
    }

    .dot-bj { background: var(--blue); }
    .dot-ul { background: var(--orange); }

    .jackpot-amount {
      font-size: 20px;
      font-weight: 500;
      color: var(--gold);
      letter-spacing: -0.02em;
    }

    .jackpot-amount.minor { font-size: 13px; color: var(--text-mid); }
    .jackpot-amount.null  { font-size: 11px; color: var(--text-dim); font-weight: 300; }

    .dual-amounts { text-align: right; }
    .dual-amounts .sub { font-size: 9px; color: var(--text-dim); letter-spacing: 0.1em; text-transform: uppercase; }
    .dual-amounts .major { font-size: 18px; color: var(--gold); }
    .dual-amounts .minor-val { font-size: 12px; color: var(--text-mid); }

    .skeleton {
      width: 90px; height: 20px;
      background: linear-gradient(90deg, var(--surface2) 25%, var(--surface3) 50%, var(--surface2) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

    .card-ts {
      font-size: 9px;
      color: var(--text-dim);
      letter-spacing: 0.05em;
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid rgba(255,255,255,0.03);
    }

    /* ── Section historique ── */
    .history-controls {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .select {
      background: var(--surface);
      border: 1px solid rgba(201,168,76,0.2);
      color: var(--text-mid);
      padding: 7px 12px;
      font-family: 'DM Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.1em;
      cursor: pointer;
      outline: none;
    }

    .select:focus { border-color: var(--gold); }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(520px, 1fr));
      gap: 16px;
    }

    .chart-card {
      background: var(--surface);
      border: 1px solid rgba(201,168,76,0.07);
      padding: 20px 24px;
    }

    .chart-title {
      font-family: 'Playfair Display', serif;
      font-size: 13px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 4px;
    }

    .chart-subtitle {
      font-size: 9px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--text-dim);
      margin-bottom: 16px;
    }

    .chart-wrap { position: relative; height: 180px; }

    /* ── Section tableau ── */
    .table-wrap { overflow-x: auto; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }

    thead th {
      text-align: left;
      padding: 8px 12px;
      font-size: 9px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--text-dim);
      border-bottom: 1px solid rgba(201,168,76,0.1);
      white-space: nowrap;
    }

    tbody tr {
      border-bottom: 1px solid rgba(255,255,255,0.025);
      transition: background 0.15s;
    }

    tbody tr:hover { background: rgba(201,168,76,0.03); }

    tbody td {
      padding: 9px 12px;
      color: var(--text-mid);
      white-space: nowrap;
    }

    tbody td.amount { color: var(--gold); font-weight: 500; }
    tbody td.null   { color: var(--text-dim); }
    tbody td.ts     { color: var(--text-dim); font-size: 10px; }

    .page-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 16px;
      font-size: 10px;
      color: var(--text-dim);
    }

    /* ── Tabs content ── */
    .tab-panel { display: none; }
    .tab-panel.active { display: block; }

    /* ── Toast ── */
    #toast {
      position: fixed;
      bottom: 24px; right: 24px;
      background: var(--surface2);
      border: 1px solid rgba(201,168,76,0.2);
      color: var(--text);
      padding: 10px 16px;
      font-size: 11px;
      letter-spacing: 0.05em;
      z-index: 9998;
      transform: translateY(60px);
      opacity: 0;
      transition: all 0.3s;
    }

    #toast.show { transform: translateY(0); opacity: 1; }

    /* ── Responsive ── */
    @media (max-width: 700px) {
      header, main, .tabs { padding-left: 20px; padding-right: 20px; }
      .charts-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

<header>
  <div class="brand">
    <h1>Jackpots Paris</h1>
    <p>Suivi des jackpots · Clubs de jeux parisiens</p>
  </div>
  <div class="header-right">
    <div class="live-badge"><span class="pulse-dot"></span> Données en direct</div>
    <div class="next-scrape" id="nextScrape">Prochain snapshot : —</div>
    <button class="btn" id="scrapeNowBtn" onclick="triggerScrape()">
      <span id="scrapeIcon">↻</span> Scraper maintenant
    </button>
  </div>
</header>

<div class="tabs">
  <button class="tab active" onclick="switchTab('live')">Snapshot actuel</button>
  <button class="tab" onclick="switchTab('charts')">Graphiques</button>
  <button class="tab" onclick="switchTab('table')">Tableau complet</button>
</div>

<main>

  <!-- ── TAB: LIVE ── -->
  <div class="tab-panel active" id="panel-live">
    <div class="section-title">Dernier snapshot</div>
    <div class="cards-grid" id="cardsGrid"></div>
  </div>

  <!-- ── TAB: CHARTS ── -->
  <div class="tab-panel" id="panel-charts">
    <div class="history-controls">
      <div class="section-title" style="margin:0;flex:0 0 auto">Historique</div>
      <select class="select" id="chartClub" onchange="renderCharts()">
        <option value="barriere">Club Barrière</option>
        <option value="imperial">Imperial Club</option>
        <option value="elysees">Paris Élysées Club</option>
        <option value="circus">Club Circus</option>
        <option value="pierrecharron">Club Pierre Charron</option>
      </select>
      <select class="select" id="chartRange" onchange="renderCharts()">
        <option value="24">Dernières 24h</option>
        <option value="72">3 derniers jours</option>
        <option value="168">7 derniers jours</option>
        <option value="720">30 derniers jours</option>
      </select>
    </div>
    <div class="charts-grid" id="chartsGrid"></div>
  </div>

  <!-- ── TAB: TABLE ── -->
  <div class="tab-panel" id="panel-table">
    <div class="history-controls">
      <div class="section-title" style="margin:0;flex:0 0 auto">Journal</div>
      <select class="select" id="tableClub" onchange="renderTable(1)">
        <option value="barriere">Club Barrière</option>
        <option value="imperial">Imperial Club</option>
        <option value="elysees">Paris Élysées Club</option>
        <option value="circus">Club Circus</option>
        <option value="pierrecharron">Club Pierre Charron</option>
      </select>
    </div>
    <div class="table-wrap">
      <table id="historyTable">
        <thead id="tableHead"></thead>
        <tbody id="tableBody"></tbody>
      </table>
    </div>
    <div class="page-controls">
      <span id="tableInfo">—</span>
      <div style="display:flex;gap:8px">
        <button class="btn" id="prevBtn" onclick="changePage(-1)">← Préc.</button>
        <button class="btn" id="nextBtn" onclick="changePage(+1)">Suiv. →</button>
      </div>
    </div>
  </div>

</main>

<div id="toast"></div>

<script>
// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────
const API_BASE = window.location.origin; // Même origine que le serveur Node
const REFRESH_INTERVAL_MS = 60 * 1000;   // Rafraîchit l'affichage toutes les minutes
const PAGE_SIZE = 50;

const CLUB_META = {
  imperial:      { name: 'Imperial Club Paris',    fields: ['blackjack_minor','blackjack_major','ultimate'] },
  barriere:      { name: 'Club Barrière Paris',    fields: ['blackjack','ultimate'] },
  elysees:       { name: 'Paris Élysées Club',     fields: ['blackjack','ultimate'] },
  circus:        { name: 'Club Circus Paris',      fields: ['blackjack','ultimate'] },
  pierrecharron: { name: 'Club Pierre Charron',    fields: ['blackjack_minor','blackjack_major','ultimate'] },
};

const FIELD_LABELS = {
  blackjack:       'Blackjack',
  blackjack_minor: 'BJ Minor',
  blackjack_major: 'BJ Major',
  ultimate:        'Ultimate Poker',
};

const FIELD_COLORS = {
  blackjack:       '#5b9cf6',
  blackjack_minor: '#5b9cf6',
  blackjack_major: '#a78bfa',
  ultimate:        '#f5a623',
};

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
let latest    = null;
let allHistory = [];
let tablePage = 1;
let charts    = {};

// ─────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────
async function init() {
  await loadLatest();
  await loadHistory();
  renderCards();
  renderCharts();
  renderTable(1);
  scheduleRefresh();
}

// ─────────────────────────────────────────────
// API calls
// ─────────────────────────────────────────────
async function loadLatest() {
  try {
    const r = await fetch(`${API_BASE}/api/latest`);
    latest = await r.json();
  } catch (e) {
    showToast('Impossible de joindre le serveur');
  }
}

async function loadHistory() {
  try {
    const r = await fetch(`${API_BASE}/api/history?limit=2000`);
    allHistory = await r.json();
  } catch {}
}

async function triggerScrape() {
  const btn  = document.getElementById('scrapeNowBtn');
  const icon = document.getElementById('scrapeIcon');
  btn.disabled = true;
  icon.style.display = 'inline-block';
  icon.animate([{transform:'rotate(0)'},{transform:'rotate(360deg)'}],
    {duration:800, iterations:Infinity});
  showToast('Scraping en cours...');

  try {
    const r = await fetch(`${API_BASE}/api/scrape`, { method: 'POST' });
    const d = await r.json();
    if (d.ok) {
      latest = d.snapshot;
      allHistory.push(d.snapshot);
      renderCards();
      renderCharts();
      renderTable(1);
      showToast('Snapshot enregistré ✓');
    }
  } catch {
    showToast('Erreur lors du scraping');
  } finally {
    btn.disabled = false;
    icon.getAnimations().forEach(a => a.cancel());
    icon.style.transform = '';
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatTs(ts) {
  return new Date(ts).toLocaleString('fr-FR', {
    day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  });
}

function parseAmount(str) {
  if (!str) return null;
  const n = parseFloat(str.replace(/\s/g,'').replace(',','.').replace('€',''));
  return isNaN(n) ? null : n;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ─────────────────────────────────────────────
// Render: Cards (snapshot actuel)
// ─────────────────────────────────────────────
function renderCards() {
  const grid = document.getElementById('cardsGrid');
  if (!latest || !latest.ts) {
    grid.innerHTML = `<div style="color:var(--text-dim);font-size:12px;padding:20px">
      Aucun snapshot disponible. Cliquez sur "Scraper maintenant".
    </div>`;
    return;
  }

  grid.innerHTML = Object.entries(CLUB_META).map(([id, meta], i) => {
    const clubData = latest.results?.[id];
    const isOk     = clubData?.ok;
    const data     = clubData?.data || {};
    const delay    = i * 0.07;

    const statusHtml = !clubData
      ? `<span class="card-status status-wait">En attente</span>`
      : isOk
        ? `<span class="card-status status-ok">OK</span>`
        : `<span class="card-status status-error">Erreur</span>`;

    const rowsHtml = meta.fields.map(field => {
      const val = data[field];
      const isBJ = field.includes('blackjack');
      return `<div class="jackpot-row">
        <div class="jackpot-label">
          <span class="game-dot ${isBJ ? 'dot-bj' : 'dot-ul'}"></span>
          ${FIELD_LABELS[field]}
        </div>
        ${val
          ? `<span class="jackpot-amount ${field === 'blackjack_minor' ? 'minor' : ''}">${val}</span>`
          : `<span class="jackpot-amount null">—</span>`
        }
      </div>`;
    }).join('');

    return `<div class="club-card" style="animation-delay:${delay}s">
      <div class="card-header">
        <div class="card-name">${meta.name}</div>
        ${statusHtml}
      </div>
      ${isOk ? rowsHtml : `<div style="color:var(--red);font-size:10px;opacity:0.7">${clubData?.error || ''}</div>`}
      <div class="card-ts">Snapshot : ${formatTs(latest.ts)}</div>
    </div>`;
  }).join('');
}

// ─────────────────────────────────────────────
// Render: Charts
// ─────────────────────────────────────────────
function renderCharts() {
  const clubId  = document.getElementById('chartClub').value;
  const hours   = parseInt(document.getElementById('chartRange').value);
  const meta    = CLUB_META[clubId];
  const cutoff  = Date.now() - hours * 3600 * 1000;

  const filtered = allHistory.filter(s => new Date(s.ts).getTime() >= cutoff);

  const labels = filtered.map(s =>
    new Date(s.ts).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})
  );

  const grid = document.getElementById('chartsGrid');
  grid.innerHTML = '';

  // Destroy old charts
  Object.values(charts).forEach(c => c.destroy());
  charts = {};

  meta.fields.forEach(field => {
    const values = filtered.map(s => {
      const d = s.results?.[clubId];
      if (!d?.ok) return null;
      return parseAmount(d.data?.[field]);
    });

    const canvasId = `chart-${field}`;
    const card = document.createElement('div');
    card.className = 'chart-card';
    card.innerHTML = `
      <div class="chart-title">${FIELD_LABELS[field]}</div>
      <div class="chart-subtitle">${meta.name} · ${hours}h</div>
      <div class="chart-wrap"><canvas id="${canvasId}"></canvas></div>
    `;
    grid.appendChild(card);

    const ctx = document.getElementById(canvasId).getContext('2d');
    charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: FIELD_COLORS[field],
          backgroundColor: FIELD_COLORS[field] + '18',
          borderWidth: 1.5,
          pointRadius: filtered.length > 50 ? 0 : 3,
          pointBackgroundColor: FIELD_COLORS[field],
          tension: 0.3,
          fill: true,
          spanGaps: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#15151c',
            borderColor: 'rgba(201,168,76,0.3)',
            borderWidth: 1,
            titleColor: '#a89e86',
            bodyColor: '#c9a84c',
            bodyFont: { family: 'DM Mono', size: 12 },
            callbacks: {
              label: ctx => ctx.raw !== null ? ctx.raw.toLocaleString('fr-FR') + ' €' : '—'
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#5a5448',
              font: { family: 'DM Mono', size: 9 },
              maxTicksLimit: 8,
            },
            grid: { color: 'rgba(255,255,255,0.03)' }
          },
          y: {
            ticks: {
              color: '#5a5448',
              font: { family: 'DM Mono', size: 9 },
              callback: v => v ? v.toLocaleString('fr-FR') + ' €' : ''
            },
            grid: { color: 'rgba(255,255,255,0.04)' }
          }
        }
      }
    });
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="color:var(--text-dim);font-size:12px;padding:20px">
      Aucune donnée sur cette période. Effectuez quelques scrapes d'abord.
    </div>`;
  }
}

// ─────────────────────────────────────────────
// Render: Table
// ─────────────────────────────────────────────
function renderTable(page) {
  tablePage = page;
  const clubId = document.getElementById('tableClub').value;
  const meta   = CLUB_META[clubId];

  // Rebuild reversed
  const rows = [...allHistory].reverse().map(s => ({
    ts:   s.ts,
    data: s.results?.[clubId]
  }));

  const total     = rows.length;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const start     = (page - 1) * PAGE_SIZE;
  const pageRows  = rows.slice(start, start + PAGE_SIZE);

  // Head
  document.getElementById('tableHead').innerHTML = `<tr>
    <th>Date / Heure</th>
    ${meta.fields.map(f => `<th>${FIELD_LABELS[f]}</th>`).join('')}
    <th>Statut</th>
  </tr>`;

  // Body
  document.getElementById('tableBody').innerHTML = pageRows.map(row => {
    const d    = row.data;
    const isOk = d?.ok;
    const data = d?.data || {};

    const cells = meta.fields.map(f => {
      const v = data[f];
      return `<td class="${v ? 'amount' : 'null'}">${v || '—'}</td>`;
    }).join('');

    return `<tr>
      <td class="ts">${formatTs(row.ts)}</td>
      ${cells}
      <td style="font-size:9px;color:${isOk ? 'var(--green)' : 'var(--red)'}">${isOk ? 'OK' : (d?.error?.slice(0,30) || '—')}</td>
    </tr>`;
  }).join('');

  document.getElementById('tableInfo').textContent =
    `${total} snapshots · Page ${page}/${pageCount || 1}`;
  document.getElementById('prevBtn').disabled = page <= 1;
  document.getElementById('nextBtn').disabled = page >= pageCount;
}

function changePage(delta) {
  const clubId = document.getElementById('tableClub').value;
  const meta   = CLUB_META[clubId];
  const total  = allHistory.length;
  const pages  = Math.ceil(total / PAGE_SIZE);
  const next   = Math.max(1, Math.min(pages, tablePage + delta));
  renderTable(next);
}

// ─────────────────────────────────────────────
// Tab switching
// ─────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab').forEach((t, i) => {
    const names = ['live','charts','table'];
    t.classList.toggle('active', names[i] === name);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === `panel-${name}`);
  });
}

// ─────────────────────────────────────────────
// Auto-refresh
// ─────────────────────────────────────────────
function scheduleRefresh() {
  let countdown = REFRESH_INTERVAL_MS / 1000;

  const tick = setInterval(() => {
    countdown--;
    const m = Math.floor(countdown / 60);
    const s = countdown % 60;
    document.getElementById('nextScrape').textContent =
      `Rafraîchissement dans ${m > 0 ? m + 'min ' : ''}${s}s`;

    if (countdown <= 0) {
      clearInterval(tick);
      loadLatest().then(() => {
        loadHistory().then(() => {
          renderCards();
          renderCharts();
          renderTable(tablePage);
          scheduleRefresh();
        });
      });
    }
  }, 1000);
}

// ─────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────
init();
</script>
</body>
</html>
