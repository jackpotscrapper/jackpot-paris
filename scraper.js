const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || '.';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── 1. Imperial Club Paris ───────────────────────────────────────────────────
// v4.16 : le site n'affiche plus "MINOR 3.926 €" dans un seul nœud de texte en
// majuscules. Le label ("Minor"/"Major", casse mixte) et le montant sont
// désormais dans deux éléments séparés (label sur une ligne, montant sur la
// ligne suivante). On lit donc le texte visible de la page ligne par ligne et
// on associe chaque label au montant qui le suit immédiatement, plutôt que de
// dépendre d'un motif exact dans un seul nœud.
async function scrapeImperial(page) {
  await sleep(3000);
  return page.evaluate(() => {
    const clean = (raw) => {
      const d = (raw || '').replace(/[^\d]/g, '');
      if (!d || parseInt(d, 10) < 100) return null;
      return parseInt(d, 10).toLocaleString('fr-FR') + ' €';
    };

    const lines = document.body.innerText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    let blackjack_minor = null, blackjack_major = null, ultimate = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Label seul ("Minor" / "Major"), montant sur la ligne suivante
      if (/^minor$/i.test(line) && !blackjack_minor) {
        const m = (lines[i + 1] || '').match(/[\d.,]+/);
        if (m) blackjack_minor = clean(m[0]);
        continue;
      }
      if (/^major$/i.test(line) && !blackjack_major) {
        const m = (lines[i + 1] || '').match(/[\d.,]+/);
        if (m) blackjack_major = clean(m[0]);
        continue;
      }

      // Ultimate : montant seul en tête de ligne (parfois suivi de texte
      // collé type "40.731 €Jackpot progressif"), non labellisé Minor/Major.
      // Le carousel duplique le bloc plus bas dans la page (même vidéo,
      // affichage répété) : on ne garde donc que la première occurrence.
      if (!ultimate) {
        const m = line.match(/^([\d.,]+)\s*€/);
        if (m) {
          const value = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
          if (value > 5000) ultimate = clean(m[1]);
        }
      }
    }

    return { blackjack_minor, blackjack_major, ultimate };
  });
}

// ─── 2. Club Barrière Paris ───────────────────────────────────────────────────
// v4.19 : le site n'affiche plus qu'un bloc (qui fait défiler les jackpots toutes les 5-7 s) « Prochain jackpot à gagner » (montant
// puis nom du jeu, ex. « 49 022 € » / « Ultimate Texas hold'em·Paris »). Les anciens
// libellés «majeur» / «mineur» du payload ne sont plus garantis, et le scraper
// échouait (« aucun jackpot capturé ») dès qu'il ne trouvait ni Major ni Minor,
// alors que l'Ultimate était bien présent. Changements :
//   1. la source de vérité est désormais le texte VISIBLE de la page (montant suivi
//      du nom du jeu), car c'est ce que voit le visiteur ; le payload Nuxt reste
//      un complément (il contient des doublons trompeurs, cf. v4.14) ;
//   2. le payload est lu depuis _payload.json ET depuis <script id="__NUXT_DATA__">
//      (Nuxt 3 l'inline parfois), et les montants peuvent être entre guillemets ou non ;
//   3. un seul jackpot trouvé suffit (plus d'échec si Major/Minor sont absents) ;
//   4. une seule navigation, écouteur posé avant le goto ;
//   5. logs de diagnostic (voir « Barriere ... » dans l'onglet Actions).
const barriereClean = (raw) => {
  const num = parseFloat(raw);
  if (isNaN(num) || num < 100) return null;
  return Math.floor(num).toLocaleString('fr-FR') + ' €';
};

// Nom de jeu -> clé de résultat (null = ignoré)
function barriereClassify(rawName) {
  const name = (rawName || '').toLowerCase();
  if (name.includes('royale')) return null;
  if (name.includes('ultimate') || name.includes('hold')) return 'ultimate';
  if (name.includes('majeur') || name.includes('major')) return 'blackjack_major';
  if (name.includes('mineur') || name.includes('minor')) return 'blackjack_minor';
  return null;
}

