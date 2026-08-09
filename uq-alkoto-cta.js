/* =========================================================
   URBAN QUEST — az alkotói tölcsér mérése

   A kampány ajánlata „írd meg a saját városi kalandod". Enélkül a mérés nélkül
   nem tudnánk megkülönböztetni azt a két nagyon eltérő kudarcot, hogy

     (a) senkit nem érdekel   → 0 kattintás, vagy
     (b) érdekli, de elakad   → sok kattintás, 0 beadott pálya.

   Csak KATTINTÁST mérünk, semmi mást: melyik gomb, melyik oldalról. A mérés
   elmaradhat (letiltott mérés, admin, fejlesztői gép) — a látogató útja nem.
   ========================================================= */
(function () {
  'use strict';

  function jelol(el) {
    var honnan = el.getAttribute('data-alkoto-cta') || 'ismeretlen';
    try {
      if (window.UQTrack && UQTrack.esemeny) {
        UQTrack.esemeny('alkoto_erdeklodes', honnan, { cel: el.getAttribute('href') || '' });
      }
    } catch (e) { /* a mérés sosem áll az útba */ }
  }

  /* Delegálva: a nyitólapi blokk és az Alkotóknak oldal gombjai is ide futnak,
     és a később beszúrt gomb is működni fog. */
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-alkoto-cta]') : null;
    if (el) jelol(el);
  }, true);
})();
