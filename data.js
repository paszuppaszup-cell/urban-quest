/* =========================================================
   URBAN QUEST — küldetés-adatok + közös kártya-renderelő
   ========================================================= */
window.QUEST_ORDER = ['varnegyed', 'belvaros', 'alagut', 'szerelem', 'dangerzone', 'erdo'];

window.QUESTS = {
  varnegyed: {
    id: 'varnegyed',
    cat: 'Városi', catCls: 'varosi',
    diff: 'konnyu', diffLabel: 'Könnyű', diffScore: '2/5 könnyű',
    audience: 'Csapatoknak',
    title: 'Várnegyed Nyomában',
    heroTitle: 'Várnegyed Nyomában',
    subtitle: 'Fedezd fel a történelem titkait!',
    desc: 'Sétáljatok végig a Budai Várnegyed macskaköves utcáin, oldjatok meg izgalmas rejtvényeket, és fedezzétek fel a rejtett történelmi részleteket, amelyek mellett a legtöbben elsétálnak.',
    duration: '2–3 óra', distance: '3.2 km', team: '2–6 fő', age: '8+ év',
    langs: ['hu'], price: '10.990 Ft', rating: 4.8, reviews: 87,
    image: 'assets/quest-varnegyed.svg',
    filters: { nehezseg: 'konnyu', kategoria: 'varosi', helyszin: 'buda', csoport: '2-6', idotartam: 'kozep' },
    about: 'Egy izgalmas történelmi nyomozás a Budai Várban, ahol a régi korok titkai elevenednek meg. Középkori legendák, elfeledett szimbólumok és látványos panoráma vár rátok.',
    doList: ['Rejtvények megfejtése a helyszínen', 'Történelmi nyomok felkutatása', 'Rejtett szobrok és címerek megtalálása', 'Fotófeladatok a kilátóknál'],
    knowList: ['Kényelmes sétával teljesíthető', 'Bármikor megállhattok pihenni', 'Offline is játszható', 'Családbarát útvonal'],
    locCity: 'Budapest, I. kerület', startPoint: 'Bécsi kapu tér', startAddr: '1014 Budapest, Bécsi kapu tér',
    teamText: 'Kiválóan alkalmas családoknak és baráti társaságoknak.', teamPill: '2–6 fő (ideális)'
  },

  belvaros: {
    id: 'belvaros',
    cat: 'Városi', catCls: 'varosi',
    diff: 'kozepes', diffLabel: 'Közepes', diffScore: '3/5 közepes',
    audience: 'Csapatoknak',
    title: 'Belvárosi Rejtélyek',
    heroTitle: 'Belvárosi Rejtélyek',
    subtitle: 'Titkos jelek, elfeledett történetek.',
    desc: 'A pesti belváros nyüzsgő utcái tele vannak titkokkal. Kövessétek a rejtett jeleket, fejtsétek meg a kódokat, és tárjátok fel a város elfeledett történeteit.',
    duration: '2.5–3.5 óra', distance: '4.1 km', team: '2–6 fő', age: '10+ év',
    langs: ['hu'], price: '9.990 Ft', rating: 4.7, reviews: 64,
    image: 'assets/quest-belvaros.svg',
    filters: { nehezseg: 'kozepes', kategoria: 'varosi', helyszin: 'belvaros', csoport: '2-6', idotartam: 'hosszu' },
    about: 'Egy detektívtörténet a pesti belvárosban, ahol minden sarok új rejtvényt tartogat. Titkos jelek, kódok és meglepő fordulatok vezetnek végig a városon.',
    doList: ['Kódok és rejtjelek feltörése', 'Titkos jelek követése', 'Elfeledett történetek felfedezése', 'Logikai feladványok megoldása'],
    knowList: ['Kényelmes sétával teljesíthető', 'Bármikor megállhattok pihenni', 'Offline is játszható', 'Eső esetén is teljesíthető'],
    locCity: 'Budapest, V. kerület', startPoint: 'Vörösmarty tér', startAddr: '1051 Budapest, Vörösmarty tér',
    teamText: 'Ideális baráti társaságoknak és családoknak.', teamPill: '2–6 fő (ideális)'
  },

  alagut: {
    id: 'alagut',
    cat: 'Városi', catCls: 'varosi',
    diff: 'nehez', diffLabel: 'Nehéz', diffScore: '4/5 nehéz',
    audience: 'Csapatoknak',
    title: 'Alagút 7',
    heroTitle: 'Alagút 7',
    subtitle: 'Merülj le a föld alatti titkokba.',
    desc: 'Egy titokzatos üzenet a föld alá vezet. Fejtsétek meg a rejtvényeket, kövessétek a nyomokat a sötét folyosókon, és derítsétek ki, mit rejt az Alagút 7.',
    duration: '3–4 óra', distance: '5.8 km', team: '2–6 fő', age: '14+ év',
    langs: ['hu'], price: '9.990 Ft', rating: 4.9, reviews: 52,
    image: 'assets/quest-alagut.svg',
    filters: { nehezseg: 'nehez', kategoria: 'varosi', helyszin: 'budapest', csoport: '2-6', idotartam: 'hosszu' },
    about: 'Egy feszült, rejtélyekkel teli kaland a város föld alatti világában. Sötét folyosók, elrejtett kódok és egy megfejtésre váró titok vár azokra, akik mernek lemerülni.',
    doList: ['Összetett rejtvények megoldása', 'Nyomok követése a föld alatt', 'Rejtett kódok megfejtése', 'Csapatmunka próbatételei'],
    knowList: ['Közepes tempójú séta', 'Néhány szakasz zártabb helyen', 'Offline is játszható', 'Kalandvágyóknak ajánlott'],
    locCity: 'Budapest, belváros', startPoint: 'Deák Ferenc tér', startAddr: '1052 Budapest, Deák Ferenc tér',
    teamText: 'A közös fejtörés a nagyobb csapatoknak áll igazán jól.', teamPill: '2–6 fő (ideális)'
  },

  szerelem: {
    id: 'szerelem',
    cat: 'Romantikus', catCls: 'romantikus',
    diff: 'konnyu', diffLabel: 'Könnyű', diffScore: '2/5 könnyű',
    audience: 'Pároknak',
    title: 'Szerelem Nyomában',
    heroTitle: 'Romantikus Kaland',
    subtitle: 'Egy romantikus városi kaland kettesben.',
    desc: 'Fedezzétek fel együtt a város rejtett helyeit, oldjatok meg izgalmas feladványokat, és éljetek át felejthetetlen pillanatokat. A küldetés tele van romantikus meglepetésekkel.',
    duration: '2–3 óra', distance: '2.8 km', team: '2 fő', age: '16+ év',
    langs: ['hu', 'en', 'de'], price: '9.990 Ft', rating: 5.0, reviews: 73, fav: true,
    image: 'assets/quest-szerelem.svg',
    filters: { nehezseg: 'konnyu', kategoria: 'romantikus', helyszin: 'budapest', csoport: '2', idotartam: 'kozep' },
    about: 'Egy romantikus városi kaland, ahol minden állomás közelebb visz egymáshoz. Rejtett üzenetek, közös feladványok és különleges helyszínek várnak rátok.',
    doList: ['Rejtélyek megfejtése együtt', 'Titkos helyszínek felfedezése', 'Romantikus fotófeladatok', 'Közös emlékek gyűjtése'],
    knowList: ['Kényelmes sétával teljesíthető', 'Bármikor megállhattok pihenni', 'Offline is játszható', 'Eső esetén is teljesíthető'],
    locCity: 'Budapest, belváros', startPoint: 'Szent István Bazilika', startAddr: '1051 Budapest, Szent István tér 1.',
    teamText: 'Ez a küldetés kifejezetten pároknak készült.', teamPill: '2 fő (ideális)'
  },

  dangerzone: {
    id: 'dangerzone',
    cat: 'Városi', catCls: 'varosi',
    diff: 'extrem', diffLabel: 'Extrém', diffScore: '5/5 extrém',
    audience: 'Csapatoknak',
    title: 'Danger Zone: Deadly Crisis',
    heroTitle: 'Danger Zone: Deadly Crisis',
    subtitle: 'A város sorsa a te kezedben van.',
    desc: 'Vészhelyzet a városban: kevés az idő, és minden döntés számít. Fejtsétek meg a kódokat, hárítsátok el a válságot, és mentsétek meg a várost, mielőtt lejár az idő.',
    duration: '3.5–4.5 óra', distance: '6.3 km', team: '2–6 fő', age: '16+ év',
    langs: ['hu', 'en'], price: '12.990 Ft', rating: 4.8, reviews: 62,
    image: 'assets/quest-dangerzone.svg',
    filters: { nehezseg: 'extrem', kategoria: 'varosi', helyszin: 'budapest', csoport: '2-6', idotartam: 'hosszu' },
    about: 'A legextrémebb küldetésünk: egy pörgős, akciódús válságszimuláció, ahol az óra ketyeg. Feszültség, gyors döntések és igazi csapatpróba a város utcáin.',
    doList: ['Időre megoldandó feladványok', 'Kódok és zárak feltörése', 'Válsághelyzetek kezelése', 'Gyors, közös döntéshozatal'],
    knowList: ['Gyorsabb tempójú útvonal', 'Erős koncentrációt igényel', 'Offline is játszható', '16 éves kortól ajánlott'],
    locCity: 'Budapest, belváros', startPoint: 'Erzsébet tér', startAddr: '1051 Budapest, Erzsébet tér',
    teamText: 'A nyomás alatti csapatmunka a nagyobb társaságoknak való.', teamPill: '2–6 fő (ideális)'
  },

  erdo: {
    id: 'erdo',
    cat: 'Természet', catCls: 'termeszet',
    diff: 'kozepes', diffLabel: 'Közepes', diffScore: '3/5 közepes',
    audience: 'Csapatoknak',
    title: 'Erdei Küldetés',
    heroTitle: 'Erdei Küldetés',
    subtitle: 'Természet, kihívások, felfedezés.',
    desc: 'Hagyjátok magatok mögött a várost, és induljatok felfedezőútra az erdőben. Természetes nyomok, rejtett ösvények és izgalmas próbatételek várnak a friss levegőn.',
    duration: '3–4 óra', distance: '7.2 km', team: '2–6 fő', age: '8+ év',
    langs: ['hu'], price: '10.990 Ft', rating: 4.6, reviews: 41,
    image: 'assets/quest-erdo.svg',
    filters: { nehezseg: 'kozepes', kategoria: 'termeszet', helyszin: 'pilis', csoport: '2-6', idotartam: 'hosszu' },
    about: 'Egy természetközeli kaland az erdő mélyén, ahol a tájékozódás és a felfedezés a főszereplő. Patakok, ösvények és rejtett pontok vezetnek végig a túrán.',
    doList: ['Természetes nyomok olvasása', 'Rejtett ösvények felfedezése', 'Tájékozódási feladatok', 'Fotózás a legszebb pontokon'],
    knowList: ['Túracipő ajánlott', 'Hosszabb, természeti útvonal', 'Offline is játszható', 'Családbarát kihívások'],
    locCity: 'Pilis, Budapest mellett', startPoint: 'Pilisszentkereszt, buszforduló', startAddr: '2098 Pilisszentkereszt',
    teamText: 'Remek választás családoknak és aktív baráti köröknek.', teamPill: '2–6 fő (ideális)'
  }
};

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

  const filled = Math.max(0, Math.min(5, Math.round(q.rating)));
  let stars = '';
  for (let i = 0; i < 5; i++) stars += `<svg class="star${i < filled ? '' : ' is-empty'}" aria-hidden="true"><use href="#i-star"/></svg>`;

  const langStr = q.langs.map(l => l.toUpperCase()).join('/');
  const f = q.filters || {};
  const favCls = q.fav ? ' is-on' : '';

  return `
  <article class="quest-card acc-${accKey}" data-id="${q.id}"
    data-nehezseg="${f.nehezseg || ''}" data-kategoria="${f.kategoria || ''}" data-helyszin="${f.helyszin || ''}"
    data-csoport="${f.csoport || ''}" data-idotartam="${f.idotartam || ''}"
    role="link" tabindex="0" aria-label="${esc(q.title)}">
    <div class="quest-media">
      <img src="${q.image}" alt="${esc(q.title)}" loading="lazy">
      <span class="badge badge-${badgeCls}">${badgeLabel}</span>
      <button class="fav${favCls}" type="button" aria-label="Kedvencekhez adás" aria-pressed="${q.fav ? 'true' : 'false'}">${ico('i-heart', 'ico ico-sm')}</button>
    </div>
    <div class="quest-body">
      <h3 class="quest-title">${esc(q.title)}</h3>
      <p class="quest-tagline">${ico(tagIcon, 'ico ico-xs')}<span>${esc(q.subtitle)}</span></p>
      <p class="quest-desc">${esc(q.desc)}</p>
      <div class="quest-rating">
        <span class="stars">${stars}</span>
        <span class="quest-reviews">(${q.reviews})</span>
      </div>
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
