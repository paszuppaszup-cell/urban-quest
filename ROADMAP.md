# Urban Quest — útiterv

**Készült:** 2026-08-04 · **Céldátum:** 2026-09-30 (8 hét)

---

## 1. Mi ez a termék

**Közösségi platform, ahol a játékosok maguk készítenek városi küldetéseket.**

Nem pályakatalógus, amit a tulajdonos tölt fel. A termék maga az **alkotói eszköz**;
a saját pályák csak azt mutatják meg, hogy néz ki egy jó pálya.

### Bevételi modell — „A" változat

Mindenkinek **saját Patreonja**: a tulajdonosnak is, az alkotóknak is. A pénz
sosem folyik át a platformon.

Ez tudatos döntés, és azért ez lett:

- A Patreon **nem tud** bevételt megosztani. Nincs piactér-API, nincs 70/30
  automatikus szétosztás. Ami a Patreon API-val megy: bejelentkezés és
  támogatói szint ellenőrzése — vagyis **jogosultság, nem pénzmozgás**.
- Valódi megosztáshoz **Stripe Connect** kellene: a pénz a platformon megy át,
  a kifizetés automatikus. Ez viszont szerződést, adózási előkészületet és
  jelentős fejlesztést jelent — és **nincs mit osztani**, amíg nincs bevétel.
- Ezért: most nulla pénzügyi fejlesztés. Ha lesz forgalom, a „B" változat
  (Stripe Connect, 70/30) bármikor ráépíthető.

> Az adózás és a szerződések kérdésében szakemberrel kell beszélni, mielőtt
> bárkinek pénz megy ki. Ez nem fejlesztési feladat.

### Terepi ellenőrzés — a készítő fotózza

Ha egy feladat a helyszínen leolvasható adatra épül (évszám, darabszám,
felirat), az alkotónak **fotót kell feltöltenie** róla. A fotó egyszerre
bizonyíték és a jóváhagyás alapja.

Ez a döntés két dolgot old meg egyszerre:

1. **Senkinek nem kell kimozdulnia** az ellenőrzésért. A jóváhagyó a képet
   nézi, nem a helyszínt.
2. **Megszűnik a földrajzi korlát.** Ha valaki Szegeden készít pályát és
   fotózza a helyszínt, az ugyanúgy ellenőrizhető, mint egy budapesti.

---

## 2. Hol tartunk ma (mért adat)

| | |
|---|---|
| Regisztrált felhasználó | 3 |
| Élő pálya / vázlat | 3 / 1 |
| Állomás / aktív feladat | 35 / 27 |
| Elindult menet / befejezett | 12 / 9 |
| Csapat | 2 |

**Ami kész:** szerkesztő, pálya-varázsló, verziózott publikálás, elágazás,
csapatlánc (szétváló váltófeladat élő táblával), ranglista, kedvencek,
látogatói mérés, offline sor, csapatjáték.

**A vendég-alkotó HÁTTERE KÉSZ** — nem-admin fiókkal végigmérve (2026-08-04):

| Próba | Eredmény |
|---|---|
| Pálya létrehozása | ✅ sikerült, `review=piszkozat`, ő a szerző |
| Állomás / feladat mentése | ✅ sikerült |
| **Más** pályájának szerkesztése | ✅ elutasítva — „ez nem a te pályád" |
| Publikálás | ✅ elutasítva — „csak admin publikálhat" |
| Beadás 5 állomás alatt | ✅ elutasítva |

- ✅ `review` állapotgép: `sajat / piszkozat / beadva / elfogadva / visszakuldve`
- ✅ `assert_can_edit_course()` / `assert_can_edit_task()` — a `save_*` és
  `delete_*` RPC-kben ez váltja ki az `is_admin()`-t. Beadás után az alkotó
  **nem szerkeszthet** tovább.
- ✅ `save_course` nem-admin ága fiókonként **5 pályára korlátoz** (szemetelés ellen)
- ✅ `submit_course`: 5–20 állomás követelmény
- ✅ trigger, ami nem-adminnál `piszkozat` állapotot kényszerít