// Payload Nuxt : couple adjacent "Nom","Montant" (guillemets facultatifs autour du
// montant). On ne garde que la PREMIÈRE valeur par jackpot (piège v4.14).
function barrierePayloadParse(text) {
  const result = { ultimate: null, blackjack_major: null, blackjack_minor: null };
  const pairs = [];
  const regex = /"([^"]{3,60})",\s*"?(\d{2,7}(?:\.\d{1,2})?)"?/g;
  let m;
  while ((m = regex.exec(text || '')) !== null) {
    const key = barriereClassify(m[1]);
    if (!key) continue;
    pairs.push(`${m[1]}=${m[2]}`);
    if (!result[key]) result[key] = barriereClean(m[2]);
  }
  return { result, pairs };
}

// Texte visible : suite de nœuds texte. Un montant « 49 022 € » est suivi du nom du jeu.
function barriereDomParse(items) {
  const result = { ultimate: null, blackjack_major: null, blackjack_minor: null };
  const found = [];
  const unknown = [];
  const amountRe = /^(\d{1,3}(?:[\s\u00a0\u202f.]\d{3})+|\d{3,7})\s*€$/;
  for (let i = 0; i < items.length; i++) {
    const t = items[i].replace(/[\u00a0\u202f]/g, ' ').trim();
    const am = t.match(amountRe);
    if (!am) continue;
    const digits = am[1].replace(/[^\d]/g, '');
    // Le nom du jeu suit le montant ; on s'arrête au prochain montant pour ne pas
    // attribuer à ce montant le nom du jackpot suivant.
    let key = null, label = '';
    for (let j = i + 1; j <= i + 3 && j < items.length; j++) {
      const n = items[j].replace(/[\u00a0\u202f]/g, ' ').trim();
      if (amountRe.test(n)) break;
      const k = barriereClassify(n);
      if (k) { key = k; label = n; break; }
    }
    if (!key) {
      // montant suivi d'un libellé non reconnu : conservé pour les logs de diagnostic
      const next = (items[i + 1] || '').slice(0, 40);
      if (next && !amountRe.test(next.replace(/[\u00a0\u202f]/g, ' ').trim())) unknown.push(`${next}=${digits}`);
      continue;
    }
    found.push(`${label}=${digits}`);
    if (!result[key]) result[key] = barriereClean(digits);
  }
  return { result, found, unknown };
}

