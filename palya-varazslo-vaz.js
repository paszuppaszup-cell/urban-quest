/* ===========================================================
   URBAN QUEST — Pálya varázsló · 2. lépés (váz)
   A kiválasztott helyszínekből sorrendezett, típusokkal és
   pontszámokkal ellátott állomáslistát épít.
   =========================================================== */
(function () {
  'use strict';

  var P = window.PV;
  function $(id) { return document.getElementById(id); }

  var W = null;         /* a varázsló teljes állapota */
  var stations = [];    /* a kész váz */

  /* ---------------- betöltés ---------------- */
  function load() {
    W = P.getWizard();
    if (!W || !W.stations || W.stations.length < 3) {
      $('pvNoData').hidden = false;
      $('pvMain').hidden = true;
      return false;
    }
    $('pvNoData').hidden = true;
    $('pvMain').hidden = false;
    return true;
  }

  function opts() {
    return {
      level: $('pvLevel').value,
      route: ($('pvName').value || '').trim() || 'Névtelen pálya',
      loop: $('pvShape').value === 'loop',
      startUid: $('pvStart').value || ''
    };
  }

  /* ---------------- generálás ---------------- */
  function generate(keepOrder) {
    var o = opts();
    o.keepOrder = !!keepOrder;
    var src = keepOrder ? stations : W.stations;
    stations = P.buildSkeleton(src, o);
    render();
  }

  /* Kézi átrendezés után: a sorrend marad, csak a származtatott
     mezőket (típus, nehézség, pont) számoljuk újra. */
  function recomputeDerived() {
    var o = opts();
    var types = P.assignTypes(stations);
    var n = stations.length;
    stations.forEach(function (s, i) {
      s.route = o.route;
      s.type = types[i];
      s.diff = P.diffAt(o.level, n > 1 ? i / (n - 1) : 0);
      s.points = P.pointsFor(s.diff, s.type);
    });
    render();
  }

  /* ---------------- megjelenítés ---------------- */
  function render() {
    var o = opts();
    var st = P.routeStats(stations, o.loop);
    var solve = P.solveMinutes(stations);
    var pts = stations.reduce(function (a, s) { return a + (s.points || 0); }, 0);

    /* csempék */
    $('stCount').textContent = stations.length;
    var byType = {};
    stations.forEach(function (s) { byType[s.type] = (byType[s.type] || 0) + 1; });
    $('stTypes').textContent = P.TYPES.filter(function (t) { return byType[t.id]; })
      .map(function (t) { return byType[t.id] + ' ' + t.label.toLowerCase(); }).join(' · ');
    $('stDist').textContent = P.fmtDist(st.total);
    $('stTime').textContent = P.fmtMin(st.walkMin + solve);
    $('stTimeBreak').textContent = Math.round(st.walkMin) + ' p séta + ' + Math.round(solve) + ' p feladat';
    $('stPts').textContent = pts;

    /* alsó sáv */
    $('pvBarName').textContent = o.route;
    $('pvBarMeta').textContent = stations.length + ' állomás · ' + P.fmtDist(st.total) +
      ' · ' + P.fmtMin(st.walkMin + solve) + ' · ' + pts + ' pont';

    /* indulóállomás választó */
    var sel = $('pvStart'), cur = sel.value;
    sel.innerHTML = '<option value="">Automatikus (legrövidebb)</option>' +
      W.stations.map(function (s) {
        return '<option value="' + P.esc(s.uid) + '">' + P.esc(s.name) + '</option>';
      }).join('');
    if (cur) sel.value = cur;

    renderStations(st);
    renderLints(o);
  }

  function renderStations(st) {
    var typeOpts = function (cur) {
      return P.TYPES.map(function (t) {
        return '<option value="' + t.id + '"' + (t.id === cur ? ' selected' : '') + '>' + t.label + '</option>';
      }).join('');
    };
    var diffOpts = function (cur) {
      return P.DIFFS.map(function (d) {
        return '<option' + (d === cur ? ' selected' : '') + '>' + d + '</option>';
      }).join('');
    };

    var isLoop = opts().loop;
    $('pvStations').innerHTML = stations.map(function (s, i) {
      var leg = st.legs[i];
      var last = i === stations.length - 1;
      /* körpályánál az utolsó állomás után is van szakasz: a visszaút */
      var legHtml = (leg == null || (last && !isLoop)) ? ''
        : '<div class="pv-leg' + (last ? ' pv-leg-back' : '') + '">' +
          '<svg class="ico ico-xs" aria-hidden="true"><use href="#a-walk"/></svg>' +
          P.fmtDist(leg) + ' · kb. ' + Math.round(leg / (4500 / 60)) + ' perc séta' +
          (last ? ' · vissza az indulóhoz' : '') + '</div>';

      return '<div class="pv-st" data-i="' + i + '">' +
          '<div class="pv-st-n pv-st-n-' + s.type + '">' + (i + 1) + '</div>' +
          '<div class="pv-st-body">' +
            '<div class="pv-st-name">' + P.esc(s.name) +
              (s.weak ? '<span class="pv-tag pv-tag-weak">Név átírandó</span>' : '') +
              ((s.wiki || s.wikidata) ? '<span class="pv-tag pv-tag-wiki">Wikipédia</span>' : '') +
            '</div>' +
            (s.loc ? '<div class="pv-st-addr">' + P.esc(s.loc) + '</div>' : '') +
            '<div class="pv-st-ctl">' +
              '<span class="pv-select pv-select-sm"><select data-f="type" aria-label="Típus">' + typeOpts(s.type) + '</select>' +
                '<svg class="ico ico-xs" aria-hidden="true"><use href="#a-down"/></svg></span>' +
              '<span class="pv-select pv-select-sm"><select data-f="diff" aria-label="Nehézség">' + diffOpts(s.diff) + '</select>' +
                '<svg class="ico ico-xs" aria-hidden="true"><use href="#a-down"/></svg></span>' +
              '<span class="pv-pts"><input type="number" data-f="points" value="' + s.points + '" min="0" max="200" step="5" aria-label="Pontszám"><i>pont</i></span>' +
            '</div>' +
          '</div>' +
          '<div class="pv-st-move">' +
            '<button class="pv-ib" type="button" data-a="up" aria-label="Feljebb"' + (i === 0 ? ' disabled' : '') + '><svg class="ico ico-xs" aria-hidden="true"><use href="#a-up"/></svg></button>' +
            '<button class="pv-ib" type="button" data-a="down" aria-label="Lejjebb"' + (i === stations.length - 1 ? ' disabled' : '') + '><svg class="ico ico-xs" aria-hidden="true"><use href="#a-down"/></svg></button>' +
            '<button class="pv-ib pv-ib-x" type="button" data-a="del" aria-label="Eltávolítás"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-trash"/></svg></button>' +
          '</div>' +
        '</div>' + legHtml;
    }).join('');
  }

  function renderLints(o) {
    var list = P.lint(stations, { loop: o.loop });
    if (!list.length) {
      $('pvLints').innerHTML = '<div class="pv-lint pv-lint-ok">' +
        '<svg class="ico ico-xs" aria-hidden="true"><use href="#a-check"/></svg>Minden rendben, mehet tovább.</div>';
      return;
    }
    $('pvLints').innerHTML = list.map(function (l) {
      return '<div class="pv-lint pv-lint-' + l.lvl + '">' +
        '<svg class="ico ico-xs" aria-hidden="true"><use href="#a-warn"/></svg>' + P.esc(l.msg) + '</div>';
    }).join('');
  }

  /* ---------------- mentés ---------------- */
  function save(silent) {
    W.step = 3;
    W.course = opts();
    W.skeleton = stations;
    W.savedAt = new Date().toISOString();
    if (!P.setWizard(W)) { P.toast('Nem sikerült menteni — tele a böngésző tárhelye.', true); return false; }
    if (!silent) P.toast('Váz elmentve.');
    return true;
  }

  /* ---------------- események ---------------- */
  function init() {
    if (!load()) return;

    /* pályanév-javaslatok a terület nevéből */
    var sugs = P.nameSuggestions(W.area && W.area.n);
    $('pvName').value = sugs[0];
    $('pvNameSug').innerHTML = sugs.slice(1).map(function (s) {
      return '<button class="pv-sug" type="button">' + P.esc(s) + '</button>';
    }).join('');
    $('pvNameSug').addEventListener('click', function (e) {
      var b = e.target.closest('.pv-sug');
      if (!b) return;
      $('pvName').value = b.textContent;
      recomputeDerived();
    });

    generate(false);

    $('pvName').addEventListener('input', function () {
      var o = opts();
      stations.forEach(function (s) { s.route = o.route; });
      $('pvBarName').textContent = o.route;
    });

    /* ezek a beállítások az egész vázat érintik → teljes újragenerálás */
    ['pvLevel', 'pvShape'].forEach(function (id) {
      $(id).addEventListener('change', function () { generate(true); });
    });
    $('pvStart').addEventListener('change', function () { generate(false); });
    $('pvReorder').addEventListener('click', function () {
      generate(false);
      P.toast('Útvonal újraszámolva a legrövidebbre.');
    });
    $('btnRebuild').addEventListener('click', function () {
      generate(false);
      P.toast('Váz újragenerálva.');
    });

    /* soronkénti szerkesztés */
    $('pvStations').addEventListener('change', function (e) {
      var row = e.target.closest('.pv-st');
      if (!row) return;
      var i = +row.getAttribute('data-i');
      var f = e.target.getAttribute('data-f');
      if (!f || !stations[i]) return;

      if (f === 'points') {
        stations[i].points = Math.max(0, parseInt(e.target.value, 10) || 0);
      } else {
        stations[i][f] = e.target.value;
        /* típus vagy nehézség változott → a pont automatikusan követi */
        stations[i].points = P.pointsFor(stations[i].diff, stations[i].type);
      }
      render();
    });

    /* mozgatás és törlés */
    $('pvStations').addEventListener('click', function (e) {
      var b = e.target.closest('.pv-ib');
      if (!b) return;
      var row = b.closest('.pv-st');
      var i = +row.getAttribute('data-i');
      var a = b.getAttribute('data-a');

      if (a === 'up' && i > 0) {
        stations.splice(i - 1, 0, stations.splice(i, 1)[0]);
      } else if (a === 'down' && i < stations.length - 1) {
        stations.splice(i + 1, 0, stations.splice(i, 1)[0]);
      } else if (a === 'del') {
        if (stations.length <= 3) { P.toast('Legalább 3 állomás kell.', true); return; }
        stations.splice(i, 1);
      } else return;

      recomputeDerived();
    });

    /* ---- sorrend-választó ---- */
    var orderBox = document.querySelector('.pv-orders');
    if (orderBox) {
      var paintOrder = function () {
        var cur = P.getOrder(W);
        orderBox.querySelectorAll('.pv-order').forEach(function (b) {
          b.classList.toggle('is-on', b.getAttribute('data-order') === cur);
        });
        /* a lépéssor azonnal átrendeződik, hogy lásd a hatását */
        P.renderSteps('skeleton', W);
        $('pvNext').textContent = cur === 'story' ? 'Tovább a sztorihoz' : 'Tovább a feladatokhoz';
        $('pvNext').insertAdjacentHTML('beforeend',
          '<svg class="ico ico-sm" aria-hidden="true"><use href="#a-right"/></svg>');
        /* NEM tiltjuk a gombot: a tiltott gomb nem magyarázza magát.
           Kattintásra a kezelő megmondja, mi hiányzik. */
        $('pvNext').classList.toggle('is-waiting', !cur);
      };
      orderBox.addEventListener('click', function (e) {
        var b = e.target.closest('.pv-order');
        if (!b) return;
        W.order = b.getAttribute('data-order');
        P.setWizard(W);
        paintOrder();
        P.toast(W.order === 'story'
          ? 'Előbb a sztori készül el, a feladatok utána igazodnak hozzá.'
          : 'Előbb a feladatok készülnek el, a sztori köti majd össze őket.');
      });
      paintOrder();
    }

    $('pvSaveDraft').addEventListener('click', function () { save(false); });
    $('pvNext').addEventListener('click', function () {
      var errs = P.lint(stations, { loop: opts().loop }).filter(function (l) { return l.lvl === 'err'; });
      if (errs.length) { P.toast('Előbb javítsd a hibákat: ' + errs[0].msg, true); return; }
      if (!P.getOrder(W)) { P.toast('Előbb válaszd ki, mi készüljön előbb: a feladatok vagy a sztori.', true); return; }
      if (save(true)) location.href = P.nextPage(W, 'skeleton');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
