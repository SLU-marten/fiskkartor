# Fas 3: design och tillgänglighet – plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Mål:** Kartvisaren får SLU:s grafiska profil (stil A), kartkontrollerna enligt alternativ 2, en
utdragbar panel på mobil, en WCAG 2.1 AA-granskning med rättelser och en
tillgänglighetsredogörelse.

**Arkitektur:**
- **Profil:** färger och typsnitt samlas i CSS-variabler i `webb/src/stil.css`. Ett enhetstest
  kontrollerar kontrasten för färgparen.
- **Kontrollerna i kartan** blir Svelte-komponenter ovanpå OpenLayers-kartan i `.kartyta`.
- **Mobil:** kartvyn blir ett rutnät utan sidskroll, med kartan överst och panelen som en flik i
  en egen rad. Fliken har lägena nere och uppe.
- **Granskning:** axe körs i Playwright för alla vyer. Den manuella granskningen dokumenteras och
  styr redogörelsens lista över brister.

**Teknik:** Svelte 5.59, Vite 8, TypeScript 5.9, OpenLayers 10.11, Vitest, Playwright, Fontsource
och `@axe-core/playwright`.

**Spec:** `docs/superpowers/specs/2026-11-25-fas-3-design-och-tillganglighet-design.md`. Skisser:
<https://claude.ai/artifact/XfVhXRA2ATnpdaPyhCQga6>.

## Globala villkor

- **Beroenden:** inga nya utöver `@fontsource/roboto-condensed`, `@fontsource/merriweather` och
  `@axe-core/playwright` (utvecklingsberoende). `@fontsource/atkinson-hyperlegible-next` tas bort.
- **Färger:** exakt specens värden.

  | Variabel | Värde |
  |---|---|
  | `--text` | #222222 |
  | `--dampad` | #595959 |
  | `--linje` | #d9d9d9 |
  | `--kant` | #8c8c8c |
  | `--mjuk` | #f5f5f5 |
  | `--yta` | #ffffff |
  | `--gron` | #00664f |
  | `--gron-mork` | #154734 |
  | `--markering` | #eef6d6 |
  | `--notis` | #fdf6c4 |
  | `--notis-kant` | #ffb81c |
  | `--fel` | #a80833 |
  | `--fel-yta` | #fbd7c9 |

  Kartornas YlGnBu-färger ändras inte.
- **Typsnitt:** Roboto Condensed i vikterna 400 och 500 för gränssnittet, Merriweather i vikterna
  300 och 400 för löpande text. Inga tyngre vikter. Delmängderna är `latin` och `latin-ext`;
  webbläsaren hämtar `latin-ext` bara när ett tecken kräver det. Reservtypsnitten är Arial och
  Times New Roman, profilens bastypsnitt.
- **Inga tredje parter:** inga nätverksanrop för typsnitt eller ikoner.
- **Brytpunkter:** 60rem för mobil, 40rem för menyknappen och 22.5rem (360 px) för raden med
  institutionen.
- **Fokus:** `outline: 3px solid var(--gron); outline-offset: 2px`. Kontroller i `.kartyta` får
  dessutom `box-shadow: 0 0 0 7px var(--yta)`. Den gröna ramen ligger då mellan två vita ringar
  och syns även mot mörka kartfärger.
- **Testerna:** befintliga `data-testid` behålls, och `base: './'` i Vite ändras inte.
- **Text och namn:** text som syns lägger man i `src/lib/text.ts` på svenska och engelska.
  Identifierare skrivs på svenska.
- **Commits** avslutas med repots trailers, `Co-Authored-By` och `Claude-Session`.
- **Kommandon,** körda från `webb/`:
  - enhetstester: `npx vitest run`;
  - typkontroll: `npm run check`;
  - E2E: `npm run build && CHROMIUM_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome npx playwright test`.

## Beslut i planen

Dessa beslut går lite längre än specen, utan att ändra dess avsikt.

- **Panelen i läget nere döljer resten av innehållet med `display: none`**, i stället för att göra
  det `inert`. Det döljer starkare och gör att fliken kan få sin naturliga höjd.
- **På mobil krymper kartan när fliken dras upp,** i stället för att fliken läggs över kartan.
  Kontrollerna i kartan behöver då inga förskjutningar, och OpenLayers storleksanpassar kartan
  själv.
- **Fliken byter läge direkt, utan animering.** Specen beskriver en kort övergång. Men om
  panelhöjden animeras ritar OpenLayers om WebGL-ytan för varje bildruta, och det kan blinka på
  mobilernas grafikprocessorer.
- **Tre tillägg efter den externa granskningen av planen:**
  - en länk "Hoppa till innehållet", som stöd för WCAG 2.4.1;
  - ett klick utanför Lagerval eller mobilmenyn stänger dem, och ett klick på en länk i menyn
    stänger menyn;
  - teckenförklaringen har ingen `h2`, eftersom den ligger före panelens `h1` i
    dokumentordningen.

## Att granska särskilt

Situationer som specen inte nämner:

1. **Lång titel på engelska i fliken på mobil:** inget flödar över i sidled, och titeln syns hela.
   Det testas i uppgift 4.
2. **Liggande telefon, 844 × 390:** kartan är minst 100 px hög, greppet går att nå, och
   zoomknapparna, Lagerval och teckenförklaringen överlappar inte. Uppgift 4.
3. **Smal dator, 960 × 700:** zoomknapparna, Lagerval, teckenförklaringen, värdet under pekaren,
   skalstocken och tillskrivningen överlappar inte varandra. Uppgift 3.
4. **Byte av karta i listan medan Lagerval är öppen:** valen följer den nya kartan, och PanBalticScope
   saknar Visa. Uppgift 3.
5. **En dold karta på mobil:** notisen syns i fliken även när fliken är nere. Uppgift 4.

---

### Uppgift 1: Färger, typsnitt och kontrasttest

