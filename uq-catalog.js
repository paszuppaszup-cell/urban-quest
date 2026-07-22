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

  function beolvaszt(rows) {
    if (!rows || !rows.length) return false;
    window.QUESTS = window.QUESTS || {};
    var sorrend = [];

    rows.forEach(function (r) {
      if (!r || !r.slug) return;
      window.QUESTS[r.slug] = kartya(r);
      sorrend.push(r.slug);
    });

    // Az adatbázisból jövő pályák előre; ami csak a data.js-ben van
    // (még nincs átköltöztetve), az mögéjük kerül, hogy ne tűnjön el.
    var maradek = (window.QUEST_ORDER || []).filter(function (id) {
      return sorrend.indexOf(id) < 0;
    });
    window.QUEST_ORDER = sorrend.concat(maradek);
    return true;
  }

  function ujrarajzol() {
    var track = document.getElementById('questTrack');
    if (track && window.QUEST_ORDER && window.questCardHTML) {
      track.innerHTML = window.QUEST_ORDER.map(function (id) {
        return window.questCardHTML(id);
      }).join('');
    }
    document.dispatchEvent(new CustomEvent('uq:catalog', {
      detail: { order: window.QUEST_ORDER }
    }));
  }

  /* A gyorstárat AZONNAL beolvasztjuk, hogy ne villogjon a lap, és a
     friss adat megérkezésekor újrarajzolunk. */
  var gyors = cacheOlvas();
  if (gyors && gyors.rows) beolvaszt(gyors.rows);

  function betolt() {
    if (!window.UQAPI) return Promise.resolve(false);
    return UQAPI.rest('/v_catalog?select=*&order=featured.desc,sort_order.asc,name.asc', { anon: !UQAPI.user() })
      .then(function (rows) {
        if (!rows || !rows.length) return false;
        cacheIr(rows);
        beolvaszt(rows);
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
