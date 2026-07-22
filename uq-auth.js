/* =========================================================
   URBAN QUEST — demó fiók-állapot + regisztrációs modal
   Publikus API: window.UQAuth
     .getUser()            -> {name, email, since} | null
     .setUser(u)           -> elmenti (uq_user_v1)
     .clearUser()          -> kijelentkezés
     .isRegistered()       -> boolean
     .openRegister(opts)   -> modal megnyitása; opts.onDone(user)
     .mountHeader()        -> fejléc: Belépés/Regisztráció <-> név + Kijelentkezés
   ========================================================= */
(function () {
  'use strict';

  /* A fiók mostantól VALÓDI: Supabase Auth a uq-api.js-en keresztül.
     Korábban bármilyen e-mail + bármilyen nem üres jelszó „sikeres"
     belépés volt, és a jelszó sehol nem tárolódott.

     A publikus API alakja szándékosan változatlan, hogy a többi oldal
     (fiokom.js, kuldetes.js, jatszas.js, ranglista.js) ne törjön el. */

  function getUser() {
    if (!window.UQAPI) return null;
    var u = UQAPI.user();
    if (!u || !u.email) return null;
    var meta = u.user_metadata || {};
    return {
      id: u.id,
      name: meta.display_name || String(u.email).split('@')[0],
      email: u.email,
      avatar: (meta.avatar === undefined ? '' : meta.avatar),
      teamName: meta.team_name || '',
      phone: meta.phone || '',
      lang: meta.lang || 'hu',
      since: u.created_at || ''
    };
  }

  /* Profilmódosítás. Régen ez volt a „bejelentkezés" is — ma a belépés a
     signIn/signUp dolga, ez már csak a felhasználó saját adatait írja.
     A megjelenítendő nevet a profiles táblába is átvezetjük, mert a
     ranglista onnan olvas. */
  function setUser(u) {
    if (!u || !window.UQAPI || !UQAPI.user()) return Promise.resolve(null);
    var meta = {};
    ['name', 'avatar', 'teamName', 'phone', 'lang'].forEach(function (k) {
      if (u[k] !== undefined) meta[k === 'name' ? 'display_name' : (k === 'teamName' ? 'team_name' : k)] = u[k];
    });

    return UQAPI.rest('/profiles?user_id=eq.' + UQAPI.user().id, {
      method: 'PATCH',
      body: { display_name: u.name, avatar: (u.avatar === '' ? null : u.avatar) },
      prefer: 'return=minimal'
    }).catch(function () { /* a profil frissítése ne blokkolja a felületet */ })
      .then(function () {
        // a helyi munkamenet metaadata is kövesse, hogy azonnal látszódjon
        var s = UQAPI.session();
        if (s && s.user) {
          s.user.user_metadata = Object.assign({}, s.user.user_metadata || {}, meta);
        }
        document.dispatchEvent(new CustomEvent('uq:auth', { detail: getUser() }));
        mountHeader();
        return getUser();
      });
  }

  function clearUser() {
    if (!window.UQAPI) return Promise.resolve();
    return UQAPI.signOut().then(function () { mountHeader(); });
  }

  function isRegistered() { return !!getUser(); }

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  /* ---------- ikonok (önálló, nem a lap sprite-jából) ---------- */
  var ICO = {
    user: '<circle cx="12" cy="8" r="4"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 5.5L20 7"/>',
    lock: '<rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.2"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12 4.5 4.5L19 7"/>',
    heart: '<path d="M12 20s-7-4.6-7-9.3A4 4 0 0 1 12 7a4 4 0 0 1 7 3.7C19 15.4 12 20 12 20z"/>',
    logout: '<path d="M9 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/><path d="m14 17 5-5-5-5"/><path d="M19 12H9"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    ticket: '<path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12"/>'
  };
  function svg(id, cls) {
    return '<svg class="' + (cls || 'uq-ma-ico') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICO[id] + '</svg>';
  }

  /* ---------- modal ---------- */
  var overlay = null, lastFocus = null, doneCb = null;

  function closeModal() {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    document.body.classList.remove('uq-ma-lock');
    var el = overlay;
    setTimeout(function () { if (el && el.parentNode) el.parentNode.removeChild(el); }, 180);
    overlay = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function openRegister(opts) {
    opts = opts || {};
    if (overlay) return;
    lastFocus = document.activeElement;
    doneCb = opts.onDone || null;

    var title = opts.title || 'Gyere, próbáld ki!';
    var sub = opts.sub || 'Egy perc az egész — utána már foglalhatod is a küldetést.';

    overlay = document.createElement('div');
    overlay.className = 'uq-ma-overlay';
    overlay.innerHTML =
      '<div class="uq-ma" role="dialog" aria-modal="true" aria-labelledby="uqMaTitle">' +
        '<button class="uq-ma-x" type="button" aria-label="Bezárás">' + svg('close', 'uq-ma-ico uq-ma-ico-sm') + '</button>' +
        '<span class="uq-ma-eyebrow">' + svg('heart', 'uq-ma-ico uq-ma-ico-xs') + 'Még nincs fiókod</span>' +
        '<h2 class="uq-ma-title" id="uqMaTitle">' + esc(title) + '</h2>' +
        '<p class="uq-ma-sub">' + esc(sub) + '</p>' +
        '<form class="uq-ma-form" novalidate>' +
          '<label class="uq-ma-field">' + svg('user') +
            '<input type="text" name="name" placeholder="Felhasználónév" autocomplete="username" required>' +
          '</label>' +
          '<label class="uq-ma-field">' + svg('mail') +
            '<input type="email" name="email" placeholder="E-mail cím" autocomplete="email" required>' +
          '</label>' +
          '<label class="uq-ma-field">' + svg('lock') +
            '<input type="password" name="password" placeholder="Jelszó (min. 8 karakter)" autocomplete="new-password" required>' +
          '</label>' +
          '<p class="uq-ma-err" hidden></p>' +
          '<button class="uq-ma-submit" type="submit">Regisztrálok és indulhat!</button>' +
        '</form>' +
        '<p class="uq-ma-switch">Már van fiókod?<a href="bejelentkezes.html">Bejelentkezés</a></p>' +
        '<p class="uq-ma-legal">A regisztrációval elfogadod az <a href="regisztracio.html#aszf">ÁSZF</a>-et és az <a href="regisztracio.html#adatvedelem">Adatvédelmi Szabályzatot</a>.</p>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.classList.add('uq-ma-lock');
    // rAF-et a böngésző elfojtja, ha a lap nem látszik → időzítő is biztosítja a megjelenést
    var reveal = function () { if (overlay) overlay.classList.add('is-open'); };
    requestAnimationFrame(reveal);
    setTimeout(reveal, 60);

    var form = overlay.querySelector('.uq-ma-form');
    var err = overlay.querySelector('.uq-ma-err');
    var first = overlay.querySelector('input[name="name"]');
    if (first) first.focus();

    overlay.querySelector('.uq-ma-x').addEventListener('click', closeModal);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', onKey);

    overlay.querySelectorAll('.uq-ma-field input').forEach(function (inp) {
      inp.addEventListener('input', function () {
        inp.closest('.uq-ma-field').classList.remove('is-error');
        err.hidden = true;
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.name.value.trim();
      var email = form.email.value.trim();
      var pwd = form.password.value;
      var bad = [];
      if (!name) bad.push('name');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) bad.push('email');
      if (pwd.length < 8) bad.push('password');

      form.querySelectorAll('.uq-ma-field').forEach(function (f) { f.classList.remove('is-error'); });
      if (bad.length) {
        bad.forEach(function (n) { form[n].closest('.uq-ma-field').classList.add('is-error'); });
        err.textContent = bad.indexOf('password') > -1 && bad.length === 1
          ? 'A jelszó legyen legalább 8 karakter.'
          : 'Töltsd ki a pirossal jelölt mezőket helyesen.';
        err.hidden = false;
        form[bad[0]].focus();
        return;
      }

      var btn = form.querySelector('.uq-ma-submit');
      var eredetiFelirat = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Egy pillanat…';

      if (!window.UQAPI) {
        err.textContent = 'A regisztráció most nem elérhető.';
        err.hidden = false;
        btn.disabled = false; btn.textContent = eredetiFelirat;
        return;
      }

      UQAPI.signUp(email, pwd, { display_name: name })
        .then(function (user) {
          if (!user) throw new Error('A regisztráció nem hozott létre munkamenetet.');
          btn.innerHTML = svg('check', 'uq-ma-ico uq-ma-ico-sm') + 'Sikeres regisztráció!';
          btn.classList.add('is-done');
          mountHeader();
          setTimeout(function () {
            var cb = doneCb;
            closeModal();
            if (cb) cb(getUser());
          }, 800);
        })
        .catch(function (e) {
          var m = String(e && e.message || '');
          // A Supabase angolul válaszol; a gyakori eseteket magyarul mondjuk el.
          if (/already registered|already exists/i.test(m)) {
            m = 'Ezzel az e-mail címmel már van fiók. Jelentkezz be helyette.';
          } else if (/password/i.test(m) && /short|least/i.test(m)) {
            m = 'A jelszó túl rövid.';
          } else if (/invalid/i.test(m) && /email/i.test(m)) {
            m = 'Ez az e-mail cím nem érvényes.';
          } else if (!UQAPI.online()) {
            m = 'Nincs internetkapcsolat. Próbáld újra, ha van jel.';
          }
          err.textContent = m || 'A regisztráció nem sikerült.';
          err.hidden = false;
          btn.disabled = false;
          btn.textContent = eredetiFelirat;
        });
    });
  }

  function onKey(e) {
    if (!overlay) { document.removeEventListener('keydown', onKey); return; }
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key !== 'Tab') return;
    var f = overlay.querySelectorAll('button, input, a[href]');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- fejléc: bejelentkezett állapot ---------- */
  function mountHeader() {
    var actions = document.querySelector('.header-actions');
    if (!actions) return;
    var u = getUser();
    mountMobileNav(u);

    var login = actions.querySelector('.login');
    var reg = actions.querySelector('a.btn-lime[href="regisztracio.html"]');
    var chip = actions.querySelector('.uq-userchip');

    if (u) {
      if (login) login.hidden = true;
      if (reg) reg.hidden = true;
      if (!chip) {
        chip = document.createElement('div');
        chip.className = 'uq-userchip';
        actions.appendChild(chip);
      }
      chip.hidden = false;
      var av = avatarHTML(u);
      chip.innerHTML =
        '<button class="uq-userchip-btn" type="button" aria-haspopup="menu" aria-expanded="false">' +
          '<span class="uq-userchip-av">' + av + '</span>' +
          '<span class="uq-userchip-name">' + esc(displayName(u)) + '</span>' +
          svg('chev', 'uq-ma-ico uq-ma-ico-xs uq-userchip-chev') +
        '</button>' +
        '<div class="uq-usermenu" role="menu" hidden>' +
          '<div class="uq-usermenu-head">' +
            '<span class="uq-userchip-av lg">' + av + '</span>' +
            '<span class="uq-usermenu-id"><strong>' + esc(displayName(u)) + '</strong><span>' + esc(u.email || '') + '</span></span>' +
          '</div>' +
          '<a class="uq-usermenu-item" role="menuitem" href="fiokom.html">' + svg('user', 'uq-ma-ico uq-ma-ico-sm') + 'Fiókom</a>' +
          '<a class="uq-usermenu-item" role="menuitem" href="fiokom.html#jatekok">' + svg('ticket', 'uq-ma-ico uq-ma-ico-sm') + 'Játékaim</a>' +
          '<a class="uq-usermenu-item" role="menuitem" href="fiokom.html#kedvencek">' + svg('heart', 'uq-ma-ico uq-ma-ico-sm') + 'Kedvenceim</a>' +
          '<button class="uq-usermenu-item uq-usermenu-out" role="menuitem" type="button">' + svg('logout', 'uq-ma-ico uq-ma-ico-sm') + 'Kijelentkezés</button>' +
        '</div>';
      wireUserMenu(chip);
    } else {
      if (login) login.hidden = false;
      if (reg) reg.hidden = false;
      if (chip) chip.hidden = true;
    }
  }

  function displayName(u) {
    if (u.name && u.name.indexOf('@') < 0) return u.name;
    var base = (u.name || u.email || '').split('@')[0];
    return base || 'Fiókom';
  }
  function avatarHTML(u) {
    if (u.avatar != null && u.avatar !== '' && window.UQAccount && window.UQAccount.avatarSVG) {
      return window.UQAccount.avatarSVG(u.avatar, 'uq-ma-ico uq-ma-ico-sm');
    }
    return esc(displayName(u).charAt(0).toUpperCase());
  }
  function wireUserMenu(chip) {
    var btn = chip.querySelector('.uq-userchip-btn');
    var menu = chip.querySelector('.uq-usermenu');
    if (!btn || !menu) return;
    var openMenu = function (open) {
      menu.hidden = !open;
      chip.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    };
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      openMenu(menu.hidden);
    });
    document.addEventListener('click', function (e) {
      if (!chip.contains(e.target)) openMenu(false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') openMenu(false); });
    var out = chip.querySelector('.uq-usermenu-out');
    // a kijelentkezés hálózati művelet: előbb fejezze be, csak utána navigáljunk
    if (out) out.addEventListener('click', function () {
      Promise.resolve(clearUser()).then(function () { location.href = 'index.html'; });
    });
  }

  /* mobil menü: Belépés/Regisztráció helyett Kijelentkezés */
  function mountMobileNav(u) {
    var nav = document.querySelector('.main-nav');
    if (!nav) return;
    nav.querySelectorAll('.nav-mobile-only').forEach(function (a) {
      if (a.classList.contains('uq-nav-out')) return;
      a.hidden = !!u;
    });
    var out = nav.querySelector('.uq-nav-out');
    if (u) {
      if (!out) {
        out = document.createElement('a');
        out.className = 'nav-mobile-only uq-nav-out';
        out.href = '#';
        out.addEventListener('click', function (e) {
          e.preventDefault();
          Promise.resolve(clearUser()).then(function () { location.reload(); });
        });
        nav.appendChild(out);
      }
      out.hidden = false;
      out.textContent = 'Kijelentkezés (' + (u.name || '') + ')';
    } else if (out) {
      out.hidden = true;
    }
  }

  window.UQAuth = {
    getUser: getUser,
    setUser: setUser,
    clearUser: clearUser,
    isRegistered: isRegistered,
    openRegister: openRegister,
    closeModal: closeModal,
    mountHeader: mountHeader
  };

  // A munkamenet a uq-api.js-ben él (token-frissítés, lejárat), a fejléc
  // pedig kövesse minden változását — nem csak a saját hívásainkat.
  if (window.UQAPI) UQAPI.onAuth(function () { mountHeader(); });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountHeader);
  } else {
    mountHeader();
  }
})();