async function scrapeBarriere(page) {
  const payloads = [];

  page.on('response', async (response) => {
    if (response.url().includes('_payload.json')) {
      try { payloads.push(await response.text()); } catch (e) {}
    }
  });

  try {
    await page.goto('https://www.casinosbarriere.com/paris', {
      waitUntil: 'networkidle2', timeout: 60000
    });
  } catch (e) {
    console.log('  ⚠ Barriere goto:', e.message);
  }
  await sleep(4000);

  // 1) Texte visible (nœuds texte, hors script/style). Le bloc « Prochain jackpot à
  //    gagner » fait défiler les jackpots un par un (toutes les 5-7 s environ) : on
  //    relit donc la page toutes les 2 s pendant ~28 s et on cumule ce qu'on voit
  //    (la valeur la plus récente de chaque jackpot l'emporte).
  const readItems = () => page.evaluate(() => {
    const out = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const tag = n.parentElement ? n.parentElement.tagName : '';
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') continue;
      const t = (n.nodeValue || '').replace(/\s+/g, ' ').trim();
      if (t) out.push(t);
    }
    return out;
  }).catch(() => []);

  const domResult = { ultimate: null, blackjack_major: null, blackjack_minor: null };
  const domSeen = new Set();
  const domUnknown = new Set();
  let items = [];
  let samples = 0;
  for (let i = 0; i < 14; i++) {
    items = await readItems();
    samples++;
    const d = barriereDomParse(items);
    d.found.forEach(f => domSeen.add(f));
    d.unknown.forEach(u => domUnknown.add(u));
    for (const k of Object.keys(domResult)) if (d.result[k]) domResult[k] = d.result[k];
    if (domResult.ultimate && domResult.blackjack_major && domResult.blackjack_minor) break;
    await sleep(2000);
  }

  // 2) Payload inline Nuxt 3
  const inline = await page.evaluate(() => {
    const el = document.getElementById('__NUXT_DATA__');
    return el ? el.textContent : '';
  }).catch(() => '');

  console.log(`  Barriere sources: ${items.length} nœuds texte (dernier relevé), ${payloads.length} _payload.json, inline ${inline.length} car.`);

  const dom = { result: domResult, found: [...domSeen] };
  if (domUnknown.size) console.log('  Barriere DOM montants non reconnus:', JSON.stringify([...domUnknown].slice(0, 10)));
  console.log(`  Barriere DOM (${samples} relevés):`, JSON.stringify(dom.found), JSON.stringify(dom.result));

  // Payload : plus gros d'abord, puis inline ; on complète sans écraser
  const sources = [...payloads].sort((a, b) => b.length - a.length);
  if (inline) sources.push(inline);
  const fromPayload = { ultimate: null, blackjack_major: null, blackjack_minor: null };
  sources.forEach((txt, idx) => {
    const p = barrierePayloadParse(txt);
    console.log(`  Barriere payload #${idx}:`, JSON.stringify(p.pairs.slice(0, 8)));
    for (const k of Object.keys(fromPayload)) {
      if (!fromPayload[k] && p.result[k]) fromPayload[k] = p.result[k];
    }
  });

  // Si rien n'est reconnu, logue le contexte autour de « jackpot » pour diagnostic
  if (!dom.found.length) {
    const ctx = items.filter(t => /jackpot|€/i.test(t)).slice(0, 12);
    console.log('  Barriere contexte (jackpot/€):', JSON.stringify(ctx));
  }

  // Le visible prime ; le payload complète ce que la page n'affiche pas
  const result = {
    ultimate: dom.result.ultimate || fromPayload.ultimate,
    blackjack_major: dom.result.blackjack_major || fromPayload.blackjack_major,
    blackjack_minor: dom.result.blackjack_minor || fromPayload.blackjack_minor,
  };
  if (dom.result.ultimate && fromPayload.ultimate && dom.result.ultimate !== fromPayload.ultimate) {
    console.log(`  Barriere: Ultimate visible (${dom.result.ultimate}) ≠ payload (${fromPayload.ultimate}) — visible retenu`);
  }

  console.log('  Barriere jackpots bruts:', JSON.stringify(result));

  if (!result.ultimate && !result.blackjack_major && !result.blackjack_minor) {
    throw new Error('Barriere: aucun jackpot capturé');
  }
  return result;
}

// ─── 3. Paris Élysées Club ────────────────────────────────────────────────────
// v4.17 : refonte du site (URL /fr/). Les jackpots ne sont plus dans des
// <article.jackpot-card><p.jackpot-label/value> : ils sont injectés en JS depuis
// Supabase dans la bannière #jackpot-banner sous forme de
//   <a class="jackpot-card" data-amount="83305.1"> ... <span class="jackpot-label">
// On lit l'attribut data-amount (valeur exacte, indépendante du formatage /
// de l'animation de compteur) et on identifie le jeu par le libellé.
async function scrapeElysees(page) {
  await page.waitForSelector('#jackpot-banner a.jackpot-card[data-amount]', { timeout: 30000 });
  await sleep(1500);
  return page.evaluate(() => {
    const fmt = (n) =>
      Number.isFinite(n) && n >= 100 ? Math.round(n).toLocaleString('fr-FR') + ' €' : null;
    const result = { blackjack: null, ultimate: null };
    // On ne garde que la première occurrence de chaque jackpot
    document.querySelectorAll('#jackpot-banner a.jackpot-card[data-amount]').forEach(card => {
      const label = (card.querySelector('.jackpot-label')?.textContent || '').trim().toUpperCase();
      const amt = fmt(parseFloat(card.getAttribute('data-amount')));
      if (!amt) return;
      if (!result.blackjack && label.includes('BLACKJACK')) result.blackjack = amt;
      else if (!result.ultimate && label.includes('ULTIMATE')) result.ultimate = amt;
    });
    return result;
  });
}

