/* =========================================================
   URBAN QUEST — ALKOTÓ: Feladatok (telefon-emulátor)

   A keretben nem egy rajzolt attrap fut, hanem a VALÓDI lejátszó, előnézeti
   módban. Amit a szerző itt lát, pontosan az, amit a csapat a helyszínen
   kapni fog — a kettő nem tud elcsúszni egymástól, mert egy kódból jön.

   A koppintó-zónákat sem fix helyre tesszük: MEGMÉRJÜK a keretben lévő
   valódi elemek helyét, és pontosan föléjük igazítjuk. Ha a lejátszó
   elrendezése változik, a zónák vele mozdulnak.

   A keret maga nem kattintható (pointer-events: none): a szerző nem tudja
   véletlenül végigjátszani a saját előnézetét. Görgetni viszont lehet — a
   fölé tett réteg továbbadja a görgetést.

   Területenként MÁS lista jön föl: a kép helyére képet és videót lehet
   tenni, a kérdés helyére szöveget, a válasz helyére feladattípust. Így
   rossz dolog nem kerülhet rossz helyre.
   ========================================================= */
(function () {
  'use strict';

  var KULCS = 'uq_alkoto_palya';

  var palya = null, allomasok = [], feladatok = [];
  var aktivAllomas = 0, aktivFeladat = 0;
  var ujratoltOra = null, meresOra = null, toltOra = null, figyelo = null;
  var nyitottZona = null;

  function $(s) { return document.querySelector(s); }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  /* ---------------------------------------------------------------------
     A KILENC FELADATTÍPUS

     A magyarázat nem díszítés. A „döntési pont" és a „sorbarakás" olyan
     fogalmak, amiket egy listaelem neve nem ad át — aki nem érti, mit
     választ, rossz pályát ír, és azt majd vissza kell küldeni neki.
     --------------------------------------------------------------------- */
  var TIPUSOK = [
    { kind: 'kviz',   nev: 'Kvíz kérdés',
      mit: 'Több válaszlehetőség, ebből egy a jó. Ezt lehet a leggyorsabban megírni.' },
    { kind: 'szoveg', nev: 'Beírós válasz',
      mit: 'A csapat beírja a választ. Több elfogadott alakot is megadhatsz.' },
    { kind: 'kod',    nev: 'Számzár',
      mit: 'Számjegyeket kell beütni. Jó, ha a helyszínen látható évszám vagy házszám a megoldás.' },
    { kind: 'puzzle', nev: 'Sorbarakás',
      mit: 'Megadsz néhány dolgot a HELYES sorrendben; a csapat összekeverve kapja, és neki kell rendeznie.' },
    { kind: 'foto',   nev: 'Fotó',
      mit: 'A csapat képet készít. A rendszer nem ellenőrzi — bizalmi feladat, hangulatnak jó.' },
    { kind: 'gps',    nev: 'Helyszín igazolása',
      mit: 'A telefon megméri, tényleg ott vannak-e. Csak akkor működik, ha az állomásnak van koordinátája.' },
    { kind: 'qr',     nev: 'QR-kód',
      mit: 'A helyszínre kitett kódot kell beolvasni. A kódot NEKED kell kihelyezned.' },
    { kind: 'info',   nev: 'Csak olvasnivaló',
      mit: 'Nincs megoldandó feladat: elolvassák, és mennek tovább. Történet elmeséléséhez való.' }
    /* „Döntési pont" SZÁNDÉKOSAN nincs a listában.

       Az elágazás nem a feladat tulajdonsága, hanem az ÁLLOMÁSÉ: a lejátszó
       kizárólag az állomás kimenő útjaiból (station_edges) dolgozik —
       jatszas.js playAfterStation(), `const agak = (s.branches || [])`. A
       feladat kind-ját ott semmi nem nézi.

       Amíg felkínáltuk, egy ilyen feladat csak egy fölösleges „Teljesítés"
       koppintást tett a döntés elé, és azt hitette a szerzővel, hogy ettől
       lesz elágazás. Az éles próbán pontosan ez történt: a csapat előbb
       lenyomott egy semmitmondó gombot, és csak utána jött a valódi
       útválasztó képernyő. Az utakat az Állomások oldalon adja meg a szerző. */
  ];
  function tipus(k) {
    for (var i = 0; i < TIPUSOK.length; i++) if (TIPUSOK[i].kind === k) return TIPUSOK[i];
    if (k === 'dontes') return { kind: k, nev: 'Döntési pont (elavult)', mit: '' };
    return { kind: k, nev: k || 'Feladat', mit: '' };
  }

  /* =====================================================================
     A TELEFONKERET
     ===================================================================== */

  function keretUrl() {
    return 'jatszas.html?quest=' + encodeURIComponent(palya.slug || '') +
           '&elonezet=1&allomas=' + aktivAllomas + '&feladat=' + aktivFeladat +
           '&nezet=' + encodeURIComponent(aktivNezet) +
           '&allapot=' + encodeURIComponent(aktivAllapot) +
           '&cb=' + Date.now();
  }

  /* A lejátszó a BEFAGYASZTOTT verziót játssza, nem a nyers táblákat —
     ezért minden újratöltés előtt friss előnézeti verziót kérünk. Enélkül a
     szerző a saját, két perce elmentett szövegét sem látná.

     EGYSZERRE CSAK EGY előnézet-kérés lehet úton. Az éles próbán két egymásra
     futó preview_course közül a második HTTP 409-cel elszállt (a verzió-befagyasztás
     ütközött magával), és a szerző egy hibadobozt kapott, pedig nem csinált
     semmi rosszat. Ha közben újabb kérés kellene, csak megjegyezzük, és a futó
     után indítjuk. */
  var elonezetFut = false, elonezetVar = false, piszkos = true;
  var mentesSzamlalo = 0;   /* minden mentes noveli — a befagyasztas ehhez meri magat */

  function keretUjratolt() {
    if (!palya) return;
    if (elonezetFut) { elonezetVar = true; return; }

    /* ÚJRAFAGYASZTÁS CSAK AKKOR, HA VÁLTOZOTT VALAMI.

       Minden preview_course egy TELJES új verziót ír a course_versions-be a
       hozzá tartozó válasz- és pontozó-sorokkal együtt. Amíg minden
       koppintásra hívtuk, egyetlen hétállomásos próbapálya 141 verziót
       hagyott maga után — állomásváltásra és feladatváltásra is, pedig
       olyankor egy adat sem változott. A verziószám `max(version)+1`, a
       (course_id, version) pár pedig egyedi: két egymásra futó hívás emiatt
       ütközik, és ez adta a mért HTTP 409-et is.

       Ha nem mentettünk a legutóbbi fagyasztás óta, elég a keret címét
       átállítani — a befagyasztott csomag változatlanul érvényes. */
    if (!piszkos) { $('#tolt').hidden = false; $('#emulator').src = keretUrl(); return; }

    /* A mentés-számláló nélkül a gyors kattintgatás elveszti a piszkos
       jelzőt: ha a befagyasztás közben ÚJABB mentés fut le, a `.then`
       vakon `piszkos = false`-ra írna, és a keret a mentés ELŐTTI állapotot
       mutatná — miközben a panelen „mentve" áll. Ezért megjegyezzük, hányadik
       mentésnél jártunk, és csak akkor tekintjük tisztának, ha azóta nem
       mentettünk újra. */
    var pecset = mentesSzamlalo;
    elonezetFut = true;
    $('#tolt').hidden = false;
    UQAPI.rest('/rpc/preview_course', { method: 'POST', body: { p_course: palya.id } })
      .then(function () {
        if (mentesSzamlalo === pecset) piszkos = false;
        $('#emulator').src = keretUrl();
      })
      .catch(function (e) { $('#tolt').hidden = true; hiba(e); })
      .then(function () {
        elonezetFut = false;
        if (elonezetVar) { elonezetVar = false; keretUjratolt(); }
      });
  }

  function keretUjratoltKesobb() {
    if (ujratoltOra) clearTimeout(ujratoltOra);
    ujratoltOra = setTimeout(keretUjratolt, 900);
  }

  function keretDoc() {
    try { return $('#emulator').contentDocument || null; } catch (e) { return null; }
  }

  function keretKesz() {
    /* A betöltés-jelző CSAK akkor tűnhet el, ha a zónák már a helyükön vannak.
       Korábban azonnal eltűnt, és maradt egy fél másodperces ablak, amikor a
       keret látszott, de semmire nem lehetett koppintani — a szerző hiába
       nyúlt a képhez. */
    meresKesobb(120);
    /* Biztonsági háló: ha valamiért egyetlen zóna sem mérhető (üres állomás,
       hibás render), a jelző akkor se ragadjon bent örökre. */
    if (toltOra) clearTimeout(toltOra);
    toltOra = setTimeout(function () { $('#tolt').hidden = true; }, 6000);

    var doc = keretDoc();
    if (figyelo) { figyelo.disconnect(); figyelo = null; }
    if (doc && doc.body && window.MutationObserver) {
      figyelo = new MutationObserver(function () { meresKesobb(120); });
      figyelo.observe(doc.body, { childList: true, subtree: true, characterData: true });
    }
    if (doc && doc.defaultView) {
      doc.defaultView.addEventListener('scroll', function () { meresKesobb(40); }, { passive: true });
    }
  }

  function meresKesobb(ms) {
    if (meresOra) clearTimeout(meresOra);
    meresOra = setTimeout(zonakRajzol, ms || 150);
  }

  /* =====================================================================
     KOPPINTÓ-ZÓNÁK

     A választók a lejátszó valódi osztálynevei. Ha egy elem nincs ott
     (például még nincs kép), a zóna akkor is kell — különben képet SOHA nem
     lehetne hozzáadni.

     A PÓTHELY NEM LEHET SÁV. Éles próbán a „még nincs kép" sávot a kérdés alá
     tettük, oda, ahol a válaszmező kezdődik — a két zóna egymásra csúszott, és
     a koppintás mindig a válasz panelt nyitotta. Vagyis képet egyáltalán nem
     lehetett feltölteni olyan feladathoz, amelyiknek még nem volt. Ezért a
     póthely most egy kis gomb a kérdés-kártya jobb felső sarkában: sehol nem
     ér hozzá máshoz.
     ===================================================================== */

  /* A `nezet` mező NEM dísz: mind a négy zóna az ÁLLOMÁS-képernyő
     osztályneveire mérődik. Az introón, az útválasztón és az összegzőn
     ezek közül egy sem létezik, tehát ott egyetlen zónát sem szabad
     megpróbálni kirajzolni — különben a szerző néma keretet kapna. */
  var ZONAK = [
    /* Ha a szerző kikapcsolta az állomás-fejlécet (stations.show_header),
       a `.uq-pl-hero-cim` elem NINCS a keretben — és e nélkül a pótlás
       nélkül a zóna némán kimaradna: se hiba, se üzenet, csak a szerző
       soha többé nem tudná koppintással átnevezni az állomást innen.
       Ilyenkor a kontextus-kártya tetejére ülünk rá. */
    /* A póthely CSAK akkor lép életbe, ha az elem TÉNYLEG nincs ott (a szerző
       kikapcsolta a fejlécet). A „kicsi a magassága" eset itt nem indokolja:
       attól a zóna elvándorolt a kontextus-kártya aljára, holott az állomás
       neve látszott — és a szerző hiába koppintott rá. */
    { kulcs: 'cim',    nezet: 'allomas', valaszto: '.uq-pl-hero-cim',                felirat: 'Állomás neve',
      potHely: '.uq-pl-ctx, .uq-pl-akcio', potMagas: 34, potCsakHaHianyzik: true },
    { kulcs: 'kerdes', nezet: 'allomas', valaszto: '.uq-pl-qtext',                   felirat: 'A kérdés szövege' },
    { kulcs: 'valasz', nezet: 'allomas', valaszto: '#uqPlayAnswer, .uq-pl-notask',   felirat: 'A válasz módja',
      potHely: '.uq-pl-akcio', potMagas: 44, potAlul: true },
    /* utoljára, hogy a kis gomb a nagy zónák FÖLÉ kerüljön, ne alá */
    { kulcs: 'media',  nezet: 'allomas', valaszto: '.uq-pl-taskimg, .uq-pl-taskvid', felirat: 'Kép vagy videó',
      potHely: '.uq-pl-akcio', potGomb: true, rovidFelirat: '+ kép' }
  ];

  /* =====================================================================
     MELYIK KÉPERNYŐT ÉS MILYEN ÁLLAPOTBAN MUTASSA A KERET

     A játékos négy különböző képernyőt lát, a szerkesztő eddig csak egyet
     tudott megmutatni. Ez a két érték megy át a lejátszónak URL-ben —
     ugyanabban a mintában, ahogy az állomás és a feladat is (`keretUrl`).

     Az állapot CSAK az állomás-képernyőn értelmes: a helyes/rossz/átugrott
     visszajelzés ugyanabba a dobozba kerül, mint a kérdés, a nézet közben
     végig `station` marad — ezért ott a zónák is mérhetők maradnak. */
  var NEZETEK = [
    { kulcs: 'intro',    nev: 'Indítás',    mit: 'A pálya nyitóképernyője: név, állomásszám, „Indítás” gomb.' },
    { kulcs: 'allomas',  nev: 'Állomás',    mit: 'Az állomás és a feladat — ezt szerkesztheted koppintással.' },
    { kulcs: 'dontes',   nev: 'Útválasztó', mit: 'A döntési képernyő. Csak ott van, ahol az állomásnak legalább két útja van.' },
    { kulcs: 'osszegzo', nev: 'Összegző',   mit: 'A játék végi képernyő. A számok nullák, mert itt nincs valódi menet.' }
  ];
  var ALLAPOTOK = [
    { kulcs: 'nincs',    nev: 'Feladat',    mit: 'A kérdés, ahogy a csapat először látja.' },
    { kulcs: 'helyes',   nev: 'Helyes',     mit: 'Amit jó válasz után lát.' },
    { kulcs: 'rossz',    nev: 'Nem talált', mit: 'Amit rossz válasz után lát — itt jelenik meg a megoldás.' },
    { kulcs: 'atugorva', nev: 'Átugorva',   mit: 'Amit akkor lát, ha feladja a feladatot.' }
  ];
  var aktivNezet = 'allomas';
  var aktivAllapot = 'nincs';

  /* Az útválasztó csak akkor választható, ha az állomásnak TÉNYLEG van
     legalább két érvényes útja. A csapatlánc `role:` ágai nem számítanak:
     ott a szerep dönt, a játékos soha nem lát útválasztót. Ugyanaz a szűrés,
     amit a lejátszó is végez (jatszas.js playAfterStation).

     Az utakat KÜLÖN kell lekérni: az állomás-lekérdezés csak a nevet, a
     helyet és a sorrendet hozza — a station_edges nincs benne. Enélkül
     minden állomás útvonal nélkülinek látszana, és a chip örökre tiltva
     maradna. */
  var utak = [];             // station_edges az egész pályára
  var utakHiba = false;      // a lekérés elszállt-e

  function utakTolt() {
    if (!palya) return Promise.resolve();
    return UQAPI.rest('/station_edges?select=from_station,to_station,branch_key' +
                      '&course_id=eq.' + encodeURIComponent(palya.id))
      .then(function (r) { utak = r || []; utakHiba = false; })
      .catch(function () {
        /* Nem blokkolhatja a szerkesztőt — de HALLGATNI sem szabad róla.
           Ha elnyelnénk, az Útválasztó chip minden állomáson tiltva maradna,
           a súgója pedig azt állítaná, hogy „nincs két külön útja" — ami
           ilyenkor nem igaz, csak nem tudjuk. */
        utak = []; utakHiba = true;
      });
  }

  /* UGYANAZ A SZABÁLY, amit a lejátszó használ (jatszas.js playAfterStation):
     a motor csak akkor lép magától, ha MINDEN ág `role:` kulcsú. Vegyesen
     (szerep-ág + közönséges ág) a játékos MEGKAPJA az útválasztót.
     Ha itt kiszűrnénk a role: ágakat, épp azt a képernyőt tiltanánk le,
     amit a csapat látni fog. */
  function utvalasztoAllapot() {
    if (utakHiba) return 'ismeretlen';
    var a = allomasok[aktivAllomas];
    if (!a) return 'nincs';
    var agak = [];
    for (var i = 0; i < utak.length; i++) {
      if (utak[i] && utak[i].from_station === a.id) agak.push(utak[i]);
    }
    if (agak.length < 2) return 'nincs';
    var mindRole = agak.every(function (e) { return /^role:\d+$/.test(String(e.branch_key || '')); });
    return mindRole ? 'lanc' : 'van';
  }

  function vanUtvalaszto() { return utvalasztoAllapot() === 'van'; }

  /* A képernyő- és állapot-választó sáv. */
  function nezetSav() {
    var host = $('#nezetSav');
    if (!host) return;
    host.innerHTML = '';

    var uAllapot = utvalasztoAllapot();
    NEZETEK.forEach(function (n) {
      var tiltva = false, ok = n.mit;
      if (n.kulcs === 'dontes') {
        if (uAllapot === 'nincs') {
          tiltva = true;
          ok = 'Ennek az állomásnak nincs két külön útja, ezért a játékos itt nem lát útválasztót.';
        } else if (uAllapot === 'lanc') {
          tiltva = true;
          ok = 'Itt minden út csapatlánc-szerephez tartozik: a szerep dönt, a játékos nem kap választóképernyőt.';
        } else if (uAllapot === 'ismeretlen') {
          /* Nem tudjuk — de NEM tiltjuk le, mert az hamis indoklás lenne.
             Inkább kattintható marad, és a súgó megmondja, mi a helyzet. */
          ok = 'Az útvonalakat most nem sikerült lekérni, ezért nem tudjuk, van-e itt választóképernyő. Ha üres marad a keret, nincs.';
        }
      }
      var b = el('button', 'alk-nchip' + (n.kulcs === aktivNezet ? ' is-active' : '') +
                           (tiltva ? ' is-tiltva' : ''));
      b.type = 'button';
      b.appendChild(el('small', null, n.nev));
      b.title = ok;
      if (tiltva) { b.disabled = true; host.appendChild(b); return; }
      b.addEventListener('click', function () {
        if (n.kulcs === aktivNezet) return;
        aktivNezet = n.kulcs;
        if (aktivNezet !== 'allomas') aktivAllapot = 'nincs';   /* állapot csak az állomáson értelmes */
        panelZar(); nezetSav(); allomasSav(); keretUjratolt();
      });
      host.appendChild(b);
    });

    /* Az állapotok CSAK az állomás-képernyőn jelennek meg — máshol nincs
       feladat, amit meg lehetne válaszolni. Külön kis csoportban, hogy ne
       lehessen összekeverni a képernyőkkel. */
    if (aktivNezet === 'allomas') {
      var f = feladatok[aktivFeladat];
      var vanFeladat = !!f;
      /* A „Nem talált" eredménykártya élesben CSAK kvíznél születik meg.
         Minden más típusnál a rossz válasz nem zárja le a feladatot: a mező
         megrázkódik, és a csapat újrapróbálhat (playWrong). Ha itt mégis
         felkínálnánk, a szerző egy nem létező képernyőre tervezne szöveget. */
      ALLAPOTOK.forEach(function (a) {
        var tiltva = false, ok = a.mit;
        if (!vanFeladat) {
          tiltva = (a.kulcs !== 'nincs');
          ok = 'Ehhez az állomáshoz nincs feladat, ezért nincs mit megválaszolni.';
        } else if (a.kulcs === 'rossz' && f.kind !== 'kviz') {
          tiltva = true;
          ok = 'Ennél a feladattípusnál a rossz válasz nem zárja le a feladatot — a csapat újrapróbálhatja, tehát ilyen képernyő nincs.';
        }
        var b = el('button', 'alk-nchip alk-nchip-allapot' +
                             (a.kulcs === aktivAllapot ? ' is-active' : '') +
                             (tiltva ? ' is-tiltva' : ''));
        b.type = 'button';
        b.title = ok;
        b.appendChild(el('small', null, a.nev));
        if (tiltva) { b.disabled = true; host.appendChild(b); return; }
        b.addEventListener('click', function () {
          if (a.kulcs === aktivAllapot) return;
          aktivAllapot = a.kulcs; panelZar(); nezetSav(); allomasSav(); keretUjratolt();
        });
        host.appendChild(b);
      });

      /* A megoldás-felfedésről őszintén: a befagyasztott csomagban nincs
         benne a helyes válasz, élesben pedig a szerver adja — előnézetben
         tehát nem látszik. Enélkül a szerző azt hinné, elromlott. */
      if (vanFeladat && aktivAllapot !== 'nincs') {
        host.appendChild(el('p', 'alk-nchip-fig',
          'A megoldást élesben a szerver adja hozzá — előnézetben szándékosan nem írjuk ki, ' +
          'mert a befagyasztott csomagban nincs benne a helyes válasz.'));
      }
    }

    /* Az összegzőnél ki KELL mondani, hogy nem azonos a játékoséval:
       szerkesztői módban mások a feliratok, a Patreon-gomb sosem látszik, és
       a számok nullák, mert nincs valódi menet. */
    if (aktivNezet === 'osszegzo') {
      host.appendChild(el('p', 'alk-nchip-fig',
        'Ez a szerkesztői összegző: a számok nullák, mert itt nincs valódi menet, ' +
        'és pár felirat is más, mint a játékosnál. Az alkotói támogatás-gomb sem látszik itt.'));
    }

    /* Ha nem az állomás-képernyőt nézi, a szerkesztés vakon menne: a keretben
       nem az látszik, amit épp ír. Inkább mondjuk ki. */
    if (aktivNezet !== 'allomas') {
      host.appendChild(el('p', 'alk-nchip-fig',
        'Ezen a képernyőn nincs mit koppintani: a szerkesztéshez válts vissza az Állomás nézetre.'));
    }
  }

  function zonakRajzol() {
    var host = $('#zonak');
    var doc = keretDoc();
    if (!doc || !doc.body) return;
    var magas = $('#emulator').clientHeight;
    var db = 0, lentMaradt = 0;
    host.innerHTML = '';

    ZONAK.forEach(function (z) {
      /* Csak arra a képernyőre rajzolunk zónát, amelyikre mérve lett.
         Az introón, az útválasztón és az összegzőn ezek az elemek nem
         léteznek — ott a keret megnézésre való, nem szerkesztésre. */
      if ((z.nezet || 'allomas') !== aktivNezet) return;

      var e = doc.querySelector(z.valaszto), r = null, rovid = false;
      if (e) {
        var b = e.getBoundingClientRect();
        r = { top: b.top, left: b.left, width: b.width, height: b.height };
      }

      /* NEM elég azt nézni, hogy MEGVAN-E az elem: azt is, hogy van-e mérete.
         Éles próbán ez pont a kvíznél harapott: egy frissen létrehozott kvíznek
         még nincs egyetlen válaszlehetősége sem, ezért a lejátszó egy ÜRES,
         nulla magas válaszdobozt rajzol. A zóna így ki sem került, tehát a
         szerző nem tudta megnyitni a panelt — ahhoz, hogy megadhassa az első
         választ, már lett volna szüksége válaszra. Ilyenkor a póthely kell. */
      var kellPot = z.potCsakHaHianyzik ? !r : (!r || r.height < 24);
      if (kellPot && z.potHely) {
        var p = doc.querySelector(z.potHely);
        if (!p) return;
        var pb = p.getBoundingClientRect();
        if (z.potGomb) {
          r = { top: pb.top + 8, left: pb.right - 86, width: 74, height: 26 };
          rovid = true;
        } else {
          r = { top: pb.bottom - z.potMagas - 6, left: pb.left + 12,
                width: pb.width - 24, height: z.potMagas };
        }
      }
      if (!r) return;

      if (r.height < 4 || r.width < 4) return;
      if (r.top > magas - 4) { lentMaradt++; return; }          // a keret alja alatt
      if (r.top + r.height < 4) return;                          // a keret teteje fölött

      db++;
      var g = el('button', 'alk-zona alk-zona-' + z.kulcs +
                 (rovid ? ' alk-zona-kicsi' : '') +
                 (nyitottZona === z.kulcs ? ' is-nyitva' : ''));
      g.type = 'button';
      g.style.top = Math.round(r.top) + 'px';
      g.style.left = Math.round(r.left) + 'px';
      g.style.width = Math.round(Math.max(r.width, 44)) + 'px';
      g.style.height = Math.round(Math.max(r.height, rovid ? 24 : 34)) + 'px';
      g.appendChild(el('span', 'alk-zona-cimke',
                       rovid ? (z.rovidFelirat || z.felirat) : z.felirat));
      g.title = z.felirat;
      g.addEventListener('click', function () { panelNyit(z.kulcs); });
      host.appendChild(g);
    });

    /* Ami a keret alja alá esett, az NEM tűnhet el szó nélkül: a szerző azt
       hinné, nincs is ott semmi. Éles próbán pont a „válasz módja" zóna került
       a hajtás alá, és emiatt egy kvíz válaszait sem lehetett megadni. */
    var sav = $('#lentebb');
    if (sav) {
      sav.hidden = lentMaradt === 0;
      if (lentMaradt) {
        sav.textContent = 'Lentebb még van ' + lentMaradt +
                          (lentMaradt > 1 ? ' szerkeszthető rész' : ' szerkeszthető rész') + ' — koppints ide';
      }
    }

    /* Az ÁLLOMÁS-képernyőn: amíg nincs mire koppintani, maradjon fent a
       betöltés-jelző — jobb egy őszinte „Betöltés…", mint egy kész
       képernyő, ami nem reagál.

       A TÖBBI képernyőn viszont jogosan nincs egyetlen zóna sem (ott nincs
       mit szerkeszteni), ezért ott a jelzőnek akkor is fel kell oldódnia,
       ha db === 0. Enélkül a szerző örökké töltő, néma keretet kapna. */
    if (db > 0 || aktivNezet !== 'allomas') $('#tolt').hidden = true;
  }

  /* A keret nem kattintható, ezért a görgetést nekünk kell továbbadni. */
  function gorgetesBekot() {
    var host = $('#zonak');
    var sav = $('#lentebb');
    if (sav) sav.addEventListener('click', function () {
      var doc = keretDoc();
      if (doc && doc.defaultView) doc.defaultView.scrollBy(0, Math.round($('#emulator').clientHeight * 0.7));
    });
    host.addEventListener('wheel', function (ev) {
      var doc = keretDoc();
      if (!doc || !doc.defaultView) return;
      ev.preventDefault();
      doc.defaultView.scrollBy(0, ev.deltaY);
    }, { passive: false });

    var y0 = null, kezdo = 0, mozgott = false;
    host.addEventListener('touchstart', function (ev) {
      y0 = ev.touches[0].clientY; mozgott = false;
      var doc = keretDoc();
      kezdo = doc && doc.defaultView ? doc.defaultView.scrollY : 0;
    }, { passive: true });
    host.addEventListener('touchmove', function (ev) {
      if (y0 == null) return;
      var doc = keretDoc();
      if (!doc || !doc.defaultView) return;
      var d = y0 - ev.touches[0].clientY;
      if (Math.abs(d) > 6) mozgott = true;
      doc.defaultView.scrollTo(0, kezdo + d);
    }, { passive: true });
    host.addEventListener('touchend', function () { y0 = null; });
    /* Húzás után ne nyíljon panel — a szerző görgetni akart, nem szerkeszteni. */
    host.addEventListener('click', function (ev) {
      if (mozgott) { ev.stopPropagation(); ev.preventDefault(); mozgott = false; }
    }, true);
  }

  /* =====================================================================
     ÁLLOMÁS- ÉS FELADATVÁLASZTÓ
     ===================================================================== */

  function allomasValaszto() {
    var host = $('#allomasValaszto');
    host.innerHTML = '';
    allomasok.forEach(function (a, i) {
      var b = el('button', 'alk-achip' + (i === aktivAllomas ? ' is-active' : ''));
      b.type = 'button';
      b.appendChild(el('span', 'alk-achip-n', String(i + 1)));
      b.appendChild(el('span', 'alk-achip-nev', a.name || 'Névtelen'));
      b.addEventListener('click', function () {
        if (i === aktivAllomas) return;
        aktivAllomas = i; aktivFeladat = 0;
        /* Az útválasztó ÁLLOMÁSFÜGGŐ: ha az új állomásnak nincs két külön
           útja, ott ilyen képernyő nem létezik. Ilyenkor visszaesünk az
           állomás-nézetre, különben a keret üresen maradna, és a szerző azt
           hinné, elromlott valami. */
        if (aktivNezet === 'dontes' && !vanUtvalaszto()) aktivNezet = 'allomas';
        panelZar(); allomasValaszto();
        feladatokTolt().then(function () { feladatSav(); nezetSav(); allomasSav(); keretUjratolt(); });
      });
      host.appendChild(b);
    });
  }

  function feladatSav() {
    var host = $('#feladatSav');
    host.innerHTML = '';

    var hibasDb = 0;
    feladatok.forEach(function (f, i) {
      var bajok = feladatBaj(f);
      if (bajok.length) hibasDb++;
      var b = el('button', 'alk-fchip' + (i === aktivFeladat ? ' is-active' : '') +
                           (bajok.length ? ' is-baj' : ''));
      b.type = 'button';
      if (bajok.length) b.title = bajok.join(' ');
      b.appendChild(el('span', 'alk-fchip-n', String(i + 1)));
      b.appendChild(el('small', null, tipus(f.kind).nev));
      if (bajok.length) b.appendChild(el('span', 'alk-fchip-pont', '!'));
      b.addEventListener('click', function () {
        if (i === aktivFeladat) return;
        aktivFeladat = i; panelZar(); feladatSav(); nezetSav(); allomasSav(); keretUjratolt();
      });
      host.appendChild(b);
    });
    hibaSav(hibasDb);

    var uj = el('button', 'alk-fchip alk-fchip-uj');
    uj.type = 'button';
    uj.appendChild(el('span', 'alk-fchip-n', '+'));
    uj.appendChild(el('small', null, 'Új feladat'));
    uj.addEventListener('click', function () { panelNyit('uj'); });
    host.appendChild(uj);

    var jelzo = el('span', 'alk-mentes-jelzo');
    jelzo.id = 'mentesJelzo';
    jelzo.hidden = true;
    host.appendChild(jelzo);

    if (!feladatok.length) {
      host.appendChild(el('span', 'alk-fsav-sugo',
        'Ezen az állomáson még nincs feladat — a csapat csak áthalad rajta.'));
    }

    /* Döntési ponton szólunk, hogy az elágazás NEM itt készül: ez a
       leggyakoribb félreértés, mert a szerző a feladatok között keresi. */
    var a = allomasok[aktivAllomas];
    if (a && a.kind === 'feladat' && !feladatok.length) {
      host.appendChild(el('span', 'alk-fsav-baj',
        'Ez „Feladat” típusú állomás, de nincs rajta feladat — így a pálya nem küldhető be.'));
    }
    if (a && a.kind === 'dontes') {
      host.appendChild(el('span', 'alk-fsav-sugo',
        'Ez döntési pont: az útvonalakat az Állomások oldalon adod meg, nem itt. ' +
        'Feladat ide is tehető, de a választást az utak döntik el.'));
    }
  }

  /* =====================================================================
     SZERKESZTŐ PANEL
     ===================================================================== */

  /* Összegző sáv a telefon fölött: hány feladat menne így élesre hibásan. */
  function hibaSav(db) {
    var sav = $('#hibaSav');
    if (!sav) return;
    sav.hidden = !db;
    if (db) {
      sav.textContent = db === 1
        ? 'Egy feladat így nem fog működni — a sárga „!” jelzi, melyik.'
        : db + ' feladat így nem fog működni — a sárga „!” jelzi, melyek.';
    }
  }

  function panelZar() {
    nyitottZona = null;
    $('#panel').hidden = true; $('#panel').innerHTML = '';
    $('#panelUres').hidden = false;
    zonakRajzol();
  }

  function panelNyit(zona) {
    nyitottZona = zona;
    var p = $('#panel');
    /* Az előző panel mezői eltűnnek, a hozzájuk tartozó függő mentések
       időzítője viszont magától lefut — a nyilvántartást ürítjük, hogy ne
       gyűljön. */
    fuggoMentesek = [];
    p.innerHTML = ''; p.hidden = false; $('#panelUres').hidden = true;
    zonakRajzol();

    if (zona === 'cim')    return panelAllomas(p);
    if (zona === 'media')  return panelMedia(p);
    if (zona === 'kerdes') return panelKerdes(p);
    if (zona === 'uj')     return panelUjFeladat(p);
    return panelValasz(p);
  }

  function panelFej(p, cim, alcim) {
    var f = el('div', 'alk-p-fej');
    f.appendChild(el('h3', null, cim));
    var x = el('button', 'alk-p-x', '×');
    x.type = 'button'; x.setAttribute('aria-label', 'Bezárás');
    x.addEventListener('click', panelZar);
    f.appendChild(x);
    p.appendChild(f);
    if (alcim) p.appendChild(el('p', 'alk-p-alcim', alcim));
  }

  function mezo(host, cimke, ertek, tobbsoros, sugo) {
    var l = el('label', 'alk-p-mezo');
    l.appendChild(el('span', null, cimke));
    var i = document.createElement(tobbsoros ? 'textarea' : 'input');
    if (tobbsoros) i.rows = tobbsoros === true ? 3 : tobbsoros; else i.type = 'text';
    i.value = ertek == null ? '' : String(ertek);
    l.appendChild(i);
    if (sugo) { l.appendChild(el('small', 'alk-p-sugo', sugo)); l.title = sugo; }
    host.appendChild(l);
    return i;
  }

  function gomb(host, felirat, elsodleges, fn) {
    var b = el('button', 'adm-btn' + (elsodleges ? ' adm-btn-lime' : ''), felirat);
    b.type = 'button';
    b.addEventListener('click', fn);
    host.appendChild(b);
    return b;
  }

  /* Ki-be kapcsoló. Sima jelölőnégyzet, mert a felület többi része is az —
     és mert egy egyértelmű pipa többet ér, mint egy szép, de kétértelmű
     csúszka. A `be` értéke a MEGJELENÍTÉST jelenti: bepipálva látszik. */
  function kapcsolo(host, cimke, be, sugo, fn) {
    var l = el('label', 'alk-p-kapcs');
    var i = document.createElement('input');
    i.type = 'checkbox';
    i.checked = be !== false;
    l.appendChild(i);
    var t = el('span', null, cimke);
    l.appendChild(t);
    if (sugo) l.appendChild(el('small', 'alk-p-sugo', sugo));
    host.appendChild(l);
    if (fn) i.addEventListener('change', function () { fn(i.checked); });
    return i;
  }

  /* Automatikus mentés — telefonon a legkönnyebb elnavigálni egy mentetlen
     űrlapról, ezért nem bízzuk gombra.

     MINDEN panel SAJÁT időzítőt kap. Korábban egy közös `mentesOra` volt, és ha
     a szerző a kérdés begépelése után 700 ezredmásodpercen belül átment a válasz
     panelre, a kérdés mentése törlődött, mielőtt elsült volna — a beírt szöveg
     szó nélkül elveszett. */
  var fuggoMentesek = [];

  function automent(mezok, epit) {
    var ora = null;
    function most() {
      if (ora) { clearTimeout(ora); ora = null; }
      var p = epit();
      if (!p) return;
      jelez('mentés…');
      ment(p).then(function () { jelez('mentve'); keretUjratoltKesobb(); })
             .catch(function (e) { jelez(''); hiba(e); });
    }
    function fut() {
      if (ora) clearTimeout(ora);
      ora = setTimeout(most, 700);
    }
    /* Ha a szerző a gépelés után AZONNAL elnavigál (telefonon ez a tipikus
       mozdulat: beír, majd koppint a „Vissza az állomásokhoz" gombra), a
       700 ezredmásodperces várakozás sosem járna le, és a beírt szöveg szó
       nélkül elveszne. Lapelhagyáskor elsütjük a függőben lévőt. */
    fuggoMentesek.push(function () { if (ora) most(); });

    mezok.forEach(function (m) {
      if (!m) return;
      m.addEventListener('input', fut);
      m.addEventListener('change', fut);
    });
  }

  function fuggokElsutese() {
    var lista = fuggoMentesek.slice();
    lista.forEach(function (fn) { try { fn(); } catch (e) {} });
  }
  window.addEventListener('pagehide', fuggokElsutese);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { fuggokElsutese(); return; }
    /* Visszatéréskor ÚJRA lekérjük az utakat. Az útvonalakat egy MÁSIK
       oldalon (Állomások) veszi fel a szerző — ha onnan jön vissza, a
       memóriában lévő lista elavult, és az Útválasztó chip tiltva maradna
       azzal a hamis indoklással, hogy nincs két útja. */
    if (palya) utakTolt().then(nezetSav);
  });

  function jelez(szo) {
    var e = $('#mentesJelzo');
    if (!e) return;
    e.textContent = szo || '';
    e.hidden = !szo;
  }

  /* --- Állomás neve és leírása --- */
  function panelAllomas(p) {
    var a = allomasok[aktivAllomas];
    panelFej(p, 'Állomás neve', 'Ez a cím jelenik meg a képernyő tetején, a leírás pedig alatta.');
    var nev = mezo(p, 'Név', a.name, false, 'Rövid, felismerhető: „Halászbástya", „A vörös kapu".');
    var leiras = mezo(p, 'Mit lát itt a csapat?', a.description, 3,
      'Ide jön a hangulat és az eligazítás — nem a kérdés.');
    /* A megjelenítés-kapcsolók NEM ide kerültek, hanem a telefon fölé, az
       `allomasSav()`-ba: ha egy koppintó-zóna mögött laknának, és a zóna
       elcsúszik vagy eltűnik (mert épp a fejlécet kapcsolták ki), akkor a
       szerző nem tudná visszakapcsolni, amit kikapcsolt. */
    automent([nev, leiras], function () {
      a.name = nev.value.trim() || 'Névtelen állomás';
      a.description = leiras.value.trim();
      allomasValaszto();
      return { _allomas: true, id: a.id, course_id: palya.id, name: a.name,
               kind: a.kind, description: a.description, lat: a.lat, lng: a.lng };
    });
  }

  /* =====================================================================
     MIT MUTASSON A TELEFON EZEN AZ ÁLLOMÁSON

     Állandóan látható sor a telefon fölött — nem panel, nem zóna mögött.
     Állomásonként állítható, mert a fejléc annak a tulajdonsága, amit rejt
     (sorszám + név). A mentés ugyanazon a save_station-on megy.
     ===================================================================== */
  function allomasSav() {
    var host = $('#allomasSav');
    if (!host) return;
    host.innerHTML = '';

    var a = allomasok[aktivAllomas];
    if (!a) return;
    /* Csak az állomás-képernyőn van értelme: a többi nézeten nem ez látszik. */
    if (aktivNezet !== 'allomas') return;

    host.appendChild(el('span', 'alk-allomassav-cim', 'Mit mutasson a telefon?'));

    var kFejlec = kapcsolo(host, 'Állomás-fejléc',
      a.show_header !== false,
      'Sorszám, név és kép. Kikapcsolva csak a feladat látszik.');

    var kHud = kapcsolo(host, 'Felső sáv',
      a.show_hud !== false,
      'Feladatszámláló, idő, pont.');

    var kEredmeny = kapcsolo(host, 'Eredmény-visszajelzés',
      a.show_result !== false,
      'A „Helyes! +N pont" kártya a válasz után. Csak automatikus továbblépéssel kapcsolható ki — enélkül a csapat nem tudná, jó volt-e a válasz.');

    /* KÉT KÜLÖN LÉPTETÉS-KAPCSOLÓ. Nem egy: a feladatok közti lépés csak
       lapozás, az állomások közti viszont azt üzeni, hogy indulhattok tovább
       a városban. A kettőt nem szabad egy kapcsolóra tenni. */
    var kAutoFeladat = kapcsolo(host, 'Feladatok közt magától lép',
      a.auto_next_task === true,
      'A következő feladat gomb nélkül jön, ugyanazon az állomáson.');

    var kAutoAllomas = kapcsolo(host, 'Állomás végén magától lép',
      a.auto_next_station === true,
      'Az utolsó feladat után magától a következő állomásra visz — a csapat nem koppint „Állomás kész"-t.');

    var felirat = mezo(host, 'A továbbgomb felirata', a.next_label || '', false,
      'Üresen: „Állomás kész — tovább".');
    felirat.maxLength = 40;
    felirat.placeholder = 'Állomás kész — tovább';

    /* AZ ÓRÁRÓL KI KELL MONDANI, hogy elrejtve is jár. Nem feltételesen: a
       visszaszámláló a pálya becsült időtartamából számolódik, nem egy külön
       „van-e időkorlát" mezőből — ezért a feltételes figyelmeztetés pont
       akkor hallgatna, amikor kellene. */
    var fig = el('p', 'alk-p-fig');
    host.appendChild(fig);
    function figFrissit() {
      var uzenet = [];
      if (!kHud.checked) {
        uzenet.push('A felső sávban fut a visszaszámláló is. Kikapcsolva az idő tovább ' +
                    'telik, de a csapat nem látja fogyni.');
      }
      /* Eredmény nélkül ÉS gombbal: a csapat egy néma gomb előtt állna, és
         nem tudná, jó volt-e a válasz. A lejátszó ilyenkor kirajzolja a
         kártyát — itt is kimondjuk, hogy a kapcsoló nem hat. */
      if (!kEredmeny.checked && !kAutoFeladat.checked && !kAutoAllomas.checked) {
        uzenet.push('Az eredmény-visszajelzés csak automatikus továbblépéssel ' +
                    'kapcsolható ki. Amíg a csapat gombbal lép tovább, a kártya ' +
                    'megjelenik — különben nem tudná, jó volt-e a válasz.');
      }
      fig.hidden = uzenet.length === 0;
      fig.textContent = uzenet.join(' ');
    }
    figFrissit();

    function mentes() {
      a.show_header = kFejlec.checked;
      a.show_hud = kHud.checked;
      a.show_result = kEredmeny.checked;
      a.auto_next_task = kAutoFeladat.checked;
      a.auto_next_station = kAutoAllomas.checked;
      a.next_label = felirat.value.trim();
      figFrissit();
      return { _allomas: true, id: a.id, course_id: palya.id,
               show_header: a.show_header, show_hud: a.show_hud,
               show_result: a.show_result,
               auto_next_task: a.auto_next_task,
               auto_next_station: a.auto_next_station,
               next_label: a.next_label };
    }
    automent([kFejlec, kHud, kEredmeny, kAutoFeladat, kAutoAllomas, felirat], mentes);
  }

  /* --- Kép és videó --- */
  function panelMedia(p) {
    var f = feladatok[aktivFeladat];
    if (!f) {
      panelFej(p, 'Kép vagy videó', 'A kép a feladathoz tartozik — előbb hozz létre egyet.');
      var s0 = el('div', 'alk-p-gombok'); p.appendChild(s0);
      gomb(s0, 'Új feladat', true, function () { panelNyit('uj'); });
      return;
    }
    panelFej(p, 'Kép vagy videó', 'A kérdés alatt jelenik meg, a válasz fölött.');

    if (f.image) {
      var doboz = el('div', 'alk-p-kep');
      var img = document.createElement('img');
      img.src = f.image; img.alt = ''; img.referrerPolicy = 'no-referrer';
      doboz.appendChild(img);
      p.appendChild(doboz);
    }

    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/avif';
    input.hidden = true;
    p.appendChild(input);

    var sor = el('div', 'alk-p-gombok'); p.appendChild(sor);
    var fel = gomb(sor, f.image ? 'Másik kép' : 'Kép feltöltése', true, function () { input.click(); });
    if (f.image) {
      gomb(sor, 'Kép törlése', false, function () {
        ment({ id: f.id, image: '' })
          .then(function () { f.image = ''; keretUjratolt(); panelNyit('media'); })
          .catch(hiba);
      });
    }

    input.addEventListener('change', function () {
      var file = this.files && this.files[0];
      this.value = '';
      if (!file) return;
      fel.disabled = true; fel.textContent = 'Feltöltés…';
      kepFeltolt(file)
        .then(function (url) { return ment({ id: f.id, image: url }).then(function () { f.image = url; }); })
        .then(function () { keretUjratolt(); panelNyit('media'); })
        .catch(function (e) { fel.disabled = false; fel.textContent = 'Kép feltöltése'; hiba(e); });
    });

    var v = mezo(p, 'Videó hivatkozás', f.video, false,
      'YouTube- vagy mp4-cím. Üresen hagyva nincs videó.');
    automent([v], function () { f.video = v.value.trim(); return { id: f.id, video: f.video }; });
  }

  /* --- A kérdés szövege --- */
  function panelKerdes(p) {
    var f = feladatok[aktivFeladat];
    if (!f) {
      panelFej(p, 'A kérdés szövege', 'Ezen az állomáson még nincs feladat.');
      var s0 = el('div', 'alk-p-gombok'); p.appendChild(s0);
      gomb(s0, 'Új feladat', true, function () { panelNyit('uj'); });
      return;
    }
    panelFej(p, 'A kérdés szövege', 'Ezt olvassa a csapat a helyszínen.');
    var d0 = bajDoboz(feladatBaj(f)); if (d0) p.appendChild(d0);
    var q = mezo(p, 'Kérdés', f.question, 3);
    var pont = mezo(p, 'Hány pontot ér?', f.points == null ? 20 : f.points);
    pont.type = 'number'; pont.min = '0'; pont.max = '200';

    /* Az ellenőrző gomb felirata a FELADATHOZ tartozik, nem az állomáshoz:
       a gomb a feladat sajátja, és típusonként már ma is más (számzárnál
       „Feltör"). Üresen hagyva marad a típushoz illő alapértelmezés. */
    var gombFelirat = mezo(p, 'Az ellenőrző gomb felirata <em>(nem kötelező)</em>',
      f.check_label || '', false,
      'Üresen hagyva: „Ellenőrzés" (számzárnál „Feltör"). Legfeljebb 40 karakter.');
    gombFelirat.maxLength = 40;
    gombFelirat.placeholder = f.kind === 'kod' ? 'Feltör' : 'Ellenőrzés';

    automent([q, pont, gombFelirat], function () {
      var szoveg = q.value.trim();
      if (!szoveg) return null;                 // üres kérdést a szerver úgyis eldob
      f.question = szoveg;
      var p = { id: f.id, question: szoveg };
      f.check_label = gombFelirat.value.trim();
      p.check_label = f.check_label;
      /* A pontszámot CSAK akkor küldjük, ha tényleg van benne szám. Korábban
         `parseInt(...) || 0` állt itt: ha a szerző kitörölte a mezőt, hogy
         újat írjon, a közben elsülő mentés csendben NULLÁRA írta a feladat
         értékét — és ha ott hagyta a lapot, úgy is maradt. Üres mezőnél most
         inkább nem nyúlunk hozzá: a save_task részleges, a régi érték marad. */
      var n = parseInt(pont.value, 10);
      if (isFinite(n)) { f.points = n; p.points = String(Math.max(0, n)); }
      return p;
    });
  }

  /* --- Új feladat: csak a típusválasztó --- */
  function panelUjFeladat(p) {
    panelFej(p, 'Új feladat', 'Mit csináljon a csapat ezen az állomáson?');
    p.appendChild(tipusLista(null, function (kind) { ujFeladat(kind); }));
  }

  /* --- A válasz módja: a kilenc típus + a hozzá tartozó beállítás --- */
  function panelValasz(p) {
    var f = feladatok[aktivFeladat];
    if (!f) return panelUjFeladat(p);

    panelFej(p, 'A válasz módja', 'Ez dönti el, mit lát és mit csinál a csapat.');
    var d1 = bajDoboz(feladatBaj(f)); if (d1) p.appendChild(d1);
    p.appendChild(tipusLista(f.kind, function (kind) {
      /* Típusváltáskor a régi típus beállítása nem menthető át — egy kvíz
         válaszaiból nem lesz számzár-kód. Ezért megkérdezzük: egy félrenyúlás
         nem törölheti csendben a megírt munkát. */
      if (vanTartalom(f) && !window.confirm(
            'Ha átváltasz erre: „' + tipus(kind).nev + '", a(z) „' + tipus(f.kind).nev +
            '" beállítása (a válaszok és a megoldás) elvész.\n\nÁtváltasz?')) return;
      var uj = osszeallit(f, kind, {});
      f.kind = kind; f.cfg = uj.config; f.megoldas = uj.solution;
      ment(uj)
        .then(function () { feladatSav(); keretUjratolt(); panelNyit('valasz'); })
        .catch(hiba);
    }));
    beallito(p, f);

    var sor = el('div', 'alk-p-gombok alk-p-gombok-veg'); p.appendChild(sor);
    var t = gomb(sor, 'Feladat törlése', false, function () {
      if (!window.confirm('Törlöd ezt a feladatot? Nincs visszavonás.')) return;
      piszkos = true;
      UQAPI.rest('/rpc/delete_task', { method: 'POST', body: { p_task: f.id } })
        .then(function () { aktivFeladat = 0; return feladatokTolt(); })
        .then(function () { feladatSav(); keretUjratolt(); panelZar(); })
        .catch(hiba);
    });
    t.classList.add('alk-p-torol');
  }

  /* =====================================================================
     ELLENŐRZÉS — mi az, ami így élesre menne

     A szerver `course_lint`-je csak a BEKÜLDÉST fogja meg, az előnézetet nem.
     Egy éles próbán ez oda vezetett, hogy a pálya négy néma hibát vitt volna
     ki: egy csillag nélküli kvíz (ott MINDEN válasz rossz), és két feladat,
     aminek a kérdése maradt a „Írd ide a kérdést" helykitöltő — a csapat szó
     szerint ezt olvasta volna a helyszínen.

     Ezért a szerkesztő maga szól, ott, ahol a hiba van: a feladat csipjén, a
     panelben és egy összegző sávban.
     ===================================================================== */
  var HELYKITOLTO = 'Írd ide a kérdést';

  function feladatBaj(f) {
    if (!f) return [];
    var bajok = [];
    var k = String(f.question || '').trim();
    if (!k) bajok.push('Nincs kérdés.');
    else if (k === HELYKITOLTO) bajok.push('A kérdés még a helykitöltő — a csapat szó szerint ezt fogja olvasni.');

    var cfg = f.cfg || {};
    var acc = (f.megoldas && f.megoldas.accepted) || [];

    if (f.kind === 'kviz') {
      var opt = (cfg.options || []).filter(function (o) { return o && String(o.text || '').trim(); });
      if (opt.length < 2) bajok.push('Legalább két válaszlehetőség kell.');
      if (!acc.length) bajok.push('Nincs megjelölve a helyes válasz — csillag nélkül MINDEN válasz rossz lesz.');
    } else if (f.kind === 'szoveg') {
      if (!acc.length) bajok.push('Nincs elfogadott válasz — a feladat megoldhatatlan.');
    } else if (f.kind === 'kod') {
      if (!acc.length) bajok.push('Nincs megadva a kód — a zár nem nyílik ki.');
    } else if (f.kind === 'puzzle') {
      if ((cfg.items || []).length < 2) bajok.push('Legalább két elem kell a sorbarakáshoz.');
    } else if (f.kind === 'gps') {
      var a = allomasok[aktivAllomas];
      if (a && (a.lat == null || a.lng == null)) {
        bajok.push('Ennek az állomásnak nincs koordinátája — a helyszín nem igazolható.');
      }
    } else if (f.kind === 'dontes') {
      bajok.push('Ez a típus nem csinál semmit a játékban — az elágazás az állomás útjaiból jön.');
    }
    return bajok;
  }

  function bajDoboz(bajok) {
    if (!bajok.length) return null;
    var d = el('div', 'alk-baj');
    d.appendChild(el('b', null, bajok.length > 1 ? 'Így nem fog működni' : 'Így nem fog működni'));
    var ul = el('ul');
    bajok.forEach(function (b) { ul.appendChild(el('li', null, b)); });
    d.appendChild(ul);
    return d;
  }

  /* Van-e olyan beírt tartalom, ami egy típusváltáson elveszne? */
  function vanTartalom(f) {
    var c = f.cfg || {}, a = (f.megoldas && f.megoldas.accepted) || [];
    return a.length > 0 ||
           (c.options || []).length > 0 ||
           (c.items || []).length > 0 ||
           !!(c.instruction && String(c.instruction).trim());
  }

  function tipusLista(aktivKind, fn) {
    var lista = el('div', 'alk-tipusok');
    TIPUSOK.forEach(function (t) {
      var b = el('button', 'alk-tipus' + (aktivKind === t.kind ? ' is-active' : ''));
      b.type = 'button';
      b.appendChild(el('b', null, t.nev));
      b.appendChild(el('small', null, t.mit));
      b.addEventListener('click', function () { if (aktivKind !== t.kind) fn(t.kind); });
      lista.appendChild(b);
    });
    return lista;
  }

  /* --- Típusonkénti beállítás --- */
  function beallito(p, f) {
    var d = el('div', 'alk-beallito');
    var kind = f.kind;
    d.appendChild(el('b', 'alk-beall-cim', tipus(kind).nev + ' — beállítás'));

    var cfg = f.cfg || {};
    var acc = (f.megoldas && f.megoldas.accepted) || [];
    var m = {};

    if (kind === 'kviz') {
      var sorok = (cfg.options || []).map(function (o) {
        var sz = String((o && o.text) || '');
        return (acc.indexOf(sz) > -1 ? '*' : '') + sz;
      }).join('\n');
      m.opciok = mezo(d, 'Válaszlehetőségek', sorok, 5,
        'Soronként egy válasz. A HELYES elé tegyél csillagot: *Budapest');
    } else if (kind === 'szoveg') {
      m.valaszok = mezo(d, 'Elfogadott válaszok', acc.join('\n'), 4,
        'Soronként egy. Az ékezet és a kis/nagybetű nem számít, ezért elég egy alak.');
    } else if (kind === 'kod') {
      m.kod = mezo(d, 'A kód', acc[0] || '', false,
        'Csak számjegyek. A csapat számzáron üti be — a hosszát ebből tudjuk.');
    } else if (kind === 'puzzle') {
      m.elemek = mezo(d, 'Elemek a helyes sorrendben', (cfg.items || []).join('\n'), 5,
        'Soronként egy. A csapat összekeverve kapja, és neki kell sorba raknia.');
    } else if (kind === 'foto') {
      m.utasitas = mezo(d, 'Mit fotózzanak?', cfg.instruction || '', false,
        'Például: „Álljatok a szobor elé, és fotózzátok le magatokat."');
    } else if (kind === 'gps') {
      var a = allomasok[aktivAllomas];
      m.sugar = mezo(d, 'Mekkora körben fogadjuk el? (méter)', cfg.radius || 30);
      m.sugar.type = 'number'; m.sugar.min = '10'; m.sugar.max = '500';
      if (a.lat == null || a.lng == null) {
        d.appendChild(el('p', 'alk-beall-fig',
          'Ennek az állomásnak nincs koordinátája, ezért a helyszín nem igazolható. ' +
          'Tedd ki a térképre az Állomások oldalon.'));
      }
    } else if (kind === 'qr') {
      d.appendChild(el('p', 'alk-beall-sugo',
        'A QR-kódot neked kell kihelyezned a helyszínre. A rendszer nem ellenőrzi a tartalmát — ' +
        'aki a gombot megnyomja, megkapja a pontot.'));
    } else if (kind === 'info') {
      d.appendChild(el('p', 'alk-beall-sugo',
        'Nincs mit beállítani: a csapat elolvassa a kérdés mezőbe írt szöveget, és továbbmegy.'));
    } else if (kind === 'dontes') {
      d.appendChild(el('p', 'alk-beall-fig',
        'Ez a feladat nem csinál semmit a játékban: az elágazást az állomás útjai döntik el, ' +
        'nem a feladat. A csapat csak egy fölösleges gombot nyom meg tőle, mielőtt választhatna. ' +
        'Nyugodtan töröld — az utakat az Állomások oldalon adod meg.'));
    }

    var mezok = [];
    for (var k in m) if (m.hasOwnProperty(k)) mezok.push(m[k]);
    if (mezok.length) {
      automent(mezok, function () {
        var uj = osszeallit(f, kind, m);
        f.cfg = uj.config; f.megoldas = uj.solution;
        return uj;
      });
    }
    p.appendChild(d);
  }

  /* A beírtakból a szerver által várt alak.

     A megoldás SOSEM a config-ba kerül, hanem a solution mezőbe: a config
     megy le a telefonra, a solution nem. Ha ezt elrontanánk, a megfejtés
     ott ülne a játékos böngészőjében. */
  function osszeallit(f, kind, m) {
    var elozo = f.cfg || {};
    var regiAcc = (f.megoldas && f.megoldas.accepted) || [];
    var cfg = {}, acc = [];

    function sorok(mezo) {
      return (mezo && mezo.value ? mezo.value : '').split('\n')
        .map(function (x) { return x.trim(); }).filter(Boolean);
    }
    /* Ami nem típusfüggő, azt átmentjük: a lánc, a nehézség és a kitűző nem
       a megoldás része, és nem szabad elvesznie egy típusváltáson. */
    ['relay', 'difficulty', 'badge'].forEach(function (k) {
      if (elozo[k] != null) cfg[k] = elozo[k];
    });

    if (kind === 'kviz') {
      var opts = m.opciok ? sorok(m.opciok) : (elozo.options || []).map(function (o) {
        var sz = String((o && o.text) || '');
        return (regiAcc.indexOf(sz) > -1 ? '*' : '') + sz;
      });
      cfg.options = opts.map(function (x) { return { text: x.replace(/^\*/, '').trim() }; });
      cfg.shuffle = elozo.shuffle !== false;
      opts.forEach(function (x) {
        if (x.charAt(0) === '*') acc.push(x.replace(/^\*/, '').trim());
      });
    } else if (kind === 'szoveg') {
      cfg.tolerant = true;
      acc = m.valaszok ? sorok(m.valaszok) : regiAcc.slice();
    } else if (kind === 'kod') {
      var k = String(m.kod ? m.kod.value : (regiAcc[0] || '')).replace(/\D/g, '');
      cfg.codeLen = k.length || elozo.codeLen || 4;
      if (k) acc = [k];
    } else if (kind === 'puzzle') {
      var elemek = m.elemek ? sorok(m.elemek) : (elozo.items || []).map(String);
      cfg.items = elemek;
      if (elemek.length > 1) acc = [elemek.join('|')];
    } else if (kind === 'foto') {
      cfg.instruction = m.utasitas ? String(m.utasitas.value || '').trim() : (elozo.instruction || '');
    } else if (kind === 'gps') {
      var s = m.sugar ? parseInt(m.sugar.value, 10) : parseInt(elozo.radius, 10);
      cfg.radius = Math.max(10, Math.min(500, s > 0 ? s : 30));
    }

    return { id: f.id, kind: kind, status: 'active', config: cfg, solution: { accepted: acc } };
  }

  /* =====================================================================
     ADATRÉTEG
     ===================================================================== */

  /* MÉRT HIBA VOLT, nem elméleti: a szerkesztőmező elhagyásakor a böngésző még
     küld egy natív `change` eseményt, az újraindítja a késleltetett mentést, és
     az MÁR az időközben kiválasztott állomással futott le. A save_task pedig a
     station_id-t „rakd át ide" utasításnak veszi — így a feladat átugrott a
     szomszéd állomásra. Egy éles próbán kilencből hat feladat csúszott el.

     Ezért LÉTEZŐ feladatnál nem küldünk station_id-t: a mentés csak a mezőket
     javítja, áthelyezni nem tud. Az állomást egyedül a létrehozás dönti el
     (ujFeladat), ott viszont muszáj megadni. */
  function ment(p) {
    mentesSzamlalo++;
    piszkos = true;                 // innentől kell friss előnézeti verzió
    if (p._allomas) {
      delete p._allomas;
      return UQAPI.rest('/rpc/save_station', { method: 'POST', body: { p: p } });
    }
    if (!p.id) p.station_id = allomasok[aktivAllomas].id;
    return UQAPI.rest('/rpc/save_task', { method: 'POST', body: { p: p } });
  }

  function ujFeladat(kind) {
    var alap = osszeallit({ cfg: {}, megoldas: {} }, kind, {});
    delete alap.id;
    alap.station_id = allomasok[aktivAllomas].id;
    alap.question = 'Írd ide a kérdést';
    alap.points = '20';

    UQAPI.rest('/rpc/save_task', { method: 'POST', body: { p: alap } })
      .then(function () { return feladatokTolt(); })
      .then(function () {
        aktivFeladat = Math.max(0, feladatok.length - 1);
        feladatSav(); keretUjratolt();
        /* Egyből a kérdés-mezőbe visszük: az „Írd ide a kérdést" nem
           maradhat kint — a lint nem fogja meg, a játékos viszont látja. */
        panelNyit('kerdes');
      })
      .catch(hiba);
  }

  function kepFeltolt(file) {
    var u = UQAPI.user();
    var nev = String(file.name || 'kep').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-50) || 'kep';
    return UQAPI.upload(file, { path: 'szerzo/' + u.id + '/' + UQAPI.uuid().slice(0, 8) + '-' + nev })
      .then(function (r) { return r.url; });
  }

  function feladatokTolt() {
    var a = allomasok[aktivAllomas];
    if (!a) { feladatok = []; return Promise.resolve(); }
    return UQAPI.rest('/tasks?select=id,kind,question,points,image,video,config,solution,position,check_label' +
                      '&station_id=eq.' + encodeURIComponent(a.id) +
                      '&status=eq.active&order=position.asc')
      .then(function (r) {
        feladatok = (r || []).map(function (t) {
          return { id: t.id, kind: t.kind || 'szoveg', question: t.question || '',
                   points: t.points, image: t.image || '', video: t.video || '',
                   cfg: t.config || {}, megoldas: t.solution || {} };
        });
        if (aktivFeladat >= feladatok.length) aktivFeladat = Math.max(0, feladatok.length - 1);
      })
      .catch(function () { feladatok = []; });
  }

  function hiba(e) {
    var p = $('#panel');
    p.hidden = false; $('#panelUres').hidden = true;
    var regi = p.querySelector('.alk-p-hiba');
    if (regi) regi.remove();
    var d = el('div', 'alk-p-hiba');
    d.appendChild(el('b', null, 'Nem sikerült elmenteni'));
    d.appendChild(el('p', null, (e && e.message) || 'Hálózati hiba. Próbáld újra.'));
    p.insertBefore(d, p.firstChild);
  }

  function ures(cim, szoveg) {
    var d = $('#nincsPalya');
    d.hidden = false;
    d.querySelector('b').textContent = cim;
    if (szoveg) d.querySelector('p').textContent = szoveg;
    $('#szerkeszto').hidden = true;
  }

  /* =====================================================================
     INDULÁS
     ===================================================================== */

  function tolt() {
    var id = null;
    try { id = localStorage.getItem(KULCS); } catch (e) {}
    if (!id) { ures('Előbb válassz pályát'); return; }

    UQAPI.rest('/v_my_courses?select=*&id=eq.' + encodeURIComponent(id))
      .then(function (r) {
        palya = (r || [])[0] || null;
        if (!palya) { ures('Előbb válassz pályát'); return null; }
        return UQAPI.rest('/stations?select=id,name,kind,description,lat,lng,position,time_limit_s,show_header,show_hud,auto_next_task,auto_next_station,show_result,next_label' +
                          '&course_id=eq.' + encodeURIComponent(palya.id) + '&order=position.asc');
      })
      .then(function (r) {
        if (!r) return;
        allomasok = r || [];
        if (!allomasok.length) {
          ures('Előbb rakj ki állomásokat',
               'A Pályák menüpontban koppints a térképre — utána tudsz ide feladatot tenni.');
          return;
        }
        $('#szerkeszto').hidden = false;
        allomasValaszto();
        return utakTolt().then(function () {
          return feladatokTolt().then(function () { feladatSav(); nezetSav(); allomasSav(); keretUjratolt(); });
        });
      })
      .catch(function (e) { ures('Nem sikerült betölteni', (e && e.message) || 'Próbáld újra.'); });
  }

  $('#emulator').addEventListener('load', keretKesz);
  window.addEventListener('resize', function () { meresKesobb(200); });
  gorgetesBekot();

  function indul() {
    if (!window.UQAPI || !UQAPI.user()) {
      ures('Jelentkezz be', 'A saját pályáidat csak bejelentkezve tudod szerkeszteni.');
      return;
    }
    UQAPI.ready().then(tolt);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', indul);
  else indul();
})();
