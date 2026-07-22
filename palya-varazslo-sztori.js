/* ===========================================================
   URBAN QUEST — Pálya varázsló · 4. lépés (sztori)
   Prompt-híd: a felhasználó viszi át a szöveget egy MI-be és vissza.
   =========================================================== */
(function () {
  'use strict';

  var P = window.PV, S = window.PVS;
  function $(id) { return document.getElementById(id); }

  var W = null;
  var res = null;      /* a legutóbbi ellenőrzés eredménye */
  var batches = [];
  var bIdx = 0;

  /* ---------------- betöltés ---------------- */
  function load() {
    W = P.getWizard();
    /* Sztori-először módban még NINCSENEK feladatok — az sem baj.
       Csak a váz szükséges; a feladatok utána igazodnak a történethez. */
    var kellFeladat = !P.isStoryFirst(W);
    if (!W || !W.skeleton || !W.skeleton.length || (kellFeladat && (!W.tasks || !W.tasks.length))) {
      $('pvNoData').hidden = false; $('pvMain').hidden = true;
      return false;
    }
    $('pvNoData').hidden = true; $('pvMain').hidden = false;
    return true;
  }

  function status(html, cls) {
    var el = $('pvStatus');
    el.innerHTML = html || '';
    el.className = 'pv-status' + (cls ? ' ' + cls : '');
  }

  /* ---------------- prompt ---------------- */
  function currentPrompt() {
    var b = batches[bIdx] || { from: 0, to: W.skeleton.length };
    return S.buildPrompt(W, {
      tone: $('pvTone').value,
      extra: ($('pvExtra').value || '').trim(),
      from: b.from, to: b.to,
      prevTail: bIdx > 0 ? lastDescOf(b.from - 1) : '',
      prevArc: W.arc || ''
    });
  }

  function lastDescOf(i) {
    var s = W.skeleton[i];
    if (!s || !s.desc) return '';
    var parts = String(s.desc).split(/(?<=[.!?])\s+/);
    return parts[parts.length - 1] || s.desc;
  }

  function refreshPrompt() {
    var p = currentPrompt();
    $('pvPromptBox').value = p;
    $('pvPromptInfo').textContent = p.length.toLocaleString('hu-HU') + ' karakter';
  }

  function copyText(txt, okMsg) {
    var done = function () { P.toast(okMsg); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done, fallback);
    } else fallback();

    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = txt;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); }
      catch (e) { P.toast('A másolás nem sikerült — jelöld ki kézzel.', true); }
      document.body.removeChild(ta);
    }
  }

  /* ---------------- kötegek ---------------- */
  function setupBatches() {
    batches = S.batchPlan(W);
    if (batches.length < 2) { $('pvBatchBar').hidden = true; return; }
    $('pvBatchBar').hidden = false;
    $('pvBatchBtns').innerHTML = batches.map(function (b, i) {
      return '<button class="pv-sug' + (i === bIdx ? ' is-on' : '') + '" type="button" data-b="' + i + '">' +
             (b.from + 1) + '–' + b.to + '</button>';
    }).join('');
    $('pvBatchInfo').textContent = 'A pálya ' + W.skeleton.length +
      ' állomásos, ezért ' + batches.length + ' körben kérjük be — így nem csonkul a válasz. Aktuális kör:';
  }

  /* ---------------- import ---------------- */
  function doImport() {
    var raw = $('pvPaste').value;
    if (!raw.trim()) { status('Előbb illeszd be a modell válaszát.', 'is-err'); return; }

    var ex = S.extract(raw);
    if (!ex.ok) { status(ex.err, 'is-err'); $('pvResultBox').hidden = true; return; }

    var b = batches[bIdx] || { from: 0, to: W.skeleton.length };
    res = S.validate(W, ex.data, {
      batch: batches.length > 1, from: b.from, to: b.to
    });

    if (ex.partial) {
      res.issues.unshift({ lvl: 'warn', msg: 'A válasz csonka volt — amit lehetett, kimentettem belőle.' });
    }
    renderResult();
  }

  /* ---------------- megjelenítés ---------------- */
  function renderResult() {
    $('pvResultBox').hidden = false;
    $('pvBar').hidden = false;

    /* fejléc-mezők */
    var h = res.head || {};
    var hasHead = h.heroTitle || h.intro;
    $('pvHeadPrev').hidden = !hasHead;
    if (hasHead) {
      $('pvHero').value = h.heroTitle || '';
      $('pvIntro').value = h.intro || '';
      $('pvArc').innerHTML = h.arc ? '<span class="pv-ans-h">A történet íve</span>' + P.esc(h.arc) : '';
      $('pvArc').hidden = !h.arc;
    }

    /* általános üzenetek */
    var iss = res.issues || [];
    $('pvIssues').innerHTML = iss.length
      ? iss.map(function (l) {
          return '<div class="pv-lint pv-lint-' + l.lvl + '">' +
            '<svg class="ico ico-xs" aria-hidden="true"><use href="#a-warn"/></svg>' + P.esc(l.msg) + '</div>';
        }).join('')
      : '<div class="pv-lint pv-lint-ok"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-check"/></svg>' +
        'A válasz rendben megérkezett.</div>';

    /* állomássorok */
    var byIdx = {};
    (res.rows || []).forEach(function (r) { byIdx[r.idx] = r; });

    $('pvRows').innerHTML = W.skeleton.map(function (s, i) {
      var r = byIdx[i];
      if (!r) {
        return '<div class="pv-srow is-missing">' +
          '<span class="pv-st-n pv-st-n-' + s.type + '">' + (i + 1) + '</span>' +
          '<div><b>' + P.esc(s.name) + '</b>' +
          '<div class="pv-srow-miss">Ehhez az állomáshoz nem érkezett szöveg.</div></div></div>';
      }
      var err = r.flags.some(function (f) { return f.lvl === 'err'; });
      return '<div class="pv-srow' + (err ? ' is-err' : '') + '" data-i="' + i + '">' +
        '<span class="pv-st-n pv-st-n-' + s.type + '">' + (i + 1) + '</span>' +
        '<div>' +
          '<b>' + P.esc(s.name) + '</b>' +
          '<span class="pv-role">' + S.roleOf(s, i, W.skeleton.length) + '</span>' +
          (r.motivum ? '<span class="pv-motif">↓ ' + P.esc(r.motivum) + '</span>' : '') +
          '<textarea class="pv-qtext pv-rdesc" rows="2" data-i="' + i + '">' + P.esc(r.desc) + '</textarea>' +
          (r.taskShort ? '<input type="text" class="pv-input pv-rshort" data-i="' + i + '" value="' + P.esc(r.taskShort) + '">' : '') +
          (r.forras ? '<div class="pv-forras">forrás: „' + P.esc(r.forras) + '”</div>' : '') +
          r.flags.map(function (f) {
            return '<div class="pv-lint pv-lint-' + f.lvl + ' pv-lint-sm">' +
              '<svg class="ico ico-xs" aria-hidden="true"><use href="#a-warn"/></svg>' + P.esc(f.msg) + '</div>';
          }).join('') +
        '</div>' +
      '</div>';
    }).join('');

    var errs = (res.rows || []).filter(function (r) {
      return r.flags.some(function (f) { return f.lvl === 'err'; });
    });
    /* A javító prompt nem CSAK a hibákat viszi vissza: az évszám- és
       alkotó-figyelmeztetés `fix: true`-val van megjelölve, mert azok is
       a modellnek szólnak. Enélkül a figyelmeztetés sehova nem jutna el —
       a flagek a beolvasztás után nem élnek tovább. */
    $('pvFixRow').hidden = javitandok().length === 0;

    $('pvBarName').textContent = (W.course && W.course.route) || 'Pálya';
    $('pvBarMeta').textContent = res.matched + '/' + W.skeleton.length + ' állomás megérkezett' +
      (errs.length ? ' · ' + errs.length + ' hibás' : ' · nincs hiba');
    status('Ellenőrzés kész.', errs.length ? 'is-err' : 'is-ok');
  }

  /* ---------------- javító prompt ---------------- */
  function javitando(f) { return f.lvl === 'err' || f.fix === true; }
  function javitandok() {
    return (res && res.rows || []).filter(function (r) { return r.flags.some(javitando); });
  }

  function buildFixPrompt() {
    var bad = javitandok();
    var L = ['A korábban küldött sztoriban az alábbi állomásoknál javítanivaló van. CSAK ezeket írd újra, ' +
             'ugyanabban a JSON alakban (csak az „allomasok" tömb, csak az érintett állomásokkal). ' +
             'A többi állomás maradjon változatlan — azokat ne küldd vissza.', ''];
    bad.forEach(function (r) {
      var s = W.skeleton[r.idx];
      L.push('── ' + (r.idx + 1) + '. ' + s.name + '  (uid: ' + s.uid + ')');
      r.flags.filter(javitando).forEach(function (f) {
        L.push('   • ' + f.msg);
      });
      L.push('');
    });
    L.push('Emlékeztető: a szereplőket és a sorsukat nyugodtan találd ki — csak az ÉPÍTMÉNYHEZ ' +
           'kötött évszámot kerüld forrás nélkül. A feladat megoldását viszont SOHA ne áruld el. ' +
           'Magyarul írj, tegeződve, és ne használj " karaktert a szövegben.');
    return L.join('\n');
  }

  /* ---------------- beolvasztás ---------------- */
  function applyMerge() {
    if (!res) { P.toast('Előbb olvassz be egy választ.', true); return; }

    /* a kézi szerkesztések átvétele a sorokból */
    document.querySelectorAll('.pv-rdesc').forEach(function (el) {
      var r = (res.rows || []).filter(function (x) { return x.idx === +el.getAttribute('data-i'); })[0];
      if (r) r.desc = el.value.trim();
    });
    document.querySelectorAll('.pv-rshort').forEach(function (el) {
      var r = (res.rows || []).filter(function (x) { return x.idx === +el.getAttribute('data-i'); })[0];
      if (r) r.taskShort = el.value.trim();
    });
    if (res.head) {
      res.head.heroTitle = $('pvHero').value.trim();
      res.head.intro = $('pvIntro').value.trim();
    }

    var errs = (res.rows || []).filter(function (r) {
      return r.flags.some(function (f) { return f.lvl === 'err'; });
    });
    var skipErrors = false;
    if (errs.length) {
      skipErrors = !window.confirm(
        errs.length + ' állomásnál hiba van (elárult megoldás, üres vagy nem magyar szöveg).\n\n' +
        'OK  = mégis beolvasztom mindet\n' +
        'Mégse = a hibás állomásokat kihagyom');
    }

    var m = S.merge(W, res, { skipErrors: skipErrors, applyTitle: $('pvApplyTitle').checked });
    if (!m.ok) { P.toast(m.err, true); return; }

    W.step = 5;
    W.savedAt = new Date().toISOString();
    if (!P.setWizard(W)) {
      P.toast('Nem sikerült menteni — lehet, hogy tele a böngésző tárhelye.', true);
      return;
    }
    var n = (res.rows || []).length - (skipErrors ? errs.length : 0);
    P.toast(n + ' állomás szövege beolvasztva.');
    $('pvBarMeta').textContent = 'Beolvasztva — ' + n + ' állomás szövege mentve.';
  }

  /* ---------------- MI nélküli menekülőút ---------------- */
  function useFallback() {
    if (!window.confirm('Sablonos leírásokat készítek a már letöltött adatokból. Nem lesz benne ' +
                        'kitalált szereplő és összefüggő történet — csak a helyszínek. Azonnal kész.\n\nFolytatod?')) return;
    res = S.fallbackStory(W);
    res.issues = [{ lvl: 'warn', msg: 'MI nélküli, sablonos szöveg: nincs benne kitalált szereplő és nincs érzelmi ív — érdemes átírni.' }];
    renderResult();
    P.toast('Sablonos szöveg elkészült — nézd át, mielőtt beolvasztod.');
  }

  /* Az érzelmi terv panel a pv-emotion-ui.js-ben él, mert a feladatok
     lépés is felkínálja ugyanazt — két kézzel karbantartott másolat
     előbb-utóbb elcsúszna egymástól. */
  var emoPanel = null;

  /* Van-e már bármilyen letöltött tény? (A feladat-először sorrendben
     a Feladatok lépés már lekérte őket — akkor nincs dolgunk.) */
  function vanTeny() {
    var f = W.facts || {};
    return Object.keys(f).length > 0;
  }

  function tenyeketPotol() {
    if (!window.PVT || vanTeny()) return;
    var kell = (W.skeleton || []).some(function (s) { return s.wiki || s.wikidata; });
    if (!kell) return;   /* nincs mit lekérni, ne fárasszuk a szervert */

    status('<span class="pv-spin"></span>Wikipédia- és Wikidata-adatok lekérése a történethez…');
    PVT.fetchFacts(W.skeleton).then(function (facts) {
      W.facts = facts;
      P.setWizard(W);
      var db = Object.keys(facts).filter(function (k) {
        var x = facts[k] || {};
        return !!(x.year || x.architect || x.creator || x.namedAfter || x.style || x.height || x.extract);
      }).length;
      refreshPrompt();
      if (emoPanel && emoPanel.ujra) emoPanel.ujra();
      status(db + ' állomáshoz találtam valós adatot — ezek bekerültek a promptba.', 'is-ok');
    }).catch(function () {
      status('Az adatlekérés nem sikerült. A történet enélkül is megírható, csak kevesebb valós részlettel.', 'is-err');
    });
  }

  /* ---------------- indítás ---------------- */
  function init() {
    if (window.PV && PV.renderSteps) { PV.renderSteps('story'); PV.fixBackLink('story'); }
    if (!load()) return;

    /* Sztori-először módban a sztori a 3. lépés, nem a 4. — a fejléc
       ne mondjon mást, mint a fenti lépéssáv. */
    var sub = document.querySelector('.pv-h-sub');
    if (sub && PV.steps) {
      var lst = PV.steps(W), n = 0;
      lst.forEach(function (s, i) { if (s.key === 'story') n = i + 1; });
      if (n) sub.textContent = n + '. lépés — a történet, ami összeköti az állomásokat';
    }

    $('pvTone').innerHTML = S.TONES.map(function (t) {
      return '<option value="' + t.id + '">' + P.esc(t.label) + ' — ' + P.esc(t.hint) + '</option>';
    }).join('');

    emoPanel = window.PVEUI && PVEUI.mount({
      host: 'pvEmoHost', W: W, num: '0', onChange: refreshPrompt
    });

    /* TÉNYEK SZTORI-ELŐSZÖR MÓDBAN.
       A ténylekérés eredetileg a Feladatok lépésben futott. Sztori-először
       sorrendben viszont a sztori HAMARABB készül, így a prompt minden
       állomásnál „(nincs adat)"-ot mutatott — még ott is, ahol van
       Wikipédia-szócikk. A sorrend-választó tehát csendben rontotta a
       sztorit. Itt pótoljuk, mielőtt a szerző kimásolja a promptot. */
    tenyeketPotol();
    setupBatches();
    refreshPrompt();

    $('pvTone').addEventListener('change', refreshPrompt);
    $('pvExtra').addEventListener('input', refreshPrompt);

    $('pvBatchBtns').addEventListener('click', function (e) {
      var b = e.target.closest('[data-b]');
      if (!b) return;
      bIdx = +b.getAttribute('data-b');
      setupBatches();
      refreshPrompt();
    });

    $('pvCopy').addEventListener('click', function () {
      copyText(currentPrompt(), 'Prompt a vágólapon — illeszd be egy MI-beszélgetésbe.');
    });
    $('pvShowPrompt').addEventListener('click', function () {
      var box = $('pvPromptBox');
      box.hidden = !box.hidden;
      $('pvShowPrompt').lastChild.nodeValue = box.hidden ? 'Megnézem' : 'Elrejtem';
    });

    $('pvImport').addEventListener('click', doImport);
    $('pvClearPaste').addEventListener('click', function () {
      $('pvPaste').value = ''; status('');
    });
    $('pvFixCopy').addEventListener('click', function () {
      copyText(buildFixPrompt(), 'Javító prompt a vágólapon.');
    });
    $('btnFallback').addEventListener('click', useFallback);
    $('pvApply').addEventListener('click', applyMerge);

    $('pvNext').addEventListener('click', function () {
      var kesz = (W.skeleton || []).filter(function (s) { return s.desc; }).length;
      if (!kesz) { P.toast('Előbb olvassz be egy sztorit (vagy használd az MI nélküli változatot).', true); return; }
      W.step = 5;
      P.setWizard(W);
      location.href = P.nextPage(W, "story");
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