// ─── 4. Club Circus Paris ─────────────────────────────────────────────────────
async function scrapeCircus(page) {
  await sleep(7000);
  return page.evaluate(() => {
    const intro = document.querySelector('#intro');
    if (!intro) return { blazing_blackjack: null, uth_progressive: null };

    const amounts = new Set();

    intro.querySelectorAll('*').forEach(el => {
      ['value','target','count','number','amount','final'].forEach(attr => {
        const v = el.dataset[attr];
        if (!v) return;
        const n = parseFloat(v.replace(/[^0-9.]/g, ''));
        if (n > 1000 && n < 10000000) amounts.add(Math.floor(n));
      });
    });

    const seen = new WeakSet();
    const walker = document.createTreeWalker(intro, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const t = node.textContent.trim();
      if (!/^[\d\s.,]+$/.test(t) || t.length === 0) continue;
      let el = node.parentElement;
      for (let i = 0; i < 4 && el && el !== intro; i++, el = el.parentElement) {
        if (seen.has(el)) continue;
        seen.add(el);
        const raw = el.innerText || el.textContent || '';
        const matches = [...raw.matchAll(/(\d[\d\s.]*),(\d{2})/g)];
        matches.forEach(m => {
          const n = parseInt(m[1].replace(/[\s.]/g, ''), 10);
          if (n > 1000 && n < 10000000) amounts.add(n);
        });
        const intMatches = [...raw.matchAll(/\b(\d{2}\s?\d{3})\b/g)];
        intMatches.forEach(m => {
          const n = parseInt(m[1].replace(/\s/g, ''), 10);
          if (n > 5000 && n < 10000000) amounts.add(n);
        });
      }
    }

    if (amounts.size < 2) {
      const raw = intro.innerText || intro.textContent || '';
      const matches = [...raw.matchAll(/(\d[\d\s.]*),(\d{2})/g)];
      matches.forEach(m => {
        const n = parseInt(m[1].replace(/[\s.]/g, ''), 10);
        if (n > 1000 && n < 10000000) amounts.add(n);
      });
    }

    const sorted = [...amounts].sort((a, b) => b - a);
    return {
      uth_progressive:   sorted[0] ? sorted[0].toLocaleString('fr-FR') + ' €' : null,
      blazing_blackjack: sorted[1] ? sorted[1].toLocaleString('fr-FR') + ' €' : null,
    };
  });
}

// ─── 5. Club Pierre Charron ───────────────────────────────────────────────────
async function scrapePierreCharron(page) {
  await sleep(6000);
  return page.evaluate(() => {
    const clean = (raw) => {
      if (!raw) return null;
      const d = raw.replace(/[^\d]/g, '');
      if (!d || parseInt(d, 10) < 100) return null;
      return parseInt(d, 10).toLocaleString('fr-FR') + ' €';
    };
    const result = { blackjack_minor: null, blackjack_major: null, ultimate: null };

    const multiItem = document.querySelector('.jackpot-widget-item .content.-multi');
    if (multiItem) {
      multiItem.querySelectorAll('.jackpot-aside-amount').forEach(aside => {
        const titleEl = aside.querySelector('.jackpot-title');
        const amtEl   = aside.querySelector('.jackpot-small');
        if (!titleEl || !amtEl) return;
        const title = titleEl.textContent.trim().toLowerCase();
        const amt   = clean(amtEl.textContent.trim());
        if (title.includes('minor')) result.blackjack_minor = amt;
        if (title.includes('méga') || title.includes('mega') || title.includes('major')) result.blackjack_major = amt;
      });
      if (!result.blackjack_major) {
        const mainAmt = multiItem.querySelector('.jackpot-main-amount');
        if (mainAmt) {
          const cloned = mainAmt.cloneNode(true);
          cloned.querySelectorAll('.jackpot-aside-amount').forEach(e => e.remove());
          const v = clean(cloned.textContent.trim());
          if (v) result.blackjack_major = v;
        }
      }
    }

    document.querySelectorAll('.jackpot-widget-item').forEach(item => {
      if (item.querySelector('.content.-multi')) return;
      const amtEl = item.querySelector('.jackpot-main-amount');
      if (amtEl) {
        const v = clean(amtEl.textContent.trim());
        if (v) result.ultimate = v;
      }
    });

    return result;
  });
}

