/* =========================================================
   URBAN QUEST — PÁLYA-SZÍNTÉMA

   Minden küldetés a saját borítóképéből kapott színt visel. A modul két
   dolgot csinál, és a kettőt SZÁNDÉKOSAN külön:

   1. KINYERÉS (`kinyer`) — csak az adminban fut, mentéskor, egyszer.
      Terepen semmiképp: a játék offline is indulhat, a csomag megjön a
      localStorage-ből, a KÉP viszont nem. Ezért a végeredmény egyetlen
      hexként utazik a befagyasztott csomagban.

   2. ALKALMAZÁS (`alkalmaz`) — bárhol fut, egyetlen CSS-változót ír.
      A --lime a pálya színe, ezért a kódbázis ~380 var(--lime) hivatkozása
      magától követi. A jelentéshordozó zöld (--ok), a hibajelzés (--warn),
      a tipp (--hint) és a márkajel (--brand) külön token — azokhoz nem nyúl.

   MIÉRT NEM A NYERS KÉPSZÍN KERÜL A FELÜLETRE
   A hat borító sötét, hangulatos illusztráció; a belőlük kinyert domináns
   szín kontrasztja a #0a0d0a háttéren 2,05–3,03:1 (hatból ötnél a WCAG
   4,5:1 alatt). Ezért a képből csak az ÁRNYALATOT vesszük át, a
   telítettséget és a világosságot pedig olyan sávba kényszerítjük, ahol a
   szöveg és a gomb biztosan olvasható. Cserébe a kép hangulata a nagy,
   szövegmentes felületekre kerül (hero-fátyol), ahol nincs ilyen követelmény.
   ========================================================= */
