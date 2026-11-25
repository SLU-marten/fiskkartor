# Fiskkartor – Phase 0–1: Publishing pipeline and 25 m performance test – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the R publishing pipeline that turns the team's catalogue rows and rasters into versioned Cloud-Optimized GeoTIFFs plus `katalog.json`, prove with a minimal OpenLayers page that a 25 m east-coast map renders smoothly, and deploy both to GitHub Pages. This ends at *Kontrollpunkt 1*.

**Architecture:** A monorepo `fiskkartor` holds an R package (`publicering/`) that validates and converts rasters and writes a static data tree, a JSON Schema (`schema/`) that is the contract between R and the web app, and a Vite/TypeScript web app (`webb/`). In this phase the web app is only a performance harness (`perf.html`). Published data lives on an orphan branch `data` that is force-pushed as one snapshot commit, and a GitHub Actions workflow combines `main` and `data` into one Pages site, so app and data share an origin.

**Tech Stack:** R ≥ 4.3 with terra (GDAL ≥ 3.6), readxl, writexl, jsonlite, digest, stringi, testthat; Node ≥ 20 with Vite, TypeScript, OpenLayers (`ol` ≥ 10), proj4, Vitest, Playwright, Ajv; GitHub Actions and GitHub Pages.

**Spec:** Design doc "Modernisering av kartappen – bedömning och plan", https://claude.ai/artifact/P2UeWDckUoCK1SEQ8HV7QT (approved 2026-11-25). Task 1 exports it to `docs/superpowers/specs/2026-11-25-kartportal-design.md`. Executors read both documents.

**Repository:** https://github.com/SLU-marten/fiskkartor (public; Pages source = GitHub Actions; site `https://slu-marten.github.io/fiskkartor/`).

**Later plans:** Plan 2 (Fas 2, map viewer: search, filters, metadata panel, downloads, permalinks, Svelte UI) is written after Kontrollpunkt 1, because the performance results decide its rendering details. Plan 3 covers Fas 3–4.

## Global Constraints

- Nothing in this phase runs a server we operate. Output is static files only.
- Allowed CRSs: EPSG:3006, 3035, 25833, 4326 and 3857. The IGNF ETRS89-LAEA code (NMK Yngel) is rewritten to EPSG:3035. Any other CRS is refused.
- Classified files: uint8, nodata 255, DEFLATE, block size 512, overviews with MODE. (GDAL 3.12 does not support MAX for overviews. MODE keeps the same cells as MAX because nodata is not counted.)
- Continuous files: uint16, value × 1000, nodata 65535, DEFLATE with `PREDICTOR=STANDARD`, block size 512, overviews with AVERAGE. Never uint32. Do not use ZSTD.
- Continuous values are probabilities from modelling and are shown as 0–1 (stored value / 1000).
- Source scale of continuous files:
  - When the catalogue column `skala_kalla` is set (`1` or `1000`), it is used.
  - Otherwise: max ≤ 1.001 means 0–1 (values above 1 are clamped to 1), and 2 ≤ max ≤ 1000 means 0–1000.
  - Anything else stops with a message asking for `skala_kalla`: 1.001 < max < 2, max > 1000, or min < 0.
- Default classes: `5=Viktigt;10=Mycket viktigt`. PanBalticScope: `0=Ej viktigt område;5=Viktigt;10=Mycket viktigt` with `0` uncoloured.
- A published map file (`.tif`) is never overwritten. A changed source raster gives a new version folder `v<n>`. `metadata.json` lives outside the version folders and is rewritten when the catalogue text changes, so a downloaded metadata file always matches the portal.
- Data tree: `katalog/katalog.json`, plus for each map `kartor/<projekt-slug>/<kart-id>/metadata.json`, `…/v<n>/visning.tif` (classified) and `…/v<n>/radata.tif` (continuous, optional). `<projekt-slug> = skapa_id(projekt)`. Performance-test files go in `test/`, outside the catalogue.
- Each published file carries two hashes: `sha256` of the published COG (integrity, for users) and `kallaSha256` of the source file (change detection, for `publicera()`).
- `upplosning` in `katalog.json` is always in metres. For EPSG:4326 it is computed at the raster's mean latitude, and the coarser of x and y is used.
- Contact for migrated maps: `SLU-Aqua-fiskkartor@slu.se`.
- Publishing refuses a row with missing required metadata or a raster with no valid CRS.
- The Excel file `katalog/katalog.xlsx` is the master. Every run also writes `katalog/katalog.csv` next to it.
- Column `visas` (ja/nej): hidden and never published → not uploaded. Hidden after publishing → stays in `katalog.json` with `"visas": false` and its files are kept.
- Permalinks depend only on `id`: lowercase ASCII, digits and hyphens.
- Licence is preliminary: `CC BY 4.0`.
- GitHub Pages limits: published site ≤ 1 GB, single file in git ≤ 100 MB. The pipeline refuses to push if any file is > 100 MB or the data tree is > 950 MB.
- User-facing messages (validation errors, UI text) are Swedish. Code identifiers follow the spec's Swedish names (`publicera`, `katalog.json`).

## Review Focus

1. **Publishing from a machine that lacks the full data tree.** A force-push of an incomplete `_data` would delete earlier versions and break cited links. `skicka_data()` must refuse when any remote file under `kartor/*/v*/` is missing locally. Pinned in Task 8.
2. **Swedish characters, spaces and messy Excel cells.** Examples: `Torsk större än 20 cm_uppväxt_västkust_2021.tif`, Windows backslashes, NFC vs NFD, trailing spaces, `2021.0`, `JA`/`nej`, empty rows. Files must resolve, ids must be clean ASCII, and bad cells give one clear message. Pinned in Task 2.
3. **Re-running `publicera()` on unchanged input** must not create a new version or touch any `.tif`. A text-only edit rewrites `katalog.json` and `metadata.json` only. Pinned in Task 5.
4. **Continuous values with an unclear or wrong scale**: 1.00001 from a 0–1 model, 1.5, raw uint32 counts, negative numbers. Values must be clamped, or the run must stop with a message naming the file, the max and `skala_kalla`. They must never be silently mis-scaled. Pinned in Task 3; `skriv_cog()` in Task 4 calls the same validation.
5. **Raster without nodata or CRS** (NMK files carry IGNF or no EPSG code) must fail validation with the file name, never publish a map that renders blank. Pinned in Task 3.

---

## File Structure

