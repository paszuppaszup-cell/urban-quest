# Keresőoptimalizálási terv — Urban Quest

*Készült: 2026-08-05. Minden állítás mögött mérés van, nem becslés — ahol nem, ott
külön jelezve.*

Ez a lista **javaslat**, nem elvégzett munka. Amit már megcsináltunk, az a végén,
külön szakaszban van felsorolva, hogy ne keveredjen össze a kettő.

---

## Hol tartunk most

**Megvan:** saját domain HTTPS-sel, canonical + Open Graph + Twitter-kártya minden
publikus oldalon, JSON-LD (Organization, WebSite, Service, BlogPosting,
BreadcrumbList, Blog, FAQPage), `noindex` a bejelentkezéshez kötött felületeken,
`robots.txt`, `sitemap.xml`, `llms.txt`, favicon, megosztó-kártya, 6 blogcikk.

**A legnagyobb korlát nem technikai:** az oldal új, tehát a domain tekintélye
gyakorlatilag nulla, és **egyetlen külső hivatkozás sem mutat rá**. Ezen semmilyen
címke-optimalizálás nem segít. A 6 cikk a hosszú, kevésbé versengő kifejezésekre
hozhat forgalmat pár hónapon belül; a rövid, nagy kifejezésekre („programok
Budapesten") évekig nem.

---

## A) Olcsó és most megéri

### 1. A blogcikkek nem linkelnek sehova az oldalon belül
**Mérés:** mindhárom cikk kimenő hivatkozásai: egymás, a blog főoldala, és
`index.html#kuldetesek`. **Egyetlen konkrét küldetésre, a térképre vagy a GYIK-ra
sem mutat link.**

Ez két dolgot ront. A keresőrobot nem talál át a cikkekből a termék-oldalakra, tehát
azok kevesebb belső „szavazatot" kapnak. Az olvasó pedig, ha érdekelné a dolog,
egy szakasz-horgonyra érkezik, nem egy küldetésre.

**Mit kell tenni:** szabály, hogy minden cikkben legyen legalább 2 releváns belső
link a szövegtörzsben (nem csak a záró dobozban), és mutasson konkrét küldetésre,
a térképre vagy a GYIK egy kérdésére. Nem gépies linkelés: csak ott, ahol tényleg
odaillik.

### 2. A térkép a legjobb landing oldalunk lenne, és 17 szó van rajta
**Mérés:** a `terkep.html` `<main>`-jében JavaScript nélkül **106 karakter, 17 szó**
látszik. A tűk mind JS-ből jönnek.

A „hol lehet ilyet játszani Budapesten" keresésre ez az oldal lenne a természetes
találat, de a keresőnek gyakorlatilag üres. (A Google futtat JavaScriptet, de az
külön kör, később és megbízhatatlanabbul.)

**Mit kell tenni:** kerület szerinti, **statikus** lista a küldetésekről valódi
hivatkozásokkal a HTML-ben, a térkép fölé vagy alá. Ez egyszerre tartalom és belső
linkháló — a fenti 1. pont felét ingyen megoldja.

### 3. A két küldetés-oldal nyers HTML-je azonos
**Mérés:** a `kuldetes.html` forrásában a `<title>` és a leírás mindkét pályára
ugyanaz. A `kuldetes.js` a betöltött pálya szerint felülírja őket (ezt múlt héten
megcsináltuk), de a nyers válasz azonos.

**Mit kell tenni:** két külön, **kézzel írt statikus landing oldal** a két élő
pályára (pl. `kuldetes/duna-parti-nyomozas.html`). Két pályánál ez fél óra munka, és
mindent megold, amit egy bonyolult exportáló gépezet.

> Nem javaslom most: automatikus statikus export minden pályára. Két pályánál a
> gépezet drágább, mint a kézi megoldás. Akkor lesz aktuális, ha tucatnyi pálya van.

### 4. Nincs fiók nélkül megnézhető tartalom
Aki keresésből érkezik egy cikkre, majd rákattint egy küldetésre, ott regisztrációs
falba ütközik. Ez a legrosszabb felhasználói jel, amit a Google mérni tud: gyors
visszapattanás a találatra.

**Mit kell tenni:** egy fiók nélkül végignézhető ízelítő — az első állomás
története és egy feladat, statikus HTML-ként. Ez nem SEO-trükk, hanem a
visszapattanás valódi gyógyszere.

### 5. „Blog" menüpont a fejlécbe
Ma a blog csak a főoldali blokkból és a láblécből érhető el. Egy menüpont minden
oldalról átadna belső linket a blognak.

**Figyelem:** a fejléc minden oldalon külön HTML-ben van, tehát ~35 fájlt érint.
Ezen a területen párhuzamosan dolgozik egy másik munkamenet is — egyeztetés nélkül
nem nyúlok hozzá.

### 6. Saját 404-oldal
Ma nincs `404.html`. GitHub Pages ilyenkor a saját, márkázatlan lapját adja. Egy
saját 404 a blogra és a küldetésekre irányítana tovább.

### 7. Alt-szövegek és beszélő fájlnevek
Nincs rendszer rá. A képkeresés kis, de ingyenes forgalomforrás — és az alt-szöveg
akadálymentességi követelmény is, nem csak SEO.

---

## B) Nagyobb befektetés, később

### 8. Pillér-oldal: „Városi kalandjáték Budapesten — teljes útmutató"
Egy hosszú, átfogó oldal, amiről a 6 cikk kifelé és befelé is linkel. Ettől látja a
Google témagazdának az oldalt, nem szórt cikkgyűjteménynek.

**Kritikus buktató:** a pillér **nem veheti át** a meglévő cikkek célkifejezését.
Ha a pillér is a „mit csináljunk Budapesten"-re megy, akkor a saját cikkeinkkel
versenyzünk, és mindkettő rosszabbul szerepel. Egy szándék = egy URL.

### 9. Kulcsszó–URL térkép
A 6 cikk már ma közel áll egymáshoz a „program Budapesten" témában. Kell egy tábla:
melyik URL melyik keresési szándékra megy, és melyikre **nem**. Ez a 8. pont
előfeltétele.

### 10. Betűkészlet önhostolása
Ma a Google Fontsról töltjük. Ez egy külső kapcsolatot jelent minden oldalbetöltésnél,
és a betű megjelenése is késik. Önhostolva gyorsabb — a sebesség pedig rangsorolási
tényező.

### 11. Idézhető szerkezet az AI-válaszokhoz
A ChatGPT, a Perplexity és a Google AI-összefoglalója rövid, önmagában is értelmes
bekezdéseket idéz szívesen. Gyakorlatilag: minden szakasz első mondata legyen
önállóan is igaz és teljes állítás. Olcsó írásszabály.

> Ezt szándékosan nem nevezem „nagy hatásúnak" — nincs rá megbízható mérőszám.
> Annyit tudunk, hogy nem árt és olcsó.

### 12. Elavulás-kezelés
Ha egy pálya lekerül, a rá mutató oldal hazudni fog, a `sitemap.xml` 404-re mutat,
a cikkek halott linkre visznek. Kell szabály: nem játszható pálya → az oldal marad,
de „jelenleg nem elérhető" felirattal és alternatívákkal, és kikerül a sitemapből.
A dátumfüggő cikkek kapjanak látható „frissítve" dátumot.

### 13. Ellenőrző szkript (SEO-lint)
A `course_lint` mintájára: push előtt fusson le egy ellenőrzés, ami elbukik, ha egy
publikus oldalon nincs pontosan egy canonical, ha két oldalnak azonos a címe vagy a
leírása, ha `noindex` van ott, ahol nem kellene, vagy ha a sitemap egy URL-je nem
ad 200-at. **Enélkül a fenti pontok közül egyiket sem lehet utólag igazolni.**

---

## C) Ehhez a te hozzáférésed kell

### 14. Google Search Console és Bing Webmaster Tools
Ez a legfontosabb tétel az egész listán, és **én nem tudom megcsinálni** — a te
Google-fiókod kell hozzá.

- Search Console: `https://search.google.com/search-console` → tulajdon hozzáadása →
  `urbanquest.hu` → igazolás (a legegyszerűbb a DNS TXT rekord a Rackhostnál) →
  oldaltérkép beküldése: `sitemap.xml`
- Bing Webmaster: `https://www.bing.com/webmasters` → a Search Console-ból
  importálható egy kattintással

Enélkül **vakon dolgozunk**: nem tudjuk, milyen keresésekre jövünk elő, hány oldal
van indexelve, és mi hibásodott meg.

### 15. Első külső hivatkozások
Nulla tekintélyű oldalnál ez a szűk keresztmetszet. Tisztességes utak: budapesti
programajánló szerkesztőségek megkeresése, egyetemi és céges közösségi oldalak,
turisztikai fórumok — ott, ahol tényleg hasznos, amit adunk. Linkvásárlás nem opció:
büntetést von maga után.

Ehhez a te nevedben kell megkeresést írni, ezért közös munka.

---

## D) Amit NEM javaslok

| Ötlet | Miért nem |
|---|---|
| Google cégprofil | Személyes ügyfélfogadás nélkül nagy eséllyel nem vagyunk jogosultak. Elutasított kérelem, elpazarolt idő. |
| Angol nyelvű `/en/` most | Magyar helyszínhez kötött termékre az angol forgalom nem konvertál, a verseny pedig brutális. Csak akkor, ha lesz angolul játszható pálya — **és** a magyar fürt már beérett. |
| Letölthető „linkmágnes" útmutató | Nagy munka, és nulla tekintélyű oldalon, e-mail-lista nélkül senki nem találja meg. A 15. pont után van értelme, nem előtte. |
| Automatikus statikus export minden pályára | Két pályánál a gépezet drágább, mint két kézzel írt oldal (3. pont). |

---

## Egy pontosítás, amit érdemes tudni

A vizsgálat felvetette, hogy a `no-store` gyorsítótár-tiltás 13 publikus oldalunkon
komoly SEO-hiba. **Ez túlzás.** A böngészők a `<meta http-equiv="Cache-Control">`
jelölést jórészt figyelmen kívül hagyják — csak a valódi HTTP-fejléc számít, azt
pedig GitHub Pages-en nem tudjuk állítani. Tehát a jelölés se nem használ, se
érdemben nem árt: fejlesztés közben került oda, és ott maradt.

Kitakarítani érdemes, mert felesleges, és mert ahol mégis figyelembe veszik, ott
elrontja a visszatérő látogató gyorstárát. De ez takarítás, nem javítás — nem ez
fogja meghozni a látogatókat.

---

## Amit már megcsináltunk (nem teendő)

- Canonical, Open Graph, Twitter-kártya minden publikus oldalon
- `noindex` a bejelentkezéshez kötött felületeken, és a canonical levétele róluk
- JSON-LD: Organization, WebSite, Service, BlogPosting, BreadcrumbList, Blog
- `FAQPage` strukturált adat az új cikkeken (a kérdések valóban szerepelnek az
  oldalon — rejtett FAQ-jelölés szabálysértés lenne)
- `robots.txt`, `sitemap.xml`, `llms.txt`, favicon, megosztó-kártya
- A küldetés-oldal canonicalja a betöltött pálya szerint áll be
- „Ez is érdekelhet" belső linkelés a cikkek között
- 6 blogcikk, mind tényellenőrzésen átvezetve

---

## A javasolt sorrend

1. Search Console + Bing bekötése (**te**) — enélkül minden más vakon megy
2. Térkép statikus küldetés-listája (2. pont) — tartalom és belső link egyszerre
3. Két statikus küldetés-landing (3. pont)
4. Belső linkelés a cikkekben (1. pont)
5. Fiók nélküli ízelítő (4. pont)
6. SEO-lint (13. pont), hogy a fentiek ne romolhassanak el észrevétlenül
7. Kulcsszó–URL térkép, majd a pillér-oldal (9., 8.)
8. Külső hivatkozások (**közös**, 15. pont)