**Filer:**
- Skapa: `webb/src/lib/kontrast.ts`, `webb/tests/farger.test.ts`
- Ändra:
  - `webb/src/stil.css`, `webb/src/main.ts`, `webb/package.json`, `webb/src/lib/bild.ts`;
  - komponenterna som använder `var(--accent)`, `--accent-ljus`, `--black` eller `--papper`
    (hitta dem med `grep -rn "var(--" src`);
  - `webb/src/komponenter/Pekarvarde.svelte`.

**Gränssnitt:**
- Ger: `kontrast(a: string, b: string): number`, som tar hex-färger `#rrggbb` och ger WCAG:s
  kontrastförhållande.
- Ger: CSS-variablerna i de globala villkoren, en global klass `.lopande` som sätter
  Merriweather, och `--gron` som fokusfärg.

- [ ] **Steg 1: Skriv det fallerande testet** `webb/tests/farger.test.ts`.

  Testet läser `src/stil.css`, plockar ut `--namn: #hex` ur `:root` och kontrollerar paren:

  ```ts
  import { readFileSync } from 'node:fs';
  import { expect, it } from 'vitest';
  import { kontrast } from '../src/lib/kontrast';

  const css = readFileSync(new URL('../src/stil.css', import.meta.url), 'utf8');
  const v = Object.fromEntries([...css.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));

  it('kontrast räknar som WCAG', () => {
    expect(kontrast('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(kontrast('#00664f', '#ffffff')).toBeCloseTo(7.0, 1);
  });
  it.each([
    ['text', 'yta', 4.5], ['text', 'mjuk', 4.5], ['text', 'markering', 4.5], ['text', 'notis', 4.5],
    ['dampad', 'yta', 4.5], ['dampad', 'mjuk', 4.5], ['gron', 'yta', 4.5], ['gron', 'markering', 4.5],
    ['gron-mork', 'yta', 4.5], ['yta', 'gron', 4.5], ['fel', 'fel-yta', 4.5], ['kant', 'yta', 3],
    ['dampad', 'markering', 4.5],
  ])('%s mot %s klarar %s:1', (a, b, krav) => {
    expect(v[a], a).toBeDefined();
    expect(v[b], b).toBeDefined();
    expect(kontrast(v[a], v[b])).toBeGreaterThanOrEqual(krav);
  });
  ```

- [ ] **Steg 2: Kör testet och se det fallera.**
  - Kör: `npx vitest run tests/farger.test.ts`
  - Väntat: FAIL. `kontrast` finns inte, och variablerna saknas.

- [ ] **Steg 3: Skriv `kontrast` i `src/lib/kontrast.ts`.** Använd WCAG:s relativa luminans med
  sRGB-linjärisering, gränsen 0,04045. För 8-bitarsvärden ger den samma resultat som den äldre
  gränsen 0,03928.

- [ ] **Steg 4: Byt variablerna i `:root` i `stil.css`** mot de globala villkorens.
  - Byt `var(--accent)` mot `var(--gron)`, `--accent-ljus` mot `--markering`, `--black` mot
    `--text` och `--papper` mot `--mjuk` i alla komponenter.
  - Sidans bakgrund blir `var(--yta)`.
  - Lägg till fokusringen för `.kartyta :focus-visible` enligt de globala villkoren.
  - Lägg till `strong, b { font-weight: 500 }`, `h1, h2, h3 { font-weight: 500 }` och klassen
    `.lopande { font-family: Merriweather, 'Times New Roman', serif; font-weight: 300; line-height: 1.6 }`.
  - Sätt `font-family: 'Roboto Condensed', Arial, sans-serif` på `:root`.
  - Ändra alla `font-weight: 600` och `700` i komponenterna till 500.

- [ ] **Steg 5: Byt typsnitten.**
  - Kör `npm rm @fontsource/atkinson-hyperlegible-next` och
    `npm i @fontsource/roboto-condensed @fontsource/merriweather`.
  - `main.ts` importerar för varje vikt både `latin` och `latin-ext`, till exempel
    `@fontsource/roboto-condensed/latin-400.css` och `…/latin-ext-400.css`. Det gäller Roboto
    Condensed 400 och 500 och Merriweather 300 och 400.
  - Kontrollera i paketets `unicode-range` om tecknet ≈ (U+2248) finns. Finns det inte ritas
    tecknet med Arial, och det godtas. Skriv vad som gäller i en kommentar i `main.ts`.

- [ ] **Steg 6: Ändra `Pekarvarde.svelte`.** Rutan blir vit (`var(--yta)`) med en kant i
  `var(--linje)` och text i `var(--text)`, och koordinaterna i `var(--dampad)`, som i skissen.

- [ ] **Steg 7: Ändra `bild.ts`.**
  - `TYPSNITT` blir `"'Roboto Condensed', Arial, sans-serif"`, `BLACK` blir `'#222222'`,
    legendramen blir `'#d9d9d9'` och vikten `700` blir `500`.
  - `sparaSomBild` väntar på
    `Promise.all([document.fonts.load("400 13px 'Roboto Condensed'"), document.fonts.load("500 13px 'Roboto Condensed'")])`
    innan `karta.once('rendercomplete', …)` och `renderSync()`.
  - Vänta bara när `document.fonts` finns, och fånga ett fel med `.catch`. Tidsgränsen börjar som
    i dag.

- [ ] **Steg 8: Kör allt.**
  - Kör: `npx vitest run && npm run check && npm run build && CHROMIUM_PATH=… npx playwright test`
  - Väntat: allt går igenom. Testet "genomskinlighet 0" jämför mot kartytans bakgrund `#eef2f3`,
    som inte ändras.

- [ ] **Steg 9: Commit.** `git commit -m "feat(webb): SLU:s färger och typsnitt"`

### Uppgift 2: Sidhuvud med logotyp, meny på mobil, sidfot, sidtitlar och redogörelsens sida