> A közvetlen tábla-írás továbbra is csak adminnak megy (`*_admin_all` RLS) —
> ez helyes: minden alkotói írás a SECURITY DEFINER RPC-ken keresztül,
> ellenőrzötten történik.

**AZ ALKOTÓI FELÜLET IS LÉTEZIK — és élesben van.**

Repó-leltár (2026-08-04), nem feltevés:

| Fájl | Mi ez |
|---|---|
| `alkoto.html` + `.js` | „A pályáim" — lista, „Beküldés jóváhagyásra" gombbal |
| `alkoto-palya.html` + `.js` | állomás-szerkesztő |
| `alkoto-feladat.html` + `.js` | feladat-szerkesztő (42 KB) |
| `alkoto.css` | 28 KB saját stílus |
| `jovahagyas.html` + `.js` + `.css` | jóváhagyási sor |

Mind a tíz fájl kint van a deploy-mappában is. A `course_lint` be van kötve
az `alkoto-feladat.js`-be és az `alkoto-palya.js`-be.

A pálya-varázslón **nincs kliensoldali admin-kapu** — se átirányítás, se
blokkolás. Kijelentkezve is betölt (öt lépés, működő térkép); csak az
admin-fejlécet viseli, ami egy alkotónak zavaró és fölösleges.

### Ami TÉNYLEG hiányzik — öt dolog

- ❌ **Fotó-bizonyíték** — sehol nincs rá kód
- ❌ **Patreon** — nulla találat az egész repóban
- ❌ **Fordítás 5 nyelvre** — csak drótvázakban szerepel, valós kód nincs
- ❌ **Beépített AI-segéd** — nulla találat
- ❌ **Alkotói statisztika** — nulla találat

### Módszertani tanulság

Ebben a tervezési körben **háromszor** terveztem meg olyasmit, ami már kész
volt: az alkotói írási jogot, a jogi oldalak bekötését és az alkotói
felületet. Mindháromszor a statikus fájlok grepelése vagy a feltevéseim
alapján állítottam hiányt, és a mérés vagy a leltár cáfolt.

**Szabály innentől: minden feladat előtt repó-leltár és futtatott ellenőrzés,
és csak utána terv.**

---

## 3. Munkacsoportok

| | Munkacsoport | Mi a dolga |
|---|---|---|
| **MCS-1** | **Alkotói eszköz** | A játékos végig tudjon vinni egy pályát: létrehozás → állomások → feladatok → fotó-bizonyíték → beadás |
| **MCS-2** | **Jóváhagyási sor** | A tulajdonos átnézi: sztori, feladatok, fotók → elfogad / visszaküld megjegyzéssel |
| **MCS-3** | **Alkotói profil** | Nyilvános alkotói oldal, saját Patreon-link, a pályái |
| **MCS-4** | **Minta-pályák** | Elég saját pálya, hogy látszódjon, mi a jó — nem 6+, hanem ami a mércét mutatja |
| **MCS-5** | **Terjesztés** | Alkotó-toborzás és játékos-szerzés: rövid videók, csoportok, meghívó |
| **MCS-6** | **Termék-higiénia** | Nyitott végek: varázsló-import hiánya, ranglista-névkeverés, Google-belépés |
| **MCS-7** | **Mérés** | Tölcsér: látogató → regisztrált → elindult → befejezett → alkotó → Patreon-kattintás |

### Ügynökök, amiket futtatok

- **helyszín-kutató** — OSM/Overpass, ellenőrizhető tények
- **pálya-szerző** — sztori + feladatok a meglévő készségekkel
- **képgyártó** — borítóképek
- **szövegíró** — Patreon-oldal, közösségi média, alkotói útmutató
- **minőség-ellenőr** — ellenérv-panel (ahogy a csapatláncnál)
- **fejlesztő** — a kódmunka

---

## 4. Sorrend

