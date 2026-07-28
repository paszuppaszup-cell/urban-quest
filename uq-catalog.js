/* =========================================================
   URBAN QUEST — publikus katalógus az adatbázisból

   Eddig a főoldal és a részletoldal a beégetett data.js-ből olvasott,
   ezért a saját pályáid csak a TE böngésződben látszottak. Ez a réteg
   az adatbázisból tölti a katalógust, és beleírja ugyanabba a
   window.QUESTS / window.QUEST_ORDER alakba, amit a meglévő renderelő
   már ismer — így a lapkód változatlan maradhat.

   Offline: a legutóbb letöltött katalógus localStorage-ben marad, és
   net nélkül az jelenik meg. A beégetett data.js a legvégső tartalék.
   ========================================================= */
(function () {
  'use strict';

  var CACHE = 'uq_catalog_v1';

  var DIFF_LABEL = { konnyu: 'Könnyű', kozepes: 'Közepes', nehez: 'Nehéz', extrem: 'Extrém' };
  var DIFF_SCORE = { konnyu: '2/5 könnyű', kozepes: '3/5 közepes', nehez: '4/5 nehéz', extrem: '5/5 extrém' };
  var CAT_LABEL  = { varosi: 'Városi', tortenelmi: 'Történelmi', kaland: 'Kaland',
                     csaladi: 'Családi', ceges: 'Céges', horror: 'Horror' };

  function cacheOlvas() {
    try { var r = localStorage.getItem(CACHE); return r ? JSON.parse(r) : null; }
    catch (e) { return null; }
  }
  function cacheIr(rows) {
    try { localStorage.setItem(CACHE, JSON.stringify({ ts: Date.now(), rows: rows })); }
    catch (e) { /* kvóta — a katalógus ettől még működik, csak nem lesz offline */ }
  }

  /* A kártya-objektum a v_catalog.public_card-ból jön, amit a
     publish_course() állít elő. A hiányzó mezőket a meglévő renderelő
     elvárásaihoz igazítjuk, hogy ne kelljen hozzányúlni. */
  function kartya(row) {
    var p = row.public_card || {};
    var q = {};
    Object.keys(p).forEach(function (k) { q[k] = p[k]; });

    q.id = row.slug;
    q.title = q.title || row.name;
    q.heroTitle = q.heroTitle || q.title;

    // a renderelő ezeket a neveket használja
    q.duration = q.durationText || q.duration || '';
    q.dur = q.durationText || q.dur || '';
    q.distance = q.distanceText || q.distance || '';
    q.price = q.priceText === undefined ? (q.price || '') : q.priceText;
    q.age = q.ageText || q.age || '';
    q.team = q.teamText || q.team || '';
    q.desc = q.desc || '';
    q.about = q.about || q.desc || '';
    q.langs = Array.isArray(q.langs) ? q.langs : ['hu'];
    q.allLangs = q.allLangs || q.langs;
    q.more = Math.max(0, (q.allLangs || []).length - 3);
    q.doList = Array.isArray(q.doList) ? q.doList : [];
    q.knowList = Array.isArray(q.knowList) ? q.knowList : [];
    q.cat = q.cat || 'varosi';
    q.diff = q.diff || 'konnyu';
    q.image = q.image || '';
    q.fromDb = true;
    q.version = row.version;

    /* A kártya-renderelő ezeket is használja — enélkül „UNDEFINED" jelent
       meg a nehézség-jelvényen és „(undefined)" az értékeléseknél. */
    q.diffLabel = DIFF_LABEL[q.diff] || 'Közepes';
    q.diffScore = DIFF_SCORE[q.diff] || '';
    q.catCls = q.catCls || q.cat;
    q.catLabel = CAT_LABEL[q.cat] || 'Városi';
    q.subtitle = q.subtitle || q.desc || '';

    /* Értékelés: NINCS ilyen adat a rendszerben. A régi kártyák kitalált
       számokat mutattak (4.8 / 64 vélemény) — inkább nullát adunk, és a
       renderelő elrejti a csillagokat, amíg nincs valódi értékelés. */
    q.rating = Number(q.rating) || 0;
    q.reviews = Number(q.reviews) || 0;

    /* A RÉSZLETOLDAL ezeket külön mezőnéven kéri — hiányukban „undefined"
       jelent meg a Helyszín, az Indulási pont és az Ajánlott csapatméret
       blokkban. Az újabb public_card már tartalmazza őket; a régebbi
       verziókhoz itt van tartalék. */
    q.locCity = q.locCity || [q.city, q.area].filter(Boolean).join(', ') || 'Budapest';
    q.startPoint = q.startPoint || q.locCity;
    q.startAddr = q.startAddr || q.locCity;
    q.teamText = q.teamText || q.team || '';
    q.teamPill = q.teamPill || (q.teamText ? q.teamText + ' (ideális)' : '');
    q.teamNote = q.teamNote || 'Ajánlott létszám a legjobb élményhez.';
    q.audience = q.audience || [q.teamText, q.age].filter(Boolean).join(' · ');

    // a szűrők a régi alakot várják
    q.filters = q.filters || {
      helyszin: String(q.city || 'budapest').toLowerCase(),
      kategoria: q.cat,
      nehezseg: q.diff,
      idotartam: 'kozep',
      csoport: ''
    };
    return q;
  }

  /* @param hiteles  true = a szerver válasza a teljes igazság
     Ilyenkor a katalógus PONTOSAN az adatbázis tartalma lesz. Korábban
     a data.js beégetett küldetéseit tartalékként meghagytuk, ezért egy
     archivált pálya továbbra is látszott — a felhasználó archiválta, és
     mégis ott maradt. A beégetett adat csak akkor tartalék, ha a
     szerver egyáltalán nem válaszol. */
  function beolvaszt(rows, hiteles) {
    if (!rows) return false;
    window.QUESTS = window.QUESTS || {};
    var sorrend = [];

    rows.forEach(function (r) {
      if (!r || !r.slug) return;
      window.QUESTS[r.slug] = kartya(r);
      sorrend.push(r.slug);
    });

    if (hiteles) {
      // amit a szerver nem sorolt fel, az nem létezik
      Object.keys(window.QUESTS).forEach(function (id) {
        if (sorrend.indexOf(id) < 0) delete window.QUESTS[id];
      });
      window.QUEST_ORDER = sorrend;
      return true;
    }

    // gyorstárból: csak kiegészítünk, nem törlünk
    var maradek = (window.QUEST_ORDER || []).filter(function (id) {
      return sorrend.indexOf(id) < 0 && !!window.QUESTS[id];
    });
    window.QUEST_ORDER = sorrend.concat(maradek);
    return true;
  }

  /* A sorok sorrendje FIX, nem a találatok száma szerinti: a főoldal
     így ugyanott van minden látogatásnál, és nem ugrál át egy kategória
     csak azért, mert épp több pálya került bele. Az ismeretlen kategória
     (pl. később felvett új érték) a végére kerül, nem vész el. */
  var CAT_SORREND = ['varosi', 'tortenelmi', 'kaland', 'csaladi', 'ceges', 'horror'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function sorokHTML() {
    var csoport = {};
    (window.QUEST_ORDER || []).forEach(function (id) {
      var q = window.QUESTS && window.QUESTS[id];
      if (!q) return;
      var c = q.cat || 'varosi';
      (csoport[c] = csoport[c] || []).push(id);
    });

    var kulcsok = CAT_SORREND.filter(function (c) { return csoport[c]; })
      .concat(Object.keys(csoport).filter(function (c) { return CAT_SORREND.indexOf(c) < 0; }));

    return kulcsok.map(function (c) {
      var lista = csoport[c];
      return '<section class="quest-row" data-cat="' + esc(c) + '">' +
        '<div class="quest-row-head">' +
          '<h3 class="quest-row-title">' + esc(CAT_LABEL[c] || c) + '</h3>' +
          '<span class="quest-row-count">' + lista.length + ' küldetés</span>' +
        '</div>' +
        '<div class="carousel">' +
          '<div class="carousel-track">' +
            lista.map(function (id) { return window.questCardHTML(id); }).join('') +
          '</div>' +
          '<button class="carousel-nav prev" type="button" aria-label="Előző küldetések">' +
            '<svg class="ico ico-sm" aria-hidden="true"><use href="#i-chevron-left"/></svg></button>' +
          '<button class="carousel-nav next" type="button" aria-label="További küldetések">' +
            '<svg class="ico ico-sm" aria-hidden="true"><use href="#i-chevron-right"/></svg></button>' +
        '</div>' +
      '</section>';
    }).join('');
  }

  function ujrarajzol() {
    var rows = document.getElementById('questRows');
    if (rows && window.QUEST_ORDER && window.questCardHTML) {
      /* Főoldal: kategóriánként egy-egy oldalra húzható sor. */
      rows.innerHTML = sorokHTML();
    } else {
      /* Régi, egysávos elrendezés — más lapok (és a visszafelé
         kompatibilitás) továbbra is ezt használják. */
      var track = document.getElementById('questTrack');
      if (track && window.QUEST_ORDER && window.questCardHTML) {
        track.innerHTML = window.QUEST_ORDER.map(function (id) {
          return window.questCardHTML(id);
        }).join('');
      }
    }
    document.dispatchEvent(new CustomEvent('uq:catalog', {
      detail: { order: window.QUEST_ORDER }
    }));
  }

  /* A gyorstárat AZONNAL beolvasztjuk, hogy ne villogjon a lap, és a
     friss adat megérkezésekor újrarajzolunk. */
  var gyors = cacheOlvas();
  if (gyors && gyors.rows) beolvaszt(gyors.rows, true);

  function betolt() {
    if (!window.UQAPI) return Promise.resolve(false);
    return UQAPI.rest('/v_catalog?select=*&order=featured.desc,sort_order.asc,name.asc', { anon: !UQAPI.user() })
      .then(function (rows) {
        // Az ÜRES válasz is érvényes válasz: ha minden pályát archiváltak,
        // a katalógus tényleg üres. Korábban a üres listát „hibának”
        // vettük és meghagytuk a régi tartalmat.
        cacheIr(rows || []);
        beolvaszt(rows || [], true);
        ujrarajzol();
        return true;
      })
      .catch(function () {
        // Offline vagy hiba: marad a gyorstár, illetve a beégetett adat.
        return false;
      });
  }

  window.UQCatalog = { betolt: betolt, beolvaszt: beolvaszt, ujrarajzol: ujrarajzol };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { ujrarajzol(); betolt(); });
  } else {
    ujrarajzol();
    betolt();
  }
})();