**Filer:**
- Skapa:
  - `webb/src/komponenter/Sidhuvud.svelte`, `webb/src/komponenter/Sidfot.svelte`;
  - `webb/src/assets/slu-logotyp.svg`, en platshållare: en streckad ruta med texten
    "SLU-logotyp", som inte efterliknar logotypen;
  - `webb/src/vyer/Tillganglighet.svelte`.
- Ändra: `webb/src/App.svelte`, `webb/src/lib/rutt.ts`, `webb/src/lib/text.ts`, `webb/tests/rutt.test.ts`,
  `webb/tests/text.test.ts`, `webb/tests/app.spec.ts`

**Gränssnitt:**
- Ger: `type Vy = 'start' | 'karta' | 'om' | 'tillganglighet'`. `#/tillganglighet` tolkas och byggs.
- Ger: `sidtitel(del: string | null, lang: Sprak): string`, som ger `"<del> – <portalnamn>"`
  eller bara portalnamnet.
- Ger textnycklarna i tabellen. Uppgift 3 och 4 använder `lagerval`, `till_traffarna`, `visa_mer`
  och `visa_mindre`.

  | Nyckel | Svenska | Engelska |
  |---|---|---|
  | `meny` | Meny | Menu |
  | `meny_tillganglighet` | Tillgänglighet | Accessibility |
  | `institution` | Institutionen för akvatiska resurser | Department of Aquatic Resources |
  | `slu_alt` | SLU, Sveriges lantbruksuniversitet | SLU, Swedish University of Agricultural Sciences |
  | `lagerval` | Lagerval | Layers |
  | `till_traffarna` | Till träffarna | Back to results |
  | `visa_mer` | Visa mer om kartan | Show more about the map |
  | `visa_mindre` | Visa mindre | Show less |
  | `hoppa` | Hoppa till innehållet | Skip to content |

- Ger: komponenten `Logotyp`, inbyggd i `Sidhuvud`, som importerar en enda fil:
  `import logotyp from '../assets/slu-logotyp.svg'`. När Mårten lämnar PNG-filen byts bara
  importen.

- [ ] **Steg 1: Skriv de fallerande testerna.**
  - `rutt.test.ts`: `tolkaRutt('#/tillganglighet?lang=en')` ger `vy: 'tillganglighet'`, och
    `byggRutt` av den ger `'#/tillganglighet?lang=en'`.
  - `text.test.ts`: `sidtitel('Om portalen', 'sv')` ger `'Om portalen – Fiskkartor'`, och
    `sidtitel(null, 'en')` ger `'Fish maps'`.
  - `app.spec.ts`, i ett nytt block `'sidhuvud, sidfot och titlar'`:
    - **'sidhuvudet har SLU:s logotyp och institutionen':** en bild med namnet
      `SLU, Sveriges lantbruksuniversitet` syns, liksom texten `Institutionen för akvatiska resurser`.
    - **'varje vy har en egen titel':** titlarna är
      - start: `Kartor – Fiskkartor`;
      - `KARTA('torsk-test')`: `Torsk större än 20 cm, uppväxt, västkusten (test) – Fiskkartor`;
      - `#/om`: `Om portalen – Fiskkartor`;
      - `#/tillganglighet`: `Tillgänglighet – Fiskkartor`;
      - start med `lang=en`: `Maps – Fish maps`;
      - en okänd karta: `Kartan finns inte – Fiskkartor`.
    - **'sidfoten länkar till tillgänglighetsredogörelsen men finns inte i kartvyn':** på
      startsidan har `contentinfo` länken `Tillgänglighet`, och den öppnar en sida vars `h1`
      innehåller `Tillgänglighet`. I kartvyn finns ingen `contentinfo`.
    - **'kartvyn fyller fönstret utan sidskroll':** vid 1280 × 720 gäller
      `document.documentElement.scrollHeight <= innerHeight`.
    - **'mobil: menyn ligger bakom Meny-knappen':** vid 375 × 812 har knappen `Meny`
      `aria-expanded="false"`, och länken `Om portalen` syns inte. Ett klick ger
      `aria-expanded="true"` och en synlig länk. Escape stänger menyn, och fokus går tillbaka till
      knappen.
    - **'mobil: menyn stängs av en länk och av ett klick utanför':**
      - Öppna menyn och klicka på `Om portalen`. Då öppnas `#/om`, och knappen har
        `aria-expanded="false"`.
      - Öppna menyn igen och klicka i `main`. Då har knappen `aria-expanded="false"`.
    - **'hopplänken går förbi sidhuvudet':**
      - Första Tab på startsidan fokuserar länken `Hoppa till innehållet`, som då syns.
      - Enter flyttar fokus till `main`, som har `tabindex="-1"`.
    - **`test.fixme` 'logotypen är SLU:s riktiga, inte platshållaren':** bilden
      `SLU, Sveriges lantbruksuniversitet` har en `src` som slutar på `.png`. Testet syns som
      överhoppat i varje körning tills Mårtens fil finns på plats. Då tas `fixme` bort. Det är
      spärren mot att platshållaren följer med till lanseringen i fas 4.

- [ ] **Steg 2: Kör testerna och se dem fallera.**
  - Kör: `npx vitest run tests/rutt.test.ts tests/text.test.ts` och
    `npm run build && … npx playwright test -g "sidhuvud, sidfot och titlar"`
  - Väntat: FAIL.

- [ ] **Steg 3: Rutten och titeln.**
  - Lägg till `'tillganglighet'` i `rutt.ts`, och `sidtitel` och nycklarna i `text.ts`.
  - I `App.svelte` sätts `document.title` från rutten:
    - start: `meny_start`;
    - karta: kartans `titel`, eller `karta_finns_inte`;
    - om: `meny_om`;
    - tillganglighet: `meny_tillganglighet`.

