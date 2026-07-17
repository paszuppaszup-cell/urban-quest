/* =========================================================
   URBAN QUEST — ADMIN / PÁLYASZERKESZTŐ interakciók
   ========================================================= */
(function () {
  'use strict';

  /* ---------- segédek ---------- */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const DIFF_CLASS = { 'Könnyű': 'ed-dot-konnyu', 'Közepes': 'ed-dot-kozepes', 'Nehéz': 'ed-dot-nehez', 'Extrém': 'ed-dot-extrem' };
  const DIFF_VAR = { 'Könnyű': 'var(--konnyu)', 'Közepes': 'var(--kozepes)', 'Nehéz': 'var(--nehez)', 'Extrém': 'var(--extrem)' };

  const LANG_META = {
    hu: { label: 'HU', name: 'Magyar', sym: 'f-hu' },
    en: { label: 'EN', name: 'English', sym: 'f-en' },
    de: { label: 'DE', name: 'Deutsch', sym: 'f-de' },
    fr: { label: 'FR', name: 'Français', css: 'linear-gradient(90deg,#0055A4 33%,#fff 33% 66%,#EF4135 66%)' },
    es: { label: 'ES', name: 'Español', css: 'linear-gradient(180deg,#AA151B 25%,#F1BF00 25% 75%,#AA151B 75%)' },
    it: { label: 'IT', name: 'Italiano', css: 'linear-gradient(90deg,#008C45 33%,#fff 33% 66%,#CD212A 66%)' }
  };
  const ADDABLE = ['fr', 'es', 'it'];

  const IMG_GRADS = [
    'linear-gradient(135deg,#3a4a2a,#6a5a3a)',
    'linear-gradient(135deg,#22405a,#3a5a6a)',
    'linear-gradient(135deg,#4a3a5a,#6a4a5a)',
    'linear-gradient(135deg,#2a4a3a,#3a6a4a)',
    'linear-gradient(135deg,#5a4a2a,#7a6a3a)'
  ];

  /* ---------- állapot ---------- */
  function defLangs(hu, en, de) {
    return [{ code: 'hu', on: hu !== false }, { code: 'en', on: !!en }, { code: 'de', on: !!de }];
  }
  function mk(o) {
    return Object.assign({
      name: 'Új állomás', type: 'Információs állomás', desc: '',
      img: IMG_GRADS[0], difficulty: 'Könnyű', timeLimit: '10 perc', timeLimitOn: false,
      location: '47.5149, 19.0800', langs: defLangs(true, false, false),
      taskType: 'Kvíz kérdés', question: '', answer: '', score: '50 pont',
      xp: '50 XP', badge: 'Felfedező', logicPrev: true, logicMandatory: false, logicReturn: false
    }, o);
  }

  const state = [
    mk({ name: 'Főbejárat', type: 'Kezdő állomás', desc: 'A kaland kezdőpontja a Városliget főbejáratánál. Itt gyűlik össze a csapat.', img: IMG_GRADS[3], difficulty: 'Könnyű', timeLimit: '5 perc', timeLimitOn: false, location: '47.5138, 19.0783', taskType: 'GPS pont', question: 'Érd el a kijelölt kezdőpontot!', answer: 'GPS', score: '20 pont', xp: '20 XP', badge: 'Felfedező', logicPrev: false, logicMandatory: true, logicReturn: false }),
    mk({ name: 'Széchenyi fürdő', type: 'Információs állomás', desc: 'Ismerd meg Európa egyik legnagyobb gyógyfürdőjének történetét.', img: IMG_GRADS[1], difficulty: 'Könnyű', timeLimit: '8 perc', timeLimitOn: false, location: '47.5188, 19.0817', taskType: 'Kvíz kérdés', question: 'Melyik évben nyílt meg a Széchenyi fürdő?', answer: '1913', score: '60 pont', xp: '60 XP', badge: 'Felfedező', logicPrev: true, logicMandatory: false }),
    mk({ name: 'Vajdahunyad vára', type: 'Feladat állomás', desc: 'Fedezzétek fel a Vajdahunyad várának történetét és oldjátok meg a feladatot!', img: IMG_GRADS[0], difficulty: 'Közepes', timeLimit: '15 perc', timeLimitOn: true, location: '47.5149, 19.1086', taskType: 'Kvíz kérdés', question: 'Melyik évben épült a Vajdahunyad vára?', answer: '1896', score: '100 pont', xp: '100 XP', badge: 'Várvédő', logicPrev: true, logicMandatory: true, logicReturn: false }),
    mk({ name: 'Állatkert bejárat', type: 'Döntési pont', desc: 'Válaszd ki a következő útvonalat: rövid vagy hosszú kör.', img: IMG_GRADS[2], difficulty: 'Közepes', timeLimit: '5 perc', timeLimitOn: false, location: '47.5185, 19.0721', taskType: 'QR-kód', question: 'Olvasd be a bejáratnál lévő QR-kódot!', answer: 'QR', score: '40 pont', xp: '40 XP', badge: 'Felfedező', logicPrev: true, logicMandatory: false, logicReturn: true }),
    mk({ name: 'Hősök tere', type: 'Információs állomás', desc: 'A Millenniumi emlékmű és a magyar történelem nagyjai.', img: IMG_GRADS[4], difficulty: 'Könnyű', timeLimit: '10 perc', timeLimitOn: false, location: '47.5159, 19.0777', taskType: 'Fotó feladat', question: 'Készíts fotót a Millenniumi emlékműről!', answer: 'Fotó', score: '70 pont', xp: '70 XP', badge: 'Felfedező', logicPrev: true, logicMandatory: false }),
    mk({ name: 'Műjégpálya', type: 'Feladat állomás', desc: 'Európa egyik legnagyobb és legrégebbi szabadtéri műjégpályája.', img: IMG_GRADS[1], difficulty: 'Nehéz', timeLimit: '20 perc', timeLimitOn: true, location: '47.5142, 19.0806', taskType: 'Kvíz kérdés', question: 'Hány négyzetméteres a Városligeti Műjégpálya?', answer: '13000', score: '120 pont', xp: '120 XP', badge: 'Nyomozó', logicPrev: true, logicMandatory: true }),
    mk({ name: 'Zene Háza', type: 'Információs állomás', desc: 'A Liget Budapest projekt díjnyertes épülete.', img: IMG_GRADS[3], difficulty: 'Könnyű', timeLimit: '10 perc', timeLimitOn: false, location: '47.5164, 19.0801', taskType: 'Kvíz kérdés', question: 'Ki tervezte a Zene Háza épületét?', answer: 'Sou Fujimoto', score: '80 pont', xp: '80 XP', badge: 'Felfedező', logicPrev: true, logicMandatory: false })
  ];
  let current = 2; // Vajdahunyad vára kezdetben kijelölve

  /* =========================================================
     JÁTÉK-VÁLASZTÓ + PER-JÁTÉK PÁLYA MENTÉS (localStorage)
     Minden játéknak SAJÁT pályája (állomások) van, játékonként mentve.
     uq_courses_v1: { "<játék neve>": [ {állomás…}, … ], … }
     ========================================================= */
  const GAMES_STORE = 'uq_games_v1';
  const COURSES_STORE = 'uq_courses_v1';
  const GAMES_SEED = ['Városliget Felfedező', 'Budai Vár Rejtélye', 'Küldetés a Gyárban', 'Földalatti Nyomok', 'Margitsziget Kaland', 'Elveszett Örökség'];
  const DEFAULT_GAME = 'Városliget Felfedező';
  let currentGame = DEFAULT_GAME;

  function clone(o) { try { return JSON.parse(JSON.stringify(o)); } catch (e) { return Object.assign({}, o); } }

  // Játék-nevek: uq_games_v1 lehet {id,name} objektum-tömb VAGY string-tömb; üres → seed.
  function readGameNames() {
    try {
      const raw = localStorage.getItem(GAMES_STORE);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) {
          const names = arr.map(g => (g && typeof g === 'object') ? g.name : g).filter(Boolean);
          if (names.length) return names;
        }
      }
    } catch (e) {}
    return GAMES_SEED.slice();
  }

  // Pálya-tár (játék neve → állomás-tömb)
  function readCourses() {
    try { const o = JSON.parse(localStorage.getItem(COURSES_STORE) || '{}'); return (o && typeof o === 'object') ? o : {}; }
    catch (e) { return {}; }
  }
  function writeCourses(o) { try { localStorage.setItem(COURSES_STORE, JSON.stringify(o)); } catch (e) {} }
  // Az aktuális állapot (state) mentése az aktuális játék pályájaként.
  // A state sima adat (nincs benne Leaflet-marker referencia), így a JSON-klón elég.
  function saveCourse() {
    if (!currentGame) return;
    const courses = readCourses();
    courses[currentGame] = state.map(clone);
    writeCourses(courses);
  }

  // Egy játék pályájának betöltése a state-be (const state — HELYBEN mutálva, sosem újraosztva).
  function loadCourse(gameName) {
    currentGame = gameName;
    const c = readCourses()[gameName];
    let arr;
    if (c && c.length) {
      arr = c.map(clone);
    } else {
      // ÚJ pálya alapértelmezés: egyetlen kezdő állomás, hogy a térkép ne legyen üres
      arr = [mk({ name: 'Kezdő állomás', type: 'Kezdő állomás', location: '47.5138, 19.0783' })];
    }
    arr.forEach(s => { delete s.mx; delete s.my; }); // mx/my újraszámolandó
    state.splice(0, state.length, ...arr);           // const state HELYBEN mutálva
    current = 0;
    initMapCoords();  // mx/my újraszámítás a play-mód mini-térképéhez
    renderList();
    renderNodes();    // Leaflet jelölők + útvonalak újrarajzolása
    loadForm(current);
    updateCourseCount();
    // fejléc cím = a játék neve (a .adm-tag megmarad az első szöveges csomópont után)
    const h1 = $('#admCourseName');
    if (h1 && h1.childNodes[0]) h1.childNodes[0].textContent = gameName + ' ';
    const cmName = $('#cmName'); if (cmName) cmName.value = gameName; // modal név szinkron
    const sel = $('#admGameSelect'); if (sel) sel.value = gameName;
    refreshActiveTab();
    // Leaflet: méret újraszámítás + nézet a pályához igazítása
    if (map) {
      setTimeout(function () {
        map.invalidateSize();
        if (markers.length) { try { map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2)); } catch (e) {} }
      }, 100);
    }
  }

  // Játék-választó feltöltése + esemény
  function initGameSelector() {
    const sel = $('#admGameSelect');
    if (!sel) return;
    const names = readGameNames();
    if (names.indexOf(currentGame) === -1) names.unshift(currentGame);
    sel.innerHTML = names.map(n => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join('');
    sel.value = currentGame;
    sel.addEventListener('change', () => {
      saveForm(current);
      saveCourse();            // az aktuális pálya mentése VÁLTÁS ELŐTT
      loadCourse(sel.value);   // az új játék pályájának betöltése
      toast('Pálya betöltve', { type: 'info', sub: sel.value });
    });
  }

  /* ---------- térkép-koordináták (valós lat/lng → % a vásznon) ---------- */
  function parseLoc(str) { const p = String(str || '').split(',').map(x => parseFloat(x)); return { lat: isFinite(p[0]) ? p[0] : 47.515, lng: isFinite(p[1]) ? p[1] : 19.08 }; }
  const mapBBox = { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
  function initMapCoords() {
    const pts = state.map(s => parseLoc(s.location));
    mapBBox.minLat = Math.min.apply(null, pts.map(p => p.lat)); mapBBox.maxLat = Math.max.apply(null, pts.map(p => p.lat));
    mapBBox.minLng = Math.min.apply(null, pts.map(p => p.lng)); mapBBox.maxLng = Math.max.apply(null, pts.map(p => p.lng));
    const sLat = (mapBBox.maxLat - mapBBox.minLat) || 0.01, sLng = (mapBBox.maxLng - mapBBox.minLng) || 0.01;
    state.forEach((s, i) => { if (s.mx == null) { s.mx = 14 + (pts[i].lng - mapBBox.minLng) / sLng * 72; s.my = 14 + (mapBBox.maxLat - pts[i].lat) / sLat * 72; } });
  }
  initMapCoords();

  /* ---------- DOM ---------- */
  const listEl = $('#stationList');
  const formEl = $('#edForm');
  const langsEl = $('#edLangs');
  const thumbEl = $('#edThumb');
  const dotEl = $('#edDot');

  /* ---------- Leaflet térkép (valós utcatérkép) ---------- */
  var map = null, markers = [], routeLayer = null;
  function initLeaflet() {
    var host = document.getElementById('edLeaflet');
    if (!host || typeof L === 'undefined') return;
    map = L.map('edLeaflet', { zoomControl: false }).setView([47.515, 19.0808], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    routeLayer = L.layerGroup().addTo(map);
    map.on('click', onMapClick);
    map.on('zoomend', updateZoomVal);
    updateZoomVal();
    setTimeout(function () { if (map) map.invalidateSize(); }, 200);
  }
  // valós lat/lng → mx/my százalék (a play-mód mini-térképéhez); mindig felülír
  function syncMxMy() {
    if (!state.length) return;
    var pts = state.map(function (s) { return parseLoc(s.location); });
    mapBBox.minLat = Math.min.apply(null, pts.map(function (p) { return p.lat; }));
    mapBBox.maxLat = Math.max.apply(null, pts.map(function (p) { return p.lat; }));
    mapBBox.minLng = Math.min.apply(null, pts.map(function (p) { return p.lng; }));
    mapBBox.maxLng = Math.max.apply(null, pts.map(function (p) { return p.lng; }));
    var sLat = (mapBBox.maxLat - mapBBox.minLat) || 0.01, sLng = (mapBBox.maxLng - mapBBox.minLng) || 0.01;
    state.forEach(function (s, i) {
      s.mx = 14 + (pts[i].lng - mapBBox.minLng) / sLng * 72;
      s.my = 14 + (mapBBox.maxLat - pts[i].lat) / sLat * 72;
    });
  }
  function updateZoomVal() { var zv = $('#edZoomVal'); if (zv && map) zv.textContent = map.getZoom() + 'x'; }

  /* =========================================================
     TOAST
     ========================================================= */
  const toastWrap = $('#uqToasts');
  function toast(msg, opt) {
    opt = opt || {};
    const type = opt.type || 'ok';
    const t = document.createElement('div');
    t.className = 'uq-toast' + (type !== 'ok' ? ' is-' + type : '');
    const ic = type === 'ok' ? 'a-check' : (type === 'error' ? 'a-x' : 'a-clock');
    t.innerHTML = '<span class="uq-toast-ic"><svg class="ico" aria-hidden="true"><use href="#' + ic + '"/></svg></span>' +
      '<div class="uq-toast-body"><b>' + esc(msg) + '</b>' + (opt.sub ? '<small>' + esc(opt.sub) + '</small>' : '') + '</div>' +
      '<button class="uq-toast-x" type="button" aria-label="Bezárás"><svg class="ico ico-sm" aria-hidden="true"><use href="#a-x"/></svg></button>';
    toastWrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('is-show'));
    const close = () => { t.classList.remove('is-show'); setTimeout(() => t.remove(), 260); };
    t.querySelector('.uq-toast-x').addEventListener('click', close);
    setTimeout(close, 3200);
  }

  /* =========================================================
     ÁLLOMÁS LISTA + TÉRKÉP NODE-OK RENDERELÉSE
     ========================================================= */
  /* =========================================================
     KAPCSOLT FELADATOK (állomás ↔ feladat lánc, localStorage)
     ========================================================= */
  const TASK_STORE = 'uq_tasks_v1';
  const TASK_TYPE = { kviz: { l: 'Kvíz', c: '#5b9de0' }, szoveg: { l: 'Szöveges', c: '#e0b93a' }, puzzle: { l: 'Puzzle', c: '#8fb04f' }, kod: { l: 'Kód-feltörés', c: '#e8813a' }, foto: { l: 'Fotó', c: '#9d7ce0' }, gps: { l: 'GPS', c: '#4fb84f' }, qr: { l: 'QR-kód', c: '#39c0c8' }, gyors: { l: 'Gyorsasági', c: '#e05b9d' } };
  const TASK_STATUS = { active: 'Aktív', draft: 'Vázlat', inactive: 'Inaktív' };
  function readTasks() { try { const raw = localStorage.getItem(TASK_STORE); const a = raw ? JSON.parse(raw) : []; return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function writeTasks(arr) { try { localStorage.setItem(TASK_STORE, JSON.stringify(arr)); } catch (e) {} }
  function countByStation() { const m = {}; readTasks().forEach(t => { if (t.station) m[t.station] = (m[t.station] || 0) + 1; }); return m; }
  function renderStationTasks() {
    const host = $('#edStationTasks'); if (!host) return;
    const stationName = state[current].name;
    const tasks = readTasks().filter(t => t.station === stationName);
    const cnt = $('#edTaskCount'); if (cnt) cnt.textContent = tasks.length ? '(' + tasks.length + ')' : '';
    const addBtn = '<button class="est-add" type="button" id="edAddTask"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-plus"/></svg>Új feladat ehhez az állomáshoz</button>';
    if (!tasks.length) { host.innerHTML = '<div class="est-empty">Nincs kapcsolt feladat ehhez az állomáshoz.</div>' + addBtn; return; }
    host.innerHTML = tasks.map(t => {
      const ty = TASK_TYPE[t.type] || { l: t.type, c: '#8b957f' };
      return '<div class="est-item"><span class="est-ic" style="color:' + ty.c + ';background:' + ty.c + '22"><svg class="ico" aria-hidden="true"><use href="#a-task"/></svg></span>' +
        '<span class="est-body"><b>' + esc(t.question) + '</b><small>' + esc(ty.l) + ' · ' + (t.points || 0) + ' XP · ' + esc(TASK_STATUS[t.status] || t.status || '') + '</small></span>' +
        '<button class="est-go" type="button" data-open="' + t.id + '" aria-label="Megnyitás"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-preview"/></svg></button>' +
        '<button class="est-rm" type="button" data-unlink="' + t.id + '" aria-label="Eltávolítás"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-x"/></svg></button></div>';
    }).join('') + addBtn;
  }
  document.addEventListener('click', (e) => {
    const add = e.target.closest('#edAddTask');
    if (add) { saveForm(current); location.href = 'feladatok.html?station=' + encodeURIComponent(state[current].name) + '#new'; return; }
    const open = e.target.closest('#edStationTasks [data-open]');
    if (open) { location.href = 'feladatok.html#edit-' + open.dataset.open; return; }
    const rm = e.target.closest('#edStationTasks [data-unlink]');
    if (rm) { const id = +rm.dataset.unlink; const arr = readTasks(); const t = arr.find(x => x.id === id); if (t) { t.station = ''; writeTasks(arr); renderStationTasks(); renderList(); toast('Feladat leválasztva', { type: 'info', sub: (t.question || '').slice(0, 40) }); } return; }
  });
  window.addEventListener('focus', () => { renderStationTasks(); renderList(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { renderStationTasks(); renderList(); } });

  const iconFor = (type) => type === 'Döntési pont' ? 'a-diamond' : 'a-pin';

  function renderList() {
    const counts = countByStation();
    listEl.innerHTML = state.map((s, i) => {
      const active = i === current;
      let mark = '';
      if (active) mark = '<span class="ed-st-check"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-check"/></svg></span>';
      else if (s.type === 'Kezdő állomás') mark = '<span class="ed-st-mark"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-pin"/></svg></span>';
      return '<button class="ed-station' + (active ? ' is-active' : '') + '" type="button" draggable="true" data-i="' + i + '">' +
        '<span class="ed-st-ic"><svg class="ico ico-sm" aria-hidden="true"><use href="#' + iconFor(s.type) + '"/></svg></span>' +
        '<span class="ed-st-num">' + (i + 1) + '</span>' +
        '<span class="ed-st-body"><b>' + esc(s.name) + '</b><small>' + esc(s.type) + (counts[s.name] ? ' · ' + counts[s.name] + ' feladat' : '') + '</small></span>' +
        mark + '<span class="ed-st-grip"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-menu"/></svg></span></button>';
    }).join('');
    applyFilter();
  }

  // A play-mód mini-térképe ezt használja (mx/my százalék) — VÁLTOZATLAN
  function svgXY(s) { return { x: (s.mx / 100) * 540, y: (s.my / 100) * 470 }; }

  // Leaflet útvonal-polyline-ok (a régi SVG <line>-ok helyett)
  function renderRoutes() {
    if (!map || !routeLayer) return;
    routeLayer.clearLayers();
    state.forEach((s, i) => {
      const targets = s.type === 'Döntési pont' ? [i + 1, i + 2] : [i + 1];
      targets.forEach((ti, bi) => {
        if (ti >= state.length) return;
        const branch = s.type === 'Döntési pont' && bi === 1;
        L.polyline([
          [parseLoc(s.location).lat, parseLoc(s.location).lng],
          [parseLoc(state[ti].location).lat, parseLoc(state[ti].location).lng]
        ], { color: branch ? '#e0b93a' : '#9ed52b', weight: 3, opacity: .85, dashArray: '6 7' }).addTo(routeLayer);
      });
    });
  }

  // Leaflet jelölők — a függvény NEVE ugyanaz marad, hogy minden hívó működjön
  function renderNodes() {
    if (!map) return;
    markers.forEach(m => { map.removeLayer(m); });
    markers = [];
    state.forEach((s, i) => {
      const ll = parseLoc(s.location);
      const html = '<span class="ed-mk' + (s.type === 'Döntési pont' ? ' is-decision' : '') + (i === current ? ' is-active' : '') + '">' +
        '<i>' + (i + 1) + '</i></span><em class="ed-mk-label">' + esc(s.name) + '</em>';
      const icon = L.divIcon({ className: 'ed-mk-wrap', html: html, iconSize: [30, 30], iconAnchor: [15, 15] });
      const marker = L.marker([ll.lat, ll.lng], { icon: icon, draggable: true }).addTo(map);
      marker.on('click', function () { selectStation(i); });
      marker.on('dragend', function () { onMarkerDragEnd(i); });
      markers.push(marker);
    });
    renderRoutes();
  }

  // jelölő húzás vége → állomás valós GPS-koordinátája frissül
  function onMarkerDragEnd(i) {
    const s = state[i]; if (!s || !markers[i]) return;
    const ll = markers[i].getLatLng();
    s.location = ll.lat.toFixed(4) + ', ' + ll.lng.toFixed(4);
    syncMxMy();
    renderList();
    if (i === current && fieldEls.location) fieldEls.location.value = s.location;
    renderRoutes();
    saveCourse();
  }

  // térképre kattintás → új állomás a kattintott GPS-ponton
  function onMapClick(e) {
    saveForm(current);
    const ns = mk({ name: 'Új állomás', type: 'Információs állomás', location: e.latlng.lat.toFixed(4) + ', ' + e.latlng.lng.toFixed(4) });
    state.push(ns);
    current = state.length - 1;
    syncMxMy();
    renderList();
    renderNodes();
    loadForm(current);
    updateCourseCount();
    refreshActiveTab();
    saveCourse();
    listEl.scrollTop = listEl.scrollHeight;
    toast('Állomás hozzáadva', { sub: ns.location });
  }

  /* =========================================================
     NYELVEK
     ========================================================= */
  function flagHtml(code) {
    const m = LANG_META[code];
    return m.sym
      ? '<svg class="flag" aria-hidden="true"><use href="#' + m.sym + '"/></svg>'
      : '<span class="flag" style="background:' + m.css + '"></span>';
  }
  function renderLangs() {
    const langs = state[current].langs;
    const present = langs.map(l => l.code);
    const pills = langs.map(l => {
      const m = LANG_META[l.code];
      return '<button class="ed-lang' + (l.on ? ' is-on' : '') + '" type="button" data-lang="' + l.code + '">' + flagHtml(l.code) + m.label + '</button>';
    }).join('');
    const opts = ADDABLE.map(code => {
      const m = LANG_META[code];
      const has = present.indexOf(code) !== -1;
      return '<button class="uq-chip-opt' + (has ? ' is-selected' : '') + '" type="button" data-addlang="' + code + '"' + (has ? ' disabled' : '') + '>' +
        flagHtml(code) + m.name + '<svg class="ico ico-xs uq-chip-check" aria-hidden="true"><use href="#a-check"/></svg></button>';
    }).join('');
    langsEl.innerHTML = pills +
      '<div class="uq-chipmenu" data-chipmenu>' +
      '<button class="ed-lang-add" type="button" data-chip-toggle aria-label="Nyelv hozzáadása"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-plus"/></svg></button>' +
      '<div class="uq-chipmenu-pop">' + opts + '</div></div>';
  }

  /* =========================================================
     ŰRLAP BE- ÉS KIOLVASÁS
     ========================================================= */
  const fieldEls = {};
  $$('[data-field]', formEl).forEach(el => { fieldEls[el.dataset.field] = el; });

  function setToggle(el, on) {
    el.classList.toggle('is-on', !!on);
    el.setAttribute('aria-checked', String(!!on));
  }
  function updateDot() {
    const d = state[current].difficulty;
    dotEl.className = 'ed-dot ' + (DIFF_CLASS[d] || 'ed-dot-konnyu');
  }
  function loadForm(i) {
    const s = state[i];
    fieldEls.name.value = s.name;
    fieldEls.num.value = i + 1;
    fieldEls.type.value = s.type;
    fieldEls.desc.value = s.desc;
    fieldEls.difficulty.value = s.difficulty;
    fieldEls.timeLimit.value = s.timeLimit;
    setToggle(fieldEls.timeLimitOn, s.timeLimitOn);
    fieldEls.location.value = s.location;
    fieldEls.taskType.value = s.taskType;
    fieldEls.question.value = s.question;
    fieldEls.answer.value = s.answer;
    fieldEls.score.value = s.score;
    fieldEls.xp.value = s.xp;
    fieldEls.badge.value = s.badge;
    setToggle(fieldEls.logicPrev, s.logicPrev);
    setToggle(fieldEls.logicMandatory, s.logicMandatory);
    setToggle(fieldEls.logicReturn, s.logicReturn);
    thumbEl.style.background = s.img;
    updateDot();
    renderLangs();
    renderStationTasks();
  }
  function saveForm(i) {
    if (i == null || !state[i]) return;
    const s = state[i];
    s.name = fieldEls.name.value.trim() || 'Névtelen állomás';
    s.type = fieldEls.type.value;
    s.desc = fieldEls.desc.value;
    s.difficulty = fieldEls.difficulty.value;
    s.timeLimit = fieldEls.timeLimit.value;
    s.timeLimitOn = fieldEls.timeLimitOn.classList.contains('is-on');
    s.location = fieldEls.location.value;
    s.taskType = fieldEls.taskType.value;
    s.question = fieldEls.question.value;
    s.answer = fieldEls.answer.value;
    s.score = fieldEls.score.value;
    s.xp = fieldEls.xp.value;
    s.badge = fieldEls.badge.value;
    s.logicPrev = fieldEls.logicPrev.classList.contains('is-on');
    s.logicMandatory = fieldEls.logicMandatory.classList.contains('is-on');
    s.logicReturn = fieldEls.logicReturn.classList.contains('is-on');
  }

  /* kijelölés váltás */
  function selectStation(i) {
    if (i === current) return;
    saveForm(current);
    current = i;
    renderList();
    renderNodes();
    loadForm(current);
    refreshActiveTab();
  }

  /* =========================================================
     ÉLŐ SZERKESZTÉS (űrlap → lista/térkép/állapot)
     ========================================================= */
  // Név: azonnali frissítés a lista <b> és a node <em> feliraton
  fieldEls.name.addEventListener('input', () => {
    const v = fieldEls.name.value;
    state[current].name = v.trim() || 'Névtelen állomás';
    const b = $('#stationList .ed-station.is-active .ed-st-body b');
    if (b) b.textContent = state[current].name;
    // aktív jelölő feliratának azonnali frissítése
    const amk = markers[current];
    const el = amk && amk.getElement && amk.getElement();
    const em = el && el.querySelector('.ed-mk-label');
    if (em) em.textContent = state[current].name;
  });
  // Típus: alcím + ikon/forma változhat → lista+térkép újrarajzol
  fieldEls.type.addEventListener('change', () => {
    state[current].type = fieldEls.type.value;
    renderList();
    renderNodes();
  });
  // Nehézség: pötty szín
  fieldEls.difficulty.addEventListener('change', () => {
    state[current].difficulty = fieldEls.difficulty.value;
    updateDot();
  });
  // Minden egyéb mező mentése az állapotba (élő), hogy a többi fül friss legyen
  formEl.addEventListener('input', () => { saveForm(current); saveCourse(); });
  formEl.addEventListener('change', () => { saveForm(current); saveCourse(); });

  /* kapcsolók (ed-toggle) */
  formEl.addEventListener('click', (e) => {
    const t = e.target.closest('.ed-toggle');
    if (!t) return;
    setToggle(t, !t.classList.contains('is-on'));
    saveForm(current);
    saveCourse();
  });

  /* lista delegált kattintás (a térkép-jelölők kattintását a marker-click kezeli) */
  listEl.addEventListener('click', (e) => {
    const b = e.target.closest('.ed-station');
    if (b) selectStation(parseInt(b.dataset.i, 10));
  });

  /* nyelvek: pill toggle + chip-menü */
  langsEl.addEventListener('click', (e) => {
    const pill = e.target.closest('.ed-lang');
    if (pill) {
      const code = pill.dataset.lang;
      const l = state[current].langs.find(x => x.code === code);
      if (l) { l.on = !l.on; pill.classList.toggle('is-on', l.on); saveCourse(); }
      return;
    }
    const toggle = e.target.closest('[data-chip-toggle]');
    if (toggle) {
      e.stopPropagation();
      const menu = toggle.closest('[data-chipmenu]');
      const open = menu.classList.contains('is-open');
      closeAllFloating();
      menu.classList.toggle('is-open', !open);
      return;
    }
    const opt = e.target.closest('[data-addlang]');
    if (opt && !opt.hasAttribute('disabled')) {
      const code = opt.dataset.addlang;
      if (!state[current].langs.some(x => x.code === code)) {
        state[current].langs.push({ code: code, on: true });
        renderLangs();
        saveCourse();
        toast('Nyelv hozzáadva', { type: 'info', sub: LANG_META[code].name });
      }
    }
  });

  /* =========================================================
     ELEM HOZZÁADÁS / TÖRLÉS
     ========================================================= */
  function addStation() {
    saveForm(current);
    const ns = mk({ name: 'Új állomás', type: 'Információs állomás' });
    if (map) { const c = map.getCenter(); ns.location = c.lat.toFixed(4) + ', ' + c.lng.toFixed(4); }
    state.push(ns);
    current = state.length - 1;
    syncMxMy();
    renderList();
    renderNodes();
    loadForm(current);
    updateCourseCount();
    refreshActiveTab();
    saveCourse();
    listEl.scrollTop = listEl.scrollHeight;
    toast('Állomás hozzáadva', { sub: 'Új állomás (#' + (current + 1) + ')' });
  }
  $('#edAdd').addEventListener('click', addStation);
  $('#edAddStation').addEventListener('click', addStation);

  $('#edDel').addEventListener('click', () => {
    if (state.length <= 1) { toast('Legalább egy állomás szükséges', { type: 'error' }); return; }
    const removed = state[current].name;
    state.splice(current, 1);
    if (current >= state.length) current = state.length - 1;
    syncMxMy();
    renderList();
    renderNodes();
    loadForm(current);
    updateCourseCount();
    refreshActiveTab();
    saveCourse();
    toast('Állomás törölve', { type: 'error', sub: removed });
  });

  /* =========================================================
     PÁLYA FEJLÉC — állomásszám
     ========================================================= */
  function updateCourseCount() {
    const el = $('#admCourseCount');
    if (el) el.textContent = state.length + ' állomás';
  }

  /* =========================================================
     FÜLEK (tab-panel)
     ========================================================= */
  const tabs = $$('.adm-tab[data-tab]');
  const panels = $$('.adm-tabpanel');
  let activeTab = 'szerkeszto';
  function setTab(name) {
    const t = tabs.find(x => x.dataset.tab === name);
    if (!t) return;
    activeTab = name;
    tabs.forEach(x => { const on = x === t; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', String(on)); });
    panels.forEach(p => p.classList.toggle('is-active', p.dataset.panel === name));
    refreshActiveTab();
    // a Szerkesztő fülre visszatérve a Leaflet újraszámolja a méretét (rejtett panel után)
    if (name === 'szerkeszto' && map) { setTimeout(function () { map.invalidateSize(); }, 60); }
  }
  tabs.forEach(t => t.addEventListener('click', () => setTab(t.dataset.tab)));
  function refreshActiveTab() {
    if (activeTab === 'attekintes') renderOverview();
    else if (activeTab === 'statisztikak') renderStats();
    else if (activeTab === 'jatekos') renderPlay();
  }

  function diffDistribution() {
    const d = { 'Könnyű': 0, 'Közepes': 0, 'Nehéz': 0, 'Extrém': 0 };
    state.forEach(s => { d[s.difficulty] = (d[s.difficulty] || 0) + 1; });
    return d;
  }

  function renderOverview() {
    const name = ($('#cmName') && $('#cmName').value) || 'Városliget Felfedező';
    const total = state.length;
    const tasks = state.filter(s => s.type === 'Feladat állomás').length;
    const decisions = state.filter(s => s.type === 'Döntési pont').length;
    const dist = diffDistribution();
    const bars = Object.keys(dist).map(k => {
      const pct = total ? Math.round(dist[k] / total * 100) : 0;
      return '<div class="uq-bar-row"><span>' + k + '</span><div class="uq-bar-track"><div class="uq-bar-fill" style="width:' + pct + '%;background:' + DIFF_VAR[k] + '"></div></div><span class="uq-bar-val">' + dist[k] + ' db</span></div>';
    }).join('');
    $('#panelAttekintes').innerHTML =
      '<div class="uq-pane"><div class="uq-pane-title">Pálya összefoglaló</div>' +
      '<div class="uq-grid2">' +
      '<div class="uq-mini"><span class="uq-mini-label">Pálya neve</span><b style="font-size:16px">' + esc(name) + '</b><small>Budapest, Városliget</small></div>' +
      '<div class="uq-mini"><span class="uq-mini-label">Állomások száma</span><b>' + total + '</b><small>összesen a pályán</small></div>' +
      '<div class="uq-mini"><span class="uq-mini-label">Feladat állomás</span><b>' + tasks + '</b><small>megoldandó feladat</small></div>' +
      '<div class="uq-mini"><span class="uq-mini-label">Döntési pont</span><b>' + decisions + '</b><small>elágazás az útvonalon</small></div>' +
      '</div></div>' +
      '<div class="uq-pane"><div class="uq-pane-title">Nehézség-eloszlás</div><div class="uq-bars">' + bars + '</div></div>';
  }

  function renderStats() {
    const total = state.length;
    const totalXp = state.reduce((a, s) => a + (parseInt(s.xp, 10) || 0), 0);
    const totalScore = state.reduce((a, s) => a + (parseInt(s.score, 10) || 0), 0);
    const withTime = state.filter(s => s.timeLimitOn).length;
    const langCount = state.reduce((a, s) => a + s.langs.filter(l => l.on).length, 0);
    // fiktív "teljesítési arány" oszlopdiagram állomásonként
    const cols = state.map((s, i) => {
      const pct = Math.max(18, 96 - i * (72 / Math.max(1, total - 1)));
      return '<div class="uq-chart-col"><div class="uq-chart-bar" style="height:' + pct.toFixed(0) + '%"></div><div class="uq-chart-lbl">#' + (i + 1) + '</div></div>';
    }).join('');
    $('#panelStatisztikak').innerHTML =
      '<div class="uq-pane"><div class="uq-pane-title">Kulcsmutatók</div><div class="uq-grid2">' +
      '<div class="uq-mini"><span class="uq-mini-label">Összes tapasztalati pont</span><b>' + totalXp + ' XP</b><small>' + total + ' állomás összesen</small></div>' +
      '<div class="uq-mini"><span class="uq-mini-label">Megszerezhető pontszám</span><b>' + totalScore + '</b><small>maximum a pályán</small></div>' +
      '<div class="uq-mini"><span class="uq-mini-label">Időlimites állomás</span><b>' + withTime + '</b><small>' + total + '-ból időzítve</small></div>' +
      '<div class="uq-mini"><span class="uq-mini-label">Aktív nyelvi verzió</span><b>' + langCount + '</b><small>állomás × nyelv</small></div>' +
      '</div></div>' +
      '<div class="uq-pane"><div class="uq-pane-title">Becsült teljesítési arány állomásonként</div><div class="uq-chart">' + cols + '</div></div>';
  }

  /* =========================================================
     JÁTÉKOS VÉGIGJÁTSZÁS (teszt-mód) — beágyazott panel
     ========================================================= */
  const PLAY_TYPE = {
    kviz:   { l: 'Kvíz',       c: '#5b9de0', ic: 'a-task' },
    szoveg: { l: 'Szöveges',   c: '#e0b93a', ic: 'a-preview' },
    puzzle: { l: 'Puzzle',     c: '#8fb04f', ic: 'a-layers' },
    kod:    { l: 'Kód',        c: '#e8813a', ic: 'a-lock' },
    foto:   { l: 'Fotó',       c: '#9d7ce0', ic: 'a-camera' },
    gps:    { l: 'GPS',        c: '#4fb84f', ic: 'a-target' },
    qr:     { l: 'QR-kód',     c: '#39c0c8', ic: 'a-qr' },
    gyors:  { l: 'Gyorsasági', c: '#e05b9d', ic: 'a-bolt' }
  };
  const playNorm = s => String(s == null ? '' : s).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function parsePts(str) { const m = String(str || '').match(/\d+/); return m ? parseInt(m[0], 10) : 0; }

  const play = { active: false, view: 'intro', path: [], points: 0, done: 0, skipped: 0, taskIdx: 0, stationTasks: [], result: null, decOpts: [], pv: {}, startTs: 0, timer: null, finished: false, finalMs: 0 };

  function revealFor(type, c) {
    c = c || {};
    if (type === 'kviz') { const ok = (c.options || []).find(o => o.correct); return ok ? ok.text : '—'; }
    if (type === 'szoveg') return (c.accepted || []).filter(Boolean).join(' / ') || '—';
    if (type === 'kod') return c.code || '—';
    if (type === 'puzzle' && c.subtype !== 'match') return (c.items || []).join(' → ');
    if (type === 'puzzle') return (c.pairs || []).map(p => p.left + '→' + p.right).join(', ');
    return null;
  }
  function stationPlayTasks(i) {
    const s = state[i];
    const linked = readTasks().filter(t => t.station === s.name);
    if (linked.length) return linked.map(t => ({ id: t.id, question: t.question, type: t.type, cfg: t.cfg || {}, points: t.points || 0, reveal: revealFor(t.type, t.cfg), image: t.image || '' }));
    // fallback: az állomás saját feladatából (hogy alap-pálya is játszható legyen)
    const tmap = { 'Fotó feladat': 'foto', 'QR-kód': 'qr', 'GPS pont': 'gps' };
    const ty = tmap[s.taskType] || 'szoveg';
    const pts = parsePts(s.score) || parsePts(s.xp);
    let cfg;
    if (ty === 'szoveg') cfg = { accepted: [s.answer || ''], tolerant: true };
    else if (ty === 'foto') cfg = { instruction: s.question };
    else if (ty === 'gps') cfg = { radius: 30 };
    else cfg = { code: s.answer || '' };
    return [{ id: 'st' + i, question: s.question || (s.name + ' feladata'), type: ty, cfg: cfg, points: pts, reveal: revealFor(ty, cfg) }];
  }

  /* --- idő --- */
  function playFmt(ms) { const s = Math.max(0, Math.floor(ms / 1000)); const m = Math.floor(s / 60); const r = s % 60; return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r; }
  function playElapsed() { return play.startTs ? Date.now() - play.startTs : 0; }
  function stopTimer() { if (play.timer) { clearInterval(play.timer); play.timer = null; } }
  function startTimer() {
    stopTimer();
    play.timer = setInterval(() => {
      if (activeTab === 'jatekos' && play.active && !play.finished) { const el = $('#uqPlayTime'); if (el) el.textContent = playFmt(playElapsed()); }
    }, 500);
  }

  /* --- életciklus --- */
  function playStart() {
    let startIdx = state.findIndex(s => s.type === 'Kezdő állomás');
    if (startIdx < 0) startIdx = 0;
    play.active = true; play.finished = false; play.view = 'station';
    play.path = [startIdx]; play.points = 0; play.done = 0; play.skipped = 0;
    play.taskIdx = 0; play.result = null; play.decOpts = []; play.pv = {};
    play.stationTasks = stationPlayTasks(startIdx);
    play.startTs = Date.now(); play.finalMs = 0;
    startTimer();
    renderPlay();
  }
  function playExit() { play.active = false; play.finished = false; play.view = 'intro'; stopTimer(); renderPlay(); }
  function playCurIdx() { return play.path[play.path.length - 1]; }
  function playGoto(i) {
    play.path.push(i); play.taskIdx = 0; play.result = null; play.pv = {}; play.view = 'station';
    play.stationTasks = stationPlayTasks(i);
    renderPlay();
  }
  function playFinish() { play.finished = true; play.view = 'summary'; play.finalMs = playElapsed(); stopTimer(); renderPlay(); }
  function playAfterStation() {
    const i = playCurIdx();
    if (state[i].type === 'Döntési pont') {
      const opts = [];
      if (i + 1 < state.length) opts.push(i + 1);
      if (i + 2 < state.length) opts.push(i + 2);
      if (opts.length >= 2) { play.decOpts = opts; play.view = 'decision'; renderPlay(); return; }
      if (opts.length === 1) return playGoto(opts[0]);
      return playFinish();
    }
    if (i + 1 < state.length) return playGoto(i + 1);
    return playFinish();
  }
  function playTaskDone(credited, revealText) {
    const task = play.stationTasks[play.taskIdx];
    if (credited) { play.points += (task.points || 0); play.done++; }
    else play.skipped++;
    play.result = { ok: credited, reveal: revealText || null, task: task };
    renderPlay();
  }
  function playNextTask() {
    play.taskIdx++; play.result = null; play.pv = {};
    if (play.taskIdx >= play.stationTasks.length) playAfterStation();
    else renderPlay();
  }

  /* --- fő render --- */
  function renderPlay() {
    const host = $('#panelJatekos'); if (!host) return;
    if (!play.active) { host.innerHTML = playIntroHTML(); const b = $('#uqPlayStart'); if (b) b.addEventListener('click', playStart); return; }
    host.innerHTML = '<div class="uq-play">' +
      '<div class="uq-play-main">' + playHudHTML() + '<div class="uq-play-stage" id="uqPlayStage"></div></div>' +
      '<aside class="uq-play-side">' + playMapHTML() + playStepsHTML() + '</aside>' +
      '</div>';
    const ex = $('#uqPlayExit'); if (ex) ex.addEventListener('click', playExit);
    const stage = $('#uqPlayStage');
    if (play.view === 'summary') { stage.innerHTML = playSummaryHTML(); wirePlaySummary(); }
    else if (play.view === 'decision') { stage.innerHTML = playDecisionHTML(); wirePlayDecision(); }
    else { stage.innerHTML = playStationHTML(); wirePlayStation(); }
  }

  function playIntroHTML() {
    const name = ($('#cmName') && $('#cmName').value) || 'Városliget Felfedező';
    const total = state.length;
    let tasks = 0; for (let i = 0; i < total; i++) tasks += stationPlayTasks(i).length;
    return '<div class="uq-play-intro">' +
      '<span class="uq-play-intro-ic"><svg class="ico" aria-hidden="true"><use href="#a-play"/></svg></span>' +
      '<h2>Végigjátszás — teszt-mód</h2>' +
      '<p>Játszd végig a(z) <b>' + esc(name) + '</b> pályát úgy, ahogy a játékos látná: állomásról állomásra, valódi feladatokkal és döntési pontokkal.</p>' +
      '<div class="uq-play-intro-meta"><span><b>' + total + '</b> állomás</span><span><b>' + tasks + '</b> feladat</span><span><b>~' + Math.max(1, Math.round(total * 2.5)) + '</b> perc</span></div>' +
      '<button class="adm-btn adm-btn-lime uq-play-start" type="button" id="uqPlayStart"><svg class="ico ico-sm" aria-hidden="true"><use href="#a-play"/></svg>Végigjátszás indítása</button>' +
      '<small class="uq-play-note">A feladatok átugorhatók • a döntési pontoknál választhatsz útvonalat</small>' +
      '</div>';
  }

  function playHudHTML() {
    const total = state.length;
    const pct = Math.min(100, Math.round(play.path.length / total * 100));
    return '<div class="uq-play-hud">' +
      '<div class="uq-hud-item"><span class="uq-hud-label">Haladás</span><b>' + play.path.length + '<small>/' + total + '</small></b></div>' +
      '<div class="uq-hud-item"><span class="uq-hud-label">Pont</span><b class="lime">' + play.points + '</b></div>' +
      '<div class="uq-hud-item"><span class="uq-hud-label">Idő</span><b id="uqPlayTime">' + playFmt(play.finished ? play.finalMs : playElapsed()) + '</b></div>' +
      '<div class="uq-hud-bar"><span style="width:' + pct + '%"></span></div>' +
      '<button class="uq-hud-exit" type="button" id="uqPlayExit" aria-label="Kilépés a teszt-módból"><svg class="ico ico-sm" aria-hidden="true"><use href="#a-x"/></svg></button>' +
      '</div>';
  }

  function playStationHTML() {
    const i = playCurIdx(); const s = state[i];
    const total = play.stationTasks.length;
    const tno = Math.min(play.taskIdx + 1, total);
    let h = '<div class="uq-pl-card">';
    h += '<div class="uq-pl-hero" style="background:' + s.img + '"><span class="uq-pl-badge"><svg class="ico ico-xs" aria-hidden="true"><use href="#' + (s.type === 'Döntési pont' ? 'a-diamond' : 'a-pin') + '"/></svg>' + play.path.length + '. állomás</span><span class="uq-pl-type">' + esc(s.type) + '</span></div>';
    h += '<div class="uq-pl-body">';
    h += '<h3>' + esc(s.name) + '</h3>';
    h += '<p class="uq-pl-desc">' + esc(s.desc || 'Nincs leírás ehhez az állomáshoz.') + '</p>';
    if (total) {
      const task = play.stationTasks[play.taskIdx];
      const ty = PLAY_TYPE[task.type] || { l: task.type, c: '#8b957f', ic: 'a-task' };
      h += '<div class="uq-pl-taskhead"><span class="uq-pl-tico" style="color:' + ty.c + ';background:' + ty.c + '22"><svg class="ico ico-sm" aria-hidden="true"><use href="#' + ty.ic + '"/></svg></span>' +
        '<div class="uq-pl-tmeta"><span class="uq-pl-tlabel">' + ty.l + (total > 1 ? ' · ' + tno + '/' + total + ' feladat' : '') + '</span><b>' + esc(task.question) + '</b></div>' +
        '<span class="uq-pl-tpts"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-star"/></svg>' + (task.points || 0) + '</span></div>';
      if (task.image) h += '<div class="uq-pl-taskimg"><img src="' + esc(task.image) + '" alt=""></div>';
      h += '<div class="uq-pl-answer" id="uqPlayAnswer"></div>';
      h += '<div class="uq-pl-actions" id="uqPlayActions"></div>';
    } else {
      h += '<div class="uq-pl-notask">Ehhez az állomáshoz nincs feladat — csak áthaladsz rajta.</div>';
      h += '<div class="uq-pl-actions"><button class="adm-btn adm-btn-lime" type="button" id="uqPlayCont"><svg class="ico ico-sm" aria-hidden="true"><use href="#a-check"/></svg>Tovább</button></div>';
    }
    h += '</div></div>';
    return h;
  }
  function wirePlayStation() {
    const cont = $('#uqPlayCont'); if (cont) { cont.addEventListener('click', () => playAfterStation()); return; }
    if (!play.stationTasks.length) return;
    if (play.result) renderPlayResult(); else renderPlayAnswer();
  }

  function playWrong() {
    const box = $('#uqPlayAnswer'); if (!box) return;
    let m = box.querySelector('.uq-pl-wrong');
    if (!m) { m = document.createElement('div'); m.className = 'uq-pl-wrong'; box.appendChild(m); }
    m.innerHTML = '<svg class="ico ico-xs" aria-hidden="true"><use href="#a-x"/></svg>Nem talált — próbáld újra, vagy ugord át.';
    const inp = box.querySelector('input'); if (inp) { inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake'); inp.focus(); }
  }
  function playCheckText(val, c) {
    c = c || {};
    if (c.numeric) { const a = parseFloat(String(val).replace(',', '.')); return (c.accepted || []).some(x => parseFloat(String(x).replace(',', '.')) === a); }
    const v = c.tolerant ? playNorm(val) : String(val).trim();
    return (c.accepted || []).some(x => { const xx = c.tolerant ? playNorm(x) : String(x).trim(); return c.keyword ? (xx && v.includes(xx)) : v === xx; });
  }
  function drawCodePad(box, c, done) {
    const len = (c.code || '').length || 4;
    const disp = () => '<div class="uq-pl-code">' + Array.from({ length: len }).map((_, i) => '<span>' + (play.pv.code[i] || '') + '</span>').join('') + '</div>';
    box.innerHTML = disp() + '<div class="uq-pl-pad">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => '<button type="button" data-k="' + n + '">' + n + '</button>').join('') + '<button type="button" data-k="del">⌫</button><button type="button" data-k="0">0</button><button type="button" data-k="ok" class="ok">OK</button></div>';
    box.querySelectorAll('.uq-pl-pad button').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.k;
      if (k === 'del') play.pv.code = play.pv.code.slice(0, -1);
      else if (k === 'ok') { if (String(play.pv.code) === String(c.code)) return done(true); return playWrong(); }
      else if (play.pv.code.length < len) play.pv.code += k;
      const d = box.querySelector('.uq-pl-code'); if (d) d.outerHTML = disp();
    }));
  }
  function drawPuzzle(box, c, done) {
    if (!play.pv.order) play.pv.order = (c.items || []).map((_, i) => i).sort(() => Math.random() - 0.5);
    const draw = () => {
      box.innerHTML = '<div class="uq-pl-puzzle">' + play.pv.order.map((idx, pos) => '<div class="uq-pl-pz"><span class="n">' + (pos + 1) + '</span><span class="t">' + esc(c.items[idx]) + '</span><span class="mv"><button type="button" data-mv="up" data-pos="' + pos + '">▲</button><button type="button" data-mv="dn" data-pos="' + pos + '">▼</button></span></div>').join('') + '</div><button class="uq-pl-go uq-pl-wide" type="button" id="uqPlayGo">Ellenőrzés</button>';
      box.querySelectorAll('[data-mv]').forEach(b => b.addEventListener('click', () => {
        const pos = +b.dataset.pos, dir = b.dataset.mv === 'up' ? -1 : 1, np = pos + dir;
        if (np < 0 || np >= play.pv.order.length) return;
        const t = play.pv.order[pos]; play.pv.order[pos] = play.pv.order[np]; play.pv.order[np] = t; draw();
      }));
      $('#uqPlayGo').addEventListener('click', () => {
        const correct = play.pv.order.filter((idx, pos) => idx === pos).length;
        if (correct === (c.items || []).length) done(true); else playWrong();
      });
    };
    draw();
  }
  function renderPlayAnswer() {
    const task = play.stationTasks[play.taskIdx];
    const c = task.cfg || {}; const box = $('#uqPlayAnswer'); const act = $('#uqPlayActions');
    play.pv = { code: '', order: null };
    act.innerHTML = '<button class="uq-pl-skip" type="button" id="uqPlaySkip"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-collapse"/></svg>Megoldás / átugrás</button>';
    $('#uqPlaySkip').addEventListener('click', () => playTaskDone(false, task.reveal));
    const done = (ok) => playTaskDone(ok, ok ? null : task.reveal);

    if (task.type === 'kviz') {
      let opts = (c.options || []).map((o, i) => ({ o: o, i: i }));
      if (c.shuffle) opts = opts.sort(() => Math.random() - 0.5);
      box.innerHTML = '<div class="uq-pl-opts">' + opts.map(x => '<button class="uq-pl-opt" type="button" data-i="' + x.i + '">' + esc(x.o.text || '—') + '</button>').join('') + '</div>';
      box.querySelectorAll('.uq-pl-opt').forEach(b => b.addEventListener('click', () => {
        const ok = c.options[+b.dataset.i] && c.options[+b.dataset.i].correct;
        box.querySelectorAll('.uq-pl-opt').forEach(x => { x.disabled = true; });
        b.classList.add(ok ? 'ok' : 'bad');
        if (!ok) { const ci = c.options.findIndex(o => o.correct); const cb = box.querySelector('.uq-pl-opt[data-i="' + ci + '"]'); if (cb) cb.classList.add('ok'); }
        setTimeout(() => done(!!ok), 420);
      }));
    } else if (task.type === 'szoveg') {
      box.innerHTML = '<div class="uq-pl-input"><input type="text" id="uqPlayIn" placeholder="Írd be a választ…" autocomplete="off"><button class="uq-pl-go" type="button" id="uqPlayGo">Ellenőrzés</button></div>';
      const go = () => { if (playCheckText($('#uqPlayIn').value, c)) done(true); else playWrong(); };
      $('#uqPlayGo').addEventListener('click', go);
      $('#uqPlayIn').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    } else if (task.type === 'kod') {
      if (c.codeType === 'word') {
        box.innerHTML = '<div class="uq-pl-input"><input type="text" id="uqPlayIn" placeholder="Írd be a kódot…" autocomplete="off"><button class="uq-pl-go" type="button" id="uqPlayGo">Feltör</button></div>';
        $('#uqPlayGo').addEventListener('click', () => { if (playNorm($('#uqPlayIn').value) === playNorm(c.code)) done(true); else playWrong(); });
      } else { drawCodePad(box, c, done); }
    } else if (task.type === 'puzzle' && c.subtype !== 'match') {
      drawPuzzle(box, c, done);
    } else if (task.type === 'puzzle') {
      box.innerHTML = '<div class="uq-pl-match">' + (c.pairs || []).map((p, i) => '<div class="uq-pl-mrow"><span>' + esc(p.left) + '</span><select data-i="' + i + '"><option value="">…</option>' + (c.pairs || []).map((q, j) => '<option value="' + j + '">' + esc(q.right) + '</option>').join('') + '</select></div>').join('') + '</div><button class="uq-pl-go uq-pl-wide" type="button" id="uqPlayGo">Ellenőrzés</button>';
      $('#uqPlayGo').addEventListener('click', () => { const ok = Array.prototype.every.call(box.querySelectorAll('select'), s => String(s.value) === String(s.dataset.i)); if (ok) done(true); else playWrong(); });
    } else {
      const a = { foto: { ic: 'a-camera', lbl: 'Fotó feltöltése', txt: (c.instruction || 'Készíts képet a helyszínen') }, gps: { ic: 'a-target', lbl: 'Helyszín igazolása', txt: 'Menj a megjelölt pontra (' + (c.radius || 30) + ' m)' }, qr: { ic: 'a-qr', lbl: 'QR beolvasása', txt: 'Keresd meg és olvasd be a kódot' }, gyors: { ic: 'a-bolt', lbl: 'Indítás', txt: (c.game === 'tap' ? 'Koppints ' + (c.target || 15) + '-öt ' + (c.time || 5) + ' mp alatt' : 'Mini-játék') } }[task.type] || { ic: 'a-target', lbl: 'Teljesítés', txt: 'Teljesítsd a feladatot' };
      box.innerHTML = '<div class="uq-pl-action"><span class="big"><svg class="ico" aria-hidden="true"><use href="#' + a.ic + '"/></svg></span><p>' + esc(a.txt) + '</p><button class="uq-pl-do" type="button" id="uqPlayGo">' + a.lbl + '</button></div>';
      $('#uqPlayGo').addEventListener('click', () => done(true));
    }
  }
  function renderPlayResult() {
    const r = play.result; const box = $('#uqPlayAnswer'); const act = $('#uqPlayActions');
    const last = play.taskIdx >= play.stationTasks.length - 1;
    if (r.ok) box.innerHTML = '<div class="uq-pl-res good"><svg class="ico" aria-hidden="true"><use href="#a-check-c"/></svg><div><b>Helyes!</b><small>+' + (r.task.points || 0) + ' pont</small></div></div>';
    else box.innerHTML = '<div class="uq-pl-res skip"><svg class="ico" aria-hidden="true"><use href="#a-collapse"/></svg><div><b>Átugorva</b>' + (r.reveal ? '<small>Megoldás: ' + esc(r.reveal) + '</small>' : '') + '</div></div>';
    act.innerHTML = '<button class="adm-btn adm-btn-lime" type="button" id="uqPlayNext"><svg class="ico ico-sm" aria-hidden="true"><use href="#a-check"/></svg>' + (last ? 'Állomás kész — tovább' : 'Következő feladat') + '</button>';
    $('#uqPlayNext').addEventListener('click', playNextTask);
  }

  function playDecisionHTML() {
    const i = playCurIdx(); const s = state[i];
    let h = '<div class="uq-pl-card uq-pl-decision"><div class="uq-pl-dec-head"><span class="uq-pl-dec-ic"><svg class="ico" aria-hidden="true"><use href="#a-diamond"/></svg></span><div><h3>' + esc(s.name) + '</h3><p>' + esc(s.desc || 'Válaszd ki a következő útvonalat!') + '</p></div></div>';
    h += '<div class="uq-pl-routes">' + play.decOpts.map((ti, k) => {
      const t = state[ti];
      return '<button class="uq-pl-route" type="button" data-goto="' + ti + '"><span class="uq-pl-route-k">' + (k === 0 ? 'A' : 'B') + '</span><span class="uq-pl-route-body"><b>' + esc(t.name) + '</b><small>' + esc(t.type) + (k === 1 ? ' · rövidebb út' : ' · a következő állomás') + '</small></span><svg class="ico ico-sm uq-pl-route-go" aria-hidden="true"><use href="#a-route"/></svg></button>';
    }).join('') + '</div></div>';
    return h;
  }
  function wirePlayDecision() {
    $$('#uqPlayStage [data-goto]').forEach(b => b.addEventListener('click', () => {
      const ti = +b.dataset.goto;
      toast('Útvonal választva', { type: 'info', sub: state[ti].name });
      playGoto(ti);
    }));
  }

  function playSummaryHTML() {
    const total = play.done + play.skipped;
    const rate = total ? Math.round(play.done / total * 100) : 0;
    const name = ($('#cmName') && $('#cmName').value) || 'pálya';
    return '<div class="uq-pl-summary">' +
      '<span class="uq-pl-sum-ic"><svg class="ico" aria-hidden="true"><use href="#a-flag"/></svg></span>' +
      '<h2>Pálya teljesítve!</h2>' +
      '<p>Végigjátszottad a(z) <b>' + esc(name) + '</b> tesztjét.</p>' +
      '<div class="uq-pl-sum-grid">' +
      '<div class="uq-pl-sum-stat"><span>Összpont</span><b class="lime">' + play.points + '</b></div>' +
      '<div class="uq-pl-sum-stat"><span>Idő</span><b>' + playFmt(play.finalMs) + '</b></div>' +
      '<div class="uq-pl-sum-stat"><span>Bejárt állomás</span><b>' + play.path.length + '</b></div>' +
      '<div class="uq-pl-sum-stat"><span>Megoldott feladat</span><b>' + play.done + '<small>/' + total + '</small></b></div>' +
      '</div>' +
      '<div class="uq-pl-sum-bar"><span>Teljesítési arány</span><div class="uq-pl-sum-track"><div style="width:' + rate + '%"></div></div><b>' + rate + '%</b></div>' +
      '<div class="uq-pl-sum-actions"><button class="adm-btn" type="button" id="uqPlayExitSum"><svg class="ico ico-sm" aria-hidden="true"><use href="#a-x"/></svg>Bezárás</button><button class="adm-btn adm-btn-lime" type="button" id="uqPlayRestart"><svg class="ico ico-sm" aria-hidden="true"><use href="#a-play"/></svg>Újra</button></div>' +
      '</div>';
  }
  function wirePlaySummary() {
    const r = $('#uqPlayRestart'); if (r) r.addEventListener('click', playStart);
    const x = $('#uqPlayExitSum'); if (x) x.addEventListener('click', playExit);
  }

  /* --- mini-térkép + lépéslista (jobb oszlop) --- */
  function playMapHTML() {
    const cur = playCurIdx();
    let base = '';
    state.forEach((s, i) => {
      const tg = s.type === 'Döntési pont' ? [i + 1, i + 2] : [i + 1];
      tg.forEach(ti => { if (ti < state.length) { const a = svgXY(s), b = svgXY(state[ti]); base += '<line x1="' + a.x.toFixed(1) + '" y1="' + a.y.toFixed(1) + '" x2="' + b.x.toFixed(1) + '" y2="' + b.y.toFixed(1) + '" class="uq-pm-base"/>'; } });
    });
    let done = '';
    for (let k = 1; k < play.path.length; k++) { const a = svgXY(state[play.path[k - 1]]), b = svgXY(state[play.path[k]]); done += '<line x1="' + a.x.toFixed(1) + '" y1="' + a.y.toFixed(1) + '" x2="' + b.x.toFixed(1) + '" y2="' + b.y.toFixed(1) + '" class="uq-pm-done"/>'; }
    const nodes = state.map((s, i) => {
      const p = svgXY(s); const isCur = i === cur; const inPath = play.path.indexOf(i) >= 0;
      const cls = isCur ? 'cur' : (inPath ? 'done' : 'future');
      return '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (isCur ? 9 : 6) + '" class="uq-pm-node ' + cls + '"/>';
    }).join('');
    return '<div class="uq-play-map"><div class="uq-play-map-t"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-map"/></svg>Útvonal</div>' +
      '<svg viewBox="0 0 540 470" preserveAspectRatio="xMidYMid meet" class="uq-pm-svg" aria-hidden="true">' + base + done + nodes + '</svg></div>';
  }
  function playStepsHTML() {
    const items = play.path.map((idx, k) => {
      const s = state[idx]; const isCur = k === play.path.length - 1 && !play.finished;
      return '<li class="uq-play-step' + (isCur ? ' is-cur' : ' is-done') + '"><span class="uq-step-n">' + (k + 1) + '</span><span class="uq-step-b"><b>' + esc(s.name) + '</b><small>' + esc(s.type) + '</small></span>' + (isCur ? '<span class="uq-step-here">itt</span>' : '<svg class="ico ico-xs uq-step-ck" aria-hidden="true"><use href="#a-check"/></svg>') + '</li>';
    }).join('');
    return '<ol class="uq-play-steps">' + items + '</ol>';
  }

  /* =========================================================
     KERESŐ — élő szűrés a lista nevein
     ========================================================= */
  const searchEl = $('#admSearch');
  let filterQ = '';
  function applyFilter() {
    const q = filterQ.trim().toLowerCase();
    $$('.ed-station', listEl).forEach(st => {
      const nm = (st.querySelector('.ed-st-body b').textContent || '').toLowerCase();
      st.classList.toggle('is-filtered', q !== '' && nm.indexOf(q) === -1);
    });
  }
  searchEl.addEventListener('input', () => { filterQ = searchEl.value; applyFilter(); });

  /* =========================================================
     FELSŐ SÁV — Előnézet / Mentés
     ========================================================= */
  $('#admPreview').addEventListener('click', () => { saveForm(current); setTab('jatekos'); });

  $('#admSave').addEventListener('click', () => {
    saveForm(current);
    saveCourse();
    const saved = $('#admSaved');
    if (saved) saved.innerHTML = '<svg class="ico ico-sm" aria-hidden="true"><use href="#a-check-c"/></svg>Mentve: most';
    toast('Pálya elmentve', { sub: 'Minden módosítás mentve' });
  });

  /* státusz dropdown */
  const statusLabel = $('#admStatusLabel');
  const statusDot = $('#admStatusDot');
  const courseTag = $('#admCourseTag');
  const STATUS_STYLE = {
    'Közzétéve': { color: 'var(--lime)', glow: '0 0 6px var(--lime)', tag: '' },
    'Piszkozat': { color: 'var(--kozepes)', glow: '0 0 6px var(--kozepes)', tag: 'is-draft' },
    'Archivált': { color: 'var(--muted)', glow: 'none', tag: 'is-archived' }
  };
  $$('.uq-dd-item[data-status]').forEach(it => it.addEventListener('click', () => {
    const st = it.dataset.status;
    statusLabel.textContent = st;
    const s = STATUS_STYLE[st];
    statusDot.style.background = s.color;
    statusDot.style.boxShadow = s.glow;
    courseTag.textContent = st;
    courseTag.className = 'adm-tag' + (s.tag ? ' ' + s.tag : '');
    $$('.uq-dd-item[data-status]').forEach(x => x.classList.toggle('is-active', x === it));
    closeAllFloating();
    toast('Állapot módosítva', { type: 'info', sub: st });
  }));

  /* felhasználó dropdown */
  $$('.uq-dd-item[data-user]').forEach(it => it.addEventListener('click', () => {
    closeAllFloating();
    toast(it.dataset.user, { type: 'info', sub: 'Menüpont kiválasztva' });
  }));

  /* =========================================================
     DROPDOWN nyitás/zárás (generikus)
     ========================================================= */
  function closeAllFloating() {
    $$('[data-dd].is-open').forEach(x => x.classList.remove('is-open'));
    $$('[data-chipmenu].is-open').forEach(x => x.classList.remove('is-open'));
  }
  $$('[data-dd]').forEach(dd => {
    const toggle = dd.querySelector('[data-dd-toggle]');
    if (!toggle) return;
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = dd.classList.contains('is-open');
      closeAllFloating();
      dd.classList.toggle('is-open', !open);
    });
  });
  document.addEventListener('click', () => closeAllFloating());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeAllFloating(); closeModal(); }
  });

  /* =========================================================
     PÁLYA BEÁLLÍTÁSOK MODAL
     ========================================================= */
  const modal = $('#courseModal');
  function openModal() {
    modal.classList.add('is-open');
    modal.querySelector('.uq-modal-panel').focus();
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    if (!modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  $('#admCourseSettings').addEventListener('click', openModal);
  $$('[data-modal-close]', modal).forEach(b => b.addEventListener('click', closeModal));
  $('#cmSave').addEventListener('click', () => {
    const nm = $('#cmName').value.trim() || 'Névtelen pálya';
    const h1 = $('#admCourseName');
    // az első szöveges csomópont a pálya neve (a .adm-tag megmarad)
    h1.childNodes[0].textContent = nm + ' ';
    closeModal();
    if (activeTab === 'attekintes') renderOverview();
    toast('Pálya beállítások mentve', { sub: nm });
  });

  /* pálya tesztelése — Játékos nézet fül + azonnali végigjátszás */
  $('#admCourseTest').addEventListener('click', () => { saveForm(current); setTab('jatekos'); playStart(); toast('Teszt mód indítva', { type: 'info', sub: 'Pálya végigjátszása tesztként' }); });

  /* =========================================================
     TÉRKÉP — zoom-gombok (Leaflet)
     A jelölő-húzást, térképre-kattintást és pan/zoom-ot maga a Leaflet kezeli.
     ========================================================= */
  $('#edZoomIn').addEventListener('click', () => { if (map) map.zoomIn(); });
  $('#edZoomOut').addEventListener('click', () => { if (map) map.zoomOut(); });
  $('#edZoomFit').addEventListener('click', () => {
    if (map && markers.length) {
      map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2));
      toast('Nézet a pályához igazítva', { type: 'info' });
    }
  });

  /* =========================================================
     ELEMEK LISTA — drag & drop átrendezés
     ========================================================= */
  let dragIdx = null;
  listEl.addEventListener('dragstart', (e) => {
    const st = e.target.closest('.ed-station'); if (!st) return;
    dragIdx = parseInt(st.dataset.i, 10); st.classList.add('is-drag');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', String(dragIdx)); } catch (x) {}
  });
  listEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    const st = e.target.closest('.ed-station'); if (!st) return;
    $$('.ed-station', listEl).forEach(x => x.classList.remove('is-over'));
    st.classList.add('is-over');
  });
  listEl.addEventListener('drop', (e) => {
    e.preventDefault();
    const st = e.target.closest('.ed-station');
    $$('.ed-station', listEl).forEach(x => x.classList.remove('is-over', 'is-drag'));
    if (!st || dragIdx == null) return;
    const toIdx = parseInt(st.dataset.i, 10);
    if (toIdx === dragIdx) { dragIdx = null; return; }
    saveForm(current);
    const moved = state.splice(dragIdx, 1)[0];
    state.splice(toIdx, 0, moved);
    current = toIdx; dragIdx = null;
    renderList(); renderNodes(); loadForm(current);
    saveCourse();
    toast('Sorrend módosítva', { type: 'info', sub: moved.name + ' → ' + (toIdx + 1) + '. hely' });
  });
  listEl.addEventListener('dragend', () => { $$('.ed-station', listEl).forEach(x => x.classList.remove('is-over', 'is-drag')); dragIdx = null; });

  /* =========================================================
     KÉP CSERÉJE
     ========================================================= */
  const imgInput = $('#edImageInput');
  $('#edImageBtn').addEventListener('click', () => imgInput.click());
  imgInput.addEventListener('change', () => {
    const f = imgInput.files && imgInput.files[0];
    if (f) {
      const url = URL.createObjectURL(f);
      state[current].img = 'center/cover no-repeat url("' + url + '")';
    } else {
      // fallback: következő gradiens
      const idx = (IMG_GRADS.indexOf(state[current].img) + 1) % IMG_GRADS.length;
      state[current].img = IMG_GRADS[idx < 0 ? 0 : idx];
    }
    thumbEl.style.background = state[current].img;
    toast('Kép frissítve', { sub: f ? f.name : 'Új háttér beállítva' });
    imgInput.value = '';
  });

  /* helyszín "Térképen" — a térkép a kijelölt állomásra ugrik */
  $('#edLocBtn').addEventListener('click', () => {
    const s = state[current];
    if (map && s) { const ll = parseLoc(s.location); map.setView([ll.lat, ll.lng], Math.max(map.getZoom(), 16)); }
    toast('Helyszín a térképen', { type: 'info', sub: s.location });
  });

  /* =========================================================
     OLDALSÁV — nav + összecsukás
     ========================================================= */
  const navItems = $$('.adm-nav-item');
  navItems.forEach(item => item.addEventListener('click', (e) => {
    const href = item.getAttribute('href');
    if (!href || href === '#') {
      e.preventDefault();
      navItems.forEach(n => n.classList.toggle('is-active', n === item));
    }
  }));

  const side = $('#admSide');
  if (localStorage.getItem('uqSideCollapsed') === 'true' && window.innerWidth > 900) {
    side.classList.add('is-collapsed');
  }
  $('[data-side-toggle]').addEventListener('click', () => {
    if (window.innerWidth <= 900) return; // mobilon nincs összecsukás
    side.classList.toggle('is-collapsed');
    localStorage.setItem('uqSideCollapsed', side.classList.contains('is-collapsed'));
  });

  /* =========================================================
     INDÍTÁS
     ========================================================= */
  initLeaflet();       // valós Leaflet + OSM térkép

  /* Per-játék pálya: a beépített demo-pálya perzisztálása (ha még nincs),
     a játék-választó feltöltése, majd az aktuális játék pályájának betöltése.
     A loadCourse elvégzi: syncMxMy/initMapCoords, renderList, renderNodes,
     loadForm, updateCourseCount és a Leaflet nézet-igazítást. */
  (function initCourses() {
    const courses = readCourses();
    if (!courses[DEFAULT_GAME] || !courses[DEFAULT_GAME].length) {
      courses[DEFAULT_GAME] = state.map(clone); // az induló beépített pálya megőrzése
      writeCourses(courses);
    }
    initGameSelector();
    loadCourse(currentGame);
  })();

  /* mély-link: #play → Játékos nézet + azonnali végigjátszás (teszt/megosztás) */
  if (location.hash === '#play') { setTab('jatekos'); playStart(); }
})();
