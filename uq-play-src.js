/* =========================================================
   URBAN QUEST — a végigjátszás adatforrása

   A lejátszó eddig KIZÁRÓLAG a beégetett quest-courses.js-ből dolgozott,
   ezért az adminban végzett szerkesztés (átnevezés, új állomás, módosított
   feladat) sosem jutott el a játékig.

   Ez a modul letölti a pálya BEFAGYASZTOTT verzióját az adatbázisból, és
   a lejátszó által ismert alakra hozza — így a jatszas.js szerkezete
   érintetlen marad. Csak utána tölti be magát a lejátszót.

   A csomag megoldást NEM tartalmaz nyersen, csak sózott hash-t; a
   kiértékelést ezért a jatszas.js hash-alapon végzi (lásd uq-play-check).
   ========================================================= */
(function () {
  'use strict';

  var LEJATSZO = 'jatszas.js?v=8';
  var CACHE_ELO = 'uq_bundle_';           // offline tartalék pályánként

  var DIFF_LABEL = { konnyu: 'Könnyű', kozepes: 'Közepes', nehez: 'Nehéz', extrem: 'Extrém' };

  function betoltLejatszo() {
    var s = document.createElement('script');
    s.src = LEJATSZO;
    document.body.appendChild(s);
  }

  /* A hero háttere CSS background-érték (gradiens vagy kép). */
  function hatter(url) {
    if (!url) return '';
    if (/^(linear|radial|conic)-gradient|^#|^rgb/i.test(url)) return url;   // már CSS-érték
    return 'url("' + String(url).replace(/"/g, '\\"') + '") center/cover no-repeat';
  }

  /* bundle → a quest-courses.js alakja */
  function atalakit(bundle) {
    var st = bundle.stations || [];
    var allomasok = [], feladatok = [];

    st.forEach(function (s) {
      allomasok.push({
        /* az állomás UUID-ja kell a szerveroldali menet-naplóhoz
           (station_visited események) */
        id: s.id,
        name: s.name,
        type: s.kind || 'feladat',              // 'dontes' → elágazás a lejátszóban
        diff: DIFF_LABEL[s.difficulty] || 'Közepes',
        loc: s.address || '',
        lat: s.lat == null ? '' : String(s.lat),
        lng: s.lng == null ? '' : String(s.lng),
        desc: s.description || '',
        taskShort: s.task_short || '',
        img: hatter(s.image)
      });

      (s.tasks || []).forEach(function (t) {
        feladatok.push({
          id: t.id,
          station: s.name,                       // a lejátszó NÉV szerint párosít
          question: t.question,
          type: t.kind,
          points: t.points || 0,
          image: t.image || '',
          cfg: t.config || {},
          /* a kiértékeléshez — nyers megoldás nincs a csomagban */
          answer_hashes: t.answer_hashes || [],
          salt: t.salt || '',
          auto_ok: !!t.auto_ok,
          hints: t.hints || []
        });
      });
    });

    return {
      title: (bundle.course && (bundle.course.hero_title || bundle.course.name)) || '',
      /* a pálya borítóképe — az összegző képernyő ezt mutatja */
      image: (bundle.course && bundle.course.image) || '',
      stations: allomasok,
      tasks: feladatok,
      _fromDb: true,
      _version: bundle.course && bundle.course.version,
      /* a szerveroldali menet-rögzítéshez (sync_batch): melyik pálya
         melyik befagyasztott verzióját játssza a csapat */
      _courseId: bundle.course && bundle.course.id,
      _versionId: bundle.course && bundle.course.version_uuid
    };
  }

  /* A pálya színe. A csomagból jön, tehát offline is megvan, és MÉG a
     lejátszó betöltése előtt érvénybe lép — így nincs színvillanás. */
  function temaAlkalmaz(bundle) {
    if (!window.UQTema) return;
    var szin = bundle && bundle.course && bundle.course.theme_accent;
    UQTema.alkalmaz(szin || null);
  }

  function cacheOlvas(slug) {
    try {
      var raw = localStorage.getItem(CACHE_ELO + slug);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function cacheIr(slug, bundle) {
    try { localStorage.setItem(CACHE_ELO + slug, JSON.stringify(bundle)); } catch (e) {}
  }

  var params = new URLSearchParams(location.search);
  var slug = params.get('quest');
  /* Admin előnézet: a még KÖZZÉ NEM TETT pálya befagyasztott verzióját is
     be kell tudni tölteni. A v_play_bundle szándékosan csak a publikált
     pályákat adja (azt anon is olvashatja), ezért az előnézet a
     v_admin_play_bundle nézetet kéri — annak láthatóságát az RLS dönti el,
     tehát nem admin ezen keresztül sem lát többet. */
  var elonezet = params.get('elonezet') === '1';

  if (!slug || !window.UQAPI) { betoltLejatszo(); return; }

  /* Offline: a legutóbb letöltött csomag azonnal érvénybe lép, hogy a
     terepen net nélkül is indulhasson a játék. Előnézetben NEM: ott épp
     azt akarod látni, ami most van az adatbázisban, nem a tegnapit. */
  var gyors = elonezet ? null : cacheOlvas(slug);
  if (gyors) {
    window.QUEST_COURSES = window.QUEST_COURSES || {};
    window.QUEST_COURSES[slug] = atalakit(gyors);
    temaAlkalmaz(gyors);
  }

  var kesz = false;
  function tovabb() { if (!kesz) { kesz = true; betoltLejatszo(); } }

  /* Ne várjunk örökké a hálózatra — 6 másodperc után a gyorstárral
     (vagy a beégetett adattal) indulunk. */
  var idozito = setTimeout(tovabb, 6000);

  var nezet = elonezet ? '/v_admin_play_bundle' : '/v_play_bundle';
  UQAPI.rest(nezet + '?select=bundle,version,version_id,course_id&slug=eq.' + encodeURIComponent(slug),
             { anon: !elonezet && !UQAPI.user() })
    .then(function (rows) {
      var b = rows && rows[0] && rows[0].bundle;
      if (!b || !(b.stations || []).length) throw new Error('nincs publikált csomag');
      /* a verzió UUID-ját a csomagba tesszük, hogy OFFLINE (gyorstárból
         indulva) is meglegyen a szerveroldali menethez */
      if (b.course) b.course.version_uuid = rows[0].version_id;
      if (!elonezet) cacheIr(slug, b);
      window.QUEST_COURSES = window.QUEST_COURSES || {};
      window.QUEST_COURSES[slug] = atalakit(b);
      temaAlkalmaz(b);
    })
    .catch(function () {
      /* Marad a gyorstár, ha van. Ha nincs, a lejátszó NEM talál pályát —
         és ezt ki is írja. Korábban ilyenkor a beégetett demó indult el,
         ami rosszabb a hibaüzenetnél: úgy nézett ki, mintha működne. */
    })
    .then(function () { clearTimeout(idozito); tovabb(); });
})();
