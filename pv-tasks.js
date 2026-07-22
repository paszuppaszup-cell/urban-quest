/* ===========================================================
   URBAN QUEST — Feladatmotor (3. lépés)

   Három forrásréteg, egyértelműen megkülönböztetve:
     A) Wikidata  — strukturált, MEGBÍZHATÓ, de ritka
     B) Wikipédia — gazdag szöveg, de kinyert tény ELLENŐRZENDŐ
     C) Általános — mindig működik, nem igényel adatot

   Minden generált feladat magával hozza, HONNAN jön (`src`), és
   szöveges kinyerésnél a forrásmondatot is (`evidence`).
   =========================================================== */
window.PVT = (function () {
  'use strict';

  var WD_API = 'https://www.wikidata.org/w/api.php';
  var WP_API = 'https://hu.wikipedia.org/w/api.php';

  /* ---------- ékezettelenítés (kódfeladatokhoz) ---------- */
  function deAccent(s) {
    var m = { 'á':'a','é':'e','í':'i','ó':'o','ö':'o','ő':'o','ú':'u','ü':'u','ű':'u',
              'Á':'A','É':'E','Í':'I','Ó':'O','Ö':'O','Ő':'O','Ú':'U','Ü':'U','Ű':'U' };
    return String(s).replace(/[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/g, function (c) { return m[c]; });
  }

  function shuffle(a, seed) {
    /* determinisztikus keverés — ugyanaz a pálya ugyanazt adja újratöltéskor */
    var arr = a.slice(), s = seed || 1;
    for (var i = arr.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      var j = Math.floor((s / 233280) * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /* ===========================================================
     ADATLEKÉRÉS
     =========================================================== */
  function jsonp(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function chunk(arr, n) {
    var out = [];
    for (var i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
  }

  /* Wikidata időformátum: "+1907-00-00T00:00:00Z" → "1907" */
  function wdYear(claim) {
    try {
      var t = claim[0].mainsnak.datavalue.value.time;
      var m = t.match(/^[+-](\d{4})/);
      return m ? m[1] : '';
    } catch (e) { return ''; }
  }
  function wdEntity(claim) {
    try { return claim[0].mainsnak.datavalue.value.id; } catch (e) { return ''; }
  }
  function wdAmount(claim) {
    try { return String(claim[0].mainsnak.datavalue.value.amount).replace('+', ''); }
    catch (e) { return ''; }
  }
  function wdString(claim) {
    try { return claim[0].mainsnak.datavalue.value; } catch (e) { return ''; }
  }

  var PROPS = {
    P571: 'year',        /* létrehozás/építés éve   */
    P84:  'architect',   /* építész                 */
    P170: 'creator',     /* alkotó (szobor)         */
    P138: 'namedAfter',  /* kiről nevezték el       */
    P149: 'style',       /* építészeti stílus       */
    P131: 'district',    /* közigazgatási egység    */
    P31:  'kind',        /* mi ez (típus)           */
    P2048:'height',      /* magasság                */
    P18:  'image'        /* kép                     */
  };

  /* referenciák (Q-azonosítók) feloldása emberi címkékre */
  var REF_PROPS = ['architect', 'creator', 'namedAfter', 'style', 'district', 'kind'];

  function fetchWikidata(qids) {
    if (!qids.length) return Promise.resolve({});
    var raw = {};
    return Promise.all(chunk(qids, 45).map(function (part) {
      return jsonp(WD_API + '?action=wbgetentities&ids=' + part.join('|') +
                   '&props=claims&format=json&origin=*')
        .then(function (j) {
          Object.keys(j.entities || {}).forEach(function (q) {
            var c = j.entities[q].claims || {}, f = {};
            Object.keys(PROPS).forEach(function (p) {
              if (!c[p]) return;
              var key = PROPS[p];
              if (p === 'P571') f[key] = wdYear(c[p]);
              else if (p === 'P2048') f[key] = wdAmount(c[p]);
              else if (p === 'P18') f[key] = wdString(c[p]);
              else f[key] = wdEntity(c[p]);
            });
            raw[q] = f;
          });
        });
    })).then(function () {
      /* második kör: a hivatkozott entitások magyar címkéi */
      var refs = {};
      Object.keys(raw).forEach(function (q) {
        REF_PROPS.forEach(function (k) {
          if (raw[q][k] && /^Q\d+$/.test(raw[q][k])) refs[raw[q][k]] = 1;
        });
      });
      var list = Object.keys(refs);
      if (!list.length) return raw;

      return Promise.all(chunk(list, 45).map(function (part) {
        return jsonp(WD_API + '?action=wbgetentities&ids=' + part.join('|') +
                     '&props=labels&languages=hu|en&format=json&origin=*')
          .then(function (j) {
            Object.keys(j.entities || {}).forEach(function (q) {
              var l = j.entities[q].labels || {};
              refs[q] = (l.hu || l.en || {}).value || '';
            });
          });
      })).then(function () {
        Object.keys(raw).forEach(function (q) {
          REF_PROPS.forEach(function (k) {
            if (raw[q][k] && refs[raw[q][k]]) raw[q][k] = refs[raw[q][k]];
            else if (raw[q][k] && /^Q\d+$/.test(raw[q][k])) raw[q][k] = '';
          });
        });
        return raw;
      });
    });
  }

  function fetchWikipedia(titles) {
    if (!titles.length) return Promise.resolve({});
    var out = {};
    return Promise.all(chunk(titles, 20).map(function (part) {
      return jsonp(WP_API + '?action=query&prop=extracts|pageimages&exintro=1&explaintext=1' +
                   '&redirects=1&titles=' + encodeURIComponent(part.join('|')) +
                   '&format=json&origin=*&pithumbsize=600')
        .then(function (j) {
          var pages = (j.query && j.query.pages) || {};
          /* a redirects miatt cím szerint és normalizált cím szerint is eltesszük */
          Object.keys(pages).forEach(function (k) {
            var p = pages[k];
            if (!p.title) return;
            out[p.title] = {
              extract: p.extract || '',
              thumb: (p.thumbnail && p.thumbnail.source) || ''
            };
          });
          ((j.query && j.query.normalized) || []).forEach(function (n) {
            if (out[n.to]) out[n.from] = out[n.to];
          });
          ((j.query && j.query.redirects) || []).forEach(function (r) {
            if (out[r.to]) out[r.from] = out[r.to];
          });
        });
    })).then(function () { return out; });
  }

  /* Szövegből évszám: csak akkor fogadjuk el, ha ÉPÍTÉSRE utaló szó
     áll mellette. Az eredményt mindig ELLENŐRZENDŐNEK jelöljük. */
  function yearFromText(text) {
    if (!text) return null;
    var sentences = text.split(/(?<=[.!?])\s+/);
    var re = /\b(1[0-9]{3}|20[0-2][0-9])\b/;
    var hint = /(épült|építették|emelték|alapították|készült|avatták|átadták|nyílt|feltalál)/i;
    for (var i = 0; i < sentences.length; i++) {
      if (!hint.test(sentences[i])) continue;
      var m = sentences[i].match(re);
      if (m) return { year: m[1], sentence: sentences[i].trim() };
    }
    return null;
  }

  function commonsUrl(file) {
    if (!file) return '';
    return 'https://commons.wikimedia.org/wiki/Special:FilePath/' +
           encodeURIComponent(file) + '?width=600';
  }

  /* Nyilvános belépő: minden állomáshoz összeszedi a tényeket. */
  function fetchFacts(stations) {
    var qids = [], titles = [];
    stations.forEach(function (s) {
      if (s.wikidata && /^Q\d+$/.test(s.wikidata)) qids.push(s.wikidata);
      if (s.wiki) titles.push(String(s.wiki).replace(/^[a-z]{2}:/, ''));
    });

    return Promise.all([
      fetchWikidata(qids).catch(function () { return {}; }),
      fetchWikipedia(titles).catch(function () { return {}; })
    ]).then(function (res) {
      var wd = res[0], wp = res[1], out = {};
      stations.forEach(function (s) {
        var f = {};
        var w = s.wikidata && wd[s.wikidata];
        if (w) {
          Object.keys(w).forEach(function (k) { if (w[k]) f[k] = w[k]; });
          if (f.year) f.yearSrc = 'wikidata';
          if (f.image) f.imageUrl = commonsUrl(f.image);
        }
        var title = s.wiki ? String(s.wiki).replace(/^[a-z]{2}:/, '') : '';
        var page = title && wp[title];
        if (page) {
          f.extract = page.extract || '';
          if (!f.imageUrl && page.thumb) f.imageUrl = page.thumb;
          if (!f.year) {
            var y = yearFromText(page.extract);
            if (y) { f.year = y.year; f.yearSrc = 'text'; f.yearEvidence = y.sentence; }
          }
        }
        out[s.uid] = f;
      });
      return out;
    });
  }

  /* ===========================================================
     ELTERELŐ VÁLASZOK
     =========================================================== */
  var HU_EPITESZ = ['Ybl Miklós', 'Lechner Ödön', 'Hild József', 'Steindl Imre',
                    'Pollack Mihály', 'Hauszmann Alajos', 'Alpár Ignác', 'Feszl Frigyes'];
  var HU_SZOBRASZ = ['Stróbl Alajos', 'Zala György', 'Ferenczy Béni',
                     'Medgyessy Ferenc', 'Kisfaludi Strobl Zsigmond', 'Borsos Miklós'];
  var STILUSOK = ['barokk', 'klasszicista', 'neogótikus', 'szecessziós',
                  'neoreneszánsz', 'romantikus', 'modern'];
  var KERULETEK = ['I. kerület', 'II. kerület', 'V. kerület', 'VI. kerület',
                   'VII. kerület', 'VIII. kerület', 'XI. kerület', 'XIII. kerület'];

  function fakeYears(year, seed) {
    var y = parseInt(year, 10);
    var offs = [-37, 22, -14, 41, -58, 29];
    var out = [];
    for (var i = 0; i < offs.length && out.length < 3; i++) {
      var v = y + offs[(i + (seed || 0)) % offs.length];
      if (v > 1000 && v <= 2026 && v !== y && out.indexOf(String(v)) < 0) out.push(String(v));
    }
    while (out.length < 3) out.push(String(y - 100 - out.length * 13));
    return out;
  }

  /* Összehasonlítási kulcs: kisbetű, ékezet nélkül, csak betű+szám.
     ENÉLKÜL a „Budapest I. kerülete” és az „I. kerület” két külön
     válasznak látszik, holott ugyanaz — és a játékos jó válaszát
     hibásnak jelölnénk. */
  function key(s) {
    return deAccent(String(s || '')).toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  /* CSAK normalizált egyezés — a tartalmazás-vizsgálat csábító, de hibás:
     a „II. kerület” betű szerint tartalmazza az „I. kerület”-et, így jó
     elterelőket dobna ki. Az eltérő írásmódokat inkább forrásoldalon
     hozzuk közös alakra (lásd normDistrict). */
  function sameAnswer(a, b) {
    var ka = key(a), kb = key(b);
    return !!ka && !!kb && ka === kb;
  }

  /* „Budapest I. kerülete” → „I. kerület” — egységes alak, hogy az
     elterelőkkel összevethető legyen */
  /* Csak akkor szabad kerületet kérdezni, ha TÉNYLEG van római számos
     kerület. Élesben megfogott hiba: a Margitsziget P131 értéke simán
     „Budapest”, mire a kérdés római számot kért, az elfogadott válasz
     viszont „budapest” lett — aki helyesen írta be, hogy XIII, hibás
     választ kapott. A két kerület-sablon ezért KÖZÖS őrt használ. */
  function keruletRomai(s) {
    var m = String(s || '').match(/\b([IVX]+)\.\s*kerület/i);
    return m ? m[1].toUpperCase() : '';
  }

  function normDistrict(s) {
    var r = keruletRomai(s);
    return r ? r + '. kerület' : s;
  }

  /* elterelők: először a pálya többi állomásának valós adataiból, hogy
     a hamis válaszok is helyileg hihetők legyenek */
  function fakeFrom(pool, correct, fallback, n, seed) {
    var cand = [];
    var add = function (v) {
      if (!v || sameAnswer(v, correct)) return;
      for (var i = 0; i < cand.length; i++) if (sameAnswer(v, cand[i])) return;
      cand.push(v);
    };
    (pool || []).forEach(add);
    (fallback || []).forEach(add);
    return shuffle(cand, seed).slice(0, n || 3);
  }

  function quizCfg(correct, wrongs, seed) {
    var opts = [{ text: correct, correct: true }].concat(
      wrongs.map(function (w) { return { text: w, correct: false }; }));
    return { options: shuffle(opts, seed), shuffle: true };
  }

  /* ===========================================================
     SABLONOK
     Mindegyik: fits() eldönti, alkalmazható-e; make() legyártja.
     =========================================================== */
  var T = [];

  /* ---------- A) Wikidata-alapú ---------- */
  T.push({
    id: 'ev-wikidata', src: 'wikidata', taskType: 'kviz', weight: 10,
    fits: function (s, f) { return f.year && f.yearSrc === 'wikidata'; },
    make: function (s, f, ctx) {
      return {
        question: 'Melyik évben épült / készült a(z) ' + s.name + '?',
        type: 'kviz',
        cfg: quizCfg(f.year, fakeYears(f.year, ctx.i), ctx.i),
        note: 'Wikidata: hivatalos évszám (' + f.year + ')'
      };
    }
  });

  T.push({
    id: 'epitesz', src: 'wikidata', taskType: 'kviz', weight: 10,
    fits: function (s, f) { return !!f.architect; },
    make: function (s, f, ctx) {
      return {
        question: 'Ki tervezte a(z) ' + s.name + '-t?',
        type: 'kviz',
        cfg: quizCfg(f.architect, fakeFrom(ctx.allArchitects, f.architect, HU_EPITESZ, 3, ctx.i), ctx.i),
        note: 'Wikidata: építész'
      };
    }
  });

  T.push({
    id: 'alkoto', src: 'wikidata', taskType: 'kviz', weight: 10,
    fits: function (s, f) { return !!f.creator; },
    make: function (s, f, ctx) {
      return {
        question: 'Ki készítette a(z) ' + s.name + ' című alkotást?',
        type: 'kviz',
        cfg: quizCfg(f.creator, fakeFrom(ctx.allCreators, f.creator, HU_SZOBRASZ, 3, ctx.i), ctx.i),
        note: 'Wikidata: alkotó'
      };
    }
  });

  T.push({
    id: 'nevado', src: 'wikidata', taskType: 'szoveg', weight: 9,
    fits: function (s, f) { return !!f.namedAfter; },
    make: function (s, f) {
      var a = f.namedAfter.toLowerCase();
      return {
        question: 'Kiről / miről kapta a nevét a(z) ' + s.name + '?',
        type: 'szoveg',
        cfg: { accepted: nevValtozatok(a), tolerant: true, keyword: true },
        note: 'Wikidata: névadó — ' + f.namedAfter
      };
    }
  });

  T.push({
    id: 'stilus', src: 'wikidata', taskType: 'kviz', weight: 8,
    fits: function (s, f) { return !!f.style; },
    make: function (s, f, ctx) {
      return {
        question: 'Milyen stílusban épült a(z) ' + s.name + '?',
        type: 'kviz',
        cfg: quizCfg(f.style, fakeFrom([], f.style, STILUSOK, 3, ctx.i), ctx.i),
        note: 'Wikidata: építészeti stílus'
      };
    }
  });

  T.push({
    id: 'kerulet', src: 'wikidata', taskType: 'kviz', weight: 5,
    fits: function (s, f) { return !!keruletRomai(f.district); },
    make: function (s, f, ctx) {
      var d = normDistrict(f.district);
      return {
        question: 'Melyik kerületben áll a(z) ' + s.name + '?',
        type: 'kviz',
        cfg: quizCfg(d, fakeFrom([], d, KERULETEK, 3, ctx.i), ctx.i),
        note: 'Wikidata: közigazgatási egység'
      };
    }
  });

  T.push({
    id: 'magassag', src: 'wikidata', taskType: 'kviz', weight: 9,
    fits: function (s, f) { return !!f.height; },
    make: function (s, f, ctx) {
      var h = Math.round(parseFloat(f.height));
      var w = [Math.round(h * 0.6), Math.round(h * 1.45), Math.round(h * 2.1)]
                .map(function (v) { return v + ' méter'; });
      return {
        question: 'Milyen magas a(z) ' + s.name + '?',
        type: 'kviz',
        cfg: quizCfg(h + ' méter', w, ctx.i),
        note: 'Wikidata: magasság'
      };
    }
  });

  /* ---------- B) Wikipédia-szövegből (ELLENŐRZENDŐ) ---------- */
  T.push({
    id: 'ev-szoveg', src: 'text', taskType: 'kviz', weight: 6,
    fits: function (s, f) { return f.year && f.yearSrc === 'text'; },
    make: function (s, f, ctx) {
      return {
        question: 'Melyik évhez kötődik a(z) ' + s.name + ' története?',
        type: 'kviz',
        cfg: quizCfg(f.year, fakeYears(f.year, ctx.i), ctx.i),
        note: 'Wikipédia-szövegből kinyerve — ellenőrizd!',
        evidence: f.yearEvidence,
        verify: true
      };
    }
  });

  /* ---------- C) Általános (mindig működik) ---------- */
  T.push({
    id: 'gps-eljutas', src: 'generic', taskType: 'gps', weight: 4,
    fits: function () { return true; },
    make: function (s) {
      return {
        question: 'Jussatok el ide: ' + s.name + '!',
        type: 'gps',
        cfg: { lat: s.lat, lng: s.lng, radius: 30 },
        note: 'Helyszín koordinátája alapján'
      };
    }
  });

  T.push({
    id: 'foto-hely', src: 'generic', taskType: 'foto', weight: 4,
    fits: function () { return true; },
    make: function (s) {
      return {
        question: 'Készítsetek fotót a(z) ' + s.name + '-ról!',
        type: 'foto',
        cfg: { instruction: 'A(z) ' + s.name + ' legyen jól kivehető a képen.' },
        note: 'Általános fotófeladat'
      };
    }
  });

  T.push({
    id: 'foto-reszlet', src: 'generic', taskType: 'foto', weight: 5,
    fits: function () { return true; },
    make: function (s) {
      return {
        question: 'Keressetek egy érdekes részletet a(z) ' + s.name + ' épületén / környékén, és fotózzátok le!',
        type: 'foto',
        cfg: { instruction: 'Olyan részlet legyen, ami messziről nem tűnik fel.' },
        note: 'Általános megfigyelő feladat'
      };
    }
  });

  T.push({
    id: 'foto-csapat', src: 'generic', taskType: 'foto', weight: 3,
    fits: function () { return true; },
    make: function (s) {
      return {
        question: 'Készítsetek közös csapatfotót a(z) ' + s.name + ' előtt!',
        type: 'foto',
        cfg: { instruction: 'Mindenki legyen rajta a képen.' },
        note: 'Csapatépítő feladat'
      };
    }
  });

  /* A döntési pont „B" ága ÁTUGORJA a következő állomást (jatszas.js:376-382),
     tehát annak a nevét a csapat egy része SOSEM látja. Minden feladat, ami az
     állomásnevekből épül, csak a biztosan bejárt állomásokra támaszkodhat —
     különben a rövidebb utat választó csapatnak megfejthetetlen. */
  function biztosAllomasok(list) {
    var d = -1;
    for (var i = 0; i < list.length; i++) if (list[i].type === 'dontes') { d = i; break; }
    if (d < 0 || d + 1 >= list.length) return { lista: list.slice(), kihagyhato: false };
    return {
      lista: list.filter(function (s, i) { return i !== d + 1; }),
      kihagyhato: true
    };
  }

  T.push({
    id: 'kod-zaro', src: 'generic', taskType: 'kod', weight: 12,
    fits: function (s) { return s.type === 'zaro'; },
    make: function (s, f, ctx) {
      /* A kód a kezdőbetűkből áll — de csak azokéból, amiken MINDENKI járt. */
      var b = biztosAllomasok(ctx.stations);
      var code = deAccent(b.lista.map(function (st) { return st.name.trim().charAt(0); })
                            .join('')).toUpperCase().replace(/[^A-Z0-9]/g, '');
      return {
        question: b.kihagyhato
          ? 'Záró kód: a KÖTELEZŐ állomások kezdőbetűi, érintési sorrendben (' + code.length +
            ' betű). A döntésnél választható kitérő nem számít bele!'
          : 'Záró kód: írjátok le a pálya mind a(z) ' + b.lista.length +
            ' állomásának kezdőbetűjét, az érintés sorrendjében — ez a jelszó!',
        type: 'kod',
        /* tipp + részpont: a késleltetett jutalomból különben késleltetett
           büntetés lesz pont a pálya legvédtelenebb pillanatában */
        cfg: { codeType: 'word', code: code, hint: 'Az állomásnevek kezdőbetűi', partialScore: true },
        note: 'A biztosan bejárt állomásnevekből (' + code + ')'
      };
    }
  });

  T.push({
    id: 'puzzle-sorrend', src: 'generic', taskType: 'puzzle', weight: 7,
    fits: function (s, f, ctx) { return ctx && ctx.i >= 3; },
    make: function (s, f, ctx) {
      /* ugyanaz a csapda, mint a záró kódnál: a kihagyható állomást
         a rövidebb úton haladók sosem látták */
      var b = biztosAllomasok(ctx.stations.slice(0, ctx.i));
      var prev = b.lista.map(function (st) { return st.name; });
      return {
        question: 'Rakjátok helyes sorrendbe az eddig érintett állomásokat!',
        type: 'puzzle',
        cfg: { subtype: 'order', items: prev.slice(-4) },
        note: 'A pálya addigi, biztosan bejárt állomásaiból'
      };
    }
  });


  /* ===========================================================
     PÓTLÁS — a pszichológiai mátrix által kért, de hiányzó típusok

     A `jatek-pszichologia` skill mátrixa több érzésnél `szoveg`-et vagy
     `kod`-ot kér, csakhogy eddig EGYETLEN szoveg-sablon volt (és az is a
     ritka „névadó" property-n lógott), kod pedig KIZÁRÓLAG a záró
     állomáson létezett. Emiatt a szorongás gyakorlatilag kiszolgálhatatlan
     volt: `end:false`, tehát sosem lehet záró érzés.

     A szabad szöveges válasz nem díszítés: a kvíz négy opciója KIMONDJA,
     hogy a helyes válasz ott van a képernyőn — pont ezt kell elkerülni
     gyanakvásnál, kompetenciánál és kísértetieségnél.
     =========================================================== */

  /* Az utcanév a tábláról tényleg leolvasható — ez a legjobb szoveg-feladat,
     mert a válasz a HELYSZÍNEN van, nem a fejben (2. elv: fejek fel). */
  /* Magyar névsorrend: a vezetéknév ELÖL áll, és az a megkülönböztető.
     A puszta hosszszűrés („>3 karakter") pont ezt dobta ki az „Ybl Miklós"-nál,
     és a keresztnevet fogadta el egyedüli válaszként. */
  function nevValtozatok(teljes) {
    var t = String(teljes || '').toLowerCase().trim();
    var szavak = t.split(/\s+/).filter(Boolean);
    var out = [t];
    if (szavak.length > 1) out.push(szavak[0]);            /* vezetéknév */
    szavak.forEach(function (w) { if (w.length > 4 && out.indexOf(w) < 0) out.push(w); });
    return out;
  }

  function utcaNev(loc) {
    var t = String(loc || '').trim();
    if (!t) return '';
    t = t.replace(/\s*\d+([-–/]\d+)?\.?\s*$/, '').trim();   /* házszám le */
    return t.length >= 4 ? t : '';
  }

  T.push({
    id: 'szoveg-cim', src: 'generic', taskType: 'szoveg', weight: 9,
    fits: function (s) { return !!utcaNev(s.loc); },
    make: function (s) {
      var u = utcaNev(s.loc), ul = u.toLowerCase();
      return {
        question: 'Keressétek meg a közterület névtábláját, és írjátok be pontosan, mi áll rajta!',
        type: 'szoveg',
        cfg: { accepted: [ul].concat(ul.split(/\s+/).filter(function (w) { return w.length > 3; })),
               tolerant: true, keyword: true },
        note: 'A helyszín címéből — ' + u
      };
    }
  });

  T.push({
    id: 'szoveg-alkoto', src: 'wikidata', taskType: 'szoveg', weight: 9,
    fits: function (s, f) { return !!(f.architect || f.creator); },
    make: function (s, f) {
      var a = String(f.architect || f.creator).toLowerCase();
      return {
        question: 'Ki alkotta a(z) ' + s.name + '-t? Írjátok be a nevét — segítség nélkül.',
        type: 'szoveg',
        cfg: { accepted: nevValtozatok(a), tolerant: true, keyword: true },
        note: 'Wikidata: alkotó — ' + (f.architect || f.creator)
      };
    }
  });

  T.push({
    id: 'szoveg-ev', src: 'wikidata', taskType: 'szoveg', weight: 8,
    fits: function (s, f) { return !!f.year && f.yearSrc === 'wikidata'; },
    make: function (s, f) {
      return {
        question: 'Melyik évszám kötődik a(z) ' + s.name + ' megszületéséhez? Négy számjegy.',
        type: 'szoveg',
        cfg: { accepted: [String(f.year)], tolerant: false, keyword: false },
        note: 'Wikidata: év — ' + f.year
      };
    }
  });

  T.push({
    id: 'szoveg-kerulet', src: 'wikidata', taskType: 'szoveg', weight: 6,
    fits: function (s, f) { return !!keruletRomai(f.district); },
    make: function (s, f) {
      var d = normDistrict(f.district), dl = d.toLowerCase();
      return {
        question: 'Hányadik kerületben álltok most? Írjátok be római számmal.',
        type: 'szoveg',
        cfg: { accepted: [dl, dl.replace(/\.?\s*kerület/, '')], tolerant: true, keyword: true },
        note: 'Wikidata: kerület — ' + d
      };
    }
  });

  T.push({
    id: 'szoveg-magassag', src: 'wikidata', taskType: 'szoveg', weight: 7,
    fits: function (s, f) { return !!f.height; },
    make: function (s, f) {
      var m = String(Math.round(parseFloat(f.height)));
      return {
        question: 'Hány méter magas a(z) ' + s.name + '? Egész számra kerekítve.',
        type: 'szoveg',
        cfg: { accepted: [m, m + ' m', m + ' méter'], tolerant: true, keyword: true },
        note: 'Wikidata: magasság — ' + f.height + ' m'
      };
    }
  });

  /* KÓDTÖREDÉK nem-záró állomásra. Ez az egyetlen mód, hogy a szorongás
     és a felelősség egyáltalán kiszolgálható legyen: gépelni kell, tehát
     tényleg el lehet rontani — enélkül nincs tét (5. elv). */
  T.push({
    id: 'kod-reszlet', src: 'generic', taskType: 'kod', weight: 9,
    fits: function (s, f, ctx) {
      if (!ctx || ctx.i < 1 || s.type === 'zaro') return false;
      return deAccent(s.name).toUpperCase().replace(/[^A-Z0-9]/g, '').length >= 6;
    },
    make: function (s) {
      var tiszta = deAccent(s.name).toUpperCase().replace(/[^A-Z0-9]/g, '');
      var code = [2, 4, 6].map(function (p) { return tiszta.charAt(p - 1); }).join('');
      return {
        question: 'Kódtöredék: a helyszín nevének 2., 4. és 6. betűje — ékezet nélkül, nagybetűvel, a szóközök nem számítanak.',
        type: 'kod',
        cfg: { codeType: 'word', code: code, hint: 'A név betűit szóközök nélkül számold!' },
        note: 'A helyszín nevéből (' + code + ')'
      };
    }
  });

  /* IDŐRENDI KIRAKÓ — a `puzzle-sorrend` az állomások BEJÁRÁSI sorrendjét
     kérdezi, ami könyvelés. Az aha-élményhez az kell, hogy a korábbi
     morzsák ÚJ rendbe álljanak: a séta sorrendje és az időrend nem
     ugyanaz, és ez a felismerés maga a jutalom. */
  function evesElozmenyek(ctx) {
    if (!ctx || !ctx.factsMap) return [];
    var b = biztosAllomasok(ctx.stations.slice(0, ctx.i));
    var out = [];
    b.lista.forEach(function (st) {
      var ff = ctx.factsMap[st.uid] || {};
      var y = parseInt(ff.year, 10);
      if (y) out.push({ name: st.name, year: y });
    });
    return out;
  }

  T.push({
    id: 'puzzle-tenyek', src: 'wikidata', taskType: 'puzzle', weight: 10,
    fits: function (s, f, ctx) { return evesElozmenyek(ctx).length >= 3; },
    make: function (s, f, ctx) {
      var lista = evesElozmenyek(ctx).sort(function (a, b) { return a.year - b.year; }).slice(0, 4);
      return {
        question: 'Rakjátok IDŐRENDBE az eddig érintett helyszíneket — nem abban a sorrendben jártatok ott!',
        type: 'puzzle',
        cfg: { subtype: 'order',
               items: lista.map(function (x) { return x.name + ' (' + x.year + ')'; }),
               partial: true },
        note: 'A korábbi állomások Wikidata-évszámaiból'
      };
    }
  });

  /* Két további fotósablon. Élesben megfogott hiba: három sablon volt, és
     egy negyedik fotó-állomáson az ismétléskerulő szűrő kiürült, így szó
     szerint ugyanaz a feladat jött vissza. Mindkettő a rácsodálkozást és
     a kísértetieséget szolgálja: irányított figyelem, nulla terhelés. */
  T.push({
    id: 'foto-felfele', src: 'generic', taskType: 'foto', weight: 5,
    fits: function () { return true; },
    make: function (s) {
      return {
        question: 'Nézzetek FEL: fotózzátok le azt, ami szemmagasság fölött van a(z) ' + s.name + ' környékén.',
        type: 'foto',
        cfg: { instruction: 'Amit a járókelők sosem néznek meg.' },
        note: 'Általános — irányított figyelem'
      };
    }
  });

  T.push({
    id: 'foto-kontraszt', src: 'generic', taskType: 'foto', weight: 4,
    fits: function () { return true; },
    make: function () {
      return {
        question: 'Fotózzatok le valamit, ami NEM illik ide — ami más korból vagy más világból maradt itt.',
        type: 'foto',
        cfg: { instruction: 'Egy tárgy, egy felirat, egy anyag. Ti döntitek el, mi lóg ki.' },
        note: 'Általános — megfigyelés'
      };
    }
  });

  /* ===========================================================
     KIOSZTÁS
     A típus és a nehézség szűkíti, mely sablon jöhet szóba.
     =========================================================== */
  /* KÉT kör, szándékosan elválasztva:
     CORE  — ebből születik az ALAPÉRTELMEZETT feladat. Szűk, hogy az
             állomás szerepe megmaradjon (az infó legyen sztori, ne vizsga).
     ALLOW — a „Másik feladat” gomb ezt járhatja be. Tágabb, hogy egy
             meglévő évszám-tény egy kezdő állomáson se vesszen kárba. */
  /* A `dontes` és a `zaro` sor szándékosan bővebb, mint korábban:
     a döntési pont érzése tipikusan a FELELŐSSÉG, amit a régi
     ['kviz','szoveg','foto'] hármas mindegyike kiolt; a záró állomás
     pedig csak `kod`-ot kaphatott, holott a 16 lehetséges végcél-érzésből
     annak csak négynél helyes. Az `info` gps-t kapott, mert nélküle egy
     tény nélküli állomáson az izgalom nem szolgálható ki. */
  var TYPE_CORE = {
    kezdo:   ['gps', 'foto'],
    info:    ['foto', 'szoveg', 'gps', 'kod'],
    feladat: ['kviz', 'szoveg', 'puzzle', 'foto', 'gps', 'kod'],
    dontes:  ['kviz', 'szoveg', 'foto', 'kod', 'puzzle', 'gps'],
    zaro:    ['kod', 'foto', 'puzzle']
  };
  var TYPE_ALLOW = {
    kezdo:   ['gps', 'foto', 'kviz', 'szoveg'],
    info:    ['foto', 'szoveg', 'kviz', 'gps', 'kod'],
    feladat: ['kviz', 'szoveg', 'puzzle', 'foto', 'gps', 'kod'],
    dontes:  ['kviz', 'szoveg', 'foto', 'puzzle', 'kod'],
    zaro:    ['kod', 'foto', 'puzzle', 'kviz', 'szoveg']
  };
  var DIFF_PREF = {
    'Könnyű':  ['foto', 'gps', 'kviz'],
    'Közepes': ['kviz', 'szoveg', 'foto'],
    'Nehéz':   ['kviz', 'kod', 'puzzle', 'szoveg']
  };

  function candidates(s, f, ctx, wide) {
    var map = wide ? TYPE_ALLOW : TYPE_CORE;
    var pref = map[s.type] || ['kviz', 'foto'];
    return T.filter(function (t) {
      if (pref.indexOf(t.taskType) < 0) return false;
      try { return t.fits(s, f, ctx); } catch (e) { return false; }
    }).sort(function (a, b) {
      /* 1) ÉRZELMI ILLESZKEDÉS — ez erősebb, mint a nehézségi preferencia.
         Enélkül a mátrix csak dísz lenne: a generátor sosem látna érzést.
         Ismeretlen érzésnél a rangOf 2-t ad mindenre, tehát döntetlen,
         és a régi (nehézség szerinti) viselkedés marad érvényben. */
      if (ctx && ctx.zaroPref) {
        var za = (a.taskType === ctx.zaroPref) ? 0 : 1, zb = (b.taskType === ctx.zaroPref) ? 0 : 1;
        if (za !== zb) return za - zb;
      }
      if (ctx && ctx.emo && window.PVE) {
        var ea = PVE.rangOf(ctx.emo, a.taskType), eb = PVE.rangOf(ctx.emo, b.taskType);
        if (ea !== eb) return ea - eb;
      }
      /* 2) nehézség szerinti preferencia, majd a sablon saját súlya */
      var dp = DIFF_PREF[s.diff] || [];
      var ai = dp.indexOf(a.taskType), bi = dp.indexOf(b.taskType);
      ai = ai < 0 ? 99 : ai; bi = bi < 0 ? 99 : bi;
      return ai - bi || b.weight - a.weight;
    });
  }

  /* Egy állomás feladata. `skip` sablonazonosítók kihagyhatók
     (a „másik feladatot kérek” gomb és az ismétlés-kerülés használja). */
  /* FORDÍTOTT SZIVÁRGÁS-ŐR (sztori-először mód)
     Ha a sztori már megírta, hogy „Zala György 1893-ban állította”, akkor
     egy „Melyik évben?” kvíz TRIVIÁLIS — a játékos az előbb olvasta el a
     választ. Az ilyen sablonokat ki kell zárni. */
  function spoiledBy(story, tpl, s, f, ctx) {
    if (!story) return false;
    var hay = key(story);
    var made;
    try { made = tpl.make(s, f, ctx); } catch (e) { return false; }
    var answers = [];
    var c = (made && made.cfg) || {};
    if (Array.isArray(c.options)) c.options.forEach(function (o) { if (o.correct) answers.push(o.text); });
    if (Array.isArray(c.accepted)) c.accepted.forEach(function (a) { answers.push(a); });
    if (c.code) answers.push(c.code);
    for (var i = 0; i < answers.length; i++) {
      var k = key(answers[i]);
      if (k.length >= 4 && hay.indexOf(k) >= 0) return true;
    }
    return false;
  }

  function generateFor(s, f, ctx, skip, wide) {
    var all = candidates(s, f, ctx, wide);

    /* Sztori-először: hátrasoroljuk azokat, amiket a történet már elárult.
       KORÁBBAN itt `filter` volt, és ha MINDEN sablont szennyezettnek mért
       (gazdag, nevekben bő sztorinál ez nem ritka), a szűrő NÉMÁN kiejtette
       magát, és bekerült egy elárult megoldású feladat jelzés nélkül.
       Ezért most jelöljük, nem dobjuk — így a szerző látja, ha baj van. */
    var szennyezett = {};
    if (ctx && ctx.story) {
      all.forEach(function (t) {
        if (spoiledBy(ctx.story, t, s, f, ctx)) szennyezett[t.id] = 1;
      });
      var tiszta = all.filter(function (t) { return !szennyezett[t.id]; });
      if (tiszta.length) all = tiszta;
    }
    var cand = all.filter(function (t) { return !skip || skip.indexOf(t.id) < 0; });

    /* A ZÁRÓ állomás típusa erősebb, mint az ismétlés kerülése.
       Élesben megfogott hiba: három fotósablon van, és ha korábban
       mind a hármat elhasználtuk, a záró állomásról az ismétlés-szűrő
       kizárta a fotót — így egy lágy végcél (pl. összetartozás) mégis
       kódfejtéssel zárult, ami épp kioltja az érzést. A csúcs-vég
       szabály fontosabb, mint hogy egy fotófeladat kétszer szerepeljen. */
    if (ctx && ctx.zaroPref) {
      var zp = cand.filter(function (t) { return t.taskType === ctx.zaroPref; });
      if (!zp.length) zp = all.filter(function (t) { return t.taskType === ctx.zaroPref; });
      if (zp.length) cand = zp;
    }

    /* AZ ÉRZELMI ILLESZKEDÉS ELŐBBRE VALÓ, MINT A VÁLTOZATOSSÁG.
       Élesben megfogva: az ismétléskerülő szűrő elhasználta a sürgetés
       összes jó típusát a korábbi állomásokon, így az 5. állomásra egy
       kirakó maradt — ami épp kioltja a sürgetést. Ilyenkor inkább
       ismételjünk sablontípust, mint hogy elrontsuk a jelenetet.
       Csak a pályaszintű generálásnál fut (`emoPriority`): ha a szerző
       kézzel kér másik feladatot, akkor tényleg másikat kell kapnia. */
    if (ctx && ctx.emo && ctx.emoPriority && window.PVE && cand.length &&
        PVE.oltjaE(ctx.emo, cand[0].taskType)) {
      var jo = all.filter(function (t) { return !PVE.oltjaE(ctx.emo, t.taskType); });
      if (jo.length) cand = jo;
    }

    /* Ha a szűk körből a kerülendők miatt nem maradt semmi, előbb a tágabb
       körrel próbálkozunk, és csak legvégső esetben ismétlünk. */
    if (!cand.length && !wide) {
      var w = candidates(s, f, ctx, true);
      cand = w.filter(function (t) { return !skip || skip.indexOf(t.id) < 0; });
      all = w.length ? w : all;
    }
    if (!cand.length) cand = all;
    if (!cand.length) return null;

    var t = cand[0];
    var made = t.make(s, f, ctx);
    return {
      tpl: t.id,
      src: t.src,
      question: made.question,
      station: s.name,
      route: s.route,
      type: made.type,
      points: s.points,
      cfg: made.cfg,
      note: made.note || '',
      evidence: made.evidence || '',
      verify: !!made.verify,
      image: f.imageUrl || '',
      /* igaz, ha a sztori ELÁRULJA ennek a feladatnak a megoldását, és nem
         volt tiszta sablon, amire válthattunk volna — a szerzőnek szólni kell */
      spoiled: !!szennyezett[t.id],
      alternatives: cand.length - 1
    };
  }

  function generateAll(stations, factsMap, emoPlan) {
    var allArchitects = [], allCreators = [];
    stations.forEach(function (s) {
      var f = factsMap[s.uid] || {};
      if (f.architect) allArchitects.push(f.architect);
      if (f.creator) allCreators.push(f.creator);
    });

    /* Érzelmi partitúra, ha a szerző kitöltötte. Enélkül a generátor
       pontosan úgy viselkedik, mint korábban. */
    var score = null, goal = '';
    if (emoPlan && window.PVE && PVE.isComplete(emoPlan)) {
      score = PVE.score({ skeleton: stations }, emoPlan);
      goal = PVE.normPlan(emoPlan).goal;
    }

    /* Egy pályán belül ne ismétlődjön ugyanaz a sablon — enélkül
       kétszer is felbukkanhat pl. a „Melyik kerületben áll…?” kérdés. */
    var used = [];
    return stations.map(function (s, i) {
      var ctx = {
        i: i, stations: stations, allArchitects: allArchitects, allCreators: allCreators,
        /* ha már van sztori az állomáson, a feladat kerülje az elárult tényeket */
        story: String(s.desc || '') + ' ' + String(s.taskShort || ''),
        /* a korábbi állomások tényei (időrendi kirakóhoz) */
        factsMap: factsMap,
        /* az állomás megrendelt fő érzése — ez rangsorolja a sablonokat */
        emo: score ? score[i].fo : '',
        emoPriority: true,
        /* A ZÁRÓ állomás típusát a VÉGCÉL dönti el, nem a rangsor.
           Csúcs-vég szabály: a pálya emlékét a vég írja felül, ezért itt
           az állomás-szintű szabály erősebb az érzés általános rangjánál. */
        zaroPref: (score && s.type === 'zaro') ? PVE.zaroTipus(goal) : ''
      };
      var t = generateFor(s, factsMap[s.uid] || {}, ctx, used, false);
      if (t) used.push(t.tpl);
      return t;
    });
  }

  /* melyik sablonok jöhetnének még szóba — a „másik feladat” gombhoz */
  function alternativesFor(s, f, ctx) {
    return candidates(s, f, ctx, true).map(function (t) { return t.id; });
  }

  return {
    fetchFacts: fetchFacts,
    generateAll: generateAll,
    generateFor: generateFor,
    alternativesFor: alternativesFor,
    TEMPLATES: T,
    deAccent: deAccent
  };
})();
