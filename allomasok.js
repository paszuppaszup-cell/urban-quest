/* =========================================================
   URBAN QUEST — KÖZÖS ADMIN UI (scaffold)
   toast / legördülő / oldalsáv-összecsukás / nav — window.UQ export
   ========================================================= */
(function () {
  'use strict';

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var ico = function (id, cls) {
    return '<svg class="ico ' + (cls || '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>';
  };

  /* ---------- TOAST ---------- */
  function ensureToastWrap() {
    var w = document.getElementById('uqToasts');
    if (!w) {
      w = document.createElement('div');
      w.className = 'uq-toast-wrap';
      w.id = 'uqToasts';
      document.body.appendChild(w);
    }
    return w;
  }
  function toast(msg, opts) {
    opts = opts || {};
    var type = opts.type || 'ok';
    var sub = opts.sub || '';
    var wrap = ensureToastWrap();
    var t = document.createElement('div');
    t.className = 'uq-toast' + (type !== 'ok' ? ' is-' + type : '');
    t.innerHTML =
      '<span class="uq-toast-ic">' + ico('a-check-c') + '</span>' +
      '<div class="uq-toast-body"><b>' + esc(msg) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>' +
      '<button class="uq-toast-x" type="button" aria-label="Bezárás">' + ico('a-close', 'ico-sm') + '</button>';
    wrap.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('is-show'); });
    var dismiss = function () { t.classList.remove('is-show'); setTimeout(function () { t.remove(); }, 260); };
    var x = t.querySelector('.uq-toast-x');
    if (x) x.addEventListener('click', dismiss);
    setTimeout(dismiss, 3200);
  }

  /* ---------- LEGÖRDÜLŐK (.uq-dd) ---------- */
  function closeAllMenus() {
    document.querySelectorAll('[data-dd].is-open, [data-chipmenu].is-open').forEach(function (x) {
      x.classList.remove('is-open');
    });
  }
  function bindDropdowns() {
    document.querySelectorAll('[data-dd]').forEach(function (dd) {
      var t = dd.querySelector('[data-dd-toggle]');
      if (!t || t.dataset.uqBound) return;
      t.dataset.uqBound = '1';
      t.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = dd.classList.contains('is-open');
        closeAllMenus();
        dd.classList.toggle('is-open', !open);
      });
    });
  }

  /* ---------- OLDALSÁV összecsukás (.adm-collapse) ---------- */
  function bindCollapse() {
    var side = document.getElementById('admSide');
    var toggle = document.querySelector('[data-side-toggle]');
    if (!side || !toggle || toggle.dataset.uqBound) return;
    toggle.dataset.uqBound = '1';
    toggle.addEventListener('click', function () {
      if (window.innerWidth <= 900) return;
      side.classList.toggle('is-collapsed');
      try { localStorage.setItem('uqSideCollapsed', side.classList.contains('is-collapsed')); } catch (err) {}
    });
    try {
      if (localStorage.getItem('uqSideCollapsed') === 'true' && window.innerWidth > 900) {
        side.classList.add('is-collapsed');
      }
    } catch (err) {}
  }

  /* ---------- NAV aktív-váltás (valós hrefek navigálnak) ---------- */
  function bindNav() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.adm-nav-item'));
    items.forEach(function (item) {
      if (item.dataset.uqBound) return;
      item.dataset.uqBound = '1';
      item.addEventListener('click', function (e) {
        if (item.getAttribute('href') === '#') {
          e.preventDefault();
          items.forEach(function (n) { n.classList.toggle('is-active', n === item); });
        }
      });
    });
  }

  document.addEventListener('click', closeAllMenus);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAllMenus(); });

  function init() {
    bindDropdowns();
    bindCollapse();
    bindNav();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.UQ = window.UQ || {};
  window.UQ.toast = toast;
  window.UQ.closeAllMenus = closeAllMenus;
  window.UQ.bindDropdowns = bindDropdowns;
})();


/* =========================================================
   URBAN QUEST — ADMIN / ÁLLOMÁSOK interakciók
   ========================================================= */