// ─── 6. Club Montmartre Paris ─────────────────────────────────────────────────
async function scrapeMontmartre(page) {
  let metersData = null;

  page.on('response', async (response) => {
    if (response.url().includes('AtlasSign/GetMeters')) {
      try {
        const text = await response.text();
        metersData = JSON.parse(text);
      } catch (e) {}
    }
  });

  await page.goto('https://www.clubmontmartre-paris.com/', {
    waitUntil: 'networkidle2', timeout: 60000
  });

  // Attendre un peu au cas où l'appel API arrive après networkidle2
  await sleep(3000);

  if (!metersData) throw new Error('Montmartre: GetMeters non capturé');

  const clean = (formattedValue) => {
    if (!formattedValue) return null;
    // Format source : "105.284,90 €" → on garde la partie entière en fr-FR
    const n = parseInt(formattedValue.replace(/[^\d]/g, ''), 10);
    if (!n || n < 100) return null;
    // Diviser par 100 car la valeur est en centimes (Value=10528490 → 105 284,90 €)
    return Math.floor(n / 100).toLocaleString('fr-FR') + ' €';
  };

  const groups = metersData['$values'] || [];
  const result = { mega_ultimate: null, mega_blackjack: null, minor: null };

  for (const group of groups) {
    const name = (group.MeterGroupName || '').toLowerCase();
    const meters = group.liveMeters?.['$values'] || [];

    for (const meter of meters) {
      const formatted = meter.FormattedValue || '';
      const amount = clean(formatted);

      if (name.includes('ultimate') || name.includes('hold')) {
        result.mega_ultimate = amount;
      } else if (name.includes('blazing') || name.includes('blackjack') || name.includes('black')) {
        if (meter.MeterIndex === 1) result.mega_blackjack = amount;
        if (meter.MeterIndex === 2) result.minor = amount;
      }
    }
  }

  console.log('  Montmartre meters bruts:', JSON.stringify(result));
  return result;
}