- [ ] **Steg 4: `Sidhuvud.svelte`.**
  - **Utseende:** logotypen är 44 px hög, eller 36 px under 60rem, med en fri zon på halva höjden.
    Portalnamnet är länken `.namn` till start, och institutionen står i `var(--dampad)`.
    Sidhuvudet är 4rem högt, eller 3.5rem under 60rem.
  - **Menyn:** Kartor, Om portalen och In English, med `data-testid="sprak"` kvar.
  - **Under 40rem** visas en knapp, `Meny`, med `aria-expanded` och `aria-controls`. Den öppnar
    navigeringen som en lista under sidhuvudet, ovanpå innehållet, så att sidhuvudets höjd inte
    ändras.
  - **Listan stängs** med Escape, när man klickar på en länk i den och när man klickar utanför
    den. Klicket utanför fångas med en `pointerdown`-lyssnare på `document` som bara finns medan
    listan är öppen.
  - **Hopplänken:** först i sidhuvudet ligger en länk, `t('hoppa')`, som är dold tills den får
    fokus. Den pekar på `#innehall`. `App.svelte` ger `<main>` `id="innehall"` och
    `tabindex="-1"`, och länkens klickhanterare flyttar fokus dit utan att ändra hash-rutten.
  - **Under 22.5rem** döljs institutionen.

- [ ] **Steg 5: `Sidfot.svelte`.**
  - Sidfoten är en `<footer>` med "Fiskkartor, Institutionen för akvatiska resurser, SLU" (på
    engelska "Fish maps, Department of Aquatic Resources, SLU"), länkarna Om portalen och
    Tillgänglighet, och kontaktadressen som `mailto`-länk.
  - Adressen visas också som text.
  - `App.svelte` visar sidfoten utom när `rutt.vy === 'karta'`.
  - Kartvyns höjd blir `calc(100dvh - 4rem)`, eller `- 3.5rem` under 60rem.

- [ ] **Steg 6: `Tillganglighet.svelte`, på svenska och engelska.**
  - **Mall:** följ DIGG:s mall för tillgänglighetsredogörelser. Hämta den aktuella texten med
    WebFetch från digg.se. Om det kräver ett godkännande som inte kommer, använd mallens kända
    struktur, med rubrikerna:
    - Hur tillgänglig är webbplatsen?
    - Vad kan du göra om du inte kan använda delar av webbplatsen?
    - Rapportera brister i webbplatsens tillgänglighet
    - Kontakta tillsynsmyndigheten
    - Teknisk information om webbplatsens tillgänglighet
    - Innehåll som inte är tillgängligt
    - Hur vi testat webbplatsen
  - **Länken till DIGG:s anmälningsformulär** (`https://www.digg.se/tdosanmalan`) kontrolleras.
  - **Kontakten** är `SLU-Aqua-fiskkartor@slu.se`.
  - **Ansvar och nivå:** sidan säger ordagrant att Sveriges lantbruksuniversitet (SLU) står bakom
    webbplatsen, och att den är "delvis förenlig" med lagen om tillgänglighet till digital
    offentlig service.
  - **Undantaget för kartbilderna:** beskriv det med paragrafen ur lag (2018:1937). Enligt den
    externa granskaren är det 9 § punkt 4; kontrollera det i lagtexten. Säg också hur innehållet
    nås på annat sätt: filerna, metadatan som text och värdet under pekaren.
  - **Två avsnitt fylls i uppgift 7:** "Innehåll som inte är tillgängligt" och "Hur vi testat
    webbplatsen", med datum. Lägg där bara de brister som redan är kända:
    - värdet under pekaren kräver mus eller tryck;
    - kartbilden går inte att läsa med skärmläsare.
  - **Löpande text** sätts med `class="lopande"`.

- [ ] **Steg 7: Kör testerna och se dem gå igenom.**
  - Kör: samma som i steg 2, och därefter hela sviten.
  - Väntat: PASS. Testet `'visar sidhuvud, byter språk…'` går fortfarande igenom.

- [ ] **Steg 8: Commit.** `git commit -m "feat(webb): sidhuvud med logotyp, meny på mobil, sidfot, sidtitlar och tillgänglighetsredogörelse"`

### Uppgift 3: Lagerval och teckenförklaring i kartan

**Filer:**
- Skapa:
  - `webb/src/komponenter/Lagerval.svelte`;
  - `webb/src/komponenter/Ikon.svelte`, med ikonerna `reglage` och `pil-vanster`.
- Ändra:
  - `webb/src/komponenter/Legend.svelte`, `webb/src/komponenter/Panel.svelte` och
    `webb/src/vyer/Kartvy.svelte`;
  - `webb/src/stil.css`, för OpenLayers klasser `.ol-zoom`, `.ol-scale-line` och
    `.ol-attribution`;
  - `webb/tests/app.spec.ts`.

**Gränssnitt:**
- Använder: `t('lagerval')` från uppgift 2.
- Ger: `Lagerval` med props
  `{ version: Version; roll: Roll; opacitet: number; bakgrund: Bakgrund; lang: Sprak; satt: (andra: Record<string, string | null>) => void }`.
- Ger: `Ikon` med props `{ namn: 'reglage' | 'pil-vanster'; storlek?: number }` och `aria-hidden`.
- Ändrar: `Panel` har inte längre props för `opacitet` och `bakgrund`.

