/* =========================================================
   URBAN QUEST — ADMIN / JÁTÉKOK interakciók
   ========================================================= */
(function () {
  'use strict';

  /* ---------- alapértelmezett listák (Mit csináltok / Jó, ha tudod) ---------- */
  const DEFAULT_DO = ['Rejtvények és feladványok megoldása a helyszínen', 'Rejtett nyomok felkutatása', 'Fotófeladatok teljesítése', 'Közös csapatmunka próbatételei'];
  const DEFAULT_KNOW = ['Kényelmes sétával teljesíthető', 'Bármikor megállhattok pihenni', 'Offline is játszható', 'Okostelefon szükséges a játékhoz'];

  /* ---------- adatok (egyetlen igazságforrás) ---------- */
  const GAMES = [
    { thumb: 1, name: 'Városliget Felfedező', desc: 'Fedezd fel a Városliget rejtett kincseit izgalmas kihívásokon keresztül.',
      longDesc: 'Fedezd fel a Városliget rejtett kincseit izgalmas kihívásokon keresztül. Ismerd meg a park történetét és oldj meg változatos feladatokat!',
      diff: 'Közepes', dur: '2–3 óra', loc: 'Budapest, Városliget', langs: ['hu', 'en'], more: 2, allLangs: ['hu', 'en', 'de', 'fr'], status: 'pub', price: '4 990', age: '12+',
      subtitle: 'Fedezd fel a park rejtett kincseit.', image: '', rating: 4.8, reviews: 64, distance: '3.2 km', team: '2–6 fő',
      category: 'varosi', doList: DEFAULT_DO.slice(), knowList: DEFAULT_KNOW.slice() },
    { thumb: 2, name: 'Budai Vár Rejtélye', desc: 'Nyomozós játék a Budai Vár titokzatos múltjában.',
      longDesc: 'Nyomozós játék a Budai Vár titokzatos múltjában. Fejtsd meg a rejtélyeket és tárd fel a vár elfeledett történeteit!',
      diff: 'Nehéz', dur: '2–3 óra', loc: 'Budapest, Budai Vár', langs: ['hu', 'en'], more: 1, allLangs: ['hu', 'en', 'de'], status: 'pub', price: '5 490', age: '14+',
      subtitle: 'Nyomozás a vár titkai közt.', image: '', rating: 4.7, reviews: 52, distance: '4.1 km', team: '2–6 fő',
      category: 'varosi', doList: DEFAULT_DO.slice(), knowList: DEFAULT_KNOW.slice() },
    { thumb: 3, name: 'Küldetés a Gyárban', desc: 'Szabadulós jellegű játék egy elhagyatott gyár területén.',
      longDesc: 'Szabadulós jellegű játék egy elhagyatott gyár területén. Oldd meg a fejtörőket és találj kiutat, mielőtt lejár az idő!',
      diff: 'Közepes', dur: '1,5–2 óra', loc: 'Budapest, Óbuda', langs: ['hu', 'de'], more: 1, allLangs: ['hu', 'de', 'en'], status: 'draft', price: '4 490', age: '16+',
      subtitle: 'Szabadulós kaland egy régi gyárban.', image: '', rating: 4.6, reviews: 38, distance: '2.4 km', team: '2–5 fő',
      category: 'varosi', doList: DEFAULT_DO.slice(), knowList: DEFAULT_KNOW.slice() },
    { thumb: 4, name: 'Földalatti Nyomok', desc: 'Rejtélyek a föld alatt, ahol a múlt nyomai vezetnek.',
      longDesc: 'Rejtélyek a föld alatt, ahol a múlt nyomai vezetnek. Kövesd a jeleket és fedd fel a város rejtett történelmét!',
      diff: 'Nehéz', dur: '2–3 óra', loc: 'Budapest, Belváros', langs: ['hu', 'en'], more: 0, allLangs: ['hu', 'en'], status: 'pub', price: '5 990', age: '14+',
      subtitle: 'A múlt nyomai a föld alatt.', image: '', rating: 4.9, reviews: 71, distance: '5.8 km', team: '2–6 fő',
      category: 'varosi', doList: DEFAULT_DO.slice(), knowList: DEFAULT_KNOW.slice() },
    { thumb: 5, name: 'Margitsziget Kaland', desc: 'Családbarát kaland a Margitsziget gyönyörű környezetében.',
      longDesc: 'Családbarát kaland a Margitsziget gyönyörű környezetében. Tökéletes program az egész családnak egy kellemes délutánra!',
      diff: 'Könnyű', dur: '1–1,5 óra', loc: 'Budapest, Margitsziget', langs: ['hu'], more: 0, allLangs: ['hu'], status: 'draft', price: '3 490', age: '6+',
      subtitle: 'Családbarát kaland a szigeten.', image: '', rating: 4.5, reviews: 29, distance: '2.8 km', team: '2–6 fő',
      category: 'termeszet', doList: DEFAULT_DO.slice(), knowList: DEFAULT_KNOW.slice() },
    { thumb: 6, name: 'Elveszett Örökség', desc: 'Egy eltűnt örökség nyomában a város legrégebbi épületeiben.',
      longDesc: 'Egy eltűnt örökség nyomában a város legrégebbi épületeiben. Fejtsd meg a régi kódokat és találd meg az elveszett kincset!',
      diff: 'Nehéz', dur: '2–3 óra', loc: 'Budapest, Belváros', langs: ['hu', 'en', 'de'], more: 0, allLangs: ['hu', 'en', 'de'], status: 'arch', price: '4 990', age: '12+',
      subtitle: 'Egy eltűnt örökség nyomában.', image: '', rating: 4.7, reviews: 44, distance: '3.6 km', team: '2–6 fő',
      category: 'varosi', doList: DEFAULT_DO.slice(), knowList: DEFAULT_KNOW.slice() }
  ];

  /* Az „Extrém" hiányzott innen, ezért a Danger Zone nehézsége a listában
     rossz osztályt kapott, a fiókban pedig nem létező opcióra állt — amitől
     egy puszta Mentés Közepesre fokozta le. */
  const DIFF_KEY = { 'Könnyű': 'konnyu', 'Közepes': 'kozepes', 'Nehéz': 'nehez', 'Extrém': 'extrem' };
  const DIFF_COLOR = { konnyu: '#4fb84f', kozepes: '#e0b93a', nehez: '#e8813a', extrem: '#e03a2f' };
  const STATUS = {
    pub: { cls: 'is-pub', label: 'Közzétéve', color: '#4fb84f', glow: true },
    draft: { cls: 'is-draft', label: 'Piszkozat', color: '#7c86e0', glow: false },
    arch: { cls: 'is-arch', label: 'Archivált', color: '#5b6553', glow: false }
  };
  const STATUS_BY_LABEL = { 'Közzétéve': 'pub', 'Piszkozat': 'draft', 'Archivált': 'arch' };
  const LANG_LBL = { hu: 'HU', en: 'EN', de: 'DE', fr: 'FR' };
  const LANG_NAME = { hu: 'Magyar', en: 'English', de: 'Deutsch', fr: 'Français' };
  const ALL_LANG_CODES = ['hu', 'en', 'de', 'fr'];

  const ico = (id, cls) => `<svg class="ico ${cls || ''}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const langChip = c => `<span class="jtk-lang"><svg class="flag" aria-hidden="true"><use href="#f-${c}"/></svg>${LANG_LBL[c]}</span>`;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- adatréteg: Supabase (korábban localStorage) ----------
     Eddig ez az oldal a böngésző tárolójába írt, ezért a szerkesztés
     nem jutott el a publikus oldalra, és törölni sem lehetett semmit.
     Most az adatbázis az egyetlen igazságforrás.

     Az azonosító UUID lett — a régi egész számú id-k két böngészőben
     ütköztek volna. */

  const STATUS_DB = { pub: 'pub', draft: 'draft', arch: 'archived' };
  const STATUS_UI = { pub: 'pub', draft: 'draft', archived: 'arch' };
  const DIFF_LBL = { konnyu: 'Könnyű', kozepes: 'Közepes', nehez: 'Nehéz', extrem: 'Extrém' };
  const DIFF_DB  = { 'Könnyű': 'konnyu', 'Közepes': 'kozepes', 'Nehéz': 'nehez', 'Extrém': 'extrem' };

  const ezres = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  function dbSor(r) {
    const langs = Array.isArray(r.languages) ? r.languages : ['hu'];
    const ora = r.duration_min == null ? ''
      : (r.duration_max && r.duration_max !== r.duration_min
          ? r.duration_min + '–' + r.duration_max + ' óra'
          : r.duration_min + ' óra');
    return {
      id: r.id,
      name: r.name || '',
      desc: r.summary || '',
      longDesc: r.about || '',
      subtitle: r.subtitle || '',
      diff: DIFF_LBL[r.difficulty] || 'Közepes',
      dur: ora,
      loc: [r.city, r.area].filter(Boolean).join(', '),
      langs: langs.slice(0, 3),
      allLangs: langs,
      more: Math.max(0, langs.length - 3),
      status: STATUS_UI[r.status] || 'draft',
      price: r.price_huf == null ? '' : (r.price_huf === 0 ? 'INGYENES' : ezres(r.price_huf)),
      age: r.age_min == null ? '' : (r.age_min + '+'),
      team: r.team_min == null ? '' : (r.team_min + '–' + (r.team_max || r.team_min) + ' fő'),
      image: r.cover_image || '',
      /* színtéma — a szerkesztő ebből tölti fel a szín-panelt */
      temaSzin: r.theme_accent || '',
      temaKep: r.theme_src_image || '',
      temaMod: r.theme_mode || 'auto',
      temaElavult: !!r.tema_elavult,
      category: r.category || 'varosi',
      doList: Array.isArray(r.do_list) ? r.do_list : [],
      knowList: Array.isArray(r.know_list) ? r.know_list : [],
      distance: r.distance_m == null ? '' : (r.distance_m / 1000).toFixed(1).replace('.', ',') + ' km',
      rating: 0, reviews: 0,
      thumb: (Math.abs(String(r.id).charCodeAt(0) + String(r.id).charCodeAt(1)) % 6) + 1,
      // csak a felület számára — törlés előtti figyelmeztetéshez
      _allomas: r.allomas_db, _feladat: r.feladat_db, _menet: r.menet_db,
      _elo: r.van_elo_verzio, _slug: r.slug,
      /* A szerkesztés már nem teszi azonnal élesre a pályát: a mentés csak
         befagyaszt egy verziót, a játékosok a legutóbb KÖZZÉTETT-et kapják.
         Ezt látnia kell a szerzőnek, különben azt hiszi, kész van. */
      _kozzetetlen: r.kozzetetlen_modositas === true,
      _akadaly: r.kozzeteteli_akadaly || 0
    };
  }

  // A mentést mostantól a save_course() RPC végzi soronként; nincs
  // többé „az egész tömböt kiírom" minta.
  function saveStore() { /* szándékosan üres — az adatbázis a forrás */ }

  function betolt() {
    if (!window.UQAPI) return Promise.reject(new Error('Hiányzik az adatréteg.'));
    return UQAPI.rest('/v_admin_courses?select=*&order=sort_order.asc,name.asc')
      .then(rows => {
        GAMES.splice(0, GAMES.length, ...(rows || []).map(dbSor));
        /* Ha a kijelölés kifutott a lista alól (törlés, archiválás, szűrés),
           NEM találunk ki helyette másikat: a nyitott fiók még a régi játék
           mezőit mutatná, és a következő Mentés arra írná rá őket. */
        if (state.selectedId && !GAMES.some(g => g.id === state.selectedId)) {
          state.selectedId = null;
          drawer.classList.add('is-hidden');
        }
        return GAMES;
      });
  }

  const byId = id => GAMES.find(g => g.id === id);
  const firstSentence = (text) => {
    const t = (text || '').trim();
    if (!t) return '';
    const m = t.match(/^[^.!?]*[.!?]/);
    return (m ? m[0] : t).trim();
  };

  /* A beépített minta-adat csak a szerkesztő alapértelmezéseihez kellett;
     a lista az adatbázisból jön, ezért induláskor kiürítjük — különben
     a demó pályák villannának fel a valódiak előtt. */
  GAMES.splice(0, GAMES.length);

  /* ---------- állapot ---------- */
  const state = { search: '', status: 'all', perPage: 10, page: 1, selectedId: null };

  /* ---------- fő DOM-hivatkozások ---------- */
  const tbody = document.getElementById('gameRows');
  const emptyEl = document.getElementById('jtkEmpty');
  const pagerEl = document.getElementById('jtkPager');
  const topSearch = document.getElementById('topSearch');
  const statusFilter = document.getElementById('statusFilter');
  const perPageSel = document.getElementById('perPage');

  /* ---------- fiók mezők ---------- */
  const drawer = document.getElementById('drawer');
  const fName = document.getElementById('fName');
  const fDesc = document.getElementById('fDesc');
  const fDiff = document.getElementById('fDiff');
  const fDur = document.getElementById('fDur');
  const fLoc = document.getElementById('fLoc');
  const fPrice = document.getElementById('fPrice');
  const fStatus = document.getElementById('fStatus');
  const fAge = document.getElementById('fAge');
  const fSubtitle = document.getElementById('fSubtitle');
  const fImage = document.getElementById('fImage');
  const fRating = document.getElementById('fRating');
  const fReviews = document.getElementById('fReviews');
  const fDistance = document.getElementById('fDistance');
  const fTeam = document.getElementById('fTeam');
  const cName = document.getElementById('cName');
  const cDesc = document.getElementById('cDesc');
  const diffDots = document.getElementById('fDiffDots');
  const diffDot = document.getElementById('fDiffDot');
  const statusDot = document.getElementById('fStatusDot');
  const fLangs = document.getElementById('fLangs');
  const langMenu = document.getElementById('langMenu');
  const langPop = document.getElementById('langPop');
  const fCategory = document.getElementById('fCategory');
  const fImagePick = document.getElementById('fImagePick');
  const fDoList = document.getElementById('fDoList');
  const fKnowList = document.getElementById('fKnowList');
  const fDoAdd = document.getElementById('fDoAdd');
  const fKnowAdd = document.getElementById('fKnowAdd');
  const mediaPicker = document.getElementById('mediaPicker');
  const mediaPickerGrid = document.getElementById('mediaPickerGrid');

  /* =========================================================
     SZÍNTÉMA — a játék színe a borítóképéből

     Az alapeset a nem-hozzányúlás: a szín a képből jön, mentéskor egyszer.
     A kézi mód menekülőút, mert van olyan kép, amin minden automatikus
     szabály téved. A kinyerés SZÁNDÉKOSAN itt fut és nem a játékban:
     terepen a csomag megjön a gyorstárból, a kép viszont nem.
     ========================================================= */
  const temaMinta   = document.getElementById('temaMinta');
  const temaHexEl   = document.getElementById('temaHex');
  const temaMetaEl  = document.getElementById('temaMeta');
  const temaFigEl   = document.getElementById('temaFig');
  const temaElonez  = document.getElementById('temaElonezet');
  const fTemaSzin   = document.getElementById('fTemaSzin');
  const btnTemaUjra = document.getElementById('btnTemaUjra');

  /* A panel aktuális állapota — ez megy a mentésbe. */
  const tema = { mod: 'auto', szin: '', kep: '', elavult: false };

  function temaMod() {
    const r = document.querySelector('input[name="temaMode"]:checked');
    return r ? r.value : 'auto';
  }

  /* A megjelenítés MINDIG a véglegesített színt mutatja: ha a normalizálás
     változtat a beírt értéken, azt lássa a szerző, különben addig
     próbálkozna, amíg valami átcsúszik a kontraszt-résen. */
  function temaKiir(hex, forras) {
    const t = (hex && window.UQTema) ? UQTema.normalizal(hex) : null;
    if (!t) {
      tema.szin = '';
      temaMinta.style.background = 'var(--line)';
      temaMinta.style.borderColor = 'var(--line)';
      temaHexEl.textContent = 'Márkazöld';
      temaMetaEl.textContent = forras || 'Nincs szín — az alapértelmezett zöld marad.';
      temaFigEl.hidden = true;
      temaElonez.removeAttribute('style');
      return;
    }
    tema.szin = t.hex;
    temaMinta.style.background = t.hex;
    temaMinta.style.borderColor = t.hex;
    temaHexEl.textContent = t.hex.toUpperCase();

    const igazitva = hex.toLowerCase() !== t.hex.toLowerCase();
    temaMetaEl.textContent =
      (forras ? forras + ' · ' : '') +
      t.h + '° · kontraszt ' + t.kontrasztKartyan + ':1' +
      (igazitva ? ' · világosítva az olvashatóságért' : '');

    const u = UQTema.utkozes(t.h);
    if (u.length) {
      temaFigEl.hidden = false;
      temaFigEl.textContent = 'Figyelem: ez a szín közel van ehhez — ' +
        u.map(z => z.nev + ' (' + z.tavolsag + '°)').join(', ') +
        '. A jelzés nem tűnik el, de ezen a pályán kevésbé lesz feltűnő.';
    } else {
      temaFigEl.hidden = true;
    }

    /* Az előnézet ugyanazt a tokent írja felül, mint élesben a játék. */
    temaElonez.style.setProperty('--lime', t.hex);
    temaElonez.style.setProperty('--lime-rgb', t.rgb.join(' '));
    temaElonez.style.setProperty('--tema-gomb-szoveg', t.gombSzoveg);
  }

  function temaSzamol(csendes) {
    const url = fImage.value.trim();
    if (!window.UQTema) return;
    if (!url) {
      tema.kep = '';
      temaKiir('', 'Adj meg borítóképet, és kiszámolom.');
      return;
    }
    temaMetaEl.textContent = 'Számolás…';
    UQTema.kinyer(url).then(r => {
      if (!r.ok) { temaKiir('', r.uzenet); return; }
      tema.kep = url;
      tema.elavult = false;
      temaKiir(r.tema.hex, 'a borítóképből');
      if (!csendes) toast('Szín kiszámolva', { type: 'ok', sub: r.tema.hex.toUpperCase() });
    }).catch(e => {
      /* Kereszt-origós kép CORS nélkül, törölt fájl, betölthetetlen SVG… */
      temaKiir(tema.szin || '', 'A képből nem sikerült színt kinyerni (' + e.message + ') — adj meg kézzel.');
      if (!csendes) toast('A kép színe nem olvasható ki', { type: 'error', sub: 'Válts kézi módra' });
    });
  }

  function temaModValt() {
    const m = temaMod();
    tema.mod = m;
    fTemaSzin.disabled = (m !== 'kezi');
    btnTemaUjra.disabled = (m === 'kezi');
    if (m === 'kezi') {
      if (tema.szin) fTemaSzin.value = tema.szin;
      temaKiir(fTemaSzin.value, 'kézi választás');
    } else {
      temaSzamol(true);
    }
  }

  document.querySelectorAll('input[name="temaMode"]').forEach(r =>
    r.addEventListener('change', temaModValt));
  fTemaSzin.addEventListener('input', () => {
    if (temaMod() === 'kezi') temaKiir(fTemaSzin.value, 'kézi választás');
  });
  btnTemaUjra.addEventListener('click', () => temaSzamol(false));
  /* Új borítókép → automatikus módban azonnal új szín. */
  fImage.addEventListener('change', () => { if (temaMod() === 'auto') temaSzamol(true); });

  /* A fiók „A játék tartalma" sávja: mély-link az adott játék állomásaira
     és feladataira, a darabszámmal együtt. A darabszám azért fontos, mert
     az üres pálya (0 állomás) a leggyakoribb oka annak, hogy egy játék
     közzétett, mégsem játszható. */
  function tartalomLinkek(g) {
    const la = document.querySelector('.jtk-link-allomas');
    const lf = document.querySelector('.jtk-link-feladat');
    const da = document.getElementById('dbAllomas');
    const df = document.getElementById('dbFeladat');
    if (!la || !lf) return;
    const q = '?game=' + encodeURIComponent(g.id);
    la.href = 'allomasok.html' + q;
    lf.href = 'feladatok.html' + q;
    if (da) da.textContent = g._allomas == null ? '0' : g._allomas;
    if (df) df.textContent = g._feladat == null ? '0' : g._feladat;
    la.classList.toggle('is-ures', !g._allomas);
    lf.classList.toggle('is-ures', !g._feladat);
  }

  function temaBetolt(g) {
    tema.mod = g.temaMod || 'auto';
    tema.szin = g.temaSzin || '';
    tema.kep = g.temaKep || '';
    tema.elavult = !!g.temaElavult;
    const r = document.querySelector('input[name="temaMode"][value="' + tema.mod + '"]');
    if (r) r.checked = true;
    fTemaSzin.disabled = (tema.mod !== 'kezi');
    btnTemaUjra.disabled = (tema.mod === 'kezi');
    if (tema.szin) fTemaSzin.value = tema.szin;

    if (!tema.szin) { temaSzamol(true); return; }
    temaKiir(tema.szin, tema.mod === 'kezi' ? 'kézi választás' : 'a borítóképből');
    /* A borítókép cseréje óta nem számoltunk újra — ezt látnia kell,
       különben némán megmaradna egy elavult szín. */
    if (tema.elavult) {
      temaFigEl.hidden = false;
      temaFigEl.textContent = 'A borítókép megváltozott a szín kiszámítása óta. Nyomd meg az Újraszámolást, vagy válts kézi módra.';
    }
  }

  /* =========================================================
     TOAST
     ========================================================= */
  const toastWrap = document.getElementById('uqToasts');
  function toast(msg, opts) {
    opts = opts || {};
    const type = opts.type || 'ok';
    const sub = opts.sub || '';
    const t = document.createElement('div');
    t.className = 'uq-toast' + (type !== 'ok' ? ' is-' + type : '');
    t.innerHTML =
      `<span class="uq-toast-ic">${ico('a-check-c')}</span>` +
      `<div class="uq-toast-body"><b>${esc(msg)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>` +
      `<button class="uq-toast-x" type="button" aria-label="Bezárás">${ico('a-close', 'ico-sm')}</button>`;
    toastWrap.appendChild(t);
    /* rAF-et a böngésző elfojtja, ha a lap nem látszik (másik fül) —
       időzítő is biztosítja, hogy az értesítés megjelenjen. */
    const megjelenit = () => t.classList.add('is-show');
    requestAnimationFrame(megjelenit);
    setTimeout(megjelenit, 60);
    const dismiss = () => { t.classList.remove('is-show'); setTimeout(() => t.remove(), 260); };
    t.querySelector('.uq-toast-x').addEventListener('click', dismiss);
    /* A hibaüzenetet el kell tudni olvasni. A közzététel-kapu több tételt is
       felsorol — 3,2 másodperc alatt ez elolvashatatlan. */
    setTimeout(dismiss, opts.tart || (type === 'ok' ? 3200 : 9000));
  }

  /* =========================================================
     TÁBLÁZAT RENDERELÉSE (szűrés + lapozás)
     ========================================================= */
  function filtered() {
    const s = state.search.trim().toLowerCase();
    return GAMES.filter(g => {
      if (state.status !== 'all' && g.status !== state.status) return false;
      if (s) {
        const hay = (g.name + ' ' + g.desc + ' ' + g.longDesc).toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }

  /* Beágyazott ikonok: az oldal sprite-ja csak 6 szimbólumot tartalmaz,
     ezért a sprite-hivatkozás itt üres gombot adna. */
  const SVG_ARCHIVE =
    '<svg class="ico ico-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/>' +
    '<path d="M10 12h4"/></svg>';
  const SVG_TRASH =
    '<svg class="ico ico-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/>' +
    '<path d="M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

  /* A lista eddig egy AZONOSÍTÓBÓL HASHELT színes foltot mutatott
     (jtk-thumb-1..6), nem a valódi borítóképet — ezért nem lehetett ránézésre
     megmondani, melyik játékhoz melyik kép tartozik. Most a tényleges
     cover_image látszik; ahol nincs, ott nem egy semmitmondó gradiens áll,
     hanem egy kép-ikon a játék SAJÁT színével — így egy pillantásból kiderül,
     melyikhez kell még borítót készíteni. */
  function boritoHTML(g) {
    if (g.image) {
      return `<span class="jtk-thumb has-kep" style="background-image:url(&quot;${esc(g.image)}&quot;)"
                    role="img" aria-label="${esc(g.name)} borítóképe"></span>`;
    }
    const t = (g.temaSzin && window.UQTema) ? window.UQTema.normalizal(g.temaSzin) : null;
    const stilus = t ? ` style="--lime:${t.hex};--lime-rgb:${t.rgb.join(' ')}"` : '';
    return `<span class="jtk-thumb nincs-kep"${stilus} title="Ehhez a játékhoz még nincs borítókép">
              ${ico('a-image', 'ico-sm')}</span>`;
  }

  function rowHTML(g) {
    const dk = DIFF_KEY[g.diff] || 'kozepes';
    const st = STATUS[g.status] || STATUS.draft;
    const langs = g.langs.map(langChip).join('') + (g.more ? `<span class="jtk-more">+${g.more}</span>` : '');
    return `<div class="jtk-row${g.id === state.selectedId ? ' is-active' : ''}" data-id="${g.id}">
      <div class="jtk-name">
        ${boritoHTML(g)}
        <span class="jtk-name-txt"><b>${esc(g.name)}</b><small>${esc(g.desc)}</small></span>
      </div>
      <div class="jtk-cell-diff"><span class="jtk-diff jtk-diff-${dk}"><i></i><i></i><i></i><i></i><i></i></span><span class="jtk-diff-lbl">${esc(g.diff)}</span></div>
      <div class="jtk-cell-dur">${esc(g.dur)}</div>
      <div class="jtk-cell-loc">${esc(g.loc)}</div>
      <div class="jtk-langs">${langs}</div>
      <div><span class="jtk-status ${st.cls}"><span class="dot"></span>${st.label}</span>${
        nincsElo(g) ? '<span class="jtk-warn" title="Közzétett, de nincs befagyasztott verziója, ezért nem jelenik meg a publikus oldalon. Nyomd meg a Közzététel gombot.">nem látható</span>' : ''
      }${
        g._kozzetetlen ? '<span class="jtk-warn is-draft" title="A legutóbbi szerkesztéseid be vannak fagyasztva, de a játékosok még a korábban közzétett verziót játsszák. A Közzététel gombbal teszed élesre.">közzé nem tett módosítás</span>' : ''
      }${
        g._akadaly ? '<span class="jtk-warn" title="' + g._akadaly + ' dolog akadályozza a közzétételt — a Közzététel gomb megmutatja, mi.">' + g._akadaly + ' akadály</span>' : ''
      }</div>
      <div class="jtk-actions">
        <button class="jtk-act jtk-act-edit" type="button" data-act="edit" aria-label="Szerkesztés">${ico('a-edit')}</button>
        <button class="jtk-act" type="button" data-act="copy" aria-label="Másolás">${ico('a-copy')}</button>
        <button class="jtk-act" type="button" data-act="preview" aria-label="Előnézet">${ico('a-eye')}</button>
        <button class="jtk-act" type="button" data-act="archive"
          aria-label="${g.status === 'arch' ? 'Visszaállítás' : 'Archiválás'}"
          title="${g.status === 'arch' ? 'Visszaállítás piszkozatba' : 'Archiválás — eltűnik a publikus oldalról, az eredmények megmaradnak'}">${SVG_ARCHIVE}</button>
        <button class="jtk-act jtk-act-del" type="button" data-act="delete"
          aria-label="Végleges törlés" title="Végleges törlés — nincs visszaút">${SVG_TRASH}</button>
      </div>
    </div>`;
  }

  function renderPager(total, pages, startIdx, count) {
    const from = total === 0 ? 0 : startIdx + 1;
    const to = startIdx + count;
    let html = `<span class="jtk-range">${from}–${to} / ${total}</span>`;
    html += `<button type="button" class="jtk-pg jtk-pg-prev" aria-label="Előző"${state.page <= 1 ? ' disabled' : ''}>${ico('a-collapse', 'ico-xs')}</button>`;
    for (let p = 1; p <= pages; p++) {
      html += `<button type="button" class="jtk-pg${p === state.page ? ' is-active' : ''}" data-page="${p}">${p}</button>`;
    }
    html += `<button type="button" class="jtk-pg jtk-pg-next" aria-label="Következő"${state.page >= pages ? ' disabled' : ''}>${ico('a-collapse', 'ico-xs')}</button>`;
    pagerEl.innerHTML = html;
  }

  function render() {
    const list = filtered();
    const total = list.length;
    const perPage = state.perPage;
    const pages = Math.max(1, Math.ceil(total / perPage));
    if (state.page > pages) state.page = pages;
    if (state.page < 1) state.page = 1;
    const startIdx = (state.page - 1) * perPage;
    const pageItems = list.slice(startIdx, startIdx + perPage);

    tbody.innerHTML = pageItems.map(rowHTML).join('');
    emptyEl.hidden = total > 0;
    renderPager(total, pages, startIdx, pageItems.length);
    saveStore();
  }

  /* =========================================================
     FIÓK (szerkesztő)
     ========================================================= */
  function applyDiff(label) {
    const dk = DIFF_KEY[label] || 'kozepes';
    diffDots.className = 'jtk-diff jtk-diff-' + dk;
    diffDot.style.background = DIFF_COLOR[dk];
  }
  function applyStatus(label) {
    const st = STATUS[STATUS_BY_LABEL[label] || 'pub'];
    statusDot.style.background = st.color;
    statusDot.style.boxShadow = st.glow ? '0 0 6px ' + st.color : 'none';
  }
  function langChipEl(c) {
    const el = document.createElement('span');
    el.className = 'ed-lang is-on';
    el.dataset.lang = c;
    el.innerHTML = `<svg class="flag" aria-hidden="true"><use href="#f-${c}"/></svg>${LANG_LBL[c]}<button class="jtk-lang-x" type="button" aria-label="Eltávolítás">${ico('a-close', 'ico-xs')}</button>`;
    return el;
  }
  function rebuildLangs(codes) {
    fLangs.querySelectorAll('.ed-lang').forEach(n => n.remove());
    codes.forEach(c => fLangs.insertBefore(langChipEl(c), langMenu));
  }
  function currentDrawerLangs() {
    return Array.from(fLangs.querySelectorAll('.ed-lang')).map(el => el.dataset.lang).filter(Boolean);
  }

  /* ---------- szerkeszthető szöveglisták (Mit csináltok / Jó, ha tudod) ---------- */
  function listRowHTML(val) {
    return `<div class="jtk-li-row"><input type="text" value="${esc(val)}" placeholder="Elem szövege…"><button class="jtk-li-x" type="button" data-lrm aria-label="Eltávolítás">${ico('a-close', 'ico-xs')}</button></div>`;
  }
  function renderList(container, arr) {
    container.innerHTML = (Array.isArray(arr) ? arr : []).map(listRowHTML).join('');
  }
  function addListRow(container, val) {
    container.insertAdjacentHTML('beforeend', listRowHTML(val || ''));
    const inp = container.lastElementChild && container.lastElementChild.querySelector('input');
    if (inp) inp.focus();
  }
  function collectList(container) {
    return Array.from(container.querySelectorAll('input')).map(i => i.value.trim()).filter(Boolean);
  }

  function fillDrawer(g) {
    fName.value = g.name; cName.textContent = g.name.length;
    fDesc.value = g.longDesc; cDesc.textContent = g.longDesc.length;
    fDiff.value = g.diff; applyDiff(g.diff);
    fDur.value = g.dur;
    fLoc.value = g.loc;
    fPrice.value = g.price;
    fStatus.value = STATUS[g.status].label; applyStatus(STATUS[g.status].label);
    fAge.value = g.age;
    fSubtitle.value = g.subtitle || '';
    fImage.value = g.image || '';
    temaBetolt(g);
    tartalomLinkek(g);
    fRating.value = (g.rating != null ? g.rating : '');
    fReviews.value = (g.reviews != null ? g.reviews : '');
    fDistance.value = g.distance || '';
    fTeam.value = g.team || '';
    fCategory.value = g.category || 'varosi';
    renderList(fDoList, (Array.isArray(g.doList) && g.doList.length) ? g.doList : DEFAULT_DO.slice());
    renderList(fKnowList, (Array.isArray(g.knowList) && g.knowList.length) ? g.knowList : DEFAULT_KNOW.slice());
    rebuildLangs(g.allLangs);
    frissitPrompt();
  }

  /* ---- borítókép-prompt: mindig az ÉPPEN a szerkesztőben lévő
     adatokból, nem a mentett rekordból — így mentés előtt is látod,
     mit ad a módosított cím vagy leírás. ---- */
  function frissitPrompt() {
    const ta = document.getElementById('fImgPrompt');
    if (!ta || !window.UQImgPrompt) return;
    const loc = String(fLoc.value || '').split(',');
    ta.value = UQImgPrompt.build({
      name: fName.value,
      subtitle: fSubtitle.value,
      desc: fDesc.value,
      category: fCategory.value,
      difficulty: DIFF_DB[fDiff.value] || 'kozepes',
      city: (loc[0] || '').trim(),
      area: loc.length > 1 ? loc.slice(1).join(',').trim() : ''
    });
  }

  function markActive() {
    tbody.querySelectorAll('.jtk-row').forEach(r =>
      r.classList.toggle('is-active', r.dataset.id === String(state.selectedId)));
  }

  function selectGame(id, focus) {
    const g = byId(id);
    if (!g) return;
    state.selectedId = id;
    fillDrawer(g);
    drawer.classList.remove('is-hidden');
    markActive();
    if (focus) fName.focus();
  }

  /* ---- a felület formázott szövegeiből számok az adatbázisnak ---- */

  const szam = (s) => { const m = String(s == null ? '' : s).replace(',', '.').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : null; };
  const tartomany = (s) => {
    const t = String(s || '').replace(/,/g, '.');
    const m = t.match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/);
    if (m) return [Math.round(+m[1]), Math.round(+m[2])];
    const e = szam(t);
    return e == null ? [null, null] : [Math.round(e), null];
  };
  const arFt = (s) => {
    const t = String(s || '').trim();
    if (!t) return null;
    if (/ingyen/i.test(t)) return 0;
    const m = t.replace(/[\s.]/g, '').match(/\d+/);
    return m ? +m[0] : null;
  };

  function urlapPayload(id) {
    const [dmin, dmax] = tartomany(fDur.value);
    const [tmin, tmax] = tartomany(fTeam.value);
    const loc = String(fLoc.value || '').split(',');
    const codes = currentDrawerLangs();
    const km = szam(fDistance.value);
    return {
      id: id || null,
      name: fName.value.trim() || 'Névtelen játék',
      about: fDesc.value,
      /* A `summary` SZÁNDÉKOSAN nincs itt. A fiókban nincs hozzá mező, mégis
         minden mentés felülírta a leírás első mondatával — pedig ez az a
         szöveg, ami a publikus katalógus-kártyán látszik, és hatból négy
         pályánál eltért. A save_course `p ? 'summary'` őre miatt a hiányzó
         kulcs érintetlenül hagyja a mezőt. Új pályánál a newGame() adja meg. */
      subtitle: fSubtitle.value.trim(),
      difficulty: DIFF_DB[fDiff.value] || 'kozepes',
      category: fCategory.value || 'varosi',
      status: STATUS_DB[STATUS_BY_LABEL[fStatus.value] || 'draft'] || 'draft',
      city: (loc[0] || '').trim() || null,
      area: loc.length > 1 ? loc.slice(1).join(',').trim() : null,
      cover_image: fImage.value.trim() || null,
      /* A theme_src_image rögzíti, MELYIK képből készült a szín — enélkül
         egy kicserélt borítókép mellett némán megmaradna a régi. */
      theme_accent: tema.szin || null,
      theme_src_image: tema.szin ? (fImage.value.trim() || null) : null,
      theme_mode: temaMod(),
      price_huf: arFt(fPrice.value),
      duration_min: dmin, duration_max: dmax,
      team_min: tmin, team_max: tmax,
      age_min: szam(fAge.value),
      distance_m: km == null ? null : Math.round(km * 1000),
      languages: codes.length ? codes : ['hu'],
      do_list: collectList(fDoList),
      know_list: collectList(fKnowList)
    };
  }

  function saveDrawer() {
    if (!state.selectedId) { toast('Nincs kiválasztott játék', { type: 'error' }); return; }
    UQAPI.rest('/rpc/save_course', { method: 'POST', body: { p: urlapPayload(state.selectedId) } })
      .then(() => ujratolt('Játék elmentve', 'A publikus oldalon is frissült'))
      .catch(hibaToast);
  }

  function duplicateGame(id) {
    const src = byId(id);
    if (!src) return;
    // A másolat CSAK a katalógus-adatokat viszi: az állomások és
    // feladatok nem jönnek vele, mert azok a pályához tartoznak.
    UQAPI.rest('/rpc/save_course', {
      method: 'POST',
      body: { p: {
        name: src.name + ' (másolat)',
        summary: src.desc, about: src.longDesc, subtitle: src.subtitle,
        difficulty: DIFF_DB[src.diff] || 'kozepes',
        category: src.category, status: 'draft',
        city: (src.loc || '').split(',')[0].trim() || null,
        languages: src.allLangs
      } }
    })
      .then(() => ujratolt('Játék duplikálva', src.name + ' (másolat) — piszkozatként, állomások nélkül'))
      .catch(hibaToast);
  }

  function newGame() {
    // Az azonosítót az adatbázis adja (UUID) — a régi max+1 két
    // böngészőben ütköző id-ket gyártott.
    UQAPI.rest('/rpc/save_course', {
      method: 'POST',
      body: { p: {
        name: 'Új játék',
        about: 'Rövid leírás a játékról. Add meg a részleteket a szerkesztőben.',
        summary: 'Rövid leírás a játékról.',
        difficulty: 'konnyu', category: 'varosi', status: 'draft',
        city: 'Budapest', languages: ['hu'],
        do_list: DEFAULT_DO.slice(), know_list: DEFAULT_KNOW.slice()
      } }
    })
      .then(r => {
        const uj = Array.isArray(r) ? r[0] : r;
        /* a szűrők törlése, hogy az új (piszkozat) sor biztosan látszódjon */
        state.search = ''; topSearch.value = '';
        state.status = 'all'; statusFilter.value = 'all';
        state.page = 1;
        state.selectedId = uj && uj.id;
        return betolt().then(() => {
          render();
          if (state.selectedId) selectGame(state.selectedId, true);
          toast('Új játék létrehozva', { sub: 'Töltsd ki az adatokat, majd Mentés' });
        });
      })
      .catch(hibaToast);
  }

  /* =========================================================
     MENÜK (dropdown + chip-menu) — közös nyitás/zárás
     ========================================================= */
  function closeAllMenus() {
    document.querySelectorAll('[data-dd].is-open, [data-chipmenu].is-open').forEach(x => x.classList.remove('is-open'));
  }

  document.querySelectorAll('[data-dd]').forEach(dd => {
    const t = dd.querySelector('[data-dd-toggle]');
    if (!t) return;
    t.addEventListener('click', e => {
      e.stopPropagation();
      const open = dd.classList.contains('is-open');
      closeAllMenus();
      dd.classList.toggle('is-open', !open);
    });
  });

  document.addEventListener('click', closeAllMenus);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllMenus(); });

  /* =========================================================
     ARCHIVÁLÁS / TÖRLÉS
     ========================================================= */

  function ujratolt(uzenet, alcim) {
    return betolt().then(() => {
      render();
      if (uzenet) toast(uzenet, { type: 'ok', sub: alcim });
      // a publikus oldal gyorstára is essen el, hogy azonnal frissüljön
      try { localStorage.removeItem('uq_catalog_v1'); } catch (e) {}
    });
  }

  function hibaToast(err) {
    var m = String((err && err.message) || 'Ismeretlen hiba');

    /* A közzététel-kapu több tételt sorol fel egyetlen mondatban. Nyers
       formában ez egy olvashatatlan fal — inkább listaként mutatjuk, és csak
       az első néhányat, hogy a doboz ne nőjön ki a képernyőből. */
    var kapu = m.match(/^A pálya így nem tehető közzé:\s*([\s\S]+)$/);
    if (kapu) {
      var tetelek = kapu[1].split(' | ').map(function (s) { return s.trim(); }).filter(Boolean);
      var mutat = tetelek.slice(0, 4);
      var tobbi = tetelek.length - mutat.length;
      toast('A pálya még nem tehető közzé', {
        type: 'warn',
        sub: mutat.map(function (t) { return '• ' + t; }).join('\n') +
             (tobbi > 0 ? '\n• …és még ' + tobbi + ' dolog' : '') +
             '\nJavítsd ezeket a Pályák oldalon, aztán próbáld újra.'
      });
      return;
    }
    toast('Nem sikerült', { type: 'warn', sub: m });
  }

  function archiveGame(id) {
    const g = byId(id);
    if (!g) return;
    const vissza = g.status === 'arch';
    UQAPI.rest('/rpc/archive_course', {
      method: 'POST', body: { p_course: id, p_archive: !vissza }
    })
      .then(() => ujratolt(
        vissza ? 'Visszaállítva' : 'Archiválva',
        vissza ? g.name + ' — piszkozatba került, újra közzéteheted'
               : g.name + ' — eltűnt a publikus oldalról, az eredmények megmaradtak'))
      .catch(hibaToast);
  }

  function deleteGame(id) {
    const g = byId(id);
    if (!g) return;

    // Amit a törlés elvinne — mondjuk ki előre, ne utólag derüljön ki.
    const veszit = [];
    if (g._allomas) veszit.push(g._allomas + ' állomás');
    if (g._feladat) veszit.push(g._feladat + ' feladat');
    if (g._menet)   veszit.push(g._menet + ' játékmenet');

    if (g._menet) {
      toast('Nem törölhető véglegesen', {
        type: 'warn',
        sub: g.name + ' — már játszották (' + g._menet + ' menet). Archiváld helyette, így az eredmények megmaradnak.'
      });
      return;
    }

    const uzenet =
      'VÉGLEGES TÖRLÉS — nincs visszaút.\n\n' + g.name + '\n' +
      (veszit.length ? '\nEzzel együtt megszűnik: ' + veszit.join(', ') + '.\n' : '') +
      '\nHa csak el akarod tüntetni a publikus oldalról, használd inkább az archiválást.\n\n' +
      'Biztosan véglegesen törlöd?';

    if (!window.confirm(uzenet)) return;

    UQAPI.rest('/rpc/delete_course', { method: 'POST', body: { p_course: id } })
      .then(() => {
        /* A fiókot is be KELL csukni. Korábban nyitva maradt a törölt játék
           adataival, miközben a betolt() a kijelölést némán a lista első
           elemére állította — egy következő Mentés a törölt játék mezőit
           írta volna rá egy létező, ártatlan pályára. */
        if (state.selectedId === id) { state.selectedId = null; drawer.classList.add('is-hidden'); }
        return ujratolt('Véglegesen törölve', g.name);
      })
      .catch(hibaToast);
  }

  /* =========================================================
     ESEMÉNYEK
     ========================================================= */
  /* táblázat: sor + művelet ikonok (delegálás) */
  tbody.addEventListener('click', e => {
    const row = e.target.closest('.jtk-row');
    if (!row) return;
    const id = row.dataset.id;   // UUID, nem szám
    const actBtn = e.target.closest('.jtk-act');
    if (actBtn) {
      const act = actBtn.dataset.act;
      if (act === 'edit') selectGame(id, true);
      else if (act === 'copy') duplicateGame(id);
      else if (act === 'preview') { const g = byId(id); if (g) toast('Előnézet: ' + g.name, { type: 'info', sub: 'A játék előnézete megnyílik' }); }
      else if (act === 'archive') archiveGame(id);
      else if (act === 'delete') deleteGame(id);
      return; /* nem folytatjuk a sor-kijelöléssel */
    }
    selectGame(id);
  });

  /* lapozó (delegálás) */
  pagerEl.addEventListener('click', e => {
    const btn = e.target.closest('.jtk-pg');
    if (!btn || btn.disabled) return;
    if (btn.classList.contains('jtk-pg-prev')) state.page = Math.max(1, state.page - 1);
    else if (btn.classList.contains('jtk-pg-next')) state.page = state.page + 1;
    else if (btn.dataset.page) state.page = parseInt(btn.dataset.page, 10) || 1;
    render();
  });

  /* felső sáv: kereső → élő szűrés */
  topSearch.addEventListener('input', () => { state.search = topSearch.value; state.page = 1; render(); });

  /* fejléc: státusz-szűrő */
  statusFilter.addEventListener('change', () => { state.status = statusFilter.value; state.page = 1; render(); });

  /* fejléc: új játék */
  document.getElementById('btnNewGame').addEventListener('click', newGame);

  /* lábléc: sorok oldalanként */
  perPageSel.addEventListener('change', () => { state.perPage = parseInt(perPageSel.value, 10) || 10; state.page = 1; render(); });

  /* a kiválasztott játék státuszának beállítása + mentés (render → saveStore) */
  /* A státusz önmagában NEM tesz láthatóvá egy pályát: ahhoz befagyasztott
     verzió is kell (course_versions). Ezért a közzététel két lépés, és a
     másodikat is elvégezzük — különben a pálya „közzétett”, de láthatatlan. */
  function setSelectedStatus(status) {
    const g = byId(state.selectedId);
    if (!g) { toast('Nincs kiválasztott játék', { type: 'error' }); return Promise.resolve(false); }
    const id = g.id;

    /* A fiókban látott ADATOKAT fagyasztjuk be, nem a régieket: korábban
       csak {id, status} ment el, ezért a közzétett verzió a mentetlen
       szerkesztés ELŐTTI állapotot rögzítette. */
    const payload = Object.assign(urlapPayload(id), { status: STATUS_DB[status] || status });

    return UQAPI.rest('/rpc/save_course', { method: 'POST', body: { p: payload } })
      .then(() => {
        if (status !== 'pub') return ujratolt('Piszkozatként mentve', g.name + ' — nem jelenik meg nyilvánosan');
        /* Ez az EGYETLEN hely, ahol egy pálya élesre kerül: p_go_live = true.
           A többi mentés csak befagyaszt egy verziót, a játékosok addig a
           legutóbb közzétettet játsszák. A szerver a course_lint-tel kapuz —
           félkész pálya nem mehet ki. */
        return UQAPI.rest('/rpc/publish_course', { method: 'POST', body: { p_course: id, p_go_live: true } })
          .then(r => {
            const v = Array.isArray(r) ? r[0] : r;
            const figy = (v && v.warnings && v.warnings.length)
              ? ' — figyelmeztetés: ' + v.warnings.join('; ')
              : '';
            return ujratolt('Közzétéve', g.name + ' (v' + (v && v.version) + ')' + figy);
          });
      })
      .then(() => true)
      /* Bukáskor is ÚJRA KELL tölteni: az első lépés (status='pub') már
         lefutott, tehát a pálya „közzétett", de élő verzió nélkül —
         láthatatlanul. A frissítés kiteszi rá a „nem látható" jelvényt,
         különben a szerző csak kézi újratöltésnél szembesülne vele. */
      .catch(err => { hibaToast(err); return ujratolt().then(() => false); });
  }

  /* A pálya „közzétett”, de nincs élő verziója → nem látszik sehol.
     Ezt ki kell mondani, mert semmi máson nem látszik. */
  function nincsElo(g) { return g.status === 'pub' && g._elo === false; }

  /* ---- borítókép-prompt: élő frissítés + másolás ---- */
  [fName, fSubtitle, fDesc, fLoc].forEach(el => {
    if (el) el.addEventListener('input', frissitPrompt);
  });
  [fCategory, fDiff].forEach(el => {
    if (el) el.addEventListener('change', frissitPrompt);
  });

  const btnCopyPrompt = document.getElementById('btnCopyPrompt');
  if (btnCopyPrompt) btnCopyPrompt.addEventListener('click', () => {
    const ta = document.getElementById('fImgPrompt');
    if (!ta || !ta.value) return;
    const kesz = () => toast('Prompt a vágólapon', { type: 'ok', sub: 'Illeszd be a képgenerátorba' });
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ta.value).then(kesz, jeloles);
    } else jeloles();

    /* Tartalék: ha a vágólap-írás nem engedélyezett (megtagadott jog,
       nem felhasználói gesztus), legalább kijelöljük, hogy Ctrl+C mehessen.
       A readonly MINDEN ágon visszaáll — különben a mező szerkeszthető
       maradna, és a felhasználó véletlenül átírhatná a promptot. */
    function jeloles() {
      ta.removeAttribute('readonly');
      ta.select();
      var sikerult = false;
      try { sikerult = document.execCommand('copy'); } catch (e) {}
      ta.setAttribute('readonly', 'readonly');
      if (sikerult) kesz();
      else toast('Nyomj Ctrl+C-t', { type: 'info', sub: 'A prompt ki van jelölve' });
    }
  });

  const btnRefreshPrompt = document.getElementById('btnRefreshPrompt');
  if (btnRefreshPrompt) btnRefreshPrompt.addEventListener('click', () => {
    frissitPrompt();
    toast('Prompt frissítve', { type: 'info', sub: 'A mostani adatokból' });
  });

  /* felső sáv: Mentés / Közzététel */
  /* A fejléc Mentés gombja korábban a saveStore()-t hívta — egy ÜRES
     függvényt a localStorage-korszakból —, majd kiírta, hogy „Minden
     változás elmentve". Vagyis a szerkesztés némán elveszett, miközben a
     felület sikert jelzett. Most ugyanazt csinálja, mint a fiók Mentés
     gombja: valóban elküldi a save_course-t. */
  document.getElementById('btnSave').addEventListener('click', saveDrawer);
  /* A visszajelzést a setSelectedStatus adja, amikor a művelet TÉNYLEG
     befejeződött. Korábban itt volt egy azonnali „Közzétéve" üzenet, ami
     akkor is megjelent, ha a publikálás elbukott — és sikeres esetben
     duplán mondta ugyanazt. */
  document.getElementById('btnPublish').addEventListener('click', () => setSelectedStatus('pub'));

  /* Közzététel legördülő */
  document.querySelectorAll('[data-pub]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.pub;
    /* A visszajelzést mindkét ágon a setSelectedStatus adja, a művelet
       tényleges befejezése után — nem előtte. */
    if (a === 'now') { setSelectedStatus('pub'); }
    else if (a === 'schedule') {
      /* Eddig csak kiírta, hogy „Közzététel ütemezve", és semmit nem
         ütemezett. Az időzítés valódi helye az Időzítések oldal, ezért
         odaviszünk a kiválasztott játékkal — hamis visszajelzés helyett. */
      const g = byId(state.selectedId);
      if (!g) { toast('Nincs kiválasztott játék', { type: 'error' }); return; }
      window.location.href = 'idozitesek.html?game=' + encodeURIComponent(g.id);
    }
    else if (a === 'draft') { setSelectedStatus('draft'); }
  }));

  /* A Fiók legördülőt a közös uq-admin-fejlec.js kezeli mind a 14 admin
     oldalon — itt szándékosan nincs saját másolat belőle. */

  /* fiók: élő karakterszámlálók */
  fName.addEventListener('input', () => { cName.textContent = fName.value.length; });
  fDesc.addEventListener('input', () => { cDesc.textContent = fDesc.value.length; });

  /* fiók: legördülők → pöttyök */
  fDiff.addEventListener('change', () => applyDiff(fDiff.value));
  fStatus.addEventListener('change', () => applyStatus(fStatus.value));

  /* fiók: nyelv-chip eltávolítás (delegálás) */
  fLangs.addEventListener('click', e => {
    const x = e.target.closest('.jtk-lang-x');
    if (x) { e.stopPropagation(); x.closest('.ed-lang').remove(); }
  });

  /* fiók: nyelv hozzáadása (chip-menu) */
  function buildLangPop() {
    const current = currentDrawerLangs();
    langPop.innerHTML = ALL_LANG_CODES.map(c => {
      const added = current.includes(c);
      return `<button class="uq-chip-opt${added ? ' is-selected' : ''}" type="button" data-lang="${c}"${added ? ' disabled' : ''}>` +
        `<svg class="flag" aria-hidden="true"><use href="#f-${c}"/></svg>${LANG_NAME[c]}${ico('a-check', 'ico-xs uq-chip-check')}</button>`;
    }).join('');
  }
  langMenu.querySelector('[data-chip-toggle]').addEventListener('click', e => {
    e.stopPropagation();
    const willOpen = !langMenu.classList.contains('is-open');
    closeAllMenus();
    if (willOpen) { buildLangPop(); langMenu.classList.add('is-open'); }
  });
  langPop.addEventListener('click', e => {
    const opt = e.target.closest('.uq-chip-opt');
    if (!opt || opt.disabled) return;
    fLangs.insertBefore(langChipEl(opt.dataset.lang), langMenu);
    langMenu.classList.remove('is-open');
  });

  /* fiók: szerkeszthető listák (Mit csináltok / Jó, ha tudod) */
  fDoAdd.addEventListener('click', () => addListRow(fDoList, ''));
  fKnowAdd.addEventListener('click', () => addListRow(fKnowList, ''));
  function bindListRemove(container) {
    container.addEventListener('click', e => {
      const rm = e.target.closest('[data-lrm]');
      if (rm) { e.stopPropagation(); rm.closest('.jtk-li-row').remove(); }
    });
  }
  bindListRemove(fDoList);
  bindListRemove(fKnowList);

  /* fiók: Média-tár képválasztó
     Ez a választó a localStorage 'uq_media_v1' kulcsát olvasta — egy halott
     tárolót, amit a média Supabase Storage-ba költözésekor senki nem
     követett. Ezért MINDIG üresnek látszott, akkor is, ha volt feltöltött
     kép. Most ugyanabból a nézetből dolgozik, mint a Média oldal. */
  function loadMedia() {
    if (!window.UQAPI) return Promise.resolve([]);
    return UQAPI.rest('/v_admin_media?select=id,title,kind,url&kind=eq.image&order=created_at.desc')
      .then(rows => (rows || []).filter(m => m && m.url))
      .catch(() => []);
  }
  function openMediaPicker() {
    mediaPickerGrid.innerHTML = '<div class="jtk-mp-empty">Betöltés…</div>';
    mediaPicker.classList.add('is-open');
    mediaPicker.setAttribute('aria-hidden', 'false');
    loadMedia().then(items => {
      if (!items.length) {
        mediaPickerGrid.innerHTML = '<div class="jtk-mp-empty">Nincs feltöltött kép a Média-tárban — tölts fel a <a href="media.html">Média oldalon</a>.</div>';
        return;
      }
      mediaPickerGrid.innerHTML = items.map(m =>
        `<button class="jtk-mp-item" type="button" data-src="${esc(m.url)}"><img src="${esc(m.url)}" alt=""><span>${esc(m.title || 'kép')}</span></button>`
      ).join('');
    });
  }
  function closeMediaPicker() {
    mediaPicker.classList.remove('is-open');
    mediaPicker.setAttribute('aria-hidden', 'true');
  }
  fImagePick.addEventListener('click', openMediaPicker);
  mediaPickerGrid.addEventListener('click', e => {
    const item = e.target.closest('.jtk-mp-item');
    if (!item) return;
    fImage.value = item.dataset.src || '';
    closeMediaPicker();
    toast('Kép kiválasztva');
  });
  mediaPicker.querySelectorAll('[data-mp-close]').forEach(b => b.addEventListener('click', closeMediaPicker));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && mediaPicker.classList.contains('is-open')) closeMediaPicker(); });

  /* fiók: helyszín törlés */
  const clearBtn = document.querySelector('.jtk-clear');
  if (clearBtn) clearBtn.addEventListener('click', () => { fLoc.value = ''; fLoc.focus(); });

  /* fiók: mentés / előnézet / bezárás */
  document.querySelector('.jtk-save').addEventListener('click', saveDrawer);
  /* Előnézet. A ?game= paraméter a halott localStorage-ból dolgozott, ezért
     a lejátszó a beégetett demót indította el — más pályát, mint amit
     kijelöltél. A ?quest=<slug>&elonezet=1 a pálya befagyasztott verzióját
     játssza le az adatbázisból, és nem ír a ranglistába. */
  document.querySelector('.jtk-prev').addEventListener('click', () => {
    const g = byId(state.selectedId);
    if (!g) { toast('Nincs kijelölt játék', { type: 'warn', sub: 'Válassz egy pályát a listából.' }); return; }
    if (!g._slug) { toast('Ennek a pályának nincs azonosítója', { type: 'warn', sub: 'Mentsd el a pályát, utána próbáld újra.' }); return; }
    const url = 'jatszas.html?quest=' + encodeURIComponent(g._slug) + '&elonezet=1';
    const w = window.open(url, '_blank');
    if (w) toast('Előnézet indul', { type: 'info', sub: 'Új lapon nyílik' });
    else location.href = url;
  });
  document.querySelector('.jtk-drawer-x').addEventListener('click', () => drawer.classList.add('is-hidden'));

  /* =========================================================
     OLDALSÁV
     ========================================================= */
  /* nav aktív-váltás + navigáció */
  const navItems = Array.from(document.querySelectorAll('.adm-nav-item'));
  navItems.forEach(item => item.addEventListener('click', e => {
    if (item.getAttribute('href') === '#') {
      e.preventDefault();
      navItems.forEach(n => n.classList.toggle('is-active', n === item));
    }
  }));

  /* összecsukás (csak asztali nézetben) */
  const admSide = document.getElementById('admSide');
  const sideToggle = document.querySelector('[data-side-toggle]');
  if (sideToggle) {
    sideToggle.addEventListener('click', () => {
      if (window.innerWidth <= 900) return;
      admSide.classList.toggle('is-collapsed');
      try { localStorage.setItem('uqGamesSideCollapsed', admSide.classList.contains('is-collapsed')); } catch (err) {}
    });
    try {
      if (localStorage.getItem('uqGamesSideCollapsed') === 'true' && window.innerWidth > 900) {
        admSide.classList.add('is-collapsed');
      }
    } catch (err) {}
  }

  /* =========================================================
     INDÍTÁS — az adatbázisból töltünk, ezért aszinkron
     ========================================================= */
  function indul() {
    if (!window.UQAPI || !UQAPI.user()) {
      emptyEl.hidden = false;
      emptyEl.innerHTML =
        '<p><b>Nem vagy bejelentkezve.</b></p>' +
        '<p>A játékok szerkesztéséhez admin fiók kell.</p>' +
        '<p><a class="adm-btn adm-btn-lime" href="bejelentkezes.html?next=jatekok.html">Bejelentkezés</a></p>';
      return;
    }
    betolt()
      .then(() => {
        render();
        if (state.selectedId) selectGame(state.selectedId);
        if (!GAMES.length) {
          emptyEl.hidden = false;
          emptyEl.innerHTML =
            '<p><b>Még nincs egyetlen pálya sem.</b></p>' +
            '<p>Hozz létre újat, vagy hozd át a meglévőket az ' +
            '<a href="atkoltoztetes.html">átköltöztetéssel</a>.</p>';
        }
      })
      .catch(err => {
        emptyEl.hidden = false;
        emptyEl.innerHTML =
          '<p><b>A játékok nem tölthetők be.</b></p>' +
          '<p>' + esc(String(err && err.message || '')) + '</p>';
      });
  }

  indul();
  if (window.UQAPI) UQAPI.onAuth(() => indul());
})();
