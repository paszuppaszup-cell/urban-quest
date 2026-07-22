/* ===========================================================
   URBAN QUEST — Érzelmi terv panel (közös felület)

   Két helyen kell ugyanez a panel:
     · a sztori lépésben — ott születik a történet
     · a feladatok lépésben — ha feladat-először sorrendben dolgozol,
       ott még nincs érzelmi terv, pedig a feladatajánláshoz kellene

   Ezért a markup is innen jön, nem a HTML-ből: két oldalon két
   kézzel karbantartott másolat előbb-utóbb elcsúszna.

   Minden kattintható elem <button> vagy div[role=button] — rejtett
   inputos label SZÁNDÉKOSAN nincs benne (lásd a fekete-képernyő
   hibát a palya-varazslo.css-ben).
   =========================================================== */
window.PVEUI = (function () {
  'use strict';

  var E = window.PVE;
  var P = window.PV;

  var STAGES = [
    { k: 'base',  cim: 'Alaphang',       hol: 'végig jelen van, ez a pálya szaga', max: 1 },
    { k: 'rise',  cim: 'Emelkedés',      hol: '2–3 érzés, sorban lépnek be',       max: 3 },
    { k: 'twist', cim: 'Fordulat',       hol: 'a döntési ponton szólal meg',       max: 1 },
    { k: 'goal',  cim: 'Érzelmi végcél', hol: 'ezt az egyet viszik haza',          max: 1 }
  ];

  function esc(s) { return P.esc(s); }
  function q(host, sel) { return host.querySelector(sel); }

  /* ---------- markup ---------- */
  function panelHTML(opts) {
    return '' +
      '<h2 class="pv-panel-h"><span class="pv-num">' + esc(opts.num || '0') + '</span>Érzelmi terv</h2>' +
      '<p class="pv-emo-lead">' +
        'Az érzelmek <b>kontrasztból</b> keletkeznek: megkönnyebbülés nincs feszültség nélkül, ' +
        'meghatottság nincs távolságtartás nélkül. Ezért nem listát adsz meg, hanem <b>görbét</b>. ' +
        'Kattints egy lépcsőre, majd válaszd ki alul az érzést.' +
      '</p>' +
      '<div class="pv-emo-stages" data-emo="stages"></div>' +
      '<div class="pv-emo-pal" data-emo="pal"></div>' +
      '<div class="pv-emo-grid">' +
        '<div class="pv-field">' +
          '<span class="pv-label">Szálak <i class="pv-opt-note">(minden állomásnak mozdítania kell egyet)</i></span>' +
          '<div class="pv-emo-threads" data-emo="threads"></div>' +
        '</div>' +
        '<label class="pv-field">' +
          '<span class="pv-label">A döntés dilemmája</span>' +
          '<div class="pv-select"><select data-emo="dilemma"></select>' +
          '<svg class="ico ico-xs" aria-hidden="true"><use href="#a-down"/></svg></div>' +
          '<i class="pv-opt-note" data-emo="dilemmaNote"></i>' +
        '</label>' +
      '</div>' +
      '<label class="pv-cbx pv-emo-spoken"><input type="checkbox" data-emo="spoken"><span></span>' +
        'Kimondott döntések is legyenek <i class="pv-opt-note">(a csapatnak hangosan állást kell foglalnia — ' +
        'nem változtat útvonalat, de a későbbi szöveg számonkéri)</i></label>' +
      '<div class="pv-lints" data-emo="lints"></div>' +
      '<div class="pv-emo-scorebox" data-emo="scorebox" hidden>' +
        '<button class="adm-btn pv-emo-toggle" type="button" data-emo="toggle">' +
        '<svg class="ico ico-sm" aria-hidden="true"><use href="#a-book"/></svg>Partitúra megnézése</button>' +
        '<div class="pv-emo-score" data-emo="score" hidden></div>' +
      '</div>';
  }

  /* ---------- egy példány ---------- */
  function mount(opts) {
    if (!E || !P) return null;
    var host = typeof opts.host === 'string' ? document.getElementById(opts.host) : opts.host;
    if (!host) return null;

    var W = opts.W;
    var onChange = opts.onChange || function () {};
    var plan = E.normPlan(W.emotion);
    var aktiv = 'base';

    host.classList.add('pv-emo');
    host.innerHTML = panelHTML(opts);

    var el = {};
    ['stages', 'pal', 'threads', 'dilemma', 'dilemmaNote', 'spoken',
     'lints', 'scorebox', 'toggle', 'score'].forEach(function (k) {
      el[k] = q(host, '[data-emo="' + k + '"]');
    });

    function ertek(k) {
      return k === 'rise' ? (plan.rise || []) : (plan[k] ? [plan[k]] : []);
    }

    function rajzStages() {
      el.stages.innerHTML = STAGES.map(function (st, i) {
        var v = ertek(st.k);
        var chips = v.length
          ? v.map(function (id) {
              return '<button class="pv-emo-chip is-on" type="button" data-del="' + st.k + '|' + id + '">' +
                     esc(E.nevOf(id)) + '<svg class="ico ico-xs" aria-hidden="true"><use href="#a-close"/></svg></button>';
            }).join('')
          : '<span class="pv-emo-empty">— válassz —</span>';
        /* div, nem button: gombokat tartalmaz, és gombot gombba ágyazni
           érvénytelen HTML — a parser szétszedné a kártyát */
        return '<div class="pv-emo-stage pv-emo-s' + (i + 1) + (aktiv === st.k ? ' is-active' : '') +
               '" role="button" tabindex="0" aria-pressed="' + (aktiv === st.k) + '" data-stage="' + st.k + '">' +
               '<span class="pv-emo-stage-h">' + (i + 1) + '. ' + st.cim + '</span>' +
               '<span class="pv-emo-stage-chips">' + chips + '</span>' +
               '<span class="pv-emo-stage-hol">' + esc(st.hol) + '</span>' +
               '</div>';
      }).join('');
    }

    function rajzPal() {
      var st = STAGES.filter(function (x) { return x.k === aktiv; })[0];
      var v = ertek(aktiv);
      var fej = '<div class="pv-emo-pal-h">Mit érezzenek itt: <b>' + st.cim + '</b>' +
                (st.max > 1 ? ' <i class="pv-opt-note">(' + v.length + '/' + st.max + ')</i>' : '') + '</div>';
      var test = E.csoportok().map(function (cs) {
        return '<div class="pv-emo-fam"><span class="pv-emo-fam-h">' + esc(cs.nev) + '</span>' +
          cs.elemek.map(function (e) {
            var on = v.indexOf(e.id) >= 0;
            var tilt = (aktiv === 'goal' && !e.end);
            return '<button class="pv-emo-chip pv-emo-' + cs.id + (on ? ' is-on' : '') + (tilt ? ' is-bad' : '') +
                   '" type="button" data-pick="' + e.id + '" title="' + esc(e.hogyan) + '">' + esc(e.nev) + '</button>';
          }).join('') + '</div>';
      }).join('');
      el.pal.innerHTML = fej + '<div class="pv-emo-fams">' + test + '</div>';
    }

    function rajzThreads() {
      var sz = plan.szalak || [];
      /* a placeholder csak olyan mintát ajánljon, ami még nincs beírva */
      var szabad = E.SZAL_MINTA.filter(function (m) { return sz.indexOf(m.nev) < 0; });
      var sor = [];
      for (var i = 0; i < 3; i++) {
        var ph = sz[i] ? '' : ((szabad.shift() || {}).nev || 'további szál (nem kötelező)');
        sor.push('<input type="text" class="pv-input pv-emo-thread" data-t="' + i + '" value="' +
                 esc(sz[i] || '') + '" placeholder="' + esc(ph) + '">');
      }
      el.threads.innerHTML = sor.join('');
    }

    function rajzDilemma() {
      if (!el.dilemma.options.length) {
        el.dilemma.innerHTML = E.DILEMMAK.map(function (d) {
          return '<option value="' + d.id + '">' + esc(d.nev) + '</option>';
        }).join('');
      }
      el.dilemma.value = plan.dilemma;
      el.dilemmaNote.textContent = E.dilemmaById(plan.dilemma).leiras;
    }

    function rajzLints() {
      var l = E.lintPlan(plan, W);
      el.lints.innerHTML = l.length
        ? l.map(function (x) {
            return '<div class="pv-lint pv-lint-' + x.lvl + '">' +
              '<svg class="ico ico-xs" aria-hidden="true"><use href="#a-warn"/></svg>' + esc(x.msg) + '</div>';
          }).join('')
        : '<div class="pv-lint pv-lint-ok"><svg class="ico ico-xs" aria-hidden="true"><use href="#a-check"/></svg>' +
          'A görbe rendben: van kontraszt, és van hova megérkezni.</div>';
    }

    function rajzScore() {
      var kesz = E.isComplete(plan);
      el.scorebox.hidden = !kesz;
      if (!kesz) return;
      var sc = E.score(W, plan);
      var roleOf = (window.PVS && PVS.roleOf) || null;
      el.score.innerHTML = sc.map(function (x) {
        var s = W.skeleton[x.idx];
        return '<div class="pv-emo-row">' +
          '<span class="pv-st-n pv-st-n-' + s.type + '">' + (x.idx + 1) + '</span>' +
          '<div><b>' + esc(s.name) + '</b>' +
          (roleOf ? '<span class="pv-role">' + roleOf(s, x.idx, W.skeleton.length) + '</span>' : '') +
          '<div class="pv-emo-row-e"><b>' + esc(x.foNev) + '</b>' +
            (x.mellekNev ? ' <span>alatta: ' + esc(x.mellekNev) + '</span>' : '') + '</div>' +
          '<div class="pv-emo-row-s">' +
            (x.zarMind ? 'minden szálat lezár' : (x.szal ? '„' + esc(x.szal) + '” — ' + x.feladat : '—')) +
            (x.dontes ? ' · <b class="pv-emo-mark">döntési pont</b>' : '') +
            (x.kimondott ? ' · <b class="pv-emo-mark">kimondott döntés</b>' : '') +
          '</div></div></div>';
      }).join('');
    }

    function ment() {
      W.emotion = E.normPlan(plan);
      P.setWizard(W);
      onChange(W.emotion);
    }

    function rajzMind() { rajzStages(); rajzPal(); rajzLints(); rajzScore(); }

    /* ---------- események ---------- */
    el.stages.addEventListener('click', function (ev) {
      var del = ev.target.closest('[data-del]');
      if (del) {
        ev.stopPropagation();
        var p = del.getAttribute('data-del').split('|');
        if (p[0] === 'rise') plan.rise = plan.rise.filter(function (x) { return x !== p[1]; });
        else plan[p[0]] = '';
        ment(); rajzMind(); return;
      }
      var st = ev.target.closest('[data-stage]');
      if (!st) return;
      aktiv = st.getAttribute('data-stage');
      rajzStages(); rajzPal();
    });

    /* a kártya div, ezért a billentyűkezelés a mi dolgunk */
    el.stages.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      var st = ev.target.closest && ev.target.closest('[data-stage]');
      if (!st || ev.target.closest('[data-del]')) return;
      ev.preventDefault();
      aktiv = st.getAttribute('data-stage');
      rajzStages(); rajzPal();
      var uj = el.stages.querySelector('[data-stage="' + aktiv + '"]');
      if (uj) uj.focus();
    });

    el.pal.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-pick]');
      if (!b) return;
      var id = b.getAttribute('data-pick');
      if (aktiv === 'rise') {
        var i = plan.rise.indexOf(id);
        if (i >= 0) plan.rise.splice(i, 1);
        else if (plan.rise.length >= 3) { P.toast('Legfeljebb 3 emelkedő érzés — ennél több nem érződik külön.', true); return; }
        else plan.rise.push(id);
      } else {
        plan[aktiv] = (plan[aktiv] === id) ? '' : id;
        /* a következő üres lépcsőre lépünk, hogy ne kelljen visszakattintani */
        var kov = STAGES.filter(function (s) { return !ertek(s.k).length; })[0];
        if (plan[aktiv] && kov) aktiv = kov.k;
      }
      ment(); rajzMind();
    });

    el.threads.addEventListener('input', function () {
      plan.szalak = [].slice.call(el.threads.querySelectorAll('.pv-emo-thread'))
        .map(function (i) { return i.value.trim(); }).filter(Boolean);
      ment(); rajzLints(); rajzScore();
    });

    el.dilemma.addEventListener('change', function () {
      plan.dilemma = el.dilemma.value;
      ment(); rajzDilemma();
    });

    el.spoken.addEventListener('change', function () {
      plan.kimondott = el.spoken.checked;
      ment(); rajzScore();
    });

    el.toggle.addEventListener('click', function () {
      el.score.hidden = !el.score.hidden;
      el.toggle.lastChild.nodeValue = el.score.hidden ? 'Partitúra megnézése' : 'Partitúra elrejtése';
    });

    /* ---------- indulás ---------- */
    el.spoken.checked = plan.kimondott !== false;
    rajzThreads(); rajzDilemma(); rajzMind();

    return {
      plan: function () { return E.normPlan(plan); },
      kesz: function () { return E.isComplete(plan); },
      ujra: rajzMind
    };
  }

  return { mount: mount, STAGES: STAGES };
})();
