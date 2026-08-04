/* =========================================================
   URBAN QUEST — LÁTOGATÓI MÉRÉS

   Mit rögzít: melyik oldalt nyitották meg, és a lényeges lépéseket
   (regisztráció, belépés, küldetés megnyitása, játék indítása/befejezése,
   kedvencelés, csapat). Ennyi elég ahhoz, hogy látszódjon az út — és nem
   annyi, hogy a lényeg elvesszen a zajban.

   Amit szándékosan NEM rögzít: IP-cím, pontos helyzet, ujjlenyomat, és a
   beírt válaszok. A bejelentkezetlen látogatót egyetlen véletlen
   eszköz-azonosító köti össze — ugyanaz, amit a játék szinkronja már használ
   (uq_device_v1). Ebből személy nem fejthető vissza.

   Három elv, amiért ez a fájl máshogy viselkedik, mint a projekt többi része:

   1. SOHA nem akaszthatja meg a látogatót. Minden hívás elnyeli a saját
      hibáját; hálózati hiba, letiltott tároló, reklámszűrő — egyik sem
      okozhat látható zavart.
   2. NEM megy a kimenő soron. Az a sor a JÁTÉK beküldéseit viszi, sorosan:
      egy beragadt mérés a válaszokat is feltartaná. A mérés elveszhet, a
      válasz nem.
   3. Az ADMIN oldalakat nem méri. A tulajdonos saját nézelődése nem
      látogatói adat, és csak elfedné az igazit.
   ========================================================= */
(function () {
  'use strict';

  var KULCS = 'uq_device_v1';          // ugyanaz, amit a jatszas.js használ

  /* Az admin felület nem látogatói forgalom. */
  function adminOldal() {
    if (document.body && document.body.classList.contains('admin-body')) return true;
    return /(?:^|\/)(iranyitopult|admin|jatekok|allomasok|feladatok|media|idozitesek|csapatok|beallitasok|latogatok|palya-varazslo[a-z-]*|atkoltoztetes)\.html$/
      .test(location.pathname);
  }

  /* A böngésző „ne kövess" jelzését tiszteletben tartjuk. */
  function nemAkarja() {
    var d = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
    return d === '1' || d === 'yes';
  }

  /* A FEJLESZTŐI FORGALOM NEM LÁTOGATÓ.
     A helyi kiszolgálón futó ellenőrzések (headless böngésző, mobil-átvilágítás,
     konzol-söprés) minden indításkor FRISS profilt kapnak, tehát új eszköz-
     azonosítót is — így néhány próbafutás alatt tucatnyi „látogató" keletkezik.
     Mérve: 598 esemény, 92 eszköz, ebből 75-nél az első és utolsó esemény
     között kevesebb mint egy perc telt el. Ezek nélkül a kimutatás bármit
     mutathat, csak a valóságot nem.
     A ?nomeas=1 kapcsoló kézi kizáráshoz kell (pl. saját nézelődéshez élesben). */
  function fejlesztoiHoszt() {
    var h = location.hostname;
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '' ||
        /\.local$/.test(h) || location.protocol === 'file:') return true;
    return /[?&]nomeas=1\b/.test(location.search);
  }

  function eszkoz() {
    try {
      var d = localStorage.getItem(KULCS);
      if (!d) {
        d = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
              var r = Math.random() * 16 | 0;
              return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            });
        localStorage.setItem(KULCS, d);
      }
      return d;
    } catch (e) { return null; }   // letiltott tároló: nem mérünk, nem hibázunk
  }

  var KIKAPCSOLVA = adminOldal() || nemAkarja() || fejlesztoiHoszt();

  /* A beküldés tudatosan NEM a UQAPI.queue() sorát használja — lásd a fenti
     2. elvet. Közvetlen, eldobható kérés. */
  function kuld(kind, label, meta) {
    if (KIKAPCSOLVA || !window.UQAPI) return;
    var dev = eszkoz();
    if (!dev) return;
    try {
      UQAPI.rest('/rpc/track_event', {
        method: 'POST',
        timeout: 5000,
        prefer: 'return=minimal',
        body: {
          p: {
            device_id: dev,
            kind: kind,
            path: location.pathname.replace(/^.*\//, '') || 'index.html',
            label: label || null,
            meta: meta || {}
          }
        }
      }).catch(function () { /* a mérés elmaradhat */ });
    } catch (e) { /* semmi */ }
  }

  /* Az oldalletöltést egyszer jelentjük, a betöltés végén — hogy ne
     versenyezzen a lap tényleges tartalmáért indított kérésekkel. */
  function oldalNezet() {
    var cim = (document.title || '').split('|')[0].trim();
    kuld('oldal', cim || null);
  }

  if (!KIKAPCSOLVA) {
    if (document.readyState === 'complete') setTimeout(oldalNezet, 400);
    else window.addEventListener('load', function () { setTimeout(oldalNezet, 400); });
  }

  window.UQTrack = {
    /* Egy megnevezett lépés. A `kind` értékét a szerver is ellenőrzi:
       amit nem ismer, azt csendben eldobja. */
    esemeny: function (kind, label, meta) { kuld(kind, label, meta); },
    /* Mérünk-e egyáltalán ezen az oldalon (hibakereséshez). */
    aktiv: function () { return !KIKAPCSOLVA; }
  };
})();