// ─── 7. Partouche Pasino Club ─────────────────────────────────────────────────
// Jackpots via l'API appolonia-api.partouche.com (site_id 00066).
// Le nom du jeu est dans le champ "name" de la réponse, pas dans le path de
// l'URL (trompeur : /uth/ retourne en fait les compteurs Blackjack "Blazing 7's").
// Ultimate Poker : endpoint pas encore branché côté Partouche — renvoie null en
// attendant, sans faire échouer le scrape.
//
// v4.17 : le site (refonte Astro) charge l'appel /bj/progressive/amount de façon
// différée et n'affiche que le premier compteur (Major) dans le DOM ; la page ne
// atteint en outre plus toujours "networkidle2" (analytics, chat, pubs). On ne
// dépend donc plus du déclenchement de la requête par la page :
//   1. on écoute quand même les réponses (si la page les déclenche),
//   2. on charge en domcontentloaded, on scrolle pour réveiller le chargement différé,
//   3. à défaut, on appelle l'API directement depuis la page (même origine, pas de CORS).
// Réponse : data[].meters[] avec index 1 = Major, index 2 = Minor (valeurs en euros).
async function scrapePasino(page) {
  const responses = [];

  page.on('response', async (response) => {
    if (response.url().includes('appolonia-api.partouche.com/site/00066') &&
        response.url().includes('progressive/amount')) {
      try {
        responses.push(await response.json());
      } catch (e) {}
    }
  });

  // networkidle2 n'est plus fiable sur ce site : on se contente du DOM chargé
  try {
    await page.goto('https://www.partouchepasinoclub.com/', {
      waitUntil: 'domcontentloaded', timeout: 60000
    });
  } catch (e) {
    console.log('  ⚠ Pasino goto:', e.message);
  }

  // Checkpoint anti-bot Vercel : on laisse le challenge JS se résoudre
  const title = await page.title().catch(() => '');
  if (title.includes('Security Checkpoint')) {
    console.log('  ⏳ Pasino: checkpoint anti-bot détecté, attente de résolution...');
    await sleep(5000);
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  }

  // Réveille le chargement différé de la section jackpots, puis attend la réponse
  await page.evaluate(async () => {
    for (let i = 0; i < 10; i++) {
      window.scrollBy(0, 700);
      await new Promise(r => setTimeout(r, 300));
    }
  }).catch(() => {});
  for (let i = 0; i < 20 && responses.length === 0; i++) await sleep(500);

  // Filet de sécurité : appel direct de l'API depuis la page
  if (responses.length === 0) {
    console.log('  ↪ Pasino: aucune réponse interceptée, appel direct de l\'API');
    const direct = await page.evaluate(async () => {
      const out = [];
      for (const ep of ['bj', 'uth']) {
        try {
          const res = await fetch(`https://appolonia-api.partouche.com/site/00066/${ep}/progressive/amount`, { credentials: 'omit' });
          out.push(await res.json());
        } catch (e) {}
      }
      return out;
    }).catch(() => []);
    responses.push(...direct);
  }

  const clean = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 100) return null;
    return Math.floor(n).toLocaleString('fr-FR') + ' €';
  };

  const result = { ultimate: null, blackjack_major: null, blackjack_minor: null };

  for (const json of responses) {
    for (const entry of (json?.data || [])) {
      if (!entry?.meters) continue;
      const name = (entry.name || '').toLowerCase();
      const meters = [...entry.meters].sort((a, b) => (a.index || 0) - (b.index || 0));
      if (name.includes('blazing') || name.includes('black')) {
        if (!result.blackjack_major) result.blackjack_major = clean(meters[0]?.value);
        if (!result.blackjack_minor) result.blackjack_minor = clean(meters[1]?.value);
      } else if (name.includes('ultimate') || name.includes('uth') || name.includes('hold')) {
        if (!result.ultimate) result.ultimate = clean(meters[0]?.value);
      }
    }
  }

  if (!result.blackjack_major) {
    throw new Error('Pasino: aucun jackpot capturé');
  }

  console.log('  Pasino jackpots bruts:', JSON.stringify(result));
  return result;
}

// ─── Scraper principal ────────────────────────────────────────────────────────
const clubs = [
  { id: 'pasino',        name: 'Partouche Pasino Club',  url: 'https://www.partouchepasinoclub.com/',          scrapeFn: scrapePasino },
  { id: 'imperial',      name: 'Imperial Club Paris',    url: 'https://imperialclubparis.com/',                scrapeFn: scrapeImperial },
  { id: 'barriere',      name: 'Club Barrière Paris',    url: 'https://www.casinosbarriere.com/paris',         scrapeFn: scrapeBarriere },
  { id: 'elyseesclub',   name: 'Paris Élysées Club',     url: 'https://www.pariselyseesclub.com/fr/',             scrapeFn: scrapeElysees },
  { id: 'circus',        name: 'Club Circus Paris',      url: 'https://www.circuscasino.fr/fr/casinos/paris/', scrapeFn: scrapeCircus },
  { id: 'pierrecharron', name: 'Club Pierre Charron',    url: 'https://www.clubpierrecharron.com/',            scrapeFn: scrapePierreCharron },
  { id: 'montmartre',    name: 'Club Montmartre Paris',  url: 'https://www.clubmontmartre-paris.com/',         scrapeFn: scrapeMontmartre },
];

