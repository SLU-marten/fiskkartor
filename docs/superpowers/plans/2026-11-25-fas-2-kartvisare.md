# Fas 2 – kartvisaren: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static Svelte portal on GitHub Pages where a case officer finds a fish map by search or filter, views it smoothly in SWEREF 99 TM with the value under the pointer, reads its metadata and downloads the original files, plus the publishing changes decided at Kontrollpunkt 1.

**Architecture:** `webb/` gets a Svelte 5 single-page app (`index.html`) with hash routing that reads `data/katalog/katalog.json` and renders COGs with the OpenLayers modules from fas 1. The view is EPSG:3006 with CARTO Positron reprojected underneath. `publicering/` gains MAX overviews, 3006 display copies and a file-format version, and all 75 maps are republished as v2. `perf.html` stays as the measurement page.

**Tech Stack:** Svelte 5, Vite 8, TypeScript 5.9 (svelte-check does not support TS 7), OpenLayers 10, geotiff.js (via OpenLayers), Vitest, Playwright; R (terra, sf for `gdal_utils`), GitHub Actions/Pages.

**Spec:** `docs/superpowers/specs/2026-11-25-kartportal-design.md` (sections "Mål", "Användarupplevelse", "Tekniska krav", and "Beslut vid kontrollpunkt 1", which overrides earlier rows). Evidence: `docs/kontrollpunkt-1.md`.

## Global Constraints

- No server we operate. Output is static files; the app reads data relative to the page (`data/`), overridable with `?data=<url>` for tests.
- Map view: EPSG:3006 with projection extent `[-1200000, 4700000, 2600000, 8500000]` (already set in `registreraProjektioner()`).
- COG layers: `transition: 0`, `preload: Infinity`, stand-in tiles at most one level coarser (`reserv=1`, the `findAltTiles_` limit from `perf.ts`, moved into `src/karta/lager.ts`).
- Layer file: `vy3006.fil` when present, else `fil`. Downloads always use `fil` (original grid and projection).
- Background: CARTO Positron raster `https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png?key=<VITE_CARTO_NYCKEL>`, `crossOrigin: 'anonymous'`, attribution `© OpenStreetMap, © CARTO`. Choice: CARTO or none.
- Classified styling: `klassadStil(klasser)` (uncoloured classes and nodata transparent). Continuous: `kontinuerligStil(1000, 0, 1)`, legend fixed 0–1 so maps are comparable.
- Pointer value: class name (PanBalticScope 0 shows "Ej viktigt område"), or probability with two decimals; `≈` when the shown tile is an overview and the exact full-resolution value has not arrived yet; `—` for nodata. Coordinates in SWEREF 99 TM (m) and WGS84 (5 decimals).
- Routes (hash): `#/` start, `#/karta/<id>` map, `#/om` about. Permalink query on the map route: `v` (version), `lager` (`klassad`|`kontinuerlig`), `x`, `y` (SWEREF 99 TM centre, m), `upp` (m per pixel), `bakgrund` (`carto`|`ingen`), `opacitet` (0–1), `lang` (`sv`|`en`). Only `id` is required; everything else has defaults.
- Language: Swedish default, English via `lang=en`, kept in every link. Metadata is shown in the language it is written in (`sprak`).
- Hidden maps (`visas: false`) never appear in lists or search, but their permalink opens with the notice "Kartan är inte längre aktuell" and the files stay downloadable.
- Classified overviews: MAX, built in R from full resolution by repeated `aggregate(fact = 2, fun = "max", na.rm = TRUE)`, written with `sf::gdal_utils("translate", <vrt with <Overview>>, …, "-of", "COG", "-co", "OVERVIEWS=FORCE_USE_EXISTING")`. Continuous keep AVERAGE.
- `COG_FORMAT <- 2L`. A version whose `format` (missing = 1) is lower than `COG_FORMAT` gets a new version on the next publish. Published `.tif` files are never overwritten.
- Display copies: sources not in EPSG:3006 get `v<n>/klassad_3006.tif` and, when continuous exists, `v<n>/kontinuerlig_3006.tif`, projected with `method = "near"` at the source cell size in metres.
- User-facing text Swedish (English via the dictionary). Code identifiers Swedish as in fas 1.

## Review Focus

