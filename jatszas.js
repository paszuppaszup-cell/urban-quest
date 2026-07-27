/* =========================================================
   URBAN QUEST — JÁTÉK VÉGIGJÁTSZÁS (önálló oldal)
   A pálya = azok az állomások, melyek route-ja == a játék neve,
   tömb-sorrendben, a hozzájuk kapcsolt feladatokkal.
   A végigjátszó motor az admin.js "teszt-mód" motorjából adaptálva,
   #playRoot-ba renderel, COURSE + type-kulcs sémára igazítva.
   ========================================================= */

/* ---------------------------------------------------------
   KÖZÖS: toast scaffold (window.UQ.toast) — csapatok.js mintájára
   --------------------------------------------------------- */
(function () {
  'use strict';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var ico = function (id, cls) { return '<svg class="ico ' + (cls || '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; };
  function ensureToastWrap() {
    var w = document.getElementById('uqToasts');
    if (!w) { w = document.createElement('div'); w.className = 'uq-toast-wrap'; w.id = 'uqToasts'; document.body.appendChild(w); }
    return w;
  }
  function toast(msg, opts) {
    opts = opts || {};
    var type = opts.type || 'ok';
    var sub = opts.sub || '';
    var wrap = ensureToastWrap();
    var t = document.createElement('div');
    t.className = 'uq-toast' + (type !== 'ok' ? ' is-' + type : '');
    var icName = type === 'ok' ? 'a-check-c' : (type === 'error' ? 'a-x' : 'a-clock');
    t.innerHTML =
      '<span class="uq-toast-ic">' + ico(icName) + '</span>' +
      '<div class="uq-toast-body"><b>' + esc(msg) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>' +
      '<button class="uq-toast-x" type="button" aria-label="Bezárás">' + ico('a-x', 'ico-sm') + '</button>';
    wrap.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('is-show'); });
    var dismiss = function () { t.classList.remove('is-show'); setTimeout(function () { t.remove(); }, 260); };
    var x = t.querySelector('.uq-toast-x');
    if (x) x.addEventListener('click', dismiss);
    setTimeout(dismiss, 3200);
  }
  window.UQ = window.UQ || {};
  if (!window.UQ.toast) window.UQ.toast = toast;
})();


/* ---------------------------------------------------------
   VÉGIGJÁTSZÁS MOTOR
   --------------------------------------------------------- */