```
fiskkartor/
  README.md                                   how to publish a map (Swedish)
  docs/superpowers/specs/2026-11-25-kartportal-design.md
  docs/superpowers/plans/<this file>
  docs/kontrollpunkt-1.md                     Task 9 report
  katalog/katalog.xlsx, katalog/katalog.csv   master catalogue (Task 6)
  schema/katalog.schema.json                  contract R ⇄ web (Task 1)
  schema/exempel/katalog.json                 valid example
  schema/package.json, schema/test/schema.test.mjs
  publicering/                                R package "fiskkartor"
    DESCRIPTION, NAMESPACE
    R/id.R              skapa_id()
    R/katalog.R         KATALOG_KOLUMNER, las_katalog(), skriv_katalog(), exportera_csv()
    R/validera.R        validera_rad(), tolka_klasser()
    R/crs.R             TILLATNA_EPSG, epsg_kod(), normalisera_crs(), kalla_skala(), validera_raster()
    R/cog.R             skriv_cog(), statistik()
    R/publicera.R       mal_lokal(), publicera(), publicera_alla()
    R/migrera.R         migrera_metadata()
    R/skicka.R          kontrollera_storlek(), hamta_data(), skicka_data()
    inst/skript/skapa_testcog.R
    tests/testthat/test-*.R, tests/testthat/fixtures/
  webb/
    package.json, vite.config.ts, tsconfig.json, perf.html
    src/karta/projektioner.ts   TILLATNA_EPSG, registreraProjektioner()
    src/karta/stil.ts           klassadStil(), kontinuerligStil(), markUpplosning()
    src/karta/lager.ts          skapaCogLager()
    src/perf.ts                 perf harness page logic
    tests/range-server.ts       startaRangeServer()
    tests/*.test.ts (Vitest), tests/perf.spec.ts (Playwright)
    tests/fixtures/test_klassad.tif, test_kontinuerlig.tif, test_klassad_3035.tif
  .github/workflows/test.yml, .github/workflows/pages.yml
```

---

### Task 1: Repository, spec copy and catalogue schema

**Files:**
- Create: `README.md`, `.gitignore`, `docs/superpowers/specs/2026-11-25-kartportal-design.md`, `schema/katalog.schema.json`, `schema/exempel/katalog.json`, `schema/package.json`, `schema/test/schema.test.mjs`

**Interfaces:**
- Produces: the `katalog.json` shape used by Tasks 5, 7 and Plan 2:

```json
{
  "schemaVersion": 1,
  "genererad": "2026-11-25T12:00:00Z",
  "kartor": [{
    "id": "berggylta-uppvaxt-vastkusten-2021",
    "titel": "Berggylta uppväxt västkusten", "projekt": "NMK",
    "kalla": "Nationell marin kartering (Ryssja)", "citering": "Fredriksson m fl 2021",
    "ar": 2021, "kvalitet": "…", "licens": "CC BY 4.0", "kontakt": "SLU-Aqua-fiskkartor@slu.se",
    "sprak": "sv", "doi": null, "farg": "YlGnBu", "visas": true,
    "metadata": "kartor/nmk/berggylta-uppvaxt-vastkusten-2021/metadata.json",
    "falt": { "art": "Berggylta", "vetenskapligt_namn": "Labrus bergylta", "livsstadium": "Uppväxt",
              "havsomrade": "Västerhavet", "omrade": "…", "rodlista": "LC", "fiskbarometern": null,
              "simblasa": "Ja", "livsmiljo": "…" },
    "aktuellVersion": 1,
    "versioner": [{
      "version": 1, "publicerad": "2026-11-25",
      "klassad": { "fil": "kartor/nmk/berggylta-uppvaxt-vastkusten-2021/v1/visning.tif",
                   "sha256": "<COG>", "kallaSha256": "<source>", "bytes": 25941, "epsg": 25833, "upplosning": 250,
                   "klasser": [{"varde": 5, "namn": "Viktigt", "farg": true}, {"varde": 10, "namn": "Mycket viktigt", "farg": true}] },
      "kontinuerlig": { "fil": "…/v1/radata.tif", "sha256": "<COG>", "kallaSha256": "<source>", "bytes": 1,
                        "epsg": 25833, "upplosning": 250, "skala": 1000, "enhet": "sannolikhet",
                        "min": 0.087, "max": 0.841, "p2": 0.1, "p98": 0.8 }
    }]
  }]
}
```

`kontinuerlig` may be `null`. All `fil` paths are relative to the data root.

- [ ] **Step 1: Create the repo layout and export the spec.** Clone `https://github.com/SLU-marten/fiskkartor` (it exists and may hold only a README; keep its history) and work on `main`. Add this plan under `docs/superpowers/plans/`. Export the design doc as markdown with the Claude Docs export tool (container `{"kind":"project","id":"b25dd505-fa85-4d6e-be58-05fab2380a28"}`, file `085fa553-8a37`, format `markdown`) and decode the base64 into the spec path. `.gitignore`: `node_modules/`, `dist/`, `*.Rproj.user`, `.Rhistory`, `publicering/tests/testthat/_tmp/`, `webb/test-results/`, `webb/perf/`.
- [ ] **Step 2: Write the failing schema tests** in `schema/test/schema.test.mjs` (node:test + Ajv 2020 + ajv-formats):
  - `exempel validerar` – `schema/exempel/katalog.json` is valid.
  - `id måste vara slug` – an entry with `"id": "Torsk Större"` is invalid.
  - `klassad krävs` – a version without `klassad` is invalid.
  - `kontinuerlig får vara null` – a version with `"kontinuerlig": null` is valid.
  - `skala måste vara 1000` – `"skala": 1` is invalid.
  - `båda hasharna krävs` – a `klassad` object without `kallaSha256` is invalid.
  - `farg krävs` – a map without `farg` is invalid.
- [ ] **Step 3: Run** `cd schema && npm install && node --test`. Expected: FAIL (schema file missing).
- [ ] **Step 4: Write `katalog.schema.json`** (draft 2020-12).
  - Required top level: `schemaVersion` (const 1), `genererad` (date-time), `kartor`.
  - Required per map: `id` (pattern `^[a-z0-9]+(-[a-z0-9]+)*$`), `titel`, `projekt`, `kalla`, `citering`, `ar` (integer 1900–2100), `licens`, `kontakt`, `sprak` (enum `sv`, `en`), `farg` (string), `visas` (boolean), `metadata` (string), `falt` (object of string|null), `aktuellVersion`, `versioner` (minItems 1).
  - Required per version: `version`, `publicerad` (date), `klassad`, `kontinuerlig` (object or null).
  - Required per file object: `fil`, `sha256`, `kallaSha256` (both pattern `^[0-9a-f]{64}$`), `bytes`, `epsg` (enum = the five allowed codes), `upplosning` (number > 0, metres).
  - `skala` is const 1000.
  - Also write the example file.
