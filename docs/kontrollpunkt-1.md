# Kontrollpunkt 1 – publicering och prestanda

Datum: 2026-11-25. Fas 0–1 enligt byggplanen. Kontrollpunkten är godkänd när både de uppmätta
gränserna och Mårtens egen bedömning på sin dator är godkända. Därefter skrivs plan 2 (kartvisaren).

## Sammanfattning

- **Alla 75 befintliga kartor är publicerade** på <https://slu-marten.github.io/fiskkartor/data/katalog/katalog.json>,
  med 67 kontinuerliga råfiler. De 16 kartorna från 2025 utan original ligger dolda i katalogen.
  Katalogen följer schemat och en omkörning ändrar ingenting (74 oförändrade + 1 rättad).
- **Prestandagränserna klaras** för 25 m-filerna, även med strypt nät och rendering på CPU (tabeller nedan).
- **Att avgöra vid kontrollen:** hur översikterna (MODE) ser ut utzoomat, och om det känns smidigt på din dator.

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
| 25 m-testfiler (test/) | 2 | 62,3 MB | abborre_kontinuerlig.tif, 58,9 MB |
| Hela dataträdet | 221 | 77,7 MB | |

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

## Vad som återstår för att godkänna kontrollpunkten

1. Öppna prova-länken ovan på din dator. Zooma in längs kusten, panorera och håll muspekaren över kartan.
   Känns det smidigt?
2. Ta ställning till MODE-översikterna och till −9990 i flundrakartan.
3. Skicka kraven ovan till SLU IT.
