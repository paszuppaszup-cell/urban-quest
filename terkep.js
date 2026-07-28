/* =========================================================
   URBAN QUEST — várostérkép a küldetésekkel

   Mit mutat: minden publikált pálya INDULÁSI pontját egy-egy tűvel.
   Honnan az adat: a `v_play_bundle` nézet — ugyanaz a befagyasztott
   csomag, amit a játékos is kap, és bejelentkezés nélkül olvasható.
   Ezért nem kellett sem új tábla, sem séma-módosítás: a koordináták
   régóta benne vannak, csak eddig senki nem rajzolta ki őket.

   A tűk alatt ugyanaz a lista szövegesen is megjelenik. Nem díszítés:
   ha a csempeszolgáltató nem elérhető, vagy valaki képernyőolvasóval
   használja a lapot, a térkép önmagában semmit nem érne.
   ========================================================= */
(function () {
  'use strict';

  var terkepEl = document.getElementById('terkep');
  var allapotEl = document.getElementById('terkepAllapot');
  var listaEl = document.getElementById('terkepLista');
  if (!terkepEl || !window.UQAPI) return;

  var BUDAPEST = [47.4979, 19.0402];
  var map = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function allapot(html) {
    if (allapotEl) allapotEl.innerHTML = html || '';
  }

  /* Az indulási pont: a `kezdo` típusú állomás, ha van; egyébként a
     legkisebb pozíciójú. Koordináta nélküli pálya kimarad a térképről —
     de a listában ott marad, mert attól még játszható. */
  function indulasiPont(csomag) {
    var st = (csomag && csomag.stations) || [];
    var jeloltek = st.filter(function (s) {
      var la = Number(s.lat), lo = Number(s.lng);
      return isFinite(la) && isFinite(lo) && (la !== 0 || lo !== 0);
    });
    if (!jeloltek.length) return null;
    var kezdo = jeloltek.filter(function (s) { return s.kind === 'kezdo'; })[0];
    if (kezdo) return kezdo;
    return jeloltek.sort(function (a, b) {
      return (a.position || 0) - (b.position || 0);
    })[0];
  }

  function palyakBetoltese() {
    allapot('<span class="terkep-tolt">Küldetések betöltése…</span>');
    return UQAPI.rest('/v_play_bundle?select=slug,bundle', { anon: true })
      .then(function (sorok) {
        return (sorok || []).map(function (r) {
          var b = r.bundle || {};
          var c = b.course || {};
          var start = indulasiPont(b);
          return {
            slug: r.slug,
            nev: c.name || r.slug,
            varos: c.city || '',
            terulet: c.area || '',
            kep: c.image || '',
            nehezseg: c.difficulty || '',
            allomasok: (b.stations || []).length,
            lat: start ? Number(start.lat) : null,
            lng: start ? Number(start.lng) : null,
            indulas: start ? (start.name || '') : '',
            cim: start ? (start.address || '') : ''
          };
        });
      });
  }

  function tuIkon() {
    /* Saját tű, hogy ne kelljen a Leaflet alapértelmezett képfájljait
       külön útvonalról betölteni (azok a vendor mappában más helyre
       mutatnának, és néma 404-eket okoznának). */
    return L.divIcon({
      className: 'terkep-tu',
      html: '<span class="terkep-tu-pont"></span>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -12]
    });
  }

  function felbukkano(p) {
    return '<div class="terkep-pop">' +
      '<strong>' + esc(p.nev) + '</strong>' +
      (p.indulas ? '<span class="terkep-pop-hely">Indulás: ' + esc(p.indulas) + '</span>' : '') +
      (p.cim ? '<span class="terkep-pop-cim">' + esc(p.cim) + '</span>' : '') +
      '<a class="terkep-pop-link" href="kuldetes.html?id=' + encodeURIComponent(p.slug) + '">' +
      'Küldetés megnyitása</a></div>';
  }

  function listaHTML(palyak) {
    if (!palyak.length) return '';
    return '<h2 class="terkep-lista-cim">Küldetések</h2><ul class="terkep-lista-sorok">' +
      palyak.map(function (p) {
        var hely = [p.terulet, p.varos].filter(Boolean).join(', ');
        return '<li class="terkep-sor">' +
          '<a href="kuldetes.html?id=' + encodeURIComponent(p.slug) + '">' +
          '<span class="terkep-sor-nev">' + esc(p.nev) + '</span>' +
          '<span class="terkep-sor-meta">' +
          (hely ? esc(hely) + ' · ' : '') + p.allomasok + ' állomás' +
          (p.lat === null ? ' · <em>nincs térképen</em>' : '') +
          '</span></a></li>';
      }).join('') + '</ul>';
  }

  function kirajzol(palyak) {
    if (listaEl) listaEl.innerHTML = listaHTML(palyak);

    var terkepesek = palyak.filter(function (p) { return p.lat !== null; });

    if (!palyak.length) {
      allapot('<strong>Még nincs közzétett küldetés.</strong>' +
              '<span>Amint az első pálya élesre kerül, itt jelenik meg a térképen.</span>');
      terkepEl.classList.add('is-ures');
      return;
    }
    if (!terkepesek.length) {
      allapot('<strong>A küldetéseknél még nincs megadva koordináta.</strong>' +
              '<span>A lista alatta így is használható.</span>');
      terkepEl.classList.add('is-ures');
      return;
    }

    allapot('');
    map = L.map(terkepEl, { scrollWheelZoom: false }).setView(BUDAPEST, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap'
    }).addTo(map);

    var hatarok = [];
    terkepesek.forEach(function (p) {
      L.marker([p.lat, p.lng], { icon: tuIkon(), title: p.nev })
        .addTo(map)
        .bindPopup(felbukkano(p));
      hatarok.push([p.lat, p.lng]);
    });

    /* A `maxZoom` nem kozmetika: a pályák indulási pontja egymáshoz közel is
       eshet (most mindkettő a Városliget környékén), és a puszta fitBounds
       ilyenkor annyira ránagyít, hogy a térképről nem derül ki, a város
       melyik részén vagyunk. */
    if (hatarok.length === 1) {
      map.setView(hatarok[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(hatarok).pad(0.25), { maxZoom: 15 });
    }

    /* A lap magassága a betöltés után változhat (a lista alatta épül fel),
       a Leaflet pedig a saját méretét a létrehozáskor jegyzi meg. */
    setTimeout(function () { if (map) map.invalidateSize(); }, 120);
  }

  palyakBetoltese()
    .then(kirajzol)
    .catch(function (err) {
      terkepEl.classList.add('is-ures');
      var offline = !UQAPI.online();
      allapot('<strong>' + (offline ? 'Nincs internetkapcsolat.' : 'A térkép most nem elérhető.') + '</strong>' +
              '<span>' + esc(err && err.message ? err.message : '') + '</span>' +
              '<button type="button" class="btn btn-lime" id="terkepUjra">Újrapróbálom</button>');
      var b = document.getElementById('terkepUjra');
      if (b) b.addEventListener('click', function () { location.reload(); });
    });
})();
