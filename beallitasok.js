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

  /* ---------- szerepkörök ----------
     Itt korábban négy szerepkör állt kitalált létszámmal (3 / 8 / 5 / 12
     felhasználó). A rendszerben egyetlen szerepkör létezik — az admin,
     az `admins` tábla alapján —, minden más felhasználó sima játékos.
     A létszámot ezért az adatbázisból olvassuk, és nem találunk ki
     szerepköröket, amiket a jogosultsági réteg nem ismer. */
  var ROLES = [
    { icon: 'a-shield', name: 'Adminisztrátor', desc: 'Teljes hozzáférés az admin felülethez és a beállításokhoz', count: null, level: 'full' },
    { icon: 'a-users', name: 'Játékos', desc: 'Regisztrált felhasználó: játszhat, csapatot alapíthat, kedvencet menthet', count: null, level: 'view' }
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

  /* ---------------------------------------------------------
     BETÖLTÉS / MENTÉS

     Ez az oldal korábban semmit nem mentett sehová: minden mező zöld
     pipát adott, majd egy F5 után visszaállt az alapértékre — ugyanabban
     a böngészőben is. Nem volt hova mentenie, mert beállítás-tábla nem
     létezett. Most az app_settings egyetlen sorába megy, a save_settings
     RPC-n keresztül (az adatbázis dönti el, ki írhatja).
     --------------------------------------------------------- */

  var $ = function (id) { return document.getElementById(id); };
  var betoltve = false;

  /* A legördülők a felületen emberi címkét mutatnak, az adatbázisban
     viszont a címke tárolása azzal jár, hogy egy átfogalmazás elveszti a
     mentett értéket. Ezért indexet keresünk vissza, értéket pedig a
     select saját szövegéből olvasunk. */
  function selectBeallit(el, ertek) {
    if (!el || ertek == null) return;
    for (var i = 0; i < el.options.length; i++) {
      if (el.options[i].value === ertek || el.options[i].text === ertek) { el.selectedIndex = i; return; }
    }
  }
  function selectErtek(el) {
    if (!el) return null;
    var o = el.options[el.selectedIndex];
    return o ? (o.value || o.text) : null;
  }

  function ertesitesekOlvas() {
    var o = {};
    document.querySelectorAll('.ed-toggle[data-notif]').forEach(function (tg) {
      o[tg.dataset.notif] = tg.classList.contains('is-on');
    });
    return o;
  }

  function urlapOlvas() {
    var sw = document.querySelector('#setSwatches .set-swatch.is-on');
    var th = document.querySelector('#setTheme .set-theme-opt.is-on');
    return {
      company: $('setCompany') ? $('setCompany').value.trim() : null,
      lang: selectErtek($('setLang')),
      timezone: selectErtek($('setTz')),
      date_format: selectErtek($('setDate')),
      accent: sw ? sw.dataset.color : null,
      theme: th ? th.dataset.theme : null,
      webhook_url: $('setWebhook') ? $('setWebhook').value.trim() : '',
      patreon_url: $('setPatreon') ? $('setPatreon').value.trim() : '',
      currency: selectErtek($('setCurrency')),
      vat_percent: $('setVat') ? $('setVat').value.trim() : null,
      price_mode: selectErtek($('setPriceMode')),
      notif: ertesitesekOlvas()
    };
  }

  function urlapKitolt(s) {
    if (!s) return;
    if (s.company && $('setCompany')) $('setCompany').value = s.company;
    selectBeallit($('setLang'), s.lang);
    selectBeallit($('setTz'), s.timezone);
    selectBeallit($('setDate'), s.date_format);
    selectBeallit($('setCurrency'), s.currency);
    selectBeallit($('setPriceMode'), s.price_mode);
    if (s.vat_percent != null && $('setVat')) $('setVat').value = s.vat_percent;
    if ($('setWebhook')) $('setWebhook').value = s.webhook_url || '';
    if ($('setPatreon')) $('setPatreon').value = s.patreon_url || '';

    if (s.accent) {
      document.querySelectorAll('#setSwatches .set-swatch').forEach(function (b) {
        var on = b.dataset.color === s.accent;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
      });
    }
    if (s.theme) {
      document.querySelectorAll('#setTheme .set-theme-opt').forEach(function (b) {
        var on = b.dataset.theme === s.theme;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
      });
    }
    var n = s.notif || {};
    document.querySelectorAll('.ed-toggle[data-notif]').forEach(function (tg) {
      if (n[tg.dataset.notif] === undefined) return;
      var on = !!n[tg.dataset.notif];
      tg.classList.toggle('is-on', on);
      tg.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }

  function betolt() {
    if (!window.UQAPI || !UQAPI.user()) return Promise.resolve(false);
    return UQAPI.rest('/app_settings?select=*&id=eq.1')
      .then(function (rows) { urlapKitolt(rows && rows[0]); betoltve = true; return true; })
      .catch(function () { return false; });
  }

  function ment() {
    if (!window.UQAPI || !UQAPI.user()) {
      toast('Nem vagy bejelentkezve', { type: 'error', sub: 'A beállítások mentéséhez admin fiók kell.' });
      return;
    }
    toast('Mentés…', { type: 'info' });
    UQAPI.rest('/rpc/save_settings', { method: 'POST', body: { p: urlapOlvas() } })
      .then(function () { toast('Beállítások mentve', { type: 'ok', sub: 'Az adatbázisba került, más gépen is ez látszik.' }); })
      .catch(function (e) {
        toast('A mentés nem sikerült', { type: 'error', sub: String(e && e.message || '') });
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
        toast(label + (on ? ' bekapcsolva' : ' kikapcsolva'), { type: 'info', sub: 'Mentéshez nyomd meg a Mentés gombot.' });
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
      toast('A logó cseréje még nincs kész', { type: 'info',
        sub: 'Addig a Média oldalon tölthetsz fel képeket.' });
    });
  }

  /* Az API-kulcs mezője kikerült az oldalról: egy KITALÁLT kulcsot mutatott
     („uq_live_9c1e…"), amit a Másolás gomb a vágólapra is tett — miközben
     ilyen kulcs sosem létezett, és nincs is API, ami elfogadná. Ha valaki
     ezt beírja egy integrációba, azt hiszi, elrontotta a beállítást.
     A webhook-cím megmaradt: azt már tényleg elmentjük. */

  /* ---------- szerepkör-lista renderelése ----------
     A szerkesztés-ceruza kikerült: szerepkört a felületről nem lehet
     módosítani (az admin jogot az `admins` táblába kell felvenni), a gomb
     pedig csak egy üzenetet írt ki. */
  function renderRoles() {
    var wrap = document.getElementById('setRoles');
    if (!wrap) return;
    wrap.innerHTML = ROLES.map(function (r) {
      var lv = LEVEL[r.level];
      return '<div class="set-role">' +
        '<span class="set-role-ic">' + ico(r.icon) + '</span>' +
        '<div class="set-role-body"><b>' + r.name + '</b><small>' + r.desc + '</small></div>' +
        '<div class="set-role-meta">' +
          '<span class="set-role-count" data-role-count="' + r.level + '">—</span>' +
          '<span class="set-role-badge ' + lv.cls + '">' + lv.label + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
    if (!window.UQAPI || !UQAPI.user()) return;
    UQAPI.rest('/admins?select=user_id')
      .then(function (rows) {
        var n = (rows || []).length;
        var el = wrap.querySelector('[data-role-count="full"]');
        if (el) el.textContent = n + (n === 1 ? ' felhasználó' : ' felhasználó');
      })
      .catch(function () { /* marad a „—" */ });
  }

  /* ---------- mentés ----------
     A „Közzététel" gomb és a legördülője kikerült: a beállításoknak nincs
     piszkozat-állapotuk, amit külön közzé kellene tenni — mentés után
     azonnal érvényesek. */
  function bindSave() {
    ['btnSaveMain', 'btnSave'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.addEventListener('click', ment);
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
