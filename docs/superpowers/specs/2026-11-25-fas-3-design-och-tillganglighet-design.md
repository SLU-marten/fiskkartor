# Fas 3: design och tillgänglighet

**Datum:** 25 november 2026
**Bygger på:** `docs/superpowers/specs/2026-11-25-kartportal-design.md` (fas 3 i fasplanen) och kontrollpunkt 2.
**Skisser:** <https://claude.ai/artifact/XfVhXRA2ATnpdaPyhCQga6> (dator alternativ 1 och 2, mobil nere och uppe, startsidan).

## Avsikt

Portalen ska se ut som en SLU-tjänst när den flyttar till aqua.slu.se. SLU är avsändare, och då
gäller SLU:s grafiska profil med logotyp. Portalen ska också uppfylla kraven i DOS-lagen
(WCAG 2.1 AA) och ha en tillgänglighetsredogörelse.

Mårten godkände kartvisaren vid kontrollpunkt 2 den 25 november, med två ändringar:

- **Kartans namn står kvar överst i panelen när man skrollar.** Klart i a4c74d3.
- **Visa, teckenförklaring, opacitet och bakgrundskarta flyttas från panelen till kartan.** Det
  görs i den här fasen.

## Mål

1. SLU:s grafiska profil så långt den räcker, i ett återhållsamt verktygsutförande (stil A).
2. Kartkontrollerna i kartan enligt alternativ 2: teckenförklaringen syns alltid, och övriga val
   ligger bakom knappen Lagerval.
3. En utdragbar panel på mobil.
4. WCAG 2.1 AA: en automatisk och en manuell granskning, där bristerna rättas.
5. En tillgänglighetsredogörelse på svenska och engelska.

## Icke-mål

- Ny bakgrundskarta, till exempel Lantmäteriet. Vi behåller CARTO tills vidare.
- Nya funktioner, utöver flytten av kontrollerna och mobilpanelen.
- Ändrade färger för kartornas data.
- Profilkollage, illustrationer, ordbilden och kilen.
- Flytten till aqua.slu.se.

## Det som inte får hända

- Profilen får inte konkurrera med kartan om uppmärksamheten.
- Något som fungerar efter fas 2 får inte sluta fungera. Det gäller särskilt permanenta länkar,
  nedladdning, Spara som bild och värdet under pekaren.
- Färgad text får inte ha låg kontrast.
- Inga tunga typsnittsvikter.
- Inga anrop till Google eller andra tredje parter för typsnitt eller ikoner.

## Begränsningar

- **Teknik:** Svelte 5, Vite, TypeScript och OpenLayers 10.11 som i dag. Nya beroenden är
  begränsade till:
  - typsnitten via Fontsource;
  - `@axe-core/playwright` som utvecklingsberoende.
- **Tester:** alla befintliga tester ska fortsätta gå igenom, i den mån de inte gäller kontroller
  som flyttats. Tester som gäller kontrollerna flyttas med dem. Befintliga `data-testid` behålls
  där det går. CI ska vara grön på Ubuntu och Windows.
- **Adresser:** sidan ska fortsätta fungera från en undermapp, med relativa sökvägar, både på
  GitHub Pages och senare på aqua.slu.se.
- **Brytpunkten** för mobil är 60rem, som i dag.

## Tillvägagångssätt

| Fråga | Alternativ | Valt | Av vem |
|---|---|---|---|
| Hur tydligt SLU | A: återhållsamt verktyg. B: grönt band, kilen och ljusgröna ytor. | A | Mårten |
| Kontrollerna i kartan | 1: allt i en ruta som kan fällas ihop. 2: teckenförklaringen syns alltid, och resten ligger bakom Lagerval. | 2 | Mårten |
| Hur kontrollerna byggs | Svelte-komponenter ovanpå kartan, eller OpenLayers egna kontrollklasser | Svelte | Claude: de delar text och tillstånd med appen och blir tillgängliga med vanlig HTML |
| Mobilpanelen | En egen komponent med två lägen, eller ett bibliotek | Egen komponent | Claude: det är lite kod, och inget nytt beroende behövs |
| Typsnitten | I appen via Fontsource, eller från Google Fonts | Fontsource | Claude: inga anrop till tredje part (GDPR), och det fungerar utan nät |
| Granskningen | Bara automatisk, eller automatisk och manuell | Båda | Claude: axe hittar bara en del av bristerna |