- [ ] **Steg 1: Skriv och ändra testerna.**
  - **Hjälpfunktion:** `oppnaLagerval(page, namn = 'Lagerval')` klickar på knappen med det namnet.
  - **Befintliga tester:** öppna Lagerval före varje `getByRole('radio', …)` eller
    `getByLabel('Opacitet'|'Opacity')`. Det gäller tester som i dag finns på raderna 145, 158,
    176, 184, 401–403 och 590. På engelska heter knappen `Layers`.
  - **Nya tester:**
    - **'Lagerval: stängd från början, Escape stänger och fokus går tillbaka':**
      - Knappen `Lagerval` har `aria-expanded="false"`, och radioknappen `Klassad` syns inte.
      - Efter ett klick är `aria-expanded="true"`, och `Klassad` syns.
      - `Escape` ger `aria-expanded="false"`, och `Lagerval` har fokus.
    - **'teckenförklaringen ligger i kartan och panelen har inga kartval':**
      - `.kartyta [data-testid=legend]` syns. `getByRole('region', { name: 'Teckenförklaring' })`
        innehåller listan `['Viktigt', 'Mycket viktigt']`.
      - `.panel [data-testid=legend]` och `.panel input[type=radio]` finns inte (antal 0).
      - Den första rubriken i dokumentordningen, `page.locator('h1, h2').first()`, är en `h1`.
    - **'klick utanför stänger Lagerval':** öppna Lagerval och klicka i panelens rubrik. Då har
      knappen `aria-expanded="false"`.
    - **'Lagerval ligger över teckenförklaringen':** vid 390 × 500 öppnas Lagerval.
      `document.elementFromPoint` mitt i radioknappen `CARTO`s etikett ger ett element inuti
      Lagerval.
    - **'byte av karta med Lagerval öppen'** (punkt 4 under Att granska särskilt):
      - Öppna `torsk-test` och Lagerval, och klicka på länken till `pbs-test` i listan.
      - Då finns ingen radioknapp `Kontinuerlig`.
      - Legenden visar `pbs-test`s klasser.
    - **'smal dator: kontrollerna överlappar inte'** (punkt 3):
      - Vid 960 × 700 hovras först `torsk-test`s fläck A, så att värdet under pekaren syns.
      - Sedan mäts `boundingBox()` för `.ol-zoom`, knappen `Lagerval`, legenden, `.pekare`,
        `.ol-scale-line` och `.ol-attribution`.
      - Inga två rutor får skära varandra.

- [ ] **Steg 2: Kör testerna och se dem fallera.**
  - Kör: `npm run build && … npx playwright test -g "Lagerval|teckenförklaringen|byte av karta|smal dator"`
  - Väntat: FAIL.

- [ ] **Steg 3: `Ikon.svelte`.**
  - Kopiera `icon[0]`, `icon[1]` (viewBox-bredd och höjd) och `icon[4]` (path) för `faSliders` och
    `faChevronLeft` ur `@fortawesome/free-solid-svg-icons`.
  - Hämta paketet med `npm pack` i en tom mapp i `/tmp`, utan att lägga till ett beroende.
  - Lägg en kommentar med "Font Awesome Free, CC BY 4.0, https://fontawesome.com/license/free"
    och `fill="currentColor"`.

- [ ] **Steg 4: `Lagerval.svelte`, enligt skissen för alternativ 2.**
  - **Knappen:** grön, 40 px hög (44 px under 60rem), med ikonen `reglage` och texten
    `t('lagerval')`, och med `aria-expanded` och `aria-controls`.
  - **Rutan** ligger under knappen och visar fieldset i den här ordningen:
    - Visa, bara när `version.kontinuerlig` finns: radioknappar med `name="lager"`;
    - Opacitet: en etikett med värdet i procent och `input type="range"` med min 0, max 1 och
      steg 0,05;
    - Bakgrundskarta: radioknappar med `name="bakgrund"`.
  - **Radioknapparna ser ut som delade knappar.** Den inbyggda radioknappen döljs visuellt med
    `.visuellt-dold`. Etiketten styls med `:has(input:checked)` (grön fyllning och vit text) och
    `:has(input:focus-visible)`, som ger fokusringen.
  - **Anrop till `satt`** som i dagens `Panel`: `lager`, `opacitet` (`null` vid 1) och `bakgrund`
    (`null` för carto).
  - **Fokusringen på radioknapparna** ritas med `outline` på etiketten, inte med `box-shadow`,
    så att tangentbordstestet i uppgift 7 kan läsa den.
  - **Escape:** en `onkeydown` på komponentens rot stänger rutan och flyttar fokus till knappen.
    Ingen global lyssnare för tangenter.
  - **Klick utanför:** en `pointerdown`-lyssnare på `document`, som bara finns medan rutan är
    öppen, stänger rutan när klicket landar utanför komponentens rot. Fokus flyttas inte då.

- [ ] **Steg 5: Placera kontrollerna i `Kartvy.svelte`.**
  - `.kartyta` får `position: relative`. `<Lagerval>` ligger överst till höger med `z-index: 5`.
    `<Legend>` ligger nere till höger, med `bottom: 2.25rem` ovanför tillskrivningen och
    `z-index: 3`. Båda ligger utanför `{#key karta.id}`.
  - `Legend` blir en vit ruta med kanten `var(--linje)`. Den är en
    `<section class="legend" aria-labelledby="legend-rubrik">` med rubriken som
    `<p id="legend-rubrik">` i 0.9rem `var(--dampad)`, alltså ingen `h2`.
    `data-testid="legend"` behålls.
  - Ta bort Visa, Legend, Opacitet och Bakgrundskarta ur `Panel.svelte`, och dess props
    `opacitet` och `bakgrund`. `roll` behålls för Spara som bild.

- [ ] **Steg 6: Ny stil för OpenLayers kontroller i `stil.css`.**
  - `.ol-zoom button` blir 40 × 40 px (44 px under 60rem), vit med kanten `var(--linje)` och
    tecken i `var(--gron)`.
  - `.ol-zoom` placeras på `top: .75rem; left: .75rem`.
  - `.ol-scale-line` och `.ol-attribution` får text i `var(--dampad)` på vit bakgrund.

- [ ] **Steg 7: Kör testerna och se dem gå igenom, och därefter hela sviten.**
  - Väntat: PASS, och testet för Spara som bild ger fortfarande en legend i bilden.

- [ ] **Steg 8: Commit.** `git commit -m "feat(webb): Lagerval och teckenförklaring i kartan"`