- [ ] **Step 5: Run** `node --test`. Expected: 7 passing.
- [ ] **Step 6: Write `README.md`** with a 10-line Swedish summary and a placeholder heading "Publicera en karta" (filled in by Task 9). Commit: `git add -A && git commit -m "chore: repo, spec and katalog schema"`.

---

### Task 2: R package skeleton, ids and catalogue reading

**Files:**
- Create: `publicering/DESCRIPTION` (Package: fiskkartor; Imports: terra, readxl, writexl, jsonlite, digest, stringi), `publicering/NAMESPACE`, `publicering/R/id.R`, `publicering/R/katalog.R`, `publicering/tests/testthat.R`, `publicering/tests/testthat/test-id.R`, `publicering/tests/testthat/test-katalog.R`, `.github/workflows/test.yml`

**Interfaces:**
- Produces:
  - `skapa_id(text: character) -> character`
  - `KATALOG_KOLUMNER` (character constant, this exact order): `id, titel, projekt, kalla, citering, ar, kvalitet, licens, kontakt, sprak, doi, visas, fil_klassad, fil_kontinuerlig, skala_kalla, klasser, ofargade_klasser, enhet, farg, art, vetenskapligt_namn, livsstadium, havsomrade, omrade, rodlista, fiskbarometern, simblasa, livsmiljo`
  - `las_katalog(sokvag: character, flik = "katalog") -> data.frame` (columns `KATALOG_KOLUMNER`; `ar` integer; `visas` logical; other columns character, `NA` when empty)
  - `skriv_katalog(df: data.frame, sokvag: character) -> invisible(sokvag)` (writexl, sheet `katalog`)
  - `exportera_csv(sokvag_xlsx: character) -> character` (writes `katalog.csv` beside it, UTF-8 with BOM so Excel opens å/ä/ö correctly, `;` separator; returns the path)

- [ ] **Step 1: Environment.** Here: `apt-get install -y r-base-core r-cran-terra r-cran-testthat r-cran-readxl r-cran-writexl r-cran-jsonlite r-cran-digest r-cran-stringi gdal-bin`. On Windows: install the same packages from CRAN. rclone is not needed until step 2 (slu.se).
- [ ] **Step 2: Write the failing tests.**

```r
test_that("skapa_id ger ren ASCII-slug", {
  expect_equal(skapa_id("Torsk större än 20 cm uppväxt västkusten 2021"),
               "torsk-storre-an-20-cm-uppvaxt-vastkusten-2021")
  expect_equal(skapa_id("Braxen/björkna uppväxt  ostkusten"), "braxen-bjorkna-uppvaxt-ostkusten")
  expect_equal(skapa_id(" Femtömmad skärlånga "), "femtommad-skarlanga")
  expect_equal(skapa_id("Gädda"), skapa_id(stringi::stri_trans_nfd("Gädda")))  # NFD input
})

test_that("las_katalog städar Excel-celler", {
  f <- withr::local_tempfile(fileext = ".xlsx")   # or tempfile() + on.exit
  rader <- data.frame(id = c(" a-1 ", NA), titel = c("A", NA), ar = c("2021.0", NA),
                      visas = c("JA", NA), fil_klassad = c("data\\rst\\x å.tif", NA))
  writexl::write_xlsx(list(katalog = rader), f)
  k <- las_katalog(f)
  expect_equal(nrow(k), 1)                       # fully empty row dropped
  expect_identical(names(k), KATALOG_KOLUMNER)   # missing columns added as NA
  expect_equal(k$id, "a-1"); expect_identical(k$ar, 2021L); expect_true(k$visas)
  expect_equal(k$fil_klassad, "data/rst/x å.tif")
})

test_that("las_katalog stoppar på okänt visas-värde", {
  # visas = "kanske" → error message contains "visas" and the row number (Excel row 2)
})

test_that("exportera_csv skriver semikolon och BOM", {
  # after skriv_katalog + exportera_csv: first 3 bytes are EF BB BF, header line starts "id;titel;"
})
```

  Use base `tempfile()` if withr is not installed. The last two tests take the assertions written in their comments.
