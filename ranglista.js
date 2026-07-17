/* =========================================================
   URBAN QUEST — RANGLISTA
   ========================================================= */
(function () {
  'use strict';

  const ico = (id, cls) => `<svg class="${cls || 'ico'}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- táblázat adatok ---------- */
  // [helyezés, csapat, verified, tagok, pálya, nehézség(badge), pont, idő, dátum, város, csapat-ikon]
  const ROWS = [
    [1, 'Peak Hunters', true, '4 fő', 'Budai Nyomok', 'extrem', 'Extrém', '12 560', '01:47:32', '2024.05.25.', 'Budapest', 'i-mountain'],
    [2, 'Wild Paths', true, '4 fő', 'Duna Rejtélye', 'nehez', 'Nehéz', '9 420', '02:18:47', '2024.05.24.', 'Budapest', 'i-mountain'],
    [3, 'Urban Explorers', true, '4 fő', 'Várnegyed Nyomában', 'nehez', 'Nehéz', '8 175', '02:23:10', '2024.05.23.', 'Budapest', 'i-city'],
    [4, 'Trail Blazers', false, '', 'Gellért Kaland', 'kozepes', 'Közepes', '7 880', '02:05:31', '2024.05.25.', 'Budapest', 'i-shield'],
    [5, 'Nature Seekers', false, '', 'Duna Rejtélye', 'nehez', 'Nehéz', '7 450', '02:26:14', '2024.05.24.', 'Budapest', 'i-map'],
    [6, 'City Raiders', false, '', 'Alagút 7', 'extrem', 'Extrém', '6 980', '02:41:09', '2024.05.22.', 'Budapest', 'i-city'],
    [7, 'Wanderers', false, '', 'Várnegyed Nyomában', 'nehez', 'Nehéz', '6 250', '02:48:33', '2024.05.23.', 'Budapest', 'i-flag'],
    [8, 'The Adventurers', false, '', 'Budai Nyomok', 'extrem', 'Extrém', '5 890', '02:55:20', '2024.05.21.', 'Budapest', 'i-mountain'],
    [9, 'Pathfinders', false, '', 'Gellért Kaland', 'kozepes', 'Közepes', '5 340', '03:01:45', '2024.05.22.', 'Budapest', 'i-target'],
    [10, 'Explora Crew', true, '', 'Duna Rejtélye', 'nehez', 'Nehéz', '5 120', '03:08:11', '2024.05.20.', 'Budapest', 'i-users'],
    [11, 'Night Owls', false, '', 'Alagút 7', 'extrem', 'Extrém', '4 970', '03:14:52', '2024.05.19.', 'Budapest', 'i-shield'],
    [12, 'Compass Crew', false, '', 'Gellért Kaland', 'kozepes', 'Közepes', '4 720', '03:19:08', '2024.05.18.', 'Budapest', 'i-map'],
    [13, 'Riddle Masters', false, '', 'Duna Rejtélye', 'nehez', 'Nehéz', '4 510', '03:25:41', '2024.05.17.', 'Budapest', 'i-flag'],
    [14, 'Te csapatod', false, '4 fő', 'Belvárosi Rejtélyek', 'kozepes', 'Közepes', '4 860', '02:31:45', '2024.05.16.', 'Budapest', 'i-users'],
    [15, 'Lost Legends', false, '', 'Budai Nyomok', 'extrem', 'Extrém', '4 290', '03:31:20', '2024.05.15.', 'Budapest', 'i-mountain']
  ];

  /* a bejelentkezett felhasználó valódi neve kerül a „Te csapatod" sorba;
     ha nincs belépve, ez a sor kimarad */
  const meUser = (window.UQAuth && window.UQAuth.getUser) ? window.UQAuth.getUser() : null;
  const meName = meUser ? ((meUser.teamName && meUser.teamName.trim()) || meUser.name || 'Te csapatod') : null;
  const rows = ROWS
    .filter(r => r[1] !== 'Te csapatod' || meUser)
    .map(r => r[1] === 'Te csapatod' ? r.map((v, i) => i === 1 ? meName : v).concat(['me']) : r);

  const rowHTML = (r) => {
    const [pos, team, verified, members, track, diffCls, diffLabel, pts, time, date, city, logo, flag] = r;
    const isMe = flag === 'me';
    const posCell = pos <= 3
      ? `<span class="rr-medal m${pos}">${pos}</span>`
      : `<span class="rr-num">${pos}</span>`;
    const vf = verified ? '<span class="vf" title="Ellenőrzött">✓</span>' : '';
    const meTag = isMe ? '<span class="rr-me-tag">Te</span>' : '';
    return `
    <div class="rank-row${pos <= 3 ? ' is-top' : ''}${isMe ? ' is-me' : ''}">
      <span class="rr-pos">${posCell}</span>
      <span class="rr-team">
        <span class="rr-logo">${ico(logo, 'ico')}</span>
        <span class="rr-team-name">${esc(team)}${vf}${meTag}</span>
      </span>
      <span class="rr-track">
        <span class="rr-track-name">${track}</span>
        <span class="badge badge-${diffCls}">${diffLabel}</span>
      </span>
      <span class="rr-pts">${pts}</span>
      <span class="rr-time">${ico('i-clock', 'ico ico-xs')}${time}</span>
      <span class="rr-date">${date}</span>
      <span class="rr-city">${ico('i-pin', 'ico ico-xs')}${city}</span>
    </div>`;
  };

  const body = document.getElementById('rankBody');
  const meIdx = rows.findIndex(r => r[12] === 'me');
  let shown = Math.max(10, meIdx >= 0 ? meIdx + 1 : 0); // a „Te" sor rögtön látsszon
  const render = () => { body.innerHTML = rows.slice(0, shown).map(rowHTML).join(''); };
  render();

  const more = document.getElementById('loadMore');
  if (more) more.addEventListener('click', () => {
    shown = Math.min(rows.length, shown + 5);
    render();
    if (shown >= rows.length) more.style.display = 'none';
  });

  /* ---------- fejléc interakciók ---------- */
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
    nav.addEventListener('click', (e) => { if (e.target.tagName === 'A') { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); } });
  }
  const lang = document.getElementById('langPicker');
  if (lang) {
    const btn = lang.querySelector('.lang-btn');
    const cur = lang.querySelector('.lang-current');
    btn.addEventListener('click', (e) => { e.stopPropagation(); const open = lang.classList.toggle('is-open'); btn.setAttribute('aria-expanded', String(open)); });
    lang.querySelectorAll('[data-lang]').forEach(opt => opt.addEventListener('click', () => {
      if (cur) cur.textContent = opt.dataset.lang;
      lang.querySelectorAll('[role="option"]').forEach(o => o.setAttribute('aria-selected', String(o === opt)));
      lang.classList.remove('is-open');
    }));
    document.addEventListener('click', () => lang.classList.remove('is-open'));
  }
})();
