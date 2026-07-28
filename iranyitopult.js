/* =========================================================
   URBAN QUEST — KÖZÖS ADMIN UI (scaffold)
   toast / legördülő / oldalsáv-összecsukás / nav
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

  /* ---------- globális zárás ---------- */
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

  /* ---------- export ---------- */
  window.UQ = window.UQ || {};
  window.UQ.toast = toast;
  window.UQ.closeAllMenus = closeAllMenus;
  window.UQ.bindDropdowns = bindDropdowns;
})();


/* =========================================================
   URBAN QUEST — IRÁNYÍTÓPULT

   Ez a lap korábban öt HALOTT localStorage-kulcsot olvasott, és ha azok
   üresek voltak — márpedig mindig azok, mert az adatok rég az
   adatbázisban vannak —, akkor beégetett minta-tömbökből számolt.
   Így 8 pályát, 10 csapatot, 9 feladatot és 58%-os befejezési arányt
   közölt élő időbélyeggel, miközben a valóság egészen más. Nyilvános
   URL-en bárki megnyithatta, és kitalált üzleti számokat látott.

   Innentől kizárólag a v_admin_* nézetekből dolgozik. Ha nincs
   bejelentkezve vagy nincs jogosultsága, azt megmondja — nem tölti ki
   a helyet kitalált adattal.
   ========================================================= */