A sorrendet egy szabály vezérli: **alkotó nélkül nincs tartalom, tartalom
nélkül nincs játékos, játékos nélkül nincs támogató.**

### 1–3. hét — az alkotói eszköz működjön

- Írási jog megnyitása a saját, még be nem adott pályára (RLS + RPC-k)
- Alkotói felület: pálya, állomás, feladat — az admin szerkesztő szűkített,
  biztonságos változata
- Fotó-bizonyíték feltöltés feladatonként
- Beadás → jóváhagyási sor

### 4–5. hét — jóváhagyás és alkotói arc

- Jóváhagyó felület: sor, előnézet, fotók, elfogad / visszaküld
- Alkotói profil + saját Patreon-link
- Alkotói útmutató (mitől jó egy pálya)

### 6–7. hét — tartalom és bizonyíték

- Saját minta-pályák a mérce felállítására
- Első külső alkotó végigkísérése — ez a valódi próba
- Termék-higiénia

### 8. hét — indulás

- Patreon-oldal tartalma (szintek, szövegek)
- Terjesztési anyagok
- Mérés élesítése

---

## 5. Kockázatok

| Kockázat | Miért valós | Mit teszünk |
|---|---|---|
| **Nem lesz alkotó** | 3 regisztrált felhasználó van. Egy alkotói platform üresen semmit nem ér. | Az első 3–5 alkotót személyesen kell megszerezni. Ez nem fejlesztés. |
| **Az alkotói eszköz túl nehéz** | Az admin szerkesztő fejlesztőknek készült. Egy játékos elakad rajta. | Szűkített, vezetett felület; a varázsló az alap, nem a teljes szerkesztő. |
| **Rossz minőségű pályák** | Bárki beadhat bármit. | Jóváhagyási sor + kötelező fotó-bizonyíték + alkotói útmutató. |
| **Visszaélés a fotókkal** | Idegen kép, régi kép, más pályájáról származó kép. | A jóváhagyó látja; hosszabb távon EXIF/idő-ellenőrzés. |
| **Pénz-elvárás** | Az alkotók bevételt várhatnak, ami elmarad. | Az első naptól őszintén kommunikálni: saját Patreon, a platform nem fizet. |

---

## 6. Eldöntött szabályok

| Kérdés | Döntés |
|---|---|
| Ki lehet alkotó? | **Bárki, aki regisztrált.** A minőséget a jóváhagyási sor védi, nem a belépés. |
| Fotó-bizonyíték | **Nem kötelező, de kérjük.** A jóváhagyó dönt, ha nincs. |
| Ki látja a fotót? | **Csak a jóváhagyó.** A képen ott a leolvasandó adat — a játékosnak elárulná a megoldást. |
| Földrajz | **Bárhol.** A fotó-bizonyíték miatt a jóváhagyáshoz nem kell utazni. |
| Nyelv | Magyar az alap, **automata fordítás 5 előre beállított nyelvre**. |

### A fordítás határa — fontos

**A megoldást nem fordítjuk.** Ha a feladat az, hogy olvasd le a szobor
talapzatáról a nevet, a helyes válasz `IV. Béla` marad akkor is, ha a játékos
angolul játszik: a köztéri táblán magyarul áll.

- **Fordítandó:** pálya- és állomásnév, leírás, sztori, feladat kérdése, tippek
- **NEM fordítandó:** elfogadott válaszok, kódok, QR-tartalom

A válaszok sózott SHA-256 hashként utaznak a csomagban, tehát ezt
**közzétételkor** kell eldönteni, nem futásidőben.

### Nyelvek és a fordítás módja

**Nyelvek:** magyar (alap) + **angol, német, francia, spanyol, olasz**.
A rendszerben ezekhez már van zászló-ikon és fordítási keret.

**A fordítás jóváhagyáskor készül, kézzel (én), nem gépi API-val.**

