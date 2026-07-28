/* =========================================================
   URBAN QUEST — CSAPATLÁNC (váltó)

   A csapat szétválik külön helyszínekre, és az egyik játékos megoldása a
   következő játékos feladványának kulcsa. Közben mindenki látja egy közös
   táblán, ki mit írt be.

   Miért kell külön modul? A rendszerben eddig NEM volt sem játékosonkénti
   szerep (a session_state kulcsa a session_id, tehát csapatonként EGY sor),
   sem élő szinkron (a supabase_realtime publikáció üres, egyetlen urban_quest
   tábla sincs benne). A tábla ezért POLLINGGAL frissül.

   Két dolog, amit ez a fájl szándékosan másképp csinál, mint a projekt többi
   része:

   1. setTimeout-lánc, nem setInterval. Lassú hálózaton a setInterval átfedő
      kéréseket halmozna egymásra; így a következő kérés mindig csak az előző
      megérkezése UTÁN indul, tehát rossz neten magától ritkul.

   2. textContent, nem string-konkatenált innerHTML. Ez az első felület a
      játékban, ahol az EGYIK felhasználó szövege a MÁSIK böngészőjében
      renderelődik (a beírt válasz és a megjelenített név). A projekt bevett
      mintája az innerHTML — itt az veszélyes lenne.
   ========================================================= */
