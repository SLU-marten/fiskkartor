# Fas 4: havslook – plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Mål:** Havsvik blir appens temafärg. Det ger:
- ett sidhuvud med mönster av fisksiluetter;
- kort på havsgrå sidor;
- en meny som glider in på mobil;
- kartfärger ur havsskalan;
- artikoner i träfflistorna.

Silhuetterna görs av ett R-skript ur Artfaktas bilder.

**Arkitektur:**
- **Färger:** samlas i `webb/src/stil.css`, där `--gron` och `--gron-mork` byter namn till `--tema`
  och `--tema-mork`. Kartans färger ligger i `webb/src/karta/stil.ts`.
- **Silhuetterna:** R-funktioner i paketet `publicering` (`R/silhuetter.R`) skriver
  `webb/src/assets/arter/` (JSON och två SVG-mönster). Webben importerar dem vid bygget.
- **Artikonen:** en egen komponent som träfflistan använder.

**Teknik:**
- Svelte 5.59, Vite 8, TypeScript 5.9 och OpenLayers 10.11, med Vitest och Playwright som tidigare.
- R med `terra` (redan i paketets Imports) och testthat.

**Spec:** `docs/superpowers/specs/2026-11-26-fas-4-havslook-design.md`. Skisser:
<https://claude.ai/artifact/BWiPXGL554ThdkNHj5vpuG>.

## Globala villkor

- **Beroenden:** inga nya, varken i webben eller i R-paketet. Skriptet läser bilderna med `terra`
  (GDAL läser PNG med alfakanal och JPEG). Specen nämner `magick`, men det är byggarens val, och
  `terra` räcker.
- **Färger:** exakt specens värden.

  | Variabel | Värde | Ersätter |
  |---|---|---|
  | `--tema` | #007681 | `--gron` |
  | `--tema-mork` | #004851 | `--gron-mork` |
  | `--sida` | #eef4f6 | ny |
  | `--markering` | #dce9ee | #eef6d6 |
  | `--kortkant` | #d5e5ea | ny |

  Övriga variabler är oförändrade.
- **Kartans färger:**
  - Himmel #6ad1e3, Turkos #00b0b9, Havsvik #007681, Havsdjup #004851.
  - Klassade kartor: 1 klass ger Havsdjup, 2 klasser Turkos och Havsdjup, 3 klasser Turkos,
    Havsvik och Havsdjup. Fler klasser fördelas jämnt längs Turkos → Havsvik → Havsdjup.
  - Kontinuerliga kartor: Himmel → Turkos → Havsvik → Havsdjup.
