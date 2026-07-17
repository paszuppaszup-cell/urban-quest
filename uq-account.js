/* =========================================================
   URBAN QUEST — bejelentkezett felület adatrétege
   localStorage-demó (backend nélkül). Publikus API: window.UQAccount

   Kulcsok:
     uq_user_v1      -> profil {name,email,since,phone,avatar,lang,teamName,audience}
     uq_favs_v1      -> kedvencek [questId, ...]  (kijelentkezve is működik)
     uq_bookings_v1  -> foglalás-igények [{id,code,questId,questTitle,date,time,teamSize,teamName,status,created}]

   Kedvencek:  getFavs / isFav / toggleFav / favCount / syncFavs
   Foglalás:   getBookings / addBooking / cancelBooking / openBooking
   Profil:     getProfile / updateProfile / exportData / deleteAccount
   UI:         renderHomeStrip / avatarSVG / AVATARS
   Események:  uq:favs, uq:bookings, uq:auth (utóbbit a uq-auth küldi)
   ========================================================= */
(function () {
  'use strict';

  var FAVS = 'uq_favs_v1';
  var PLAYS = 'uq_plays_v1';
  var USER = 'uq_user_v1';

  /* ---------- kis segédek ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function read(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }
  function fire(name, detail) { document.dispatchEvent(new CustomEvent(name, { detail: detail })); }
  function uid() { return 'p' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); }

  /* ---------- ikonok ---------- */
  var ICO = {
    heart: '<path d="M12 20s-7-4.6-7-9.3A4 4 0 0 1 12 7a4 4 0 0 1 7 3.7C19 15.4 12 20 12 20z"/>',
    ticket: '<path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12"/>',
    cal: '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 5.5a3 3 0 0 1 0 5.2M20.5 19a4.4 4.4 0 0 0-3-4.1"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    play: '<path d="M7 4.5 19 12 7 19.5z"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12 4.5 4.5L19 7"/>',
    pin: '<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>'
  };
  function svg(id, cls) {
    return '<svg class="' + (cls || 'uq-ac-ico') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICO[id] || '') + '</svg>';
  }

  /* avatar-ikonkészlet (küldetés-hangulat) — nincs képfeltöltés, kvótakímélő */
  var AVATARS = [
    '<path d="M12 3 4.5 12 12 21l7.5-9z"/>',                                   // gyémánt
    '<circle cx="12" cy="12" r="8"/><path d="M14.5 9.5 13 13l-3.5 1.5L11 11z"/>', // iránytű
    '<path d="M4 20 10 6l3 5 M9 20l6-11 5 11"/>',                              // hegyek
    '<path d="M12 3l2.6 5.6L21 9.4l-4.5 4.3 1.1 6.3L12 17l-5.6 3 1.1-6.3L3 9.4l6.4-.8z"/>', // csillag
    '<path d="M8 4h8v4a4 4 0 0 1-8 0z"/><path d="M8 5.5H5.5A1.5 1.5 0 0 0 5 8.5c.4 1.4 1.6 2.5 3 2.5M16 5.5h2.5A1.5 1.5 0 0 1 19 8.5c-.4 1.4-1.6 2.5-3 2.5M9.5 20h5M12 13v3"/>', // trófea
    '<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.3"/>', // pin
    '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.5 11 15l5-6"/>',        // pipa-kör
    '<path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3zM9 4v13M15 7v13"/>'            // térkép
  ];
  function avatarSVG(idx, cls) {
    var p = AVATARS[(idx | 0) % AVATARS.length] || AVATARS[0];
    return '<svg class="' + (cls || 'uq-av-ico') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  /* ---------- profil ---------- */
  function getProfile() {
    var u = read(USER, null);
    return (u && u.email) ? u : null;
  }
  function updateProfile(patch) {
    var u = getProfile() || {};
    var next = Object.assign({}, u, patch);
    if (window.UQAuth && window.UQAuth.setUser) window.UQAuth.setUser(next); // fejléc is frissül
    else { write(USER, next); fire('uq:auth', next); }
    return next;
  }

  /* ---------- kedvencek ---------- */
  function getFavs() { var a = read(FAVS, []); return Array.isArray(a) ? a.slice() : []; }
  function isFav(id) { return getFavs().indexOf(id) > -1; }
  function favCount() { return getFavs().length; }
  function setFavs(a) { write(FAVS, a); fire('uq:favs', { favs: a }); }
  function toggleFav(id) {
    if (!id) return false;
    var a = getFavs(), i = a.indexOf(id);
    if (i > -1) a.splice(i, 1); else a.push(id);
    setFavs(a);
    return i < 0; // true = most már kedvenc
  }

  function syncFavs(root) {
    var favs = getFavs();
    (root || document).querySelectorAll('.quest-card').forEach(function (card) {
      var btn = card.querySelector('.fav');
      if (!btn) return;
      var on = favs.indexOf(card.getAttribute('data-id')) > -1;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
    });
  }

  // egyetlen delegált kattintás-kezelő az összes szív-gombra (kijelentkezve is ment)
  var favWired = false;
  function initFavDelegation() {
    if (favWired) return;
    favWired = true;
    document.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.fav') : null;
      if (!btn) return;
      var card = btn.closest('.quest-card');
      if (!card) return;
      var id = card.getAttribute('data-id');
      if (!id) return;
      e.preventDefault();
      e.stopPropagation();
      var on = toggleFav(id);
      document.querySelectorAll('.quest-card').forEach(function (c) {
        if (c.getAttribute('data-id') !== id) return;
        var b = c.querySelector('.fav');
        if (b) { b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); }
      });
    }, true); // capture: a kártyák saját handlerei elé kerül
  }

  /* ---------- játékaim (elkezdett + befejezett végigjátszások) ----------
     uq_plays_v1: [{id, questId, questTitle, status:'inprogress'|'done',
                    points, done, skipped, pathLen, total, timeMs,
                    startedAt, updatedAt, finishedAt, state}]
     Egy játékhoz egyszerre egy „folytatható" (inprogress) rekord tartozhat;
     a befejezettek felhalmozódnak. A jatszas.js írja ezeket. */
  function getPlays() { var a = read(PLAYS, []); return Array.isArray(a) ? a : []; }
  function writePlays(list) { write(PLAYS, list); fire('uq:plays', { plays: list }); }
  function activePlay(questId) {
    return getPlays().filter(function (p) { return p.questId === questId && p.status === 'inprogress'; })[0] || null;
  }
  function inProgressPlays() { return getPlays().filter(function (p) { return p.status === 'inprogress'; }); }
  function donePlays() {
    return getPlays().filter(function (p) { return p.status === 'done'; })
      .sort(function (a, b) { return (b.finishedAt || '').localeCompare(a.finishedAt || ''); });
  }
  // haladás mentése/frissítése (inprogress)
  function saveProgress(o) {
    var list = getPlays();
    var rec = list.filter(function (p) { return p.questId === o.questId && p.status === 'inprogress'; })[0];
    var now = new Date().toISOString();
    if (!rec) {
      rec = { id: uid(), questId: o.questId, questTitle: o.questTitle || 'Játék', status: 'inprogress',
        points: 0, done: 0, skipped: 0, pathLen: 0, total: o.total || 0, timeMs: 0,
        startedAt: now, updatedAt: now, finishedAt: '', state: null };
      list.unshift(rec);
    }
    rec.questTitle = o.questTitle || rec.questTitle;
    if (o.points != null) rec.points = o.points;
    if (o.done != null) rec.done = o.done;
    if (o.skipped != null) rec.skipped = o.skipped;
    if (o.pathLen != null) rec.pathLen = o.pathLen;
    if (o.total != null) rec.total = o.total;
    if (o.timeMs != null) rec.timeMs = o.timeMs;
    if (o.state !== undefined) rec.state = o.state;
    rec.updatedAt = now;
    writePlays(list);
    return rec;
  }
  // befejezés: az inprogress rekord done-ra vált (vagy új done készül)
  function finishPlay(o) {
    var list = getPlays();
    var rec = list.filter(function (p) { return p.questId === o.questId && p.status === 'inprogress'; })[0];
    var now = new Date().toISOString();
    if (!rec) {
      rec = { id: uid(), questId: o.questId, questTitle: o.questTitle || 'Játék', startedAt: now };
      list.unshift(rec);
    }
    rec.status = 'done';
    rec.questTitle = o.questTitle || rec.questTitle;
    rec.points = o.points != null ? o.points : rec.points || 0;
    rec.done = o.done != null ? o.done : rec.done || 0;
    rec.skipped = o.skipped != null ? o.skipped : rec.skipped || 0;
    rec.pathLen = o.pathLen != null ? o.pathLen : rec.pathLen || 0;
    rec.total = o.total != null ? o.total : rec.total || 0;
    rec.timeMs = o.timeMs != null ? o.timeMs : rec.timeMs || 0;
    rec.finishedAt = now; rec.updatedAt = now; rec.state = null;
    writePlays(list);
    return rec;
  }
  function removePlay(id) {
    var list = getPlays().filter(function (p) { return p.id !== id; });
    writePlays(list);
  }
  // egy játék folytatható állapotának eldobása (újrakezdéshez)
  function clearProgress(questId) {
    var list = getPlays().filter(function (p) { return !(p.questId === questId && p.status === 'inprogress'); });
    writePlays(list);
  }

  /* ---------- GDPR ---------- */
  function exportData() {
    return { exportedAt: new Date().toISOString(), profile: getProfile(), favorites: getFavs(), plays: getPlays() };
  }
  function deleteAccount() {
    // profil + kedvencek + játékok törlődnek
    try { localStorage.removeItem(PLAYS); } catch (e) {}
    fire('uq:plays', { plays: [] });
    try { localStorage.removeItem(FAVS); } catch (e) {}
    fire('uq:favs', { favs: [] });
    if (window.UQAuth && window.UQAuth.clearUser) window.UQAuth.clearUser();
    else { try { localStorage.removeItem(USER); } catch (e) {} fire('uq:auth', null); }
  }

  /* =========================================================
     JÁTÉK INDÍTÁSA — a küldetés-oldalról a végigjátszóra visz
     (regisztráció-kapu a hívó oldalon; itt csak a navigáció)
     ========================================================= */
  function startGame(questId) {
    if (!questId) return;
    location.href = 'jatszas.html?quest=' + encodeURIComponent(questId);
  }
  function fmtTime(ms) {
    var s = Math.max(0, Math.floor((ms || 0) / 1000)), m = Math.floor(s / 60), r = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
  }

  /* =========================================================
     SZEMÉLYES SÁV (főoldal, hero alatt)
     ========================================================= */
  function fmtDate(iso) {
    if (!iso) return '';
    var p = iso.split('-'); return p.length === 3 ? (p[0] + '. ' + p[1] + '. ' + p[2] + '.') : iso;
  }
  function renderHomeStrip(mount) {
    if (!mount) return;
    var u = getProfile();
    if (!u) { mount.innerHTML = ''; mount.hidden = true; return; }
    mount.hidden = false;

    var favs = getFavs().filter(function (id) { return window.QUESTS && window.QUESTS[id]; });
    var resume = inProgressPlays()[0]; // folytatható játék
    var first = (u.name || '').split(/[.\s@]/)[0];
    first = first ? first.charAt(0).toUpperCase() + first.slice(1) : 'kalandor';

    var html = '<div class="uq-ps-inner container">';
    html += '<div class="uq-ps-head">' +
      '<h2 class="uq-ps-hi">Szia, ' + esc(first) + '! 👋</h2>' +
      '<a class="uq-ps-link" href="fiokom.html">Fiókom' + svg('arrow', 'uq-ac-ico uq-ac-ico-xs') + '</a>' +
    '</div>';

    if (resume) {
      var pct = resume.total ? Math.round(resume.pathLen / resume.total * 100) : 0;
      html += '<a class="uq-ps-next" href="jatszas.html?quest=' + encodeURIComponent(resume.questId) + '">' +
        '<span class="uq-ps-next-ic">' + svg('play', 'uq-ac-ico') + '</span>' +
        '<span class="uq-ps-next-txt"><span class="uq-ps-next-lbl">Folytasd a játékod</span>' +
        '<strong>' + esc(resume.questTitle) + '</strong>' +
        '<span class="uq-ps-next-meta">' + resume.pathLen + '/' + (resume.total || '?') + ' állomás · ' + resume.points + ' pont · ' + fmtTime(resume.timeMs) + '</span></span>' +
        '<span class="uq-ps-badge st-wait">' + pct + '%</span>' +
      '</a>';
    }

    if (favs.length) {
      html += '<div class="uq-ps-sub"><h3>A kedvenceid</h3><a href="fiokom.html#kedvencek">Mind (' + favs.length + ')</a></div>';
      html += '<div class="uq-ps-track">' + favs.slice(0, 6).map(function (id) { return window.questCardHTML(id); }).join('') + '</div>';
    } else if (!resume) {
      html += '<div class="uq-ps-empty">' +
        '<p>Még nincs kedvenc küldetésed. Böngéssz, és a szív ikonnal mentsd el, amelyik megtetszik — vagy indíts el egyet egyből!</p>' +
        '<a class="uq-ps-cta" href="#kuldetesek">Válaszd ki az első küldetésed' + svg('arrow', 'uq-ac-ico uq-ac-ico-sm') + '</a>' +
      '</div>';
    }

    html += '</div>';
    mount.innerHTML = html;
    syncFavs(mount);
  }

  /* ---------- init ---------- */
  initFavDelegation();

  window.UQAccount = {
    // kedvencek
    getFavs: getFavs, isFav: isFav, toggleFav: toggleFav, favCount: favCount, syncFavs: syncFavs,
    // játékaim (végigjátszások)
    getPlays: getPlays, activePlay: activePlay, inProgressPlays: inProgressPlays, donePlays: donePlays,
    saveProgress: saveProgress, finishPlay: finishPlay, removePlay: removePlay, clearProgress: clearProgress,
    startGame: startGame, fmtTime: fmtTime,
    // profil / gdpr
    getProfile: getProfile, updateProfile: updateProfile, exportData: exportData, deleteAccount: deleteAccount,
    // ui
    renderHomeStrip: renderHomeStrip, avatarSVG: avatarSVG, AVATARS: AVATARS
  };
})();
