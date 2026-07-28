/* =========================================================
   URBAN QUEST — RANGLISTA

   Valós adat a Supabase-ből (urban_quest.v_leaderboard_course).
   Korábban 15 beégetett sor volt itt, aminek semmi köze nem volt
   a tényleges menetekhez.
   ========================================================= */
(function () {
  'use strict';

  var ico = function (id, cls) {
    return '<svg class="' + (cls || 'ico') + '" aria-hidden="true"><use href="#' + id + '"/></svg>';
  };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  /* ---------- formázás ---------- */

  function ido(ms) {
    var s = Math.max(0, Math.round(Number(ms || 0) / 1000));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(h) + ':' + p(m) + ':' + p(sec);
  }

  function datum(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.getFullYear() + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + ('0' + d.getDate()).slice(-2) + '.';
  }

  function pont(n) {
    // ezres tagolás nem törő szóközzel, ahogy a többi oldalon
    return String(Number(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  /* A csapatikon ma nem tárolt adat. A névből választunk egyet
     determinisztikusan, hogy legalább ne ugráljon újratöltéskor. */
  var IKONOK = ['i-mountain', 'i-city', 'i-shield', 'i-map', 'i-flag', 'i-target', 'i-users'];
  function ikon(nev) {
    var h = 0, s = String(nev || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return IKONOK[h % IKONOK.length];
  }

  /* ---------- megjelenítés ---------- */

  var body = document.getElementById('rankBody');
  var more = document.getElementById('loadMore');
  var mind = [];          // amit a szerver adott
  var sorok = [];         // amit a szűrők meghagytak — ezt rajzoljuk
  var mutatva = 10;
  var enNevem = null;

  function allapot(html) {
    if (body) body.innerHTML = '<div class="rank-empty">' + html + '</div>';
    if (more) more.style.display = 'none';
    var pod = document.getElementById('podium');
    if (pod) { pod.hidden = true; pod.innerHTML = ''; }
  }

  function sorHTML(r, helyezes) {
    /* „Ki vagyok én?" — a szerver dönti el a menet tulajdonjoga alapján
       (en_vagyok, lásd az enyem() segédfüggvényt). A korábbi névegyezés két
       azonos nevű játékost összeolvasztott, egy átnevezés pedig kettévágta
       az előzményt. */
    var enVagyok = enyem(r);
    var pos = helyezes <= 3
      ? '<span class="rr-medal m' + helyezes + '">' + helyezes + '</span>'
      : '<span class="rr-num">' + helyezes + '</span>';
    return '' +
      '<div class="rank-row' + (helyezes <= 3 ? ' is-top' : '') + (enVagyok ? ' is-me' : '') + '">' +
        '<span class="rr-pos">' + pos + '</span>' +
        '<span class="rr-team">' +
          '<span class="rr-logo">' + ico(ikon(r.player_name), 'ico') + '</span>' +
          '<span class="rr-team-name">' + esc(r.player_name) +
            (enVagyok ? '<span class="rr-me-tag">Te</span>' : '') +
          '</span>' +
        '</span>' +
        '<span class="rr-track">' +
          '<span class="rr-track-name">' + esc(r.course_name) + '</span>' +
          '<span class="badge badge-' + esc(r.difficulty) + '">' + esc(r.difficulty_label) + '</span>' +
        '</span>' +
        '<span class="rr-pts">' + pont(r.points) + '</span>' +
        '<span class="rr-time">' + ico('i-clock', 'ico ico-xs') + ido(r.elapsed_ms) + '</span>' +
        '<span class="rr-date">' + datum(r.finished_at) + '</span>' +
        '<span class="rr-city">' + ico('i-pin', 'ico ico-xs') + esc(r.city || '') + '</span>' +
      '</div>';
  }

  /* A dobogó korábban három kitalált csapatot mutatott. Most valós adat,
     és ha nincs elég befejezett menet, egyáltalán nem jelenik meg —
     üres táblázat fölött hamis győztesekkel rosszabb lenne, mint semmi. */
  function podiumHTML(r, hely) {
    return '' +
      '<div class="pod pod-' + hely + '">' +
        (hely === 1 ? '<span class="pod-crown">' + ico('i-crown', 'ico') + '</span>' : '') +
        '<span class="pod-medal">' + hely + '</span>' +
        '<span class="pod-logo">' + ico(ikon(r.player_name), 'ico') + '</span>' +
        '<span class="pod-name">' + esc(r.player_name) + '</span>' +
        '<span class="pod-pts">' + pont(r.points) + '<small>pont</small></span>' +
        '<span class="pod-meta">' +
          '<span>' + ico('i-clock', 'ico ico-xs') + ido(r.elapsed_ms) + '</span>' +
          '<span>' + ico('i-pin', 'ico ico-xs') + esc(r.city || '') + '</span>' +
        '</span>' +
      '</div>';
  }

  function renderPodium() {
    var pod = document.getElementById('podium');
    if (!pod) return;
    if (sorok.length < 3) { pod.hidden = true; pod.innerHTML = ''; return; }
    // a vizuális sorrend 2–1–3, ahogy egy valódi dobogón
    pod.innerHTML = podiumHTML(sorok[1], 2) + podiumHTML(sorok[0], 1) + podiumHTML(sorok[2], 3);
    pod.hidden = false;
  }

  function render() {
    if (!sorok.length) {
      allapot('<p><strong>Nincs találat a beállított szűrőkkel.</strong></p>' +
              '<p>Lazíts rajtuk, vagy állítsd őket alaphelyzetbe.</p>');
      return;
    }
    /* A helyezés a NÉZETBŐL jön, nem a képernyőn elfoglalt helyről: ha egy
       pályára szűrsz, a pályán belüli helyezés a helyes szám, egyébként az
       összesített. Enélkül a szűrés „1. hely"-et írna olyannak, aki nem az. */
    var egyPalya = !!(fPalya && fPalya.value);
    body.innerHTML = sorok.slice(0, mutatva).map(function (r, i) {
      var h = egyPalya ? r.rank : r.overall_rank;
      return sorHTML(r, h || (i + 1));
    }).join('');
    if (more) more.style.display = (mutatva >= sorok.length) ? 'none' : '';
    renderPodium();
    sajatStat();
  }

  /* ---------- szűrők ---------- */

  var fIdoszak   = document.getElementById('fIdoszak');
  var fPalya     = document.getElementById('fPalya');
  var fNehezseg  = document.getElementById('fNehezseg');
  var fVaros     = document.getElementById('fVaros');
  var urlap      = document.getElementById('rankFilter');

  /* A választékot a VALÓS eredmények adják: nem kínálunk olyan pályát vagy
     várost, amire egyetlen befejezett menet sincs. */
  function feltoltValaszto(sel, ertekek, alap) {
    if (!sel) return;
    var volt = sel.value;
    sel.innerHTML = '<option value="">' + alap + '</option>' +
      ertekek.map(function (e) {
        return '<option value="' + esc(e.ertek) + '">' + esc(e.cimke) + '</option>';
      }).join('');
    if (volt && ertekek.some(function (e) { return e.ertek === volt; })) sel.value = volt;
  }

  function egyediek(kulcsMezo, cimkeMezo) {
    var latott = {}, ki = [];
    mind.forEach(function (r) {
      var k = r[kulcsMezo];
      if (!k || latott[k]) return;
      latott[k] = 1;
      ki.push({ ertek: String(k), cimke: String(r[cimkeMezo] || k) });
    });
    ki.sort(function (a, b) { return a.cimke.localeCompare(b.cimke, 'hu'); });
    return ki;
  }

  function valasztokFeltoltese() {
    feltoltValaszto(fPalya, egyediek('course_slug', 'course_name'), 'Összes pálya');
    feltoltValaszto(fNehezseg, egyediek('difficulty', 'difficulty_label'), 'Összes nehézség');
    feltoltValaszto(fVaros, egyediek('city', 'city'), 'Összes város');
  }

  function szur() {
    var napok = parseInt(fIdoszak && fIdoszak.value, 10);
    var hatar = napok ? Date.now() - napok * 864e5 : null;
    var palya = fPalya && fPalya.value;
    var neh   = fNehezseg && fNehezseg.value;
    var varos = fVaros && fVaros.value;

    sorok = mind.filter(function (r) {
      if (palya && r.course_slug !== palya) return false;
      if (neh && r.difficulty !== neh) return false;
      if (varos && String(r.city || '') !== varos) return false;
      if (hatar) {
        var t = r.finished_at ? Date.parse(r.finished_at) : NaN;
        if (!(t >= hatar)) return false;      // dátum nélküli sor kiesik a szűrésnél
      }
      return true;
    });
    mutatva = 10;
    render();
  }

  [fIdoszak, fPalya, fNehezseg, fVaros].forEach(function (s) {
    if (s) s.addEventListener('change', szur);
  });
  /* A type="reset" a böngésző saját ürítése — az ELŐTT fut le, hogy a mezők
     kiürülnének, ezért a szűrést a következő körre halasztjuk. */
  if (urlap) urlap.addEventListener('reset', function () { setTimeout(szur, 0); });

  function betolt() {
    if (!window.UQAPI) {
      allapot('<p>A ranglista nem érhető el: hiányzik az adatréteg.</p>');
      return;
    }

    allapot('<p>Ranglista betöltése…</p>');

    var u = UQAPI.user();
    if (u) enNevem = (u.user_metadata && u.user_metadata.display_name) || (u.email || '').split('@')[0];

    // Az összesített sorrend a nézetből jön (overall_rank), a kliens nem rendez.
    UQAPI.rest('/v_leaderboard_course?select=*&order=points.desc,elapsed_ms.asc&limit=100', { anon: !u })
      .then(function (rows) {
        mind = rows || [];
        if (!mind.length) {
          allapot(
            '<p><strong>Még senki nem fejezett be pályát.</strong></p>' +
            '<p>Amint az első csapat végigjátszik egy küldetést, itt jelenik meg az eredménye.</p>');
          if (urlap) urlap.hidden = true;      // nincs mit szűrni
          return;
        }
        if (urlap) urlap.hidden = false;
        valasztokFeltoltese();
        szur();
      })
      .catch(function (err) {
        var offline = !UQAPI.online();
        allapot(
          '<p><strong>' + (offline ? 'Nincs internetkapcsolat.' : 'A ranglista most nem elérhető.') + '</strong></p>' +
          '<p>' + esc(err && err.message ? err.message : '') + '</p>' +
          '<button type="button" class="btn btn-lime" id="rankRetry">Újrapróbálom</button>');
        var b = document.getElementById('rankRetry');
        if (b) b.addEventListener('click', betolt);
      });
  }

  /* ---------- közösségi számok ---------- */

  function szoveg(id, ertek) {
    var el = document.getElementById(id);
    if (el) el.textContent = ertek;
  }

  function statok() {
    if (!window.UQAPI) return;
    UQAPI.rest('/v_stats?select=*&limit=1', { anon: !UQAPI.user() })
      .then(function (rows) {
        kiirStatok((rows && rows[0]) || {});
      })
      .catch(function () { /* a számok elmaradnak, a lap ettől még működik */ });
  }

  function kiirStatok(s) {
    szoveg('stTeams', pont(s.teams));
    szoveg('stFinished', pont(s.finished));
    szoveg('stCourses', pont(s.courses));
    szoveg('stPoints', pont(s.total_points));
    szoveg('stCities', pont(s.cities));
  }

  function bajnok() {
    if (!window.UQAPI) return;
    var kartya = document.getElementById('champCard');
    UQAPI.rest('/v_weekly_champion?select=*&limit=1', { anon: !UQAPI.user() })
      .then(function (rows) {
        var b = rows && rows[0];
        if (!b || !kartya) return;               // e héten még senki — marad rejtve
        szoveg('champName', b.player_name);
        szoveg('champPts', pont(b.points));
        var vege = new Date(b.finished_at);
        var kezd = new Date(vege.getTime() - 6 * 864e5);
        szoveg('champDate', datum(kezd) + ' – ' + datum(vege));
        kartya.hidden = false;
      })
      .catch(function () {});
  }

  /* A saját statisztika a már letöltött ranglistából számol — nincs
     külön kérés, és nem is látszik semmi, amíg nincs valós menet. */
  /* A saját összesítő a TELJES eredménylistából dolgozik, nem a szűrtből:
     a „3 pálya teljesítve" a te előzményed, nem a képernyő pillanatnyi
     állapota. A hovatartozást a szerver mondja meg (en_vagyok), névegyezés
     csak akkor tartalék, ha a mező hiányzik. */
  function enyem(r) {
    return (r.en_vagyok === true) ||
           (r.en_vagyok === undefined && enNevem && r.player_name === enNevem);
  }

  function sajatStat() {
    var kartya = document.getElementById('pstatCard');
    if (!kartya) return;
    var enyeim = mind.filter(enyem);
    if (!enyeim.length) { kartya.hidden = true; return; }

    var osszPont = enyeim.reduce(function (a, r) { return a + Number(r.points || 0); }, 0);
    var osszIdo  = enyeim.reduce(function (a, r) { return a + Number(r.elapsed_ms || 0); }, 0);
    /* A helyezés a nézet összesített rangja — a legjobb eredményed számít. */
    var helyezes = Math.min.apply(null, enyeim.map(function (r) {
      return Number(r.overall_rank) || (mind.indexOf(r) + 1);
    }));

    szoveg('psRank', helyezes + '.');
    szoveg('psPoints', pont(osszPont));
    szoveg('psDone', String(enyeim.length));
    szoveg('psAvg', ido(Math.round(osszIdo / enyeim.length)));
    kartya.hidden = false;
  }

  if (body) {
    betolt();
    statok();
    bajnok();
    if (more) more.addEventListener('click', function () {
      mutatva = Math.min(sorok.length, mutatva + 5);
      render();
    });
    // belépés/kilépés után a „Te" jelölés és a saját statisztika is frissüljön
    if (window.UQAPI) UQAPI.onAuth(function () { betolt(); statok(); });
  }

  /* ---------- fejléc interakciók (változatlan) ---------- */
  var header = document.getElementById('siteHeader');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-stuck', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  var burger = document.getElementById('burger');
  var nav = document.getElementById('mainNav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }
    });
  }
  var lang = document.getElementById('langPicker');
  if (lang) {
    var lbtn = lang.querySelector('.lang-btn');
    var cur = lang.querySelector('.lang-current');
    lbtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = lang.classList.toggle('is-open');
      lbtn.setAttribute('aria-expanded', String(open));
    });
    lang.querySelectorAll('[data-lang]').forEach(function (opt) {
      opt.addEventListener('click', function () {
        if (cur) cur.textContent = opt.dataset.lang;
        lang.querySelectorAll('[role="option"]').forEach(function (o) {
          o.setAttribute('aria-selected', String(o === opt));
        });
        lang.classList.remove('is-open');
      });
    });
    document.addEventListener('click', function () { lang.classList.remove('is-open'); });
  }

  /* ---------- „Csapat alapítása" ----------
     Bejelentkezve a VALÓDI csapat-létrehozó nyílik (név + létszám → kód),
     nem a regisztrációs oldal. Korábban a gomb feltétel nélkül a
     regisztrációra vitt — bejelentkezett játékosként is. */
  var alapit = document.getElementById('csapatAlapit');
  if (alapit) {
    alapit.addEventListener('click', function (e) {
      if (window.UQAuth && UQAuth.isRegistered() && window.UQTeam) {
        e.preventDefault();
        UQTeam.openCreate();
      }
      /* kijelentkezve marad a link: regisztráció, ahogy eddig */
    });
  }
})();
