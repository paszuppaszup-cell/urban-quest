/* =========================================================
   URBAN QUEST — bejelentkezés / regisztráció interakciók
   ========================================================= */
(function () {
  'use strict';

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  /* már be vagy jelentkezve? — ne fusson zsákutcába, kínáljuk a Fiókomat */
  (function () {
    var me = (window.UQAuth && window.UQAuth.getUser) ? window.UQAuth.getUser() : null;
    if (!me) return;
    var name = (me.name && me.name.indexOf('@') < 0) ? me.name : (me.email || 'kalandor').split('@')[0];
    document.querySelectorAll('.auth-card').forEach(function (card) {
      var b = document.createElement('div');
      b.className = 'uq-already';
      b.innerHTML =
        '<p>Már be vagy jelentkezve, <strong>' + esc(name) + '</strong>.</p>' +
        '<div class="uq-already-acts">' +
          '<a class="btn btn-lime btn-block" href="fiokom.html">Tovább a Fiókomhoz</a>' +
          '<button type="button" class="uq-already-other">Másik fiókkal lépnék be</button>' +
        '</div>';
      card.insertBefore(b, card.firstChild);
      b.querySelector('.uq-already-other').addEventListener('click', function () {
        if (window.UQAuth) window.UQAuth.clearUser();
        document.querySelectorAll('.uq-already').forEach(function (x) { x.parentNode.removeChild(x); });
      });
    });
  })();

  /* jelszó mutatása / elrejtése */
  document.querySelectorAll('.eye').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.querySelector('use').setAttribute('href', show ? '#i-eye-off' : '#i-eye');
      btn.setAttribute('aria-label', show ? 'Jelszó elrejtése' : 'Jelszó megjelenítése');
    });
  });

  /* Hibaüzenet-hely: az űrlapokon nincs ilyen elem, menet közben tesszük be. */
  function hibaMezo(form) {
    let el = form.querySelector('.auth-err');
    if (!el) {
      el = document.createElement('p');
      el.className = 'auth-err';
      el.setAttribute('role', 'alert');
      el.hidden = true;
      const btn = form.querySelector('button[type="submit"]');
      form.insertBefore(el, btn || null);
    }
    return el;
  }

  /* A Supabase angolul válaszol — a gyakori eseteket magyarul mondjuk el. */
  function magyarHiba(e, belepes) {
    const m = String((e && e.message) || '');
    if (/invalid login credentials/i.test(m)) return 'Hibás e-mail cím vagy jelszó.';
    if (/already registered|already exists/i.test(m)) return 'Ezzel az e-mail címmel már van fiók. Jelentkezz be helyette.';
    if (/email.*not confirmed/i.test(m)) return 'A fiók még nincs megerősítve.';
    if (/password/i.test(m) && /short|least|6/i.test(m)) return 'A jelszó túl rövid — legalább 6 karakter kell.';
    if (/invalid/i.test(m) && /email/i.test(m)) return 'Ez az e-mail cím nem érvényes.';
    if (window.UQAPI && !window.UQAPI.online()) return 'Nincs internetkapcsolat. Próbáld újra, ha van jel.';
    return m || (belepes ? 'A bejelentkezés nem sikerült.' : 'A regisztráció nem sikerült.');
  }

  /* VALÓDI bejelentkezés és regisztráció. Korábban ez setTimeout-tal
     utánozta a sikert, és bármilyen jelszót elfogadott. */
  document.querySelectorAll('.auth-form').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (!btn || btn.dataset.busy) return;
      const err = hibaMezo(form);
      err.hidden = true;

      let ok = true;
      form.querySelectorAll('input[required]').forEach((inp) => {
        const field = inp.closest('.field');
        if (!inp.value.trim()) { ok = false; field && field.classList.add('is-error'); }
        else field && field.classList.remove('is-error');
      });
      if (!ok) return;

      const val = (n) => (form[n] && form[n].value ? form[n].value.trim() : '');
      const email = val('email');
      const pwd = form.password ? form.password.value : '';
      // A regisztrációs űrlapon van felhasználónév mező, a belépésin nincs.
      const regisztracio = !!form.username;

      if (!window.UQAPI) {
        err.textContent = 'A szolgáltatás most nem elérhető.';
        err.hidden = false;
        return;
      }

      const original = btn.innerHTML;
      btn.dataset.busy = '1';
      btn.innerHTML = 'Egy pillanat…';

      const muvelet = regisztracio
        ? UQAPI.signUp(email, pwd, { display_name: val('username') || email.split('@')[0] })
        : UQAPI.signIn(email, pwd);

      muvelet
        .then(() => {
          btn.innerHTML = 'Sikeres ✓';
          setTimeout(() => {
            // vissza oda, ahonnan jött (?next=…), különben a főoldalra
            const next = new URLSearchParams(location.search).get('next');
            location.href = next && /^[\w.\-]+\.html(\?[^#]*)?$/.test(next) ? next : 'index.html';
          }, 700);
        })
        .catch((ex) => {
          err.textContent = magyarHiba(ex, !regisztracio);
          err.hidden = false;
          delete btn.dataset.busy;
          btn.innerHTML = original;
          const first = form.querySelector('input[name="password"]') || form.querySelector('input');
          if (first) first.focus();
        });
    });
  });

  /* hibajelzés törlése gépeléskor */
  document.querySelectorAll('.field input').forEach((inp) => {
    inp.addEventListener('input', () => {
      const field = inp.closest('.field');
      field && field.classList.remove('is-error');
    });
  });
})();
