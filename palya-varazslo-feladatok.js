/* ===========================================================
   URBAN QUEST — Pálya varázsló · 3. lépés (feladatok)
   =========================================================== */
(function () {
  'use strict';

  var P = window.PV, E = window.PVT;
  function $(id) { return document.getElementById(id); }

  var W = null;
  var facts = {};      /* uid -> tények */
  var tasks = [];      /* állomásonként egy feladat */
  var skips = {};      /* uid -> már látott sablonok (a „másik feladat” gombhoz) */

  var SRC_LABEL = {
    wikidata: { t: 'Wikidata', c: 'wd' },
    text:     { t: 'Wikipédia-szöveg', c: 'tx' },
    generic:  { t: 'Általános', c: 'gen' }
  };
  var TYPE_LABEL = {
    kviz: 'Kvíz', szoveg: 'Szöveges', foto: 'Fotó',
    gps: 'GPS', kod: 'Kód', puzzle: 'Kirakó'
  };

  /* ---------------- betöltés ---------------- */
  function load() {
    W = P.getWizard();
    if (!W || !W.skeleton || !W.skeleton.length) {
      $('pvNoData').hidden = false; $('pvMain').hidden = true;
      return false;
    }
    $('pvNoData').hidden = true; $('pvMain').hidden = false;
    return true;
  }

  /* ---------------- generálás ---------------- */
  function fetchAndBuild() {
    $('pvFetch').disabled = true;
    status('<span class="pv-spin"></span>Tények lekérése a Wikidatáról és a Wikipédiáról…');

    E.fetchFacts(W.skeleton).then(function (F) {
      facts = F;
      tasks = E.generateAll(W.skeleton, facts, W.emotion);
      skips = {};
      W.skeleton.forEach(function (s, i) {
        skips[s.uid] = tasks[i] ? [tasks[i].tpl] : [];
      });
      render();
      var wd = tasks.filter(function (t) { return t && t.src === 'wikidata'; }).length;
      status('✓ Kész — ' + tasks.length + ' feladat, ebből ' + wd + ' valós tényből.', 'is-ok');
    }).catch(function (err) {
      status('Hiba a lekérdezésnél: ' + err.message + ' — próbáld újra.', 'is-err');
      P.toast('Nem sikerült elérni a Wikidatát.', true);
    }).then(function () {
      $('pvFetch').disabled = false;
    });
  }

  function status(html, cls) {
    var s = $('pvStatus');
    s.innerHTML = html || '';
    s.className = 'pv-status' + (cls ? ' ' + cls : '');
  }

  /* egy állomás feladatának cseréje a következő jelöltre */
  function cycle(i) {
    var s = W.skeleton[i];
    var ctx = {
      i: i, stations: W.skeleton,
      allArchitects: [], allCreators: []
    };
    W.skeleton.forEach(function (x) {
      var f = facts[x.uid] || {};
      if (f.architect) ctx.allArchitects.push(f.architect);
      if (f.creator) ctx.allCreators.push(f.creator);
    });

    var seen = skips[s.uid] || [];
    var all = E.alternativesFor(s, facts[s.uid] || {}, ctx);
    /* ha már mindet láttuk, kezdjük elölről */
    if (seen.length >= all.length) seen = [];

    var t = E.generateFor(s, facts[s.uid] || {}, ctx, seen, true);
    if (!t) { P.toast('Nincs másik alkalmas feladat ehhez az állomáshoz.', true); return; }
    seen.push(t.tpl);
    skips[s.uid] = seen;
    tasks[i] = t;
    render();
  }

  /* ---------------- megjelenítés ---------------- */
  function answerHtml(t, i) {
    if (t.type === 'kviz') {
      return '<div class="pv-ans"><span class="pv-ans-h">Válaszlehetőségek — kattints a helyesre</span>' +
        '<div class="pv-opts">' + t.cfg.options.map(function (o, oi) {
          return '<label class="pv-opt' + (o.correct ? ' is-correct' : '') + '">' +
            '<input type="radio" name="corr' + i + '" data-oi="' + oi + '"' + (o.correct ? ' checked' : '') + '>' +
            '<span class="pv-opt-dot"></span>' +
            '<input type="text" class="pv-opt-txt" data-oi="' + oi + '" value="' + P.esc(o.text) + '">' +
          '</label>';
        }).join('') + '</div></div>';
    }
    if (t.type === 'szoveg') {
      return '<div class="pv-ans"><span class="pv-ans-h">Elfogadott válaszok (vesszővel elválasztva)</span>' +
        '<input type="text" class="pv-input pv-accept" value="' + P.esc((t.cfg.accepted || []).join(', ')) + '"></div>';
    }
    if (t.type === 'kod') {
      return '<div class="pv-ans"><span class="pv-ans-h">A megfejtendő kód</span>' +
        '<input type="text" class="pv-input pv-code" value="' + P.esc(t.cfg.code || '') + '"></div>';
    }
    if (t.type === 'gps') {
      return '<div class="pv-ans"><span class="pv-ans-h">Célpont</span>' +
        '<div class="pv-ans-static">' + t.cfg.lat + ', ' + t.cfg.lng +
        ' — ' + (t.cfg.radius || 30) + ' m sugarú körben</div></div>';
    }
    if (t.type === 'foto') {
      return '<div class="pv-ans"><span class="pv-ans-h">Útmutató a fotóhoz</span>' +
        '<input type="text" class="pv-input pv-instr" value="' + P.esc(t.cfg.instruction || '') + '"></div>';
    }
    if (t.type === 'puzzle') {
      return '<div class="pv-ans"><span class="pv-ans-h">Helyes sorrend</span>' +
        '<div class="pv-ans-static">' + (t.cfg.items || []).map(function (x, n) {
          return (n + 1) + '. ' + P.esc(x);
        }).join(' → ') + '</div></div>';
    }
    return '';
  }

  function factsHtml(f) {
    var bits = [];
    if (f.year) bits.push('Évszám: <b>' + P.esc(f.year) + '</b>' + (f.yearSrc === 'text' ? ' (szövegből)' : ''));
    if (f.architect) bits.push('Építész: <b>' + P.esc(f.architect) + '</b>');
    if (f.creator) bits.push('Alkotó: <b>' + P.esc(f.creator) + '</b>');
    if (f.namedAfter) bits.push('Névadó: <b>' + P.esc(f.namedAfter) + '</b>');
    if (f.style) bits.push('Stílus: <b>' + P.esc(f.style) + '</b>');
    if (f.height) bits.push('Magasság: <b>' + P.esc(f.height) + ' m</b>');
    if (f.district) bits.push('Kerület: <b>' + P.esc(f.district) + '</b>');
    if (!bits.length) return '<div class="pv-facts pv-facts-empty">Nincs strukturált adat erről a helyről — általános feladat készült.</div>';
    return '<div class="pv-facts">' + bits.join('<span class="pv-fsep">·</span>') + '</div>';
  }

  /* ===========================================================
     ÉRZELMI ILLESZKEDÉS
     Nem tilt: megmutatja, hogy a választott típus szolgálja-e az
     állomás megrendelt érzését, és egy mondatban megindokolja.
     A szerző szabadon felülírhatja a „Másik feladat" gombbal.
     =========================================================== */
  var emoScore = null, emoPanel = null;

  function emoFrissit() {
    var E2 = window.PVE;
    emoScore = null;
    if (!E2 || !W.emotion || !E2.isComplete(W.emotion)) return;
    emoScore = E2.score(W, W.emotion);
  }

  function emoHtml(i, t) {
    var E2 = window.PVE;
    if (!emoScore || !E2 || !t) return '';
    var sc = emoScore[i];
    if (!sc || !sc.fo) return '';
    var rang = E2.rangOf(sc.fo, t.type);
    var rossz = E2.oltjaE(sc.fo, t.type);
    var cls = rossz ? 'is-bad' : (rang === 0 ? 'is-best' : (rang <= 2 ? 'is-ok' : 'is-weak'));
    var cim = rossz ? 'kioltja' : (rang === 0 ? 'a legjobb választás' : (rang <= 2 ? 'megfelel' : 'gyenge illeszkedés'));
    var jobb = '';
    if (rang > 0) {
      var f = E2.fitOf(sc.fo);
      if (f && f.rang[0] !== t.type) jobb = ' Jobb lenne: ' + (TYPE_LABEL[f.rang[0]] || f.rang[0]) + '.';
    }
    return '<div class="pv-emofit ' + cls + '">' +
      '<span class="pv-emofit-h">' + P.esc(sc.foNev) + '</span>' +
      '<span class="pv-emofit-v">' + cim + '</span>' +
      '<span class="pv-emofit-i">' + P.esc(E2.indokOf(sc.fo)) + P.esc(jobb) + '</span>' +
    '</div>';
  }

  function emoSetup() {
    var E2 = window.PVE;
    if (!E2 || !window.PVEUI) return;
    var kesz = W.emotion && E2.isComplete(W.emotion);
    $('pvEmoOffer').hidden = !!kesz;
    if (kesz) emoNyit();
    $('pvEmoOpen').addEventListener('click', emoNyit);
  }

  function emoNyit() {
    $('pvEmoOffer').hidden = true;
    $('pvEmoHost').hidden = false;
    if (emoPanel) return;
    emoPanel = PVEUI.mount({
      host: 'pvEmoHost', W: W, num: '★',
      onChange: function () {
        /* a terv változásakor újra kell ajánlani — de a MEGLÉVŐ feladatokat
           nem írjuk felül magától, csak a jelzést frissítjük */
        emoFrissit();
        if (tasks && tasks.length) render();
      }
    });
  }

  function render() {
    var srcCount = { wikidata: 0, text: 0, generic: 0 }, imgCount = 0;
    tasks.forEach(function (t) {
      if (!t) return;
      srcCount[t.src] = (srcCount[t.src] || 0) + 1;
      if (t.image) imgCount++;
    });
    $('stWd').textContent = srcCount.wikidata;
    $('stTx').textContent = srcCount.text;
    $('stGen').textContent = srcCount.generic;
    $('stImg').textContent = imgCount;

    $('pvTasks').innerHTML = W.skeleton.map(function (s, i) {
      var t = tasks[i];
      if (!t) return '';
      var f = facts[s.uid] || {};
      var sl = SRC_LABEL[t.src] || SRC_LABEL.generic;

      return '<article class="pv-tc' + (t.verify ? ' is-verify' : '') + '" data-i="' + i + '">' +
        '<header class="pv-tc-head">' +
          '<span class="pv-st-n pv-st-n-' + s.type + '">' + (i + 1) + '</span>' +
          '<div class="pv-tc-title">' +
            '<b>' + P.esc(s.name) + '</b>' +
            '<span class="pv-tc-tags">' +
              '<span class="pv-tag pv-tag-' + sl.c + '">' + sl.t + '</span>' +
              '<span class="pv-tag">' + (TYPE_LABEL[t.type] || t.type) + '</span>' +
              '<span class="pv-tag">' + P.esc(s.diff) + '</span>' +
            '</span>' +
          '</div>' +
          '<div class="pv-tc-act">' +
            '<span class="pv-pts"><input type="number" class="pv-tpts" value="' + t.points + '" min="0" max="200" step="5" aria-label="Pontszám"><i>pont</i></span>' +
            '<button class="adm-btn pv-btn-sm pv-cycle" type="button"' + (t.alternatives ? '' : ' disabled') + '>' +
              '<svg class="ico ico-sm" aria-hidden="true"><use href="#a-shuffle"/></svg>Másik feladat</button>' +
          '</div>' +
        '</header>' +

        '<div class="pv-tc-body' + (t.image ? '' : ' no-img') + '">' +
          (t.image ? '<img class="pv-tc-img" src="' + P.esc(t.image) + '" alt="' +
             P.esc(s.name) + '" loading="lazy">' : '') +
          '<div>' +
            '<label class="pv-tc-q"><span class="pv-ans-h">A feladat szövege</span>' +
              '<textarea class="pv-qtext" rows="2">' + P.esc(t.question) + '</textarea></label>' +
            answerHtml(t, i) +
          '</div>' +
        '</div>' +

        (t.evidence ? '<blockquote class="pv-evi"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-warn"/></svg>' +
          '<span><b>Ellenőrizd!</b> Ez a Wikipédia-mondatból származik: „' + P.esc(t.evidence) + '”</span></blockquote>' : '') +
        (t.spoiled ? '<blockquote class="pv-evi is-spoil"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-warn"/></svg>' +
          '<span><b>A sztori elárulja a megoldást.</b> Nem volt olyan sablon, ami elkerülné — ' +
          'kérj másik feladatot, vagy írd át az állomás szövegét.</span></blockquote>' : '') +

        factsHtml(f) +
        emoHtml(i, t) +
        '<div class="pv-tc-note">' + P.esc(t.note) + '</div>' +
      '</article>';
    }).join('');

    var pts = tasks.reduce(function (a, t) { return a + (t ? t.points : 0); }, 0);
    $('pvBar').hidden = false;
    $('pvBarName').textContent = (W.course && W.course.route) || 'Pálya';
    $('pvBarMeta').textContent = tasks.length + ' feladat · ' + pts + ' pont · ' +
      srcCount.wikidata + ' valós tényből';
  }

  /* ---------------- szerkesztés ---------------- */
  function wire() {
    var box = $('pvTasks');

    box.addEventListener('input', function (e) {
      var card = e.target.closest('.pv-tc');
      if (!card) return;
      var i = +card.getAttribute('data-i'), t = tasks[i];
      if (!t) return;

      if (e.target.classList.contains('pv-qtext')) t.question = e.target.value;
      else if (e.target.classList.contains('pv-opt-txt')) {
        t.cfg.options[+e.target.getAttribute('data-oi')].text = e.target.value;
      }
      else if (e.target.classList.contains('pv-accept')) {
        t.cfg.accepted = e.target.value.split(',').map(function (x) { return x.trim().toLowerCase(); })
                          .filter(Boolean);
      }
      else if (e.target.classList.contains('pv-code')) t.cfg.code = e.target.value;
      else if (e.target.classList.contains('pv-instr')) t.cfg.instruction = e.target.value;
      else if (e.target.classList.contains('pv-tpts')) {
        t.points = Math.max(0, parseInt(e.target.value, 10) || 0);
        var pts = tasks.reduce(function (a, x) { return a + (x ? x.points : 0); }, 0);
        $('pvBarMeta').textContent = tasks.length + ' feladat · ' + pts + ' pont · ' +
          tasks.filter(function (x) { return x && x.src === 'wikidata'; }).length + ' valós tényből';
      }
    });

    /* helyes válasz átállítása */
    box.addEventListener('change', function (e) {
      if (e.target.type !== 'radio') return;
      var card = e.target.closest('.pv-tc');
      var i = +card.getAttribute('data-i'), t = tasks[i];
      var oi = +e.target.getAttribute('data-oi');
      t.cfg.options.forEach(function (o, n) { o.correct = (n === oi); });
      card.querySelectorAll('.pv-opt').forEach(function (el, n) {
        el.classList.toggle('is-correct', n === oi);
      });
    });

    box.addEventListener('click', function (e) {
      var b = e.target.closest('.pv-cycle');
      if (!b) return;
      cycle(+b.closest('.pv-tc').getAttribute('data-i'));
    });

    $('pvFetch').addEventListener('click', fetchAndBuild);
    $('btnRegen').addEventListener('click', function () {
      if (!Object.keys(facts).length) { fetchAndBuild(); return; }
      tasks = E.generateAll(W.skeleton, facts, W.emotion);
      skips = {};
      render();
      P.toast('Feladatok újragenerálva.');
    });

    $('pvSave').addEventListener('click', function () { save(false); });
    $('pvNext').addEventListener('click', function () {
      var bad = validate();
      if (bad.length) { P.toast(bad[0], true); return; }
      if (save(true)) location.href = P.nextPage(W, "tasks");
    });
  }

  /* ---------------- ellenőrzés ---------------- */
  function validate() {
    var out = [];
    tasks.forEach(function (t, i) {
      if (!t) { out.push((i + 1) + '. állomásnak nincs feladata.'); return; }
      if (!t.question.trim()) out.push((i + 1) + '. feladat szövege üres.');
      if (t.type === 'kviz') {
        var c = t.cfg.options.filter(function (o) { return o.correct; }).length;
        if (c !== 1) out.push((i + 1) + '. kvíznél pontosan egy helyes válasz kell.');
        if (t.cfg.options.some(function (o) { return !o.text.trim(); }))
          out.push((i + 1) + '. kvíznél üres válaszlehetőség van.');
      }
      if (t.type === 'szoveg' && !(t.cfg.accepted || []).length)
        out.push((i + 1) + '. szöveges feladatnak nincs elfogadott válasza.');
      if (t.type === 'kod' && !String(t.cfg.code || '').trim())
        out.push((i + 1) + '. kódfeladatnak nincs kódja.');
    });
    return out;
  }

  function save(silent) {
    W.step = 4;
    W.tasks = tasks.map(function (t, i) {
      /* a quest-courses.js sémájára illesztve */
      return {
        question: t.question,
        station: W.skeleton[i].name,
        route: W.skeleton[i].route,
        type: t.type,
        points: t.points,
        cfg: t.cfg,
        image: t.image || '',
        _src: t.src, _tpl: t.tpl, _spoiled: !!t.spoiled
      };
    });
    W.facts = facts;
    W.savedAt = new Date().toISOString();
    if (!P.setWizard(W)) { P.toast('Nem sikerült menteni — tele a tárhely.', true); return false; }
    if (!silent) P.toast('Feladatok elmentve.');
    return true;
  }

  function init() {
    if (window.PV && PV.renderSteps) { PV.renderSteps('tasks'); PV.fixBackLink('tasks'); }
    if (!load()) return;
    wire();
    emoFrissit();
    emoSetup();
    /* ha korábban már generáltunk, töltsük vissza */
    if (W.tasks && W.tasks.length && W.facts) {
      facts = W.facts;
      tasks = W.tasks.map(function (t) {
        return { tpl: t._tpl, src: t._src, question: t.question, station: t.station,
                 route: t.route, type: t.type, points: t.points, cfg: t.cfg,
                 note: '', evidence: '', verify: false, image: t.image || '',
                 spoiled: !!t._spoiled, alternatives: 3 };
      });
      render();
      status('Korábban generált feladatok betöltve.', 'is-ok');
    } else {
      fetchAndBuild();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