Indok: a játékszöveg a gépi fordítás legrosszabb esete. A rejtvények
szójátékon állnak, és azt a gép némán megöli. Példa a saját pályánkról:
*„OKTOGON → nyolcszög → 8 oldal"* — angolul az állomásnév marad, de a
felismerés elvész, és a feladat megoldhatatlanná válik. Ezt senki nem veszi
észre, amíg egy játékos el nem akad a terepen.

Kézi körrel a szójáték vagy átmenthető, vagy **kiírható, hogy ez a feladat
nem fordítható**. Ezért:

- A pálya jelölheti magát **„csak magyarul"** pályának. Jobb vállalni, hogy
  nincs angol változat, mint kiadni egy törött rejtvényt.
- **Váltás gépi API-ra akkor, ha havi 20+ pálya érkezik.** A tárolási forma
  ugyanaz, tehát a csere zárt változtatás lesz. Addig fizetni érte pazarlás.

### Elakadt beadás

Ha az alkotó nem javítja ki a visszaküldött pályát, **a tulajdonos átveheti és
befejezheti**. Ehhez az alkotónak a **beadáskor előre bele kell egyeznie** —
ezt a beadás gombnál ki kell írni, nem utólag kérni.

---

## 7. Az alkotói élmény

### Varázsló + beépített AI + haladó szerkesztő

Három rétegű eszköz:

1. **Varázsló** — lépésről lépésre végigvezet, hogy az első siker percekben legyen
2. **Beépített AI** — az alkotó beír pár gondolatot, egy gombnyomásra megkapja a
   megszövegezett sztorit és állomásleírásokat
3. **Haladó szerkesztő** — aki többet akar (elágazás, csapatlánc, finomhangolás),
   megnyithatja a teljes felületet

> **Az AI-kulcs kezelése:** a hívás szerveroldali függvényben fut, a kulcs
> Supabase-titokként él. A kulcsot **te állítod be**, nekem sosem kell elküldened,
> és a böngészőbe sem kerül. Ez havidíjas — minden generálás pénzbe kerül.

### Automatikus ellenőrzés beadás előtt

Mind a négy réteg fut, MÉG mielőtt a pálya hozzád érne:

| Réteg | Mit néz |
|---|---|
| **Technikai teljesség** | hiányzó megoldás, koordináta nélküli állomás, névtelen állomás, feladat nélküli helyszín — a `course_lint` már tudja, csak be kell kötni |
| **Tartalmi tisztesség** | trágárság, gyűlöletbeszéd, reklám, személyes adat a szövegben |
| **Biztonsági kockázat** | forgalmas út, vízpart, sín, magánterület — nem tilt, rákérdez |
| **Játék-minőség** | túl rövid leírás, egyforma nehézség, hiányzó érzelmi ív (AI-elemzés) |

Az alkotó tehát **még beadás előtt** látja, mi hiányzik — nem utólag szégyenül meg.

### Alkotói statisztika — részletes, de név nélkül

Az alkotó látja: hányan indították, hányan fejezték be, mennyi idő alatt,
**melyik állomáson akadtak el**, hol lassultak le.

Amit **nem** lát: nevet, életkort, egyedi játékost.

Indok — ez nem óvatoskodás, hanem két tény:

- **Életkort ma nem gyűjt a rendszer** (`profiles`: user_id, display_name,
  avatar). Ehhez új személyes adatot kellene bekérni, ami a regisztrációnál
  visszatart.
- A játékos nevét kiadni egy harmadik félnek — az alkotónak — személyes adat
  továbbítása, hozzájárulással és tájékoztatóval. Kis számoknál ráadásul az
  „összesítés" sem véd: *„1 játékos, 34 éves, Budapest"* név nélkül is
  azonosít egy embert.

A javításhoz szükséges információ **mind benne van** a névtelen változatban.

---

### Hol találja meg a játékos, hogy ő is alkothat

**Mind a három helyen**, mert más-más embert érnek el:

| Hely | Kit hoz |
|---|---|
| **Főoldal, saját szekció** | a tömeget — azt is, aki még egy pályát sem játszott |
| **Fiókom** | a visszatérőket, akik már körülnéztek |
| **Pálya végén, az összegzőn** | a leglelkesebbeket — akik MÁR tudják, milyen egy jó pálya |