### Uppgift 4: Mobil: länk till träffarna, kartan utan sidskroll, fliken och värdet vid tryck

**Filer:**
- Skapa: `webb/src/lib/flik.ts`, `webb/tests/flik.test.ts`, `webb/src/komponenter/Grepp.svelte`
- Ändra: `webb/src/vyer/Kartvy.svelte`, `webb/src/komponenter/Panel.svelte`,
  `webb/src/komponenter/Nedladdning.svelte`, `webb/src/komponenter/Pekarvarde.svelte`,
  `webb/tests/app.spec.ts`

**Gränssnitt:**
- Använder: `Ikon` (`pil-vanster`) från uppgift 3, och `till_traffarna`, `visa_mer` och
  `visa_mindre` från uppgift 2.
- Ger: `DRAG_GRANS = 40` och `greppBeslut(uppe: boolean, dy: number): boolean | null`. Den ger
  `true` (uppe) när `dy < -DRAG_GRANS`, `false` när `dy > DRAG_GRANS`, och annars `null`. Vid
  `null` sköter klicket växlingen.
- Ger: `Grepp` med props `{ uppe: boolean; lang: Sprak; onvaxla: (uppe: boolean) => void }`.
- Ändrar: `Panel` får props `uppe: boolean` och `onladdaned: () => void`. Avsnittet Ladda ned får
  `id="nedladdning"`.

- [ ] **Steg 1: Skriv de fallerande testerna.**
  - `flik.test.ts`:

    ```ts
    it.each([
      [false, -60, true], [true, -60, true], [true, 60, false], [false, 60, false], [false, 0, null], [true, 39, null],
    ])('greppBeslut(%s, %s) = %s', (uppe, dy, svar) => expect(greppBeslut(uppe, dy)).toBe(svar));
    ```

  - `app.spec.ts`, i ett nytt block `'mobil'` med `test.use({ viewport: { width: 390, height: 844 } })`:
    - **Ersätt `'mobil: listan är hopfälld och kartan syns direkt'` med
      'mobil: länken går till träffarna och kartan syns direkt':**
      - `.lista` syns inte.
      - Länken `/Till träffarna \(\d+\)/` har en `href` med `q=torsk` när sidan öppnas med
        `q=torsk`.
      - `.kartyta` är högre än 0,45 × 844.
      - Gäller också `scrollHeight <= innerHeight`.
    - **'mobil: fliken startar nere och greppet växlar':**
      - Knappen `Visa mer om kartan` har `aria-expanded="false"`, `h1` syns och `#nedladdning`
        syns inte.
      - Efter ett klick har knappen `Visa mindre` `aria-expanded="true"`, och `#nedladdning` syns.
        Teckenförklaringen syns inte, eftersom kartan bara är cirka 100 px hög.
      - Ett klick till döljer `#nedladdning` igen, och teckenförklaringen syns.
    - **'mobil: svep på greppet':** `page.mouse` drar 100 px uppåt från greppets mitt, och
      fliken är då uppe. 100 px nedåt ger nere.
    - **'mobil: Ladda ned i fliken drar upp fliken och visar nedladdningen':** knappen `Ladda ned`
      ger `aria-expanded="true"`, och `#nedladdning` är `toBeInViewport()`.
    - **'mobil: ett tryck på kartan visar värdet':**
      - Kör i `test.use({ hasTouch: true })`.
      - `page.touchscreen.tap` på `pixelFor(613287.5, 6636712.5, 3006)` i `torsk-test` med
        `bakgrund=ingen`.
      - Värdet under pekaren syns och är inte tomt.
    - **'mobil, engelska och lång titel: fliken flödar inte över'** (punkt 1):
      - `KARTA('torsk-test', 'lang=en')`.
      - Panelen har `scrollWidth <= clientWidth`.
      - `h1`s ruta ligger helt inom panelens ruta.
    - **'mobil liggande: kartan syns och greppet går att nå'** (punkt 2): vid 844 × 390 är
      `.kartyta` minst 100 px hög, och greppet är `toBeInViewport()`. Rutorna för `.ol-zoom`,
      knappen `Lagerval` och legenden skär inte varandra.
    - **'mobil: en dold karta visar notisen i fliken'** (punkt 5): `KARTA('dold-test')` med
      fliken nere, och notisen med `inte_aktuell`-texten syns.

- [ ] **Steg 2: Kör testerna och se dem fallera.**
  - Kör: `npx vitest run tests/flik.test.ts` och `… npx playwright test -g "mobil"`
  - Väntat: FAIL.

- [ ] **Steg 3: Skriv `flik.ts`** med `DRAG_GRANS` och `greppBeslut`.

- [ ] **Steg 4: `Grepp.svelte`.**
  - Greppet är en `<button>` som är 44 px hög och hela bred, med ett streck på 40 × 4 px i
    #8c8c8c, `aria-expanded={uppe}` och `aria-label` satt till `visa_mindre` eller `visa_mer`.
  - Greppet har `touch-action: none`. Annars tar webbläsaren över vertikala svep för sidskroll
    eller dra-för-att-uppdatera, och skickar `pointercancel` i stället för `pointerup`.
  - `onpointerdown` sparar `clientY` och sätter `setPointerCapture`.
  - `onpointercancel` nollställer utan att växla.
  - `onpointerup` frågar `greppBeslut`. Är svaret inte `null` anropas `onvaxla(svar)`, och nästa
    `click` ignoreras.
  - `onclick` anropar `onvaxla(!uppe)`.
  - Greppet visas bara under 60rem.

