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
  var mentesOra = null, utolsoKereses = 0;

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

  /* ---------- mentés ---------- */

  function utemez(a) {
    if (mentesOra) clearTimeout(mentesOra);
    mentesOra = setTimeout(function () { mentAllomas(a); }, 700);
  }

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
                   lat: s.lat, lng: s.lng };
        });
        renderLista();
        jelolokFrissit();
        terkepIgazit();
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
