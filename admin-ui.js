// admin-ui.js — panneau caché de saisie manuelle du jackpot UTH Pasino
// Ouverture : 7 clics/taps rapides (moins de 2,5 s entre chaque) sur le titre <h1> de la page
// (à défaut : le footer, sinon le haut de la page).
(function () {
  'use strict';

  var ENDPOINT = '/api/m/uth';
  var TAPS_NEEDED = 7;
  var TAP_WINDOW_MS = 2500;

  var target = document.querySelector('h1') || document.querySelector('footer') || document.body;
  var taps = 0;
  var timer = null;

  target.addEventListener('click', function () {
    taps++;
    clearTimeout(timer);
    timer = setTimeout(function () { taps = 0; }, TAP_WINDOW_MS);
    if (taps >= TAPS_NEEDED) {
      taps = 0;
      openPanel();
    }
  });

  function el(tag, styles, text) {
    var e = document.createElement(tag);
    if (styles) e.style.cssText = styles;
    if (text) e.textContent = text;
    return e;
  }

  function openPanel() {
    if (document.getElementById('_mp')) return;

    var overlay = el('div', 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;');
    overlay.id = '_mp';

    var box = el('div', 'background:#111;border:1px solid #c9a227;border-radius:10px;padding:20px;width:100%;max-width:340px;color:#e8d9a8;font-family:system-ui,sans-serif;box-shadow:0 0 30px rgba(201,162,39,.25);');
    box.appendChild(el('div', 'font-size:16px;font-weight:600;margin-bottom:4px;', 'Pasino — Ultimate Poker'));
    box.appendChild(el('div', 'font-size:12px;opacity:.7;margin-bottom:14px;', 'Saisie manuelle du jackpot'));

    var inputStyle = 'width:100%;box-sizing:border-box;padding:10px;margin-bottom:10px;background:#000;color:#e8d9a8;border:1px solid #5a4a14;border-radius:6px;font-size:16px;';

    var code = el('input', inputStyle);
    code.type = 'password';
    code.placeholder = 'Code';
    code.autocomplete = 'off';

    var amount = el('input', inputStyle);
    amount.type = 'text';
    amount.inputMode = 'numeric';
    amount.placeholder = 'Montant en € (vide = effacer)';
    amount.autocomplete = 'off';

    var msg = el('div', 'min-height:18px;font-size:13px;margin-bottom:10px;');

    var row = el('div', 'display:flex;gap:8px;');
    var btnStyle = 'flex:1;padding:10px;border-radius:6px;border:1px solid #c9a227;font-size:14px;cursor:pointer;';
    var ok = el('button', btnStyle + 'background:#c9a227;color:#111;font-weight:600;', 'Valider');
    var close = el('button', btnStyle + 'background:transparent;color:#e8d9a8;', 'Fermer');
    ok.type = 'button';
    close.type = 'button';

    row.appendChild(ok);
    row.appendChild(close);
    box.appendChild(code);
    box.appendChild(amount);
    box.appendChild(msg);
    box.appendChild(row);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    code.focus();

    function setMsg(text, good) {
      msg.textContent = text;
      msg.style.color = good ? '#7fd17f' : '#ff8a8a';
    }

    function shutdown() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    close.addEventListener('click', shutdown);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) shutdown(); });

    async function submit() {
      ok.disabled = true;
      setMsg('Envoi…', true);
      try {
        var r = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code.value, amount: amount.value }),
        });
        var j = await r.json().catch(function () { return {}; });
        if (r.ok && j.ok) {
          setMsg(j.cleared ? 'Valeur manuelle effacée.' : 'Enregistré : ' + j.value, true);
          setTimeout(function () { location.reload(); }, 900);
        } else {
          setMsg(j.error || 'Erreur (' + r.status + ')', false);
          ok.disabled = false;
        }
      } catch (e) {
        setMsg('Erreur réseau.', false);
        ok.disabled = false;
      }
    }

    ok.addEventListener('click', submit);
    [code, amount].forEach(function (i) {
      i.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    });
  }
})();