(function () {
  'use strict';

  var HATTER      = [10, 13, 10];    /* --bg */
  var KARTYA      = [18, 22, 15];    /* --bg-card, a szigorúbb próba */
  var MIN_KONTRASZT = 4.5;

  /* A jelzés-színek árnyalata. Ezekhez közel a pálya színe elveszi a
     jelentésüket: egy 9°-os pályán a hibaüzenet, egy 79°-oson a „helyes"
     visszajelzés olvad bele a felületbe. */
  var SZEMANTIKUS = [
    { nev: 'hibajelzés',   h: 20.6 },
    { nev: 'tipp',         h: 43.5 },
    { nev: 'helyes válasz', h: 79.4 }
  ];
  var UTKOZES_FOK = 25;

  /* ---------- színtér ---------- */
  function hexRgb(h) {
    h = String(h || '').trim().replace(/^#/, '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgbHex(a) {
    return '#' + a.map(function (x) {
      return ('0' + Math.max(0, Math.min(255, Math.round(x))).toString(16)).slice(-2);
    }).join('');
  }
  function rgbHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0, s = 0, l = (mx + mn) / 2;
    if (d) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? ((b - r) / d + 2) : ((r - g) / d + 4);
      h *= 60;
    }
    return [h, s, l];
  }
  function hslRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r, g, b;
    if (h < 60)       { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else              { r = c; g = 0; b = x; }
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }
  function fenyesseg(r, g, b) {
    var a = [r, g, b].map(function (v) {
      v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function kontraszt(c1, c2) {
    var l1 = fenyesseg(c1[0], c1[1], c1[2]), l2 = fenyesseg(c2[0], c2[1], c2[2]);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  /* ---------- normalizálás ----------
     A kép árnyalatát megtartva addig világosítunk, amíg a szín a sötét
     kártyán is olvasható. Ha 0.9-es világosságig sem érnénk el a küszöböt
     (ez sötét, telített kékeknél fordulhat elő), a telítettséget engedjük. */
  function leir(rgb) {
    var hsl = rgbHsl(rgb[0], rgb[1], rgb[2]);
    return {
      hex: rgbHex(rgb),
      rgb: rgb.map(Math.round),
      h: Math.round(hsl[0]),
      kontrasztKartyan: +kontraszt(rgb, KARTYA).toFixed(2),
      kontrasztHatteren: +kontraszt(rgb, HATTER).toFixed(2),
      /* A kitöltött gomb előtere: sötét szöveg világos gombon és fordítva. */
      gombSzoveg: kontraszt(rgb, HATTER) >= kontraszt(rgb, [255, 255, 255]) ? '#0a0d0a' : '#ffffff'
    };
  }

  /* IDEMPOTENS: ha a bemenet már megfelel a kontraszt-küszöbnek, változatlanul
     adjuk vissza. Enélkül a tárolt (már végleges) szín minden megjelenítéskor
     újra átesne a korrekción, és lassan elcsúszna a szerző döntésétől. */
  function normalizal(hex) {
    var rgb = hexRgb(hex);
    if (!rgb) return null;
    if (kontraszt(rgb, KARTYA) >= MIN_KONTRASZT) return leir(rgb);

    var hsl = rgbHsl(rgb[0], rgb[1], rgb[2]);
    var h = hsl[0];
    var s = Math.max(0.5, Math.min(0.8, hsl[1] * 1.6));
    var l = 0.55;
    var ki = hslRgb(h, s, l);

    for (var i = 0; i < 40 && kontraszt(ki, KARTYA) < MIN_KONTRASZT; i++) {
      l = Math.min(0.9, l + 0.012);
      if (l >= 0.9) s = Math.max(0.25, s - 0.03);
      ki = hslRgb(h, s, l);
    }
    return leir(ki.map(Math.round));
  }

  /* Ütközik-e a jelzés-színekkel? Nem tiltjuk — figyelmeztetünk, mert a
     szerző dönthet úgy, hogy vállalja (pl. egy erdei pálya legyen zöld). */
  function utkozes(h) {
    var ki = [];
    SZEMANTIKUS.forEach(function (sz) {
      var d = Math.abs(h - sz.h); if (d > 180) d = 360 - d;
      if (d < UTKOZES_FOK) ki.push({ nev: sz.nev, tavolsag: Math.round(d) });
    });
    return ki;
  }

  /* ---------- kinyerés képből (CSAK ADMIN) ---------- */
  function kinyer(url) {
    return new Promise(function (megold, elvet) {
      if (!url) return elvet(new Error('nincs borítókép'));
      var img = new Image();
      /* Kereszt-origós kép (Supabase Storage) pixeladata enélkül nem
         olvasható ki — a canvas „beszennyeződik". */
      img.crossOrigin = 'anonymous';
      img.onerror = function () { elvet(new Error('a kép nem tölthető be')); };
      img.onload = function () {
        try { megold(elemez(img)); } catch (e) { elvet(e); }
      };
      img.src = url;
    });
  }

  function elemez(img) {
    var W = 120, H = 80;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var x = c.getContext('2d', { willReadFrequently: true });
    /* Az SVG-borítóinkon nincs width/height attribútum, csak viewBox —
       ezért kifejezetten megadjuk a célméretet, különben egyes böngészők
       nulla méretűre rajzolnák, és csupa fekete palettát kapnánk. */
    x.drawImage(img, 0, 0, W, H);
    var d = x.getImageData(0, 0, W, H).data;

    var vodor = {};
    for (var i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue;
      var k = (d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4);
      var v = vodor[k] || (vodor[k] = { n: 0, r: 0, g: 0, b: 0 });
      v.n++; v.r += d[i]; v.g += d[i + 1]; v.b += d[i + 2];
    }
    var lista = Object.keys(vodor).map(function (k) {
      var v = vodor[k];
      var r = v.r / v.n, g = v.g / v.n, b = v.b / v.n;
      var hsl = rgbHsl(r, g, b);
      return { r: r, g: g, b: b, n: v.n, h: hsl[0], s: hsl[1], l: hsl[2] };
    });
    if (!lista.length) throw new Error('a kép üres');

    /* Élénk jelölt: telített és nem koromsötét. A pontszám a telítettség és
       a terület gyöke — így egy apró, rikító folt nem üti el a kép valódi
       karakterét, de egy nagy, fakó háttér sem nyer automatikusan. */
    var jelolt = lista.filter(function (p) { return p.s > 0.22 && p.l > 0.15 && p.l < 0.85; });
    if (!jelolt.length) {
      /* Szürkeárnyalatos vagy egyszínű kép: nincs mit kiemelni. */
      return { nyers: null, tema: null, ok: false,
               uzenet: 'A képen nincs elég telített szín — maradjon a márkazöld, vagy adj meg kézzel egyet.' };
    }
    jelolt.sort(function (a, b) { return (b.s * Math.sqrt(b.n)) - (a.s * Math.sqrt(a.n)); });
    var gy = jelolt[0];
    var nyersHex = rgbHex([gy.r, gy.g, gy.b]);
    var tema = normalizal(nyersHex);
    return {
      nyers: nyersHex,
      tema: tema,
      ok: true,
      utkozesek: utkozes(tema.h),
      /* A nagy, szövegmentes felületekre (hero-fátyol) a NYERS szín megy:
         ott nincs kontraszt-követelmény, és ez viszi át a kép hangulatát. */
      hangulat: nyersHex
    };
  }

  /* ---------- alkalmazás ----------
     Egyetlen elemre írjuk a változókat, nem a :root-ra: így az admin
     előnézetében egymás mellett élhet több pálya színe. */
  function alkalmaz(hex, elem) {
    var cel = elem || document.documentElement;
    var t = hex ? normalizal(hex) : null;
    if (!t) {
      cel.style.removeProperty('--lime');
      cel.style.removeProperty('--lime-rgb');
      cel.style.removeProperty('--lime-2');
      cel.style.removeProperty('--lime-dim');
      return null;
    }
    var hsl = rgbHsl(t.rgb[0], t.rgb[1], t.rgb[2]);
    cel.style.setProperty('--lime', t.hex);
    cel.style.setProperty('--lime-rgb', t.rgb.join(' '));
    cel.style.setProperty('--lime-2',   rgbHex(hslRgb(hsl[0], hsl[1], Math.min(0.78, hsl[2] + 0.1))));
    cel.style.setProperty('--lime-dim', rgbHex(hslRgb(hsl[0], hsl[1], Math.max(0.22, hsl[2] - 0.12))));
    return t;
  }

  /* A pálya színe a katalógus-kártyából vagy a befagyasztott csomagból. */
  function palyaSzin(slug) {
    try {
      var q = (window.QUESTS || {})[slug];
      if (q && q.themeAccent) return q.themeAccent;
      var raw = localStorage.getItem('uq_bundle_' + slug);
      if (raw) {
        var b = JSON.parse(raw);
        if (b && b.course && b.course.theme_accent) return b.course.theme_accent;
      }
    } catch (e) {}
    return null;
  }

  window.UQTema = {
    kinyer: kinyer,
    normalizal: normalizal,
    alkalmaz: alkalmaz,
    utkozes: utkozes,
    palyaSzin: palyaSzin,
    hexRgb: hexRgb,
    rgbHex: rgbHex,
    kontraszt: kontraszt,
    MIN_KONTRASZT: MIN_KONTRASZT
  };
})();
