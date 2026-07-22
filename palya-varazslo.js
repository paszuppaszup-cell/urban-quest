/* ===========================================================
   URBAN QUEST — Pálya varázsló · 1. lépés
   Valós helyszínek lekérése OpenStreetMapből (Overpass API).
   Nincs backend, nincs API-kulcs — a böngésző közvetlenül kérdez.
   =========================================================== */
(function () {
  'use strict';

  /* ---------------- területek ---------------- */
  /* r = javasolt alapértelmezett sugár méterben */
  var AREAS = [
    { g: 'Budapesti negyedek', items: [
      { id: 'varnegyed',   n: 'Budai Várnegyed',        lat: 47.4995, lng: 19.0365, r: 700 },
      { id: 'belvaros',    n: 'Belváros (Vörösmarty)',  lat: 47.4966, lng: 19.0513, r: 700 },
      { id: 'lipotvaros',  n: 'Lipótváros (Bazilika)',  lat: 47.5009, lng: 19.0540, r: 800 },
      { id: 'kossuth',     n: 'Parlament, Kossuth tér', lat: 47.5072, lng: 19.0458, r: 700 },
      { id: 'zsidonegyed', n: 'Zsidónegyed (Gozsdu)',   lat: 47.4977, lng: 19.0603, r: 600 },
      { id: 'andrassy',    n: 'Andrássy út, Oktogon',   lat: 47.5058, lng: 19.0640, r: 900 },
      { id: 'varosliget',  n: 'Városliget, Hősök tere', lat: 47.5148, lng: 19.0778, r: 1000 },
      { id: 'palotanegyed',n: 'Palotanegyed (Kálvin)',  lat: 47.4894, lng: 19.0614, r: 800 },
      { id: 'gellert',     n: 'Gellérthegy, Citadella', lat: 47.4869, lng: 19.0464, r: 800 },
      { id: 'taban',       n: 'Tabán',                  lat: 47.4930, lng: 19.0400, r: 700 },
      { id: 'dunakorzo',   n: 'Duna-korzó',             lat: 47.4950, lng: 19.0490, r: 700 },
      { id: 'margitsziget',n: 'Margitsziget',           lat: 47.5270, lng: 19.0510, r: 1100 },
      { id: 'obuda',       n: 'Óbuda, Fő tér',          lat: 47.5416, lng: 19.0400, r: 800 },
      { id: 'ujlipot',     n: 'Újlipótváros',           lat: 47.5175, lng: 19.0500, r: 800 },
      { id: 'normafa',     n: 'Normafa, Jánoshegy',     lat: 47.5100, lng: 18.9770, r: 1200 }
    ]},
    { g: 'Kerület szerint', items: [
      { id: 'k1',  n: 'I. — Vár, Krisztinaváros', lat: 47.4966, lng: 19.0339, r: 1200 },
      { id: 'k2',  n: 'II. — Rózsadomb',          lat: 47.5350, lng: 18.9860, r: 1600 },
      { id: 'k3',  n: 'III. — Óbuda',             lat: 47.5680, lng: 19.0400, r: 1800 },
      { id: 'k4',  n: 'IV. — Újpest',             lat: 47.5620, lng: 19.0900, r: 1500 },
      { id: 'k5',  n: 'V. — Belváros-Lipótváros', lat: 47.5000, lng: 19.0520, r: 1100 },
      { id: 'k6',  n: 'VI. — Terézváros',         lat: 47.5080, lng: 19.0640, r: 1000 },
      { id: 'k7',  n: 'VII. — Erzsébetváros',     lat: 47.4990, lng: 19.0700, r: 900 },
      { id: 'k8',  n: 'VIII. — Józsefváros',      lat: 47.4890, lng: 19.0750, r: 1300 },
      { id: 'k9',  n: 'IX. — Ferencváros',        lat: 47.4750, lng: 19.0850, r: 1400 },
      { id: 'k11', n: 'XI. — Újbuda',             lat: 47.4600, lng: 19.0300, r: 1800 },
      { id: 'k12', n: 'XII. — Hegyvidék',         lat: 47.4980, lng: 18.9800, r: 1800 },
      { id: 'k13', n: 'XIII. — Angyalföld',       lat: 47.5300, lng: 19.0700, r: 1600 },
      { id: 'k14', n: 'XIV. — Zugló',             lat: 47.5200, lng: 19.1100, r: 1700 }
    ]},
    { g: 'Egyéb', items: [
      { id: 'custom', n: 'Saját koordináta…', lat: 47.4979, lng: 19.0402, r: 800 }
    ]}
  ];

  /* ---------------- kategóriák ----------------
     q = Overpass szűrők; mindegyikhez a kód fűzi hozzá az (around:…) részt.
     A ["name"] kikötés kulcsfontosságú: névtelen objektum nem lehet állomás. */
  var CATS = [
    { id: 'muvesz', label: 'Szobor, műalkotás', on: true, q: [
      'nwr["tourism"="artwork"]["name"]',
      'nwr["historic"="memorial"]["name"]',
      'nwr["historic"="monument"]["name"]'
    ]},
    { id: 'tortenelmi', label: 'Történelmi épület', on: true, q: [
      'nwr["historic"~"^(building|castle|city_gate|ruins|fort|manor|palace|tower|aqueduct)$"]["name"]'
    ]},
    { id: 'templom', label: 'Templom', on: true, q: [
      'nwr["amenity"="place_of_worship"]["name"]'
    ]},
    { id: 'muzeum', label: 'Múzeum, galéria', on: true, q: [
      'nwr["tourism"~"^(museum|gallery)$"]["name"]'
    ]},
    { id: 'kilato', label: 'Kilátó, panoráma', on: true, q: [
      'nwr["tourism"="viewpoint"]["name"]',
      'nwr["man_made"="tower"]["name"]'
    ]},
    { id: 'ter', label: 'Tér, park', on: true, q: [
      'nwr["place"="square"]["name"]',
      'nwr["leisure"~"^(park|garden)$"]["name"]'
    ]},
    { id: 'kut', label: 'Kút, szökőkút', on: false, q: [
      'nwr["amenity"="fountain"]["name"]',
      'nwr["man_made"="water_well"]["name"]'
    ]},
    { id: 'hid', label: 'Híd', on: false, q: [
      'nwr["man_made"="bridge"]["name"]'
    ]},
    { id: 'kultura', label: 'Színház, kultúra', on: false, q: [
      'nwr["amenity"~"^(theatre|arts_centre)$"]["name"]'
    ]},
    { id: 'latvany', label: 'Egyéb látnivaló', on: false, q: [
      'nwr["tourism"="attraction"]["name"]'
    ]}
  ];

  var CAT_LABEL = {};
  CATS.forEach(function (c) { CAT_LABEL[c.id] = c.label; });

  /* Overpass végpontok — ha az első nem válaszol, jön a következő */
  var ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter'
  ];

  var CACHE_KEY  = 'uq_poi_cache_v1';
  var WIZARD_KEY = 'uq_wizard_v1';
  var CACHE_TTL  = 1000 * 60 * 60 * 24 * 14; /* 14 nap */
  var CACHE_MAX  = 12;                        /* legfeljebb ennyi lekérdezés maradjon meg */

  /* ---------------- állapot ---------------- */
  var results  = [];   /* a legutóbbi keresés találatai */
  /* A térkép jelmagyarázata EGYBEN megjelenítés-szűrő. Fontos, hogy ez NEM
     ugyanaz, mint a bal oldali „Mit keressen" pipák: azok a lekérdezés
     hatókörét szabják meg (mit kérünk le az OpenStreetMap-től), ez pedig a
     MÁR letöltött találatokat rejti el. Új lekérdezés nem indul tőle —
     az Overpass 2 egyidejű kérést enged, minden fölösleges kör drága. */
  var mapSzuro = null; /* null = minden kategória látszik */
  var selected = {};   /* uid -> poi */
  var busy     = false;

  /* ---------------- segédek ---------------- */
  function $(id) { return document.getElementById(id); }

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

  function fmtDist(m) {
    return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km';
  }

  function toast(msg, isErr) {
    var t = $('pvToast');
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

  function status(html, cls) {
    var s = $('pvStatus');
    if (!s) return;
    s.innerHTML = html || '';
    s.className = 'pv-status' + (cls ? ' ' + cls : '');
  }

  function lsGet(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }

  /* ---------------- terület kiválasztása ---------------- */
  function currentArea() {
    var sel = $('pvArea').value;
    var found = null;
    AREAS.forEach(function (grp) {
      grp.items.forEach(function (it) { if (it.id === sel) found = it; });
    });
    if (!found) found = AREAS[0].items[0];

    if (found.id === 'custom') {
      var lat = parseFloat(String($('pvLat').value).replace(',', '.'));
      var lng = parseFloat(String($('pvLng').value).replace(',', '.'));
      if (!isFinite(lat) || !isFinite(lng)) return null;
      return { id: 'custom', n: 'Saját pont', lat: lat, lng: lng };
    }
    return found;
  }

  function activeCats() {
    return CATS.filter(function (c) {
      var el = document.querySelector('.pv-cat input[value="' + c.id + '"]');
      return el && el.checked;
    });
  }

  /* ---------------- Overpass lekérdezés ---------------- */
  function buildQuery(area, radius, cats) {
    var around = '(around:' + radius + ',' + area.lat + ',' + area.lng + ');';

    /* Ugyanazt a kulcsot (pl. historic) ne kelljen többször végigpásztázni:
       az azonos kulcsú szűrőket egyetlen regexbe vonjuk össze. Nagy területnél
       ez érdemben gyorsítja a lekérdezést. */
    var byKey = {}, plain = [];
    cats.forEach(function (c) {
      c.q.forEach(function (f) {
        var m = f.match(/^nwr\["([a-z_:]+)"="([^"]+)"\]\["name"\]$/);
        if (m) { (byKey[m[1]] = byKey[m[1]] || []).push(m[2]); return; }
        var r = f.match(/^nwr\["([a-z_:]+)"~"\^\(([^)]+)\)\$"\]\["name"\]$/);
        if (r) { (byKey[r[1]] = byKey[r[1]] || []).push.apply(byKey[r[1]], r[2].split('|')); return; }
        plain.push(f);
      });
    });

    var lines = [];
    Object.keys(byKey).forEach(function (k) {
      var vals = byKey[k].filter(function (v, i, a) { return a.indexOf(v) === i; });
      lines.push('  nwr["' + k + '"' +
        (vals.length === 1 ? '="' + vals[0] + '"' : '~"^(' + vals.join('|') + ')$"') +
        ']["name"]' + around);
    });
    plain.forEach(function (f) { lines.push('  ' + f + around); });

    return '[out:json][timeout:40];\n(\n' + lines.join('\n') + '\n);\nout center 800;';
  }

  function cacheKey(area, radius, cats) {
    return [
      area.lat.toFixed(4), area.lng.toFixed(4), radius,
      cats.map(function (c) { return c.id; }).sort().join('.')
    ].join('|');
  }

  function readCache(key) {
    var all = lsGet(CACHE_KEY, {});
    var hit = all[key];
    if (!hit) return null;
    if (Date.now() - hit.t > CACHE_TTL) return null;
    return hit.d;
  }

  function writeCache(key, data) {
    var all = lsGet(CACHE_KEY, {});
    all[key] = { t: Date.now(), d: data };
    /* a legrégebbieket dobjuk, ha túl sok lenne */
    var keys = Object.keys(all);
    if (keys.length > CACHE_MAX) {
      keys.sort(function (a, b) { return all[a].t - all[b].t; });
      while (keys.length > CACHE_MAX) { delete all[keys.shift()]; }
    }
    lsSet(CACHE_KEY, all);
  }

  /* Végigpróbálja a végpontokat, amíg valamelyik nem válaszol.
     FONTOS: kliensoldali időkorlát kell — egy túlterhelt tükör nem hibázik,
     hanem egyszerűen lóg, és időkorlát nélkül sosem lépnénk tovább. */
  /* A szerveroldali [timeout:40] miatt ennél nem lehetünk türelmetlenebbek,
     különben mi vágnánk el a még futó, érvényes lekérdezést. */
  var FETCH_TIMEOUT = 48000;

  function overpass(ql, onProgress) {
    var i = 0;
    /* A hibák okát MEG KELL tartani: a 429 (egyszerre túl sok kérés), az
       504/timeout (túl nehéz lekérdezés) és a hálózathiba HÁROM KÜLÖNBÖZŐ
       teendőt jelent a szerzőnek. Korábban a catch eldobta mindet, és
       mindig ugyanaz az egy mondat jelent meg. */
    var okok = [];
    function attempt() {
      if (i >= ENDPOINTS.length) {
        var e = new Error('egyik térképszerver sem válaszolt');
        e.okok = okok;
        return Promise.reject(e);
      }
      var url = ENDPOINTS[i++];
      if (onProgress && i > 1) onProgress(i);

      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, FETCH_TIMEOUT);

      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(ql),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (json) {
        clearTimeout(timer);
        return json;
      }).catch(function (err) {
        clearTimeout(timer);
        okok.push({
          host: url.replace(/^https?:\/\//, '').split('/')[0],
          ok: (err && err.name === 'AbortError') ? 'időtúllépés' : (err && err.message) || 'ismeretlen'
        });
        return attempt();
      });
    }
    return attempt();
  }

  /* ---------------- találatok feldolgozása ---------------- */
  /* melyik kategóriába esik egy elem a tagjei alapján */
  function classify(tags) {
    if (tags.tourism === 'artwork' || tags.historic === 'memorial' || tags.historic === 'monument') return 'muvesz';
    if (tags.tourism === 'museum' || tags.tourism === 'gallery') return 'muzeum';
    if (tags.amenity === 'place_of_worship') return 'templom';
    if (tags.tourism === 'viewpoint' || tags.man_made === 'tower') return 'kilato';
    if (tags.historic) return 'tortenelmi';
    if (tags.place === 'square' || tags.leisure === 'park' || tags.leisure === 'garden') return 'ter';
    if (tags.amenity === 'fountain' || tags.man_made === 'water_well') return 'kut';
    if (tags.man_made === 'bridge') return 'hid';
    if (tags.amenity === 'theatre' || tags.amenity === 'arts_centre') return 'kultura';
    return 'latvany';
  }

  function addressOf(tags) {
    var st = tags['addr:street'], no = tags['addr:housenumber'];
    if (st && no) return st + ' ' + no + '.';
    if (st) return st;
    return '';
  }

  /* Az OSM-ben sok objektum neve valójában nem név, hanem kategória vagy leírás.
     Ezek állomásnévnek használhatatlanok. */
  var GENERIC = /^(műemlék|emléktábla|szobor|szobrok|emlékmű|emlékhely|emlékfa|kút|szökőkút|templom|kápolna|vár|park|kert|tér|galéria|múzeum|kilátó|rom|romok|bástya|kapu|feszület|kereszt|dombormű|síremlék|pihenő|névtelen|ismeretlen|nincs név)$/i;

  /* leírás-szerű nevek: nem tulajdonnév, hanem mondat */
  var DESCRIPTIVE = /( sz-ban| sz\.-i| század|maradvány|átalakít|egykori helye|helyén állt|felirat)/i;

  /* egy név akkor használható állomásnévnek, ha nem csak szám/rövidítés */
  function usableName(n) {
    if (!n) return false;
    var t = n.trim();
    if (t.length < 3) return false;
    if (t.length > 70) return false;         /* ilyen hosszan már biztosan leírás */
    if (/^[\d\W]+$/.test(t)) return false;   /* csak számok/írásjelek */
    if (GENERIC.test(t)) return false;       /* „Műemlék”, „Vár”, „Szobor” — semmitmondó */
    return true;
  }

  /* nem dobjuk ki, csak megjelöljük: valószínűleg gyenge állomásnév */
  function weakName(n) {
    var t = n.trim();
    if (DESCRIPTIVE.test(t)) return true;
    if (t.split(/\s+/).length > 5) return true;   /* túl sok szó egy névhez */
    if (/^[a-záéíóöőúüű]/.test(t)) return true;   /* kisbetűvel kezdődik */
    return false;
  }

  /* „1893-05-21” → „1893” */
  function yearOf(s) {
    var m = String(s || '').match(/\d{4}/);
    return m ? m[0] : '';
  }

  function normalize(json, area) {
    var out = [], seen = {};
    (json.elements || []).forEach(function (el) {
      var tags = el.tags || {};
      var name = tags['name:hu'] || tags.name;
      if (!usableName(name)) return;

      var lat = el.lat != null ? el.lat : (el.center && el.center.lat);
      var lng = el.lon != null ? el.lon : (el.center && el.center.lon);
      if (lat == null || lng == null) return;

      /* duplaszűrés: azonos név egymás 60 m-es körzetében egyszer szerepeljen */
      var key = name.trim().toLowerCase() + '@' + lat.toFixed(3) + ',' + lng.toFixed(3);
      if (seen[key]) return;
      seen[key] = 1;

      out.push({
        uid: el.type + '/' + el.id,
        name: name.trim(),
        cat: classify(tags),
        addr: addressOf(tags),
        lat: +lat.toFixed(6),
        lng: +lng.toFixed(6),
        d: Math.round(dist(area.lat, area.lng, lat, lng)),
        wiki: tags.wikipedia || '',
        wikidata: tags.wikidata || '',
        desc: tags.description || tags.inscription || '',
        year: yearOf(tags.start_date || tags.inscription_date || ''),
        weak: weakName(name),
        osm: el.type + '/' + el.id
      });
    });
    return out;
  }

  /* ---------------- keresés ---------------- */
  function doSearch() {
    if (busy) return;
    var area = currentArea();
    if (!area) { status('Adj meg érvényes koordinátát (pl. 47.4979 és 19.0402).', 'is-err'); return; }

    var cats = activeCats();
    if (!cats.length) { status('Válassz legalább egy kategóriát.', 'is-err'); return; }

    var radius = parseInt($('pvRadius').value, 10);
    var key = cacheKey(area, radius, cats);

    var cached = readCache(key);
    if (cached) {
      results = cached;
      mapSzuro = null;
      renderLegend();
      syncMapPois();
      renderList();
      status('✓ ' + results.length + ' találat (mentett lekérdezésből)', 'is-ok');
      return;
    }

    /* a korábbi terület találatait nem hagyjuk kint — félrevezető lenne,
       mintha az új területhez tartoznának */
    busy = true;
    results = [];
    renderList();
    $('pvSearch').disabled = true;
    status('<span class="pv-spin"></span>Lekérdezés az OpenStreetMapről… (akár 20 mp)');

    var ql = buildQuery(area, radius, cats);
    overpass(ql, function (n) {
      status('<span class="pv-spin"></span>Az első szerver nem válaszolt, próbálom a(z) ' + n + '. tükröt…');
    }).then(function (json) {
      results = normalize(json, area);
      results.sort(function (a, b) { return a.d - b.d; });
      writeCache(key, results);
      /* új keresés = tiszta lap a jelmagyarázatnak is */
      mapSzuro = null;
      renderLegend();
      syncMapPois();
      renderList();
      if (!results.length) {
        status('Nincs találat. Növeld a sugarat, vagy kapcsolj be több kategóriát.', 'is-err');
      } else {
        status('✓ ' + results.length + ' valós helyszín találva', 'is-ok');
      }
    }).catch(function (err) {
      /* Az okokból KÖVETKEZIK a teendő — ezt mondjuk meg, ne általánosságot. */
      var okok = (err && err.okok) || [];
      var reszlet = okok.map(function (o) { return o.host + ': ' + o.ok; }).join(' · ');
      var tanacs = 'Próbáld újra egy perc múlva.';
      if (okok.some(function (o) { return /429/.test(o.ok); })) {
        tanacs = 'Túl sok lekérdezés ment ki rövid időn belül (az Overpass 2 egyidejűt enged). Várj egy percet.';
      } else if (okok.every(function (o) { return o.ok === 'időtúllépés'; }) && okok.length) {
        tanacs = 'Mindegyik szerver túllépte az időt. Csökkentsd a sugarat vagy kapcsolj ki néhány kategóriát, és próbáld újra.';
      } else if (okok.some(function (o) { return /Failed to fetch|NetworkError/i.test(o.ok); })) {
        tanacs = 'Úgy tűnik, nincs internetkapcsolat.';
      }
      status('Hiba: ' + err.message + '. ' + tanacs + (reszlet ? ' <small>(' + esc(reszlet) + ')</small>' : ''), 'is-err');
      toast('A térképszerver nem válaszolt. Próbáld újra pár másodperc múlva.', true);
    }).then(function () {
      busy = false;
      $('pvSearch').disabled = false;
    });
  }

  /* ---------------- rendezés + szűrés ---------------- */
  function visibleResults() {
    var q = ($('topSearch').value || '').trim().toLowerCase();
    var list = results.slice();

    /* a jelmagyarázatban kikapcsolt kategóriák a listából is eltűnnek —
       egy szűrő van, nem lehet eltérés a térkép és a lista között */
    if (mapSzuro) list = list.filter(function (p) { return mapSzuro[p.cat]; });

    if (q) {
      list = list.filter(function (p) {
        return p.name.toLowerCase().indexOf(q) >= 0 ||
               (p.addr && p.addr.toLowerCase().indexOf(q) >= 0);
      });
    }

    /* a gyenge nevűek minden rendezésnél hátra kerülnek — nem tüntetjük el őket,
       csak nem tolakodnak előre */
    var sort = $('pvSort').value;
    var by = {
      name: function (a, b) { return a.name.localeCompare(b.name, 'hu'); },
      wiki: function (a, b) {
        var aw = (a.wiki || a.wikidata) ? 0 : 1, bw = (b.wiki || b.wikidata) ? 0 : 1;
        return aw - bw || a.d - b.d;
      },
      cat: function (a, b) {
        return (CAT_LABEL[a.cat] || '').localeCompare(CAT_LABEL[b.cat] || '', 'hu') || a.d - b.d;
      },
      dist: function (a, b) { return a.d - b.d; }
    }[sort] || function (a, b) { return a.d - b.d; };

    list.sort(function (a, b) {
      return (a.weak ? 1 : 0) - (b.weak ? 1 : 0) || by(a, b);
    });
    return list;
  }

  /* ---------------- megjelenítés ---------------- */
  function renderList() {
    var wrap = $('pvList');
    var list = visibleResults();

    $('pvCount').textContent = results.length ? list.length + ' db' : '—';
    $('pvCount').classList.toggle('is-on', list.length > 0);
    $('pvSuggest').disabled = list.length < 3;

    if (!list.length) {
      var empty;
      if (busy) {
        empty = '<b>Keresés folyamatban…</b><span>Az OpenStreetMap szervere dolgozik. Ez néha 10–20 másodperc.</span>';
      } else if (results.length) {
        empty = '<b>Nincs egyező találat</b><span>Töröld a keresőmezőt a felső sávban.</span>';
      } else {
        empty = '<b>Még nincs találat</b><span>Válassz területet balra, és nyomd meg a <i>Helyszínek keresése</i> gombot.</span>';
      }
      wrap.innerHTML = '<div class="pv-empty"><svg class="ico" aria-hidden="true"><use href="#a-' +
                       (busy ? 'refresh' : 'pin') + '"/></svg>' + empty + '</div>';
      renderBar();
      return;
    }

    var html = list.map(function (p) {
      var on = !!selected[p.uid];
      var tags = '<span class="pv-tag">' + esc(CAT_LABEL[p.cat] || 'Egyéb') + '</span>';
      if (p.wiki || p.wikidata) tags += '<span class="pv-tag pv-tag-wiki">Wikipédia</span>';
      if (p.year) tags += '<span class="pv-tag">' + esc(p.year) + '</span>';
      if (p.weak) tags += '<span class="pv-tag pv-tag-weak" title="Az OSM-ben nem igazi név szerepel — érdemes átírni">Név átírandó</span>';

      return '<label class="pv-item' + (on ? ' is-sel' : '') + (p.weak ? ' is-weak' : '') + '" data-uid="' + esc(p.uid) + '">' +
               '<input type="checkbox"' + (on ? ' checked' : '') + '>' +
               '<span class="pv-check"><svg class="ico" aria-hidden="true"><use href="#a-check"/></svg></span>' +
               '<span>' +
                 '<span class="pv-it-name">' + esc(p.name) + '</span>' +
                 '<span class="pv-it-meta">' + tags +
                   (p.addr ? '<span class="pv-it-addr">' + esc(p.addr) + '</span>' : '') +
                 '</span>' +
               '</span>' +
               '<span class="pv-it-dist">' + fmtDist(p.d) + '</span>' +
             '</label>';
    }).join('');

    wrap.innerHTML = html;
    renderBar();
  }

  function renderBar() {
    /* A térkép kijelölése innen frissül, mert ide fut be MINDEN útvonal:
       a listás pipálás, a térképi kattintás és a „Javasolj 6-ot" is. */
    if (window.PVMAP && PVMAP.keszE()) PVMAP.setSelected(Object.keys(selected));
    var ids = Object.keys(selected);
    var bar = $('pvBar');
    bar.hidden = ids.length === 0;
    $('pvSelCount').textContent = ids.length;

    if (ids.length >= 2) {
      /* a kijelölt pontok legtávolabbi párja — nagyjából megmutatja a pálya méretét */
      var pts = ids.map(function (k) { return selected[k]; });
      var max = 0;
      for (var i = 0; i < pts.length; i++) {
        for (var j = i + 1; j < pts.length; j++) {
          var d = dist(pts[i].lat, pts[i].lng, pts[j].lat, pts[j].lng);
          if (d > max) max = d;
        }
      }
      $('pvSelMeta').textContent = 'A két legtávolabbi pont ' + fmtDist(max) + ' egymástól';
    } else {
      $('pvSelMeta').textContent = ids.length === 1 ? 'Válassz még legalább 3-at egy pályához' : '';
    }
  }

  /* ---------------- „Javasolj 6-ot” ----------------
     Legtávolabbi-pont mintavétel: úgy válogat, hogy az állomások szét legyenek
     szórva a területen, ne egy sarokban tömörüljenek. A Wikipédia-adattal
     rendelkező helyek előnyt kapnak, mert azokból lesz jó kvízkérdés. */
  function suggest(n) {
    /* gyenge nevűeket nem javaslunk — de ha nincs elég jó, inkább azokból is válogatunk */
    var all = visibleResults();
    var pool = all.filter(function (p) { return !p.weak; });
    if (pool.length < n) pool = all;
    if (pool.length < 3) return;
    n = Math.min(n, pool.length);

    var WIKI_BONUS = 220; /* méterben kifejezett előny */
    var score = function (p, chosen) {
      var min = Infinity;
      chosen.forEach(function (c) {
        var d = dist(p.lat, p.lng, c.lat, c.lng);
        if (d < min) min = d;
      });
      if (min === Infinity) min = 0;
      return min + ((p.wiki || p.wikidata) ? WIKI_BONUS : 0);
    };

    /* indulás: a legközelebbi, lehetőleg Wikipédiás hely */
    var chosen = [];
    var start = pool.slice().sort(function (a, b) {
      var aw = (a.wiki || a.wikidata) ? 0 : 1, bw = (b.wiki || b.wikidata) ? 0 : 1;
      return aw - bw || a.d - b.d;
    })[0];
    chosen.push(start);

    while (chosen.length < n) {
      var best = null, bestScore = -1;
      pool.forEach(function (p) {
        if (chosen.indexOf(p) >= 0) return;
        var s = score(p, chosen);
        if (s > bestScore) { bestScore = s; best = p; }
      });
      if (!best) break;
      chosen.push(best);
    }

    selected = {};
    chosen.forEach(function (p) { selected[p.uid] = p; });
    renderList();
    toast(chosen.length + ' helyszínt javasoltam — nézd át, és igazíts rajta.');
  }

  /* ---------------- továbblépés ---------------- */
  function goNext() {
    var ids = Object.keys(selected);
    if (ids.length < 3) { toast('Legalább 3 helyszín kell egy pályához.', true); return; }

    var area = currentArea();
    var payload = {
      step: 2,
      area: area ? { n: area.n, lat: area.lat, lng: area.lng } : null,
      radius: parseInt($('pvRadius').value, 10),
      cats: activeCats().map(function (c) { return c.id; }),
      stations: ids.map(function (k) { return selected[k]; }),
      savedAt: new Date().toISOString()
    };

    if (!lsSet(WIZARD_KEY, payload)) {
      toast('Nem sikerült elmenteni — lehet, hogy tele a böngésző tárhelye.', true);
      return;
    }
    location.href = 'palya-varazslo-vaz.html';
  }

  /* ---------------- felület felépítése ---------------- */
  function buildAreaSelect() {
    var sel = $('pvArea');
    sel.innerHTML = AREAS.map(function (grp) {
      return '<optgroup label="' + esc(grp.g) + '">' +
        grp.items.map(function (it) {
          return '<option value="' + esc(it.id) + '">' + esc(it.n) + '</option>';
        }).join('') + '</optgroup>';
    }).join('');
    sel.value = 'varnegyed';
  }

  function buildCats() {
    $('pvCats').innerHTML = CATS.map(function (c) {
      return '<label class="pv-cat' + (c.on ? ' is-on' : '') + '">' +
               '<input type="checkbox" value="' + esc(c.id) + '"' + (c.on ? ' checked' : '') + '>' +
               '<span class="pv-cat-dot"></span>' + esc(c.label) +
             '</label>';
    }).join('');
  }

  function syncRadiusLabel() {
    var v = parseInt($('pvRadius').value, 10);
    $('pvRadiusVal').textContent = v >= 1000
      ? (v / 1000).toFixed(1).replace('.', ',') + ' km'
      : v + ' m';
  }

  function onAreaChange() {
    var id = $('pvArea').value;
    var isCustom = id === 'custom';
    $('pvCustomWrap').hidden = !isCustom;

    /* a preset saját javasolt sugarat hoz magával */
    AREAS.forEach(function (grp) {
      grp.items.forEach(function (it) {
        if (it.id === id && it.r) { $('pvRadius').value = it.r; }
      });
    });
    syncRadiusLabel();
    syncMap(true);
  }

  /* ===========================================================
     TÉRKÉP
     =========================================================== */
  function mapKozeppont() {
    var a = currentArea();
    if (a) return a;
    /* saját pont üres koordinátával: essünk vissza az első presetre */
    return AREAS[0].items[0];
  }

  function initMap() {
    if (!window.PVMAP) return;
    var a = mapKozeppont();
    var ok = PVMAP.init({
      host: 'pvMap', lat: a.lat, lng: a.lng, radius: +$('pvRadius').value,
      onCenter: function (lat, lng) {
        /* a térképi mozgatás mindig „saját pont" — különben a legördülő
           azt hazudná, hogy még mindig a preset közepén keresünk */
        $('pvArea').value = 'custom';
        $('pvCustomWrap').hidden = false;
        $('pvLat').value = lat.toFixed(6);
        $('pvLng').value = lng.toFixed(6);
        status('A középpont áthelyezve — nyomd meg a <b>Helyszínek keresése</b> gombot.', '');
      },
      onToggle: function (uid) {
        var poi = results.filter(function (p) { return p.uid === uid; })[0];
        if (!poi) return;
        if (selected[uid]) delete selected[uid]; else selected[uid] = poi;
        renderList();
        PVMAP.focus(uid);
      }
    });
    if (!ok) { $('pvMapFail').hidden = false; $('pvMap').hidden = true; return; }
    /* a panel a betöltéskor még nulla magas lehet */
    setTimeout(function () { PVMAP.invalidate(); PVMAP.fitKor(); }, 60);
  }

  function syncMap(kovesse) {
    if (!window.PVMAP || !PVMAP.keszE()) return;
    var a = currentArea();
    if (a) PVMAP.setCenter(a.lat, a.lng, kovesse);
    PVMAP.setRadius(+$('pvRadius').value);
  }

  /* A jelmagyarázat csak azokat a kategóriákat mutatja, amik TÉNYLEG
     előfordulnak a találatok között — üres kapcsolókkal nincs mit kezdeni. */
  function renderLegend() {
    var box = $('pvMapLegend');
    if (!results.length) { box.hidden = true; box.innerHTML = ''; return; }
    var db = {};
    results.forEach(function (p) { db[p.cat] = (db[p.cat] || 0) + 1; });
    var sorok = CATS.filter(function (c) { return db[c.id]; }).map(function (c) {
      var on = !mapSzuro || mapSzuro[c.id];
      return '<button class="pv-leg' + (on ? ' is-on' : '') + '" type="button" data-cat="' + c.id + '">' +
        '<i style="background:' + PVMAP.szinOf(c.id) + '"></i>' +
        esc(c.label) + '<b>' + db[c.id] + '</b></button>';
    }).join('');
    box.innerHTML = sorok +
      '<button class="pv-leg pv-leg-all" type="button" data-cat="__mind">Mind</button>';
    box.hidden = false;
  }

  function syncMapPois() {
    if (!window.PVMAP || !PVMAP.keszE()) return;
    PVMAP.setPois(results);
    PVMAP.setFilter(mapSzuro ? Object.keys(mapSzuro) : null);
    PVMAP.setSelected(Object.keys(selected));
  }

  /* ---------------- indítás ---------------- */
  function init() {
    if (window.PV && PV.renderSteps) PV.renderSteps('places');
    buildAreaSelect();
    buildCats();
    onAreaChange();

    initMap();

    $('pvArea').addEventListener('change', onAreaChange);
    $('pvRadius').addEventListener('input', function () { syncRadiusLabel(); syncMap(false); });
    ['pvLat', 'pvLng'].forEach(function (id) {
      $(id).addEventListener('change', function () { syncMap(true); });
    });
    $('pvMapFit').addEventListener('click', function () { PVMAP.fitKor(); });

    /* jelmagyarázat = megjelenítés-szűrő (térkép ÉS lista egyszerre) */
    $('pvMapLegend').addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]');
      if (!b) return;
      var cat = b.getAttribute('data-cat');
      if (cat === '__mind') {
        mapSzuro = null;
      } else {
        if (!mapSzuro) {
          /* első kattintás: csak ez maradjon — így egy mozdulattal
             le lehet szűkíteni egyetlen kategóriára */
          mapSzuro = {}; mapSzuro[cat] = 1;
        } else if (mapSzuro[cat]) {
          delete mapSzuro[cat];
          if (!Object.keys(mapSzuro).length) mapSzuro = null;
        } else {
          mapSzuro[cat] = 1;
        }
      }
      renderLegend();
      renderList();
      if (window.PVMAP && PVMAP.keszE()) PVMAP.setFilter(mapSzuro ? Object.keys(mapSzuro) : null);
    });
    $('pvSearch').addEventListener('click', doSearch);
    $('pvSort').addEventListener('change', renderList);
    $('topSearch').addEventListener('input', renderList);
    $('pvSuggest').addEventListener('click', function () { suggest(6); });

    /* kategória-chip vizuális állapota */
    $('pvCats').addEventListener('change', function (e) {
      var box = e.target.closest('input');
      if (!box) return;
      box.closest('.pv-cat').classList.toggle('is-on', box.checked);
    });

    /* kijelölés a találati listában */
    /* GÖRGETÉS-ŐR: kiválasztáskor a rejtett checkbox fókuszt kap, és a
       böngésző „láthatóvá teszi" — ez elgörgetheti az egész lapot, amitől
       a tartalom kicsúszik és üres fekete marad. A CSS-ben már a helyére
       tettük a pozicionálást; ez a második védelem, ha bármi mégis mozdítana. */
    var mentettPoz = null;

    function mentPoz() {
      var d = document.scrollingElement || document.documentElement;
      var main = document.querySelector('.adm-main');
      var lista = $('pvList');
      mentettPoz = {
        d: d, docTop: d.scrollTop, docLeft: d.scrollLeft,
        main: main, mainTop: main ? main.scrollTop : 0,
        lista: lista, listaTop: lista ? lista.scrollTop : 0
      };
    }

    function visszaPoz() {
      var p = mentettPoz;
      if (!p) return;
      var tesz = function () {
        if (p.d.scrollTop !== p.docTop) p.d.scrollTop = p.docTop;
        if (p.d.scrollLeft !== p.docLeft) p.d.scrollLeft = p.docLeft;
        if (p.main && p.main.scrollTop !== p.mainTop) p.main.scrollTop = p.mainTop;
        if (p.lista && p.lista.scrollTop !== p.listaTop) p.lista.scrollTop = p.listaTop;
      };
      tesz();
      requestAnimationFrame(tesz);
      setTimeout(tesz, 0);
      setTimeout(function () { tesz(); mentettPoz = null; }, 80);
    }

    $('pvList').addEventListener('change', function (e) {
      var item = e.target.closest('.pv-item');
      if (!item) return;
      var uid = item.getAttribute('data-uid');
      var poi = results.filter(function (p) { return p.uid === uid; })[0];
      if (!poi) return;

      if (e.target.checked) { selected[uid] = poi; }
      else { delete selected[uid]; }
      item.classList.toggle('is-sel', !!selected[uid]);
      renderBar();
      visszaPoz();
    });

    /* A pozíciót a lehető LEGKORÁBBAN rögzítjük — a fókusz a mousedown után,
       de a change előtt történik, ezért mindhárom ponton mentünk. */
    ['pointerdown', 'mousedown', 'click'].forEach(function (ev) {
      $('pvList').addEventListener(ev, function (e) {
        if (!e.target.closest || !e.target.closest('.pv-item')) return;
        /* az ELSŐ esemény menti a még ÉRINTETLEN pozíciót; a későbbiek
           nem írhatják felül (addigra a fókusz már elgörgethetett) */
        if (!mentettPoz) mentPoz();
      }, true);
    });

    $('pvClearSel').addEventListener('click', function () {
      selected = {};
      renderList();
    });
    $('pvNext').addEventListener('click', goNext);

    $('btnReset').addEventListener('click', function () {
      selected = {}; results = [];
      $('topSearch').value = '';
      renderList();
      status('');
      toast('Újrakezdve.');
    });

    /* ⌘K / Ctrl+K a keresőmezőre */
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        $('topSearch').focus();
      }
    });

    renderList();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