- **Fokus:** `outline: 3px solid var(--tema); outline-offset: 2px`. I sidhuvudet, menypanelen och
  sidfoten är ramen vit (#ffffff).
- **Text på `--markering`** är alltid `--text`, aldrig `--tema` (4,3:1).
- **Mönstren:** vita fiskar med `fill-opacity="0.075"`.
  - Sidhuvudet: en remsa på 1440 × 144 med en torsk på x 168–333 i nedre halvan.
  - Menyn: 316 × 844, ett rutnät på 3 × 8 där varje art finns en gång.
- **Artikonen:**
  - Cirkeln är 44 px, eller 36 px i kartvyns lista.
  - Fisken är 20 px bred (36-cirkeln: 16 px), men 34 px (36-cirkeln: 28 px) när livsstadiet är
    "vuxen" (skiftläget spelar ingen roll).
  - Saknas silhuetten blir cirkeln tom.
- **Brytpunkter** som i dag: 60rem, 40rem och 22.5rem.
- **Artfaktas bildfiler** läggs aldrig i repot, bara de framräknade filerna.
- **Text och namn:** synlig text läggs i `src/lib/text.ts` på svenska och engelska. Identifierare
  skrivs på svenska. Commits avslutas med repots trailers.

## Review Focus

1. **Katalogens artnamn har annat skiftläge eller blanksteg** ("torsk", " Sill"), eller flera arter
   ("Braxen/björkna"). Rätt silhuett ska ändå hittas, och aldrig fel art. (Task 4,
   `arter.test.ts`.)
2. **Livsstadiet är tomt, null eller skrivet med liten bokstav** ("uppväxt" i testdatan). Fisken ska
   bli liten, utom för "vuxen". (Task 4.)
3. **Menypanelen på en låg skärm** (liggande telefon, 360 px hög). Alla länkar ska gå att nå genom
   att skrolla i panelen. (Task 6, E2E.)
4. **Sidhuvudet vid 320 px bredd.** Namnet och Meny-knappen ska få plats utan överlapp, och texten
   ska vara vit. (Task 5, E2E.)
5. **Tvingade färger (forced-colors).** Bakgrundsbilderna försvinner, men texten i sidhuvudet och
   fokusramen ska synas. (Task 5, E2E med `emulateMedia({ forcedColors: 'active' })`.)

---

### Task 1: Kartans färger ur havsskalan

**Files:**
- Modify: `webb/src/karta/stil.ts`
- Test: `webb/tests/stil.test.ts`

**Interfaces:**
- Produces:
  - `HAVSSKALA: [number, number, number][]`, de fyra färgerna Himmel, Turkos, Havsvik och Havsdjup;
  - `klassfarger(n: number): [number, number, number][]`;
  - `klassadStil`, `kontinuerligStil`, `legendfarger` och `KONTINUERLIGA_STEG` med samma signaturer
    som i dag. `YLGNBU` tas bort.

- [ ] **Step 1: Skriv de fallerande testerna** i `tests/stil.test.ts`:

```ts
it('klassfarger följer havsskalan', () => {
  expect(klassfarger(1)).toEqual([[0, 72, 81]]);
  expect(klassfarger(2)).toEqual([[0, 176, 185], [0, 72, 81]]);
  expect(klassfarger(3)).toEqual([[0, 176, 185], [0, 118, 129], [0, 72, 81]]);
  const fem = klassfarger(5);
  expect(fem[0]).toEqual([0, 176, 185]);
  expect(fem[2]).toEqual([0, 118, 129]);
  expect(fem[4]).toEqual([0, 72, 81]);
});

it('legenden och kartan har samma färger', () => {
  expect(legendfarger(PBS).map((l) => l.rgb)).toEqual(['rgb(0 176 185)', 'rgb(0 72 81)']);
});

it('kontinuerliga steg går från Himmel till Havsdjup', () => {
  expect(KONTINUERLIGA_STEG[0]).toBe('rgb(106 209 227)');
  expect(KONTINUERLIGA_STEG.at(-1)).toBe('rgb(0 72 81)');
});
```

- [ ] **Step 2:** Kör `cd webb && npx vitest run tests/stil.test.ts`. Expected: FAIL (`klassfarger`
  saknas).
- [ ] **Step 3: Implementera i `stil.ts`.**
  - `klassfarger(n)` är ett linjärt mellanläge i RGB längs [Turkos, Havsvik, Havsdjup] vid
    t = i/(n−1), avrundat. n = 1 ger Havsdjup.
  - `klassadStil` och `legendfarger` använder `klassfarger`.
  - `kontinuerligStil` och `KONTINUERLIGA_STEG` använder de fyra färgerna i `HAVSSKALA`.
  - Uppdatera kommentarerna (inte längre YlGnBu).
- [ ] **Step 4:** Kör `npx vitest run`. Expected: alla tester godkända.
- [ ] **Step 5: Commit** `feat(webb): kartans färger ur SLU:s havsskala`.

### Task 2: Temafärgen i hela gränssnittet

**Files:**
- Modify:
  - `webb/src/stil.css` (variablerna, `body` och fokus);
  - alla `.svelte`-filer som använder `--gron` eller `--gron-mork`. Det är `Start`, `Sidhuvud`,
    `Panel`, `Filter`, `Lagerval` och `stil.css` själv: `grep -rln "var(--gron" webb/src`.
- Test:
  - `webb/tests/farger.test.ts`;
  - `webb/tests/app.spec.ts`: de två färgtesterna, rad ~1051 (projektkortet) och ~1099
    (zoomknappens fokus).

**Interfaces:**
- Produces: CSS-variablerna i Globala villkor. Task 5 och 7 använder `--tema`, `--tema-mork`,
  `--sida` och `--kortkant`.

- [ ] **Step 1: Ändra testerna först.**
  - **`farger.test.ts`:** paren blir
    `['text','yta',4.5], ['text','mjuk',4.5], ['text','markering',4.5], ['text','notis',4.5], ['text','sida',4.5], ['dampad','yta',4.5], ['dampad','mjuk',4.5], ['dampad','sida',4.5], ['dampad','markering',4.5], ['tema','yta',4.5], ['tema','sida',4.5], ['tema-mork','yta',4.5], ['yta','tema',4.5], ['yta','tema-mork',4.5], ['fel','fel-yta',4.5], ['kant','yta',3]`.
    Raden `['gron','markering',4.5]` försvinner (den regeln gäller inte längre).
  - **`kontrast`-exemplet:** blir `kontrast('#007681', '#ffffff')` ≈ 5,4.
  - **`app.spec.ts`:**
    - det valda projektkortet ska ha `background-color` `rgb(220, 233, 238)`;
    - zoomknappens `outline-color` ska vara `rgb(0, 118, 129)`.
  - **Ett nytt E2E-test, `sidan har havsgrå bakgrund`:** på `START()` är `body`
    `background-color` `rgb(238, 244, 246)`.
- [ ] **Step 2:** Kör `npx vitest run tests/farger.test.ts`. Expected: FAIL (`tema` saknas).
- [ ] **Step 3: Byt variablerna** i `stil.css` enligt tabellen och sätt `body { background: var(--sida) }`.
  - Ersätt `var(--gron-mork)` med `var(--tema-mork)` och `var(--gron)` med `var(--tema)` i hela
    `webb/src`.
  - Uppdatera kommentaren överst: stil Hav, havsfärgerna som tema enligt fas 4.
  - Overallt där text står på `--markering` ska färgen vara `var(--text)`. Kontrollera Traffar,
    Sokfalt och projektkortet.
- [ ] **Step 4:** Kör `npm run build`, `npx vitest run` och
  `npx playwright test tests/app.spec.ts -g "projektkort|fokusram|havsgrå"`. Expected: godkänt.
- [ ] **Step 5: Commit** `feat(webb): Havsvik som temafärg`.

### Task 3: Silhuetter och mönster ur bilderna (R)

**Files:**
- Create:
  - `publicering/R/silhuetter.R`;
  - `publicering/inst/skript/silhuetter.R`;
  - `publicering/tests/testthat/test-silhuetter.R`;
  - `docs/silhuetter.md`;
  - genererat: `webb/src/assets/arter/silhuetter.json`, `monster-sidhuvud.svg` och `monster-meny.svg`.

**Interfaces:**
- Produces (interna funktioner i paketet):
  - `silhuett(fil: character, tolerans = 0.005) -> list(w = int, h = int, d = character)`. Ger en
    SVG-sökväg i bildpunkter, beskuren till fisken, och `y` nedåt som i SVG.
  - `silhuetter(mapp: character) -> named list`. Nycklarna är filnamnen utan ändelse, i NFC.
  - `monster_sidhuvud(s: named list, arter: character, fro = 7L) -> character`. Ger SVG-text,
    viewBox 0 0 1440 144.
  - `monster_meny(s: named list, arter: character, fro = 5L) -> character`. Ger SVG-text, viewBox
    0 0 316 844.
  - `saknade_arter(s: named list, katalog_json: character) -> character`. Ger de `falt.art` i
    katalogen som inte har någon silhuett, efter samma namnregel som webben (Task 4).
- Produces (filer, läses av Task 4–6): `silhuetter.json` med formen `{"Torsk":{"w":782,"h":281,"d":"M…Z"}, …}`.

- [ ] **Step 1: Skriv de fallerande testerna** i `test-silhuetter.R`. Testbilderna skapas i
  `withr::local_tempdir()` med `terra::writeRaster` som PNG, 3 eller 4 band.

```r
# Hjälpare i testfilen: 200 x 100 bildpunkter, en ellips med mitten (100, 50) och radierna 70 och 30
# (x 30–170, y 20–80) i färgen `fisk`, en fläck med radien 10 mitt i i färgen `flack`, och resten i
# `bakgrund`. alfa = TRUE ger ett fjärde band som är 0 utanför ellipsen och 255 innanför.
testbild <- function(bakgrund, fisk, flack = fisk, alfa = FALSE) { … terra::writeRaster(…, "x.png", datatype = "INT1U") … }

test_that("silhuett skär ut fisken mot vit bakgrund och behåller en ljus buk", {
  s <- silhuett(testbild(bakgrund = c(255, 255, 255), fisk = c(60, 60, 60), flack = c(250, 250, 250)))
  expect_lte(abs(s$w - 141L), 2); expect_lte(abs(s$h - 61L), 2)
  expect_match(s$d, "^M[0-9]")
  expect_equal(lengths(regmatches(s$d, gregexpr("M", s$d))), 1)   # ingen hålighet där fläcken är
})
test_that("silhuett klarar svart bakgrund", {
  s <- silhuett(testbild(bakgrund = c(0, 0, 0), fisk = c(200, 200, 200)))
  expect_lte(abs(s$w - 141L), 2); expect_lte(abs(s$h - 61L), 2)
})
test_that("silhuett klarar genomskinlig bakgrund", {
  s <- silhuett(testbild(bakgrund = c(255, 255, 255), fisk = c(255, 255, 255), alfa = TRUE))
  expect_lte(abs(s$w - 141L), 2); expect_lte(abs(s$h - 61L), 2)
})
test_that("monster_meny har varje art en gång och mönstren har rätt mått", {
  s <- list(A = list(w = 100L, h = 40L, d = "M0 0 L100 0 L100 40Z"), B = list(w = 50L, h = 40L, d = "M0 0 L50 0 L50 40Z"))
  m <- monster_meny(s, c("A", "B"))
  expect_match(m, 'viewBox="0 0 316 844"', fixed = TRUE)
  expect_equal(lengths(regmatches(m, gregexpr("<path", m))), 2)
  expect_match(monster_sidhuvud(s, c("A", "B")), 'viewBox="0 0 1440 144"', fixed = TRUE)
  expect_identical(monster_meny(s, c("A", "B")), m)                 # fast frö
})
test_that("saknade_arter följer webbens namnregel", {
  k <- withr::local_tempfile(fileext = ".json")
  jsonlite::write_json(list(kartor = lapply(c("Braxen/björkna", " torsk", "Hummer", "Fenknot"),
                                            function(a) list(falt = list(art = a)))), k, auto_unbox = TRUE)
  s <- list(Braxen = list(), Torsk = list(), "Europeisk hummer" = list())
  expect_identical(saknade_arter(s, k), "Fenknot")
})
```

- [ ] **Step 2:** Kör `LANG=C.UTF-8 Rscript -e 'testthat::test_local("publicering", filter = "silhuetter")'`.
  Expected: FAIL (funktionerna saknas).
- [ ] **Step 3: Implementera `R/silhuetter.R`.**
  - **Bakgrunden:**
    - finns en alfakanal är bakgrunden alfa < 40;
    - annars är bakgrunden den färg som är vanligast i bildens kantrad, och en bildpunkt är bakgrund
      när den skiljer sig mindre än 10 i varje kanal;
    - bakgrund är bara det som hänger ihop med kanten: `terra::patches` på bakgrundsmasken, och de
      patchar som når kanten.
  - **Fisken** är allt annat. Öppna masken en gång med en 3 × 3-focal (min sedan max). Behåll
    patchar som är minst 2 % av den största.
  - **Beskär** till fiskens utbredning.
  - **Konturen:** `terra::as.polygons` och sedan `terra::simplifyGeom(tolerans × bredd)`.
    - Koordinaterna görs om till `M x y L … Z` med heltal och `y = höjd − y`.
    - Hål ritas inte (fyllningen gör dem onödiga).
  - **Mönstren** följer specen:
    - **Remsan:** torsken först, med längden 165 på x = 168, mittlinjen y = 106 och vriden −3°.
      Därefter upp till 40 fiskar utan överlapp med 4 px marginal. Avlånga arter (w/h > 1,6) blir
      70–130 långa och övriga 42–70. 35 % speglas och vridningen är ±9°. Fiskar som korsar en kant
      ritas även förskjutna ±1440.
    - **Menyn:** en art per ruta i 3 × 8. Avlånga arter blir 66–88 långa och övriga 44–58, med
      samma spegling och ±8°.
    - Båda skrivs som `<path d=… transform=…>` utan `<use>`, med
      `fill="#ffffff" fill-opacity="0.075"`.
  - **Arterna i mönstren** är en fast lista i skriptet:
    Torsk, Abborre, Gädda, Sill, Rödspätta, Piggvar, Marulk, Havskatt, Sjurygg, Gös, Lyrtorsk,
    Berggylta, Ål, Storspigg, Tånglake, Krabbtaska, Vitling, Sutare, Havsmus, Knot, Kolja, Gärs,
    Skrubbskädda och Id. Alla finns i katalogen.
- [ ] **Step 4:** Kör testerna igen. Expected: PASS. Kör sedan hela R-sviten. Expected: godkänt.
- [ ] **Step 5: Skriv `inst/skript/silhuetter.R`.** Argument:
  - mappen med bilderna;
  - katalogens `katalog.json`, i dag `data/katalog/katalog.json` på grenen data.

  Skriptet:
  - skriver de tre filerna till `webb/src/assets/arter/`;
  - skriver ut `saknade_arter` och antalet silhuetter.

  Kör det med Mårtens bilder (`/tmp/fiskbilder/Fiskbilder`, filnamnen med `#U00e4` ska avkodas till
  å, ä och ö) och katalogen från grenen data.
  Expected:
  - 114 silhuetter;
  - saknas: Fenknot, Femtömmad skärlånga, Nordkalmar, Strandkrabba, Vahls ålbrosme och
    Östersjöflundra;
  - Europeisk hummer är inte en rektangel (kontrollera att `d` har fler än 4 punkter).
- [ ] **Step 6: Skriv `docs/silhuetter.md`.** Hur man lägger till en art: en bild från Artfakta med
  artens svenska namn som filnamn, kör skriptet, committa de tre filerna. Där står också att
  bildfilerna inte läggs i repot.
- [ ] **Step 7: Commit** `feat: silhuetter och mönster ur Artfaktas bilder`, med de genererade
  filerna.

### Task 4: Artikoner i träfflistorna

**Files:**
- Create:
  - `webb/src/lib/arter.ts`;
  - `webb/src/komponenter/Artikon.svelte`;
  - `webb/tests/arter.test.ts`.
- Modify:
  - `webb/src/komponenter/Traffar.svelte`;
  - `webb/src/vyer/Kartvy.svelte` (prop `kompakt`).
- Test: `webb/tests/app.spec.ts`.

**Interfaces:**
- Consumes: `webb/src/assets/arter/silhuetter.json` (Task 3).
- Produces:
  - `artnyckel(art: string | null | undefined): string | null`. Trimmar, tar delen före första "/",
    översätter via `ALIAS = { Hummer: 'Europeisk hummer' }` och jämför utan hänsyn till skiftläge
    mot nycklarna. Okänt eller tomt ger `null`.
  - `silhuettFor(art: string | null | undefined): { w: number; h: number; d: string } | null`.
  - `arVuxen(livsstadium: string | null | undefined): boolean`. Sant bara för "vuxen" i valfritt
    skiftläge, med trim.
  - `Artikon.svelte`, med props `{ art?: string | null; livsstadium?: string | null; kompakt?: boolean }`.
  - `Traffar.svelte`, med en ny prop `kompakt?: boolean`.

- [ ] **Step 1: Skriv de fallerande enhetstesterna** i `arter.test.ts`:

```ts
it('artnyckel hittar arten trots skiftläge, blanksteg och snedstreck', () => {
  expect(artnyckel('Torsk')).toBe('Torsk');
  expect(artnyckel(' torsk ')).toBe('Torsk');
  expect(artnyckel('Braxen/björkna')).toBe('Braxen');
  expect(artnyckel('Hummer')).toBe('Europeisk hummer');
});
it('artnyckel ger null för okänd eller tom art, aldrig en annan art', () => {
  expect(artnyckel('Fenknot')).toBeNull();
  expect(artnyckel('')).toBeNull();
  expect(artnyckel(null)).toBeNull();
  expect(artnyckel('Östersjöflundra')).toBeNull();
});
it('arVuxen gäller bara vuxen', () => {
  expect(arVuxen('Vuxen')).toBe(true);
  expect(arVuxen(' vuxen')).toBe(true);
  for (const s of ['Uppväxt', 'uppväxt', 'Lek', '', null, undefined]) expect(arVuxen(s)).toBe(false);
});
```

  E2E i `app.spec.ts` (startsidan med testdatan):
  - **`träfflistan har artikoner`:** raden för torsk-test har en `.artikon svg` som är 20 px bred.
    Raden för tral-test (ingen art) har en `.artikon` utan `svg`. Ikonen har `aria-hidden="true"`.
  - **`kartvyns lista har mindre ikoner`:** i `KARTA('torsk-test')` på 1280 px bredd är `.artikon`
    36 px.
- [ ] **Step 2:** Kör `npx vitest run tests/arter.test.ts`. Expected: FAIL (modulen saknas).
- [ ] **Step 3: Implementera `arter.ts`, `Artikon.svelte` och `Traffar.svelte`.**
  - **`Artikon`:** en `span.artikon` (cirkel, `background: var(--tema)`, `flex: none`, 44 eller
    36 px), med en inline `<svg aria-hidden="true" viewBox="0 0 w h">` där `fill` är #ffffff.
    - Bredden följer Globala villkor, och höjden ges av proportionerna.
    - I tvingade färger: `forced-color-adjust: none` på cirkeln, eller en kant i `CanvasText`, så
      att den syns.
  - **`Traffar`:** varje `li` blir en flexrad med ikonen, namnet och källan, där `gap` är 12 px.
    - Ikonen får `k.falt.art` och `k.falt.livsstadium`.
    - `Kartvy` skickar `kompakt` till sin lista.
- [ ] **Step 4:** Kör `npx vitest run` och `npm run build`. Kör sedan
  `npx playwright test tests/app.spec.ts -g "artikoner|mindre ikoner|träff"`. Expected: godkänt.
- [ ] **Step 5: Commit** `feat(webb): artikoner i träfflistorna`.

### Task 5: Sidhuvudet i Havsvik med fiskmönster

**Files:**
- Modify: `webb/src/komponenter/Sidhuvud.svelte`.
- Add: `webb/src/assets/slu-logotyp-vit.png`, kopierad från Mårtens vita logotyp
  (`/mnt/user-data/uploads/10a4b8c4-image.png`, 425 × 425, märket är halva höjden).
- Remove: `webb/src/assets/slu-logotyp.png`.
- Test: `webb/tests/app.spec.ts`.

**Interfaces:**
- Consumes: `monster-sidhuvud.svg` (Task 3), `--tema` och `--tema-mork` (Task 2).

- [ ] **Step 1: Skriv de fallerande E2E-testerna:**
  - **`sidhuvudet är Havsvik med fiskmönstret`:**
    - `banner` har `background-color` `rgb(0, 118, 129)`;
    - `background-image` innehåller `monster-sidhuvud`;
    - namnlänken "Fiskkartor" har `color` `rgb(255, 255, 255)`;
    - institutionsraden är vit.
  - **`logotypen är den vita`:** bildens `src` matchar `/slu-logotyp-vit.*\.png$/`. De befintliga
    storlekstesterna, 72 och 68 px, ska fortsätta gälla.
  - **`sidhuvudet vid 320 px`:** namnet och Meny-knappen överlappar inte (deras rutor skär inte
    varandra), och båda syns.
  - **`fokusramen i sidhuvudet är vit`:** fokus på namnlänken med Tab ger `outline-color`
    `rgb(255, 255, 255)`.
  - **`tvingade färger: sidhuvudets text och fokus syns`:** med
    `emulateMedia({ forcedColors: 'active' })` syns namnlänken, och fokusramen har en bredd på 3 px.
- [ ] **Step 2:** Kör `npm run build` och sedan
  `npx playwright test tests/app.spec.ts -g "Havsvik|vita|320 px|vit$|tvingade färger: sidhuvudets"`.
  Expected: FAIL.
- [ ] **Step 3: Implementera stilarna och logotypen.**
  - `.sidhuvud`: `background: var(--tema) url('../assets/arter/monster-sidhuvud.svg') 0 0 / auto 100% repeat-x`.
    Ta bort `box-shadow` och den vita bakgrunden.
  - `.namn` och `.institution`: `#ffffff`.
  - `nav a`: vit. Den aktuella sidan får en vit `border-bottom`.
  - `.sidhuvud :focus-visible`: `outline-color: #ffffff`.
  - `.menyknapp`: `--tema-mork` med vit text och en inline ikon med tre streck (`aria-hidden`).
  - Hopplänken (`.hopp`): vit bakgrund och en kant i `--tema`.
  - Importera den vita logotypen.
  - Med `@media (forced-colors: active)` behöver bakgrunden inget, men texten ska vara
    `CanvasText` och länkarna `LinkText`.
- [ ] **Step 4:** Kör testerna igen, och dessutom `npx playwright test tests/tillganglighet.spec.ts`.
  Expected: godkänt, och axe utan anmärkningar.
- [ ] **Step 5: Commit** `feat(webb): sidhuvudet i Havsvik med fiskmönster`.

### Task 6: Menyn som glider in på mobil

**Files:**
- Modify: `webb/src/komponenter/Sidhuvud.svelte` och `webb/src/lib/text.ts`.
- Test: `webb/tests/app.spec.ts` och `webb/tests/tillganglighet.spec.ts`.

**Interfaces:**
- Consumes: `monster-meny.svg` (Task 3).
- Produces: nya texter `stang_meny` ("Stäng menyn" / "Close menu") och `avsandare` ("Fiskkartor tas
  fram av SLU Aqua, Institutionen för akvatiska resurser." / "Fish maps is produced by SLU Aqua,
  Department of Aquatic Resources.").

- [ ] **Step 1: Ändra och skriv E2E-testerna**, alla vid 375 × 812 utom där annat står:
  - **`mobil: menyn stängs av en länk och av ett klick utanför`:** klicket utanför blir
    `page.mouse.click(20, 400)` (den nedtonade ytan till vänster om panelen), i stället för ett klick
    på `main`.
  - **Nytt, `mobil: menyn glider in från höger med stängknapp`:**
    - efter klick på Meny syns `navigation` "Huvudmeny";
    - dess ruta har högerkanten vid 375 och bredden 316;
    - knappen "Stäng menyn" har fokus;
    - ett klick på den stänger menyn och ger Meny-knappen fokus;
    - texten om avsändaren syns i panelen.
  - **Nytt, `mobil: menyns mönster`:** panelens `background-image` innehåller `monster-meny`.
  - **Nytt, `mobil: stängd meny går inte att nå med Tab`:**
    - med stängd meny går Tab från Meny-knappen inte till "Om portalen";
    - `visibility` är `hidden` och länken är dold.
  - **Nytt, `mobil: menyn går att skrolla på en låg skärm`** (812 × 360, liggande): "In English" går
    att skrolla fram i panelen och är synlig efter `scrollIntoViewIfNeeded`.
  - **Nytt, `mobil: menyn utan animering vid reducerad rörelse`:** med
    `emulateMedia({ reducedMotion: 'reduce' })` är panelens `transition-duration` `0s`.
  - Befintliga tester (Escape, fokus som lämnar menyn, axe med menyn öppen) ska fortsätta gälla.
- [ ] **Step 2:** Kör `npm run build` och sedan `npx playwright test tests/app.spec.ts -g "mobil: meny"`.
  Expected: de nya testerna FAIL.
- [ ] **Step 3: Implementera.**
  - **Under 40rem** blir `nav#huvudmeny` en fast panel:
    - `position: fixed; inset: 0 0 0 auto; width: min(316px, 85vw)`, `overflow-y: auto`;
    - bakgrunden är `var(--tema) url(monster-meny.svg) 0 0 / 100% auto no-repeat`;
    - stängd: `transform: translateX(100%); visibility: hidden`;
    - öppen: `transform: none; visibility: visible`;
    - övergången är 200 ms, med `visibility` fördröjd när panelen stängs.
  - **Överst i panelen:** "Fiskkartor" och en knapp "Stäng menyn" med en ×-ikon. Båda syns bara
    under 40rem.
  - **Längst ned:** raden om avsändaren.
  - **Bakom panelen** en `div.slojan` (fast, hela skärmen, `rgb(0 20 24 / 50%)`, `aria-hidden`). Den
    visas bara när menyn är öppen, och ett klick på den stänger menyn.
  - **Fokus:** när menyn öppnas får stängknappen fokus (efter `tick()`). Stängknappen gör `stang(true)`.
  - **På dator (40rem och bredare)** ser `nav` ut som efter Task 5.
  - **Reducerad rörelse:** `@media (prefers-reduced-motion: reduce) { transition: none }`.
- [ ] **Step 4:** Kör hela `npx playwright test tests/app.spec.ts tests/tillganglighet.spec.ts`.
  Expected: godkänt.
- [ ] **Step 5: Commit** `feat(webb): menyn glider in från höger på mobil`.

### Task 7: Kort, ytor, knappar och sidfot

**Files:**
- Modify:
  - `webb/src/vyer/Start.svelte`, `webb/src/vyer/Om.svelte`, `webb/src/vyer/Tillganglighet.svelte`;
  - `webb/src/vyer/Kartvy.svelte`;
  - `webb/src/komponenter/Panel.svelte`, `webb/src/komponenter/Sidfot.svelte`,
    `webb/src/komponenter/Sokfalt.svelte`.
- Test: `webb/tests/app.spec.ts`.

**Interfaces:**
- Consumes: `--sida`, `--kortkant`, `--tema` och `--tema-mork`.

- [ ] **Step 1: Skriv de fallerande E2E-testerna:**
  - **`startsidan består av vita kort`:** `.topp`, filterrutan och träffsektionen har
    `background-color` `rgb(255, 255, 255)` och en kant i `rgb(213, 229, 234)`.
  - **`sökknappen sitter ihop med fältet`:** en knapp "Sök" med bakgrunden `rgb(0, 118, 129)`,
    vars vänsterkant ligger inom 1 px från sökfältets högerkant.
    - Ett klick på den gör inget nytt: sökningen sker redan medan man skriver.
    - Knappen flyttar fokus till träfflistans rubrik.
  - **`Om-sidan i ett vitt kort`:** `article.om` har en vit bakgrund mot `body` `rgb(238, 244, 246)`.
    Samma gäller `article.sida` på tillgänglighetssidan.
  - **`sidfoten är Havsdjup`:** `contentinfo` har `background-color` `rgb(0, 72, 81)` och vita länkar.
  - **`Ladda ned är fylld i Havsvik`** (mobil 390 × 844): knappen "Ladda ned" har bakgrunden
    `rgb(0, 118, 129)` och vit text. "Kopiera länk" har vit bakgrund och kanten
    `rgb(0, 118, 129)`.
  - **`kartvyns paneler är vita`:** `.lista` och `.panel` har vit bakgrund på 1280 px bredd.
- [ ] **Step 2:** Kör `npm run build` och sedan
  `npx playwright test tests/app.spec.ts -g "vita kort|Sök\"|vitt kort|Havsdjup|Ladda ned är|paneler är vita"`.
  Expected: FAIL.
- [ ] **Step 3: Implementera** efter skisserna.
  - **Startsidan:**
    - `.topp` och `.innehall` får marginal mot sidan;
    - varje del är ett kort: `background: var(--yta); border: 1px solid var(--kortkant); border-radius: 2px`;
    - sökknappen ligger i `Sokfalt` efter fältet. Etiketten "Sök" läggs i `text.ts` som `sok_knapp`
      ("Sök" / "Search").
  - **Om och Tillgänglighet:** sidan centreras som ett kort med `max-width` som i dag och vit bakgrund.
  - **Kartvyn:** `.lista` och `.panel` får vit bakgrund, och `.tillbaka` `var(--sida)`.
  - **Panel:** `.knapp.mobil` (Ladda ned) är fylld i `--tema` med vit text, och hovring ger
    `--tema-mork`.
  - **Sidfot:** `background: var(--tema-mork)`, vit text och vita länkar, fokus i vitt, och ingen
    kant överst.
- [ ] **Step 4:** Kör hela sviten: `npx vitest run`, `npm run build` och `npx playwright test`.
  Expected: allt godkänt.
- [ ] **Step 5: Commit** `feat(webb): kort på havsgrå sidor och sidfot i Havsdjup`.

### Task 8: Granskning med skärmbilder och dokumentation

**Files:**
- Modify:
  - `docs/wcag-granskning.md` (nya färgpar och menypanelen);
  - kommentaren i `webb/src/stil.css` (redan i Task 2).

- [ ] **Step 1: Ta skärmbilder** med `npx tsx scripts/skarm.mts` (filen är inte versionshanterad):
  - startsidan, kartan och Om på 390 × 844 och 1280 × 800;
  - menyn öppen på 390 × 844.

  Jämför med skisserna. Rätta det som avviker tydligt, till exempel om torsken under namnet inte syns.
- [ ] **Step 2: Lägg till kontrollerna** i `docs/wcag-granskning.md`:
  - de nya kontrastparen;
  - menypanelens fokus och tangentbord;
  - artikonerna som dekor.
- [ ] **Step 3:** Kör hela sviten igen, med R-sviten:
  `LANG=C.UTF-8 Rscript -e 'testthat::test_local("publicering")'`. Expected: allt godkänt.
- [ ] **Step 4: Commit** `docs: granskning av havslooken`.

## Tillägg 26 november 01:09–01:11 (Mårtens synpunkter under bygget)

### Task 9: Tydligare skillnad mellan rubrik och värde i metadatalistan

**Files:**
- Modify: `webb/src/komponenter/Metadata.svelte`.
- Test: `webb/tests/app.spec.ts`.

- [ ] **Step 1: Skriv det fallerande E2E-testet `metadatans rubriker är dämpade och värdena tydliga`**,
  på `KARTA('torsk-test')` vid 1280 px:
  - `dt` har `color` `rgb(89, 89, 89)` och `font-weight` 400;
  - `dd` har `color` `rgb(34, 34, 34)`;
  - `dd` har en teckenstorlek minst 2 px större än `dt`.
- [ ] **Step 2:** Kör testet. Expected: FAIL.
- [ ] **Step 3: Implementera.**
  - `dt`: 0.85rem, vikt 400, `var(--dampad)`, `margin-top: 0.75rem`.
  - `dd`: 1.05rem, `var(--text)`.
- [ ] **Step 4:** Kör testet. Expected: PASS.
- [ ] **Step 5: Commit** `feat(webb): tydligare rubriker i metadatan`.

### Task 10: Filtervärden som bara skiljer sig i skiftläge slås ihop

**Files:**
- Modify: `webb/src/lib/sok.ts` och `webb/src/komponenter/Filter.svelte`.
- Test: `webb/tests/sok.test.ts`.

**Interfaces:**
- Produces: `lika(a: string, b: string): boolean`, sant när `a` och `b` är lika utan hänsyn till
  skiftläge och blanksteg i kanterna.

- [ ] **Step 1: Skriv de fallerande testerna:**
  - **`fasetter slår ihop värden som bara skiljer sig i skiftläge`:** fyra kartor med livsmiljön
    "Demersal (bottennära)" ×2 och "Demersal (Bottennära)" ×1 ger en enda post
    `{ varde: 'Demersal (bottennära)', antal: 3 }`. Den vanligaste stavningen vinner, och vid lika
    antal den första i bokstavsordning.
  - **`sok matchar filtervärden utan hänsyn till skiftläge`:** filtret
    `livsmiljo: ['Demersal (bottennära)']` ger alla tre kartorna.
- [ ] **Step 2:** Kör `npx vitest run tests/sok.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implementera.**
  - `fasetter` grupperar på `toLocaleLowerCase('sv')` av det trimmade värdet.
  - `sok` jämför med `lika`.
  - `Filter.svelte` använder `lika` där den jämför valda värden med fasetterna, både för valt läge
    och för valda värden som saknas i fasetten.
- [ ] **Step 4:** Kör `npx vitest run` och `npm run build`. Expected: godkänt.
- [ ] **Step 5: Commit** `fix(webb): filtervärden som bara skiljer sig i skiftläge slås ihop`.
- [ ] **Step 6: Lista värdena** som skiljer sig bara i skiftläge i katalogen på grenen data (för
  Mårten).

### Task 11: Projektkorten under sökrutan tas bort

**Files:**
- Modify: `webb/src/vyer/Start.svelte`.
- Test: `webb/tests/app.spec.ts`.

- [ ] **Step 1: Ändra testerna.**
  - Testet `valt projektkort markeras` tas bort.
  - Nytt test: **`startsidan har inga projektkort`**: `[data-testid^="projekt-"]` har antalet 0, och
    filtret Projekt finns kvar (gruppen "Projekt").
  - Andra tester som klickar på projektkorten skrivs om till att använda filtret.
- [ ] **Step 2:** Kör testerna. Expected: det nya testet FAIL.
- [ ] **Step 3: Implementera.** Ta bort `ul.projekt` och dess stilar, och beräkningen av projekten
  om inget annat använder den.
- [ ] **Step 4:** Kör `npm run build` och `npx playwright test tests/app.spec.ts -g "projekt|startsidan"`.
  Expected: godkänt.
- [ ] **Step 5: Commit** `feat(webb): projektkorten under sökrutan tas bort`.

### Task 12: Ny startsida med artkort

**Spec:** tillägget "ny startsida" i specen. Skiss: `Start-Dator`, `Start-Dator-Sok` och `Start-Mobil` på skissytan.

**Files:**
- Create: `webb/src/lib/artgrupper.ts`, `webb/src/komponenter/Artkort.svelte`,
  `webb/src/komponenter/Lasa.svelte`, `webb/tests/artgrupper.test.ts`.
- Modify: `webb/src/vyer/Start.svelte`, `webb/src/komponenter/Filter.svelte` (prop `dolda`),
  `webb/src/lib/text.ts`, `webb/tests/app.spec.ts`.

**Interfaces:**
- `type ArtGrupp = { nyckel: string; namn: string; latin: string | null; art: string | null; kartor: { karta: Karta; etikett: string | null }[] }`
- `grupperaArter(kartor: Karta[]): ArtGrupp[]`
  - Kartor med samma `falt.art` (trimmat, utan skiftläge) hamnar i en grupp. Grupperna sorteras på
    namnet (sv), kartorna på titeln.
  - `etikett` är titeln utan artnamnet i början (utan skiftläge), med inledande skiljetecken och
    blanksteg bortskalade och första bokstaven versal. Titeln själv om den inte börjar med artnamnet.
    `null` för en karta utan art.
  - En karta utan art får gruppen `karta:<id>`, med `namn` = titeln.
- `antalArterKartor(arter: number, kartor: number, lang): string`: "58 arter, 75 kartor", "1 art,
  1 karta", "58 species, 75 maps".
- `visaAllaArter(n, lang)`: "Visa alla 58 arter" / "Show all 58 species".
- `Filter`: ny prop `dolda?: Faltnamn[]`. Ett dolt fält visas ändå om det har valda värden.

- [ ] **Step 1: Skriv de fallerande enhetstesterna** för `grupperaArter`:
  - gruppering utan hänsyn till skiftläge;
  - ordning;
  - etiketten ("Torsk <20 cm västkusten" → "<20 cm västkusten", "Torsk större än 20 cm, uppväxt" →
    "Större än 20 cm, uppväxt", "Braxen/björkna uppväxt ostkusten" → "Uppväxt ostkusten",
    "Perch spawning" med art Abborre → "Perch spawning");
  - en karta utan art.
- [ ] **Step 2: Skriv E2E-testerna:**
  - **`startsidan visar arterna som kort`:** testdatan ger två artkort (Abborre och Torsk) och ett
    kort för tral-test. Rubriken är "2 arter, 3 kartor".
  - **`artkortets knapp öppnar kartan`:** länken "Torsk större än 20 cm, uppväxt, västkusten (test)"
    leder till `#/karta/torsk-test`.
  - **`artkorten har artens silhuett`:** Torsk-kortet har en `svg`, och tral-test-kortet har ingen.
  - **`högst 12 arter först och sedan Visa alla`:** katalogen fångas med `page.route` och får 15
    arter. 12 kort syns, och efter "Visa alla 15 arter" syns 15.
  - **`Art visas inte i startsidans filter`:** gruppen "Art" finns inte.
  - **`Så läser du kartorna`:** kortet finns, och länken går till Om-sidan.
  - Ta bort `valt projektkort markeras` och `träfflistan har artikoner` på startsidan.
- [ ] **Step 3:** Kör och se testerna falla.
- [ ] **Step 4: Implementera** efter skisserna och specens tillägg.
- [ ] **Step 5:** Kör `npx vitest run`, `npm run build` och hela `npx playwright test`. Rätta tester som
  byggde på den gamla startsidan (`data-testid="traff"` finns på knapparna, en per karta).
- [ ] **Step 6: Commit** `feat(webb): ny startsida med artkort`.
