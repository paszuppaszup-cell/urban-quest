/* =========================================================
   URBAN QUEST — ALKOTÓ: Állomások

   Térkép, mint az adminban: koppintásra új állomás, a jelölő húzható.
   Emellett címkereső — a szerző beírja, hogy „Hősök tere", és a térkép
   odaugrik. A keresés az OpenStreetMap Nominatim szolgáltatását hívja,
   ugyanattól, ahonnan a térképcsempék jönnek.

   Amit a szolgáltató kér, és amit betartunk: nem gépelésre keresünk, hanem
   kizárólag akkor, amikor a szerző elküldi a keresést — és két kérés között
   legalább egy másodperc telik el. Egy szerkesztő nem terhelhet közös,
   ingyenes szolgáltatást minden leütéssel.

   A mentés automatikus: minden mozdítás és átírás megy a szerverre, mert
   telefonon a legkönnyebb elnavigálni egy mentetlen űrlapról.
   ========================================================= */
(function () {
  'use strict';

  var KULCS = 'uq_alkoto_palya';

  var palya = null, allomasok = [], map = null, jelolok = [], utvonal = null;
  var utolsoKereses = 0;

  function $(s) { return document.querySelector(s); }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  var KIND = [
    { ertek: 'kezdo',   szo: 'Kezdő állomás' },
    { ertek: 'feladat', szo: 'Feladat' },
    { ertek: 'info',    szo: 'Információ' },
    { ertek: 'dontes',  szo: 'Döntési pont' },
    { ertek: 'zaro',    szo: 'Záró állomás' }
  ];
  function kindSzo(k) {
    for (var i = 0; i < KIND.length; i++) if (KIND[i].ertek === k) return KIND[i].szo;
    return 'Feladat';
  }

  /* ---------- térkép ---------- */

  function terkepInit() {
    if (map || typeof L === 'undefined') return;
    map = L.map('terkep', { zoomControl: true }).setView([47.4979, 19.0402], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap'
    }).addTo(map);
    utvonal = L.layerGroup().addTo(map);
    map.on('click', terkepKoppintas);
    setTimeout(function () { if (map) map.invalidateSize(); }, 200);
  }

  function terkepKoppintas(e) {
    if (allomasok.length >= 20) {
      uzenet('Legfeljebb 20 állomás lehet egy pályán.');
      return;
    }
    var elso = allomasok.length === 0;
    ujAllomas({
      name: elso ? 'Rajt' : 'Új állomás',
      kind: elso ? 'kezdo' : 'feladat',
      lat: e.latlng.lat, lng: e.latlng.lng
    });
  }

  function jelolokFrissit() {
    jelolok.forEach(function (m) { map.removeLayer(m); });
    jelolok = [];
    utvonal.clearLayers();
    if (!map) return;

    var pontok = [];
    allomasok.forEach(function (a, i) {
      if (a.lat == null || a.lng == null) return;
      pontok.push([a.lat, a.lng]);

      var ikon = L.divIcon({
        className: 'alk-jelolo-doboz',
        html: '<span class="alk-jelolo alk-j-' + (a.kind || 'feladat') + '">' + (i + 1) + '</span>',
        iconSize: [26, 26], iconAnchor: [13, 13]
      });
      var m = L.marker([a.lat, a.lng], { icon: ikon, draggable: true }).addTo(map);
      m.on('dragend', function (ev) {
        var p = ev.target.getLatLng();
        a.lat = p.lat; a.lng = p.lng;
        mentAllomas(a);
        vonalFrissit();
      });
      m.on('click', function () { focusAllomas(a.id); });
      jelolok.push(m);
    });

    if (pontok.length > 1) {
      L.polyline(pontok, { color: '#9ed52b', weight: 3, opacity: .65, dashArray: '6 6' }).addTo(utvonal);
    }
  }

  function vonalFrissit() {
    utvonal.clearLayers();
    var pontok = allomasok.filter(function (a) { return a.lat != null; })
                          .map(function (a) { return [a.lat, a.lng]; });
    if (pontok.length > 1) {
      L.polyline(pontok, { color: '#9ed52b', weight: 3, opacity: .65, dashArray: '6 6' }).addTo(utvonal);
    }
  }

  function terkepIgazit() {
    if (!map) return;
    var p = allomasok.filter(function (a) { return a.lat != null; })
                     .map(function (a) { return [a.lat, a.lng]; });
    if (!p.length) return;
    if (p.length === 1) map.setView(p[0], 16);
    else map.fitBounds(L.latLngBounds(p), { padding: [40, 40], maxZoom: 17 });
  }

  /* ---------- címkeresés ---------- */

  function keres(szoveg) {
    var most = Date.now();
    if (most - utolsoKereses < 1000) {
      uzenet('Egy pillanat — másodpercenként egy keresés.');
      return;
    }
    utolsoKereses = most;

    var gomb = $('#keresoGomb');
    gomb.disabled = true; gomb.textContent = 'Keresés…';

    /* A Nominatim nem a mi szolgáltatásunk: ezért megyünk óvatosan, és
       ezért nem használjuk a UQAPI-t (az a Supabase-hez tartozik). */
    fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=hu&q=' +
          encodeURIComponent(szoveg), { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (lista) { talalatokRajzol(lista || []); })
      .catch(function () { uzenet('A keresés most nem elérhető. Koppints a térképre helyette.'); })
      .then(function () { gomb.disabled = false; gomb.textContent = 'Keresés'; });
  }

  function talalatokRajzol(lista) {
    var host = $('#talalatok');
    host.innerHTML = '';
    if (!lista.length) {
      host.hidden = false;
      host.appendChild(el('p', 'alk-nincs-talalat', 'Nincs találat. Próbáld pontosabban, vagy koppints a térképre.'));
      return;
    }
    lista.forEach(function (t) {
      var b = el('button', 'alk-talalat');
      b.type = 'button';
      b.appendChild(el('b', null, (t.name || t.display_name || '').split(',')[0]));
      b.appendChild(el('small', null, t.display_name || ''));   // IDEGEN szolgáltatás szövege
      b.addEventListener('click', function () {
        map.setView([parseFloat(t.lat), parseFloat(t.lon)], 17);
        host.hidden = true;
        $('#keresoMezo').value = '';
      });
      host.appendChild(b);
    });
    host.hidden = false;
  }

  /* ---------- állomás-lista ---------- */

  function renderLista() {
    var host = $('#allomasLista');
    host.innerHTML = '';

    var db = allomasok.length;
    var sz = $('#szamlalo');
    sz.querySelector('b').textContent = db;
    sz.classList.toggle('is-keves', db < 5);
    sz.classList.toggle('is-jo', db >= 5 && db <= 20);

    if (!db) {
      host.appendChild(el('p', 'alk-terkep-ures',
        'Még nincs állomás. Koppints a térképre, ahol az első helyszín lesz.'));
      return;
    }

    allomasok.forEach(function (a, i) {
      var sor = el('div', 'alk-allomas', null);
      sor.setAttribute('data-id', a.id);

      var fej = el('div', 'alk-allomas-fej');
      fej.appendChild(el('span', 'alk-allomas-szam', String(i + 1)));

      var nev = document.createElement('input');
      nev.type = 'text'; nev.className = 'alk-allomas-nev';
      nev.value = a.name || ''; nev.maxLength = 80;
      nev.placeholder = 'Az állomás neve';
      nev.addEventListener('input', function () { a.name = nev.value; utemez(a); });
      fej.appendChild(nev);

      var tipus = document.createElement('select');
      tipus.className = 'alk-allomas-tipus';
      KIND.forEach(function (k) {
        var o = document.createElement('option');
        o.value = k.ertek; o.textContent = k.szo;
        if ((a.kind || 'feladat') === k.ertek) o.selected = true;
        tipus.appendChild(o);
      });
      tipus.addEventListener('change', function () {
        a.kind = tipus.value; mentAllomas(a); jelolokFrissit(); renderLista();
      });
      fej.appendChild(tipus);

      var torol = el('button', 'alk-allomas-torol');
      torol.type = 'button';
      torol.setAttribute('aria-label', 'Állomás törlése');
      torol.textContent = '×';
      torol.addEventListener('click', function () { torolAllomas(a); });
      fej.appendChild(torol);
      sor.appendChild(fej);

      var leiras = document.createElement('textarea');
      leiras.className = 'alk-allomas-leiras'; leiras.rows = 2; leiras.maxLength = 600;
      leiras.placeholder = 'Mit lát itt a játékos? Hogyan találja meg a pontos helyet?';
      leiras.value = a.description || '';
      leiras.addEventListener('input', function () { a.description = leiras.value; utemez(a); });
      sor.appendChild(leiras);

      var lab = el('div', 'alk-allomas-lab');
      lab.appendChild(el('span', 'alk-koord',
        (a.lat != null ? a.lat.toFixed(5) + ', ' + a.lng.toFixed(5) : 'nincs koordináta')));

      var mutasd = el('button', 'alk-linkgomb', 'Mutasd a térképen');
      mutasd.type = 'button';
      mutasd.addEventListener('click', function () {
        if (a.lat != null) map.setView([a.lat, a.lng], 17);
      });
      lab.appendChild(mutasd);

      if (i > 0) {
        var fel = el('button', 'alk-linkgomb', '↑ előbbre');
        fel.type = 'button';
        fel.addEventListener('click', function () { mozgat(i, i - 1); });
        lab.appendChild(fel);
      }
      if (i < allomasok.length - 1) {
        var le = el('button', 'alk-linkgomb', '↓ hátrébb');
        le.type = 'button';
        le.addEventListener('click', function () { mozgat(i, i + 1); });
        lab.appendChild(le);
      }
      sor.appendChild(lab);
      if ((a.kind || 'feladat') === 'dontes') sor.appendChild(agSzerkeszto(a));
      host.appendChild(sor);
    });
  }

  function focusAllomas(id) {
    var e = document.querySelector('.alk-allomas[data-id="' + id + '"]');
    if (!e) return;
    e.scrollIntoView({ behavior: 'smooth', block: 'center' });
    e.classList.add('is-kiemelt');
    setTimeout(function () { e.classList.remove('is-kiemelt'); }, 1200);
  }

  function mozgat(honnan, hova) {
    var a = allomasok.splice(honnan, 1)[0];
    allomasok.splice(hova, 0, a);
    renderLista(); jelolokFrissit();
    UQAPI.rest('/rpc/reorder_stations', {
      method: 'POST',
      body: { p_course: palya.id, p_ids: allomasok.map(function (x) { return x.id; }) }
    }).catch(uzenetHiba);
  }

  /* =========================================================
     ELÁGAZÁS — döntési pont útjai

     Az eleket eddig CSAK az admin tudta megadni (admin.js), az Alkotó egyik
     oldala sem. Emiatt a szerző fel tudta venni a „Döntési pont" állomást és a
     hozzá tartozó feladatot, de a pályát utána SOHA nem tudta beküldeni: a
     course_lint jogosan visszadobta, hogy „a döntési pontnak 0 folytatása van",
     és nem volt képernyő, ahol megjavíthatta volna. Zsákutca.

     A mentés a save_station_edges RPC-vel megy, ami az assert_can_edit_station-t
     hívja — a szerzőnek tehát már eddig is joga volt hozzá, csak felülete nem.
     ========================================================= */

  function agakBetolt() {
    if (!palya) return Promise.resolve();
    return UQAPI.rest('/station_edges?select=from_station,to_station,label,branch_key,sort_order' +
                      '&course_id=eq.' + encodeURIComponent(palya.id) + '&order=sort_order.asc')
      .then(function (sorok) {
        var re = {};
        allomasok.forEach(function (s) { s.agak = []; re[s.id] = s; });
        (sorok || []).forEach(function (r) {
          var h = re[r.from_station];
          if (!h || !re[r.to_station]) return;
          h.agak.push({ label: r.label || '', to: r.to_station, key: r.branch_key || '' });
        });
        renderLista();
      })
      .catch(function () { /* elágazás nélkül is szerkeszthető a pálya */ });
  }

  function agSor(a, ag, idx) {
    var sor = el('div', 'alk-ag');

    var cimke = document.createElement('input');
    cimke.type = 'text'; cimke.className = 'alk-ag-cimke'; cimke.maxLength = 60;
    cimke.placeholder = idx === 0 ? 'pl. Balra, a lépcsőn' : 'pl. Jobbra, a kapu felé';
    cimke.value = ag.label || '';
    cimke.addEventListener('input', function () { ag.label = cimke.value; agakUtemez(a); });
    sor.appendChild(cimke);

    var cel = document.createElement('select');
    cel.className = 'alk-ag-cel';
    var ures = document.createElement('option');
    ures.value = ''; ures.textContent = '— hova visz? —';
    cel.appendChild(ures);
    allomasok.forEach(function (s, i) {
      if (s.id === a.id) return;               // önmagára nem mutathat
      var o = document.createElement('option');
      o.value = s.id;
      o.textContent = (i + 1) + '. ' + (s.name || 'Névtelen');
      if (ag.to === s.id) o.selected = true;
      cel.appendChild(o);
    });
    /* Újrarajzolunk, hogy a „még N utat kell megadnod" figyelmeztetés eltűnjön,
       amint tényleg megvan. Kint ragadva azt hitetné a szerzővel, hogy nem
       végzett — pedig végzett. A címke-mezőnél NEM rajzolunk újra, mert az
       gépelés közben kirántaná a fókuszt. */
    cel.addEventListener('change', function () {
      ag.to = cel.value; agakUtemez(a); renderLista();
    });
    sor.appendChild(cel);

    var x = el('button', 'alk-ag-torol', '×');
    x.type = 'button'; x.setAttribute('aria-label', 'Út törlése');
    x.addEventListener('click', function () {
      a.agak.splice(idx, 1); agakMent(a); renderLista();
    });
    sor.appendChild(x);
    return sor;
  }

  function agSzerkeszto(a) {
    var d = el('div', 'alk-agak');
    d.appendChild(el('b', null, 'Melyik út hová visz?'));
    d.appendChild(el('p', null,
      'Ez döntési pont: innen legalább KÉT külön útnak kell indulnia. ' +
      'A címke az, amit a csapat választani fog.'));

    if (!a.agak || !a.agak.length) a.agak = [{ label: '', to: '' }, { label: '', to: '' }];
    a.agak.forEach(function (ag, i) { d.appendChild(agSor(a, ag, i)); });

    var kesz = (a.agak || []).filter(function (g) { return g.to; }).length;
    if (kesz < 2) {
      d.appendChild(el('p', 'alk-ag-fig',
        'Még ' + (2 - kesz) + ' utat kell megadnod, különben a pálya nem küldhető be.'));
    }

    if (a.agak.length < 4) {
      var plusz = el('button', 'alk-linkgomb', '+ még egy út');
      plusz.type = 'button';
      plusz.addEventListener('click', function () {
        a.agak.push({ label: '', to: '' }); renderLista();
      });
      d.appendChild(plusz);
    }
    return d;
  }

  var agOrak = {}, fuggoAgak = {};
  function agakUtemez(a) {
    if (agOrak[a.id]) clearTimeout(agOrak[a.id]);
    fuggoAgak[a.id] = a;
    agOrak[a.id] = setTimeout(function () {
      delete fuggoAgak[a.id];
      agakMent(a);
    }, 700);
  }

  function agakMent(a) {
    var lista = (a.agak || [])
      .filter(function (g) { return g.to; })
      .map(function (g, i) {
        return { to: g.to, label: g.label || '', branch_key: g.key || ('ag' + (i + 1)) };
      });
    return UQAPI.rest('/rpc/save_station_edges', {
      method: 'POST', body: { p_station: a.id, p_edges: lista }
    }).then(jelezMentve).catch(uzenetHiba);
  }

  /* ---------- mentés ---------- */

  /* ÁLLOMÁSONKÉNT külön időzítő. Egy közös időzítővel, ha a szerző az egyik
     állomás nevét írta, majd 700 ezredmásodpercen belül a másikét, az első
     mentése törlődött, mielőtt elsült volna — és szó nélkül elveszett. */
  var mentOrak = {}, fuggoAllomasok = {};
  function utemez(a) {
    if (mentOrak[a.id]) clearTimeout(mentOrak[a.id]);
    fuggoAllomasok[a.id] = a;
    mentOrak[a.id] = setTimeout(function () {
      delete fuggoAllomasok[a.id];
      mentAllomas(a);
    }, 700);
  }

  /* Lapelhagyáskor minden függő mentést elsütünk — állomásnevet és leírást,
     valamint az elágazás útjait is. Enélkül, ha a szerző gépelés után azonnal
     a „Tovább a feladatokhoz" gombra koppint, a beírt szöveg elveszik. */
  function fuggokElsutese() {
    Object.keys(mentOrak).forEach(function (id) {
      if (!fuggoAllomasok[id]) return;
      clearTimeout(mentOrak[id]);
      var a = fuggoAllomasok[id];
      delete fuggoAllomasok[id];
      mentAllomas(a);
    });
    Object.keys(agOrak).forEach(function (id) {
      if (!fuggoAgak[id]) return;
      clearTimeout(agOrak[id]);
      var a = fuggoAgak[id];
      delete fuggoAgak[id];
      agakMent(a);
    });
  }
  window.addEventListener('pagehide', fuggokElsutese);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') fuggokElsutese();
  });

  function mentAllomas(a) {
    return UQAPI.rest('/rpc/save_station', {
      method: 'POST',
      body: { p: {
        id: a.id, course_id: palya.id,
        name: a.name || 'Névtelen állomás',
        kind: a.kind || 'feladat',
        description: a.description || '',
        lat: a.lat, lng: a.lng
      } }
    }).then(jelezMentve).catch(uzenetHiba);
  }

  function ujAllomas(adat) {
    return UQAPI.rest('/rpc/save_station', {
      method: 'POST',
      body: { p: {
        course_id: palya.id, name: adat.name, kind: adat.kind,
        lat: adat.lat, lng: adat.lng, description: ''
      } }
    }).then(function (r) {
      var uj = Array.isArray(r) ? r[0] : r;
      allomasok.push({
        id: uj.id, name: adat.name, kind: adat.kind,
        lat: adat.lat, lng: adat.lng, description: ''
      });
      renderLista(); jelolokFrissit(); jelezMentve();
      /* A sorrend a felvétel sorrendje — a szerver pozíciót is oszt. */
      return UQAPI.rest('/rpc/reorder_stations', {
        method: 'POST',
        body: { p_course: palya.id, p_ids: allomasok.map(function (x) { return x.id; }) }
      });
    }).catch(uzenetHiba);
  }

  function torolAllomas(a) {
    UQAPI.rest('/rpc/delete_station', { method: 'POST', body: { p_station: a.id } })
      .then(function () {
        allomasok = allomasok.filter(function (x) { return x.id !== a.id; });
        renderLista(); jelolokFrissit(); jelezMentve();
      })
      .catch(uzenetHiba);
  }

  /* ---------- visszajelzés ---------- */

  var uzenetOra = null;
  function uzenet(szoveg, rossz) {
    var host = $('#szerkeszto');
    var regi = host.querySelector('.alk-buborek');
    if (regi) regi.remove();
    var b = el('div', 'alk-buborek' + (rossz ? ' is-rossz' : ''), szoveg);
    host.insertBefore(b, host.firstChild);
    if (uzenetOra) clearTimeout(uzenetOra);
    uzenetOra = setTimeout(function () { b.remove(); }, 3600);
  }
  function uzenetHiba(e) { uzenet((e && e.message) || 'Nem sikerült menteni.', true); }
  function jelezMentve() { uzenet('Elmentve'); }

  /* ---------- betöltés ---------- */

  function tolt() {
    var id = null;
    try { id = localStorage.getItem(KULCS); } catch (e) {}
    if (!id) { $('#nincsPalya').hidden = false; return Promise.resolve(); }

    return UQAPI.rest('/v_my_courses?select=*&id=eq.' + encodeURIComponent(id))
      .then(function (r) {
        palya = (r || [])[0] || null;
        if (!palya) { $('#nincsPalya').hidden = false; return; }
        $('#palyaNev').textContent = palya.name || '(névtelen pálya)';
        $('#szerkeszto').hidden = false;
        terkepInit();
        return UQAPI.rest('/stations?select=id,name,kind,description,lat,lng,position' +
                          '&course_id=eq.' + encodeURIComponent(palya.id) + '&order=position.asc');
      })
      .then(function (r) {
        if (!r) return;
        allomasok = (r || []).map(function (s) {
          return { id: s.id, name: s.name, kind: s.kind, description: s.description,
                   lat: s.lat, lng: s.lng, agak: [] };
        });
        renderLista();
        jelolokFrissit();
        terkepIgazit();
        return agakBetolt();
      })
      .catch(function (e) {
        $('#nincsPalya').hidden = false;
        uzenetHiba(e);
      });
  }

  /* ---------- események ---------- */

  $('#keresoUrlap').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var q = $('#keresoMezo').value.trim();
    if (q.length >= 3) keres(q);
  });

  function indul() {
    if (!window.UQAPI || !UQAPI.user()) {
      $('#nincsPalya').hidden = false;
      $('#nincsPalya').querySelector('b').textContent = 'Jelentkezz be';
      return;
    }
    UQAPI.ready().then(tolt);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', indul);
  else indul();
})();
