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
    /* rAF-et a böngésző elfojtja, ha a lap nem látszik (másik fül) —
       időzítő is biztosítja, hogy az értesítés megjelenjen. */
    var megjelenit = function () { t.classList.add('is-show'); };
    requestAnimationFrame(megjelenit);
    setTimeout(megjelenit, 60);
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
    /* rAF-et a böngésző elfojtja, ha a lap nem látszik (másik fül) —
       időzítő is biztosítja, hogy az értesítés megjelenjen. */
    var megjelenit = function () { t.classList.add('is-show'); };
    requestAnimationFrame(megjelenit);
    setTimeout(megjelenit, 60);
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

  var byId = function (id) { return MEDIA.find(function (m) { return m.id === id; }); };

  /* ---------- adatréteg: Supabase Storage (korábban base64 localStorage)
     A fájl tartalma eddig data URI-ként ült a böngésző tárolójában, és a
     fogyasztó oldalak a teljes sztringet MÁSOLTÁK a saját rekordjukba —
     annyiszor duplikálva, ahányszor kiválasztották. Mostantól a fájl a
     Storage-ban van, a rekord csak hivatkozik rá.
     A méret / felbontás / hossz SZÁM az adatbázisban; a formázás itt történik. */

  function mmss(sec) {
    sec = Number(sec) || 0;
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function dbSor(r) {
    return {
      id: r.id,
      name: r.title || '(névtelen)',
      type: r.kind || 'image',
      src: r.url || '',
      persist: true,
      storagePath: r.storage_path || '',
      externalUrl: r.external_url || '',
      size: r.bytes ? formatBytes(r.bytes) : '—',
      bytes: r.bytes || 0,
      uses: r.hasznalat || 0,
      dim: (r.width && r.height) ? (r.width + ' × ' + r.height) : '',
      len: r.duration_s ? mmss(r.duration_s) : '',
      fmt: r.mime ? String(r.mime).split('/').pop().toUpperCase()
                  : (r.external_url ? 'Videó-link' : (r.kind || '').toUpperCase()),
      thumb: (Math.abs(String(r.id).charCodeAt(0) + String(r.id).charCodeAt(2)) % 10) + 1
    };
  }

  function betolt() {
    if (!window.UQAPI) return Promise.reject(new Error('Hiányzik az adatréteg.'));
    return UQAPI.rest('/v_admin_media?select=*&order=created_at.desc')
      .then(function (sorok) {
        MEDIA.splice(0, MEDIA.length);
        (sorok || []).forEach(function (r) { MEDIA.push(dbSor(r)); });
        return MEDIA;
      });
  }

  function ujratolt(uzenet, alcim) {
    return betolt().then(function () {
      render();
      if (uzenet) toast(uzenet, { type: 'ok', sub: alcim });
    });
  }
  function hibaToast(err) {
    toast('Nem sikerült', { type: 'error', sub: String((err && err.message) || 'Ismeretlen hiba') });
  }

  /* A mentés soronként az adatbázisba megy; nincs többé „az egész tömböt
     kiírom" minta, és nincs kvótahiba sem. */
  function saveStore() { /* szándékosan üres — az adatbázis a forrás */ }

  MEDIA.splice(0, MEDIA.length);   // a beépített minta-adat kiürül

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
  /* A kép méretét feltöltés ELŐTT mérjük meg, hogy számként menthessük
     (a régi kód formázott szöveget tárolt: '2560 × 1440'). */
  function meriKep(file) {
    return new Promise(function (resolve) {
      if (!/^image\//i.test(file.type) || /svg/i.test(file.type)) return resolve({});
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = function () { resolve({}); URL.revokeObjectURL(url); };
      img.src = url;
    });
  }

  function meriHang(file) {
    return new Promise(function (resolve) {
      if (!/^audio\//i.test(file.type)) return resolve({});
      var url = URL.createObjectURL(file);
      var a = document.createElement('audio');
      a.preload = 'metadata';
      a.onloadedmetadata = function () {
        resolve({ duration_s: isFinite(a.duration) ? Math.round(a.duration) : null });
        URL.revokeObjectURL(url);
      };
      a.onerror = function () { resolve({}); URL.revokeObjectURL(url); };
      a.src = url;
    });
  }

  var FILE_MAX = 10 * 1024 * 1024;   // a Storage-bucket korlátja

  /* Feltöltés a Storage-ba, majd rekord az adatbázisba. A videó nem
     tölthető fel: külső hivatkozással jön, hogy a közös 1 GB-os keret
     ne fogyjon el, és terepen ne kelljen tízmegás fájlt letölteni. */
  function addFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    if (!window.UQAPI || !UQAPI.user()) {
      toast('Bejelentkezés szükséges', { type: 'error', sub: 'A feltöltéshez admin fiók kell.' });
      return;
    }

    var kesz = [], hibak = 0;

    function egy(i) {
      if (i >= files.length) {
        state.type = 'all'; state.search = '';
        if (topSearch) topSearch.value = '';
        setActiveTab('all');
        return ujratolt(
          kesz.length ? (kesz.length === 1 ? 'Fájl feltöltve' : kesz.length + ' fájl feltöltve') : null,
          kesz.slice(0, 3).join(', ') + (kesz.length > 3 ? '…' : ''));
      }
      var file = files[i];
      var type = detectType(file);

      if (type === 'video') {
        toast('A videót hivatkozással add hozzá', {
          type: 'error', sub: file.name + ' — használd a „Videó hozzáadása linkkel" gombot.' });
        hibak++; return egy(i + 1);
      }
      if (file.size > FILE_MAX) {
        toast('A fájl túl nagy', { type: 'error', sub: file.name + ' · ' + formatBytes(file.size) + ' — a korlát 10 MB.' });
        hibak++; return egy(i + 1);
      }

      return Promise.all([meriKep(file), meriHang(file)])
        .then(function (mert) {
          var meta = Object.assign({}, mert[0], mert[1]);
          return UQAPI.upload(file).then(function (fel) {
            return UQAPI.rest('/rpc/save_media', { method: 'POST', body: { p: {
              kind: type,
              title: file.name,
              storage_path: fel.path,
              mime: file.type || '',
              bytes: String(file.size),
              width: meta.width == null ? '' : String(meta.width),
              height: meta.height == null ? '' : String(meta.height),
              duration_s: meta.duration_s == null ? '' : String(meta.duration_s)
            } } });
          });
        })
        .then(function () { kesz.push(file.name); })
        .catch(function (e) { hibak++; hibaToast(e); })
        .then(function () { return egy(i + 1); });
    }
    egy(0);
  }

  /* Csere: új fájl a Storage-ba, a régi utána törlődik. A rekord
     azonosítója megmarad, tehát a hivatkozások nem törnek el. */
  function replaceFile(id, file) {
    var m = byId(id);
    if (!m) return;
    var type = detectType(file);
    if (type === 'video') {
      toast('A videót hivatkozással add hozzá', { type: 'error', sub: 'Videófájl feltöltése nem támogatott.' });
      return;
    }
    if (file.size > FILE_MAX) {
      toast('A fájl túl nagy', { type: 'error', sub: file.name + ' · ' + formatBytes(file.size) + ' — a korlát 10 MB.' });
      return;
    }
    var regiPath = m.storagePath;

    Promise.all([meriKep(file), meriHang(file)])
      .then(function (mert) {
        var meta = Object.assign({}, mert[0], mert[1]);
        return UQAPI.upload(file).then(function (fel) {
          return UQAPI.rest('/media?id=eq.' + id, {
            method: 'PATCH',
            body: {
              kind: type,
              storage_path: fel.path,
              external_url: null,
              mime: file.type || '',
              bytes: file.size,
              width: meta.width == null ? null : meta.width,
              height: meta.height == null ? null : meta.height,
              duration_s: meta.duration_s == null ? null : meta.duration_s
            },
            prefer: 'return=minimal'
          });
        });
      })
      .then(function () {
        if (regiPath) UQAPI.removeFile(regiPath);
        return ujratolt('Fájl lecserélve', m.name);
      })
      .then(function () { if (state.modalId === id) openModal(id); })
      .catch(hibaToast);
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
      var cid = chk.dataset.check;   // UUID, nem szám
      if (state.selected.has(cid)) state.selected.delete(cid); else state.selected.add(cid);
      render();
      return;
    }
    var card = e.target.closest('.med-card');
    if (!card) return;
    openModal(card.dataset.id);
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
    var nev = deriveVideoName(url, pv);

    UQAPI.rest('/rpc/save_media', { method: 'POST', body: { p: {
      kind: 'video',
      title: nev,
      external_url: url,     // az EREDETI link marad — a lejátszást a fogyasztó végzi
      mime: ''
    } } })
      .then(function () {
        if (videoUrlInput) videoUrlInput.value = '';
        state.type = 'all'; state.search = '';
        if (topSearch) topSearch.value = '';
        setActiveTab('all');
        return ujratolt('Videó hozzáadva', nev);
      })
      .catch(hibaToast);
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
    UQAPI.rest('/rpc/save_media', { method: 'POST', body: { p: { id: m.id, title: v } } })
      .then(function () { return ujratolt('Átnevezve', v); })
      .catch(function (e) { titleInput.value = m.name; hibaToast(e); });
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

  /* Törlés. Visszavonás NINCS: a Storage-fájl is megszűnik, tehát a
     visszaszúrás csak a metaadatot hozná vissza, tartalom nélkül —
     ezért inkább előre kérdezünk. A használatban lévő elemet a szerver
     nem engedi törölni. */
  function torol(m) {
    return UQAPI.rest('/rpc/delete_media', { method: 'POST', body: { p_media: m.id } })
      .then(function (r) {
        var d = Array.isArray(r) ? r[0] : r;
        if (d && d.storage_path) UQAPI.removeFile(d.storage_path);
      });
  }

  document.getElementById('mmDelete').addEventListener('click', function () {
    var m = byId(state.modalId);
    if (!m) return;
    if (!window.confirm(
      'Fájl törlése — nincs visszavonás.\n\n' + m.name +
      (m.uses ? '\n\nFIGYELEM: ' + m.uses + ' helyen használatban van.' : '') +
      '\n\nBiztosan törlöd?')) return;
    torol(m)
      .then(function () {
        state.selected.delete(m.id);
        closeModal();
        return ujratolt('Fájl törölve', m.name);
      })
      .catch(hibaToast);
  });

  /* tömeges műveletek */
  var bulkClear = document.getElementById('bulkClear');
  if (bulkClear) bulkClear.addEventListener('click', function () { state.selected.clear(); render(); });
  var bulkDelete = document.getElementById('bulkDelete');
  if (bulkDelete) bulkDelete.addEventListener('click', function () {
    var ids = Array.from(state.selected);
    if (!ids.length) return;
    var elemek = ids.map(byId).filter(Boolean);
    var hasznalt = elemek.filter(function (m) { return m.uses > 0; }).length;
    if (!window.confirm(
      elemek.length + ' fájl törlése — nincs visszavonás.\n' +
      (hasznalt ? '\nEbből ' + hasznalt + ' használatban van; azokat a rendszer nem fogja törölni.\n' : '') +
      '\nBiztosan folytatod?')) return;

    var ok = 0, hiba = 0;
    elemek.reduce(function (chain, m) {
      return chain.then(function () {
        return torol(m).then(function () { ok++; }, function () { hiba++; });
      });
    }, Promise.resolve()).then(function () {
      state.selected.clear();
      if (modal.classList.contains('is-open')) closeModal();
      return ujratolt(ok + ' fájl törölve', hiba ? (hiba + ' nem volt törölhető (használatban van)') : '');
    });
  });

  /* felső sáv: Mentés / Közzététel */
  /* A médiatárban nincs mit külön menteni vagy közzétenni: a feltöltés és
     az átnevezés azonnal az adatbázisba megy. A két fejléc-gomb ezért
     kikerült az oldalról — korábban csak zöld visszajelzést adtak. */

  /* A Közzététel legördülő három pontja (most / ütemezés / piszkozat)
     nem létező műveleteket ígért, csak visszajelzést adott — kikerült. */

  /* A Fiók legördülőt a közös uq-admin-fejlec.js kezeli. */

  /* =========================================================
     INDÍTÁS — az adatbázisból töltünk, ezért aszinkron
     ========================================================= */
  function ures(html) { if (emptyEl) { emptyEl.hidden = false; emptyEl.innerHTML = html; } }

  function indul() {
    if (!window.UQAPI || !UQAPI.user()) {
      ures('<p><b>Nem vagy bejelentkezve.</b></p>' +
           '<p>A médiatár kezeléséhez admin fiók kell.</p>' +
           '<p><a class="adm-btn adm-btn-lime" href="bejelentkezes.html?next=media.html">Bejelentkezés</a></p>');
      return;
    }
    betolt()
      .then(function () {
        render();
        if (!MEDIA.length) {
          ures('<p><b>A médiatár üres.</b></p>' +
               '<p>Tölts fel képet vagy hangot (max. 10 MB), videót pedig hivatkozással adj hozzá.</p>');
        }
      })
      .catch(function (err) {
        ures('<p><b>A médiatár nem tölthető be.</b></p><p>' +
             String(err && err.message || '') + '</p>');
      });
  }

  indul();
  if (window.UQAPI) UQAPI.onAuth(function () { indul(); });
})();
