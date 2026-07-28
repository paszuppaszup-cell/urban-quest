/* =========================================================
   URBAN QUEST — bejelentkezett felület adatrétege
   localStorage-demó (backend nélkül). Publikus API: window.UQAccount

   A kedvencek az ADATBÁZISBAN élnek (urban_quest.favorites); a lenti kulcsok
   közülük gyorstárak, nem források — lásd a „kedvencek" szakaszt.

   Kulcsok:
     uq_user_v1      -> a demó-korszak maradéka, csak takarítjuk
     uq_favs_v1[:uid]     -> kedvenc-gyorstár (vendégként ez az egyetlen tár)
     uq_favs_srv_v1:uid   -> a legutóbb ismert SZERVER-állapot, ehhez mérjük,
                             mit vettek le egy másik eszközön
     uq_plays_v1     -> végigjátszások

   Kedvencek:  getFavs / isFav / toggleFav / favCount / syncFavs
   Foglalás:   getBookings / addBooking / cancelBooking / openBooking
   Profil:     getProfile / updateProfile / exportData / deleteAccount
   UI:         renderHomeStrip / avatarSVG / AVATARS
   Események:  uq:favs, uq:bookings, uq:auth (utóbbit a uq-auth küldi)
   ========================================================= */
(function () {
  'use strict';

  var FAVS = 'uq_favs_v1';
  var SRV = 'uq_favs_srv_v1';   // a legutóbb ismert szerver-állapot
  var PLAYS = 'uq_plays_v1';
  var USER = 'uq_user_v1';

  /* ---------- kis segédek ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function read(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }
  function fire(name, detail) { document.dispatchEvent(new CustomEvent(name, { detail: detail })); }
  function uid() { return 'p' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); }

  /* ---------- ikonok ---------- */
  var ICO = {
    heart: '<path d="M12 20s-7-4.6-7-9.3A4 4 0 0 1 12 7a4 4 0 0 1 7 3.7C19 15.4 12 20 12 20z"/>',
    ticket: '<path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12"/>',
    cal: '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 5.5a3 3 0 0 1 0 5.2M20.5 19a4.4 4.4 0 0 0-3-4.1"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    play: '<path d="M7 4.5 19 12 7 19.5z"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12 4.5 4.5L19 7"/>',
    pin: '<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>'
  };
  function svg(id, cls) {
    return '<svg class="' + (cls || 'uq-ac-ico') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICO[id] || '') + '</svg>';
  }

  /* avatar-ikonkészlet (küldetés-hangulat) — nincs képfeltöltés, kvótakímélő */
  var AVATARS = [
    '<path d="M12 3 4.5 12 12 21l7.5-9z"/>',                                   // gyémánt
    '<circle cx="12" cy="12" r="8"/><path d="M14.5 9.5 13 13l-3.5 1.5L11 11z"/>', // iránytű
    '<path d="M4 20 10 6l3 5 M9 20l6-11 5 11"/>',                              // hegyek
    '<path d="M12 3l2.6 5.6L21 9.4l-4.5 4.3 1.1 6.3L12 17l-5.6 3 1.1-6.3L3 9.4l6.4-.8z"/>', // csillag
    '<path d="M8 4h8v4a4 4 0 0 1-8 0z"/><path d="M8 5.5H5.5A1.5 1.5 0 0 0 5 8.5c.4 1.4 1.6 2.5 3 2.5M16 5.5h2.5A1.5 1.5 0 0 1 19 8.5c-.4 1.4-1.6 2.5-3 2.5M9.5 20h5M12 13v3"/>', // trófea
    '<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.3"/>', // pin
    '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.5 11 15l5-6"/>',        // pipa-kör
    '<path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3zM9 4v13M15 7v13"/>'            // térkép
  ];
  function avatarSVG(idx, cls) {
    var p = AVATARS[(idx | 0) % AVATARS.length] || AVATARS[0];
    return '<svg class="' + (cls || 'uq-av-ico') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  /* ---------- profil ----------
     KIZÁRÓLAG az élő munkamenetből. Korábban a localStorage uq_user_v1
     kulcsából olvasott — a demó-korszak maradványából —, ezért kijelentkezés
     után is „bejelentkezettnek" mutatta a főoldal személyes sávját: a
     Supabase-munkamenet törlődött, a régi kulcs nem. */
  function getProfile() {
    var u = (window.UQAuth && UQAuth.getUser) ? UQAuth.getUser() : null;
    if (u) return u;
    // az ottragadt demó-rekordot egyszer s mindenkorra eltakarítjuk
    try { localStorage.removeItem(USER); } catch (e) {}
    return null;
  }
  function updateProfile(patch) {
    var u = getProfile() || {};
    var next = Object.assign({}, u, patch);
    if (window.UQAuth && window.UQAuth.setUser) window.UQAuth.setUser(next); // fejléc is frissül
    else { write(USER, next); fire('uq:auth', next); }
    return next;
  }

  /* ---------- kedvencek ----------

     A kedvencek az ADATBÁZISBAN élnek (urban_quest.favorites), de az olvasás
     továbbra is szinkron: a fogyasztók (főoldal szívei, küldetés-oldal,
     Fiókom) rendereléskor, helyben várnak tömböt — egy Promise-alapú API
     mindet megtörné.

     Ezért a helyi tár GYORSTÁR, nem forrás:
       • getFavs()  a gyorstárból ad azonnal (offline is működik)
       • toggleFav() előbb a gyorstárat írja (a szív azonnal vált), utána a
         szervert; hálózati hiba esetén a kimenő sorba kerül
       • szerverSzinkron() letölti a fiók listáját, és HOZZÁADÓ módon fésüli
         össze a helyivel — így sem a vendégként gyűjtött kedvencek, sem a
         másik gépen felvettek nem vesznek el
     Minden változás után 'uq:favs' megy ki, amire a felület már figyel.

     Kijelentkezve marad a régi viselkedés: a vendég listája a böngészőben
     él, és bejelentkezéskor felkerül a fiókhoz. */
  function favsKey() {
    var u = (window.UQAuth && UQAuth.getUser) ? UQAuth.getUser() : null;
    return u && u.id ? FAVS + ':' + u.id : FAVS;
  }
  function getFavs() {
    var kulcs = favsKey();
    var a = read(kulcs, null);
    /* Első bejelentkezés: a korábbi közös lista a fiókhoz kerül át, hogy a
       meglévő kedvencek ne vesszenek el — a közös kulcs kiürül, így
       kijelentkezés után már nem látszanak. */
    if (a == null && kulcs !== FAVS) {
      var regi = read(FAVS, null);
      if (Array.isArray(regi) && regi.length) {
        write(kulcs, regi);
        try { localStorage.removeItem(FAVS); } catch (e) {}
        return regi.slice();
      }
    }
    return Array.isArray(a) ? a.slice() : [];
  }
  function isFav(id) { return getFavs().indexOf(id) > -1; }
  function favCount() { return getFavs().length; }
  function setFavs(a) { favSzink.valtozat++; write(favsKey(), a); fire('uq:favs', { favs: a }); }

  function beleptE() { return !!(window.UQAPI && UQAPI.user()); }

  /* A legutóbb ismert SZERVER-állapot, fiókonként. Enélkül nem lehet
     megkülönböztetni azt, amit itt vettem fel (fel kell vinni), attól,
     amit máshol vettem le (itt is le kell venni) — a gyorstár mindkettőt
     ugyanúgy „helyben megvan, szerveren nincs" alakban mutatja. */
  function srvKulcs() {
    var u = (window.UQAuth && UQAuth.getUser) ? UQAuth.getUser() : null;
    return u && u.id ? SRV + ':' + u.id : null;
  }

  /* `valtozat` = a gyorstár módosításainak számlálója. A szinkron egy
     pillanatképpel dolgozik, közben viszont a felhasználó kattinthat —
     ilyenkor a pillanatkép elavul, és nem szabad visszaírni. */
  var favSzink = { fut: false, ujra: false, iras: 0, valtozat: 0, sorbanVolt: false };

  function aktUid() {
    var u = (window.UQAuth && UQAuth.getUser) ? UQAuth.getUser() : null;
    return u && u.id ? u.id : null;
  }

  /* Egyetlen kedvenc állapotának átvezetése a szerverre.

     Nem várunk rá: a felület már a gyorstár írásakor átváltott.

     Sorba CSAK hálózati hibánál és szerverhibánál tesszük. Egy 4xx-et hiába
     küldenénk újra; olyankor viszont a gyorstárat vissza kell állítani,
     különben a felület olyan állapotot mutatna, ami sehol nem létezik. */
  function szerverIr(slug, felvesz) {
    if (!beleptE() || !slug) return Promise.resolve(true);
    var utvonal = '/rpc/' + (felvesz ? 'add_my_favorite' : 'remove_my_favorite');
    var test = { p_slug: slug };

    function visszaAllit() {
      var a = getFavs(), i = a.indexOf(slug);
      if (felvesz && i > -1) { a.splice(i, 1); setFavs(a); }
      if (!felvesz && i < 0) { a.push(slug); setFavs(a); }
    }

    favSzink.iras++;
    return UQAPI.rest(utvonal, { method: 'POST', body: test })
      .then(function (v) {
        favSzink.iras--;
        /* A függvény false-t ad, ha a pálya nem létezik vagy nem közzétett.
           Felvételnél ez azt jelenti, hogy nem mentődött el — a szív ne
           maradjon pirosan. Levételnél a false csak annyit tesz, hogy nem
           is volt ott: az eredmény akkor is helyes. */
        var sikerult = (v === true || (Array.isArray(v) && v[0] === true));
        if (felvesz && !sikerult) visszaAllit();
        return felvesz ? sikerult : true;
      })
      .catch(function (e) {
        favSzink.iras--;
        var halozati = (e instanceof TypeError) || !e.status || e.status >= 500;
        if (halozati) {
          UQAPI.queue({ path: utvonal, method: 'POST', body: test, prefer: 'return=minimal' });
          favSzink.sorbanVolt = true;
          UQAPI.flush();
          /* A gyorstárat NEM állítjuk vissza — a művelet érvényes, csak még
             úton van. De false-szal térünk vissza, mert a hívó ebből vezeti
             a „mi van tényleg a szerveren" nyilvántartást: egy sorban álló
             írás még nincs fent. Ha ezt megerősítettként könyvelnénk el és a
             sorból mégsem menne el (kvóta, holtlevél), a következő szinkron
             „máshol levették"-nek hinné, és letörölné. Így viszont a
             következő szinkron egyszerűen újra felküldi — a művelet
             idempotens, tehát ez ártalmatlan. */
          return false;
        }
        visszaAllit();           // 4xx: sosem fog sikerülni, ne hazudjunk róla
        return false;
      });
  }

  /* A fiók listájának letöltése és összefésülése a helyivel.

     A szabály: a végleges lista = (ami a szerveren van) + (amit ITT vettem
     fel azóta, hogy utoljára szinkronizáltam). Ami korábban a szerveren is
     ott volt, most viszont nincs, azt MÁSHOL vették le — tehát itt is
     eltűnik. Egy pusztán hozzáadó egyesítés ezt visszatolná: amit a
     telefonodon leveszel, az a gépeden feltámadna, és a következő
     szinkronnal újra fel is kerülne a szerverre.

     Az első szinkron ezen a gépen kivétel: ilyenkor nincs mihez képest
     „eltűnt", tehát a teljes helyi lista felkerül — ez a vendégként
     gyűjtött kedvencek átvétele a fiókba.

     Három dolog buktathatja meg, ezért mindhárom ellen véd:
       • közben a felhasználó kattint  → a pillanatkép elavul, újrafutunk
       • közben kijelentkezik          → az eredményt eldobjuk, nehogy az
                                         előző fiók listája a vendég-kulcsba
                                         kerüljön, ahonnan a következő fiók
                                         átvenné
       • a feltöltés elbukik           → a „legutóbb ismert szerver-állapot"
                                         CSAK a ténylegesen sikeres
                                         feltöltéseket rögzíti; különben a
                                         következő szinkron eltűntnek hinné
                                         és letörölné őket */
  function szerverSzinkron() {
    if (!beleptE()) return Promise.resolve(getFavs());
    if (favSzink.fut) { favSzink.ujra = true; return Promise.resolve(getFavs()); }
    if (favSzink.iras > 0) return Promise.resolve(getFavs());
    /* Csak a SAJÁT függő írásaink blokkolnak. Korábban a sor bármely eleme
       (például egy beragadt játékesemény) végleg megállította a kedvencek
       letöltését. */
    if (UQAPI.pending && UQAPI.pending('my_favorite') > 0) {
      UQAPI.flush();
      return Promise.resolve(getFavs());
    }

    favSzink.fut = true;
    var uidKor = aktUid();
    var valtozatKor = favSzink.valtozat;
    var helyi = getFavs();
    var kulcs = srvKulcs();
    var regiSzerver = kulcs ? read(kulcs, null) : null;

    return UQAPI.rest('/v_my_favorites?select=slug&order=created_at.asc')
      .then(function (sorok) {
        if (aktUid() !== uidKor) return helyi;              // közben fiókot váltottunk
        if (favSzink.valtozat !== valtozatKor) {            // közben kattintott
          favSzink.ujra = true;
          return getFavs();
        }

        var szerveren = (sorok || []).map(function (r) { return r.slug; });

        var ittUj = helyi.filter(function (x) {
          if (szerveren.indexOf(x) > -1) return false;                 // már fent van
          if (regiSzerver == null) return true;                        // első szinkron
          return regiSzerver.indexOf(x) < 0;                           // itt keletkezett
        });

        var vegso = szerveren.concat(ittUj);
        var valtozott = vegso.length !== helyi.length ||
                        vegso.some(function (x) { return helyi.indexOf(x) < 0; });
        if (valtozott) setFavs(vegso);
        valtozatKor = favSzink.valtozat;    // a saját írásunk ne számítson idegen kattintásnak

        return Promise.all(ittUj.map(function (x) {
          return szerverIr(x, true).then(function (ok) { return ok ? x : null; });
        })).then(function (eredmeny) {
          var sikeres = eredmeny.filter(Boolean);
          /* A szerver-állapot CSAK azt tartalmazza, ami tényleg fent van. */
          if (kulcs && aktUid() === uidKor) write(kulcs, szerveren.concat(sikeres));
          return vegso;
        });
      })
      .catch(function () { return helyi; })   // offline: marad a gyorstár
      .then(function (v) {
        favSzink.fut = false;
        if (favSzink.ujra) { favSzink.ujra = false; return szerverSzinkron(); }
        return v;
      });
  }

  /* Kijelentkezéskor hívja a uq-auth.js, MÉG a munkamenet eldobása előtt.
     Csak a helyi másolatot dobja el — a lista az adatbázisban marad, és a
     következő belépéskor visszajön. Közös gépen ez az, ami megakadályozza,
     hogy a következő felhasználó az előző ízlését lássa a tárolóban. */
  function kedvencGyorstarUrit() {
    var kulcs = favsKey(), srv = srvKulcs();
    if (kulcs === FAVS) return;          // vendég-lista: az marad
    try { localStorage.removeItem(kulcs); } catch (e) {}
    if (srv) { try { localStorage.removeItem(srv); } catch (e) {} }
    fire('uq:favs', { favs: [] });
  }

  function toggleFav(id) {
    if (!id) return false;
    var a = getFavs(), i = a.indexOf(id);
    var mostkedvenc = i < 0;
    if (i > -1) a.splice(i, 1); else a.push(id);
    setFavs(a);              // a szív AZONNAL vált, nem várunk a hálózatra

    /* A legutóbb ismert szerver-állapotot is követjük: sikeres írás után ez
       lesz az alap, amihez a következő szinkron az eltűnéseket méri. */
    var kulcs = srvKulcs();
    szerverIr(id, mostkedvenc).then(function (sikerult) {
      if (!sikerult || !kulcs) return;
      var srv = read(kulcs, null);
      if (!Array.isArray(srv)) return;
      var j = srv.indexOf(id);
      if (mostkedvenc && j < 0) srv.push(id);
      else if (!mostkedvenc && j > -1) srv.splice(j, 1);
      write(kulcs, srv);
    });

    return mostkedvenc;      // true = most már kedvenc
  }

  function syncFavs(root) {
    var favs = getFavs();
    (root || document).querySelectorAll('.quest-card').forEach(function (card) {
      var btn = card.querySelector('.fav');
      if (!btn) return;
      var on = favs.indexOf(card.getAttribute('data-id')) > -1;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
    });
  }

  // egyetlen delegált kattintás-kezelő az összes szív-gombra (kijelentkezve is ment)
  var favWired = false;
  function initFavDelegation() {
    if (favWired) return;
    favWired = true;
    document.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.fav') : null;
      if (!btn) return;
      var card = btn.closest('.quest-card');
      if (!card) return;
      var id = card.getAttribute('data-id');
      if (!id) return;
      e.preventDefault();
      e.stopPropagation();
      var on = toggleFav(id);
      document.querySelectorAll('.quest-card').forEach(function (c) {
        if (c.getAttribute('data-id') !== id) return;
        var b = c.querySelector('.fav');
        if (b) { b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); }
      });
    }, true); // capture: a kártyák saját handlerei elé kerül

    /* Be- és kijelentkezéskor a szívek is váltsanak listát: a kedvencek
       felhasználónként élnek, tehát az összes látható kártyát újra kell
       színezni az aktuális (fiókos vagy vendég-) lista szerint. */
    document.addEventListener('uq:auth', function () {
      syncFavs(document);
      fire('uq:favs', { favs: getFavs() });
      /* Belépéskor jöjjön le a fiók listája, és fésülődjön össze azzal,
         amit vendégként gyűjtött. */
      szerverSzinkron().then(function () { syncFavs(document); });
    });

    /* A kimenő sor kiürült. Csak akkor töltünk le, ha a MI írásunk is benne
       volt — a játék közbeni esemény-ürítések (másodpercenként) különben
       fölösleges kedvenc-lekérdezéseket húznának maguk után. */
    document.addEventListener('uq:synced', function () {
      if (!favSzink.sorbanVolt) return;
      favSzink.sorbanVolt = false;
      szerverSzinkron().then(function () { syncFavs(document); });
    });

    /* Betöltéskor is: ha már be vagy jelentkezve, a másik gépen felvett
       kedvencek is jelenjenek meg. */
    if (beleptE()) {
      /* Egy korábbi munkamenetből ottmaradt beküldés magától nem indul el
         (a sor csak az 'online' eseményre ürül), és a kapunkat blokkolná. */
      if (UQAPI.flush) UQAPI.flush();
      szerverSzinkron().then(function () { syncFavs(document); });
    }

    /* Két megnyitott lap: amit az egyikben kedvencelsz, a másik is mutassa.
       A storage esemény csak a TÖBBI lapon sül el, tehát nincs körhurok. */
    window.addEventListener('storage', function (e) {
      if (!e.key || e.key.indexOf(FAVS) !== 0) return;
      syncFavs(document);
      fire('uq:favs', { favs: getFavs() });
    });
  }

  /* ---------- játékaim (elkezdett + befejezett végigjátszások) ----------
     uq_plays_v1: [{id, questId, questTitle, status:'inprogress'|'done',
                    points, done, skipped, pathLen, total, timeMs,
                    startedAt, updatedAt, finishedAt, state}]
     Egy játékhoz egyszerre egy „folytatható" (inprogress) rekord tartozhat;
     a befejezettek felhalmozódnak. A jatszas.js írja ezeket. */
  function getPlays() { var a = read(PLAYS, []); return Array.isArray(a) ? a : []; }
  function writePlays(list) { write(PLAYS, list); fire('uq:plays', { plays: list }); }
  function activePlay(questId) {
    return getPlays().filter(function (p) { return p.questId === questId && p.status === 'inprogress'; })[0] || null;
  }
  function inProgressPlays() { return getPlays().filter(function (p) { return p.status === 'inprogress'; }); }
  function donePlays() {
    return getPlays().filter(function (p) { return p.status === 'done'; })
      .sort(function (a, b) { return (b.finishedAt || '').localeCompare(a.finishedAt || ''); });
  }
  // haladás mentése/frissítése (inprogress)
  function saveProgress(o) {
    var list = getPlays();
    var rec = list.filter(function (p) { return p.questId === o.questId && p.status === 'inprogress'; })[0];
    var now = new Date().toISOString();
    if (!rec) {
      rec = { id: uid(), questId: o.questId, questTitle: o.questTitle || 'Játék', status: 'inprogress',
        points: 0, done: 0, skipped: 0, pathLen: 0, total: o.total || 0, timeMs: 0,
        startedAt: now, updatedAt: now, finishedAt: '', state: null };
      list.unshift(rec);
    }
    rec.questTitle = o.questTitle || rec.questTitle;
    if (o.points != null) rec.points = o.points;
    if (o.done != null) rec.done = o.done;
    if (o.skipped != null) rec.skipped = o.skipped;
    if (o.pathLen != null) rec.pathLen = o.pathLen;
    if (o.total != null) rec.total = o.total;
    if (o.timeMs != null) rec.timeMs = o.timeMs;
    if (o.state !== undefined) rec.state = o.state;
    rec.updatedAt = now;
    writePlays(list);
    return rec;
  }
  // befejezés: az inprogress rekord done-ra vált (vagy új done készül)
  function finishPlay(o) {
    var list = getPlays();
    var rec = list.filter(function (p) { return p.questId === o.questId && p.status === 'inprogress'; })[0];
    var now = new Date().toISOString();
    if (!rec) {
      rec = { id: uid(), questId: o.questId, questTitle: o.questTitle || 'Játék', startedAt: now };
      list.unshift(rec);
    }
    rec.status = 'done';
    rec.questTitle = o.questTitle || rec.questTitle;
    rec.points = o.points != null ? o.points : rec.points || 0;
    rec.done = o.done != null ? o.done : rec.done || 0;
    rec.skipped = o.skipped != null ? o.skipped : rec.skipped || 0;
    rec.pathLen = o.pathLen != null ? o.pathLen : rec.pathLen || 0;
    rec.total = o.total != null ? o.total : rec.total || 0;
    rec.timeMs = o.timeMs != null ? o.timeMs : rec.timeMs || 0;
    rec.finishedAt = now; rec.updatedAt = now; rec.state = null;
    writePlays(list);
    return rec;
  }
  function removePlay(id) {
    var list = getPlays().filter(function (p) { return p.id !== id; });
    writePlays(list);
  }
  // egy játék folytatható állapotának eldobása (újrakezdéshez)
  function clearProgress(questId) {
    var list = getPlays().filter(function (p) { return !(p.questId === questId && p.status === 'inprogress'); });
    writePlays(list);
  }

  /* ---------- GDPR ----------
     Mindkét művelet adatvédelmi ígéret, tehát nem lehet látszat. A letöltés
     korábban csak a böngésző tárolóját írta ki (a szerveren lévő menetek,
     csapattagságok nélkül), a törlés pedig ténylegesen csak kijelentkeztetett:
     visszalépve minden ott volt, pedig azt írta, hogy „nem vonható vissza". */

  function exportData() {
    var helyi = {
      exportedAt: new Date().toISOString(),
      profile: getProfile(),
      favorites: getFavs(),
      plays: getPlays()
    };
    if (!window.UQAPI || !UQAPI.user()) return Promise.resolve(helyi);

    var uid = UQAPI.user().id;
    /* A szerveren lévő saját adatok is bekerülnek — enélkül a letöltött
       fájl hiányos, tehát a GDPR-igényt nem elégíti ki. */
    return Promise.all([
      UQAPI.rest('/profiles?select=*&user_id=eq.' + uid).catch(function () { return null; }),
      UQAPI.rest('/game_sessions?select=*&user_id=eq.' + uid).catch(function () { return null; }),
      UQAPI.rest('/team_members?select=*&user_id=eq.' + uid).catch(function () { return null; }),
      UQAPI.rest('/v_my_favorites?select=slug,name,created_at').catch(function () { return null; })
    ]).then(function (r) {
      helyi.szerver = {
        auth: { id: uid, email: UQAPI.user().email, created_at: UQAPI.user().created_at,
                metadata: UQAPI.user().user_metadata || {} },
        profile: r[0] && r[0][0] ? r[0][0] : null,
        game_sessions: r[1] || [],
        team_memberships: r[2] || [],
        favorites: r[3] || []
      };
      return helyi;
    });
  }

  /* A helyi nyomok eltakarítása — a fiókonkénti kedvenc-kulcsot és a
     legutóbb ismert szerver-állapotot is, nem csak a régi közöset. */
  function helyiNyomokTorlese() {
    var kulcs = favsKey(), srv = srvKulcs();
    try { localStorage.removeItem(PLAYS); } catch (e) {}
    fire('uq:plays', { plays: [] });
    try { localStorage.removeItem(kulcs); } catch (e) {}
    if (kulcs !== FAVS) { try { localStorage.removeItem(FAVS); } catch (e) {} }
    if (srv) { try { localStorage.removeItem(srv); } catch (e) {} }
    fire('uq:favs', { favs: [] });
  }

  function deleteAccount() {
    if (!window.UQAPI || !UQAPI.user()) {
      helyiNyomokTorlese();
      if (window.UQAuth && window.UQAuth.clearUser) return window.UQAuth.clearUser();
      try { localStorage.removeItem(USER); } catch (e) {}
      fire('uq:auth', null);
      return Promise.resolve();
    }

    /* ELŐSZÖR a szerver, UTÁNA a helyi takarítás. Fordítva egy elbukó
       kéréstől a felhasználó elveszítette volna a helyi listáját is,
       miközben a fiókja megmarad — vagyis a hibaüzenet mellé kapott volna
       egy csendes adatvesztést.

       A szerveroldali törlés az auth.users sorát szünteti meg; a profil, a
       csapattagság, a kedvencek és az admin jog CASCADE-del megy vele. */
    return UQAPI.rest('/rpc/delete_my_account', { method: 'POST', body: {} })
      .then(function () {
        helyiNyomokTorlese();
        return UQAPI.signOut();
      })
      .then(function () { fire('uq:auth', null); });
  }

  /* =========================================================
     JÁTÉK INDÍTÁSA — a küldetés-oldalról a végigjátszóra visz
     (regisztráció-kapu a hívó oldalon; itt csak a navigáció)
     ========================================================= */
  function startGame(questId) {
    if (!questId) return;
    location.href = 'jatszas.html?quest=' + encodeURIComponent(questId);
  }
  function fmtTime(ms) {
    var s = Math.max(0, Math.floor((ms || 0) / 1000)), m = Math.floor(s / 60), r = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
  }

  /* =========================================================
     SZEMÉLYES SÁV (főoldal, hero alatt)
     ========================================================= */
  function fmtDate(iso) {
    if (!iso) return '';
    var p = iso.split('-'); return p.length === 3 ? (p[0] + '. ' + p[1] + '. ' + p[2] + '.') : iso;
  }
  function renderHomeStrip(mount) {
    if (!mount) return;
    var u = getProfile();
    if (!u) { mount.innerHTML = ''; mount.hidden = true; return; }
    mount.hidden = false;

    var letezik = function (id) { return !!(window.QUESTS && window.QUESTS[id]); };
    var favs = getFavs().filter(letezik);
    /* A folytatható játékot is szűrni kell. Enélkül egy régen törölt pálya
       félbehagyott menete tovább kínálta magát a főoldalon („Várnegyed
       Nyomában · 1/6 állomás"), és a Folytatás gomb egy nem létező
       küldetésre vitt. */
    var resume = inProgressPlays().filter(function (p) { return letezik(p.questId); })[0];
    var first = (u.name || '').split(/[.\s@]/)[0];
    first = first ? first.charAt(0).toUpperCase() + first.slice(1) : 'kalandor';

    var html = '<div class="uq-ps-inner container">';
    html += '<div class="uq-ps-head">' +
      '<h2 class="uq-ps-hi">Szia, ' + esc(first) + '! 👋</h2>' +
      '<a class="uq-ps-link" href="fiokom.html">Fiókom' + svg('arrow', 'uq-ac-ico uq-ac-ico-xs') + '</a>' +
    '</div>';

    if (resume) {
      var pct = resume.total ? Math.round(resume.pathLen / resume.total * 100) : 0;
      html += '<a class="uq-ps-next" href="jatszas.html?quest=' + encodeURIComponent(resume.questId) + '">' +
        '<span class="uq-ps-next-ic">' + svg('play', 'uq-ac-ico') + '</span>' +
        '<span class="uq-ps-next-txt"><span class="uq-ps-next-lbl">Folytasd a játékod</span>' +
        '<strong>' + esc(resume.questTitle) + '</strong>' +
        '<span class="uq-ps-next-meta">' + resume.pathLen + '/' + (resume.total || '?') + ' állomás · ' + resume.points + ' pont · ' + fmtTime(resume.timeMs) + '</span></span>' +
        '<span class="uq-ps-badge st-wait">' + pct + '%</span>' +
      '</a>';
    }

    if (favs.length) {
      html += '<div class="uq-ps-sub"><h3>A kedvenceid</h3><a href="fiokom.html#kedvencek">Mind (' + favs.length + ')</a></div>';
      html += '<div class="uq-ps-track">' + favs.slice(0, 6).map(function (id) { return window.questCardHTML(id); }).join('') + '</div>';
    } else if (!resume) {
      html += '<div class="uq-ps-empty">' +
        '<p>Még nincs kedvenc küldetésed. Böngéssz, és a szív ikonnal mentsd el, amelyik megtetszik — vagy indíts el egyet egyből!</p>' +
        '<a class="uq-ps-cta" href="#kuldetesek">Válaszd ki az első küldetésed' + svg('arrow', 'uq-ac-ico uq-ac-ico-sm') + '</a>' +
      '</div>';
    }

    html += '</div>';
    mount.innerHTML = html;
    syncFavs(mount);
  }

  /* ---------- init ---------- */
  initFavDelegation();

  window.UQAccount = {
    // kedvencek
    getFavs: getFavs,
    szerverSzinkron: szerverSzinkron,
    kedvencGyorstarUrit: kedvencGyorstarUrit,
    isFav: isFav, toggleFav: toggleFav, favCount: favCount, syncFavs: syncFavs,
    // játékaim (végigjátszások)
    getPlays: getPlays, activePlay: activePlay, inProgressPlays: inProgressPlays, donePlays: donePlays,
    saveProgress: saveProgress, finishPlay: finishPlay, removePlay: removePlay, clearProgress: clearProgress,
    startGame: startGame, fmtTime: fmtTime,
    // profil / gdpr
    getProfile: getProfile, updateProfile: updateProfile, exportData: exportData, deleteAccount: deleteAccount,
    // ui
    renderHomeStrip: renderHomeStrip, avatarSVG: avatarSVG, AVATARS: AVATARS
  };
})();
