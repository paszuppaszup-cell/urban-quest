/* ===========================================================
   URBAN QUEST — Pálya varázsló · 5. lépés (ellenőrzés + publikálás)
   =========================================================== */
(function () {
  'use strict';

  var P = window.PV, X = window.PVP;
  function $(id) { return document.getElementById(id); }

  var W = null;

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

    /* A kódrészlet-dobozok megszűntek: a pályák az adatbázisban élnek, nem
       fájlokban, és a részlet a feladatok nyers megoldásait is kiírta volna. */

    /* hiányzó vagy elszakadt sztori-szövegek — célzott pótlás egy gombbal,
       hogy ne kelljen az egész 4. lépést újrafuttatni */
    var g = window.PVS ? window.PVS.gaps(W) : { missing: [], dangling: [] };
    var need = g.missing.length + g.dangling.filter(function (i) { return g.missing.indexOf(i) < 0; }).length;
    $('pvGapRow').hidden = need === 0;
    if (need) {
      $('pvGapInfo').textContent = need + ' állomás szövege hiányzik vagy elszakadt. ' +
        'Illeszd be egy MI-beszélgetésbe, a választ pedig a 4. lépés Beolvasztás mezőjébe.';
    }

    /* A Végigjátszás csak mentés UTÁN vezet valahová: a lejátszó a pálya
       befagyasztott verzióját játssza le, ami a mentéskor készül el. Amíg
       nincs mentve, nem adunk félrevezető hivatkozást. */
    frissitJatszasLink();
    $('pvBarName').textContent = sum.route;
    $('pvBarMeta').textContent = sum.stations + ' állomás · ' + sum.tasks + ' feladat · ' +
      P.fmtDist(sum.distance) + ' · ' + sum.points + ' pont';

    return { errs: errs, warns: warns };
  }

  /* ---------------- Végigjátszás gomb állapota ----------------
     Az őrfeltétel korábban a HALOTT uq_stations_v1 kulcsot olvasta, ezért
     mentés után is azt írta ki, hogy „Előbb mentsd az adminba" — közvetlenül
     a saját, zöld „✓ Mentve… és végigjátszható" üzenete alatt. Most a
     varázsló saját, mentéskor kapott azonosítója (W._slug) dönt. */
  function frissitJatszasLink() {
    var a = $('pvPlay');
    if (!a) return;
    if (W._slug) {
      a.href = 'jatszas.html?quest=' + encodeURIComponent(W._slug) + '&elonezet=1';
      a.classList.remove('is-disabled');
      a.removeAttribute('aria-disabled');
      a.title = 'A mentett pálya végigjátszása';
    } else {
      a.href = '#';
      a.classList.add('is-disabled');
      a.setAttribute('aria-disabled', 'true');
      a.title = 'Előbb mentsd el a pályát';
    }
  }

  /* ---------------- admin mentés ---------------- */
  function publishAdmin() {
    var st = $('pvAdminStatus');
    var lint = X.fullLint(W).filter(function (l) { return l.lvl === 'err'; });
    if (lint.length) {
      if (!window.confirm(lint.length + ' hiba van a pályán.\n\n' +
          'Mentheted így is (kipróbálásra jó), de a játékos hibás pályát kapna.\n\nFolytatod?')) return;
    }

    /* A mentés az ADATBÁZISBA megy (import_course + publish_course), tehát
       hálózati művelet — a gomb várakozó állapotot mutat közben. Az ütközés-
       vizsgálat is szerverkérdés, ezért előbb azt várjuk meg. */
    st.textContent = 'Ellenőrzés…';
    st.className = 'pv-status';

    X.slugUtkozes(W).then(function (u) {
      if (u.utkozik && !W._published) {
        if (!window.confirm('Már létezik „' + (u.nev || (W.course && W.course.route)) + '” néven pálya ' +
            'ugyanezzel az azonosítóval.\n\nA mentés FELÜLÍRJA annak állomásait és feladatait.\n\nFolytatod?')) {
          st.textContent = ''; st.className = 'pv-status';
          return;
        }
      }
      mentesFut(u.sajat || u.utkozik);
    });

    function mentesFut(mar) {
      st.textContent = 'Mentés az adatbázisba…';
      st.className = 'pv-status';
      Promise.resolve(X.publishToAdmin(W, mar)).then(function (r) {
        if (!r.ok) { st.textContent = r.err; st.className = 'pv-status is-err'; P.toast(r.err, true); return; }

        W._published = true;
        W._slug = r.slug;
        P.setWizard(W);
        st.innerHTML = '✓ ' + (r.replaced ? 'Frissítve' : 'Mentve') + ' — ' + r.stations +
          ' állomás és ' + r.tasks + ' feladat. Megjelent a Játékok listában piszkozatként, ' +
          'és a Végigjátszás gombbal már ki tudod próbálni.';
        st.className = 'pv-status is-ok';
        frissitJatszasLink();
        P.toast('Mentve a Játékok közé — próbáld ki a Végigjátszás gombbal.');
      });
    }
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

    /* Amíg nincs mentve, a Végigjátszás nem visz sehová. */
    $('pvPlay').addEventListener('click', function (e) {
      if (!W._slug) {
        e.preventDefault();
        P.toast('Előbb mentsd el a pályát — a mentés készíti el a kipróbálható verziót.', true);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
