/* URBAN QUEST — játszható pályák a publikus küldetésekhez
   Séma: STATIONS_SEED (állomások) + TASKS_SEED (feladatok) mintájára (jatszas.js).
   A feladatok a station NÉV alapján kötődnek az állomáshoz ugyanabban a pályában. */
window.QUEST_COURSES = {

  /* =====================================================================
     1) VÁRNEGYED NYOMÁBAN — Budai Várnegyed, történelmi séta (Könnyű)
     ===================================================================== */
  varnegyed: {
    title: 'Várnegyed Nyomában',
    stations: [
      { name: 'Bécsi kapu tér', route: 'Várnegyed Nyomában', type: 'kezdo', diff: 'Könnyű',
        loc: '1014 Budapest, Bécsi kapu tér', lat: '47.5028', lng: '19.0349',
        desc: 'A Várnegyed északi kapuja, ahonnan valaha Bécs felé indultak a szekerek. Innen indul a nyomozás a macskaköves utcákon.',
        taskShort: 'Fejtsd meg, melyik város felé néz és melyikről kapta a nevét a kapu.' },
      { name: 'Mátyás-templom', route: 'Várnegyed Nyomában', type: 'info', diff: 'Könnyű',
        loc: 'Szentháromság tér 2.', lat: '47.5019', lng: '19.0344',
        desc: 'A Szentháromság téri koronázótemplom díszes, mázas cseréptetője a Várnegyed egyik jelképe. Álljatok meg és nézzétek meg közelről a mintázatot.',
        taskShort: 'Fotózd le a színes cseréptetőt.' },
      { name: 'Halászbástya', route: 'Várnegyed Nyomában', type: 'feladat', diff: 'Könnyű',
        loc: 'Szentháromság tér', lat: '47.5024', lng: '19.0351',
        desc: 'A neoromán kilátóteraszról páratlan panoráma nyílik a Dunára és Pestre. A tornyai egy régi legendát rejtenek.',
        taskShort: 'Számold meg a bástya kőtornyait.' },
      { name: 'Dísz tér', route: 'Várnegyed Nyomában', type: 'dontes', diff: 'Közepes',
        loc: 'Dísz tér', lat: '47.4990', lng: '19.0374',
        desc: 'A Várnegyed egykori piactere, ahol több út is találkozik. Innen dönthetitek el, merre folytatjátok a felfedezést.',
        taskShort: 'Válaszd ki a következő útvonalat a tér elágazásainál.' },
      { name: 'Budavári Palota', route: 'Várnegyed Nyomában', type: 'feladat', diff: 'Közepes',
        loc: 'Szent György tér 2.', lat: '47.4962', lng: '19.0392',
        desc: 'A hatalmas királyi palota udvarai és szobrai a magyar történelem évszázadait mesélik el. Keressétek meg az Oroszlános udvart.',
        taskShort: 'Jussatok el az Oroszlános udvarba.' },
      { name: 'Savoyai-terasz', route: 'Várnegyed Nyomában', type: 'zaro', diff: 'Könnyű',
        loc: 'Budavári Palota, keleti terasz', lat: '47.4957', lng: '19.0403',
        desc: 'A palota Duna felőli teraszáról tárul fel a legszebb kilátás. Itt zárul a Várnegyed körüli nyomozás.',
        taskShort: 'Add meg a kilátás záró jelszavát.' }
    ],
    tasks: [
      { question: 'Melyik város felé néz és melyikről kapta a nevét a Bécsi kapu?', station: 'Bécsi kapu tér', route: 'Várnegyed Nyomában', type: 'szoveg', points: 25,
        cfg: { accepted: ['bécs', 'bécsi', 'vienna', 'wien'], tolerant: true, keyword: true } },
      { question: 'Készíts fotót a Mátyás-templom híres, színes cseréptetejéről!', station: 'Mátyás-templom', route: 'Várnegyed Nyomában', type: 'foto', points: 30,
        cfg: { instruction: 'A mázas cseréptető legyen jól kivehető a képen.' } },
      { question: 'Hány kőtorony díszíti a Halászbástyát? (Egy régi legenda a válasz.)', station: 'Halászbástya', route: 'Várnegyed Nyomában', type: 'kviz', points: 45,
        cfg: { options: [ { text: '7 — a hét honfoglaló vezér', correct: true }, { text: '4', correct: false }, { text: '5', correct: false }, { text: '9', correct: false } ], shuffle: true } },
      { question: 'Jussatok el a Budavári Palota Oroszlános udvarába!', station: 'Budavári Palota', route: 'Várnegyed Nyomában', type: 'gps', points: 35,
        cfg: { lat: 47.4962, lng: 19.0392, radius: 30 } },
      { question: 'Fejtsd meg a záró jelszót — amit a terasz kilátása nyújt!', station: 'Savoyai-terasz', route: 'Várnegyed Nyomában', type: 'kod', points: 40,
        cfg: { codeType: 'word', code: 'PANORAMA' } }
    ]
  },

  /* =====================================================================
     2) BELVÁROSI REJTÉLYEK — pesti belváros, nyomozás és kódok (Közepes)
     ===================================================================== */
  belvaros: {
    title: 'Belvárosi Rejtélyek',
    stations: [
      { name: 'Vörösmarty tér', route: 'Belvárosi Rejtélyek', type: 'kezdo', diff: 'Könnyű',
        loc: '1051 Budapest, Vörösmarty tér', lat: '47.4966', lng: '19.0499',
        desc: 'A pesti belváros nyüzsgő szíve, a sétálóutca kezdőpontja. A tér közepén álló szobor az első nyom.',
        taskShort: 'Derítsd ki, kiről kapta a nevét a tér.' },
      { name: 'Gerbeaud-ház', route: 'Belvárosi Rejtélyek', type: 'info', diff: 'Könnyű',
        loc: 'Vörösmarty tér 7–8.', lat: '47.4971', lng: '19.0501',
        desc: 'A tér patinás cukrászdája díszes homlokzatával régi idők hangulatát idézi. Figyeljétek meg a részleteket.',
        taskShort: 'Fotózd le a cukrászda díszes homlokzatát.' },
      { name: 'Váci utca', route: 'Belvárosi Rejtélyek', type: 'feladat', diff: 'Közepes',
        loc: 'Váci utca', lat: '47.4950', lng: '19.0519',
        desc: 'A híres sétálóutca kirakatai között rejtett jelek vezetnek tovább. Egy detektív logikus fejjel halad.',
        taskShort: 'Rakd sorrendbe a nyomozás lépéseit.' },
      { name: 'Párisi udvar', route: 'Belvárosi Rejtélyek', type: 'feladat', diff: 'Közepes',
        loc: 'Ferenciek tere 10.', lat: '47.4936', lng: '19.0558',
        desc: 'A csodálatos üvegtetős passzázs olyan, mintha egy másik korba lépnétek. A nyom a bejáratnál folytatódik.',
        taskShort: 'Jussatok el a Párisi udvar bejáratához.' },
      { name: 'Ferenciek tere', route: 'Belvárosi Rejtélyek', type: 'zaro', diff: 'Közepes',
        loc: 'Ferenciek tere', lat: '47.4939', lng: '19.0562',
        desc: 'A belvárosi nyomozás végállomása. Itt áll össze a korábbi jelekből a megfejtés.',
        taskShort: 'Add meg a rejtély végső kódját.' }
    ],
    tasks: [
      { question: 'Kiről kapta a nevét a Vörösmarty tér?', station: 'Vörösmarty tér', route: 'Belvárosi Rejtélyek', type: 'kviz', points: 40,
        cfg: { options: [ { text: 'Vörösmarty Mihály költő', correct: true }, { text: 'Petőfi Sándor', correct: false }, { text: 'Arany János', correct: false }, { text: 'Jókai Mór', correct: false } ], shuffle: true } },
      { question: 'Készíts fotót a Gerbeaud-ház díszes homlokzatáról!', station: 'Gerbeaud-ház', route: 'Belvárosi Rejtélyek', type: 'foto', points: 30,
        cfg: { instruction: 'A cukrászda homlokzata legyen a kép közepén.' } },
      { question: 'Rakd helyes sorrendbe egy jó nyomozás lépéseit!', station: 'Váci utca', route: 'Belvárosi Rejtélyek', type: 'puzzle', points: 45,
        cfg: { subtype: 'order', items: ['Nyom', 'Tanú', 'Bizonyíték', 'Megoldás'] } },
      { question: 'Menjetek el a Párisi udvar díszes bejáratához!', station: 'Párisi udvar', route: 'Belvárosi Rejtélyek', type: 'gps', points: 35,
        cfg: { lat: 47.4936, lng: 19.0558, radius: 30 } },
      { question: 'Fejtsd meg a rejtély kulcsszavát a korábbi állomások alapján!', station: 'Ferenciek tere', route: 'Belvárosi Rejtélyek', type: 'kod', points: 50,
        cfg: { codeType: 'word', code: 'BELVAROS' } }
    ]
  },

  /* =====================================================================
     3) ALAGÚT 7 — föld alatti, rejtélyes útvonal Deák tértől (Nehéz)
     ===================================================================== */
  alagut: {
    title: 'Alagút 7',
    stations: [
      { name: 'Deák Ferenc tér', route: 'Alagút 7', type: 'kezdo', diff: 'Közepes',
        loc: '1052 Budapest, Deák Ferenc tér', lat: '47.4976', lng: '19.0542',
        desc: 'A város három metróvonalának találkozópontja. Egy titokzatos üzenet a föld alá vezet — kezdődik az Alagút 7.',
        taskShort: 'Azonosítsd a világörökségi Földalatti vonalat.' },
      { name: 'Földalatti Vasúti Múzeum', route: 'Alagút 7', type: 'info', diff: 'Közepes',
        loc: 'Deák téri aluljáró', lat: '47.4972', lng: '19.0547',
        desc: 'A régi alagút falába vájt kis múzeum a kontinens egyik legrégebbi földalatti vasútjának történetét őrzi.',
        taskShort: 'Derítsd ki a Földalatti megnyitásának évét.' },
      { name: 'Aluljáró rendszer', route: 'Alagút 7', type: 'dontes', diff: 'Nehéz',
        loc: 'Deák téri aluljárók', lat: '47.4966', lng: '19.0555',
        desc: 'A föld alatti folyosók labirintusa több irányba ágazik. Egy zárt ajtón a 7-es jelölés — a kód nyitja a továbbjutást.',
        taskShort: 'Üsd be az Alagút 7 zárkódját, majd válassz irányt.' },
      { name: 'Gozsdu udvar', route: 'Alagút 7', type: 'feladat', diff: 'Nehéz',
        loc: 'Király utca 13. – Dob utca 16.', lat: '47.4982', lng: '19.0601',
        desc: 'Az összekötött belső udvarok átjáró-rendszere olyan, mint egy felszín feletti alagút. A nyom a mélyére vezet.',
        taskShort: 'Jussatok le a Gozsdu udvar átjárórendszerébe.' },
      { name: 'Király utca kapualj', route: 'Alagút 7', type: 'zaro', diff: 'Nehéz',
        loc: 'Király utca, rejtett kapualj', lat: '47.4998', lng: '19.0620',
        desc: 'Egy jelöletlen kapualj mögött ér véget az útvonal. Itt kell összeraknotok a föld alatti szakaszok sorrendjét.',
        taskShort: 'Rakd sorrendbe a föld alatti út szakaszait.' }
    ],
    tasks: [
      { question: 'Hányas jelzésű (M?) a sárga, világörökségi Földalatti vonal?', station: 'Deák Ferenc tér', route: 'Alagút 7', type: 'szoveg', points: 40,
        cfg: { accepted: ['m1', '1', 'egyes', 'sárga'], tolerant: true, keyword: true } },
      { question: 'Melyik évben nyílt meg a budapesti Földalatti (a kontinens első villamosított metrója)?', station: 'Földalatti Vasúti Múzeum', route: 'Alagút 7', type: 'kviz', points: 60,
        cfg: { options: [ { text: '1896', correct: true }, { text: '1870', correct: false }, { text: '1919', correct: false }, { text: '1950', correct: false } ], shuffle: true } },
      { question: 'Add meg az Alagút 7 zárkódját a jelölés alapján!', station: 'Aluljáró rendszer', route: 'Alagút 7', type: 'kod', points: 55,
        cfg: { codeType: 'num', code: '0748' } },
      { question: 'Ereszkedjetek le a Gozsdu udvar átjárórendszerébe!', station: 'Gozsdu udvar', route: 'Alagút 7', type: 'gps', points: 45,
        cfg: { lat: 47.4982, lng: 19.0601, radius: 30 } },
      { question: 'Rakd helyes sorrendbe a föld alatti útvonal szakaszait!', station: 'Király utca kapualj', route: 'Alagút 7', type: 'puzzle', points: 55,
        cfg: { subtype: 'order', items: ['Lejárat', 'Peron', 'Alagút', 'Kijárat'] } }
    ]
  },

  /* =====================================================================
     4) ROMANTIKUS KALAND — páros séta a Bazilika környékén (Könnyű)
        FIGYELEM: heroTitle = 'Romantikus Kaland', ezért route is ez!
     ===================================================================== */
  szerelem: {
    title: 'Romantikus Kaland',
    stations: [
      { name: 'Szent István Bazilika', route: 'Romantikus Kaland', type: 'kezdo', diff: 'Könnyű',
        loc: '1051 Budapest, Szent István tér 1.', lat: '47.5008', lng: '19.0538',
        desc: 'A város legnagyobb temploma előtti tér a kaland kezdőpontja. Fogjátok meg egymás kezét, és induljatok.',
        taskShort: 'Tudjátok meg, milyen magas a Bazilika.' },
      { name: 'Zrínyi utca', route: 'Romantikus Kaland', type: 'info', diff: 'Könnyű',
        loc: 'Zrínyi utca', lat: '47.5006', lng: '19.0522',
        desc: 'A rövid sétálóutca tengelyében pontosan a Bazilika kupolája keretezi a látványt — a kedvenc fotós helyszín.',
        taskShort: 'Nevezzétek meg, mi látszik az utca tengelyében.' },
      { name: 'Szabadság tér', route: 'Romantikus Kaland', type: 'feladat', diff: 'Könnyű',
        loc: 'Szabadság tér', lat: '47.5028', lng: '19.0512',
        desc: 'A zöld tér interaktív szökőkútja nyáron a párok kedvence. Sétáljatok el a vízjátékhoz.',
        taskShort: 'Menjetek a tér szökőkútjához.' },
      { name: 'Duna-korzó', route: 'Romantikus Kaland', type: 'feladat', diff: 'Könnyű',
        loc: 'Duna-korzó, pesti alsó rakpart', lat: '47.4990', lng: '19.0492',
        desc: 'A folyóparti sétány a budai panorámával a romantika csúcspontja. Álljatok meg egy közös pillanatra.',
        taskShort: 'Fotózzátok le a kilátást a Duna felett.' },
      { name: 'Vigadó tér', route: 'Romantikus Kaland', type: 'zaro', diff: 'Könnyű',
        loc: 'Vigadó tér', lat: '47.4962', lng: '19.0490',
        desc: 'A Duna-parti tér a kaland romantikus zárópontja. Egy titkos üzenet vár rátok a végén.',
        taskShort: 'Fejtsétek meg a záró üzenetet.' }
    ],
    tasks: [
      { question: 'Milyen magas a Szent István Bazilika? (A Parlamenttel azonos magasság.)', station: 'Szent István Bazilika', route: 'Romantikus Kaland', type: 'kviz', points: 40,
        cfg: { options: [ { text: '96 méter', correct: true }, { text: '65 méter', correct: false }, { text: '120 méter', correct: false }, { text: '45 méter', correct: false } ], shuffle: true } },
      { question: 'Melyik híres épület kupolája látszik a Zrínyi utca tengelyében?', station: 'Zrínyi utca', route: 'Romantikus Kaland', type: 'szoveg', points: 30,
        cfg: { accepted: ['bazilika', 'szent istván bazilika'], tolerant: true, keyword: true } },
      { question: 'Sétáljatok el a Szabadság tér interaktív szökőkútjához!', station: 'Szabadság tér', route: 'Romantikus Kaland', type: 'gps', points: 35,
        cfg: { lat: 47.5028, lng: 19.0512, radius: 30 } },
      { question: 'Készítsetek közös fotót a Duna-korzón, háttérben a budai panorámával!', station: 'Duna-korzó', route: 'Romantikus Kaland', type: 'foto', points: 35,
        cfg: { instruction: 'Legyetek rajta ketten, mögöttetek a Dunával.' } },
      { question: 'Fejtsétek meg a záró üzenetet — a szív jelképét!', station: 'Vigadó tér', route: 'Romantikus Kaland', type: 'kod', points: 45,
        cfg: { codeType: 'word', code: 'SZERELEM' } }
    ]
  },

  /* =====================================================================
     5) DANGER ZONE: DEADLY CRISIS — pörgős válságszimuláció (Extrém)
     ===================================================================== */
  dangerzone: {
    title: 'Danger Zone: Deadly Crisis',
    stations: [
      { name: 'Erzsébet tér', route: 'Danger Zone: Deadly Crisis', type: 'kezdo', diff: 'Nehéz',
        loc: '1051 Budapest, Erzsébet tér', lat: '47.4979', lng: '19.0527',
        desc: 'Vészhelyzet a belvárosban! Az óra ketyeg, a rendszert azonnal aktiválni kell. Innen indul a válság elhárítása.',
        taskShort: 'Aktiváld a rendszert időre!' },
      { name: 'Deák tér vészpont', route: 'Danger Zone: Deadly Crisis', type: 'info', diff: 'Nehéz',
        loc: 'Deák Ferenc tér', lat: '47.4976', lng: '19.0546',
        desc: 'A központi csomóponton egy zárt terminál villog. A vészkódot gyorsan be kell ütni, mielőtt lejár az idő.',
        taskShort: 'Írd be a vészkódot!' },
      { name: 'Bajcsy-Zsilinszky út', route: 'Danger Zone: Deadly Crisis', type: 'dontes', diff: 'Extrém',
        loc: 'Bajcsy-Zsilinszky út', lat: '47.4995', lng: '19.0538',
        desc: 'Kereszteződés a nyomás alatt: két útvonal közül kell villámgyorsan választani. Előbb a jelszó a folytatáshoz.',
        taskShort: 'Add meg a válság kódnevét, majd válassz útvonalat.' },
      { name: 'Andrássy út 1.', route: 'Danger Zone: Deadly Crisis', type: 'feladat', diff: 'Extrém',
        loc: 'Andrássy út eleje', lat: '47.5002', lng: '19.0560',
        desc: 'A világörökségi sugárút elején a következő zárat kell hatástalanítani. Minden másodperc számít.',
        taskShort: 'Válaszolj gyorsan a világörökségi kérdésre.' },
      { name: 'Oktogon', route: 'Danger Zone: Deadly Crisis', type: 'zaro', diff: 'Extrém',
        loc: 'Oktogon', lat: '47.5063', lng: '19.0638',
        desc: 'A nyolcszögletű tér a válság végpontja. Egyetlen kód választja el a várost a katasztrófától.',
        taskShort: 'Üsd be a leszerelő kódot!' }
    ],
    tasks: [
      { question: 'Aktiváld a rendszert: koppints 20-at 5 másodperc alatt!', station: 'Erzsébet tér', route: 'Danger Zone: Deadly Crisis', type: 'gyors', points: 40,
        cfg: { game: 'tap', time: 5, target: 20 } },
      { question: 'Üsd be a vészkódot, mielőtt lejár az idő!', station: 'Deák tér vészpont', route: 'Danger Zone: Deadly Crisis', type: 'kod', points: 55,
        cfg: { codeType: 'num', code: '2077' } },
      { question: 'Add meg a válság kódnevét a folytatáshoz!', station: 'Bajcsy-Zsilinszky út', route: 'Danger Zone: Deadly Crisis', type: 'szoveg', points: 50,
        cfg: { accepted: ['deadly crisis', 'crisis', 'deadly', 'válság'], tolerant: true, keyword: true } },
      { question: 'Melyik évben lett az Andrássy út (és a Földalatti) UNESCO világörökség?', station: 'Andrássy út 1.', route: 'Danger Zone: Deadly Crisis', type: 'kviz', points: 60,
        cfg: { options: [ { text: '2002', correct: true }, { text: '1987', correct: false }, { text: '1996', correct: false }, { text: '2011', correct: false } ], shuffle: true } },
      { question: 'Üsd be a leszerelő kódot — az európai egységes segélyhívó szám!', station: 'Oktogon', route: 'Danger Zone: Deadly Crisis', type: 'kod', points: 65,
        cfg: { codeType: 'num', code: '112' } }
    ]
  },

  /* =====================================================================
     6) ERDEI KÜLDETÉS — természetjárás és tájékozódás a Pilisben (Közepes)
     ===================================================================== */
  erdo: {
    title: 'Erdei Küldetés',
    stations: [
      { name: 'Pilisszentkereszt, buszforduló', route: 'Erdei Küldetés', type: 'kezdo', diff: 'Könnyű',
        loc: '2098 Pilisszentkereszt', lat: '47.6875', lng: '18.8987',
        desc: 'A falu szélén, az erdő kapujában kezdődik a túra. Hagyjátok magatok mögött a várost és a jelzett ösvényt kövessétek.',
        taskShort: 'Fotózd le a túra kezdőpontját az erdő szélén.' },
      { name: 'Dera-szurdok', route: 'Erdei Küldetés', type: 'info', diff: 'Közepes',
        loc: 'Dera-szurdok bejárata', lat: '47.6820', lng: '18.9052',
        desc: 'A patak vájta sziklás szurdok a Pilis egyik legszebb szakasza. Álljatok meg és hallgassátok a víz csobogását.',
        taskShort: 'Derítsd ki a Pilis legmagasabb pontjának magasságát.' },
      { name: 'Ösvény-elágazás', route: 'Erdei Küldetés', type: 'dontes', diff: 'Közepes',
        loc: 'Jelzett ösvény, elágazás', lat: '47.6788', lng: '18.9105',
        desc: 'Az ösvény kettéválik: két jelzés két irányba vezet. A tájékozódás most a csapaton múlik.',
        taskShort: 'Érd el az elágazást, majd válassz ösvényt.' },
      { name: 'Patak-átkelő', route: 'Erdei Küldetés', type: 'feladat', diff: 'Nehéz',
        loc: 'Patak-átkelő a Dera-patakon', lat: '47.6758', lng: '18.9152',
        desc: 'A gázlónál köveken kell átkelni a patakon. A biztonságos átkelésnek megvan a helyes sorrendje.',
        taskShort: 'Rakd sorrendbe a biztonságos átkelés lépéseit.' },
      { name: 'Kilátó-tisztás', route: 'Erdei Küldetés', type: 'zaro', diff: 'Közepes',
        loc: 'Kilátópont, erdei tisztás', lat: '47.6730', lng: '18.9200',
        desc: 'A fák közül kilépve tágas tisztás és páratlan panoráma fogad. Itt ér véget az erdei küldetés.',
        taskShort: 'Fotózd le a panorámát a tisztásról.' }
    ],
    tasks: [
      { question: 'Készíts fotót a túra kezdőpontjáról, az erdő széléről!', station: 'Pilisszentkereszt, buszforduló', route: 'Erdei Küldetés', type: 'foto', points: 25,
        cfg: { instruction: 'Legyen a képen a jelzett ösvény vagy az erdő pereme.' } },
      { question: 'Milyen magas a Pilis legmagasabb pontja, a Pilis-tető?', station: 'Dera-szurdok', route: 'Erdei Küldetés', type: 'kviz', points: 45,
        cfg: { options: [ { text: '756 méter', correct: true }, { text: '512 méter', correct: false }, { text: '402 méter', correct: false }, { text: '1014 méter', correct: false } ], shuffle: true } },
      { question: 'Érjétek el a jelzett ösvény elágazását!', station: 'Ösvény-elágazás', route: 'Erdei Küldetés', type: 'gps', points: 35,
        cfg: { lat: 47.6788, lng: 18.9105, radius: 40 } },
      { question: 'Rakd helyes sorrendbe a patakon való biztonságos átkelés lépéseit!', station: 'Patak-átkelő', route: 'Erdei Küldetés', type: 'puzzle', points: 45,
        cfg: { subtype: 'order', items: ['Megállás a parton', 'Mélység felmérése', 'Stabil kövek keresése', 'Óvatos átkelés'] } },
      { question: 'Fotózd le a panorámát a záró tisztásról!', station: 'Kilátó-tisztás', route: 'Erdei Küldetés', type: 'foto', points: 40,
        cfg: { instruction: 'A kilátás és a táj legyen a kép fő eleme.' } }
    ]
  }

};
