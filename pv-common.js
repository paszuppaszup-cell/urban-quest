/* ===========================================================
   URBAN QUEST — Pálya varázsló · közös réteg
   Minden lépés ezt használja. Szándékosan felület-független:
   ha később kliens-varázslót építünk, ez a fájl változatlanul megy.
   =========================================================== */
window.PV = (function () {
  'use strict';

  var WIZARD_KEY = 'uq_wizard_v1';

  /* ---------------- alap segédek ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Haversine — légvonalbeli távolság méterben */
  function dist(a, b, c, d) {
    var R = 6371000, p = Math.PI / 180;
    var dLat = (c - a) * p, dLng = (d - b) * p;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a * p) * Math.cos(c * p) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function distP(a, b) { return dist(a.lat, a.lng, b.lat, b.lng); }

  function fmtDist(m) {
    return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km';
  }

  function fmtMin(min) {
    min = Math.round(min);
    if (min < 60) return min + ' perc';
    var h = Math.floor(min / 60), r = min % 60;
    return r ? h + ' ó ' + r + ' p' : h + ' óra';
  }

  function lsGet(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }

  function getWizard() { return lsGet(WIZARD_KEY, null); }
  function setWizard(w) { return lsSet(WIZARD_KEY, w); }

  /* ===========================================================
     SORREND: feladat-először vagy sztori-először
     A 3. és 4. lépés helyet cserélhet. Nincs alapértelmezés —
     a Váz végén a szerző tudatosan választ.
     =========================================================== */
  var STEP_TASKS = {
    key: 'tasks', n: 3, title: 'Feladatok', page: 'palya-varazslo-feladatok.html'
  };
  var STEP_STORY = {
    key: 'story', n: 4, title: 'Sztori', page: 'palya-varazslo-sztori.html'
  };

  function getOrder(W) {
    W = W || getWizard();
    return (W && W.order === 'story') ? 'story' : (W && W.order === 'tasks' ? 'tasks' : '');
  }
  function isStoryFirst(W) { return getOrder(W) === 'story'; }

  /* a lépések sorrendje az aktuális választás szerint */
  function steps(W) {
    var storyFirst = isStoryFirst(W);
    var mid = storyFirst ? [STEP_STORY, STEP_TASKS] : [STEP_TASKS, STEP_STORY];
    return [
      { key: 'places', title: 'Helyszínek', page: 'palya-varazslo.html' },
      { key: 'skeleton', title: 'Váz', page: 'palya-varazslo-vaz.html' },
      { key: mid[0].key, title: mid[0].title, page: mid[0].page },
      { key: mid[1].key, title: mid[1].title, page: mid[1].page },
      { key: 'check', title: 'Ellenőrzés', page: 'palya-varazslo-ellenorzes.html' }
    ];
  }

  /* Melyik lépés jön a megadott után? (a „Tovább” gombokhoz) */
  function nextPage(W, curKey) {
    var s = steps(W);
    for (var i = 0; i < s.length; i++) {
      if (s[i].key === curKey) return s[i + 1] ? s[i + 1].page : null;
    }
    return null;
  }
  function prevPage(W, curKey) {
    var s = steps(W);
    for (var i = 0; i < s.length; i++) {
      if (s[i].key === curKey) return s[i - 1] ? s[i - 1].page : null;
    }
    return null;
  }

  /* A „Vissza” gomb is kövesse a sorrendet (a HTML-ben fix href van). */
  function fixBackLink(curKey, W) {
    var prev = prevPage(W || getWizard(), curKey);
    if (!prev) return;
    var links = document.querySelectorAll('.pv-bar-actions a[href^="palya-varazslo"]');
    links.forEach(function (a) {
      if (/vissza/i.test(a.textContent)) a.setAttribute('href', prev);
    });
  }

  /* A lépéssor újraépítése — így a 3./4. csere minden oldalon látszik. */
  function renderSteps(curKey, W) {
    var box = document.querySelector('.pv-steps');
    if (!box) return;
    W = W || getWizard();
    var list = steps(W);
    var curIdx = -1;
    list.forEach(function (s, i) { if (s.key === curKey) curIdx = i; });

    box.innerHTML = list.map(function (s, i) {
      var cls = i === curIdx ? 'is-active' : (i < curIdx ? 'is-done' : '');
      var inner = '<span class="pv-step-n">' + (i + 1) + '</span>' +
                  '<span class="pv-step-t">' + esc(s.title) + '</span>';
      /* a már bejárt lépések visszakattinthatók */
      return '<li class="pv-step ' + cls + '">' +
        (i < curIdx ? '<a href="' + s.page + '">' + inner + '</a>' : inner) + '</li>';
    }).join('');
  }

  function toast(msg, isErr) {
    var t = document.getElementById('pvToast');
    if (!t) return;
    t.textContent = msg;
    t.classList.toggle('is-err', !!isErr);
    t.hidden = false;
    requestAnimationFrame(function () { t.classList.add('is-on'); });
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      t.classList.remove('is-on');
      setTimeout(function () { t.hidden = true; }, 220);
    }, 3200);
  }

  /* ===========================================================
     ÚTVONAL-RENDEZÉS
     A légvonal nem séta-táv: a városi kerülőkre 1.3-as szorzót
     használunk (tömbök körüljárása, átkelők).
     =========================================================== */
  var DETOUR = 1.3;
  var WALK_MPM = 4500 / 60;   /* 4,5 km/h méter/perc */

  function tourLen(order, pts, loop) {
    var s = 0;
    for (var i = 0; i < order.length - 1; i++) s += distP(pts[order[i]], pts[order[i + 1]]);
    if (loop && order.length > 1) s += distP(pts[order[order.length - 1]], pts[order[0]]);
    return s;
  }

  /* legközelebbi szomszéd — gyors, de nem optimális kiindulás */
  function nearestNeighbour(pts, startIdx) {
    var n = pts.length, used = [], order = [startIdx], i, k;
    for (i = 0; i < n; i++) used.push(false);
    used[startIdx] = true;
    for (k = 1; k < n; k++) {
      var last = order[order.length - 1], best = -1, bd = Infinity;
      for (i = 0; i < n; i++) {
        if (used[i]) continue;
        var d = distP(pts[last], pts[i]);
        if (d < bd) { bd = d; best = i; }
      }
      if (best < 0) break;
      order.push(best); used[best] = true;
    }
    return order;
  }

  /* 2-opt: szakaszok megfordításával oldja ki a keresztezéseket.
     A 0. elem (indulóállomás) fix marad. */
  function twoOpt(order, pts, loop) {
    var best = order.slice(), bestLen = tourLen(best, pts, loop);
    var improved = true, guard = 0;
    var lastFixed = loop ? 0 : 1;   /* nyílt útvonalnál a végpont is mozoghat */

    while (improved && guard++ < 80) {
      improved = false;
      for (var i = 1; i < best.length - 1; i++) {
        for (var j = i + 1; j < best.length - lastFixed + 1 && j < best.length; j++) {
          var cand = best.slice(0, i)
                         .concat(best.slice(i, j + 1).reverse())
                         .concat(best.slice(j + 1));
          var len = tourLen(cand, pts, loop);
          if (len < bestLen - 0.5) { best = cand; bestLen = len; improved = true; }
        }
      }
    }
    return best;
  }

  /* Teljes rendezés. startUid megadható; ha nincs, minden kezdőpontot
     kipróbál és a legrövidebbet tartja meg (kevés állomásnál ez olcsó). */
  function orderRoute(stations, opts) {
    opts = opts || {};
    var loop = !!opts.loop;
    var n = stations.length;
    if (n < 3) return stations.slice();

    var fixedStart = -1;
    if (opts.startUid) {
      stations.forEach(function (s, i) { if (s.uid === opts.startUid) fixedStart = i; });
    }

    var starts = fixedStart >= 0 ? [fixedStart] : stations.map(function (_, i) { return i; });
    var bestOrder = null, bestLen = Infinity;

    starts.forEach(function (s) {
      var o = twoOpt(nearestNeighbour(stations, s), stations, loop);
      var l = tourLen(o, stations, loop);
      if (l < bestLen) { bestLen = l; bestOrder = o; }
    });

    return bestOrder.map(function (i) { return stations[i]; });
  }

  /* szakaszhosszak + összesítés a kész sorrendhez */
  function routeStats(stations, loop) {
    var legs = [], total = 0;
    for (var i = 0; i < stations.length - 1; i++) {
      var d = distP(stations[i], stations[i + 1]) * DETOUR;
      legs.push(Math.round(d)); total += d;
    }
    if (loop && stations.length > 1) {
      var back = distP(stations[stations.length - 1], stations[0]) * DETOUR;
      legs.push(Math.round(back)); total += back;
    }
    return { legs: legs, total: Math.round(total), walkMin: total / WALK_MPM };
  }

  /* ===========================================================
     VÁZ-GENERÁLÁS — típus, nehézség, pontszám
     =========================================================== */
  var TYPES = [
    { id: 'kezdo',   label: 'Kezdő',   hint: 'Itt indul a csapat' },
    { id: 'info',    label: 'Infó',    hint: 'Sztori, nincs komoly feladat' },
    { id: 'feladat', label: 'Feladat', hint: 'Megoldandó kihívás' },
    { id: 'dontes',  label: 'Döntés',  hint: 'Elágazás az útvonalon' },
    { id: 'zaro',    label: 'Záró',    hint: 'A pálya lezárása' }
  ];

  var DIFFS = ['Könnyű', 'Közepes', 'Nehéz'];

  /* Nehézségi ív: a pálya eleje könnyebb, a vége nehezebb.
     A sávhatárok 0.9 és 1.8, tehát a teljes skála 0–2.7. Az ívnek ezen
     ÁT kell érnie, különben a pálya végig egy sávban ragad — a `span`
     szintenként külön, hogy mindhárom szint más ívet írjon le. */
  var DIFF_RAMP = {
    'Könnyű':  { base: 0.15, span: 1.15 },   /* Könnyű → a végén Közepes  */
    'Közepes': { base: 0.65, span: 1.45 },   /* Könnyű → Közepes → Nehéz  */
    'Nehéz':   { base: 1.15, span: 1.35 }    /* Közepes → Nehéz           */
  };

  function diffAt(level, t) {
    var r = DIFF_RAMP[level] || DIFF_RAMP['Közepes'];
    var v = r.base + t * r.span;
    return v < 0.9 ? 'Könnyű' : (v < 1.8 ? 'Közepes' : 'Nehéz');
  }

  var PTS_BY_DIFF = { 'Könnyű': 25, 'Közepes': 40, 'Nehéz': 55 };
  var PTS_BY_TYPE = { kezdo: 0.8, info: 0.6, feladat: 1.0, dontes: 1.1, zaro: 1.3 };

  function pointsFor(diff, type) {
    var base = PTS_BY_DIFF[diff] || 40;
    var mul = PTS_BY_TYPE[type] != null ? PTS_BY_TYPE[type] : 1;
    return Math.round(base * mul / 5) * 5;
  }

  /* percben: mennyi idő elmegy magán az állomáson */
  var SOLVE_MIN = { kezdo: 3, info: 3, feladat: 6, dontes: 4, zaro: 5 };
  var SOLVE_DIFF = { 'Könnyű': 0.8, 'Közepes': 1.0, 'Nehéz': 1.35 };

  function solveMinutes(stations) {
    var m = 0;
    stations.forEach(function (s) {
      m += (SOLVE_MIN[s.type] || 5) * (SOLVE_DIFF[s.diff] || 1);
    });
    return m;
  }

  /* Típusok kiosztása a sorrendbe rakott állomásokra.
     Első = kezdő, utolsó = záró, közte ritmus: feladat / infó / egy döntés. */
  function assignTypes(stations) {
    var n = stations.length;
    return stations.map(function (s, i) {
      var type;
      if (i === 0) type = 'kezdo';
      else if (i === n - 1) type = 'zaro';
      else {
        var mid = i - 1, midCount = n - 2;
        var decisionAt = midCount >= 3 ? Math.floor(midCount * 0.6) : -1;
        if (mid === decisionAt) type = 'dontes';
        else if (mid % 3 === 1) type = 'info';
        else type = 'feladat';
      }
      return type;
    });
  }

  /* A teljes váz felépítése a kiválasztott helyszínekből. */
  function buildSkeleton(picked, opts) {
    opts = opts || {};
    var level = opts.level || 'Közepes';
    var route = opts.route || 'Névtelen pálya';
    var loop = !!opts.loop;

    var ordered = opts.keepOrder ? picked.slice()
                                 : orderRoute(picked, { loop: loop, startUid: opts.startUid });
    var types = assignTypes(ordered);
    var n = ordered.length;

    return ordered.map(function (p, i) {
      var t = n > 1 ? i / (n - 1) : 0;
      var type = types[i];
      var diff = diffAt(level, t);
      return {
        uid: p.uid,
        name: p.name,
        route: route,
        type: type,
        diff: diff,
        points: pointsFor(diff, type),
        loc: p.addr || '',
        lat: p.lat,
        lng: p.lng,
        desc: p.desc || '',        /* a 4. lépés (sztori) tölti fel */
        taskShort: '',             /* a 3. lépés (feladatok) tölti fel */
        cat: p.cat,
        wiki: p.wiki || '',
        wikidata: p.wikidata || '',
        year: p.year || '',
        weak: !!p.weak
      };
    });
  }

  /* pontszámok újraszámolása kézi típus/nehézség-módosítás után */
  function resync(stations) {
    stations.forEach(function (s) { s.points = pointsFor(s.diff, s.type); });
    return stations;
  }

  /* ---------------- pályanév-javaslatok ---------------- */
  function nameSuggestions(areaName) {
    var a = (areaName || 'Budapest').replace(/\s*\(.*\)\s*/, '').trim();
    return [
      a + ' Nyomában',
      'A ' + a + ' Rejtélye',
      'Titkok ' + a + ' utcáin',
      a + ' — Eltűnt Nyomok',
      'Kódfejtés ' + a + ' szívében'
    ];
  }

  /* ---------------- ellenőrzések (az 5. lépés is ezt használja) ---------------- */
  function lint(stations, opts) {
    opts = opts || {};
    var out = [];
    if (!stations.length) { out.push({ lvl: 'err', msg: 'Nincs egyetlen állomás sem.' }); return out; }

    var kezdo = stations.filter(function (s) { return s.type === 'kezdo'; }).length;
    var zaro  = stations.filter(function (s) { return s.type === 'zaro'; }).length;
    if (kezdo !== 1) out.push({ lvl: 'err', msg: 'Pontosan egy kezdő állomás kell (most ' + kezdo + ').' });
    if (zaro !== 1)  out.push({ lvl: 'err', msg: 'Pontosan egy záró állomás kell (most ' + zaro + ').' });
    if (stations.length < 4) out.push({ lvl: 'warn', msg: 'Négynél kevesebb állomás rövid pályát ad.' });

    var names = {};
    stations.forEach(function (s) {
      var k = s.name.trim().toLowerCase();
      if (names[k]) out.push({ lvl: 'err', msg: 'Két állomás neve azonos: „' + s.name + '”.' });
      names[k] = 1;
      if (s.weak) out.push({ lvl: 'warn', msg: '„' + s.name + '” neve az OSM-ből jön, érdemes átírni.' });
    });

    var st = routeStats(stations, !!opts.loop);
    st.legs.forEach(function (d, i) {
      if (d <= 900) return;
      /* körpályánál az utolsó szakasz a visszaút — nincs „következő" állomás */
      var where = (opts.loop && i === stations.length - 1)
        ? (i + 1) + '. állomás → vissza az indulóhoz'
        : (i + 1) + '. → ' + (i + 2) + '. állomás';
      out.push({ lvl: 'warn', msg: where + ': ' + fmtDist(d) + ' séta, ez sok.' });
    });

    return out;
  }

  return {
    KEY: WIZARD_KEY,
    esc: esc, dist: dist, distP: distP, fmtDist: fmtDist, fmtMin: fmtMin,
    lsGet: lsGet, lsSet: lsSet, getWizard: getWizard, setWizard: setWizard, toast: toast,
    getOrder: getOrder, isStoryFirst: isStoryFirst, steps: steps,
    nextPage: nextPage, prevPage: prevPage, renderSteps: renderSteps, fixBackLink: fixBackLink,
    orderRoute: orderRoute, routeStats: routeStats,
    TYPES: TYPES, DIFFS: DIFFS, diffAt: diffAt,
    buildSkeleton: buildSkeleton, assignTypes: assignTypes, resync: resync,
    pointsFor: pointsFor, solveMinutes: solveMinutes,
    nameSuggestions: nameSuggestions, lint: lint,
    DETOUR: DETOUR
  };
})();