async function scrapeClubOnce(browser, club) {
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    // Barrière et Montmartre : ne pas bloquer les requêtes réseau
    // (Barrière a besoin du _payload.json, Montmartre de l'appel GetMeters)
    if (club.id !== 'barriere' && club.id !== 'montmartre' && club.id !== 'pasino') {
      await page.setRequestInterception(true);
      page.on('request', req => {
        if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
        else req.continue();
      });
    }
    // Barrière (v4.19) et Pasino gèrent eux-mêmes leur navigation
    // (écouteur de réponses posé AVANT le goto). Pour les autres, on charge ici.
    const selfNavigating = ['pasino', 'barriere'].includes(club.id);
    if (!selfNavigating) {
      const timeout   = club.id === 'pierrecharron' ? 90000 : 60000;
      const waitUntil = club.id === 'pierrecharron' ? 'domcontentloaded' : 'networkidle2';
      await page.goto(club.url, { waitUntil, timeout });
    }
    return await club.scrapeFn(page);
  } finally {
    await page.close();
  }
}

async function scrapeClub(browser, club) {
  const maxRetries = club.id === 'pierrecharron' ? 3 : 2;
  const retryDelay = club.id === 'pierrecharron' ? 10000 : 5000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  → ${club.url}${attempt > 1 ? ' (tentative ' + attempt + ')' : ''}`);
      const data = await scrapeClubOnce(browser, club);
      console.log(`  ✓ ${club.name} :`, JSON.stringify(data));
      return { ok: true, data };
    } catch (err) {
      console.error(`  ✗ ${club.name} tentative ${attempt} : ${err.message}`);
      if (attempt === maxRetries) {
        return { ok: false, error: err.message, data: {} };
      }
      console.log(`  ↻ Nouvelle tentative dans ${retryDelay / 1000}s...`);
      await sleep(retryDelay);
    }
  }
}

// ─── Historique : conversion valeur formatée "15 062 €" → nombre 15062 ────────
function toNumber(formatted) {
  if (!formatted) return null;
  const digits = String(formatted).replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : null;
}

async function main() {
  console.log('🎰  Jackpots Paris — ' + new Date().toISOString());

  const outPath = path.join(DATA_DIR, 'latest.json');
  let previousResults = {};
  try {
    const prev = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    previousResults = prev.results || {};
    console.log('  📂 Données précédentes chargées');
  } catch (_) {}

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const results = {};
  for (const club of clubs) {
    console.log(`\n[${club.id}]`);
    const result = await scrapeClub(browser, club);

    if (!result.ok && previousResults[club.id] && previousResults[club.id].ok) {
      console.log(`  ↩  Échec — conservation des dernières valeurs connues pour ${club.name}`);
      results[club.id] = {
        ok: false,
        stale: true,
        error: result.error,
        data: previousResults[club.id].data
      };
    } else {
      results[club.id] = result;
    }
  }

  await browser.close();
  const output = { ts: new Date().toISOString(), results };
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log('\n✅  latest.json sauvegardé');

  // ─── Historique pour les courbes (page privée /historique — voir server.js) ─
  const historyEntry = { ts: output.ts, clubs: {} };
  for (const club of clubs) {
    const r = results[club.id];
    if (!r) continue;
    const numericData = {};
    for (const [key, val] of Object.entries(r.data || {})) {
      numericData[key] = toNumber(val);
    }
    historyEntry.clubs[club.id] = numericData;
  }
  const historyPath = path.join(DATA_DIR, 'history.jsonl');
  fs.appendFileSync(historyPath, JSON.stringify(historyEntry) + '\n', 'utf-8');
  console.log('✅  history.jsonl mis à jour (+1 ligne)');

  console.log(JSON.stringify(output, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