1. **Permalinks to hidden, unknown or old versions** (`#/karta/finns-inte`, a hidden id, `v=1` after v2 exists): a clear message for unknown, the "inte längre aktuell" notice for hidden, and an old version shown and downloadable with a note that a newer one exists. Pinned in Task 9.
2. **Pointer value races:** the pointer moves on before the exact-value request returns, or moves onto nodata; the panel must never show a value for a previous position. Pinned in Task 7.
3. **URL state round trip with å/ä/ö and back/forward:** search text, filters and map state survive a reload and the browser's back button. Pinned in Tasks 4 and 9.
4. **Spara som bild when a background tile fails:** the PNG still contains the data layer, legend and attribution, or a clear error appears; never a silent blank file. Pinned in Task 10.
5. **Catalogue edge cases:** maps in all five EPSG codes, no continuous file, `null` in every optional field, one class only. They render without console errors. Pinned in Tasks 3 and 6.

---

### Task 1: MAX overviews and file-format version in publishing

**Files:**
- Create: `publicering/R/oversikter.R`, `publicering/tests/testthat/test-oversikter.R`
- Modify: `publicering/R/cog.R`, `publicering/R/publicera.R`, `publicering/DESCRIPTION` (Imports `sf`), `schema/katalog.schema.json` (optional `format` on version), `schema/test/schema.test.mjs`

**Interfaces:**
- Produces: `COG_FORMAT <- 2L`; `.skriv_klassad_cog(r: SpatRaster, mal: character)` writes uint8 COG with MAX overviews (levels until the smaller side ≤ 512); `skriv_cog()` uses it for `roll = "klassad"`; version objects get `format = COG_FORMAT`.

- [ ] **Step 1: Failing tests.**
  - `klassad COG har MAX-översikter`: 2048 × 2048 raster with sparse 5/10 (seed 1, 40 000 cells, 20 % tens). every overview level read with `terra::rast(ut, opts = "OVERVIEW_LEVEL=<i>")` (verified to work with terra 1.7) equals `aggregate(r, 2^(i+1), fun = "max", na.rm = TRUE)`; full resolution identical; `NoData Value=255`; `LAYOUT=COG`.
  - `oförändrad källa men gammalt format ger ny version`: publish with `COG_FORMAT` mocked to 1 via `withr::local_options(fiskkartor.cog_format = 1L)` (read through `getOption("fiskkartor.cog_format", COG_FORMAT)`), then publish again with the default → status `publicerad`, version 2, `v1/` untouched, v2 `format == 2`.
  - Schema: a version with `"format": 2` validates; `"format": 0` fails.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Aggregate recursively by 2 (MAX is associative, so this equals block-MAX from full resolution and reads the big raster once). Write levels to a temp folder, a VRT with `<Overview>` elements, then `sf::gdal_utils("translate", …)` with `COMPRESS=DEFLATE`, `BLOCKSIZE=512`, `BIGTIFF=IF_SAFER`, `OVERVIEWS=FORCE_USE_EXISTING`. `terra::writeRaster` from the VRT drops the overviews (verified 2026-11-25), so sf is required. Version decision: a new version also when `format` of the current version is below the option value.
- [ ] **Step 4: Run.** Expected: all pass (R suite, schema suite). Measure on the 25 m classified source from fas 1 (`abborre_klassad_kalla.tif`, 48 000 × 19 840 cells) and record the time and size in the commit message.
- [ ] **Step 5: Commit** `feat(publicering): MAX-översikter och filformatversion`.

### Task 2: Display copies in EPSG:3006

**Files:**
- Modify: `publicering/R/publicera.R`, `publicering/R/cog.R`, `schema/katalog.schema.json` (optional `vy3006: {fil, sha256, bytes}` on `fil` objects), `schema/exempel/katalog.json`, tests in `test-publicera.R`, `schema/test/schema.test.mjs`

**Interfaces:**
- Produces: `.skriv_vy3006(kalla_cog: character, mal: character, roll) -> list(fil, sha256, bytes)` (projects the written COG with `terra::project(method = "near", res = upplosning)` and writes it with the same `skriv_cog` rules); version file objects carry `vy3006` when `epsg != 3006`.

- [ ] **Step 1: Failing tests.** PanBalticScope fixture (3857, classes 0/5/10) publishes `klassad_3006.tif` with `epsg_kod == 3006`, the same set of class values, and `vy3006.fil` in `katalog.json`; a 3006 source gets no `vy3006`; the schema accepts `vy3006` and rejects one without `sha256`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** as described; the continuous copy keeps uint16 ×1000 and nodata 65535.
- [ ] **Step 4: Run.** Expected: pass. **Step 5: Commit** `feat(publicering): visningskopior i SWEREF 99 TM`.

### Task 3: Catalogue robustness (review minors from fas 1)

**Files:** Modify `publicering/R/katalog.R`, `publicering/R/validera.R`, `publicering/R/publicera.R`, tests.