> Az összegzős belépő a legjobb minőségű alkotókat hozza, de a legszűkebb
> merítésből: eddig összesen **9 befejezett menet** volt. A főoldali szekció
> ezért nem elhagyható.

---

## 8. A projekt egésze — nem csak a termék

Négy terület épül egymásra. Bármelyik hiányzik, a mögötte lévő sem ér semmit:

**Termék → Tartalom → Elérés → Bevétel**

Alattuk két alap, ami nem hoz növekedést, de bármelyik megállíthatja a projektet:
**Jog** és **Üzemeltetés**.

### Állapot (2026-08-04)

| Terület | Hol tart |
|---|---|
| **Termék** | A motor kész. Az alkotói felület hiányzik. |
| **Tartalom** | Három élő pálya. Alkotók nélkül nem nő. |
| **Elérés** | **Nincs. Három regisztrált felhasználó.** Ez a szűk hely. |
| **Bevétel** | A Patreon-oldal még nem létezik. |
| **Jog** | Adatvédelem és ászf megvan — de a főoldalról nem érhető el. Alkotói megállapodás nincs. |
| **Üzemeltetés** | Fut, egészséges. A médiatár viszont nyilvános. |

### Amit az üzemeltetési átvizsgálás hozott

- **10 hibaszintű biztonsági jelzés — egyik sem szivárogtat.** A négy
  `auth.users`-t érintő nézet (`v_admin_users`, `v_admin_events`,
  `v_admin_latogato_stat`, `v_review_queue`) SECURITY DEFINER, ezért a
  vizsgáló megjelöli — de **mindegyik belül `is_admin()`-nel szűr**.
  Nem-admin felhasználóval leellenőrizve: mind a négy **nulla sort ad**,
  e-mail-cím nem látszik. Ez tehát ismert és rendben lévő állapot.
- **A médiatár (`uq-media`) nyilvános és listázható.** A borítóképeknek ez
  helyes. A **bizonyító fotóknak nem** — azokon ott a megoldás. Külön privát
  tároló kell, aláírt hivatkozással.
- **A kiszivárgott-jelszó elleni védelem ki van kapcsolva** a Supabase-ben.
  Ez egy kapcsoló a vezérlőpulton — a te lépésed, egy perc.

---

## 9. Elérés — heti ritmus

**Heti 3–5 óra, rendszeresen.** Konkrét beosztás nélkül ez az idő elpárolog,
ezért így osztjuk fel:

| Mikor | Ki | Mennyi | Mit |
|---|---|---|---|
| Hétfő | **én** | — | 2 videó-forgatókönyv, 1 csoportposzt-szöveg, képi anyag |
| Egy hétköznap este | **te** | 2 óra | felveszed a 2 rövid videót |
| Hétvégén | **te** | 1 óra | kiposztolod, és válaszolsz a hozzászólásokra |
| Folyamatosan | **te** | 0,5 óra | 2–3 személyes megkeresés |

**Amit én adok:** forgatókönyv, felirat, hashtag, csoportonként külön hangnemű
szöveg, borítókép, rövid vágási utasítás.

**Amit csak te tudsz:** felvenni, kiposztolni, és megszólítani embereket.
Fiókot nem hozok létre és nem posztolok a nevedben.

### Az első mérföldkő nem a technika

**Az első 3–5 alkotót személyesen kell megszerezned.** Egy alkotói platform
üresen semmit nem ér, és az első alkotók sosem maguktól jönnek. Ha szeptember
30-ig megvan öt ember, aki beadott egy pályát, a projekt él — akkor is, ha
néhány funkció csúszik.

---

## 10. A cég