## Grafisk profil

Källa: SLU:s grafiska profil på MW-webben, med sidorna om färger, färgpalett,
identitetsfärger, typografi, logotyp och illustrationer. Profilen säger inget om kartor eller
diagram.

### Färger

Grönt ska dominera, och rött används sparsamt. Logotypens färger får inte tonas. Ljusa ytor tas
därför ur paletten, och grått är toningar av svart. Alla värden samlas i CSS-variabler i
`webb/src/stil.css`:

| Roll | Värde | Källa | Kontrast mot vitt |
|---|---|---|---|
| Text | #222222 | svart, tonad | 15,9:1 |
| Dämpad text | #595959 | svart, tonad | 7,0:1 |
| Linjer | #d9d9d9 | svart 15 % | dekor |
| Kant på fält och reglage | #8c8c8c | svart 45 % | 3,4:1, kravet för gränssnitt är 3:1 |
| Mjuk yta (lista, rader) | #f5f5f5 | svart 4 % | – |
| Grönt: knappar, länkar, valt läge, fokus | #00664f | Logotyp Natur | 7,0:1 |
| Mörkgrönt: hovring och aktivt läge | #154734 | Skog | 10,6:1 |
| Markerad rad, valt projektkort | #eef6d6 | Lindblom, tonad mot vitt | – |
| Notis, till exempel nyare version | bakgrund #fdf6c4, kant #ffb81c | Solsken och Kåda | – |
| Fel | text #a80833, bakgrund #fbd7c9 | Rädisa och Aprikos | 7,6:1 |

- Kartornas klassfärger, YlGnBu, ändras inte.
- Fokus visas med en ram på 3 px i #00664f med 2 px avstånd.

### Typsnitt

- **Roboto Condensed** för gränssnittet: rubriker, knappar, etiketter, listor och metadata.
- **Merriweather** för löpande text: Om-sidan, tillgänglighetsredogörelsen, citeringen,
  kvalitetstexten och förklaringen under nedladdningen.
- **Vikter:** Roboto Condensed 400 och 500, Merriweather 300 och 400. Inga tyngre vikter.
- **Laddning:** båda hämtas via `@fontsource`, bara den latinska delen. Atkinson Hyperlegible
  Next tas bort.
- **Storlekar:** grundstorleken är 16 px, och ingen brödtext är mindre än 13 px.

### Logotyp

- SLU:s logotyp i färg på vit bakgrund, överst till vänster i sidhuvudet. Den får en fri zon på
  halva logotypens höjd och är minst 9 mm, cirka 34 px, hög.
- Höjden är 44 px på dator och 36 px på mobil.
- Bredvid logotypen står portalens namn, som länk till startsidan, och "Institutionen för
  akvatiska resurser" i mindre text. Det är inte en logotyp med organisationsnamn.
- Logotypen är ingen länk och har alt-texten "SLU, Sveriges lantbruksuniversitet".
- **Filen:** Mårten hämtar PNG-filen i färg ur `slu_logo_webb.zip`. Fram till dess visas en
  platshållare. Bygget och testerna ska fungera med båda.

### Ikoner

- Ikonerna är i Font Awesome-stil, eftersom SLU:s webb använder Font Awesome.
- De som behövs är zooma in och ut, lagerval, pil och stäng.
- De tas från Font Awesome Free som inbäddad SVG. Licensen är CC BY 4.0, och källan anges i en
  kommentar i koden.

## Kartvyn

### Dator (60rem och bredare)

- **Sidhuvudet** är 64 px högt, med logotyp, namn, institutionen och menyn: Kartor, Om portalen
  och In English.
- **Kolumnerna** är desamma som i dag: listan med träffar, kartan och panelen.
- **Panelen** innehåller, uppifrån:
  - kartans namn, som står kvar när man skrollar;
  - notiserna;
  - knapparna Kopiera länk till vyn och Spara som bild;
  - Ladda ned;
  - Citera kartan;
  - Om kartan, alltså metadatan;
  - Versioner.

  Visa, Teckenförklaring, Opacitet och Bakgrundskarta tas bort ur panelen.