- [ ] **Step 1: Failing tests.**
  - An empty `visas` cell gives the row error `visas saknas (ja eller nej)` instead of hiding the map.
  - A bad `ar` (`"2021 x"`) or `visas` (`"kanske"`) in one row gives status `fel` for that row only; `publicera_alla()` continues and the other rows publish. `las_katalog()` no longer stops; it marks the cell and `validera_rad()` reports it.
  - `publicera_alla()` returns, and prints, a warning listing ids that are in `katalog.json` but not in Excel (`kartor som finns i katalog.json men inte i Excel: …`); they stay in the catalogue.
  - Non-breaking spaces and surrounding quotes in cells are removed (`"\u00a0Torsk "` → `"Torsk"`, `"\"C:/a/b.tif\""` → `C:/a/b.tif`).
- [ ] **Step 2–4:** Run (FAIL), implement, run (pass). **Step 5: Commit** `fix(publicering): radfel i stället för stopp, tom visas och borttagna rader`.

### Task 4: App shell – Svelte, routing, language, catalogue

**Files:**
- Create: `webb/src/main.ts`, `webb/src/App.svelte`, `webb/src/lib/katalog.ts`, `webb/src/lib/rutt.ts`, `webb/src/lib/text.ts`, `webb/svelte.config.js`, tests `webb/tests/rutt.test.ts`, `webb/tests/text.test.ts`, `webb/tests/katalog.test.ts`
- Modify: `webb/index.html` (mount point), `webb/package.json` (svelte, @sveltejs/vite-plugin-svelte, svelte-check, typescript ^5.9.3), `webb/vite.config.ts`, `webb/tsconfig.json`, `.github/workflows/test.yml` (`npm run check`)

**Interfaces:**
- `type Karta`, `type Version`, `type Fil`, `type Klass`, `type Roll = 'klassad' | 'kontinuerlig'` and `type Faltnamn` (the ten filter fields) mirroring `katalog.schema.json`; `lasKatalog(dataUrl: string): Promise<Karta[]>`; `synliga(kartor: Karta[]): Karta[]`; `aktuellVersion(k: Karta, v?: number): Version`; `kartfil(f: Fil): string` (`vy3006?.fil ?? fil`).
- `type Rutt = { vy: 'start' | 'karta' | 'om'; id?: string; q: URLSearchParams }`; `tolkaRutt(hash: string): Rutt`; `byggRutt(r: Rutt): string`.
- `t(nyckel: Nyckel, lang: 'sv' | 'en'): string` with a typed key union.

- [ ] **Step 1: Failing tests.** `tolkaRutt('#/karta/torsk-1?lang=en&x=1')` gives vy karta, id, lang en; `byggRutt(tolkaRutt(s)) === s` for five sample hashes including `q=r%C3%B6dsp%C3%A4tta`; every key in `text.ts` has non-empty `sv` and `en`; `lasKatalog` on `schema/exempel/katalog.json` gives one map and `kartfil` picks `vy3006` when present.
- [ ] **Step 2–4:** Run (FAIL), implement, run (pass). The page shows a header with the portal name, a language switch that rewrites `lang` in the hash, and the three routes as placeholders.
- [ ] **Step 5: Commit** `feat(webb): appskal med Svelte, rutter, språk och katalog`.

### Task 5: Start page – search, suggestions and filters

**Files:** Create `webb/src/lib/sok.ts`, `webb/src/vyer/Start.svelte`, `webb/src/komponenter/Sokfalt.svelte`, `webb/src/komponenter/Filter.svelte`, `webb/src/komponenter/Traffar.svelte`, tests `webb/tests/sok.test.ts`, `webb/tests/app.spec.ts` (Playwright, new).

**Interfaces:** `normalisera(s: string): string` (lowercase, å/ä/ö → a/a/o, trim); `sok(kartor, q, filter: Record<Faltnamn, string[]>): Karta[]`; `fasetter(kartor): Record<Faltnamn, {varde: string; antal: number}[]>`; `forslag(kartor, q, max = 8): string[]` over titel, art and vetenskapligt namn.

- [ ] **Step 1: Failing tests.** `sok(…, 'rodspatta')` finds "Rödspätta"; filters AND across fields, OR within a field; `fasetter` counts match the result; `forslag` is case- and diacritic-insensitive. E2E with the test catalogue described below: typing "torsk" shows suggestions, a chip filters the list, the URL holds `q` and the filter, reload restores them, Back restores the previous list.
- [ ] **Step 2–4:** Run (FAIL), implement, run (pass). Start page: project cards (name, number of maps, short text from `t()`), search field with suggestions, filter chips for projekt, art, livsstadium, havsområde, källa, år, rödlista, Fiskbarometern, livsmiljö and simblåsa, result list linking to `#/karta/<id>`.
- [ ] **Step 5: Commit** `feat(webb): startsida med sök, förslag och filter`.

