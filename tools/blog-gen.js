/* Blog-generátor, 2. kiadás.
   Újdonságok az elsőhöz képest:
   - bejegyzésenkénti dátum (a lista időrendben áll),
   - GYIK-blokk + FAQPage strukturált adat (ez az, amit a kereső ki tud emelni),
   - „Ez is érdekelhet” blokk, hogy a cikkek hivatkozzanak egymásra.

   Az adat a blog-adatok.json-ból jön, a váz továbbra is a gyik.html-ből, hogy
   a fejléc, a lábléc és a szkriptek pontosan egyezzenek a többi oldallal. */
const fs = require('fs');
const path = require('path');

const DIR = require('path').resolve(__dirname, '..');
const OLDAL = 'https://urbanquest.hu';
const ADAT = __dirname + '/blog-adatok.json';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const HONAP = ['január', 'február', 'március', 'április', 'május', 'június',
               'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
function datumSzoveg(iso) {
  const [e, h, n] = iso.split('-').map(Number);
  return `${e}. ${HONAP[h - 1]} ${n}.`;
}

/* ---------- adat ---------- */

const BEJEGYZESEK = JSON.parse(fs.readFileSync(ADAT, 'utf8'))
  .map(b => ({ datum: '2026-08-04', perc: 5, ...b }));

/* Legújabb elöl. Azonos dátumnál a felvitel sorrendje dönt — a reverse()
   miatt a fájlban később álló kerül előre. */
const SORREND = BEJEGYZESEK.map((b, i) => ({ b, i }))
  .sort((x, y) => (y.b.datum.localeCompare(x.b.datum)) || (y.i - x.i))
  .map(x => x.b);

/* ---------- kapu: konkrét pályára nem hivatkozhat cikk ----------

   A pálya-kínálat változik: nevet kap, létszámot módosít, lekerül, új jön.
   A cikk viszont marad, és attól elavul — egy napon belül megtörtént, hogy
   három cikk „két élő pályát" írt, miközben már három volt, és az egyik
   nevet is cserélt.

   Ezért a cikkek CSAK a termék állandó tulajdonságairól írhatnak; a
   pályafüggő adat a katalógusba tartozik. Ez a kapu generáláskor elbukik,
   ha valaki visszacsempészne egy pályanevet vagy darabszámot. */
const TILTOTT = [
  [/Névtelen Jegyző/i, 'pályanév'],
  [/Duna-parti Nyomozás/i, 'pályanév'],
  [/HALOTT HOMÁR/i, 'pályanév'],
  [/KÖZPÉNZ NYOMÁBAN/i, 'pályanév'],
  [/(két|kettő|három)\s+(élő\s+)?pálya/i, 'pályaszám'],
  [/fixen\s+három/i, 'konkrét létszám'],
  [/háromfős/i, 'konkrét létszám'],
  [/pontosan három játékos/i, 'konkrét létszám'],
];

(function kapu(lista) {
  const bajok = [];
  for (const b of lista) {
    const reszek = [b.cim, b.h1, b.leiras, b.bevezeto, b.hidCim, b.hid]
      .concat(b.szakaszok.flatMap(s => [s.alcim].concat(s.bekezdesek)))
      .concat((b.gyik || []).flatMap(g => [g.k, g.v]));
    for (const txt of reszek) {
      for (const [re, mi] of TILTOTT) {
        const m = String(txt || '').match(re);
        if (m) bajok.push(`  ${b.slug} — ${mi}: "${m[0]}"`);
      }
    }
  }
  if (bajok.length) {
    console.error('A cikkek nem hivatkozhatnak konkrét pályára:\n' + bajok.join('\n'));
    process.exit(1);
  }
})(BEJEGYZESEK);

/* ---------- a váz a gyik.html-ből ---------- */

const gyik = fs.readFileSync(path.join(DIR, 'gyik.html'), 'utf8');
const fejVeg = gyik.indexOf('<main class="szoveg-lap">');
const labKezd = gyik.indexOf('</main>') + '</main>'.length;
if (fejVeg < 0 || labKezd < 7) throw new Error('nem találom a main-t a gyik.html-ben');

const VAZ_FEJ = gyik.slice(0, fejVeg);
const VAZ_LAB = gyik.slice(labKezd);

function fej(o) {
  const p = o.alszint ? '../' : '';
  let h = VAZ_FEJ;
  if (o.alszint) h = h.replace(/(href|src)="(?!https?:|mailto:|#|\/)/g, '$1="../');

  /* Aktív menüpont. A váz a gyik.html-ből jön, ahol egyik pont sem aktív —
     a blog minden oldalán viszont a Programajánló az. A csere az `alszint`
     útvonal-átírás UTÁN fut, mert addigra a href már `../blog.html`. */
  h = h.replace(/<a href="((?:\.\.\/)?blog\.html)">Programajánló<\/a>/,
                '<a href="$1" class="is-active">Programajánló</a>');

  h = h.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(o.leiras)}">`);
  h = h.replace(/<title>[^<]*<\/title>/, `<title>${esc(o.cim)} – Urban Quest</title>`);
  h = h.replace(/<link rel="stylesheet" href="(\.\.\/)?szoveges-oldal\.css\?v=1">/,
    `<link rel="stylesheet" href="${p}szoveges-oldal.css?v=1">\n<link rel="stylesheet" href="${p}blog.css?v=2">`);

  const seo = [
    `<link rel="canonical" href="${o.url}">`,
    `<link rel="icon" href="${p}favicon.svg" type="image/svg+xml">`,
    `<meta property="og:type" content="${o.ogTipus}">`,
    `<meta property="og:site_name" content="Urban Quest">`,
    `<meta property="og:locale" content="hu_HU">`,
    `<meta property="og:url" content="${o.url}">`,
    `<meta property="og:title" content="${esc(o.cim)}">`,
    `<meta property="og:description" content="${esc(o.leiras)}">`,
    `<meta property="og:image" content="${OLDAL}/assets/og-kartya.png">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(o.kep || 'Urban Quest')}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(o.cim)}">`,
    `<meta name="twitter:description" content="${esc(o.leiras)}">`,
    `<meta name="twitter:image" content="${OLDAL}/assets/og-kartya.png">`,
  ];
  if (o.ogTipus === 'article') {
    seo.push(`<meta property="article:published_time" content="${o.datum}">`);
    seo.push(`<meta property="article:section" content="${esc(o.cimke)}">`);
  }
  seo.push(`<script type="application/ld+json">\n${JSON.stringify(o.jsonld, null, 2)}\n</script>`);

  h = h.replace(/<!-- uq-seo -->[\s\S]*?<!-- \/uq-seo -->/,
    '<!-- uq-seo -->\n' + seo.join('\n') + '\n<!-- /uq-seo -->');
  return h;
}

function lab(o) {
  let h = VAZ_LAB;
  if (o.alszint) h = h.replace(/(href|src)="(?!https?:|mailto:|#|\/)/g, '$1="../');
  h = h.replace(/\n\s*<script src="(\.\.\/)?i18n\/gyik\.js\?v=1"><\/script>/, '');
  return h;
}

/* ---------- bejegyzés-oldalak ---------- */

for (const b of BEJEGYZESEK) {
  const url = `${OLDAL}/blog/${b.slug}.html`;

  const graf = [
    {
      '@type': 'BlogPosting',
      '@id': url + '#article',
      headline: b.cim,
      description: b.leiras,
      inLanguage: 'hu-HU',
      datePublished: b.datum,
      dateModified: b.datum,
      image: `${OLDAL}/assets/og-kartya.png`,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      author: { '@type': 'Organization', name: 'Urban Quest', url: OLDAL + '/' },
      publisher: {
        '@type': 'Organization', name: 'Urban Quest', url: OLDAL + '/',
        logo: { '@type': 'ImageObject', url: `${OLDAL}/assets/og-kartya.png` },
      },
      articleSection: b.cimke,
      about: { '@type': 'Place', name: 'Budapest' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Főoldal', item: OLDAL + '/' },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: OLDAL + '/blog.html' },
        { '@type': 'ListItem', position: 3, name: b.h1, item: url },
      ],
    },
  ];

  /* A GYIK-ból FAQPage lesz. Ez az a strukturált adat, amit a kereső ki tud
     emelni a találat alá — és amiből az AI-asszisztensek is szívesen idéznek.
     Csak akkor tesszük ki, ha a kérdések TÉNYLEG szerepelnek az oldalon:
     rejtett FAQ-jelölés szabálysértés. */
  if (b.gyik && b.gyik.length) {
    graf.push({
      '@type': 'FAQPage',
      '@id': url + '#gyik',
      mainEntity: b.gyik.map(g => ({
        '@type': 'Question',
        name: g.k,
        acceptedAnswer: { '@type': 'Answer', text: g.v },
      })),
    });
  }

  const torzs = b.szakaszok.map(s =>
    `  <h2>${esc(s.alcim)}</h2>\n` + s.bekezdesek.map(p => `  <p>${p}</p>`).join('\n')
  ).join('\n\n');

  const gyikBlokk = (b.gyik && b.gyik.length)
    ? `\n\n  <h2>Gyakori kérdések</h2>\n` +
      b.gyik.map(g => `  <h3>${esc(g.k)}</h3>\n  <p>${g.v}</p>`).join('\n')
    : '';

  /* Belső linkelés: a két legfrissebb MÁSIK cikk. Ettől a keresők végig tudják
     járni a blogot, és az olvasó is tovább tud lépni. */
  const masik = SORREND.filter(x => x.slug !== b.slug).slice(0, 2);
  const kapcsolodo = masik.length ? `

  <nav class="blog-tovabb" aria-label="További cikkek">
    <h2>Ez is érdekelhet</h2>
    <ul>
${masik.map(m => `      <li><a href="${m.slug}.html">${esc(m.h1)}</a></li>`).join('\n')}
    </ul>
  </nav>` : '';

  const main = `<main class="szoveg-lap">
  <a class="blog-vissza" href="../blog.html">
    <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-chevron-right" transform="rotate(180 12 12)"/></svg>
    Vissza a bloghoz
  </a>

  <h1>${esc(b.h1)}</h1>
  <p class="blog-meta">
    <svg class="ico ico-xs" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-clock"/></svg>
    <time datetime="${b.datum}">${datumSzoveg(b.datum)}</time>
    <span>&middot;</span>
    <span>${b.perc} perc olvasás</span>
  </p>

  <p class="szoveg-bevezeto">${b.bevezeto}</p>

${torzs}${gyikBlokk}

  <aside class="blog-hid">
    <h2>${esc(b.hidCim)}</h2>
    <p>${b.hid}</p>
    <a class="btn btn-primary" href="../index.html#kuldetesek">Nézd meg a küldetéseket</a>
  </aside>${kapcsolodo}
</main>`;

  const html = fej({ ...b, alszint: true, url, ogTipus: 'article',
                     jsonld: { '@context': 'https://schema.org', '@graph': graf } })
             + main + lab({ alszint: true });
  fs.writeFileSync(path.join(DIR, 'blog', b.slug + '.html'), html, 'utf8');
  console.log('kesz: blog/' + b.slug + '.html' + (b.gyik ? ' (+GYIK)' : ''));
}

/* ---------- kártyák ---------- */

function kartyak(elotag, lista) {
  return lista.map(b => `      <article class="blog-kartya">
        <span class="blog-cimke">${esc(b.cimke)}</span>
        <h2><a href="${elotag}${b.slug}.html">${esc(b.h1)}</a></h2>
        <p>${esc(b.leiras)}</p>
        <p class="blog-meta">
          <svg class="ico ico-xs" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-clock"/></svg>
          <time datetime="${b.datum}">${datumSzoveg(b.datum)}</time>
          <span>&middot;</span>
          <span>${b.perc} perc</span>
        </p>
      </article>`).join('\n');
}

/* ---------- blog.html ---------- */
{
  const url = OLDAL + '/blog.html';
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Blog',
        '@id': url + '#blog',
        name: 'Urban Quest blog',
        description: 'Programajánlók Budapestre: hétvégi és esős napi ötletek, csapatépítés, séták és döntéstámogató összehasonlítások.',
        inLanguage: 'hu-HU',
        url,
        publisher: { '@type': 'Organization', name: 'Urban Quest', url: OLDAL + '/' },
        blogPost: SORREND.map(b => ({
          '@type': 'BlogPosting',
          headline: b.cim,
          description: b.leiras,
          datePublished: b.datum,
          url: `${OLDAL}/blog/${b.slug}.html`,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Főoldal', item: OLDAL + '/' },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: url },
        ],
      },
    ],
  };

  const o = {
    cim: 'Programajánló blog — mit csináljatok Budapesten',
    leiras: 'Programajánlók Budapestre: hétvégi és esős napi ötletek, céges csapatépítés, séták és őszinte összehasonlítások. Konkrétan, kerületekkel.',
    kep: 'Urban Quest programajánló blog',
    cimke: 'Blog', datum: '2026-08-05',
    url, ogTipus: 'website', jsonld, alszint: false,
  };

  const main = `<main class="szoveg-lap">
  <h1>Programajánló</h1>
  <p class="szoveg-bevezeto">Mit csináljatok Budapesten? Konkrét ötletek hétvégére, esős napra,
     céges csapatnak és baráti társaságnak — helyszínekkel, kerületekkel, buktatókkal.</p>

  <div class="blog-lista">
${kartyak('blog/', SORREND)}
  </div>
</main>`;

  fs.writeFileSync(path.join(DIR, 'blog.html'), fej(o) + main + lab({ alszint: false }), 'utf8');
  console.log('kesz: blog.html (' + SORREND.length + ' bejegyzes)');
}

/* ---------- főoldali blokk ---------- */
fs.writeFileSync(__dirname + '/fooldal-blokk.html',
  `<!-- ===================== PROGRAMAJÁNLÓ (blog) =====================
     Alapból LÁTHATÓ. A bejelentkezett látogató elől a uq-blog.js rejti el.
     Fordítva nem lehet: ha alapból rejtett lenne, a keresőrobotok sem látnák,
     pedig épp nekik szól — a blog feladata, hogy keresésből hozzon új embert.
     A főoldalra a három LEGFRISSEBB cikk kerül; a többi a blog.html-en van. -->
<section class="section fooldal-blog" id="fooldalBlog">
  <div class="container">
    <div class="section-head">
      <h2 class="section-title">Mit csináljatok Budapesten?</h2>
      <a class="section-link" href="blog.html">
        Összes cikk
        <svg class="ico ico-sm" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-chevron-right"/></svg>
      </a>
    </div>

    <div class="blog-lista">
${kartyak('blog/', SORREND.slice(0, 3))}
    </div>
  </div>
</section>
`, 'utf8');
console.log('kesz: fooldal-blokk.html (3 legfrissebb)');

/* ---------- oldaltérkép-részlet ---------- */
fs.writeFileSync(__dirname + '/sitemap-blog.xml',
  SORREND.map(b => `  <url>
    <loc>${OLDAL}/blog/${b.slug}.html</loc>
    <lastmod>${b.datum}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n') + '\n', 'utf8');
console.log('kesz: sitemap-blog.xml reszlet');