- **I kartan:**
  - **Zoom:** knapparna överst till vänster, 40 × 40 px med gröna tecken. Det är OpenLayers
    zoomkontroll med ny stil.
  - **Lagerval:** knappen överst till höger öppnar en ruta under knappen med Visa, Opacitet (med
    värdet i procent) och Bakgrundskarta.
    - Visa är bara med när versionen har en kontinuerlig karta.
    - Visa och Bakgrundskarta är radioknappar som ser ut som delade knappar.
    - Rutan är stängd från början. Den stängs med knappen eller Escape, och fokus går då tillbaka
      till knappen.
    - Om rutan är öppen sparas inte i adressen. Valen sparas där som i dag.
  - **Teckenförklaring:** nere till höger, ovanför tillskrivningen, och syns alltid.
    - En klassad karta visar färgrutor med namn.
    - En kontinuerlig karta visar skalan 0–1 med "Sannolikhet", som i dag.
    - Den behåller `data-testid="legend"`.
  - **Värdet under pekaren:** nere till vänster, som i dag.
  - **Skalstock och tillskrivning:** som i dag, med nya färger.
  - **Laddningsstatus och fel:** överst i mitten, som i dag.
- **Spara som bild** ritar fortfarande teckenförklaringen och tillskrivningen i bilden, med
  Roboto Condensed. Bilden ritas först när typsnittet har laddats.

### Mobil (smalare än 60rem)

- **Sidhuvudet** är 56 px högt, med logotyp, namn och institutionen.
  - Under 40rem samlas menyn bakom en knapp, "Meny", som öppnar en lista med Kartor, Om portalen
    och In English.
  - Under 360 px döljs raden med institutionen.
- **Under sidhuvudet** finns en rad på 44 px med länken "Till träffarna (n)". Den går tillbaka
  till startsidan med samma sökning och filter. Listan med träffar visas inte i kartvyn på mobil.
- **Kartan** fyller resten av fönstret (`100dvh`). Kartvyn skrollar inte som sida på mobil.
- **Kontrollerna:** samma som på dator, men zoomknapparna och Lagerval är 44 × 44 px.
  Teckenförklaringen och värdet under pekaren ligger ovanför panelens överkant.
- **Värdet under pekaren på pekskärm:** värdet visas också där man trycker, via OpenLayers
  `singleclick`. En pekskärm ger ingen `pointermove` vid ett tryck, så i dag visas inget värde
  där.
- **Panelen** är en flik som ligger över kartans nederkant. Den har två lägen:
  - **Nere:** panelen är cirka 150 px hög och visar:
    - greppet, som är en knapp (`aria-expanded`, "Visa mer om kartan" och "Visa mindre");
    - kartans namn;
    - källa och år;
    - knapparna Ladda ned och Kopiera länk till vyn. Ladda ned drar upp panelen och visar
      avsnittet Ladda ned.

    Innehållet nedanför är `inert`, så att det inte går att tabba in i något som inte syns.
  - **Uppe:** panelens överkant ligger cirka 200 px från fönstrets topp. Innehållet skrollar inne
    i panelen, och namnet står kvar överst.
  - **Växla:** man växlar med greppet, eller drar i greppet och släpper. Panelen hamnar då i
    närmaste läge.
  - **Rörelse:** övergången är kort och stängs av med `prefers-reduced-motion`.
  - **Startläge:** nere, när kartan öppnas.

### Startsidan, Om-sidan och sidfoten

- **Startsidan** har samma innehåll och ordning som i dag, i profilens färger och typsnitt. Se
  skissen.
  - Projektkorten markeras med #eef6d6 och en grön kant när de är valda.
  - Träfflistan har titeln som grön länk och källa och år i dämpad text.
- **Om-sidan** har löpande text i Merriweather och en länk till tillgänglighetsredogörelsen.
- **Sidfoten** finns på start-, Om- och tillgänglighetssidan men inte i kartvyn. Den innehåller:
  - "Fiskkartor, Institutionen för akvatiska resurser, SLU";
  - länkar till Om portalen och Tillgänglighet;
  - kontaktadressen.

## Tillgänglighet

### Automatisk granskning

