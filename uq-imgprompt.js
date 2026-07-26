/* =========================================================
   URBAN QUEST — borítókép-prompt generátor

   A pálya adataiból összeállít egy képgenerátornak való promptot,
   ami a MEGLÉVŐ borítóképek stílusát követi: sötét, filmszerű
   digitális illusztráció, egyetlen meleg fényforrás, sziluettek,
   telített színek majdnem fekete alapon.

   Publikus API: window.UQImgPrompt.build(adat) -> szöveg
   ========================================================= */
(function () {
  'use strict';

  /* A kártya képaránya 640×420 ≈ 3:2. A generált kép legyen ennél
     nagyobb, hogy retina kijelzőn se legyen homályos. */
  var MERET = { w: 1280, h: 840, arany: '3:2' };

  /* Kategóriánként más színvilág — így a katalógus változatos marad,
     de minden kép ugyanabba a családba tartozik. */
  var PALETTA = {
    varosi:     'deep teal-blue night sky, warm amber street lamps, golden lit windows, hints of brass',
    tortenelmi: 'aged gold and warm candlelight, deep sepia shadows, weathered stone tones',
    kaland:     'emerald and moss green, warm amber shafts of light, misty blue-grey depths',
    csaladi:    'warm honey and soft golden light, gentle teal shadows, inviting glow',
    ceges:      'cool slate blue and graphite, a single bright lime-green accent light, clean modern tones',
    horror:     'desaturated cold teal, deep blood-red accents, pale moonlight, heavy fog'
  };

  /* A nehézség a hangulatot állítja, nem a témát. */
  var HANGULAT = {
    konnyu:  'inviting and warm, a sense of curiosity and easy discovery',
    kozepes: 'intriguing and slightly mysterious, secrets waiting just out of sight',
    nehez:   'tense and enigmatic, deep shadows and a feeling of being watched',
    extrem:  'ominous and high-stakes, dramatic contrast, urgent and cinematic'
  };

  var KAT_SZO = {
    varosi: 'urban city adventure', tortenelmi: 'historical mystery',
    kaland: 'outdoor exploration adventure', csaladi: 'family-friendly treasure hunt',
    ceges: 'modern team-building city game', horror: 'dark horror mystery'
  };

  function tiszt(s) {
    return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  }

  /* A magyar leírásból kiszedjük az első mondatot: a képgenerátornak a
     lényeg kell, nem a teljes marketing-szöveg. */
  function elsoMondat(s) {
    var t = tiszt(s);
    if (!t) return '';
    var m = t.match(/^[^.!?]*[.!?]/);
    return tiszt(m ? m[0] : t).slice(0, 220);
  }

  /**
   * @param a {name, subtitle, desc, category, difficulty, city, area}
   */
  function build(a) {
    a = a || {};
    var cim = tiszt(a.name) || 'Urban Quest kaland';
    var alcim = tiszt(a.subtitle);
    var leiras = elsoMondat(a.desc);
    var kat = a.category || 'varosi';
    var neh = a.difficulty || 'kozepes';
    var hely = tiszt([a.area, a.city].filter(Boolean).join(', ')) || 'Budapest, Hungary';

    var temaSorok = ['Theme: "' + cim + '" — a ' + (KAT_SZO[kat] || 'city adventure') + ' set in ' + hely + '.'];
    if (alcim) temaSorok.push('Tagline: ' + alcim);
    if (leiras && leiras !== alcim) temaSorok.push('What it is about: ' + leiras);

    var L = [];
    L.push('Cover artwork for a real-world city adventure game. No text anywhere in the image.');
    L.push('');
    L.push(temaSorok.join('\n'));
    L.push('');
    L.push('Mood: ' + (HANGULAT[neh] || HANGULAT.kozepes) + '.');
    L.push('Colour palette: ' + (PALETTA[kat] || PALETTA.varosi) + ', all against a near-black background.');
    L.push('');
    L.push('Style: atmospheric cinematic digital illustration, painterly matte-painting look. ' +
           'One dominant warm light source with strong glow and long shadows. ' +
           'Landmarks and figures rendered as clean silhouettes or backlit shapes — ' +
           'never show recognisable faces. Subtle volumetric haze, soft light bloom and ' +
           'a few floating glowing particles. Rich saturated colour, deep blacks, high contrast, ' +
           'smooth gradients, no harsh outlines.');
    L.push('');
    L.push('Composition: wide establishing shot with clear depth — foreground silhouette, ' +
           'mid-ground subject, glowing background. Keep the lower third darker and simple, ' +
           'because a title and description are placed over it in the app.');
    L.push('');
    L.push('Avoid: any text, letters, numbers, logos or watermarks; photorealism; ' +
           'daylight or white backgrounds; visible faces; cluttered composition; ' +
           'cartoon or comic style; borders and frames.');
    L.push('');
    L.push('— — — MŰSZAKI ADATOK — — —');
    L.push('Méret: ' + MERET.w + ' × ' + MERET.h + ' képpont (' + MERET.arany + ' arány, fekvő)');
    L.push('Formátum: JPG vagy WebP, 80–85% minőség (a kártyán ~640×420-ban jelenik meg)');
    L.push('Midjourney esetén a végére: --ar ' + MERET.arany + ' --style raw --stylize 250');

    return L.join('\n');
  }

  window.UQImgPrompt = { build: build, MERET: MERET };
})();
