/* =========================================================
   URBAN QUEST — küldetés részletoldal
   ========================================================= */
(function () {
  'use strict';

  const QUESTS = window.QUESTS || {};
  const ORDER = window.QUEST_ORDER || Object.keys(QUESTS);

  const CTA_LABEL = 'Játék indítása';

  const ico  = (id, cls) => `<svg class="${cls || 'ico'}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const flag = (code) => `<svg class="flag" aria-hidden="true"><use href="#f-${code}"/></svg>`;
  const esc  = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- melyik küldetés ---------- */
  const params = new URLSearchParams(location.search);
  let id = params.get('id');
  if (!QUESTS[id]) id = 'szerelem';
  const q = QUESTS[id];

  // ugyanaz az akcentus, mint a küldetés kártyáján (nehézség színe / romantikus)
  const accKey = q.catCls === 'romantikus' ? 'romantikus' : q.diff;

  document.title = `${q.heroTitle} – Urban Quest`;

  // a kártyáéval azonos akcentus az egész részletoldalra
  const page = document.querySelector('.detail-page');
  if (page) page.classList.add('acc-' + accKey);

  /* ---------- HERO ---------- */
  renderHero();
  /* ---------- INFÓ ---------- */
  renderInfo();
  /* ---------- HASONLÓ ---------- */
  renderSimilar();
  /* ---------- fejléc interakciók ---------- */
  initHeader();

  /* ========================================================= */

  function renderHero() {
    const langMap = { hu: 'HU', en: 'EN', de: 'DE' };
    const langVal = q.langs.map(l => `${flag(l)}${langMap[l] || l.toUpperCase()}`).join('<span class="dm-langsep">·</span>');

    const meta = [
      { i: 'i-clock', label: 'Időtartam', val: esc(q.duration) },
      { i: 'i-pin', label: 'Távolság', val: esc(q.distance) },
      { i: 'i-users', label: 'Csapatméret', val: esc(q.team) },
      { i: 'i-level', label: 'Nehézség', val: esc(q.diffScore) },
      { i: 'i-globe', label: 'Nyelv', val: `<span class="dm-langs">${langVal}</span>` },
      { i: 'i-age', label: 'Korosztály', val: esc(q.age) }
    ].map(m =>
      `<li><span class="dm-ico">${ico(m.i)}</span><span class="dm-text"><span class="dm-label">${m.label}</span><span class="dm-val">${m.val}</span></span></li>`
    ).join('');

    document.getElementById('detailHero').innerHTML = `
      <div class="detail-hero-media">
        <img class="detail-hero-img" src="${q.image}" alt="${esc(q.heroTitle)}">
        <span class="badge badge-${accKey} hero-badge-m">${esc(q.cat)}</span>
        <button class="hero-fav-m" type="button" aria-label="Kedvencekhez adás">${ico('i-heart', 'ico ico-sm')}</button>
        <span class="hero-dots" aria-hidden="true"><i class="dot is-on"></i><i class="dot"></i><i class="dot"></i><i class="dot"></i><i class="dot"></i></span>
      </div>
      <div class="detail-hero-scrim" aria-hidden="true"></div>
      <div class="detail-hero-inner container">
        <div class="detail-main">
          <a class="back-link" href="index.html#kuldetesek">${ico('i-back', 'ico ico-sm')}<span>Vissza a küldetésekhez</span></a>
          <span class="badge badge-${accKey} detail-cat">${esc(q.cat)}</span>
          <h1 class="detail-title">${esc(q.heroTitle)}</h1>
          <p class="detail-subtitle">${esc(q.subtitle)}</p>
          <p class="detail-desc">${esc(q.desc)}</p>
          <ul class="detail-meta">${meta}</ul>
        </div>

        <aside class="price-card">
          <div class="price-top">
            <span class="price-amount">${esc(q.price)}</span>
            <span class="price-unit">/ csapat</span>
          </div>
          <button type="button" class="btn btn-lime book-btn" id="bookBtn">${CTA_LABEL}</button>
          <p class="price-perk">${ico('i-gift', 'ico ico-sm')}<span>Ajándékutalvány beváltható</span></p>
          <p class="price-perk price-perk-team">${ico('i-users', 'ico ico-sm')}<span><strong>${esc(q.team)} részére</strong>További fő hozzáadható a fizetésnél.</span></p>
        </aside>

        <div class="detail-toptags">
          <span class="detail-pill pill-${q.diff}">${ico('i-level', 'ico ico-xs')}${esc(q.diffLabel)}</span>
          <span class="detail-pill">${ico('i-users', 'ico ico-xs')}${esc(q.audience)}</span>
        </div>
      </div>`;

    const bookBtn = document.getElementById('bookBtn');
    if (bookBtn) bookBtn.addEventListener('click', () => ctaClick());

    // mobil kedvenc szív a képen — a fiókhoz mentődik (uq-account.js)
    const favM = document.querySelector('.hero-fav-m');
    if (favM) {
      const syncFavM = () => {
        const on = window.UQAccount ? window.UQAccount.isFav(id) : !!q.fav;
        favM.classList.toggle('is-on', on);
        favM.setAttribute('aria-pressed', String(on));
      };
      syncFavM();
      favM.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.UQAccount) { window.UQAccount.toggleFav(id); syncFavM(); }
        else favM.classList.toggle('is-on');
      });
      document.addEventListener('uq:favs', syncFavM);
    }

    // lenti foglaló-sáv (mobilon jelenik meg)
    if (!document.querySelector('.book-bar')) {
      const bar = document.createElement('div');
      bar.className = 'book-bar';
      bar.innerHTML = `
        <div class="bb-left">
          <span class="bb-price"><span class="bb-amount">${esc(q.price)}</span><span class="bb-unit">/ csapat</span></span>
          <span class="bb-perk">${ico('i-gift', 'ico ico-xs')}Ajándékutalvány beváltható</span>
        </div>
        <button class="btn btn-lime bb-btn" type="button">${CTA_LABEL}</button>`;
      document.body.appendChild(bar);
      const bbBtn = bar.querySelector('.bb-btn');
      bbBtn.addEventListener('click', () => ctaClick());
    }
  }

  /* ---------- CTA: regisztráció-kapu, majd a játék indítása (végigjátszó) ---------- */
  function ctaClick() {
    // még nincs fiók → jöjjön a regisztráció, utána indul a játék
    if (window.UQAuth && !window.UQAuth.isRegistered()) {
      window.UQAuth.openRegister({
        title: 'Egy fiók, és indulhat a játék!',
        sub: `„${q.heroTitle}” egy fiókra vár — utána egyből játszhatod, és a haladásod is mentődik.`,
        onDone: () => startGame()
      });
      return;
    }
    startGame();
  }

  function startGame() {
    location.href = 'jatszas.html?quest=' + encodeURIComponent(id);
  }

  function renderInfo() {
    const check = (items, iconId, cls) => items.map(t =>
      `<li>${ico(iconId, 'ico ico-sm ' + (cls || ''))}<span>${esc(t)}</span></li>`
    ).join('');

    const section = (icon, title, body) => `
      <section class="info-col">
        <h3 class="info-head">${ico(icon, 'ico ico-sm info-h-ico')}<span>${title}</span>${ico('i-chevron-down', 'ico ico-sm info-chev')}</h3>
        <div class="info-body">${body}</div>
      </section>`;

    document.getElementById('infoPanel').innerHTML = `
      <div class="info-grid">
        ${section('i-heart', 'Miről szól?', `<p>${esc(q.about)}</p>`)}
        ${section('i-map', 'Mit fogtok csinálni?', `<ul class="check-list">${check(q.doList, 'i-check')}</ul>`)}
        ${section('i-info', 'Amit tudni érdemes', `<ul class="check-list muted-list">${check(q.knowList, 'i-check')}</ul>`)}
        ${section('i-location', 'Helyszín és indulás', `
          <p class="loc-city">${esc(q.locCity)}</p>
          <p class="loc-line"><span class="loc-muted">Indulási pont:</span><br><strong>${esc(q.startPoint)}</strong><br><span class="loc-muted">(${esc(q.startAddr)})</span></p>
          <a class="loc-map" href="https://www.google.com/maps/search/${encodeURIComponent(q.startPoint + ' ' + q.startAddr)}" target="_blank" rel="noopener">${ico('i-pin', 'ico ico-xs')}Térkép megnyitása</a>`)}
        ${section('i-users', 'Ajánlott csapatméret', `
          <p>${esc(q.teamText)}</p>
          <span class="team-pill">${esc(q.teamPill)}</span>
          <p class="team-note">További fő hozzáadható a fizetésnél.</p>`)}
      </div>`;

    // accordion csak mobilon; az első nyitva
    const cols = document.querySelectorAll('#infoPanel .info-col');
    cols.forEach((col, i) => {
      if (i === 0) col.classList.add('is-open');
      col.querySelector('.info-head').addEventListener('click', () => {
        if (window.matchMedia('(max-width: 760px)').matches) col.classList.toggle('is-open');
      });
    });
  }

  function renderSimilar() {
    const track = document.getElementById('similarTrack');
    const others = ORDER.filter(k => k !== id);

    track.innerHTML = others.map(k => window.questCardHTML(k)).join('');

    // kedvencek: a szív-kattintást a uq-account.js delegált kezelője menti;
    // itt csak a kezdőállapotot szinkronizáljuk
    if (window.UQAccount) window.UQAccount.syncFavs(track);

    // navigáció a kártyáról
    const go = (el) => { const cid = el.dataset.id; if (cid) location.href = `kuldetes.html?id=${cid}`; };
    track.querySelectorAll('.quest-card').forEach(card => {
      card.addEventListener('click', (e) => { if (e.target.closest('.fav')) return; if (dragMoved) return; go(card); });
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(card); });
    });

    initCarousel(track);
  }

  /* ---------- hasonló karuszel ---------- */
  let dragMoved = false;
  function initCarousel(track) {
    const prev = document.getElementById('simPrev');
    const next = document.getElementById('simNext');

    const step = () => {
      const card = track.querySelector('.quest-card');
      if (!card) return 260;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 16;
      return (card.getBoundingClientRect().width + gap) * 2;
    };
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      if (prev) prev.disabled = track.scrollLeft <= 4;
      if (next) next.disabled = track.scrollLeft >= max - 4;
    };
    if (prev) prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    if (next) next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    // húzás egérrel
    let down = false, startX = 0, startLeft = 0;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' || e.target.closest('.fav')) return;
      down = true; dragMoved = false; startX = e.clientX; startLeft = track.scrollLeft;
      track.style.scrollBehavior = 'auto';
    });
    track.addEventListener('pointermove', (e) => {
      if (!down) return;
      if (Math.abs(e.clientX - startX) > 4) dragMoved = true;
      track.scrollLeft = startLeft - (e.clientX - startX);
    });
    const end = () => { if (!down) return; down = false; track.style.scrollBehavior = ''; };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointerleave', end);
  }

  /* ---------- fejléc (sticky, burger, nyelv) ---------- */
  function initHeader() {
    const header = document.getElementById('siteHeader');
    if (header) {
      const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 8);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    const burger = document.getElementById('burger');
    const nav = document.getElementById('mainNav');
    if (burger && nav) {
      burger.addEventListener('click', () => {
        const open = nav.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', String(open));
      });
      nav.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }
      });
    }

    const lang = document.getElementById('langPicker');
    if (lang) {
      const btn = lang.querySelector('.lang-btn');
      const cur = lang.querySelector('.lang-current');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = lang.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(open));
      });
      lang.querySelectorAll('[data-lang]').forEach(opt => {
        opt.addEventListener('click', () => {
          if (cur) cur.textContent = opt.dataset.lang;
          lang.querySelectorAll('[role="option"]').forEach(o => o.setAttribute('aria-selected', String(o === opt)));
          lang.classList.remove('is-open');
        });
      });
      document.addEventListener('click', () => { lang.classList.remove('is-open'); });
    }
  }
})();
