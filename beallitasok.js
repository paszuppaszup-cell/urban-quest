/* =========================================================
   URBAN QUEST — KÖZÖS ADMIN UI (scaffold, inline)
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

  /* ---------- # NAV aktív-váltás (valós hrefek navigálnak) ---------- */
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
   URBAN QUEST — BEÁLLÍTÁSOK oldal-logika
   ========================================================= */
(function () {
  'use strict';

  var toast = function (m, o) { if (window.UQ && window.UQ.toast) window.UQ.toast(m, o); };
  var ico = function (id, cls) { return '<svg class="ico ' + (cls || '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; };

  var SECTION_LABEL = {
    altalanos: 'Általános', marka: 'Márka', ertesitesek: 'Értesítések',
    integraciok: 'Integrációk', fizetes: 'Fizetés', jogosultsagok: 'Jogosultságok'
  };
  var NOTIF_LABEL = { email: 'E-mail értesítések', push: 'Push értesítések', weekly: 'Heti összefoglaló', teams: 'Új csapat regisztráció' };

  /* ---------- szerepkörök (igazságforrás) ---------- */
  var ROLES = [
    { icon: 'a-shield', name: 'Adminisztrátor', desc: 'Teljes hozzáférés minden modulhoz és beállításhoz', count: 3, level: 'full' },
    { icon: 'a-edit', name: 'Szerkesztő', desc: 'Játékok, állomások és feladatok létrehozása, szerkesztése', count: 8, level: 'edit' },
    { icon: 'a-users', name: 'Szervező', desc: 'Csapatok és időzítések kezelése, riportok megtekintése', count: 5, level: 'edit' },
    { icon: 'a-eye', name: 'Megtekintő', desc: 'Csak olvasási hozzáférés az irányítópulthoz', count: 12, level: 'view' }
  ];
  var LEVEL = {
    full: { cls: 'is-full', label: 'Teljes' },
    edit: { cls: 'is-edit', label: 'Szerkesztés' },
    view: { cls: 'is-view', label: 'Megtekintés' }
  };

  /* ---------- al-navigáció ↔ szekció váltás ---------- */
  function bindSubnav() {
    var nav = document.getElementById('setNav');
    if (!nav) return;
    var items = Array.prototype.slice.call(nav.querySelectorAll('.set-nav-item'));
    var panels = Array.prototype.slice.call(document.querySelectorAll('.set-content .adm-tabpanel'));
    items.forEach(function (item) {
      item.addEventListener('click', function () {
        var key = item.dataset.set;
        items.forEach(function (n) {
          var on = n === item;
          n.classList.toggle('is-active', on);
          n.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        panels.forEach(function (p) { p.classList.toggle('is-active', p.dataset.panel === key); });
      });
    });
  }

  /* ---------- kapcsolók (.ed-toggle) ---------- */
  function bindToggles() {
    document.querySelectorAll('.ed-toggle[data-notif]').forEach(function (tg) {
      tg.addEventListener('click', function () {
        var on = !tg.classList.contains('is-on');
        tg.classList.toggle('is-on', on);
        tg.setAttribute('aria-checked', on ? 'true' : 'false');
        var label = NOTIF_LABEL[tg.dataset.notif] || 'Értesítés';
        toast(label + (on ? ' bekapcsolva' : ' kikapcsolva'), { type: 'info' });
      });
    });
  }

  /* ---------- akcentusszín választó ---------- */
  function bindSwatches() {
    var group = document.getElementById('setSwatches');
    if (!group) return;
    var sw = Array.prototype.slice.call(group.querySelectorAll('.set-swatch'));
    sw.forEach(function (s) {
      s.addEventListener('click', function () {
        sw.forEach(function (o) {
          var on = o === s;
          o.classList.toggle('is-on', on);
          o.setAttribute('aria-checked', on ? 'true' : 'false');
        });
        toast('Akcentusszín kiválasztva', { type: 'info', sub: s.dataset.color });
      });
    });
  }

  /* ---------- megjelenés (sötét / világos) ---------- */
  function bindTheme() {
    var group = document.getElementById('setTheme');
    if (!group) return;
    var opts = Array.prototype.slice.call(group.querySelectorAll('.set-theme-opt'));
    opts.forEach(function (o) {
      o.addEventListener('click', function () {
        opts.forEach(function (x) {
          var on = x === o;
          x.classList.toggle('is-on', on);
          x.setAttribute('aria-checked', on ? 'true' : 'false');
        });
        toast('Megjelenés: ' + (o.dataset.theme === 'dark' ? 'Sötét' : 'Világos'), { type: 'info' });
      });
    });
  }

  /* ---------- logó csere ---------- */
  function bindLogo() {
    var btn = document.getElementById('btnLogo');
    if (btn) btn.addEventListener('click', function () {
      toast('Logó feltöltés', { type: 'info', sub: 'Válassz képet a tallózóból.' });
    });
  }

  /* ---------- API-kulcs: mutat / másol ---------- */
  function bindApi() {
    var input = document.getElementById('setApiKey');
    var masked = 'uq_live_••••••••••••••••7f3a';
    var real = 'uq_live_9c1e4b7a2f8d6031e5b47f3a';
    var revealBtn = document.getElementById('btnApiReveal');
    var copyBtn = document.getElementById('btnApiCopy');
    var shown = false;

    if (revealBtn && input) revealBtn.addEventListener('click', function () {
      shown = !shown;
      input.value = shown ? real : masked;
      revealBtn.innerHTML = ico('a-eye', 'ico-sm') + (shown ? 'Elrejt' : 'Mutat');
    });

    if (copyBtn && input) copyBtn.addEventListener('click', function () {
      var text = shown ? real : real; // mindig a valódi kulcsot másoljuk
      var done = function () { toast('API-kulcs másolva', { type: 'ok', sub: 'A vágólapra került.' }); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () {
          fallbackCopy(text); done();
        });
      } else {
        fallbackCopy(text); done();
      }
    });
  }
  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    } catch (e) {}
  }

  /* ---------- szerepkör-lista renderelése ---------- */
  function renderRoles() {
    var wrap = document.getElementById('setRoles');
    if (!wrap) return;
    wrap.innerHTML = ROLES.map(function (r) {
      var lv = LEVEL[r.level];
      return '<div class="set-role">' +
        '<span class="set-role-ic">' + ico(r.icon) + '</span>' +
        '<div class="set-role-body"><b>' + r.name + '</b><small>' + r.desc + '</small></div>' +
        '<div class="set-role-meta">' +
          '<span class="set-role-count">' + r.count + ' felhasználó</span>' +
          '<span class="set-role-badge ' + lv.cls + '">' + lv.label + '</span>' +
          '<button class="set-role-edit" type="button" aria-label="' + r.name + ' szerkesztése" data-role="' + r.name + '">' + ico('a-edit', 'ico-sm') + '</button>' +
        '</div>' +
      '</div>';
    }).join('');
    wrap.querySelectorAll('.set-role-edit').forEach(function (b) {
      b.addEventListener('click', function () {
        toast('Szerepkör szerkesztése', { type: 'info', sub: b.dataset.role });
      });
    });
  }

  /* ---------- mentés ---------- */
  function bindSave() {
    function save() { toast('Beállítások mentve', { type: 'ok', sub: 'A módosítások érvénybe léptek.' }); }
    ['btnSaveMain', 'btnSave'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.addEventListener('click', save);
    });
    var pub = document.getElementById('btnPublish');
    if (pub) pub.addEventListener('click', function () {
      toast('Beállítások közzétéve', { type: 'ok', sub: 'A változtatások élesek.' });
    });
    document.querySelectorAll('[data-pub]').forEach(function (b) {
      b.addEventListener('click', function () {
        var map = { now: 'Közzétéve', schedule: 'Ütemezve', draft: 'Piszkozatként mentve' };
        toast('Beállítások ' + (map[b.dataset.pub] || 'mentve').toLowerCase(), { type: 'ok' });
      });
    });
    document.querySelectorAll('[data-user]').forEach(function (b) {
      b.addEventListener('click', function () {
        var map = { profile: 'Profil megnyitása', settings: 'Beállítások', logout: 'Kijelentkezés' };
        toast(map[b.dataset.user] || 'Fiók', { type: 'info' });
      });
    });
  }

  /* ---------- kereső ---------- */
  function bindSearch() {
    var input = document.getElementById('topSearch');
    if (!input) return;
    var nav = document.getElementById('setNav');
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var q = input.value.trim().toLowerCase();
      if (!q) return;
      var items = Array.prototype.slice.call(nav.querySelectorAll('.set-nav-item'));
      var hit = items.find(function (it) {
        var key = it.dataset.set;
        return (SECTION_LABEL[key] || '').toLowerCase().indexOf(q) !== -1 ||
               it.textContent.toLowerCase().indexOf(q) !== -1;
      });
      if (hit) { hit.click(); toast('Szekció: ' + SECTION_LABEL[hit.dataset.set], { type: 'info' }); }
      else toast('Nincs találat', { type: 'error', sub: input.value });
    });
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); input.focus(); }
    });
  }

  function init() {
    bindSubnav();
    bindToggles();
    bindSwatches();
    bindTheme();
    bindLogo();
    bindApi();
    renderRoles();
    bindSave();
    bindSearch();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
