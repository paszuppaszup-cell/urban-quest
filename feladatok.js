/* =========================================================
   URBAN QUEST — KÖZÖS ADMIN UI (scaffold)
   toast / legördülő / oldalsáv-összecsukás / nav — window.UQ export
   ========================================================= */
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
    opts = opts || {}; var type = opts.type || 'ok'; var sub = opts.sub || '';
    var wrap = ensureToastWrap(); var t = document.createElement('div');
    t.className = 'uq-toast' + (type !== 'ok' ? ' is-' + type : '');
    t.innerHTML = '<span class="uq-toast-ic">' + ico('a-check-c') + '</span>' +
      '<div class="uq-toast-body"><b>' + esc(msg) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>' +
      '<button class="uq-toast-x" type="button" aria-label="Bezárás">' + ico('a-close', 'ico-sm') + '</button>';
    wrap.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('is-show'); });
    var dismiss = function () { t.classList.remove('is-show'); setTimeout(function () { t.remove(); }, 260); };
    var x = t.querySelector('.uq-toast-x'); if (x) x.addEventListener('click', dismiss);
    setTimeout(dismiss, 3200);
  }
  function closeAllMenus() { document.querySelectorAll('[data-dd].is-open, [data-chipmenu].is-open').forEach(function (x) { x.classList.remove('is-open'); }); }
  function bindDropdowns() {
    document.querySelectorAll('[data-dd]').forEach(function (dd) {
      var t = dd.querySelector('[data-dd-toggle]'); if (!t || t.dataset.uqBound) return; t.dataset.uqBound = '1';
      t.addEventListener('click', function (e) { e.stopPropagation(); var open = dd.classList.contains('is-open'); closeAllMenus(); dd.classList.toggle('is-open', !open); });
    });
  }
  function bindCollapse() {
    var side = document.getElementById('admSide'); var toggle = document.querySelector('[data-side-toggle]');
    if (!side || !toggle || toggle.dataset.uqBound) return; toggle.dataset.uqBound = '1';
    toggle.addEventListener('click', function () { if (window.innerWidth <= 900) return; side.classList.toggle('is-collapsed'); try { localStorage.setItem('uqSideCollapsed', side.classList.contains('is-collapsed')); } catch (err) {} });
    try { if (localStorage.getItem('uqSideCollapsed') === 'true' && window.innerWidth > 900) side.classList.add('is-collapsed'); } catch (err) {}
  }
  function bindNav() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.adm-nav-item'));
    items.forEach(function (item) {
      if (item.dataset.uqBound) return; item.dataset.uqBound = '1';
      item.addEventListener('click', function (e) { if (item.getAttribute('href') === '#') { e.preventDefault(); items.forEach(function (n) { n.classList.toggle('is-active', n === item); }); } });
    });
  }
  document.addEventListener('click', closeAllMenus);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAllMenus(); });
  function init() { bindDropdowns(); bindCollapse(); bindNav(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.UQ = window.UQ || {}; window.UQ.toast = toast; window.UQ.closeAllMenus = closeAllMenus; window.UQ.bindDropdowns = bindDropdowns;
})();


/* =========================================================
   URBAN QUEST — FELADATOK + típusra szabott szerkesztő
   ========================================================= */
