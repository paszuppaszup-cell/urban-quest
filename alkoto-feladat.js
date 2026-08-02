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
  var elonezetFut = false, elonezetVar = false;

  function keretUjratolt() {
    if (!palya) return;
    if (elonezetFut) { elonezetVar = true; return; }
    elonezetFut = true;
    $('#tolt').hidden = false;
    UQAPI.rest('/rpc/preview_course', { method: 'POST', body: { p_course: palya.id } })
      .then(function () { $('#emulator').src = keretUrl(); })
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

  var ZONAK = [
    { kulcs: 'cim',    valaszto: '.uq-pl-hero-cim',                felirat: 'Állomás neve' },
    { kulcs: 'kerdes', valaszto: '.uq-pl-qtext',                   felirat: 'A kérdés szövege' },
    { kulcs: 'valasz', valaszto: '#uqPlayAnswer, .uq-pl-notask',   felirat: 'A válasz módja',
      potHely: '.uq-pl-akcio', potMagas: 44, potAlul: true },
    /* utoljára, hogy a kis gomb a nagy zónák FÖLÉ kerüljön, ne alá */
    { kulcs: 'media',  valaszto: '.uq-pl-taskimg, .uq-pl-taskvid', felirat: 'Kép vagy videó',
      potHely: '.uq-pl-akcio', potGomb: true, rovidFelirat: '+ kép' }
  ];

  function zonakRajzol() {
    var host = $('#zonak');
    var doc = keretDoc();
    if (!doc || !doc.body) return;
    var magas = $('#emulator').clientHeight;
    var db = 0, lentMaradt = 0;
    host.innerHTML = '';

    ZONAK.forEach(function (z) {
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
      if ((!r || r.height < 24) && z.potHely) {
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

    /* Amíg nincs mire koppintani, maradjon fent a betöltés-jelző: jobb egy
       őszinte „Betöltés…", mint egy kész képernyő, ami nem reagál. */
    if (db > 0) $('#tolt').hidden = true;
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
        panelZar(); allomasValaszto();
        feladatokTolt().then(function () { feladatSav(); keretUjratolt(); });
      });
      host.appendChild(b);
    });
  }

  function feladatSav() {
    var host = $('#feladatSav');
    host.innerHTML = '';

    feladatok.forEach(function (f, i) {
      var b = el('button', 'alk-fchip' + (i === aktivFeladat ? ' is-active' : ''));
      b.type = 'button';
      b.appendChild(el('span', 'alk-fchip-n', String(i + 1)));
      b.appendChild(el('small', null, tipus(f.kind).nev));
      b.addEventListener('click', function () {
        if (i === aktivFeladat) return;
        aktivFeladat = i; panelZar(); feladatSav(); keretUjratolt();
      });
      host.appendChild(b);
    });

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
    if (a && a.kind === 'dontes') {
      host.appendChild(el('span', 'alk-fsav-sugo',
        'Ez döntési pont: az útvonalakat az Állomások oldalon adod meg, nem itt. ' +
        'Feladat ide is tehető, de a választást az utak döntik el.'));
    }
  }

  /* =====================================================================
     SZERKESZTŐ PANEL
     ===================================================================== */

  function panelZar() {
    nyitottZona = null;
    $('#panel').hidden = true; $('#panel').innerHTML = '';
    $('#panelUres').hidden = false;
    zonakRajzol();
  }

  function panelNyit(zona) {
    nyitottZona = zona;
    var p = $('#panel');
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
    if (sugo) l.appendChild(el('small', 'alk-p-sugo', sugo));
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

  /* Automatikus mentés — telefonon a legkönnyebb elnavigálni egy mentetlen
     űrlapról, ezért nem bízzuk gombra.

     MINDEN panel SAJÁT időzítőt kap. Korábban egy közös `mentesOra` volt, és ha
     a szerző a kérdés begépelése után 700 ezredmásodpercen belül átment a válasz
     panelre, a kérdés mentése törlődött, mielőtt elsült volna — a beírt szöveg
     szó nélkül elveszett. */
  function automent(mezok, epit) {
    var ora = null;
    function fut() {
      if (ora) clearTimeout(ora);
      ora = setTimeout(function () {
        var p = epit();
        if (!p) return;
        jelez('mentés…');
        ment(p).then(function () { jelez('mentve'); keretUjratoltKesobb(); })
               .catch(function (e) { jelez(''); hiba(e); });
      }, 700);
    }
    mezok.forEach(function (m) {
      if (!m) return;
      m.addEventListener('input', fut);
      m.addEventListener('change', fut);
    });
  }

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
    automent([nev, leiras], function () {
      a.name = nev.value.trim() || 'Névtelen állomás';
      a.description = leiras.value.trim();
      allomasValaszto();
      return { _allomas: true, id: a.id, course_id: palya.id, name: a.name,
               kind: a.kind, description: a.description, lat: a.lat, lng: a.lng };
    });
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
    var q = mezo(p, 'Kérdés', f.question, 3);
    var pont = mezo(p, 'Hány pontot ér?', f.points == null ? 20 : f.points);
    pont.type = 'number'; pont.min = '0'; pont.max = '200';
    automent([q, pont], function () {
      var szoveg = q.value.trim();
      if (!szoveg) return null;                 // üres kérdést a szerver úgyis eldob
      f.question = szoveg;
      var p = { id: f.id, question: szoveg };
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
      UQAPI.rest('/rpc/delete_task', { method: 'POST', body: { p_task: f.id } })
        .then(function () { aktivFeladat = 0; return feladatokTolt(); })
        .then(function () { feladatSav(); keretUjratolt(); panelZar(); })
        .catch(hiba);
    });
    t.classList.add('alk-p-torol');
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
    return UQAPI.rest('/tasks?select=id,kind,question,points,image,video,config,solution,position' +
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
        return UQAPI.rest('/stations?select=id,name,kind,description,lat,lng,position' +
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
        return feladatokTolt().then(function () { feladatSav(); keretUjratolt(); });
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
