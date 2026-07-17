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
   URBAN QUEST — ADMIN / IDŐZÍTÉSEK interakciók
   ========================================================= */
(function () {
  'use strict';

  var toast = function (m, o) { (window.UQ && window.UQ.toast ? window.UQ.toast : function () {})(m, o); };

  /* ---------- napok ---------- */
  const DAY_SHORT = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];
  const DAY_NAME = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];

  /* ---------- adatok (egyetlen igazságforrás) ---------- */
  const SCHEDULES = [
    { route: 'Városliget Felfedező', days: [1, 1, 1, 1, 1, 0, 0], start: '09:00', end: '18:00', cap: 24, repeat: 'Heti', status: 'active',
      note: 'Standard hétköznapi nyitvatartás, előzetes foglalással.' },
    { route: 'Budai Vár Rejtélye', days: [0, 0, 0, 0, 0, 1, 1], start: '10:00', end: '17:00', cap: 16, repeat: 'Heti', status: 'active',
      note: 'Hétvégi túrák, idegenvezetővel.' },
    { route: 'Liget Projekt', days: [1, 0, 1, 0, 1, 0, 0], start: '14:00', end: '20:00', cap: 20, repeat: 'Heti', status: 'paused',
      note: 'Délutáni időablak, felújítás miatt átmenetileg szünetel.' },
    { route: 'Gellérthegy Titkai', days: [1, 1, 1, 1, 1, 1, 1], start: '08:00', end: '22:00', cap: 30, repeat: 'Heti', status: 'active',
      note: 'Egész napos elérhetőség, folyamatos indulásokkal.' },
    { route: 'Belváros Nyomában', days: [0, 0, 0, 0, 1, 1, 0], start: '18:00', end: '23:00', cap: 12, repeat: 'Heti', status: 'active',
      note: 'Esti belvárosi séta, hangulatvilágítással.' },
    { route: 'Óbuda Öröksége', days: [0, 1, 0, 1, 0, 0, 0], start: '10:00', end: '16:00', cap: 18, repeat: 'Heti', status: 'paused',
      note: 'Kedd–csütörtöki időablak, alacsony létszám miatt szünetel.' },
    { route: 'Margitsziget Kaland', days: [0, 0, 0, 0, 0, 1, 0], start: '11:00', end: '19:00', cap: 40, repeat: 'Egyszeri', status: 'active',
      note: 'Egyszeri szezonnyitó esemény, bővített kapacitással.' }
  ];

  const STATUS = {
    active: { cls: 'is-pub', label: 'Aktív', color: '#4fb84f', glow: true },
    paused: { cls: 'is-paused', label: 'Szünetel', color: '#e0b93a', glow: false }
  };
  const STATUS_BY_LABEL = { 'Aktív': 'active', 'Szünetel': 'paused' };
  const REPEAT = {
    'Heti': { cls: 'is-heti', ico: 'a-repeat' },
    'Egyszeri': { cls: 'is-egyszeri', ico: 'a-calendar' },
    'Havi': { cls: 'is-havi', ico: 'a-calendar' }
  };

  const ico = (id, cls) => `<svg class="ico ${cls || ''}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

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
  SCHEDULES.forEach(s => { s.id = ++uid; });

  /* ---------- tartós tárolás (localStorage) ---------- */
  const STORE = 'uq_schedules_v1';
  function saveStore() { try { localStorage.setItem(STORE, JSON.stringify(SCHEDULES)); } catch (e) {} }
  (function loadStore() {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr) && arr.length) { SCHEDULES.splice(0, SCHEDULES.length, ...arr); uid = SCHEDULES.reduce((m, s) => Math.max(m, s.id || 0), 0); } }
    } catch (e) {}
  })();

  const byId = id => SCHEDULES.find(s => s.id === id);

  const activeDayNames = days => DAY_NAME.filter((_, i) => days[i]);
  const daysSummary = days => {
    const n = days.reduce((a, b) => a + b, 0);
    if (n === 7) return 'Minden nap';
    if (n === 0) return 'Nincs nap kijelölve';
    return activeDayNames(days).join(', ');
  };

  /* ---------- állapot ---------- */
  const state = { search: '', route: 'all', status: 'all', perPage: 10, page: 1, selectedId: SCHEDULES[0].id, sort: { key: null, dir: 1 }, selected: new Set() };

  /* ---------- fő DOM ---------- */
  const tbody = document.getElementById('scheduleRows');
  const emptyEl = document.getElementById('jtkEmpty');
  const pagerEl = document.getElementById('jtkPager');
  const topSearch = document.getElementById('topSearch');
  const routeFilter = document.getElementById('routeFilter');
  const statusFilter = document.getElementById('statusFilter');
  const perPageSel = document.getElementById('perPage');

  /* ---------- fiók mezők ---------- */
  const drawer = document.getElementById('drawer');
  const fRoute = document.getElementById('fRoute');
  const fDays = document.getElementById('fDays');
  const fStart = document.getElementById('fStart');
  const fEnd = document.getElementById('fEnd');
  const fCap = document.getElementById('fCap');
  const fRepeat = document.getElementById('fRepeat');
  const fStatus = document.getElementById('fStatus');
  const fNote = document.getElementById('fNote');
  const cNote = document.getElementById('cNote');
  const statusDot = document.getElementById('fStatusDot');

  /* =========================================================
     TÁBLÁZAT RENDERELÉSE
     ========================================================= */
  function filtered() {
    const s = state.search.trim().toLowerCase();
    return SCHEDULES.filter(sc => {
      if (state.route !== 'all' && sc.route !== state.route) return false;
      if (state.status !== 'all' && sc.status !== state.status) return false;
      if (s) {
        const hay = (sc.route + ' ' + sc.start + ' ' + sc.end + ' ' + sc.repeat + ' ' +
          daysSummary(sc.days) + ' ' + (sc.note || '')).toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }

  function daysBadgesHTML(days) {
    return '<span class="idz-days">' + DAY_SHORT.map((d, i) =>
      `<span class="idz-day${days[i] ? ' is-on' : ''}">${d}</span>`).join('') + '</span>';
  }

  function rowHTML(sc) {
    const stt = STATUS[sc.status] || STATUS.active;
    const rep = REPEAT[sc.repeat] || REPEAT['Heti'];
    return `<div class="jtk-row${sc.id === state.selectedId ? ' is-active' : ''}${state.selected.has(sc.id) ? ' is-selected' : ''}" data-id="${sc.id}">
      <div class="jtk-name">
        <label class="jtk-check"><input type="checkbox" data-check="${sc.id}"${state.selected.has(sc.id) ? ' checked' : ''}><span></span></label>
        <span class="idz-ico">${ico('a-route')}</span>
        <span class="jtk-name-txt"><b>${esc(sc.route)}</b><small>${esc(daysSummary(sc.days))}</small></span>
      </div>
      <div>${daysBadgesHTML(sc.days)}</div>
      <div class="idz-cell-time">${ico('a-clock')}${esc(sc.start)}–${esc(sc.end)}</div>
      <div class="idz-cell-cap">${ico('a-users')}${sc.cap} fő</div>
      <div><span class="idz-repeat ${rep.cls}">${ico(rep.ico)}${esc(sc.repeat)}</span></div>
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
      if (k === 'days') return d * (a.days.filter(Boolean).length - b.days.filter(Boolean).length);
      const av = a[k], bv = b[k];
      if (typeof av === 'string' || typeof bv === 'string') return d * String(av == null ? '' : av).localeCompare(String(bv == null ? '' : bv), 'hu');
      return d * ((av || 0) - (bv || 0));
    });
  }

  function updateStats() {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    set('statActive', SCHEDULES.filter(s => s.status === 'active').length);
    set('statTotal', SCHEDULES.length);
    const cap = SCHEDULES.filter(s => s.status === 'active').reduce((a, s) => a + (s.cap || 0), 0);
    set('statCap', fmt(cap) + ' fő');
    set('statPaused', SCHEDULES.filter(s => s.status === 'paused').length);
  }

  function updateBulk() {
    const ids = new Set(SCHEDULES.map(s => s.id));
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
  function applyStatus(label) {
    const st = STATUS[STATUS_BY_LABEL[label] || 'active'];
    statusDot.style.background = st.color;
    statusDot.style.boxShadow = st.glow ? '0 0 6px ' + st.color : 'none';
  }

  function buildDayPills(days) {
    fDays.innerHTML = DAY_SHORT.map((d, i) =>
      `<button class="idz-daypill${days[i] ? ' is-on' : ''}" type="button" role="checkbox" aria-checked="${days[i] ? 'true' : 'false'}" data-day="${i}" aria-label="${DAY_NAME[i]}">${d}</button>`
    ).join('');
  }
  function currentDrawerDays() {
    return Array.from(fDays.querySelectorAll('.idz-daypill')).map(b =>
      b.classList.contains('is-on') ? 1 : 0);
  }

  function fillDrawer(sc) {
    fRoute.value = sc.route;
    buildDayPills(sc.days);
    fStart.value = sc.start;
    fEnd.value = sc.end;
    fCap.value = sc.cap;
    fRepeat.value = sc.repeat;
    fStatus.value = STATUS[sc.status].label; applyStatus(STATUS[sc.status].label);
    fNote.value = sc.note || ''; cNote.textContent = (sc.note || '').length;
  }

  function markActive() {
    tbody.querySelectorAll('.jtk-row').forEach(r =>
      r.classList.toggle('is-active', Number(r.dataset.id) === state.selectedId));
  }

  function selectSchedule(id, focus) {
    const sc = byId(id);
    if (!sc) return;
    state.selectedId = id;
    fillDrawer(sc);
    drawer.classList.remove('is-hidden');
    markActive();
    if (focus) fRoute.focus();
  }

  function saveDrawer() {
    const sc = byId(state.selectedId);
    if (!sc) { toast('Nincs kiválasztott időzítés', { type: 'error' }); return; }
    const days = currentDrawerDays();
    if (days.reduce((a, b) => a + b, 0) === 0) {
      toast('Válassz legalább egy napot', { type: 'error', sub: 'A napok mező kötelező' });
      return;
    }
    if (fStart.value && fEnd.value && fEnd.value <= fStart.value) {
      toast('A vég idő legyen a kezdés után', { type: 'error', sub: 'Érvénytelen időablak' });
      return;
    }
    sc.route = fRoute.value;
    sc.days = days;
    sc.start = fStart.value || '09:00';
    sc.end = fEnd.value || '18:00';
    sc.cap = Math.max(1, parseInt(fCap.value, 10) || 1);
    sc.repeat = fRepeat.value;
    sc.status = STATUS_BY_LABEL[fStatus.value] || 'active';
    sc.note = fNote.value.trim();
    render();
    toast('Időzítés elmentve', { sub: sc.route + ' · ' + sc.start + '–' + sc.end });
  }

  function duplicateSchedule(id) {
    const idx = SCHEDULES.findIndex(x => x.id === id);
    if (idx < 0) return;
    const src = SCHEDULES[idx];
    const copy = Object.assign({}, src, {
      id: ++uid,
      status: 'paused',
      days: src.days.slice()
    });
    SCHEDULES.splice(idx + 1, 0, copy);
    render();
    toast('Időzítés duplikálva', { sub: copy.route + ' (másolat)' });
  }

  function deleteSchedule(id) {
    const idx = SCHEDULES.findIndex(x => x.id === id);
    if (idx < 0) return;
    const removed = SCHEDULES[idx];
    SCHEDULES.splice(idx, 1);
    state.selected.delete(id);
    if (state.selectedId === id) {
      if (SCHEDULES.length) {
        state.selectedId = SCHEDULES[Math.min(idx, SCHEDULES.length - 1)].id;
        fillDrawer(byId(state.selectedId));
      } else {
        drawer.classList.add('is-hidden');
      }
    }
    render();
    undoToast('Időzítés törölve', removed.route, () => {
      SCHEDULES.splice(Math.min(idx, SCHEDULES.length), 0, removed);
      state.selectedId = removed.id;
      fillDrawer(removed);
      drawer.classList.remove('is-hidden');
      render();
      toast('Törlés visszavonva', { sub: removed.route });
    });
  }

  function newSchedule() {
    const sc = {
      id: ++uid,
      route: 'Városliget Felfedező',
      days: [1, 1, 1, 1, 1, 0, 0],
      start: '09:00',
      end: '18:00',
      cap: 20,
      repeat: 'Heti',
      status: 'paused',
      note: 'Új időablak – töltsd ki az adatokat.'
    };
    SCHEDULES.unshift(sc);
    state.search = ''; topSearch.value = '';
    state.route = 'all'; routeFilter.value = 'all';
    state.status = 'all'; statusFilter.value = 'all';
    state.page = 1;
    state.selectedId = sc.id;
    render();
    selectSchedule(sc.id, true);
    toast('Új időzítés létrehozva', { sub: 'Állítsd be a napokat és időablakot, majd Mentés' });
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
      if (act === 'edit') selectSchedule(id, true);
      else if (act === 'copy') duplicateSchedule(id);
      else if (act === 'delete') deleteSchedule(id);
      return;
    }
    selectSchedule(id);
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
    const removed = ids.map(id => { const idx = SCHEDULES.findIndex(s => s.id === id); return idx >= 0 ? { idx: idx, item: SCHEDULES[idx] } : null; }).filter(Boolean).sort((a, b) => a.idx - b.idx);
    ids.forEach(id => { const i = SCHEDULES.findIndex(s => s.id === id); if (i >= 0) SCHEDULES.splice(i, 1); });
    state.selected.clear();
    if (!byId(state.selectedId)) { if (SCHEDULES.length) { state.selectedId = SCHEDULES[0].id; fillDrawer(byId(state.selectedId)); } else drawer.classList.add('is-hidden'); }
    render();
    undoToast(removed.length + ' időzítés törölve', '', () => {
      removed.forEach(r => SCHEDULES.splice(Math.min(r.idx, SCHEDULES.length), 0, r.item));
      render();
      toast('Törlés visszavonva', { sub: removed.length + ' időzítés' });
    });
  });
  const bulkStatus = document.getElementById('bulkStatus');
  if (bulkStatus) bulkStatus.addEventListener('change', () => {
    const v = bulkStatus.value; if (!v) return;
    const ids = Array.from(state.selected);
    ids.forEach(id => { const sc = byId(id); if (sc) sc.status = v; });
    const s0 = byId(state.selectedId); if (s0) fillDrawer(s0);
    bulkStatus.value = '';
    render();
    toast('Státusz módosítva', { sub: ids.length + ' időzítés → ' + (STATUS[v] ? STATUS[v].label : v) });
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
  statusFilter.addEventListener('change', () => { state.status = statusFilter.value; state.page = 1; render(); });
  perPageSel.addEventListener('change', () => { state.perPage = parseInt(perPageSel.value, 10) || 10; state.page = 1; render(); });

  document.getElementById('btnNewSchedule').addEventListener('click', newSchedule);

  /* felső sáv: Mentés / Közzététel */
  document.getElementById('btnSave').addEventListener('click', () => { saveStore(); toast('Módosítások mentve', { sub: 'A piszkozat elmentve' }); });
  document.getElementById('btnPublish').addEventListener('click', () => { saveStore(); toast('Időzítések közzétéve', { sub: 'Élő a nyilvános foglalási naptárban' }); });

  document.querySelectorAll('[data-pub]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.pub;
    saveStore();
    if (a === 'now') toast('Időzítések közzétéve', { sub: 'Élő a nyilvános foglalási naptárban' });
    else if (a === 'schedule') toast('Közzététel ütemezve', { type: 'info', sub: 'Időzített megjelenés beállítva' });
    else if (a === 'draft') toast('Piszkozatként mentve', { type: 'info', sub: 'Nem jelenik meg nyilvánosan' });
  }));

  document.querySelectorAll('[data-user]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.user;
    if (a === 'profile') toast('Profil', { type: 'info', sub: 'Profil megnyitása' });
    else if (a === 'settings') toast('Beállítások', { type: 'info', sub: 'Fiókbeállítások megnyitása' });
    else if (a === 'logout') toast('Kijelentkezés', { type: 'info', sub: 'Munkamenet lezárása' });
  }));

  /* fiók: nap-pillek kapcsolása (delegálás) */
  fDays.addEventListener('click', e => {
    const pill = e.target.closest('.idz-daypill');
    if (!pill) return;
    const on = !pill.classList.contains('is-on');
    pill.classList.toggle('is-on', on);
    pill.setAttribute('aria-checked', on ? 'true' : 'false');
  });

  /* fiók: státusz → pötty */
  fStatus.addEventListener('change', () => applyStatus(fStatus.value));

  /* fiók: megjegyzés karakterszámláló */
  fNote.addEventListener('input', () => { cNote.textContent = fNote.value.length; });

  /* fiók: mentés / előnézet / bezárás */
  document.querySelector('.jtk-save').addEventListener('click', saveDrawer);
  document.querySelector('.jtk-prev').addEventListener('click', () => { const sc = byId(state.selectedId); const url = 'jatszas.html?route=' + encodeURIComponent(sc ? sc.route : ''); const w = window.open(url, '_blank'); if (w) { toast('Végigjátszás indul', { type: 'info', sub: 'Új lapon nyílik' }); } else { location.href = url; } });
  document.querySelector('.jtk-drawer-x').addEventListener('click', () => drawer.classList.add('is-hidden'));

  /* =========================================================
     INDÍTÁS
     ========================================================= */
  render();
  selectSchedule(SCHEDULES[0].id);
})();
