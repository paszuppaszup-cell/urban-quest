/* A Támogatás oldal generálása a gyik.html vázából, hogy a fejléc, a lábléc
   és a szkriptek pontosan egyezzenek a többi szöveges oldallal. */
const fs = require('fs');
const path = require('path');
const DIR = require('path').resolve(__dirname, '..');
const OLDAL = 'https://urbanquest.hu';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const gyik = fs.readFileSync(path.join(DIR, 'gyik.html'), 'utf8');
const fejVeg = gyik.indexOf('<main class="szoveg-lap">');
const labKezd = gyik.indexOf('</main>') + '</main>'.length;
let FEJ = gyik.slice(0, fejVeg);
let LAB = gyik.slice(labKezd);

const CIM = 'Támogatás — miért ingyenes az Urban Quest?';
const LEIRAS = 'A küldetések ingyenesek. Itt leírjuk, miből működik az oldal, és hogyan juthat pénzhez az, aki a pályát írta.';

FEJ = FEJ.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(LEIRAS)}">`);
FEJ = FEJ.replace(/<title>[^<]*<\/title>/, `<title>${esc(CIM)} – Urban Quest</title>`);

const jsonld = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': OLDAL + '/tamogatas.html',
      name: CIM, description: LEIRAS, inLanguage: 'hu-HU',
      isPartOf: { '@id': OLDAL + '/#weboldal' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Főoldal', item: OLDAL + '/' },
        { '@type': 'ListItem', position: 2, name: 'Támogatás', item: OLDAL + '/tamogatas.html' },
      ],
    },
  ],
};

const seo = [
  `<link rel="canonical" href="${OLDAL}/tamogatas.html">`,
  `<link rel="icon" href="favicon.svg" type="image/svg+xml">`,
  `<meta property="og:type" content="website">`,
  `<meta property="og:site_name" content="Urban Quest">`,
  `<meta property="og:locale" content="hu_HU">`,
  `<meta property="og:url" content="${OLDAL}/tamogatas.html">`,
  `<meta property="og:title" content="${esc(CIM)}">`,
  `<meta property="og:description" content="${esc(LEIRAS)}">`,
  `<meta property="og:image" content="${OLDAL}/assets/og-kartya.png">`,
  `<meta property="og:image:width" content="1200">`,
  `<meta property="og:image:height" content="630">`,
  `<meta property="og:image:alt" content="Urban Quest — támogatás">`,
  `<meta name="twitter:card" content="summary_large_image">`,
  `<meta name="twitter:title" content="${esc(CIM)}">`,
  `<meta name="twitter:description" content="${esc(LEIRAS)}">`,
  `<meta name="twitter:image" content="${OLDAL}/assets/og-kartya.png">`,
  `<script type="application/ld+json">\n${JSON.stringify(jsonld, null, 2)}\n</script>`,
];
FEJ = FEJ.replace(/<!-- uq-seo -->[\s\S]*?<!-- \/uq-seo -->/,
  '<!-- uq-seo -->\n' + seo.join('\n') + '\n<!-- /uq-seo -->');

/* a GYIK saját fordítófájlja itt nem kell; a támogatás-modul viszont igen */
LAB = LAB.replace(/\n\s*<script src="i18n\/gyik\.js\?v=1"><\/script>/, '');
LAB = LAB.replace('</body>', '<script src="uq-tamogatas.js?v=1"></script>\n</body>');

const main = `<main class="szoveg-lap">
  <h1>Támogatás</h1>
  <p class="szoveg-bevezeto">A küldetések ingyenesek, és azok is maradnak. Itt leírjuk,
     miből működik az oldal, és hogyan juthat pénzhez az, aki a pályát írta — mert
     ez a kettő nem ugyanaz.</p>

  <h2>Miért ingyenes?</h2>
  <p>Mert egy városi küldetés akkor ér valamit, ha el is indultok. Egy fizetőkapu a
     legrosszabb pillanatban állna az útba: amikor még nem tudjátok, tetszeni fog-e.
     Inkább legyen ingyenes, és aki jól járt vele, az utólag döntsön.</p>
  <p>Nem kezelünk pénzt: nincs kosár, nincs bankkártya-adat, nincs számlázás.
     A támogatás a Patreonon keresztül megy, ami külön szolgáltatás — oda kattintva
     elhagyod ezt az oldalt.</p>

  <h2>Mibe kerül ez nekünk?</h2>
  <p>Domain, adatbázis, képtárolás, és a legtöbb: az idő, amiből a pályák születnek.
     Egy pálya megírása nem egy délután — helyszínt kell bejárni, feladatot kitalálni,
     kipróbálni, javítani, mert ami az asztalnál működik, az az utcán gyakran nem.</p>

  <div id="patreonVar" class="szoveg-kiemelt">
    <p><b>A Patreon-oldalunk még készül.</b> Addig a legtöbb, amit tehetsz, nem pénz:
       játssz végig egy küldetést, és mondd el annak, akit szerinted érdekelne.
       Egy új játékos többet ér most, mint egy adomány.</p>
  </div>

  <div id="patreonDoboz" class="szoveg-kiemelt" hidden>
    <h2>Támogatom az Urban Questet</h2>
    <p>A támogatás az oldal működését fedezi: a domaint, a kiszolgálót és az új
       pályák elkészítését. Bármikor lemondható.</p>
    <a class="btn btn-primary" href="#" target="_blank" rel="noopener noreferrer nofollow">
      Tovább a Patreonra
    </a>
  </div>

  <h2>És az, aki a pályát írta?</h2>
  <p>Az alkotó <b>saját Patreonján</b> kaphat támogatást, közvetlenül. Ez nem
     udvariasságból van így: a Patreon nem tud piactérként működni, nincs benne
     automatikus bevételmegosztás. Ezért nem ígérünk az alkotóknak részesedést —
     ehelyett a saját linkjüket tesszük ki oda, ahol a legtöbbet ér.</p>
  <p>A küldetés végén, amikor a csapat épp befejezte a pályát, megjelenik az alkotó
     támogatás-gombja — ha megadta a linkjét. Ez az egyetlen hely a játékban, ahol
     pénzről szó esik, és szándékosan a legvégén van.</p>

  <h2>Te is írhatsz pályát</h2>
  <p>A küldetéseket nem csak mi készítjük. Aki ismer egy városrészt és van hozzá
     kedve, megírhatja a sajátját; jóváhagyás után bárki játszhat vele. A profilodnál
     megadhatod a saját Patreon-linkedet, és onnantól a pályád végén a te gombod
     jelenik meg.</p>
  <p><a href="gyik.html">A GYIK-ben</a> megtalálod, hogyan működik a játék, és mire
     számíts, ha belevágsz.</p>
</main>`;

fs.writeFileSync(path.join(DIR, 'tamogatas.html'), FEJ + main + LAB, 'utf8');
console.log('kesz: tamogatas.html');
