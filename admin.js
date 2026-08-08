/* =========================================================
   URBAN QUEST — ADMIN / PÁLYASZERKESZTŐ interakciók
   ========================================================= */
(function () {
  'use strict';

  /* Fisher-Yates. A regi `sort(() => Math.random() - 0.5)` nem egyenletes
     kevers: az osszehasonlito veletlensege miatt az EREDETI sorrend atut
     rajta, es a szerzo altal elore irt helyes valasz aranytalanul sokszor
     maradt elol. Ugyanez a fuggveny fut a lejatszoban is. */
  function uqKeverve(t) {
    const a = t.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const x = a[i]; a[i] = a[j]; a[j] = x;
    }
    return a;
  }
  /* Sorbarakasnal a kevert kezdoallas nem lehet kesz megoldas: a szerkesztoi
     elonezetben az `items` meg a HELYES sorrendben all. */
  function uqKeverveNemAzonos(t) {
    if (t.length < 2) return t.slice();
    for (let p = 0; p < 12; p++) {
      const a = uqKeverve(t);
      if (a.reduce((n, x, i) => n + (x === t[i] ? 1 : 0), 0) * 2 <= t.length) return a;
    }
    return t.slice(1).concat(t.slice(0, 1));
  }


  /* ---------- segédek ---------- */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* Ezt a fájlt a Pályák szerkesztőn kívül az öt varázsló-oldal is betölti,
     ahol az állomás-szerkesztő űrlapja nem létezik. A közvetlen
     `elem.addEventListener(...)` hívások ilyenkor kivételt dobtak, és a
     modul HÁTRALÉVŐ RÉSZE — köztük a legördülők és az oldalsáv bekötése —
     sosem futott le. Ez a kötő egyszerűen kihagyja a nem létező elemet. */
  const on = (el, ev, fn, opts) => { if (el && el.addEventListener) el.addEventListener(ev, fn, opts); };

  const DIFF_CLASS = { 'Könnyű': 'ed-dot-konnyu', 'Közepes': 'ed-dot-kozepes', 'Nehéz': 'ed-dot-nehez', 'Extrém': 'ed-dot-extrem' };
  const DIFF_VAR = { 'Könnyű': 'var(--konnyu)', 'Közepes': 'var(--kozepes)', 'Nehéz': 'var(--nehez)', 'Extrém': 'var(--extrem)' };

  const LANG_META = {
    hu: { label: 'HU', name: 'Magyar', sym: 'f-hu' },
    en: { label: 'EN', name: 'English', sym: 'f-en' },
    de: { label: 'DE', name: 'Deutsch', sym: 'f-de' },
    fr: { label: 'FR', name: 'Français', css: 'linear-gradient(90deg,#0055A4 33%,#fff 33% 66%,#EF4135 66%)' },
    es: { label: 'ES', name: 'Español', css: 'linear-gradient(180deg,#AA151B 25%,#F1BF00 25% 75%,#AA151B 75%)' },
    it: { label: 'IT', name: 'Italiano', css: 'linear-gradient(90deg,#008C45 33%,#fff 33% 66%,#CD212A 66%)' }
  };
  const ADDABLE = ['fr', 'es', 'it'];

  const IMG_GRADS = [
    'linear-gradient(135deg,#3a4a2a,#6a5a3a)',
    'linear-gradient(135deg,#22405a,#3a5a6a)',
    'linear-gradient(135deg,#4a3a5a,#6a4a5a)',
    'linear-gradient(135deg,#2a4a3a,#3a6a4a)',
    'linear-gradient(135deg,#5a4a2a,#7a6a3a)'
  ];

  /* ---------- állapot ---------- */
  function defLangs(hu, en, de) {
    return [{ code: 'hu', on: hu !== false }, { code: 'en', on: !!en }, { code: 'de', on: !!de }];
  }
  function mk(o) {
    return Object.assign({
      name: 'Új állomás', type: 'Információs állomás', desc: '',
      img: IMG_GRADS[0], difficulty: 'Könnyű', timeLimit: '10 perc', timeLimitOn: false,
      location: '47.5149, 19.0800', langs: defLangs(true, false, false),
      taskType: 'Kvíz kérdés', question: '', answer: '', score: '50 pont',
      xp: '50 XP', badge: 'Felfedező', logicPrev: true, logicMandatory: false, logicReturn: false
    }, o);
  }

  /* A szerkesztő állapota ÜRESEN indul.

     Korábban itt hét beégetett városligeti állomás állt, teljes leírással,
     kérdéssel és megoldással. Ezek a bejelentkezés-ellenőrzés ELŐTT
     kirenderelődtek, tehát egy kijelentkezett látogató is egy kész,
     szerkeszthetőnek látszó pályát látott a „Bejelentkezés szükséges"
     felirat alatt — olyan pályát, ami sosem létezett. A valódi állomásokat
     a loadCourse() tölti be az adatbázisból. */
  const state = [];
  let current = 0;

  /* =========================================================
     JÁTÉK-VÁLASZTÓ + PÁLYA MENTÉS — SUPABASE
     Korábban ez a térképes szerkesztő a böngésző uq_courses_v1
     tárolójába írt, teljesen külön az Állomások oldaltól. Ezért a
     legördülő beégetett demó neveket mutatott, és a térképen végzett
     szerkesztés sehol máshol nem látszott. Most az adatbázis a forrás,
     ugyanaz, amit az Állomások / Feladatok / Játékok oldalak használnak.

     FONTOS: ez a szerkesztő KIZÁRÓLAG az állomás-sorokat kezeli (név,
     típus, nehézség, koordináta, leírás). Az állomásba ágyazott
     „taskType/question/answer” mezők csak UI-alapértékek — a feladatokat
     a Feladatok oldal szerkeszti, hogy ne legyen két igazságforrás.
     ========================================================= */

  function clone(o) { try { return JSON.parse(JSON.stringify(o)); } catch (e) { return Object.assign({}, o); } }

  var COURSES_INDEX = [];       // [{id, name}]
  /* Látszik-e a nagy állomás-képsáv a végigjátszás-előnézetben.
     A pálya beállítása (courses.show_station_image) dönti el. */
  var ALLOMAS_KEP = true;
  var currentCourseId = null;
  var currentGame = '';          // megjelenítendő név (a fejléchez, modalhoz)

  var LABEL_KIND = { 'Kezdő állomás': 'kezdo', 'Információs állomás': 'info', 'Feladat állomás': 'feladat', 'Döntési pont': 'dontes', 'Záróállomás': 'zaro', 'Záró állomás': 'zaro' };
  var KIND_LABEL = { kezdo: 'Kezdő állomás', info: 'Információs állomás', feladat: 'Feladat állomás', dontes: 'Döntési pont', zaro: 'Záróállomás' };
  var LABEL_DIFF = { 'Könnyű': 'konnyu', 'Közepes': 'kozepes', 'Nehéz': 'nehez', 'Extrém': 'extrem' };
  var DIFF_LABEL = { konnyu: 'Könnyű', kozepes: 'Közepes', nehez: 'Nehéz', extrem: 'Extrém' };

  function parseLoc2(str) {
    var p = String(str || '').split(',').map(function (x) { return parseFloat(x); });
    return { lat: isFinite(p[0]) ? p[0] : null, lng: isFinite(p[1]) ? p[1] : null };
  }
  function percToS(s) { var m = String(s || '').match(/\d+/); return m ? Number(m[0]) * 60 : null; }

  function dbToStation(r) {
    var o = {
      id: r.id,
      name: r.name || 'Állomás',
      type: KIND_LABEL[r.kind] || 'Feladat állomás',
      desc: r.description || '',
      difficulty: DIFF_LABEL[r.difficulty] || 'Közepes',
      location: (r.lat != null && r.lng != null) ? (r.lat + ', ' + r.lng) : '47.5149, 19.0800',
      timeLimitOn: r.time_limit_s != null,
      timeLimit: r.time_limit_s ? (Math.round(r.time_limit_s / 60) + ' perc') : '10 perc',
      /* image = a TÁROLÓBAN lévő kép címe (ezt kapja a játékos),
         img   = a szerkesztő bélyegképének CSS-háttere. A kettő nem
         cserélhető fel: korábban csak az utóbbi létezett, ezért a
         feltöltött kép sosem jutott túl a böngésző memóriáján. */
      image: r.image || ''
    };
    /* Csak akkor írjuk felül a bélyegkép hátterét, ha VAN kép — az
       Object.assign az `undefined`-et is átmásolná az alapérték fölé. */
    if (r.image) o.img = 'center/cover no-repeat url("' + r.image + '")';
    return mk(o);
  }

  function stationPayload(s) {
    var loc = parseLoc2(s.location);
    // position SZÁNDÉKOSAN kimarad — a sorrendet a reorder_stations állítja
    // egyetlen tranzakcióban, így nincs pozíció-ütközés a mentés közben.
    return {
      id: s.id || null,
      course_id: currentCourseId,
      name: s.name || 'Névtelen állomás',
      kind: LABEL_KIND[s.type] || 'feladat',
      difficulty: LABEL_DIFF[s.difficulty] || 'kozepes',
      description: s.desc || '',
      lat: loc.lat, lng: loc.lng,
      time_limit_s: s.timeLimitOn ? percToS(s.timeLimit) : null,
      /* Ez a mező eddig hiányzott a beküldésből: a „Kép cseréje" gomb
         csinált egy böngésző-memóriabeli hivatkozást, sikert jelzett, és a
         kép a lap bezárásával elveszett. A tábla és a befagyasztás régóta
         tudja kezelni — csak sosem kapott értéket. */
      image: s.image || null
    };
  }

  /* =========================================================
     ELÁGAZÁS (döntési pont → több folytatás)

     A station_edges tábla és a befagyasztott csomag „edges" mezője régóta
     megvolt, csak épp SEMMI nem töltötte fel: a felületen nem lehetett
     megadni, melyik válasz hová visz. A lejátszó ezért a lista következő
     KÉT állomását ajánlotta fel — vagyis az elágazást a sorrend döntötte
     el, nem a pálya szerzője, és a két ág mindig visszatért ugyanoda.

     A cél tárolása AZ ÁLLOMÁS-OBJEKTUMRA mutat, nem sorszámra: a listát
     húzással át lehet rendezni, és az objektum-azonosság ezt túléli,
     a sorszám nem. Az adatbázisba mentéskor oldjuk fel azonosítóra —
     így olyan állomásra is lehet ágat húzni, ami még el sem volt mentve.
     ========================================================= */

  function betoltAgak(courseId, arr) {
    arr.forEach(function (s) { s.branches = []; });
    if (!window.UQAPI || !UQAPI.user()) return Promise.resolve();
    return UQAPI.rest('/v_admin_edges?select=from_station,to_station,label,branch_key,sort_order' +
                      '&course_id=eq.' + courseId + '&order=sort_order.asc')
      .then(function (rows) {
        var idRe = {};
        arr.forEach(function (s) { if (s.id) idRe[s.id] = s; });
        (rows || []).forEach(function (r) {
          var honnan = idRe[r.from_station], hova = idRe[r.to_station];
          if (!honnan || !hova) return;
          honnan.branches.push({ label: r.label || '', to: hova, key: r.branch_key || '' });
          honnan._voltAg = true;
        });
        renderBranches(); renderPrev();
        /* A TÉRKÉPET is újra kell rajzolni. A vonalak a pálya betöltésekor
           készülnek, amikor az élek MÉG NEM érkeztek meg — enélkül a térkép
           örökre a sorrend szerinti tartalék-útvonalat mutatta, akkor is, ha
           a szerző mást adott meg. */
        renderRoutes();
      })
      .catch(function () { /* offline: ágak nélkül is szerkeszthető a pálya */ });
  }

  function agakMentese(courseId) {
    if (!window.UQAPI) return Promise.resolve();
    /* Csak azokra küldünk kérést, ahol VAN vagy VOLT ág — különben minden
       mentés annyi fölösleges hívást indítana, ahány állomás van. */
    var erintett = state.filter(function (s) {
      return s.id && ((s.branches && s.branches.length) || s._voltAg);
    });
    return erintett.reduce(function (chain, s) {
      return chain.then(function () {
        if (currentCourseId !== courseId) return;
        var lista = (s.branches || [])
          .filter(function (b) { return b.to && b.to.id; })
          .map(function (b, i) {
            return { to: b.to.id, label: b.label || '', branch_key: b.key || ('ag' + (i + 1)) };
          });
        return UQAPI.rest('/rpc/save_station_edges', {
          method: 'POST', body: { p_station: s.id, p_edges: lista }
        }).then(function () {
          s._voltAg = lista.length > 0;
        }).catch(function () { /* a következő mentés újrapróbálja */ });
      });
    }, Promise.resolve());
  }

  /* =========================================================
     MELYIK ÁLLOMÁS UTÁN (bejövő élek)

     Ugyanaz a gráf, mint az elágazás-szerkesztőé, csak a másik irányból
     nézve. Az él MINDIG a forrás állomás `branches` tömbjében él — itt csak
     máshonnan nyúlunk hozzá. Ezért nincs külön mentés: az agakMentese()
     változatlanul mindent kiír.
     ========================================================= */

  /* Kik mutatnak erre az állomásra? [{ honnan: index, ag: objektum }] */
  function elozmenyek(cel) {
    var ki = [];
    state.forEach(function (p, i) {
      (p.branches || []).forEach(function (b) {
        if (b && b.to === cel) ki.push({ honnan: i, ag: b });
      });
    });
    return ki;
  }

  function dontesiPont(st) { return !!(st && st.type === 'Döntési pont'); }

  /* Van-e KIFEJEZETT előzménye ennek az állomásnak (index szerint)?
     Ha igen, a pozíció szerinti tartalék nem vezethet ide — a szerző már
     megmondta, honnan jön. */
  function vanElozmeny(idx) {
    var cel = state[idx];
    if (!cel) return false;
    return state.some(function (p) {
      return (p.branches || []).some(function (b) { return b && b.to === cel; });
    });
  }

  function renderPrev() {
    var box = $('#edPrevBox');
    if (!box) return;
    var s = state[current];
    if (!s) { box.hidden = true; return; }
    box.hidden = false;

    var lista = $('#edPrev');
    var db = $('#edPrevCount');
    var hint = $('#edPrevHint');
    var warn = $('#edPrevWarn');
    var elozok = elozmenyek(s);

    if (db) db.textContent = elozok.length ? '(' + elozok.length + ')' : '';

    /* A kezdő állomásnak nincs értelme előzményt adni — ott indul a játék. */
    var kezdo = s.type === 'Kezdő állomás';
    if (hint) {
      hint.textContent = kezdo
        ? 'Ez a kezdő állomás — itt indul a játék, ezért nem következik semmi után. Ha mégis megadsz előzményt, a pálya körbeér.'
        : 'Add meg, melyik állomás(ok) után következzen ez. Több is lehet — így ér össze két ág ugyanazon a ponton.';
    }

    if (!elozok.length) {
      lista.innerHTML = '<div class="est-empty">' +
        (kezdo ? 'Nincs előzménye — így helyes.'
               : 'Nincs megadva előzmény. Ilyenkor a játék a LISTA sorrendje szerint jut ide, ' +
                 'ami átrendezés után máshová vezethet.') + '</div>';
      if (warn) warn.hidden = true;
      return;
    }

    var opciok = state.map(function (t, i) {
      if (t === s) return '';
      return '<option value="' + i + '">' + (i + 1) + '. ' + esc(t.name) + '</option>';
    }).join('');

    lista.innerHTML = elozok.map(function (e, k) {
      var forras = state[e.honnan];
      var kellCimke = dontesiPont(forras);
      return '<div class="ed-branch" data-p="' + k + '">' +
        '<div class="ed-field ed-select ed-prev-from">' +
          '<select data-p-from="' + k + '"><option value="">— melyik után? —</option>' + opciok + '</select>' +
          '<svg class="ico ico-xs" aria-hidden="true"><use href="#a-down"/></svg>' +
        '</div>' +
        /* Feliratot CSAK döntési pontnál kérünk — ott az a válasz szövege,
           amit a játékos gombként lát. Sima állomásnál nincs mit felirat-
           ozni, és a keskeny fiókban minden pixel a választóé. */
        (kellCimke
          ? '<input class="ed-branch-label" type="text" data-p-label="' + k + '" ' +
            'placeholder="A válasz szövege — ezt látja a játékos" value="' + esc(e.ag.label || '') + '">'
          : '') +
        '<button class="ed-branch-x" type="button" data-p-del="' + k + '" aria-label="Előzmény törlése">' +
          '<svg class="ico ico-xs" aria-hidden="true"><use href="#a-x"/></svg></button>' +
      '</div>';
    }).join('');

    elozok.forEach(function (e, k) {
      var sel = lista.querySelector('[data-p-from="' + k + '"]');
      if (sel) sel.value = String(e.honnan);
    });

    /* Figyelmeztetés: ha egy NEM döntési pont több felé mutat, a játékos
       választóképernyőt kap felirat nélküli gombokkal. Nem tiltjuk — lehet
       szándékos —, de ki kell mondani. */
    var gondok = [];
    elozok.forEach(function (e) {
      var forras = state[e.honnan];
      var ki = (forras.branches || []).filter(function (b) { return b && state.indexOf(b.to) >= 0; });
      if (ki.length > 1 && !dontesiPont(forras)) {
        gondok.push((e.honnan + 1) + '. „' + forras.name + '” — ' + ki.length + ' folytatása van, de nem döntési pont');
      }
    });
    if (warn) {
      warn.hidden = !gondok.length;
      warn.textContent = gondok.length
        ? gondok.join(' • ') + '. A játékos itt választóképernyőt kap felirat nélkül — tedd döntési ponttá, vagy vedd le az egyik folytatást.'
        : '';
    }
  }

  /* --- az előzmény-szerkesztő eseményei (delegálva) --- */

  document.addEventListener('input', function (ev) {
    var el = ev.target.closest ? ev.target.closest('[data-p-label]') : null;
    if (!el) return;
    var s = state[current]; if (!s) return;
    var e = elozmenyek(s)[+el.dataset.pLabel];
    if (!e) return;
    e.ag.label = el.value;
    saveCourse();
  });

  document.addEventListener('change', function (ev) {
    var el = ev.target.closest ? ev.target.closest('[data-p-from]') : null;
    if (!el) return;
    var s = state[current]; if (!s) return;
    var e = elozmenyek(s)[+el.dataset.pFrom];
    if (!e) return;

    var ujIdx = el.value === '' ? -1 : +el.value;
    /* A régi forrásból kivesszük, az újba betesszük — az él mindig a forrás
       állomásnál él, tehát a „ki mutat rám" változtatása két tömböt érint. */
    var regi = state[e.honnan];
    var i = (regi.branches || []).indexOf(e.ag);
    if (i > -1) regi.branches.splice(i, 1);
    regi._voltAg = true;

    if (ujIdx >= 0 && state[ujIdx]) {
      var uj = state[ujIdx];
      uj.branches = uj.branches || [];
      uj._voltAg = true;
      uj.branches.push({ label: e.ag.label || '', to: s, key: e.ag.key || '' });
    }
    renderBranches(); renderPrev(); renderRoutes(); saveCourse();
  });

  document.addEventListener('click', function (ev) {
    var del = ev.target.closest ? ev.target.closest('[data-p-del]') : null;
    if (del) {
      var s = state[current]; if (!s) return;
      var e = elozmenyek(s)[+del.dataset.pDel];
      if (!e) return;
      var forras = state[e.honnan];
      var i = (forras.branches || []).indexOf(e.ag);
      if (i > -1) forras.branches.splice(i, 1);
      forras._voltAg = true;
      renderBranches(); renderPrev(); renderRoutes(); saveCourse();
      return;
    }

    var add = ev.target.closest ? ev.target.closest('#edAddPrev') : null;
    if (add) {
      var st = state[current]; if (!st) return;

      /* Az első SZABAD állomást ajánljuk fel, nem vakon a listában előzőt.
         Korábban mindig a `current - 1` volt a jelölt, és ha az már előzmény
         volt, a gomb egy villanó üzenettel nem csinált semmit — a MÁSODIK
         előzményt (amivel a két ág összeér) így nem lehetett felvenni.
         A sorrendben előző a legvalószínűbb, ezért azzal kezdjük a keresést,
         de ha foglalt, továbblépünk a többire. */
      var mar = {};
      elozmenyek(st).forEach(function (x) { mar[x.honnan] = true; });

      var jeloltek = [];
      if (current > 0) jeloltek.push(current - 1);
      state.forEach(function (_, i) { if (jeloltek.indexOf(i) < 0) jeloltek.push(i); });

      var alap = -1;
      for (var j = 0; j < jeloltek.length; j++) {
        var i2 = jeloltek[j];
        if (state[i2] !== st && !mar[i2]) { alap = i2; break; }
      }

      if (alap < 0) {
        toast(state.length < 2 ? 'Ehhez legalább két állomás kell'
                               : 'Már minden állomás előzmény', { type: 'warn' });
        return;
      }
      var p = state[alap];
      p.branches = p.branches || [];
      p._voltAg = true;
      p.branches.push({ label: '', to: st, key: '' });
      renderBranches(); renderPrev(); renderRoutes(); saveCourse();
    }
  });

  function renderBranches() {
    var box = $('#edBranchBox');
    if (!box) return;
    var s = state[current];
    var dontes = !!(s && s.type === 'Döntési pont');
    box.hidden = !dontes;
    if (!dontes) return;

    var lista = $('#edBranches');
    var db = $('#edBranchCount');
    var agak = s.branches || (s.branches = []);
    if (db) db.textContent = agak.length ? '(' + agak.length + ')' : '';

    if (!agak.length) {
      lista.innerHTML = '<div class="est-empty">Még nincs válaszlehetőség. ' +
        'Amíg nincs, a játék egyszerűen a következő állomással folytatódik.</div>';
      return;
    }

    /* A cél-választó MINDEN másik állomást felkínál — a döntési pont
       visszafelé is mutathat, ha a szerző így akarja. */
    var opciok = state.map(function (t, i) {
      if (t === s) return '';
      return '<option value="' + i + '">' + (i + 1) + '. ' + esc(t.name) + '</option>';
    }).join('');

    lista.innerHTML = agak.map(function (b, k) {
      var celIdx = state.indexOf(b.to);
      return '<div class="ed-branch" data-b="' + k + '">' +
        '<span class="ed-branch-k">' + 'ABCDEFGH'.charAt(k) + '</span>' +
        '<input class="ed-branch-label" type="text" data-b-label="' + k + '" ' +
          'placeholder="A válasz szövege — ezt látja a játékos" value="' + esc(b.label || '') + '">' +
        '<div class="ed-field ed-select ed-branch-to">' +
          '<select data-b-to="' + k + '"><option value="">— hová visz? —</option>' + opciok + '</select>' +
          '<svg class="ico ico-xs" aria-hidden="true"><use href="#a-down"/></svg>' +
        '</div>' +
        '<button class="ed-branch-x" type="button" data-b-del="' + k + '" aria-label="Ág törlése">' +
          '<svg class="ico ico-xs" aria-hidden="true"><use href="#a-x"/></svg></button>' +
      '</div>';
    }).join('');

    // a select értékét külön állítjuk, hogy az escape-elés ne rontsa el
    agak.forEach(function (b, k) {
      var sel = lista.querySelector('[data-b-to="' + k + '"]');
      if (sel) sel.value = state.indexOf(b.to) >= 0 ? String(state.indexOf(b.to)) : '';
    });
  }

  /* Az ág-szerkesztő eseményei — delegálva, mert a sorok újrarajzolódnak. */
  document.addEventListener('input', function (e) {
    var el = e.target.closest ? e.target.closest('[data-b-label]') : null;
    if (!el) return;
    var s = state[current]; if (!s || !s.branches) return;
    var b = s.branches[+el.dataset.bLabel];
    if (b) { b.label = el.value; s._voltAg = true; saveCourse(); }
  });
  document.addEventListener('change', function (e) {
    var el = e.target.closest ? e.target.closest('[data-b-to]') : null;
    if (!el) return;
    var s = state[current]; if (!s || !s.branches) return;
    var b = s.branches[+el.dataset.bTo];
    if (!b) return;
    b.to = el.value === '' ? null : state[+el.value];
    s._voltAg = true;
    saveCourse();
    renderRoutes();
  });
  document.addEventListener('click', function (e) {
    var del = e.target.closest ? e.target.closest('[data-b-del]') : null;
    if (del) {
      var s = state[current]; if (!s || !s.branches) return;
      s.branches.splice(+del.dataset.bDel, 1);
      s._voltAg = true;
      renderBranches(); renderPrev(); renderRoutes(); saveCourse();
      return;
    }
    if (e.target.closest && e.target.closest('#edAddBranch')) {
      var st = state[current]; if (!st) return;
      st.branches = st.branches || [];
      if (st.branches.length >= 8) { toast('Nyolcnál több ág már áttekinthetetlen', { type: 'warn' }); return; }
      /* Alapértelmezett cél a következő állomás — a leggyakoribb eset,
         és így egy kattintással is működő ág keletkezik. */
      var kov = state[current + 1] || state.find(function (x) { return x !== st; }) || null;
      st.branches.push({ label: '', to: kov, key: '' });
      st._voltAg = true;
      renderBranches(); renderPrev(); renderRoutes(); saveCourse();
    }
  });

  /* ---- debounce-olt szinkron az adatbázisba ---- */
  var syncTimer = null, syncing = false, syncQueued = false;

  function saveCourse() { scheduleSync(); }   // a régi név megmarad, a hívók változatlanok

  function scheduleSync() {
    if (!currentCourseId || !window.UQAPI) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () { syncToDb(); }, 900);
  }

  function syncToDb() {
    if (!currentCourseId || !window.UQAPI) return Promise.resolve();
    if (syncing) { syncQueued = true; return Promise.resolve(); }
    syncing = true;
    var courseId = currentCourseId;
    var snapshot = state.slice();          // az objektumok osztottak, az új id-k visszaíródnak
    var order = [];

    /* Ha a szinkron közben pályát váltanak, az EGÉSZ menetet eldobjuk.
       Enélkül a félbehagyott mentés után a törlés-lépés kitörölné azokat
       az állomásokat, amiket még nem sikerült elmenteni — adatvesztés. */
    var megszakadt = false;

    return UQAPI.rest('/v_admin_stations?select=id&course_id=eq.' + courseId)
      .then(function (rows) {
        var toDelete = {};
        (rows || []).forEach(function (r) { toDelete[r.id] = true; });

        // sorosan mentünk: az új sorok id-t kapnak, amit visszaírunk a state-be
        return snapshot.reduce(function (chain, s) {
          return chain.then(function () {
            if (megszakadt) return;
            if (currentCourseId !== courseId) { megszakadt = true; return; }
            return UQAPI.rest('/rpc/save_station', { method: 'POST', body: { p: stationPayload(s) } })
              .then(function (r) {
                var id = (Array.isArray(r) ? r[0] : r).id;
                s.id = id; order.push(id); delete toDelete[id];
              });
          });
        }, Promise.resolve()).then(function () { return toDelete; });
      })
      .then(function (toDelete) {
        // csak akkor törlünk, ha MINDEN állomás sikeresen elmentődött
        if (megszakadt || currentCourseId !== courseId) return;
        var ids = Object.keys(toDelete);
        return ids.reduce(function (chain, id) {
          return chain.then(function () {
            return UQAPI.rest('/rpc/delete_station', { method: 'POST', body: { p_station: id } }).catch(function () {});
          });
        }, Promise.resolve());
      })
      .then(function () {
        if (megszakadt || !order.length || currentCourseId !== courseId) return;
        return UQAPI.rest('/rpc/reorder_stations', { method: 'POST', body: { p_course: courseId, p_ids: order } });
      })
      .then(function () {
        /* Az ágak CSAK most menthetők: addig nincs azonosítója az újonnan
           felvett állomásoknak, amikre mutatnak. */
        if (megszakadt || currentCourseId !== courseId) return;
        return agakMentese(courseId);
      })
      .then(function () {
        /* A játékos a pálya BEFAGYASZTOTT verzióját játssza, nem a
           szerkesztő tábláit. Újrafagyasztás nélkül a térképen végzett
           munka — az elágazásokkal együtt — sosem jutna el a játékig. */
        if (megszakadt || currentCourseId !== courseId) return;
        return UQAPI.rest('/rpc/publish_course', { method: 'POST', body: { p_course: courseId } })
          .catch(function () { /* a mentés ettől még sikeres volt */ });
      })
      .then(function () {
        try { localStorage.removeItem('uq_catalog_v1'); } catch (e) {}
      })
      .catch(function (e) {
        toast('Mentés nem sikerült', { type: 'error', sub: (e && e.message) || 'hálózati hiba' });
      })
      .then(function () {
        syncing = false;
        if (syncQueued) { syncQueued = false; scheduleSync(); }
      });
  }

  // Egy pálya betöltése a state-be (const state — HELYBEN mutálva).
  function loadCourse(courseId) {
    currentCourseId = courseId;
    var idx = COURSES_INDEX.find(function (c) { return c.id === courseId; });
    currentGame = idx ? idx.name : currentGame;

    return UQAPI.rest('/v_admin_stations?select=*&course_id=eq.' + courseId + '&order=position.asc')
      .then(function (rows) {
        var arr;
        if (rows && rows.length) {
          arr = rows.map(dbToStation);
        } else {
          // üres pálya: egy induló állomás, hogy a térkép ne legyen üres
          arr = [mk({ name: 'Kezdő állomás', type: 'Kezdő állomás', location: '47.5138, 19.0783' })];
        }
        arr.forEach(function (s) { delete s.mx; delete s.my; });
        state.splice(0, state.length, ...arr);
        current = 0;
        initMapCoords();
        /* Az elágazások az állomásokra épülnek, ezért csak utánuk tölthetők. */
        betoltAgak(courseId, arr);
        /* A kapcsolt feladatok panelének is friss adat kell — enélkül a
           lista „N feladat" számlálója és a panel is üres maradna. */
        betoltFeladatok().then(function () { renderStationTasks(); renderList(); });
        renderList();
        renderNodes();
        loadForm(current);
        updateCourseCount();
        var h1 = $('#admCourseName');
        if (h1 && h1.childNodes[0]) h1.childNodes[0].textContent = currentGame + ' ';
        var cmName = $('#cmName'); if (cmName) cmName.value = currentGame;
        var sel = $('#admGameSelect'); if (sel) sel.value = courseId;
        allapotKiiras();
        ALLOMAS_KEP = !(idx && idx.show_station_image === false);
        refreshActiveTab();
        if (map) {
          setTimeout(function () {
            map.invalidateSize();
            if (markers.length) { try { map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2)); } catch (e) {} }
          }, 100);
        }
      });
  }

  // Pálya-választó feltöltése + váltás
  function initGameSelector() {
    var sel = $('#admGameSelect');
    if (!sel) return;
    sel.innerHTML = COURSES_INDEX.map(function (c) {
      return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>';
    }).join('');
    if (currentCourseId) sel.value = currentCourseId;
    sel.addEventListener('change', function () {
      saveForm(current);
      // a folyamatban lévő szerkesztést VÁLTÁS ELŐTT kiírjuk
      clearTimeout(syncTimer);
      Promise.resolve(syncToDb()).then(function () {
        return loadCourse(sel.value);
      }).then(function () {
        var c = COURSES_INDEX.find(function (x) { return x.id === sel.value; });
        toast('Pálya betöltve', { type: 'info', sub: c ? c.name : '' });
      });
    });
  }

  /* ---------- térkép-koordináták (valós lat/lng → % a vásznon) ---------- */
  function parseLoc(str) { const p = String(str || '').split(',').map(x => parseFloat(x)); return { lat: isFinite(p[0]) ? p[0] : 47.515, lng: isFinite(p[1]) ? p[1] : 19.08 }; }
  const mapBBox = { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
  function initMapCoords() {
    const pts = state.map(s => parseLoc(s.location));
    mapBBox.minLat = Math.min.apply(null, pts.map(p => p.lat)); mapBBox.maxLat = Math.max.apply(null, pts.map(p => p.lat));
    mapBBox.minLng = Math.min.apply(null, pts.map(p => p.lng)); mapBBox.maxLng = Math.max.apply(null, pts.map(p => p.lng));
    const sLat = (mapBBox.maxLat - mapBBox.minLat) || 0.01, sLng = (mapBBox.maxLng - mapBBox.minLng) || 0.01;
    state.forEach((s, i) => { if (s.mx == null) { s.mx = 14 + (pts[i].lng - mapBBox.minLng) / sLng * 72; s.my = 14 + (mapBBox.maxLat - pts[i].lat) / sLat * 72; } });
  }
  initMapCoords();

  /* ---------- DOM ---------- */
  const listEl = $('#stationList');
  const formEl = $('#edForm');
  const langsEl = $('#edLangs');
  const thumbEl = $('#edThumb');
  const dotEl = $('#edDot');

  /* ---------- Leaflet térkép (valós utcatérkép) ---------- */
  var map = null, markers = [], routeLayer = null;
  function initLeaflet() {
    var host = document.getElementById('edLeaflet');
    if (!host || typeof L === 'undefined') return;
    map = L.map('edLeaflet', { zoomControl: false }).setView([47.515, 19.0808], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    routeLayer = L.layerGroup().addTo(map);
    map.on('click', onMapClick);
    map.on('zoomend', updateZoomVal);
    updateZoomVal();
    setTimeout(function () { if (map) map.invalidateSize(); }, 200);
  }
  // valós lat/lng → mx/my százalék (a play-mód mini-térképéhez); mindig felülír
  function syncMxMy() {
    if (!state.length) return;
    var pts = state.map(function (s) { return parseLoc(s.location); });
    mapBBox.minLat = Math.min.apply(null, pts.map(function (p) { return p.lat; }));
    mapBBox.maxLat = Math.max.apply(null, pts.map(function (p) { return p.lat; }));
    mapBBox.minLng = Math.min.apply(null, pts.map(function (p) { return p.lng; }));
    mapBBox.maxLng = Math.max.apply(null, pts.map(function (p) { return p.lng; }));
    var sLat = (mapBBox.maxLat - mapBBox.minLat) || 0.01, sLng = (mapBBox.maxLng - mapBBox.minLng) || 0.01;
    state.forEach(function (s, i) {
      s.mx = 14 + (pts[i].lng - mapBBox.minLng) / sLng * 72;
      s.my = 14 + (mapBBox.maxLat - pts[i].lat) / sLat * 72;
    });
  }
  function updateZoomVal() { var zv = $('#edZoomVal'); if (zv && map) zv.textContent = map.getZoom() + 'x'; }

  /* =========================================================
     TOAST
     ========================================================= */
  const toastWrap = $('#uqToasts');
  function toast(msg, opt) {
    opt = opt || {};
    const type = opt.type || 'ok';
    const t = document.createElement('div');
    t.className = 'uq-toast' + (type !== 'ok' ? ' is-' + type : '');
    const ic = type === 'ok' ? 'a-check' : (type === 'error' ? 'a-x' : 'a-clock');
    t.innerHTML = '<span class="uq-toast-ic"><svg class="ico" aria-hidden="true"><use href="#' + ic + '"/></svg></span>' +
      '<div class="uq-toast-body"><b>' + esc(msg) + '</b>' + (opt.sub ? '<small>' + esc(opt.sub) + '</small>' : '') + '</div>' +
      '<button class="uq-toast-x" type="button" aria-label="Bezárás"><svg class="ico ico-sm" aria-hidden="true"><use href="#a-x"/></svg></button>';
    toastWrap.appendChild(t);
    /* rAF-et a böngésző elfojtja, ha a lap nem látszik (másik fül) —
       időzítő is biztosítja, hogy az értesítés megjelenjen. */
    const megjelenit = () => t.classList.add('is-show');
    requestAnimationFrame(megjelenit);
    setTimeout(megjelenit, 60);
    const close = () => { t.classList.remove('is-show'); setTimeout(() => t.remove(), 260); };
    t.querySelector('.uq-toast-x').addEventListener('click', close);
    setTimeout(close, 3200);
  }

  /* =========================================================
     ÁLLOMÁS LISTA + TÉRKÉP NODE-OK RENDERELÉSE
     ========================================================= */
  /* =========================================================
     KAPCSOLT FELADATOK (állomás ↔ feladat lánc, localStorage)
     ========================================================= */
  /* A kapcsolt feladatok a HALOTT uq_tasks_v1 kulcsból jöttek, ezért a panel
     minden állomásnál azt írta, hogy „Nincs kapcsolt feladat" — akkor is,
     ha az állomásnak volt feladata. A számláló a listában ugyanettől
     maradt üres. Mostantól ugyanabból a nézetből olvas, mint a Feladatok
     oldal, tehát ugyanazt mutatja. */
  const TASK_TYPE = { kviz: { l: 'Kvíz', c: '#5b9de0' }, szoveg: { l: 'Szöveges', c: '#e0b93a' }, puzzle: { l: 'Puzzle', c: '#8fb04f' }, kod: { l: 'Kód-feltörés', c: '#e8813a' }, foto: { l: 'Fotó', c: '#9d7ce0' }, gps: { l: 'GPS', c: '#4fb84f' }, qr: { l: 'QR-kód', c: '#39c0c8' }, info: { l: 'Infó', c: '#8a97a8' }, dontes: { l: 'Döntés', c: '#e05b9d' } };
  const TASK_STATUS = { active: 'Aktív', draft: 'Vázlat', archived: 'Archivált' };

  /* állomás-id → feladatai (a pálya betöltésekor egyszer kérjük le) */
  let TASKS_BY_STATION = {};

  function betoltFeladatok() {
    if (!window.UQAPI || !UQAPI.user() || !currentCourseId) {
      TASKS_BY_STATION = {};
      return Promise.resolve();
    }
    /* A `image` és a `video` NEM elhagyható a listából. A „Játékos nézet" fül
       ugyanezekből a sorokból építi a feladatot, és amit itt nem kérünk el, az
       a lejátszó számára nem létezik: a képpel feltöltött feladat képe némán
       kimaradt az előnézetből — a kérdés és a válaszok látszottak, a kép nem.
       (A `hints`-et is elkérjük, hogy a tipp-számláló ne hazudjon nullát.) */
    return UQAPI.rest('/v_admin_tasks?select=id,station_id,question,title,kind,points,status,config,solution' +
                      ',image,video,hints,help,time_limit_s,required' +
                      '&course_id=eq.' + currentCourseId + '&order=station_position.asc,position.asc')
      .then(function (rows) {
        const m = {};
        (rows || []).forEach(function (t) { (m[t.station_id] = m[t.station_id] || []).push(t); });
        TASKS_BY_STATION = m;
      })
      .catch(function () { TASKS_BY_STATION = {}; });
  }

  function countByStation() {
    const m = {};
    state.forEach(function (s) {
      const n = (TASKS_BY_STATION[s.id] || []).length;
      if (n) m[s.name] = n;
    });
    return m;
  }

  function renderStationTasks() {
    const host = $('#edStationTasks'); if (!host) return;
    const st = state[current];
    const addBtn = '<button class="est-add" type="button" id="edAddTask"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-plus"/></svg>Új feladat ehhez az állomáshoz</button>';
    const cnt = $('#edTaskCount');

    if (!st) { host.innerHTML = '<div class="est-empty">Nincs kiválasztott állomás.</div>'; if (cnt) cnt.textContent = ''; return; }
    const tasks = TASKS_BY_STATION[st.id] || [];
    if (cnt) cnt.textContent = tasks.length ? '(' + tasks.length + ')' : '';
    if (!tasks.length) { host.innerHTML = '<div class="est-empty">Nincs kapcsolt feladat ehhez az állomáshoz.</div>' + addBtn; return; }

    host.innerHTML = tasks.map(function (t) {
      const ty = TASK_TYPE[t.kind] || { l: t.kind, c: '#8b957f' };
      /* Az „Eltávolítás" gomb kikerült: a feladat nem létezhet állomás nélkül,
         a leválasztás egy halott kulcsba írt volna. Törölni vagy áthelyezni
         a Feladatok oldalon lehet. */
      return '<div class="est-item"><span class="est-ic" style="color:' + ty.c + ';background:' + ty.c + '22"><svg class="ico" aria-hidden="true"><use href="#a-task"/></svg></span>' +
        '<span class="est-body"><b>' + esc(t.title || t.question) + '</b><small>' + esc(ty.l) + ' · ' + (t.points || 0) + ' pont · ' + esc(TASK_STATUS[t.status] || t.status || '') + '</small></span>' +
        '<button class="est-go" type="button" data-open="' + esc(t.id) + '" aria-label="Megnyitás"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-preview"/></svg></button></div>';
    }).join('') + addBtn;
  }

  document.addEventListener('click', (e) => {
    const add = e.target.closest('#edAddTask');
    if (add) {
      saveForm(current);
      const st = state[current];
      if (!st) return;
      /* A Feladatok oldal két különböző kulcsot vár: a `game` a pálya
         AZONOSÍTÓJA (arra szűri a listát), a `station` viszont az állomás
         NEVE, mert az állomás-választó értékei nevek. */
      location.href = 'feladatok.html?game=' + encodeURIComponent(currentCourseId || '') +
                      '&station=' + encodeURIComponent(st.name) + '#new';
      return;
    }
    const open = e.target.closest('#edStationTasks [data-open]');
    if (open) { location.href = 'feladatok.html#edit-' + open.dataset.open; return; }
  });

  /* Visszatérve a Feladatok oldalról a panel frissüljön. */
  function ujraFeladatok() { betoltFeladatok().then(function () { renderStationTasks(); renderList(); }); }
  window.addEventListener('focus', ujraFeladatok);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) ujraFeladatok(); });

  const iconFor = (type) => type === 'Döntési pont' ? 'a-diamond' : 'a-pin';

  function renderList() {
    if (!state.length) {
      listEl.innerHTML = '<div class="ed-st-empty">Nincs megjeleníthető állomás.</div>';
      return;
    }
    const counts = countByStation();
    listEl.innerHTML = state.map((s, i) => {
      const active = i === current;
      let mark = '';
      if (active) mark = '<span class="ed-st-check"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-check"/></svg></span>';
      else if (s.type === 'Kezdő állomás') mark = '<span class="ed-st-mark"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-pin"/></svg></span>';
      return '<button class="ed-station' + (active ? ' is-active' : '') + '" type="button" draggable="true" data-i="' + i + '">' +
        '<span class="ed-st-ic"><svg class="ico ico-sm" aria-hidden="true"><use href="#' + iconFor(s.type) + '"/></svg></span>' +
        '<span class="ed-st-num">' + (i + 1) + '</span>' +
        '<span class="ed-st-body"><b>' + esc(s.name) + '</b><small>' + esc(s.type) + (counts[s.name] ? ' · ' + counts[s.name] + ' feladat' : '') + '</small></span>' +
        mark + '<span class="ed-st-grip"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-menu"/></svg></span></button>';
    }).join('');
    applyFilter();
  }

  // A play-mód mini-térképe ezt használja (mx/my százalék) — VÁLTOZATLAN
  function svgXY(s) { return { x: (s.mx / 100) * 540, y: (s.my / 100) * 470 }; }

  // Leaflet útvonal-polyline-ok (a régi SVG <line>-ok helyett)
  function renderRoutes() {
    if (!map || !routeLayer) return;
    routeLayer.clearLayers();
    state.forEach((s, i) => {
      /* A megadott ágak szerint rajzolunk. Korábban a döntési pontból
         mindig a lista következő két elemére ment vonal — olyan utakra,
         amiket senki nem adott meg. */
      const agak = (s.branches || []).filter(b => b && state.indexOf(b.to) >= 0);
      /* Pozíció szerinti tartalék CSAK oda, aminek nincs kifejezett
         előzménye. Ha a szerző megmondta, hogy a 8. állomás az 5. után jön,
         akkor a 7. nem eshet bele „mert épp utána van a listában" — a
         megadott útvonal erősebb a sorrendnél. Ilyenkor a 7. a következő
         olyan állomásra megy, amit még senki nem kötött be. */
      const targets = agak.length
        ? agak.map(b => state.indexOf(b.to))
        : (function () {
            for (let j = i + 1; j < state.length; j++) {
              if (!vanElozmeny(j)) return [j];
            }
            return [];
          })();
      targets.forEach((ti, bi) => {
        if (ti >= state.length || ti < 0) return;
        const branch = agak.length > 1 && bi > 0;
        L.polyline([
          [parseLoc(s.location).lat, parseLoc(s.location).lng],
          [parseLoc(state[ti].location).lat, parseLoc(state[ti].location).lng]
        ], { color: branch ? '#e0b93a' : 'var(--lime)', weight: 3, opacity: .85, dashArray: '6 7' }).addTo(routeLayer);
      });
    });
  }

  // Leaflet jelölők — a függvény NEVE ugyanaz marad, hogy minden hívó működjön
  function renderNodes() {
    if (!map) return;
    markers.forEach(m => { map.removeLayer(m); });
    markers = [];
    state.forEach((s, i) => {
      const ll = parseLoc(s.location);
      const html = '<span class="ed-mk' + (s.type === 'Döntési pont' ? ' is-decision' : '') + (i === current ? ' is-active' : '') + '">' +
        '<i>' + (i + 1) + '</i></span><em class="ed-mk-label">' + esc(s.name) + '</em>';
      const icon = L.divIcon({ className: 'ed-mk-wrap', html: html, iconSize: [30, 30], iconAnchor: [15, 15] });
      const marker = L.marker([ll.lat, ll.lng], { icon: icon, draggable: true }).addTo(map);
      marker.on('click', function () { selectStation(i); });
      marker.on('dragend', function () { onMarkerDragEnd(i); });
      markers.push(marker);
    });
    renderRoutes();
  }

  // jelölő húzás vége → állomás valós GPS-koordinátája frissül
  function onMarkerDragEnd(i) {
    const s = state[i]; if (!s || !markers[i]) return;
    const ll = markers[i].getLatLng();
    s.location = ll.lat.toFixed(4) + ', ' + ll.lng.toFixed(4);
    syncMxMy();
    renderList();
    if (i === current && fieldEls.location) fieldEls.location.value = s.location;
    renderRoutes();
    saveCourse();
  }

  // térképre kattintás → új állomás a kattintott GPS-ponton
  function onMapClick(e) {
    saveForm(current);
    const ns = mk({ name: 'Új állomás', type: 'Információs állomás', location: e.latlng.lat.toFixed(4) + ', ' + e.latlng.lng.toFixed(4) });
    state.push(ns);
    current = state.length - 1;
    syncMxMy();
    renderList();
    renderNodes();
    loadForm(current);
    updateCourseCount();
    refreshActiveTab();
    saveCourse();
    listEl.scrollTop = listEl.scrollHeight;
    toast('Állomás hozzáadva', { sub: ns.location });
  }

  /* =========================================================
     NYELVEK
     ========================================================= */
  function flagHtml(code) {
    const m = LANG_META[code];
    return m.sym
      ? '<svg class="flag" aria-hidden="true"><use href="#' + m.sym + '"/></svg>'
      : '<span class="flag" style="background:' + m.css + '"></span>';
  }
  function renderLangs() {
    const langs = state[current].langs;
    const present = langs.map(l => l.code);
    const pills = langs.map(l => {
      const m = LANG_META[l.code];
      return '<button class="ed-lang' + (l.on ? ' is-on' : '') + '" type="button" data-lang="' + l.code + '">' + flagHtml(l.code) + m.label + '</button>';
    }).join('');
    const opts = ADDABLE.map(code => {
      const m = LANG_META[code];
      const has = present.indexOf(code) !== -1;
      return '<button class="uq-chip-opt' + (has ? ' is-selected' : '') + '" type="button" data-addlang="' + code + '"' + (has ? ' disabled' : '') + '>' +
        flagHtml(code) + m.name + '<svg class="ico ico-xs uq-chip-check" aria-hidden="true"><use href="#a-check"/></svg></button>';
    }).join('');
    langsEl.innerHTML = pills +
      '<div class="uq-chipmenu" data-chipmenu>' +
      '<button class="ed-lang-add" type="button" data-chip-toggle aria-label="Nyelv hozzáadása"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-plus"/></svg></button>' +
      '<div class="uq-chipmenu-pop">' + opts + '</div></div>';
  }

  /* =========================================================
     ŰRLAP BE- ÉS KIOLVASÁS
     ========================================================= */
  const fieldEls = {};
  $$('[data-field]', formEl).forEach(el => { fieldEls[el.dataset.field] = el; });

  function setToggle(el, on) {
    el.classList.toggle('is-on', !!on);
    el.setAttribute('aria-checked', String(!!on));
  }
  function updateDot() {
    const d = state[current].difficulty;
    dotEl.className = 'ed-dot ' + (DIFF_CLASS[d] || 'ed-dot-konnyu');
  }
  /* Üres a pálya? Nincs bejelentkezve, vagy még nincs egyetlen állomás sem.
     Korábban ez az ág sosem futott, mert a szerkesztő beégetett állomásokkal
     indult — így egy kijelentkezett látogató is kész pályát látott. */
  function vanAllomas() { return current >= 0 && current < state.length && !!state[current]; }

  function loadForm(i) {
    const s = state[i];
    if (!s) { renderBranches(); renderPrev(); return; }
    renderBranches(); renderPrev();
    fieldEls.name.value = s.name;
    fieldEls.num.value = i + 1;
    fieldEls.type.value = s.type;
    fieldEls.desc.value = s.desc;
    fieldEls.difficulty.value = s.difficulty;
    fieldEls.timeLimit.value = s.timeLimit;
    setToggle(fieldEls.timeLimitOn, s.timeLimitOn);
    fieldEls.location.value = s.location;
    fieldEls.taskType.value = s.taskType;
    fieldEls.question.value = s.question;
    fieldEls.answer.value = s.answer;
    fieldEls.score.value = s.score;
    fieldEls.xp.value = s.xp;
    fieldEls.badge.value = s.badge;
    setToggle(fieldEls.logicPrev, s.logicPrev);
    setToggle(fieldEls.logicMandatory, s.logicMandatory);
    setToggle(fieldEls.logicReturn, s.logicReturn);
    thumbEl.style.background = s.img;
    updateDot();
    renderLangs();
    renderStationTasks();
  }
  function saveForm(i) {
    if (i == null || !state[i]) return;
    const s = state[i];
    s.name = fieldEls.name.value.trim() || 'Névtelen állomás';
    s.type = fieldEls.type.value;
    s.desc = fieldEls.desc.value;
    s.difficulty = fieldEls.difficulty.value;
    s.timeLimit = fieldEls.timeLimit.value;
    s.timeLimitOn = fieldEls.timeLimitOn.classList.contains('is-on');
    s.location = fieldEls.location.value;
    s.taskType = fieldEls.taskType.value;
    s.question = fieldEls.question.value;
    s.answer = fieldEls.answer.value;
    s.score = fieldEls.score.value;
    s.xp = fieldEls.xp.value;
    s.badge = fieldEls.badge.value;
    s.logicPrev = fieldEls.logicPrev.classList.contains('is-on');
    s.logicMandatory = fieldEls.logicMandatory.classList.contains('is-on');
    s.logicReturn = fieldEls.logicReturn.classList.contains('is-on');
  }

  /* kijelölés váltás */
  function selectStation(i) {
    if (i === current) return;
    saveForm(current);
    current = i;
    renderList();
    renderNodes();
    loadForm(current);
    refreshActiveTab();
  }

  /* =========================================================
     ÉLŐ SZERKESZTÉS (űrlap → lista/térkép/állapot)
     ========================================================= */
  // Név: azonnali frissítés a lista <b> és a node <em> feliraton
  on(fieldEls.name, 'input', () => {
    if (!vanAllomas()) return;
    const v = fieldEls.name.value;
    state[current].name = v.trim() || 'Névtelen állomás';
    const b = $('#stationList .ed-station.is-active .ed-st-body b');
    if (b) b.textContent = state[current].name;
    // aktív jelölő feliratának azonnali frissítése
    const amk = markers[current];
    const el = amk && amk.getElement && amk.getElement();
    const em = el && el.querySelector('.ed-mk-label');
    if (em) em.textContent = state[current].name;
  });
  // Típus: alcím + ikon/forma változhat → lista+térkép újrarajzol
  on(fieldEls.type, 'change', () => {
    if (!vanAllomas()) return;
    state[current].type = fieldEls.type.value;
    renderList();
    renderNodes();
    renderBranches(); renderPrev();      // döntési pontnál előbukkan az elágazás-szerkesztő
    renderRoutes();
  });
  // Nehézség: pötty szín
  on(fieldEls.difficulty, 'change', () => {
    if (!vanAllomas()) return;
    state[current].difficulty = fieldEls.difficulty.value;
    updateDot();
  });
  // Minden egyéb mező mentése az állapotba (élő), hogy a többi fül friss legyen
  on(formEl, 'input', () => { if (vanAllomas()) { saveForm(current); saveCourse(); } });
  on(formEl, 'change', () => { if (vanAllomas()) { saveForm(current); saveCourse(); } });

  /* kapcsolók (ed-toggle) */
  on(formEl, 'click', (e) => {
    const t = e.target.closest('.ed-toggle');
    if (!t || !vanAllomas()) return;
    setToggle(t, !t.classList.contains('is-on'));
    saveForm(current);
    saveCourse();
  });

  /* lista delegált kattintás (a térkép-jelölők kattintását a marker-click kezeli) */
  on(listEl, 'click', (e) => {
    const b = e.target.closest('.ed-station');
    if (b) selectStation(parseInt(b.dataset.i, 10));
  });

  /* nyelvek: pill toggle + chip-menü */
  on(langsEl, 'click', (e) => {
    if (!vanAllomas()) return;
    const pill = e.target.closest('.ed-lang');
    if (pill) {
      const code = pill.dataset.lang;
      const l = state[current].langs.find(x => x.code === code);
      if (l) { l.on = !l.on; pill.classList.toggle('is-on', l.on); saveCourse(); }
      return;
    }
    const toggle = e.target.closest('[data-chip-toggle]');
    if (toggle) {
      e.stopPropagation();
      const menu = toggle.closest('[data-chipmenu]');
      const open = menu.classList.contains('is-open');
      closeAllFloating();
      menu.classList.toggle('is-open', !open);
      return;
    }
    const opt = e.target.closest('[data-addlang]');
    if (opt && !opt.hasAttribute('disabled')) {
      const code = opt.dataset.addlang;
      if (!state[current].langs.some(x => x.code === code)) {
        state[current].langs.push({ code: code, on: true });
        renderLangs();
        saveCourse();
        toast('Nyelv hozzáadva', { type: 'info', sub: LANG_META[code].name });
      }
    }
  });

  /* =========================================================
     ELEM HOZZÁADÁS / TÖRLÉS
     ========================================================= */
  function addStation() {
    saveForm(current);
    const ns = mk({ name: 'Új állomás', type: 'Információs állomás' });
    if (map) { const c = map.getCenter(); ns.location = c.lat.toFixed(4) + ', ' + c.lng.toFixed(4); }
    state.push(ns);
    current = state.length - 1;
    syncMxMy();
    renderList();
    renderNodes();
    loadForm(current);
    updateCourseCount();
    refreshActiveTab();
    saveCourse();
    listEl.scrollTop = listEl.scrollHeight;
    toast('Állomás hozzáadva', { sub: 'Új állomás (#' + (current + 1) + ')' });
  }
  on($('#edAdd'), 'click', addStation);
  on($('#edAddStation'), 'click', addStation);

  on($('#edDel'), 'click', () => {
    if (state.length <= 1) { toast('Legalább egy állomás szükséges', { type: 'error' }); return; }
    const removed = state[current].name;
    state.splice(current, 1);
    if (current >= state.length) current = state.length - 1;
    syncMxMy();
    renderList();
    renderNodes();
    loadForm(current);
    updateCourseCount();
    refreshActiveTab();
    saveCourse();
    toast('Állomás törölve', { type: 'error', sub: removed });
  });

  /* =========================================================
     PÁLYA FEJLÉC — állomásszám
     ========================================================= */
  function updateCourseCount() {
    const el = $('#admCourseCount');
    if (el) el.textContent = state.length + ' állomás';
  }

  /* =========================================================
     FÜLEK (tab-panel)
     ========================================================= */
  const tabs = $$('.adm-tab[data-tab]');
  const panels = $$('.adm-tabpanel');
  let activeTab = 'szerkeszto';
  function setTab(name) {
    const t = tabs.find(x => x.dataset.tab === name);
    if (!t) return;
    activeTab = name;
    tabs.forEach(x => { const on = x === t; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', String(on)); });
    panels.forEach(p => p.classList.toggle('is-active', p.dataset.panel === name));
    refreshActiveTab();
    // a Szerkesztő fülre visszatérve a Leaflet újraszámolja a méretét (rejtett panel után)
    if (name === 'szerkeszto' && map) { setTimeout(function () { map.invalidateSize(); }, 60); }
  }
  tabs.forEach(t => t.addEventListener('click', () => setTab(t.dataset.tab)));
  function refreshActiveTab() {
    if (activeTab === 'attekintes') renderOverview();
    else if (activeTab === 'statisztikak') renderStats();
    else if (activeTab === 'jatekos') renderPlay();
  }

  function diffDistribution() {
    const d = { 'Könnyű': 0, 'Közepes': 0, 'Nehéz': 0, 'Extrém': 0 };
    state.forEach(s => { d[s.difficulty] = (d[s.difficulty] || 0) + 1; });
    return d;
  }

  function renderOverview() {
    const name = ($('#cmName') && $('#cmName').value) || 'Városliget Felfedező';
    const total = state.length;
    const tasks = state.filter(s => s.type === 'Feladat állomás').length;
    const decisions = state.filter(s => s.type === 'Döntési pont').length;
    const dist = diffDistribution();
    const bars = Object.keys(dist).map(k => {
      const pct = total ? Math.round(dist[k] / total * 100) : 0;
      return '<div class="uq-bar-row"><span>' + k + '</span><div class="uq-bar-track"><div class="uq-bar-fill" style="width:' + pct + '%;background:' + DIFF_VAR[k] + '"></div></div><span class="uq-bar-val">' + dist[k] + ' db</span></div>';
    }).join('');
    $('#panelAttekintes').innerHTML =
      '<div class="uq-pane"><div class="uq-pane-title">Pálya összefoglaló</div>' +
      '<div class="uq-grid2">' +
      '<div class="uq-mini"><span class="uq-mini-label">Pálya neve</span><b style="font-size:16px">' + esc(name) + '</b><small>Budapest, Városliget</small></div>' +
      '<div class="uq-mini"><span class="uq-mini-label">Állomások száma</span><b>' + total + '</b><small>összesen a pályán</small></div>' +
      '<div class="uq-mini"><span class="uq-mini-label">Feladat állomás</span><b>' + tasks + '</b><small>megoldandó feladat</small></div>' +
      '<div class="uq-mini"><span class="uq-mini-label">Döntési pont</span><b>' + decisions + '</b><small>elágazás az útvonalon</small></div>' +
      '</div></div>' +
      '<div class="uq-pane"><div class="uq-pane-title">Nehézség-eloszlás</div><div class="uq-bars">' + bars + '</div></div>';
  }

  function renderStats() {
    const total = state.length;
    const totalXp = state.reduce((a, s) => a + (parseInt(s.xp, 10) || 0), 0);
    const totalScore = state.reduce((a, s) => a + (parseInt(s.score, 10) || 0), 0);
    const withTime = state.filter(s => s.timeLimitOn).length;
    const langCount = state.reduce((a, s) => a + s.langs.filter(l => l.on).length, 0);
    // fiktív "teljesítési arány" oszlopdiagram állomásonként
    const cols = state.map((s, i) => {
      const pct = Math.max(18, 96 - i * (72 / Math.max(1, total - 1)));
      return '<div class="uq-chart-col"><div class="uq-chart-bar" style="height:' + pct.toFixed(0) + '%"></div><div class="uq-chart-lbl">#' + (i + 1) + '</div></div>';
    }).join('');
    $('#panelStatisztikak').innerHTML =
      '<div class="uq-pane"><div class="uq-pane-title">Kulcsmutatók</div><div class="uq-grid2">' +
      '<div class="uq-mini"><span class="uq-mini-label">Összes tapasztalati pont</span><b>' + totalXp + ' XP</b><small>' + total + ' állomás összesen</small></div>' +
      '<div class="uq-mini"><span class="uq-mini-label">Megszerezhető pontszám</span><b>' + totalScore + '</b><small>maximum a pályán</small></div>' +
      '<div class="uq-mini"><span class="uq-mini-label">Időlimites állomás</span><b>' + withTime + '</b><small>' + total + '-ból időzítve</small></div>' +
      '<div class="uq-mini"><span class="uq-mini-label">Aktív nyelvi verzió</span><b>' + langCount + '</b><small>állomás × nyelv</small></div>' +
      '</div></div>' +
      '<div class="uq-pane"><div class="uq-pane-title">Becsült teljesítési arány állomásonként</div><div class="uq-chart">' + cols + '</div></div>';
  }

  /* =========================================================
     JÁTÉKOS NÉZET — A VALÓDI LEJÁTSZÓ, keretben

     Itt korábban egy MÁSODIK, kézzel írt lejátszó állt (~410 sor): saját
     állomás-render, saját feladat-típusok, saját eredménykártya. Külön
     kódból, külön adatból dolgozott — a szerkesztő nyers tábláiból, nem a
     befagyasztott csomagból —, és menthetetlenül szétcsúszott az igazitól:

       - nem tudott a csapatláncról, a tippekről, az időkorlátról, az
         állomásonkénti megjelenítés-kapcsolókról, a gombfeliratokról és az
         automatikus léptetésről;
       - a kvíznél a HELYES választ is felfedte (`o.correct`), pedig azt az
         éles csomagból a strip_solution kiszedi;
       - az eredménykártyából két állapotot ismert három helyett.

     Vagyis pontosan azt csinálta, amit a lejátszóból már egyszer kiirtottunk
     (lásd jatszas.js, a beégetett demó-pálya története): a szerző azt hitte,
     a saját pályáját teszteli, közben egy másik játékot látott.

     Most ugyanaz az emulátor fut itt, mint az Alkotó szerkesztőjében: a
     `jatszas.html` a maga teljes valójában, iframe-ben, előnézeti módban.
     Ami a keretben látszik, az BETŰRE az, amit a játékos kap.
     ========================================================= */

  /* A lejátszó a BEFAGYASZTOTT verziót játssza, nem a nyers táblákat, ezért
     megnyitás előtt friss előnézeti verziót kérünk. Egyszerre csak egy
     kérés lehet úton: két egymásra futó preview_course a verzió-befagyasztáson
     ütközik (a (course_id, version) pár egyedi), és a második HTTP 409-cel
     szállna el. */
  var elonezetFut = false, elonezetVar = false;

  function jatekosKeretUrl() {
    var idx = COURSES_INDEX.find(function (c) { return c.id === currentCourseId; });
    var slug = idx && idx.slug ? idx.slug : '';
    if (!slug) return '';
    return 'jatszas.html?quest=' + encodeURIComponent(slug) +
           '&elonezet=1&cb=' + Date.now();
  }

  function jatekosVaz() {
    return '' +
      '<div class="adm-jn">' +
        '<div class="adm-jn-fej">' +
          '<div>' +
            '<b>Ez a valódi lejátszó.</b>' +
            '<p>Nem külön előnézet: ugyanaz a kód fut a keretben, amit a játékos telefonja tölt be. ' +
               'A pálya <b>befagyasztott előnézeti verzióját</b> játssza, ezért a frissítés előbb ' +
               'menti és befagyasztja, amit épp írtál.</p>' +
          '</div>' +
          '<button class="adm-btn adm-btn-lime" type="button" id="admJnFrissit">' +
            '<svg class="ico ico-sm" aria-hidden="true"><use href="#a-refresh"/></svg>Frissítés' +
          '</button>' +
        '</div>' +
        '<div class="adm-jn-telefon">' +
          '<div class="adm-jn-ful"></div>' +
          '<iframe class="adm-jn-kepernyo" id="admJnKeret" title="A játékos képernyője" referrerpolicy="no-referrer"></iframe>' +
          '<div class="adm-jn-tolt" id="admJnTolt"><span></span>Betöltés…</div>' +
        '</div>' +
      '</div>';
  }

  /* Csak akkor építjük újra a vázat, ha még nincs meg — különben minden
     fülváltás újratöltené a keretet, és a félig végigjátszott teszt elveszne. */
  function renderPlay() {
    var host = $('#panelJatekos'); if (!host) return;
    if (!$('#admJnKeret')) {
      host.innerHTML = jatekosVaz();
      on($('#admJnFrissit'), 'click', function () { playStart(); });
      playStart();
    }
  }

  /* Frissítés: a függőben lévő szerkesztés KIÍRÁSA, majd befagyasztás, majd
     a keret újratöltése. A sorrend nem cserélhető fel: befagyasztás előtt
     kiírt mentés nélkül a szerző a két perce beírt szövegét sem látná. */
  function playStart() {
    var host = $('#panelJatekos'); if (!host) return;
    if (!$('#admJnKeret')) { renderPlay(); return; }
    if (!currentCourseId || !window.UQAPI) return;
    if (elonezetFut) { elonezetVar = true; return; }

    var url = jatekosKeretUrl();
    if (!url) {
      host.innerHTML = '<div class="adm-ures"><b>Ehhez a pályához nincs azonosító</b>' +
        '<p>A pálya „slug” mezője üres, ezért a lejátszó nem tudja megnyitni. ' +
        'A Játékok oldalon add meg, és próbáld újra.</p></div>';
      return;
    }

    elonezetFut = true;
    var tolt = $('#admJnTolt'); if (tolt) tolt.hidden = false;
    if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }

    Promise.resolve(syncToDb())
      .then(function () {
        return UQAPI.rest('/rpc/preview_course', { method: 'POST', body: { p_course: currentCourseId } });
      })
      .then(function () {
        var keret = $('#admJnKeret');
        if (keret) keret.src = jatekosKeretUrl();
      })
      .catch(function (e) {
        if (tolt) tolt.hidden = true;
        toast('Az előnézet nem készült el', { type: 'error', sub: (e && e.message) || 'ismeretlen hiba' });
      })
      .then(function () {
        elonezetFut = false;
        if (elonezetVar) { elonezetVar = false; playStart(); }
      });
  }

  /* A keret betöltése után eltűnik a takaró. Delegálva kötjük, mert a
     vázat a renderPlay() építi, és a `load` esemény nem buborékol. */
  document.addEventListener('load', function (e) {
    if (e.target && e.target.id === 'admJnKeret') {
      var t = $('#admJnTolt'); if (t) t.hidden = true;
    }
  }, true);
  /* =========================================================
     KERESŐ — élő szűrés a lista nevein
     ========================================================= */
  const searchEl = $('#admSearch');
  let filterQ = '';
  function applyFilter() {
    const q = filterQ.trim().toLowerCase();
    $$('.ed-station', listEl).forEach(st => {
      const nm = (st.querySelector('.ed-st-body b').textContent || '').toLowerCase();
      st.classList.toggle('is-filtered', q !== '' && nm.indexOf(q) === -1);
    });
  }
  on(searchEl, 'input', () => { filterQ = searchEl.value; applyFilter(); });

  /* =========================================================
     FELSŐ SÁV — Előnézet / Mentés
     ========================================================= */
  on($('#admPreview'), 'click', () => { saveForm(current); setTab('jatekos'); });

  on($('#admSave'), 'click', () => {
    saveForm(current);
    saveCourse();
    const saved = $('#admSaved');
    if (saved) saved.innerHTML = '<svg class="ico ico-sm" aria-hidden="true"><use href="#a-check-c"/></svg>Mentve: most';
    toast('Pálya elmentve', { sub: 'Minden módosítás mentve' });
  });

  /* státusz dropdown */
  const statusLabel = $('#admStatusLabel');
  const statusDot = $('#admStatusDot');
  const courseTag = $('#admCourseTag');
  const STATUS_STYLE = {
    'Közzétéve': { color: 'var(--lime)', glow: '0 0 6px var(--lime)', tag: '' },
    'Piszkozat': { color: 'var(--kozepes)', glow: '0 0 6px var(--kozepes)', tag: 'is-draft' },
    'Archivált': { color: 'var(--muted)', glow: 'none', tag: 'is-archived' }
  };
  /* A fejléc állapota EDDIG be volt égetve „Közzétéve"-re, a legördülőből
     választás pedig csak a feliratot cserélte, és kiírta, hogy „Állapot
     módosítva" — közben semmit nem mentett. Emiatt mutatott a szerkesztő
     „KÖZZÉTÉVE"-t olyan pályán is, ami valójában sosem került ki. */

  var STATUS_DB    = { 'Közzétéve': 'pub', 'Piszkozat': 'draft', 'Archivált': 'arch' };
  var STATUS_CIMKE = { pub: 'Közzétéve', draft: 'Piszkozat', arch: 'Archivált' };

  /* A fejléc a VALÓS állapotot mutatja. Külön eset: „közzétett", de élő
     verzió nélkül — ilyenkor a pálya sehol nem jelenik meg, és ezt ki kell
     mondani, nem zöld pipával elfedni. */
  function allapotKiiras() {
    var idx = COURSES_INDEX.find(function (c) { return c.id === currentCourseId; });
    if (!idx || !statusLabel) return;
    var pub = idx.status === 'pub';
    var elo = idx.van_elo_verzio !== false;
    var cimke = STATUS_CIMKE[idx.status] || 'Piszkozat';
    var stilus = STATUS_STYLE[cimke] || STATUS_STYLE['Piszkozat'];

    if (pub && !elo) {
      statusLabel.textContent = 'Nem látható';
      statusDot.style.background = 'var(--kozepes)';
      statusDot.style.boxShadow = '0 0 6px var(--kozepes)';
      courseTag.textContent = 'Nem látható';
      courseTag.className = 'adm-tag is-draft';
      courseTag.title = 'Közzétettként van jelölve, de nincs befagyasztott verziója, ezért sehol nem jelenik meg. Tedd közzé újra.';
    } else {
      statusLabel.textContent = cimke;
      statusDot.style.background = stilus.color;
      statusDot.style.boxShadow = stilus.glow;
      courseTag.textContent = cimke;
      courseTag.className = 'adm-tag' + (stilus.tag ? ' ' + stilus.tag : '');
      courseTag.title = '';
    }
    $$('.uq-dd-item[data-status]').forEach(function (x) {
      x.classList.toggle('is-active', x.dataset.status === cimke);
    });
  }

  /* A váltás VALÓDI. Közzétételnél ugyanazon a kapun megy át, mint a Játékok
     oldal: előbb a befagyasztás és a course_lint, és a státusz CSAK utána
     változik — így nem maradhat „közzétett" pálya élő verzió nélkül. */
  function allapotValtas(cimke) {
    var db = STATUS_DB[cimke];
    var id = currentCourseId;
    if (!db || !id || !window.UQAPI) return;

    function frissitIndex(ujStatus, ujElo) {
      var idx = COURSES_INDEX.find(function (c) { return c.id === id; });
      if (idx) { idx.status = ujStatus; if (ujElo !== undefined) idx.van_elo_verzio = ujElo; }
      allapotKiiras();
    }

    if (db !== 'pub') {
      UQAPI.rest('/rpc/save_course', { method: 'POST', body: { p: { id: id, status: db } } })
        .then(function () {
          frissitIndex(db);
          toast('Állapot módosítva', { type: 'info', sub: cimke + ' — nem jelenik meg nyilvánosan' });
        })
        .catch(function (e) { toast('Nem sikerült', { type: 'error', sub: (e && e.message) || '' }); });
      return;
    }

    toast('Közzététel…', { type: 'info', sub: 'ellenőrzés és befagyasztás' });
    UQAPI.rest('/rpc/publish_course', { method: 'POST', body: { p_course: id, p_go_live: true } })
      .then(function (r) {
        var v = Array.isArray(r) ? r[0] : r;
        return UQAPI.rest('/rpc/save_course', { method: 'POST', body: { p: { id: id, status: 'pub' } } })
          .then(function () { return v; });
      })
      .then(function (v) {
        frissitIndex('pub', true);
        toast('Közzétéve', { sub: 'a játékosok az új változatot kapják (v' + (v && v.version) + ')' });
      })
      .catch(function (e) {
        var m = String((e && e.message) || '');
        var kapu = m.match(/^A pálya így nem tehető közzé:\s*([\s\S]+)$/);
        if (kapu) {
          var t = kapu[1].split(' | ').map(function (x) { return x.trim(); }).filter(Boolean);
          toast('A pálya még nem tehető közzé', { type: 'warn',
            sub: t.slice(0, 4).map(function (x) { return '• ' + x; }).join('\n') +
                 (t.length > 4 ? '\n• …és még ' + (t.length - 4) + ' dolog' : '') });
        } else {
          toast('Nem sikerült', { type: 'error', sub: m });
        }
        allapotKiiras();   // a felirat maradjon az IGAZ értéken
      });
  }

  $$('.uq-dd-item[data-status]').forEach(it => it.addEventListener('click', () => {
    closeAllFloating();
    allapotValtas(it.dataset.status);
  }));

  /* felhasználó dropdown */
  /* A Fiók menüt a közös uq-admin-fejlec.js köti be (valódi navigáció és
     valódi kijelentkezés) — itt csak a lebegő rétegeket csukjuk össze. */
  $$('.uq-dd-item[data-user]').forEach(it => it.addEventListener('click', closeAllFloating));

  /* =========================================================
     DROPDOWN nyitás/zárás (generikus)
     ========================================================= */
  function closeAllFloating() {
    $$('[data-dd].is-open').forEach(x => x.classList.remove('is-open'));
    $$('[data-chipmenu].is-open').forEach(x => x.classList.remove('is-open'));
  }
  $$('[data-dd]').forEach(dd => {
    const toggle = dd.querySelector('[data-dd-toggle]');
    if (!toggle) return;
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = dd.classList.contains('is-open');
      closeAllFloating();
      dd.classList.toggle('is-open', !open);
    });
  });
  document.addEventListener('click', () => closeAllFloating());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeAllFloating(); closeModal(); }
  });

  /* =========================================================
     PÁLYA BEÁLLÍTÁSOK MODAL
     ========================================================= */
  const modal = $('#courseModal');
  function openModal() {
    modal.classList.add('is-open');
    modal.querySelector('.uq-modal-panel').focus();
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    if (!modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  on($('#admCourseSettings'), 'click', openModal);
  $$('[data-modal-close]', modal).forEach(b => b.addEventListener('click', closeModal));
  on($('#cmSave'), 'click', () => {
    const nm = $('#cmName').value.trim() || 'Névtelen pálya';
    const h1 = $('#admCourseName');
    // az első szöveges csomópont a pálya neve (a .adm-tag megmarad)
    h1.childNodes[0].textContent = nm + ' ';
    closeModal();
    if (activeTab === 'attekintes') renderOverview();
    toast('Pálya beállítások mentve', { sub: nm });
  });

  /* pálya tesztelése — Játékos nézet fül + azonnali végigjátszás */
  on($('#admCourseTest'), 'click', () => {
    saveForm(current); setTab('jatekos');
    /* Ha a keret még nem állt, a setTab által hívott renderPlay() már el is
       indította — a második hívás csak fölösleges befagyasztást kérne. */
    if ($('#admJnKeret')) playStart();
    toast('Teszt mód indítva', { type: 'info', sub: 'A valódi lejátszó fut a keretben' });
  });

  /* =========================================================
     TÉRKÉP — zoom-gombok (Leaflet)
     A jelölő-húzást, térképre-kattintást és pan/zoom-ot maga a Leaflet kezeli.
     ========================================================= */
  on($('#edZoomIn'), 'click', () => { if (map) map.zoomIn(); });
  on($('#edZoomOut'), 'click', () => { if (map) map.zoomOut(); });
  on($('#edZoomFit'), 'click', () => {
    if (map && markers.length) {
      map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2));
      toast('Nézet a pályához igazítva', { type: 'info' });
    }
  });

  /* =========================================================
     ELEMEK LISTA — drag & drop átrendezés
     ========================================================= */
  let dragIdx = null;
  on(listEl, 'dragstart', (e) => {
    const st = e.target.closest('.ed-station'); if (!st) return;
    dragIdx = parseInt(st.dataset.i, 10); st.classList.add('is-drag');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', String(dragIdx)); } catch (x) {}
  });
  on(listEl, 'dragover', (e) => {
    e.preventDefault();
    const st = e.target.closest('.ed-station'); if (!st) return;
    $$('.ed-station', listEl).forEach(x => x.classList.remove('is-over'));
    st.classList.add('is-over');
  });
  on(listEl, 'drop', (e) => {
    e.preventDefault();
    const st = e.target.closest('.ed-station');
    $$('.ed-station', listEl).forEach(x => x.classList.remove('is-over', 'is-drag'));
    if (!st || dragIdx == null) return;
    const toIdx = parseInt(st.dataset.i, 10);
    if (toIdx === dragIdx) { dragIdx = null; return; }
    saveForm(current);
    const moved = state.splice(dragIdx, 1)[0];
    state.splice(toIdx, 0, moved);
    current = toIdx; dragIdx = null;
    renderList(); renderNodes(); loadForm(current);
    saveCourse();
    toast('Sorrend módosítva', { type: 'info', sub: moved.name + ' → ' + (toIdx + 1) + '. hely' });
  });
  on(listEl, 'dragend', () => { $$('.ed-station', listEl).forEach(x => x.classList.remove('is-over', 'is-drag')); dragIdx = null; });

  /* =========================================================
     KÉP CSERÉJE
     ========================================================= */
  const imgInput = $('#edImageInput');
  on($('#edImageBtn'), 'click', () => imgInput.click());
  on(imgInput, 'change', () => {
    const f = imgInput.files && imgInput.files[0];
    if (!f) {
      // nincs fájl: csak a szerkesztő bélyegképének háttere vált
      const idx = (IMG_GRADS.indexOf(state[current].img) + 1) % IMG_GRADS.length;
      state[current].img = IMG_GRADS[idx < 0 ? 0 : idx];
      state[current].image = '';
      thumbEl.style.background = state[current].img;
      scheduleSync();
      toast('Háttér cserélve', { type: 'info', sub: 'Ez csak a szerkesztő bélyegképe' });
      return;
    }

    /* A fájl a TÁROLÓBA megy, és a kapott cím kerül az állomásra. A régi
       megoldás URL.createObjectURL-lel csinált egy lapon belüli hivatkozást,
       „Kép frissítve" üzenetet írt ki, és a kép a lap bezárásával megszűnt —
       az adatbázisban mind a hét állomás képe NULL maradt. */
    const sAkkor = state[current];
    thumbEl.style.opacity = '.5';
    toast('Kép feltöltése…', { type: 'info', sub: f.name });
    /* Kicsinyítés a feltöltés előtt: terepen, mobiladaton egy 5 MB-os kép
       másodpercekig üres helynek látszik. */
    UQAPI.kicsinyitKep(f)
      .then(function (kis) { return UQAPI.upload(kis); })
      .then(function (r) {
        sAkkor.image = r.url;
        sAkkor.img = 'center/cover no-repeat url("' + r.url + '")';
        if (state[current] === sAkkor) thumbEl.style.background = sAkkor.img;
        scheduleSync();
        toast('Kép beállítva', { sub: f.name + ' — mentés után a játékosok is látják' });
      })
      .catch(function (e) {
        toast('A kép feltöltése nem sikerült', { type: 'error', sub: (e && e.message) || 'hálózati hiba' });
      })
      .then(function () { thumbEl.style.opacity = ''; });

    imgInput.value = '';
  });

  /* helyszín "Térképen" — a térkép a kijelölt állomásra ugrik */
  on($('#edLocBtn'), 'click', () => {
    const s = state[current];
    if (map && s) { const ll = parseLoc(s.location); map.setView([ll.lat, ll.lng], Math.max(map.getZoom(), 16)); }
    toast('Helyszín a térképen', { type: 'info', sub: s.location });
  });

  /* =========================================================
     OLDALSÁV — nav + összecsukás
     ========================================================= */
  const navItems = $$('.adm-nav-item');
  navItems.forEach(item => item.addEventListener('click', (e) => {
    const href = item.getAttribute('href');
    if (!href || href === '#') {
      e.preventDefault();
      navItems.forEach(n => n.classList.toggle('is-active', n === item));
    }
  }));

  const side = $('#admSide');
  if (localStorage.getItem('uqSideCollapsed') === 'true' && window.innerWidth > 900) {
    side.classList.add('is-collapsed');
  }
  on($('[data-side-toggle]'), 'click', () => {
    if (window.innerWidth <= 900) return; // mobilon nincs összecsukás
    side.classList.toggle('is-collapsed');
    localStorage.setItem('uqSideCollapsed', side.classList.contains('is-collapsed'));
  });

  /* =========================================================
     INDÍTÁS
     ========================================================= */
  initLeaflet();       // valós Leaflet + OSM térkép

  /* A pálya-választó és a betöltés az ADATBÁZISBÓL jön. Ez a blokk CSAK a
     Pályák szerkesztőn (admin.html) fut — a varázsló-oldalak is betöltik az
     admin.js-t, de ott nincs #admGameSelect, és a uq-api.js sincs betöltve. */
  function initCourses() {
    if (!$('#admGameSelect')) return;   // nem a Pályák szerkesztő → kihagyjuk

    var hiba = function (cim, alcim) {
      var h1 = $('#admCourseName');
      if (h1 && h1.childNodes[0]) h1.childNodes[0].textContent = cim + ' ';
      toast(cim, { type: 'warn', sub: alcim });
    };

    if (!window.UQAPI || !UQAPI.user()) {
      hiba('Bejelentkezés szükséges', 'A pályaszerkesztéshez admin fiók kell.');
      var sel0 = $('#admGameSelect');
      if (sel0) sel0.innerHTML = '<option>— jelentkezz be —</option>';
      return;
    }

    UQAPI.isAdmin().then(function (admin) {
      if (!admin) { hiba('Nincs jogosultság', 'Ez a fiók nem admin.'); return; }
      return UQAPI.rest('/v_admin_courses?select=id,slug,name,status,van_elo_verzio,show_station_image&order=sort_order.asc,name.asc')
        .then(function (rows) {
          COURSES_INDEX = rows || [];
          if (!COURSES_INDEX.length) {
            hiba('Nincs pálya', 'Hozz létre egyet a Játékok oldalon, vagy az átköltöztetéssel.');
            var s = $('#admGameSelect');
            if (s) s.innerHTML = '<option>— nincs pálya —</option>';
            return;
          }
          currentCourseId = COURSES_INDEX[0].id;
          initGameSelector();
          return loadCourse(currentCourseId);
        });
    }).catch(function (e) {
      hiba('Betöltési hiba', (e && e.message) || 'ismeretlen');
    });
  }
  initCourses();
  // belépés/kilépés után újratöltjük a pályákat
  if (window.UQAPI && UQAPI.onAuth) UQAPI.onAuth(function () { initCourses(); });

  /* Kiírjuk a függőben lévő szerkesztést lapelhagyás előtt (best-effort). */
  window.addEventListener('beforeunload', function () {
    if (syncTimer) { clearTimeout(syncTimer); syncToDb(); }
  });

  /* mély-link: #play → Játékos nézet + azonnali végigjátszás (teszt/megosztás) */
  if (location.hash === '#play') setTab('jatekos');   /* a keretet a renderPlay() építi és indítja */
})();
