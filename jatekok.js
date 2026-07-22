/* =========================================================
   URBAN QUEST — ADMIN / JÁTÉKOK interakciók
   ========================================================= */
(function () {
  'use strict';

  /* ---------- alapértelmezett listák (Mit csináltok / Jó, ha tudod) ---------- */
  const DEFAULT_DO = ['Rejtvények és feladványok megoldása a helyszínen', 'Rejtett nyomok felkutatása', 'Fotófeladatok teljesítése', 'Közös csapatmunka próbatételei'];
  const DEFAULT_KNOW = ['Kényelmes sétával teljesíthető', 'Bármikor megállhattok pihenni', 'Offline is játszható', 'Okostelefon szükséges a játékhoz'];

  /* ---------- adatok (egyetlen igazságforrás) ---------- */
  const GAMES = [
    { thumb: 1, name: 'Városliget Felfedező', desc: 'Fedezd fel a Városliget rejtett kincseit izgalmas kihívásokon keresztül.',
      longDesc: 'Fedezd fel a Városliget rejtett kincseit izgalmas kihívásokon keresztül. Ismerd meg a park történetét és oldj meg változatos feladatokat!',
      diff: 'Közepes', dur: '2–3 óra', loc: 'Budapest, Városliget', langs: ['hu', 'en'], more: 2, allLangs: ['hu', 'en', 'de', 'fr'], status: 'pub', price: '4 990', age: '12+',
      subtitle: 'Fedezd fel a park rejtett kincseit.', image: '', rating: 4.8, reviews: 64, distance: '3.2 km', team: '2–6 fő',
      category: 'varosi', doList: DEFAULT_DO.slice(), knowList: DEFAULT_KNOW.slice() },
    { thumb: 2, name: 'Budai Vár Rejtélye', desc: 'Nyomozós játék a Budai Vár titokzatos múltjában.',
      longDesc: 'Nyomozós játék a Budai Vár titokzatos múltjában. Fejtsd meg a rejtélyeket és tárd fel a vár elfeledett történeteit!',
      diff: 'Nehéz', dur: '2–3 óra', loc: 'Budapest, Budai Vár', langs: ['hu', 'en'], more: 1, allLangs: ['hu', 'en', 'de'], status: 'pub', price: '5 490', age: '14+',
      subtitle: 'Nyomozás a vár titkai közt.', image: '', rating: 4.7, reviews: 52, distance: '4.1 km', team: '2–6 fő',
      category: 'varosi', doList: DEFAULT_DO.slice(), knowList: DEFAULT_KNOW.slice() },
    { thumb: 3, name: 'Küldetés a Gyárban', desc: 'Szabadulós jellegű játék egy elhagyatott gyár területén.',
      longDesc: 'Szabadulós jellegű játék egy elhagyatott gyár területén. Oldd meg a fejtörőket és találj kiutat, mielőtt lejár az idő!',
      diff: 'Közepes', dur: '1,5–2 óra', loc: 'Budapest, Óbuda', langs: ['hu', 'de'], more: 1, allLangs: ['hu', 'de', 'en'], status: 'draft', price: '4 490', age: '16+',
      subtitle: 'Szabadulós kaland egy régi gyárban.', image: '', rating: 4.6, reviews: 38, distance: '2.4 km', team: '2–5 fő',
      category: 'varosi', doList: DEFAULT_DO.slice(), knowList: DEFAULT_KNOW.slice() },
    { thumb: 4, name: 'Földalatti Nyomok', desc: 'Rejtélyek a föld alatt, ahol a múlt nyomai vezetnek.',
      longDesc: 'Rejtélyek a föld alatt, ahol a múlt nyomai vezetnek. Kövesd a jeleket és fedd fel a város rejtett történelmét!',
      diff: 'Nehéz', dur: '2–3 óra', loc: 'Budapest, Belváros', langs: ['hu', 'en'], more: 0, allLangs: ['hu', 'en'], status: 'pub', price: '5 990', age: '14+',
      subtitle: 'A múlt nyomai a föld alatt.', image: '', rating: 4.9, reviews: 71, distance: '5.8 km', team: '2–6 fő',
      category: 'varosi', doList: DEFAULT_DO.slice(), knowList: DEFAULT_KNOW.slice() },
    { thumb: 5, name: 'Margitsziget Kaland', desc: 'Családbarát kaland a Margitsziget gyönyörű környezetében.',
      longDesc: 'Családbarát kaland a Margitsziget gyönyörű környezetében. Tökéletes program az egész családnak egy kellemes délutánra!',
      diff: 'Könnyű', dur: '1–1,5 óra', loc: 'Budapest, Margitsziget', langs: ['hu'], more: 0, allLangs: ['hu'], status: 'draft', price: '3 490', age: '6+',
      subtitle: 'Családbarát kaland a szigeten.', image: '', rating: 4.5, reviews: 29, distance: '2.8 km', team: '2–6 fő',
      category: 'termeszet', doList: DEFAULT_DO.slice(), knowList: DEFAULT_KNOW.slice() },
    { thumb: 6, name: 'Elveszett Örökség', desc: 'Egy eltűnt örökség nyomában a város legrégebbi épületeiben.',
      longDesc: 'Egy eltűnt örökség nyomában a város legrégebbi épületeiben. Fejtsd meg a régi kódokat és találd meg az elveszett kincset!',
      diff: 'Nehéz', dur: '2–3 óra', loc: 'Budapest, Belváros', langs: ['hu', 'en', 'de'], more: 0, allLangs: ['hu', 'en', 'de'], status: 'arch', price: '4 990', age: '12+',
      subtitle: 'Egy eltűnt örökség nyomában.', image: '', rating: 4.7, reviews: 44, distance: '3.6 km', team: '2–6 fő',
      category: 'varosi', doList: DEFAULT_DO.slice(), knowList: DEFAULT_KNOW.slice() }
  ];

  const DIFF_KEY = { 'Könnyű': 'konnyu', 'Közepes': 'kozepes', 'Nehéz': 'nehez' };
  const DIFF_COLOR = { konnyu: '#4fb84f', kozepes: '#e0b93a', nehez: '#e8813a' };
  const STATUS = {
    pub: { cls: 'is-pub', label: 'Közzétéve', color: '#4fb84f', glow: true },
    draft: { cls: 'is-draft', label: 'Piszkozat', color: '#7c86e0', glow: false },
    arch: { cls: 'is-arch', label: 'Archivált', color: '#5b6553', glow: false }
  };
  const STATUS_BY_LABEL = { 'Közzétéve': 'pub', 'Piszkozat': 'draft', 'Archivált': 'arch' };
  const LANG_LBL = { hu: 'HU', en: 'EN', de: 'DE', fr: 'FR' };
  const LANG_NAME = { hu: 'Magyar', en: 'English', de: 'Deutsch', fr: 'Français' };
  const ALL_LANG_CODES = ['hu', 'en', 'de', 'fr'];

  const ico = (id, cls) => `<svg class="ico ${cls || ''}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const langChip = c => `<span class="jtk-lang"><svg class="flag" aria-hidden="true"><use href="#f-${c}"/></svg>${LANG_LBL[c]}</span>`;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- adatréteg: Supabase (korábban localStorage) ----------
     Eddig ez az oldal a böngésző tárolójába írt, ezért a szerkesztés
     nem jutott el a publikus oldalra, és törölni sem lehetett semmit.
     Most az adatbázis az egyetlen igazságforrás.

     Az azonosító UUID lett — a régi egész számú id-k két böngészőben
     ütköztek volna. */

  const STATUS_DB = { pub: 'pub', draft: 'draft', arch: 'archived' };
  const STATUS_UI = { pub: 'pub', draft: 'draft', archived: 'arch' };
  const DIFF_LBL = { konnyu: 'Könnyű', kozepes: 'Közepes', nehez: 'Nehéz', extrem: 'Extrém' };
  const DIFF_DB  = { 'Könnyű': 'konnyu', 'Közepes': 'kozepes', 'Nehéz': 'nehez', 'Extrém': 'extrem' };

  const ezres = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  function dbSor(r) {
    const langs = Array.isArray(r.languages) ? r.languages : ['hu'];
    const ora = r.duration_min == null ? ''
      : (r.duration_max && r.duration_max !== r.duration_min
          ? r.duration_min + '–' + r.duration_max + ' óra'
          : r.duration_min + ' óra');
    return {
      id: r.id,
      name: r.name || '',
      desc: r.summary || '',
      longDesc: r.about || '',
      subtitle: r.subtitle || '',
      diff: DIFF_LBL[r.difficulty] || 'Közepes',
      dur: ora,
      loc: [r.city, r.area].filter(Boolean).join(', '),
      langs: langs.slice(0, 3),
      allLangs: langs,
      more: Math.max(0, langs.length - 3),
      status: STATUS_UI[r.status] || 'draft',
      price: r.price_huf == null ? '' : (r.price_huf === 0 ? 'INGYENES' : ezres(r.price_huf)),
      age: r.age_min == null ? '' : (r.age_min + '+'),
      team: r.team_min == null ? '' : (r.team_min + '–' + (r.team_max || r.team_min) + ' fő'),
      image: r.cover_image || '',
      category: r.category || 'varosi',
      doList: Array.isArray(r.do_list) ? r.do_list : [],
      knowList: Array.isArray(r.know_list) ? r.know_list : [],
      distance: r.distance_m == null ? '' : (r.distance_m / 1000).toFixed(1).replace('.', ',') + ' km',
      rating: 0, reviews: 0,
      thumb: (Math.abs(String(r.id).charCodeAt(0) + String(r.id).charCodeAt(1)) % 6) + 1,
      // csak a felület számára — törlés előtti figyelmeztetéshez
      _allomas: r.allomas_db, _feladat: r.feladat_db, _menet: r.menet_db,
      _elo: r.van_elo_verzio, _slug: r.slug
    };
  }

  // A mentést mostantól a save_course() RPC végzi soronként; nincs
  // többé „az egész tömböt kiírom" minta.
  function saveStore() { /* szándékosan üres — az adatbázis a forrás */ }

  function betolt() {
    if (!window.UQAPI) return Promise.reject(new Error('Hiányzik az adatréteg.'));
    return UQAPI.rest('/v_admin_courses?select=*&order=sort_order.asc,name.asc')
      .then(rows => {
        GAMES.splice(0, GAMES.length, ...(rows || []).map(dbSor));
        if (!GAMES.some(g => g.id === state.selectedId)) {
          state.selectedId = GAMES.length ? GAMES[0].id : null;
        }
        return GAMES;
      });
  }

  const byId = id => GAMES.find(g => g.id === id);
  const firstSentence = (text) => {
    const t = (text || '').trim();
    if (!t) return '';
    const m = t.match(/^[^.!?]*[.!?]/);
    return (m ? m[0] : t).trim();
  };

  /* A beépített minta-adat csak a szerkesztő alapértelmezéseihez kellett;
     a lista az adatbázisból jön, ezért induláskor kiürítjük — különben
     a demó pályák villannának fel a valódiak előtt. */
  GAMES.splice(0, GAMES.length);

  /* ---------- állapot ---------- */
  const state = { search: '', status: 'all', perPage: 10, page: 1, selectedId: null };

  /* ---------- fő DOM-hivatkozások ---------- */
  const tbody = document.getElementById('gameRows');
  const emptyEl = document.getElementById('jtkEmpty');
  const pagerEl = document.getElementById('jtkPager');
  const topSearch = document.getElementById('topSearch');
  const statusFilter = document.getElementById('statusFilter');
  const perPageSel = document.getElementById('perPage');

  /* ---------- fiók mezők ---------- */
  const drawer = document.getElementById('drawer');
  const fName = document.getElementById('fName');
  const fDesc = document.getElementById('fDesc');
  const fDiff = document.getElementById('fDiff');
  const fDur = document.getElementById('fDur');
  const fLoc = document.getElementById('fLoc');
  const fPrice = document.getElementById('fPrice');
  const fStatus = document.getElementById('fStatus');
  const fAge = document.getElementById('fAge');
  const fSubtitle = document.getElementById('fSubtitle');
  const fImage = document.getElementById('fImage');
  const fRating = document.getElementById('fRating');
  const fReviews = document.getElementById('fReviews');
  const fDistance = document.getElementById('fDistance');
  const fTeam = document.getElementById('fTeam');
  const cName = document.getElementById('cName');
  const cDesc = document.getElementById('cDesc');
  const diffDots = document.getElementById('fDiffDots');
  const diffDot = document.getElementById('fDiffDot');
  const statusDot = document.getElementById('fStatusDot');
  const fLangs = document.getElementById('fLangs');
  const langMenu = document.getElementById('langMenu');
  const langPop = document.getElementById('langPop');
  const fCategory = document.getElementById('fCategory');
  const fImagePick = document.getElementById('fImagePick');
  const fDoList = document.getElementById('fDoList');
  const fKnowList = document.getElementById('fKnowList');
  const fDoAdd = document.getElementById('fDoAdd');
  const fKnowAdd = document.getElementById('fKnowAdd');
  const mediaPicker = document.getElementById('mediaPicker');
  const mediaPickerGrid = document.getElementById('mediaPickerGrid');

  /* =========================================================
     TOAST
     ========================================================= */
  const toastWrap = document.getElementById('uqToasts');
  function toast(msg, opts) {
    opts = opts || {};
    const type = opts.type || 'ok';
    const sub = opts.sub || '';
    const t = document.createElement('div');
    t.className = 'uq-toast' + (type !== 'ok' ? ' is-' + type : '');
    t.innerHTML =
      `<span class="uq-toast-ic">${ico('a-check-c')}</span>` +
      `<div class="uq-toast-body"><b>${esc(msg)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>` +
      `<button class="uq-toast-x" type="button" aria-label="Bezárás">${ico('a-close', 'ico-sm')}</button>`;
    toastWrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('is-show'));
    const dismiss = () => { t.classList.remove('is-show'); setTimeout(() => t.remove(), 260); };
    t.querySelector('.uq-toast-x').addEventListener('click', dismiss);
    setTimeout(dismiss, 3200);
  }

  /* =========================================================
     TÁBLÁZAT RENDERELÉSE (szűrés + lapozás)
     ========================================================= */
  function filtered() {
    const s = state.search.trim().toLowerCase();
    return GAMES.filter(g => {
      if (state.status !== 'all' && g.status !== state.status) return false;
      if (s) {
        const hay = (g.name + ' ' + g.desc + ' ' + g.longDesc).toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }

  /* Beágyazott ikonok: az oldal sprite-ja csak 6 szimbólumot tartalmaz,
     ezért a sprite-hivatkozás itt üres gombot adna. */
  const SVG_ARCHIVE =
    '<svg class="ico ico-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/>' +
    '<path d="M10 12h4"/></svg>';
  const SVG_TRASH =
    '<svg class="ico ico-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/>' +
    '<path d="M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

  function rowHTML(g) {
    const dk = DIFF_KEY[g.diff] || 'kozepes';
    const st = STATUS[g.status] || STATUS.draft;
    const langs = g.langs.map(langChip).join('') + (g.more ? `<span class="jtk-more">+${g.more}</span>` : '');
    return `<div class="jtk-row${g.id === state.selectedId ? ' is-active' : ''}" data-id="${g.id}">
      <div class="jtk-name">
        <span class="jtk-thumb jtk-thumb-${g.thumb}"></span>
        <span class="jtk-name-txt"><b>${esc(g.name)}</b><small>${esc(g.desc)}</small></span>
      </div>
      <div class="jtk-cell-diff"><span class="jtk-diff jtk-diff-${dk}"><i></i><i></i><i></i><i></i><i></i></span><span class="jtk-diff-lbl">${esc(g.diff)}</span></div>
      <div class="jtk-cell-dur">${esc(g.dur)}</div>
      <div class="jtk-cell-loc">${esc(g.loc)}</div>
      <div class="jtk-langs">${langs}</div>
      <div><span class="jtk-status ${st.cls}"><span class="dot"></span>${st.label}</span>${
        nincsElo(g) ? '<span class="jtk-warn" title="Közzétett, de nincs befagyasztott verziója, ezért nem jelenik meg a publikus oldalon. Nyomd meg a Közzététel gombot.">nem látható</span>' : ''
      }</div>
      <div class="jtk-actions">
        <button class="jtk-act jtk-act-edit" type="button" data-act="edit" aria-label="Szerkesztés">${ico('a-edit')}</button>
        <button class="jtk-act" type="button" data-act="copy" aria-label="Másolás">${ico('a-copy')}</button>
        <button class="jtk-act" type="button" data-act="preview" aria-label="Előnézet">${ico('a-eye')}</button>
        <button class="jtk-act" type="button" data-act="archive"
          aria-label="${g.status === 'arch' ? 'Visszaállítás' : 'Archiválás'}"
          title="${g.status === 'arch' ? 'Visszaállítás piszkozatba' : 'Archiválás — eltűnik a publikus oldalról, az eredmények megmaradnak'}">${SVG_ARCHIVE}</button>
        <button class="jtk-act jtk-act-del" type="button" data-act="delete"
          aria-label="Végleges törlés" title="Végleges törlés — nincs visszaút">${SVG_TRASH}</button>
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

  function render() {
    const list = filtered();
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
    saveStore();
  }

  /* =========================================================
     FIÓK (szerkesztő)
     ========================================================= */
  function applyDiff(label) {
    const dk = DIFF_KEY[label] || 'kozepes';
    diffDots.className = 'jtk-diff jtk-diff-' + dk;
    diffDot.style.background = DIFF_COLOR[dk];
  }
  function applyStatus(label) {
    const st = STATUS[STATUS_BY_LABEL[label] || 'pub'];
    statusDot.style.background = st.color;
    statusDot.style.boxShadow = st.glow ? '0 0 6px ' + st.color : 'none';
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

  /* ---------- szerkeszthető szöveglisták (Mit csináltok / Jó, ha tudod) ---------- */
  function listRowHTML(val) {
    return `<div class="jtk-li-row"><input type="text" value="${esc(val)}" placeholder="Elem szövege…"><button class="jtk-li-x" type="button" data-lrm aria-label="Eltávolítás">${ico('a-close', 'ico-xs')}</button></div>`;
  }
  function renderList(container, arr) {
    container.innerHTML = (Array.isArray(arr) ? arr : []).map(listRowHTML).join('');
  }
  function addListRow(container, val) {
    container.insertAdjacentHTML('beforeend', listRowHTML(val || ''));
    const inp = container.lastElementChild && container.lastElementChild.querySelector('input');
    if (inp) inp.focus();
  }
  function collectList(container) {
    return Array.from(container.querySelectorAll('input')).map(i => i.value.trim()).filter(Boolean);
  }

  function fillDrawer(g) {
    fName.value = g.name; cName.textContent = g.name.length;
    fDesc.value = g.longDesc; cDesc.textContent = g.longDesc.length;
    fDiff.value = g.diff; applyDiff(g.diff);
    fDur.value = g.dur;
    fLoc.value = g.loc;
    fPrice.value = g.price;
    fStatus.value = STATUS[g.status].label; applyStatus(STATUS[g.status].label);
    fAge.value = g.age;
    fSubtitle.value = g.subtitle || '';
    fImage.value = g.image || '';
    fRating.value = (g.rating != null ? g.rating : '');
    fReviews.value = (g.reviews != null ? g.reviews : '');
    fDistance.value = g.distance || '';
    fTeam.value = g.team || '';
    fCategory.value = g.category || 'varosi';
    renderList(fDoList, (Array.isArray(g.doList) && g.doList.length) ? g.doList : DEFAULT_DO.slice());
    renderList(fKnowList, (Array.isArray(g.knowList) && g.knowList.length) ? g.knowList : DEFAULT_KNOW.slice());
    rebuildLangs(g.allLangs);
  }

  function markActive() {
    tbody.querySelectorAll('.jtk-row').forEach(r =>
      r.classList.toggle('is-active', r.dataset.id === String(state.selectedId)));
  }

  function selectGame(id, focus) {
    const g = byId(id);
    if (!g) return;
    state.selectedId = id;
    fillDrawer(g);
    drawer.classList.remove('is-hidden');
    markActive();
    if (focus) fName.focus();
  }

  /* ---- a felület formázott szövegeiből számok az adatbázisnak ---- */

  const szam = (s) => { const m = String(s == null ? '' : s).replace(',', '.').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : null; };
  const tartomany = (s) => {
    const t = String(s || '').replace(/,/g, '.');
    const m = t.match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/);
    if (m) return [Math.round(+m[1]), Math.round(+m[2])];
    const e = szam(t);
    return e == null ? [null, null] : [Math.round(e), null];
  };
  const arFt = (s) => {
    const t = String(s || '').trim();
    if (!t) return null;
    if (/ingyen/i.test(t)) return 0;
    const m = t.replace(/[\s.]/g, '').match(/\d+/);
    return m ? +m[0] : null;
  };

  function urlapPayload(id) {
    const [dmin, dmax] = tartomany(fDur.value);
    const [tmin, tmax] = tartomany(fTeam.value);
    const loc = String(fLoc.value || '').split(',');
    const codes = currentDrawerLangs();
    const km = szam(fDistance.value);
    return {
      id: id || null,
      name: fName.value.trim() || 'Névtelen játék',
      about: fDesc.value,
      summary: firstSentence(fDesc.value) || fDesc.value.trim(),
      subtitle: fSubtitle.value.trim(),
      difficulty: DIFF_DB[fDiff.value] || 'kozepes',
      category: fCategory.value || 'varosi',
      status: STATUS_DB[STATUS_BY_LABEL[fStatus.value] || 'draft'] || 'draft',
      city: (loc[0] || '').trim() || null,
      area: loc.length > 1 ? loc.slice(1).join(',').trim() : null,
      cover_image: fImage.value.trim() || null,
      price_huf: arFt(fPrice.value),
      duration_min: dmin, duration_max: dmax,
      team_min: tmin, team_max: tmax,
      age_min: szam(fAge.value),
      distance_m: km == null ? null : Math.round(km * 1000),
      languages: codes.length ? codes : ['hu'],
      do_list: collectList(fDoList),
      know_list: collectList(fKnowList)
    };
  }

  function saveDrawer() {
    if (!state.selectedId) { toast('Nincs kiválasztott játék', { type: 'error' }); return; }
    UQAPI.rest('/rpc/save_course', { method: 'POST', body: { p: urlapPayload(state.selectedId) } })
      .then(() => ujratolt('Játék elmentve', 'A publikus oldalon is frissült'))
      .catch(hibaToast);
  }

  function duplicateGame(id) {
    const src = byId(id);
    if (!src) return;
    // A másolat CSAK a katalógus-adatokat viszi: az állomások és
    // feladatok nem jönnek vele, mert azok a pályához tartoznak.
    UQAPI.rest('/rpc/save_course', {
      method: 'POST',
      body: { p: {
        name: src.name + ' (másolat)',
        summary: src.desc, about: src.longDesc, subtitle: src.subtitle,
        difficulty: DIFF_DB[src.diff] || 'kozepes',
        category: src.category, status: 'draft',
        city: (src.loc || '').split(',')[0].trim() || null,
        languages: src.allLangs
      } }
    })
      .then(() => ujratolt('Játék duplikálva', src.name + ' (másolat) — piszkozatként, állomások nélkül'))
      .catch(hibaToast);
  }

  function newGame() {
    // Az azonosítót az adatbázis adja (UUID) — a régi max+1 két
    // böngészőben ütköző id-ket gyártott.
    UQAPI.rest('/rpc/save_course', {
      method: 'POST',
      body: { p: {
        name: 'Új játék',
        about: 'Rövid leírás a játékról. Add meg a részleteket a szerkesztőben.',
        summary: 'Rövid leírás a játékról.',
        difficulty: 'konnyu', category: 'varosi', status: 'draft',
        city: 'Budapest', languages: ['hu'],
        do_list: DEFAULT_DO.slice(), know_list: DEFAULT_KNOW.slice()
      } }
    })
      .then(r => {
        const uj = Array.isArray(r) ? r[0] : r;
        /* a szűrők törlése, hogy az új (piszkozat) sor biztosan látszódjon */
        state.search = ''; topSearch.value = '';
        state.status = 'all'; statusFilter.value = 'all';
        state.page = 1;
        state.selectedId = uj && uj.id;
        return betolt().then(() => {
          render();
          if (state.selectedId) selectGame(state.selectedId, true);
          toast('Új játék létrehozva', { sub: 'Töltsd ki az adatokat, majd Mentés' });
        });
      })
      .catch(hibaToast);
  }

  /* =========================================================
     MENÜK (dropdown + chip-menu) — közös nyitás/zárás
     ========================================================= */
  function closeAllMenus() {
    document.querySelectorAll('[data-dd].is-open, [data-chipmenu].is-open').forEach(x => x.classList.remove('is-open'));
  }

  document.querySelectorAll('[data-dd]').forEach(dd => {
    const t = dd.querySelector('[data-dd-toggle]');
    if (!t) return;
    t.addEventListener('click', e => {
      e.stopPropagation();
      const open = dd.classList.contains('is-open');
      closeAllMenus();
      dd.classList.toggle('is-open', !open);
    });
  });

  document.addEventListener('click', closeAllMenus);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllMenus(); });

  /* =========================================================
     ARCHIVÁLÁS / TÖRLÉS
     ========================================================= */

  function ujratolt(uzenet, alcim) {
    return betolt().then(() => {
      render();
      if (uzenet) toast(uzenet, { type: 'ok', sub: alcim });
      // a publikus oldal gyorstára is essen el, hogy azonnal frissüljön
      try { localStorage.removeItem('uq_catalog_v1'); } catch (e) {}
    });
  }

  function hibaToast(err) {
    var m = String((err && err.message) || 'Ismeretlen hiba');
    toast('Nem sikerült', { type: 'warn', sub: m });
  }

  function archiveGame(id) {
    const g = byId(id);
    if (!g) return;
    const vissza = g.status === 'arch';
    UQAPI.rest('/rpc/archive_course', {
      method: 'POST', body: { p_course: id, p_archive: !vissza }
    })
      .then(() => ujratolt(
        vissza ? 'Visszaállítva' : 'Archiválva',
        vissza ? g.name + ' — piszkozatba került, újra közzéteheted'
               : g.name + ' — eltűnt a publikus oldalról, az eredmények megmaradtak'))
      .catch(hibaToast);
  }

  function deleteGame(id) {
    const g = byId(id);
    if (!g) return;

    // Amit a törlés elvinne — mondjuk ki előre, ne utólag derüljön ki.
    const veszit = [];
    if (g._allomas) veszit.push(g._allomas + ' állomás');
    if (g._feladat) veszit.push(g._feladat + ' feladat');
    if (g._menet)   veszit.push(g._menet + ' játékmenet');

    if (g._menet) {
      toast('Nem törölhető véglegesen', {
        type: 'warn',
        sub: g.name + ' — már játszották (' + g._menet + ' menet). Archiváld helyette, így az eredmények megmaradnak.'
      });
      return;
    }

    const uzenet =
      'VÉGLEGES TÖRLÉS — nincs visszaút.\n\n' + g.name + '\n' +
      (veszit.length ? '\nEzzel együtt megszűnik: ' + veszit.join(', ') + '.\n' : '') +
      '\nHa csak el akarod tüntetni a publikus oldalról, használd inkább az archiválást.\n\n' +
      'Biztosan véglegesen törlöd?';

    if (!window.confirm(uzenet)) return;

    UQAPI.rest('/rpc/delete_course', { method: 'POST', body: { p_course: id } })
      .then(() => {
        if (state.selectedId === id) state.selectedId = null;
        return ujratolt('Véglegesen törölve', g.name);
      })
      .catch(hibaToast);
  }

  /* =========================================================
     ESEMÉNYEK
     ========================================================= */
  /* táblázat: sor + művelet ikonok (delegálás) */
  tbody.addEventListener('click', e => {
    const row = e.target.closest('.jtk-row');
    if (!row) return;
    const id = row.dataset.id;   // UUID, nem szám
    const actBtn = e.target.closest('.jtk-act');
    if (actBtn) {
      const act = actBtn.dataset.act;
      if (act === 'edit') selectGame(id, true);
      else if (act === 'copy') duplicateGame(id);
      else if (act === 'preview') { const g = byId(id); if (g) toast('Előnézet: ' + g.name, { type: 'info', sub: 'A játék előnézete megnyílik' }); }
      else if (act === 'archive') archiveGame(id);
      else if (act === 'delete') deleteGame(id);
      return; /* nem folytatjuk a sor-kijelöléssel */
    }
    selectGame(id);
  });

  /* lapozó (delegálás) */
  pagerEl.addEventListener('click', e => {
    const btn = e.target.closest('.jtk-pg');
    if (!btn || btn.disabled) return;
    if (btn.classList.contains('jtk-pg-prev')) state.page = Math.max(1, state.page - 1);
    else if (btn.classList.contains('jtk-pg-next')) state.page = state.page + 1;
    else if (btn.dataset.page) state.page = parseInt(btn.dataset.page, 10) || 1;
    render();
  });

  /* felső sáv: kereső → élő szűrés */
  topSearch.addEventListener('input', () => { state.search = topSearch.value; state.page = 1; render(); });

  /* fejléc: státusz-szűrő */
  statusFilter.addEventListener('change', () => { state.status = statusFilter.value; state.page = 1; render(); });

  /* fejléc: új játék */
  document.getElementById('btnNewGame').addEventListener('click', newGame);

  /* lábléc: sorok oldalanként */
  perPageSel.addEventListener('change', () => { state.perPage = parseInt(perPageSel.value, 10) || 10; state.page = 1; render(); });

  /* a kiválasztott játék státuszának beállítása + mentés (render → saveStore) */
  /* A státusz önmagában NEM tesz láthatóvá egy pályát: ahhoz befagyasztott
     verzió is kell (course_versions). Ezért a közzététel két lépés, és a
     másodikat is elvégezzük — különben a pálya „közzétett”, de láthatatlan. */
  function setSelectedStatus(status) {
    const g = byId(state.selectedId);
    if (!g) { toast('Nincs kiválasztott játék', { type: 'error' }); return false; }
    const id = g.id;

    UQAPI.rest('/rpc/save_course', { method: 'POST', body: { p: { id: id, status: STATUS_DB[status] || status } } })
      .then(() => {
        if (status !== 'pub') return ujratolt('Piszkozatként mentve', g.name + ' — nem jelenik meg nyilvánosan');
        // közzététel: friss verziót fagyasztunk be, ettől lesz látható és játszható
        return UQAPI.rest('/rpc/publish_course', { method: 'POST', body: { p_course: id } })
          .then(r => {
            const v = Array.isArray(r) ? r[0] : r;
            const figy = (v && v.warnings && v.warnings.length)
              ? ' — figyelmeztetés: ' + v.warnings.join('; ')
              : '';
            return ujratolt('Közzétéve', g.name + ' (v' + (v && v.version) + ')' + figy);
          });
      })
      .catch(hibaToast);
    return true;
  }

  /* A pálya „közzétett”, de nincs élő verziója → nem látszik sehol.
     Ezt ki kell mondani, mert semmi máson nem látszik. */
  function nincsElo(g) { return g.status === 'pub' && g._elo === false; }

  /* felső sáv: Mentés / Közzététel */
  document.getElementById('btnSave').addEventListener('click', () => { saveStore(); toast('Módosítások mentve', { sub: 'Minden változás elmentve' }); });
  document.getElementById('btnPublish').addEventListener('click', () => {
    if (setSelectedStatus('pub')) toast('Közzétéve — megjelenik a főoldalon');
  });

  /* Közzététel legördülő */
  document.querySelectorAll('[data-pub]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.pub;
    if (a === 'now') { if (setSelectedStatus('pub')) toast('Közzétéve — megjelenik a főoldalon'); }
    else if (a === 'schedule') { saveStore(); toast('Közzététel ütemezve', { type: 'info', sub: 'Időzített megjelenés beállítva' }); }
    else if (a === 'draft') { if (setSelectedStatus('draft')) toast('Piszkozatként mentve', { type: 'info', sub: 'Nem jelenik meg nyilvánosan' }); }
  }));

  /* Felhasználói legördülő */
  document.querySelectorAll('[data-user]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.user;
    if (a === 'profile') toast('Profil', { type: 'info', sub: 'Profil megnyitása' });
    else if (a === 'settings') toast('Beállítások', { type: 'info', sub: 'Fiókbeállítások megnyitása' });
    else if (a === 'logout') toast('Kijelentkezés', { type: 'info', sub: 'Munkamenet lezárása' });
  }));

  /* fiók: élő karakterszámlálók */
  fName.addEventListener('input', () => { cName.textContent = fName.value.length; });
  fDesc.addEventListener('input', () => { cDesc.textContent = fDesc.value.length; });

  /* fiók: legördülők → pöttyök */
  fDiff.addEventListener('change', () => applyDiff(fDiff.value));
  fStatus.addEventListener('change', () => applyStatus(fStatus.value));

  /* fiók: nyelv-chip eltávolítás (delegálás) */
  fLangs.addEventListener('click', e => {
    const x = e.target.closest('.jtk-lang-x');
    if (x) { e.stopPropagation(); x.closest('.ed-lang').remove(); }
  });

  /* fiók: nyelv hozzáadása (chip-menu) */
  function buildLangPop() {
    const current = currentDrawerLangs();
    langPop.innerHTML = ALL_LANG_CODES.map(c => {
      const added = current.includes(c);
      return `<button class="uq-chip-opt${added ? ' is-selected' : ''}" type="button" data-lang="${c}"${added ? ' disabled' : ''}>` +
        `<svg class="flag" aria-hidden="true"><use href="#f-${c}"/></svg>${LANG_NAME[c]}${ico('a-check', 'ico-xs uq-chip-check')}</button>`;
    }).join('');
  }
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

  /* fiók: szerkeszthető listák (Mit csináltok / Jó, ha tudod) */
  fDoAdd.addEventListener('click', () => addListRow(fDoList, ''));
  fKnowAdd.addEventListener('click', () => addListRow(fKnowList, ''));
  function bindListRemove(container) {
    container.addEventListener('click', e => {
      const rm = e.target.closest('[data-lrm]');
      if (rm) { e.stopPropagation(); rm.closest('.jtk-li-row').remove(); }
    });
  }
  bindListRemove(fDoList);
  bindListRemove(fKnowList);

  /* fiók: Média-tár képválasztó */
  const MEDIA_STORE = 'uq_media_v1';
  function loadMedia() {
    try { const arr = JSON.parse(localStorage.getItem(MEDIA_STORE)); return Array.isArray(arr) ? arr : []; } catch (e) { return []; }
  }
  function openMediaPicker() {
    const items = loadMedia().filter(m => m && m.type === 'image' && m.src);
    if (!items.length) {
      mediaPickerGrid.innerHTML = '<div class="jtk-mp-empty">Nincs feltöltött kép a Média-tárban — tölts fel a <a href="media.html">Média oldalon</a>.</div>';
    } else {
      mediaPickerGrid.innerHTML = items.map(m =>
        `<button class="jtk-mp-item" type="button" data-src="${esc(m.src)}"><img src="${esc(m.src)}" alt=""><span>${esc(m.name || 'kép')}</span></button>`
      ).join('');
    }
    mediaPicker.classList.add('is-open');
    mediaPicker.setAttribute('aria-hidden', 'false');
  }
  function closeMediaPicker() {
    mediaPicker.classList.remove('is-open');
    mediaPicker.setAttribute('aria-hidden', 'true');
  }
  fImagePick.addEventListener('click', openMediaPicker);
  mediaPickerGrid.addEventListener('click', e => {
    const item = e.target.closest('.jtk-mp-item');
    if (!item) return;
    fImage.value = item.dataset.src || '';
    closeMediaPicker();
    toast('Kép kiválasztva');
  });
  mediaPicker.querySelectorAll('[data-mp-close]').forEach(b => b.addEventListener('click', closeMediaPicker));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && mediaPicker.classList.contains('is-open')) closeMediaPicker(); });

  /* fiók: helyszín törlés */
  const clearBtn = document.querySelector('.jtk-clear');
  if (clearBtn) clearBtn.addEventListener('click', () => { fLoc.value = ''; fLoc.focus(); });

  /* fiók: mentés / előnézet / bezárás */
  document.querySelector('.jtk-save').addEventListener('click', saveDrawer);
  document.querySelector('.jtk-prev').addEventListener('click', () => { const url = 'jatszas.html?game=' + encodeURIComponent(state.selectedId); const w = window.open(url, '_blank'); if (w) { toast('Végigjátszás indul', { type: 'info', sub: 'Új lapon nyílik' }); } else { location.href = url; } });
  document.querySelector('.jtk-drawer-x').addEventListener('click', () => drawer.classList.add('is-hidden'));

  /* =========================================================
     OLDALSÁV
     ========================================================= */
  /* nav aktív-váltás + navigáció */
  const navItems = Array.from(document.querySelectorAll('.adm-nav-item'));
  navItems.forEach(item => item.addEventListener('click', e => {
    if (item.getAttribute('href') === '#') {
      e.preventDefault();
      navItems.forEach(n => n.classList.toggle('is-active', n === item));
    }
  }));

  /* összecsukás (csak asztali nézetben) */
  const admSide = document.getElementById('admSide');
  const sideToggle = document.querySelector('[data-side-toggle]');
  if (sideToggle) {
    sideToggle.addEventListener('click', () => {
      if (window.innerWidth <= 900) return;
      admSide.classList.toggle('is-collapsed');
      try { localStorage.setItem('uqGamesSideCollapsed', admSide.classList.contains('is-collapsed')); } catch (err) {}
    });
    try {
      if (localStorage.getItem('uqGamesSideCollapsed') === 'true' && window.innerWidth > 900) {
        admSide.classList.add('is-collapsed');
      }
    } catch (err) {}
  }

  /* =========================================================
     INDÍTÁS — az adatbázisból töltünk, ezért aszinkron
     ========================================================= */
  function indul() {
    if (!window.UQAPI || !UQAPI.user()) {
      emptyEl.hidden = false;
      emptyEl.innerHTML =
        '<p><b>Nem vagy bejelentkezve.</b></p>' +
        '<p>A játékok szerkesztéséhez admin fiók kell.</p>' +
        '<p><a class="adm-btn adm-btn-lime" href="bejelentkezes.html?next=jatekok.html">Bejelentkezés</a></p>';
      return;
    }
    betolt()
      .then(() => {
        render();
        if (state.selectedId) selectGame(state.selectedId);
        if (!GAMES.length) {
          emptyEl.hidden = false;
          emptyEl.innerHTML =
            '<p><b>Még nincs egyetlen pálya sem.</b></p>' +
            '<p>Hozz létre újat, vagy hozd át a meglévőket az ' +
            '<a href="atkoltoztetes.html">átköltöztetéssel</a>.</p>';
        }
      })
      .catch(err => {
        emptyEl.hidden = false;
        emptyEl.innerHTML =
          '<p><b>A játékok nem tölthetők be.</b></p>' +
          '<p>' + esc(String(err && err.message || '')) + '</p>';
      });
  }

  indul();
  if (window.UQAPI) UQAPI.onAuth(() => indul());
})();
