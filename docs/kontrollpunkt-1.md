# Kontrollpunkt 1 – publicering och prestanda

Datum: 2026-11-25. Fas 0–1 enligt byggplanen. Kontrollpunkten är godkänd när både de uppmätta
gränserna och Mårtens egen bedömning på sin dator är godkända. Därefter skrivs plan 2 (kartvisaren).

**Status: godkänd 2026-11-25.** Mårten godkände zoomen med `vy=3006&transition=0&preload=99&reserv=1`
och CARTO som bakgrund. Besluten står i designdokumentet under "Beslut vid kontrollpunkt 1".
Kvar att bekräfta: −9990 i flundrakartan mot PBS-underlaget.

## Sammanfattning

- **Alla 75 befintliga kartor är publicerade** på <https://slu-marten.github.io/fiskkartor/data/katalog/katalog.json>,
  med 67 kontinuerliga råfiler. De 16 kartorna från 2025 utan original ligger dolda i katalogen.
  Katalogen följer schemat och en omkörning ändrar ingenting (74 oförändrade + 1 rättad).
- **Prestandagränserna klaras** för 25 m-filerna, även med strypt nät och rendering på CPU (tabeller nedan).
- **Din första bedömning (2026-11-25):** zoomen hackar ibland och blinkar mellan upplösningar.
  Mätningen nedan visar att orsaken främst är omprojiceringen från SWEREF 99 TM till Web Mercator
  i webbläsaren. Utan den blir zoomen jämn. Kontrollpunkten avgörs när du har jämfört varianterna.
- **Att avgöra vid kontrollen:** vilken zoomvariant som känns bäst, hur översikterna (MODE) ser ut
  utzoomat, och −9990 i flundrakartan.

**Prova själv:**
<https://slu-marten.github.io/fiskkartor/perf.html?cog=data/test/abborre_klassad.tif&roll=klassad&epsg=3006&res=25>
(klassad abborrekarta i 25 m, hela ostkusten). Kontinuerlig variant:
<https://slu-marten.github.io/fiskkartor/perf.html?cog=data/test/abborre_kontinuerlig.tif&roll=kontinuerlig&epsg=3006&res=25>.
Sidan har ingen bakgrundskarta; den mäter bara kartlagret. Håll muspekaren över kartan för att se värdet nere till höger.

## Prestanda för 25 m-filerna

Mätt med Playwright i Chromium, nätet strypt till 40 ms latens och 1,25 MB/s. Gränser: första vy och
inzoomad kall laddning ≤ 4000 ms, högst 8 MB för första vyn, panorering ≤ 1500 ms.

| Test | Punkt (lat, lon) | ms | tifKlartMs | MB | Panorering ms | Renderare |
|---|---|---:|---:|---:|---:|---|
| Första vy, klassad | hela kartan | 2670 | 986 | 0,07 | – | llvmpipe (CPU) |
| Första vy, kontinuerlig | hela kartan | 2630 | 1724 | 0,20 | – | llvmpipe (CPU) |
| Inzoomat z=12, klassad | 59,33, 18,90 | 3878 | 2290 | 0,33 | 841 | llvmpipe (CPU) |
| Inzoomat z=12, klassad | 60,70, 17,30 | 3167 | 1342 | 0,20 | 827 | llvmpipe (CPU) |
| Inzoomat z=12, klassad | 56,90, 16,50 | 3163 | 1259 | 0,13 | 798 | llvmpipe (CPU) |

`ms` är tiden från att sidan börjar laddas till att kartan är färdigritad, `tifKlartMs` tiden till sista
svaret från COG-filen. Skillnaden är mest rendering, som här görs på CPU (llvmpipe). Med ett riktigt
grafikkort går den delen snabbare. Rådata: `docs/kontrollpunkt-1-rapport.json`.

