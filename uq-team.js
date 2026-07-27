/* =========================================================
   URBAN QUEST — CSAPATJÁTÉK: létrehozás, becsatlakozás kóddal, váró

   Publikus API: window.UQTeam
     .openStart({slug, title})   -> a „Játék indítása" folyamat:
                                    egyéni / csapatos választás, csapatnál
                                    név + létszám -> váró (lobby)
     .openJoin(kod?)             -> becsatlakozás kóddal -> váró
     .openCreate()               -> csapat létrehozása küldetés nélkül
                                    (a ranglista „Csapat alapítása" gombja)
     .ctx()                      -> az elindított közös menet adatai a
                                    lejátszónak (localStorage-ban utazik)

   A váró 3 másodpercenként kérdezi a szervert (team_lobby RPC). Amikor a
   csapat létrehozója megnyomja az Indulást (start_team_game), a state
   'playing'-re vált, és MINDEN bent lévő tag magától átkerül a játékba —
   ugyanabba a közös menetbe (session_id), amit a szerver rögzített.
   ========================================================= */
(function () {
  'use strict';

  var CTX_KEY = 'uq_team_ctx_v1';
  var POLL_MS = 3000;

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  function rpc(nev, body) {
    return UQAPI.rest('/rpc/' + nev, { method: 'POST', body: body || {} })
      .then(function (r) { return Array.isArray(r) ? r[0] : r; });
  }

  /* a közös menet adatai a lejátszónak */
  function setCtx(c) { try { localStorage.setItem(CTX_KEY, JSON.stringify(c)); } catch (e) {} }
  function ctx() {
    try { return JSON.parse(localStorage.getItem(CTX_KEY)); } catch (e) { return null; }
  }
  function clearCtx() { try { localStorage.removeItem(CTX_KEY); } catch (e) {} }

  /* pálya-uuid a slughoz — a publikus nézetből, bejelentkezés nélkül is megy */
  function courseIdBySlug(slug) {
    return UQAPI.rest('/v_play_bundle?select=course_id&slug=eq.' + encodeURIComponent(slug),
      { anon: !UQAPI.user() })
      .then(function (rows) { return rows && rows[0] && rows[0].course_id; });
  }

  /* ---------- modal váz ---------- */
  var overlay = null, pollTimer = null;

  function close() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (!overlay) return;
    overlay.classList.remove('is-open');
    var el = overlay;
    setTimeout(function () { if (el && el.parentNode) el.parentNode.removeChild(el); }, 160);
    overlay = null;
    document.body.classList.remove('uq-ma-lock');
  }

  function open(html) {
    close();
    overlay = document.createElement('div');
    overlay.className = 'uq-ma-overlay uq-team-overlay';
    overlay.innerHTML =
      '<div class="uq-ma uq-team-modal" role="dialog" aria-modal="true">' +
        '<button class="uq-ma-x" type="button" aria-label="Bezárás">' +
          '<svg class="uq-ma-ico uq-ma-ico-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>' +
        '</button>' +
        '<div class="uq-team-body">' + html + '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    document.body.classList.add('uq-ma-lock');
    var reveal = function () { if (overlay) overlay.classList.add('is-open'); };
    requestAnimationFrame(reveal); setTimeout(reveal, 60);
    overlay.querySelector('.uq-ma-x').addEventListener('click', close);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) close(); });
    return overlay.querySelector('.uq-team-body');
  }

  function hiba(box, msg) {
    var e = box.querySelector('.uq-team-err');
    if (e) { e.textContent = msg; e.hidden = false; }
  }

  /* bejelentkezés-kapu: a csapatjátékhoz fiók kell (a tagságot a szerver
     a fiókhoz köti — enélkül a közös menethez sem férne hozzá) */
  function kellFiok(tovabb) {
    if (window.UQAuth && UQAuth.isRegistered()) { tovabb(); return; }
    if (window.UQAuth && UQAuth.openRegister) {
      UQAuth.openRegister({
        title: 'A csapatjátékhoz fiók kell',
        sub: 'Egy perc az egész — utána létrehozhatod a csapatot, vagy beléphetsz a kóddal.',
        onDone: function () { tovabb(); }
      });
    }
  }

  /* ---------- 1. lépés: egyéni vagy csapatos? ---------- */
  function openStart(opts) {
    opts = opts || {};
    var slug = opts.slug;
    var box = open(
      '<h2 class="uq-team-cim">Hogyan játszotok?</h2>' +
      '<p class="uq-team-sub">' + esc(opts.title || 'A küldetés') + '</p>' +
      '<div class="uq-team-valaszto">' +
        '<button class="uq-team-opt" type="button" data-mod="solo">' +
          '<b>Egyedül / egy telefonon</b>' +
          '<span>Indulás azonnal — a csapat egy készüléket néz.</span>' +
        '</button>' +
        '<button class="uq-team-opt" type="button" data-mod="team">' +
          '<b>Csapatban, több telefonnal</b>' +
          '<span>Kapsz egy kódot, a társaid azzal csatlakoznak, és közös a pontszámotok.</span>' +
        '</button>' +
      '</div>');

    box.querySelector('[data-mod="solo"]').addEventListener('click', function () {
      clearCtx();
      close();
      location.href = 'jatszas.html?quest=' + encodeURIComponent(slug);
    });
    box.querySelector('[data-mod="team"]').addEventListener('click', function () {
      kellFiok(function () { openCreateForm(slug, opts.title); });
    });
  }

  /* ---------- 2. lépés: csapatnév + létszám ---------- */
  function openCreateForm(slug, title) {
    var box = open(
      '<h2 class="uq-team-cim">Csapat létrehozása</h2>' +
      (title ? '<p class="uq-team-sub">' + esc(title) + '</p>' : '') +
      '<label class="uq-team-mezo">Csapatnév' +
        '<input type="text" id="uqTeamNev" maxlength="60" placeholder="pl. Városi Rókák" autocomplete="off">' +
      '</label>' +
      '<label class="uq-team-mezo">Hányan játsszátok?' +
        '<select id="uqTeamDb">' +
          [2, 3, 4, 5, 6, 7, 8].map(function (n) {
            return '<option value="' + n + '"' + (n === 4 ? ' selected' : '') + '>' + n + ' fő</option>';
          }).join('') +
        '</select>' +
      '</label>' +
      '<p class="uq-team-err" hidden></p>' +
      '<button class="uq-team-go" type="button" id="uqTeamCreate">Csapat létrehozása</button>');

    var nev = box.querySelector('#uqTeamNev');
    nev.focus();
    box.querySelector('#uqTeamCreate').addEventListener('click', function () {
      var n = nev.value.trim();
      if (!n) { hiba(box, 'Adj nevet a csapatnak.'); nev.focus(); return; }
      var db = parseInt(box.querySelector('#uqTeamDb').value, 10) || 4;
      this.disabled = true; this.textContent = 'Létrehozás…';

      var azon = slug
        ? courseIdBySlug(slug).then(function (cid) {
            return rpc('create_my_team', { p_name: n, p_size: db, p_course: cid || null });
          })
        : rpc('create_my_team', { p_name: n, p_size: db });

      azon.then(function (t) { openLobby(t.id, slug); })
        .catch(function (e) {
          hiba(box, String(e && e.message || 'Nem sikerült létrehozni.'));
          var b = box.querySelector('#uqTeamCreate');
          if (b) { b.disabled = false; b.textContent = 'Csapat létrehozása'; }
        });
    });
  }

  /* ---------- becsatlakozás kóddal ---------- */
  function openJoin(elore) {
    kellFiok(function () {
      var box = open(
        '<h2 class="uq-team-cim">Becsatlakozás csapatba</h2>' +
        '<p class="uq-team-sub">Írd be a kódot, amit a csapat létrehozója kapott.</p>' +
        '<label class="uq-team-mezo">Csapatkód' +
          '<input type="text" id="uqJoinKod" maxlength="6" placeholder="pl. QW7XK2" autocomplete="off" ' +
                 'style="text-transform:uppercase;letter-spacing:.2em;font-size:18px;text-align:center">' +
        '</label>' +
        '<p class="uq-team-err" hidden></p>' +
        '<button class="uq-team-go" type="button" id="uqJoinGo">Belépek a csapatba</button>');

      var inp = box.querySelector('#uqJoinKod');
      if (elore) inp.value = String(elore).toUpperCase();
      inp.focus();

      var megy = function () {
        var kod = inp.value.trim().toUpperCase();
        if (kod.length < 4) { hiba(box, 'A kód 6 karakter — nézd meg újra.'); return; }
        var b = box.querySelector('#uqJoinGo');
        b.disabled = true; b.textContent = 'Belépés…';
        rpc('join_team_by_code', { p_code: kod })
          .then(function (t) { openLobby(t.id, t.course_slug); })
          .catch(function (e) {
            hiba(box, String(e && e.message || 'Nem sikerült belépni.'));
            b.disabled = false; b.textContent = 'Belépek a csapatba';
          });
      };
      box.querySelector('#uqJoinGo').addEventListener('click', megy);
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') megy(); });
    });
  }

  /* ---------- csapat küldetés nélkül (ranglista) ---------- */
  function openCreate() {
    kellFiok(function () { openCreateForm(null, null); });
  }

  /* ---------- a váró ---------- */
  function openLobby(teamId, slug) {
    var box = open('<h2 class="uq-team-cim">Csapat-váró</h2><p class="uq-team-sub">Betöltés…</p>');
    var utolso = null;

    function rajzol(l) {
      utolso = l;
      var bent = (l.members || []).length;
      var cel = l.member_count || bent;
      var tele = bent >= cel;

      box.innerHTML =
        '<h2 class="uq-team-cim">' + esc(l.name) + '</h2>' +
        (l.course_name
          ? '<p class="uq-team-sub">Küldetés: <b>' + esc(l.course_name) + '</b></p>'
          : '<p class="uq-team-sub">Még nincs kiválasztott küldetés — a küldetés oldaláról indíthatjátok.</p>') +
        '<div class="uq-team-kod" aria-label="Csapatkód">' +
          '<span>A csapat kódja</span><b>' + esc(l.join_code) + '</b>' +
          '<button type="button" id="uqKodMasol">Másolás</button>' +
        '</div>' +
        '<p class="uq-team-hint">A társaid a küldetés oldalán, a „Becsatlakozás" mezőbe írják be.</p>' +
        '<div class="uq-team-tagok">' +
          '<div class="uq-team-tagfej"><b>' + bent + ' / ' + cel + '</b> játékos van bent</div>' +
          (l.members || []).map(function (m) {
            return '<div class="uq-team-tag' + (m.me ? ' is-me' : '') + '">' +
              '<span class="uq-team-tag-pont"></span>' + esc(m.name) +
              (m.role === 'captain' ? '<em>szervező</em>' : '') +
              (m.me ? '<em>te</em>' : '') + '</div>';
          }).join('') +
        '</div>' +
        '<p class="uq-team-err" hidden></p>' +
        (l.owner
          ? '<button class="uq-team-go" type="button" id="uqLobbyStart"' + (l.course_slug ? '' : ' disabled') + '>' +
              (tele ? 'Indulás!' : 'Indulás (nem vártok tovább)') + '</button>' +
            (l.course_slug ? '' : '<p class="uq-team-hint">Válassz küldetést az oldalon, és onnan indítsd csapatban.</p>')
          : '<p class="uq-team-varakozik">A szervező indítja a játékot — itt maradhatsz, magától átvisz.</p>');

      var masol = box.querySelector('#uqKodMasol');
      if (masol) masol.addEventListener('click', function () {
        var ez = this;
        var kesz = function () { ez.textContent = 'Kimásolva!'; setTimeout(function () { ez.textContent = 'Másolás'; }, 1500); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(l.join_code).then(kesz, kesz);
        } else { kesz(); }
      });

      var start = box.querySelector('#uqLobbyStart');
      if (start) start.addEventListener('click', function () {
        start.disabled = true; start.textContent = 'Indítás…';
        rpc('start_team_game', { p_team: teamId })
          .then(function (r) { atAJatekba(l, r); })
          .catch(function (e) {
            hiba(box, String(e && e.message || 'Nem sikerült elindítani.'));
            start.disabled = false; start.textContent = 'Indulás!';
          });
      });
    }

    function atAJatekba(l, r) {
      setCtx({
        team_id: teamId,
        team_name: (utolso && utolso.name) || l.name,
        join_code: (utolso && utolso.join_code) || l.join_code,
        session_id: r.session_id,
        course_version_id: r.version_id,
        course_id: r.course_id,
        slug: r.course_slug
      });
      close();
      location.href = 'jatszas.html?quest=' + encodeURIComponent(r.course_slug) +
        '&team=' + encodeURIComponent((utolso && utolso.join_code) || l.join_code || '');
    }

    function frissit() {
      rpc('team_lobby', { p_team: teamId })
        .then(function (l) {
          /* elindult? — minden bent lévő tagot magától átvisz a játékba */
          if (l.status === 'playing' && l.session_id && l.course_slug) {
            if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
            /* a version/course azonosítót a becsatlakozónak is tudnia kell */
            courseIdBySlug(l.course_slug).then(function () {
              UQAPI.rest('/v_play_bundle?select=course_id,version_id&slug=eq.' + encodeURIComponent(l.course_slug), { anon: false })
                .then(function (rows) {
                  var b = rows && rows[0];
                  atAJatekba(l, {
                    session_id: l.session_id,
                    version_id: b && b.version_id,
                    course_id: b && b.course_id,
                    course_slug: l.course_slug
                  });
                });
            });
            return;
          }
          rajzol(l);
        })
        .catch(function (e) {
          if (overlay) hiba(box, String(e && e.message || 'A váró nem elérhető.'));
        });
    }

    frissit();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () {
      if (!overlay) { clearInterval(pollTimer); pollTimer = null; return; }
      frissit();
    }, POLL_MS);
  }

  window.UQTeam = {
    openStart: openStart,
    openJoin: openJoin,
    openCreate: openCreate,
    openLobby: openLobby,
    ctx: ctx,
    clearCtx: clearCtx
  };
})();