- [ ] **Step 3: Run** `Rscript -e 'testthat::test_local("publicering")'`. Expected: FAIL (functions missing).
- [ ] **Step 4: Implement** `skapa_id()` with `stringi::stri_trans_nfc`, then `stri_trans_general(x, "Latin-ASCII")`, lowercase, non-alphanumerics → `-`, collapse and trim hyphens. Implement `las_katalog()`, `skriv_katalog()` and `exportera_csv()` per the Interfaces block. `visas` accepts ja/nej/true/false in any case. Path cells get `\` → `/` and NFC normalisation.
- [ ] **Step 5: Run the tests.** Expected: all pass.
- [ ] **Step 6: Add CI** `.github/workflows/test.yml`. On push and PR: job `r` (r-lib/actions/setup-r@v2, setup-r-dependencies@v2 with `working-directory: publicering`, then `Rscript -e 'testthat::test_local("publicering", stop_on_failure = TRUE)'`) and job `schema` (`cd schema && npm ci && node --test`). Commit: `feat(publicering): ids och katalogläsning`.

---

### Task 3: Row and raster validation, CRS normalisation

**Files:**
- Create: `publicering/R/validera.R`, `publicering/R/crs.R`, `publicering/tests/testthat/test-validera.R`, `publicering/tests/testthat/test-crs.R`, `publicering/tests/testthat/helper-raster.R`

**Interfaces:**
- Consumes: `las_katalog()` row format (Task 2).
- Produces:
  - `tolka_klasser(text: character, ofargade = NA_character_) -> data.frame(varde = integer, namn = character, farg = logical)`. `NA` text → default `5=Viktigt;10=Mycket viktigt`.
  - `validera_rad(rad: data.frame, filrot: character) -> character`. Swedish error messages, `character(0)` when OK. Rows with `visas = FALSE` and no files are not validated.
  - `TILLATNA_EPSG <- c(3006L, 3035L, 25833L, 4326L, 3857L)`
  - `epsg_kod(r: SpatRaster) -> integer` (`NA_integer_` when unknown; IGNF ETRS89-LAEA → 3035L)
  - `normalisera_crs(r: SpatRaster) -> SpatRaster` (sets `crs(r) <- "EPSG:<kod>"`; errors when `epsg_kod()` is NA or not allowed)
  - `validera_raster(sokvag: character, roll: c("klassad", "kontinuerlig"), klasser = NULL, skala_kalla = NA_integer_) -> character`
  - `kalla_skala(min: numeric, max: numeric, skala_kalla = NA_integer_) -> integer`. Returns `1L` or `1000L` per the Global Constraints rule, or errors with a Swedish message that names `skala_kalla`. `validera_raster()` and `skriv_cog()` both use it.

- [ ] **Step 1: Write a test helper** `helper-raster.R`: `testraster(varden, crs = "EPSG:3006", nodata = 255, typ = "INT1U")`. It writes a 20×20 raster at 25 m, origin (600000, 6600000), to a temp GTiff and returns the path.
- [ ] **Step 2: Write the failing tests** (`expect_match` on the messages):
  - `validera_rad` with `kontakt = NA` → message contains `"kontakt saknas"`. With `fil_klassad` pointing to a missing file → `"hittar inte filen"` plus the path. With `id = "Torsk 1"` → `"id får bara innehålla"`.
  - `validera_rad` on a hidden row with no files → `character(0)`.
  - `tolka_klasser("0=Ej viktigt område;5=Viktigt;10=Mycket viktigt", "0")` → 3 rows, `farg == c(FALSE, TRUE, TRUE)`.
  - `epsg_kod()` on a raster whose CRS is the IGNF LAEA WKT from `NMK Yngel` (copy `crs(rast(<yngel file>))` into `fixtures/ignf_laea.wkt`) → `3035L`.
  - `validera_raster(<EPSG:32633 raster>, "klassad")` → `"koordinatsystem"` and `"32633"`.
  - `validera_raster(<raster with no CRS>, "klassad")` → `"saknar koordinatsystem"`.
  - `validera_raster(<classified values 5, 10, 7>, "klassad", tolka_klasser(NA))` → `"värdet 7"`.
  - `validera_raster(<continuous max 5000>, "kontinuerlig")` → `"utanför 0–1000"` and `"5000"`.
  - `validera_raster(<continuous with negative values>, "kontinuerlig")` → `"utanför 0–1000"`.
  - `validera_raster(<valid 0–1 float with NaN nodata>, "kontinuerlig")` → `character(0)`.
  - `kalla_skala(0, 1.00001)` → `1L`. `kalla_skala(0, 841)` → `1000L`. `kalla_skala(0, 1.5)` → error matching `"tvetydig skala"` and `"skala_kalla"`. `kalla_skala(0, 1.5, skala_kalla = 1000L)` → `1000L`.
- [ ] **Step 3: Run.** Expected: FAIL.
- [ ] **Step 4: Implement.** Read values block-wise for large rasters: use `terra::global(r, c("min", "max"), na.rm = TRUE)` and, for classes, `terra::unique(r)`. Do not use `values(r)` on full 25 m rasters (about 1e9 cells). `epsg_kod()` uses `terra::crs(r, describe = TRUE)$code`. When that is NA, match the LAEA parameters (`+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000`) from `crs(r, proj = TRUE)`.
- [ ] **Step 5: Run.** Expected: all pass. Commit: `feat(publicering): validering och koordinatsystem`.

---

### Task 4: COG writing and legend statistics

**Files:**
- Create: `publicering/R/cog.R`, `publicering/tests/testthat/test-cog.R`

**Interfaces:**
- Consumes: `normalisera_crs()`, `validera_raster()` (Task 3).
- Produces:
  - `skriv_cog(kalla: character, mal: character, roll: c("klassad", "kontinuerlig"), skala_kalla = NA_integer_) -> list(epsg = integer, upplosning = numeric, skala = 1000L or NA, bytes = numeric, sha256 = character, kallaSha256 = character)`. `upplosning` is in metres (see Global Constraints).
  - `statistik(cog: character, roll) -> list`. Classified: `list(varden = integer())`, the class values present. Continuous: `list(min, max, p2, p98)` on the 0–1 scale, rounded to 3 decimals. Computed from `terra::freq()` on the written uint16 COG (at most 1001 distinct values) with cumulative counts. `pK` = the smallest stored value whose cumulative count is ≥ K % of the valid cells, divided by 1000. Never use `quantile()` or `values()` on the full raster.

- [ ] **Step 1: Write the failing tests.**

```r
test_that("klassad COG: uint8, nodata 255, COG-layout och översikter", {
  src <- testraster(rep(c(5, 10), each = 200), nodata = 255)
  ut <- tempfile(fileext = ".tif")
  res <- skriv_cog(src, ut, "klassad")
  info <- terra::describe(ut)
  expect_true(any(grepl("LAYOUT=COG", info)))
  expect_true(any(grepl("COMPRESSION=DEFLATE", info)))
  expect_true(any(grepl("Overviews", info)) || nrow(terra::rast(ut)) <= 512)
  expect_equal(terra::datatype(terra::rast(ut)), "INT1U")
  expect_identical(res$epsg, 3006L); expect_true(is.na(res$skala))
})

test_that("kontinuerlig 0–1 skalas till uint16 × 1000", {
  src <- testraster(seq(0, 1, length.out = 400), nodata = NaN, typ = "FLT4S")
  ut <- tempfile(fileext = ".tif"); res <- skriv_cog(src, ut, "kontinuerlig")
  r <- terra::rast(ut)
  expect_equal(terra::datatype(r), "INT2U"); expect_identical(res$skala, 1000L)
  expect_equal(unname(terra::global(r, "max", na.rm = TRUE)[[1]]), 1000)
  st <- statistik(ut, "kontinuerlig")
  expect_equal(st$max, 1); expect_equal(st$p2, 0.018); expect_equal(st$p98, 0.98)
})

test_that("kontinuerlig som redan är 0–1000 skalas inte om", {
  # Ryssja-style float 87..841 → stored max 841, statistik()$max == 0.841
})

test_that("kontinuerlig med max 1.00001 klampas till 1000", {
  # values seq(0, 1.00001, length.out = 400) → stored max 1000, no error
})

