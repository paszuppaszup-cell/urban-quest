/* =========================================================
   URBAN QUEST — KÖZÖS ADMIN FEJLÉC

   Mind a 14 admin oldal fejlécében egy beégetett név állt („Szabó Tamás /
   Adminisztrátor"), függetlenül attól, ki — és hogy egyáltalán bárki —
   be van-e jelentkezve. A Fiók menü három pontja pedig csak üzenetet
   villantott: a Kijelentkezés is. Közös gépen ez nem kozmetikai hiba,
   mert a munkamenet a „kijelentkezés" után is él.

   Ez a modul minden admin oldalon a VALÓDI munkamenetből tölti fel a
   fejlécet, és a menüpontokat valódi műveletekre köti. Egy helyen, mert
   14 külön másolatból mindig marad egy, ami lemarad.

   Feltétel: az oldal betöltötte az uq-api.js-t. Ha nem, a modul nem tesz
   úgy, mintha működne — láthatóan jelzi, hogy nincs adatkapcsolat.
   ========================================================= */
(function () {
  'use strict';

  var BELEP = 'bejelentkezes.html';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function toast(msg, opts) {
    if (window.UQ && window.UQ.toast) window.UQ.toast(msg, opts);
  }

  /* Az aktuális oldal, hogy bejelentkezés után ide térjünk vissza. */
  function ideVissza() {
    return location.pathname.split('/').pop() + location.search;
  }

  /* ---------------------------------------------------------
     Ki van bejelentkezve?
     --------------------------------------------------------- */

  function nev(u) {
    var meta = (u && u.user_metadata) || {};
    return meta.display_name || (u && u.email ? String(u.email).split('@')[0] : '');
  }

  /* ---------------------------------------------------------
     Fejléc-fiókgomb
     --------------------------------------------------------- */

  function fejlecFrissit(u, admin) {
    document.querySelectorAll('.adm-user-text').forEach(function (el) {
      var b = el.querySelector('b');
      var s = el.querySelector('span');
      if (!b || !s) return;
      if (!u) {
        b.textContent = 'Nincs bejelentkezve';
        s.textContent = 'Kattints a belépéshez';
      } else {
        b.textContent = nev(u) || u.email || 'Ismeretlen';
        s.textContent = admin ? 'Adminisztrátor' : 'Nincs admin jogosultság';
      }
      el.setAttribute('title', u ? (u.email || '') : '');
    });

    /* A menü tartalma is állapotfüggő: kijelentkezve nincs mit kijelentkezni. */
    document.querySelectorAll('[data-user="logout"]').forEach(function (b) {
      b.hidden = !u;
      var sep = b.previousElementSibling;
      if (sep && sep.classList.contains('uq-dd-sep')) sep.hidden = !u;
    });
    document.querySelectorAll('[data-user="login"]').forEach(function (b) { b.hidden = !!u; });
  }

  /* Ha nincs bejelentkezve, a menübe be kell kerülnie egy Bejelentkezés
     pontnak — különben a fiókgomb egy zsákutca. */
  function belepPontBeszur() {
    document.querySelectorAll('.uq-dd-menu').forEach(function (menu) {
      if (!menu.querySelector('[data-user]')) return;          // nem a fiók-menü
      if (menu.querySelector('[data-user="login"]')) return;   // már megvan
      var a = document.createElement('a');
      a.className = 'uq-dd-item';
      a.setAttribute('data-user', 'login');
      a.href = BELEP + '?next=' + encodeURIComponent(ideVissza());
      a.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#a-logout"/></svg>Bejelentkezés';
      menu.appendChild(a);
    });
  }

  /* ---------------------------------------------------------
     Oldalsáv: rendszerállapot

     Eddig minden oldalon, minden körülmények között „Minden rendben"
     volt kiírva — kijelentkezve, hálózat nélkül is. Most azt mutatja,
     ami tényleg igaz.
     --------------------------------------------------------- */

  function allapot(szoveg, mod) {
    document.querySelectorAll('.adm-sysstat-ok').forEach(function (el) {
      el.classList.remove('is-warn', 'is-off');
      if (mod) el.classList.add(mod);
      var sp = el.querySelector('span:not(.dot)');
      if (sp) sp.textContent = szoveg;
      el.setAttribute('title', szoveg);
    });
  }

  function allapotFrissit(u, admin) {
    if (!window.UQAPI) { allapot('Nincs adatkapcsolat', 'is-off'); return; }
    if (!u) { allapot('Nincs bejelentkezve', 'is-off'); return; }
    if (!UQAPI.online()) { allapot('Nincs kapcsolat', 'is-warn'); return; }
    if (!admin) { allapot('Nincs admin jogosultság', 'is-warn'); return; }
    allapot('Bejelentkezve', null);
  }

  /* ---------------------------------------------------------
     Menüpontok
     --------------------------------------------------------- */

  function kijelentkezes() {
    if (!window.UQAPI) { location.href = BELEP; return; }
    UQAPI.signOut()
      .catch(function () { /* a helyi munkamenet ettől még megszűnt */ })
      .then(function () { location.href = BELEP; });
  }

  function menuBekot() {
    document.querySelectorAll('[data-user]').forEach(function (b) {
      if (b.dataset.uqFejlec) return;
      b.dataset.uqFejlec = '1';
      var a = b.dataset.user;
      if (a === 'login') return;                    // sima hivatkozás
      b.addEventListener('click', function (e) {
        e.preventDefault();
        if (a === 'profile') location.href = 'fiokom.html';
        else if (a === 'settings') location.href = 'beallitasok.html';
        else if (a === 'logout') kijelentkezes();
      });
    });
  }

  /* ---------------------------------------------------------
     indítás
     --------------------------------------------------------- */

  function frissit() {
    var u = window.UQAPI ? UQAPI.user() : null;
    if (!u) { fejlecFrissit(null, false); allapotFrissit(null, false); return; }
    /* A jogosultságot a szerver mondja meg; addig ne állítsunk semmit. */
    UQAPI.isAdmin().then(function (admin) {
      fejlecFrissit(u, admin);
      allapotFrissit(u, admin);
    });
  }

  function indul() {
    belepPontBeszur();
    menuBekot();
    frissit();
    if (window.UQAPI) UQAPI.onAuth(function () { frissit(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', indul);
  else indul();

  window.UQAdminFejlec = { frissit: frissit, kijelentkezes: kijelentkezes, esc: esc, toast: toast };
})();
