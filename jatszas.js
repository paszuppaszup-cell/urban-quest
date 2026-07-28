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
      /* az állomás UUID-ja (csak adatbázisból jövő pályánál van) — a
         szerveroldali menet-naplóhoz kell */
      id: s.id || null,
      name: s.name || 'Állomás',
      desc: s.desc || '',
      img: s.img || '',                       // lehet undefined → gradiens fallback a hero-ban
      type: s.type,                            // eredeti típus (typeLabel + kezdő-felismerés)
      isDecision: isDecision,
      lat: ll.lat, lng: ll.lng,
      diff: s.difficulty || s.diff || 'Könnyű',
      /* A cím eddig kimaradt ebből a leképezésből, ezért az arany
         „Helyszín:" sor sosem jelent meg — pedig az adat végig ott volt a
         csomagban. NEM az s.location: az a térképszerkesztő
         koordináta-mezője, amit fentebb parseLoc olvas. */
      loc: s.loc || s.address || '',
      taskShort: s.taskShort || '',
      // pálya-szerkesztő saját feladat-mezői a fallback feladathoz:
      taskType: s.taskType || '', question: s.question || '', answer: s.answer || '',
      score: s.score || '', xp: s.xp || ''
    };
  }

  /* ---------- (a beégetett minta-pálya innen eltávolítva) ----------
     Itt korábban három tömb állt: 6 pályanév, 8 állomás és 9 feladat egy
     „Városliget Felfedező" nevű demóból. Ha a localStorage-kulcsok üresek
     voltak — márpedig azok az adatbázisra állás óta halottak —, a lejátszó
     EZEKBŐL játszott le egy pályát. Az admin Előnézet gombjai mind ide
     futottak, tehát azt hitted, a saját pályádat teszteled, közben egy soha
     nem létezett demót játszottál végig. Ez rosszabb az üres képernyőnél,
     mert téves döntéshez vezet.

     Innentől egyetlen adatforrás van: a pálya befagyasztott csomagja az
     adatbázisból (uq-play-src.js tölti be). Ha az nincs meg, azt megmondjuk. */
  let QUEST_TASKS = null;      // a pálya saját feladatai a befagyasztott csomagból
  function readTasks() { return QUEST_TASKS || []; }

  /* ---------- PÁLYA-FELOLDÁS ----------
     Egyetlen forrás van: a pálya befagyasztott csomagja az adatbázisból,
     amit az uq-play-src.js tölt a window.QUEST_COURSES-be, MÉG mielőtt ez
     a fájl lefutna.

       ?quest=<slug>                — publikus végigjátszás
       ?quest=<slug>&elonezet=1     — admin előnézet: ugyanaz az adat, de
                                      NEM ír a fiókba és nem a szerverre,
                                      hogy a teszt ne kerüljön a ranglistára

     A régi ?game= és ?route= paraméterek localStorage-ból dolgoztak, ami
     üres — ezért futott a lejátszó a beégetett demóra. Ezeket már nem
     fogadjuk el némán: megmondjuk, hol a helyes hivatkozás. */
  const params = new URLSearchParams(location.search);
  const questParam = params.get('quest');
  const ELONEZET = params.get('elonezet') === '1';
  let route = '', TITLE = '';
  let PUBLIC = false, QUEST_ID = '';
  let RAW_COURSE = null;
  let COVER = '';               // a pálya borítóképe — az összegzőn jelenik meg

  function hibaKepernyo(cim, szoveg, gomb) {
    const root = document.getElementById('playRoot');
    if (root) {
      root.innerHTML =
        '<section class="uq-pl-card uq-pl-hiba">' +
          '<h2>' + esc(cim) + '</h2>' +
          '<p>' + szoveg + '</p>' +
          (gomb || '') +
        '</section>';
    }
    const t = document.getElementById('gameTitle');
    if (t) t.textContent = 'Nem játszható';
  }

  if (questParam && window.QUEST_COURSES && window.QUEST_COURSES[questParam]) {
    const qc = window.QUEST_COURSES[questParam];
    QUEST_ID = questParam;
    PUBLIC = !ELONEZET;         // előnézetben nincs fiók- és szerverírás
    QUEST_TASKS = qc.tasks || [];
    const qq = window.QUESTS && window.QUESTS[questParam];
    TITLE = (qq && (qq.heroTitle || qq.title)) || qc.title || questParam;
    route = qc.title || questParam;
    RAW_COURSE = Array.isArray(qc.stations) ? qc.stations : [];
    COVER = qc.image || (qq && qq.image) || '';
  } else if (params.get('game') || params.get('route')) {
    /* Régi admin-előnézet hivatkozás. Eddig ilyenkor indult a demó. */
    hibaKepernyo('Ez a hivatkozás elavult',
      'Az előnézet mostantól a pálya azonosítójával nyílik. Nyisd meg a ' +
      'Játékok oldalon a pályát, és ott kattints az <b>Előnézet</b> gombra.',
      '<a class="adm-btn adm-btn-lime" href="jatekok.html">Ugrás a Játékok oldalra</a>');
    return;
  } else if (questParam && ELONEZET && !(window.UQAPI && UQAPI.user())) {
    /* Az előnézet a v_admin_play_bundle nézetből olvas, amit csak
       bejelentkezett admin lát — enélkül nem a pálya a hiányzó láncszem. */
    hibaKepernyo('Az előnézethez be kell jelentkezned',
      'Ez a nézet a még közzé nem tett pályát is megmutatja, ezért admin fiókot kíván.',
      '<a class="adm-btn adm-btn-lime" href="bejelentkezes.html?next=' +
        encodeURIComponent('jatszas.html?quest=' + questParam + '&elonezet=1') + '">Bejelentkezés</a>');
    return;
  } else if (questParam) {
    /* A csomag nem jött meg: nincs befagyasztott verzió, vagy nincs hálózat. */
    hibaKepernyo('Ez a pálya most nem játszható',
      ELONEZET
        ? 'Nincs befagyasztott verziója. A Játékok oldalon nyomd meg a <b>Közzététel</b> gombot, utána próbáld újra.'
        : 'Lehet, hogy még nincs közzétéve, vagy épp nincs internetkapcsolatod.',
      '<a class="adm-btn adm-btn-lime" href="' + (ELONEZET ? 'jatekok.html' : 'index.html') + '">' +
        (ELONEZET ? 'Vissza a Játékokhoz' : 'Vissza a kalandokhoz') + '</a>');
    return;
  } else {
    hibaKepernyo('Nincs megadva pálya',
      'Válassz egy kalandot, és onnan indítsd a játékot.',
      '<a class="adm-btn adm-btn-lime" href="index.html">Kalandok böngészése</a>');
    return;
  }

  if (!RAW_COURSE.length) {
    hibaKepernyo('Ennek a pályának nincs egyetlen állomása sem',
      'Vegyél fel állomásokat, tedd közzé a pályát, és utána játszható lesz.',
      '<a class="adm-btn adm-btn-lime" href="allomasok.html">Állomások szerkesztése</a>');
    return;
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
  } else if (ELONEZET) {
    /* Előnézetben tudni kell, hogy MELYIK pálya melyik verzióját nézed, és
       hogy az eredmény nem számít bele semmibe — különben az admin azt
       hiszi, élesben játszik. */
    const tag = document.querySelector('.play-top-tag');
    if (tag) tag.innerHTML = '<svg class="ico ico-sm" aria-hidden="true"><use href="#a-preview"/></svg>Előnézet';
    const back = document.getElementById('playBack');
    if (back) back.setAttribute('href', 'jatekok.html');
    const brand = document.querySelector('.play-brand'); if (brand) brand.setAttribute('href', 'jatekok.html');
    const qc = window.QUEST_COURSES[QUEST_ID] || {};
    const sav = document.createElement('div');
    sav.className = 'uq-play-elonezet';
    sav.innerHTML = 'Előnézet — <b>' + esc(TITLE) + '</b>' +
      (qc._version ? ' (v' + esc(qc._version) + ')' : '') +
      '. Az itt szerzett pontok nem kerülnek be a ranglistába.';
    const wrap = document.querySelector('.play-wrap');
    if (wrap) wrap.insertBefore(sav, wrap.firstChild);
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

  /* Kép nélküli állomás háttere. A hero nagy, SZÖVEGMENTES felület — ide
     mehet a pálya színe teljes erővel, mert itt nincs kontraszt-követelmény.
     Ez viszi át a borítókép hangulatát, amit a kiemelő szín normalizálása
     szükségszerűen elvesz. Szín nélkül marad az eredeti gradiens-készlet. */
  function heroHatter(i) {
    if (!window.UQTema) return HERO_GRADS[i % HERO_GRADS.length];
    const szin = getComputedStyle(document.documentElement).getPropertyValue('--lime').trim();
    const rgb = UQTema.hexRgb(szin);
    if (!rgb) return HERO_GRADS[i % HERO_GRADS.length];
    /* Váltakozó dőlés, hogy az egymás utáni állomások ne legyenek azonosak. */
    const szog = (i % 2) ? 135 : 115;
    return 'linear-gradient(' + szog + 'deg, rgb(' + rgb.join(' ') + ' / .10), rgb(' + rgb.join(' ') + ' / .30))';
  }
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
        startTs: play.startTs, elapsedMs: playElapsed(),
        /* a szerveroldali menet azonosítója — a folytatás ugyanoda ír */
        sessionId: SYNC.session ? SYNC.session.id : null
      }
    });
  }

  /* A lap elhagyása (fülváltás, vissza-gomb, bezárás) is mentsen: enélkül a
     legutóbbi mentés óta megoldott feladatok elvesznének. */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && play.active && !play.finished) saveSnapshot();
  });
  window.addEventListener('pagehide', () => { if (play.active && !play.finished) saveSnapshot(); });

  /* =========================================================
     SZERVEROLDALI MENET — az események beküldése

     A ranglista és a csapatjáték a szerveren számolt eredményből él
     (session_events → rebuild_session_state). Ez a rész eddig TELJESEN
     hiányzott a kliensből: a szerveroldali csővezeték készen állt, de
     soha senki nem küldött bele eseményt — ezért maradt üres a ranglista.

     Csak publikus módban, adatbázisból jövő pályán, bejelentkezve fut.
     Offline is működik: az események az uq-api kimenő sorába kerülnek,
     és akkor mennek el, amikor van hálózat.
     ========================================================= */
  const SYNC = { on: false, session: null };

  function uuidv4() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  function deviceId() {
    let d = null;
    try { d = localStorage.getItem('uq_device_v1'); } catch (e) {}
    if (!d) { d = uuidv4(); try { localStorage.setItem('uq_device_v1', d); } catch (e) {} }
    return d;
  }
  const uuidszeru = v => /^[0-9a-f-]{36}$/i.test(String(v || ''));

  function syncInit(restoredSessionId) {
    SYNC.on = false; SYNC.session = null;
    if (!PUBLIC || !window.UQAPI) return;
    const q = window.QUEST_COURSES && QUEST_COURSES[QUEST_ID];
    if (!q || !q._courseId || !q._versionId) return;          // beégetett/próba adat
    if (!(window.UQAuth && UQAuth.isRegistered && UQAuth.isRegistered())) return; // vendég
    const u = UQAuth.getUser();

    /* csapatban játszunk? — a váróból kapott közös menet-azonosító */
    const t = (window.UQTeam && UQTeam.ctx) ? UQTeam.ctx() : null;
    if (t && t.slug === QUEST_ID && uuidszeru(t.session_id)) {
      SYNC.session = {
        id: t.session_id,
        course_id: t.course_id || q._courseId,
        course_version_id: t.course_version_id || q._versionId,
        team_id: t.team_id || null,
        team_key: 'team:' + t.team_id,
        team_name: t.team_name || ''
      };
    } else {
      SYNC.session = {
        id: uuidszeru(restoredSessionId) ? restoredSessionId : uuidv4(),
        course_id: q._courseId,
        course_version_id: q._versionId,
        team_key: 'solo:' + u.id,
        team_name: u.teamName || u.name || ''
      };
    }
    SYNC.on = true;
  }

  function emit(kind, extra) {
    if (!SYNC.on || !window.UQAPI) return;
    let seq = 1;
    const kulcs = 'uq_seq_v1:' + SYNC.session.id + ':' + deviceId();
    try {
      seq = (parseInt(localStorage.getItem(kulcs), 10) || 0) + 1;
      localStorage.setItem(kulcs, String(seq));
    } catch (e) {}
    const esemeny = Object.assign({
      event_id: uuidv4(),
      seq: seq,
      kind: kind,
      client_elapsed_ms: play.finished ? play.finalMs : playElapsed(),
      client_ts: new Date().toISOString()
    }, extra || {});
    UQAPI.queue({
      path: '/rpc/sync_batch',
      method: 'POST',
      body: {
        p_session: SYNC.session,
        p_events: [esemeny],
        p_device: { id: deviceId(), label: 'böngésző', user_agent: String(navigator.userAgent || '').slice(0, 180) }
      }
    });
    UQAPI.flush();
  }

  /* URL-ben érkező csapatkód (megosztott link): ha nincs helyi csapat-
     kontextus, belépünk a kóddal — így a link önmagában is elég. */
  (function () {
    const kod = new URLSearchParams(location.search).get('team');
    if (!kod || !PUBLIC || !window.UQAPI || !UQAPI.user() || !window.UQTeam) return;
    const t = UQTeam.ctx();
    if (t && t.slug === QUEST_ID && t.session_id) return;     // már megvan
    UQAPI.rest('/rpc/join_team_by_code', { method: 'POST', body: { p_code: kod } })
      .then(r => {
        const cs = Array.isArray(r) ? r[0] : r;
        if (!cs || cs.status !== 'playing' || !cs.session_id) return;
        return UQAPI.rest('/v_play_bundle?select=course_id,version_id&slug=eq.' + encodeURIComponent(QUEST_ID))
          .then(rows => {
            const b = rows && rows[0];
            try {
              localStorage.setItem('uq_team_ctx_v1', JSON.stringify({
                team_id: cs.id, team_name: cs.name, join_code: cs.join_code,
                session_id: cs.session_id, course_version_id: b && b.version_id,
                course_id: b && b.course_id, slug: QUEST_ID
              }));
            } catch (e) {}
            syncInit();
          });
      })
      .catch(() => {});
  })();
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
    /* szerveroldali menet: új játék = új (vagy csapatnál a közös) menet */
    syncInit();
    if (COURSE[startIdx] && uuidszeru(COURSE[startIdx].id)) {
      emit('station_visited', { station_id: COURSE[startIdx].id });
    }
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
    /* a folytatás UGYANABBA a szerveroldali menetbe ír tovább */
    syncInit(state.sessionId);
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
    if (COURSE[i] && uuidszeru(COURSE[i].id)) emit('station_visited', { station_id: COURSE[i].id });
    saveSnapshot();
    renderPlay();
  }
  function playFinish() {
    play.finished = true; play.view = 'summary'; play.finalMs = playElapsed(); stopTimer();
    emit('session_finished', {});
    finishSave(); renderPlay();
  }
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
  function playTaskDone(credited, revealText, atugorva) {
    const task = play.stationTasks[play.taskIdx];
    if (!task) return playNextTask();
    const ujra = marMegoldott(task);
    if (credited && !ujra) {
      play.points += (task.points || 0); play.done++;
      play.solvedIds.push(String(task.id));
    } else if (!credited && !ujra) {
      play.skipped++;
    }
    /* A szerver a NYERS választ kapja meg, és maga dönt a helyességről —
       a kliens állítása (is_correct) csak audit. Átugrásnál nincs válasz. */
    if (uuidszeru(task.id)) {
      emit('task_attempted', {
        task_id: task.id,
        is_correct: !!credited,
        skipped: !!atugorva,
        answer: atugorva ? null : (play.lastAnswer != null ? play.lastAnswer : null)
      });
    }
    play.lastAnswer = null;
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

  /* Az akció-kártya felirata. A saját játékpszichológiai keretünk 4. elve
     szerint minden gépileg pontozott „kérdés" vizsga-üzemmódba kapcsol —
     a fotó, a GPS és a nyugtázós feladat viszont épp azért került oda, mert
     NINCS elrontható válasza. Ott felszólítás jár, nem kérdés. */
  const AKCIO_FELIRAT = {
    kviz: 'Kérdés', szoveg: 'Kérdés', kod: 'Kérdés', puzzle: 'Kérdés',
    foto: 'Mit csináljatok', gps: 'Mit csináljatok', qr: 'Mit csináljatok',
    gyors: 'Mit csináljatok', info: 'Mit csináljatok'
  };
  function akcioFelirat(tipus) { return AKCIO_FELIRAT[tipus] || 'Feladat'; }

  function playStationHTML() {
    const i = playCurIdx(); const s = COURSE[i];
    const total = play.stationTasks.length;
    const tno = Math.min(play.taskIdx + 1, total);
    /* Hero: az állomás képe (vagy gradiens), rajta a sorszám-jelvény és az
       állomás neve — ez mondja meg a csapatnak, hova kell menniük. */
    let h = '<div class="uq-pl-hero" style="background:' + (s.img || heroHatter(i)) + '">' +
      '<span class="uq-pl-hero-fade" aria-hidden="true"></span>' +
      '<span class="uq-pl-hero-in">' +
        '<span class="uq-pl-badge">' +
          '<svg class="ico ico-xs" aria-hidden="true"><use href="#' + (s.isDecision ? 'a-diamond' : 'a-pin') + '"/></svg>' +
          play.path.length + '. állomás' +
        '</span>' +
        '<span class="uq-pl-hero-cim">' + esc(s.name) + '</span>' +
      '</span>' +
    '</div>';

    if (total) {
      const task = play.stationTasks[play.taskIdx];
      const ty = PLAY_TYPE[task.type] || { l: task.type, c: '#8b957f', ic: 'a-task' };

      /* 1. KONTEXTUS-KÁRTYA — amit elolvasnak, mielőtt cselekednének. */
      h += '<div class="uq-pl-card uq-pl-ctx">' +
        '<div class="uq-pl-taskhead">' +
          '<span class="uq-pl-tico" style="color:' + ty.c + ';background:' + ty.c + '1f;border-color:' + ty.c + '55">' +
            '<svg class="ico ico-sm" aria-hidden="true"><use href="#' + ty.ic + '"/></svg></span>' +
          '<span class="uq-pl-tmeta">' +
            '<span class="uq-pl-tlabel">Feladat' + (total > 1 ? ' · ' + tno + '/' + total : '') + '</span>' +
            '<b>' + esc(ty.l) + '</b>' +
          '</span>' +
        '</div>';
      if (s.desc) h += '<p class="uq-pl-desc">' + esc(s.desc) + '</p>';
      if (s.loc) h += '<p class="uq-pl-loc"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-pin"/></svg>Helyszín: ' + esc(s.loc) + '</p>';
      h += '</div>';

      /* 2. AKCIÓ-KÁRTYA — a saját kerete azt jelenti: „itt kell cselekedni".
         A felirat típusfüggő: a fotó/gps/nyugtázós feladatnak nincs helyes
         válasza, ezért ott a „Kérdés" hamis vizsga-hangnemet adna. */
      h += '<div class="uq-pl-card uq-pl-akcio">' +
        '<h2 class="uq-pl-qlabel">' + akcioFelirat(task.type) + '</h2>' +
        '<p class="uq-pl-qtext">' + esc(task.question) + '</p>';
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
      h += '<div class="uq-pl-card uq-pl-akcio">';
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
    /* a beküldött nyers válasz megy a szervernek is (task_attempted) —
       a szerver ebből számol pontot, a kliens ítélete csak audit */
    play.lastAnswer = valasz == null ? null : valasz;
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
        /* a szerver a sorbarakott elemeket kapja válaszként (tömbként) */
        play.lastAnswer = play.pv.order.map(idx => String((c.items || [])[idx] == null ? '' : c.items[idx]));
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
      /* a szerver hint-UUID szerint vonja le a pontot — csak valódi
         azonosítóval küldjük (a régi, tömbindexes kulcs nem uuid) */
      const hid = tippKulcs(task, i);
      if (uuidszeru(hid)) emit('hint_revealed', { hint_id: hid });
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
    /* az átugrás explicit jelzés a szervernek is (skipped=true, válasz nélkül) */
    $('#uqPlaySkip').addEventListener('click', () => playTaskDone(false, task.reveal, true));
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
      $('#uqPlayGo').addEventListener('click', () => {
        const valasztott = Array.prototype.map.call(box.querySelectorAll('select'), s => {
          const p = (c.pairs || [])[+s.value];
          return p ? String(p.right) : '';
        });
        play.lastAnswer = valasztott;
        const ok = Array.prototype.every.call(box.querySelectorAll('select'), s => String(s.value) === String(s.dataset.i));
        if (ok) done(true); else playWrong();
      });
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