Test data for E2E (Step 1 of this task): `publicering/inst/skript/skapa_testdata.R` publishes into `webb/tests/fixtures/data/` with `publicera_alla()`: `torsk-test` (3006, classified + continuous, 200 × 200), `pbs-test` (3857, classes 0/5/10, 0 uncoloured, no continuous → gets `vy3006`), `tral-test` (4326, one class only, all optional fields empty), `dold-test` (published, then `visas = nej`). Playwright serves `webb/` and opens `dist/index.html?data=/tests/fixtures/data/#/…`.

### Task 6: Map view – map, layers, toggle, opacity, background

**Files:** Create `webb/src/karta/karta.ts`, `webb/src/vyer/Kartvy.svelte`, `webb/src/komponenter/Karta.svelte`; modify `webb/src/karta/lager.ts` (move the `reserv` limit and the defaults `transition 0`, `preload Infinity` here), `webb/src/perf.ts` (use them), tests in `webb/tests/app.spec.ts`.

**Interfaces:** `skapaKarta(mal: HTMLElement, opt: {bakgrund: 'carto' | 'ingen'; cartoNyckel: string}): { karta: Map; visa(fil: string, epsg: number, roll: Roll, klasser: Klass[]): WebGLTileLayer; setOpacitet(o: number): void; setBakgrund(b): void }`.

- [ ] **Step 1: Failing E2E tests** (CARTO routed to a blank PNG as in `perf.spec.ts`): opening `#/karta/torsk-test` fits the map to the layer and reaches `rendercomplete`; hovering the known cell shows "Mycket viktigt"; the classified/continuous switch shows "0.75"; the switch is absent for `pbs-test`; opacity 0 gives alpha 0 at a data pixel; `bakgrund=ingen` makes no CARTO request; `pbs-test` and `tral-test` load their `vy3006` file (network log), and no console errors occur for any of the four maps.
- [ ] **Step 2–4:** Run (FAIL), implement, run (pass). Layout: result list left (collapsed on narrow screens), map centre, panel right (Task 8). Loading indicator until the first `rendercomplete`; "Kartfilen kunde inte hämtas" when the source errors.
- [ ] **Step 5: Commit** `feat(webb): kartvy med lager, växling, opacitet och bakgrund`.

### Task 7: Pointer value, coordinates and exact value

**Files:** Create `webb/src/lib/varde.ts`, `webb/src/komponenter/Pekarvarde.svelte`, tests `webb/tests/varde.test.ts`, E2E additions.

**Interfaces:** `formatera(v: number | null, roll, klasser, skala = 1000): string`; `exaktVarde(url: string, x: number, y: number, epsg: number, signal: AbortSignal): Promise<number | null>` (geotiff.js `fromUrl` cached per URL, `readRasters({ window: [col, row, col+1, row+1] })` on image 0); `koordinater(x, y): { sweref: string; wgs84: string }`.

- [ ] **Step 1: Failing tests.** Vitest with the Range server: `exaktVarde` on `test_kontinuerlig.tif` at (603762.5, 6597487.5) gives 754 and makes at most 3 requests; outside the raster gives `null`; an aborted signal rejects with `AbortError`. `formatera(0, 'klassad', pbsKlasser)` → "Ej viktigt område". E2E: hover continuous map zoomed out shows `≈0.75` then `0.75` after the pointer rests 300 ms; moving to nodata before the request returns shows `—` and never the old value (delay the `.tif` route by 1 s to force the race).
- [ ] **Step 2–4:** Run (FAIL), implement (debounce 250 ms, abort the previous request on every move), run (pass).
- [ ] **Step 5: Commit** `feat(webb): värde under pekaren med exakt värde och koordinater`.

### Task 8: Panel – legend, metadata, versions, downloads, citation

**Files:** Create `webb/src/komponenter/Panel.svelte`, `Legend.svelte`, `Metadata.svelte`, `Nedladdning.svelte`, `webb/src/lib/citering.ts`, `webb/src/lib/metadatatext.ts`, tests `webb/tests/citering.test.ts`, E2E additions.

