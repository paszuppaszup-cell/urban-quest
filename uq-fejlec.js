/* =========================================================
   URBAN QUEST — fejléc-viselkedés (mobil menü + nyelvválasztó)

   MIÉRT LÉTEZIK: a fejléc HTML-je minden oldalon ott van, a hozzá tartozó
   viselkedés viszont NÉGY oldal-szkriptben él, egymásból másolva
   (script.js, kuldetes.js, ranglista.js, fiokom.js). Aki új oldalt csinál
   és ezek közül egyiket sem tölti be — pontosan ez történt a terkep.html,
   gyik.html és adatvedelem.html esetén —, annál a fejléc NÉMÁN halott lesz:

     980 px alatt a .main-nav `visibility: hidden` (styles.css), és csak a
     `.is-open` osztály hozza vissza. Ha a burgerre nincs kezelő, telefonon
     a teljes felső navigáció elérhetetlen. Mérve: a három új oldalon a
     kattintás után az is-open osztály nem került fel.

   HASZNÁLAT: csak olyan oldalon töltsd be, amelyik a fenti négy szkript
   EGYIKÉT SEM tölti — különben a burger kétszer billenne, azaz azonnal
   vissza is csukódna. A négy régi szkriptből ez a rész később kiemelhető
   ide; addig a `window.UQFejlecKotve` jelzi, hogy ez a modul már dolgozott.
   ========================================================= */
(function () {
  'use strict';

  if (window.UQFejlecKotve) return;

  function indul() {
    /* --- mobil menü --- */
    var burger = document.getElementById('burger');
    var nav = document.getElementById('mainNav');
    if (burger && nav) {
      burger.addEventListener('click', function () {
        var nyitva = nav.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', String(nyitva));
      });
      /* Linkre kattintva záruljon: ugyanazon az oldalon belüli horgonynál
         a menü egyébként nyitva maradna a cél fölött. */
      nav.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') {
          nav.classList.remove('is-open');
          burger.setAttribute('aria-expanded', 'false');
        }
      });
    }

    /* --- nyelvválasztó ---
       Csak a lenyílót és a címkét kezeli. A tényleges fordítást az
       uq-i18n.js végzi, ami a saját eseményére figyel — ezért ez a modul
       önmagában NEM elég a fordításhoz, a szótárat is be kell tölteni. */
    var lang = document.getElementById('langPicker');
    if (lang) {
      var gomb = lang.querySelector('.lang-btn');
      var most = lang.querySelector('.lang-current');
      if (gomb) {
        gomb.addEventListener('click', function (e) {
          e.stopPropagation();
          var nyitva = lang.classList.toggle('is-open');
          gomb.setAttribute('aria-expanded', String(nyitva));
        });
      }
      lang.querySelectorAll('[data-lang]').forEach(function (opt) {
        opt.addEventListener('click', function () {
          if (most) most.textContent = opt.dataset.lang;
          lang.querySelectorAll('[role="option"]').forEach(function (o) {
            o.setAttribute('aria-selected', String(o === opt));
          });
          lang.classList.remove('is-open');
        });
      });
      document.addEventListener('click', function () { lang.classList.remove('is-open'); });
    }

    window.UQFejlecKotve = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', indul);
  } else {
    indul();
  }
})();
