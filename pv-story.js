/* ===========================================================
   URBAN QUEST — Sztori-híd (4. lépés)

   Nincs backend: a varázsló promptot ad, a felhasználó beilleszti
   egy MI-beszélgetésbe, és a választ visszamásolja ide.

   A modul három dolgot csinál, és mindhármat védekezően:
     1) PROMPT  — dramaturgiai szerepekkel és érzelmi partitúrával
     2) KINYERÉS — a beillesztett szemétből kihámozza a JSON-t
     3) BEOLVASZTÁS — fehérlistásan, visszagörgetéssel

   Tervezési döntés: a helyes válaszok (cfg) FIZIKAILAG nem kerülnek
   bele a promptba, így a modell nem is szivárogtathatja ki őket.
   =========================================================== */
window.PVS = (function () {
  'use strict';

  var VERSION = 'uq-story-1';

  /* ---------- alap ---------- */
  function deAcc(s) {
    return String(s == null ? '' : s)
      .replace(/[áàâä]/gi, 'a').replace(/[éèêë]/gi, 'e').replace(/[íìîï]/gi, 'i')
      .replace(/[óòôöő]/gi, 'o').replace(/[úùûüű]/gi, 'u');
  }
  function norm(s) { return deAcc(s).toLowerCase().replace(/[^a-z0-9]/g, ''); }
  /* karakterszám surrogate-helyesen (emoji ne számítson kettőnek) */
  function clen(s) { return Array.from(String(s || '')).length; }

  /* ===========================================================
     1) PROMPT
     =========================================================== */

  /* Az állomás dramaturgiai szerepe.
     A `dontes` típusnál VALÓDI elágazás van: a lejátszó két gombot ad,
     és a „B" ág átugorja a következő állomást (jatszas.js:376-382). A
     választásnak tehát tényleges ára van — egy jelenetet sosem látnak
     meg —, és ezt a sztorinak ki KELL használnia. */
  function roleOf(st, i, n) {
    if (st.type === 'kezdo' || i === 0) return 'FELÜTÉS';
    if (st.type === 'zaro' || i === n - 1) return 'LEZÁRÁS';
    if (st.type === 'dontes') return 'FORDULÓPONT';
    if (st.type === 'info') return 'VILÁGÉPÍTÉS';
    var t = i / (n - 1);
    if (t < 0.45) return 'EMELKEDŐ TÉT';
    if (t < 0.75) return 'SZORÍTÁS';
    return 'CSÚCSPONT';
  }

  var ROLE_HINT = {
    'FELÜTÉS':      'A történet itt indul. Vess fel egy kérdést és egy tétet. Ne magyarázz — érkezzünk egy már folyamatban lévő helyzetbe.',
    'VILÁGÉPÍTÉS':  'A keretsztori szabályai derülnek ki. Gyűlik az információ, a tét még kisebb.',
    'EMELKEDŐ TÉT': 'Valami elakad vagy többe kerül, mint hitted. Az állomás után sürgetőbb a helyzet, mint előtte.',
    'FORDULÓPONT':  'Kiderül, hogy amit eddig hittünk, másképp van — és VALÓDI döntés elé kerülnek: két út, két ár. A leírás mondja ki a tétet mindkét irányban, de ne súgja meg, melyik a jó.',
    'SZORÍTÁS':     'A forduló után: kevesebb idő, nagyobb tét, közelebb a válasz.',
    'CSÚCSPONT':    'A legfeszesebb pont, közvetlenül a lezárás előtt.',
    'LEZÁRÁS':      'Válasz a felütés kérdésére. Zárd le a keretsztorit, ne nyiss új szálat.'
  };

  var LEVEL_HINT = {
    'Könnyű':  'Könnyed, hívogató hang. A rejtély legyen érthető, ne szorongató.',
    'Közepes': 'Feszes nyomozós hang, valódi tétekkel.',
    'Nehéz':   'Sötétebb, sűrűbb szöveg. A játékos érezze, hogy komoly dologba keveredett.'
  };

  var TONES = [
    { id: 'nyomozos',  label: 'Nyomozós',    hint: 'Eltűnt tárgy, nyomok, gyanúsítottak. Feszes, tényszerű narrátor.' },
    { id: 'tortenelmi',label: 'Történelmi',  hint: 'A múlt egy darabja tér vissza. Patinás, de nem poros hang.' },
    { id: 'misztikus', label: 'Misztikus',   hint: 'Valami nem stimmel a városban. Sejtelmes, de nem horror.' },
    { id: 'humoros',   label: 'Humoros',     hint: 'Könnyed, ironikus narrátor. Poénok igen, hülyéskedés nem.' },
    /* Páros pályákhoz. Nem a helyszín a főszereplő, hanem két ember
       egymáshoz való viszonya — a giccs elkerülése itt a fő kockázat. */
    { id: 'romantikus',label: 'Romantikus',  hint: 'Két ember története, akik egymást keresik. Meleg, személyes hang, apró gesztusokkal. Pátosz, giccs és nagy szavak nélkül — a konkrét részlet többet ér, mint az érzelmes jelző.' },
    { id: 'kemtortenet',label:'Kémtörténet', hint: 'Titkos üzenetek, lebukásveszély, határidő. Suttogó, sürgető hang.' }
  ];

  /* A tényblokk. NEM korlát, hanem horgony: a kitalált történet ettől lesz
     hiteles. Egyedül az számít valós állításnak, amit magához a MŰEMLÉKHEZ
     köt a szöveg (mikor épült, ki alkotta) — a szereplők szabadok. */
  function factsLine(f) {
    if (!f) return '(nincs adat)';
    var b = [];
    if (f.year) b.push('év: ' + f.year);
    if (f.architect) b.push('építész: ' + f.architect);
    if (f.creator) b.push('alkotó: ' + f.creator);
    if (f.namedAfter) b.push('névadó: ' + f.namedAfter);
    if (f.style) b.push('stílus: ' + f.style);
    if (f.height) b.push('magasság: ' + f.height + ' m');
    if (f.district) b.push('kerület: ' + f.district);
    return b.length ? b.join(' · ') : '(nincs strukturált adat)';
  }

  /* A helyes választ kivágjuk a háttérszövegből, ha szó szerint benne van —
     így a modell nem tudja véletlenül beleírni a leírásba. */
  function redact(text, answers) {
    var out = String(text || '');
    (answers || []).forEach(function (a) {
      if (!a || clen(a) < 3) return;
      var re = new RegExp(a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      out = out.replace(re, '[…]');
    });
    return out;
  }

  /* egy állomás feladatának helyes válaszai — a szivárgás-ellenőrzéshez */
  function answersOf(task) {
    if (!task || !task.cfg) return [];
    var c = task.cfg, out = [];
    if (Array.isArray(c.options)) {
      c.options.forEach(function (o) { if (o.correct && o.text) out.push(String(o.text)); });
    }
    if (Array.isArray(c.accepted)) c.accepted.forEach(function (a) { out.push(String(a)); });
    if (c.code) out.push(String(c.code));
    if (Array.isArray(c.items)) c.items.forEach(function (x) { out.push(String(x)); });
    return out;
  }

  function trimExtract(s, max) {
    var t = String(s || '').replace(/\s+/g, ' ').trim();
    if (!t) return '(nincs háttérszöveg)';
    if (clen(t) <= max) return t;
    return Array.from(t).slice(0, max).join('') + '…';
  }

  function buildPrompt(W, opts) {
    opts = opts || {};
    var tone = TONES.filter(function (t) { return t.id === opts.tone; })[0] || TONES[0];
    var sk = W.skeleton || [];
    var n = sk.length;
    var course = W.course || {};
    var level = course.level || 'Közepes';
    var from = opts.from || 0;
    var to = Math.min(opts.to != null ? opts.to : n, n);
    var batch = sk.slice(from, to);
    var isBatch = (to - from) < n;

    var taskByStation = {};
    (W.tasks || []).forEach(function (t) { taskByStation[t.station] = t; });
    /* sztori-először módban nincs egyetlen feladat sem */
    var hasTasks = (W.tasks || []).length > 0;

    /* Érzelmi partitúra — csak ha a szerző kitöltötte a görbét.
       Hiányában a prompt pontosan úgy viselkedik, mint korábban. */
    var EPlan = window.PVE ? PVE.normPlan(W.emotion) : null;
    var EOk = !!(EPlan && PVE.isComplete(EPlan));
    var EScore = EOk ? PVE.score(W, EPlan) : [];

    var blocks = batch.map(function (s, k) {
      var i = from + k;
      var f = (W.facts || {})[s.uid] || {};
      var task = taskByStation[s.name];
      var ans = answersOf(task);
      var factsTxt = redact(factsLine(f), ans);
      var bgTxt = redact(trimExtract(f.extract, 420), ans);

      var L = [
        '── ' + (i + 1) + '. ' + s.name + '   [' + roleOf(s, i, n) + ']',
        '   uid    : ' + s.uid,
        '   cím    : ' + (s.loc || '(nincs megadva)'),
        '   tények : ' + factsTxt,
        '   háttér : ' + bgTxt
      ];
      /* az állomás érzelmi utasítása és szál-feladata */
      if (EOk) L = L.concat(PVE.stationLines(EScore[i]));
      /* Sztori-először módban még nincs feladat — ne hivatkozzunk rá. */
      if (task) L.push('   feladat kérdése: „' + task.question + '”');

      /* Forráshiány = szabad kéz, nem szűkösség. Korábban itt tiltás állt;
         de ez játék, a kitalált sors a lényeg. Csak az épülethez ragasztott
         évszámra hívjuk fel a figyelmet, mert azt hiszik el történelemnek. */
      if (/nincs adat|nincs strukturált/.test(factsTxt) && /nincs háttérszöveg/.test(bgTxt)) {
        L.push('   ✦ NINCS FORRÁS — itt teljesen szabad a kezed: a helyszín a díszlet,');
        L.push('     az embert és a történetét te találod ki. Csak az ÉPÍTMÉNYHEZ kötött');
        L.push('     évszámot kerüld (mikor épült/avatták) — azt valós adatnak veszik.');
      }

      /* A „nem ismered a megoldást” szabály NEM igaz minden feladattípusra:
         a záró kód és a kirakó megoldása KISZÁMÍTHATÓ az állomásnevekből,
         amiket a modell épp most kapott meg. Ezt külön ki kell mondani. */
      if (task && task.type === 'kod') {
        L.push('   ⚠ Ennek a feladatnak a megoldása KIKÖVETKEZTETHETŐ a fenti állomásnevekből.');
        L.push('     Tilos leírnod, kiszámolnod vagy utalnod rá — még részletében sem.');
      }
      if (task && task.type === 'puzzle') {
        L.push('   ⚠ Ennek a megoldása maga az állomások SORRENDJE, amit fent látsz.');
        L.push('     Ne sorold fel a korábbi állomásokat, és ne utalj a sorrendjükre.');
      }
      return L.join('\n');
    }).join('\n\n');

    var roles = {};
    batch.forEach(function (s, k) { roles[roleOf(s, from + k, n)] = 1; });
    var roleHelp = Object.keys(roles).map(function (r) {
      return '  [' + r + '] ' + ROLE_HINT[r];
    }).join('\n');

    var example = {
      version: VERSION,
      palya: course.route || '',
      heroTitle: 'A Vár árnyékában',
      intro: 'Egy levél érkezett, feladó nélkül. Csak egy térképrészlet volt benne, meg egy dátum — a mai. Aki írta, tudja, mit rejt a Várnegyed. Nektek kell kiderítenetek, mielőtt más teszi.',
      arc_igeret: 'Mit rejt a névtelen levél feladója?',
      arc_fordulat: 'Kiderül, hogy a feladó maga is keresett valamit — és nem találta meg.',
      arc_lezaras: 'A keresett tárgy sosem volt elrejtve: mindvégig látható volt.',
      allomasok: [
        { uid: 'node/123', motivum: 'a viaszpecsét',
          desc: 'A kapu alatt hűvös van, és a kövön még látszik a régi vésés. Itt kezdődik, amit a levél írója félbehagyott.',
          taskShort: 'Keresd meg, mi néz vissza rád a kapuról!',
          forras: '' }
      ]
    };

    var P = [];
    P.push('Magyar nyelvű városi kalandjáték („Urban Quest") sztoriját írod meg. VALÓS helyszínek — a játékosok tényleg ott fognak állni, telefonnal a kezükben. A feladatod EGYETLEN ÖSSZEFÜGGŐ TÖRTÉNET, nem különálló helyszínleírások gyűjteménye.');
    P.push('');
    P.push('═══ 1. EGY ÍV ═══');
    P.push('Az állomások egy történet fejezetei. Az első felvet egy kérdést, az utolsó választ ad rá. Minden közbenső állomás VÁLTOZTASSON valamin — ne csak „itt is szép".');
    P.push('Minden leírás ELSŐ mondata kapcsoljon az előző állomáshoz. Adj át egy konkrét, megfogható motívumot (a „motivum" mezőben: 1–3 szó, tárgyszerű — „a viaszpecsét", „a rézkulcs" — nem elvont, mint „a titok"), és a KÖVETKEZŐ leírás vegye fel ezt a motívumot. Az utolsó állomás motívuma üres string.');
    P.push('');
    P.push('═══ 2. AZ ÁLLOMÁSOK SZEREPE ═══');
    P.push(roleHelp);
    P.push('');
    if (EOk) { P.push(PVE.promptBlock(W, EPlan)); }
    P.push('═══ 3. TALÁLD KI AZ EMBEREKET ═══');
    P.push('Ez JÁTÉK, nem idegenvezetés. A szereplők, a sorsuk, a leveleik, a titkaik, a haláluk, a megbízó, az eltűnt személy — mindezt TE találod ki, és ez a munka lényege. Ne fogd vissza magad, és ne írj óvatos, semmitmondó szöveget azért, mert nincs adat.');
    P.push('  ✓ Adj nevet, arcot, szokást, indítékot. Egy konkrét ember konkrét bajával többet ér, mint tíz hangulatmondat.');
    P.push('  ✓ Ahol „(nincs adat)" áll, ott a legszabadabb vagy: a helyszín adja a díszletet (amit a szem lát), az embert te adod hozzá.');
    P.push('  ✓ Ahol VAN megadott tény, használd fel: egy valódi részlet hitelesíti a kitaláltat. A legerősebb jelenet az, ahol a kitalált ember sorsa a hely egy valós részletén fordul meg.');
    P.push('  A „forras" mezőbe másold be SZÓ SZERINT (max 100 karakter) azt a részletet a megadott háttérből, amire támaszkodtál. Ha tisztán kitaláltad, üres string — ez teljesen rendben van.');
    P.push('');
    P.push('Egyetlen dolog, amire figyelj: ha ÉVSZÁMOT ragasztasz magához az ÉPÍTMÉNYHEZ („1897-ben épült", „akkor avatták fel"), azt a csapat a helyszínen valós történelemnek érti, és rá is keres. Ilyet csak a megadott tényekből írj. Ha az évszám egy SZEREPLŐHÖZ tartozik („azon a novemberen költözött ide"), teljesen szabad.');
    P.push('');
    if (hasTasks) {
      P.push('═══ 4. A MEGOLDÁST NEM ISMERED ═══');
      P.push('Megkapod a feladat kérdését, de a helyes választ szándékosan NEM. A „taskShort" egy egymondatos felszólítás a történet hangján — ne tartalmazzon választ, tippet, számot, évszámot, kódot vagy nevet. Ne is találgass a leírásban.');
    } else {
      /* SZTORI-ELŐSZÖR: a feladatok még nem léteznek. Amit itt tényként
         leírsz, azt a feladatmotor NEM használhatja fel kérdésnek —
         ezért kérjük, hogy a konkrét adatokat tartogassa. */
      P.push('═══ 4. A FELADATOK MÉG NEM LÉTEZNEK ═══');
      P.push('A feladatok EZUTÁN készülnek, a te történetedre építve. Ezért:');
      P.push('  • A „taskShort" NE konkrét feladatra utaljon, hanem a jelenetre: mit vegyenek észre, hova nézzenek, mit keressenek a helyszínen.');
      P.push('  • A konkrét adatokat (évszám, alkotó neve, magasság, darabszám) LEHETŐLEG NE írd le a leírásban — azokból lesznek majd a kérdések. Ha muszáj utalnod rá, tedd sejtelmesen, szám nélkül.');
      P.push('  • A hangulat, a helyszín látványa és a keretsztori viszont szabadon jöhet.');
    }
    P.push('');
    P.push('═══ 5. HANGNEM ÉS TERJEDELEM ═══');
    P.push('Magyar nyelv, TEGEZŐDÉS (a csapatnak: „nézzétek"), végig következetesen. Magázás tilos.');
    P.push('Műfaj: ' + tone.label + ' — ' + tone.hint);
    P.push('Szint: ' + level + ' — ' + (LEVEL_HINT[level] || ''));
    if (opts.extra) P.push('További kérés a szerzőtől: ' + opts.extra);
    P.push('desc: 2–3 mondat, 120–260 karakter. taskShort: 1 mondat, 30–90 karakter, felszólító.');
    if (!isBatch) P.push('intro: 2–3 mondat, 180–320 karakter — ez a horog indulás előtt. heroTitle: max 32 karakter, cím-szerű.');
    P.push('');
    P.push('═══ 6. FORMAI SZABÁLYOK (fontos!) ═══');
    P.push('A szövegekben SOHA ne használj " karaktert. Ha idézőjel kell: „ ”');
    P.push('Ne legyen sortörés, tabulátor, emoji, visszaper vagy HTML a szövegmezőkben.');
    P.push('Az „uid" mezőket PONTOSAN másold át — ezek kötik össze az állomásokat.');
    P.push('Mind a(z) ' + batch.length + ' állomást add vissza, a megadott sorrendben.');
    P.push('');
    P.push('═══ 7. A PÁLYA ═══');
    P.push('Pálya: ' + (course.route || '(névtelen)') + '   ·   Terület: ' + ((W.area && W.area.n) || '—') +
           '   ·   Állomás: ' + n + (isBatch ? '   ·   EBBEN A KÖRBEN: ' + (from + 1) + '–' + to : ''));
    if (isBatch && opts.prevTail) {
      P.push('Az előző kör utolsó mondata (erre kell kapcsolnod): „' + opts.prevTail + '”');
      P.push('Az eddigi ív: ' + (opts.prevArc || '(nincs)'));
    }
    P.push('');
    P.push(blocks);
    P.push('');
    P.push('═══ 8. A VÁLASZ ═══');
    P.push('Egyetlen JSON kódblokkot adj vissza, magyarázat és bevezető szöveg NÉLKÜL. Pontosan ilyen alakban:');
    P.push('```json');
    P.push(JSON.stringify(example, null, 2));
    P.push('```');
    if (isBatch) P.push('(Ebben a körben a heroTitle, intro és arc_* mezőket hagyd ki — csak az „allomasok" tömb kell.)');

    return P.join('\n');
  }

  /* Melyik állomásokról hiányzik a szöveg, és melyik szöveg hivatkozik
     olyan motívumra, amit közben elutasítottunk. */
  function gaps(W) {
    var sk = W.skeleton || [];
    var missing = [], dangling = [];
    sk.forEach(function (s, i) {
      if (!String(s.desc || '').trim()) { missing.push(i); return; }
      /* az előző állomás motívuma eltűnt, de ez a szöveg még hivatkozik rá */
      var prev = sk[i - 1];
      if (prev && !String(prev.desc || '').trim() && i > 0) {
        dangling.push(i);
      }
    });
    return { missing: missing, dangling: dangling };
  }

  /* Célzott prompt CSAK a hiányzó (vagy elszakadt) állomásokra.
     A meglévő szövegeket is megmutatjuk, hogy illeszkedjen a hangnem
     és a motívumlánc újra összeérjen. */
  function buildGapPrompt(W) {
    var g = gaps(W);
    var need = g.missing.concat(g.dangling.filter(function (i) { return g.missing.indexOf(i) < 0; }))
                .sort(function (a, b) { return a - b; });
    if (!need.length) return '';

    var sk = W.skeleton || [];
    var n = sk.length;
    var taskByStation = {};
    (W.tasks || []).forEach(function (t) { taskByStation[t.station] = t; });

    var L = [];
    L.push('Egy magyar városi kalandjáték („Urban Quest") sztorijából HIÁNYZIK néhány állomás szövege.');
    L.push('A többi állomás szövege kész — azokhoz kell illeszkedned hangnemben és a történet ívében.');
    L.push('');
    L.push('A pálya: ' + ((W.course && W.course.route) || ''));
    if (W.intro) L.push('Bevezető: ' + W.intro);
    if (W.arc) L.push('A történet íve: ' + W.arc);
    L.push('');
    L.push('═══ A PÁLYA ÁLLOMÁSAI SORBAN ═══');
    sk.forEach(function (s, i) {
      var kell = need.indexOf(i) >= 0;
      L.push('── ' + (i + 1) + '. ' + s.name + '   [' + roleOf(s, i, n) + ']' + (kell ? '   ← EZT KELL MEGÍRNOD' : ''));
      if (!kell) {
        L.push('   MEGLÉVŐ szöveg: ' + s.desc);
        if (s.motivum) L.push('   továbbadott motívum: ' + s.motivum);
      } else {
        var f = (W.facts || {})[s.uid] || {};
        var task = taskByStation[s.name];
        var ans = answersOf(task);
        var ft = redact(factsLine(f), ans), bg = redact(trimExtract(f.extract, 420), ans);
        L.push('   uid    : ' + s.uid);
        L.push('   cím    : ' + (s.loc || '(nincs megadva)'));
        L.push('   tények : ' + ft);
        L.push('   háttér : ' + bg);
        L.push('   feladat kérdése: „' + (task ? task.question : '(nincs)') + '”');
        if (/nincs adat|nincs strukturált/.test(ft) && /nincs háttérszöveg/.test(bg)) {
          L.push('   ✦ NINCS FORRÁS — szabad a kezed: az embert és a sorsát találd ki.');
          L.push('     Csak az ÉPÍTMÉNYHEZ kötött évszámot kerüld (mikor épült/avatták).');
        }
        if (task && task.type === 'kod') {
          L.push('   ⚠ A megoldás kikövetkeztethető az állomásnevekből — tilos leírnod vagy utalnod rá.');
        }
        if (task && task.type === 'puzzle') {
          L.push('   ⚠ A megoldás az állomások sorrendje — ne sorold fel őket, ne utalj a sorrendre.');
        }
      }
      L.push('');
    });
    L.push('═══ SZABÁLYOK ═══');
    L.push('• Magyar nyelv, TEGEZŐDÉS, ugyanaz a hangnem, mint a meglévő szövegekben.');
    L.push('• desc: 2–3 mondat, 120–260 karakter. taskShort: 1 mondat, 30–90 karakter, felszólító.');
    L.push('• Az ELSŐ mondat kapcsoljon az előző állomáshoz, és add tovább egy konkrét motívumot.');
    L.push('• Ha az utánad következő szöveg említ egy motívumot, azt NEKED kell bevezetned.');
    /* SZÁNDÉKOSAN KÉT SOR. Korábban egy mondatban élt a ténytiltás és a
       szivárgás-tilalom — a ténytiltás törlésekor a másik is elveszett volna.
       A lenti sorhoz NE nyúlj: az a feladat megoldását védi, nem a tényhűséget. */
    L.push('• A szereplőket és a sorsukat találd ki — csak a VALÓS műemlékhez kötött évszámot és alkotót kerüld forrás nélkül.');
    L.push('• Tilos elárulni a feladat megoldását.');
    L.push('• A szövegekben SOHA ne használj " karaktert. Ha idézőjel kell: „ ”');
    L.push('');
    L.push('═══ A VÁLASZ ═══');
    L.push('Egyetlen JSON kódblokk, KIZÁRÓLAG a megírandó állomásokkal:');
    L.push('```json');
    L.push(JSON.stringify({
      version: VERSION,
      palya: (W.course && W.course.route) || '',
      allomasok: need.map(function (i) {
        return { uid: sk[i].uid, motivum: '…', desc: '…', taskShort: '…', forras: '' };
      })
    }, null, 2));
    L.push('```');
    return L.join('\n');
  }

  /* hány körre bontsuk — hosszú pályánál a válasz csonkulna */
  function batchPlan(W, size) {
    var n = (W.skeleton || []).length;
    size = size || 8;
    if (n <= 12) return [{ from: 0, to: n }];
    var out = [];
    for (var i = 0; i < n; i += size) out.push({ from: i, to: Math.min(i + size, n) });
    return out;
  }

  /* ===========================================================
     2) KINYERÉS — a beillesztett szemétből a JSON
     =========================================================== */

  /* láthatatlan és irányvezérlő karakterek: BOM, zero-width, NBSP, bidi */
  var INVISIBLE = /[﻿​-‍⁠ ‪-‮⁦-⁩]/g;

  function preclean(raw) {
    return String(raw || '')
      .replace(INVISIBLE, function (c) { return c === ' ' ? ' ' : ''; })
      .replace(/\r\n?/g, '\n')
      .trim();
  }

  /* Az „okos" idézőjeleket CSAK a JSON szerkezetében szabad javítani,
     a szövegen belül maradhatnak — ezért a csere string-tudatos. */
  function fixStructuralQuotes(s) {
    return s.replace(/[“”„‟](?=\s*[:,\]}])/g, '"')
            .replace(/(?<=[{,\[]\s*)[“”„‟]/g, '"');
  }

  function stripComments(s) {
    return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'])\/\/[^\n]*/g, '$1');
  }
  function stripTrailingCommas(s) { return s.replace(/,(\s*[}\]])/g, '$1'); }

  /* Az összes kiegyensúlyozott {...} blokk, string- és escape-tudatosan.
     Azért kell mind, mert a modell gyakran visszaadja a PÉLDÁT is — a
     „legnagyobb blokk nyer" heurisztika akkor rosszat választana. */
  function balancedBlocks(s) {
    var out = [], depth = 0, start = -1, inStr = false, esc = false;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (inStr) {
        if (esc) { esc = false; continue; }
        if (c === '\\') { esc = true; continue; }
        if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') { inStr = true; continue; }
      if (c === '{') { if (depth === 0) start = i; depth++; }
      else if (c === '}') {
        depth--;
        if (depth === 0 && start >= 0) { out.push(s.slice(start, i + 1)); start = -1; }
        if (depth < 0) depth = 0;
      }
    }
    return out;
  }

  /* MINDEN kiegyensúlyozott {…} pár, tetszőleges mélységben.
     Csonka válasznál a külső objektum sosem záródik be, így a fenti,
     csak-legkülső-szintű keresés nem talál semmit — pedig a beágyazott
     állomás-objektumok épek. Verem kell hozzá. */
  function allBalanced(s) {
    var out = [], stack = [], inStr = false, esc = false;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (inStr) {
        if (esc) { esc = false; continue; }
        if (c === '\\') { esc = true; continue; }
        if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') { inStr = true; continue; }
      if (c === '{') stack.push(i);
      else if (c === '}' && stack.length) out.push(s.slice(stack.pop(), i + 1));
    }
    return out;
  }

  function tryParse(txt) {
    var attempts = [
      txt,
      stripTrailingCommas(txt),
      stripComments(txt),
      stripTrailingCommas(stripComments(txt)),
      stripTrailingCommas(stripComments(fixStructuralQuotes(txt)))
    ];
    for (var i = 0; i < attempts.length; i++) {
      try {
        var o = JSON.parse(attempts[i]);
        if (o && typeof o === 'object') return o;
      } catch (e) { /* következő próba */ }
    }
    return null;
  }

  /* mojibake: rosszul másolt UTF-8 magyar szöveg */
  function looksMojibake(s) {
    return /Ã[¡©­³¶ºŒ±]|Å[±‘"]|ï¿½/.test(String(s || ''));
  }

  function extract(raw) {
    var s = preclean(raw);
    if (!s) return { ok: false, err: 'Üres a beillesztett szöveg.' };
    if (s.length > 400000) return { ok: false, err: 'Túl hosszú szöveg — csak a modell válaszát másold be, ne az egész beszélgetést.' };
    if (looksMojibake(s)) {
      return { ok: false, err: 'Kódolási hiba a beillesztett szövegben (a magyar ékezetek sérültek). Másold ki újra a választ.' };
    }

    /* kódblokkok előre: ha van ```json blokk, az a legvalószínűbb */
    var fenced = [];
    s.replace(/```(?:json)?\s*([\s\S]*?)```/g, function (m, inner) { fenced.push(inner); return m; });

    var pool = [];
    fenced.forEach(function (f) { balancedBlocks(f).forEach(function (b) { pool.push(b); }); });
    balancedBlocks(s).forEach(function (b) { pool.push(b); });
    if (!pool.length) pool.push(s);

    var best = null, bestScore = -1;
    pool.forEach(function (blk) {
      var o = tryParse(blk);
      if (!o) return;
      var arr = Array.isArray(o.allomasok) ? o.allomasok
              : (Array.isArray(o.stations) ? o.stations : []);
      /* pontozás: a valódi válasz sok állomást hoz és nem a séma-példa */
      var score = arr.length * 10;
      if (o.version === VERSION) score += 5;
      if (o.intro || o.heroTitle) score += 2;
      /* a promptban lévő PÉLDA felismerése: pont 1 állomás, ismert szöveg */
      if (arr.length === 1 && /viaszpecs/i.test(JSON.stringify(o))) score = -1;
      if (score > bestScore) { bestScore = score; best = o; }
    });

    if (!best) {
      /* MENTÉS CSONKA VÁLASZBÓL: ha a teljes objektum nem záródik be (a modell
         elfogyott félúton), a HIÁNYTALAN állomás-objektumok még kinyerhetők.
         Jobb 14 állomást megmenteni, mint mind a 20-at eldobni. */
      var salvage = [], seenUid = {};
      allBalanced(s).forEach(function (blk) {
        var o = tryParse(blk);
        if (o && !Array.isArray(o) && (o.desc || o.taskShort) && (o.uid || o.n || o.allomas || o.name)) {
          var key = String(o.uid || o.n || o.allomas || o.name);
          if (seenUid[key]) return;      /* egymásba ágyazott találat ne duplázzon */
          seenUid[key] = 1;
          salvage.push(o);
        }
      });
      if (salvage.length) {
        return { ok: true, partial: true, data: { version: VERSION, allomasok: salvage } };
      }
      return { ok: false, err: 'Nem találtam értelmezhető JSON-t a beillesztett szövegben. Másold be a modell válaszát a ```json blokkal együtt.' };
    }
    return { ok: true, data: best };
  }

  /* ===========================================================
     3) ELLENŐRZÉS
     =========================================================== */

  /* csak sima szöveget engedünk be; a vezérlőkaraktereket kivágjuk */
  function cleanText(v) {
    if (v == null) return '';
    if (Array.isArray(v)) v = v.filter(function (x) { return typeof x === 'string'; }).join(' ');
    if (typeof v === 'number') v = String(v);
    if (typeof v !== 'string') return '';
    return v.replace(INVISIBLE, ' ')
            .replace(/[ -]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
  }

  var UNSAFE_KEYS = { __proto__: 1, prototype: 1, constructor: 1 };

  /* évszámok, amikre az adott állomásnál hivatkozni SZABAD */
  function allowedYears(W, st) {
    var f = (W.facts || {})[st.uid] || {};
    var pool = [];
    if (f.year) pool.push(String(f.year));
    (String(f.extract || '').match(/\b(1[0-9]{3}|20[0-2][0-9])\b/g) || [])
      .forEach(function (y) { pool.push(y); });
    if (st.year) pool.push(String(st.year));
    return pool;
  }

  /* Az évszám az ÉPÍTMÉNYHEZ tapad-e, vagy egy szereplőhöz?
     Csak az előbbi érdekel: „1897-ben épült" a csapat számára valós
     adatnak látszik, „1897 telén ideköltözött" viszont nyilvánvalóan
     a kitalált történet része. Heurisztika: építéssel/felavatással
     kapcsolatos ige az évszám ±55 karakteres környezetében.
     Szándékosan szűk: egy figyelmeztetés csak akkor ér valamit, ha ritka. */
  var EPULET_IGE = /(epul|epit|emelt|avat|keszul|atad|restaural|ujjaepit|alapit|tervez|szentel|allitot|faragt|ontott|lebont|leeget|felujit|renoval)/;

  function epuletEvek(text) {
    var s = String(text || '');
    var out = [], re = /\b(1[0-9]{3}|20[0-2][0-9])\b/g, m;
    while ((m = re.exec(s))) {
      var ktx = s.slice(Math.max(0, m.index - 55),
                        Math.min(s.length, m.index + m[0].length + 55));
      if (EPULET_IGE.test(deAcc(ktx).toLowerCase())) {
        out.push({ ev: m[0], ktx: ktx.replace(/\s+/g, ' ').trim() });
      }
    }
    return out;
  }

  /* ALKOTÓ-ÜTKÖZÉS — a kitalálás szabaddá tételének mellékhatása.
     A feladatmotor a VALÓS alkotóból csinál kvízt (pv-tasks.js). Ha a sztori
     mást nevez meg alkotóként, a csapat a helyszínen szemtől szembe lát egy
     ellentmondást: a szöveg X-et mond, a kvíz helyes válasza Y.
     Csak akkor szólunk, ha VAN ismert valós alkotó ÉS a szöveg alkotást állít,
     de nem őt nevezi meg — így ritka és ezért hihető a figyelmeztetés. */
  var ALKOTO_IGE = /(tervezt|faragt|alkott|keszitett|ontott|emlekere|tiszteletere|allitottak fel|emeltek a)/;

  function alkotoUtkozes(W, st, text) {
    var f = (W.facts || {})[st.uid] || {};
    var valos = f.architect || f.creator || f.namedAfter;
    if (!valos || !text) return null;
    if (!ALKOTO_IGE.test(deAcc(String(text)).toLowerCase())) return null;
    /* ha bárhol megnevezi a valódit (akár csak vezetéknévvel), nincs baj */
    var hay = norm(text);
    var reszek = [String(valos)].concat(String(valos).split(/\s+/));
    for (var i = 0; i < reszek.length; i++) {
      var k = norm(reszek[i]);
      if (k.length >= 4 && hay.indexOf(k) >= 0) return null;
    }
    return valos;
  }

  /* szivárgás: benne van-e a helyes válasz a történetben */
  function leaks(text, answers) {
    var hay = ' ' + norm(text) + ' ';
    var hayWords = ' ' + deAcc(String(text || '')).toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
    var found = [];
    (answers || []).forEach(function (a) {
      var k = norm(a);
      if (!k) return;
      if (k.length >= 4) { if (hay.indexOf(k) >= 0) found.push(a); }
      /* rövid válasznál (pl. „7", „hét") csak teljes szóra illesztünk,
         különben minden második mondat hamis riasztás lenne */
      else if (hayWords.indexOf(' ' + k + ' ') >= 0) found.push(a);
    });
    return found;
  }

  /* Az állomás beazonosítása: uid → név → sorszám. A modell mindhármat
     elronthatja, ezért létra, nem egyetlen szigorú egyezés. */
  function matchStation(item, sk, usedIdx) {
    var i, uid = cleanText(item.uid);
    if (uid) {
      for (i = 0; i < sk.length; i++) if (sk[i].uid === uid) return i;
    }
    var nm = norm(item.allomas || item.name || item.station);
    if (nm) {
      for (i = 0; i < sk.length; i++) if (norm(sk[i].name) === nm) return i;
      for (i = 0; i < sk.length; i++) {
        var a = norm(sk[i].name);
        if (a && nm && (a.indexOf(nm) === 0 || nm.indexOf(a) === 0)) return i;
      }
    }
    var n = parseInt(item.n != null ? item.n : item.id, 10);
    if (isFinite(n) && n >= 1 && n <= sk.length && usedIdx.indexOf(n - 1) < 0) return n - 1;
    return -1;
  }

  function validate(W, data, opts) {
    opts = opts || {};
    var sk = W.skeleton || [];
    var taskByStation = {};
    (W.tasks || []).forEach(function (t) { taskByStation[t.station] = t; });

    var res = { rows: [], issues: [], head: {}, matched: 0 };

    /* pálya-egyezés: nehogy egy KORÁBBI beszélgetés válaszát olvasszuk be */
    var echoed = cleanText(data.palya || data.course || data.route);
    if (echoed && W.course && W.course.route && norm(echoed) !== norm(W.course.route)) {
      res.issues.push({ lvl: 'err', msg: 'A válasz egy másik pályához tartozik: „' + echoed +
        '” (itt: „' + W.course.route + '”). Ellenőrizd, a jó beszélgetésből másoltál-e.' });
    }

    if (!opts.batch) {
      var ht = cleanText(data.heroTitle), intro = cleanText(data.intro);
      if (ht && clen(ht) > 60) res.issues.push({ lvl: 'warn', msg: 'A cím hosszú (' + clen(ht) + ' karakter), rövidítsd.' });
      res.head = {
        heroTitle: ht, intro: intro,
        arc: [cleanText(data.arc_igeret), cleanText(data.arc_fordulat), cleanText(data.arc_lezaras)]
               .filter(Boolean).join(' → ')
      };
      if (!intro) res.issues.push({ lvl: 'warn', msg: 'Nem érkezett bevezető szöveg (intro).' });
    }

    var list = Array.isArray(data.allomasok) ? data.allomasok
             : (Array.isArray(data.stations) ? data.stations : null);
    if (!list) {
      /* objektum is jöhet tömb helyett: { "uid": {...} } */
      var src = data.allomasok || data.stations;
      if (src && typeof src === 'object') {
        list = Object.keys(src).map(function (k) {
          var o = src[k] || {};
          if (!o.uid) o.uid = k;
          return o;
        });
      }
    }
    if (!list || !list.length) {
      res.issues.push({ lvl: 'err', msg: 'A válaszban nincs „allomasok" lista.' });
      return res;
    }

    var usedIdx = [];
    list.forEach(function (item, li) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return;
      /* prototípus-szennyezés elleni védelem */
      Object.keys(item).forEach(function (k) { if (UNSAFE_KEYS[k]) delete item[k]; });

      var idx = matchStation(item, sk, usedIdx);
      if (idx < 0) {
        res.issues.push({ lvl: 'warn', msg: (li + 1) + '. elem: nem tudtam beazonosítani („' +
          cleanText(item.allomas || item.name || item.uid || '?') + '”) — kihagyva.' });
        return;
      }
      if (usedIdx.indexOf(idx) >= 0) {
        res.issues.push({ lvl: 'warn', msg: 'A(z) ' + (idx + 1) + '. állomás kétszer szerepel — az elsőt tartottam meg.' });
        return;
      }
      usedIdx.push(idx);

      var st = sk[idx];
      var desc = cleanText(item.desc);
      var short = cleanText(item.taskShort || item.feladat);
      var row = {
        idx: idx, name: st.name, desc: desc, taskShort: short,
        motivum: cleanText(item.motivum || item.thread),
        forras: cleanText(item.forras), flags: []
      };

      if (!desc) row.flags.push({ lvl: 'err', msg: 'Üres leírás.' });
      else if (clen(desc) < 60) row.flags.push({ lvl: 'warn', msg: 'Nagyon rövid leírás (' + clen(desc) + ' karakter).' });
      else if (clen(desc) > 420) row.flags.push({ lvl: 'warn', msg: 'Hosszú leírás (' + clen(desc) + ' karakter) — mobilon sok.' });
      if (short && clen(short) > 140) row.flags.push({ lvl: 'warn', msg: 'Hosszú felszólítás.' });

      /* ÉRZÉS-NÉV ŐR: ha a leírás KIMONDJA a megrendelt érzés nevét, akkor a
         modell megnevezte az érzést ahelyett, hogy előállította volna a
         helyzetet, amitől keletkezik. Ez a leggyakoribb minőségi hiba. */
      if (window.PVE && desc) {
        var ep = PVE.normPlan(W.emotion);
        if (PVE.isComplete(ep)) {
          var hay = norm(desc);
          [ep.base, ep.twist, ep.goal].concat(ep.rise).filter(Boolean).forEach(function (eid) {
            var nm = norm(PVE.nevOf(eid));
            if (nm.length >= 5 && hay.indexOf(nm) >= 0) {
              row.flags.push({ lvl: 'warn', msg: 'A leírás kimondja az érzés nevét („' +
                PVE.nevOf(eid) + '”). Az érzést elő kell idézni, nem megnevezni — írd át olyan helyzetre, amitől keletkezik.' });
            }
          });
        }
      }

      /* ÉVSZÁM-ŐR — szűkítve.
         A kitalálás megengedett: ez játék, a kitalált emberi sors a lényege.
         EGYETLEN dolog marad, amiről szólunk: ha az évszám konkrétan az
         ÉPÍTMÉNYHEZ tapad („1897-ben épült"), mert azt a csapat a helyszínen
         valós adatnak érti és rá is keres. Figyelmeztetés, nem tiltás —
         a szerző dönt. Ha az évszám egy szereplőhöz vagy a keretsztorihoz
         tartozik, néma marad. */
      var ok = allowedYears(W, st);
      epuletEvek(desc).forEach(function (h) {
        if (ok.indexOf(h.ev) < 0) {
          row.flags.push({ lvl: 'warn', fix: true, msg: 'A(z) ' + h.ev + ' évszám az építményhez tapad („…' + h.ktx +
            '…"), és nincs rá forrás. Szereplőhöz kötve szabad — épülethez kötve a csapat valós adatnak fogja érteni.' });
        }
      });

      var utk = alkotoUtkozes(W, st, desc);
      if (utk) {
        row.flags.push({ lvl: 'warn', fix: true, msg: 'A szöveg alkotásról vagy emlékállításról beszél, de nem a valós alkotót („' +
          utk + '”) nevezi meg. A feladatmotor viszont őt fogja helyes válasznak adni — a csapat a helyszínen ' +
          'ellentmondást látna. Vagy nevezd meg őt, vagy ne állítsd, ki csinálta.' });
      }

      /* SZIVÁRGÁS-ŐR: a történet nem árulhatja el a megoldást */
      var task = taskByStation[st.name];
      var lk = leaks(desc + ' ' + short, answersOf(task));
      lk.forEach(function (a) {
        row.flags.push({ lvl: 'err', msg: 'A szöveg elárulja a megoldást: „' + a + '”. ' +
          'Ha ez csak véletlen egybeesés egy kitalált névvel vagy számmal, írd át azt a szót — ' +
          'a szabályt ne lazítsd, mert ez teszi játszhatóvá a feladatot.' });
      });

      /* angol válasz felismerése */
      if (desc && /\b(the|you are|standing|there is)\b/i.test(desc) && !/[áéíóöőúüű]/i.test(desc)) {
        row.flags.push({ lvl: 'err', msg: 'Ez a szöveg nem magyar.' });
      }

      res.rows.push(row);
    });

    res.matched = res.rows.length;
    var expected = opts.batch ? (opts.to - opts.from) : sk.length;
    if (res.matched < expected) {
      res.issues.push({ lvl: 'warn', msg: expected + ' állomásból ' + res.matched +
        ' érkezett meg. A hiányzókat külön is bekérheted.' });
    }
    return res;
  }

  /* ===========================================================
     4) BEOLVASZTÁS — fehérlistásan, visszagörgetéssel
     =========================================================== */
  function merge(W, res, opts) {
    opts = opts || {};
    /* a feladatok SÉRTHETETLENEK: lenyomat előtte-utána */
    var before = JSON.stringify(W.tasks || []);

    (res.rows || []).forEach(function (r) {
      if (opts.skipErrors && r.flags.some(function (f) { return f.lvl === 'err'; })) return;
      var st = W.skeleton[r.idx];
      if (!st) return;
      /* KIZÁRÓLAG ez a két mező írható felül */
      if (r.desc) st.desc = r.desc;
      if (r.taskShort) st.taskShort = r.taskShort;
      if (r.motivum) st.motivum = r.motivum;
    });

    if (res.head) {
      if (res.head.intro) W.intro = res.head.intro;
      if (res.head.arc) W.arc = res.head.arc;
      if (res.head.heroTitle && opts.applyTitle) {
        renameCourse(W, res.head.heroTitle);
      } else if (res.head.heroTitle) {
        W.heroTitle = res.head.heroTitle;
      }
    }

    var after = JSON.stringify(W.tasks || []);
    if (before !== after) {
      return { ok: false, err: 'A beolvasztás módosította volna a feladatokat — visszavontam.' };
    }
    return { ok: true };
  }

  /* A pálya neve HÁROM helyen él (course.route, skeleton[].route,
     tasks[].route). Átnevezés csak együtt, különben szétcsúszik. */
  function renameCourse(W, name) {
    name = cleanText(name);
    if (!name) return false;
    W.course = W.course || {};
    W.course.route = name;
    W.heroTitle = name;
    (W.skeleton || []).forEach(function (s) { s.route = name; });
    (W.tasks || []).forEach(function (t) { t.route = name; });
    return true;
  }

  /* ===========================================================
     5) MENEKÜLŐÚT — sztori MI nélkül
     Szárazabb és történet nélküli, de azonnal kész.
     =========================================================== */
  function fallbackStory(W) {
    var sk = W.skeleton || [];
    var taskByStation = {};
    (W.tasks || []).forEach(function (t) { taskByStation[t.station] = t; });

    var rows = sk.map(function (s, i) {
      var f = (W.facts || {})[s.uid] || {};
      /* A menekülőút SEM árulhatja el a megoldást: ha a feladat épp erre a
         tényre kérdez rá, azt a mondatot ki kell hagyni. Enélkül a sablonos
         változat kiírná pl. az évszámot, amire a kvíz kérdez. */
      var task = taskByStation[s.name];
      var ans = answersOf(task);
      var safe = function (txt) { return leaks(txt, ans).length === 0; };

      var bits = [];
      var first = String(f.extract || '').split(/(?<=[.!?])\s+/)[0] || '';
      if (first && clen(first) > 30 && safe(first)) bits.push(cleanText(first));
      else bits.push('Álljatok meg a(z) ' + s.name + ' előtt, és nézzétek meg alaposan.');

      if (f.year && safe(String(f.year))) bits.push('Évszám, ami ide tartozik: ' + f.year + '.');
      if (f.architect && safe(f.architect)) bits.push('Tervezője: ' + f.architect + '.');
      else if (f.creator && safe(f.creator)) bits.push('Alkotója: ' + f.creator + '.');
      if (i === 0) bits.push('Innen indul a küldetés.');
      if (i === sk.length - 1) bits.push('Ez az utolsó állomás — itt zárul a pálya.');

      var desc = bits.join(' ').slice(0, 400);
      var flags = [];
      leaks(desc, ans).forEach(function (a) {
        flags.push({ lvl: 'err', msg: 'A szöveg elárulja a megoldást: „' + a + '”.' });
      });

      return {
        idx: i, name: s.name, desc: desc,
        taskShort: 'Oldjátok meg az itteni feladatot!',
        motivum: '', forras: '', flags: flags
      };
    });
    return {
      rows: rows, issues: [], matched: rows.length,
      head: {
        heroTitle: (W.course && W.course.route) || '',
        intro: 'Fedezzétek fel ' + ((W.area && W.area.n) || 'a környéket') +
               ' ' + sk.length + ' állomáson át. Minden helyszínen vár egy feladat — a végén összeáll a kép.',
        arc: ''
      }
    };
  }

  return {
    VERSION: VERSION, TONES: TONES,
    buildPrompt: buildPrompt, batchPlan: batchPlan, roleOf: roleOf,
    gaps: gaps, buildGapPrompt: buildGapPrompt,
    extract: extract, validate: validate, merge: merge,
    renameCourse: renameCourse, fallbackStory: fallbackStory,
    _clen: clen, _norm: norm, _cleanText: cleanText, _balancedBlocks: balancedBlocks
  };
})();