test_that("upplösning i meter även för EPSG:4326", {
  # testraster with crs "EPSG:4326", res c(0.05556, 0.03333), centred at 57°N
  # → skriv_cog()$upplosning between 3600 and 3750 (coarser of x ≈ 3368 m and y ≈ 3686 m)
})

test_that("sha256 och kallaSha256 skiljer sig", {
  # res$sha256 == digest(file = ut, algo = "sha256"); res$kallaSha256 == digest(file = src, algo = "sha256")
})

test_that("statistik för klassad listar förekommande klasser", {
  # values 0, 5, 10 → statistik(ut, "klassad")$varden == c(0L, 5L, 10L)
})
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement `skriv_cog()`.** Run `validera_raster()` first and stop with its messages. Apply `normalisera_crs()`. Classified: `terra::writeRaster(r, mal, filetype = "COG", datatype = "INT1U", NAflag = 255, gdal = c("COMPRESS=DEFLATE", "BLOCKSIZE=512", "OVERVIEW_RESAMPLING=MODE", "BIGTIFF=IF_SAFER"))`. Continuous: get the scale from `kalla_skala()`. If it is 1, clamp values to at most 1 and multiply by 1000. Round, then write `datatype = "INT2U"`, `NAflag = 65535`, `gdal = c("COMPRESS=DEFLATE", "PREDICTOR=STANDARD", "BLOCKSIZE=512", "OVERVIEW_RESAMPLING=AVERAGE", "BIGTIFF=IF_SAFER")`. Write through a temp file in the same folder and rename at the end, so a crash never leaves a half-written file.
- [ ] **Step 4: Run.** Expected: all pass.
- [ ] **Step 5: Measure on the 25 m sample.** Run `skriv_cog()` on `abborre/ensemble_mean.tif` (continuous). For the classified file, use presence = mean ≥ 0.3 (TSS threshold from `metadata.yml`, because `ensemble_binary.tif` contains only nodata), split at the presence median, and write 5/10. Expected about 59 MB and 3.4 MB, under 2 minutes each. Record the numbers in the commit message. Commit: `feat(publicering): COG-skrivning och legendstatistik`.

---

### Task 5: `publicera()` with versions and catalogue output

**Files:**
- Create: `publicering/R/publicera.R`, `publicering/tests/testthat/test-publicera.R`, `schema/validera.mjs` (CLI: `node schema/validera.mjs <katalog.json>` exits 0 when the file is valid, otherwise exits 1 and prints Ajv errors)

**Interfaces:**
- Consumes: `las_katalog`, `exportera_csv` (Task 2); `validera_rad`, `tolka_klasser` (Task 3); `skriv_cog`, `statistik` (Task 4); the schema (Task 1).
- Produces:
  - `mal_lokal(mapp: character) -> list(typ = "lokal", mapp = mapp)`
  - `publicera(id: character, katalog = "katalog/katalog.xlsx", filrot = ".", mal, idag = Sys.Date()) -> invisible(list(id, version, status))`, with `status` one of `"publicerad"`, `"oförändrad"`, `"uppdaterad"` (metadata only) or `"dold"`
  - `publicera_alla(katalog, filrot, mal, idag = Sys.Date()) -> data.frame(id, status, meddelande)`. It never stops on one bad row, and it writes `katalog.json` once at the end.

- [ ] **Step 1: Write the failing tests.** Fixture: a temp catalogue with two rows and a temp target folder. One row is visible with classified + continuous test rasters and `projekt = "PanBalticScope"`. The other is hidden and never published.
  - First `publicera("a-1", …)`: status `"publicerad"`, version 1. These files exist: `kartor/panbalticscope/a-1/metadata.json`, `kartor/panbalticscope/a-1/v1/visning.tif` and `…/v1/radata.tif`. The folder name comes from `skapa_id(projekt)`. `katalog/katalog.json` validates against `schema/katalog.schema.json` (`system2("node", c("schema/validera.mjs", <fil>))` returns 0; skip with a message when node is missing). `katalog.csv` exists.
  - Same call again: status `"oförändrad"`. `file.info(...)$mtime` of `visning.tif` is unchanged.
  - Change only `titel` and publish: status `"uppdaterad"`, version still 1. Both `katalog.json` and `metadata.json` have the new title. The `mtime` of `v1/visning.tif` is unchanged.
  - Replace the classified raster with different values and publish: status `"publicerad"`, version 2, `v1/` still present and unchanged, `aktuellVersion == 2`.
  - Set `visas` to `nej` and publish: status `"dold"`. The entry remains with `"visas": false`, and no files are removed.
  - `publicera("b-hidden")` for the never-published hidden row: no files and no `katalog.json` entry.
  - A row with a validation error: `publicera()` stops with every message, and `publicera_alla()` reports `status = "fel"` and continues.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Version decision: compute `digest::digest(file = <source>, algo = "sha256")` for the classified and continuous source files. If both equal the `kallaSha256` values of `aktuellVersion` in the existing `katalog.json`, there is no new version. Otherwise use version = max + 1. The `sha256` field holds the hash of the written COG and is never used for the version decision. Write the `.tif` files first, then `metadata.json` (the full catalogue entry, all versions), and `katalog.json` last. `katalog.json` is written with `jsonlite::write_json(auto_unbox = TRUE, pretty = TRUE, null = "null", na = "null")`.
- [ ] **Step 4: Run.** Expected: all pass. Commit: `feat(publicering): publicera med versioner och katalog.json`.

---

### Task 6: Migrate the old metadata to the new catalogue

**Files:**
- Create: `publicering/R/migrera.R`, `publicering/tests/testthat/test-migrera.R`, `publicering/tests/testthat/fixtures/metadata_gammal.xlsx` (copy of `App från Nataliia 20251020/Vindkraft-lst_NK/data/metadata/metadata.xlsx`, 91 rows), `katalog/katalog.xlsx`

**Interfaces:**
- Consumes: `skapa_id`, `skriv_katalog`, `KATALOG_KOLUMNER` (Task 2).
- Produces: `migrera_metadata(gammal_xlsx: character, standard = list(licens = "CC BY 4.0", kontakt = <required, no default>)) -> data.frame` with `KATALOG_KOLUMNER`.