- [ ] **Steg 5: `Panel.svelte` i ny ordning.**
  - Ordningen är:
    1. `h1`, som står kvar överst;
    2. raden `källa, år` i `var(--dampad)`;
    3. notiserna;
    4. snabbraden: `Ladda ned` (bara under 60rem, anropar `onladdaned`), `Kopiera länk till vyn`
       och `Spara som bild` (klassen `spara`);
    5. resten: Nedladdning, Citera kartan, Metadata och Versioner.
  - Under 60rem, när `uppe` är falskt, får resten och `.spara` `display: none`.
  - Citeringen och förklaringen under nedladdningen får `class="lopande"`.

- [ ] **Steg 6: `Kartvy.svelte` under 60rem.**
  - `.kartvy` är ett rutnät med raderna `auto` (länkraden), `minmax(0, 1fr)` (kartan) och `auto`
    (panelen), och höjden `calc(100dvh - 3.5rem)`.
  - `.lista` döljs. I stället visas en länkrad på 44 px med `Ikon pil-vanster` och
    `` `${t('till_traffarna')} (${lista.length})` ``. Den länkar till `byggRutt({ vy: 'start', q })`,
    där `q` innehåller `q`, filterfälten och `lang` ur rutten.
  - När `uppe` är sann får panelen `height: calc(100dvh - 12.5rem)` och skrollar inuti.
  - Kartan krymper, och OpenLayers anpassar storleken via sin ResizeObserver.
  - `let uppe = $state(false)` sätts till `false` när `karta.id` ändras.
  - `onladdaned` sätter `uppe = true`, väntar på `tick()` och anropar
    `document.getElementById('nedladdning')?.scrollIntoView({ block: 'start' })`.
  - Panelens topp får `border-radius: 12px 12px 0 0` och en skugga uppåt. Bytet mellan lägena
    sker direkt, utan övergång.
  - När `uppe` är sann får `.kartvy` klassen `uppe`. Under 60rem döljer
    `.kartvy.uppe .legend, .kartvy.uppe .pekare { display: none }` teckenförklaringen och värdet
    under pekaren.
  - Är kartytan för låg för att zoomknapparna, Lagerval och teckenförklaringen ska få plats, i
    liggande läge med fliken nere, visas teckenförklaringen kompakt. Använd en container query på
    `.kartyta`, till exempel `max-height: 16rem`. Rubriken blir då `.visuellt-dold`, och raderna
    och rutorna blir tätare. Testet för liggande läge avgör om det räcker.

- [ ] **Steg 7: Värdet vid tryck.** I `Pekarvarde.svelte`: `k.on('singleclick', rorelse)` bredvid
  `pointermove`. Ta bort lyssnaren där de andra tas bort.

- [ ] **Steg 8: Kör testerna och se dem gå igenom, och därefter hela sviten.** Väntat: PASS.

- [ ] **Steg 9: Commit.** `git commit -m "feat(webb): mobil med flik, länk till träffarna och värde vid tryck"`

### Uppgift 5: Startsidan, listorna och Om-sidan i profilen

**Filer:**
- Ändra:
  - vyerna `webb/src/vyer/Start.svelte` och `webb/src/vyer/Om.svelte`;
  - komponenterna `webb/src/komponenter/Traffar.svelte`, `webb/src/komponenter/Filter.svelte`,
    `webb/src/komponenter/Sokfalt.svelte` och `webb/src/komponenter/Metadata.svelte`;
  - testerna i `webb/tests/app.spec.ts`.

**Gränssnitt:** inga nya.

- [ ] **Steg 1: Skriv de fallerande testerna** i ett block `'profil'`.
  - **'typsnitt: Roboto Condensed i gränssnittet och Merriweather i löpande text':**
    `getComputedStyle` för startsidans `h1` har en `fontFamily` som innehåller
    `Roboto Condensed`. Första `p` på `#/om` innehåller `Merriweather`.
  - **'valt projektkort markeras':** ett klick på projektkortet för NMK ger `backgroundColor`
    `rgb(238, 246, 214)`.
  - **'Om-sidan länkar till tillgänglighetsredogörelsen':** länken `Tillgänglighet` i `main` på
    `#/om`.
  - **'vetenskapliga namn är märkta som latin':** i metadatan för `torsk-test` har värdet för
    Vetenskapligt namn `lang="la"`.

- [ ] **Steg 2: Kör testerna och se dem fallera.**
  - Kör: `… npx playwright test -g "profil"`
  - Väntat: FAIL. Typsnittstestet kan redan gå igenom efter uppgift 1, och det är i så fall
    förväntat.

- [ ] **Steg 3: Startsidan enligt skissen.**
  - `h1` är 2.5rem i vikt 400.
  - Sökfältet är 48 px högt med kanten `var(--kant)`.
  - Projektkorten har kanten `var(--linje)` utan vänsterkant, och de valda får
    `background: var(--markering)` och `border-color: var(--gron)`.
  - Filtren får `accent-color: var(--gron)`, och knappen Rensa filter blir en kantad knapp.
  - Träfflistan har titlarna som gröna länkar i vikt 500 och källa och år i `var(--dampad)`. Den
    aktiva kartan i kartvyn får `background: var(--markering)`.

- [ ] **Steg 4: Om-sidan och metadatan.**
  - Om-sidans stycken får `class="lopande"`. Ett nytt avsnitt, Tillgänglighet (Accessibility),
    länkar till `#/tillganglighet` och behåller `lang`.
  - I `Metadata.svelte` får värdet för `vetenskapligt_namn` `lang="la"`, och `kvalitet` får
    `class="lopande"`.

- [ ] **Steg 5: Kör testerna och se dem gå igenom, och därefter hela sviten.** Väntat: PASS.

- [ ] **Steg 6: Commit.** `git commit -m "feat(webb): startsidan, listorna och Om-sidan i SLU:s profil"`

### Uppgift 6: Automatisk granskning med axe

**Filer:**
- Skapa: `webb/tests/hjalp.ts`, `webb/tests/tillganglighet.spec.ts`
- Ändra: `webb/package.json`, `webb/tests/app.spec.ts` och de filer där bristerna rättas.