| Kérdés | Döntés |
|---|---|
| **Vállalkozási forma** | Még nincs — **indulásig intézed**. A bevételt csak akkor kapcsoljuk be, amikor a keret megvan. A fejlesztést nem állítja meg. |
| **Domain** | **Megveszed az `urbanquest.hu`-t.** A GitHub Pages ráállítását én csinálom, a vásárlást te. |
| **Felelősség** | Feltételekben rendezzük: az alkotó beadáskor kijelenti, hogy a tartalom a sajátja; a játékos indításkor látja, hogy közterületen saját felelősségére játszik. A szöveget megírom — jogi véleményezés a te dolgod. |
| **Moderálás** | A beadások **sorban állnak, látható várakozási idővel**. Az alkotó tudja, hányadik és mikorra számíthat válaszra. |

> **A domain nem kozmetika.** A lábléc ma `info@urbanquest.hu`-t hirdet
> kapcsolatként, de **a domainre nincs DNS-bejegyzés** — az arra a címre írt
> levél sehová nem érkezik meg. Egy oldalnál, ami pénzt és tartalmat kér,
> a halott elérhetőség hitelrontó, és az ÁSZF-hez is működő kapcsolat kell.

---

## 11. Terjeszkedés

| Kérdés | Döntés | Miért |
|---|---|---|
| **Katalógus rendezőelve** | **Városonként, választóval** | Nem kér helyzetet a látogatótól, és rendezett marad, ha sok városból jön pálya. Kezelni kell az üres város esetét. |
| **Céges csapatépítés** | **Most nem** | Más termék: ajánlat, számla, időpont-egyeztetés, helyszíni szervezés. Félig megépítve rosszabb, mint sehogy. Szeptember után. |
| **Mobilalkalmazás** | **Marad a böngésző, de telepíthetővé tesszük** | A játékos a kezdőképernyőre teheti és ikonról indítja — áruház és engedélyeztetés nélkül. Kis munka, nagy különbség: ami az ikonra kerül, azt újra megnyitják. |
| **Alkotói közösség** | **Külső csoport** (Discord vagy Facebook) | Azonnal indulhat, nulla fejlesztés, és az emberek már ismerik. A közösség nem a saját oldalon él — ez tudatos csere. |

> **Az üres város kezelése kötelező.** Ha valaki Debrecent választ és nulla
> pálya van, az csalódás. Ilyenkor mutatni kell, mi van a legközelebb —
> és fel kell ajánlani, hogy ő csináljon egyet.

---

## 12. A termék — a maradék szabályok

| Kérdés | Döntés | Miért |
|---|---|---|
| **Éles pálya módosítása** | Szerkesztheti, de **újra be kell adnia** | Az éles verzió változatlanul fut, amíg jóvá nem hagyod — a játékosok alatt sosem változik meg a pálya menet közben. |
| **AI-korlát** | **Napi néhány generálás fiókonként** (javaslat: 10) | Egy pálya megírásához bőven elég, visszaéléshez kevés. A számla kiszámítható marad, és a határt előre kiírjuk. |
| **Varázsló mélysége** | **Öt lépés, de a nehezek kihagyhatók** | Minden lépés látszik, de a sztori és az érzelmi ív átugorható — az AI kitölti. Aki akar, elmélyül; aki nem, halad. |
| **Elavulás** | **A játékos jelentheti: „ez már nincs ott"** | A hibát azok találják meg, akik ott vannak — ingyen és azonnal. Három jelentés után a pálya jelzést kap, és szólunk az alkotónak. |

> **Az elavulás nem elméleti.** Lefestik a táblát, elviszik a szobrot,
> felújítanak. Egy év múlva néhány pálya megoldhatatlan lesz — és a beragadt
> játékos frusztrációja ilyenkor hasznos jelzéssé alakítható.

---

## 13. Az alkotói út végigmérve (2026-08-04)

Nem-admin fiókkal, szerepkör-megszemélyesítéssel. **15/15 lépés átment.**