Mapping (old → new): `name→art`, `map_name→titel` (whitespace squeezed), `lat_name→vetenskapligt_namn`, `lifestage→livsstadium`, `sea→havsomrade`, `area→omrade`, `year→ar`, `source→kalla`, `citation→citering`, `uncert→kvalitet`, `iucn→rodlista`, `fiskbarom→fiskbarometern`, `sw_bl→simblasa`, `hab→livsmiljo`. Further rules:
- `id = skapa_id(paste(titel, ar))`.
- `projekt`: `"NMK"` for sources starting `Nationell marin kartering`, `"PanBalticScope"` for PanBalticScope.
- `sprak = "en"` for PanBalticScope, else `"sv"`.
- `risk1`–`risk5`, `uncert_risk`, `details` and `rst_name` are dropped.
- Rows with no `source` get `visas = FALSE` and no files. All others get `visas = TRUE`.

File paths, relative to the folder `C:\Github Projects\Vindkraft lst`:
- Ryssja and Yngel: `fil_klassad = "Data not in app/data/data/" + sub("^data/", "", filepath)`, `fil_kontinuerlig = "Data not in app/data/" + sub("^data/", "", filepath)`.
- All NMK rows with a continuous file: `skala_kalla = "1000"`, as an explicit value so the 0–1000 files are never guessed.
- PanBalticScope: `fil_klassad` as above, `fil_kontinuerlig = NA`, `klasser = "0=Ej viktigt område;5=Viktigt;10=Mycket viktigt"`, `ofargade_klasser = "0"`.
- Trål: `stem = sub("_vuxen_V$", "", rst_name)`, `fil_klassad = "Data not in app/data/data/rst/NMK Trål/<stem>.tif"`, `fil_kontinuerlig = "Data not in app/data/rst/NMK Trål/r/<stem>.tif"`.

- [ ] **Step 1: Write the failing tests** with `standard = list(licens = "CC BY 4.0", kontakt = "test@example.org")`:
  - `nrow == 91`, `sum(visas) == 75`, `!anyDuplicated(id)`, all ids match the slug pattern.
  - The row with `id == "berggylta-uppvaxt-vastkusten-2021"` has `fil_klassad == "Data not in app/data/data/rst/NMK Ryssja/Berggylta_uppväxt_västkust_2021.tif"` and `fil_kontinuerlig == "Data not in app/data/rst/NMK Ryssja/Berggylta_uppväxt_västkust_2021.tif"`.
  - The row with `id == "bergskadda-vuxen-vastkusten-2024"` has `fil_klassad == "Data not in app/data/data/rst/NMK Trål/proj_Bergskadda_2005_2022_AllYear_Bergskadda_ensemble.tif"`.
  - The row with `id == "abborre-lek-ostkusten-2021"` has `is.na(fil_kontinuerlig)`, `ofargade_klasser == "0"` and `sprak == "en"`.
  - Every row whose `titel` starts with `"Harr"` has `visas == FALSE`.
  - `migrera_metadata(f, list(licens = "CC BY 4.0"))` errors with a message containing `"kontakt"`.
- [ ] **Step 2: Run.** Expected: FAIL. **Step 3: Implement.** **Step 4: Run.** Expected: pass.
- [ ] **Step 5: Produce the real catalogue.** Run `migrera_metadata(<old metadata>, list(licens = "CC BY 4.0", kontakt = "SLU-Aqua-fiskkartor@slu.se"))`, then `skriv_katalog(df, "katalog/katalog.xlsx")` and `exportera_csv("katalog/katalog.xlsx")`. Commit: `feat(publicering): migrering av gammal metadata`.

---

### Task 7: Performance harness page (OpenLayers + COG)

**Files:**
- Create: `webb/package.json`, `webb/vite.config.ts` (base `./`, inputs `index.html` + `perf.html`), `webb/tsconfig.json`, `webb/index.html` (placeholder text "Fiskkartor – under uppbyggnad"), `webb/perf.html`, `webb/src/karta/projektioner.ts`, `webb/src/karta/stil.ts`, `webb/src/karta/lager.ts`, `webb/src/perf.ts`, `webb/tests/range-server.ts`, `webb/tests/range-server.test.ts`, `webb/tests/stil.test.ts`, `webb/tests/perf.spec.ts`, `webb/playwright.config.ts`, `publicering/inst/skript/skapa_testcog.R`, `webb/tests/fixtures/test_klassad.tif`, `webb/tests/fixtures/test_kontinuerlig.tif`, `webb/tests/fixtures/test_klassad_3035.tif`
- Modify: `.github/workflows/test.yml` (add job `webb`: `npm ci`, `npx vitest run`, Playwright with the fixture COG only)

**Interfaces:**
- Consumes: the `klasser` / `skala` shape from `katalog.json` (Task 1).
- Produces (reused by Plan 2):
  - `TILLATNA_EPSG: readonly [3006, 3035, 25833, 4326, 3857]` and `registreraProjektioner(): void`, which registers through `proj4.defs` + `ol/proj/proj4` `register`:
    - `EPSG:3006` and `EPSG:25833`: `+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs`
    - `EPSG:3035`: `+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs`
  - `klassadStil(klasser: {varde: number; namn: string; farg: boolean}[]): WebGLTileStyle`. A `case` expression on `['band', 1]`. Coloured classes get YlGnBu colours, light to dark by value order. Uncoloured classes and nodata get `[0,0,0,0]`.
  - `kontinuerligStil(skala: number, min: number, max: number, nodata = 65535): WebGLTileStyle`. A `case` that first maps `['==', ['band', 1], nodata]` to `[0,0,0,0]`, otherwise an `interpolate` over `['/', ['band', 1], skala]` with 5 YlGnBu stops. Without the case, OpenLayers would clamp 65535 to the top colour.
  - `skapaCogLager(url: string, epsg: number, nodata: number, stil: WebGLTileStyle): WebGLTileLayer`. Source `new GeoTIFF({ sources: [{ url, nodata }], normalize: false, interpolate: false, projection: 'EPSG:' + epsg })`.
  - `startaRangeServer(rot: string, port = 0): Promise<{ url: string; stang: () => Promise<void> }>`. node:http + fs streams. Answers 206 with `Content-Range`, `Accept-Ranges: bytes`, `Access-Control-Allow-Origin: *` and `Access-Control-Expose-Headers: Content-Range, Accept-Ranges, Content-Length`.
  - `markUpplosning(vy: View, lat: number): number` = `vy.getResolution() * Math.cos(lat * Math.PI / 180)`. This is the ground resolution in metres of a Web Mercator view at that latitude.
  - `perf.html?cog=<url>&roll=klassad|kontinuerlig&epsg=<n>&res=<upplosning m>&lon=&lat=&z=`. Without `lon`/`lat`/`z`, the page fits the COG's extent. The page exposes `window.__perf = { rendercomplete: number; pixelFor(x: number, y: number, epsg: number): [number, number] }`. It shows the hovered value in `#varde`:
    - the class name for classified maps;
    - for continuous maps, `0.53`, or `≈0.53` when `markUpplosning()` at the pointer is more than 1.5 × `res`;
    - `—` for nodata.