**Avvikelse:** mätningen gjordes mot exakt samma filer som ligger på Pages, men utlästa av en lokal
Range-server. Byggmiljön når inte `*.github.io`. Att Pages svarar rätt kontrollerades i din webbläsare:
`Range: bytes=0-15` gav `206` med `Content-Range`, och prestandasidan hämtade COG-filen med 206-svar.
BLOCKSIZE=256 behövde inte provas, eftersom alla gränser klarades med 512.

## Zoomen: jämförelse av varianter

Mätt med `webb/scripts/zoom-mat.mts`: 12 hjulsteg (cirka fyra zoomnivåer) vid två kustpunkter,
strypt nät, rendering på CPU. "Längsta paus" är den längsta tiden mellan två bildrutor (60 bilder
per sekund = 17 ms; över 100 ms märks som hack).

| Variant | Längsta paus | 95:e percentilen | Klar efter zoom | Prova |
|---|---:|---:|---:|---|
| A. Nu: 3006-fil i Web Mercator-vy (omprojiceras) | 250–317 ms | 50–167 ms | 3,6–5,0 s | [länk](https://slu-marten.github.io/fiskkartor/perf.html?cog=data/test/abborre_klassad.tif&roll=klassad&epsg=3006&res=25) |
| C. 3006-fil i SWEREF 99 TM-vy | 67–150 ms | 50–67 ms | 3,0–3,4 s | [länk](https://slu-marten.github.io/fiskkartor/perf.html?cog=data/test/abborre_klassad.tif&roll=klassad&epsg=3006&res=25&vy=3006) |
| D. Som C, utan intoning och med grövre rutor kvar | 83–167 ms | 67 ms | 3,3–3,5 s | [länk](https://slu-marten.github.io/fiskkartor/perf.html?cog=data/test/abborre_klassad.tif&roll=klassad&epsg=3006&res=25&vy=3006&transition=0&preload=99) |
| E. Fil publicerad i Web Mercator, Web Mercator-vy | 67 ms | 50 ms | 3,0–3,4 s | [länk](https://slu-marten.github.io/fiskkartor/perf.html?cog=data/test/abborre_klassad_3857.tif&roll=klassad&epsg=3857&res=25) |

C och E är lika jämna, båda för att webbläsaren inte omprojicerar. De skiljer sig i vad de innebär för plan 2:

- **C, vy i SWEREF 99 TM:** kartfilerna publiceras som i dag. Men bakgrundskartan måste då finnas i
  3006 eller vara en rasterkarta som kan omprojiceras. OpenFreeMap (vektor) fungerar inte, och
  Lantmäteriets karta i 3006 kräver nyckel (se bakgrundskartor nedan).
- **E, visningsfil i Web Mercator:** R gör en extra visningsfil i EPSG:3857 (cellerna 40 m i
  Web Mercator, ungefär 20 m på marken). Den visas utan omprojicering, och OpenFreeMap fungerar.
  Nedladdningsfilerna ligger kvar i originalets koordinatsystem. Kostnad: cirka 10 minuter extra
  per 25 m-karta vid publicering och 5,6 MB i stället för 3,4 MB för den klassade visningsfilen.
- Intoning och förladdning (D) gav ingen mätbar vinst på CPU, men kan minska blinkandet på ett
  riktigt grafikkort. Det är billigt att slå på i plan 2 om du tycker att D känns bättre.

## Blinkandet (din andra bedömning, variant D)

Inspelningen visar att blinkandet kommer från översiktsnivåerna, inte från omprojiceringen. Vid en
snabb hjulzoom är de skarpa rutorna inte laddade, och OpenLayers visar under tiden en grövre nivå
förstorad. Grova nivåer täcker mycket större yta än full upplösning, eftersom en grov cell får ett
värde så fort någon av dess underceller har data. Därför sväller kartan och krymper sedan.

| Nivå | Andel celler med data, MODE (nu) | NEAREST | Andel 10 bland dem, MODE | NEAREST |
|---|---:|---:|---:|---:|
| 25 m | 0,30 % | 0,30 % | – | – |
| 400 m | 1,16 % | 0,29 % | 35 % | 50 % |
| 3200 m | 3,54 % | 0,29 % | 26 % | 52 % |

MAX ger samma täckning som MODE (båda bortser från nodata) och tar alltså inte bort blinkandet.
NEAREST är ytriktig och blinkar mindre, men ser glest och prickigt ut utzoomat
(`docs/oversikter-mode-nearest.png`). Prova:
<https://slu-marten.github.io/fiskkartor/perf.html?cog=data/test/abborre_klassad_nearest.tif&roll=klassad&epsg=3006&res=25&vy=3006&transition=0&preload=99>

**Lösningen på blinkandet ligger i webbläsaren.** Med `reserv=1` visar OpenLayers bara en ersättningsruta
som är högst en nivå grövre, och lämnar resten tomt tills de skarpa rutorna laddats. Mätt som hur mycket
den färgade ytan sväller under en snabb zoom (största täckning delat med slutlig täckning):

| Inställning | Svällning, punkt 1 | Svällning, punkt 2 |
|---|---:|---:|
| Variant 3 (D) | 4,9× | 31× |
| Variant 3 + `reserv=2` | 2,3× | 12× |
| Variant 3 + `reserv=1` | 1,0× | 1,0× |

Prova: <https://slu-marten.github.io/fiskkartor/perf.html?cog=data/test/abborre_klassad.tif&roll=klassad&epsg=3006&res=25&vy=3006&transition=0&preload=99&reserv=1>

Eftersom blinkandet kommer från ersättningsrutorna, kan översiktsnivåerna väljas för innehållet:
en andelströskel skulle radera smala vikar och strandremsor utzoomat (en 100 m bred remsa täcker cirka
6 % av en 1,6 km-cell), så förslaget i plan 2 är MAX, eventuellt med ett lågt brusfilter räknat direkt
från 25 m-originalet. NEAREST stryks.

## Kartor i andra koordinatsystem i en SWEREF 99 TM-vy

Villkor för variant C: att de små äldre kartorna i andra system flyter i en 3006-vy. Mätt med samma zoom:

| Karta | Vy | Längsta paus | 95:e percentilen |
|---|---|---:|---:|
| Gädda uppväxt (Yngel, EPSG:3035, 250 m) | Web Mercator | 67–100 ms | 50 ms |
| Gädda uppväxt (Yngel, EPSG:3035, 250 m) | SWEREF 99 TM | 99–250 ms | 50–67 ms |
| Abborre lek (PanBalticScope, EPSG:3857) | Web Mercator | 50–67 ms | 50 ms |
| Abborre lek (PanBalticScope, EPSG:3857) | SWEREF 99 TM | 67 ms | 50 ms |
| Abborre 25 m (EPSG:3006), variant 3 | SWEREF 99 TM | 100–117 ms | 50 ms |

Yngelkartan får enstaka längre pauser när den omprojiceras. Det går att undvika helt: vid publicering
kan R göra en liten visningskopia i 3006 av kartor i andra system (några hundra kB för de befintliga
kartorna), medan nedladdningsfilen behåller originalet. Östersjön ser bra ut i SWEREF 99 TM
(`docs/ostersjon-3857-3006.png`), med mindre utdragen Bottenviken än i Web Mercator.

## Översikterna (MODE) när man zoomar ut

GDAL kan inte bygga COG-översikter med MAX, så de klassade filerna använder MODE (vanligaste klassen).
Vilka celler som har data blir detsamma, men i blandade kustceller vinner ofta 5 där MAX hade visat 10.
Uppmätt på den klassade abborrekartan:

| Översiktsnivå | Celler med data | Olika klass MODE/MAX | Celler med 10 (MODE) | Celler med 10 (MAX) |
|---|---:|---:|---:|---:|
| 400 m | 43 037 | 24,9 % | 16 534 | 27 250 |
| 1,6 km | 5 690 | 34,1 % | 1 873 | 3 811 |

Utzoomat visas alltså ungefär hälften så många "Mycket viktigt"-celler. Inzoomat (full upplösning) är
kartan exakt. **Din bedömning:** är det godtagbart? Om inte kan översikterna byggas med MAX i ett eget
steg (R aggregerar, GDAL skriver översikterna) i plan 2.

## Storlekar

| | Filer | Totalt | Största fil |
|---|---:|---:|---|
| Klassade kartor (visning.tif) | 75 | 3,0 MB | – |
| Kontinuerliga råfiler (radata.tif) | 67 | 12,1 MB | storspigg-uppvaxt-ostkusten-2021, 0,52 MB |
| 25 m-testfiler (test/) | 4 | 71,2 MB | abborre_kontinuerlig.tif, 58,9 MB |
| Hela dataträdet | 223 | 86,6 MB | |

Konverteringstid för 25 m-filerna i byggmiljön (2 kärnor): kontinuerlig 164 s, klassad 63 s.

## Bakgrundskartor (underlag för plan 2)

En bakgrundskarta duger bara om den inte kräver någon hemlig nyckel i webbläsaren och skickar
CORS-huvuden (krävs för "Spara som bild"). CORS provades med `fetch` från portalens egen adress
(`https://slu-marten.github.io`) i din webbläsare, eftersom byggmiljön inte når kartservrarna.

| Kandidat | Nyckel | CORS från portalen | Villkor | Bedömning |
|---|---|---|---|---|
| CARTO Positron (raster) | Kräver numera en API-nyckel enligt CARTO (gratis, utan konto). Rutorna svarar fortfarande utan nyckel. | Ja | Gratis upp till 5 miljoner anrop i månaden för icke-kommersiellt bruk; attribution "© OpenStreetMap contributors, © CARTO" synlig på kartan | Nyckeln är offentlig men knuten till CARTO:s villkor och kvot. Möjlig, inte förstaval. |
| OpenFreeMap (vektor) | Ingen nyckel, ingen registrering | Ja (stil, TileJSON och rutor) | Fri användning utan gränser, "as-is" utan garantier; OpenStreetMap-attribution | **Uppfyller kraven.** Kräver `ol-mapbox-style` i OpenLayers. Ingen SLA. |
| Lantmäteriet Topografisk webbkarta Visning, översiktlig (topowebb_nedtonad) | API:t `api.lantmateriet.se/open/topowebb-ccby` kräver konto och nyckel (i URL eller header) | Nej utan nyckel (anropet blockeras) | Öppna data, CC0 | Kräver nyckel i webbläsaren eller en egen proxy. `minkarta.lantmateriet.se/map/topowebbcache` svarar med CORS utan nyckel, men är inte en dokumenterad öppen tjänst. |

Förslag till plan 2: OpenFreeMap Positron som standard, med Lantmäteriet som val om SLU kan hålla en
nyckel bakom en enkel proxy på slu.se-adressen.

## Luckor i katalogen

- **Flundra uppväxt ostkusten (PBS)**: den klassade filen innehöll 182 498 celler med värdet −9990,
  som inte är en klass. De ligger i västerhavet, utanför kartans område (ostkusten). En kopia där −9990
  är nodata, `Flundra_uppväxt_Ö_nodata.tif`, ligger nu bredvid originalet (som är orört), och
  katalograden pekar på den. **Bekräfta** att −9990 betyder "utanför området".
- **De 16 kartorna från 2025** saknar källa, citering, projekt och filer. De är dolda tills originalen finns.
- Tomma faktafält bland de 75 synliga: `fiskbarometern` 28 (NMK), `rodlista`, `simblasa` och `livsmiljo`
  4 var (bl.a. hummer, krabbtaska, strandkrabba, fenknot, kolmule, marulk, nordkalmar, vahls albrosme),
  `doi` och `enhet` alla 75 (enhet visas som "sannolikhet").
- Inga andra valideringsfel: alla koordinatsystem gick att tolka (IGNF LAEA → 3035, Ryssjas UTM 33N utan
  EPSG-kod → 25833) och alla filer hade nodata.

## Avvikelse i NMK2-leveransen

`ensemble_binary.tif` för abborre (NMK2, 25 m) innehåller bara nodata (255). Den klassade testfilen
gjordes därför från `ensemble_mean.tif` med tröskeln 0,3 (TSS i `metadata.yml`), delad vid medianen
0,442 i 5 (Viktigt) och 10 (Mycket viktigt). Kontrollera binärfilen i nästa leverans.

## Att stämma av med SLU IT inför steg 2

De kontinuerliga 25 m-kartorna (cirka 1,2 GB för 20 arter) får inte plats på GitHub Pages. Följande
behövs av den lagring SLU tillhandahåller:

- Filerna serveras över HTTPS, och webbservern stöder HTTP-range-anrop. Det krävs för att webbläsaren
  ska kunna hämta delar av en COG. Apache och nginx gör det som standard för statiska filer.
- Om webbappen och kartdatan hamnar på olika adresser behövs CORS-huvuden som tillåter appens adress
  och exponerar Content-Range.
- Teamet kan själva ladda upp filer via SFTP, SMB, WebDAV eller S3, utan att gå via IT varje gång.
- Utrymme: minst 50 GB, med marginal för 25 m-kartorna (uppskattning).
- Ingen inloggning för att läsa. Gärna kort cachetid för katalog.json och lång för kartfilerna,
  eftersom de aldrig skrivs över.
- En enkel reverse proxy-regel i samma webbserver som vidarebefordrar till exempel `/tiles/lm/` till
  Lantmäteriets Topografisk webbkarta Visning, översiktlig i SWEREF 99 TM, med API-nyckeln i en
  header och cache på svaren. Nyckeln syns då aldrig i webbläsaren, och "Spara som bild" fungerar.

## Granskning av koden

En fristående granskare gick igenom hela grenen. Allvarliga fynd som är rättade, med test som först fallerade:

- En dator som inte kört `hamta_data()` kunde skriva över redan publicerade kartfiler. Det gick också
  om två personer publicerade samtidigt. `skicka_data()` jämför nu innehållet i alla publicerade
  versionsmappar och pushar med `--force-with-lease`. `publicera()` skriver aldrig om en
  versionsmapp som metadata.json pekar på.
- `skala_kalla = 1000` på data i 0–1 hade avrundat kartan till 0 och 1. Nu stoppar det med ett
  meddelande.
- Filnamn som ligger i NFD-form på disken (vanligt för filer från macOS) hittas nu.
- Ändrade klassvärden kontrolleras mot rastret innan de publiceras.
- R-testerna körs nu också på Windows i GitHub Actions.

Mindre förslag som inte är åtgärdade (för plan 2):
- Hårda mellanslag och citattecken i Excel-celler städas inte bort.
- En felaktig cell stoppar hela `publicera_alla()`.
- En tom `visas`-cell betyder dold, utan varning.
- Rader som tagits bort ur Excel ligger kvar i katalog.json.
- `katalog.csv` som är öppen i Excel stoppar publiceringen.
- `DESCRIPTION` saknar kravet R ≥ 4.2.
- Upplösningen för EPSG:3857 anges i Web Mercator-meter i stället för markmeter.
- Ingen rimlighetskontroll av koordinater mot koordinatsystem.
- Heltalsfiler med max ≤ 1 tolkas automatiskt som 0–1.

## Vad som återstår för att godkänna kontrollpunkten

1. Jämför zoomvarianterna A, C, D och E ovan på din dator. Zooma med hjulet längs kusten och panorera.
   Vilken känns bäst, och är den tillräckligt smidig?
2. Välj inriktning för plan 2: vy i SWEREF 99 TM (C) eller visningsfil i Web Mercator (E).
   Valet styr också bakgrundskartan.
3. Ta ställning till MODE-översikterna och till −9990 i flundrakartan.
4. Skicka kraven ovan till SLU IT.
