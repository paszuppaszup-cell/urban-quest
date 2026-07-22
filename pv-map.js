/* ===========================================================
   URBAN QUEST — Térkép az 1. lépéshez (Leaflet)

   Mit tud:
     · a keresés KÖZÉPPONTJA kattintással és húzással állítható,
       a sugár körként látszik és a csúszkával változik
     · a találatok kategóriánként színezett pontok
     · a pontra kattintás ugyanaz, mint a listában bejelölni

   Miért helyben tárolt a Leaflet (`vendor/leaflet/`)?
   Az oldal statikus, backend nélkül. Egy CDN-kiesés esetén a térkép
   némán eltűnne, és a szerző nem értené, miért. 150 KB ára van, cserébe
   annyira megbízható, mint a többi fájl.

   A csempék az OpenStreetMap-ről jönnek — ugyanabból az adatbázisból,
   amiből maguk a helyszínek is. Az attribúció ezért nem formalitás.
   =========================================================== */
window.PVMAP = (function () {
  'use strict';

  /* Kategóriaszínek. Sötét alapon kell elkülönülniük egymástól ÉS a
     kiválasztás lime keretétől, ezért egyik sem lime-közeli. */
  var SZIN = {
    muvesz:     '#9ed52b',
    tortenelmi: '#e0a458',
    templom:    '#c98bdb',
    muzeum:     '#5bc8f5',
    kilato:     '#7be0a8',
    ter:        '#6fbf5f',
    kut:        '#4fd6d6',
    hid:        '#f08a6a',
    kultura:    '#f27ba8',
    latvany:    '#b9c4ab'
  };

  var map = null, kozep = null, kor = null;
  var poiReteg = null, markerek = {}, adatok = [];
  var szuro = null;            /* null = mind látszik */
  var kijelolt = {};
  var cb = {};

  function szinOf(cat) { return SZIN[cat] || '#b9c4ab'; }

  function keszE() { return !!(window.L && map); }

  /* ---------- indítás ---------- */
  function init(o) {
    if (!window.L) return null;                 /* a Leaflet nem töltődött be */
    var host = typeof o.host === 'string' ? document.getElementById(o.host) : o.host;
    if (!host || map) return map;

    cb = { onCenter: o.onCenter || function () {}, onToggle: o.onToggle || function () {} };

    map = L.map(host, {
      center: [o.lat, o.lng],
      zoom: 15,
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    /* A középpont jelölője DivIcon, nem képfájl — így a Leaflet
       marker-ikonjait (png-k) egyáltalán nem kell letölteni. */
    kozep = L.marker([o.lat, o.lng], {
      draggable: true,
      keyboard: true,
      title: 'Húzd el a keresés középpontját',
      icon: L.divIcon({ className: 'pv-map-center', html: '<i></i>', iconSize: [26, 26], iconAnchor: [13, 13] })
    }).addTo(map);

    kor = L.circle([o.lat, o.lng], {
      radius: o.radius || 800,
      color: '#9ed52b', weight: 1.5, opacity: .8,
      fillColor: '#9ed52b', fillOpacity: .07, interactive: false
    }).addTo(map);

    poiReteg = L.layerGroup().addTo(map);

    kozep.on('drag', function (e) { kor.setLatLng(e.target.getLatLng()); });
    kozep.on('dragend', function (e) {
      var p = e.target.getLatLng();
      cb.onCenter(p.lat, p.lng);
    });

    map.on('click', function (e) {
      kozep.setLatLng(e.latlng);
      kor.setLatLng(e.latlng);
      cb.onCenter(e.latlng.lat, e.latlng.lng);
    });

    return map;
  }

  /* ---------- középpont és sugár ---------- */
  function setCenter(lat, lng, kovesse) {
    if (!keszE()) return;
    kozep.setLatLng([lat, lng]);
    kor.setLatLng([lat, lng]);
    if (kovesse) map.setView([lat, lng], map.getZoom() < 14 ? 15 : map.getZoom());
  }

  function setRadius(m) {
    if (!keszE()) return;
    kor.setRadius(m);
  }

  /* A sugárkör töltse ki a képet — így látod, meddig keres. */
  function fitKor() {
    if (!keszE()) return;
    map.fitBounds(kor.getBounds(), { padding: [24, 24] });
  }

  /* ---------- találatok ---------- */
  function setPois(list) {
    if (!keszE()) return;
    adatok = list || [];
    rajzol();
  }

  function setFilter(aktivKategoriak) {
    szuro = aktivKategoriak ? {} : null;
    if (aktivKategoriak) aktivKategoriak.forEach(function (c) { szuro[c] = 1; });
    rajzol();
  }

  function setSelected(uids) {
    kijelolt = {};
    (uids || []).forEach(function (u) { kijelolt[u] = 1; });
    /* csak a stílust frissítjük — újrarajzolásnál elveszne a felugró ablak */
    Object.keys(markerek).forEach(function (uid) { stilus(markerek[uid], uid); });
  }

  function stilus(mk, uid) {
    if (!mk) return;
    var ki = !!kijelolt[uid];
    mk.setStyle({
      radius: ki ? 9 : 6,
      color: ki ? '#e8f0dd' : '#0a0d0a',
      weight: ki ? 2.5 : 1.5,
      fillColor: mk.options.pvSzin,
      fillOpacity: ki ? 1 : .85
    });
    if (ki) mk.bringToFront();
  }

  function lathato(p) { return !szuro || !!szuro[p.cat]; }

  function rajzol() {
    if (!keszE()) return;
    poiReteg.clearLayers();
    markerek = {};
    adatok.forEach(function (p) {
      if (!lathato(p)) return;
      if (!isFinite(p.lat) || !isFinite(p.lng)) return;
      var mk = L.circleMarker([p.lat, p.lng], { pvSzin: szinOf(p.cat) });
      mk.bindTooltip(p.name, { direction: 'top', offset: [0, -8] });
      mk.on('click', function () { cb.onToggle(p.uid); });
      mk.addTo(poiReteg);
      markerek[p.uid] = mk;
      stilus(mk, p.uid);
    });
  }

  /* a listából kiemelt elem megkeresése a térképen */
  function focus(uid) {
    if (!keszE() || !markerek[uid]) return;
    var mk = markerek[uid];
    map.panTo(mk.getLatLng());
    mk.openTooltip();
  }

  function invalidate() { if (keszE()) map.invalidateSize(); }

  return {
    SZIN: SZIN, szinOf: szinOf,
    init: init, keszE: keszE,
    setCenter: setCenter, setRadius: setRadius, fitKor: fitKor,
    setPois: setPois, setFilter: setFilter, setSelected: setSelected,
    focus: focus, invalidate: invalidate
  };
})();