**Interfaces:** `citeringstext(k: Karta, v: Version, permalank: string, idag: Date): string` → `"<citering>. <titel> (<ar>), version <n>. SLU Aqua. <permalank> (hämtad <ÅÅÅÅ-MM-DD>)."`; `metadataSomText(k: Karta, v: Version, lang): string` (readable text file with all fields, files, hashes and licence).

- [ ] **Step 1: Failing tests.** Citation and text format (Swedish and English labels); E2E: legend lists coloured classes only, the continuous legend shows 0–1; metadata shows quality, source, citation, contact (mailto), licence, and the optional `falt` that are not null; downloads link to `data/<fil>` (original, not `vy3006`), `metadata.json`, a generated `<id>-metadata.txt`; "Kopiera citering" puts the text on the clipboard; a map with two versions lists both with dates.
- [ ] **Step 2–4:** Run (FAIL), implement, run (pass).
- [ ] **Step 5: Commit** `feat(webb): panel med legend, metadata, versioner och nedladdning`.

### Task 9: Permalinks and special states

**Files:** Create `webb/src/lib/permalank.ts`, tests `webb/tests/permalank.test.ts`, E2E additions.

**Interfaces:** `type Lage = { x: number; y: number; upp: number; v?: number; lager: Roll; bakgrund: 'carto' | 'ingen'; opacitet: number; lang: 'sv' | 'en' }`; `kartlage(karta: Map): Pick<Lage, 'x' | 'y' | 'upp'>`; `tillUrl(id: string, lage: Lage): string` and `franUrl(q: URLSearchParams): Partial<Lage>` (rounding x/y to 1 m, `upp` to 3 significant digits).

- [ ] **Step 1: Failing tests.** Round trip of all permalink fields; E2E: pan, copy the link, open it in a new page → same centre (± 2 px), layer, opacity, background and language; `#/karta/finns-inte` → "Kartan finns inte" with a link to the start page; `#/karta/dold-test` → "Kartan är inte längre aktuell" and its downloads work; `v=1` on a two-version map shows v1 with "Det finns en nyare version" and a link.
- [ ] **Step 2–4:** Run (FAIL), implement (state written with `history.replaceState` while panning, so Back is not flooded), run (pass).
- [ ] **Step 5: Commit** `feat(webb): permanenta länkar och lägen för dolda och okända kartor`.

### Task 10: Spara som bild

**Files:** Create `webb/src/lib/bild.ts`, E2E additions.

**Interfaces:** `sparaSomBild(karta: Map, legend: HTMLElement, attribution: string, filnamn: string): Promise<Blob>` – after `rendercomplete`, composite the layer canvases (OpenLayers export pattern), then draw the legend and attribution text onto a 2D canvas.

- [ ] **Step 1: Failing E2E tests.** Download a PNG for `torsk-test`: size equals the map size, a data pixel is non-transparent, the bottom strip contains dark attribution pixels. With CARTO routed to `abort()`, the PNG still has the data layer and legend. With a tainting background (route without CORS header), a message "Bakgrundskartan tillåter inte export – sparar utan bakgrund" appears and the PNG is still written.
- [ ] **Step 2–4:** Run (FAIL), implement, run (pass). **Step 5: Commit** `feat(webb): spara kartan som bild`.

### Task 11: About page, deploy, republish and Kontrollpunkt 2

**Files:** Create `webb/src/vyer/Om.svelte`, `docs/kontrollpunkt-2.md`; modify `.github/workflows/pages.yml` (nothing beyond the build if unchanged), `README.md` (the portal link).

- [ ] **Step 1: About page** (about the portal, citation advice, licence CC BY 4.0 preliminary, contact SLU-Aqua-fiskkartor@slu.se; accessibility statement is fas 3) with an E2E test that it renders in both languages.
- [ ] **Step 2: Republish.** Stage the sources as in fas 1, `hamta_data()` into a fresh folder, `publicera_alla()` → 75 maps `publicerad` as v2 (`format` 2, MAX overviews, `vy3006` for 3035/25833/4326/3857 sources), 16 `dold`, 0 `fel`; `skicka_data()`; Pages green.
- [ ] **Step 3: Verify on Pages** from Mårten's browser: the start page lists 75 maps, a 25 m test map is not in the catalogue, three maps in different EPSG codes open with values under the pointer, a permalink opens the same view, a download returns the original file (sha256 equals `katalog.json`).
- [ ] **Step 4: Write `docs/kontrollpunkt-2.md`:** the portal link, a checklist for the team (find a map, read the metadata, download, copy a link, save a picture, switch language), known limitations (no SLU profile or mobile polish until fas 3), and the open decisions (licence, data location). Commit `docs: kontrollpunkt 2`.
