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
   URBAN QUEST — ADMIN / CSAPATOK interakciók
   ========================================================= */
(function () {
  'use strict';

  var toast = function (m, o) { (window.UQ && window.UQ.toast ? window.UQ.toast : function () {})(m, o); };

  /* ---------- adatok (egyetlen igazságforrás) ---------- */
  const TEAMS = [
    { name: 'Trail Blazers', captain: 'Nagy Ádám', members: 4, route: 'Városliget Felfedező',
      score: 2340, progress: 64, status: 'playing', start: '14:20' },
    { name: 'Városi Nyomozók', captain: 'Kovács Réka', members: 5, route: 'Budai Vár Rejtélye',
      score: 3120, progress: 100, status: 'done', start: '10:05' },
    { name: 'Kaland Expressz', captain: 'Tóth Bence', members: 3, route: 'Liget Projekt',
      score: 1780, progress: 42, status: 'playing', start: '15:10' },
    { name: 'Kód Vadászok', captain: 'Szabó Lilla', members: 4, route: 'Belváros Kódvadászat',
      score: 0, progress: 0, status: 'waiting', start: '16:30' },
    { name: 'Rejtély Rangerek', captain: 'Horváth Máté', members: 6, route: 'Budai Vár Rejtélye',
      score: 2560, progress: 78, status: 'playing', start: '13:45' },
    { name: 'Iránytű Brigád', captain: 'Varga Nóra', members: 2, route: 'Városliget Felfedező',
      score: 2890, progress: 100, status: 'done', start: '09:30' },
    { name: 'Csillag Felderítők', captain: 'Balogh Dániel', members: 5, route: 'Liget Projekt',
      score: 1420, progress: 35, status: 'playing', start: '15:40' },
    { name: 'Labirintus Mesterek', captain: 'Fekete Anna', members: 3, route: 'Belváros Kódvadászat',
      score: 0, progress: 0, status: 'waiting', start: '17:00' },
    { name: 'Turul Csapat', captain: 'Molnár Gergő', members: 4, route: 'Budai Vár Rejtélye',
      score: 2075, progress: 58, status: 'playing', start: '14:00' },
    { name: 'Zöld Ösvény', captain: 'Simon Petra', members: 6, route: 'Városliget Felfedező',
      score: 3340, progress: 100, status: 'done', start: '08:50' }
  ];

  const STATUS = {
    playing: { cls: 'is-play', pill: 'is-play', bar: '',        label: 'Játékban',  color: '#4fb84f', glow: true },
    done:    { cls: 'is-done', pill: 'is-done', bar: 'is-done', label: 'Befejezte', color: '#5b9de0', glow: false },
    waiting: { cls: 'is-wait', pill: 'is-wait', bar: 'is-wait', label: 'Várakozik', color: '#e0b93a', glow: false }
  };
  const STATUS_BY_LABEL = { 'Játékban': 'playing', 'Befejezte': 'done', 'Várakozik': 'waiting' };

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

  /* monogram a csapatnévből */
  function monogram(name) {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  /* egy tag monogramja (keresztnév kezdőbetűje) */
  function memberInitial(i) {
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return A[i % A.length];
  }

  /* egyedi azonosítók + szín-index */
  /* ---------- adatréteg: Supabase (korábban localStorage) ----------
     A pont, a haladás és az állapot mostantól SZÁMÍTOTT: a csapat valódi
     játékmenetéből jön, nem kézi beírásból. Korábban a kézi érték és a
     tényleges menet két külön igazság volt, és az irányítópult a kéziből
     számolt KPI-t. */

  let COURSES = [];   // a pálya-választóhoz

  function dbSor(r, i) {
    return {
      id: r.id,
      name: r.name || '',
      captain: r.captain || '',
      members: r.member_count || 1,
      city: r.city || '',
      courseId: r.course_id || '',
      route: r.course_name || '',
      start: r.planned_start ? String(r.planned_start).slice(0, 5) : '',
      note: r.note || '',
      // számított mezők — csak megjelenítésre
      score: r.points || 0,
      progress: r.progress || 0,
      status: r.play_status || 'waiting',
      color: i % 6
    };
  }

  function saveStore() { /* szándékosan üres — az adatbázis a forrás */ }

  function betolt() {
    if (!window.UQAPI) return Promise.reject(new Error('Hiányzik az adatréteg.'));
    return Promise.all([
      UQAPI.rest('/v_admin_teams?select=*&order=name.asc'),
      UQAPI.rest('/v_admin_courses?select=id,name&order=sort_order.asc,name.asc')
    ]).then(([sorok, palyak]) => {
      COURSES = palyak || [];
      TEAMS.splice(0, TEAMS.length, ...(sorok || []).map(dbSor));
      if (!TEAMS.some(t => t.id === state.selectedId)) {
        state.selectedId = TEAMS.length ? TEAMS[0].id : null;
      }
      return TEAMS;
    });
  }

  const byId = id => TEAMS.find(t => t.id === id);
  const colorClass = t => 'tm-c' + ((t.color != null ? t.color : 0) % 6);

  TEAMS.splice(0, TEAMS.length);   // a beépített minta-adat kiürül

  /* ---------- állapot ---------- */
  const state = { search: '', status: 'all', perPage: 10, page: 1, selectedId: null, sort: { key: null, dir: 1 }, selected: new Set() };

  /* ---------- fő DOM ---------- */
  const tbody = document.getElementById('teamRows');
  const emptyEl = document.getElementById('jtkEmpty');
  const pagerEl = document.getElementById('jtkPager');
  const topSearch = document.getElementById('topSearch');
  const statusFilter = document.getElementById('statusFilter');
  const perPageSel = document.getElementById('perPage');

  /* ---------- fiók mezők ---------- */
  const drawer = document.getElementById('drawer');
  const fAva = document.getElementById('fAva');
  const fHeroName = document.getElementById('fHeroName');
  const fHeroSub = document.getElementById('fHeroSub');
  const fName = document.getElementById('fName');
  const fCaptain = document.getElementById('fCaptain');
  const fMembers = document.getElementById('fMembers');
  const fScore = document.getElementById('fScore');
  const fRoute = document.getElementById('fRoute');
  const fProgress = document.getElementById('fProgress');
  const fProgVal = document.getElementById('fProgVal');
  const fStart = document.getElementById('fStart');
  const fStatus = document.getElementById('fStatus');
  const cName = document.getElementById('cName');
  const statusDot = document.getElementById('fStatusDot');

  /* =========================================================
     TÁBLÁZAT RENDERELÉSE
     ========================================================= */
  function filtered() {
    const s = state.search.trim().toLowerCase();
    return TEAMS.filter(t => {
      if (state.status !== 'all' && t.status !== state.status) return false;
      if (s) {
        const hay = (t.name + ' ' + t.captain + ' ' + t.route).toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }

  function stackHTML(members) {
    const shown = Math.min(members, 3);
    let html = '';
    for (let i = 0; i < shown; i++) html += `<i>${memberInitial(i)}</i>`;
    if (members > shown) html += `<i class="tm-more">+${members - shown}</i>`;
    return `<span class="tm-stack">${html}</span>`;
  }

  function rowHTML(t) {
    const st = STATUS[t.status] || STATUS.waiting;
    const routeCell = t.route
      ? `<span class="tm-route">${ico('a-route')}<span>${esc(t.route)}</span></span>`
      : `<span class="tm-route is-none">${ico('a-route')}<span>Nincs pálya</span></span>`;
    return `<div class="jtk-row${t.id === state.selectedId ? ' is-active' : ''}${state.selected.has(t.id) ? ' is-selected' : ''}" data-id="${t.id}">
      <div class="jtk-name">
        <label class="jtk-check"><input type="checkbox" data-check="${t.id}"${state.selected.has(t.id) ? ' checked' : ''}><span></span></label>
        <span class="tm-ava ${colorClass(t)}">${esc(monogram(t.name))}</span>
        <span class="jtk-name-txt"><b>${esc(t.name)}</b><small>${esc(t.captain)}</small></span>
      </div>
      <div class="tm-members">
        <span class="tm-count">${ico('a-users')}${t.members}</span>
        ${stackHTML(t.members)}
      </div>
      <div>${routeCell}</div>
      <div><span class="tm-score${t.score === 0 ? ' is-zero' : ''}">${fmt(t.score)}</span></div>
      <div class="tm-prog">
        <div class="tm-prog-top"><span class="tm-prog-pct">${t.progress}%</span></div>
        <div class="tm-bar ${st.bar}"><i style="width:${t.progress}%"></i></div>
      </div>
      <div><span class="jtk-status ${st.pill}"><span class="dot"></span>${st.label}</span></div>
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
      const av = a[k], bv = b[k];
      if (typeof av === 'string' || typeof bv === 'string') return d * String(av == null ? '' : av).localeCompare(String(bv == null ? '' : bv), 'hu');
      return d * ((av || 0) - (bv || 0));
    });
  }

  function updateStats() {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    set('statTotal', TEAMS.length);
    set('statPlaying', TEAMS.filter(t => t.status === 'playing').length);
    set('statDone', TEAMS.filter(t => t.status === 'done').length);
    const avg = TEAMS.length ? Math.round(TEAMS.reduce((a, t) => a + (t.score || 0), 0) / TEAMS.length) : 0;
    set('statAvg', fmt(avg));
  }

  function updateBulk() {
    const ids = new Set(TEAMS.map(t => t.id));
    state.selected.forEach(id => { if (!ids.has(id)) state.selected.delete(id); });
    const bar = document.getElementById('bulkBar');
    const cnt = document.getElementById('bulkCount');
    if (cnt) cnt.textContent = state.selected.size;
    if (bar) bar.classList.toggle('is-hidden', state.selected.size === 0);
    const vis = filtered().map(t => t.id);
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
    const st = STATUS[STATUS_BY_LABEL[label] || 'playing'];
    statusDot.style.background = st.color;
    statusDot.style.boxShadow = st.glow ? '0 0 6px ' + st.color : 'none';
  }
  function applyProgress(v) {
    fProgVal.textContent = v + '%';
  }
  function applyHero(t) {
    fAva.className = 'tm-ava tm-ava-lg ' + colorClass(t);
    fAva.textContent = monogram(fName.value || t.name);
    fHeroName.textContent = fName.value || t.name;
    fHeroSub.textContent = 'Csapatvezető: ' + (fCaptain.value || t.captain || '—');
  }

  function fillDrawer(t) {
    fName.value = t.name; cName.textContent = t.name.length;
    fCaptain.value = t.captain;
    fMembers.value = String(t.members);
    fScore.value = fmt(t.score);
    fRoute.value = t.route;
    fProgress.value = t.progress; applyProgress(t.progress);
    fStart.value = t.start;
    fStatus.value = STATUS[t.status].label; applyStatus(STATUS[t.status].label);
    applyHero(t);
  }

  function markActive() {
    tbody.querySelectorAll('.jtk-row').forEach(r =>
      r.classList.toggle('is-active', r.dataset.id === String(state.selectedId)));
  }

  function selectTeam(id, focus) {
    const t = byId(id);
    if (!t) return;
    state.selectedId = id;
    fillDrawer(t);
    drawer.classList.remove('is-hidden');
    markActive();
    if (focus) fName.focus();
  }

  function ujratolt(uzenet, alcim) {
    return betolt().then(() => {
      render();
      if (uzenet) toast(uzenet, { type: 'ok', sub: alcim });
    });
  }
  function hibaToast(err) {
    toast('Nem sikerült', { type: 'warn', sub: String((err && err.message) || 'Ismeretlen hiba') });
  }
  function palyaIdNevbol(nev) {
    const c = COURSES.find(x => x.name === nev);
    return c ? c.id : '';
  }

  function saveDrawer() {
    const t = byId(state.selectedId);
    if (!t) { toast('Nincs kiválasztott csapat', { type: 'error' }); return; }
    UQAPI.rest('/rpc/save_team', { method: 'POST', body: { p: {
      id: t.id,
      name: fName.value.trim() || 'Névtelen csapat',
      captain: fCaptain.value.trim(),
      member_count: String(parseInt(fMembers.value, 10) || 1),
      course_id: palyaIdNevbol(fRoute.value),
      planned_start: fStart.value.trim()
    } } })
      .then(() => ujratolt('Csapat elmentve', fName.value.trim()))
      .catch(hibaToast);
  }

  function duplicateTeam(id) {
    const src = byId(id);
    if (!src) return;
    UQAPI.rest('/rpc/save_team', { method: 'POST', body: { p: {
      name: src.name + ' (másolat)',
      captain: src.captain,
      member_count: String(src.members || 1),
      city: src.city,
      course_id: src.courseId || '',
      planned_start: src.start || ''
    } } })
      .then(() => ujratolt('Csapat duplikálva', src.name + ' (másolat)'))
      .catch(hibaToast);
  }

  function deleteTeam(id) {
    const t = byId(id);
    if (!t) return;
    if (!window.confirm(
      'Csapat törlése — nincs visszavonás.\n\n' + t.name +
      (t.captain ? '\n(' + t.captain + ')' : '') +
      '\n\nA már lejátszott menetek és a ranglista-eredmények megmaradnak,' +
      '\ncsak a csapat-hozzárendelés szűnik meg.\n\nBiztosan törlöd?')) return;

    UQAPI.rest('/rpc/delete_team', { method: 'POST', body: { p_team: id } })
      .then(() => {
        state.selected.delete(id);
        if (state.selectedId === id) { state.selectedId = null; drawer.classList.add('is-hidden'); }
        return ujratolt('Csapat törölve', t.name);
      })
      .catch(hibaToast);
  }

  function newTeam() {
    UQAPI.rest('/rpc/save_team', { method: 'POST', body: { p: {
      name: 'Új csapat', member_count: '4'
    } } })
      .then(r => {
        const uj = Array.isArray(r) ? r[0] : r;
        state.search = ''; topSearch.value = '';
        state.status = 'all'; statusFilter.value = 'all';
        state.page = 1;
        state.selectedId = uj && uj.id;
        return betolt().then(() => {
          render();
          if (state.selectedId) selectTeam(state.selectedId, true);
          toast('Új csapat létrehozva', { sub: 'Töltsd ki az adatokat, majd Mentés' });
        });
      })
      .catch(hibaToast);
  }

  /* =========================================================
     ESEMÉNYEK
     ========================================================= */
  tbody.addEventListener('click', e => {
    if (e.target.closest('.jtk-check')) return; // jelölőnégyzet: ne nyissa a fiókot
    const row = e.target.closest('.jtk-row');
    if (!row) return;
    const id = row.dataset.id;   // UUID, nem szám
    const actBtn = e.target.closest('.jtk-act');
    if (actBtn) {
      const act = actBtn.dataset.act;
      if (act === 'edit') selectTeam(id, true);
      else if (act === 'copy') duplicateTeam(id);
      else if (act === 'delete') deleteTeam(id);
      return;
    }
    selectTeam(id);
  });

  /* sor-jelölőnégyzet kijelölése */
  tbody.addEventListener('change', e => {
    const input = e.target.closest('input[data-check]');
    if (!input) return;
    const id = input.dataset.check;   // UUID, nem szám
    if (input.checked) state.selected.add(id); else state.selected.delete(id);
    const row = input.closest('.jtk-row');
    if (row) row.classList.toggle('is-selected', input.checked);
    updateBulk();
  });

  /* fejléc: összes kijelölése (a szűrt listára) */
  const checkAllEl = document.getElementById('checkAll');
  if (checkAllEl) checkAllEl.addEventListener('change', () => {
    const vis = filtered().map(t => t.id);
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
    const removed = ids.map(id => { const idx = TEAMS.findIndex(t => t.id === id); return idx >= 0 ? { idx: idx, item: TEAMS[idx] } : null; }).filter(Boolean).sort((a, b) => a.idx - b.idx);
    ids.forEach(id => { const i = TEAMS.findIndex(t => t.id === id); if (i >= 0) TEAMS.splice(i, 1); });
    state.selected.clear();
    if (!byId(state.selectedId)) { if (TEAMS.length) { state.selectedId = TEAMS[0].id; fillDrawer(byId(state.selectedId)); } else drawer.classList.add('is-hidden'); }
    render();
    undoToast(removed.length + ' csapat törölve', '', () => {
      removed.forEach(r => TEAMS.splice(Math.min(r.idx, TEAMS.length), 0, r.item));
      render();
      toast('Törlés visszavonva', { sub: removed.length + ' csapat' });
    });
  });
  const bulkStatus = document.getElementById('bulkStatus');
  if (bulkStatus) bulkStatus.addEventListener('change', () => {
    const v = bulkStatus.value; if (!v) return;
    const ids = Array.from(state.selected);
    ids.forEach(id => { const t = byId(id); if (t) t.status = v; });
    const t0 = byId(state.selectedId); if (t0) fillDrawer(t0);
    bulkStatus.value = '';
    render();
    toast('Státusz módosítva', { sub: ids.length + ' csapat → ' + (STATUS[v] ? STATUS[v].label : v) });
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
  statusFilter.addEventListener('change', () => { state.status = statusFilter.value; state.page = 1; render(); });
  perPageSel.addEventListener('change', () => { state.perPage = parseInt(perPageSel.value, 10) || 10; state.page = 1; render(); });

  document.getElementById('btnNewTeam').addEventListener('click', newTeam);

  /* felső sáv: Mentés / Közzététel */
  document.getElementById('btnSave').addEventListener('click', () => { saveStore(); toast('Módosítások mentve', { sub: 'Minden változás elmentve' }); });
  document.getElementById('btnPublish').addEventListener('click', () => { saveStore(); toast('Csapatok közzétéve', { sub: 'A csapatlista frissült' }); });

  document.querySelectorAll('[data-pub]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.pub;
    saveStore();
    if (a === 'now') toast('Csapatok közzétéve', { sub: 'A csapatlista frissült' });
    else if (a === 'schedule') toast('Közzététel ütemezve', { type: 'info', sub: 'Időzített megjelenés beállítva' });
    else if (a === 'draft') toast('Piszkozatként mentve', { type: 'info', sub: 'Nem jelenik meg nyilvánosan' });
  }));

  document.querySelectorAll('[data-user]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.user;
    if (a === 'profile') toast('Profil', { type: 'info', sub: 'Profil megnyitása' });
    else if (a === 'settings') toast('Beállítások', { type: 'info', sub: 'Fiókbeállítások megnyitása' });
    else if (a === 'logout') toast('Kijelentkezés', { type: 'info', sub: 'Munkamenet lezárása' });
  }));

  /* fiók: élő karakterszámláló + hero frissítés */
  fName.addEventListener('input', () => {
    cName.textContent = fName.value.length;
    fAva.textContent = monogram(fName.value || 'Új');
    fHeroName.textContent = fName.value || 'Új csapat';
  });
  fCaptain.addEventListener('input', () => {
    fHeroSub.textContent = 'Csapatvezető: ' + (fCaptain.value || '—');
  });

  /* fiók: legördülő → pötty, csúszka → % */
  fStatus.addEventListener('change', () => applyStatus(fStatus.value));
  fProgress.addEventListener('input', () => applyProgress(parseInt(fProgress.value, 10) || 0));

  /* fiók: kezdés törlése */
  const clearBtn = document.querySelector('.jtk-clear');
  if (clearBtn) clearBtn.addEventListener('click', () => { fStart.value = ''; fStart.focus(); });

  /* fiók: mentés / előnézet / bezárás */
  document.querySelector('.jtk-save').addEventListener('click', saveDrawer);
  document.querySelector('.jtk-prev').addEventListener('click', () => { const t = byId(state.selectedId); const url = 'jatszas.html?route=' + encodeURIComponent(t ? t.route : ''); const w = window.open(url, '_blank'); if (w) { toast('Végigjátszás indul', { type: 'info', sub: 'Új lapon nyílik' }); } else { location.href = url; } });
  document.querySelector('.jtk-drawer-x').addEventListener('click', () => drawer.classList.add('is-hidden'));

  /* =========================================================
     INDÍTÁS — az adatbázisból töltünk, ezért aszinkron
     ========================================================= */
  function ures(html) { if (emptyEl) { emptyEl.hidden = false; emptyEl.innerHTML = html; } }

  /* A pont, a haladás és az állapot SZÁMÍTOTT — a menetekből jön.
     Ezért a szerkesztőben nem írható, és ezt meg is mondjuk. */
  function zarolSzamitottMezoket() {
    [[fScore, 'A pontot a játékmenet adja'],
     [fProgress, 'A haladást a bejárt állomások adják'],
     [fStatus, 'Az állapotot a játékmenet adja']].forEach(([el, cim]) => {
      if (!el) return;
      el.disabled = true;
      el.title = cim + ' — itt nem írható át.';
      const mezo = el.closest('.ed-row, .ed-field, label');
      if (mezo) mezo.classList.add('is-computed');
    });
  }

  function indul() {
    if (!window.UQAPI || !UQAPI.user()) {
      ures('<p><b>Nem vagy bejelentkezve.</b></p>' +
           '<p>A csapatok kezeléséhez admin fiók kell.</p>' +
           '<p><a class="adm-btn adm-btn-lime" href="bejelentkezes.html?next=csapatok.html">Bejelentkezés</a></p>');
      return;
    }
    betolt()
      .then(() => {
        if (fRoute && fRoute.tagName === 'SELECT') {
          fRoute.innerHTML = '<option value="">— nincs pálya —</option>' +
            COURSES.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('');
        }
        zarolSzamitottMezoket();
        render();
        if (state.selectedId) selectTeam(state.selectedId);
        if (!TEAMS.length) {
          ures('<p><b>Még nincs egyetlen csapat sem.</b></p>' +
               '<p>Hozz létre újat a fenti gombbal.</p>');
        }
      })
      .catch(err => ures('<p><b>A csapatok nem tölthetők be.</b></p><p>' +
                         esc(String(err && err.message || '')) + '</p>'));
  }

  indul();
  if (window.UQAPI) UQAPI.onAuth(() => indul());
})();
