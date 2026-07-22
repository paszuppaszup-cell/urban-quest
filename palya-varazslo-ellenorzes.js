/* ===========================================================
   URBAN QUEST — Pálya varázsló · 5. lépés (ellenőrzés + publikálás)
   =========================================================== */
(function () {
  'use strict';

  var P = window.PV, X = window.PVP;
  function $(id) { return document.getElementById(id); }

  var W = null;
  var snippets = { course: '', card: '' };

  function load() {
    W = P.getWizard();
    if (!W || !W.skeleton || !W.skeleton.length || !W.tasks || !W.tasks.length) {
      $('pvNoData').hidden = false; $('pvMain').hidden = true;
      return false;
    }
    $('pvNoData').hidden = true; $('pvMain').hidden = false;
    return true;
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

  /* ---------------- megjelenítés ---------------- */
  function render() {
    var sum = X.summary(W);
    var lint = X.fullLint(W);
    var errs = lint.filter(function (l) { return l.lvl === 'err'; });
    var warns = lint.filter(function (l) { return l.lvl === 'warn'; });

    $('stCount').textContent = sum.stations;
    $('stStory').textContent = sum.withStory + ' állomásnak van sztorija';
    $('stDist').textContent = P.fmtDist(sum.distance);
    $('stTime').textContent = 'kb. ' + P.fmtMin(sum.minutes) + ' összesen';
    $('stTasks').textContent = sum.tasks;
    $('stImg').textContent = sum.withImage + ' képpel';
    $('stPts').textContent = sum.points;

    /* ítélet */
    var v = $('pvVerdict');
    if (errs.length) {
      v.className = 'pv-verdict is-err';
      v.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#a-warn"/></svg>' +
        '<div><b>' + errs.length + ' hiba javításra vár</b>' +
        '<span>Ezekkel a pálya nem játszható végig rendesen. A figyelmeztetések (' +
        warns.length + ') nem blokkolók.</span></div>';
    } else if (warns.length) {
      v.className = 'pv-verdict is-warn';
      v.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#a-warn"/></svg>' +
        '<div><b>Játszható, de ' + warns.length + ' dolgot érdemes megnézni</b>' +
        '<span>Egyik sem blokkolja a publikálást.</span></div>';
    } else {
      v.className = 'pv-verdict is-ok';
      v.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#a-check-c"/></svg>' +
        '<div><b>A pálya készen áll</b><span>Nem találtam hibát. Mehet a publikálás.</span></div>';
    }

    /* tételek — hibák elöl */
    var rows = errs.concat(warns);
    $('pvLints').innerHTML = rows.length
      ? rows.map(function (l) {
          return '<div class="pv-lint pv-lint-' + l.lvl + '">' +
            '<svg class="ico ico-xs" aria-hidden="true"><use href="#a-warn"/></svg>' +
            '<span>' + (l.where ? '<b>' + P.esc(l.where) + '</b> — ' : '') + P.esc(l.msg) + '</span></div>';
        }).join('')
      : '';

    /* kódrészletek */
    var c = X.questCourseSnippet(W), k = X.questCardSnippet(W);
    snippets.course = c.code; snippets.card = k.code;
    $('pvCodeCourse').textContent = c.code;
    $('pvCodeCard').textContent = k.code;

    /* hiányzó vagy elszakadt sztori-szövegek — célzott pótlás egy gombbal,
       hogy ne kelljen az egész 4. lépést újrafuttatni */
    var g = window.PVS ? window.PVS.gaps(W) : { missing: [], dangling: [] };
    var need = g.missing.length + g.dangling.filter(function (i) { return g.missing.indexOf(i) < 0; }).length;
    $('pvGapRow').hidden = need === 0;
    if (need) {
      $('pvGapInfo').textContent = need + ' állomás szövege hiányzik vagy elszakadt. ' +
        'Illeszd be egy MI-beszélgetésbe, a választ pedig a 4. lépés Beolvasztás mezőjébe.';
    }

    $('pvPlay').href = 'jatszas.html?route=' + encodeURIComponent(sum.route);
    $('pvBarName').textContent = sum.route;
    $('pvBarMeta').textContent = sum.stations + ' állomás · ' + sum.tasks + ' feladat · ' +
      P.fmtDist(sum.distance) + ' · ' + sum.points + ' pont';

    return { errs: errs, warns: warns };
  }

  /* ---------------- admin mentés ---------------- */
  function publishAdmin() {
    var st = $('pvAdminStatus');
    var lint = X.fullLint(W).filter(function (l) { return l.lvl === 'err'; });
    if (lint.length) {
      if (!window.confirm(lint.length + ' hiba van a pályán.\n\n' +
          'Mentheted így is (kipróbálásra jó), de a játékos hibás pályát kapna.\n\nFolytatod?')) return;
    }

    /* ütközés: már van ilyen nevű pálya, amit nem most csináltunk */
    if (X.nameConflict(W) && !W._published) {
      if (!window.confirm('Már létezik „' + (W.course && W.course.route) + '” nevű pálya.\n\n' +
          'A mentés FELÜLÍRJA annak állomásait és feladatait.\n\nFolytatod?')) return;
    }

    var r = X.publishToAdmin(W);
    if (!r.ok) { st.textContent = r.err; st.className = 'pv-status is-err'; P.toast(r.err, true); return; }

    W._published = true;
    P.setWizard(W);
    st.innerHTML = '✓ ' + (r.replaced ? 'Frissítve' : 'Mentve') + ' — ' + r.stations +
      ' állomás és ' + r.tasks + ' feladat. Most már végigjátszható.';
    st.className = 'pv-status is-ok';
    P.toast('Mentve az adminba — próbáld ki a Végigjátszás gombbal.');
  }

  /* ---------------- új pálya ---------------- */
  function newCourse() {
    if (!window.confirm('Új pálya indításához törlöm a varázsló jelenlegi állapotát.\n\n' +
        'A már elmentett pálya (állomások, feladatok) MEGMARAD az adminban.\n\nFolytatod?')) return;
    try { localStorage.removeItem(P.KEY); } catch (e) {}
    location.href = 'palya-varazslo.html';
  }

  /* ---------------- indítás ---------------- */
  function init() {
    if (window.PV && PV.renderSteps) { PV.renderSteps('check'); PV.fixBackLink('check'); }
    if (!load()) return;
    render();

    $('btnRecheck').addEventListener('click', function () {
      W = P.getWizard();
      var r = render();
      P.toast(r.errs.length ? r.errs.length + ' hiba maradt.' : 'Nincs hiba — mehet.',
              r.errs.length > 0);
    });

    $('pvPublishAdmin').addEventListener('click', publishAdmin);

    $('pvGapCopy').addEventListener('click', function () {
      var p = window.PVS ? window.PVS.buildGapPrompt(W) : '';
      if (!p) { P.toast('Nincs pótolandó szöveg.', true); return; }
      copyText(p, 'Hiánypótló prompt a vágólapon — a választ a 4. lépésbe illeszd be.');
    });
    $('pvNewCourse').addEventListener('click', newCourse);

    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-copy]');
      if (!b) return;
      var which = b.getAttribute('data-copy');
      copyText(snippets[which] || '',
        which === 'course' ? 'A quest-courses.js kódrészlet a vágólapon.'
                           : 'A data.js kódrészlet a vágólapon.');
    });

    /* ha még nem mentettük, a Végigjátszás link félrevezető lenne */
    $('pvPlay').addEventListener('click', function (e) {
      var cur = P.lsGet('uq_stations_v1', []);
      var route = (W.course && W.course.route) || '';
      var van = Array.isArray(cur) && cur.some(function (s) { return s.route === route; });
      if (!van) {
        e.preventDefault();
        P.toast('Előbb mentsd az adminba — onnan tudja betölteni a játékmotor.', true);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
