/* ===========================================================
   URBAN QUEST — Érzelmi tervező

   Miért nem elég egy érzés-lista?
   Az érzelmek KONTRASZTBÓL keletkeznek. Megkönnyebbülés nincs
   feszültség nélkül, meghatottság nincs távolságtartás nélkül,
   diadal nincs kudarcközeli pillanat nélkül. Ezért a modul nem
   egy halmazt kezel, hanem egy GÖRBÉT:

     alaphang → emelkedés (2-3 érzés) → fordulat → végcél

   és ebből ír egy ÁLLOMÁSONKÉNTI PARTITÚRÁT: melyik állomáson
   melyik érzés a fő, melyik a mellék, és melyik szálat kell
   megmozdítania. Amelyik állomás egyik szálat sem mozdítja,
   az díszlet — azt a lint kimondja.

   A paletta minden eleménél a lényeg a `hogyan` mező: az érzés
   MEGNEVEZÉSE semmit nem ér a promptban, az ELŐÁLLÍTÁSA a
   használható utasítás.
   =========================================================== */
window.PVE = (function () {
  'use strict';

  /* ===========================================================
     1) PALETTA
     `end:false` = ezzel nem szabad befejezni egy pályát.
     `utkozik`   = amivel egy görbén belül veszekszik.
     =========================================================== */
  var PALETTE = [
    /* ---- feszültség ---- */
    { id: 'kivancsisag', cs: 'feszultseg', nev: 'kíváncsiság', end: false,
      hogyan: 'Hagyj nyitva egy kérdést, amire a szöveg nem válaszol. Említs meg valamit, ami hiányzik a helyszínről.',
      utkozik: [] },
    { id: 'gyanakvas', cs: 'feszultseg', nev: 'gyanakvás', end: false,
      hogyan: 'Két állítás mondjon ellent egymásnak, és NE döntsd el, melyik igaz. A gyanú tárgya legyen konkrét.',
      utkozik: ['bizalom'] },
    { id: 'surgetes', cs: 'feszultseg', nev: 'sürgetés', end: false,
      hogyan: 'Legyen valami, ami fogy: fény, türelem, előny. Mondd ki, mennyi maradt belőle. Rövid mondatok.',
      utkozik: ['nosztalgia', 'racsodalkozas', 'melankolia'] },
    { id: 'szorongas', cs: 'feszultseg', nev: 'szorongás', end: false,
      hogyan: 'A tét váljon személyessé: ne a küldetés bukjon, hanem ők veszítsenek valamit.',
      utkozik: ['deru', 'huncutsag'] },
    { id: 'veszelyerzet', cs: 'feszultseg', nev: 'veszélyérzet', end: false,
      hogyan: 'Jelezd, hogy valaki más is ugyanezt keresi, és egy lépéssel előrébb jár. Ne mutasd meg, ki az.',
      utkozik: ['deru'] },

    /* ---- felfedezés ---- */
    { id: 'racsodalkozas', cs: 'felfedezes', nev: 'rácsodálkozás', end: true,
      hogyan: 'Irányítsd a tekintetüket olyasmire, ami mindig ott volt, csak soha nem nézték meg. Egy részlet, ne panoráma.',
      utkozik: ['surgetes'] },
    { id: 'aha', cs: 'felfedezes', nev: 'aha-élmény', end: true,
      hogyan: 'Egy KORÁBBI állomás apró részlete itt nyerjen új értelmet. Ne magyarázd el — csak tedd oda mellé, és hagyd őket.',
      utkozik: [] },
    { id: 'kompetencia', cs: 'felfedezes', nev: 'kompetencia', end: true,
      hogyan: 'Ismerd el a szövegben, hogy megoldottak valamit, amit maguk sem hittek. Egy mondat, dicshimnusz nélkül.',
      utkozik: [] },
    { id: 'diadal', cs: 'felfedezes', nev: 'diadal', end: true,
      hogyan: 'Nevezd meg, mit vittek véghez. Csak a legvégén szabad — előbb használva elveszi a csúcspont erejét.',
      utkozik: ['melankolia'] },

    /* ---- kapcsolódás ---- */
    { id: 'osszetartozas', cs: 'kapcsolodas', nev: 'összetartozás', end: true,
      hogyan: 'Olyan helyzet elé állítsd őket, amit egyedül senki nem old meg. Végig a csapatot szólítsd, ne az egyént.',
      utkozik: ['versenges'] },
    { id: 'cinkossag', cs: 'kapcsolodas', nev: 'cinkosság', end: true,
      hogyan: 'A csapat tudjon valamit, amit a körülöttük sétálók nem. Írd le, hogy ne mutassák ki.',
      utkozik: [] },
    { id: 'bizalom', cs: 'kapcsolodas', nev: 'bizalom', end: true,
      hogyan: 'Kelljen elhinniük valamit bizonyíték nélkül, és a szöveg ismerje el, hogy ez kockázat.',
      utkozik: ['gyanakvas'] },
    { id: 'nosztalgia', cs: 'kapcsolodas', nev: 'nosztalgia', end: true,
      hogyan: 'Állítsd egymás mellé a hely mai és régi énjét. A veszteséget NE mondd ki — a különbség beszéljen.',
      utkozik: ['surgetes'] },
    { id: 'meghatottsag', cs: 'kapcsolodas', nev: 'meghatottság', end: true,
      hogyan: 'Egy konkrét ember sorsa legyen a kövek mögött. Egyetlen részlet róla, semmi életrajz.',
      utkozik: ['huncutsag', 'versenges'] },

    /* ---- súly ---- */
    { id: 'tisztelet', cs: 'suly', nev: 'tisztelet', end: true,
      hogyan: 'Valaki előttük járt, és nehezebb dolga volt. Ne dicsérd — csak írd le, mit csinált.',
      utkozik: ['huncutsag'] },
    { id: 'melankolia', cs: 'suly', nev: 'melankólia', end: true,
      hogyan: 'Ami itt volt, már nincs. Írd le a hiányt tárgyszerűen, és NE kommentáld.',
      utkozik: ['surgetes', 'diadal'] },
    { id: 'kisertetiesseg', cs: 'suly', nev: 'kísértetiesség', end: true,
      hogyan: 'A hely úgy viselkedjen, mintha emlékezne. Semmi természetfeletti — csak egy egybeesés, amit nem magyarázol meg.',
      utkozik: ['deru'] },
    { id: 'felelosseg', cs: 'suly', nev: 'felelősség', end: true,
      hogyan: 'A döntésük tartozzon valakihez, akit néven neveztél. Mondd ki, mi múlik rajtuk.',
      utkozik: [] },
    { id: 'buntudat', cs: 'suly', nev: 'bűntudat', end: false,
      hogyan: 'Utólag derüljön ki, hogy egy korábbi lépésük ártott valakinek. Ne oldd fel azonnal.',
      utkozik: ['deru'] },

    /* ---- játék ---- */
    { id: 'deru', cs: 'jatek', nev: 'derű', end: true,
      hogyan: 'A narrátor lássa a helyzet iróniáját. Poén igen, hülyéskedés nem. Egy pályán legfeljebb pár helyen.',
      utkozik: ['szorongas', 'veszelyerzet', 'kisertetiesseg', 'buntudat'] },
    { id: 'huncutsag', cs: 'jatek', nev: 'huncutság', end: true,
      hogyan: 'Adj nekik olyan utasítást, amitől kicsit hülyén néznek ki a járókelők előtt — és pont ezért élvezik.',
      utkozik: ['meghatottsag', 'tisztelet', 'szorongas'] },
    { id: 'versenges', cs: 'jatek', nev: 'versengés', end: true,
      hogyan: 'Legyen egy másik csapat vagy egy korábbi rekord, amihez mérhetik magukat. Konkrét szám kell hozzá.',
      utkozik: ['osszetartozas', 'meghatottsag'] },
    { id: 'izgalom', cs: 'jatek', nev: 'izgalom', end: false,
      hogyan: 'Rövid mondatok, konkrét mozgás, jelen idő. Ne elmélkedj, ne festegess.',
      utkozik: [] }
  ];

  var CSOPORT = {
    feszultseg:  'Feszültség',
    felfedezes:  'Felfedezés',
    kapcsolodas: 'Kapcsolódás',
    suly:        'Súly',
    jatek:       'Játék'
  };

  /* ===========================================================
     2) DILEMMÁK — a valódi A/B elágazáshoz
     A motor (jatszas.js) a döntési pontnál két gombot ad:
       A = a következő állomás, B = „rövidebb út" (átugorja azt).
     Vagyis a B ág ára VALÓDI: egy jelenetet sosem látnak meg.
     A dilemma dolga, hogy ennek érzelmi tétje legyen.
     =========================================================== */
  var DILEMMAK = [
    { id: 'aldozat', nev: 'Idő vagy tudás',
      leiras: 'A rövidebb úton gyorsabbak, de egy kérdés örökre nyitva marad.',
      a: 'A hosszabb út: itt derül ki, amit tudni akartak — de fogy az előnyük.',
      b: 'A rövidebb út: behozzák a hátrányt, viszont egy szál lezáratlan marad.' },
    { id: 'lojalitas', nev: 'Kinek hisznek',
      leiras: 'Két forrás mond mást, és el kell dönteniük, melyiket követik.',
      a: 'Az egyik forrás szerinti út.',
      b: 'A másik forrás szerinti út — rövidebb, de ez a forrás a gyanúsabb.' },
    { id: 'kockazat', nev: 'Biztos kicsi vagy bizonytalan nagy',
      leiras: 'Egy garantált, szerény eredmény, vagy egy kockázatos nagyobb.',
      a: 'A biztos út: kevesebb, de megvan.',
      b: 'A kockázatos rövidítés: lehet, hogy semmi, lehet, hogy minden.' },
    { id: 'erkolcs', nev: 'Ami helyes, és ami hasznos',
      leiras: 'A gyorsabb út valakinek rosszat tesz. Ezt ki kell mondani előre.',
      a: 'A tisztességes út, ami lassabb.',
      b: 'A gyors út, aminek ára van — és tudják, mi az.' },
    { id: 'kivancsisag_ara', nev: 'A kíváncsiság ára',
      leiras: 'Megtudni az igazat valakiről, vagy meghagyni neki a titkát.',
      a: 'Utánamennek, és megtudják.',
      b: 'Békén hagyják, és sosem tudják meg.' }
  ];

  /* ===========================================================
     3) ALAPÉRTELMEZETT SZÁLAK
     A szál egy futó ügy, ami állomásonként állapotot vált.
     Kettő az ideális: egy KÜLSŐ (a rejtély) és egy BELSŐ (a csapat).
     =========================================================== */
  var SZAL_MINTA = [
    { nev: 'a rejtély', tipus: 'kulso',
      hint: 'Mi történt itt valójában? Ez viszi előre a cselekményt.' },
    { nev: 'a megbízó', tipus: 'kulso',
      hint: 'Ki küldte őket, és mit hallgat el? A fordulat rendszerint ebben van.' },
    { nev: 'a csapat', tipus: 'belso',
      hint: 'Mit tudnak meg egymásról útközben? Ez adja az érzelmi végcélt.' }
  ];

  /* ---------- segédek ---------- */
  function byId(id) {
    for (var i = 0; i < PALETTE.length; i++) if (PALETTE[i].id === id) return PALETTE[i];
    return null;
  }
  function nevOf(id) { var e = byId(id); return e ? e.nev : id; }
  function dilemmaById(id) {
    for (var i = 0; i < DILEMMAK.length; i++) if (DILEMMAK[i].id === id) return DILEMMAK[i];
    return DILEMMAK[0];
  }
  function csoportok() {
    var out = [];
    Object.keys(CSOPORT).forEach(function (k) {
      out.push({ id: k, nev: CSOPORT[k], elemek: PALETTE.filter(function (e) { return e.cs === k; }) });
    });
    return out;
  }

  /* ---------- üres terv ---------- */
  function emptyPlan() {
    return {
      base: '', rise: [], twist: '', goal: '',
      szalak: [SZAL_MINTA[0].nev, SZAL_MINTA[2].nev],
      dilemma: 'aldozat',
      kimondott: true
    };
  }
  function normPlan(p) {
    var e = emptyPlan();
    if (!p || typeof p !== 'object') return e;
    return {
      base:  byId(p.base) ? p.base : '',
      rise:  (Array.isArray(p.rise) ? p.rise : []).filter(byId).slice(0, 3),
      twist: byId(p.twist) ? p.twist : '',
      goal:  byId(p.goal) ? p.goal : '',
      szalak: (Array.isArray(p.szalak) && p.szalak.length ? p.szalak : e.szalak)
                .map(function (s) { return String(s || '').trim(); })
                .filter(Boolean).slice(0, 3),
      dilemma: dilemmaById(p.dilemma).id,
      kimondott: p.kimondott !== false
    };
  }
  function isComplete(p) {
    p = normPlan(p);
    return !!(p.base && p.rise.length >= 2 && p.twist && p.goal);
  }


  /* ===========================================================
     3b) ÉRZELEM × FELADATTÍPUS

     Négy pszichológiai nézőpont (izgalmi szint, kognitív terhelés,
     társas dinamika, motiváció-jutalom) ütköztetéséből.

     A  MIND A HAT típust rangsorolja, nem csak a jókat. Ez
     szándékos: bináris támogat/olt listával öt érzésnél zsákutca
     keletkezett — nem volt generálható támogatott típus, és az
     alapértelmezés kényszerűen oltó lett. Így viszont mindig van
     választás, és a romlás mértéke MÉRHETŐ (lásd ).

     Alapelv, ami a legtöbb sort magyarázza: az analitikus feldolgozás
     elnyomja az érzelmi átélést. Aki épp kódot fejt, nem hatódik meg.
     =========================================================== */
  var TASKFIT = {
    kivancsisag:     { rang: ['szoveg', 'gps', 'foto', 'kod', 'kviz', 'puzzle'], rossz: ['kviz', 'puzzle'],
      indok: 'A kíváncsiság egy nyitva hagyott kérdés — a kvíz három opciója egy koppintással becsukja; hagyd, hogy a válaszért oda kelljen menni és a saját szemükkel leolvasni.' },
    gyanakvas:       { rang: ['szoveg', 'foto', 'gps', 'kviz', 'kod', 'puzzle'], rossz: ['kviz', 'kod', 'puzzle'],
      indok: 'Gyanakodni csak ott lehet, ahol senki nem mondja meg a helyeset: küldd őket ellenőrizni egy adatot a helyszínen, ne adj négy opciót és gépi igazságot.' },
    surgetes:        { rang: ['gps', 'kviz', 'szoveg', 'puzzle', 'kod', 'foto'], rossz: ['puzzle', 'kod', 'foto'],
      indok: 'Ami megállítja a csapatot, az cáfolja a szöveget — rendezgetés, kódszerelés és fotóbeállítás közben nem fogy semmi; itt mozgás vagy egy koppintás kell.' },
    szorongas:       { rang: ['kod', 'szoveg', 'gps', 'puzzle', 'kviz', 'foto'], rossz: ['kviz', 'foto'],
      indok: 'Kell, hogy tényleg el lehessen rontani valamit: a bukhatatlan fotó kimondja, hogy nincs tét, a kvíz pedig bekeretezi, hogy a jó válasz ott van a képernyőn.' },
    veszelyerzet:    { rang: ['gps', 'szoveg', 'foto', 'kviz', 'puzzle', 'kod'], rossz: ['puzzle', 'kod'],
      indok: 'Veszélyben felkapott fejjel pásztázzák a környéket — lehajolni kódot pötyögni vagy sorrendet rakni maga a bejelentés, hogy itt nincs semmi baj.' },
    racsodalkozas:   { rang: ['foto', 'szoveg', 'gps', 'kviz', 'kod', 'puzzle'], rossz: ['kviz', 'kod', 'puzzle'],
      indok: 'Arra csodálkoznak rá, amit maguk találtak meg: a kvíz opciói trivia-kérdéssé fokozzák a látványt, a kód pedig a telefonra rántja a tekintetüket a fal helyett.' },
    aha:             { rang: ['kod', 'puzzle', 'szoveg', 'foto', 'kviz', 'gps'], rossz: ['kviz', 'gps'],
      indok: 'Az aha akkor csattan, ha a korábbi állomások morzsái maguktól állnak össze — ehhez régi anyag kell, nem egy készen tálalt válaszlista vagy egy séta.' },
    kompetencia:     { rang: ['szoveg', 'kod', 'puzzle', 'gps', 'foto', 'kviz'], rossz: ['gps', 'foto', 'kviz'],
      indok: 'Csak az számít saját teljesítménynek, amiben nem lehetett tippelni vagy csak odasétálni: legyen valami, amit tényleg ők állítottak elő.' },
    diadal:          { rang: ['kod', 'puzzle', 'szoveg', 'foto', 'gps', 'kviz'], rossz: ['foto', 'gps', 'kviz'],
      indok: 'A diadalhoz legyőzött nehézség kell: a végig gyűjtött kód egyetlen pillanatban fizet ki mindent, egy fotóval vagy odasétálással zárni antiklimax.' },
    osszetartozas:   { rang: ['kod', 'szoveg', 'foto', 'gps', 'puzzle', 'kviz'], rossz: ['kviz'],
      indok: 'Azt érzik közösnek, amit egyedül senki nem old meg — oszd szét a feladatot emberek között; a kvíznél egy ember nyomkod, a másik öt álldogál.' },
    cinkossag:       { rang: ['foto', 'szoveg', 'kod', 'gps', 'kviz', 'puzzle'], rossz: ['kviz', 'puzzle'],
      indok: 'Össze kell hajolniuk valami fölött, amiről csak ők tudják, mit jelent — az iskolás kvíz és a rendezgetés hivatalossá és unalmassá teszi a titkot.' },
    bizalom:         { rang: ['foto', 'szoveg', 'gps', 'kod', 'kviz', 'puzzle'], rossz: ['kviz', 'puzzle'],
      indok: 'Bizalom ott épül, ahol el kell fogadniuk a másik leolvasását ellenőrzés nélkül — a kvíz azonnal megmondja, ki tévedett, és visszamenőleg megbélyegzi.' },
    nosztalgia:      { rang: ['foto', 'szoveg', 'gps', 'kod', 'puzzle', 'kviz'], rossz: ['kod', 'puzzle', 'kviz'],
      indok: 'A nosztalgia személyes mesélésből él: aki négy kódtöredéket ismételget magában, nem fogja elmondani, hogy a nagyanyja ilyen házban lakott.' },
    meghatottsag:    { rang: ['foto', 'gps', 'szoveg', 'kviz', 'kod', 'puzzle'], rossz: ['kviz', 'kod', 'puzzle'],
      indok: 'Aki épp kódot fejt, nem hatódik meg — hagyj nekik üres figyelmet: egy kép, egy séta, semmi pontozható és semmi, amit el lehet rontani.' },
    tisztelet:       { rang: ['foto', 'szoveg', 'gps', 'kviz', 'kod', 'puzzle'], rossz: ['kviz', 'kod', 'puzzle'],
      indok: 'Egy nevet leolvasni és kimondani tiszteletadás, kvízkérdéssé alakítani valakinek a sorsát nem — a kód pedig puszta nyersanyaggá teszi a helyet.' },
    melankolia:      { rang: ['foto', 'szoveg', 'gps', 'kod', 'puzzle', 'kviz'], rossz: ['kod', 'puzzle', 'kviz'],
      indok: 'A hiányhoz üres percek kellenek: minden gépileg pontozott feladat ünneplő „helyes!"-t rak oda, ahol te épp veszteségről beszéltél.' },
    kisertetiesseg:  { rang: ['szoveg', 'foto', 'gps', 'kviz', 'puzzle', 'kod'], rossz: ['kviz', 'puzzle', 'kod'],
      indok: 'A kísértetiességet a magyarázat öli meg — a saját szemükkel igazolt furcsa adat marad meg, a „helyes válasz" viszont megszelídíti a rejtélyt.' },
    felelosseg:      { rang: ['kod', 'szoveg', 'puzzle', 'foto', 'gps', 'kviz'], rossz: ['foto', 'gps', 'kviz'],
      indok: 'Felelősség csak ott van, ahol tényleg el lehet rontani és látszik, ki mit vitt bele: a becsületalapú fotón és a mindenkinek sikerülő gps-en semmi nem múlik.' },
    buntudat:        { rang: ['foto', 'szoveg', 'puzzle', 'kod', 'kviz', 'gps'], rossz: ['kviz', 'gps'],
      indok: 'A bűntudat lassulást és rágódást kíván — a kvíz pontvadászatot csinál belőle, a gps-szel pedig szó szerint elsétálnak tőle a következő helyszínig.' },
    deru:            { rang: ['foto', 'gps', 'kviz', 'szoveg', 'kod', 'puzzle'], rossz: ['kod', 'puzzle'],
      indok: 'A jókedvhez szabad fej és olcsó siker kell: a kód és a puzzle fölött ráncolt homlok van, a frusztráció pedig soha nem lesz derű.' },
    huncutsag:       { rang: ['foto', 'gps', 'szoveg', 'puzzle', 'kviz', 'kod'], rossz: ['puzzle', 'kviz', 'kod'],
      indok: 'A huncutság viselkedés, nem gondolkodás — kell hozzá egy kicsit ciki, nyilvános mozdulat; lehajtott fejjel, telefonba pötyögve senki nem csintalankodik.' },
    versenges:       { rang: ['kviz', 'kod', 'puzzle', 'szoveg', 'gps', 'foto'], rossz: ['foto'],
      indok: 'Versenyezni csak mérhetőn lehet: a fotón nincs mit megnyerni, a gyors kvíz és a rontható kód viszont éles nyerés-vesztés jelet ad.' },
    izgalom:         { rang: ['gps', 'kviz', 'szoveg', 'kod', 'puzzle', 'foto'], rossz: ['puzzle', 'foto'],
      indok: 'Az izgalom tempó kérdése — mozgás és gyors visszacsatolás tartja fenn; öt perc rendezgetés vagy egy beállítós fotó azonnal lehűti a csapatot.' },
  };

  /* Kemény végcélnál a záró kód az egyetlen jó finálé (a végig gyűjtött
     darabok egyetlen pillanatban fizetnek ki). Lágy és játékos végcélnál
     a foto: nem bukható, és tárgyi emléket hagy. Kvízzel sosem zárunk —
     tippelhető, és túl olcsó a csúcshoz. */
  var ZARO_KEMENY = ['diadal', 'kompetencia', 'aha', 'felelosseg'];

  function fitOf(id) { return TASKFIT[id] || null; }

  /* 0 = a legjobb választás, 5 = a legrosszabb. Ismeretlen érzésnél 2
     (semleges), hogy a régi pályák viselkedése ne változzon. */
  function rangOf(id, tipus) {
    var f = TASKFIT[id];
    if (!f) return 2;
    var i = f.rang.indexOf(tipus);
    return i < 0 ? 3 : i;
  }
  function oltjaE(id, tipus) {
    var f = TASKFIT[id];
    return !!(f && f.rossz.indexOf(tipus) >= 0);
  }
  function indokOf(id) { var f = TASKFIT[id]; return f ? f.indok : ''; }

  function zaroTipus(goalId) {
    if (ZARO_KEMENY.indexOf(goalId) >= 0) return 'kod';
    if (goalId === 'versenges') return 'puzzle';
    return 'foto';
  }

  /* ===========================================================
     4) LINT — a görbe ellenőrzése
     Nem stílusrendőrség: csak azt fogja meg, ami biztosan
     elrontja a játékélményt.
     =========================================================== */
  function lintPlan(p, W) {
    p = normPlan(p);
    var out = [];

    if (!p.base)  out.push({ lvl: 'err', msg: 'Nincs alaphang — e nélkül nincs mihez képest emelkedni.' });
    if (p.rise.length < 2) out.push({ lvl: 'err', msg: 'Legalább két emelkedő érzés kell, különben a középső állomások laposak lesznek.' });
    if (!p.twist) out.push({ lvl: 'err', msg: 'Nincs fordulat-érzés — a döntési pontnak nem lesz súlya.' });
    if (!p.goal)  out.push({ lvl: 'err', msg: 'Nincs érzelmi végcél — ez az egyetlen érzés, amit hazavisznek.' });

    var g = byId(p.goal);
    if (g && !g.end) {
      out.push({ lvl: 'err', msg: 'A(z) „' + g.nev + '” nem lehet végcél: feloldatlan feszültséggel hazaküldeni a csapatot rossz élmény. Válassz oldó érzést.' });
    }

    /* ütközések a teljes görbén belül */
    var mind = [p.base].concat(p.rise, [p.twist, p.goal]).filter(Boolean);
    var latott = {};
    mind.forEach(function (id) {
      var e = byId(id); if (!e) return;
      (e.utkozik || []).forEach(function (u) {
        if (mind.indexOf(u) < 0) return;
        var kulcs = [id, u].sort().join('|');
        if (latott[kulcs]) return;
        latott[kulcs] = 1;
        out.push({ lvl: 'warn', msg: 'A(z) „' + e.nev + '” és a(z) „' + nevOf(u) + '” kioltja egymást. Vagy dobd az egyiket, vagy tedd őket távolabb a görbén.' });
      });
    });

    /* lapos görbe: minden ugyanabból a családból */
    var csal = {};
    mind.forEach(function (id) { var e = byId(id); if (e) csal[e.cs] = 1; });
    if (mind.length >= 4 && Object.keys(csal).length === 1) {
      out.push({ lvl: 'warn', msg: 'Minden választott érzés a(z) „' + CSOPORT[byId(mind[0]).cs] + '” családból való. Kontraszt nélkül egyik sem fog érződni — hozz be egy másik családot.' });
    }

    /* a végcél ne legyen ugyanaz, mint az alaphang */
    if (p.base && p.goal && p.base === p.goal) {
      out.push({ lvl: 'warn', msg: 'Az alaphang és a végcél ugyanaz. Így a pálya nem visz sehova — a végcél legyen más, mint amivel indultak.' });
    }

    /* A „végcél kontra forráshiány" figyelmeztetés SZÁNDÉKOSAN nincs itt.
       Korábban szólt, ha a meghatottság/tisztelet/nosztalgia végcélhoz nem
       volt forrás a záró állomáson. Ez akkor volt indokolt, amíg tilos volt
       embert kitalálni — de ez játék, és a kitalált emberi sors a lényege.
       A meghatottság most a keretsztoriból is megszülethet. */

    /* Erőfeszítés-alapú érzés az ELSŐ állomáson: nincs mögötte semmi.
       Nem stílus kérdése — mérésből jött: a kezdő állomáson (i=0) sem
       kódtöredék, sem kirakó nem generálható, mert nincs korábbi anyag,
       így a feladat kényszerűen olyan típus lesz, ami kioltja az érzést. */
    var EROFESZITES = ['diadal', 'kompetencia', 'aha', 'felelosseg'];
    if (p.base && EROFESZITES.indexOf(p.base) >= 0) {
      out.push({ lvl: 'warn', msg: 'A(z) „' + nevOf(p.base) + '” erőfeszítésből születik, az első állomáson viszont ' +
        'még semmit nem csináltak — oda nem is generálható hozzá illő feladat. Tedd inkább az emelkedésbe vagy a végcélba.' });
    }

    /* Rövid pályán előfordul, hogy egyetlen állomás sem maradt, ahova
       kimondott döntést lehetne tenni (kiesik az első, az utolsó, a döntési
       pont és a döntés utáni). Ilyenkor a kapcsoló bekapcsolva marad, de
       nem történik semmi — ezt ki kell mondani, nem elhallgatni. */
    if (W && p.kimondott) {
      var sk3 = W.skeleton || [], n3 = sk3.length, di = -1;
      for (var q = 0; q < n3; q++) if (sk3[q].type === 'dontes') { di = q; break; }
      var vanHely = false;
      for (var r = 1; r < n3 - 1; r++) if (r !== di && r !== di + 1) vanHely = true;
      if (n3 >= 3 && !vanHely) {
        out.push({ lvl: 'warn', msg: 'Ezen a pályán nincs hova tenni kimondott döntést: kiesik az első, ' +
          'az utolsó, a döntési pont és a döntés utáni állomás (azt a rövidebb út átugorja). ' +
          'Vegyél fel még egy állomást, vagy kapcsold ki a kimondott döntéseket.' });
      }
    }

    if (!p.szalak.length) out.push({ lvl: 'err', msg: 'Legalább egy szál kell, amit az állomások mozgatnak.' });
    if (p.szalak.length === 1) out.push({ lvl: 'warn', msg: 'Egyetlen szállal a történet egysíkú. Egy külső (a rejtély) és egy belső (a csapat) szál a bevált páros.' });

    return out;
  }

  /* ===========================================================
     5) PARTITÚRA — a görbéből állomásonkénti utasítás

     A dramaturgiai szerepeket a PVS.roleOf adja; itt csak az
     érzelmi réteget tesszük rá. Szabályok:
       · az alaphang VÉGIG jelen van (ambiens), nem kell ismételni
       · az emelkedő érzések sorban jönnek be, és bent maradnak
       · a fordulat érzése a döntési ponton szólal meg
       · a végcél KIZÁRÓLAG az utolsó állomáson
     =========================================================== */
  function score(W, plan) {
    plan = normPlan(plan);
    var sk = (W && W.skeleton) || [];
    var n = sk.length;
    if (!n) return [];

    var dontIdx = -1;
    for (var i = 0; i < n; i++) if (sk[i].type === 'dontes') { dontIdx = i; break; }

    var rise = plan.rise.slice();
    var szalak = plan.szalak.slice();
    /* A kimondott döntések helye.
       KÉT állomás esik ki, és a másodikat élesben kellett megtanulni:
         · maga a DÖNTÉSI pont — ott már van valódi választás, két egymásra
           pakolt döntés ugyanazon a helyszínen felhígítja mindkettőt;
         · a döntés UTÁNI állomás — azt a „B" ág átugorja (jatszas.js:376),
           így a rá visszahivatkozó záró szöveg a rövidebb úton üresbe lógna.
       Öt állomásnál a két kizárás matematikailag egybeesett a korábbi
       fix pozíciókkal, ezért a célpontokat a legközelebbi MEGENGEDETT
       állomásra igazítjuk, nem egyszerűen eldobjuk. */
    var kimondottAt = {};
    if (plan.kimondott && n >= 4) {
      var jelolheto = [];
      for (var j = 1; j < n - 1; j++) {
        if (j !== dontIdx && j !== dontIdx + 1) jelolheto.push(j);
      }
      [Math.max(1, Math.round(n * 0.3)), n - 2].forEach(function (cel) {
        var legjobb = null, tav = Infinity;
        jelolheto.forEach(function (x) {
          var d = Math.abs(x - cel);
          if (!kimondottAt[x] && d < tav) { tav = d; legjobb = x; }
        });
        if (legjobb !== null) kimondottAt[legjobb] = 1;
      });
    }

    /* A középmezőny nem-döntési állomásainak sorszáma: ebből osztjuk ki
       az emelkedő érzéseket. Nyers indexből számolva az utolsó érzés
       csak a legvégén lépne be, és a középső állomások egyformák lennének. */
    var kozepRang = {}, kozepDb = 0;
    for (var j = 1; j < n - 1; j++) { if (j !== dontIdx) kozepRang[j] = kozepDb++; }

    return sk.map(function (s, i) {
      var utolso = (i === n - 1);
      var elso   = (i === 0);
      var fo, mellek = '';

      if (elso) {
        fo = plan.base; mellek = rise[0] || '';
      } else if (utolso) {
        fo = plan.goal; mellek = plan.base;
      } else if (i === dontIdx) {
        fo = plan.twist; mellek = rise[rise.length - 1] || '';
      } else {
        /* a középmezőny: az emelkedő érzések sorban lépnek be, és az
           utolsó középső állomásra már mind bent van */
        var rang = kozepRang[i] || 0;
        var k = (kozepDb <= 1 || rise.length <= 1) ? 0
              : Math.min(rise.length - 1, Math.round(rang / (kozepDb - 1) * (rise.length - 1)));
        fo = rise[k] || plan.base;
        mellek = (i > (dontIdx >= 0 ? dontIdx : Math.round(n * 0.6))) ? plan.twist : plan.base;
      }
      if (mellek === fo) mellek = '';

      /* szálak: minden állomás pontosan egyet mozdít, az utolsó mindet zárja */
      var szal = szalak.length ? szalak[i % szalak.length] : '';
      var feladat;
      if (utolso) feladat = 'zárul';
      else if (elso) feladat = 'indul';
      else if (dontIdx >= 0 && i >= dontIdx) feladat = 'csavarodik';
      else feladat = 'mélyül';

      return {
        idx: i,
        fo: fo, foNev: nevOf(fo), foHogyan: (byId(fo) || {}).hogyan || '',
        mellek: mellek, mellekNev: mellek ? nevOf(mellek) : '',
        szal: szal, feladat: feladat,
        dontes: (i === dontIdx),
        kimondott: !!kimondottAt[i],
        zarMind: utolso ? szalak.slice() : null
      };
    });
  }

  /* ===========================================================
     6) PROMPT-BLOKK
     Ez megy bele a generált promptba. Szándékosan az ELŐÁLLÍTÁST
     írja le, nem az érzés nevét — a modell a névből semmit nem tud
     kezdeni, a receptből viszont igen.
     =========================================================== */
  function promptBlock(W, plan) {
    plan = normPlan(plan);
    if (!isComplete(plan)) return '';
    var L = [];

    L.push('═══ ÉRZELMI PARTITÚRA ═══');
    L.push('Ez a pálya megrendelt érzelmi íve. Nem díszítés: ha a szöveg nem váltja ki ezeket, a munka nem kész.');
    L.push('');
    L.push('  ALAPHANG (végig jelen van, nem kell ismételni): ' + nevOf(plan.base));
    L.push('    → ' + (byId(plan.base) || {}).hogyan);
    L.push('  EMELKEDÉS (sorban lépnek be, és bent maradnak):');
    plan.rise.forEach(function (id) {
      L.push('    ' + nevOf(id) + ' → ' + (byId(id) || {}).hogyan);
    });
    L.push('  FORDULAT (a döntési ponton szólal meg): ' + nevOf(plan.twist));
    L.push('    → ' + (byId(plan.twist) || {}).hogyan);
    L.push('  VÉGCÉL (KIZÁRÓLAG az utolsó állomáson, ezt viszik haza): ' + nevOf(plan.goal));
    L.push('    → ' + (byId(plan.goal) || {}).hogyan);
    L.push('');
    L.push('Fontos: az érzés nevét SOHA ne írd le a szövegben. Nem azt írod, hogy „feszült voltál”,');
    L.push('hanem olyan helyzetet írsz le, amitől az lesz. Ha egy leírásban szerepel az érzés neve, rossz.');
    L.push('');

    L.push('═══ SZÁLAK ═══');
    L.push('A történetben ' + plan.szalak.length + ' futó szál van. MINDEN állomásnak mozdítania kell legalább egyet:');
    plan.szalak.forEach(function (s) { L.push('  · ' + s); });
    L.push('Az állomás vagy MÉLYÍTI (új réteg), vagy CSAVAR rajta (kiderül, hogy másképp van), vagy LEZÁRJA.');
    L.push('Amelyik állomás egyik szálat sem mozdítja, az díszlet — azt írd újra.');
    L.push('Az utolsó állomásnak MINDEN szálat le kell zárnia.');
    L.push('');

    var d = dilemmaById(plan.dilemma);
    L.push('═══ A DÖNTÉS ═══');
    L.push('A jelölt döntési állomáson a játékos KÉT gombot kap, és tényleg elágazik az útvonal.');
    L.push('A „B” ág ÁTUGORJA a következő állomást — akik azt választják, sosem látják azt a jelenetet.');
    L.push('Ez a dilemma: ' + d.nev + ' — ' + d.leiras);
    L.push('  A ág: ' + d.a);
    L.push('  B ág: ' + d.b);
    L.push('A döntési állomás leírása MONDJA KI a tétet mindkét irányban, és NE súgja meg, melyik a jó.');
    L.push('Ne írd le, hogy „válassz utat” — a helyzetből derüljön ki, hogy dönteniük kell.');
    if (plan.kimondott) {
      L.push('');
      L.push('KIMONDOTT DÖNTÉSEK: a partitúrában megjelölt állomásokon a leírás záruljon egy kérdéssel,');
      L.push('amire a csapatnak HANGOSAN, egymás előtt kell válaszolnia. Ez nem változtat útvonalat.');
      L.push('Egy KÉSŐBBI állomás szövege hivatkozzon vissza rá („amit a kútnál kimondtatok”), hogy legyen tétje.');
    }
    L.push('');
    return L.join('\n');
  }

  /* egy állomás érzelmi sora — a helyszín-blokkba kerül */
  function stationLines(sc) {
    if (!sc) return [];
    var L = [];
    L.push('   érzés  : ' + sc.foNev + (sc.mellekNev ? ' (alatta: ' + sc.mellekNev + ')' : ''));
    L.push('            ' + sc.foHogyan);
    if (sc.zarMind) {
      L.push('   szál   : MINDEN szálat lezár (' + sc.zarMind.join(', ') + ')');
    } else if (sc.szal) {
      L.push('   szál   : „' + sc.szal + '” — ' + sc.feladat);
    }
    if (sc.dontes) L.push('   ⚑ EZ A DÖNTÉSI PONT: a leírás mondja ki a tétet mindkét irányban.');
    if (sc.kimondott) L.push('   ⚑ KIMONDOTT DÖNTÉS: a leírás záruljon kérdéssel, amit hangosan meg kell válaszolniuk.');
    return L;
  }

  return {
    PALETTE: PALETTE, CSOPORT: CSOPORT, DILEMMAK: DILEMMAK, SZAL_MINTA: SZAL_MINTA,
    csoportok: csoportok, byId: byId, nevOf: nevOf, dilemmaById: dilemmaById,
    emptyPlan: emptyPlan, normPlan: normPlan, isComplete: isComplete,
    lintPlan: lintPlan, score: score, promptBlock: promptBlock, stationLines: stationLines,
    TASKFIT: TASKFIT, fitOf: fitOf, rangOf: rangOf, oltjaE: oltjaE, indokOf: indokOf, zaroTipus: zaroTipus
  };
})();
