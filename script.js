/* =========================================================
   URBAN QUEST — interakciók
   ========================================================= */
(function () {
  'use strict';

  /* ---------- küldetéskártyák renderelése az adatokból ---------- */
  const questTrack = document.getElementById('questTrack');
  if (questTrack && window.QUEST_ORDER && window.questCardHTML) {
    questTrack.innerHTML = window.QUEST_ORDER.map(id => window.questCardHTML(id)).join('');
  }

  /* ---------- ragadós fejléc ---------- */
  const header = document.getElementById('siteHeader');
  const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- mobil menü ---------- */
  const burger = document.getElementById('burger');
  const nav = document.getElementById('mainNav');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      nav.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });

  /* ---------- nyelvválasztó ---------- */
  const lang = document.getElementById('langPicker');
  const langBtn = lang.querySelector('.lang-btn');
  const langCurrent = lang.querySelector('.lang-current');

  langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllFilters();
    const open = lang.classList.toggle('is-open');
    langBtn.setAttribute('aria-expanded', String(open));
  });

  lang.querySelectorAll('[data-lang]').forEach((opt) => {
    opt.addEventListener('click', () => {
      langCurrent.textContent = opt.dataset.lang;
      lang.querySelectorAll('[role="option"]').forEach((o) =>
        o.setAttribute('aria-selected', String(o === opt))
      );
      lang.classList.remove('is-open');
      langBtn.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------- szűrő legördülők ---------- */
  const fields = Array.from(document.querySelectorAll('.filter-field'));

  function closeAllFilters(except) {
    fields.forEach((f) => {
      if (f === except) return;
      f.classList.remove('is-open');
      f.querySelector('.filter-btn').setAttribute('aria-expanded', 'false');
    });
  }

  fields.forEach((field) => {
    const btn = field.querySelector('.filter-btn');
    const value = field.querySelector('.filter-value');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      lang.classList.remove('is-open');
      const willOpen = !field.classList.contains('is-open');
      closeAllFilters(field);
      field.classList.toggle('is-open', willOpen);
      btn.setAttribute('aria-expanded', String(willOpen));
    });

    field.querySelectorAll('[role="option"]').forEach((opt) => {
      opt.addEventListener('click', () => {
        value.textContent = opt.textContent.trim();
        field.dataset.value = opt.dataset.value;
        field
          .querySelectorAll('[role="option"]')
          .forEach((o) => o.classList.toggle('is-selected', o === opt));
        field.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
        applyFilters();
      });
    });
  });

  document.addEventListener('click', () => {
    closeAllFilters();
    lang.classList.remove('is-open');
    langBtn.setAttribute('aria-expanded', 'false');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllFilters();
      lang.classList.remove('is-open');
    }
  });

  /* ---------- szűrés ---------- */
  /* Nem const: a katalógus az adatbázisból tölt, és menet közben lecseréli
     a kártyákat. Egy befagyasztott lista már eltávolított elemekkel
     dolgozna — ettől tűnt el a kattintás, a szűrés és a karuszel. */
  const rowsHost = document.getElementById('questRows');
  const empty = document.getElementById('carouselEmpty');

  /* CSAK a küldetés-sorok kártyái. A hero alatti személyes sáv (#uqPersonal)
     szintén .quest-card elemeket rajzol a kedvenceidből — ha azok is ide
     kerülnének, a szűrő a saját kedvenceidet is eltüntetné. */
  let cards = [];
  const frissitKartyak = () => {
    cards = Array.from(document.querySelectorAll('#questRows .quest-card'));
  };
  const sorok = () => Array.from(document.querySelectorAll('#questRows .quest-row'));
  frissitKartyak();

  function applyFilters() {
    let visible = 0;

    cards.forEach((card) => {
      const ok = fields.every((field) => {
        const want = field.dataset.value;
        if (!want) return true;
        return card.dataset[field.dataset.filter] === want;
      });
      card.hidden = !ok;
      if (ok) visible++;
    });

    /* Az üressé vált kategória-sor a FEJLÉCÉVEL együtt eltűnik. Enélkül
       kategóriára szűrve öt üres cím maradna a képernyőn, alattuk semmivel.
       A darabszám a láthatókat számolja, nem az összeset. */
    sorok().forEach((row) => {
      const db = Array.from(row.querySelectorAll('.quest-card')).filter((c) => !c.hidden).length;
      row.hidden = db === 0;
      const szamlalo = row.querySelector('.quest-row-count');
      if (szamlalo) szamlalo.textContent = db + ' küldetés';
    });

    empty.hidden = visible > 0;
    if (!visible) {
      /* Két különböző ok, két különböző üzenet: a „nincs találat” és a
         „nincs egyáltalán küldetés” nem ugyanaz — utóbbinál a szűrő
         állítgatása értelmetlen tanács lenne. */
      empty.textContent = cards.length
        ? 'Nincs a szűrésnek megfelelő küldetés. Próbálj tágabb szűrőt!'
        : 'Jelenleg egyetlen küldetés sem elérhető. Nézz vissza később!';
    }
    updateNav();
  }

  document.getElementById('filterBar').addEventListener('submit', (e) => {
    e.preventDefault();
    applyFilters();
  });

  /* ---------- kedvencek: a szív-kattintást a uq-account.js delegált kezelője
     intézi (helyi gyorstár + adatbázis); itt csak a kezdőállapotot festjük
     rá a kártyákra. A szerverről érkező lista az 'uq:favs' eseménnyel jön. ---------- */
  if (window.UQAccount) window.UQAccount.syncFavs();

  /* ---------- karuszel SORONKÉNT ----------
     Korábban egyetlen sáv volt az összes küldetéssel, és telefonon az is
     függőlegesre fordult. Most kategóriánként egy-egy oldalra húzható sor
     van; a kezelők a konténerre vannak kötve (delegálva), mert a sorokat a
     uq-catalog.js utólag, az adatbázisból építi újra. */

  function step(track) {
    const card = Array.from(track.querySelectorAll('.quest-card')).find((c) => !c.hidden);
    if (!card) return 240;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 16;
    /* Telefonon egy kártyányit lépünk — ott egy kártya tölti ki a képernyőt,
       és a hüvelykujj is egyet húz. Asztalon kettőt, mert több fér ki. */
    const db = window.matchMedia('(max-width: 760px)').matches ? 1 : 2;
    return (card.getBoundingClientRect().width + gap) * db;
  }

  /* Ha minden kártya kifér, ez nem karuszel: rácsra váltunk, és a nyilakat
     elrejtjük. Korábban két nyíl állt a sáv mellett akkor is, ha egyetlen
     kártya volt — letiltva, de láthatóan, tehát a felület olyasmit kínált,
     ami nem létezik.

     A mérést rács-mód nélkül kell végezni, különben körbe-körbe járnánk:
     rácsban sosem lóg túl a tartalom, tehát mindig „kifér"-t mérnénk. */
  function updateNav() {
    sorok().forEach((row) => {
      const track = row.querySelector('.carousel-track');
      const prev = row.querySelector('.carousel-nav.prev');
      const next = row.querySelector('.carousel-nav.next');
      if (!track) return;

      /* A mérést rács-mód nélkül kell végezni, különben körbe-körbe járnánk:
         rácsban sosem lóg túl a tartalom, tehát mindig „kifér”-t mérnénk. */
      track.classList.remove('is-grid');
      const kifer = track.scrollWidth <= track.clientWidth + 4;
      track.classList.toggle('is-grid', kifer);

      /* Érintőképernyőn nincs nyíl: ott az ujj húz, a lebegő gomb pedig csak
         eltakarna egy kártyát. Egérnél viszont kell, mert húzni ott nem
         kézenfekvő. */
      const erintes = window.matchMedia('(hover: none)').matches;
      const rejtsd = kifer || erintes;
      [prev, next].forEach((b) => { if (b) b.hidden = rejtsd; });
      if (rejtsd) return;

      const max = track.scrollWidth - track.clientWidth;
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft >= max - 4;
    });
  }

  /* egérrel húzható sorok + nyílgombok — delegálva, mert a sorok újraépülnek */
  let down = false, startX = 0, startLeft = 0, moved = false, dragTrack = null;

  if (rowsHost) {
    rowsHost.addEventListener('click', (e) => {
      const b = e.target.closest('.carousel-nav');
      if (!b) return;
      const t = b.closest('.carousel') && b.closest('.carousel').querySelector('.carousel-track');
      if (!t) return;
      t.scrollBy({ left: b.classList.contains('prev') ? -step(t) : step(t), behavior: 'smooth' });
    });

    /* A scroll esemény NEM buborékol, elkapási fázisban viszont az ősön is
       megérkezik — így egyetlen kezelő elég mind a hat sávhoz. */
    rowsHost.addEventListener('scroll', updateNav, { passive: true, capture: true });
    window.addEventListener('resize', updateNav);

    rowsHost.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' || e.target.closest('.fav')) return;
      const t = e.target.closest('.carousel-track');
      if (!t) return;
      dragTrack = t; down = true; moved = false;
      startX = e.clientX;
      startLeft = t.scrollLeft;
      t.style.scrollBehavior = 'auto';
    });

    rowsHost.addEventListener('pointermove', (e) => {
      if (!down || !dragTrack) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      dragTrack.scrollLeft = startLeft - dx;
    });

    const endDrag = () => {
      if (!down) return;
      down = false;
      if (dragTrack) dragTrack.style.scrollBehavior = '';
      dragTrack = null;
    };
    rowsHost.addEventListener('pointerup', endDrag);
    rowsHost.addEventListener('pointerleave', endDrag);
    rowsHost.addEventListener('click', (e) => { if (moved) e.preventDefault(); }, true);
  }
  updateNav();

  /* ---------- kártyára kattintás → részletoldal ---------- */
  const openQuest = (card) => {
    const cid = card.dataset.id;
    if (cid) location.href = `kuldetes.html?id=${cid}`;
  };
  const jelolKartyak = () => {
    cards.forEach((card) => {
      card.classList.add('is-clickable');
      card.setAttribute('role', 'link');
      card.setAttribute('tabindex', '0');
    });
  };
  jelolKartyak();

  /* Delegált kezelő a sorok konténerén: így az adatbázisból utólag betöltött
     kártyák is kattinthatók, anélkül hogy újra kellene kötni bármit. */
  if (rowsHost) {
    rowsHost.addEventListener('click', (e) => {
      const card = e.target.closest('.quest-card');
      if (!card) return;
      if (e.target.closest('.fav')) return;        // a szív a uq-account.js dolga
      if (e.target.closest('.carousel-nav')) return; // a nyíl nem nyit küldetést
      if (moved) return;                            // húzás volt, nem kattintás
      openQuest(card);
    });
    rowsHost.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const card = e.target.closest('.quest-card');
      if (card) openQuest(card);
    });
  }

  /* A katalógus betöltése után a kártyák új DOM-elemek: újra fel kell
     venni őket, különben a szűrő és a karuszel a régiekkel számolna. */
  document.addEventListener('uq:catalog', () => {
    frissitKartyak();
    jelolKartyak();
    if (window.UQAccount && window.UQAccount.syncFavs) window.UQAccount.syncFavs();
    applyFilters();
    updateNav();
  });

  /* ---------- aktív nav-elem görgetés szerint ---------- */
  const navLinks = Array.from(document.querySelectorAll('.main-nav a'));
  const sections = navLinks
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((a) =>
            a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id)
          );
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    sections.forEach((s) => io.observe(s));
  }

  /* ---------- személyes sáv (bejelentkezve, hero alatt) ---------- */
  function renderStrip() {
    if (!window.UQAccount) return;
    const mount = document.getElementById('uqPersonal');
    if (!mount) return;
    window.UQAccount.renderHomeStrip(mount);
    // a sávba renderelt kedvenc-kártyák kattintása → részletoldal
    mount.querySelectorAll('.quest-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.fav')) return;
        const cid = card.dataset.id;
        if (cid) location.href = `kuldetes.html?id=${cid}`;
      });
    });
  }
  renderStrip();
  document.addEventListener('uq:auth', renderStrip);
  document.addEventListener('uq:favs', renderStrip);
  document.addEventListener('uq:bookings', renderStrip);
})();
