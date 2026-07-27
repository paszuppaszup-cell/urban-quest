/* =========================================================
   URBAN QUEST — küldetés-adatok + közös kártya-renderelő
   ========================================================= */
/* A beégetett demó-küldetések 2026-07-27-én KIKERÜLTEK: a felhasználó
   kérésére minden játék törlődött az adatbázisból, és a katalógus azóta
   kizárólag a szerverről él (uq-catalog.js). A demók itt hagyva a törölt
   játékokat kísértetként visszahozták volna: a kártyákon a szerver-válasz
   előtt, a részletoldalon ismeretlen azonosítónál tartalék-tartalomként. */
window.QUEST_ORDER = [];

window.QUESTS = {};
/* ---------- közös kártya-renderelő (főoldal + hasonló) ---------- */
window.questCardHTML = function (id) {
  const q = window.QUESTS[id];
  if (!q) return '';
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ico = (i, cls) => `<svg class="${cls || 'ico'}" aria-hidden="true"><use href="#${i}"/></svg>`;

  const accKey     = q.catCls === 'romantikus' ? 'romantikus' : q.diff;
  const badgeCls   = q.catCls === 'romantikus' ? 'romantikus' : q.diff;
  const badgeLabel = q.catCls === 'romantikus' ? 'Romantikus' : q.diffLabel;
  const tagIcon    = q.catCls === 'romantikus' ? 'i-heart' : (q.catCls === 'termeszet' ? 'i-leaf' : 'i-compass');

  /* Értékelés csak akkor, ha VAN. Üres csillagsor „(0)"-val rosszabb,
     mint semmi — és a korábbi kitalált 4.8/64 értékek félrevezetők voltak. */
  const reviews = Number(q.reviews) || 0;
  const filled = Math.max(0, Math.min(5, Math.round(Number(q.rating) || 0)));
  let stars = '';
  for (let i = 0; i < 5; i++) stars += `<svg class="star${i < filled ? '' : ' is-empty'}" aria-hidden="true"><use href="#i-star"/></svg>`;
  const ratingHTML = reviews > 0
    ? `<div class="quest-rating"><span class="stars">${stars}</span><span class="quest-reviews">(${reviews})</span></div>`
    : '';

  const langStr = q.langs.map(l => l.toUpperCase()).join('/');
  const f = q.filters || {};
  const favCls = q.fav ? ' is-on' : '';

  /* A kártya a küldetés SAJÁT színét viseli: a --lime tokent csak ezen az
     egy elemen írjuk felül, így a rács minden kártyája más világot mutat,
     miközben az oldal többi része (és a logó) érintetlen marad. A --ok,
     --warn, --hint és --brand token nem témázódik, tehát a jelzés-színek
     jelentése végig ugyanaz. */
  const tema = q.themeAccent && window.UQTema ? window.UQTema.normalizal(q.themeAccent) : null;
  const temaStyle = tema
    ? ` style="--lime:${tema.hex};--lime-rgb:${tema.rgb.join(' ')}"`
    : '';

  return `
  <article class="quest-card acc-${accKey}" data-id="${q.id}"${temaStyle}
    data-nehezseg="${f.nehezseg || ''}" data-kategoria="${f.kategoria || ''}" data-helyszin="${f.helyszin || ''}"
    data-csoport="${f.csoport || ''}" data-idotartam="${f.idotartam || ''}"
    role="link" tabindex="0" aria-label="${esc(q.title)}">
    <div class="quest-media">
      <img src="${q.image || 'assets/hero-mountain.svg'}" alt="${esc(q.title)}" loading="lazy">
      <span class="badge badge-${badgeCls}">${badgeLabel}</span>
      <button class="fav${favCls}" type="button" aria-label="Kedvencekhez adás" aria-pressed="${q.fav ? 'true' : 'false'}">${ico('i-heart', 'ico ico-sm')}</button>
    </div>
    <div class="quest-body">
      <h3 class="quest-title">${esc(q.title)}</h3>
      <p class="quest-tagline">${ico(tagIcon, 'ico ico-xs')}<span>${esc(q.subtitle)}</span></p>
      <p class="quest-desc">${esc(q.desc)}</p>
      ${ratingHTML}
      ${q.startPoint ? `<p class="quest-start">${ico('i-pin', 'ico ico-xs')}<span>Indulás: <b>${esc(q.startPoint)}</b>${q.locCity ? ' · ' + esc(q.locCity) : ''}</span></p>` : ''}
      <div class="quest-stats">
        <span class="quest-stat">${ico('i-clock', 'ico ico-xs')}<span>${esc(q.duration)}</span></span>
        <span class="quest-stat">${ico('i-pin', 'ico ico-xs')}<span>${esc(q.distance)}</span></span>
        <span class="quest-stat">${ico('i-users', 'ico ico-xs')}<span>${esc(q.team)}</span></span>
        <span class="quest-stat">${ico('i-level', 'ico ico-xs')}<span>${esc(q.diffScore)}</span></span>
        <span class="quest-stat">${ico('i-age', 'ico ico-xs')}<span>${esc(q.age)}</span></span>
        <span class="quest-stat quest-stat-lang">${q.langs.map(l => `<svg class="flag" aria-hidden="true"><use href="#f-${l}"/></svg>`).join('')}<span>${langStr}</span></span>
      </div>
    </div>
  </article>`;
};

