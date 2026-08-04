/* =========================================================
   URBAN QUEST — a főoldali blog-blokk elrejtése bejelentkezés után

   MIÉRT ÍGY: a blokk a HTML-ben alapból LÁTHATÓ, és ez a modul rejti el a
   bejelentkezett látogató elől — nem fordítva.

   Ha alapból rejtett lenne, és JavaScript mutatná meg, akkor a keresőrobotok
   és a megosztás-előnézetek nem látnák — pedig épp nekik szól: a blog
   feladata, hogy keresésből hozzon új embert. A robot sosem jelentkezik be,
   tehát számára a blokk mindig ott van.

   A bejelentkezett játékos viszont nem marketinget keres, hanem a
   küldetéseit. Neki a blokk csak zaj — a blog a menüből továbbra is elérhető.
   ========================================================= */
(function () {
  'use strict';

  function blokk() { return document.getElementById('fooldalBlog'); }

  function bejelentkezve() {
    /* Két forrás, mert a betöltés sorrendje oldalanként eltér: az UQAuth a
       felhasználói réteg, az UQAPI a nyers munkamenet. Elég, ha bármelyik
       tud a belépésről. */
    try {
      if (window.UQAuth && UQAuth.isRegistered && UQAuth.isRegistered()) return true;
      if (window.UQAPI && UQAPI.user && UQAPI.user()) return true;
    } catch (e) { /* hibás állapotnál inkább mutassuk a blokkot */ }
    return false;
  }

  function frissit() {
    var b = blokk();
    if (!b) return;
    b.hidden = bejelentkezve();
  }

  /* Az auth állapota később is változhat: belépés, kilépés, token-frissítés.
     Mindháromra ugyanaz az esemény jön. */
  document.addEventListener('uq:auth', frissit);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', frissit);
  } else {
    frissit();
  }
})();