**Gränssnitt:**
- Ger: `webb/tests/hjalp.ts` med `KARTA(url: string, id: string, q?: string)`,
  `START(url: string, q?: string)`, `cartoTom(page)` och `vantaKarta(page, minst?)`. Dessa flyttas
  ur `app.spec.ts`, som importerar dem.
- Ger: `granska(page): Promise<string[]>`, som ger `"<regel>: <selektorer>"` för varje
  överträdelse.

- [ ] **Steg 1: Lägg till `@axe-core/playwright`.** Kör `npm i -D @axe-core/playwright` och flytta
  hjälpfunktionerna till `hjalp.ts`.

- [ ] **Steg 2: Skriv `tillganglighet.spec.ts`.**
  - Varje fall öppnar en vy, väntar tills den är klar (`vantaKarta` för kartor) och kör
    `expect(await granska(page)).toEqual([])`.
  - `granska` använder
    `new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()`.
  - Fallen vid 1280 × 720:
    - startsidan;
    - startsidan med `q=torsk`;
    - `torsk-test`;
    - `torsk-test` med `lager=kontinuerlig`;
    - `torsk-test` med Lagerval öppen;
    - `#/om`;
    - `#/tillganglighet`.
  - Fallen vid 375 × 812:
    - startsidan;
    - `torsk-test` med fliken nere;
    - `torsk-test` med fliken uppe;
    - `torsk-test` med menyn öppen;
    - `#/om`.

- [ ] **Steg 3: Kör granskningen och läs varje överträdelse.**
  - Kör: `npm run build && … npx playwright test tests/tillganglighet.spec.ts`
  - Väntat: troligen FAIL med en lista över regler.

- [ ] **Steg 4: Rätta varje överträdelse där den uppstår.**
  - Ändra inte testet.
  - Gäller en rättelse något som också kan gå sönder utanför axe, till exempel ett namn eller en
    rubrikordning, lägg först ett riktat test i `app.spec.ts`, se det fallera och rätta sedan.
  - Skriv varje rättelse i ledgern.

- [ ] **Steg 5: Kör hela sviten.**
  - Väntat: PASS, med 0 överträdelser i alla 12 fall.

- [ ] **Steg 6: Commit.** `git commit -m "test(webb): automatisk WCAG-granskning med axe, och rättelser"`

### Uppgift 7: Manuell granskning, rättelser och redogörelsens brister

**Filer:**
- Skapa: `docs/wcag-granskning.md`
- Ändra: `webb/tests/tillganglighet.spec.ts`, `webb/src/vyer/Tillganglighet.svelte` och de filer
  där bristerna rättas.

**Gränssnitt:** inga nya.

- [ ] **Steg 1: Skriv de fallerande testerna** i `tillganglighet.spec.ts`.
  - **'tangentbord: hela flödet'**, vid 1280 × 720 och bara med `page.keyboard`:
    - Tab till sökfältet, skriv `torsk`, ArrowDown och Enter.
    - Tab till första träffen och Enter.
    - Kartvyn öppnas, och titeln innehåller `Torsk`.
    - Tab till `Lagerval` och Enter. Fokus ligger kvar på knappen.
    - Tab in i radiogruppen, till den valda `Klassad`, och ArrowRight till `Kontinuerlig`.
      Adressen får då `lager=kontinuerlig`.
    - Escape, och Tab till länken `Klassad karta` i panelen.
    - **Fokus syns hela vägen.** Efter varje tangent kontrolleras det element som visar fokus:
      `document.activeElement.closest('label') ?? document.activeElement`, så att etiketten
      kontrolleras när en visuellt dold radioknapp har fokus. Dess `outline-style` får inte vara
      `none`.
  - **'omflödning vid 320 px'** (1.4.10): vid 320 × 640, för start, `#/om`, `#/tillganglighet`
    och `torsk-test`, gäller `document.documentElement.scrollWidth <= 320`.
  - **'zoom 200 %'** (1.4.4): vid 640 × 360 är knappen `Lagerval` och greppet `toBeInViewport()`
    efter `scrollIntoViewIfNeeded`.
  - **'textavstånd'** (1.4.12):
    - Lägg in stilen
      `* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important } p { margin-bottom: 2em !important }`.
    - För `torsk-test` gäller då `scrollWidth <= clientWidth` för `.panel` och för varje `button`.

- [ ] **Steg 2: Kör testerna.**
  - Kör: `… npx playwright test tests/tillganglighet.spec.ts`
  - Väntat: det som fallerar är bristerna, och de rättas i steg 3.

- [ ] **Steg 3: Rätta varje brist.**
  - Ett test som fallerar är redan det riktade testet.
  - Det som inte kan testas automatiskt antecknas.

- [ ] **Steg 4: Kontrollera det som inte kan automatiseras.**
  - Gå igenom landmärken, rubrikordning och namn med `page.locator('body').ariaSnapshot()` för
    start och kartvy. `page.accessibility` är utfasat.
  - Kontrollera statusmeddelandena: Kopierad, Laddar kartan och felen.
  - Kontrollera `lang`.
  - Skriv `docs/wcag-granskning.md` som en tabell med kriterium, vad som kontrollerades, hur,
    resultat och åtgärd. Den täcker specens punkter under Manuell granskning.
  - Skärmläsartestet står som "Mårten, inte gjort ännu".

- [ ] **Steg 5: Uppdatera `Tillganglighet.svelte`.**
  - "Innehåll som inte är tillgängligt" listar de brister som finns kvar efter granskningen.
  - "Hur vi testat webbplatsen" säger: egen granskning med axe och manuell granskning mot WCAG
    2.1 AA, med dagens datum.
  - Sidan anger också när den senast uppdaterades.

- [ ] **Steg 6: Kör hela sviten.** Väntat: PASS.

- [ ] **Steg 7: Commit.** `git commit -m "docs: manuell WCAG-granskning, rättelser och redogörelsens brister"`