(function () {
  'use strict';

  /* ---------- segédek ---------- */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const toast = (m, o) => (window.UQ && window.UQ.toast ? window.UQ.toast : function () {})(m, o);
  const playNorm = s => String(s == null ? '' : s).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function parsePts(str) { const m = String(str || '').match(/\d+/); return m ? parseInt(m[0], 10) : 0; }

  /* videó-felismerő + beágyazott lejátszó (a feladat.video mezőhöz) */
  function parseVideo(url) {
    url = String(url == null ? '' : url).trim();
    if (!url) return null;
    if (/^data:video\//i.test(url) || /\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return { kind: 'file', src: url };
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if (yt) return { kind: 'youtube', embed: 'https://www.youtube.com/embed/' + yt[1] };
    const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vm) return { kind: 'vimeo', embed: 'https://player.vimeo.com/video/' + vm[1] };
    return { kind: 'url', src: url };
  }
  function videoEmbedHTML(url, cls) {
    const v = parseVideo(url);
    if (!v) return '';
    if (v.kind === 'youtube' || v.kind === 'vimeo')
      return '<div class="' + (cls || '') + '"><iframe src="' + esc(v.embed) + '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>';
    return '<div class="' + (cls || '') + '"><video src="' + esc(v.src || url) + '" controls playsinline preload="metadata"></video></div>';
  }

  /* ---------- SÉMA-FÜGGETLEN állomás-normalizáló ----------
     Kétféle állomás-séma van:
       • pálya-szerkesztő (uq_courses_v1): type = magyar címke ('Döntési pont'…),
         location = "lat, lng" string, van desc/img, difficulty, question/answer/…
       • régi (uq_stations_v1): type = kulcs ('dontes'…), külön lat/lng, taskShort, diff.
     A normStation egységes mezőket ad: name, desc, img, isDecision, lat, lng, type… */
  function parseLoc(str) {
    const p = String(str == null ? '' : str).split(',').map(x => parseFloat(x));
    return { lat: isFinite(p[0]) ? p[0] : 47.515, lng: isFinite(p[1]) ? p[1] : 19.08 };
  }
  function normStation(s) {
    s = s || {};
    const isDecision = (s.type === 'Döntési pont' || s.type === 'dontes');
    let ll;
    if (s.location != null && String(s.location).trim() !== '') ll = parseLoc(s.location);
    else ll = { lat: num(s.lat, 47.515), lng: num(s.lng, 19.08) };
    return {
      name: s.name || 'Állomás',
      desc: s.desc || '',
      img: s.img || '',                       // lehet undefined → gradiens fallback a hero-ban
      type: s.type,                            // eredeti típus (typeLabel + kezdő-felismerés)
      isDecision: isDecision,
      lat: ll.lat, lng: ll.lng,
      diff: s.difficulty || s.diff || 'Könnyű',
      taskShort: s.taskShort || '',
      // pálya-szerkesztő saját feladat-mezői a fallback feladathoz:
      taskType: s.taskType || '', question: s.question || '', answer: s.answer || '',
      score: s.score || '', xp: s.xp || ''
    };
  }

  /* ---------- SEED-fallback (mint a data-fájlok loadStore-ja) ---------- */
  const GAMES_SEED = [
    { id: 1, name: 'Városliget Felfedező' },
    { id: 2, name: 'Budai Vár Rejtélye' },
    { id: 3, name: 'Küldetés a Gyárban' },
    { id: 4, name: 'Földalatti Nyomok' },
    { id: 5, name: 'Margitsziget Kaland' },
    { id: 6, name: 'Elveszett Örökség' }
  ];
  const STATIONS_SEED = [
    { name: 'Főbejárat', route: 'Városliget Felfedező', type: 'kezdo', diff: 'Könnyű', tasks: 0,
      loc: 'Budapest, Városliget', lat: '47.5148', lng: '19.0810', status: 'active',
      desc: 'A pálya kiindulópontja, ahol a csapatok regisztrálnak és megkapják az első útmutatót.',
      taskShort: 'Keresd meg a főbejárat feletti feliratot, és írd be a kódot.' },
    { name: 'Széchenyi fürdő', route: 'Városliget Felfedező', type: 'info', diff: 'Könnyű', tasks: 1,
      loc: 'Állatkerti krt. 9–11.', lat: '47.5186', lng: '19.0817', status: 'active',
      desc: 'Rövid ismertető a fürdő történetéről, majd egy egyszerű megfigyeléses feladat.',
      taskShort: 'Hány sárga kupola látszik a főhomlokzaton?' },
    { name: 'Vajdahunyad vára', route: 'Városliget Felfedező', type: 'feladat', diff: 'Közepes', tasks: 3,
      loc: 'Vajdahunyad stny.', lat: '47.5136', lng: '19.0826', status: 'active',
      desc: 'Több részből álló feladatsor a vár épületstílusaihoz kapcsolódóan.',
      taskShort: 'Párosítsd az épületrészeket a korstílusokkal.' },
    { name: 'Hősök tere', route: 'Városliget Felfedező', type: 'dontes', diff: 'Közepes', tasks: 2,
      loc: 'Hősök tere', lat: '47.5159', lng: '19.0776', status: 'active',
      desc: 'Elágazási pont: a csapat dönti el, melyik útvonalon folytatja a felfedezést.',
      taskShort: 'Válaszd ki a szoborcsoportot, amelyről bővebben tanulnátok.' },
    { name: 'Műjégpálya', route: 'Városliget Felfedező', type: 'feladat', diff: 'Nehéz', tasks: 4,
      loc: 'Olof Palme sétány 5.', lat: '47.5131', lng: '19.0800', status: 'draft',
      desc: 'Összetett, több lépcsős fejtörő a városligeti tó és a jégpálya körül.',
      taskShort: 'Fejtsd meg a tábla rejtjelezett üzenetét.' },
    { name: 'Állatkert bejárat', route: 'Városliget Felfedező', type: 'info', diff: 'Könnyű', tasks: 1,
      loc: 'Állatkerti krt. 6–12.', lat: '47.5183', lng: '19.0757', status: 'active',
      desc: 'Tájékoztató állomás a nyitvatartásról és a következő pontok elhelyezkedéséről.',
      taskShort: 'Olvasd le a nyitvatartási időt a bejárati tábláról.' },
    { name: 'Zene Háza', route: 'Liget Projekt', type: 'feladat', diff: 'Közepes', tasks: 3,
      loc: 'Városliget, Zene Háza', lat: '47.5145', lng: '19.0792', status: 'draft',
      desc: 'Hangzáshoz és építészethez kapcsolódó interaktív feladatok az épület körül.',
      taskShort: 'Számold meg a tetőszerkezet kör alakú nyílásait.' },
    { name: 'Közlekedési Múzeum', route: 'Liget Projekt', type: 'zaro', diff: 'Nehéz', tasks: 2,
      loc: 'Városliget', lat: '47.5121', lng: '19.0838', status: 'inactive',
      desc: 'A pálya záró állomása: a csapatok itt adják le az összegyűjtött kódokat.',
      taskShort: 'Add meg a végső kódot a korábbi állomások betűiből.' }
  ];
  const TASKS_SEED = [
    { question: 'Melyik évben épült a Vajdahunyad vára?', station: 'Vajdahunyad vára', route: 'Városliget Felfedező', type: 'kviz', points: 50, cfg: { options: [{ text: '1896', correct: true }, { text: '1908', correct: false }, { text: '1873', correct: false }, { text: '1920', correct: false }], shuffle: true } },
    { question: 'Készíts fotót a főbejáratról', station: 'Főbejárat', route: 'Városliget Felfedező', type: 'foto', points: 30, cfg: { instruction: 'Jól kivehető főbejárat a képen', required: true } },
    { question: 'Rakd időrendbe a Városliget épületeit!', station: 'Vajdahunyad vára', route: 'Városliget Felfedező', type: 'puzzle', points: 55, cfg: { subtype: 'order', items: ['Vajdahunyad vára (1908)', 'Széchenyi fürdő (1913)', 'Műjégpálya (1926)', 'Zene Háza (2021)'], pairs: [], partial: true } },
    { question: 'Fejtsd meg a széf kódját a szobor talapzatán!', station: 'Hősök tere', route: 'Városliget Felfedező', type: 'kod', points: 45, cfg: { codeType: 'num', code: '896' } },
    { question: 'Hány kupola díszíti a Széchenyi fürdő főhomlokzatát?', station: 'Széchenyi fürdő', route: 'Városliget Felfedező', type: 'szoveg', points: 35, cfg: { accepted: ['3', 'három'], tolerant: true, keyword: false, numeric: true } },
    { question: 'Érd el a Hősök terén a szoborcsoportot', station: 'Hősök tere', route: 'Városliget Felfedező', type: 'gps', points: 40, cfg: { lat: 47.5159, lng: 19.0776, radius: 35 } },
    { question: 'Olvasd be a bejárat melletti QR-kódot', station: 'Zene Háza', route: 'Liget Projekt', type: 'qr', points: 25, cfg: { code: 'UQ-ZENE-2024' } },
    { question: 'Koppints 15-öt 5 másodperc alatt!', station: 'Műjégpálya', route: 'Városliget Felfedező', type: 'gyors', points: 30, cfg: { game: 'tap', time: 5, target: 15 } },
    { question: 'Melyik stílusban épült a Vajdahunyad vár gótikus szárnya?', station: 'Vajdahunyad vára', route: 'Városliget Felfedező', type: 'kviz', points: 60, cfg: { options: [{ text: 'Reneszánsz', correct: false }, { text: 'Gótikus', correct: true }, { text: 'Barokk', correct: false }, { text: 'Román', correct: false }], shuffle: true } }
  ];

  function readStore(key, seed) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr) && arr.length) return arr; }
    } catch (e) {}
    return seed;
  }
  let QUEST_TASKS = null; // publikus küldetés-mód: a pálya saját feladatai
  function readTasks() { return QUEST_TASKS || readStore('uq_tasks_v1', TASKS_SEED); }

  /* ---------- PÁLYA-FELOLDÁS: quest (publikus) / game / route → állomások ---------- */
  const params = new URLSearchParams(location.search);
  const questParam = params.get('quest');   // publikus küldetés a főoldalról (quest-courses.js)
  const gameParam = params.get('game');      // admin játék (uq_games_v1)
  const routeParam = params.get('route');    // közvetlen útvonalnév
  let route = '', TITLE = '';
  let PUBLIC = false, QUEST_ID = '';
  let RAW_COURSE = null;
  let COVER = '';               // a pálya borítóképe — az összegzőn jelenik meg

  // 1) PUBLIKUS küldetés-mód: a quest-courses.js játszható pályája
  if (questParam && window.QUEST_COURSES && window.QUEST_COURSES[questParam]) {
    const qc = window.QUEST_COURSES[questParam];
    PUBLIC = true; QUEST_ID = questParam;
    QUEST_TASKS = qc.tasks || [];
    const qq = window.QUESTS && window.QUESTS[questParam];
    TITLE = (qq && (qq.heroTitle || qq.title)) || qc.title || questParam;
    route = qc.title || questParam;
    RAW_COURSE = Array.isArray(qc.stations) ? qc.stations : [];
    COVER = qc.image || (qq && qq.image) || '';
  }

  // 2) ADMIN játék / útvonal (teszt-mód)
  if (!PUBLIC) {
    if (gameParam) {
      const g = readStore('uq_games_v1', GAMES_SEED).find(x => String(x.id) === String(gameParam));
      if (g) { route = g.name; TITLE = g.name; }
    }
    if (!route && routeParam) { route = routeParam; TITLE = routeParam; }
    if (!route) { route = 'Városliget Felfedező'; TITLE = 'Városliget Felfedező'; }

    /* PÁLYA forrás: ELSŐDLEGESEN a pálya-szerkesztő per-játék pályája
       (uq_courses_v1[route]); különben a régi uq_stations_v1 (route szerint szűrve). */
    try {
      const courses = JSON.parse(localStorage.getItem('uq_courses_v1') || '{}');
      const cc = (courses && typeof courses === 'object') ? courses[route] : null;
      if (Array.isArray(cc) && cc.length) RAW_COURSE = cc;
    } catch (e) {}
    if (!RAW_COURSE) RAW_COURSE = readStore('uq_stations_v1', STATIONS_SEED).filter(s => s.route === route);
  }

  const COURSE = (RAW_COURSE || []).map(normStation);

  /* publikus mód: a fejléc „teszt" jellegét játékos-barátra váltjuk */
  if (PUBLIC) {
    document.body.classList.add('play-public');
    const tag = document.querySelector('.play-top-tag'); if (tag) tag.remove();
    const brand = document.querySelector('.play-brand'); if (brand) brand.setAttribute('href', 'index.html');
    const back = document.getElementById('playBack');
    /* csak ikon van a gombon — a szöveg helyett a címkét állítjuk */
    if (back) { back.setAttribute('href', 'kuldetes.html?id=' + encodeURIComponent(QUEST_ID)); back.setAttribute('aria-label', 'Kilépés'); back.title = 'Kilépés'; }
  }

  /* fejléc / cím */
  document.title = 'Végigjátszás – ' + TITLE + ' | Urban Quest';
  const titleEl = $('#gameTitle'); if (titleEl) titleEl.textContent = TITLE;
  const backEl = $('#playBack');
  if (backEl) backEl.addEventListener('click', (e) => { if (history.length > 1) { e.preventDefault(); history.back(); } });

  /* ---------- állomás-típus címkék + ikonok + színek ---------- */
  const TYPE_LABEL = { kezdo: 'Kezdő állomás', info: 'Információs állomás', feladat: 'Feladat állomás', dontes: 'Döntési pont', zaro: 'Záró állomás' };
  const typeLabel = s => TYPE_LABEL[s.type] || s.type || 'Állomás';
  const HERO_GRADS = [
    'linear-gradient(135deg,#1e3a1a,#2f5d3a)',
    'linear-gradient(135deg,#153a34,#1f5d55)',
    'linear-gradient(135deg,#2a3a17,#4f5d1f)',
    'linear-gradient(135deg,#173540,#1f4f5d)',
    'linear-gradient(135deg,#22401f,#3a6a4a)',
    'linear-gradient(135deg,#173040,#2f5d6a)'
  ];
  const DIFF_PTS = { 'Könnyű': 20, 'Közepes': 35, 'Nehéz': 50, 'Extrém': 70 };

  /* ---------- mini-térkép koordináták (lat/lng → mx/my %) ---------- */
  function num(v, d) { const n = parseFloat(v); return isFinite(n) ? n : d; }
  (function computeMap() {
    if (!COURSE.length) return;
    const lat = COURSE.map(s => num(s.lat, 47.515));
    const lng = COURSE.map(s => num(s.lng, 19.08));
    if (COURSE.length === 1) { COURSE[0].mx = 50; COURSE[0].my = 50; return; }
    const minLat = Math.min.apply(null, lat), maxLat = Math.max.apply(null, lat);
    const minLng = Math.min.apply(null, lng), maxLng = Math.max.apply(null, lng);
    const sLat = (maxLat - minLat) || 0.01, sLng = (maxLng - minLng) || 0.01;
    COURSE.forEach((s, i) => { s.mx = 14 + (lng[i] - minLng) / sLng * 72; s.my = 14 + (maxLat - lat[i]) / sLat * 72; });
  })();
  function svgXY(s) { return { x: (s.mx / 100) * 540, y: (s.my / 100) * 470 }; }

  /* =========================================================
     TÍPUS-META a végigjátszó UI-hoz (admin.js PLAY_TYPE)
     'info' = szintetizált "nyugtázós" állomásfeladat (fallback)
     ========================================================= */
  const PLAY_TYPE = {
    kviz:   { l: 'Kvíz',           c: '#5b9de0', ic: 'a-task' },
    szoveg: { l: 'Szöveges',       c: '#e0b93a', ic: 'a-preview' },
    puzzle: { l: 'Puzzle',         c: '#8fb04f', ic: 'a-layers' },
    kod:    { l: 'Kód',            c: '#e8813a', ic: 'a-lock' },
    foto:   { l: 'Fotó',           c: '#9d7ce0', ic: 'a-camera' },
    gps:    { l: 'GPS',            c: '#4fb84f', ic: 'a-target' },
    qr:     { l: 'QR-kód',         c: '#39c0c8', ic: 'a-qr' },
    gyors:  { l: 'Gyorsasági',     c: '#e05b9d', ic: 'a-bolt' },
    info:   { l: 'Állomásfeladat', c: '#5b9de0', ic: 'a-task' }
  };

  /* `points` a SZERZETT pont, `hintCost` a felfedett tippek összege.
     A kettőt külön tartjuk, mert a szerver is így számol: a végösszeg
     max(szerzett − tippek, 0). Ha lépésenként vágnánk nullára, a kliens
     és a szerver eltérő végeredményt adna. */
  const play = { active: false, view: 'intro', path: [], points: 0, hintCost: 0, hintsUsed: [], solvedIds: [], done: 0, skipped: 0, taskIdx: 0, stationTasks: [], result: null, decOpts: [], pv: {}, startTs: 0, timer: null, finished: false, finalMs: 0, moreOpen: false };

  /* Egy feladat pontja EGYSZER jár. A mentett állapot a már megoldott
     feladatok azonosítóit is tárolja, mert a folytatás ugyanazt a feladatot
     megválaszolhatóként hozza vissza — enélkül a lap újratöltése
     korlátlanul ismételhető pontszerzés lenne. */
  function marMegoldott(task) {
    return !!task && play.solvedIds.indexOf(String(task.id)) > -1;
  }

  /* a játékosnak MUTATOTT pontszám */
  function playPoints() { return Math.max(0, (play.points || 0) - (play.hintCost || 0)); }

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
    const s = COURSE[i];
    const linked = readTasks().filter(t => t.station === s.name);
    if (linked.length) return linked.map(t => ({
      id: t.id, question: t.question, type: t.type, cfg: t.cfg || {},
      points: t.points || 0, reveal: revealFor(t.type, t.cfg),
      image: t.image || '', video: t.video || '',
      /* az adatbázisból jövő csomag megoldása CSAK hash-ként utazik */
      answer_hashes: t.answer_hashes || null, salt: t.salt || '', auto_ok: !!t.auto_ok,
      /* A tippek átvitele nem elhagyható: enélkül a tipp-felület sosem
         jelenik meg, és a levonás sem történik meg. */
      hints: t.hints || []
    }));
    // fallback #1: pálya-szerkesztő állomás saját feladat-mezőiből (taskType/question/answer)
    if (s.taskType || s.question || s.answer) {
      const tmap = { 'Fotó feladat': 'foto', 'QR-kód': 'qr', 'GPS pont': 'gps', 'Kvíz kérdés': 'szoveg' };
      const ty = tmap[s.taskType] || 'szoveg';
      const pts = parsePts(s.score) || parsePts(s.xp) || (DIFF_PTS[s.diff] || 20);
      let cfg;
      if (ty === 'szoveg') cfg = { accepted: [s.answer || ''], tolerant: true };
      else if (ty === 'foto') cfg = { instruction: s.question };
      else if (ty === 'gps') cfg = { radius: 30 };
      else cfg = { code: s.answer || '' };
      return [{ id: 'st' + i, question: s.question || (s.name + ' feladata'), type: ty, cfg: cfg, points: pts, reveal: revealFor(ty, cfg), image: '' }];
    }
    // fallback #2: régi séma rövid feladatleírásából (taskShort) egy nyugtázós állomásfeladat
    const short = String(s.taskShort || '').trim();
    if (!short) return []; // nincs feladat → csak áthaladás
    return [{ id: 'st' + i, question: short, type: 'info', cfg: {}, points: DIFF_PTS[s.diff] || 20, reveal: null, image: '' }];
  }

  /* --- idő --- */
  /* Egy óra felett órát is írunk (02:45:30) — a visszaszámláló pályánként
     több órás is lehet, „245:12" olvashatatlan volna. */
  function playFmt(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    const p = (n) => (n < 10 ? '0' : '') + n;
    return h ? (p(h) + ':' + p(m) + ':' + p(r)) : (p(m) + ':' + p(r));
  }
  function playElapsed() { return play.startTs ? Date.now() - play.startTs : 0; }
  function stopTimer() { if (play.timer) { clearInterval(play.timer); play.timer = null; } }
  function startTimer() {
    stopTimer();
    play.timer = setInterval(() => {
      if (!play.active || play.finished) return;
      const el = $('#uqPlayTime'); if (!el) return;
      /* A fejléc visszaszámlálót mutat, ha a pályához van időtartam —
         a címke is vele változik, amikor lejár. */
      const t = playIdoAdat();
      el.textContent = t.szoveg;
      el.classList.toggle('warn', !!t.lejart);
      const c = el.nextElementSibling;
      if (c && c.textContent !== t.cimke) c.textContent = t.cimke;
    }, 500);
  }

  /* --- haladás- és eredmény-mentés a fiókba (csak publikus küldetés-mód) --- */
  function saveSnapshot() {
    if (!PUBLIC || !window.UQAccount || !window.UQAccount.saveProgress) return;
    if (!window.UQAuth || !window.UQAuth.isRegistered()) return;
    window.UQAccount.saveProgress({
      questId: QUEST_ID, questTitle: TITLE, total: COURSE.length,
      pathLen: play.path.length, points: playPoints(), done: play.done, skipped: play.skipped,
      timeMs: playElapsed(),
      state: {
        path: play.path.slice(), points: play.points, hintCost: play.hintCost,
        hintsUsed: play.hintsUsed.slice(), solvedIds: play.solvedIds.slice(),
        done: play.done, skipped: play.skipped, taskIdx: play.taskIdx,
        /* abszolút kezdés + eltelt idő: az előbbi a határidőhöz, az utóbbi a
           fiókban megjelenített játékidőhöz kell */
        startTs: play.startTs, elapsedMs: playElapsed()
      }
    });
  }

  /* A lap elhagyása (fülváltás, vissza-gomb, bezárás) is mentsen: enélkül a
     legutóbbi mentés óta megoldott feladatok elvesznének. */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && play.active && !play.finished) saveSnapshot();
  });
  window.addEventListener('pagehide', () => { if (play.active && !play.finished) saveSnapshot(); });
  function finishSave() {
    if (!PUBLIC || !window.UQAccount || !window.UQAccount.finishPlay) return;
    if (!window.UQAuth || !window.UQAuth.isRegistered()) return;
    window.UQAccount.finishPlay({
      questId: QUEST_ID, questTitle: TITLE, total: COURSE.length,
      pathLen: play.path.length, points: playPoints(), done: play.done, skipped: play.skipped, timeMs: play.finalMs
    });
  }

  /* --- életciklus --- */
  function playStart() {
    let startIdx = COURSE.findIndex(s => s.type === 'kezdo' || s.type === 'Kezdő állomás');
    if (startIdx < 0) startIdx = 0;
    play.active = true; play.finished = false; play.view = 'station';
    play.path = [startIdx]; play.points = 0; play.hintCost = 0; play.hintsUsed = []; play.solvedIds = []; play.done = 0; play.skipped = 0;
    play.taskIdx = 0; play.result = null; play.decOpts = []; play.pv = {};
    play.stationTasks = stationPlayTasks(startIdx);
    play.startTs = Date.now(); play.finalMs = 0;
    startTimer();
    saveSnapshot();
    renderPlay();
  }

  /* folytatás mentett állapotból */
  function playResume(state) {
    let idx = (state.path && state.path.length) ? state.path[state.path.length - 1] : 0;
    if (!(idx >= 0 && idx < COURSE.length)) idx = 0;
    play.active = true; play.finished = false; play.view = 'station';
    /* A javított indexet vissza KELL írni az útvonalba: a playCurIdx() az
       útvonal végét olvassa, tehát a helyi javítás önmagában nem érne
       semmit — az állomás és a hozzá betöltött feladatok elcsúsznának. */
    play.path = (state.path && state.path.length) ? state.path.slice() : [idx];
    play.path[play.path.length - 1] = idx;
    play.points = state.points || 0; play.hintCost = state.hintCost || 0;
    play.hintsUsed = Array.isArray(state.hintsUsed) ? state.hintsUsed.slice() : [];
    play.solvedIds = Array.isArray(state.solvedIds) ? state.solvedIds.map(String) : [];
    play.done = state.done || 0; play.skipped = state.skipped || 0;
    play.result = null; play.decOpts = []; play.pv = {};
    play.stationTasks = stationPlayTasks(idx);
    /* A felső korlát a HOSSZ − 1: a hosszra korlátozva a taskIdx a tömbön
       kívülre mutatna, és a kirajzolás undefined feladaton hasalna el. */
    play.taskIdx = Math.max(0, Math.min(state.taskIdx || 0, play.stationTasks.length - 1));
    /* A visszaszámláló valódi határidő, ezért abszolút kezdőidőt tárolunk.
       A relatív „eltelt idő" a lap bezárásakor megállt volna, és minden
       újratöltés visszaugrott volna az utolsó mentésre. */
    play.startTs = state.startTs ? Number(state.startTs) : (Date.now() - (state.elapsedMs || 0));
    play.finalMs = 0;
    startTimer();
    renderPlay();
  }
  function playExit() {
    /* Kilépés előtt mentünk — a felső sáv vissza-nyila is ide fut be. */
    if (play.active && !play.finished) saveSnapshot();
    play.active = false; play.finished = false; play.view = 'intro'; stopTimer(); renderPlay();
  }
  function playCurIdx() { return play.path[play.path.length - 1]; }
  function playGoto(i) {
    play.path.push(i); play.taskIdx = 0; play.result = null; play.pv = {}; play.view = 'station';
    play.stationTasks = stationPlayTasks(i);
    saveSnapshot();
    renderPlay();
  }
  function playFinish() { play.finished = true; play.view = 'summary'; play.finalMs = playElapsed(); stopTimer(); finishSave(); renderPlay(); }
  function playAfterStation() {
    const i = playCurIdx();
    if (COURSE[i].isDecision) {
      const opts = [];
      if (i + 1 < COURSE.length) opts.push(i + 1);
      if (i + 2 < COURSE.length) opts.push(i + 2);
      if (opts.length >= 2) { play.decOpts = opts; play.view = 'decision'; renderPlay(); return; }
      if (opts.length === 1) return playGoto(opts[0]);
      return playFinish();
    }
    if (i + 1 < COURSE.length) return playGoto(i + 1);
    return playFinish();
  }
  function playTaskDone(credited, revealText) {
    const task = play.stationTasks[play.taskIdx];
    if (!task) return playNextTask();
    const ujra = marMegoldott(task);
    if (credited && !ujra) {
      play.points += (task.points || 0); play.done++;
      play.solvedIds.push(String(task.id));
    } else if (!credited && !ujra) {
      play.skipped++;
    }
    play.result = { ok: credited, reveal: revealText || null, task: task, ujra: ujra && credited };
    saveSnapshot();
    renderPlay();
  }
  function playNextTask() {
    play.taskIdx++; play.result = null; play.pv = {};
    /* A továbblépés is mentendő: enélkül a mentett taskIdx egy feladattal
       lemaradna, és a folytatás az utolsót újra feladná. */
    if (play.taskIdx >= play.stationTasks.length) playAfterStation();
    else { saveSnapshot(); renderPlay(); }
  }

  /* --- fő render --- */
  function renderPlay() {
    const host = $('#playRoot'); if (!host) return;
    if (!COURSE.length) { host.innerHTML = emptyCourseHTML(); return; }
    if (!play.active) {
      host.innerHTML = playIntroHTML();
      const b = $('#uqPlayStart'); // indítás / újrakezdés (tiszta lappal)
      if (b) b.addEventListener('click', () => { if (PUBLIC && window.UQAccount && window.UQAccount.clearProgress) window.UQAccount.clearProgress(QUEST_ID); playStart(); });
      const rb = $('#uqPlayResume'); // folytatás mentett állapotból
      if (rb) rb.addEventListener('click', () => { const st = resumeState(); if (st) playResume(st); else playStart(); });
      return;
    }
    /* Egyoszlopos, telefonra szabott elrendezés minden képernyőn. Az
       útvonal és a lépéslista lecsukható blokkba került: elérhető, de nem
       vonja el a figyelmet a helyszínen megoldandó feladatról. */
    host.innerHTML = '<div class="uq-play">' +
      playHudHTML() +
      '<div class="uq-play-stage" id="uqPlayStage"></div>' +
      /* A nyitottságot állapotban tartjuk: a renderPlay() minden válasz után
         kicseréli a teljes DOM-ot, így a natív <details> különben minden
         lépésnél becsukódna a játékos alatt. */
      '<details class="uq-play-more" id="uqPlayMore"' + (play.moreOpen ? ' open' : '') + '>' +
        '<summary><svg class="ico ico-sm" aria-hidden="true"><use href="#a-map"/></svg>Útvonal és haladás' +
          '<svg class="ico ico-xs uq-play-more-c" aria-hidden="true"><use href="#a-down"/></svg></summary>' +
        '<div class="uq-play-more-in">' + playMapHTML() + playStepsHTML() + '</div>' +
      '</details>' +
      '</div>';
    const ex = $('#uqPlayExit'); if (ex) ex.addEventListener('click', playExit);

    /* a fejléc ☰ gombja és a blokk saját fejléce ugyanazt az állapotot írja */
    const mb = document.getElementById('playMenu'), more = $('#uqPlayMore');
    const jeloles = () => { if (mb) mb.setAttribute('aria-expanded', String(play.moreOpen)); };
    if (more) {
      more.addEventListener('toggle', () => { play.moreOpen = more.open; jeloles(); });
    }
    jeloles();
    if (mb && !mb._kotve) {
      mb._kotve = true;
      mb.addEventListener('click', () => {
        const m = document.getElementById('uqPlayMore');
        if (!m) return;
        m.open = !m.open;                       // a toggle-esemény frissíti az állapotot
        if (m.open) m.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
    const stage = $('#uqPlayStage');
    if (play.view === 'summary') { stage.innerHTML = playSummaryHTML(); wirePlaySummary(); }
    else if (play.view === 'decision') { stage.innerHTML = playDecisionHTML(); wirePlayDecision(); }
    else { stage.innerHTML = playStationHTML(); wirePlayStation(); }
  }

  function resumeState() {
    if (!PUBLIC || !window.UQAccount || !window.UQAccount.activePlay) return null;
    const p = window.UQAccount.activePlay(QUEST_ID);
    return (p && p.state && p.state.path && p.state.path.length) ? p.state : null;
  }

  function emptyCourseHTML() {
    if (PUBLIC) {
      return '<div class="uq-play-intro">' +
        '<span class="uq-play-intro-ic"><svg class="ico" aria-hidden="true"><use href="#a-map"/></svg></span>' +
        '<h2>Ez a kaland épp készül</h2>' +
        '<p>A(z) „<b>' + esc(TITLE) + '</b>" pályája hamarosan elérhető lesz. Nézz körül a többi küldetés között!</p>' +
        '<a class="adm-btn adm-btn-lime uq-play-start" href="index.html#kuldetesek"><svg class="ico ico-sm" aria-hidden="true"><use href="#a-arrow-left"/></svg>Vissza a küldetésekhez</a>' +
        '</div>';
    }
    return '<div class="uq-play-intro">' +
      '<span class="uq-play-intro-ic"><svg class="ico" aria-hidden="true"><use href="#a-map"/></svg></span>' +
      '<h2>Ehhez a játékhoz még nincs pálya</h2>' +
      '<p>Hozz létre állomásokat az <a href="allomasok.html">Állomások</a> oldalon a(z) „<b>' + esc(route) + '</b>" útvonalhoz (és feladatokat a <a href="feladatok.html">Feladatok</a> oldalon), majd térj vissza ide a végigjátszáshoz.</p>' +
      '<small class="uq-play-note">A pálya = azok az állomások, amelyek útvonala megegyezik a játék nevével.</small>' +
      '</div>';
  }

  function playIntroHTML() {
    const total = COURSE.length;
    let tasks = 0; for (let i = 0; i < total; i++) tasks += stationPlayTasks(i).length;
    const est = Math.max(1, Math.round(total * 2.5));
    const rs = resumeState();
    let buttons;
    if (PUBLIC && rs) {
      buttons =
        '<button class="adm-btn adm-btn-lime uq-play-start" type="button" id="uqPlayResume"><svg class="ico ico-sm" aria-hidden="true"><use href="#a-play"/></svg>Folytatás — ' + rs.path.length + '/' + total + ' állomás</button>' +
        '<button class="uq-play-restartlink" type="button" id="uqPlayStart">Vagy kezdd elölről</button>';
    } else {
      buttons = '<button class="adm-btn adm-btn-lime uq-play-start" type="button" id="uqPlayStart"><svg class="ico ico-sm" aria-hidden="true"><use href="#a-play"/></svg>' + (PUBLIC ? 'Kezdés' : 'Végigjátszás indítása') + '</button>';
    }
    const lead = PUBLIC
      ? 'Játszd végig a(z) <b>' + esc(TITLE) + '</b> kalandot: állomásról állomásra, valódi feladatokkal és döntési pontokkal. A haladásod automatikusan mentődik, később folytathatod.'
      : 'Játszd végig a(z) <b>' + esc(TITLE) + '</b> pályát úgy, ahogy a játékos látná: állomásról állomásra, valódi feladatokkal és döntési pontokkal.';
    return '<div class="uq-play-intro">' +
      '<span class="uq-play-intro-ic"><svg class="ico" aria-hidden="true"><use href="#a-play"/></svg></span>' +
      '<h2>' + (PUBLIC ? esc(TITLE) : 'Végigjátszás — ' + esc(TITLE)) + '</h2>' +
      '<p>' + lead + '</p>' +
      '<div class="uq-play-intro-meta"><span><b>' + total + '</b> állomás</span><span><b>' + tasks + '</b> feladat</span><span><b>~' + est + '</b> perc</span></div>' +
      buttons +
      '<small class="uq-play-note">A feladatok átugorhatók • a döntési pontoknál választhatsz útvonalat</small>' +
      '</div>';
  }

  function playHudHTML() {
    const total = COURSE.length;
    const pct = Math.min(100, Math.round(play.path.length / total * 100));
    const ossz = playTasksTotal();
    const jelen = Math.min(play.done + play.skipped + 1, ossz || 1);
    const fpct = ossz ? Math.round((play.done + play.skipped) / ossz * 100) : pct;
    const t = playIdoAdat();

    const cella = (ikon, ertek, cimke, extra) =>
      '<div class="uq-hud-cell">' +
        '<span class="uq-hud-ic"><svg class="ico" aria-hidden="true"><use href="#' + ikon + '"/></svg></span>' +
        '<span class="uq-hud-txt">' +
          '<b' + (extra && extra.cls ? ' class="' + extra.cls + '"' : '') +
            (extra && extra.id ? ' id="' + extra.id + '"' : '') + '>' + ertek + '</b>' +
          '<span>' + cimke + '</span>' +
        '</span>' +
      '</div>';

    return '<div class="uq-hud">' +
      '<div class="uq-hud-cell uq-hud-first">' +
        '<span class="uq-hud-ic"><svg class="ico" aria-hidden="true"><use href="#a-play"/></svg></span>' +
        '<span class="uq-hud-txt">' +
          '<b>' + jelen + ' <small>/ ' + (ossz || 1) + '</small></b>' +
          '<span>Feladat</span>' +
          '<span class="uq-hud-bar"><i style="width:' + fpct + '%"></i></span>' +
        '</span>' +
      '</div>' +
      cella('a-clock', t.szoveg, t.cimke, { id: 'uqPlayTime', cls: t.lejart ? 'warn' : '' }) +
      cella('a-star', playPoints(), 'Pontod', { cls: 'lime' }) +
      '</div>';
  }

  /* Az összes feladat a pályán — a fejléc „N / M feladat" számlálójához. */
  /* Szándékosan NEM gyorstárazunk: az első HUD-rajzoláskor a pálya még
     érkezhet az adatbázisból, és egy korán befagyasztott szám a játék
     végéig hibás nevezőt mutatna. Az újraszámolás pár tömbművelet. */
  function playTasksTotal() {
    let n = 0;
    COURSE.forEach((s, i) => { n += (stationPlayTasks(i) || []).length; });
    return n;
  }

  /* Visszaszámláló: a pálya időtartamának FELSŐ határából indul (a „3–4 óra"
     esetén 4 órából), hogy ne érezze szűkösnek a csapat. Ha a pályához nincs
     megadva időtartam, a régi, felfelé számláló marad. */
  /* A pálya időkerete. Csak a POZITÍV eredményt jegyezzük meg: a katalógus
     külön kérésben töltődik, és az első HUD-rajzoláskor még üres lehet —
     egy korai 0-t elmentve a visszaszámláló véglegesen felfelé számlálóvá
     válna. Az órán kívül a percet és a vegyes („2 ó 30 p") alakot is értjük.
     Tartománynál a FELSŐ határ a keret, hogy ne büntessük a lassabb csapatot. */
  function playLimitMs() {
    if (playLimitMs._c) return playLimitMs._c;
    const q = (window.QUESTS && QUEST_ID && window.QUESTS[QUEST_ID]) || {};
    const txt = String(q.durationText || q.duration || q.dur || '').replace(/,/g, '.');
    let ms = 0;

    const ora = txt.match(/(\d+(?:\.\d+)?)(?:\s*[–—-]\s*(\d+(?:\.\d+)?))?\s*(?:óra|ó)\b/i);
    if (ora) ms += Math.round(parseFloat(ora[2] || ora[1]) * 3600000);

    const perc = txt.match(/(\d+(?:\.\d+)?)(?:\s*[–—-]\s*(\d+(?:\.\d+)?))?\s*(?:perc|p)\b/i);
    if (perc) ms += Math.round(parseFloat(perc[2] || perc[1]) * 60000);

    if (ms) playLimitMs._c = ms;
    return ms;
  }

  function playIdoAdat() {
    const eltelt = play.finished ? play.finalMs : playElapsed();
    const limit = playLimitMs();
    /* A feliratok szándékosan rövidek: a sáv harmadában egy telefonon
       a „Hátralévő idő" elipszissel csonkolódna. */
    if (!limit) return { szoveg: playFmt(eltelt), cimke: 'Eltelt', lejart: false };
    const hatra = limit - eltelt;
    /* Lejárat után nem zárjuk ki a csapatot — csak jelezzük. Terepen a
       kizárás értelmetlen büntetés lenne. */
    if (hatra <= 0) return { szoveg: playFmt(-hatra), cimke: 'Túllépve', lejart: true };
    return { szoveg: playFmt(hatra), cimke: 'Hátralévő', lejart: false };
  }

  function playStationHTML() {
    const i = playCurIdx(); const s = COURSE[i];
    const total = play.stationTasks.length;
    const tno = Math.min(play.taskIdx + 1, total);
    /* Hero: az állomás képe (vagy gradiens), rajta a sorszám-jelvény és az
       állomás neve — ez mondja meg a csapatnak, hova kell menniük. */
    let h = '<div class="uq-pl-hero" style="background:' + (s.img || HERO_GRADS[i % HERO_GRADS.length]) + '">' +
      '<span class="uq-pl-hero-fade" aria-hidden="true"></span>' +
      '<span class="uq-pl-hero-in">' +
        '<span class="uq-pl-badge">' +
          '<svg class="ico ico-xs" aria-hidden="true"><use href="#' + (s.isDecision ? 'a-diamond' : 'a-pin') + '"/></svg>' +
          play.path.length + '. állomás' +
        '</span>' +
        '<span class="uq-pl-hero-cim">' + esc(s.name) + '</span>' +
      '</span>' +
    '</div>';

    h += '<div class="uq-pl-card">';
    if (total) {
      const task = play.stationTasks[play.taskIdx];
      const ty = PLAY_TYPE[task.type] || { l: task.type, c: '#8b957f', ic: 'a-task' };

      h += '<div class="uq-pl-taskhead">' +
        '<span class="uq-pl-tico" style="color:' + ty.c + ';background:' + ty.c + '1f;border-color:' + ty.c + '55">' +
          '<svg class="ico ico-sm" aria-hidden="true"><use href="#' + ty.ic + '"/></svg></span>' +
        '<span class="uq-pl-tmeta">' +
          '<span class="uq-pl-tlabel">Feladat' + (total > 1 ? ' · ' + tno + '/' + total : '') + '</span>' +
          '<b>' + esc(ty.l) + '</b>' +
        '</span>' +
      '</div>';

      if (s.desc) h += '<p class="uq-pl-desc">' + esc(s.desc) + '</p>';
      if (s.loc) h += '<p class="uq-pl-loc"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-pin"/></svg>Helyszín: ' + esc(s.loc) + '</p>';

      h += '<div class="uq-pl-q"><span class="uq-pl-qlabel">Kérdés</span><b>' + esc(task.question) + '</b></div>';

      if (task.image) h += '<div class="uq-pl-taskimg"><img src="' + esc(task.image) + '" alt=""></div>';
      if (task.video) h += videoEmbedHTML(task.video, 'uq-pl-taskvid');
      h += '<div class="uq-pl-answer" id="uqPlayAnswer"></div>';
      h += '<div class="uq-pl-actions" id="uqPlayActions"></div>';
      h += '</div>';

      /* Jutalom-blokk: mit ér a feladat, és mennyi tipp jár hozzá. */
      /* Jutalom-blokk. Ha már fizettetek tippért, a levonás IDE is kiül —
         különben a felület bruttó pontot ígérne, a fejléc meg nettót mutat. */
      const tippDb = (task.hints || []).length;
      const koltseg = tippKoltseg(task);
      h += '<div class="uq-pl-reward" id="uqPlayReward">' +
        '<div class="uq-pl-rw"><span class="uq-pl-rw-ic"><svg class="ico ico-sm" aria-hidden="true"><use href="#a-star"/></svg></span>' +
          '<span class="uq-pl-rw-txt"><b>+' + (task.points || 0) + '</b><span>Pont a megoldásért</span></span></div>' +
        (koltseg
          ? '<div class="uq-pl-rw"><span class="uq-pl-rw-ic minus"><svg class="ico ico-sm" aria-hidden="true"><use href="#a-bolt"/></svg></span>' +
            '<span class="uq-pl-rw-txt"><b class="minus">−' + koltseg + '</b><span>Tippekre költve</span></span></div>'
          : tippDb
          ? '<div class="uq-pl-rw"><span class="uq-pl-rw-ic"><svg class="ico ico-sm" aria-hidden="true"><use href="#a-bolt"/></svg></span>' +
            '<span class="uq-pl-rw-txt"><b>' + tippDb + ' tipp</b><span>Ha elakadtok</span></span></div>'
          : '') +
      '</div>';
      h += '<p class="uq-pl-onsite"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-lock"/></svg>A válasz beküldéséhez a helyszínen kell lennetek.</p>';
    } else {
      if (s.desc) h += '<p class="uq-pl-desc">' + esc(s.desc) + '</p>';
      h += '<div class="uq-pl-notask">Ehhez az állomáshoz nincs feladat — csak áthaladtok rajta.</div>';
      h += '<div class="uq-pl-actions"><button class="uq-pl-do" type="button" id="uqPlayCont"><svg class="ico ico-sm" aria-hidden="true"><use href="#a-check"/></svg>Állomás kész — tovább</button></div>';
      h += '</div>';
    }
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
  /* Az adatbázisból letöltött csomag megoldása CSAK sózott hash — ezért a
     kiértékelés aszinkron. A beégetett (régi) adatnál marad a korábbi,
     szinkron logika, amit a hívó `regiOk` néven ad át. */
  function ertekel(task, valasz, regiOk) {
    if (window.UQCheck && UQCheck.tudEllenorizni(task)) return UQCheck.helyes(task, valasz);
    if (task && task.auto_ok) return Promise.resolve(true);
    return Promise.resolve(!!regiOk);
  }

  /* Hibás válasz után a helyes opciót kiemeljük. Régi adatnál a `correct`
     jelölő mondja meg; a csomagban az nincs benne, ott hash-egyezéssel
     keressük meg — így a játékos akkor is látja a jó választ. */
  function jeloldHelyesOpciot(box, c, task) {
    const ci = (c.options || []).findIndex(o => o && o.correct);
    if (ci >= 0) {
      const cb = box.querySelector('.uq-pl-opt[data-i="' + ci + '"]');
      if (cb) cb.classList.add('ok');
      return;
    }
    if (!window.UQCheck || !UQCheck.tudEllenorizni(task)) return;
    (c.options || []).forEach((o, i) => {
      UQCheck.helyes(task, o && o.text).then(jo => {
        if (!jo) return;
        const cb = box.querySelector('.uq-pl-opt[data-i="' + i + '"]');
        if (cb) cb.classList.add('ok');
      });
    });
  }

  function playCheckText(val, c) {
    c = c || {};
    if (c.numeric) { const a = parseFloat(String(val).replace(',', '.')); return (c.accepted || []).some(x => parseFloat(String(x).replace(',', '.')) === a); }
    const v = c.tolerant ? playNorm(val) : String(val).trim();
    return (c.accepted || []).some(x => { const xx = c.tolerant ? playNorm(x) : String(x).trim(); return c.keyword ? (xx && v.includes(xx)) : v === xx; });
  }
  function drawCodePad(box, c, done, task) {
    /* A csomagban nincs nyers kód, csak a hossza (codeLen) — enélkül nem
       tudnánk hány mezőt rajzolni. */
    const len = (c.code || '').length || Number(c.codeLen) || 4;
    const disp = () => '<div class="uq-pl-code">' + Array.from({ length: len }).map((_, i) => '<span>' + (play.pv.code[i] || '') + '</span>').join('') + '</div>';
    box.innerHTML = disp() + '<div class="uq-pl-pad">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => '<button type="button" data-k="' + n + '">' + n + '</button>').join('') + '<button type="button" data-k="del">⌫</button><button type="button" data-k="0">0</button><button type="button" data-k="ok" class="ok">OK</button></div>';
    box.querySelectorAll('.uq-pl-pad button').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.k;
      if (k === 'del') play.pv.code = play.pv.code.slice(0, -1);
      else if (k === 'ok') {
        return ertekel(task, play.pv.code, String(play.pv.code) === String(c.code))
          .then(ok => ok ? done(true) : playWrong());
      }
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
  /* ---------- TIPP ----------
     A tipp valódi döntés: pontba kerül. A levonás tippenként EGYSZER
     történik (a szerver is így számol), tehát a már felfedett tipp
     újranyitása ingyenes. */

  /* A kulcs a tipp SAJÁT azonosítója, ha a csomag adja — a szerver
     (rebuild_session_state) is hint_id szerint vonja le a pontot, tehát
     tömbindexszel a kliens és a szerver eltérő végösszeget adna. */
  function tippKulcs(task, idx) {
    const h = (task.hints || [])[idx];
    return (h && h.id) ? String(h.id) : String(task.id) + ':' + idx;
  }

  /* Amennyit ezen a feladaton eddig tippekre költöttetek. */
  function tippKoltseg(task) {
    return (task.hints || []).reduce((sum, h, i) =>
      sum + (play.hintsUsed.indexOf(tippKulcs(task, i)) > -1 ? (Number(h.cost) || 0) : 0), 0);
  }

  function kovetkezoTipp(task) {
    const hints = task.hints || [];
    for (let i = 0; i < hints.length; i++) {
      if (play.hintsUsed.indexOf(tippKulcs(task, i)) < 0) return i;
    }
    return -1;
  }

  function tippSorHTML(task) {
    const hints = task.hints || [];
    if (!hints.length) return '';
    const felfedett = hints
      .map((h, i) => ({ h, i }))
      .filter(x => play.hintsUsed.indexOf(tippKulcs(task, x.i)) > -1);
    const kov = kovetkezoTipp(task);

    let h = '<div class="uq-pl-hints" id="uqPlayHints">';
    felfedett.forEach(x => {
      h += '<p class="uq-pl-hint"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-bolt"/></svg>' + esc(x.h.text) + '</p>';
    });
    if (kov > -1) {
      const ar = Number(hints[kov].cost) || 0;
      h += '<button class="uq-pl-hint-btn" type="button" id="uqPlayHint">' +
        '<span><svg class="ico ico-sm" aria-hidden="true"><use href="#a-bolt"/></svg>Tipp kérése</span>' +
        (ar ? '<span class="uq-pl-hint-cost">−' + ar + ' pont</span>' : '<span class="uq-pl-hint-cost free">ingyenes</span>') +
        '</button>';
    } else if (felfedett.length) {
      h += '<p class="uq-pl-hint-none">Nincs több tipp ehhez a feladathoz.</p>';
    }
    return h + '</div>';
  }

  function wireTipp(task) {
    const b = $('#uqPlayHint');
    if (!b) return;
    b.addEventListener('click', () => {
      const i = kovetkezoTipp(task);
      if (i < 0) return;
      const ar = Number((task.hints[i] || {}).cost) || 0;
      if (ar && !window.confirm('Tipp kérése ' + ar + ' pontért.\n\nEz levonódik a pontszámodból, akkor is, ha a végén megoldjátok.\n\nKéred?')) return;
      play.hintsUsed.push(tippKulcs(task, i));
      play.hintCost += ar;
      const hud = $('.uq-hud-cell:last-child b'); if (hud) hud.textContent = playPoints();
      const box = $('#uqPlayHints');
      if (box) { box.outerHTML = tippSorHTML(task); wireTipp(task); }
      /* a jutalom-blokk levonás-sora is frissül, hogy a két szám egyezzen */
      const rw = $('#uqPlayReward');
      if (rw && ar) {
        const k = tippKoltseg(task);
        const masodik = rw.querySelector('.uq-pl-rw + .uq-pl-rw');
        const uj = '<span class="uq-pl-rw-ic minus"><svg class="ico ico-sm" aria-hidden="true"><use href="#a-bolt"/></svg></span>' +
          '<span class="uq-pl-rw-txt"><b class="minus">−' + k + '</b><span>Tippekre költve</span></span>';
        if (masodik) masodik.innerHTML = uj;
        else rw.insertAdjacentHTML('beforeend', '<div class="uq-pl-rw">' + uj + '</div>');
      }
      saveSnapshot();
    });
  }

  function renderPlayAnswer() {
    const task = play.stationTasks[play.taskIdx];
    const c = task.cfg || {}; const box = $('#uqPlayAnswer'); const act = $('#uqPlayActions');
    play.pv = { code: '', order: null };
    act.innerHTML = tippSorHTML(task) +
      '<button class="uq-pl-skip" type="button" id="uqPlaySkip"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-collapse"/></svg>Feladat átugrása</button>';
    $('#uqPlaySkip').addEventListener('click', () => playTaskDone(false, task.reveal));
    wireTipp(task);
    const done = (ok) => playTaskDone(ok, ok ? null : task.reveal);

    if (task.type === 'kviz') {
      let opts = (c.options || []).map((o, i) => ({ o: o, i: i }));
      if (c.shuffle) opts = opts.sort(() => Math.random() - 0.5);
      box.innerHTML = '<div class="uq-pl-opts">' + opts.map(x => '<button class="uq-pl-opt" type="button" data-i="' + x.i + '">' + esc(x.o.text || '—') + '</button>').join('') + '</div>';
      box.querySelectorAll('.uq-pl-opt').forEach(b => b.addEventListener('click', () => {
        const opt = c.options[+b.dataset.i] || {};
        box.querySelectorAll('.uq-pl-opt').forEach(x => { x.disabled = true; });
        ertekel(task, opt.text, !!opt.correct).then(ok => {
          b.classList.add(ok ? 'ok' : 'bad');
          if (!ok) jeloldHelyesOpciot(box, c, task);
          setTimeout(() => done(!!ok), 420);
        });
      }));
    } else if (task.type === 'szoveg') {
      box.innerHTML = '<div class="uq-pl-input"><input type="text" id="uqPlayIn" placeholder="Írd be a választ…" autocomplete="off"><button class="uq-pl-go" type="button" id="uqPlayGo">Ellenőrzés</button></div>';
      const go = () => {
        const v = $('#uqPlayIn').value;
        ertekel(task, v, playCheckText(v, c)).then(ok => ok ? done(true) : playWrong());
      };
      $('#uqPlayGo').addEventListener('click', go);
      $('#uqPlayIn').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    } else if (task.type === 'kod') {
      if (c.codeType === 'word') {
        box.innerHTML = '<div class="uq-pl-input"><input type="text" id="uqPlayIn" placeholder="Írd be a kódot…" autocomplete="off"><button class="uq-pl-go" type="button" id="uqPlayGo">Feltör</button></div>';
        $('#uqPlayGo').addEventListener('click', () => {
          const v = $('#uqPlayIn').value;
          ertekel(task, v, playNorm(v) === playNorm(c.code)).then(ok => ok ? done(true) : playWrong());
        });
      } else { drawCodePad(box, c, done, task); }
    } else if (task.type === 'puzzle' && c.subtype !== 'match') {
      drawPuzzle(box, c, done);
    } else if (task.type === 'puzzle') {
      box.innerHTML = '<div class="uq-pl-match">' + (c.pairs || []).map((p, i) => '<div class="uq-pl-mrow"><span>' + esc(p.left) + '</span><select data-i="' + i + '"><option value="">…</option>' + (c.pairs || []).map((q, j) => '<option value="' + j + '">' + esc(q.right) + '</option>').join('') + '</select></div>').join('') + '</div><button class="uq-pl-go uq-pl-wide" type="button" id="uqPlayGo">Ellenőrzés</button>';
      $('#uqPlayGo').addEventListener('click', () => { const ok = Array.prototype.every.call(box.querySelectorAll('select'), s => String(s.value) === String(s.dataset.i)); if (ok) done(true); else playWrong(); });
    } else if (task.type === 'info') {
      // szintetizált nyugtázós állomásfeladat (nincs "megoldás", nincs átugrás)
      act.innerHTML = '';
      box.innerHTML = '<div class="uq-pl-action"><span class="big"><svg class="ico" aria-hidden="true"><use href="#a-task"/></svg></span><p>Olvasd el az állomás feladatát a helyszínen, majd jelöld késznek a folytatáshoz.</p><button class="uq-pl-do" type="button" id="uqPlayGo">Megvan, kész</button></div>';
      $('#uqPlayGo').addEventListener('click', () => done(true));
    } else {
      const a = { foto: { ic: 'a-camera', lbl: 'Fotó feltöltése', txt: (c.instruction || 'Készíts képet a helyszínen') }, gps: { ic: 'a-target', lbl: 'Helyszín igazolása', txt: 'Menj a megjelölt pontra (' + (c.radius || 30) + ' m)' }, qr: { ic: 'a-qr', lbl: 'QR beolvasása', txt: 'Keresd meg és olvasd be a kódot' }, gyors: { ic: 'a-bolt', lbl: 'Indítás', txt: (c.game === 'tap' ? 'Koppints ' + (c.target || 15) + '-öt ' + (c.time || 5) + ' mp alatt' : 'Mini-játék') } }[task.type] || { ic: 'a-target', lbl: 'Teljesítés', txt: 'Teljesítsd a feladatot' };
      box.innerHTML = '<div class="uq-pl-action"><span class="big"><svg class="ico" aria-hidden="true"><use href="#' + a.ic + '"/></svg></span><p>' + esc(a.txt) + '</p><button class="uq-pl-do" type="button" id="uqPlayGo">' + a.lbl + '</button></div>';
      $('#uqPlayGo').addEventListener('click', () => done(true));
    }
  }
  function renderPlayResult() {
    const r = play.result; const box = $('#uqPlayAnswer'); const act = $('#uqPlayActions');
    const last = play.taskIdx >= play.stationTasks.length - 1;
    /* Ha ezt a feladatot már megoldottátok (folytatás után újra elétek
       került), a válasz helyes marad, de pont nem jár érte másodszor. */
    if (r.ok && r.ujra) box.innerHTML = '<div class="uq-pl-res good"><svg class="ico" aria-hidden="true"><use href="#a-check-c"/></svg><div><b>Helyes!</b><small>Ezt a feladatot már megoldottátok — a pont egyszer jár.</small></div></div>';
    else if (r.ok) box.innerHTML = '<div class="uq-pl-res good"><svg class="ico" aria-hidden="true"><use href="#a-check-c"/></svg><div><b>Helyes!</b><small>+' + (r.task.points || 0) + ' pont' + (tippKoltseg(r.task) ? ' · −' + tippKoltseg(r.task) + ' tippért' : '') + '</small></div></div>';
    else box.innerHTML = '<div class="uq-pl-res skip"><svg class="ico" aria-hidden="true"><use href="#a-collapse"/></svg><div><b>Átugorva</b>' + (r.reveal ? '<small>Megoldás: ' + esc(r.reveal) + '</small>' : '') + '</div></div>';
    act.innerHTML = '<button class="adm-btn adm-btn-lime" type="button" id="uqPlayNext"><svg class="ico ico-sm" aria-hidden="true"><use href="#a-check"/></svg>' + (last ? 'Állomás kész — tovább' : 'Következő feladat') + '</button>';
    $('#uqPlayNext').addEventListener('click', playNextTask);
  }

  function playDecisionHTML() {
    const i = playCurIdx(); const s = COURSE[i];
    let h = '<div class="uq-pl-card uq-pl-decision"><div class="uq-pl-dec-head"><span class="uq-pl-dec-ic"><svg class="ico" aria-hidden="true"><use href="#a-diamond"/></svg></span><div><h3>' + esc(s.name) + '</h3><p>' + esc(s.desc || 'Válaszd ki a következő útvonalat!') + '</p></div></div>';
    h += '<div class="uq-pl-routes">' + play.decOpts.map((ti, k) => {
      const t = COURSE[ti];
      return '<button class="uq-pl-route" type="button" data-goto="' + ti + '"><span class="uq-pl-route-k">' + (k === 0 ? 'A' : 'B') + '</span><span class="uq-pl-route-body"><b>' + esc(t.name) + '</b><small>' + esc(typeLabel(t)) + (k === 1 ? ' · rövidebb út' : ' · a következő állomás') + '</small></span><svg class="ico ico-sm uq-pl-route-go" aria-hidden="true"><use href="#a-route"/></svg></button>';
    }).join('') + '</div></div>';
    return h;
  }
  function wirePlayDecision() {
    $$('#uqPlayStage [data-goto]').forEach(b => b.addEventListener('click', () => {
      const ti = +b.dataset.goto;
      toast('Útvonal választva', { type: 'info', sub: COURSE[ti].name });
      playGoto(ti);
    }));
  }

  function playSummaryHTML() {
    const total = play.done + play.skipped;
    const rate = total ? Math.round(play.done / total * 100) : 0;
    const actions = PUBLIC
      ? '<a class="adm-btn" href="fiokom.html#jatekok"><svg class="ico ico-sm" aria-hidden="true"><use href="#a-users"/></svg>Játékaim</a>' +
        '<button class="adm-btn adm-btn-lime" type="button" id="uqPlayRestart"><svg class="ico ico-sm" aria-hidden="true"><use href="#a-refresh"/></svg>Újra</button>'
      : '<button class="adm-btn" type="button" id="uqPlayExitSum"><svg class="ico ico-sm" aria-hidden="true"><use href="#a-x"/></svg>Bezárás</button>' +
        '<button class="adm-btn adm-btn-lime" type="button" id="uqPlayRestart"><svg class="ico ico-sm" aria-hidden="true"><use href="#a-play"/></svg>Újra</button>';
    /* A pálya borítóképe fejlécként — ez az egyetlen hely a játékban, ahol
       a kártya-kép megjelenik, hogy az élmény ugyanoda érkezzen vissza,
       ahonnan a játékos elindult. Kép nélkül a fejléc egyszerűen kimarad. */
    const hero = COVER
      ? '<div class="uq-pl-sum-hero">' +
          /* nincs lazy: az összegző megjelenésekor a kép AZONNAL látszik,
             a késleltetés csak beugrást okozna */
          '<img src="' + esc(COVER) + '" alt="">' +
          '<span class="uq-pl-sum-fade" aria-hidden="true"></span>' +
          '<span class="uq-pl-sum-fej">' +
            '<span class="uq-pl-sum-pill">' +
              '<svg class="ico ico-xs" aria-hidden="true"><use href="#a-flag"/></svg>' +
              (PUBLIC ? 'Teljesítve' : 'Teszt kész') +
            '</span>' +
            '<span class="uq-pl-sum-cim">' + esc(TITLE) + '</span>' +
          '</span>' +
        '</div>'
      : '';

    const stat = (ikon, cimke, ertek, lime) =>
      '<div class="uq-pl-sum-stat">' +
        '<span class="uq-pl-sum-sic"><svg class="ico" aria-hidden="true"><use href="#' + ikon + '"/></svg></span>' +
        '<span class="uq-pl-sum-txt">' +
          '<b' + (lime ? ' class="lime"' : '') + '>' + ertek + '</b>' +
          '<span>' + cimke + '</span>' +
        '</span>' +
      '</div>';

    return '<div class="uq-pl-summary' + (COVER ? ' has-cover' : '') + '">' +
      hero +
      '<div class="uq-pl-sum-body">' +
        /* borítókép mellett a fejléc-jelvény tölti be a szerepét, az
           átfedő kör-ikon csak ütközne a címmel */
        (COVER ? '' : '<span class="uq-pl-sum-ic"><svg class="ico" aria-hidden="true"><use href="#a-flag"/></svg></span>') +
        '<h2>' + (PUBLIC ? 'Kaland teljesítve! 🎉' : 'Pálya teljesítve!') + '</h2>' +
        '<p>Végigjátszottad a(z) <b>' + esc(TITLE) + '</b> ' + (PUBLIC ? 'kalandot' : 'tesztjét') + '.</p>' +
        '<div class="uq-pl-sum-grid">' +
          stat('a-star', 'Összpont', playPoints(), true) +
          stat('a-clock', 'Idő', playFmt(play.finalMs)) +
          stat('a-pin', 'Bejárt állomás', play.path.length) +
          stat('a-check-c', 'Megoldott feladat', play.done + '<small>/' + total + '</small>') +
        '</div>' +
        '<div class="uq-pl-sum-bar"><span>Teljesítési arány</span><div class="uq-pl-sum-track"><div style="width:' + rate + '%"></div></div><b>' + rate + '%</b></div>' +
        (PUBLIC ? '<p class="uq-play-note">Az eredményed elmentve a fiókodba. 🏅</p>' : '') +
        '<div class="uq-pl-sum-actions">' + actions + '</div>' +
      '</div>' +
      '</div>';
  }
  function wirePlaySummary() {
    const r = $('#uqPlayRestart'); if (r) r.addEventListener('click', () => { if (PUBLIC && window.UQAccount && window.UQAccount.clearProgress) window.UQAccount.clearProgress(QUEST_ID); playStart(); });
    const x = $('#uqPlayExitSum'); if (x) x.addEventListener('click', playExit);
  }

  /* --- mini-térkép + lépéslista (jobb oszlop) --- */
  function playMapHTML() {
    const cur = playCurIdx();
    let base = '';
    COURSE.forEach((s, i) => {
      const tg = s.isDecision ? [i + 1, i + 2] : [i + 1];
      tg.forEach(ti => { if (ti < COURSE.length) { const a = svgXY(s), b = svgXY(COURSE[ti]); base += '<line x1="' + a.x.toFixed(1) + '" y1="' + a.y.toFixed(1) + '" x2="' + b.x.toFixed(1) + '" y2="' + b.y.toFixed(1) + '" class="uq-pm-base"/>'; } });
    });
    let done = '';
    for (let k = 1; k < play.path.length; k++) { const a = svgXY(COURSE[play.path[k - 1]]), b = svgXY(COURSE[play.path[k]]); done += '<line x1="' + a.x.toFixed(1) + '" y1="' + a.y.toFixed(1) + '" x2="' + b.x.toFixed(1) + '" y2="' + b.y.toFixed(1) + '" class="uq-pm-done"/>'; }
    const nodes = COURSE.map((s, i) => {
      const p = svgXY(s); const isCur = i === cur; const inPath = play.path.indexOf(i) >= 0;
      const cls = isCur ? 'cur' : (inPath ? 'done' : 'future');
      return '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (isCur ? 9 : 6) + '" class="uq-pm-node ' + cls + '"/>';
    }).join('');
    return '<div class="uq-play-map"><div class="uq-play-map-t"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-map"/></svg>Útvonal</div>' +
      '<svg viewBox="0 0 540 470" preserveAspectRatio="xMidYMid meet" class="uq-pm-svg" aria-hidden="true">' + base + done + nodes + '</svg></div>';
  }
  function playStepsHTML() {
    const items = play.path.map((idx, k) => {
      const s = COURSE[idx]; const isCur = k === play.path.length - 1 && !play.finished;
      return '<li class="uq-play-step' + (isCur ? ' is-cur' : ' is-done') + '"><span class="uq-step-n">' + (k + 1) + '</span><span class="uq-step-b"><b>' + esc(s.name) + '</b><small>' + esc(typeLabel(s)) + '</small></span>' + (isCur ? '<span class="uq-step-here">itt</span>' : '<svg class="ico ico-xs uq-step-ck" aria-hidden="true"><use href="#a-check"/></svg>') + '</li>';
    }).join('');
    return '<ol class="uq-play-steps">' + items + '</ol>';
  }

  /* --- indítás: intro (a játék nevével), Indítás gombra végigjátszás --- */
  renderPlay();
})();