(function () {
  'use strict';
  const toast = (m, o) => (window.UQ && window.UQ.toast ? window.UQ.toast : function () {})(m, o);
  const ico = (id, cls) => `<svg class="ico ${cls || ''}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = s => String(s == null ? '' : s).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const clone = o => JSON.parse(JSON.stringify(o));

  const DIFF_KEY = { 'Könnyű': 'konnyu', 'Közepes': 'kozepes', 'Nehéz': 'nehez', 'Extrém': 'extrem' };
  const DIFF_COLOR = { konnyu: '#4fb84f', kozepes: '#e0b93a', nehez: '#e8813a', extrem: '#e03a2f' };
  const DIFF_POINTS = { 'Könnyű': 25, 'Közepes': 45, 'Nehéz': 65, 'Extrém': 90 };
  const TYPE = {
    kviz:   { label: 'Kvíz',        color: '#5b9de0', icon: 'a-quiz',   sub: 'Feleletválasztós' },
    szoveg: { label: 'Szöveges',    color: '#e0b93a', icon: 'a-text',   sub: 'Nyílt válasz' },
    puzzle: { label: 'Puzzle',      color: '#8fb04f', icon: 'a-layers', sub: 'Sorrend / párosítás' },
    kod:    { label: 'Kód-feltörés',color: '#e8813a', icon: 'a-lock',   sub: 'Kód megfejtése' },
    foto:   { label: 'Fotó',        color: '#9d7ce0', icon: 'a-camera', sub: 'Képfeltöltés' },
    gps:    { label: 'GPS',         color: '#4fb84f', icon: 'a-target', sub: 'Helyszín elérése' },
    qr:     { label: 'QR-kód',      color: '#39c0c8', icon: 'a-qr',     sub: 'Kód beolvasása' },
    /* A „Gyorsasági" típus MENTHETETLEN volt: a tasks_kind_check nem ismeri
       a 'gyors' értéket, tehát minden ilyen feladat 23514-gyel bukott.
       Helyette a DB által valóban engedett két típus került be. */
    info:   { label: 'Állomásfeladat', color: '#5b9de0', icon: 'a-task', sub: 'Nyugtázós, nincs válasz' },
    dontes: { label: 'Döntési pont',   color: '#9d7ce0', icon: 'a-route', sub: 'Útvonalválasztás' }
  };
  const STATUS = {
    active:   { cls: 'is-pub',   label: 'Aktív',   color: '#4fb84f', glow: true },
    draft:    { cls: 'is-draft', label: 'Vázlat',  color: '#7c86e0', glow: false },
    /* A felület 'inactive'-et küldött, a tasks_status_check viszont csak
       active/draft/archived értéket enged — a mentés TELJESEN elbukott. */
    archived: { cls: 'is-arch',  label: 'Archivált', color: '#5b6553', glow: false }
  };
  const STATUS_BY_LABEL = { 'Aktív': 'active', 'Vázlat': 'draft', 'Archivált': 'archived' };

  function defaultCfg(type) {
    switch (type) {
      case 'kviz':   return { options: [{ text: 'A válasz', correct: true }, { text: 'B válasz', correct: false }, { text: 'C válasz', correct: false }], shuffle: true };
      case 'szoveg': return { accepted: ['válasz'], tolerant: true, keyword: false, numeric: false };
      case 'puzzle': return { subtype: 'order', items: ['Első', 'Második', 'Harmadik'], pairs: [{ left: 'Bal', right: 'Jobb' }], partial: true };
      case 'kod':    return { codeType: 'num', code: '1896' };
      case 'foto':   return { instruction: 'Mit ábrázoljon a kép?', required: true };
      case 'gps':    return { lat: 47.5079, lng: 19.0812, radius: 30 };
      case 'qr':     return { code: 'UQ-KOD-' + Math.floor(1000 + Math.random() * 9000) };
      case 'gyors':  return { game: 'tap', time: 5, target: 15 };
      default:       return {};
    }
  }

  /* ---------- adatok (egyetlen igazságforrás) ---------- */
  const TASKS = [
    { question: 'Melyik évben épült a Vajdahunyad vára?', station: 'Vajdahunyad vára', route: 'Városliget Felfedező', type: 'kviz', points: 50, diff: 'Közepes', status: 'active', media: 'vajdahunyad_var.jpg', hints: [{ text: 'A millenniumi ünnepségekre készült.', cost: 5 }], badge: '', cfg: { options: [{ text: '1896', correct: true }, { text: '1908', correct: false }, { text: '1873', correct: false }, { text: '1920', correct: false }], shuffle: true } },
    { question: 'Készíts fotót a főbejáratról', station: 'Főbejárat', route: 'Városliget Felfedező', type: 'foto', points: 30, diff: 'Könnyű', status: 'active', media: 'fobejarat_minta.jpg', hints: [{ text: 'Álljatok szembe a kapuval.', cost: 0 }], badge: '', cfg: { instruction: 'Jól kivehető főbejárat a képen', required: true } },
    { question: 'Rakd időrendbe a Városliget épületeit!', station: 'Vajdahunyad vára', route: 'Városliget Felfedező', type: 'puzzle', points: 55, diff: 'Közepes', status: 'active', media: 'varosliget_epuletek.jpg', hints: [{ text: 'A vár a legrégebbi.', cost: 5 }], badge: '', cfg: { subtype: 'order', items: ['Vajdahunyad vára (1908)', 'Széchenyi fürdő (1913)', 'Műjégpálya (1926)', 'Zene Háza (2021)'], pairs: [], partial: true } },
    { question: 'Fejtsd meg a széf kódját a szobor talapzatán!', station: 'Hősök tere', route: 'Városliget Felfedező', type: 'kod', points: 45, diff: 'Nehéz', status: 'active', media: 'szef_kod.jpg', hints: [{ text: 'A honfoglalás éve.', cost: 8 }, { text: 'Kilencszázas évek elején… nem.', cost: 12 }], badge: '', cfg: { codeType: 'num', code: '896' } },
    { question: 'Hány kupola díszíti a Széchenyi fürdő főhomlokzatát?', station: 'Széchenyi fürdő', route: 'Városliget Felfedező', type: 'szoveg', points: 35, diff: 'Könnyű', status: 'active', media: 'szechenyi_furdo.jpg', hints: [{ text: 'Számold a sárga tetőket.', cost: 5 }], badge: '', cfg: { accepted: ['3', 'három'], tolerant: true, keyword: false, numeric: true } },
    { question: 'Érd el a Hősök terén a szoborcsoportot', station: 'Hősök tere', route: 'Városliget Felfedező', type: 'gps', points: 40, diff: 'Könnyű', status: 'active', media: 'hosok_tere_terkep.png', hints: [{ text: 'Kövesd a fősétányt.', cost: 0 }], badge: '', cfg: { lat: 47.5159, lng: 19.0776, radius: 35 } },
    { question: 'Olvasd be a bejárat melletti QR-kódot', station: 'Zene Háza', route: 'Liget Projekt', type: 'qr', points: 25, diff: 'Könnyű', status: 'draft', media: 'qr_zene_haza.png', hints: [], badge: '', cfg: { code: 'UQ-ZENE-2024' } },
    { question: 'Koppints 15-öt 5 másodperc alatt!', station: 'Műjégpálya', route: 'Városliget Felfedező', type: 'gyors', points: 30, diff: 'Könnyű', status: 'active', media: '', hints: [], badge: 'Gyorsfutó', cfg: { game: 'tap', time: 5, target: 15 } },
    { question: 'Melyik stílusban épült a Vajdahunyad vár gótikus szárnya?', station: 'Vajdahunyad vára', route: 'Városliget Felfedező', type: 'kviz', points: 60, diff: 'Nehéz', status: 'active', media: 'var_gotikus_szarny.jpg', hints: [{ text: 'A csúcsíves ablakok árulkodnak.', cost: 6 }], badge: '', cfg: { options: [{ text: 'Reneszánsz', correct: false }, { text: 'Gótikus', correct: true }, { text: 'Barokk', correct: false }, { text: 'Román', correct: false }], shuffle: true } }
  ];
  const byId = id => TASKS.find(t => t.id === id);

  /* ---------- adatréteg: Supabase (korábban localStorage) ----------
     A felület a helyes választ a cfg-ben tárolja (options[].correct,
     accepted, code), az adatbázis viszont KÜLÖN oszlopban — hogy
     oszlopszinten megvonható legyen a játékostól. Ezért betöltéskor
     visszafésüljük, mentéskor szétválasztjuk. */

  let STATIONS_OPT = [];   // {id, name, course} az állomás-választóhoz

  /* Nem `norm` — az a név a 64. sorban már foglalt. */
  function normValasz(s) {
    return String(s == null ? '' : s).trim().toLowerCase()
      .replace(/[áàâä]/g,'a').replace(/[éèê]/g,'e').replace(/[íì]/g,'i')
      .replace(/[óòôöő]/g,'o').replace(/[úùûüű]/g,'u').replace(/[^a-z0-9]/g,'');
  }

  /* megoldás VISSZA a cfg-be, hogy a szerkesztő úgy lássa, mint eddig */
  function cfgMegoldassal(kind, config, solution) {
    const cfg = JSON.parse(JSON.stringify(config || {}));
    const acc = (solution && Array.isArray(solution.accepted)) ? solution.accepted : [];
    if (kind === 'kviz' && Array.isArray(cfg.options)) {
      const jo = acc.map(normValasz);
      cfg.options = cfg.options.map(o => Object.assign({}, o, { correct: jo.indexOf(normValasz(o.text)) > -1 }));
    } else if (kind === 'kod') {
      cfg.code = acc[0] || '';
    } else if (kind === 'szoveg') {
      cfg.accepted = acc.slice();
    }
    return cfg;
  }

  /* megoldás KI a cfg-ből, mentéshez */
  function megoldasCfgbol(kind, cfg) {
    cfg = cfg || {};
    if (kind === 'kviz') {
      const jo = (cfg.options || []).filter(o => o && o.correct).map(o => String(o.text == null ? '' : o.text));
      return jo.length ? { accepted: jo } : {};
    }
    if (kind === 'kod')    return cfg.code ? { accepted: [String(cfg.code)] } : {};
    if (kind === 'szoveg') { const a = (cfg.accepted || []).map(String).filter(Boolean); return a.length ? { accepted: a } : {}; }
    if (kind === 'puzzle') { const it = (cfg.items || []).map(String); return it.length ? { accepted: [it.join('|')] } : {}; }
    return {};
  }

  /* a config, amit a telefonra küldünk: megoldás-jelölő nélkül */
  function cfgMegoldasNelkul(kind, cfg) {
    const c = JSON.parse(JSON.stringify(cfg || {}));
    if (Array.isArray(c.options)) c.options = c.options.map(o => ({ id: o.id || null, text: o.text }));
    delete c.accepted; delete c.code; delete c.answer;
    return c;
  }

  function dbSor(r) {
    return {
      id: r.id,
      stationId: r.station_id,
      courseId: r.course_id,
      question: r.question || '',
      station: r.station_name || '',
      route: r.course_name || '',
      type: r.kind || 'szoveg',
      points: r.points || 0,
      status: r.status || 'active',
      /* Ezek a config-ban utaznak (nincs rájuk oszlop a tasks táblában).
         Korábban be voltak égetve, ezért a lista Nehézség oszlopa mind a 30
         sornál ugyanazt mutatta, a videó és a kitűző pedig sosem tért vissza. */
      diff: (r.config && r.config.difficulty) || 'Közepes',
      image: r.image || '', media: r.image || '',
      /* A videó SAJÁT oszlop lett; a config-ból csak azért olvasunk még,
         hogy egy régebbi, még át nem költöztetett sor se veszítse el. */
      video: r.video || (r.config && r.config.video) || '',
      badge: (r.config && r.config.badge) || '',
      /* CSAPATLÁNC: a config 'relay' kulcsa alatt él, nem külön oszlopban —
         így a publikálási lánc (bundle → lejátszó) generikusan átviszi. */
      relay: (r.config && r.config.relay) || { on: false },
      hints: (r.hints || []).map(h => ({ text: h.text, cost: h.cost })),
      cfg: cfgMegoldassal(r.kind, r.config, r.solution)
    };
  }

  function saveStore() { /* szándékosan üres — az adatbázis a forrás */ }

  function betolt() {
    if (!window.UQAPI) return Promise.reject(new Error('Hiányzik az adatréteg.'));
    return Promise.all([
      UQAPI.rest('/v_admin_tasks?select=*&order=course_name.asc,station_position.asc,position.asc'),
      UQAPI.rest('/v_admin_stations?select=id,name,course_name,course_id&order=course_name.asc,position.asc')
    ]).then(([sorok, allomasok]) => {
      STATIONS_OPT = allomasok || [];
      TASKS.splice(0, TASKS.length, ...(sorok || []).map(dbSor));
      return TASKS;
    });
  }

  /* ---------- állapot ---------- */
  TASKS.splice(0, TASKS.length);   // a beépített minta-adat kiürül
  const state = { search: '', type: 'all', perPage: 10, page: 1 };

  /* ---------- fő DOM ---------- */
  const tbody = document.getElementById('taskRows');
  const emptyEl = document.getElementById('jtkEmpty');
  const pagerEl = document.getElementById('jtkPager');
  const topSearch = document.getElementById('topSearch');
  const typeFilter = document.getElementById('typeFilter');
  const perPageSel = document.getElementById('perPage');

  /* =========================================================
     TÁBLÁZAT
     ========================================================= */
  /* Egy JÁTÉKHOZ tartozó feladatok. A Játékok oldalról idáig nem vezetett
     út: az oldalsáv linkje a teljes listát nyitotta meg, és nem lehetett
     megnézni, milyen feladatai vannak egy adott pályának. */
  const CEL_PALYA = new URLSearchParams(location.search).get('game') || '';

  function filtered() {
    const s = state.search.trim().toLowerCase();
    return TASKS.filter(t => {
      if (CEL_PALYA && String(t.courseId) !== CEL_PALYA) return false;
      if (state.type !== 'all' && t.type !== state.type) return false;
      if (s) { const hay = (t.question + ' ' + t.station + ' ' + t.route).toLowerCase(); if (!hay.includes(s)) return false; }
      return true;
    });
  }
  function rowHTML(t) {
    const dk = DIFF_KEY[t.diff] || 'kozepes';
    const ty = TYPE[t.type] || TYPE.kviz;
    const stt = STATUS[t.status] || STATUS.draft;
    return `<div class="jtk-row" data-id="${t.id}">
      <div class="jtk-name">
        <span class="fld-ico" style="color:${ty.color};background:${ty.color}1f">${ico(ty.icon)}</span>
        <span class="jtk-name-txt"><b>${esc(t.question)}</b><small>${ico('a-pin')}${esc(t.station)}</small></span>
      </div>
      <div><span class="fld-type" style="color:${ty.color};background:${ty.color}1a"><span class="dot" style="background:${ty.color}"></span>${ty.label}</span></div>
      <div class="jtk-cell-route">${esc(t.route)}</div>
      <div class="jtk-cell-xp">${ico('a-award')}<b>${t.points}</b> XP</div>
      <div class="jtk-cell-diff"><span class="jtk-diff jtk-diff-${dk}"><i></i><i></i><i></i><i></i><i></i></span><span class="jtk-diff-lbl">${esc(t.diff)}</span></div>
      <div><span class="jtk-status ${stt.cls}"><span class="dot"></span>${stt.label}</span></div>
      <div class="jtk-actions">
        <button class="jtk-act jtk-act-edit" type="button" data-act="edit" aria-label="Szerkesztés">${ico('a-edit')}</button>
        <button class="jtk-act" type="button" data-act="copy" aria-label="Másolás">${ico('a-copy')}</button>
        <button class="jtk-act jtk-act-del" type="button" data-act="delete" aria-label="Törlés">${ico('a-trash')}</button>
      </div>
    </div>`;
  }
  function renderPager(total, pages, startIdx, count) {
    const from = total === 0 ? 0 : startIdx + 1, to = startIdx + count;
    let html = `<span class="jtk-range">${from}–${to} / ${total}</span>`;
    html += `<button type="button" class="jtk-pg jtk-pg-prev" aria-label="Előző"${state.page <= 1 ? ' disabled' : ''}>${ico('a-collapse', 'ico-xs')}</button>`;
    for (let p = 1; p <= pages; p++) html += `<button type="button" class="jtk-pg${p === state.page ? ' is-active' : ''}" data-page="${p}">${p}</button>`;
    html += `<button type="button" class="jtk-pg jtk-pg-next" aria-label="Következő"${state.page >= pages ? ' disabled' : ''}>${ico('a-collapse', 'ico-xs')}</button>`;
    pagerEl.innerHTML = html;
  }
  function render() {
    const list = filtered(), total = list.length, perPage = state.perPage, pages = Math.max(1, Math.ceil(total / perPage));
    if (state.page > pages) state.page = pages; if (state.page < 1) state.page = 1;
    const startIdx = (state.page - 1) * perPage, pageItems = list.slice(startIdx, startIdx + perPage);
    tbody.innerHTML = pageItems.map(rowHTML).join('');
    emptyEl.hidden = total > 0;
    renderPager(total, pages, startIdx, pageItems.length);
    palyaSavKiir(total);
    saveStore();
  }

  /* Ha egy játékra szűrünk, azt LÁTNI kell — különben a rövid lista úgy
     néz ki, mintha feladatok tűntek volna el. A sávból egy kattintással
     vissza lehet térni a teljes listához. */
  function palyaSavKiir(db) {
    let sav = document.getElementById('palyaSav');
    if (!CEL_PALYA) { if (sav) sav.remove(); return; }
    if (!sav) {
      sav = document.createElement('div');
      sav.id = 'palyaSav';
      sav.className = 'uq-szuro-sav';
      tbody.parentNode.insertBefore(sav, tbody);
    }
    const nev = (TASKS.find(t => String(t.courseId) === CEL_PALYA) || {}).route || 'a kiválasztott játék';
    sav.innerHTML = '<span>' + ico('a-game', 'ico-sm') + '<b>' + esc(nev) + '</b> feladatai — ' + db + ' db</span>' +
      '<a href="feladatok.html">Összes feladat</a>';
  }

  /* =========================================================
     SZERKESZTŐ (teljes képernyős, 2 paneles)
     ========================================================= */
  const ov = document.getElementById('feEditor');
  const el = {
    title: document.getElementById('feTitle'), valid: document.getElementById('feValid'),
    typeGrid: document.getElementById('feTypeGrid'), typeCfg: document.getElementById('feTypeConfig'),
    typeSecTitle: document.getElementById('feTypeSecTitle'),
    hints: document.getElementById('feHints'), phone: document.getElementById('fePhone'), play: document.getElementById('fePlay'),
    q: document.getElementById('fQuestion'), cq: document.getElementById('cQuestion'),
    route: document.getElementById('fRoute'), station: document.getElementById('fStation'),
    diff: document.getElementById('fDiff'), diffDot: document.getElementById('fDiffDot'),
    points: document.getElementById('fPoints'), status: document.getElementById('fStatus'), statusDot: document.getElementById('fStatusDot'),
    rewardXp: document.getElementById('fRewardXp'), badge: document.getElementById('fBadge')
  };
  let cur = null;      // munkapéldány
  let curId = null;    // szerkesztett feladat id (null = új)
  let pv = {};         // előnézet interakció-állapot

  /* --- típus-kártyák --- */
  function renderTypeGrid() {
    el.typeGrid.innerHTML = Object.keys(TYPE).map(k => {
      const ty = TYPE[k];
      return `<button class="fe-typecard${cur.type === k ? ' is-on' : ''}" type="button" data-type="${k}">
        <span class="ti">${ico(ty.icon)}</span><span><b>${ty.label}</b><small>${ty.sub}</small></span></button>`;
    }).join('');
  }

  /* --- típus-specifikus konfig --- */
  function renderTypeConfig() {
    const t = cur, c = t.cfg; let h = '';
    /* Ismeretlen típusnál (pl. a DB-ben létező 'info') ez TypeError-t dobott,
       és mivel az overlay csak EZUTÁN nyílt volna ki, a Szerkesztés gomb
       látszólag semmit nem csinált — hibaüzenet nélkül. */
    const tm = TYPE[t.type] || TYPE.szoveg;
    el.typeSecTitle.textContent = tm.label + ' beállításai';
    if (t.type === 'kviz') {
      h += `<div class="fe-fg"><label>Válaszlehetőségek <span class="fe-hint-note">jelöld a helyese(ke)t</span></label><div class="fe-list" data-list="opt">`;
      c.options.forEach((o, i) => {
        h += `<div class="fe-item${o.correct ? ' is-correct' : ''}" data-i="${i}"><input type="text" value="${esc(o.text)}" data-f="text" placeholder="Válasz…">
          <label class="fe-correct"><input type="checkbox" data-f="correct"${o.correct ? ' checked' : ''}>helyes</label>
          <button class="fe-rm" type="button" data-rm aria-label="Törlés">${ico('a-close', 'ico-xs')}</button></div>`;
      });
      h += `</div><button class="fe-add" type="button" data-add="opt">${ico('a-plus', 'ico-xs')}Válasz hozzáadása</button></div>`;
      h += toggleRow('shuffle', 'Válaszok keverése', 'Játékosonként véletlen sorrend', c.shuffle);
    } else if (t.type === 'szoveg') {
      h += `<div class="fe-fg"><label>Elfogadott válaszok</label><div class="fe-list" data-list="acc">`;
      c.accepted.forEach((a, i) => { h += `<div class="fe-item" data-i="${i}"><input type="text" value="${esc(a)}" data-f="acc" placeholder="Elfogadott válasz…"><button class="fe-rm" type="button" data-rm aria-label="Törlés">${ico('a-close', 'ico-xs')}</button></div>`; });
      h += `</div><button class="fe-add" type="button" data-add="acc">${ico('a-plus', 'ico-xs')}Válasz hozzáadása</button></div>`;
      h += `<div class="fe-toggles">${toggleRow('tolerant', 'Ékezet / kisbetű tűrés', 'Nem számít a kis-nagybetű és ékezet', c.tolerant)}${toggleRow('keyword', 'Kulcsszó-egyezés', 'Elég, ha tartalmazza a választ', c.keyword)}${toggleRow('numeric', 'Szám-mód', 'Számként hasonlít (formátum-tűrés)', c.numeric)}</div>`;
    } else if (t.type === 'puzzle') {
      h += `<div class="fe-fg"><label>Altípus</label><div class="ed-field ed-select"><select data-f="subtype"><option value="order"${c.subtype === 'order' ? ' selected' : ''}>Sorrendbe rakás</option><option value="match"${c.subtype === 'match' ? ' selected' : ''}>Párosítás</option></select>${ico('a-down', 'ico-xs')}</div></div>`;
      if (c.subtype === 'order') {
        h += `<div class="fe-fg"><label>Elemek <span class="fe-hint-note">a helyes sorrendben</span></label><div class="fe-list" data-list="items">`;
        c.items.forEach((it, i) => { h += `<div class="fe-item" data-i="${i}"><span class="grab">${ico('a-menu', 'ico-xs')}</span><input type="text" value="${esc(it)}" data-f="item"><span class="fe-mv"><button type="button" data-mv="up">▲</button><button type="button" data-mv="dn">▼</button></span><button class="fe-rm" type="button" data-rm>${ico('a-close', 'ico-xs')}</button></div>`; });
        h += `</div><button class="fe-add" type="button" data-add="items">${ico('a-plus', 'ico-xs')}Elem hozzáadása</button></div>`;
      } else {
        h += `<div class="fe-fg"><label>Párok</label><div class="fe-list" data-list="pairs">`;
        c.pairs.forEach((p, i) => { h += `<div class="fe-item" data-i="${i}"><input type="text" value="${esc(p.left)}" data-f="left" placeholder="Bal"><span class="fe-pair-mid">${ico('a-route', 'ico-xs')}</span><input type="text" value="${esc(p.right)}" data-f="right" placeholder="Jobb"><button class="fe-rm" type="button" data-rm>${ico('a-close', 'ico-xs')}</button></div>`; });
        h += `</div><button class="fe-add" type="button" data-add="pairs">${ico('a-plus', 'ico-xs')}Pár hozzáadása</button></div>`;
      }
      h += toggleRow('partial', 'Arányos részpont', 'A helyes elemek arányában jár pont', c.partial);
    } else if (t.type === 'kod') {
      h += `<div class="fe-row2"><div class="fe-fg"><label>Kód típusa</label><div class="ed-field ed-select"><select data-f="codeType"><option value="num"${c.codeType === 'num' ? ' selected' : ''}>Számkód</option><option value="word"${c.codeType === 'word' ? ' selected' : ''}>Szó / szimbólum</option></select>${ico('a-down', 'ico-xs')}</div></div>
        <div class="fe-fg"><label>Helyes kód <span class="req">*</span></label><div class="ed-field"><input type="text" value="${esc(c.code)}" data-f="code" placeholder="Kód…"></div></div></div>`;
    } else if (t.type === 'foto') {
      h += `<div class="fe-fg"><label>Elvárt tartalom</label><div class="ed-field"><input type="text" value="${esc(c.instruction)}" data-f="instruction" placeholder="Mit ábrázoljon a kép?"></div></div>`;
      h += toggleRow('required', 'Kötelező feltöltés', 'Kép nélkül nem teljesíthető', c.required);
    } else if (t.type === 'gps') {
      h += `<div class="fe-row2"><div class="fe-fg"><label>Szélesség</label><div class="ed-field"><input type="number" step="0.0001" value="${c.lat}" data-f="lat"></div></div><div class="fe-fg"><label>Hosszúság</label><div class="ed-field"><input type="number" step="0.0001" value="${c.lng}" data-f="lng"></div></div></div>
        <div class="fe-fg"><label>Rádiusz (m)</label><div class="ed-field"><input type="number" min="5" max="150" step="5" value="${c.radius}" data-f="radius"></div></div>`;
    } else if (t.type === 'qr') {
      h += `<div class="fe-fg"><label>Generált QR-kód</label><div class="ed-field"><input type="text" value="${esc(c.code)}" data-f="code" readonly></div></div><button class="fe-add" type="button" data-regen>${ico('a-refresh', 'ico-xs')}Új kód generálása</button>`;
    } else if (t.type === 'gyors') {
      h += `<div class="fe-row2"><div class="fe-fg"><label>Mini-játék</label><div class="ed-field ed-select"><select data-f="game"><option value="tap"${c.game === 'tap' ? ' selected' : ''}>Koppintás</option><option value="memory"${c.game === 'memory' ? ' selected' : ''}>Memória</option><option value="order"${c.game === 'order' ? ' selected' : ''}>Gyors sorrend</option></select>${ico('a-down', 'ico-xs')}</div></div>
        <div class="fe-fg"><label>Időlimit (mp)</label><div class="ed-field"><input type="number" min="3" max="60" value="${c.time}" data-f="time"></div></div></div>
        <div class="fe-fg"><label>Cél (koppintás)</label><div class="ed-field"><input type="number" min="1" value="${c.target || 15}" data-f="target"></div></div>`;
    }
    el.typeCfg.innerHTML = h;
  }
  function toggleRow(f, title, sub, on) {
    return `<div class="fe-toggle-row"><span>${title}<small>${sub}</small></span><button class="ed-toggle${on ? ' is-on' : ''}" type="button" role="switch" aria-checked="${on}" data-tg="${f}"><span></span></button></div>`;
  }

  /* --- nyomok --- */
  function renderHints() {
    el.hints.innerHTML = (cur.hints || []).map((hn, i) =>
      `<div class="fe-item" data-i="${i}"><span class="grab">${i + 1}.</span><input type="text" value="${esc(hn.text)}" data-hf="text" placeholder="Nyom szövege…"><label class="fe-correct"><input type="number" min="0" max="50" value="${hn.cost}" data-hf="cost" style="width:44px;background:none;border:0;color:var(--text);text-align:right"> pt</label><button class="fe-rm" type="button" data-hrm>${ico('a-close', 'ico-xs')}</button></div>`
    ).join('') || '<div class="fe-hint-note" style="padding:4px 2px">Nincs nyom — a fokozatos segítséghez adj hozzá lépcsőket.</div>';
  }

  /* =========================================================
     ÉLŐ ELŐNÉZET (interaktív)
     ========================================================= */
  function renderPreview() {
    const t = cur, ty = TYPE[t.type] || TYPE.szoveg;
    pv = { attempts: 0, solved: false, hints: 0, order: null, code: '' };
    let h = `<div class="pv-topbar"><span class="pv-station">${ico('a-pin')}${esc(t.station || '—')}</span><span class="pv-badges"><span class="pv-badge type" style="color:${ty.color};background:${ty.color}22">${ty.label}</span><span class="pv-badge xp">${t.points} XP</span></span></div>`;
    if (t.type !== 'gyors') {
      if (t.image) h += `<div class="pv-media has-img"><img src="${esc(t.image)}" alt=""></div>`;
      else h += `<div class="pv-media">${ico('a-image')}<span>${esc(t.media || 'Kép helye')}</span></div>`;
    }
    if (t.video) h += videoEmbedHTML(t.video, 'pv-video');
    h += `<div class="pv-q">${esc(t.question || 'A feladat kérdése…')}</div>`;
    h += `<div class="pv-answer" id="pvAnswer"></div>`;
    h += `<div class="pv-foot">`;
    if ((t.hints || []).length) h += `<button class="pv-hint-btn" id="pvHint" type="button">${ico('a-award', 'ico-sm')}Segítség kérése (${t.hints.length})</button>`;
    h += `<div id="pvHintBox"></div><div id="pvResult"></div></div>`;
    el.play.innerHTML = h;
    renderAnswerUI();
    const hb = document.getElementById('pvHint');
    if (hb) hb.addEventListener('click', showHint);
  }

  function finish(ok) {
    pv.solved = ok;
    const box = document.getElementById('pvResult');
    if (ok) {
      box.innerHTML = `<div class="pv-result good">${ico('a-check-c')}Helyes! +${cur.points} XP${pv.hints ? ' (− segítség)' : ''}</div><button class="pv-reset" type="button" id="pvReset">Előnézet újraindítása</button>`;
    } else {
      box.innerHTML = `<div class="pv-result bad">${ico('a-close')}Nem talált. Próbáld újra!</div><div class="pv-attempts">Próbálkozás: ${pv.attempts}</div>`;
    }
    const r = document.getElementById('pvReset');
    if (r) r.addEventListener('click', renderPreview);
  }
  function showHint() {
    const hs = cur.hints || []; if (pv.hints >= hs.length) return;
    const hn = hs[pv.hints]; pv.hints++;
    const box = document.getElementById('pvHintBox');
    box.insertAdjacentHTML('beforeend', `<div class="pv-hint-box"><b>${pv.hints}. nyom${hn.cost ? ' (−' + hn.cost + ' pt)' : ''}:</b> ${esc(hn.text)}</div>`);
    if (pv.hints >= hs.length) { const b = document.getElementById('pvHint'); if (b) b.disabled = true; }
  }

  function renderAnswerUI() {
    const t = cur, c = t.cfg, box = document.getElementById('pvAnswer');
    if (t.type === 'kviz') {
      let opts = c.options.map((o, i) => ({ o, i }));
      if (c.shuffle) opts = opts.sort(() => Math.random() - 0.5);
      box.innerHTML = `<div class="pv-opts">` + opts.map(x => `<button class="pv-opt" type="button" data-i="${x.i}">${esc(x.o.text || '—')}</button>`).join('') + `</div>`;
      box.querySelectorAll('.pv-opt').forEach(b => b.addEventListener('click', () => {
        if (pv.solved) return;
        const ok = c.options[+b.dataset.i] && c.options[+b.dataset.i].correct;
        pv.attempts++;
        b.classList.add(ok ? 'correct' : 'wrong');
        if (ok) { box.querySelectorAll('.pv-opt').forEach(x => x.disabled = true); finish(true); }
        else { b.disabled = true; finish(false); }
      }));
    } else if (t.type === 'szoveg') {
      box.innerHTML = `<div class="pv-input"><input type="text" id="pvIn" placeholder="Írd be a választ…"><button class="pv-check" type="button" id="pvGo">Ellenőrzés</button></div>`;
      const go = () => {
        if (pv.solved) return; const val = document.getElementById('pvIn').value; pv.attempts++;
        const ok = checkText(val, c); if (ok) finish(true); else finish(false);
      };
      document.getElementById('pvGo').addEventListener('click', go);
      document.getElementById('pvIn').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    } else if (t.type === 'kod') {
      pv.code = '';
      const digits = () => `<div class="pv-code-disp">${(c.code || '').split('').map((_, i) => `<span data-d="${i}">${pv.code[i] || ''}</span>`).join('')}</div>`;
      if (c.codeType === 'num') {
        box.innerHTML = digits() + `<div class="pv-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button type="button" data-k="${n}">${n}</button>`).join('')}<button type="button" data-k="del">⌫</button><button type="button" data-k="0">0</button><button type="button" data-k="ok" style="color:var(--lime)">OK</button></div>`;
        box.querySelectorAll('.pv-pad button').forEach(b => b.addEventListener('click', () => {
          if (pv.solved) return; const k = b.dataset.k;
          if (k === 'del') pv.code = pv.code.slice(0, -1);
          else if (k === 'ok') { pv.attempts++; finish(String(pv.code) === String(c.code)); return; }
          else if (pv.code.length < (c.code || '').length) pv.code += k;
          box.querySelector('.pv-code-disp').outerHTML = digits(); renderAnswerUI(); // egyszerű újrarajzolás
        }));
      } else {
        box.innerHTML = `<div class="pv-input"><input type="text" id="pvIn" placeholder="Írd be a kódot…"><button class="pv-check" type="button" id="pvGo">Feltör</button></div>`;
        const go = () => { if (pv.solved) return; pv.attempts++; finish(norm(document.getElementById('pvIn').value) === norm(c.code)); };
        document.getElementById('pvGo').addEventListener('click', go);
      }
    } else if (t.type === 'puzzle' && c.subtype === 'order') {
      if (!pv.order) pv.order = c.items.map((_, i) => i).sort(() => Math.random() - 0.5);
      const draw = () => {
        box.innerHTML = `<div class="pv-puzzle">` + pv.order.map((idx, pos) => `<div class="pv-pz"><span class="n">${pos + 1}</span><span class="t">${esc(c.items[idx])}</span><span class="mv"><button type="button" data-mv="up" data-pos="${pos}">▲</button><button type="button" data-mv="dn" data-pos="${pos}">▼</button></span></div>`).join('') + `</div><button class="pv-check" type="button" id="pvGo" style="width:100%;height:44px;border-radius:11px">Ellenőrzés</button>`;
        box.querySelectorAll('[data-mv]').forEach(b => b.addEventListener('click', () => {
          const pos = +b.dataset.pos, dir = b.dataset.mv === 'up' ? -1 : 1, np = pos + dir;
          if (np < 0 || np >= pv.order.length) return;
          const tmp = pv.order[pos]; pv.order[pos] = pv.order[np]; pv.order[np] = tmp; draw();
        }));
        document.getElementById('pvGo').addEventListener('click', () => {
          if (pv.solved) return; pv.attempts++;
          const correct = pv.order.filter((idx, pos) => idx === pos).length;
          if (correct === c.items.length) finish(true);
          else if (c.partial) { document.getElementById('pvResult').innerHTML = `<div class="pv-result bad">${ico('a-close')}${correct}/${c.items.length} helyes — javíts a sorrenden!</div>`; }
          else finish(false);
        });
      };
      draw();
    } else if (t.type === 'puzzle') { // match
      box.innerHTML = `<div class="pv-puzzle">` + c.pairs.map((p, i) => `<div class="pv-pz"><span class="t">${esc(p.left)}</span><span class="fe-pair-mid">→</span><select data-i="${i}" style="flex:1;background:rgb(255 255 255 / .05);border:1px solid var(--line);border-radius:8px;color:#fff;height:34px;padding:0 8px"><option value="">…</option>${c.pairs.map((q, j) => `<option value="${j}">${esc(q.right)}</option>`).join('')}</select></div>`).join('') + `</div><button class="pv-check" type="button" id="pvGo" style="width:100%;height:44px;border-radius:11px">Ellenőrzés</button>`;
      document.getElementById('pvGo').addEventListener('click', () => {
        if (pv.solved) return; pv.attempts++;
        const ok = Array.prototype.every.call(box.querySelectorAll('select'), s => String(s.value) === String(s.dataset.i));
        finish(ok);
      });
    } else {
      // foto / gps / qr / gyors — reprezentatív akció
      /* Az 'info' és a 'dontes' típus hiányzott ebből a táblázatból, ezért
         `act` undefined lett, és a következő sor `act.ic`-je KIVÉTELT dobott:
         az élő előnézet elhasalt, amint ilyen feladatot választottál. A
         'gyors' viszont már nem létező típus (az adatbázis nem engedi) —
         azt csak a visszamenőleges olvashatóság kedvéért hagyjuk itt. */
      const AKCIO = {
        foto:   { ic: 'a-camera', lbl: 'Fotó feltöltése',    txt: c.instruction || 'Készíts képet a helyszínen' },
        gps:    { ic: 'a-target', lbl: 'Helyszín igazolása', txt: 'Menj a megjelölt pontra (' + (c.radius || 30) + ' m)' },
        qr:     { ic: 'a-qr',     lbl: 'QR beolvasása',      txt: 'Keresd meg és olvasd be a kódot' },
        info:   { ic: 'a-check',  lbl: 'Megvan',             txt: c.instruction || 'Olvasd el, majd nyugtázd.' },
        dontes: { ic: 'a-route',  lbl: 'Tovább',             txt: 'Az útvonalat a döntési pont elágazása dönti el — azt a Pályák oldalon állítod be.' },
        gyors:  { ic: 'a-bolt',   lbl: 'Indítás',            txt: (c.game === 'tap' ? 'Koppints ' + (c.target || 15) + '-öt ' + (c.time || 5) + ' mp alatt' : 'Mini-játék: ' + (c.game || 'tap')) }
      };
      const act = AKCIO[t.type] || { ic: 'a-task', lbl: 'Kész', txt: 'Ehhez a típushoz nincs külön előnézet.' };
      box.innerHTML = `<div class="pv-action"><span class="big">${ico(act.ic)}</span><p>${esc(act.txt)}</p><button class="pv-do" type="button" id="pvGo">${act.lbl}</button></div>`;
      document.getElementById('pvGo').addEventListener('click', () => { if (pv.solved) return; pv.attempts++; finish(true); });
    }
  }
  function checkText(val, c) {
    if (c.numeric) { const a = parseFloat(String(val).replace(',', '.')); return c.accepted.some(x => parseFloat(String(x).replace(',', '.')) === a); }
    const v = c.tolerant ? norm(val) : String(val).trim();
    return c.accepted.some(x => { const xx = c.tolerant ? norm(x) : String(x).trim(); return c.keyword ? (v.includes(xx) && xx) : v === xx; });
  }

  /* =========================================================
     ÉRVÉNYESSÉG
     ========================================================= */
  function validate() {
    const t = cur, c = t.cfg, errs = [];
    if (!t.question.trim()) errs.push('kérdés');
    if (t.type === 'kviz') { if (c.options.filter(o => o.text.trim()).length < 2) errs.push('min. 2 válasz'); if (!c.options.some(o => o.correct && o.text.trim())) errs.push('helyes válasz'); }
    if (t.type === 'szoveg' && !c.accepted.some(a => a.trim())) errs.push('elfogadott válasz');
    if (t.type === 'puzzle') { if (c.subtype === 'order' && c.items.filter(i => i.trim()).length < 2) errs.push('min. 2 elem'); if (c.subtype === 'match' && c.pairs.filter(p => p.left.trim() && p.right.trim()).length < 2) errs.push('min. 2 pár'); }
    if (t.type === 'kod' && !String(c.code).trim()) errs.push('kód');
    /* CSAPATLÁNC. A hibás lánc néma: a szerző mindent rendben lát, a játékosok
       pedig a terepen akadnak el, három külön helyszínen. Ezért itt is szólunk,
       és a publikálás (course_lint) is blokkolja. */
    const r = t.relay || {};
    if (r.on) {
      if (RELAY_OK_TIPUS.indexOf(t.type) < 0) errs.push('a lánc ezen a típuson nem működik');
      if (!String(r.group || '').trim())      errs.push('lánc neve');
      if (!(r.total >= 2))                    errs.push('min. 2 láncszem');
      if (!(r.role >= 1 && r.role <= r.total)) errs.push('a láncszem sorszáma 1 és ' + (r.total || 2) + ' közé essen');
    }
    return errs;
  }
  function refreshValidity() {
    const errs = validate();
    if (errs.length) { el.valid.textContent = 'Hiányzik: ' + errs.join(', '); el.valid.className = 'fe-valid err'; }
    else { el.valid.textContent = '✓ Kitöltve — menthető'; el.valid.className = 'fe-valid ok'; }
  }

  /* =========================================================
     MEZŐK ↔ MUNKAPÉLDÁNY
     ========================================================= */
  function fillBase() {
    el.q.value = cur.question; el.cq.textContent = cur.question.length;
    /* Előbb a játék, aztán a HOZZÁ TARTOZÓ állomások — a két lista eddig
       független volt, ezért más játékhoz nem lehetett feladatot rendelni:
       az állomás-lista nem követte a játék-választást. */
    el.route.value = cur.route;
    if (el.route.selectedIndex < 0 && el.route.options.length) {
      el.route.selectedIndex = 0; cur.route = el.route.value;
    }
    szurtAllomasok(cur.route);
    el.station.value = cur.station;
    if (el.station.selectedIndex < 0 && el.station.options.length) {
      el.station.selectedIndex = 0; cur.station = el.station.value;
    }
    el.diff.value = cur.diff; applyDiffDot();
    el.points.value = cur.points;
    el.status.value = (STATUS[cur.status] || STATUS.draft).label; applyStatusDot();
    el.rewardXp.value = cur.points + ' XP';
    el.badge.value = cur.badge || '';
    relayFill();
  }

  /* =========================================================
     CSAPATLÁNC (váltó) — típusfüggetlen szekció

     A lánc NEM új feladattípus, hanem kapcsoló a meglévők fölött: a
     tasks.config 'relay' kulcsa alatt utazik. Egy új tasks.kind érték
     20-26 ponton igényelne módosítást (négy párhuzamos típustábla,
     ikon-sprite-ok, varázsló-generátor, érzés × típus mátrix), és a
     megoldás-hash láncát is átírná.
     ========================================================= */
  const RELAY_OK_TIPUS = ['kviz', 'szoveg', 'kod', 'puzzle'];
  const rEl = id => document.getElementById(id);

  function relayFill() {
    const r = (cur && cur.relay) || {};
    const be = !!r.on;
    const kapcs = rEl('feRelayOn'); if (!kapcs) return;
    kapcs.setAttribute('aria-checked', String(be));
    const test = rEl('feRelayBody'); if (test) test.hidden = !be;
    rEl('feRelayGroup').value = r.group || '';
    rEl('feRelayRole').value  = r.role  || 1;
    rEl('feRelayTotal').value = r.total || 3;
    rEl('feRelayGrace').value = r.graceMin || 8;
    rEl('feRelayNote').value  = (cur.cfg && cur.cfg.noteLabel) || '';
    relayTiltas();
  }

  /* Az auto_ok típusoknál (fotó/GPS/QR/…) a kliens nem küld választ, tehát a
     közös tábla „kész" sort mutatna ÜRES válasszal — pont azt nem kapná meg
     a következő játékos, amiért a lánc létezik. Ezért a kapcsoló ott tiltott. */
  function relayTiltas() {
    const kapcs = rEl('feRelayOn'); if (!kapcs) return;
    const jo = RELAY_OK_TIPUS.indexOf(cur.type) > -1;
    kapcs.disabled = !jo;
    const sec = kapcs.closest('.fe-relay-sec');
    if (sec) sec.classList.toggle('is-tiltott', !jo);
    if (!jo && cur.relay && cur.relay.on) {
      cur.relay.on = false;
      kapcs.setAttribute('aria-checked', 'false');
      const test = rEl('feRelayBody'); if (test) test.hidden = true;
    }
  }

  function relayOlvas() {
    if (!rEl('feRelayOn')) return;
    cur.relay = cur.relay || {};
    cur.relay.on    = rEl('feRelayOn').getAttribute('aria-checked') === 'true';
    cur.relay.group = String(rEl('feRelayGroup').value || '').trim();
    cur.relay.role  = Math.max(1, Math.min(12, parseInt(rEl('feRelayRole').value, 10)  || 1));
    cur.relay.total = Math.max(2, Math.min(12, parseInt(rEl('feRelayTotal').value, 10) || 2));
    cur.relay.graceMin = Math.max(1, Math.min(60, parseInt(rEl('feRelayGrace').value, 10) || 8));
    const jegyzet = String(rEl('feRelayNote').value || '').trim();
    cur.cfg = cur.cfg || {};
    if (jegyzet) cur.cfg.noteLabel = jegyzet; else delete cur.cfg.noteLabel;
  }

  (function wireRelay() {
    const kapcs = rEl('feRelayOn'); if (!kapcs) return;
    kapcs.addEventListener('click', () => {
      if (kapcs.disabled) return;
      const uj = kapcs.getAttribute('aria-checked') !== 'true';
      kapcs.setAttribute('aria-checked', String(uj));
      const test = rEl('feRelayBody'); if (test) test.hidden = !uj;
      relayOlvas(); refreshValidity();
    });
    ['feRelayGroup', 'feRelayRole', 'feRelayTotal', 'feRelayGrace', 'feRelayNote'].forEach(id => {
      const e = rEl(id); if (!e) return;
      e.addEventListener('input', () => { relayOlvas(); refreshValidity(); });
    });
  })();
  function applyDiffDot() { const dk = DIFF_KEY[cur.diff] || 'kozepes'; el.diffDot.style.background = DIFF_COLOR[dk]; }
  function applyStatusDot() { const st = STATUS[cur.status] || STATUS.draft; el.statusDot.style.background = st.color; el.statusDot.style.boxShadow = st.glow ? '0 0 6px ' + st.color : 'none'; }

  function renderEditor() { renderTypeGrid(); renderTypeConfig(); renderHints(); renderPreview(); renderTaskImage(); renderTaskVideo(); refreshValidity(); }

  function openEditor(id) {
    const src = id != null ? byId(id) : null;
    curId = id != null ? id : null;
    /* Új feladat alapértéke: LÉTEZŐ állomás. Korábban a rég törölt demó
       („Főbejárat" / „Városliget Felfedező") volt beírva, ezért a
       legördülők üresen nyíltak, és a mentés elhasalt. Ha játékra szűrve
       érkeztünk, annak az első állomását kapjuk. */
    const elsoAllomas = (CEL_PALYA
      ? STATIONS_OPT.find(s => String(s.course_id) === CEL_PALYA)
      : STATIONS_OPT[0]) || STATIONS_OPT[0] || {};
    cur = src ? clone(src) : { question: '', station: elsoAllomas.name || '', route: elsoAllomas.course_name || '', type: 'kviz', points: 30, diff: 'Könnyű', status: 'draft', media: '', image: '', video: '', hints: [], badge: '', relay: { on: false }, cfg: defaultCfg('kviz') };
    if (!cur.cfg) cur.cfg = defaultCfg(cur.type);
    if (!cur.relay) cur.relay = { on: false };
    el.title.textContent = curId ? 'Feladat szerkesztése' : 'Új feladat';
    fillBase(); renderEditor();
    ov.classList.remove('is-hidden'); ov.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    el.q.focus();
  }
  function closeEditor() { ov.classList.add('is-hidden'); ov.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }

  function allomasIdNevbol(nev, palya) {
    const p = STATIONS_OPT.filter(s => s.name === nev);
    if (!p.length) return null;
    const egyezo = palya ? p.find(s => s.course_name === palya) : null;
    return (egyezo || p[0]).id;
  }

  function ujratolt(uzenet, alcim) {
    return betolt().then(() => {
      render();
      if (uzenet) toast(uzenet, { type: 'ok', sub: alcim });
      try { localStorage.removeItem('uq_catalog_v1'); } catch (e) {}
    });
  }
  function hibaToast(err) {
    toast('Nem sikerült', { type: 'warn', sub: String((err && err.message) || 'Ismeretlen hiba') });
  }

  function saveEditor() {
    const errs = validate();
    if (errs.length) { toast('Hiányzó mezők', { type: 'error', sub: errs.join(', ') }); refreshValidity(); return; }
    cur.question = cur.question.trim();

    /* A VÁLASZTOTT állomás nyer, nem az eredeti: a fordított sorrend miatt
       létező feladatnál a rövidzár mindig a régi station_id-t adta vissza,
       ezért a feladatot nem lehetett másik állomáshoz átrakni — a mentés
       sikert jelzett, a sor mégsem változott. */
    const stId = allomasIdNevbol(cur.station, cur.route) ||
                 (curId != null ? (byId(curId) || {}).stationId : null);
    if (!stId) {
      toast('Nincs meg az állomás', { type: 'error',
        sub: 'Válassz létező állomást — a feladat csak állomáshoz menthető.' });
      return;
    }

    UQAPI.rest('/rpc/save_task', { method: 'POST', body: { p: {
      id: curId || null,
      station_id: stId,
      kind: cur.type,
      question: cur.question,
      points: String(cur.points || 0),
      status: cur.status || 'active',
      image: cur.image || cur.media || '',
      /* A videó saját oszlopba megy. A nehézség és a kitűző továbbra is a
         config-ban utazik — azoknak nincs külön oszlopuk. */
      video: cur.video || '',
      /* A relay NEM megoldás-adat, ezért a cfgMegoldasNelkul() és a
         megoldasCfgbol() érintetlen marad — a lánc leírója a config mellé
         kerül, a nehézség és a kitűző mintájára. */
      config: Object.assign(cfgMegoldasNelkul(cur.type, cur.cfg), {
        difficulty: cur.diff || '', badge: cur.badge || '',
        relay: (cur.relay && cur.relay.on) ? cur.relay : { on: false }
      }),
      solution: megoldasCfgbol(cur.type, cur.cfg),
      hints: (cur.hints || []).filter(h => h && h.text)
    } } })
      /* A szerkesztő CSAK sikeres mentés után zárul. Korábban a closeEditor()
         a lánc után, szinkronban futott: ha a mentés elbukott, a panel
         bezárult és a beírt munka elveszett — csak egy hibaüzenet maradt. */
      .then(() => {
        closeEditor();
        /* A játékos a pálya BEFAGYASZTOTT verziójából játszik, ezért a
           mentés önmagában sosem jutna el a játékig. Az érintett játékot
           automatikusan újrapublikáljuk — enélkül a feladat csak az admin
           listában létezne, a játékban nem. */
        /* A mentés BEFAGYASZT egy verziót, de NEM tesz élesre: a játékosok a
           legutóbb közzétettet játsszák tovább. Ezt ki kell mondani, különben
           a szerző azt hiszi, kész van. Élesíteni a Játékok oldalon lehet. */
        return frissenTartPalyat(stId).then(() =>
          ujratolt('Feladat elmentve',
            (cur.question.length > 42 ? cur.question.slice(0, 42) + '…' : cur.question) +
            ' — a játékosokhoz a Játékok oldal Közzététel gombjával jut el'));
      })
      .catch(hibaToast);
  }

  /* Az állomáshoz tartozó játék újrapublikálása. Hibája nem nyeli el a
     mentés sikerét: a feladat ilyenkor is elmentődött, csak a figyelmeztetés
     szól (pl. „állomás koordináta nélkül"). */
  function frissenTartPalyat(stationId) {
    const st = STATIONS_OPT.find(s => String(s.id) === String(stationId));
    if (!st || !st.course_id) return Promise.resolve();
    return UQAPI.rest('/rpc/publish_course', { method: 'POST', body: { p_course: st.course_id } })
      .then(r => {
        const v = Array.isArray(r) ? r[0] : r;
        if (v && v.warnings && v.warnings.length) {
          toast('Figyelmeztetés a pályán', { type: 'info', sub: v.warnings.join('; ') });
        }
      })
      .catch(e => { toast('A játék frissítése nem sikerült', { type: 'error', sub: String(e && e.message || '') + ' — a feladat elmentődött, a Közzététel gombbal frissítheted.' }); });
  }

  /* =========================================================
     SZERKESZTŐ ESEMÉNYEK
     ========================================================= */
  // típus váltás
  el.typeGrid.addEventListener('click', e => {
    const c = e.target.closest('.fe-typecard'); if (!c) return;
    const nt = c.dataset.type; if (nt === cur.type) return;
    cur.type = nt; cur.cfg = defaultCfg(nt);
    /* A típusváltás nullázza a cfg-t, ezért a lánc „nyers leolvasás" címkéjét
       újra be kell írni — és ha az új típus nem láncozható, a kapcsoló kikapcsol. */
    renderTypeGrid(); renderTypeConfig(); renderPreview();
    relayTiltas(); relayOlvas(); refreshValidity();
  });
  // alapmezők
  el.q.addEventListener('input', () => { cur.question = el.q.value; el.cq.textContent = el.q.value.length; document.querySelector('.pv-q').textContent = el.q.value || 'A feladat kérdése…'; refreshValidity(); });
  el.route.addEventListener('change', () => {
    cur.route = el.route.value;
    /* játék-váltáskor az állomás-lista is az új játékra szűr */
    szurtAllomasok(cur.route);
    if (el.station.options.length) {
      el.station.selectedIndex = 0;
      cur.station = el.station.value;
      const s = document.querySelector('.pv-station'); if (s) s.innerHTML = ico('a-pin') + esc(cur.station);
    }
  });
  el.station.addEventListener('change', () => { cur.station = el.station.value; const s = document.querySelector('.pv-station'); if (s) s.innerHTML = ico('a-pin') + esc(cur.station); });
  el.diff.addEventListener('change', () => { cur.diff = el.diff.value; applyDiffDot(); });
  el.points.addEventListener('input', () => { cur.points = Math.max(0, parseInt(el.points.value, 10) || 0); el.rewardXp.value = cur.points + ' XP'; const x = document.querySelector('.pv-badge.xp'); if (x) x.textContent = cur.points + ' XP'; });
  el.status.addEventListener('change', () => { cur.status = STATUS_BY_LABEL[el.status.value] || 'draft'; applyStatusDot(); });
  el.badge.addEventListener('change', () => { cur.badge = el.badge.value; });
  document.getElementById('feSuggest').addEventListener('click', () => { cur.points = DIFF_POINTS[cur.diff] || 40; el.points.value = cur.points; el.rewardXp.value = cur.points + ' XP'; const x = document.querySelector('.pv-badge.xp'); if (x) x.textContent = cur.points + ' XP'; toast('Pont-javaslat alkalmazva', { type: 'info', sub: cur.diff + ' → ' + cur.points + ' XP' }); });

  // típus-konfig (delegált) — input/change
  function cfgListName() { const l = el.typeCfg.querySelector('[data-list]'); return l ? l.dataset.list : null; }
  el.typeCfg.addEventListener('input', e => {
    const c = cur.cfg, f = e.target.dataset.f;
    const item = e.target.closest('.fe-item'); const i = item ? +item.dataset.i : -1;
    if (f === 'text' && i >= 0) c.options[i].text = e.target.value;
    else if (f === 'acc' && i >= 0) c.accepted[i] = e.target.value;
    else if (f === 'item' && i >= 0) c.items[i] = e.target.value;
    else if (f === 'left' && i >= 0) c.pairs[i].left = e.target.value;
    else if (f === 'right' && i >= 0) c.pairs[i].right = e.target.value;
    else if (f === 'code') c.code = e.target.value;
    else if (f === 'instruction') c.instruction = e.target.value;
    else if (f === 'lat') c.lat = parseFloat(e.target.value);
    else if (f === 'lng') c.lng = parseFloat(e.target.value);
    else if (f === 'radius') c.radius = parseInt(e.target.value, 10);
    else if (f === 'time') c.time = parseInt(e.target.value, 10);
    else if (f === 'target') c.target = parseInt(e.target.value, 10);
    renderPreview(); refreshValidity();
  });
  el.typeCfg.addEventListener('change', e => {
    const c = cur.cfg, f = e.target.dataset.f;
    if (f === 'correct') { const i = +e.target.closest('.fe-item').dataset.i; c.options[i].correct = e.target.checked; e.target.closest('.fe-item').classList.toggle('is-correct', e.target.checked); renderPreview(); refreshValidity(); }
    else if (f === 'subtype') {
      c.subtype = e.target.value;
      /* Az élő adatban a puzzle-konfigban csak `items` van, `pairs` nincs.
         „Párosítás"-ra váltva a renderTypeConfig a nem létező c.pairs-en
         szállt el, és utána a Mentés is némán elhalt. */
      if (!Array.isArray(c.pairs)) c.pairs = [];
      if (!Array.isArray(c.items)) c.items = [];
      renderTypeConfig(); renderPreview(); refreshValidity();
    }
    else if (f === 'codeType') { c.codeType = e.target.value; renderPreview(); }
    else if (f === 'game') { c.game = e.target.value; renderPreview(); }
  });
  // toggle-ök + add/rm/move/regen (click delegálva)
  el.typeCfg.addEventListener('click', e => {
    const c = cur.cfg;
    const tg = e.target.closest('[data-tg]');
    if (tg) { const f = tg.dataset.tg; c[f] = !c[f]; tg.classList.toggle('is-on', c[f]); tg.setAttribute('aria-checked', c[f]); renderPreview(); refreshValidity(); return; }
    const add = e.target.closest('[data-add]');
    if (add) {
      const w = add.dataset.add;
      if (w === 'opt') c.options.push({ text: '', correct: false });
      else if (w === 'acc') c.accepted.push('');
      else if (w === 'items') c.items.push('Új elem');
      else if (w === 'pairs') c.pairs.push({ left: '', right: '' });
      renderTypeConfig(); renderPreview(); refreshValidity(); return;
    }
    const rm = e.target.closest('[data-rm]');
    if (rm) {
      const i = +rm.closest('.fe-item').dataset.i, list = cfgListName();
      if (list === 'opt') c.options.splice(i, 1);
      else if (list === 'acc') c.accepted.splice(i, 1);
      else if (list === 'items') c.items.splice(i, 1);
      else if (list === 'pairs') c.pairs.splice(i, 1);
      renderTypeConfig(); renderPreview(); refreshValidity(); return;
    }
    const mv = e.target.closest('[data-mv]');
    if (mv) {
      const i = +mv.closest('.fe-item').dataset.i, dir = mv.dataset.mv === 'up' ? -1 : 1, j = i + dir;
      if (j < 0 || j >= c.items.length) return;
      const tmp = c.items[i]; c.items[i] = c.items[j]; c.items[j] = tmp;
      renderTypeConfig(); renderPreview(); refreshValidity(); return;
    }
    if (e.target.closest('[data-regen]')) { c.code = 'UQ-KOD-' + Math.floor(1000 + Math.random() * 9000); renderTypeConfig(); renderPreview(); toast('Új QR-kód generálva', { type: 'info', sub: c.code }); }
  });

  // nyomok
  document.getElementById('feAddHint').addEventListener('click', () => { if ((cur.hints || []).length >= 3) { toast('Legfeljebb 3 nyom', { type: 'info' }); return; } cur.hints = cur.hints || []; cur.hints.push({ text: '', cost: 5 }); renderHints(); renderPreview(); });

  /* =========================================================
     KÉP — feltöltés / Média-tárból / eltávolítás
     ========================================================= */
  const feMediaThumb = document.getElementById('feMediaThumb');
  const feMediaInput = document.getElementById('feMediaInput');
  const feMediaRemove = document.getElementById('feMediaRemove');
  const feMediaModal = document.getElementById('feMediaModal');
  const feMediaGrid = document.getElementById('feMediaGrid');

  function renderTaskImage() {
    if (!feMediaThumb) return;
    if (cur && cur.image) {
      feMediaThumb.innerHTML = `<img src="${esc(cur.image)}" alt="">`;
      feMediaThumb.classList.add('has-img');
      if (feMediaRemove) feMediaRemove.hidden = false;
    } else {
      feMediaThumb.innerHTML = ico('a-image');
      feMediaThumb.classList.remove('has-img');
      if (feMediaRemove) feMediaRemove.hidden = true;
    }
  }
  function setTaskImage(src) { if (!cur) return; cur.image = src || ''; renderTaskImage(); renderPreview(); }

  /* a kép lekicsinyítése/tömörítése, hogy elférjen a helyi tárban (kvóta) */
  function processImageSrc(dataUrl, cb) {
    if (!dataUrl) { cb(''); return; }
    const img = new Image();
    img.onload = function () {
      const max = 1000;
      let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      if (!w || !h) { cb(dataUrl); return; }
      if (w > max || h > max) { const r = Math.min(max / w, max / h); w = Math.round(w * r); h = Math.round(h * r); }
      try {
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        const out = c.toDataURL('image/jpeg', 0.82);
        cb(out && out.length < dataUrl.length ? out : dataUrl);
      } catch (e) { cb(dataUrl); }
    };
    img.onerror = function () { cb(dataUrl); };
    img.src = dataUrl;
  }

  document.getElementById('feMediaUpload').addEventListener('click', () => feMediaInput.click());
  feMediaInput.addEventListener('change', () => {
    const f = feMediaInput.files && feMediaInput.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => processImageSrc(rd.result, url => { setTaskImage(url); toast('Kép feltöltve', { sub: f.name }); });
    rd.readAsDataURL(f);
    feMediaInput.value = '';
  });
  feMediaRemove.addEventListener('click', () => { setTaskImage(''); toast('Kép eltávolítva', { type: 'info' }); });

  let mediaMode = 'image';
  const feMediaModalTitle = document.getElementById('feMediaModalTitle');
  /* A választó a localStorage 'uq_media_v1' kulcsát olvasta — egy halott
     tárolót, amit a média Supabase Storage-ba költözésekor senki nem
     követett —, ezért MINDIG üresnek látszott. Most ugyanabból a nézetből
     dolgozik, mint a Média oldal. */
  function openMediaPicker(mode) {
    mediaMode = mode || 'image';
    if (feMediaModalTitle) feMediaModalTitle.textContent = mediaMode === 'video' ? 'Videó a Média-tárból' : 'Kép a Média-tárból';
    feMediaGrid.innerHTML = '<div class="fe-mp-empty">Betöltés…</div>';
    feMediaModal.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    const kert = mediaMode === 'video' ? 'video' : 'image';
    Promise.resolve(window.UQAPI
      ? UQAPI.rest('/v_admin_media?select=id,title,kind,url&kind=eq.' + kert + '&order=created_at.desc').catch(() => [])
      : []
    ).then(rows => {
      const items = (rows || []).filter(m => m && m.url);
      if (!items.length) {
        feMediaGrid.innerHTML = '<div class="fe-mp-empty">Nincs feltöltött ' + (mediaMode === 'video' ? 'videó' : 'kép') +
          ' a Média-tárban. Tölts fel a <a href="media.html">Média oldalon</a>, vagy használd a fenti gombokat.</div>';
      } else if (mediaMode === 'video') {
        feMediaGrid.innerHTML = items.map(m => `<button class="fe-mp-item fe-mp-vid" type="button" data-src="${esc(m.url)}"><span class="fe-mp-vic">${ico('a-play-c')}</span><span>${esc(m.title || 'videó')}</span></button>`).join('');
      } else {
        feMediaGrid.innerHTML = items.map(m => `<button class="fe-mp-item" type="button" data-src="${esc(m.url)}"><img src="${esc(m.url)}" alt=""><span>${esc(m.title || 'kép')}</span></button>`).join('');
      }
    });
  }
  function closeMediaPicker() { feMediaModal.classList.remove('is-open'); document.body.style.overflow = ''; }
  document.getElementById('feMediaPick').addEventListener('click', () => openMediaPicker('image'));
  feMediaModal.querySelectorAll('[data-femp-close]').forEach(b => b.addEventListener('click', closeMediaPicker));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && feMediaModal.classList.contains('is-open')) closeMediaPicker(); });

  /* a Média-tár rácsban kattintás: kép vagy videó a mód szerint */
  feMediaGrid.addEventListener('click', e => {
    const b = e.target.closest('.fe-mp-item');
    if (!b) return;
    closeMediaPicker();
    if (mediaMode === 'video') { setTaskVideo(b.dataset.src); toast('Videó kiválasztva'); }
    else processImageSrc(b.dataset.src, url => { setTaskImage(url); toast('Kép kiválasztva'); });
  });

  /* =========================================================
     VIDEÓ — link / feltöltés / Média-tárból / eltávolítás
     ========================================================= */
  const feVideoThumb = document.getElementById('feVideoThumb');
  const feVideoInput = document.getElementById('feVideoInput');
  const feVideoRemove = document.getElementById('feVideoRemove');
  const feVideoUrl = document.getElementById('feVideoUrl');

  /* videó-felismerő: YouTube / Vimeo / közvetlen fájl (mp4/webm/ogg) / data URI */
  function parseVideo(url) {
    url = String(url == null ? '' : url).trim();
    if (!url) return null;
    if (/^data:video\//i.test(url) || /\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return { kind: 'file', src: url };
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if (yt) return { kind: 'youtube', id: yt[1], embed: 'https://www.youtube.com/embed/' + yt[1] };
    const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vm) return { kind: 'vimeo', id: vm[1], embed: 'https://player.vimeo.com/video/' + vm[1] };
    return { kind: 'url', src: url };
  }
  /* beágyazott lejátszó HTML (előnézet + játékos-nézet) */
  function videoEmbedHTML(url, cls) {
    const v = parseVideo(url);
    if (!v) return '';
    if (v.kind === 'youtube' || v.kind === 'vimeo')
      return '<div class="' + (cls || '') + '"><iframe src="' + esc(v.embed) + '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>';
    return '<div class="' + (cls || '') + '"><video src="' + esc(v.src || url) + '" controls playsinline preload="metadata"></video></div>';
  }
  function videoKindLabel(url) {
    const v = parseVideo(url);
    if (!v) return '';
    return v.kind === 'youtube' ? 'YouTube' : v.kind === 'vimeo' ? 'Vimeo' : v.kind === 'file' ? 'Feltöltött videó' : 'Videó-link';
  }

  function renderTaskVideo() {
    if (!feVideoThumb) return;
    if (cur && cur.video) {
      feVideoThumb.innerHTML = videoEmbedHTML(cur.video, 'fe-vthumb-embed');
      feVideoThumb.classList.add('has-vid');
      if (feVideoRemove) feVideoRemove.hidden = false;
      if (feVideoUrl && feVideoUrl.value !== cur.video && parseVideo(cur.video) && parseVideo(cur.video).kind !== 'file') feVideoUrl.value = cur.video;
    } else {
      feVideoThumb.innerHTML = ico('a-video');
      feVideoThumb.classList.remove('has-vid');
      if (feVideoRemove) feVideoRemove.hidden = true;
    }
  }
  function setTaskVideo(src) { if (!cur) return; cur.video = src || ''; renderTaskVideo(); renderPreview(); }

  /* link hozzáadása */
  function addVideoUrl() {
    const url = (feVideoUrl.value || '').trim();
    if (!url) { toast('Illessz be egy videó-linket', { type: 'info' }); return; }
    const v = parseVideo(url);
    const looksUrl = /^https?:\/\//i.test(url) || /^data:video\//i.test(url);
    if (!v || (v.kind === 'url' && !looksUrl)) { toast('Nem ismerhető fel a link', { type: 'error', sub: 'YouTube / Vimeo / .mp4 URL' }); return; }
    setTaskVideo(url);
    toast('Videó hozzáadva', { sub: videoKindLabel(url) });
  }
  document.getElementById('feVideoAdd').addEventListener('click', addVideoUrl);
  feVideoUrl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addVideoUrl(); } });

  /* videófájl feltöltése (max. 5 MB — a nagyobb nem fér a helyi tárba) */
  document.getElementById('feVideoUpload').addEventListener('click', () => feVideoInput.click());
  feVideoInput.addEventListener('change', () => {
    const f = feVideoInput.files && feVideoInput.files[0];
    feVideoInput.value = '';
    if (!f) return;
    if (!/^video\//i.test(f.type)) { toast('Ez nem videófájl', { type: 'error' }); return; }
    if (f.size > 5 * 1024 * 1024) { toast('A videó túl nagy', { type: 'error', sub: 'Max. 5 MB — használj inkább linket' }); return; }
    const rd = new FileReader();
    rd.onload = () => { setTaskVideo(rd.result); toast('Videó feltöltve', { sub: f.name }); };
    rd.onerror = () => toast('Nem sikerült beolvasni', { type: 'error' });
    rd.readAsDataURL(f);
  });
  feVideoRemove.addEventListener('click', () => { setTaskVideo(''); if (feVideoUrl) feVideoUrl.value = ''; toast('Videó eltávolítva', { type: 'info' }); });
  document.getElementById('feVideoPick').addEventListener('click', () => openMediaPicker('video'));
  el.hints.addEventListener('input', e => { const i = +e.target.closest('.fe-item').dataset.i, f = e.target.dataset.hf; if (f === 'text') cur.hints[i].text = e.target.value; else if (f === 'cost') cur.hints[i].cost = parseInt(e.target.value, 10) || 0; });
  el.hints.addEventListener('click', e => { const rm = e.target.closest('[data-hrm]'); if (!rm) return; cur.hints.splice(+rm.closest('.fe-item').dataset.i, 1); renderHints(); renderPreview(); });

  // felső: mentés / bezárás / mobil
  document.getElementById('feSave').addEventListener('click', saveEditor);
  document.getElementById('feClose').addEventListener('click', closeEditor);
  document.getElementById('feMobileToggle').addEventListener('click', () => el.phone.classList.toggle('wide'));
  window.addEventListener('keydown', e => {
    if (ov.classList.contains('is-hidden')) return;
    if (e.key === 'Escape') closeEditor();
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveEditor(); }
  });

  /* =========================================================
     TÁBLÁZAT ESEMÉNYEK
     ========================================================= */
  function duplicateTask(id) {
    const src = byId(id); if (!src) return;
    UQAPI.rest('/rpc/save_task', { method: 'POST', body: { p: {
      station_id: src.stationId,
      kind: src.type,
      video: src.video || '',
      question: src.question + ' (másolat)',
      points: String(src.points || 0),
      status: 'draft',
      /* a kép is a feladat része — a másolat eddig elvesztette */
      image: src.image || src.media || '',
      config: cfgMegoldasNelkul(src.type, src.cfg),
      solution: megoldasCfgbol(src.type, src.cfg),
      hints: src.hints || []
    } } })
      .then(() => frissenTartPalyat(src.stationId))
      .then(() => ujratolt('Feladat duplikálva', src.question.slice(0, 42)))
      .catch(hibaToast);
  }

  function deleteTask(id) {
    const t = byId(id); if (!t) return;
    const q = t.question.length > 60 ? t.question.slice(0, 60) + '…' : t.question;
    if (!window.confirm(
      'Feladat törlése — nincs visszavonás.\n\n' + q + '\n(' + t.station + ' · ' + t.route + ')\n\n' +
      'Biztosan törlöd?')) return;
    UQAPI.rest('/rpc/delete_task', { method: 'POST', body: { p_task: id } })
      /* a játékból is tűnjön el, ne csak az admin listából */
      .then(() => frissenTartPalyat(t.stationId))
      .then(() => ujratolt('Feladat törölve — a játékból is', q))
      .catch(hibaToast);
  }

  tbody.addEventListener('click', e => {
    const row = e.target.closest('.jtk-row'); if (!row) return;
    const id = row.dataset.id;   // UUID, nem szám
    const actBtn = e.target.closest('.jtk-act');
    if (actBtn) { const act = actBtn.dataset.act; if (act === 'edit') openEditor(id); else if (act === 'copy') duplicateTask(id); else if (act === 'delete') deleteTask(id); return; }
    openEditor(id);
  });
  pagerEl.addEventListener('click', e => {
    const btn = e.target.closest('.jtk-pg'); if (!btn || btn.disabled) return;
    if (btn.classList.contains('jtk-pg-prev')) state.page = Math.max(1, state.page - 1);
    else if (btn.classList.contains('jtk-pg-next')) state.page = state.page + 1;
    else if (btn.dataset.page) state.page = parseInt(btn.dataset.page, 10) || 1;
    render();
  });
  topSearch.addEventListener('input', () => { state.search = topSearch.value; state.page = 1; render(); });
  typeFilter.addEventListener('change', () => { state.type = typeFilter.value; state.page = 1; render(); });
  perPageSel.addEventListener('change', () => { state.perPage = parseInt(perPageSel.value, 10) || 10; state.page = 1; render(); });
  document.getElementById('btnNewTask').addEventListener('click', () => openEditor(null));

  /* felső sáv: mentés / közzététel / user
     Mind a négy gomb csak egy sikeres visszajelzést írt ki és SEMMIT nem
     csinált — a Kijelentkezés sem jelentkeztetett ki. Most vagy valódi
     műveletet végeznek, vagy őszintén megmondják, hogy hol a helyük. */
  document.getElementById('btnSave').addEventListener('click', () => {
    if (ov && !ov.classList.contains('is-hidden')) { saveEditor(); return; }
    toast('Nincs mit menteni', { type: 'info', sub: 'Nyiss meg egy feladatot a szerkesztéshez.' });
  });

  /* A feladat önmagában nem „publikálható": a játékos a pálya befagyasztott
     verziójából játszik. Ezért a közzététel a PÁLYÁRA vonatkozik. */
  function palyatKozzetesz() {
    const cel = CEL_PALYA || (TASKS[0] || {}).courseId;
    if (!cel) { toast('Nincs mit közzétenni', { type: 'error', sub: 'Előbb válassz játékot a Játékok oldalon.' }); return; }
    const nev = (TASKS.find(t => String(t.courseId) === String(cel)) || {}).route || 'A játék';
    UQAPI.rest('/rpc/publish_course', { method: 'POST', body: { p_course: cel } })
      .then(r => {
        const v = Array.isArray(r) ? r[0] : r;
        const figy = (v && v.warnings && v.warnings.length) ? ' — figyelmeztetés: ' + v.warnings.join('; ') : '';
        toast('Közzétéve', { sub: nev + ' (v' + (v && v.version) + ')' + figy });
      })
      .catch(hibaToast);
  }
  document.getElementById('btnPublish').addEventListener('click', palyatKozzetesz);

  document.querySelectorAll('[data-pub]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.pub;
    if (a === 'now') palyatKozzetesz();
    else if (a === 'schedule') {
      window.location.href = 'idozitesek.html' + (CEL_PALYA ? '?game=' + encodeURIComponent(CEL_PALYA) : '');
    } else if (a === 'draft') {
      toast('A státusz feladatonként állítható', { type: 'info', sub: 'Nyisd meg a feladatot, és állítsd Vázlatra.' });
    }
  }));

  /* A Fiók legördülőt a közös uq-admin-fejlec.js kezeli. */

  /* =========================================================
     INDÍTÁS — az adatbázisból töltünk, ezért aszinkron
     ========================================================= */
  function ures(html) { if (emptyEl) { emptyEl.hidden = false; emptyEl.innerHTML = html; } }

  /* Az állomás-lista MINDIG a választott játékra szűr. Korábban az összes
     játék összes állomása egyetlen ömlesztett listában volt, a játék-választó
     pedig semmit nem csinált — ezért tűnt úgy, hogy csak egy játékhoz lehet
     feladatot rendelni. */
  function szurtAllomasok(palyaNev) {
    if (!el.station) return;
    const lista = palyaNev
      ? STATIONS_OPT.filter(s => s.course_name === palyaNev)
      : STATIONS_OPT;
    el.station.innerHTML = lista
      .map(s => `<option value="${esc(s.name)}">${esc(s.name)}</option>`).join('');
  }

  function toltAllomasValaszto() {
    if (!el.route) return;
    const palyak = [...new Set(STATIONS_OPT.map(s => s.course_name))];
    el.route.innerHTML = palyak.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
    szurtAllomasok(el.route.value);
  }

  function indul() {
    if (!window.UQAPI || !UQAPI.user()) {
      ures('<p><b>Nem vagy bejelentkezve.</b></p>' +
           '<p>A feladatok szerkesztéséhez admin fiók kell.</p>' +
           '<p><a class="adm-btn adm-btn-lime" href="bejelentkezes.html?next=feladatok.html">Bejelentkezés</a></p>');
      return;
    }
    betolt()
      .then(() => {
        toltAllomasValaszto();
        render();
        if (!TASKS.length) {
          ures('<p><b>Még nincs egyetlen feladat sem.</b></p>' +
               (STATIONS_OPT.length
                 ? '<p>Hozz létre újat a fenti gombbal.</p>'
                 : '<p>Előbb állomás kell — vedd fel az <a href="allomasok.html">Állomások</a> oldalon.</p>'));
        }
        fromHash();
      })
      .catch(err => ures('<p><b>A feladatok nem tölthetők be.</b></p><p>' +
                         esc(String(err && err.message || '')) + '</p>'));
  }

  /* mély-link: #new vagy #edit-<uuid> megnyitja a szerkesztőt */
  function fromHash() {
    const h = location.hash;
    if (h === '#new') {
      openEditor(null);
      const st = new URLSearchParams(location.search).get('station');
      if (st) {
        cur.station = st;
        if (el.station && Array.prototype.some.call(el.station.options, o => o.value === st)) el.station.value = st;
        const ps = document.querySelector('.pv-station'); if (ps) ps.innerHTML = ico('a-pin') + esc(st);
      }
    } else if (/^#edit-[0-9a-f-]{36}$/i.test(h)) {
      const id = h.slice(6);
      if (byId(id)) openEditor(id);
    }
  }
  window.addEventListener('hashchange', fromHash);

  indul();
  if (window.UQAPI) UQAPI.onAuth(() => indul());
})();
