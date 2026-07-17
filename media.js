/* =========================================================
   URBAN QUEST — KÖZÖS ADMIN UI (scaffold, inline)
   Minden új oldal beilleszti. window.UQ.toast exportált.
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
   URBAN QUEST — ADMIN / MÉDIA interakciók
   ========================================================= */
(function () {
  'use strict';

  var toast = function (m, o) { (window.UQ && window.UQ.toast ? window.UQ.toast : function () {})(m, o); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var ico = function (id, cls) { return '<svg class="ico ' + (cls || '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; };

  /* visszavonható toast (törléshez) — csapatok.js konvenció */
  function undoToast(msg, sub, onUndo) {
    var wrap = document.getElementById('uqToasts') || document.body;
    var t = document.createElement('div');
    t.className = 'uq-toast is-info';
    t.innerHTML = '<span class="uq-toast-ic">' + ico('a-trash') + '</span>' +
      '<div class="uq-toast-body"><b>' + esc(msg) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>' +
      '<button class="uq-toast-undo" type="button">Visszavonás</button>' +
      '<button class="uq-toast-x" type="button" aria-label="Bezárás">' + ico('a-close', 'ico-sm') + '</button>';
    wrap.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('is-show'); });
    var removed = false, undone = false;
    var dismiss = function () { if (removed) return; removed = true; t.classList.remove('is-show'); setTimeout(function () { t.remove(); }, 260); };
    t.querySelector('.uq-toast-undo').addEventListener('click', function () { if (!undone) { undone = true; onUndo(); } dismiss(); });
    t.querySelector('.uq-toast-x').addEventListener('click', dismiss);
    setTimeout(dismiss, 5000);
  }

  /* ---------- adatok (egyetlen igazságforrás) ---------- */
  var MEDIA = [
    { name: 'varosliget-fooldal.jpg', type: 'image', thumb: 1, size: '2.4 MB', uses: 6, dim: '2560 × 1440', fmt: 'JPEG' },
    { name: 'budai-var-intro.mp4', type: 'video', thumb: 2, size: '18.6 MB', uses: 3, dim: '1920 × 1080', len: '1:24', fmt: 'MP4 / H.264' },
    { name: 'narracio-allomas-1.mp3', type: 'audio', thumb: 3, size: '3.1 MB', uses: 4, len: '2:48', fmt: 'MP3 / 320 kbps' },
    { name: 'gyar-kuldetes-terkep.png', type: 'image', thumb: 4, size: '1.2 MB', uses: 2, dim: '1600 × 1200', fmt: 'PNG' },
    { name: 'margitsziget-panorama.jpg', type: 'image', thumb: 5, size: '3.8 MB', uses: 5, dim: '3840 × 1600', fmt: 'JPEG' },
    { name: 'foldalatti-nyomok-trailer.mp4', type: 'video', thumb: 6, size: '42.3 MB', uses: 1, dim: '1920 × 1080', len: '2:10', fmt: 'MP4 / H.264' },
    { name: 'siker-hangeffekt.mp3', type: 'audio', thumb: 7, size: '412 KB', uses: 12, len: '0:03', fmt: 'MP3 / 192 kbps' },
    { name: 'elveszett-orokseg-borito.jpg', type: 'image', thumb: 8, size: '2.1 MB', uses: 3, dim: '2048 × 1152', fmt: 'JPEG' },
    { name: 'kod-fejtoro-ikon.png', type: 'image', thumb: 9, size: '86 KB', uses: 0, dim: '512 × 512', fmt: 'PNG' },
    { name: 'hatterzene-kaland.mp3', type: 'audio', thumb: 10, size: '5.7 MB', uses: 8, len: '3:52', fmt: 'MP3 / 320 kbps' }
  ];

  var TYPE = {
    image: { label: 'Kép', icon: 'a-image', badge: 'med-badge-image' },
    video: { label: 'Videó', icon: 'a-video', badge: 'med-badge-video' },
    audio: { label: 'Hang', icon: 'a-audio', badge: 'med-badge-audio' }
  };

  var uid = 0;
  MEDIA.forEach(function (m) { m.id = ++uid; });
  var byId = function (id) { return MEDIA.find(function (m) { return m.id === id; }); };

  /* ---------- tartós tárolás (localStorage) — csapatok.js konvenció ---------- */
  var STORE = 'uq_media_v1';
  /* csak a maradandó (data URL) forrásokat mentjük; az objectURL-eket eldobjuk,
     mert újratöltés után úgyis érvénytelenek lennének */
  function pruned(dropAllSrc) {
    return MEDIA.map(function (m) {
      var o = {};
      for (var k in m) { if (Object.prototype.hasOwnProperty.call(m, k)) o[k] = m[k]; }
      if (dropAllSrc || !o.persist) { o.src = ''; }
      if (dropAllSrc) o.persist = false;
      return o;
    });
  }
  function saveStore() {
    try {
      localStorage.setItem(STORE, JSON.stringify(pruned(false)));
    } catch (e) {
      /* QuotaExceededError — próbáljuk forrás nélkül, hogy a metaadat megmaradjon */
      try {
        localStorage.setItem(STORE, JSON.stringify(pruned(true)));
        if (!saveStore._warned) { saveStore._warned = true; toast('A tár megtelt — a nagy fájlok nem maradnak meg', { type: 'error' }); }
      } catch (e2) {}
    }
  }
  (function loadStore() {
    try {
      var raw = localStorage.getItem(STORE);
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) {
          MEDIA.splice(0, MEDIA.length);
          arr.forEach(function (m) { MEDIA.push(m); });
          uid = MEDIA.reduce(function (mx, m) { return Math.max(mx, m.id || 0); }, 0);
        }
      }
    } catch (e) {}
  })();

  /* ---------- állapot ---------- */
  var state = { type: 'all', search: '', modalId: null, replaceId: null, selected: new Set() };

  /* ---------- DOM ---------- */
  var grid = document.getElementById('medGrid');
  var emptyEl = document.getElementById('medEmpty');
  var tabsEl = document.getElementById('medTabs');
  var topSearch = document.getElementById('topSearch');
  var modal = document.getElementById('medModal');
  var fileInput = document.getElementById('mediaFileInput');
  var titleInput = document.getElementById('mmTitle');

  /* ---------- segédek ---------- */
  var SMALL_LIMIT = 1.5 * 1024 * 1024; /* ~1.5 MB */
  var VIDEO_WARN = 3 * 1024 * 1024;    /* 3 MB — efölött figyelmeztetünk (nagy data URI) */
  var VIDEO_MAX = 5 * 1024 * 1024;     /* 5 MB — efölött NEM mentjük (data URI-ként megtelne a localStorage) */

  /* videó-link felismerő — ugyanezt használja a fogyasztó (Feladatok) oldal is */
  function parseVideo(url) {
    url = String(url || '').trim(); if (!url) return null;
    if (/^data:video\//i.test(url) || /\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return { kind: 'file', src: url };
    var yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
    if (yt) return { kind: 'youtube', id: yt[1], embed: 'https://www.youtube.com/embed/' + yt[1] };
    var vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vm) return { kind: 'vimeo', id: vm[1], embed: 'https://player.vimeo.com/video/' + vm[1] };
    return { kind: 'url', src: url };
  }
  /* közvetlenül lejátszható-e <video>-ban (feltöltött data URI vagy közvetlen .mp4/.webm/.ogg link) */
  function videoIsPlayable(m) {
    if (m.type !== 'video' || !m.src) return false;
    var pv = parseVideo(m.src);
    return !!(pv && pv.kind === 'file');
  }
  /* rövid forrás-címke a rácshoz/modalhoz (YouTube / Vimeo / domain); üres, ha feltöltött fájl */
  function videoSource(m) {
    if (m.type !== 'video' || !m.src) return '';
    var pv = parseVideo(m.src);
    if (!pv) return '';
    if (pv.kind === 'youtube') return 'YouTube';
    if (pv.kind === 'vimeo') return 'Vimeo';
    if (pv.kind === 'file') return /^data:video\//i.test(m.src) ? '' : 'MP4';
    try { return new URL(m.src).hostname.replace(/^www\./, ''); } catch (e) { return 'Link'; }
  }
  /* formátum-címke a videó kind alapján (modal „Formátum" sor) */
  function videoKindLabel(kind) {
    return kind === 'youtube' ? 'YouTube'
      : kind === 'vimeo' ? 'Vimeo'
      : kind === 'file' ? 'Videó (MP4/WebM)'
      : 'Videó-link';
  }
  /* megjelenítendő név a linkből, ha a felhasználó nem ad meg sajátot */
  function deriveVideoName(url, pv) {
    if (pv.kind === 'youtube') return 'YouTube videó';
    if (pv.kind === 'vimeo') return 'Vimeo videó';
    if (pv.kind === 'file') {
      if (/^data:/i.test(url)) return 'Videó';
      var clean = url.split('?')[0].split('#')[0];
      var seg = clean.substring(clean.lastIndexOf('/') + 1);
      return seg || 'Videó';
    }
    try { return new URL(url).hostname.replace(/^www\./, '') + ' videó'; } catch (e) { return 'Videó-link'; }
  }

  function detectType(file) {
    var t = (file.type || '').toLowerCase();
    if (t.indexOf('image/') === 0) return 'image';
    if (t.indexOf('video/') === 0) return 'video';
    if (t.indexOf('audio/') === 0) return 'audio';
    return 'image';
  }
  function formatBytes(bytes) {
    bytes = Number(bytes) || 0;
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (bytes >= 1024) return Math.round(bytes / 1024) + ' KB';
    return bytes + ' B';
  }
  /* '2.4 MB' / '840 KB' → bájt (statisztikához) */
  function parseSize(s) {
    if (!s) return 0;
    var m = String(s).trim().match(/^([\d.]+)\s*(GB|MB|KB|B)?$/i);
    if (!m) return 0;
    var n = parseFloat(m[1]) || 0;
    var u = (m[2] || 'MB').toUpperCase();
    if (u === 'GB') return n * 1024 * 1024 * 1024;
    if (u === 'MB') return n * 1024 * 1024;
    if (u === 'KB') return n * 1024;
    return n;
  }
  function extOf(name) {
    var p = String(name || '').split('.');
    return p.length > 1 ? p.pop().toUpperCase() : '';
  }
  function setActiveTab(type) {
    tabsEl.querySelectorAll('.med-tab').forEach(function (b) {
      var on = b.dataset.type === type;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  /* =========================================================
     RÁCS RENDERELÉSE
     ========================================================= */
  function filtered() {
    var s = state.search.trim().toLowerCase();
    return MEDIA.filter(function (m) {
      if (state.type !== 'all' && m.type !== state.type) return false;
      if (s && m.name.toLowerCase().indexOf(s) === -1) return false;
      return true;
    });
  }

  function cardHTML(m) {
    var t = TYPE[m.type];
    /* csak a közvetlenül lejátszható videót (data URI / .mp4 link) tesszük <video>-ba;
       YouTube/Vimeo/egyéb link → gradiens bélyeg + lejátszás-ikon (biztonságos, gyors) */
    var playable = videoIsPlayable(m);
    var hasReal = m.src && (m.type === 'image' || playable);
    var thumbInner = '';
    if (m.src && m.type === 'image') {
      thumbInner = '<img class="med-thumb-img" src="' + esc(m.src) + '" loading="lazy" alt="">';
    } else if (playable) {
      thumbInner = '<video class="med-thumb-img" src="' + esc(m.src) + '" muted preload="metadata" tabindex="-1"></video>';
    }
    var thumbClass = hasReal ? 'med-thumb med-thumb-real' : 'med-thumb med-thumb-' + (m.thumb || 1);
    var play = (m.type === 'video' || m.type === 'audio')
      ? '<span class="med-thumb-play"><span>' + ico(m.type === 'video' ? 'a-video' : 'a-audio') + '</span></span>' : '';
    var checked = state.selected.has(m.id);
    var check = '<span class="med-check' + (checked ? ' is-checked' : '') + '" data-check="' + m.id + '" role="checkbox" aria-checked="' + (checked ? 'true' : 'false') + '" aria-label="Kijelölés">' + ico('a-check', 'ico-xs') + '</span>';
    var usesTxt = m.uses > 0
      ? ico('a-route') + m.uses + ' helyen használva'
      : ico('a-route') + 'Nincs használatban';
    var vsrc = videoSource(m);                        /* videó forrás-címke (YouTube/Vimeo/domain) */
    var infoPrimary = vsrc ? esc(vsrc) : esc(m.size); /* linknél a forrás, egyébként a méret */
    return '<button class="med-card' + (checked ? ' is-selected' : '') + '" type="button" data-id="' + m.id + '">' +
      '<span class="' + thumbClass + '">' + thumbInner + check +
        '<span class="med-badge ' + t.badge + '">' + ico(t.icon) + t.label + '</span>' + play +
      '</span>' +
      '<span class="med-body">' +
        '<span class="med-name">' + esc(m.name) + '</span>' +
        '<span class="med-info">' + infoPrimary +
          (m.dim ? '<span class="med-dot"></span>' + esc(m.dim) : '') +
          (m.len ? '<span class="med-dot"></span>' + esc(m.len) : '') +
        '</span>' +
        '<span class="med-uses' + (m.uses ? '' : ' is-unused') + '">' + usesTxt + '</span>' +
      '</span>' +
    '</button>';
  }

  /* fül-számlálók (Összes / Képek / Videók / Hang) */
  function updateCounts() {
    var c = { all: MEDIA.length, image: 0, video: 0, audio: 0 };
    MEDIA.forEach(function (m) { c[m.type]++; });
    document.getElementById('cAll').textContent = c.all;
    document.getElementById('cImage').textContent = c.image;
    document.getElementById('cVideo').textContent = c.video;
    document.getElementById('cAudio').textContent = c.audio;
  }

  /* élő statisztika kártyák */
  function updateStats() {
    var set = function (id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
    set('statFiles', MEDIA.length);
    set('statVideo', MEDIA.filter(function (m) { return m.type === 'video'; }).length);
    set('statAudio', MEDIA.filter(function (m) { return m.type === 'audio'; }).length);
    var total = MEDIA.reduce(function (a, m) { return a + parseSize(m.size); }, 0);
    set('statSize', formatBytes(total));
  }

  /* tömeges műveleti sáv */
  function updateBulk() {
    var ids = new Set(MEDIA.map(function (m) { return m.id; }));
    Array.from(state.selected).forEach(function (id) { if (!ids.has(id)) state.selected.delete(id); });
    var bar = document.getElementById('bulkBar');
    var cnt = document.getElementById('bulkCount');
    if (cnt) cnt.textContent = state.selected.size;
    if (bar) bar.classList.toggle('is-hidden', state.selected.size === 0);
  }

  function render() {
    var list = filtered();
    grid.innerHTML = list.map(cardHTML).join('');
    emptyEl.hidden = list.length > 0;
    updateCounts();
    updateStats();
    updateBulk();
    saveStore();
  }

  /* =========================================================
     ELŐNÉZET MODAL
     ========================================================= */
  function metaRow(k, v) { return '<div class="med-meta-row"><span class="k">' + esc(k) + '</span><span class="v">' + esc(v) + '</span></div>'; }

  function openModal(id) {
    var m = byId(id);
    if (!m) return;
    state.modalId = id;
    var t = TYPE[m.type];
    titleInput.value = m.name;
    document.getElementById('mmSub').textContent = t.label + ' előnézete';

    var prev = document.getElementById('mmPreview');
    var icHolder = document.getElementById('mmPreviewIc');
    if (m.src && m.type === 'image') {
      prev.className = 'med-preview med-preview-real';
      icHolder.className = 'med-preview-ic is-media';
      icHolder.innerHTML = '<img class="med-preview-media" src="' + esc(m.src) + '" alt="">';
    } else if (videoIsPlayable(m)) {
      prev.className = 'med-preview med-preview-real';
      icHolder.className = 'med-preview-ic is-media';
      icHolder.innerHTML = '<video class="med-preview-media" src="' + esc(m.src) + '" controls preload="metadata"></video>';
    } else if (m.src && m.type === 'audio') {
      prev.className = 'med-thumb med-thumb-' + (m.thumb || 1) + ' med-preview';
      icHolder.className = 'med-preview-ic';
      icHolder.innerHTML = ico(t.icon) + '<audio class="med-preview-audio" src="' + esc(m.src) + '" controls></audio>';
    } else {
      prev.className = 'med-thumb med-thumb-' + (m.thumb || 1) + ' med-preview';
      icHolder.className = 'med-preview-ic';
      icHolder.innerHTML = ico(t.icon);
    }
    var badge = document.getElementById('mmPreviewBadge');
    badge.className = 'med-preview-badge ' + t.badge;
    badge.innerHTML = ico(t.icon) + t.label;

    var vsrc = videoSource(m);
    var rows = metaRow('Fájlnév', m.name) + metaRow('Típus', t.label);
    if (vsrc) rows += metaRow('Forrás', vsrc); else rows += metaRow('Méret', m.size);
    if (m.dim) rows += metaRow('Felbontás', m.dim);
    if (m.len) rows += metaRow('Hossz', m.len);
    if (m.fmt) rows += metaRow('Formátum', m.fmt);
    /* videó-linknél mutassuk az eredeti URL-t (adat-URI-t nem, az túl hosszú) */
    if (m.type === 'video' && m.src && !/^data:/i.test(m.src)) rows += metaRow('Videó-link', m.src);
    rows += metaRow('Felhasználás', m.uses > 0 ? m.uses + ' helyen' : 'Nincs használatban');
    document.getElementById('mmMeta').innerHTML = rows;

    /* videó-linknél a „Letöltés" gomb helyett „Megnyitás" (új lapon) */
    var dlBtn = document.getElementById('mmDownload');
    if (dlBtn) {
      var isLinkVid = (m.type === 'video' && m.src && !/^data:/i.test(m.src));
      dlBtn.innerHTML = ico(isLinkVid ? 'a-eye' : 'a-download', 'ico-sm') + (isLinkVid ? 'Megnyitás' : 'Letöltés');
    }

    modal.classList.add('is-open');
  }
  function closeModal() { modal.classList.remove('is-open'); state.modalId = null; }

  /* =========================================================
     VALÓS FELTÖLTÉS
     ========================================================= */
  function attachSource(m, file, type, onDone) {
    /* videót data URL-ként tároljuk (max. 5 MB-ra korlátozva), hogy újratöltés után is megmaradjon */
    var useDataUrl = (type === 'image') || (type === 'video') || (file.size < SMALL_LIMIT);
    var measureImage = function () {
      if (type !== 'image' || !m.src) return;
      var img = new Image();
      img.onload = function () {
        m.dim = img.naturalWidth + ' × ' + img.naturalHeight;
        render();
        if (state.modalId === m.id) openModal(m.id);
      };
      img.src = m.src;
    };
    if (useDataUrl) {
      var reader = new FileReader();
      reader.onload = function (ev) {
        m.src = ev.target.result;
        m.persist = true;
        measureImage();
        if (onDone) onDone();
      };
      reader.onerror = function () {
        m.src = URL.createObjectURL(file);
        m.persist = false;
        measureImage();
        if (onDone) onDone();
      };
      reader.readAsDataURL(file);
    } else {
      m.src = URL.createObjectURL(file);
      m.persist = false;
      measureImage();
      if (onDone) onDone();
    }
  }

  function addFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    var names = [];
    files.forEach(function (file) {
      var type = detectType(file);
      /* videó méret-korlát: 5 MB felett nem mentjük (data URI-ként túl nagy a localStorage-nak) */
      if (type === 'video' && file.size > VIDEO_MAX) {
        toast('A videó túl nagy — használj inkább linket', { type: 'error', sub: file.name + ' · ' + formatBytes(file.size) });
        return;
      }
      var m = {
        id: ++uid,
        name: file.name,
        type: type,
        thumb: ((uid - 1) % 10) + 1, /* tartalék gradiens, ha nincs forrás */
        size: formatBytes(file.size),
        uses: 0,
        fmt: extOf(file.name) || type.toUpperCase(),
        src: '',
        persist: false
      };
      if (type === 'video') m.kind = 'file'; /* feltöltött videófájl */
      MEDIA.unshift(m);
      names.push(file.name);
      attachSource(m, file, type, function () { render(); });
      /* 3 MB feletti videónál figyelmeztetés (még mentjük, de nagy a data URI) */
      if (type === 'video' && file.size > VIDEO_WARN) {
        toast('Nagy videófájl — hosszú távon inkább használj linket', { type: 'info', sub: file.name + ' · ' + formatBytes(file.size) });
      }
    });
    state.type = 'all'; state.search = '';
    if (topSearch) topSearch.value = '';
    setActiveTab('all');
    render();
    if (!names.length) return; /* csak elutasított (túl nagy) videók voltak */
    if (names.length === 1) toast('Fájl feltöltve', { sub: names[0] });
    else toast(names.length + ' fájl feltöltve', { sub: names.slice(0, 3).join(', ') + (names.length > 3 ? '…' : '') });
  }

  function replaceFile(id, file) {
    var m = byId(id);
    if (!m) return;
    var type = detectType(file);
    /* videó méret-korlát csere esetén is */
    if (type === 'video' && file.size > VIDEO_MAX) {
      toast('A videó túl nagy — használj inkább linket', { type: 'error', sub: file.name + ' · ' + formatBytes(file.size) });
      return;
    }
    m.type = type;
    m.size = formatBytes(file.size);
    m.fmt = extOf(file.name) || type.toUpperCase();
    m.dim = '';
    m.len = '';
    m.src = '';
    m.persist = false;
    if (type === 'video') m.kind = 'file'; else delete m.kind;
    attachSource(m, file, type, function () {
      render();
      if (state.modalId === id) openModal(id);
      toast('Fájl lecserélve', { sub: m.name });
      if (type === 'video' && file.size > VIDEO_WARN) {
        toast('Nagy videófájl — hosszú távon inkább használj linket', { type: 'info', sub: m.name });
      }
    });
  }

  /* =========================================================
     ESEMÉNYEK
     ========================================================= */
  /* szűrő fülek */
  tabsEl.addEventListener('click', function (e) {
    var tab = e.target.closest('.med-tab');
    if (!tab) return;
    state.type = tab.dataset.type;
    setActiveTab(state.type);
    render();
  });

  /* rács: jelölő → kijelölés (modal nélkül), egyébként kártya → modal */
  grid.addEventListener('click', function (e) {
    var chk = e.target.closest('.med-check');
    if (chk) {
      e.stopPropagation();
      var cid = Number(chk.dataset.check);
      if (state.selected.has(cid)) state.selected.delete(cid); else state.selected.add(cid);
      render();
      return;
    }
    var card = e.target.closest('.med-card');
    if (!card) return;
    openModal(Number(card.dataset.id));
  });

  /* felső sáv: kereső → élő szűrés */
  topSearch.addEventListener('input', function () { state.search = topSearch.value; render(); });

  /* feltöltés gomb + dropzone → fájlválasztó */
  document.getElementById('btnUpload').addEventListener('click', function () { state.replaceId = null; fileInput.click(); });
  var dz = document.getElementById('medDropzone');
  dz.addEventListener('click', function () { state.replaceId = null; fileInput.click(); });
  ['dragover', 'dragenter'].forEach(function (ev) {
    dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('is-drag'); });
  });
  ['dragleave', 'dragend'].forEach(function (ev) {
    dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('is-drag'); });
  });
  dz.addEventListener('drop', function (e) {
    e.preventDefault();
    dz.classList.remove('is-drag');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  });

  /* fájlválasztó: feltöltés vagy csere */
  fileInput.addEventListener('change', function () {
    var files = fileInput.files;
    if (state.replaceId != null) {
      var rid = state.replaceId; state.replaceId = null;
      if (files && files[0]) replaceFile(rid, files[0]);
    } else if (files && files.length) {
      addFiles(files);
    }
    fileInput.value = ''; /* reset, hogy ugyanaz a fájl újra választható legyen */
  });

  /* videó-link hozzáadása (YouTube / Vimeo / közvetlen .mp4 URL) */
  var videoUrlInput = document.getElementById('medVideoUrl');
  var btnAddVideoUrl = document.getElementById('btnAddVideoUrl');
  function addVideoUrl() {
    var url = (videoUrlInput && videoUrlInput.value ? videoUrlInput.value : '').trim();
    if (!url) { toast('Illessz be egy videó-linket', { type: 'info' }); if (videoUrlInput) videoUrlInput.focus(); return; }
    var pv = parseVideo(url);
    if (!pv) { toast('Nem ismerhető fel videó-link', { type: 'error' }); return; }
    var m = {
      id: ++uid,
      name: deriveVideoName(url, pv),
      type: 'video',
      kind: pv.kind,               /* youtube | vimeo | file | url */
      src: url,                    /* az EREDETI link marad — a lejátszást a fogyasztó végzi */
      thumb: ((uid - 1) % 10) + 1, /* tartalék gradiens a rácshoz */
      size: '—',
      uses: 0,
      fmt: videoKindLabel(pv.kind),
      persist: true                /* a link szöveg kicsi, mindig elmentjük */
    };
    MEDIA.unshift(m);
    if (videoUrlInput) videoUrlInput.value = '';
    state.type = 'all'; state.search = '';
    if (topSearch) topSearch.value = '';
    setActiveTab('all');
    render();
    toast('Videó hozzáadva', { sub: m.name });
  }
  if (btnAddVideoUrl) btnAddVideoUrl.addEventListener('click', addVideoUrl);
  if (videoUrlInput) videoUrlInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); addVideoUrl(); }
  });

  /* modal: bezárás */
  modal.querySelectorAll('[data-modal-close]').forEach(function (b) {
    b.addEventListener('click', closeModal);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal(); });

  /* modal: átnevezés (cím mező) */
  function commitRename() {
    var m = byId(state.modalId);
    if (!m) return;
    var v = titleInput.value.trim();
    if (!v || v === m.name) { titleInput.value = m.name; return; }
    m.name = v;
    render();
    toast('Átnevezve', { sub: m.name });
  }
  titleInput.addEventListener('change', commitRename);
  titleInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); titleInput.blur(); }
    else if (e.key === 'Escape') { var m = byId(state.modalId); if (m) titleInput.value = m.name; titleInput.blur(); }
  });

  /* modal: valós letöltés */
  document.getElementById('mmDownload').addEventListener('click', function () {
    var m = byId(state.modalId);
    if (!m) return;
    /* videó-link → megnyitás új lapon (nem letöltjük az eredeti oldalt) */
    if (m.type === 'video' && m.src && !/^data:/i.test(m.src)) {
      window.open(m.src, '_blank', 'noopener');
      toast('Videó megnyitása', { type: 'info', sub: m.name });
      return;
    }
    if (m.src) {
      var a = document.createElement('a');
      a.href = m.src;
      a.download = m.name || 'media';
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast('Letöltés indítása', { type: 'info', sub: m.name });
    } else {
      toast('Nincs letölthető forrás ehhez a mintaelemhez', { type: 'info', sub: m.name });
    }
  });

  /* modal: valós csere (fájlválasztó) */
  document.getElementById('mmReplace').addEventListener('click', function () {
    if (state.modalId == null) return;
    state.replaceId = state.modalId;
    fileInput.click();
  });

  /* modal: törlés + visszavonás */
  document.getElementById('mmDelete').addEventListener('click', function () {
    var id = state.modalId;
    var idx = MEDIA.findIndex(function (x) { return x.id === id; });
    if (idx < 0) return;
    var removed = MEDIA[idx];
    MEDIA.splice(idx, 1);
    state.selected.delete(id);
    closeModal();
    render();
    undoToast('Fájl törölve', removed.name, function () {
      MEDIA.splice(Math.min(idx, MEDIA.length), 0, removed);
      render();
      toast('Törlés visszavonva', { sub: removed.name });
    });
  });

  /* tömeges műveletek */
  var bulkClear = document.getElementById('bulkClear');
  if (bulkClear) bulkClear.addEventListener('click', function () { state.selected.clear(); render(); });
  var bulkDelete = document.getElementById('bulkDelete');
  if (bulkDelete) bulkDelete.addEventListener('click', function () {
    var ids = Array.from(state.selected);
    if (!ids.length) return;
    var removed = ids.map(function (id) {
      var idx = MEDIA.findIndex(function (m) { return m.id === id; });
      return idx >= 0 ? { idx: idx, item: MEDIA[idx] } : null;
    }).filter(Boolean).sort(function (a, b) { return a.idx - b.idx; });
    ids.forEach(function (id) { var i = MEDIA.findIndex(function (m) { return m.id === id; }); if (i >= 0) MEDIA.splice(i, 1); });
    state.selected.clear();
    if (modal.classList.contains('is-open') && !byId(state.modalId)) closeModal();
    render();
    undoToast(removed.length + ' fájl törölve', '', function () {
      removed.forEach(function (r) { MEDIA.splice(Math.min(r.idx, MEDIA.length), 0, r.item); });
      render();
      toast('Törlés visszavonva', { sub: removed.length + ' fájl' });
    });
  });

  /* felső sáv: Mentés / Közzététel */
  document.getElementById('btnSave').addEventListener('click', function () { saveStore(); toast('Módosítások mentve', { sub: 'A médiatár elmentve' }); });
  document.getElementById('btnPublish').addEventListener('click', function () { saveStore(); toast('Médiatár közzétéve', { sub: 'Élő a nyilvános oldalon' }); });

  document.querySelectorAll('[data-pub]').forEach(function (b) {
    b.addEventListener('click', function () {
      var a = b.dataset.pub;
      saveStore();
      if (a === 'now') toast('Médiatár közzétéve', { sub: 'Élő a nyilvános oldalon' });
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

  /* =========================================================
     INDÍTÁS
     ========================================================= */
  render();
})();