| Fázis | Mit próbáltam | Eredmény |
|---|---|---|
| **alkotó** | pálya létrehozása | ok |
| | 5 állomás + 3 feladat | ok |
| | `course_lint` minőségi kapu | tiszta, nincs blokkoló |
| | beküldés | ok, `review=beadva`, időbélyeggel |
| | szerkesztés **beadás után** | helyesen **zárolva** |
| **admin** | megjelenik a jóváhagyási sorban | igen |
| | visszaküldés megjegyzéssel | ok, `review=visszakuldve` |
| **alkotó** | szerkesztés visszaküldés után | engedi |
| | újra beküldés | ok |
| **admin** | elfogadás | `elfogadva`, `status=pub`, **van élő verzió** |
| **játékos** | megjelenik a katalógusban | igen |

**Biztonság külön mérve.** A `v_my_courses` nézeten át a nem-admin sem
módosítani, sem törölni nem tud idegen pályát (az RLS véd, hiába van
grant a nézeten); a jóváhagyási sor nem-adminnak **nulla sor**.

**Felület.** Mind a három alkotói oldal hibátlanul tölt, **saját alkotói
fejléccel** (Játékok · Pályák · Feladatok · Vissza a fiókomhoz) — nem az
admin konzollal —, rendes belépés-átirányítással és üres állapottal.

> **Amit ez NEM bizonyít:** a bejelentkezett felület viselkedését. Ahhoz
> belépés kell. A szerveroldal viszont bizonyított, tehát ha a felületen
> hiba van, az megjelenítési hiba lesz, nem adatvesztés.

### Egy eltérés a tervhez képest

A tervbe azt írtuk, hogy az alkotó **az ötlépéses varázslót** kapja. A valóság
más: az alkotói út **önálló, háromoldalas szerkesztő**
(`alkoto` → `alkoto-palya` → `alkoto-feladat`), és a varázslóra **egyáltalán
nem hivatkozik** — az külön, admin ág maradt. El kell dönteni, hogy a két
eszközt összekötjük-e, vagy a varázsló marad a tulajdonos eszköze.

---

## 13/b. Mi van hátra

**Kész és bizonyítva:** alkotói jogosultság, alkotói felület, jóváhagyási sor,
technikai megfelelési ellenőrzés, jogi oldalak elérhetősége, a teljes
alkotói út.

### Termék

| # | Feladat | Miért kell |
|---|---|---|
| 10 | Bizonyító fotó | ez váltja ki a terepi ellenőrzést |
| 19 | Privát tároló a fotóknak | a mostani médiatár nyilvános |
| 12 | Alkotói profil + Patreon-link | enélkül nincs bevétele az alkotónak |
| 14 | Beépített AI-segéd | ez hozza a befejezett első pályát |
| 13 | Fordítás 5 nyelvre | a magyar piac szűk |
| 16 | Alkotói statisztika | enélkül nincs második pálya |
| 25 | „Ez már nincs ott" jelentés | a katalógus karbantartása |
| 26 | Városválasztó | különben szétszóródik a katalógus |
| 27 | Telepíthetőség | ami az ikonra kerül, azt újra megnyitják |
| 24 | Admin-fejléc levétele | egy alkotónak nem admin-menü való |
| 23 | Alkotói út végigmérése | a felület létezik, de senki nem járta végig |

### Cég

| # | Feladat | Ki csinálja |
|---|---|---|
| 28 | `urbanquest.hu` beállítása | te veszed meg, én állítom be |
| 18 | Alkotói megállapodás | én írom, jogász nézze át |
| 22 | Adatkezelő + megőrzési idő | az adataidat te adod meg |
| — | Vállalkozási forma | te, indulásig |
| — | Kiszivárgott-jelszó védelem | te, egy kapcsoló a Supabase-ben |

### Elérés és bevétel

| # | Feladat |
|---|---|
| 20 | Heti terjesztési csomag (hétfőnként tőlem) |
| 21 | Patreon-oldal tartalma |
| — | Alkotói csoport (Discord vagy Facebook) — te hozod létre |
| — | **Az első 3–5 alkotó személyes megszerzése** |

---

## 14. Nyitott döntések

*(nincs — minden eldöntve)*