- **Verktyg:** `@axe-core/playwright` med reglerna `wcag2a`, `wcag2aa`, `wcag21a` och
  `wcag21aa`.
- **Vyer:**
  - startsidan, utan och med filter;
  - kartvyn för en klassad och en kontinuerlig karta, med Lagerval stängd och öppen;
  - Om-sidan;
  - tillgänglighetssidan;
  - på mobil dessutom panelen nere och uppe.
- **Fönsterbredder:** 1280 och 375 px.
- **Krav:** inga överträdelser. Testerna körs i CI.
- **Kontrast:** ett enhetstest räknar ut kontrasten för färgparen i tabellen ovan.

### Manuell granskning

Resultatet skrivs i `docs/wcag-granskning.md`, med kriterium, vad som kontrollerades, resultat
och åtgärd.

- **Tangentbord:** gå igenom hela flödet med bara tangentbord. Det gäller sök, förslag, filter,
  öppna karta, Lagerval, byte av lager, opacitet, nedladdning, kopiera citering, kopiera länk,
  versioner, tillbaka, språkbyte, och på mobil att dra upp panelen. Fokus ska alltid synas och
  aldrig hamna i dolt innehåll.
- **Zoom 200 %** (1.4.4) **och omflödning vid 320 px** (1.4.10): allt innehåll och alla
  funktioner ska gå att nå.
- **Textavstånd** (1.4.12) **och kontrast för gränssnittsdelar** (1.4.11).
- **Sidans titel per vy** (2.4.2): i dag heter alla vyer "Fiskkartor". Titeln blir "<vy> –
  Fiskkartor", och i kartvyn används kartans namn som vy.
- **Språk** (3.1.1 och 3.1.2): `lang` växlar med språket, och latinska namn kan märkas.
- **Statusmeddelanden** (4.1.3): Kopierad, Laddar kartan och felen meddelas via `aria-live` eller
  `role="status"` och `role="alert"`.
- **Landmärken, rubrikordning och namn på kontroller**, kontrollerade i Playwrights
  tillgänglighetsträd.
- **Skärmläsare:** Mårten provar VoiceOver eller NVDA på en karta. Det går inte att göra härifrån.

### Tillgänglighetsredogörelse

- **Adress:** en egen sida, `#/tillganglighet`, på svenska och engelska. Den länkas från Om-sidan
  och sidfoten.
- **Mall:** DIGG:s aktuella mall för tillgänglighetsredogörelser följs ordagrant där mallen
  kräver det. Byggaren hämtar texten och länken till DIGG:s anmälningsformulär från digg.se. Det
  kan behöva Mårtens godkännande, eftersom webbplatsen är ny för verktyget.
- **Innehåll:**
  - vem som står bakom webbplatsen;
  - hur tillgänglig den är (förenlig eller delvis förenlig);
  - kända brister;
  - vad man kan göra om man inte kan använda något;
  - hur man rapporterar brister;
  - tillsyn;
  - hur granskningen gjordes och när;
  - när sidan senast uppdaterades.
- **Kartbilderna:** kartor som inte är avsedda för navigering omfattas inte av kraven
  (EU-direktiv 2016/2102, artikel 1.4 d, och motsvarande undantag i lagen 2018:1937). Byggaren
  kontrollerar den exakta paragrafen. Redogörelsen ska ändå beskriva hur kartornas innehåll kan
  nås på annat sätt: filerna, metadatan som text och värdet under pekaren.
- **Kontakt för brister:** SLU-Aqua-fiskkartor@slu.se. Det är Claudes förslag, och Mårten kan
  välja en annan adress.

## Det byggaren avgör

- Exakta avstånd, skuggor och hörnradier inom skissernas utseende.
- Hur kontrollerna och panelen delas upp i komponenter.
- Animationerna, inom begränsningen för rörelse.
- Hur testerna struktureras.
- Ikonernas detaljer.
- Om ett klick i kartan stänger Lagerval.
- Ordalydelsen i redogörelsen, där DIGG:s mall inte bestämmer den.

## Öppna punkter för Mårten

- PNG-filen med logotypen.
- Kontaktadressen i redogörelsen, om den ska vara en annan än SLU-Aqua-fiskkartor@slu.se.
- Skärmläsartestet.
