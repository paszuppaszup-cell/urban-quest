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

  /* űrlap beküldés (demo: nincs backend) */
  document.querySelectorAll('.auth-form').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (!btn || btn.dataset.busy) return;

      // egyszerű üresség-ellenőrzés
      let ok = true;
      form.querySelectorAll('input[required]').forEach((inp) => {
        const field = inp.closest('.field');
        if (!inp.value.trim()) { ok = false; field && field.classList.add('is-error'); }
        else field && field.classList.remove('is-error');
      });
      if (!ok) return;

      const original = btn.innerHTML;
      btn.dataset.busy = '1';
      btn.innerHTML = 'Egy pillanat…';
      setTimeout(() => {
        btn.innerHTML = 'Sikeres ✓';
        saveUser(form);
        setTimeout(() => {
          // vissza oda, ahonnan jött (?next=…), különben a főoldalra
          const next = new URLSearchParams(location.search).get('next');
          location.href = next && /^[\w.\-]+\.html(\?[^#]*)?$/.test(next) ? next : 'index.html';
        }, 900);
      }, 700);
    });
  });

  /* demó fiók mentése (uq_user_v1) — regisztráció és bejelentkezés után is */
  function saveUser(form) {
    if (!window.UQAuth) return;
    const val = (n) => (form[n] && form[n].value ? form[n].value.trim() : '');
    const email = val('email');
    if (!email) return;
    const name = val('username') || (window.UQAuth.getUser() || {}).name || email.split('@')[0];
    window.UQAuth.setUser({ name, email, since: new Date().toISOString() });
  }

  /* hibajelzés törlése gépeléskor */
  document.querySelectorAll('.field input').forEach((inp) => {
    inp.addEventListener('input', () => {
      const field = inp.closest('.field');
      field && field.classList.remove('is-error');
    });
  });
})();