/* =========================================================
   ADMIN → NYILVÁNOS: közzétett játékok beolvasása (uq_games_v1)
   A „Közzétéve" (pub) státuszú admin-játékokat teljes küldetés-
   objektummá alakítja, és a QUEST_ORDER elejére szúrja, így a
   főoldal (index) és a részletoldal (kuldetes) is mutatja őket.
   ========================================================= */
(function () {
  var DIFF_KEY = { 'Könnyű': 'konnyu', 'Közepes': 'kozepes', 'Nehéz': 'nehez', 'Extrém': 'extrem' };
  var DIFF_SCORE = { konnyu: '2/5 könnyű', kozepes: '3/5 közepes', nehez: '4/5 nehéz', extrem: '5/5 extrém' };
  var CAT = { varosi: 'Városi', romantikus: 'Romantikus', termeszet: 'Természet' };
  var DO_DEFAULT = ['Rejtvények és feladványok megoldása a helyszínen', 'Rejtett nyomok felkutatása', 'Fotófeladatok teljesítése', 'Közös csapatmunka próbatételei'];
  var KNOW_DEFAULT = ['Kényelmes sétával teljesíthető', 'Bármikor megállhattok pihenni', 'Offline is játszható', 'Okostelefon szükséges a játékhoz'];
  var GRADS = [
    ['#3a4a2a', '#6a5a3a'], ['#22405a', '#3a5a6a'], ['#4a3a5a', '#6a4a5a'],
    ['#2a4a3a', '#3a6a4a'], ['#5a4a2a', '#7a6a3a'], ['#3a2a4a', '#5a3a5a']
  ];
  function xesc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function firstSentence(t) { t = String(t || '').trim(); if (!t) return ''; var m = t.match(/^[^.!?]*[.!?]/); return (m ? m[0] : t).trim(); }
  function placeholderImage(g) {
    var c = GRADS[(((g.thumb || 1) - 1) % GRADS.length + GRADS.length) % GRADS.length];
    var name = xesc(g.name || 'Urban Quest');
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[1] + '"/></linearGradient></defs>' +
      '<rect width="640" height="420" fill="url(#g)"/>' +
      '<circle cx="540" cy="90" r="120" fill="#ffffff" opacity="0.05"/>' +
      '<text x="34" y="384" font-family="Archivo, Arial, sans-serif" font-size="30" font-weight="800" fill="#ffffff" opacity="0.94">' + name + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function gameToQuest(g) {
    var diffKey = DIFF_KEY[g.diff] || 'kozepes';
    var langs = (g.langs && g.langs.length) ? g.langs : ['hu'];
    var team = g.team || '2–6 fő';
    var sub = (g.subtitle && g.subtitle.trim()) ? g.subtitle : (firstSentence(g.desc) || 'Városi kaland és küldetés.');
    var img = (g.image && String(g.image).trim()) ? g.image : placeholderImage(g);
    var catCls = CAT[g.category] ? g.category : 'varosi';
    var doList = (g.doList && g.doList.length) ? g.doList.filter(function (x) { return x && String(x).trim(); }) : DO_DEFAULT;
    var knowList = (g.knowList && g.knowList.length) ? g.knowList.filter(function (x) { return x && String(x).trim(); }) : KNOW_DEFAULT;
    return {
      id: 'uqg-' + g.id,
      cat: CAT[catCls], catCls: catCls,
      diff: diffKey, diffLabel: g.diff || 'Közepes', diffScore: DIFF_SCORE[diffKey] || '3/5 közepes',
      audience: (catCls === 'romantikus' ? 'Pároknak' : 'Csapatoknak'),
      title: g.name || 'Névtelen játék', heroTitle: g.name || 'Névtelen játék',
      subtitle: sub,
      desc: g.desc || '',
      duration: g.dur || '2–3 óra', distance: g.distance || '—', team: team, age: g.age || '12+',
      langs: langs, price: (g.price ? g.price + ' Ft' : '—'),
      rating: (g.rating != null && g.rating !== '') ? Number(g.rating) : 4.7,
      reviews: (g.reviews != null && g.reviews !== '') ? Number(g.reviews) : 0,
      image: img,
      filters: { nehezseg: diffKey, kategoria: catCls, helyszin: 'budapest', csoport: (/^2 fő$/.test(team) ? '2' : '2-6'), idotartam: 'kozep' },
      about: g.longDesc || g.desc || '',
      doList: doList,
      knowList: knowList,
      locCity: g.loc || 'Budapest', startPoint: g.loc || 'Budapest, belváros', startAddr: g.loc || 'Budapest',
      teamText: 'Ajánlott csapatoknak és baráti társaságoknak.', teamPill: team + ' (ideális)',
      isAdmin: true
    };
  }
  /* KIKAPCSOLVA — a katalógus forrása az adatbázis (uq-catalog.js).

     Ez a blokk a böngésző uq_games_v1 tárolójából szúrt be küldetéseket
     a nyilvános listába. Amíg nem volt backend, ennek volt értelme; most
     viszont azt okozta, hogy régi, helyben maradt demó-játékok („Városliget
     Felfedező”, „Budai Vár Rejtélye”) megjelentek a publikus oldalon —
     olyanok is, amiket az adminban időközben archiváltak vagy töröltek.

     A gameToQuest() fentebb szándékosan megmarad: a régi adat alakját
     dokumentálja, és az átköltöztetéshez is hasznos referencia. */
  return;
})();
