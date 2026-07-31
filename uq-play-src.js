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

  var LEJATSZO = 'jatszas.js?v=21';
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

    /* Az állomás UUID-ja → sorszám a pályán. A csomag az elágazásokat
       azonosítóval hivatkozza, a lejátszó viszont indexszel dolgozik. */
    var indexE = {};
    st.forEach(function (s, i) { indexE[s.id] = i; });

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
          /* A videó saját mezőt kap a csomagban. A config-os ág a RÉGI,
             még újra nem publikált csomagoké: azokban a videó a config-ban
             ül, és enélkül a folytatott játékokban eltűnne. */
          video: t.video || (t.config && t.config.video) || '',
          cfg: t.config || {},
          /* CSAPATLÁNC. A lánc leírója KÜLÖN mezőben utazik, nem a config-ban:
             a zárt láncszemnél a config szándékosan üres (a kérdés és a
             beállítások nem mennek le a telefonra), de a feladatnak akkor is
             tudnia kell magáról, hogy ő a lánc hányadik szeme. */
          relay: t.relay || null,
          /* a kiértékeléshez — nyers megoldás nincs a csomagban.
             Láncos feladatnál ez üres: a hash rövid válasznál visszafejthető
             lenne, és pont az a válasz a következő játékos kulcsa. Ilyenkor
             a szerver bírálja el a beküldést (relay_submit). */
          answer_hashes: t.answer_hashes || [],
          salt: t.salt || '',
          auto_ok: !!t.auto_ok,
          hints: t.hints || []
        });
      });
    });

    /* ELÁGAZÁSOK. A szerző a döntési ponton megadja, melyik válasz melyik
       állomásra visz; ezt a csomag `edges` mezője hozza. Állomásonként
       gyűjtjük össze, mert a lejátszó ott kérdezi meg.

       Ismeretlen célt (törölt állomás) kihagyunk: jobb eggyel kevesebb
       választás, mint egy gomb, ami sehová nem visz. */
    (bundle.edges || []).forEach(function (e) {
      var honnan = indexE[e.from], hova = indexE[e.to];
      if (honnan == null || hova == null) return;
      var a = allomasok[honnan];
      (a.branches = a.branches || []).push({
        to: hova,
        label: e.label || '',
        key: e.branch_key || ''
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
      _versionId: bundle.course && bundle.course.version_uuid,
      /* Látszik-e a nagy állomás-képsáv a végigjátszásban. A régi, még újra
         nem publikált csomagokban nincs benne a mező — ott a korábbi
         viselkedés marad (látszik). */
      showStationImage: !(bundle.course && bundle.course.show_station_image === false)
    };
  }

  /* A pálya színe. A csomagból jön, tehát offline is megvan, és MÉG a
     lejátszó betöltése előtt érvénybe lép — így nincs színvillanás. */
  function temaAlkalmaz(bundle) {
    if (!window.UQTema) return;
    var szin = bundle && bundle.course && bundle.course.theme_accent;
    UQTema.alkalmaz(szin || null);
  }

  function cacheOlvas(kulcs) {
    try {
      var raw = localStorage.getItem(CACHE_ELO + kulcs);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function cacheIr(kulcs, bundle) {
    try { localStorage.setItem(CACHE_ELO + kulcs, JSON.stringify(bundle)); } catch (e) {}
  }

  /* =========================================================
     A FUTÓ MENET SAJÁT VERZIÓJA

     A szerver a menetet ahhoz a befagyasztott verzióhoz pontozza, amivel
     elindult (game_sessions.course_version_id). A telefon viszont eddig
     MINDIG a pálya élő csomagját töltötte le. Ha a szerző közben újra
     közzétette a pályát, a folytatott játékos olyan feladatokat kapott,
     amiket a menet verziója nem is ismer: a helyes válasza 0 pontot ért,
     és „vitatott" jelet kapott — mindezt szó nélkül.

     Ezért: ha van itt egy félbehagyott menet, ANNAK a csomagját kérjük le.
     Aki elölről kezd, újra az élőt kapja (lásd a jatszas.js újraindítását).
     ========================================================= */
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function futoMenet(slug) {
    /* CSAPAT: a közös menet a váróból jön, és a megosztott linkről beszálló
       társ telefonján NINCS helyi haladás — neki csak ez az egy nyoma van.
       Ezért ez az első forrás. */
    try {
      var t = (window.UQTeam && UQTeam.ctx) ? UQTeam.ctx() : null;
      if (t && t.slug === slug && UUID.test(String(t.session_id || ''))) return t.session_id;
    } catch (e) {}
    try {
      if (!window.UQAccount || !UQAccount.activePlay) return null;
      var p = UQAccount.activePlay(slug);
      var sid = p && p.state && p.state.sessionId;
      return UUID.test(String(sid || '')) ? sid : null;
    } catch (e) { return null; }
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

  /* Bejelentkezve, félbehagyott menettel a menet SAJÁT verziója a mérvadó.
     Vendégként és előnézetben nincs szerveroldali menet, ott az élő csomag. */
  var menet = (!elonezet && UQAPI.user()) ? futoMenet(slug) : null;
  var cacheKulcs = menet ? ('s_' + menet) : slug;

  /* Offline: a legutóbb letöltött csomag azonnal érvénybe lép, hogy a
     terepen net nélkül is indulhasson a játék. Előnézetben NEM: ott épp
     azt akarod látni, ami most van az adatbázisban, nem a tegnapit. */
  var gyors = elonezet ? null : (cacheOlvas(cacheKulcs) || (menet ? cacheOlvas(slug) : null));
  if (gyors) {
    window.QUEST_COURSES = window.QUEST_COURSES || {};
    window.QUEST_COURSES[slug] = atalakit(gyors);
    if (menet) window.QUEST_COURSES[slug]._pinned = true;
    temaAlkalmaz(gyors);
  }

  var kesz = false;
  function tovabb() { if (!kesz) { kesz = true; betoltLejatszo(); } }

  /* Ne várjunk örökké a hálózatra — 6 másodperc után a gyorstárral
     (vagy a beégetett adattal) indulunk. */
  var idozito = setTimeout(tovabb, 6000);

  function lekeres() {
    if (menet) {
      return UQAPI.rest('/rpc/play_bundle_for_session',
                        { method: 'POST', body: { p_session: menet } })
        .then(function (rows) {
          var r = Array.isArray(rows) ? rows[0] : rows;
          /* Ha a menet eltűnt vagy nem a miénk, nem hallgatunk róla: az élő
             csomaggal megyünk tovább, mint bármelyik új játéknál. */
          if (!r || !r.bundle) return elo();
          return { sor: r, pinned: true };
        })
        .catch(function () { return elo(); });
    }
    return elo();
  }
  function elo() {
    var nezet = elonezet ? '/v_admin_play_bundle' : '/v_play_bundle';
    return UQAPI.rest(nezet + '?select=bundle,version,version_id,course_id&slug=eq.' + encodeURIComponent(slug),
                      { anon: !elonezet && !UQAPI.user() })
      .then(function (rows) { return { sor: rows && rows[0], pinned: false }; });
  }

  lekeres()
    .then(function (t) {
      var b = t && t.sor && t.sor.bundle;
      if (!b || !(b.stations || []).length) throw new Error('nincs publikált csomag');
      /* a verzió UUID-ját a csomagba tesszük, hogy OFFLINE (gyorstárból
         indulva) is meglegyen a szerveroldali menethez */
      if (b.course) b.course.version_uuid = t.sor.version_id;
      /* A rögzített csomag a MENET kulcsára megy, nem a pályáéra: különben
         a következő új játék is a régi verzióval indulna offline. */
      if (!elonezet) cacheIr(t.pinned ? cacheKulcs : slug, b);
      window.QUEST_COURSES = window.QUEST_COURSES || {};
      window.QUEST_COURSES[slug] = atalakit(b);
      if (t.pinned) window.QUEST_COURSES[slug]._pinned = true;
      temaAlkalmaz(b);
    })
    .catch(function () {
      /* Marad a gyorstár, ha van. Ha nincs, a lejátszó NEM talál pályát —
         és ezt ki is írja. Korábban ilyenkor a beégetett demó indult el,
         ami rosszabb a hibaüzenetnél: úgy nézett ki, mintha működne. */
    })
    .then(function () { clearTimeout(idozito); tovabb(); });
})();
