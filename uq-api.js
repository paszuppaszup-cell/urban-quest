/* =========================================================
   URBAN QUEST — Supabase átjáró (séma-független mag)
   Publikus API: window.UQAPI

   Miért nincs supabase-js: a PostgREST sima REST, a sémát fejléc
   választja ki (Accept-Profile), az SDK időzítő-alapú token-frissítése
   pedig offline épp rosszul viselkedik — terepen azt kézben kell tartani.

     .rest(path, opts)        -> PostgREST hívás, automatikus token-frissítéssel
     .signUp/.signIn/.signOut/.session/.user/.isAdmin
     .onAuth(fn)              -> feliratkozás a be-/kijelentkezésre
     .online()                -> becslés a hálózat állapotáról
     .queue(entry)/.flush()   -> offline kimenő sor
     .uuid()
   ========================================================= */
(function () {
  'use strict';

  var URL_BASE = 'https://azfslxatgwjlrtylzhwd.supabase.co';
  var ANON_KEY = 'sb_publishable_-MaAb64-e7kfH_vxhSGwwA_zVJLHsjL';
  var SCHEMA = 'urban_quest';

  var SESSION_KEY = 'uq_session_v1';
  // Kulcs-ELŐTAG, nem egyetlen kulcs: minden sorba tett bejegyzés külön
  // kulcson él, hogy két megnyitott lap ne írja felül egymás beküldéseit.
  var OUTBOX_PREFIX = 'uq_ob_v1:';
  var DEAD_PREFIX = 'uq_obdead_v1:';

  /* ---------------------------------------------------------
     apró segédek
     --------------------------------------------------------- */

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    // tartalék: RFC4122 v4 a crypto.getRandomValues-ből
    var b = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = [];
    for (var i = 0; i < 16; i++) h.push((b[i] + 0x100).toString(16).slice(1));
    return h.slice(0, 4).join('') + '-' + h.slice(4, 6).join('') + '-' +
           h.slice(6, 8).join('') + '-' + h.slice(8, 10).join('') + '-' + h.slice(10).join('');
  }

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }   // kvóta betelt
  }

  /* ---------------------------------------------------------
     munkamenet
     --------------------------------------------------------- */

  var session = readJSON(SESSION_KEY, null);
  var authListeners = [];

  function notifyAuth() {
    var u = user();
    authListeners.forEach(function (fn) {
      try { fn(u); } catch (e) { /* egy hibás feliratkozó ne döntse el a többit */ }
    });
    document.dispatchEvent(new CustomEvent('uq:auth', { detail: u }));
  }

  function setSession(s) {
    if (s && s.access_token) {
      // a szerver másodpercben adja meg az élettartamot; abszolút időpontot tárolunk
      if (!s.expires_at && s.expires_in) {
        s.expires_at = Math.floor(Date.now() / 1000) + Number(s.expires_in);
      }
      session = s;
      writeJSON(SESSION_KEY, s);
    } else {
      session = null;
      try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
    }
    notifyAuth();
  }

  function user() {
    return (session && session.user) ? session.user : null;
  }

  /* A lejáratot 60 mp ráhagyással nézzük, hogy egy épp elinduló kérés
     ne fusson bele a határba. */
  function expired() {
    if (!session || !session.expires_at) return false;
    return (Number(session.expires_at) - 60) <= Math.floor(Date.now() / 1000);
  }

  /* ---------------------------------------------------------
     hálózat
     --------------------------------------------------------- */

  /* navigator.onLine csak azt tudja, van-e interfész — hogy a Supabase
     tényleg elérhető-e, azt csak egy sikeres kérés bizonyítja. Ezért a
     tényleges hívások eredményét is visszavezetjük ide. */
  var lastNetFail = 0;
  function online() {
    if (navigator.onLine === false) return false;
    return (Date.now() - lastNetFail) > 5000;
  }
  function markNetFail() { lastNetFail = Date.now(); }
  function markNetOk() { lastNetFail = 0; }

  function isNetworkError(err) {
    // a fetch hálózati hiba esetén TypeError-t dob, HTTP-hibánál nem
    return err instanceof TypeError;
  }

  /* ---------------------------------------------------------
     auth (GoTrue REST)
     --------------------------------------------------------- */

  function authCall(path, body) {
    return fetch(URL_BASE + '/auth/v1' + path, {
      method: 'POST',
      headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var msg = data.error_description || data.msg || data.message || ('HTTP ' + res.status);
          var err = new Error(msg);
          err.status = res.status;
          err.body = data;
          throw err;
        }
        markNetOk();
        return data;
      });
    });
  }

  function signUp(email, password, meta) {
    return authCall('/signup', {
      email: email,
      password: password,
      data: meta || {}
    }).then(function (data) {
      // e-mailes megerősítés kikapcsolva -> a signup rögtön munkamenetet ad
      if (data.access_token) setSession(data);
      else if (data.session && data.session.access_token) setSession(data.session);
      return user();
    });
  }

  function signIn(email, password) {
    return authCall('/token?grant_type=password', { email: email, password: password })
      .then(function (data) { setSession(data); return user(); });
  }

  function signOut() {
    var tok = session && session.access_token;
    setSession(null);
    if (!tok) return Promise.resolve();
    return fetch(URL_BASE + '/auth/v1/logout', {
      method: 'POST',
      headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + tok }
    }).catch(function () { /* a helyi kijelentkezés akkor is megtörtént */ });
  }

  /* ---------------------------------------------------------
     OAuth (Google) — átirányításos folyamat

     A Supabase a bejelentkezés után VISSZAIRÁNYÍT erre az oldalra, a
     tokeneket az URL #fragmentjében hozza. Betöltéskor ezt felismerjük,
     munkamenetté alakítjuk, és letöröljük a címsorból.
     --------------------------------------------------------- */

  function signInWithGoogle(nextUrl) {
    var vissza = nextUrl || (location.origin + location.pathname);
    location.href = URL_BASE + '/auth/v1/authorize?provider=google' +
      '&redirect_to=' + encodeURIComponent(vissza);
  }

  function fogadOAuthVisszairanyitast() {
    var h = String(location.hash || '');
    if (h.indexOf('access_token=') < 0) return;
    var p = new URLSearchParams(h.replace(/^#/, ''));
    var at = p.get('access_token');
    var rt = p.get('refresh_token');
    if (!at) return;

    /* a tokenhez tartozó felhasználót le kell kérni — a fragment nem hozza */
    fetch(URL_BASE + '/auth/v1/user', {
      headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + at }
    }).then(function (res) { return res.ok ? res.json() : null; })
      .then(function (u) {
        if (!u || !u.id) return;
        setSession({
          access_token: at,
          refresh_token: rt,
          expires_in: Number(p.get('expires_in')) || 3600,
          token_type: p.get('token_type') || 'bearer',
          user: u
        });
      })
      .catch(function () { /* sikertelen fogadás: marad kijelentkezve */ })
      .then(function () {
        /* a tokenek ne maradjanak a címsorban (könyvjelző, előzmények) */
        try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
      });
  }
  fogadOAuthVisszairanyitast();

  /* A felhasználó saját metaadatai (megjelenítendő név, csapatnév, telefon,
     nyelv). Ezek eddig CSAK a helyi munkamenet-objektumba kerültek, ezért
     egy F5 vagy egy másik gép után eltűntek. A GoTrue user-végpontja a
     szerveren tárolja őket, tehát a következő bejelentkezésnél is megvannak. */
  function updateMeta(meta) {
    if (!session || !session.access_token) return Promise.reject(new Error('nincs munkamenet'));
    return fetch(URL_BASE + '/auth/v1/user', {
      method: 'PUT',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + session.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: meta })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (u) {
        if (!res.ok) throw new Error(u.msg || u.message || ('HTTP ' + res.status));
        markNetOk();
        if (session && u && u.id) { session.user = u; writeJSON(SESSION_KEY, session); }
        notifyAuth();
        return u;
      });
    });
  }

  /* Egyszerre csak egy frissítés fusson, különben párhuzamos 401-ek
     egymás elől használnák el a refresh tokent. */
  var refreshing = null;

  function refresh() {
    if (refreshing) return refreshing;
    if (!session || !session.refresh_token) return Promise.reject(new Error('nincs munkamenet'));

    refreshing = authCall('/token?grant_type=refresh_token', { refresh_token: session.refresh_token })
      .then(function (data) { setSession(data); return data; })
      .catch(function (err) {
        // Hálózati hiba offline: NE dobjuk el a munkamenetet, mert net
        // visszatértekor még érvényes lehet. Csak valódi elutasításnál.
        if (isNetworkError(err)) { markNetFail(); throw err; }
        if (err.status === 400 || err.status === 401) setSession(null);
        throw err;
      })
      .then(function (d) { refreshing = null; return d; },
            function (e) { refreshing = null; throw e; });

    return refreshing;
  }

  /* ---------------------------------------------------------
     PostgREST
     --------------------------------------------------------- */

  /**
   * @param path  pl. '/courses?select=*&status=eq.pub'
   * @param opts  {method, body, headers, prefer, anon}
   *              anon:true -> szándékosan token nélkül (publikus olvasás)
   */
  function rest(path, opts) {
    opts = opts || {};
    var method = opts.method || 'GET';

    function fire() {
      var headers = {
        'apikey': ANON_KEY,
        'Accept': 'application/json'
      };
      // A séma kiválasztása fejléccel — így nem kell kliens-konfiguráció,
      // és a public séma (polymarket) érintetlen marad.
      if (method === 'GET' || method === 'HEAD') headers['Accept-Profile'] = SCHEMA;
      else headers['Content-Profile'] = SCHEMA;

      if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
      if (opts.prefer) headers['Prefer'] = opts.prefer;
      if (!opts.anon && session && session.access_token) {
        headers['Authorization'] = 'Bearer ' + session.access_token;
      }
      Object.keys(opts.headers || {}).forEach(function (k) { headers[k] = opts.headers[k]; });

      return fetch(URL_BASE + '/rest/v1' + path, {
        method: method,
        headers: headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body)
      });
    }

    return fire()
      .then(function (res) {
        // lejárt token: egyszer frissítünk és újrapróbáljuk
        if (res.status === 401 && session && session.refresh_token && !opts._retried) {
          return refresh().then(function () {
            opts._retried = true;
            return rest(path, opts);
          });
        }
        return handle(res);
      })
      .catch(function (err) {
        if (isNetworkError(err)) markNetFail();
        throw err;
      });
  }

  function handle(res) {
    markNetOk();
    if (res.status === 204) return null;
    return res.text().then(function (text) {
      var data = null;
      if (text) { try { data = JSON.parse(text); } catch (e) { data = text; } }
      if (!res.ok) {
        var err = new Error((data && (data.message || data.hint)) || ('HTTP ' + res.status));
        err.status = res.status;
        err.body = data;
        throw err;
      }
      return data;
    });
  }

  /* Proaktív frissítés: ha a token már lejárt, ne pazaroljunk egy 401-et. */
  function ready() {
    if (session && expired() && session.refresh_token && online()) {
      return refresh().catch(function () { /* offline: megy tovább a régi tokennel */ });
    }
    return Promise.resolve();
  }

  /* ---------------------------------------------------------
     offline kimenő sor
     --------------------------------------------------------- */

  /* Minden sorba tett írás visz egy kliens-oldali azonosítót. A szerver
     ezen deduplikál, így egy megszakadt kérés újraküldése nem duplázza
     a beküldést — terepen ez a leggyakoribb hibaforrás.

     FONTOS: minden bejegyzés SAJÁT localStorage-kulcsot kap, nem egy közös
     tömböt. A közös tömb kiolvasás–módosítás–visszaírás mintája két
     megnyitott lapnál elveszítené az egyik lap beküldéseit: mindkettő a
     saját, régi másolatát írná vissza. Egy kulcs = egy setItem, nincs mit
     felülírni. A sorrendet a kulcsba írt időbélyeg adja. */

  function obKey(ts, qid) {
    // fix szélességű ezredmásodperc, hogy a kulcsok betűrendje = időrend
    return OUTBOX_PREFIX + ('00000000000000' + ts).slice(-14) + ':' + qid;
  }

  function obKeys(prefix) {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(prefix) === 0) keys.push(k);
    }
    return keys.sort();
  }

  /* A bejegyzés megjegyzi, KI tette a sorba. Enélkül egy közös gépen ez
     történhet: A felhasználó offline beküld valamit, kijelentkezik, B
     belép — és az ürítés B tokenjével küldi el A beküldését, tehát az
     B fiókjában landol. A flush ezért idegen tulajdonost nem küld el. */
  function queue(entry) {
    entry.qid = entry.qid || uuid();
    entry.ts = entry.ts || new Date().toISOString();
    if (entry.uid === undefined) { var u = user(); entry.uid = u ? u.id : null; }
    writeJSON(obKey(Date.now(), entry.qid), entry);
    return entry.qid;
  }

  /* Hány beküldés vár a sorban. Megadható egy útvonal-részlet: így egy
     funkció megkérdezheti, hogy a SAJÁT írásai közül vár-e még valami — a
     szomszéd funkció beragadt bejegyzése ne blokkolja őt is. */
  function pending(utvonalReszlet) {
    var keys = obKeys(OUTBOX_PREFIX);
    if (!utvonalReszlet) return keys.length;
    var n = 0;
    keys.forEach(function (k) {
      var e = readJSON(k, null);
      if (e && String(e.path || '').indexOf(utvonalReszlet) > -1) n++;
    });
    return n;
  }

  /* A holtlevél-tár: ide kerül, amit a szerver érdemben elutasított, vagy
     ami idegen fiók beküldése. Eddig csak ÍRTUK — a játékos sosem tudta meg,
     hogy egy válasza nem ért célba. Ezek az olvasók teszik láthatóvá. */
  function dead() {
    return obKeys(DEAD_PREFIX).map(function (k) {
      var e = readJSON(k, null);
      if (e) e._key = k;
      return e;
    }).filter(Boolean);
  }

  /* Egy bejegyzés (qid) vagy — argumentum nélkül — az egész tár eldobása.
     Csak akkor hívd, ha a felhasználó látta és tudomásul vette. */
  function deadClear(qid) {
    var n = 0;
    obKeys(DEAD_PREFIX).forEach(function (k) {
      if (qid && k !== DEAD_PREFIX + qid) return;
      try { localStorage.removeItem(k); n++; } catch (e) {}
    });
    return n;
  }

  var flushing = false;

  function flush() {
    if (flushing || !online()) return Promise.resolve(0);
    var keys = obKeys(OUTBOX_PREFIX);
    if (!keys.length) return Promise.resolve(0);

    flushing = true;
    var sent = 0, failed = 0, i = 0;

    /* Sorrendben, egyesével — a beküldések sorrendje jelentést hordoz,
       és egy megakadt elem után a mögötte lévőknek is várniuk kell.
       Ami sikerült vagy véglegesen elbukott, azt AZONNAL töröljük: így
       egy félbeszakadt ürítés sem küldi újra, amit már elintéztünk. */
    function step() {
      if (i >= keys.length) return Promise.resolve();
      var key = keys[i];
      var entry = readJSON(key, null);
      if (!entry) { i++; return step(); }   // másik lap már elvitte

      /* Más fiók beküldése: NEM küldjük el a mostani tokennel — az idegen
         fiókba írna. Nem is dobjuk el némán: a holtlevél-tárba tesszük,
         hátha a tulajdonos visszatér, és mert a néma adatvesztés rosszabb. */
      var most = user();
      if (entry.uid && (!most || most.id !== entry.uid)) {
        entry.error = 'másik fiók beküldése — a mostani munkamenettel nem küldhető el';
        entry.failedAt = new Date().toISOString();
        writeJSON(DEAD_PREFIX + entry.qid, entry);
        try { localStorage.removeItem(key); } catch (e) {}
        i++;
        return step();
      }

      /* ignore-duplicates, NEM merge-duplicates: egy újraküldött beküldésnek
         nincs-mit-tenni eredménye kell legyen. A merge felülírná a szerveren
         már rögzített sort, azaz pont azt a védelmet oltaná ki, amiért a
         qid/event_id létezik. */
      return rest(entry.path, {
        method: entry.method || 'POST',
        body: entry.body,
        prefer: entry.prefer || 'return=minimal,resolution=ignore-duplicates'
      }).then(function (valasz) {
        try { localStorage.removeItem(key); } catch (e) {}
        sent++; i++;
        /* A szerver válasza eddig a padlóra esett. Aki eredményt kért
           (prefer: return=representation), az itt kapja meg — ebből tudja
           a hívó, hogy a beküldése ÉRDEMBEN megtörtént-e, nem csak hogy a
           kérés lement. A címke szerint válogat, hogy egy funkció ne
           reagáljon a szomszéd funkció beküldésére. */
        if (entry.tag) {
          document.dispatchEvent(new CustomEvent('uq:written', {
            detail: { tag: entry.tag, qid: entry.qid, path: entry.path, result: valasz }
          }));
        }
        return step();
      }).catch(function (err) {
        // Offline vagy szerverhiba: megállunk. Ez az elem és minden
        // mögötte lévő a sorban marad, a következő próbálkozásig.
        if (isNetworkError(err) || err.status >= 500) return;

        // 4xx: a szerver érdemben utasította el, az újraküldés sem segít.
        // Kivesszük a sorból, de eltesszük — a néma adatvesztés rosszabb.
        entry.error = err.message;
        entry.failedAt = new Date().toISOString();
        writeJSON(DEAD_PREFIX + entry.qid, entry);
        try { localStorage.removeItem(key); } catch (e) {}
        failed++; i++;
        return step();
      });
    }

    return step().then(function () {
      flushing = false;
      var left = pending();
      if (sent || failed) {
        document.dispatchEvent(new CustomEvent('uq:synced', {
          detail: { sent: sent, left: left, failed: failed }
        }));
      }
      return sent;
    }, function (err) {
      flushing = false;
      throw err;
    });
  }

  // net visszatértekor magától ürítjük a sort
  window.addEventListener('online', function () { markNetOk(); flush(); });

  /* Ha egy másik lap tett valamit a sorba, ez a lap is nekiállhat —
     a szerver dedupja miatt a párhuzamos küldés ártalmatlan. */
  window.addEventListener('storage', function (e) {
    if (e.key && e.key.indexOf(OUTBOX_PREFIX) === 0 && e.newValue) flush();
  });

  /* ---------------------------------------------------------
     Storage — médiafeltöltés

     A képek eddig base64-ként ültek a böngésző tárolójában, és a
     fogyasztó oldalak a teljes sztringet MÁSOLTÁK a saját rekordjukba.
     Innentől a fájl a Storage-ba megy, a rekord csak hivatkozik rá.
     --------------------------------------------------------- */

  var BUCKET = 'uq-media';

  function storagePublicUrl(path) {
    if (!path) return '';
    return URL_BASE + '/storage/v1/object/public/' + BUCKET + '/' + path;
  }

  /* Ékezet- és szóköz-mentes, ütközésbiztos útvonal. A böngészőben
     ugyanaz a fájlnév többször is előfordulhat, ezért uuid-előtag. */
  function storageKey(fileName) {
    var tiszta = String(fileName || 'fajl')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(-60) || 'fajl';
    return uuid().slice(0, 8) + '-' + tiszta;
  }

  function upload(file, opts) {
    opts = opts || {};
    if (!session || !session.access_token) {
      return Promise.reject(new Error('A feltöltéshez be kell jelentkezni.'));
    }
    var path = opts.path || storageKey(file.name);
    return ready().then(function () {
      return fetch(URL_BASE + '/storage/v1/object/' + BUCKET + '/' + encodeURI(path), {
        method: 'POST',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': 'Bearer ' + session.access_token,
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': opts.upsert ? 'true' : 'false'
        },
        body: file
      });
    }).then(function (res) {
      return res.text().then(function (t) {
        if (!res.ok) {
          var m = t;
          try { m = (JSON.parse(t).message || JSON.parse(t).error || t); } catch (e) {}
          if (res.status === 413 || /exceeded|too large/i.test(m)) {
            m = 'A fájl túl nagy — a korlát 10 MB.';
          } else if (/mime|content type/i.test(m)) {
            m = 'Ez a fájltípus nem tölthető fel. Képet vagy hangot válassz; videóhoz használj hivatkozást.';
          }
          throw new Error(m);
        }
        markNetOk();
        return { path: path, url: storagePublicUrl(path) };
      });
    });
  }

  function removeFile(path) {
    if (!path || !session) return Promise.resolve();
    return fetch(URL_BASE + '/storage/v1/object/' + BUCKET + '/' + encodeURI(path), {
      method: 'DELETE',
      headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + session.access_token }
    }).catch(function () { /* a rekord már törölve; az árva fájl nem blokkoló */ });
  }

  /* ---------------------------------------------------------
     admin
     --------------------------------------------------------- */

  /* A jogosultságot a szerver dönti el (RLS) — ez csak a felület
     megjelenítéséhez kell. Sosem ez véd, hanem az adatbázis. */
  var adminCache = null;

  function isAdmin() {
    if (!user()) return Promise.resolve(false);
    if (adminCache !== null) return Promise.resolve(adminCache);
    return rest('/admins?select=user_id&limit=1')
      .then(function (rows) { adminCache = !!(rows && rows.length); return adminCache; })
      .catch(function () { return false; });
  }

  function onAuth(fn) {
    authListeners.push(fn);
    return function () {
      var i = authListeners.indexOf(fn);
      if (i > -1) authListeners.splice(i, 1);
    };
  }

  // kijelentkezéskor az admin-gyorstár is essen el
  onAuth(function () { adminCache = null; });

  window.UQAPI = {
    URL: URL_BASE,
    SCHEMA: SCHEMA,
    rest: rest,
    ready: ready,
    signUp: signUp,
    signIn: signIn,
    signInWithGoogle: signInWithGoogle,
    signOut: signOut,
    updateMeta: updateMeta,
    session: function () { return session; },
    user: user,
    isAdmin: isAdmin,
    onAuth: onAuth,
    online: online,
    queue: queue,
    flush: flush,
    pending: pending,
    dead: dead,
    deadClear: deadClear,
    uuid: uuid,
    upload: upload,
    removeFile: removeFile,
    publicUrl: storagePublicUrl,
    BUCKET: BUCKET
  };
})();
