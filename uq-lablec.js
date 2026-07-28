/* =========================================================
   URBAN QUEST — lábléc (egy helyen leírva)

   Miért modul: a lábléc eddig KÉT oldalon élt, egymásból másolva — és
   már el is tért egymástól (a küldetésoldalon abszolút, a főoldalon
   relatív hivatkozásokkal). Öt helyre bemásolva öt helyen kellene
   javítani. Innentől egy forrás van, és minden oldal ugyanazt kapja.

   Amit szándékosan NEM tartalmaz:
     - Csapatunk / Karrier / Partnereink — nincs mögöttük tartalom, és
       kitalálni nem fogunk csapattagokat vagy álláshirdetést. A helyükre
       a ténylegesen működő oldalak kerültek.
     - Közösségi ikonok — még nincsenek fiókok. Egy sehova nem vezető
       ikon rosszabb, mint a hiánya: azt sugallja, elhanyagolt az oldal.
     - ÁSZF — az valódi jogi dokumentum, a vállalkozás saját feltételeivel.
       Amíg minden küldetés ingyenes, nincs mihez kötni; amint fizetős
       pálya indul, ez a link kell.

   Az évszám futásidőben áll be. A korábbi lábléc „© 2024"-et írt 2026-ban.
   ========================================================= */
(function () {
  'use strict';

  /* Az ikonok a lap saját sprite-jából jönnek; ha hiányoznának, a modul
     pótolja őket — ugyanaz a megoldás, mint az alsó sávnál. */
  var IKON_RAJZ = {
    'i-mail': '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 5.5L20 7"/>',
    'i-phone': '<path d="M7 3.5H5.2A1.7 1.7 0 0 0 3.5 5.2c0 8.4 6.9 15.3 15.3 15.3a1.7 1.7 0 0 0 1.7-1.7V17l-4-1.4-2 2a13 13 0 0 1-5.9-5.9l2-2z"/>',
    'i-location': '<path d="M12 21s6.5-5.6 6.5-10.3A6.5 6.5 0 0 0 5.5 10.7C5.5 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.4"/>'
  };

  var JATEK = [
    ['index.html#kuldetesek', 'Küldetések'],
    ['terkep.html', 'Térkép'],
    ['ranglista.html', 'Ranglista']
  ];

  var INFO = [
    ['gyik.html', 'GYIK'],
    ['adatvedelem.html', 'Adatvédelmi tájékoztató']
  ];

  /* Valódi elérhetőségek — a felhasználó megerősítette, hogy élnek. */
  var KAPCSOLAT = [
    ['i-mail', 'mailto:info@urbanquest.hu', 'info@urbanquest.hu'],
    ['i-phone', 'tel:+36301234567', '+36 30 123 4567'],
    ['i-location', null, 'Budapest, Magyarország']
  ];

  function ikonokPotlasa() {
    var kell = Object.keys(IKON_RAJZ).filter(function (n) {
      return !document.getElementById(n);
    });
    if (!kell.length) return;
    var d = document.createElement('div');
    d.style.display = 'none';
    d.setAttribute('aria-hidden', 'true');
    d.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg"><defs>' +
      kell.map(function (n) { return '<g id="' + n + '">' + IKON_RAJZ[n] + '</g>'; }).join('') +
      '</defs></svg>';
    document.body.appendChild(d);
  }

  function oszlop(cim, sorok) {
    return '<nav class="footer-col" aria-label="' + cim + '"><h3>' + cim + '</h3><ul>' +
      sorok.map(function (s) {
        return '<li><a href="' + s[0] + '">' + s[1] + '</a></li>';
      }).join('') + '</ul></nav>';
  }

  function tartalom() {
    var ev = new Date().getFullYear();
    return '<div class="container">' +
      '<div class="footer-top">' +
        '<a class="brand footer-brand" href="index.html">' +
          '<svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true"><use href="#i-logo"/></svg>' +
          '<span class="brand-text">' +
            '<span class="brand-name">URBAN <span class="brand-name-alt">QUEST</span></span>' +
            '<span class="brand-tagline">KALANDOK. KÜLDETÉSEK. ÉLMÉNYEK.</span>' +
          '</span>' +
        '</a>' +
        oszlop('Játék', JATEK) +
        oszlop('Információk', INFO) +
        '<div class="footer-col"><h3>Kapcsolat</h3><ul class="footer-contact">' +
          KAPCSOLAT.map(function (k) {
            var belso = k[1] ? ('<a href="' + k[1] + '">' + k[2] + '</a>') : ('<span>' + k[2] + '</span>');
            return '<li><svg class="ico ico-sm" viewBox="0 0 24 24" aria-hidden="true"><use href="#' + k[0] + '"/></svg>' + belso + '</li>';
          }).join('') +
        '</ul></div>' +
      '</div>' +
      '<div class="footer-bottom">' +
        '<p>© ' + ev + ' Urban Quest — Minden jog fenntartva.</p>' +
      '</div>' +
    '</div>';
  }

  function indul() {
    ikonokPotlasa();

    var lab = document.querySelector('footer.site-footer');
    if (!lab) {
      lab = document.createElement('footer');
      lab.className = 'site-footer';
      lab.id = 'kapcsolat';
      /* A rögzített alsó sáv elé kerüljön, hogy a dokumentum sorrendje is
         a képernyőn látottat kövesse. */
      var sav = document.querySelector('.mobile-tabbar');
      if (sav) document.body.insertBefore(lab, sav);
      else document.body.appendChild(lab);
    }
    if (!lab.id) lab.id = 'kapcsolat';
    lab.innerHTML = tartalom();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', indul);
  } else {
    indul();
  }
})();
