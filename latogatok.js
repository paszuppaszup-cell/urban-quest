/* =========================================================
   URBAN QUEST — ADMIN: LÁTOGATÓK

   Két fül: kik regisztráltak, és mire nyomtak. Minden adat a
   v_admin_users / v_admin_events / v_admin_latogato_stat nézetekből jön —
   azok a szerveren ellenőrzik az admin jogot, és nem adminnak ÜRES
   eredményt adnak, nem hibát.

   A megjelenítés DOM-ból épül, nem string-konkatenált innerHTML-ből: itt
   MÁSIK felhasználó szövege (megjelenített név, e-mail, pálya-azonosító)
   renderelődik a te böngésződben.
   ========================================================= */
(function () {
  'use strict';

  var LAP = 100;                 // ennyi eseményt kérünk egyszerre

  var fiokok = [], esemenyek = [], eltolas = 0, fogyott = false;

  function $(s) { return document.querySelector(s); }

  function szam(n) {
    return (n == null || isNaN(n)) ? '—' : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  /* Rövid, magyar és OLVASHATÓ időpont. „3 perce" többet mond, mint egy
     ISO-bélyeg — de a pontos érték is elérhető, egérrel fölé állva. */
  function mikor(iso) {
    if (!iso) return '—';
    var t = Date.parse(iso);
    if (isNaN(t)) return '—';
    var mp = Math.round((Date.now() - t) / 1000);
    if (mp < 60) return 'az imént';
    if (mp < 3600) return Math.floor(mp / 60) + ' perce';
    if (mp < 86400) return Math.floor(mp / 3600) + ' órája';
    if (mp < 7 * 86400) return Math.floor(mp / 86400) + ' napja';
    return new Date(t).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  function teljesIdo(iso) {
    var t = Date.parse(iso);
    return isNaN(t) ? '' : new Date(t).toLocaleString('hu-HU');
  }

  var LEPES = {
    oldal:               { szo: 'megnyitott egy oldalt', cls: 'lt-k-oldal' },
    regisztracio:        { szo: 'regisztrált',            cls: 'lt-k-fo' },
    belepes:             { szo: 'belépett',               cls: 'lt-k-jo' },
    kilepes:             { szo: 'kilépett',               cls: 'lt-k-halvany' },
    kuldetes_megnyitva:  { szo: 'megnézett egy küldetést', cls: 'lt-k-info' },
    jatek_indult:        { szo: 'elindított egy játékot',  cls: 'lt-k-fo' },
    jatek_kesz:          { szo: 'befejezett egy játékot',  cls: 'lt-k-jo' },
    jatek_elhagyva:      { szo: 'félbehagyott egy játékot', cls: 'lt-k-rossz' },
    kedvenc_be:          { szo: 'kedvencelt',             cls: 'lt-k-info' },
    kedvenc_ki:          { szo: 'levette a kedvencekről', cls: 'lt-k-halvany' },
    csapat_letrehozva:   { szo: 'csapatot hozott létre',  cls: 'lt-k-fo' },
    csapat_csatlakozott: { szo: 'csatlakozott egy csapathoz', cls: 'lt-k-info' }
  };

  function cella(szoveg, cls, cim) {
    var e = document.createElement('span');
    if (cls) e.className = cls;
    e.textContent = szoveg == null ? '—' : String(szoveg);   // MINDIG textContent
    if (cim) e.title = cim;
    return e;
  }

  function ures(host, cim, alcim) {
    host.innerHTML = '';
    var d = document.createElement('div');
    d.className = 'lt-empty';
    var b = document.createElement('b'); b.textContent = cim; d.appendChild(b);
    if (alcim) { var p = document.createElement('p'); p.textContent = alcim; d.appendChild(p); }
    host.appendChild(d);
  }

  /* ---------------- FÜL 1: regisztráltak ---------------- */

  function renderFiokok() {
    var host = $('#fiokokBody');
    if (!fiokok.length) {
      ures(host, 'Még senki nem regisztrált.',
        'Amint valaki fiókot készít, itt jelenik meg — a játékaival együtt.');
      return;
    }
    host.innerHTML = '';
    fiokok.forEach(function (u) {
      var sor = document.createElement('div');
      sor.className = 'lt-row' + (u.admin ? ' lt-admin' : '');

      var ki = document.createElement('span');
      ki.className = 'lt-ki';
      var nev = document.createElement('b');
      nev.textContent = u.nev || (u.email || '').split('@')[0] || '(névtelen)';
      ki.appendChild(nev);
      if (u.admin) {
        var jelv = document.createElement('span');
        jelv.className = 'lt-badge'; jelv.textContent = 'admin';
        ki.appendChild(jelv);
      }
      if (!u.megerositett) {
        var nm = document.createElement('span');
        nm.className = 'lt-badge lt-badge-warn'; nm.textContent = 'nem megerősített';
        ki.appendChild(nm);
      }
      var mail = document.createElement('small');
      mail.textContent = u.email || '';
      ki.appendChild(mail);
      sor.appendChild(ki);

      sor.appendChild(cella(mikor(u.regisztralt), 'lt-dim', teljesIdo(u.regisztralt)));
      sor.appendChild(cella(mikor(u.utolso_belepes), 'lt-dim', teljesIdo(u.utolso_belepes)));
      sor.appendChild(cella(szam(u.menetek), 'lt-num'));
      sor.appendChild(cella(szam(u.befejezett), 'lt-num'));
      sor.appendChild(cella(szam(u.legjobb_pont), 'lt-num lt-lime'));
      sor.appendChild(cella(szam(u.kedvencek), 'lt-num'));
      sor.appendChild(cella(mikor(u.utolso_esemeny), 'lt-dim', teljesIdo(u.utolso_esemeny)));

      host.appendChild(sor);
    });
  }

  /* ---------------- FÜL 2: események ---------------- */

  function renderEsemenyek(hozzafuz) {
    var host = $('#esemenyBody');
    if (!esemenyek.length) {
      ures(host, 'Nincs rögzített lépés a beállított szűrőkkel.',
        'A mérés az admin oldalakat nem rögzíti, és a „ne kövess" beállítást tiszteletben tartja.');
      $('#tobbet').hidden = true;
      return;
    }
    if (!hozzafuz) host.innerHTML = '';

    esemenyek.slice(hozzafuz ? host.children.length : 0).forEach(function (ev) {
      var sor = document.createElement('div');
      sor.className = 'lt-row';

      sor.appendChild(cella(mikor(ev.at), 'lt-dim', teljesIdo(ev.at)));

      var ki = document.createElement('span');
      ki.className = 'lt-ki';
      var nev = document.createElement('b');
      if (ev.vendeg) {
        nev.textContent = 'Vendég';
        nev.className = 'lt-vendeg';
        var d = document.createElement('small');
        /* Az eszközazonosító rövidítve: elég megkülönböztetni két látogatót,
           de nem hivalkodik egy hosszú uuid-vel. */
        d.textContent = '#' + String(ev.device_id || '').slice(0, 8);
        ki.appendChild(nev); ki.appendChild(d);
      } else {
        nev.textContent = ev.nev || (ev.email || '').split('@')[0] || '(fiók)';
        ki.appendChild(nev);
        var m = document.createElement('small'); m.textContent = ev.email || '';
        ki.appendChild(m);
      }
      sor.appendChild(ki);

      var L = LEPES[ev.kind] || { szo: ev.kind, cls: '' };
      sor.appendChild(cella(L.szo, 'lt-kind ' + L.cls));
      sor.appendChild(cella(ev.label || '—', 'lt-label'));
      sor.appendChild(cella(ev.path || '—', 'lt-dim'));

      host.appendChild(sor);
    });

    $('#tobbet').hidden = fogyott;
  }

  /* ---------------- betöltés ---------------- */

  function szuroUtvonal(kezdet) {
    var p = ['select=*', 'order=at.desc', 'limit=' + LAP, 'offset=' + kezdet];
    var ki = $('#fKi').value, kind = $('#fKind').value, nap = $('#fNap').value;

    if (ki === '__vendeg') p.push('user_id=is.null');
    else if (ki) p.push('user_id=eq.' + encodeURIComponent(ki));
    if (kind) p.push('kind=eq.' + encodeURIComponent(kind));
    if (nap) {
      var d = new Date(Date.now() - Number(nap) * 864e5).toISOString();
      p.push('at=gte.' + encodeURIComponent(d));
    }
    return '/v_admin_events?' + p.join('&');
  }

  function toltEsemenyek(hozzafuz) {
    if (!hozzafuz) { eltolas = 0; esemenyek = []; fogyott = false; }
    return UQAPI.rest(szuroUtvonal(eltolas))
      .then(function (sorok) {
        sorok = sorok || [];
        fogyott = sorok.length < LAP;
        esemenyek = hozzafuz ? esemenyek.concat(sorok) : sorok;
        eltolas += sorok.length;
        renderEsemenyek(hozzafuz);
      })
      .catch(function (e) {
        ures($('#esemenyBody'), 'Az események nem tölthetők be.', (e && e.message) || '');
      });
  }

  function valasztokFeltoltese() {
    var ki = $('#fKi');
    ki.innerHTML = '<option value="">Mindenki</option><option value="__vendeg">Csak vendégek</option>';
    fiokok.forEach(function (u) {
      var o = document.createElement('option');
      o.value = u.user_id;
      o.textContent = u.nev || (u.email || '').split('@')[0] || '(fiók)';
      ki.appendChild(o);
    });

    var kind = $('#fKind');
    kind.innerHTML = '<option value="">Minden lépés</option>';
    Object.keys(LEPES).forEach(function (k) {
      var o = document.createElement('option');
      o.value = k; o.textContent = LEPES[k].szo;
      kind.appendChild(o);
    });
  }

  function toltStat() {
    return UQAPI.rest('/v_admin_latogato_stat?select=*').then(function (r) {
      var s = (r && r[0]) || {};
      $('#stReg').textContent   = szam(s.regisztraltak);
      $('#stEszk').textContent  = szam(s.eszkozok_7nap);
      $('#stOldal').textContent = szam(s.oldalletoltes_7nap);
      $('#stJatek').textContent = szam(s.jatek_indult_7nap);
      var uj = Number(s.uj_regisztracio_7nap || 0);
      $('#stRegUj').textContent = uj ? ('+' + uj + " az elmúlt héten") : 'nincs új a héten';
      $('#stRegUj').className = 'adm-stat-delta' + (uj ? ' up' : '');
    }).catch(function () { /* a kártyák „—” maradnak */ });
  }

  function toltFiokok() {
    return UQAPI.rest('/v_admin_users?select=*&order=regisztralt.desc')
      .then(function (sorok) { fiokok = sorok || []; renderFiokok(); valasztokFeltoltese(); })
      .catch(function (e) {
        ures($('#fiokokBody'), 'A fiókok nem tölthetők be.', (e && e.message) || '');
      });
  }

  /* ---------------- fülek és szűrők ---------------- */

  document.querySelectorAll('.lt-tab').forEach(function (b) {
    b.addEventListener('click', function () {
      var ful = b.dataset.ful;
      document.querySelectorAll('.lt-tab').forEach(function (x) {
        var akt = x === b;
        x.classList.toggle('is-active', akt);
        x.setAttribute('aria-selected', akt ? 'true' : 'false');
      });
      $('#fulFiokok').hidden    = (ful !== 'fiokok');
      $('#fulEsemenyek').hidden = (ful !== 'esemenyek');
      if (ful === 'esemenyek' && !esemenyek.length) toltEsemenyek(false);
    });
  });

  ['#fKi', '#fKind', '#fNap'].forEach(function (s) {
    var el = $(s);
    if (el) el.addEventListener('change', function () { toltEsemenyek(false); });
  });
  /* A type="reset" a mezők ürítése ELŐTT fut le, ezért a következő körre halasztunk. */
  var urlap = $('#esemenySzuro');
  if (urlap) urlap.addEventListener('reset', function () { setTimeout(function () { toltEsemenyek(false); }, 0); });

  var tobb = $('#tobbet');
  if (tobb) tobb.addEventListener('click', function () { toltEsemenyek(true); });

  /* ---------------- indulás ---------------- */

  /* Bejelentkezés nélkül NEM kérdezünk. A nézetek amúgy is elutasítanák a
     kérést, de akkor a látogató üres táblákat látna magyarázat nélkül, a
     konzolt pedig 401-esek töltenék meg. A többi admin oldal is így jár el. */
  function belepesKell() {
    ['#fiokokBody', '#esemenyBody'].forEach(function (s) {
      var h = $(s);
      if (!h) return;
      h.innerHTML = '';
      var d = document.createElement('div');
      d.className = 'lt-empty';
      var b = document.createElement('b'); b.textContent = 'Nem vagy bejelentkezve.';
      var p = document.createElement('p');
      p.textContent = 'A látogatói adatok megtekintéséhez admin fiók kell.';
      var a = document.createElement('a');
      a.className = 'adm-btn adm-btn-lime';
      a.href = 'bejelentkezes.html?next=latogatok.html';
      a.textContent = 'Bejelentkezés';
      a.style.marginTop = '10px';
      d.appendChild(b); d.appendChild(p); d.appendChild(a);
      h.appendChild(d);
    });
    var f = $('#esemenySzuro');
    if (f) f.hidden = true;
  }

  function indul() {
    if (!window.UQAPI) {
      ures($('#fiokokBody'), 'Hiányzik az adatréteg.', 'A uq-api.js nem töltődött be.');
      return;
    }
    if (!UQAPI.user()) { belepesKell(); return; }
    var f = $('#esemenySzuro');
    if (f) f.hidden = false;
    UQAPI.ready().then(function () {
      toltStat();
      toltFiokok();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', indul);
  else indul();

  /* Bejelentkezés után magától töltsön be — ne kelljen frissíteni a lapot. */
  if (window.UQAPI && UQAPI.onAuth) UQAPI.onAuth(function () { indul(); });
})();
