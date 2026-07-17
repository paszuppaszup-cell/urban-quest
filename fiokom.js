/* =========================================================
   URBAN QUEST — Fiókom (bejelentkezett felhasználói oldal)
   Fül-alapú felület: Áttekintés / Foglalásaim / Kedvenceim /
   Csapatom / Adataim. Hash-vezérelt váltás.
   Adatréteg: window.UQAccount (+ UQAuth, QUESTS).
   ========================================================= */
(function () {
  'use strict';

  /* ---------- VÉDELEM: csak bejelentkezve ---------- */
  // Ha nincs regisztrált felhasználó, azonnal a bejelentkezésre irányítunk,
  // hogy a fiók-tartalom ne villanjon fel.
  if (!window.UQAuth || !window.UQAuth.isRegistered()) {
    location.replace('bejelentkezes.html?next=fiokom.html');
    return;
  }

  var AC = window.UQAccount;
  var TABS = ['attekintes', 'jatekok', 'kedvencek', 'csapatom', 'adataim'];

  /* ---------- kis segédek ---------- */
  // Saját XSS-escape a kimenethez (minden felhasználói szöveget átfuttatunk rajta).
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function ico(id, cls) {
    return '<svg class="' + (cls || 'ico') + '" aria-hidden="true"><use href="#' + id + '"/></svg>';
  }
  // ISO időbélyeg -> '2026. 07. 20.' (ember-olvasható dátum)
  function fmtDate(iso) {
    if (!iso) return '';
    var d = String(iso).slice(0, 10).split('-');
    return d.length === 3 ? (d[0] + '. ' + d[1] + '. ' + d[2] + '.') : String(iso);
  }
  // ms -> mm:ss
  function fmtTime(ms) {
    var s = Math.max(0, Math.floor((ms || 0) / 1000)), m = Math.floor(s / 60), r = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
  }
  // keresztnév a profilból; e-mail-szerű névből a @ előtti rész, nagy kezdőbetűvel
  function firstName(prof) {
    var base = (prof && (prof.name || prof.email) || '').split(/[.\s@]/)[0];
    if (!base) return 'kalandor';
    return base.charAt(0).toUpperCase() + base.slice(1);
  }

  var panel = document.getElementById('fiokPanel');
  var tabsNav = document.getElementById('fiokTabs');

  /* =========================================================
     FÜL: ÁTTEKINTÉS
     ========================================================= */
  function renderAttekintes() {
    var prof = AC.getProfile() || {};
    var active = AC.inProgressPlays();
    var done = AC.donePlays();
    var favs = AC.getFavs().filter(function (id) { return window.QUESTS && window.QUESTS[id]; });
    var team = (prof.teamName && prof.teamName.trim()) ? prof.teamName.trim() : '—';

    var html = '';
    html += '<header class="fk-greet">' +
      '<h1 class="fk-greet-hi">Szia, ' + esc(firstName(prof)) + '! <span class="fk-wave">👋</span></h1>' +
      '<p class="fk-greet-sub">Itt egy helyen látod a játékaid, a kedvenc küldetéseid és a csapatod.</p>' +
    '</header>';

    // folytatható játék kiemelt kártya (ha van)
    if (active.length) {
      var r = active[0];
      var pct = r.total ? Math.round(r.pathLen / r.total * 100) : 0;
      html += '<a class="fk-resume" href="jatszas.html?quest=' + encodeURIComponent(r.questId) + '">' +
        '<span class="fk-resume-ic">' + ico('i-map', 'ico') + '</span>' +
        '<span class="fk-resume-txt"><span class="fk-resume-lbl">Folytasd, ahol abbahagytad</span>' +
        '<strong>' + esc(r.questTitle) + '</strong>' +
        '<span class="fk-resume-meta">' + r.pathLen + '/' + (r.total || '?') + ' állomás · ' + r.points + ' pont · ' + fmtTime(r.timeMs) + '</span></span>' +
        '<span class="fk-resume-go">' + pct + '%' + ico('i-arrow-right', 'ico ico-sm') + '</span>' +
      '</a>';
    }

    // statisztika-kártyák
    html += '<div class="fk-stats">' +
      statLink('jatekok', 'i-trophy', done.length, 'Befejezett játék') +
      statLink('kedvencek', 'i-heart', favs.length, 'Kedvenc küldetésed') +
      statLink('csapatom', 'i-users', esc(team), 'A csapatod') +
    '</div>';

    // teljesen üres állapot (se játék, se kedvenc)
    if (!active.length && !done.length && !favs.length) {
      html += '<div class="fk-empty fk-empty-lg">' +
        '<span class="fk-empty-ic">' + ico('i-compass', 'ico') + '</span>' +
        '<h2 class="fk-empty-title">Kezdődjön a kaland!</h2>' +
        '<p>Még nem játszottál és nincs kedvenc küldetésed sem. Válassz egy küldetést, és indítsd el egyből!</p>' +
        '<a class="btn btn-lime" href="index.html#kuldetesek">' + ico('i-arrow-right', 'ico ico-sm') + 'Küldetések böngészése</a>' +
      '</div>';
    } else {
      // gyors-linkek a többi fülre
      html += '<div class="fk-quick">' +
        quickLink('jatekok', 'i-trophy', 'Játékaim', 'Folytasd az elkezdett és nézd meg a befejezett játékaidat.') +
        quickLink('kedvencek', 'i-heart', 'Kedvenceim', 'A szívvel elmentett küldetéseid.') +
        quickLink('csapatom', 'i-users', 'Csapatom', 'Add meg vagy módosítsd a csapatnevet.') +
        quickLink('adataim', 'i-user-circle', 'Adataim', 'Profil, nyelv és adatkezelés.') +
      '</div>';
    }

    panel.innerHTML = html;
  }

  function statLink(tab, icon, value, label) {
    return '<a class="fk-stat" href="#' + tab + '">' +
      '<span class="fk-stat-ic">' + ico(icon, 'ico') + '</span>' +
      '<span class="fk-stat-num">' + value + '</span>' +
      '<span class="fk-stat-lbl">' + esc(label) + '</span>' +
    '</a>';
  }
  function quickLink(tab, icon, title, desc) {
    return '<a class="fk-quick-link" href="#' + tab + '">' +
      '<span class="fk-quick-ic">' + ico(icon, 'ico') + '</span>' +
      '<span class="fk-quick-txt"><strong>' + esc(title) + '</strong><span>' + esc(desc) + '</span></span>' +
      ico('i-chevron-right', 'ico ico-sm fk-quick-chev') +
    '</a>';
  }

  /* =========================================================
     FÜL: JÁTÉKAIM (folytatható + befejezett)
     ========================================================= */
  function renderJatekok() {
    var active = AC.inProgressPlays();
    var done = AC.donePlays();

    var html = '<header class="fk-head"><h1 class="fk-title">Játékaim</h1>' +
      '<p class="fk-sub">Folytasd az elkezdett kalandokat, és nézd meg a befejezett játékaid eredményét.</p></header>';

    if (!active.length && !done.length) {
      html += emptyBox('i-trophy', 'Még nem játszottál egy kalandot sem.',
        'Válassz egy küldetést, indítsd el egyből, és a haladásod itt jelenik meg.',
        'index.html#kuldetesek', 'Küldetések böngészése');
      panel.innerHTML = html;
      return;
    }

    /* ---- folytatható játékok ---- */
    if (active.length) {
      html += '<h2 class="fk-group-h">' + ico('i-map', 'ico ico-sm') + 'Folytatható</h2>';
      html += '<div class="fk-plays">';
      active.forEach(function (p) {
        var pct = p.total ? Math.round(p.pathLen / p.total * 100) : 0;
        html += '<article class="fk-play is-active">' +
          '<div class="fk-play-main">' +
            '<div class="fk-play-top"><h3 class="fk-play-title">' + esc(p.questTitle) + '</h3>' +
              '<span class="fk-status st-wait">Folyamatban</span></div>' +
            '<div class="fk-play-meta">' +
              '<span>' + ico('i-map', 'ico ico-xs') + p.pathLen + '/' + (p.total || '?') + ' állomás</span>' +
              '<span>' + ico('i-trophy', 'ico ico-xs') + p.points + ' pont</span>' +
              '<span>' + ico('i-clock', 'ico ico-xs') + fmtTime(p.timeMs) + '</span>' +
            '</div>' +
            '<div class="fk-play-bar"><div style="width:' + pct + '%"></div></div>' +
          '</div>' +
          '<div class="fk-play-side">' +
            '<a class="btn btn-lime fk-play-go" href="jatszas.html?quest=' + encodeURIComponent(p.questId) + '">' + ico('i-arrow-right', 'ico ico-sm') + 'Folytatás</a>' +
            '<button class="fk-play-del" type="button" data-del="' + esc(p.id) + '" aria-label="Törlés">' + ico('i-close', 'ico ico-xs') + '</button>' +
          '</div>' +
        '</article>';
      });
      html += '</div>';
    }

    /* ---- befejezett játékok ---- */
    if (done.length) {
      html += '<h2 class="fk-group-h">' + ico('i-check', 'ico ico-sm') + 'Befejezett</h2>';
      html += '<div class="fk-plays">';
      done.forEach(function (p) {
        var rate = (p.done + p.skipped) ? Math.round(p.done / (p.done + p.skipped) * 100) : 0;
        html += '<article class="fk-play is-done">' +
          '<div class="fk-play-main">' +
            '<div class="fk-play-top"><h3 class="fk-play-title">' + esc(p.questTitle) + '</h3>' +
              '<span class="fk-status st-ok">Teljesítve</span></div>' +
            '<div class="fk-play-meta">' +
              '<span>' + ico('i-trophy', 'ico ico-xs') + '<b>' + p.points + '</b> pont</span>' +
              '<span>' + ico('i-clock', 'ico ico-xs') + fmtTime(p.timeMs) + '</span>' +
              '<span>' + ico('i-check', 'ico ico-xs') + p.done + '/' + (p.done + p.skipped) + ' feladat</span>' +
              '<span>' + ico('i-calendar', 'ico ico-xs') + fmtDate(p.finishedAt) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="fk-play-side">' +
            '<a class="btn btn-ghost fk-play-go" href="jatszas.html?quest=' + encodeURIComponent(p.questId) + '">' + ico('i-refresh', 'ico ico-sm') + 'Újra' + '</a>' +
            '<button class="fk-play-del" type="button" data-del="' + esc(p.id) + '" aria-label="Törlés">' + ico('i-close', 'ico ico-xs') + '</button>' +
          '</div>' +
        '</article>';
      });
      html += '</div>';
    }

    panel.innerHTML = html;
  }

  /* =========================================================
     FÜL: KEDVENCEIM
     ========================================================= */
  function renderKedvencek() {
    var favs = AC.getFavs().filter(function (id) { return window.QUESTS && window.QUESTS[id]; });

    var html = '<header class="fk-head"><h1 class="fk-title">Kedvenceim</h1>' +
      '<p class="fk-sub">A szívvel elmentett küldetéseid. Kattints egy kártyára a részletekért.</p></header>';

    if (!favs.length) {
      html += emptyBox('i-heart', 'Még nincs kedvenc küldetésed.',
        'Böngéssz a küldetések közt, és a szív ikonnal mentsd el, amelyik megtetszik.',
        'index.html#kuldetesek', 'Küldetések böngészése');
      panel.innerHTML = html;
      return;
    }

    html += '<div class="fk-favs">' +
      favs.map(function (id) { return window.questCardHTML(id); }).join('') +
    '</div>';
    panel.innerHTML = html;

    // szívek állapotának szinkronja (a kattintást a globális uq-account handler intézi)
    AC.syncFavs(panel);
  }

  // kedvenc kártya kattintás -> részletoldal (de a szívre kattintást hagyjuk a globális kezelőnek)
  function onPanelClick(e) {
    // Játék törlése (folytatható vagy befejezett rekord)
    var delBtn = e.target.closest ? e.target.closest('[data-del]') : null;
    if (delBtn) {
      var pid = delBtn.getAttribute('data-del');
      if (confirm('Biztosan törlöd ezt a játékot a listádból? Ez nem vonható vissza.')) {
        AC.removePlay(pid);
        // az uq:plays esemény újrarendereli a fület
      }
      return;
    }

    // kedvenc kártya -> részletoldal
    var card = e.target.closest ? e.target.closest('.quest-card') : null;
    if (card) {
      if (e.target.closest('.fav')) return; // a szívet a globális kezelő kezeli
      var qid = card.getAttribute('data-id');
      if (qid) location.href = 'kuldetes.html?id=' + encodeURIComponent(qid);
    }
  }

  // kedvenc kártya billentyűvel (Enter/Space) -> részletoldal
  function onPanelKey(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var card = e.target.closest ? e.target.closest('.quest-card') : null;
    if (!card) return;
    if (e.target.closest('.fav')) return;
    e.preventDefault();
    var qid = card.getAttribute('data-id');
    if (qid) location.href = 'kuldetes.html?id=' + encodeURIComponent(qid);
  }

  /* =========================================================
     FÜL: CSAPATOM
     ========================================================= */
  function renderCsapatom() {
    var prof = AC.getProfile() || {};
    var team = prof.teamName || '';

    var html = '<header class="fk-head"><h1 class="fk-title">Csapatom</h1>' +
      '<p class="fk-sub">Add meg a csapatod nevét — ez jelenik meg a foglalásoknál és a ranglistán.</p></header>';

    html += '<div class="fk-card fk-form-card">' +
      '<form class="fk-form" id="teamForm" novalidate>' +
        '<label class="fk-field-row">' +
          '<span class="fk-label">' + ico('i-shield', 'ico ico-sm') + 'Csapatnév</span>' +
          '<input type="text" name="teamName" maxlength="40" placeholder="Pl. Peak Hunters" value="' + esc(team) + '" autocomplete="off">' +
        '</label>' +
        '<div class="fk-form-foot">' +
          '<button class="btn btn-lime" type="submit">' + ico('i-check', 'ico ico-sm') + 'Mentés</button>' +
          '<span class="fk-msg" id="teamMsg" hidden></span>' +
        '</div>' +
      '</form>' +
    '</div>';

    html += '<div class="fk-card fk-info-card">' +
      '<span class="fk-info-ic">' + ico('i-users', 'ico') + '</span>' +
      '<div><h2 class="fk-info-title">Csapattagok — hamarosan</h2>' +
      '<p>A csapattagok meghívása és a közös eredmények, statisztikák követése egy későbbi frissítésben érkezik. Addig a csapatnevet bármikor módosíthatod itt.</p></div>' +
    '</div>';

    panel.innerHTML = html;

    var form = document.getElementById('teamForm');
    var msg = document.getElementById('teamMsg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = form.teamName.value.trim();
      AC.updateProfile({ teamName: val });
      showMsg(msg, val ? 'Csapatnév elmentve!' : 'Csapatnév törölve.');
    });
  }

  /* =========================================================
     FÜL: ADATAIM
     ========================================================= */
  function renderAdataim() {
    var prof = AC.getProfile() || {};
    var avatars = (AC.AVATARS || []);
    var curAvatar = (prof.avatar == null ? '' : prof.avatar);
    var lang = (prof.lang || 'HU').toUpperCase();

    var html = '<header class="fk-head"><h1 class="fk-title">Adataim</h1>' +
      '<p class="fk-sub">A profilod és az adatkezelési beállításaid.</p></header>';

    /* ---- profil-űrlap ---- */
    html += '<div class="fk-card fk-form-card">';

    // avatar-választó
    html += '<div class="fk-avatar-block">' +
      '<span class="fk-label">Avatar</span>' +
      '<div class="fk-avatars" id="avatarPick">';
    // "kezdőbetű" opció (avatar = '')
    html += '<button type="button" class="fk-avatar fk-avatar-initial' + (curAvatar === '' ? ' is-on' : '') +
      '" data-av="" aria-label="Kezdőbetű avatar" aria-pressed="' + (curAvatar === '' ? 'true' : 'false') + '">' +
      esc(firstName(prof).charAt(0).toUpperCase()) + '</button>';
    // 8 küldetés-hangulatú avatar
    avatars.forEach(function (_, i) {
      var on = String(curAvatar) === String(i);
      html += '<button type="button" class="fk-avatar' + (on ? ' is-on' : '') +
        '" data-av="' + i + '" aria-label="Avatar ' + (i + 1) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
        AC.avatarSVG(i, 'uq-av-ico') + '</button>';
    });
    html += '</div></div>';

    // profil-mezők
    html += '<form class="fk-form" id="profForm" novalidate>' +
      '<label class="fk-field-row">' +
        '<span class="fk-label">' + ico('i-user-circle', 'ico ico-sm') + 'Felhasználónév</span>' +
        '<input type="text" name="name" maxlength="40" value="' + esc(prof.name || '') + '" autocomplete="username" required>' +
      '</label>' +
      '<label class="fk-field-row">' +
        '<span class="fk-label">' + ico('i-mail', 'ico ico-sm') + 'E-mail cím</span>' +
        '<input type="email" name="email" value="' + esc(prof.email || '') + '" readonly class="is-readonly">' +
        '<span class="fk-hint">Módosításhoz írj nekünk.</span>' +
      '</label>' +
      '<label class="fk-field-row">' +
        '<span class="fk-label">' + ico('i-phone', 'ico ico-sm') + 'Telefonszám <em>(nem kötelező)</em></span>' +
        '<input type="tel" name="phone" maxlength="24" placeholder="+36 …" value="' + esc(prof.phone || '') + '" autocomplete="tel">' +
      '</label>' +
      '<div class="fk-field-row">' +
        '<span class="fk-label">' + ico('i-globe', 'ico ico-sm') + 'Preferált nyelv</span>' +
        '<div class="fk-lang" id="langPick" role="radiogroup" aria-label="Preferált nyelv">' +
          langOpt('HU', lang) + langOpt('EN', lang) + langOpt('DE', lang) +
        '</div>' +
      '</div>' +
      '<div class="fk-form-foot">' +
        '<button class="btn btn-lime" type="submit">' + ico('i-check', 'ico ico-sm') + 'Mentés</button>' +
        '<span class="fk-msg" id="profMsg" hidden></span>' +
      '</div>' +
    '</form>';

    html += '</div>'; // .fk-form-card

    /* ---- GDPR-szekció ---- */
    html += '<div class="fk-card fk-gdpr">' +
      '<h2 class="fk-gdpr-title">' + ico('i-shield', 'ico ico-sm') + 'Adatkezelés</h2>' +
      '<p class="fk-gdpr-lead">Letöltheted az összes nálunk tárolt adatod, vagy véglegesen törölheted a fiókod.</p>' +
      '<div class="fk-gdpr-acts">' +
        '<button class="btn btn-ghost" type="button" id="exportBtn">' + ico('i-arrow-right', 'ico ico-sm') + 'Adataim letöltése</button>' +
        '<button class="fk-danger-btn" type="button" id="deleteBtn">' + ico('i-close', 'ico ico-sm') + 'Fiók törlése</button>' +
      '</div>' +
    '</div>';

    panel.innerHTML = html;
    wireAdataim();
  }

  function langOpt(code, cur) {
    var on = code === cur;
    return '<button type="button" class="fk-lang-opt' + (on ? ' is-on' : '') +
      '" data-lang="' + code + '" role="radio" aria-checked="' + (on ? 'true' : 'false') + '">' + code + '</button>';
  }

  function wireAdataim() {
    // avatar-választás: azonnal ment (updateProfile), csak a kijelölést frissítjük re-render nélkül,
    // hogy a beírt (még nem mentett) név/telefon meg ne vesszen.
    var avatarPick = document.getElementById('avatarPick');
    if (avatarPick) {
      avatarPick.addEventListener('click', function (e) {
        var btn = e.target.closest('.fk-avatar');
        if (!btn) return;
        var raw = btn.getAttribute('data-av');
        var val = raw === '' ? '' : parseInt(raw, 10);
        AC.updateProfile({ avatar: val });
        avatarPick.querySelectorAll('.fk-avatar').forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', String(on));
        });
      });
    }

    // nyelv-választó (radiogroup)
    var langPick = document.getElementById('langPick');
    if (langPick) {
      langPick.addEventListener('click', function (e) {
        var btn = e.target.closest('.fk-lang-opt');
        if (!btn) return;
        langPick.querySelectorAll('.fk-lang-opt').forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-checked', String(on));
        });
      });
    }

    // profil mentése
    var form = document.getElementById('profForm');
    var msg = document.getElementById('profMsg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.name.value.trim();
      if (!name) { form.name.focus(); showMsg(msg, 'A felhasználónév nem lehet üres.', true); return; }
      var selLang = langPick ? langPick.querySelector('.fk-lang-opt.is-on') : null;
      AC.updateProfile({
        name: name,
        phone: form.phone.value.trim(),
        lang: selLang ? selLang.getAttribute('data-lang') : 'HU'
      });
      showMsg(msg, 'Adatok elmentve!');
    });

    // adatletöltés (JSON Blob)
    var exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', function () {
      var data = AC.exportData();
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'urban-quest-adataim.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });

    // fiók törlése
    var deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) deleteBtn.addEventListener('click', function () {
      if (confirm('Biztosan törlöd a fiókod? A profil és a kedvencek törlődnek, ez a művelet nem vonható vissza.')) {
        AC.deleteAccount();
        location.href = 'index.html';
      }
    });
  }

  /* =========================================================
     KÖZÖS: üres állapot doboz + sikerüzenet
     ========================================================= */
  function emptyBox(icon, title, text, href, cta) {
    return '<div class="fk-empty">' +
      '<span class="fk-empty-ic">' + ico(icon, 'ico') + '</span>' +
      '<h2 class="fk-empty-title">' + esc(title) + '</h2>' +
      '<p>' + esc(text) + '</p>' +
      '<a class="btn btn-lime" href="' + href + '">' + ico('i-arrow-right', 'ico ico-sm') + esc(cta) + '</a>' +
    '</div>';
  }

  var msgTimer = null;
  function showMsg(el, text, isError) {
    if (!el) return;
    el.textContent = text;
    el.hidden = false;
    el.classList.toggle('is-error', !!isError);
    if (msgTimer) clearTimeout(msgTimer);
    msgTimer = setTimeout(function () { el.hidden = true; }, 3200);
  }

  /* =========================================================
     FÜL-VÁLTÁS (hash-vezérelt)
     ========================================================= */
  var RENDERERS = {
    attekintes: renderAttekintes,
    jatekok: renderJatekok,
    kedvencek: renderKedvencek,
    csapatom: renderCsapatom,
    adataim: renderAdataim
  };

  function currentTab() {
    var h = (location.hash || '').replace('#', '');
    return TABS.indexOf(h) > -1 ? h : 'attekintes';
  }

  function setActiveTab(tab) {
    if (!tabsNav) return;
    tabsNav.querySelectorAll('.fiok-tab').forEach(function (a) {
      var on = a.getAttribute('data-tab') === tab;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function render() {
    var tab = currentTab();
    setActiveTab(tab);
    (RENDERERS[tab] || renderAttekintes)();
  }

  window.addEventListener('hashchange', render);

  // panelen belüli interakciók (delegálva, mert a tartalom cserélődik)
  if (panel) {
    panel.addEventListener('click', onPanelClick);
    panel.addEventListener('keydown', onPanelKey);
  }

  // adatréteg-események: az érintett fület újrarendereljük
  document.addEventListener('uq:plays', function () {
    var t = currentTab();
    if (t === 'jatekok' || t === 'attekintes') render();
  });
  document.addEventListener('uq:favs', function () {
    var t = currentTab();
    if (t === 'kedvencek' || t === 'attekintes') render();
  });

  /* =========================================================
     FEJLÉC INTERAKCIÓK (a többi laphoz igazodva)
     ========================================================= */
  var header = document.getElementById('siteHeader');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-stuck', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  var burger = document.getElementById('burger');
  var nav = document.getElementById('mainNav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }
    });
  }
  var lang = document.getElementById('langPicker');
  if (lang) {
    var btn = lang.querySelector('.lang-btn');
    var cur = lang.querySelector('.lang-current');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = lang.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
    lang.querySelectorAll('[data-lang]').forEach(function (opt) {
      opt.addEventListener('click', function () {
        if (cur) cur.textContent = opt.dataset.lang;
        lang.querySelectorAll('[role="option"]').forEach(function (o) { o.setAttribute('aria-selected', String(o === opt)); });
        lang.classList.remove('is-open');
      });
    });
    document.addEventListener('click', function () { lang.classList.remove('is-open'); });
  }

  /* ---------- indítás ---------- */
  // Ha üres a hash, az #attekintes az alap (a hash-t is beállítjuk, hogy a fül konzisztens legyen).
  if (!location.hash || TABS.indexOf(location.hash.replace('#', '')) < 0) {
    // nem írjuk felül a történelmet fölöslegesen, csak ha tényleg nincs érvényes hash
    if (location.hash !== '#attekintes') {
      history.replaceState(null, '', '#attekintes');
    }
  }
  render();
})();
