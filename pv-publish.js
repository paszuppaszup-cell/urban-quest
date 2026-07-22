/* ===========================================================
   URBAN QUEST — Ellenőrzés és publikálás (5. lépés)

   A varázsló saját sémában dolgozik, a rendszer többi része viszont
   három MÁS, már élő sémát használ:
     uq_stations_v1  — admin Állomások   (lat/lng STRING, extra mezők)
     uq_tasks_v1     — admin Feladatok   (diff/status/hints/media/badge)
     quest-courses.js + data.js — a publikus, játszható pálya

   Ez a modul fordít közöttük, és előtte mindent leellenőriz.
   =========================================================== */
window.PVP = (function () {
  'use strict';

  var P = window.PV, S = window.PVS;

  /* Magyarország nagyjából ezen a téglalapon belül van — a durván
     elrontott koordináta (pl. felcserélt lat/lng) így kiderül. */
  var HU = { latMin: 45.7, latMax: 48.6, lngMin: 16.0, lngMax: 22.9 };

  function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : d; }

  function slug(s) {
    return String(s || 'palya')
      .replace(/[áàâä]/gi, 'a').replace(/[éèêë]/gi, 'e').replace(/[íìîï]/gi, 'i')
      .replace(/[óòôöő]/gi, 'o').replace(/[úùûüű]/gi, 'u')
      .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'palya';
  }

  /* a helyes válaszok egy feladathoz — szivárgás-ellenőrzéshez */
  function answersOf(t) {
    if (!t || !t.cfg) return [];
    var c = t.cfg, out = [];
    if (Array.isArray(c.options)) c.options.forEach(function (o) { if (o.correct && o.text) out.push(String(o.text)); });
    if (Array.isArray(c.accepted)) c.accepted.forEach(function (a) { out.push(String(a)); });
    if (c.code) out.push(String(c.code));
    if (Array.isArray(c.items)) c.items.forEach(function (x) { out.push(String(x)); });
    return out;
  }

  function nrm(s) {
    return String(s == null ? '' : s)
      .replace(/[áàâä]/gi, 'a').replace(/[éèêë]/gi, 'e').replace(/[íìîï]/gi, 'i')
      .replace(/[óòôöő]/gi, 'o').replace(/[úùûüű]/gi, 'u')
      .toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /* ===========================================================
     TELJES ELLENŐRZÉS
     =========================================================== */
  function fullLint(W) {
    var out = [];
    var add = function (lvl, msg, where) { out.push({ lvl: lvl, msg: msg, where: where || '' }); };

    var sk = (W && W.skeleton) || [];
    var tasks = (W && W.tasks) || [];
    var course = (W && W.course) || {};

    if (!sk.length) { add('err', 'Nincs egyetlen állomás sem.'); return out; }
    if (!String(course.route || '').trim()) add('err', 'A pályának nincs neve.');

    /* ---- állomások ---- */
    var kezdo = sk.filter(function (s) { return s.type === 'kezdo'; }).length;
    var zaro = sk.filter(function (s) { return s.type === 'zaro'; }).length;
    if (kezdo !== 1) add('err', 'Pontosan egy kezdő állomás kell (most ' + kezdo + ').');
    if (zaro !== 1) add('err', 'Pontosan egy záró állomás kell (most ' + zaro + ').');
    if (sk.length < 4) add('warn', 'Négynél kevesebb állomás nagyon rövid pálya.');
    if (sk[0] && sk[0].type !== 'kezdo') add('err', 'Az első állomás nem kezdő típusú.');
    if (sk[sk.length - 1] && sk[sk.length - 1].type !== 'zaro') add('err', 'Az utolsó állomás nem záró típusú.');

    var names = {};
    sk.forEach(function (s, i) {
      var n = (i + 1) + '. ' + s.name;
      var k = nrm(s.name);
      if (names[k]) add('err', 'Két állomás neve azonos: „' + s.name + '”.', n);
      names[k] = 1;

      if (s.weak) add('warn', 'A név az OpenStreetMapből jön, érdemes átírni.', n);
      if (!String(s.desc || '').trim()) add('err', 'Nincs leírása — a játékos üres képernyőt kapna.', n);
      if (!String(s.taskShort || '').trim()) add('warn', 'Nincs rövid felszólítása.', n);

      /* koordináta */
      var la = num(s.lat, NaN), ln = num(s.lng, NaN);
      if (!isFinite(la) || !isFinite(ln)) add('err', 'Hiányzik vagy hibás a koordinátája.', n);
      else if (la < HU.latMin || la > HU.latMax || ln < HU.lngMin || ln > HU.lngMax) {
        add('err', 'A koordináta Magyarországon kívülre esik (' + la + ', ' + ln + ')' +
          (la < ln ? ' — a szélesség és a hosszúság fel van cserélve.' : '.'), n);
      }
      /* Magyarországon a szélesség (~47) MINDIG nagyobb a hosszúságnál (~19),
         így a felcserélt pár akkor is kiderül, ha külön-külön hihetőnek tűnik. */
      else if (la < ln) {
        add('err', 'A szélesség kisebb a hosszúságnál — a két koordináta fel van cserélve.', n);
      }
      /* a tizedesvessző a parseFloat miatt csendben csonkulna (47,49 → 47) */
      if (/,/.test(String(s.lat) + String(s.lng))) {
        add('err', 'A koordinátában tizedesvessző van pont helyett — a rendszer csonkolná.', n);
      }
      /* rossz OpenStreetMap-találat: azonos nevű hely másik városrészben */
      if (W.area && isFinite(la) && isFinite(ln)) {
        var dd = P.dist(W.area.lat, W.area.lng, la, ln);
        if (dd > 3000) add('warn', P.fmtDist(dd) + '-re esik a keresési területtől — biztosan a jó helyszín került be?', n);
      }
    });

    /* Két állomás egymáson: a helyszínen megkülönböztethetetlen, és a
       GPS sem tudja szétválasztani őket. Nem csak a szomszédokat nézzük. */
    for (var a = 0; a < sk.length; a++) {
      for (var b = a + 1; b < sk.length; b++) {
        var d2 = P.dist(num(sk[a].lat, 0), num(sk[a].lng, 0), num(sk[b].lat, 0), num(sk[b].lng, 0));
        if (d2 < 25) {
          add('err', '„' + sk[a].name + '” és „' + sk[b].name + '” mindössze ' + Math.round(d2) +
              ' m-re van egymástól — a helyszínen ez egyetlen pontnak látszik.');
        }
      }
    }

    /* Döntési pont a pálya végén: a játékmotor a következő KÉT állomást
       kínálja fel (jatszas.js:662). Ha nincs kettő hátra, a csapat
       „Döntési pont” feliratot lát, de nem kap választást. */
    sk.forEach(function (s, i) {
      if (s.type === 'dontes' && i >= sk.length - 2) {
        add('err', 'Döntési pont, de nincs mögötte két állomás — az elágazás elmarad, a játékos mégis azt várná.',
            (i + 1) + '. ' + s.name);
      }
    });

    /* A kezdő állomáshoz kell utcai cím: ez az egyetlen pont, ahová a
       játék még nem tudja elvezetni a csapatot. */
    var kezdoSt = sk.filter(function (s) { return s.type === 'kezdo'; })[0];
    if (kezdoSt && !String(kezdoSt.loc || '').trim()) {
      add('warn', 'A kezdő állomásnak nincs utcai címe — a csapat nem tudja, hol találkozzon.', '1. ' + kezdoSt.name);
    }

    /* ---- szakaszok ---- */
    var st = P.routeStats(sk, !!course.loop);
    st.legs.forEach(function (d, i) {
      var lbl = (course.loop && i === sk.length - 1)
        ? (i + 1) + '. állomás → vissza az indulóhoz' : (i + 1) + '. → ' + (i + 2) + '. állomás';
      if (d > 1800) add('err', lbl + ': ' + P.fmtDist(d) + ' — ez már nem sétatáv.');
      else if (d > 900) add('warn', lbl + ': ' + P.fmtDist(d) + ' séta, ez sok.');
      if (d < 40) add('warn', lbl + ': mindössze ' + P.fmtDist(d) + ' — a két állomás szinte egy helyen van.');
    });

    /* ---- feladatok ---- */
    var byStation = {};
    tasks.forEach(function (t) { (byStation[t.station] = byStation[t.station] || []).push(t); });

    sk.forEach(function (s, i) {
      var n = (i + 1) + '. ' + s.name;
      var list = byStation[s.name] || [];
      if (!list.length) { add('err', 'Ehhez az állomáshoz nem tartozik feladat.', n); return; }
      if (list.length > 1) add('warn', list.length + ' feladat tartozik hozzá — a játékmotor csak az elsőt használja.', n);

      var t = list[0];
      if (!String(t.question || '').trim()) add('err', 'A feladat szövege üres.', n);
      if (!(t.points > 0)) add('warn', 'A feladat 0 pontot ér.', n);

      var c = t.cfg || {};
      if (t.type === 'kviz') {
        var opts = Array.isArray(c.options) ? c.options : [];
        if (opts.length < 2) add('err', 'A kvíznek legalább két válasza kell.', n);
        var good = opts.filter(function (o) { return o.correct; }).length;
        if (good !== 1) add('err', 'A kvíznél pontosan egy helyes válasz kell (most ' + good + ').', n);
        if (opts.some(function (o) { return !String(o.text || '').trim(); })) add('err', 'Üres válaszlehetőség.', n);
        /* azonos értelmű opciók — ez a legalattomosabb hiba: a játékos
           jó választ ad, mégis hibásnak számít */
        var seen = {};
        opts.forEach(function (o) {
          var k = nrm(o.text);
          if (k && seen[k]) add('err', 'Két azonos válaszlehetőség: „' + o.text + '”.', n);
          seen[k] = 1;
        });
      }
      else if (t.type === 'szoveg') {
        var acc = (c.accepted || []).filter(function (a) { return String(a).trim(); });
        if (!acc.length) add('err', 'A szöveges feladatnak nincs elfogadott válasza.', n);
        if (acc.length === 1 && !c.tolerant) {
          add('warn', 'Egyetlen, pontos egyezést váró válasz — elgépelésnél igazságtalan.', n);
        }
      }
      else if (t.type === 'kod') {
        if (!String(c.code || '').trim()) add('err', 'A kódfeladatnak nincs kódja.', n);
        else if (String(c.code).length < 3) add('warn', 'Nagyon rövid kód — véletlenül is eltalálható.', n);
      }
      else if (t.type === 'gps') {
        var gl = num(c.lat, NaN), gg = num(c.lng, NaN);
        if (!isFinite(gl) || !isFinite(gg)) add('err', 'A GPS-feladatnak nincs érvényes célpontja.', n);
        else {
          /* a célpont elcsúszhat magától az állomástól — akkor a csapatot
             máshová küldi, mint amit a leírás mond */
          var drift = P.dist(gl, gg, num(s.lat, 0), num(s.lng, 0));
          if (drift > 60) add('err', 'A GPS-célpont ' + Math.round(drift) +
            ' m-re van magától az állomástól — a csapat máshová menne.', n);
        }
        var r = num(c.radius, 0);
        /* A telefon városi környezetben, házak között rendszeresen 20 m-t
           téved. Ennél szűkebb sugárnál a jó helyen álló csapat is elakad. */
        if (r < 20) add('err', 'A GPS-sugár ' + r + ' m — a telefon a házak között ennyit simán téved, a csapat a jó ponton állva sem tudná igazolni magát.', n);
        else if (r < 25) add('warn', 'A GPS-sugár ' + r + ' m, szűk városi utcában kevés lehet.', n);
        else {
          /* ha a sugár átfedi a szomszéd állomást, a feladat onnan is
             teljesíthető — a helyszínt meg sem nézik */
          var nearest = Infinity;
          sk.forEach(function (o) {
            if (o === s) return;
            var dz = P.dist(num(s.lat, 0), num(s.lng, 0), num(o.lat, 0), num(o.lng, 0));
            if (dz < nearest) nearest = dz;
          });
          if (isFinite(nearest) && r >= nearest * 0.8) {
            add('err', 'A GPS-sugár (' + r + ' m) eléri a szomszéd állomást (' + Math.round(nearest) +
              ' m) — a feladat rossz helyről is teljesíthető.', n);
          } else if (r > 150) add('warn', 'A GPS-sugár ' + r + ' m, ez nagyon megengedő.', n);
        }
      }
      else if (t.type === 'puzzle') {
        var items = (c.items || []).filter(function (x) { return String(x).trim(); });
        if (items.length < 3) add('err', 'A kirakóhoz legalább három elem kell.', n);
      }
      else if (t.type === 'foto') {
        if (!String(c.instruction || '').trim()) add('warn', 'Nincs útmutató a fotóhoz.', n);
      }

      /* SZIVÁRGÁS: a történet nem árulhatja el a saját feladata megoldását */
      if (S) {
        var hay = String(s.desc || '') + ' ' + String(s.taskShort || '');
        answersOf(t).forEach(function (a) {
          var k = nrm(a);
          if (!k) return;
          var hit = k.length >= 4
            ? nrm(hay).indexOf(k) >= 0
            : (' ' + hay.toLowerCase().replace(/[^a-z0-9áéíóöőúüű]+/g, ' ') + ' ').indexOf(' ' + String(a).toLowerCase() + ' ') >= 0;
          if (hit) add('err', 'Az állomás szövege elárulja a megoldást: „' + a + '”.', n);
        });
      }
    });

    /* ÁRVA FELADAT: a játékmotor BETŰ SZERINT egyezteti a feladatot az
       állomásnévvel. Egyetlen szóköz vagy kisbetű-eltérés elég ahhoz, hogy
       a feladat sose jelenjen meg — az állomás némán üres marad. */
    tasks.forEach(function (t) {
      if (sk.some(function (s) { return s.name === t.station; })) return;
      var közeli = sk.filter(function (s) {
        return String(s.name).trim().toLowerCase() === String(t.station || '').trim().toLowerCase();
      })[0];
      add('err', 'A(z) „' + String(t.question || '').slice(0, 40) + '…” feladat állomásneve („' +
        t.station + '”) ' + (közeli ? 'csak szóköz/kisbetű eltérésben' : 'egyáltalán nem') +
        ' egyezik egyik állomással sem — a feladat sosem jelenne meg.');
    });

    /* ---- keresztellenőrzés: más állomás megoldása ---- */
    sk.forEach(function (s, i) {
      var mine = (byStation[s.name] || [])[0];
      var hay = nrm(String(s.desc || '') + ' ' + String(s.taskShort || ''));
      sk.forEach(function (o, j) {
        if (i === j) return;
        var ot = (byStation[o.name] || [])[0];
        if (!ot || ot === mine) return;
        answersOf(ot).forEach(function (a) {
          var k = nrm(a);
          if (k.length >= 5 && hay.indexOf(k) >= 0) {
            add('warn', 'A szövege tartalmazza a(z) ' + (j + 1) + '. állomás megoldását: „' + a + '”.', (i + 1) + '. ' + s.name);
          }
        });
      });
    });

    if (!String(W.intro || '').trim()) add('warn', 'Nincs bevezető szöveg a pályához.');

    /* ELSZAKADT MOTÍVUMLÁNC: ha egy állomás szövege kimaradt, az utána
       következő olyasmire hivatkozik, amit a játékos sosem látott.
       Ezt magától senki nem venné észre — a szöveg önmagában hibátlan. */
    sk.forEach(function (s, i) {
      if (i === 0) return;
      var prev = sk[i - 1];
      if (!String(s.desc || '').trim()) return;
      if (String(prev.desc || '').trim()) return;
      add('warn', 'Az előző állomás szövege hiányzik, de ez a leírás rá hivatkozik („' +
        String(s.desc).slice(0, 40) + '…”) — a játékos nem érti majd, mire utal.',
        (i + 1) + '. ' + s.name);
    });

    return out;
  }

  /* ===========================================================
     SÉMA-FORDÍTÁS
     =========================================================== */

  /* A cél-séma STRINGként tárolja a koordinátát — a varázslóban szám.
     6 tizedes ≈ 0,1 m, ennél többre nincs szükség. */
  function coord(v) { return String(num(v, 0).toFixed(6)).replace(/0+$/, '').replace(/\.$/, ''); }

  function toStations(W, startId) {
    var course = W.course || {};
    var byStation = {};
    (W.tasks || []).forEach(function (t) { byStation[t.station] = (byStation[t.station] || 0) + 1; });
    var id = startId || 1;
    return (W.skeleton || []).map(function (s) {
      return {
        id: id++,
        name: s.name,
        route: course.route || s.route,
        type: s.type,
        diff: s.diff,
        tasks: byStation[s.name] || 0,
        loc: s.loc || '',
        lat: coord(s.lat),
        lng: coord(s.lng),
        status: 'active',
        allLangs: ['hu'],
        time: false,
        timeVal: '5 perc',
        desc: s.desc || '',
        taskShort: s.taskShort || ''
      };
    });
  }

  /* `startId` KÖTELEZŐ. Élesben megfogott hiba: az állomások és a játékok
     kaptak azonosítót, a feladatok nem — az admin Feladatok oldala pedig
     id alapján kezeli a sorokat, így a varázslóval készült feladatok
     SOHA nem jelentek meg ott. A pálya játszható volt, csak láthatatlan. */
  function toTasks(W, startId) {
    var course = W.course || {};
    var id = startId || 1;
    var diffOf = {};
    (W.skeleton || []).forEach(function (s) { diffOf[s.name] = s.diff; });
    return (W.tasks || []).map(function (t) {
      return {
        id: id++,
        question: t.question,
        station: t.station,
        route: course.route || t.route,
        type: t.type,
        points: t.points,
        diff: diffOf[t.station] || 'Közepes',
        status: 'active',
        media: t.image || '',
        hints: [],
        badge: '',
        cfg: t.cfg
      };
    });
  }

  /* A Játékok oldal kártyájához szükséges teljes objektum.
     Ami itt hiányzik, az a kártyán üres helyként jelenik meg — ezért
     inkább adunk értelmes alapértéket, mint hogy kihagyjuk a mezőt. */
  function toGame(W, id) {
    var c = W.course || {};
    var sk = W.skeleton || [];
    var st = (P.routeStats && sk.length > 1) ? P.routeStats(sk, !!c.loop) : { total: 0, walkMin: 0 };
    /* solveMinutes a TELJES listát várja, nem egy állomást */
    var solveMin = P.solveMinutes ? P.solveMinutes(sk) : sk.length * 5;
    var oraTol = Math.max(1, Math.round((st.walkMin + solveMin) / 60));
    var intro = (W.intro || '').trim();
    var elsoMondat = intro.split(/(?<=[.!?])\s/)[0] || ('Városi kaland: ' + route(c));

    function route(x) { return x.route || ''; }

    return {
      id: id, thumb: ((id % 6) + 1),
      name: c.route || '',
      desc: elsoMondat,
      longDesc: intro || elsoMondat,
      subtitle: elsoMondat,
      diff: c.level || 'Közepes',
      dur: oraTol + '–' + (oraTol + 1) + ' óra',
      loc: 'Budapest' + ((W.area && W.area.n) ? ', ' + W.area.n : ''),
      distance: (st.total / 1000).toFixed(1) + ' km',
      langs: ['hu'], allLangs: ['hu'], more: 0,
      status: 'pub', price: '', age: '12+', team: '2–6 fő',
      image: '', rating: 0, reviews: 0, category: 'varosi',
      doList: ['Valós helyszínek felfedezése', 'Feladatok megoldása a helyszínen', 'Közös döntések'],
      knowList: [sk.length + ' állomás', (st.total / 1000).toFixed(1) + ' km séta', (c.level || 'Közepes') + ' nehézség']
    };
  }

  /* ===========================================================
     PUBLIKÁLÁS AZ ADMIN FELÜLETRE (localStorage)
     Idempotens: ugyanazzal a pályanévvel újra futtatva CSERÉL, nem duplikál.
     =========================================================== */
  function publishToAdmin(W) {
    var route = (W.course && W.course.route) || '';
    if (!route) return { ok: false, err: 'A pályának nincs neve.' };

    var prevStations = P.lsGet('uq_stations_v1', []);
    var prevTasks = P.lsGet('uq_tasks_v1', []);
    var prevGames = P.lsGet('uq_games_v1', []);
    if (!Array.isArray(prevStations)) prevStations = [];
    if (!Array.isArray(prevTasks)) prevTasks = [];
    if (!Array.isArray(prevGames)) prevGames = [];

    /* mentés visszaállításhoz, ha a kvóta közben elfogy */
    var backup = {
      s: JSON.stringify(prevStations), t: JSON.stringify(prevTasks), g: JSON.stringify(prevGames)
    };

    var hadBefore = prevStations.some(function (s) { return s.route === route; });

    /* a pálya korábbi állomásait/feladatait kivesszük — így az újrapublikálás
       frissít, nem pedig megkettőz */
    var keptStations = prevStations.filter(function (s) { return s.route !== route; });
    var keptTasks = prevTasks.filter(function (t) { return t.route !== route; });

    var maxId = keptStations.reduce(function (m, s) { return Math.max(m, s.id || 0); }, 0);
    var maxTaskId = keptTasks.reduce(function (m, t) { return Math.max(m, t.id || 0); }, 0);
    var newStations = keptStations.concat(toStations(W, maxId + 1));
    var newTasks = keptTasks.concat(toTasks(W, maxTaskId + 1));

    /* A Játékok oldal a TELJES listát lecseréli erre a tömbre, és 15 mezőt
       vár egy kártyához. Korábban ide csak `{id, name}` került, ezért az
       első publikálás után a Játékok oldal ÜRESEN maradt — a pálya
       játszható volt, de a listában nyoma sem volt. */
    var games = prevGames.slice();
    var gid = games.reduce(function (m, g) { return Math.max(m, (g && g.id) || 0); }, 0) + 1;
    var ujJatek = toGame(W, gid);
    var hol = -1;
    games.forEach(function (g, i) {
      if ((typeof g === 'string' ? g : g && g.name) === route) hol = i;
    });
    if (hol >= 0) { ujJatek.id = games[hol].id || gid; games[hol] = ujJatek; }
    else games.push(ujJatek);

    if (!P.lsSet('uq_stations_v1', newStations)) return restore('Nem fért el a tárban (állomások).');
    if (!P.lsSet('uq_tasks_v1', newTasks)) return restore('Nem fért el a tárban (feladatok).');
    if (!P.lsSet('uq_games_v1', games)) return restore('Nem fért el a tárban (játékok).');

    return {
      ok: true, replaced: hadBefore,
      stations: newStations.length - keptStations.length,
      tasks: newTasks.length - keptTasks.length,
      route: route
    };

    function restore(msg) {
      try {
        localStorage.setItem('uq_stations_v1', backup.s);
        localStorage.setItem('uq_tasks_v1', backup.t);
        localStorage.setItem('uq_games_v1', backup.g);
      } catch (e) { /* ha ez sem megy, már nincs mit tenni */ }
      return { ok: false, err: msg + ' A korábbi állapotot visszaállítottam.' };
    }
  }

  /* van-e már ilyen nevű pálya, amit NEM ez a varázsló csinált */
  function nameConflict(W) {
    var route = (W.course && W.course.route) || '';
    var games = P.lsGet('uq_games_v1', []);
    if (!Array.isArray(games)) return false;
    return games.some(function (g) {
      return (typeof g === 'string' ? g : g && g.name) === route;
    });
  }

  /* ===========================================================
     KÓDRÉSZLET A PUBLIKUS FÁJLOKHOZ
     =========================================================== */
  function jsStr(s) {
    return "'" + String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
      .replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() + "'";
  }

  function questCourseSnippet(W) {
    var course = W.course || {};
    var id = slug(W.heroTitle || course.route);
    var L = [];
    L.push('  /* ---- ' + (course.route || '') + ' — a varázsló generálta ---- */');
    L.push('  ' + id + ': {');
    L.push('    title: ' + jsStr(W.heroTitle || course.route) + ',');
    L.push('    stations: [');
    toStations(W).forEach(function (s, i, arr) {
      L.push('      { name: ' + jsStr(s.name) + ', route: ' + jsStr(s.route) +
             ', type: ' + jsStr(s.type) + ', diff: ' + jsStr(s.diff) + ',');
      L.push('        loc: ' + jsStr(s.loc) + ', lat: ' + jsStr(s.lat) + ', lng: ' + jsStr(s.lng) + ',');
      L.push('        desc: ' + jsStr(s.desc) + ',');
      L.push('        taskShort: ' + jsStr(s.taskShort) + ' }' + (i < arr.length - 1 ? ',' : ''));
    });
    L.push('    ],');
    L.push('    tasks: [');
    toTasks(W).forEach(function (t, i, arr) {
      L.push('      { question: ' + jsStr(t.question) + ', station: ' + jsStr(t.station) +
             ', route: ' + jsStr(t.route) + ', type: ' + jsStr(t.type) + ', points: ' + t.points + ',');
      L.push('        cfg: ' + JSON.stringify(t.cfg) + ' }' + (i < arr.length - 1 ? ',' : ''));
    });
    L.push('    ]');
    L.push('  }');
    return { id: id, code: L.join('\n') };
  }

  /* a publikus kártya (data.js → window.QUESTS) */
  function questCardSnippet(W) {
    var course = W.course || {};
    var id = slug(W.heroTitle || course.route);
    var sk = W.skeleton || [];
    var st = P.routeStats(sk, !!course.loop);
    var mins = st.walkMin + P.solveMinutes(sk);
    var diffKey = { 'Könnyű': 'konnyu', 'Közepes': 'kozepes', 'Nehéz': 'nehez' }[course.level] || 'kozepes';
    var first = sk[0] || {};

    var L = [];
    L.push('  /* ---- ' + (course.route || '') + ' — a varázsló generálta ---- */');
    L.push('  ' + id + ': {');
    L.push('    id: ' + jsStr(id) + ',');
    L.push("    cat: 'Városi', catCls: 'varosi',");
    L.push('    diff: ' + jsStr(diffKey) + ', diffLabel: ' + jsStr(course.level || 'Közepes') +
           ', diffScore: ' + jsStr((diffKey === 'konnyu' ? '2/5 könnyű' : diffKey === 'nehez' ? '4/5 nehéz' : '3/5 közepes')) + ',');
    L.push("    audience: 'Csapatoknak',");
    L.push('    title: ' + jsStr(W.heroTitle || course.route) + ',');
    L.push('    heroTitle: ' + jsStr(W.heroTitle || course.route) + ',');
    L.push("    subtitle: 'TÖLTSD KI — rövid, hívogató alcím',");
    L.push('    desc: ' + jsStr(W.intro || '') + ',');
    L.push('    duration: ' + jsStr(P.fmtMin(mins)) + ', distance: ' + jsStr((st.total / 1000).toFixed(1).replace('.', ',') + ' km') +
           ", team: '2–6 fő', age: '8+ év',");
    L.push("    langs: ['hu'], price: 'INGYENES', rating: 5, reviews: 0,");
    L.push("    image: 'assets/quest-varnegyed.svg',   /* cseréld sajátra */");
    L.push('    filters: { nehezseg: ' + jsStr(diffKey) + ", kategoria: 'varosi', helyszin: 'buda', csoport: '2-6', idotartam: 'kozep' },");
    L.push('    about: ' + jsStr(W.arc || W.intro || '') + ',');
    L.push("    doList: ['Rejtvények megfejtése a helyszínen', 'Fotófeladatok', 'Nyomok felkutatása'],");
    L.push("    knowList: ['Kényelmes sétával teljesíthető', 'Bármikor megállhattok', 'Családbarát útvonal'],");
    L.push('    locCity: ' + jsStr((W.area && W.area.n) || 'Budapest') + ', startPoint: ' + jsStr(first.name || '') +
           ', startAddr: ' + jsStr(first.loc || '') + ',');
    L.push("    teamText: 'Kiválóan alkalmas családoknak és baráti társaságoknak.', teamPill: '2–6 fő (ideális)'");
    L.push('  }');
    return { id: id, code: L.join('\n') };
  }

  /* ===========================================================
     ÖSSZEFOGLALÓ ADATOK
     =========================================================== */
  function summary(W) {
    var sk = W.skeleton || [];
    var course = W.course || {};
    var st = P.routeStats(sk, !!course.loop);
    var solve = P.solveMinutes(sk);
    return {
      route: course.route || '',
      stations: sk.length,
      tasks: (W.tasks || []).length,
      points: (W.tasks || []).reduce(function (a, t) { return a + (t.points || 0); }, 0),
      distance: st.total,
      minutes: st.walkMin + solve,
      withStory: sk.filter(function (s) { return String(s.desc || '').trim(); }).length,
      withImage: (W.tasks || []).filter(function (t) { return t.image; }).length
    };
  }

  return {
    fullLint: fullLint, summary: summary,
    toStations: toStations, toTasks: toTasks,
    publishToAdmin: publishToAdmin, nameConflict: nameConflict,
    questCourseSnippet: questCourseSnippet, questCardSnippet: questCardSnippet,
    slug: slug
  };
})();
