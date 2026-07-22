/* =========================================================
   URBAN QUEST — ADATÁTKÖLTÖZTETÉS localStorage → Supabase

   Ez az oldal ELŐSZÖR felmér és megmutat, és csak külön gombnyomásra ír.
   A felmérés a lógó hivatkozásokat is kigyűjti: a mai adatban vannak
   olyan feladatok és állomások, amik nem létező pályára mutatnak — ezek
   idegen kulcsot sértenének, tehát nem kerülhetnek át némán.

   Az import idempotens (legacy_key → determinisztikus azonosító),
   tehát nyugodtan futtatható többször.
   ========================================================= */
(function () {
  'use strict';

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  function ls(key) {
    try { var r = localStorage.getItem(key); return r ? JSON.parse(r) : null; }
    catch (e) { return null; }
  }
  function tomb(x) { return Array.isArray(x) ? x : []; }

  /* ---------- értékkészletek: a magyar címke NEM adathordozó ---------- */

  var NEHEZ = { 'Könnyű': 'konnyu', 'Közepes': 'kozepes', 'Nehéz': 'nehez', 'Extrém': 'extrem' };
  function nehezseg(v) {
    if (!v) return 'konnyu';
    if (NEHEZ[v]) return NEHEZ[v];
    var s = String(v).toLowerCase();
    return ['konnyu', 'kozepes', 'nehez', 'extrem'].indexOf(s) > -1 ? s : 'konnyu';
  }

  var KAT = { 'varosi': 'varosi', 'romantikus': 'kaland', 'termeszet': 'kaland', 'tortenelmi': 'tortenelmi', 'csaladi': 'csaladi', 'ceges': 'ceges', 'horror': 'horror' };
  function kategoria(v) { return KAT[String(v || '').toLowerCase()] || 'varosi'; }

  var TIPUS = { kviz: 'kviz', szoveg: 'szoveg', foto: 'foto', kod: 'kod', puzzle: 'puzzle', gps: 'gps', qr: 'qr', info: 'info', dontes: 'dontes', gyors: 'info' };
  function tipus(v) { return TIPUS[String(v || '').toLowerCase()] || 'szoveg'; }

  /* ---------- számok kibányászása a formázott szövegből ---------- */

  function szam(s) {
    if (s == null) return null;
    var m = String(s).replace(',', '.').match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : null;
  }
  function tartomany(s) {
    // '2–3 óra', '1,5–2 óra', '2-6 fő'
    var t = String(s || '').replace(/,/g, '.');
    var m = t.match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/);
    if (m) return [Math.round(Number(m[1])), Math.round(Number(m[2]))];
    var e = szam(t);
    return e == null ? [null, null] : [Math.round(e), null];
  }
  function arFt(s) {
    var t = String(s || '').trim();
    if (!t) return null;
    if (/ingyen/i.test(t)) return 0;
    var m = t.replace(/[\s.]/g, '').match(/\d+/);
    return m ? Number(m[0]) : null;
  }
  function koord(v) {
    var n = szam(v);
    if (n == null) return null;
    return (n >= -180 && n <= 180) ? n : null;
  }

  /* ---------- feladat → megoldás ---------- */

  function megoldas(t) {
    var cfg = t.cfg || {};
    var k = tipus(t.type);
    if (k === 'kviz') {
      var jo = tomb(cfg.options).filter(function (o) { return o && o.correct; })
        .map(function (o) { return String(o.text == null ? '' : o.text); });
      return jo.length ? { accepted: jo } : {};
    }
    if (k === 'kod') return cfg.code ? { accepted: [String(cfg.code)] } : {};
    if (k === 'szoveg') {
      var a = tomb(cfg.accepted).map(String).filter(Boolean);
      return a.length ? { accepted: a } : {};
    }
    if (k === 'puzzle') {
      var it = tomb(cfg.items).map(String);
      return it.length ? { accepted: [it.join('|')] } : {};
    }
    return {};   // foto, gps, qr, info: nincs mit ellenőrizni
  }

  /* A config a telefonra kerül, tehát a helyes válasz jelölője nem
     maradhat benne. A szerver is kiszűri, de itt sem küldjük el. */
  function tisztaCfg(t) {
    var cfg = JSON.parse(JSON.stringify(t.cfg || {}));
    if (Array.isArray(cfg.options)) {
      cfg.options = cfg.options.map(function (o) {
        return { id: o.id || null, text: o.text };
      });
    }
    delete cfg.accepted; delete cfg.code; delete cfg.answer;
    return cfg;
  }

  function feladat(t, pos) {
    return {
      position: pos,
      kind: tipus(t.type),
      question: t.question || t.name || '(nincs kérdés)',
      help: t.help || null,
      image: t.image || null,
      points: Number(t.points) || 0,
      required: t.cfg && t.cfg.required === false ? false : true,
      config: tisztaCfg(t),
      solution: megoldas(t),
      hints: tomb(t.hints).filter(function (h) { return h && h.text; })
        .map(function (h) { return { text: h.text, cost: Number(h.cost) || 0 }; })
    };
  }

  /* =========================================================
     FELMÉRÉS
     ========================================================= */

  function felmeres() {
    var eredmeny = { palyak: [], gondok: [], forrasok: {} };

    var games    = tomb(ls('uq_games_v1'));
    var stations = tomb(ls('uq_stations_v1'));
    var tasks    = tomb(ls('uq_tasks_v1'));
    var courses  = ls('uq_courses_v1') || {};
    var Q  = window.QUESTS || {};
    var QC = window.QUEST_COURSES || {};

    eredmeny.forrasok = {
      'uq_games_v1': games.length,
      'uq_stations_v1': stations.length,
      'uq_tasks_v1': tasks.length,
      'uq_courses_v1': Object.keys(courses).length,
      'beépített küldetés': Object.keys(QC).length
    };

    /* ---- 1) beépített küldetések (data.js + quest-courses.js) ---- */
    Object.keys(QC).forEach(function (slug) {
      var qc = QC[slug] || {};
      var q  = Q[slug] || {};
      var dur = tartomany(q.duration || q.dur);
      var team = tartomany(q.team);

      // Feladat, ami nem létező állomásnévre mutat: némán eltűnne.
      var allomasNevek = {};
      tomb(qc.stations).forEach(function (s) { allomasNevek[s.name] = true; });
      var arva = tomb(qc.tasks).filter(function (t) { return t && !allomasNevek[t.station]; });
      if (arva.length) {
        eredmeny.gondok.push('„' + (qc.title || slug) + '”: ' + arva.length +
          ' feladat nem létező állomásra hivatkozik (' +
          arva.map(function (t) { return '„' + t.station + '”'; }).join(', ') + ') — kimarad.');
      }
      eredmeny.palyak.push({
        forras: 'beépített',
        legacy_key: 'quest:' + slug,
        slug: slug,
        name: q.title || qc.title || slug,
        hero_title: qc.title || q.heroTitle || null,
        subtitle: q.subtitle || null,
        summary: q.desc || null,
        about: q.about || q.longDesc || null,
        difficulty: nehezseg(q.diff),
        category: kategoria(q.cat || q.category),
        status: 'pub',
        city: q.city || 'Budapest',
        cover_image: q.image || null,
        price_huf: arFt(q.price),
        duration_min: dur[0], duration_max: dur[1],
        team_min: team[0], team_max: team[1],
        age_min: szam(q.age),
        distance_m: (function () { var d = szam(q.distance); return d == null ? null : Math.round(d * 1000); })(),
        languages: tomb(q.allLangs).length ? tomb(q.allLangs) : ['hu'],
        do_list: tomb(q.doList), know_list: tomb(q.knowList),
        // A feladatok külön tömbben élnek, ÁLLOMÁSNÉV szerint kötve —
        // ugyanaz a törékeny név-egyeztetés, mint az admin oldalon.
        stations: tomb(qc.stations).map(function (s, i) {
          var sajat = tomb(qc.tasks).filter(function (t) { return t && t.station === s.name; });
          return {
            name: s.name || ('Állomás ' + (i + 1)),
            description: s.desc || s.description || null,
            task_short: s.taskShort || null,
            address: s.loc || null,
            lat: koord(s.lat), lng: koord(s.lng),
            tasks: sajat.map(function (t, j) { return feladat(t, j + 1); })
          };
        })
      });
    });

    /* ---- 2) admin-pályák (uq_games_v1 + uq_stations_v1 + uq_tasks_v1) ---- */
    var palyaNevek = {};
    games.forEach(function (g) { if (g && g.name) palyaNevek[g.name] = g; });
    Object.keys(courses).forEach(function (n) { if (!palyaNevek[n]) palyaNevek[n] = null; });
    stations.forEach(function (s) { if (s && s.route && !(s.route in palyaNevek)) palyaNevek[s.route] = null; });

    Object.keys(palyaNevek).forEach(function (nev) {
      var g = palyaNevek[nev] || {};
      var sajat = stations.filter(function (s) { return s && s.route === nev; });

      // az uq_courses_v1 a másik szerkesztő-út; ha ott több állomás van, azt vesszük
      var beagyazott = tomb(courses[nev]);
      var forras = (beagyazott.length > sajat.length) ? 'uq_courses_v1' : 'uq_stations_v1';
      var lista = (forras === 'uq_courses_v1') ? beagyazott : sajat;

      if (!lista.length) {
        eredmeny.gondok.push('„' + nev + '” pálya nem hoz át állomást — kimarad.');
        return;
      }

      var dur = tartomany(g.dur), team = tartomany(g.team);
      eredmeny.palyak.push({
        forras: 'admin (' + forras + ')',
        legacy_key: 'admin:' + nev,
        slug: null,
        name: nev,
        hero_title: null,
        subtitle: g.subtitle || null,
        summary: g.desc || null,
        about: g.longDesc || null,
        difficulty: nehezseg(g.diff),
        category: kategoria(g.category),
        status: (g.status === 'pub' ? 'pub' : 'draft'),
        city: (g.loc || 'Budapest').split(',')[0].trim(),
        area: (g.loc && g.loc.indexOf(',') > -1) ? g.loc.split(',').slice(1).join(',').trim() : null,
        cover_image: g.image || null,
        price_huf: arFt(g.price),
        duration_min: dur[0], duration_max: dur[1],
        team_min: team[0], team_max: team[1],
        age_min: szam(g.age),
        distance_m: (function () { var d = szam(g.distance); return d == null ? null : Math.round(d * 1000); })(),
        languages: tomb(g.allLangs).length ? tomb(g.allLangs) : ['hu'],
        do_list: tomb(g.doList), know_list: tomb(g.knowList),
        stations: lista.map(function (s, i) {
          var loc = s.location ? String(s.location).split(',') : null;
          var sajatFeladatok = tasks.filter(function (t) {
            return t && t.station === s.name && (!t.route || t.route === nev);
          });
          return {
            name: s.name || ('Állomás ' + (i + 1)),
            description: s.desc || null,
            task_short: s.taskShort || null,
            address: s.loc || null,
            lat: koord(s.lat != null ? s.lat : (loc ? loc[0] : null)),
            lng: koord(s.lng != null ? s.lng : (loc ? loc[1] : null)),
            points: Number(s.score || s.points) || 0,
            tasks: sajatFeladatok.map(function (t, j) { return feladat(t, j + 1); })
          };
        })
      });
    });

    /* ---- 3) lógó hivatkozások: ezek NEM jönnek át ---- */
    var ismertPalyak = {};
    eredmeny.palyak.forEach(function (p) { ismertPalyak[p.name] = true; });

    var arvaFeladat = tasks.filter(function (t) { return t && t.route && !ismertPalyak[t.route]; });
    if (arvaFeladat.length) {
      eredmeny.gondok.push(arvaFeladat.length + ' feladat nem létező pályára hivatkozik (' +
        [...new Set(arvaFeladat.map(function (t) { return t.route; }))].map(function (r) { return '„' + r + '”'; }).join(', ') + ') — kimarad.');
    }

    var arvaAllomas = stations.filter(function (s) { return s && s.route && !ismertPalyak[s.route]; });
    if (arvaAllomas.length) {
      eredmeny.gondok.push(arvaAllomas.length + ' állomás nem létező pályához tartozik — kimarad.');
    }

    // feladat, aminek az állomása nincs meg a saját pályáján
    var parNelkul = 0;
    eredmeny.palyak.forEach(function (p) {
      var nevek = {};
      p.stations.forEach(function (s) { nevek[s.name] = true; });
      tasks.forEach(function (t) {
        if (t && t.route === p.name && t.station && !nevek[t.station]) parNelkul++;
      });
    });
    if (parNelkul) {
      eredmeny.gondok.push(parNelkul + ' feladat olyan állomásnévre hivatkozik, ami a pályáján nem létezik — kimarad.');
    }

    tomb(ls('uq_teams_v1')).forEach(function () {});
    var idozites = tomb(ls('uq_schedules_v1'));
    if (idozites.length) {
      var arvaIdo = idozites.filter(function (i) { return i && i.route && !ismertPalyak[i.route]; }).length;
      if (arvaIdo) eredmeny.gondok.push(arvaIdo + ' időzítés nem létező pályára mutat — az időzítések átköltöztetése egyelőre nem része ennek a lépésnek.');
    }

    var media = tomb(ls('uq_media_v1'));
    var base64 = media.filter(function (m) { return m && typeof m.src === 'string' && m.src.indexOf('data:') === 0; }).length;
    if (base64) {
      eredmeny.gondok.push(base64 + ' médiaelem base64-ként van tárolva — a képek átköltöztetése külön lépés lesz (Storage), most nem jön át.');
    }

    return eredmeny;
  }

  /* =========================================================
     MEGJELENÍTÉS
     ========================================================= */

  var terv = null;
  var elemzes = document.getElementById('elemzes');
  var naplo = document.getElementById('naplo');
  var gomb = document.getElementById('btnImport');

  function ir(html) { if (naplo) naplo.innerHTML += html; }

  function renderFelmeres() {
    terv = felmeres();
    var h = [];

    h.push('<h3>Amit a böngésződben találtam</h3><ul class="mig-forras">');
    Object.keys(terv.forrasok).forEach(function (k) {
      h.push('<li><b>' + terv.forrasok[k] + '</b> <span>' + esc(k) + '</span></li>');
    });
    h.push('</ul>');

    h.push('<h3>Átköltöztethető pályák (' + terv.palyak.length + ')</h3>');
    if (!terv.palyak.length) {
      h.push('<p class="mig-ures">Nem találtam átköltöztethető pályát ebben a böngészőben.</p>');
    } else {
      h.push('<table class="mig-tabla"><thead><tr><th>Pálya</th><th>Forrás</th><th>Állomás</th><th>Feladat</th><th>Állapot</th></tr></thead><tbody>');
      terv.palyak.forEach(function (p) {
        var fel = p.stations.reduce(function (a, s) { return a + s.tasks.length; }, 0);
        h.push('<tr><td>' + esc(p.name) + '</td><td>' + esc(p.forras) + '</td><td>' + p.stations.length +
               '</td><td>' + fel + '</td><td>' + (p.status === 'pub' ? 'közzétett' : 'vázlat') + '</td></tr>');
      });
      h.push('</tbody></table>');
    }

    h.push('<h3>Ami NEM jön át (' + terv.gondok.length + ')</h3>');
    if (!terv.gondok.length) {
      h.push('<p class="mig-ok">Nem találtam lógó hivatkozást — minden adat átköltöztethető.</p>');
    } else {
      h.push('<ul class="mig-gond">');
      terv.gondok.forEach(function (g) { h.push('<li>' + esc(g) + '</li>'); });
      h.push('</ul>');
    }

    elemzes.innerHTML = h.join('');
    if (gomb) gomb.disabled = !terv.palyak.length;
  }

  /* =========================================================
     IMPORT
     ========================================================= */

  function importal() {
    if (!terv || !terv.palyak.length) return;
    gomb.disabled = true;
    naplo.innerHTML = '';
    ir('<p>Indul az átköltöztetés…</p>');

    var i = 0, ok = 0, hiba = 0;

    function lepes() {
      if (i >= terv.palyak.length) {
        ir('<p class="' + (hiba ? 'mig-gond-sor' : 'mig-ok') + '"><b>Kész.</b> ' + ok + ' pálya átköltöztetve' +
           (hiba ? ', ' + hiba + ' hibára futott' : '') + '.</p>');
        ir('<p>Az import idempotens — ha valami hibázott, nyugodtan futtathatod újra.</p>');
        gomb.disabled = false;
        return;
      }
      var p = terv.palyak[i++];
      ir('<p>' + esc(p.name) + ' … ');
      UQAPI.rest('/rpc/import_course', { method: 'POST', body: { p: p } })
        .then(function (r) {
          var d = Array.isArray(r) ? r[0] : r;
          ok++;
          ir('<b class="mig-ok-sor">átjött</b> (' + (d && d.stations) + ' állomás, ' + (d && d.tasks) + ' feladat)</p>');
          return UQAPI.rest('/rpc/publish_course', { method: 'POST', body: { p_course: d.course_id } })
            .then(function (pr) {
              var v = Array.isArray(pr) ? pr[0] : pr;
              if (v && v.warnings && v.warnings.length) {
                ir('<p class="mig-warn">↳ publikálva, de: ' + v.warnings.map(esc).join('; ') + '</p>');
              } else {
                ir('<p class="mig-ok-sor">↳ publikálva (v' + (v && v.version) + ')</p>');
              }
            })
            .catch(function (e) { ir('<p class="mig-gond-sor">↳ publikálás nem sikerült: ' + esc(e.message) + '</p>'); });
        })
        .catch(function (e) {
          hiba++;
          ir('<b class="mig-gond-sor">hiba: ' + esc(e.message) + '</b></p>');
        })
        .then(lepes);
    }
    lepes();
  }

  /* =========================================================
     indulás — csak adminnak
     ========================================================= */

  function indul() {
    var fig = document.getElementById('jogFigy');
    if (!window.UQAPI || !UQAPI.user()) {
      fig.hidden = false;
      fig.innerHTML = '<p><b>Nem vagy bejelentkezve.</b> Az átköltöztetéshez admin fiók kell.</p>' +
                      '<p><a class="btn btn-lime" href="bejelentkezes.html?next=atkoltoztetes.html">Bejelentkezés</a></p>';
      if (gomb) gomb.disabled = true;
      renderFelmeres();
      if (gomb) gomb.disabled = true;
      return;
    }
    UQAPI.isAdmin().then(function (admin) {
      renderFelmeres();
      if (!admin) {
        fig.hidden = false;
        fig.innerHTML = '<p><b>Ez a fiók nem admin.</b> A felmérést látod, de írni nem tudsz. ' +
                        'Az adminná tételhez az e-mail címednek szerepelnie kell az admin-jelöltek listáján.</p>';
        if (gomb) gomb.disabled = true;
      }
    });
  }

  if (gomb) gomb.addEventListener('click', importal);
  var ujra = document.getElementById('btnUjraFelmer');
  if (ujra) ujra.addEventListener('click', renderFelmeres);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', indul);
  else indul();
})();