(function () {
  'use strict';

  var toast = function (m, o) { (window.UQ && window.UQ.toast ? window.UQ.toast : function () {})(m, o); };
  var closeAllMenus = function () { if (window.UQ && window.UQ.closeAllMenus) window.UQ.closeAllMenus(); };

  /* ---------- adatok (egyetlen igazságforrás) ---------- */
  const STATIONS = [
    { name: 'Főbejárat', route: 'Városliget Felfedező', type: 'kezdo', diff: 'Könnyű', tasks: 0,
      loc: 'Budapest, Városliget', lat: '47.5148', lng: '19.0810', status: 'active',
      allLangs: ['hu', 'en', 'de'], time: false, timeVal: '5 perc',
      desc: 'A pálya kiindulópontja, ahol a csapatok regisztrálnak és megkapják az első útmutatót.',
      taskShort: 'Keresd meg a főbejárat feletti feliratot, és írd be a kódot.' },
    { name: 'Széchenyi fürdő', route: 'Városliget Felfedező', type: 'info', diff: 'Könnyű', tasks: 1,
      loc: 'Állatkerti krt. 9–11.', lat: '47.5186', lng: '19.0817', status: 'active',
      allLangs: ['hu', 'en'], time: true, timeVal: '5 perc',
      desc: 'Rövid ismertető a fürdő történetéről, majd egy egyszerű megfigyeléses feladat.',
      taskShort: 'Hány sárga kupola látszik a főhomlokzaton?' },
    { name: 'Vajdahunyad vára', route: 'Városliget Felfedező', type: 'feladat', diff: 'Közepes', tasks: 3,
      loc: 'Vajdahunyad stny.', lat: '47.5136', lng: '19.0826', status: 'active',
      allLangs: ['hu', 'en', 'de'], time: true, timeVal: '10 perc',
      desc: 'Több részből álló feladatsor a vár épületstílusaihoz kapcsolódóan.',
      taskShort: 'Párosítsd az épületrészeket a korstílusokkal.' },
    { name: 'Hősök tere', route: 'Városliget Felfedező', type: 'dontes', diff: 'Közepes', tasks: 2,
      loc: 'Hősök tere', lat: '47.5159', lng: '19.0776', status: 'active',
      allLangs: ['hu', 'en'], time: false, timeVal: '8 perc',
      desc: 'Elágazási pont: a csapat dönti el, melyik útvonalon folytatja a felfedezést.',
      taskShort: 'Válaszd ki a szoborcsoportot, amelyről bővebben tanulnátok.' },
    { name: 'Műjégpálya', route: 'Városliget Felfedező', type: 'feladat', diff: 'Nehéz', tasks: 4,
      loc: 'Olof Palme sétány 5.', lat: '47.5131', lng: '19.0800', status: 'draft',
      allLangs: ['hu'], time: true, timeVal: '15 perc',
      desc: 'Összetett, több lépcsős fejtörő a városligeti tó és a jégpálya körül.',
      taskShort: 'Fejtsd meg a tábla rejtjelezett üzenetét.' },
    { name: 'Állatkert bejárat', route: 'Városliget Felfedező', type: 'info', diff: 'Könnyű', tasks: 1,
      loc: 'Állatkerti krt. 6–12.', lat: '47.5183', lng: '19.0757', status: 'active',
      allLangs: ['hu', 'en', 'de', 'fr'], time: false, timeVal: '5 perc',
      desc: 'Tájékoztató állomás a nyitvatartásról és a következő pontok elhelyezkedéséről.',
      taskShort: 'Olvasd le a nyitvatartási időt a bejárati tábláról.' },
    { name: 'Zene Háza', route: 'Liget Projekt', type: 'feladat', diff: 'Közepes', tasks: 3,
      loc: 'Városliget, Zene Háza', lat: '47.5145', lng: '19.0792', status: 'draft',
      allLangs: ['hu', 'en'], time: true, timeVal: '10 perc',
      desc: 'Hangzáshoz és építészethez kapcsolódó interaktív feladatok az épület körül.',
      taskShort: 'Számold meg a tetőszerkezet kör alakú nyílásait.' },
    { name: 'Közlekedési Múzeum', route: 'Liget Projekt', type: 'zaro', diff: 'Nehéz', tasks: 2,
      loc: 'Városliget', lat: '47.5121', lng: '19.0838', status: 'inactive',
      allLangs: ['hu', 'en', 'de'], time: true, timeVal: '8 perc',
      desc: 'A pálya záró állomása: a csapatok itt adják le az összegyűjtött kódokat.',
      taskShort: 'Add meg a végső kódot a korábbi állomások betűiből.' }
  ];

  const DIFF_KEY = { 'Könnyű': 'konnyu', 'Közepes': 'kozepes', 'Nehéz': 'nehez', 'Extrém': 'extrem' };
  const DIFF_COLOR = { konnyu: '#4fb84f', kozepes: '#e0b93a', nehez: '#e8813a', extrem: '#e03a2f' };
  const DIFF_RANK = { 'Könnyű': 1, 'Közepes': 2, 'Nehéz': 3, 'Extrém': 4 };
  const TYPE = {
    kezdo:   { cls: 'is-kezdo',   label: 'Kezdő',       color: '#4fb84f' },
    info:    { cls: 'is-info',    label: 'Információs',  color: '#5b9de0' },
    feladat: { cls: 'is-feladat', label: 'Feladat',     color: '#e0b93a' },
    dontes:  { cls: 'is-dontes',  label: 'Döntési',     color: '#9d7ce0' },
    zaro:    { cls: 'is-zaro',    label: 'Záró',        color: '#e8813a' }
  };
  const TYPE_BY_LABEL = { 'Kezdő': 'kezdo', 'Információs': 'info', 'Feladat': 'feladat', 'Döntési': 'dontes', 'Záró': 'zaro' };
  const TYPE_ICON = { kezdo: 'a-pin', info: 'a-image', feladat: 'a-task', dontes: 'a-target', zaro: 'a-flag' };
  const STATUS = {
    active:   { cls: 'is-pub',   label: 'Aktív',   color: '#4fb84f', glow: true },
    draft:    { cls: 'is-draft', label: 'Vázlat',  color: '#7c86e0', glow: false },
    inactive: { cls: 'is-arch',  label: 'Inaktív', color: '#5b6553', glow: false }
  };
  const STATUS_BY_LABEL = { 'Aktív': 'active', 'Vázlat': 'draft', 'Inaktív': 'inactive' };
  const LANG_LBL = { hu: 'HU', en: 'EN', de: 'DE', fr: 'FR' };
  const LANG_NAME = { hu: 'Magyar', en: 'English', de: 'Deutsch', fr: 'Français' };
  const ALL_LANG_CODES = ['hu', 'en', 'de', 'fr'];

  const ico = (id, cls) => `<svg class="ico ${cls || ''}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const langChip = c => `<span class="jtk-lang"><svg class="flag" aria-hidden="true"><use href="#f-${c}"/></svg>${LANG_LBL[c]}</span>`;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const firstSentence = (text) => {
    const t = (text || '').trim();
    if (!t) return '';
    const m = t.match(/^[^.!?]*[.!?]/);
    return (m ? m[0] : t).trim();
  };

  /* visszavonható toast (törléshez) */
  function undoToast(msg, sub, onUndo) {
    const wrap = document.getElementById('uqToasts') || document.body;
    const t = document.createElement('div');
    t.className = 'uq-toast is-info';
    t.innerHTML = '<span class="uq-toast-ic">' + ico('a-trash') + '</span>' +
      '<div class="uq-toast-body"><b>' + esc(msg) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>' +
      '<button class="uq-toast-undo" type="button">Visszavonás</button>' +
      '<button class="uq-toast-x" type="button" aria-label="Bezárás">' + ico('a-close', 'ico-sm') + '</button>';
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('is-show'));
    let removed = false, undone = false;
    const dismiss = () => { if (removed) return; removed = true; t.classList.remove('is-show'); setTimeout(() => t.remove(), 260); };
    t.querySelector('.uq-toast-undo').addEventListener('click', () => { if (!undone) { undone = true; onUndo(); } dismiss(); });
    t.querySelector('.uq-toast-x').addEventListener('click', dismiss);
    setTimeout(dismiss, 5000);
  }

  /* egyedi azonosítók */
  let uid = 0;
  STATIONS.forEach(s => { s.id = ++uid; });

  /* ---------- tartós tárolás (localStorage) ---------- */
  const STORE = 'uq_stations_v1';
  function saveStore() { try { localStorage.setItem(STORE, JSON.stringify(STATIONS)); } catch (e) {} }
  (function loadStore() {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr) && arr.length) { STATIONS.splice(0, STATIONS.length, ...arr); uid = STATIONS.reduce((m, s) => Math.max(m, s.id || 0), 0); } }
    } catch (e) {}
  })();

  const byId = id => STATIONS.find(s => s.id === id);

  /* ---------- állapot ---------- */
  const state = { search: '', route: 'all', type: 'all', perPage: 10, page: 1, selectedId: STATIONS[0].id, sort: { key: null, dir: 1 }, selected: new Set() };

  /* ---------- fő DOM ---------- */
  const tbody = document.getElementById('stationRows');
  const emptyEl = document.getElementById('jtkEmpty');
  const pagerEl = document.getElementById('jtkPager');
  const topSearch = document.getElementById('topSearch');
  const routeFilter = document.getElementById('routeFilter');
  const typeFilter = document.getElementById('typeFilter');
  const perPageSel = document.getElementById('perPage');

  /* ---------- fiók mezők ---------- */
  const drawer = document.getElementById('drawer');
  const fName = document.getElementById('fName');
  const fType = document.getElementById('fType');
  const fRoute = document.getElementById('fRoute');
  const fDesc = document.getElementById('fDesc');
  const fDiff = document.getElementById('fDiff');
  const fTasks = document.getElementById('fTasks');
  const fTimeToggle = document.getElementById('fTimeToggle');
  const fTimeWrap = document.getElementById('fTimeWrap');
  const fTime = document.getElementById('fTime');
  const fLoc = document.getElementById('fLoc');
  const fLat = document.getElementById('fLat');
  const fLng = document.getElementById('fLng');
  const fTaskShort = document.getElementById('fTaskShort');
  const fStatus = document.getElementById('fStatus');
  const cName = document.getElementById('cName');
  const cDesc = document.getElementById('cDesc');
  const cTaskShort = document.getElementById('cTaskShort');
  const diffDots = document.getElementById('fDiffDots');
  const diffDot = document.getElementById('fDiffDot');
  const typeDot = document.getElementById('fTypeDot');
  const statusDot = document.getElementById('fStatusDot');
  const fLangs = document.getElementById('fLangs');
  const langMenu = document.getElementById('langMenu');
  const langPop = document.getElementById('langPop');

  /* =========================================================
     TÁBLÁZAT RENDERELÉSE
     ========================================================= */
  function filtered() {
    const s = state.search.trim().toLowerCase();
    return STATIONS.filter(st => {
      if (state.route !== 'all' && st.route !== state.route) return false;
      if (state.type !== 'all' && st.type !== state.type) return false;
      if (s) {
        const hay = (st.name + ' ' + st.route + ' ' + st.loc + ' ' + st.desc).toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }

  function rowHTML(st) {
    const dk = DIFF_KEY[st.diff] || 'kozepes';
    const ty = TYPE[st.type] || TYPE.feladat;
    const stt = STATUS[st.status] || STATUS.draft;
    return `<div class="jtk-row${st.id === state.selectedId ? ' is-active' : ''}${state.selected.has(st.id) ? ' is-selected' : ''}" data-id="${st.id}">
      <div class="jtk-name">
        <label class="jtk-check"><input type="checkbox" data-check="${st.id}"${state.selected.has(st.id) ? ' checked' : ''}><span></span></label>
        <span class="all-ico ${ty.cls}">${ico(TYPE_ICON[st.type] || 'a-pin')}</span>
        <span class="jtk-name-txt"><b>${esc(st.name)}</b><small>${esc(st.route)}</small></span>
      </div>
      <div><span class="all-type ${ty.cls}"><span class="dot"></span>${ty.label}</span></div>
      <div class="jtk-cell-diff"><span class="jtk-diff jtk-diff-${dk}"><i></i><i></i><i></i><i></i><i></i></span><span class="jtk-diff-lbl">${esc(st.diff)}</span></div>
      <div class="jtk-cell-tasks">${ico('a-task')}${st.tasks} db</div>
      <div class="jtk-cell-loc">${esc(st.loc)}</div>
      <div><span class="jtk-status ${stt.cls}"><span class="dot"></span>${stt.label}</span></div>
      <div class="jtk-actions">
        <button class="jtk-act jtk-act-edit" type="button" data-act="edit" aria-label="Szerkesztés">${ico('a-edit')}</button>
        <button class="jtk-act" type="button" data-act="copy" aria-label="Másolás">${ico('a-copy')}</button>
        <button class="jtk-act jtk-act-del" type="button" data-act="delete" aria-label="Törlés">${ico('a-trash')}</button>
      </div>
    </div>`;
  }

  function renderPager(total, pages, startIdx, count) {
    const from = total === 0 ? 0 : startIdx + 1;
    const to = startIdx + count;
    let html = `<span class="jtk-range">${from}–${to} / ${total}</span>`;
    html += `<button type="button" class="jtk-pg jtk-pg-prev" aria-label="Előző"${state.page <= 1 ? ' disabled' : ''}>${ico('a-collapse', 'ico-xs')}</button>`;
    for (let p = 1; p <= pages; p++) {
      html += `<button type="button" class="jtk-pg${p === state.page ? ' is-active' : ''}" data-page="${p}">${p}</button>`;
    }
    html += `<button type="button" class="jtk-pg jtk-pg-next" aria-label="Következő"${state.page >= pages ? ' disabled' : ''}>${ico('a-collapse', 'ico-xs')}</button>`;
    pagerEl.innerHTML = html;
  }

  function sortList(list) {
    if (!state.sort.key) return list;
    const k = state.sort.key, d = state.sort.dir;
    return list.slice().sort((a, b) => {
      if (k === 'diff') return d * ((DIFF_RANK[a.diff] || 0) - (DIFF_RANK[b.diff] || 0));
      const av = a[k], bv = b[k];
      if (typeof av === 'string' || typeof bv === 'string') return d * String(av == null ? '' : av).localeCompare(String(bv == null ? '' : bv), 'hu');
      return d * ((av || 0) - (bv || 0));
    });
  }

  function updateStats() {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    set('statTotal', STATIONS.length);
    set('statActive', STATIONS.filter(s => s.status === 'active').length);
    set('statTasks', STATIONS.reduce((a, s) => a + (s.tasks || 0), 0));
    const timed = STATIONS.filter(s => s.time === true);
    const avg = timed.length ? Math.round(timed.reduce((a, s) => a + (parseInt(s.timeVal, 10) || 0), 0) / timed.length) : 0;
    set('statAvgTime', avg + ' perc');
  }

  function updateBulk() {
    const ids = new Set(STATIONS.map(s => s.id));
    state.selected.forEach(id => { if (!ids.has(id)) state.selected.delete(id); });
    const bar = document.getElementById('bulkBar');
    const cnt = document.getElementById('bulkCount');
    if (cnt) cnt.textContent = state.selected.size;
    if (bar) bar.classList.toggle('is-hidden', state.selected.size === 0);
    const vis = filtered().map(s => s.id);
    const checkAll = document.getElementById('checkAll');
    if (checkAll) {
      const selVis = vis.filter(id => state.selected.has(id)).length;
      checkAll.checked = vis.length > 0 && selVis === vis.length;
      checkAll.indeterminate = selVis > 0 && selVis < vis.length;
    }
  }

  function syncSortHeads() {
    document.querySelectorAll('.jtk-thead span[data-sort]').forEach(sp => {
      const on = sp.dataset.sort === state.sort.key;
      sp.classList.toggle('is-asc', on && state.sort.dir === 1);
      sp.classList.toggle('is-desc', on && state.sort.dir === -1);
    });
  }

  function render() {
    const list = sortList(filtered());
    const total = list.length;
    const perPage = state.perPage;
    const pages = Math.max(1, Math.ceil(total / perPage));
    if (state.page > pages) state.page = pages;
    if (state.page < 1) state.page = 1;
    const startIdx = (state.page - 1) * perPage;
    const pageItems = list.slice(startIdx, startIdx + perPage);

    tbody.innerHTML = pageItems.map(rowHTML).join('');
    emptyEl.hidden = total > 0;
    renderPager(total, pages, startIdx, pageItems.length);
    updateStats();
    updateBulk();
    syncSortHeads();
    saveStore();
  }

  /* =========================================================
     FIÓK (szerkesztő)
     ========================================================= */
  function applyDiff(label) {
    const dk = DIFF_KEY[label] || 'kozepes';
    diffDots.className = 'jtk-diff jtk-diff-' + dk;
    diffDot.className = 'ed-dot ed-dot-' + dk;
    diffDot.style.background = DIFF_COLOR[dk];
  }
  function applyType(key) {
    const ty = TYPE[key] || TYPE.feladat;
    typeDot.style.background = ty.color;
  }
  function applyStatus(label) {
    const st = STATUS[STATUS_BY_LABEL[label] || 'active'];
    statusDot.style.background = st.color;
    statusDot.style.boxShadow = st.glow ? '0 0 6px ' + st.color : 'none';
  }
  function applyTimeToggle(on) {
    fTimeToggle.classList.toggle('is-on', on);
    fTimeToggle.setAttribute('aria-checked', on ? 'true' : 'false');
    fTimeWrap.classList.toggle('is-off', !on);
  }
  function langChipEl(c) {
    const el = document.createElement('span');
    el.className = 'ed-lang is-on';
    el.dataset.lang = c;
    el.innerHTML = `<svg class="flag" aria-hidden="true"><use href="#f-${c}"/></svg>${LANG_LBL[c]}<button class="jtk-lang-x" type="button" aria-label="Eltávolítás">${ico('a-close', 'ico-xs')}</button>`;
    return el;
  }
  function rebuildLangs(codes) {
    fLangs.querySelectorAll('.ed-lang').forEach(n => n.remove());
    codes.forEach(c => fLangs.insertBefore(langChipEl(c), langMenu));
  }
  function currentDrawerLangs() {
    return Array.from(fLangs.querySelectorAll('.ed-lang')).map(el => el.dataset.lang).filter(Boolean);
  }

  function fillDrawer(st) {
    fName.value = st.name; cName.textContent = st.name.length;
    fType.value = st.type; applyType(st.type);
    fRoute.value = st.route;
    fDesc.value = st.desc; cDesc.textContent = st.desc.length;
    fDiff.value = st.diff; applyDiff(st.diff);
    fTasks.value = String(st.tasks);
    applyTimeToggle(!!st.time);
    fTime.value = st.timeVal;
    fLoc.value = st.loc;
    fLat.value = st.lat;
    fLng.value = st.lng;
    fTaskShort.value = st.taskShort; cTaskShort.textContent = st.taskShort.length;
    fStatus.value = STATUS[st.status].label; applyStatus(STATUS[st.status].label);
    rebuildLangs(st.allLangs);
  }

  function markActive() {
    tbody.querySelectorAll('.jtk-row').forEach(r =>
      r.classList.toggle('is-active', Number(r.dataset.id) === state.selectedId));
  }

  function selectStation(id, focus) {
    const st = byId(id);
    if (!st) return;
    state.selectedId = id;
    fillDrawer(st);
    drawer.classList.remove('is-hidden');
    markActive();
    if (focus) fName.focus();
  }

  function saveDrawer() {
    const st = byId(state.selectedId);
    if (!st) { toast('Nincs kiválasztott állomás', { type: 'error' }); return; }
    st.name = fName.value.trim() || 'Névtelen állomás';
    st.type = fType.value || 'feladat';
    st.route = fRoute.value;
    st.desc = fDesc.value.trim();
    st.diff = fDiff.value;
    st.tasks = parseInt(fTasks.value, 10) || 0;
    st.time = fTimeToggle.classList.contains('is-on');
    st.timeVal = fTime.value;
    st.loc = fLoc.value;
    st.lat = fLat.value;
    st.lng = fLng.value;
    st.taskShort = fTaskShort.value.trim();
    st.status = STATUS_BY_LABEL[fStatus.value] || 'active';
    const codes = currentDrawerLangs();
    st.allLangs = codes.length ? codes : ['hu'];
    render();
    toast('Állomás elmentve', { sub: st.name });
  }

  function duplicateStation(id) {
    const idx = STATIONS.findIndex(x => x.id === id);
    if (idx < 0) return;
    const src = STATIONS[idx];
    const copy = Object.assign({}, src, {
      id: ++uid,
      name: src.name + ' (másolat)',
      status: 'draft',
      allLangs: src.allLangs.slice()
    });
    STATIONS.splice(idx + 1, 0, copy);
    render();
    toast('Állomás duplikálva', { sub: copy.name });
  }

  function deleteStation(id) {
    const idx = STATIONS.findIndex(x => x.id === id);
    if (idx < 0) return;
    const removed = STATIONS[idx];
    STATIONS.splice(idx, 1);
    state.selected.delete(id);
    if (state.selectedId === id) {
      if (STATIONS.length) {
        state.selectedId = STATIONS[Math.min(idx, STATIONS.length - 1)].id;
        fillDrawer(byId(state.selectedId));
      } else {
        drawer.classList.add('is-hidden');
      }
    }
    render();
    undoToast('Állomás törölve', removed.name, () => {
      STATIONS.splice(Math.min(idx, STATIONS.length), 0, removed);
      state.selectedId = removed.id;
      fillDrawer(removed);
      drawer.classList.remove('is-hidden');
      render();
      toast('Törlés visszavonva', { sub: removed.name });
    });
  }

  function newStation() {
    const st = {
      id: ++uid,
      name: 'Új állomás',
      route: 'Városliget Felfedező',
      type: 'feladat',
      diff: 'Könnyű',
      tasks: 0,
      loc: 'Budapest',
      lat: '47.4979', lng: '19.0402',
      status: 'draft',
      allLangs: ['hu'],
      time: false, timeVal: '5 perc',
      desc: 'Rövid leírás az állomásról.',
      taskShort: 'Add meg a feladat rövid leírását.'
    };
    STATIONS.unshift(st);
    state.search = ''; topSearch.value = '';
    state.route = 'all'; routeFilter.value = 'all';
    state.type = 'all'; typeFilter.value = 'all';
    state.page = 1;
    state.selectedId = st.id;
    render();
    selectStation(st.id, true);
    toast('Új állomás létrehozva', { sub: 'Töltsd ki az adatokat, majd Mentés' });
  }

  /* =========================================================
     CHIP-MENU (nyelv hozzáadása)
     ========================================================= */
  function buildLangPop() {
    const current = currentDrawerLangs();
    langPop.innerHTML = ALL_LANG_CODES.map(c => {
      const added = current.includes(c);
      return `<button class="uq-chip-opt${added ? ' is-selected' : ''}" type="button" data-lang="${c}"${added ? ' disabled' : ''}>` +
        `<svg class="flag" aria-hidden="true"><use href="#f-${c}"/></svg>${LANG_NAME[c]}${ico('a-check', 'ico-xs uq-chip-check')}</button>`;
    }).join('');
  }

  /* =========================================================
     ESEMÉNYEK
     ========================================================= */
  tbody.addEventListener('click', e => {
    if (e.target.closest('.jtk-check')) return; // jelölőnégyzet: ne nyissa a fiókot
    const row = e.target.closest('.jtk-row');
    if (!row) return;
    const id = Number(row.dataset.id);
    const actBtn = e.target.closest('.jtk-act');
    if (actBtn) {
      const act = actBtn.dataset.act;
      if (act === 'edit') selectStation(id, true);
      else if (act === 'copy') duplicateStation(id);
      else if (act === 'delete') deleteStation(id);
      return;
    }
    selectStation(id);
  });

  /* sor-jelölőnégyzet kijelölése */
  tbody.addEventListener('change', e => {
    const input = e.target.closest('input[data-check]');
    if (!input) return;
    const id = Number(input.dataset.check);
    if (input.checked) state.selected.add(id); else state.selected.delete(id);
    const row = input.closest('.jtk-row');
    if (row) row.classList.toggle('is-selected', input.checked);
    updateBulk();
  });

  /* fejléc: összes kijelölése (a szűrt listára) */
  const checkAllEl = document.getElementById('checkAll');
  if (checkAllEl) checkAllEl.addEventListener('change', () => {
    const vis = filtered().map(s => s.id);
    if (checkAllEl.checked) vis.forEach(id => state.selected.add(id));
    else vis.forEach(id => state.selected.delete(id));
    render();
  });

  /* fejléc: rendezés */
  document.querySelectorAll('.jtk-thead span[data-sort]').forEach(sp => {
    sp.addEventListener('click', () => {
      const key = sp.dataset.sort;
      if (state.sort.key === key) state.sort.dir = -state.sort.dir;
      else { state.sort.key = key; state.sort.dir = 1; }
      render();
    });
  });

  /* tömeges műveletek */
  const bulkClear = document.getElementById('bulkClear');
  if (bulkClear) bulkClear.addEventListener('click', () => { state.selected.clear(); render(); });
  const bulkDelete = document.getElementById('bulkDelete');
  if (bulkDelete) bulkDelete.addEventListener('click', () => {
    const ids = Array.from(state.selected);
    if (!ids.length) return;
    const removed = ids.map(id => { const idx = STATIONS.findIndex(s => s.id === id); return idx >= 0 ? { idx: idx, item: STATIONS[idx] } : null; }).filter(Boolean).sort((a, b) => a.idx - b.idx);
    ids.forEach(id => { const i = STATIONS.findIndex(s => s.id === id); if (i >= 0) STATIONS.splice(i, 1); });
    state.selected.clear();
    if (!byId(state.selectedId)) { if (STATIONS.length) { state.selectedId = STATIONS[0].id; fillDrawer(byId(state.selectedId)); } else drawer.classList.add('is-hidden'); }
    render();
    undoToast(removed.length + ' állomás törölve', '', () => {
      removed.forEach(r => STATIONS.splice(Math.min(r.idx, STATIONS.length), 0, r.item));
      render();
      toast('Törlés visszavonva', { sub: removed.length + ' állomás' });
    });
  });
  const bulkStatus = document.getElementById('bulkStatus');
  if (bulkStatus) bulkStatus.addEventListener('change', () => {
    const v = bulkStatus.value; if (!v) return;
    const ids = Array.from(state.selected);
    ids.forEach(id => { const s = byId(id); if (s) s.status = v; });
    const s0 = byId(state.selectedId); if (s0) fillDrawer(s0);
    bulkStatus.value = '';
    render();
    toast('Státusz módosítva', { sub: ids.length + ' állomás → ' + (STATUS[v] ? STATUS[v].label : v) });
  });

  pagerEl.addEventListener('click', e => {
    const btn = e.target.closest('.jtk-pg');
    if (!btn || btn.disabled) return;
    if (btn.classList.contains('jtk-pg-prev')) state.page = Math.max(1, state.page - 1);
    else if (btn.classList.contains('jtk-pg-next')) state.page = state.page + 1;
    else if (btn.dataset.page) state.page = parseInt(btn.dataset.page, 10) || 1;
    render();
  });

  topSearch.addEventListener('input', () => { state.search = topSearch.value; state.page = 1; render(); });
  routeFilter.addEventListener('change', () => { state.route = routeFilter.value; state.page = 1; render(); });
  typeFilter.addEventListener('change', () => { state.type = typeFilter.value; state.page = 1; render(); });
  perPageSel.addEventListener('change', () => { state.perPage = parseInt(perPageSel.value, 10) || 10; state.page = 1; render(); });

  document.getElementById('btnNewStation').addEventListener('click', newStation);

  /* felső sáv: Mentés / Közzététel */
  document.getElementById('btnSave').addEventListener('click', () => { saveStore(); toast('Módosítások mentve', { sub: 'A piszkozat elmentve' }); });
  document.getElementById('btnPublish').addEventListener('click', () => { saveStore(); toast('Állomások közzétéve', { sub: 'Élő a nyilvános pályákon' }); });

  document.querySelectorAll('[data-pub]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.pub;
    saveStore();
    if (a === 'now') toast('Állomások közzétéve', { sub: 'Élő a nyilvános pályákon' });
    else if (a === 'schedule') toast('Közzététel ütemezve', { type: 'info', sub: 'Időzített megjelenés beállítva' });
    else if (a === 'draft') toast('Piszkozatként mentve', { type: 'info', sub: 'Nem jelenik meg nyilvánosan' });
  }));

  document.querySelectorAll('[data-user]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.user;
    if (a === 'profile') toast('Profil', { type: 'info', sub: 'Profil megnyitása' });
    else if (a === 'settings') toast('Beállítások', { type: 'info', sub: 'Fiókbeállítások megnyitása' });
    else if (a === 'logout') toast('Kijelentkezés', { type: 'info', sub: 'Munkamenet lezárása' });
  }));

  /* fiók: élő karakterszámlálók */
  fName.addEventListener('input', () => { cName.textContent = fName.value.length; });
  fDesc.addEventListener('input', () => { cDesc.textContent = fDesc.value.length; });
  fTaskShort.addEventListener('input', () => { cTaskShort.textContent = fTaskShort.value.length; });

  /* fiók: legördülők → pöttyök */
  fDiff.addEventListener('change', () => applyDiff(fDiff.value));
  fType.addEventListener('change', () => applyType(fType.value));
  fStatus.addEventListener('change', () => applyStatus(fStatus.value));

  /* fiók: időlimit kapcsoló */
  fTimeToggle.addEventListener('click', () => applyTimeToggle(!fTimeToggle.classList.contains('is-on')));

  /* fiók: nyelv-chip eltávolítás (delegálás) */
  fLangs.addEventListener('click', e => {
    const x = e.target.closest('.jtk-lang-x');
    if (x) { e.stopPropagation(); x.closest('.ed-lang').remove(); }
  });

  /* fiók: nyelv hozzáadása (chip-menu) */
  langMenu.querySelector('[data-chip-toggle]').addEventListener('click', e => {
    e.stopPropagation();
    const willOpen = !langMenu.classList.contains('is-open');
    closeAllMenus();
    if (willOpen) { buildLangPop(); langMenu.classList.add('is-open'); }
  });
  langPop.addEventListener('click', e => {
    const opt = e.target.closest('.uq-chip-opt');
    if (!opt || opt.disabled) return;
    fLangs.insertBefore(langChipEl(opt.dataset.lang), langMenu);
    langMenu.classList.remove('is-open');
  });

  /* fiók: helyszín törlés */
  const clearBtn = document.querySelector('.jtk-clear');
  if (clearBtn) clearBtn.addEventListener('click', () => { fLoc.value = ''; fLoc.focus(); });

  /* fiók: mentés / előnézet / bezárás */
  document.querySelector('.jtk-save').addEventListener('click', saveDrawer);
  document.querySelector('.jtk-prev').addEventListener('click', () => { const s = byId(state.selectedId); const url = 'jatszas.html?route=' + encodeURIComponent(s ? s.route : ''); const w = window.open(url, '_blank'); if (w) { toast('Végigjátszás indul', { type: 'info', sub: 'Új lapon nyílik' }); } else { location.href = url; } });
  document.querySelector('.jtk-drawer-x').addEventListener('click', () => drawer.classList.add('is-hidden'));

  /* =========================================================
     INDÍTÁS
     ========================================================= */
  render();
  selectStation(STATIONS[0].id);
})();
