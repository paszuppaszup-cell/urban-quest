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
  let cards = Array.from(document.querySelectorAll('.quest-card'));
  const empty = document.getElementById('carouselEmpty');

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
     intézi és localStorage-ba menti; itt csak a kezdőállapotot szinkronizáljuk ---------- */
  if (window.UQAccount) window.UQAccount.syncFavs();

  /* ---------- karuszel ---------- */
  const track = document.getElementById('questTrack');
  const prev = document.getElementById('carouselPrev');
  const next = document.getElementById('carouselNext');

  function step() {
    const card = cards.find((c) => !c.hidden);
    if (!card) return 240;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 16;
    return (card.getBoundingClientRect().width + gap) * 2;
  }

  function updateNav() {
    const max = track.scrollWidth - track.clientWidth;
    prev.disabled = track.scrollLeft <= 4;
    next.disabled = track.scrollLeft >= max - 4;
  }

  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  track.addEventListener('scroll', updateNav, { passive: true });
  window.addEventListener('resize', updateNav);
  updateNav();

  /* egérrel húzható karuszel */
  let down = false, startX = 0, startLeft = 0, moved = false;

  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' || e.target.closest('.fav')) return;
    down = true; moved = false;
    startX = e.clientX;
    startLeft = track.scrollLeft;
    track.style.scrollBehavior = 'auto';
  });

  track.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    track.scrollLeft = startLeft - dx;
  });

  const endDrag = () => {
    if (!down) return;
    down = false;
    track.style.scrollBehavior = '';
    if (moved) track.style.cursor = '';
  };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointerleave', endDrag);
  track.addEventListener('click', (e) => { if (moved) e.preventDefault(); }, true);

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

  /* Delegált kezelő a sávon: így az adatbázisból utólag betöltött
     kártyák is kattinthatók, anélkül hogy újra kellene kötni bármit. */
  track.addEventListener('click', (e) => {
    const card = e.target.closest('.quest-card');
    if (!card) return;
    if (e.target.closest('.fav')) return;   // a szív a uq-account.js dolga
    if (moved) return;                       // húzás volt, nem kattintás
    openQuest(card);
  });
  track.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const card = e.target.closest('.quest-card');
    if (card) openQuest(card);
  });

  /* A katalógus betöltése után a kártyák új DOM-elemek: újra fel kell
     venni őket, különben a szűrő és a karuszel a régiekkel számolna. */
  document.addEventListener('uq:catalog', () => {
    cards = Array.from(document.querySelectorAll('.quest-card'));
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
