/* =========================================================
   URBAN QUEST — alsó fül-navigáció (csak mobilon)

   Miért modul, és miért nem beírt HTML: a sáv eddig EGYETLEN oldalon
   létezett (index.html), beégetve. Egy alsó sáv lényege viszont az, hogy
   mindig ott van — öt helyre bemásolva pedig öt helyen kellene javítani.
   Ez a fájl egy helyen írja le a sávot, és minden játékos-oldal ugyanazt
   kapja.

   Sorrend balról jobbra: Küldetések · Térkép · Ranglista · Kedvencek · Fiókom

   A sáv megjelenését a styles.css `.mobile-tabbar` szabályai adják
   (760 px alatt `display: flex`, felette rejtve) — itt szándékosan nincs
   stílus, hogy ne kettőződjön a forrás.
   ========================================================= */
(function () {
  'use strict';

  /* A sprite oldalanként külön van definiálva, és nem mindegyiken szerepel
     minden ikon (a ranglistán például hiányzott az iránytű és a szív). Ha
     hiányzik, ez a modul pótolja — így nem kell öt HTML fejlécet szerkeszteni. */
  var IKON_RAJZ = {
    'i-compass': '<circle cx="12" cy="12" r="9"/><path d="M14.8 9.2 13.4 13.4 9.2 14.8l1.4-4.2z"/>',
    'i-map': '<path d="M9 5.5 3.5 8v11l5.5-2.5 6 2.5 5.5-2.5V6l-5.5 2.5z"/><path d="M9 5.5v11M15 8v11"/>',
    'i-trophy': '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5.5H5.5A1.5 1.5 0 0 0 4 7c0 2.2 1.8 4 4 4"/><path d="M16 5.5h2.5A1.5 1.5 0 0 1 20 7c0 2.2-1.8 4-4 4"/><path d="M12 13v3"/><path d="M9 20h6"/><path d="M10 16h4l.5 4h-5z"/>',
    'i-heart': '<path d="M12 19.5s-7-4.4-7-9A3.9 3.9 0 0 1 12 7.6 3.9 3.9 0 0 1 19 10.5c0 4.6-7 9-7 9z"/>',
    'i-user-circle': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="2.6"/><path d="M6.5 18.4a6 6 0 0 1 11 0"/>'
  };

  /* `oldalak`  — mely fájlnevek számítanak ehhez a fülhöz (aktív jelöléshez)
     `belepesKell` — kijelentkezve a belépésre visz, mert a cél amúgy üres lenne */
  var FULEK = [
    { kulcs: 'kuldetesek', cimke: 'Küldetések', ikon: 'i-compass',
      cel: 'index.html#kuldetesek', oldalak: ['', 'index.html', 'kuldetes.html'] },
    { kulcs: 'terkep', cimke: 'Térkép', ikon: 'i-map',
      cel: 'terkep.html', oldalak: ['terkep.html'] },
    { kulcs: 'ranglista', cimke: 'Ranglista', ikon: 'i-trophy',
      cel: 'ranglista.html', oldalak: ['ranglista.html'] },
    { kulcs: 'kedvencek', cimke: 'Kedvencek', ikon: 'i-heart',
      cel: 'fiokom.html#kedvencek', oldalak: [], belepesKell: true },
    { kulcs: 'fiokom', cimke: 'Fiókom', ikon: 'i-user-circle',
      cel: 'fiokom.html', oldalak: ['fiokom.html'], belepesKell: true }
  ];

  function belepve() {
    return !!(window.UQAuth && window.UQAuth.isRegistered && window.UQAuth.isRegistered());
  }

  function mostaniOldal() {
    var u = location.pathname.split('/').pop() || '';
    return u.toLowerCase();
  }

  /* Melyik fül az aktív. A Fiókom oldalon a horgony dönt: a kedvencek fül
     ugyanoda mutat, csak más szakaszra — enélkül mindkettő aktívnak látszana. */
  function aktivKulcs() {
    var oldal = mostaniOldal();
    if (oldal === 'fiokom.html') {
      return (location.hash || '').toLowerCase() === '#kedvencek' ? 'kedvencek' : 'fiokom';
    }
    for (var i = 0; i < FULEK.length; i++) {
      if (FULEK[i].oldalak.indexOf(oldal) > -1) return FULEK[i].kulcs;
    }
    return '';
  }

  /* Hiányzó sprite-elemek pótlása a lap saját defs-blokkjába. */
  function ikonokPotlasa() {
    var kell = [];
    FULEK.forEach(function (f) {
      if (!document.getElementById(f.ikon) && IKON_RAJZ[f.ikon]) kell.push(f.ikon);
    });
    if (!kell.length) return;

    var svg = document.createElement('div');
    svg.style.display = 'none';
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg"><defs>' +
      kell.map(function (n) { return '<g id="' + n + '">' + IKON_RAJZ[n] + '</g>'; }).join('') +
      '</defs></svg>';
    document.body.appendChild(svg);
  }

  function savHTML() {
    var aktiv = aktivKulcs();
    var be = belepve();
    return FULEK.map(function (f) {
      var cel = (f.belepesKell && !be) ? 'bejelentkezes.html' : f.cel;
      return '<a href="' + cel + '" class="tab' + (f.kulcs === aktiv ? ' is-active' : '') + '"' +
             (f.kulcs === aktiv ? ' aria-current="page"' : '') + '>' +
             '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#' + f.ikon + '"/></svg>' +
             '<span>' + f.cimke + '</span></a>';
    }).join('');
  }

  function kirajzol() {
    var sav = document.querySelector('.mobile-tabbar');
    if (!sav) {
      sav = document.createElement('nav');
      sav.className = 'mobile-tabbar';
      sav.setAttribute('aria-label', 'Mobil navigáció');
      document.body.appendChild(sav);
    }
    sav.innerHTML = savHTML();
  }

  function indul() {
    ikonokPotlasa();
    kirajzol();

    /* Be-/kijelentkezéskor a két fiókhoz kötött fül célja változik. */
    if (window.UQAPI && window.UQAPI.onAuth) UQAPI.onAuth(kirajzol);
    /* A Fiókom oldalon a fülváltás horgonnyal megy — az aktív jelölés kövesse. */
    window.addEventListener('hashchange', kirajzol);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', indul);
  } else {
    indul();
  }
})();
