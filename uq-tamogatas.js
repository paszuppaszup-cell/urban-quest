/* =========================================================
   URBAN QUEST — a platform Patreon-gombja

   A cím az app_settings-ben él, admin felületről állítható. Az app_settings
   viszont CSAK adminnak olvasható, ezért a publikus oldal a szűk
   `v_public_settings` nézetből olvassa, ami semmi mást nem ad ki.

   Amíg nincs cím, a gomb NEM jelenik meg — helyette az őszinte változat
   marad látható. Egy „Támogass!" gomb, ami sehova nem visz, többet árt,
   mint amennyit használ.
   ========================================================= */
(function () {
  'use strict';

  var DOBOZ = 'patreonDoboz';     // a gombot tartalmazó blokk
  var VAR   = 'patreonVar';       // az „még készül" szöveg

  function mutat(url) {
    var doboz = document.getElementById(DOBOZ);
    var varo  = document.getElementById(VAR);
    if (!doboz) return;

    if (!url) {
      /* Nincs cím: a gomb marad rejtve, a magyarázat látszik. */
      doboz.hidden = true;
      if (varo) varo.hidden = false;
      return;
    }

    var a = doboz.querySelector('a');
    if (a) a.setAttribute('href', url);
    doboz.hidden = false;
    if (varo) varo.hidden = true;

    /* Mérés: a ROADMAP tölcsére a Patreon-kattintásig tart. Külön címkével,
       hogy a platform és az alkotói kattintás szétválasztható legyen. */
    if (a) a.addEventListener('click', function () {
      try { if (window.UQTrack) UQTrack.esemeny('patreon_kattintas', 'platform'); } catch (e) {}
    });
  }

  function betolt() {
    if (!window.UQAPI || !UQAPI.rest) { mutat(''); return; }
    UQAPI.rest('/v_public_settings?select=patreon_url&limit=1', { anon: true })
      .then(function (sor) { mutat((sor && sor[0] && sor[0].patreon_url) || ''); })
      .catch(function () {
        /* Hálózati hiba: inkább ne mutassunk gombot, mint hogy egy törött
           linkre küldjük a támogatni akaró embert. */
        mutat('');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', betolt);
  } else {
    betolt();
  }
})();