- [ ] **Step 1: Generate three fixtures** with `skapa_testcog.R`. All are 200 × 200 cells at 25 m, with a top-left 20 × 20 nodata block, written with `skriv_cog()`:
  - `test_klassad.tif`: EPSG:3006, origin (600000, 6600000), left half 5, right half 10.
  - `test_kontinuerlig.tif`: same grid, value = column index / 199. Write it as `"kontinuerlig"`.
  - `test_klassad_3035.tif`: EPSG:3035, origin (4800000, 4050000), left half 5, right half 10.
- [ ] **Step 2: Write the failing unit tests** (Vitest):
  - `range-server`: a GET with `Range: bytes=0-15` on the fixture returns status 206, a body of 16 bytes starting with `II*\0` or `II+\0`, `content-range` matching `^bytes 0-15/\d+$`, and `access-control-expose-headers` containing `Content-Range`.
  - `klassadStil([{varde:0,namn:'Ej viktigt område',farg:false},{varde:5,…,farg:true},{varde:10,…,farg:true}])`: the JSON of `color` contains `0` mapped to `[0,0,0,0]`, and two non-transparent colours, with 10 darker than 5.
  - `kontinuerligStil(1000, 0, 1)`: the JSON of `color` contains `['==', ['band', 1], 65535]` mapped to `[0,0,0,0]`.
  - `markUpplosning`: a view at resolution 38.22 and latitude 60 gives 19.11 ± 0.01.
  - `registreraProjektioner()`: afterwards `transform([603762.5, 6597487.5], 'EPSG:3006', 'EPSG:4326')` is within 1e-5° of proj4's own result.
- [ ] **Step 3: Write the failing Playwright tests** (`perf.spec.ts`, Chromium; the range server serves `webb/dist` + fixtures):
  - `hover visar klassnamn`: open `perf.html` with the fixture, wait for `__perf.rendercomplete >= 1`, move the mouse to `__perf.pixelFor(603762.5, 6597487.5, 3006)` and expect `#varde` to have text `Mycket viktigt`. At `pixelFor(600250, 6599750, 3006)` (the nodata block) the text is `—`.
  - `hover visar kontinuerligt värde`: `test_kontinuerlig.tif` with `res=25`, fitted view. At `pixelFor(603762.5, 6597487.5, 3006)`, `#varde` is `0.75` (column 150 → 150/199 → stored 754). In the nodata block it is `—`. A screenshot pixel in the nodata block has alpha 0.
  - `EPSG:3035 visas på rätt plats`: `test_klassad_3035.tif`. At `pixelFor(4803762.5, 4047487.5, 3035)`, `#varde` is `Mycket viktigt`, and at `pixelFor(4801237.5, 4047487.5, 3035)` it is `Viktigt`.
  - `25 m första vy` (skipped unless `PERF_KLASSAD` is set). Network emulation through CDP `Network.emulateNetworkConditions({ offline: false, latency: 40, downloadThroughput: 1.25e6, uploadThroughput: 5e5 })`. Full-extent load until `rendercomplete >= 1` takes ≤ 4000 ms, and the sum of `.tif` response bytes is ≤ 8 MB.
  - `25 m inzoomat` (same skip rule), for each of `[59.33, 18.90]`, `[60.70, 17.30]`, `[56.90, 16.50]` at `z=12`: cold load ≤ 4000 ms. Then drag the map 600 px, and the next `rendercomplete` arrives ≤ 1500 ms later.
  - Each 25 m test appends `{test, punkt, ms, tifKlartMs, bytes, renderare}` to `webb/perf/rapport.json`:
    - `tifKlartMs` is the time to the last `.tif` response.
    - `renderare` is the WebGL renderer string (`gl.getParameter(UNMASKED_RENDERER_WEBGL)`). Headless Chromium often renders WebGL on the CPU (SwiftShader), and this field shows when rendering rather than the network is the bottleneck.
    - The thresholds apply to `ms`. If only `ms - tifKlartMs` is over the threshold under SwiftShader, record that, and let Mårten's manual check on real hardware decide.
- [ ] **Step 4: Run** `npx vitest run && npx playwright test`. Expected: FAIL.
- [ ] **Step 5: Implement** the modules and `perf.ts`. There is no basemap in the harness, so performance is measured for the COG layer alone. `__perf.rendercomplete` is incremented on the map's `rendercomplete` event. Hover uses `layer.getData(pixel)` and returns `—` when the alpha is 0 or the value is nodata.
- [ ] **Step 6: Run.** Expected: the unit tests and the three fixture tests pass. The 25 m tests are skipped here. Commit: `feat(webb): prestandasida för COG med OpenLayers`.

---

### Task 8: Data branch push and Pages deployment