(function () {
  'use strict';

  var POLL_MS      = 4000;   // aktív képernyőn
  var POLL_LASSU   = 15000;  // háttérbe tett lapon
  var HIBA_MAX     = 30000;  // egymást követő hibáknál eddig lassulunk

  var session = null, group = null;
  var allapot = null;            // az utolsó szerver-válasz
  var fut = false, ora = null, hibak = 0, el = false;
  var figyelok = [];

  function api() { return window.UQAPI; }

  /* A kapu ideje MÚLÁSSAL is nyílhat (türelmi idő), tehát a rev önmagában
     kevés a változás észlelésére: a kapu- és állapotjelzőket is nézzük. */
  function jelzes(d) {
    if (!d || !d.rows) return '';
    return d.rows.map(function (r) {
      return r.role + ':' + (r.gate_open ? 1 : 0) + (r.status || '') + (r.answer ? 1 : 0);
    }).join('|');
  }

  function ertesit() {
    figyelok.forEach(function (f) { try { f(allapot); } catch (e) {} });
  }

  function lekerdez(megerkezett) {
    if (fut || !session || !api()) return Promise.resolve(allapot);
    fut = true;
    return api().rest('/rpc/relay_board', {
      method: 'POST',
      timeout: 6000,
      body: { p_session: session, p_group: group || null, p_arrive: !!megerkezett }
    }).then(function (r) {
      var d = Array.isArray(r) ? r[0] : r;
      if (d && typeof d === 'object' && d.rows) {
        hibak = 0;
        var valtozott = !allapot || allapot.rev !== d.rev || jelzes(allapot) !== jelzes(d);
        allapot = d;
        if (valtozott) ertesit();
      }
      return allapot;
    }).catch(function () {
      hibak++;
      return allapot;
    }).then(function (x) { fut = false; return x; });
  }

  function utem() {
    if (hibak) return Math.min(POLL_MS * Math.pow(2, hibak), HIBA_MAX);
    return (document.hidden ? POLL_LASSU : POLL_MS);
  }

  function utemez() {
    if (ora) clearTimeout(ora);
    if (!el) return;
    ora = setTimeout(function () {
      lekerdez(false).then(function () { utemez(); });
    }, utem());
  }

  /* A lap visszatérésekor azonnal kérdezünk: a játékos épp most vette elő a
     telefont, és a legrosszabb pillanat egy elavult tábla. */
  document.addEventListener('visibilitychange', function () {
    if (!el) return;
    if (!document.hidden) { lekerdez(false).then(utemez); } else { utemez(); }
  });

  var UQRelay = {

    /* Van-e ezen a feladaton lánc? A csomag `relay` mezője dönt. */
    aktiv: function (task) {
      return !!(task && task.relay && task.relay.on);
    },

    /* Zárt-e MOST ez a feladat? Csak a szerver tudja biztosan; amíg nincs
       táblánk, a `locked` jelzőből indulunk ki (a csomagban a zárt láncszem
       kérdése üresen érkezett, tehát tényleg nem játszható). */
    zarva: function (task) {
      if (!UQRelay.aktiv(task)) return false;
      var s = UQRelay.sajatSor(task);
      if (s) return !s.gate_open;
      return !!task.relay.locked;
    },

    sajatSor: function (task) {
      if (!allapot || !allapot.rows || !task || !task.relay) return null;
      var r = task.relay.role || 1;
      for (var i = 0; i < allapot.rows.length; i++) {
        if (allapot.rows[i].role === r) return allapot.rows[i];
      }
      return null;
    },

    allapot: function () { return allapot; },

    figyel: function (fn) {
      if (typeof fn === 'function') figyelok.push(fn);
      return function () {
        var i = figyelok.indexOf(fn);
        if (i > -1) figyelok.splice(i, 1);
      };
    },

    /* Szerepfoglalás. Az ELSŐ ÉLETJELRE fut, nem az indításkor: a váró
       pollingja megáll a modál bezárásakor, tehát aki elnavigált, azt az
       indítás sosem viszi át a játékba — mégis megkapná a láncszemet, és a
       többiek véglegesen rá várnának. */
    szerepFoglal: function (sessionId, grp) {
      if (!api() || !sessionId) return Promise.resolve(null);
      return api().rest('/rpc/claim_role', {
        method: 'POST',
        timeout: 8000,
        body: { p_session: sessionId, p_group: grp || null }
      }).then(function (r) {
        var d = Array.isArray(r) ? r[0] : r;
        return (d && typeof d === 'object') ? d : null;
      }).catch(function () { return null; });
    },

    indit: function (sessionId, grp) {
      session = sessionId; group = grp || null;
      el = true; hibak = 0;
      return lekerdez(false).then(function (d) { utemez(); return d; });
    },

    /* A játékos megérkezett a láncszem elé — innen jár a türelmi óra.
       Az óra a SZERVERÉ, ezért repülő móddal nem lehet kikényszeríteni. */
    megerkeztem: function () { return lekerdez(true); },

    leall: function () {
      el = false;
      if (ora) { clearTimeout(ora); ora = null; }
      session = null; group = null; allapot = null; figyelok = []; hibak = 0;
    },

    /* Beküldés. NEM a meglévő offline kimenő soron megy: az sorosan ürít, és
       hálózati hibánál megáll az egész sorral együtt — a láncot NYITÓ írás
       ott ragadva örökre zárva tartaná a többiek kapuját. */
    bekuld: function (taskId, valasz, jegyzet, deviceId) {
      if (!api()) return Promise.reject(new Error('nincs kapcsolat'));
      return api().rest('/rpc/relay_submit', {
        method: 'POST',
        timeout: 12000,
        body: {
          p_session: session,
          p_task: taskId,
          p_answer: valasz,
          p_note: jegyzet || null,
          p_device: {
            id: deviceId || null,
            label: 'böngésző',
            user_agent: String(navigator.userAgent || '').slice(0, 180)
          }
        }
      }).then(function (r) {
        var d = Array.isArray(r) ? r[0] : r;
        /* A tábla azonnal frissül, hogy a társak lássák a beírást. */
        lekerdez(false);
        return d || { ok: false };
      });
    },

    /* ---- A KÖZÖS TÁBLA ------------------------------------------------
       DOM-ból épül, nem stringből: a `name`, az `answer` és a `note` MÁSIK
       felhasználó szövege. A vázat innerHTML adja, a felhasználói mezőket
       kizárólag textContent. */
    rajzol: function (host, adat) {
      if (!host) return;
      /* Az `adat` opcionális: alapból a modul saját állapotát rajzoljuk.
         Átadható viszont kívülről is, hogy a tábla ELLENŐRIZHETŐ legyen
         élő menet nélkül is — enélkül a megjelenítést csak három telefonnal,
         terepen lehetne kipróbálni. */
      var allapot = adat || UQRelay.allapot();
      if (!allapot || !allapot.rows || !allapot.rows.length) { host.innerHTML = ''; return; }

      host.innerHTML =
        '<div class="uq-pl-relay">' +
          '<div class="uq-pl-rhead">' +
            '<svg class="ico ico-sm" aria-hidden="true"><use href="#a-users"/></svg>' +
            '<b>Csapatlánc</b><span class="uq-pl-rcount"></span>' +
          '</div>' +
          '<div class="uq-pl-rrows"></div>' +
        '</div>';

      var kesz = allapot.rows.filter(function (r) { return r.status === 'kesz'; }).length;
      host.querySelector('.uq-pl-rcount').textContent =
        kesz + '/' + (allapot.total || allapot.rows.length) + ' láncszem kész';

      var lista = host.querySelector('.uq-pl-rrows');

      allapot.rows.forEach(function (r) {
        var sor = document.createElement('div');
        sor.className = 'uq-pl-rrow ' + (r.status || 'var') + (r.me ? ' uq-pl-rme' : '');

        var fej = document.createElement('div');
        fej.className = 'uq-pl-rfej';

        var szam = document.createElement('span');
        szam.className = 'uq-pl-rnum';
        szam.textContent = String(r.role);
        fej.appendChild(szam);

        var nev = document.createElement('span');
        nev.className = 'uq-pl-rnev';
        /* MÁSIK FELHASZNÁLÓ SZÖVEGE — textContent, sosem innerHTML. */
        nev.textContent = r.me ? 'Te' : (r.name || (r.covered ? 'Csapattárs' : 'Nincs játékos'));
        fej.appendChild(nev);

        var cimke = document.createElement('span');
        cimke.className = 'uq-pl-rtag';
        cimke.textContent = ({
          kesz:      'kész',
          kihagyva:  'kihagyva',
          dolgozik:  'dolgozik',
          uton:      'úton',
          nema:      'nem jelentkezik',
          var:       'vár'
        })[r.status] || 'vár';
        fej.appendChild(cimke);
        sor.appendChild(fej);

        if (r.note) {
          var jz = document.createElement('div');
          jz.className = 'uq-pl-rnote';
          jz.textContent = 'leolvasás: ' + r.note;   // textContent
          sor.appendChild(jz);
        }

        if (r.answer) {
          var v = document.createElement('div');
          v.className = 'uq-pl-rans' + (r.auto ? ' auto' : '');
          v.textContent = '»' + r.answer + '«';      // textContent
          sor.appendChild(v);
          if (r.auto) {
            var mj = document.createElement('span');
            mj.className = 'uq-pl-rauto';
            mj.textContent = r.covered ? 'a rendszer oldotta fel' : 'kihagyott láncszem';
            sor.appendChild(mj);
          }
        } else if (!r.gate_open) {
          var z = document.createElement('div');
          z.className = 'uq-pl-rlock';
          z.textContent = 'zárva — előbb a(z) ' + (r.role - 1) + '. láncszem kell';
          sor.appendChild(z);
        }

        lista.appendChild(sor);
      });
    }
  };

  window.UQRelay = UQRelay;
})();
