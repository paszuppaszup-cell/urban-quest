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
   URBAN QUEST — IRÁNYÍTÓPULT (valós, tárból számolt statisztikák)
   Olvassa: uq_teams_v1 / uq_stations_v1 / uq_tasks_v1 /
            uq_media_v1 / uq_schedules_v1 (üres tár esetén seed).
   ========================================================= */
(function () {
  'use strict';

  var toast = (window.UQ && window.UQ.toast) || function () {};
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var ico = function (id, cls) { return '<svg class="ico ' + (cls || '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; };

  /* ---------- tartalék-seedek (a többi oldal magadatával egyezők) ---------- */
  var SEED_TEAMS = [
    { name: 'Trail Blazers', route: 'Városliget Felfedező', status: 'playing', members: 4, score: 2340, progress: 64 },
    { name: 'Városi Nyomozók', route: 'Budai Vár Rejtélye', status: 'done', members: 5, score: 3120, progress: 100 },
    { name: 'Kaland Expressz', route: 'Liget Projekt', status: 'playing', members: 3, score: 1780, progress: 42 },
    { name: 'Kód Vadászok', route: 'Belváros Kódvadászat', status: 'waiting', members: 4, score: 0, progress: 0 },
    { name: 'Rejtély Rangerek', route: 'Budai Vár Rejtélye', status: 'playing', members: 6, score: 2560, progress: 78 },
    { name: 'Iránytű Brigád', route: 'Városliget Felfedező', status: 'done', members: 2, score: 2890, progress: 100 },
    { name: 'Csillag Felderítők', route: 'Liget Projekt', status: 'playing', members: 5, score: 1420, progress: 35 },
    { name: 'Labirintus Mesterek', route: 'Belváros Kódvadászat', status: 'waiting', members: 3, score: 0, progress: 0 },
    { name: 'Turul Csapat', route: 'Budai Vár Rejtélye', status: 'playing', members: 4, score: 2075, progress: 58 },
    { name: 'Zöld Ösvény', route: 'Városliget Felfedező', status: 'done', members: 6, score: 3340, progress: 100 }
  ];
  var SEED_STATIONS = [
    { name: 'Főbejárat', route: 'Városliget Felfedező', type: 'kezdo', diff: 'Könnyű', tasks: 0, status: 'active', time: false, timeVal: '5 perc' },
    { name: 'Széchenyi fürdő', route: 'Városliget Felfedező', type: 'info', diff: 'Könnyű', tasks: 1, status: 'active', time: true, timeVal: '5 perc' },
    { name: 'Vajdahunyad vára', route: 'Városliget Felfedező', type: 'feladat', diff: 'Közepes', tasks: 3, status: 'active', time: true, timeVal: '10 perc' },
    { name: 'Hősök tere', route: 'Városliget Felfedező', type: 'dontes', diff: 'Közepes', tasks: 2, status: 'active', time: false, timeVal: '8 perc' },
    { name: 'Műjégpálya', route: 'Városliget Felfedező', type: 'feladat', diff: 'Nehéz', tasks: 4, status: 'draft', time: true, timeVal: '15 perc' },
    { name: 'Állatkert bejárat', route: 'Városliget Felfedező', type: 'info', diff: 'Könnyű', tasks: 1, status: 'active', time: false, timeVal: '5 perc' },
    { name: 'Zene Háza', route: 'Liget Projekt', type: 'feladat', diff: 'Közepes', tasks: 3, status: 'draft', time: true, timeVal: '10 perc' },
    { name: 'Közlekedési Múzeum', route: 'Liget Projekt', type: 'zaro', diff: 'Nehéz', tasks: 2, status: 'inactive', time: true, timeVal: '8 perc' }
  ];
  var SEED_TASKS = [
    { question: 'Melyik évben épült a Vajdahunyad vára?', route: 'Városliget Felfedező', station: 'Vajdahunyad vára', type: 'kviz', diff: 'Közepes', status: 'active', points: 50 },
    { question: 'Készíts fotót a főbejáratról', route: 'Városliget Felfedező', station: 'Főbejárat', type: 'foto', diff: 'Könnyű', status: 'active', points: 30 },
    { question: 'Rakd időrendbe a Városliget épületeit!', route: 'Városliget Felfedező', station: 'Vajdahunyad vára', type: 'puzzle', diff: 'Közepes', status: 'active', points: 55 },
    { question: 'Fejtsd meg a széf kódját a szobor talapzatán!', route: 'Városliget Felfedező', station: 'Hősök tere', type: 'kod', diff: 'Nehéz', status: 'active', points: 45 },
    { question: 'Hány kupola díszíti a Széchenyi fürdő főhomlokzatát?', route: 'Városliget Felfedező', station: 'Széchenyi fürdő', type: 'szoveg', diff: 'Könnyű', status: 'active', points: 35 },
    { question: 'Érd el a Hősök terén a szoborcsoportot', route: 'Városliget Felfedező', station: 'Hősök tere', type: 'gps', diff: 'Könnyű', status: 'active', points: 40 },
    { question: 'Olvasd be a bejárat melletti QR-kódot', route: 'Liget Projekt', station: 'Zene Háza', type: 'qr', diff: 'Könnyű', status: 'draft', points: 25 },
    { question: 'Koppints 15-öt 5 másodperc alatt!', route: 'Városliget Felfedező', station: 'Műjégpálya', type: 'gyors', diff: 'Könnyű', status: 'active', points: 30 },
    { question: 'Melyik stílusban épült a Vajdahunyad vár gótikus szárnya?', route: 'Városliget Felfedező', station: 'Vajdahunyad vára', type: 'kviz', diff: 'Nehéz', status: 'active', points: 60 }
  ];
  var SEED_MEDIA = [
    { name: 'varosliget-fooldal.jpg', type: 'image', size: '2.4 MB' },
    { name: 'budai-var-intro.mp4', type: 'video', size: '18.6 MB' },
    { name: 'narracio-allomas-1.mp3', type: 'audio', size: '3.1 MB' },
    { name: 'gyar-kuldetes-terkep.png', type: 'image', size: '1.2 MB' },
    { name: 'margitsziget-panorama.jpg', type: 'image', size: '3.8 MB' },
    { name: 'foldalatti-nyomok-trailer.mp4', type: 'video', size: '42.3 MB' },
    { name: 'siker-hangeffekt.mp3', type: 'audio', size: '412 KB' },
    { name: 'elveszett-orokseg-borito.jpg', type: 'image', size: '2.1 MB' },
    { name: 'kod-fejtoro-ikon.png', type: 'image', size: '86 KB' },
    { name: 'hatterzene-kaland.mp3', type: 'audio', size: '5.7 MB' }
  ];
  var SEED_SCHEDULES = [
    { route: 'Városliget Felfedező', status: 'active', cap: 24, days: [1, 1, 1, 1, 1, 0, 0] },
    { route: 'Budai Vár Rejtélye', status: 'active', cap: 16, days: [0, 0, 0, 0, 0, 1, 1] },
    { route: 'Liget Projekt', status: 'paused', cap: 20, days: [1, 0, 1, 0, 1, 0, 0] },
    { route: 'Gellérthegy Titkai', status: 'active', cap: 30, days: [1, 1, 1, 1, 1, 1, 1] },
    { route: 'Belváros Nyomában', status: 'active', cap: 12, days: [0, 0, 0, 0, 1, 1, 0] },
    { route: 'Óbuda Öröksége', status: 'paused', cap: 18, days: [0, 1, 0, 1, 0, 0, 0] },
    { route: 'Margitsziget Kaland', status: 'active', cap: 40, days: [0, 0, 0, 0, 0, 1, 0] }
  ];

  function readStore(key, seed) {
    try { var raw = localStorage.getItem(key); if (raw) { var a = JSON.parse(raw); if (Array.isArray(a) && a.length) return a; } } catch (e) {}
    return seed.slice();
  }

  /* ---------- címke/szín térképek ---------- */
  var TASK_TYPE = {
    kviz:   { label: 'Kvíz',     color: '#5b9de0' },
    szoveg: { label: 'Szöveges', color: '#e0b93a' },
    puzzle: { label: 'Puzzle',   color: '#8fb04f' },
    kod:    { label: 'Kód',      color: '#e8813a' },
    foto:   { label: 'Fotó',     color: '#9d7ce0' },
    gps:    { label: 'GPS',      color: '#4fb84f' },
    qr:     { label: 'QR',       color: '#39c0c8' },
    gyors:  { label: 'Gyors',    color: '#e05b9d' }
  };
  var DIFFS = [
    { key: 'Könnyű', color: '#4fb84f' },
    { key: 'Közepes', color: '#e0b93a' },
    { key: 'Nehéz', color: '#e8813a' },
    { key: 'Extrém', color: '#e03a2f' }
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

  var state = { metric: 'type', teams: [], stations: [], tasks: [], media: [], schedules: [] };

  function load() {
    state.teams = readStore('uq_teams_v1', SEED_TEAMS);
    state.stations = readStore('uq_stations_v1', SEED_STATIONS);
    state.tasks = readStore('uq_tasks_v1', SEED_TASKS);
    state.media = readStore('uq_media_v1', SEED_MEDIA);
    state.schedules = readStore('uq_schedules_v1', SEED_SCHEDULES);
  }

  /* ---------- aggregáció-segédek ---------- */
  function allRoutes() {
    var set = {};
    [state.teams, state.stations, state.tasks, state.schedules].forEach(function (arr) {
      arr.forEach(function (x) { if (x && x.route) set[x.route] = 1; });
    });
    return Object.keys(set);
  }
  function countBy(arr, keyFn) {
    var m = {};
    arr.forEach(function (x) { var k = keyFn(x); if (k == null) return; m[k] = (m[k] || 0) + 1; });
    return m;
  }
  function avgProgress(teams) {
    return teams.length ? Math.round(teams.reduce(function (a, t) { return a + (t.progress || 0); }, 0) / teams.length) : 0;
  }

  /* ---------- stat kártyák ---------- */
  function renderStats() {
    var set = function (id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
    set('statRoutes', allRoutes().length);
    set('statTeams', state.teams.length);
    set('statTeamsSub', state.teams.filter(function (t) { return t.status === 'playing'; }).length + ' játékban');
    set('statTasks', state.tasks.length);
    set('statTasksSub', state.tasks.filter(function (t) { return t.status === 'active'; }).length + ' aktív');
    set('statCompletion', avgProgress(state.teams) + '%');
    set('statCompletionSub', state.teams.filter(function (t) { return t.status === 'done'; }).length + ' csapat befejezte');
  }

  /* ---------- fő diagram (típus / nehézség) ---------- */
  function renderChart() {
    var items;
    if (state.metric === 'type') {
      var cm = countBy(state.tasks, function (t) { return t.type; });
      items = Object.keys(TASK_TYPE).map(function (k) { return { label: TASK_TYPE[k].label, value: cm[k] || 0, color: TASK_TYPE[k].color }; });
      if (chartSub) chartSub.textContent = 'Feladatok típus szerint';
    } else {
      var dm = countBy(state.tasks, function (t) { return t.diff; });
      items = DIFFS.map(function (d) { return { label: d.key, value: dm[d.key] || 0, color: d.color }; });
      if (chartSub) chartSub.textContent = 'Feladatok nehézség szerint';
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
    var total = state.teams.length || 1;
    statusEl.innerHTML = Object.keys(TEAM_STATUS).map(function (k) {
      var st = TEAM_STATUS[k];
      var n = state.teams.filter(function (t) { return t.status === k; }).length;
      var pct = Math.round(n / total * 100);
      return '<div class="dash-st-row">' +
        '<span class="dash-st-label"><span class="dash-st-dot" style="background:' + st.color + '"></span>' + st.label + '</span>' +
        '<div class="dash-st-track"><div class="dash-st-fill" style="width:' + pct + '%;background:' + st.color + '"></div></div>' +
        '<span class="dash-st-val">' + n + '</span></div>';
    }).join('');
  }

  /* ---------- pálya-bontás táblázat ---------- */
  function renderRouteTable() {
    var rows = allRoutes().map(function (r) {
      var teams = state.teams.filter(function (x) { return x.route === r; });
      return {
        route: r,
        stations: state.stations.filter(function (x) { return x.route === r; }).length,
        tasks: state.tasks.filter(function (x) { return x.route === r; }).length,
        teams: teams.length,
        prog: teams.length ? avgProgress(teams) : null
      };
    });
    rows.sort(function (a, b) { return b.teams - a.teams || b.stations - a.stations || a.route.localeCompare(b.route, 'hu'); });
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
    var list = allRoutes().map(function (r) {
      var teams = state.teams.filter(function (x) { return x.route === r; });
      return { name: r, teams: teams.length, prog: avgProgress(teams) };
    }).filter(function (x) { return x.teams > 0; });
    list.sort(function (a, b) { return b.teams - a.teams || b.prog - a.prog; });
    if (!list.length) { popEl.innerHTML = '<div class="dash-empty">Még nincs csapat egyetlen pályához sem.</div>'; return; }
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

  /* ---------- legutóbb hozzáadott (a tárak elejéről, vegyesen) ---------- */
  function renderRecent() {
    var a = state.teams.slice(0, 3).map(function (t) { return { icon: 'a-users', title: t.name, sub: t.route || '—', tag: 'Csapat' }; });
    var b = state.tasks.slice(0, 3).map(function (t) { return { icon: 'a-task', title: t.question, sub: t.station || t.route || '—', tag: 'Feladat' }; });
    var c = state.media.slice(0, 2).map(function (m) { return { icon: 'a-image', title: m.name, sub: m.size || '', tag: 'Média' }; });
    var mixed = [];
    var maxLen = Math.max(a.length, b.length, c.length);
    for (var i = 0; i < maxLen; i++) { if (a[i]) mixed.push(a[i]); if (b[i]) mixed.push(b[i]); if (c[i]) mixed.push(c[i]); }
    recentEl.innerHTML = mixed.slice(0, 6).map(function (f) {
      return '<div class="dash-tl-item"><span class="dash-tl-ic">' + ico(f.icon) + '</span>' +
        '<div class="dash-tl-body"><b>' + esc(f.title) + '</b><small>' + esc(f.sub) + '</small></div>' +
        '<span class="dash-tl-tag">' + esc(f.tag) + '</span></div>';
    }).join('');
  }

  /* ---------- „frissítve” időbélyeg ---------- */
  function stamp() {
    var el = document.getElementById('dashUpdated');
    if (!el) return;
    var d = new Date();
    el.textContent = 'Frissítve: ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  /* ---------- teljes újraszámolás ---------- */
  function refreshAll(announce) {
    load();
    renderStats();
    renderChart();
    renderStatus();
    renderRouteTable();
    renderPopular();
    renderRecent();
    stamp();
    if (announce) toast('Adatok frissítve', { sub: 'Valós adat a tárakból' });
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
      renderChart();
    });
  }

  /* ---------- frissítés: gomb + auto (fókusz / láthatóság) ---------- */
  var btnRefresh = document.getElementById('btnRefresh');
  if (btnRefresh) btnRefresh.addEventListener('click', function () { refreshAll(true); });
  window.addEventListener('focus', function () { refreshAll(false); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refreshAll(false); });

  /* ---------- felső sáv gombok (toast visszajelzés) ---------- */
  var btnSave = document.getElementById('btnSave');
  if (btnSave) btnSave.addEventListener('click', function () { toast('Nézet elmentve', { sub: 'Az irányítópult beállítása elmentve' }); });
  var btnPublish = document.getElementById('btnPublish');
  if (btnPublish) btnPublish.addEventListener('click', function () { toast('Közzétéve', { sub: 'A módosítások élőek a nyilvános oldalon' }); });
  document.querySelectorAll('[data-pub]').forEach(function (b) {
    b.addEventListener('click', function () {
      var a = b.dataset.pub;
      if (a === 'now') toast('Közzétéve', { sub: 'Élő a nyilvános oldalon' });
      else if (a === 'schedule') toast('Közzététel ütemezve', { type: 'info', sub: 'Időzített megjelenés beállítva' });
      else if (a === 'draft') toast('Piszkozatként mentve', { type: 'info', sub: 'Nem jelenik meg nyilvánosan' });
    });
  });
  document.querySelectorAll('[data-user]').forEach(function (b) {
    b.addEventListener('click', function () {
      var a = b.dataset.user;
      if (a === 'profile') toast('Profil', { type: 'info', sub: 'Profil megnyitása' });
      else if (a === 'settings') toast('Beállítások', { type: 'info', sub: 'Fiókbeállítások megnyitása' });
      else if (a === 'logout') toast('Kijelentkezés', { type: 'info', sub: 'Munkamenet lezárása' });
    });
  });

  /* ---------- kereső ---------- */
  var topSearch = document.getElementById('topSearch');
  if (topSearch) topSearch.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && topSearch.value.trim()) toast('Keresés: ' + topSearch.value.trim(), { type: 'info', sub: 'Találatok szűrése' });
  });
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); if (topSearch) topSearch.focus(); }
  });

  /* ---------- indítás ---------- */
  refreshAll(false);
})();