**Files:**
- Create: `publicering/R/skicka.R`, `publicering/tests/testthat/test-skicka.R`, `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: the data tree from `publicera()` (Task 5) and the `webb` build (Task 7).
- Produces:
  - `kontrollera_storlek(mapp: character, max_fil_mb = 100, max_total_mb = 950) -> character`. Swedish messages naming each offending file, or the total.
  - `hamta_data(remote: character, mapp: character, gren = "data") -> invisible(mapp)`. Runs `git clone --depth 1 --branch <gren> <remote> <mapp>` and then removes `<mapp>/.git`. If the branch does not exist yet, it creates an empty `mapp`. It errors if `mapp` exists and is not empty. Always run it before `publicera()` on a new machine.
  - `skicka_data(mapp: character, remote: character, gren = "data", meddelande = "data: <tidsstämpel>", tillat_borttag = FALSE) -> invisible(character)` (commit sha).
    1. Run `kontrollera_storlek()` and stop on any message.
    2. Fetch the remote branch (depth 1) into a scratch repo and list its files with `git ls-tree -r --name-only`. If any remote path matching `^kartor/.+/v[0-9]+/.+\.tif$` is missing in `mapp`, stop with a Swedish message listing them and saying "kör hamta_data() först", unless `tillat_borttag = TRUE`.
    3. Create an orphan branch with exactly the tree of `mapp`, commit once and run `git push --force <remote> HEAD:<gren>`. The remote branch therefore always has exactly one commit.
- Prerequisite: done. The repo `SLU-marten/fiskkartor` exists with Pages source = GitHub Actions, and this session can push (`can_push: true`).

- [ ] **Step 1: Write the failing tests** against a local bare repo (`git init --bare` in a tempdir):
  - After two `skicka_data()` calls with different contents (the second keeps every `.tif` of the first), `git -C <bare> rev-list --count data` is `"1"`, and `git -C <bare> show data:katalog/katalog.json` equals the second content.
  - Push a tree with `kartor/p/a/v1/visning.tif`. Then call `skicka_data()` from a fresh folder without that file: it errors with `"kartor/p/a/v1/visning.tif"` and `"hamta_data"`, and the bare repo's `data` commit is unchanged.
  - `hamta_data()` into an empty folder gets the pushed files and no `.git` folder.
  - `kontrollera_storlek()` on a folder holding a 101 MB sparse file returns a message containing that file name and `"100 MB"`. Create the file with `con <- file(f, "wb"); seek(con, 101 * 2^20 - 1, rw = "write"); writeBin(as.raw(0), con); close(con)`.
  - `skicka_data()` on that folder errors, and the bare repo is unchanged.
- [ ] **Step 2: Run.** Expected: FAIL. **Step 3: Implement.** **Step 4: Run.** Expected: pass.
- [ ] **Step 5: Write `pages.yml`.** Trigger on push to `main` and `data`, plus `workflow_dispatch`. Steps:
  1. Check out `main` and run `npm ci && npm run build` in `webb`.
  2. Check out branch `data` into `webb/dist/data` (`actions/checkout` with `ref: data`, `path: webb/dist/data`, `fetch-depth: 1`). If the branch does not exist yet, continue with an empty folder.
  3. Run `rm -rf webb/dist/data/.git` right after the checkout. Git's object store would otherwise roughly double the measured size.
  4. Fail if `du -sb webb/dist` is > 1,000,000,000 bytes.
  5. Upload with `actions/upload-pages-artifact` (path `webb/dist`) and deploy with `actions/deploy-pages`.
  Permissions: `pages: write`, `id-token: write`.
- [ ] **Step 6: Verify on GitHub.** Push `main`, then run `skicka_data()` with a data tree that contains only `katalog/katalog.json` with `"kartor": []`. Wait for the workflow, then check that `https://slu-marten.github.io/fiskkartor/data/katalog/katalog.json` returns 200 and that `curl -sI -H "Range: bytes=0-15" <url to a .tif>` returns `206`. Commit: `feat: datagren och Pages-publicering`.

---

### Task 9: Publish the existing maps and run Kontrollpunkt 1

**Files:**
- Create: `docs/kontrollpunkt-1.md`
- Modify: `README.md` (section "Publicera en karta", Swedish, at most 25 lines: edit the row in `katalog.xlsx`, run `publicera("<id>")` or `publicera_alla()`, run `skicka_data()`, check the site)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Stage the source data and fetch the data branch.** Stage the folders `Data not in app/data/rst` and `Data not in app/data/data/rst` from `C:\Github Projects\Vindkraft lst`, about 830 MB, in several staging calls of ≤ 500 MB each. Run `hamta_data(<remote>, "_data")`. Then run `publicera_alla("katalog/katalog.xlsx", filrot = <staged root>, mal = mal_lokal("_data"))`. Expected: 75 rows `publicerad`, 16 `dold`, 0 `fel`. For any `fel`, fix the catalogue row (not the code, unless the code is wrong) and rerun.
- [ ] **Step 2: Add the 25 m test files outside the catalogue.** Write them with `skriv_cog()` directly to `_data/test/abborre_klassad.tif` and `_data/test/abborre_kontinuerlig.tif`, from the inputs of Task 4 Step 5. They are not catalogue rows, so they never appear in the portal. Run `kontrollera_storlek("_data")`. Expected: no messages, total < 950 MB.
- [ ] **Step 3: Push and deploy.** Run `skicka_data("_data", <remote>)` and wait for the Pages workflow to go green.
- [ ] **Step 4: Run the 25 m Playwright tests against the deployed site** with `PERF_KLASSAD` and `PERF_KONTINUERLIG` set to the Pages URLs. Expected: all thresholds in Task 7 Step 3 met. If a threshold fails, try `BLOCKSIZE=256` and then rerun the tests once. Record both runs.
- [ ] **Step 5: Check the basemap candidates** (Fas 0 item, decides Plan 2). For a tile from CARTO Positron, OpenFreeMap and Lantmäteriet "Topografisk webbkarta Visning, översiktlig" (topowebb_nedtonad), record three things:
  - whether a key or token is needed, from the provider's documentation;
  - whether `curl -sI -H "Origin: https://slu-marten.github.io" <tile-url>` returns `access-control-allow-origin`;
  - the usage terms.
  A basemap qualifies only if it needs no secret in the browser and sends CORS headers. CORS is required for "Spara som bild".
- [ ] **Step 6: Write `docs/kontrollpunkt-1.md`.** Include the basemap table from Step 5, plus:
  - A table per test: point, ms, `tifKlartMs`, MB and renderer.
  - A note on the MODE overviews. When zoomed out, mixed 5/10 coastal cells show the most common class, often 5, where MAX would show 10. Mårten judges whether this is acceptable during the check.
  - The COG sizes for the 75 maps (total and largest file).
  - The list of catalogue gaps reported by validation.
  - The deviation that `ensemble_binary.tif` is empty in the NMK2 output.
  - The link `https://slu-marten.github.io/fiskkartor/perf.html?cog=data/test/abborre_klassad.tif&roll=klassad&epsg=3006&res=25` for Mårten to try on his own computer.
- [ ] **Step 7: Hand over for Kontrollpunkt 1.** Mårten opens the perf link and judges whether panning and zooming feel smooth. Kontrollpunkt 1 passes when both the measured thresholds and his judgment pass. Then Plan 2 is written. Attach the storage requirements text (the "Krav att stämma av med SLU IT inför steg 2" list from the spec) to the report, so Mårten can forward it to SLU IT. Commit: `docs: kontrollpunkt 1`.