(function () {
  'use strict';

  var toast = (window.UQ && window.UQ.toast) || function () {};
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var ico = function (id, cls) { return '<svg class="ico ' + (cls || '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; };

  /* ---------- címke/szín térképek ---------- */
  /* A feladattípusok az adatbázis tasks_kind_check megszorításából
     jönnek — pontosan ez a kilenc létezik. A korábbi lista tartalmazott
     egy 'gyors' típust, ami sosem volt felvehető, és hiányzott belőle
     az 'info' meg a 'dontes'. */
  var TASK_TYPE = {
    kviz:   { label: 'Kvíz',    color: '#5b9de0' },
    szoveg: { label: 'Szöveg',  color: '#e0b93a' },
    foto:   { label: 'Fotó',    color: '#9d7ce0' },
    kod:    { label: 'Kód',     color: '#e8813a' },
    puzzle: { label: 'Puzzle',  color: '#8fb04f' },
    gps:    { label: 'GPS',     color: '#4fb84f' },
    qr:     { label: 'QR',      color: '#39c0c8' },
    info:   { label: 'Infó',    color: '#8a97a8' },
    dontes: { label: 'Döntés',  color: '#e05b9d' }
  };
  /* A nehézség az ÁLLOMÁSON él, nem a feladaton (stations_difficulty_check).
     A feladat nehézségét ezért az állomásáról olvassuk le — a panel
     alcíme ezt ki is mondja, hogy ne tűnjön saját mezőnek. */
  var DIFFS = [
    { key: 'konnyu',  label: 'Könnyű',  color: '#4fb84f' },
    { key: 'kozepes', label: 'Közepes', color: '#e0b93a' },
    { key: 'nehez',   label: 'Nehéz',   color: '#e8813a' },
    { key: 'extrem',  label: 'Extrém',  color: '#e03a2f' }
  ];
  var TEAM_STATUS = {
    playing: { label: 'Játékban', color: '#4fb84f' },
    done:    { label: 'Befejezte', color: '#5b9de0' },
    waiting: { label: 'Várakozik', color: '#e0b93a' }
  };

  /* ---------- DOM ---------- */
  var chartEl = document.getElementById('mainChart');
  var chartSub = document.getElementById('chartSub');
  var metricSeg = document.getElementById('metricSeg');
  var statusEl = document.getElementById('statusChart');
  var routeEl = document.getElementById('routeTable');
  var popEl = document.getElementById('popularList');
  var recentEl = document.getElementById('recentList');

  var state = {
    metric: 'type',
    courses: [], teams: [], stations: [], tasks: [], media: [], schedules: [],
    betoltve: false, hiba: ''
  };

  /* ---------------------------------------------------------
     betöltés — kizárólag az adatbázisból
     --------------------------------------------------------- */

  function load() {
    if (!window.UQAPI) return Promise.reject(new Error('Hiányzik az adatréteg (uq-api.js).'));
    if (!UQAPI.user()) return Promise.reject(new Error('__nincs_belepes__'));

    return Promise.all([
      UQAPI.rest('/v_admin_courses?select=id,name,slug,status,allomas_db,feladat_db,menet_db,created_at,cover_image'),
      UQAPI.rest('/v_admin_teams?select=id,name,course_id,course_name,play_status,progress,points,tagok_db,created_at'),
      UQAPI.rest('/v_admin_stations?select=id,course_id,name,difficulty,status,created_at'),
      UQAPI.rest('/v_admin_tasks?select=id,course_id,station_id,question,title,kind,status,points,created_at'),
      UQAPI.rest('/v_admin_media?select=id,title,kind,bytes,created_at'),
      UQAPI.rest('/v_admin_schedules?select=id,course_id,status,capacity')
    ]).then(function (r) {
      state.courses = r[0] || [];
      state.teams = r[1] || [];
      state.stations = r[2] || [];
      state.tasks = r[3] || [];
      state.media = r[4] || [];
      state.schedules = r[5] || [];
      state.betoltve = true;
      state.hiba = '';
    });
  }

  /* ---------- aggregáció-segédek ---------- */
  function countBy(arr, keyFn) {
    var m = {};
    arr.forEach(function (x) { var k = keyFn(x); if (k == null) return; m[k] = (m[k] || 0) + 1; });
    return m;
  }
  function avgProgress(teams) {
    if (!teams.length) return 0;
    var sum = teams.reduce(function (a, t) { return a + (Number(t.progress) || 0); }, 0);
    return Math.round(sum / teams.length);
  }
  /* állomás-id → nehézség, a feladatok nehézség-bontásához */
  function allomasNehezseg() {
    var m = {};
    state.stations.forEach(function (s) { m[s.id] = s.difficulty; });
    return m;
  }
  function ures(el, szoveg) {
    if (el) el.innerHTML = '<div class="dash-empty">' + esc(szoveg) + '</div>';
  }

  /* ---------- stat kártyák ---------- */
  function renderStats() {
    var set = function (id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
    var pub = state.courses.filter(function (c) { return c.status === 'pub'; }).length;
    var jatszik = state.teams.filter(function (t) { return t.play_status === 'playing'; }).length;
    var aktiv = state.tasks.filter(function (t) { return t.status === 'active'; }).length;
    var kesz = state.teams.filter(function (t) { return t.play_status === 'done'; }).length;

    set('statRoutes', state.courses.length);
    set('statRoutesSub', pub + ' közzétéve');
    set('statTeams', state.teams.length);
    set('statTeamsSub', jatszik + ' játékban');
    set('statTasks', state.tasks.length);
    set('statTasksSub', aktiv + ' aktív');
    set('statCompletion', avgProgress(state.teams) + '%');
    set('statCompletionSub', kesz + ' csapat fejezte be');
  }

  function statsUres(jel) {
    ['statRoutes', 'statTeams', 'statTasks', 'statCompletion'].forEach(function (id) {
      var e = document.getElementById(id); if (e) e.textContent = jel;
    });
    ['statRoutesSub', 'statTeamsSub', 'statTasksSub', 'statCompletionSub'].forEach(function (id) {
      var e = document.getElementById(id); if (e) e.textContent = '';
    });
  }

  /* ---------- fő diagram (típus / nehézség) ---------- */
  function renderChart() {
    if (!chartEl) return;
    if (!state.tasks.length) {
      if (chartSub) chartSub.textContent = state.metric === 'type' ? 'Feladatok típus szerint' : 'Feladatok nehézség szerint';
      ures(chartEl, 'Még nincs egyetlen feladat sem.');
      return;
    }
    var items;
    if (state.metric === 'type') {
      var cm = countBy(state.tasks, function (t) { return t.kind; });
      items = Object.keys(TASK_TYPE).map(function (k) {
        return { label: TASK_TYPE[k].label, value: cm[k] || 0, color: TASK_TYPE[k].color };
      });
      if (chartSub) chartSub.textContent = 'Feladatok típus szerint';
    } else {
      var nehez = allomasNehezseg();
      var dm = countBy(state.tasks, function (t) { return nehez[t.station_id]; });
      items = DIFFS.map(function (d) { return { label: d.label, value: dm[d.key] || 0, color: d.color }; });
      if (chartSub) chartSub.textContent = 'Feladatok az állomásuk nehézsége szerint';
    }
    var max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
    chartEl.innerHTML = items.map(function (it) {
      var h = it.value === 0 ? 3 : Math.max(6, Math.round((it.value / max) * 100));
      var peak = (it.value === max && it.value > 0) ? ' is-peak' : '';
      return '<div class="dash-bar-wrap' + peak + '" title="' + esc(it.label) + ': ' + it.value + ' feladat">' +
        '<span class="dash-bar-val">' + it.value + '</span>' +
        '<div class="dash-bar" style="height:' + h + '%;background:' + it.color + '"></div>' +
        '<span class="dash-bar-lbl">' + esc(it.label) + '</span></div>';
    }).join('');
  }

  /* ---------- második diagram (csapat-státusz) ---------- */
  function renderStatus() {
    if (!statusEl) return;
    if (!state.teams.length) { ures(statusEl, 'Még nincs egyetlen csapat sem.'); return; }
    var total = state.teams.length;
    statusEl.innerHTML = Object.keys(TEAM_STATUS).map(function (k) {
      var st = TEAM_STATUS[k];
      var n = state.teams.filter(function (t) { return t.play_status === k; }).length;
      var pct = Math.round(n / total * 100);
      return '<div class="dash-st-row">' +
        '<span class="dash-st-label"><span class="dash-st-dot" style="background:' + st.color + '"></span>' + st.label + '</span>' +
        '<div class="dash-st-track"><div class="dash-st-fill" style="width:' + pct + '%;background:' + st.color + '"></div></div>' +
        '<span class="dash-st-val">' + n + '</span></div>';
    }).join('');
  }

  /* ---------- pálya-bontás táblázat ---------- */
  function renderRouteTable() {
    if (!routeEl) return;
    if (!state.courses.length) { ures(routeEl, 'Még nincs egyetlen pálya sem.'); return; }
    var rows = state.courses.map(function (c) {
      var teams = state.teams.filter(function (t) { return t.course_id === c.id; });
      return {
        route: c.name,
        stations: Number(c.allomas_db) || 0,
        tasks: Number(c.feladat_db) || 0,
        teams: teams.length,
        prog: teams.length ? avgProgress(teams) : null
      };
    });
    rows.sort(function (a, b) { return b.teams - a.teams || b.stations - a.stations || String(a.route).localeCompare(String(b.route), 'hu'); });
    var head = '<div class="dash-rt-head"><span>Pálya</span><span>Áll.</span><span>Fel.</span><span>Csap.</span><span>Haladás</span></div>';
    var body = rows.map(function (x) {
      var prog = x.prog == null
        ? '<i class="dash-rt-dash">—</i>'
        : '<span class="dash-rt-mini"><i style="width:' + x.prog + '%"></i></span><span class="dash-rt-pct">' + x.prog + '%</span>';
      return '<div class="dash-rt-row">' +
        '<span class="dash-rt-name">' + esc(x.route) + '</span>' +
        '<span>' + x.stations + '</span><span>' + x.tasks + '</span><span>' + x.teams + '</span>' +
        '<span class="dash-rt-prog">' + prog + '</span></div>';
    }).join('');
    routeEl.innerHTML = head + body;
  }

  /* ---------- legnépszerűbb pályák (csapatszám szerint) ---------- */
  function renderPopular() {
    if (!popEl) return;
    var list = state.courses.map(function (c) {
      var teams = state.teams.filter(function (t) { return t.course_id === c.id; });
      return { name: c.name, teams: teams.length, prog: avgProgress(teams) };
    }).filter(function (x) { return x.teams > 0; });
    list.sort(function (a, b) { return b.teams - a.teams || b.prog - a.prog; });
    if (!list.length) { ures(popEl, 'Még nincs csapat egyetlen pályához sem.'); return; }
    var max = Math.max.apply(null, list.map(function (x) { return x.teams; }).concat([1]));
    popEl.innerHTML = list.slice(0, 5).map(function (p, i) {
      var w = Math.round(p.teams / max * 100);
      return '<div class="dash-pop-item"><div class="dash-pop-top">' +
        '<span class="dash-pop-name"><span class="dash-pop-rank">' + (i + 1) + '</span><span>' + esc(p.name) + '</span></span>' +
        '<span class="dash-pop-val">' + p.teams + ' csapat</span></div>' +
        '<div class="uq-bar-track"><div class="uq-bar-fill" style="width:' + w + '%"></div></div>' +
        '<div class="dash-pop-sub">átlag haladás: ' + p.prog + '%</div></div>';
    }).join('');
  }

  /* ---------- legutóbb hozzáadott ----------
     Korábban a tárak ELEJÉRŐL vett néhány elemet, tehát a sorrendnek
     semmi köze nem volt a létrehozás idejéhez. Most a created_at szerint
     rendez, és ki is írja, mikor volt. */
  function ido(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var most = new Date();
    var perc = Math.round((most - d) / 60000);
    if (perc < 1) return 'most';
    if (perc < 60) return perc + ' perce';
    var ora = Math.round(perc / 60);
    if (ora < 24) return ora + ' órája';
    var nap = Math.round(ora / 24);
    if (nap < 31) return nap + ' napja';
    return d.toLocaleDateString('hu-HU');
  }

  function renderRecent() {
    if (!recentEl) return;
    var mind = []
      .concat(state.courses.map(function (c) { return { icon: 'a-route', title: c.name, sub: c.status === 'pub' ? 'közzétéve' : 'piszkozat', tag: 'Pálya', at: c.created_at }; }))
      .concat(state.teams.map(function (t) { return { icon: 'a-users', title: t.name, sub: t.course_name || 'nincs pályához rendelve', tag: 'Csapat', at: t.created_at }; }))
      .concat(state.stations.map(function (s) { return { icon: 'a-pin', title: s.name, sub: '', tag: 'Állomás', at: s.created_at }; }))
      .concat(state.tasks.map(function (t) { return { icon: 'a-task', title: t.title || t.question, sub: '', tag: 'Feladat', at: t.created_at }; }))
      .concat(state.media.map(function (m) { return { icon: 'a-image', title: m.title, sub: '', tag: 'Média', at: m.created_at }; }));

    if (!mind.length) { ures(recentEl, 'Még nincs egyetlen elem sem.'); return; }
    mind.sort(function (a, b) { return String(b.at || '').localeCompare(String(a.at || '')); });

    recentEl.innerHTML = mind.slice(0, 6).map(function (f) {
      var mikor = ido(f.at);
      var sub = [f.sub, mikor].filter(Boolean).join(' · ');
      return '<div class="dash-tl-item"><span class="dash-tl-ic">' + ico(f.icon) + '</span>' +
        '<div class="dash-tl-body"><b>' + esc(f.title) + '</b><small>' + esc(sub) + '</small></div>' +
        '<span class="dash-tl-tag">' + esc(f.tag) + '</span></div>';
    }).join('');
  }

  /* ---------- köszöntés + „frissítve" időbélyeg ---------- */
  function koszontes() {
    var el = document.getElementById('dashHello');
    if (!el) return;
    var u = window.UQAPI && UQAPI.user();
    var meta = (u && u.user_metadata) || {};
    var nev = meta.display_name || (u && u.email ? String(u.email).split('@')[0] : '');
    var ma = new Date().toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    el.textContent = (nev ? 'Üdvözlünk újra, ' + nev + '! ' : '') + 'Ma ' + ma + ' van.';
  }

  function stamp() {
    var el = document.getElementById('dashUpdated');
    if (!el) return;
    var d = new Date();
    el.textContent = 'Betöltve: ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  /* ---------- teljes újraszámolás ---------- */
  function renderAll() {
    renderStats();
    renderChart();
    renderStatus();
    renderRouteTable();
    renderPopular();
    renderRecent();
    stamp();
  }

  function hibaKijelzes(uzenet, teendo) {
    statsUres('–');
    [chartEl, statusEl, routeEl, popEl, recentEl].forEach(function (el) {
      if (el) el.innerHTML = '<div class="dash-empty"><b>' + esc(uzenet) + '</b>' +
        (teendo ? '<br>' + teendo : '') + '</div>';
    });
    var el = document.getElementById('dashUpdated');
    if (el) el.textContent = '';
  }

  function refreshAll(announce) {
    return load()
      .then(function () {
        koszontes();
        renderAll();
        if (announce) {
          toast('Adatok frissítve', {
            sub: state.courses.length + ' pálya · ' + state.teams.length + ' csapat · ' + state.tasks.length + ' feladat'
          });
        }
      })
      .catch(function (err) {
        var m = String(err && err.message || '');
        if (m === '__nincs_belepes__') {
          hibaKijelzes('Nem vagy bejelentkezve.',
            '<a class="adm-btn adm-btn-lime" href="bejelentkezes.html?next=iranyitopult.html">Bejelentkezés</a>');
        } else if (err && err.status === 401) {
          hibaKijelzes('Lejárt a munkameneted.',
            '<a class="adm-btn adm-btn-lime" href="bejelentkezes.html?next=iranyitopult.html">Bejelentkezés újra</a>');
        } else if (err && (err.status === 403 || err.status === 404)) {
          hibaKijelzes('Nincs jogosultságod az admin adatokhoz.',
            'Ez a nézet admin fiókot kíván.');
        } else {
          hibaKijelzes('Az adatok nem tölthetők be.', esc(m));
        }
        if (announce) toast('A frissítés nem sikerült', { type: 'warn', sub: m === '__nincs_belepes__' ? 'Nem vagy bejelentkezve.' : m });
      });
  }

  /* ---------- metrika váltó (típus / nehézség) ---------- */
  if (metricSeg) {
    metricSeg.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-metric]');
      if (!btn || btn.dataset.metric === state.metric) return;
      state.metric = btn.dataset.metric;
      metricSeg.querySelectorAll('button').forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      if (state.betoltve) renderChart();
    });
  }

  /* ---------- frissítés ----------
     Az automatikus újratöltés fókuszra és lapváltásra korábban is futott,
     de mivel halott tárakból olvasott, sosem változott tőle semmi. Most
     tényleg új adatot hoz, ezért megmarad. */
  var btnRefresh = document.getElementById('btnRefresh');
  if (btnRefresh) btnRefresh.addEventListener('click', function () { refreshAll(true); });
  window.addEventListener('focus', function () { if (state.betoltve) refreshAll(false); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && state.betoltve) refreshAll(false); });

  /* ---------- kereső ----------
     A globális kereső nem szűrt semmit, csak kiírta, mit gépeltél be.
     Amíg nincs valódi kereső, oda visz, ahol tényleg lehet keresni. */
  var topSearch = document.getElementById('topSearch');
  if (topSearch) {
    topSearch.setAttribute('placeholder', 'Keresés a játékok között…');
    topSearch.addEventListener('keydown', function (e) {
      var q = topSearch.value.trim();
      if (e.key === 'Enter' && q) location.href = 'jatekok.html?q=' + encodeURIComponent(q);
    });
  }
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); if (topSearch) topSearch.focus(); }
  });

  /* ---------- indítás ---------- */
  koszontes();
  refreshAll(false);
  if (window.UQAPI) UQAPI.onAuth(function () { refreshAll(false); });
})();
