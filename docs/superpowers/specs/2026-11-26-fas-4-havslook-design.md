# Fas 4: havslook

**Datum:** 26 november 2026
**Bygger på:** fas 3 (`2026-11-25-fas-3-design-och-tillganglighet-design.md`), som är klar och ligger på main.
**Skisser:** <https://claude.ai/artifact/BWiPXGL554ThdkNHj5vpuG>. Raden Hav gäller, liksom havsskalan och
de fyllda silhuetterna på Havsvik.

## Avsikt

Mårten tycker att appen känns för vit och tråkig. Han vill ha en look i stil med Artfakta, som han
tycker är den snyggaste SLU-appen. Han vill också att kartans färger tas ur SLU:s palett och att samma
färger används i hela appen.

Fas 3 valde ett återhållsamt verktyg (stil A) med vita ytor och grönt för det man kan klicka på. Den
här fasen ändrar det valet: havsfärgerna blir appens temafärg.

## Mål

1. **Havsvik som temafärg:**
   - ett petrolfärgat sidhuvud med vit logotyp och ett mönster av fisksiluetter;
   - ljust havsgrå sidor med vita kort;
   - en mörk sidfot i Havsdjup;
   - på mobil en meny som glider in från höger.
2. **Kartans färger ur havsskalan** (Turkos → Havsvik → Havsdjup), både klassade och kontinuerliga
   kartor.
3. **Artsilhuetter ur Artfaktas illustrationer:**
   - i mönstret i sidhuvudet och i menyn;
   - som en rund ikon framför varje karta i träfflistorna.

   Ikonens fisk är liten för lek och uppväxt och stor för vuxen.
4. **Ett R-skript** som gör silhuetterna och mönstren ur bildfilerna, så att teamet kan lägga till arter
   när nya kartor kommer.

## Icke-mål

- Ändrade funktioner. Allt som fungerar i dag ska fungera likadant.
- Ny bakgrundskarta. CARTO ligger kvar.
- Ändringar i katalogen eller dess schema. Fältet `farg` i katalogen ("YlGnBu") används inte av webben
  och lämnas som det är.
- Ikonen i kartans panel eller i kartbilden. Ikonerna finns bara i träfflistorna.

## Det som inte får hända

- En silhuett visar fel art. Saknas bilden för en art visas ingen fisk, inte en annan art eller en
  allmän fisk.
- Text eller kontroller får för låg kontrast, till exempel Havsvik på den valda radens bakgrund (4,3:1).
- Mönstret drar ner kontrasten för texten i sidhuvudet under 4,5:1.
- Fokusramen försvinner mot den petrolfärgade bakgrunden.
- Artfaktas bildfiler hamnar i repot. Repot är publikt och filerna är stora. Bara de framräknade
  silhuetterna läggs in.

## Begränsningar

- **Teknik:** som i fas 3 (Svelte 5, Vite, TypeScript, OpenLayers 10.11). Inga nya beroenden i webben.
- **Skriptet** skrivs i R med `terra` och `magick`, som teamet redan använder. Det körs för hand och
  ingår inte i CI.
- **Testerna:** alla tester ska gå igenom. Tester som kontrollerar färger (kontrastenhetstestet, det
  valda projektkortet och pixelfärgerna i kartan) får nya värden. CI ska vara grön på Ubuntu och
  Windows.
- **Brytpunkterna** ligger kvar: 60rem för mobil, 40rem för menyknappen och 22.5rem för institutionsraden.

## Tillvägagångssätt

| Fråga | Alternativ | Valt | Av vem |
|---|---|---|---|
| Temafärg | Hav: petrol som temafärg, som Artfakta. Skog: SLU-grönt, havsfärgerna bara i kartan | Hav | Mårten |
| Kartans färger | YlGnBu som i dag, havsskalan eller gröna skalan | Havsskalan | Mårten |
| Mönstret | Fyllda silhuetter eller konturer som hos Artfakta | Fyllda, på Havsvik, lite tätare än i skissen | Mårten |
| Menyns mönster | Samma remsa som sidhuvudet eller ett eget | Eget: över hela menyn, varje art en gång | Mårten |
| Artikoner i listorna | Med eller utan | Med, fisken liten för lek och uppväxt och stor för vuxen | Claude föreslog, Mårten valde storlekarna |
| Silhuetternas källa | Artfaktas illustrationer eller von Wrights planscher | Artfakta | Mårten: SLU äger bilderna |
| Hur silhuetterna görs | Ett skript i R, i Python, eller bara färdiga filer | R | Claude: teamet underhåller R, och nya arter kommer |
| Mönstren i appen | Färdiga SVG-filer, eller ritade i webbläsaren ur silhuetterna | Färdiga SVG-filer | Claude: enklast, och webbläsaren cachar dem |

SLU:s profil säger att grönt ska dominera. Havsfärgerna finns i paletten som tema- och detaljfärger.
Mårten valde Hav med det i vetskap.

## Färger

Paletten kommer från SLU:s färgpalett (Medarbetarwebben). Alla värden samlas i CSS-variabler i
`webb/src/stil.css`.

| Roll | Värde | Källa | Kontrast |
|---|---|---|---|
| Sidhuvud, menypanel, primära knappar, länkar, valt läge, fokus | #007681 | Havsvik | 5,4:1 mot vitt, 4,8:1 mot sidan |
| Hovring och aktivt läge, Meny-knappen i sidhuvudet, sidfoten | #004851 | Havsdjup | 10,3:1 mot vitt |
| Sidornas bakgrund | #eef4f6 | Duva, 25 % | – |
| Vald rad, valt projektkort | #dce9ee | Duva, 50 % | text #222222: 12,8:1 |
| Kant på kort | #d5e5ea | Duva, 60 % | dekor |
| Text, dämpad text, linjer, kant på fält | som i fas 3 | – | oförändrat |
| Notis och fel | som i fas 3 | – | oförändrat |

- **Text på den valda radens bakgrund** är alltid #222222. Havsvik ger där bara 4,3:1.
- **Fokus:** en ram på 3 px i Havsvik med 2 px avstånd, som i dag men i den nya färgen. I sidhuvudet,
  menypanelen och sidfoten är ramen vit (5,4:1 mot Havsvik).
- **Grönt** försvinner ur gränssnittet. `--gron` och `--gron-mork` ersätts.

### Kartans färger

- **Klassade kartor**, de färgade klasserna i värdeordning:

  | Antal klasser | Färger |
  |---|---|
  | 1 | Havsdjup #004851 |
  | 2 | Turkos #00b0b9, Havsdjup #004851 |
  | 3 | Turkos, Havsvik #007681, Havsdjup |
  | Fler | Jämnt fördelade längs Turkos → Havsvik → Havsdjup |

- **Kontinuerliga kartor:** Himmel #6ad1e3 → Turkos → Havsvik → Havsdjup, linjärt mellan min och max.
- **Teckenförklaringen och Spara som bild** följer med. De hämtar redan färgerna från samma ställe.

Den lägsta änden av den kontinuerliga skalan syns svagt mot havet (Himmel 1,25:1 mot CARTO:s vatten).
Så är det också i dag med YlGnBu (1,4:1). Låga sannolikheter får hellre träda tillbaka.

## Sidhuvudet

- **Bakgrund och mönster:** Havsvik med mönsterremsan, upprepad i sidled och lika hög som sidhuvudet.
  Höjden är densamma som i dag: 4.5rem på dator och 4.25rem på mobil.
- **Mönsterremsan** är 1440 × 144 i sitt eget koordinatsystem, med cirka 35 fiskar. En torsk ligger
  alltid under namnet Fiskkartor (x 168–333, nedre halvan), resten slumpas runt den. Remsan går ihop i
  skarven, så fiskar som korsar en kant ritas på båda sidor. Fiskarna är vita med 7,5 % opacitet. Vit
  text mot bandet med fisk under ger minst 4,7:1.
- **Logotyp:** SLU:s vita logotyp (PNG med den fria zonen inbyggd, som den färgade), i samma storlek som
  i dag: 72 px på dator och 68 px på mobil.
- **Text:** portalens namn och institutionsraden i vitt.
- **Navigering på dator:** länkarna i vitt, den aktuella sidan understruken.
- **Meny-knappen på mobil:** Havsdjup med vit text och en ikon med tre streck.
- **Linjen under sidhuvudet** behövs inte längre. Bandet avgränsar själv.

## Menyn på mobil

Under 40rem öppnar Meny-knappen en panel som glider in från höger.

- **Panelen:** 316 px bred, så hög som skärmen, i Havsvik. Längst upp står "Fiskkartor" och en
  stängknapp (×, med etiketten "Stäng menyn").
- **Länkarna:** Kartor, Om portalen, Tillgänglighet och språkbytet, med tunna vita linjer mellan. Den
  aktuella sidan har ett vitt streck framför.
- **En rad om avsändaren:** "Fiskkartor tas fram av SLU Aqua, Institutionen för akvatiska resurser."
- **Mönster:** över hela panelen, 24 arter där varje art finns en gång, en art per ruta i ett rutnät
  på 3 × 8 med slump i läget. Fiskarna är något mindre än i sidhuvudet (44–88 px långa). Inget upprepas.
- **Resten av sidan** tonas ned bakom panelen. Ett tryck där stänger menyn.
- **Beteendet är som i dag.** Menyn stängs med Escape, med en länk, med ett tryck utanför och när
  fokus lämnar den. Fokus flyttas till stängknappen när menyn öppnas och tillbaka till Meny-knappen när
  den stängs.
- **Med reducerad rörelse** (`prefers-reduced-motion`) visas panelen utan att glida.

## Sidorna

- **Startsidan:** bakgrunden i sidornas färg. Sökrutan med projektkorten, Filtrera och träfflistan
  ligger var för sig i vita kort med kant i Duva 60 %.
  - Sökknappen sitter ihop med fältet, med förstoringsglas i Havsvik, som i skissen.
  - Projektkorten och filtren beter sig som i dag.
- **Om-sidan och tillgänglighetsredogörelsen:** texten i ett vitt kort på sidornas bakgrund.
- **Kartvyn:**
  - Den behåller sin uppdelning, med vita paneler.
  - Mellanrummen och ytorna utanför panelerna får sidornas bakgrund.
  - Knapparna följer de nya färgerna. Ladda ned är fylld i Havsvik och de andra har Havsvik-kant.
- **Sidfoten:** Havsdjup med vita länkar.

## Artikoner i träfflistorna

Varje rad i träfflistan, både på startsidan och i kartvyns lista, får en rund ikon före namnet.

- **Ikonen:** en cirkel på 44 px (36 px i kartvyns lista) i Havsvik, med artens silhuett i vitt.
- **Storlek efter livsstadium**, fältet `falt.livsstadium`:
  - **Vuxen:** fisken fyller cirka 77 % av cirkelns bredd (34 av 44 px).
  - **Lek, uppväxt eller tomt fält:** fisken är cirka 45 % av bredden (20 av 44 px).
  - Plattfiskar och krabbor är höga och får samma bredd som de andra. Höjden följer bildens
    proportioner.
- **Arten** hämtas ur `falt.art`.
  - När flera arter står med snedstreck ("Braxen/björkna") används den första.
  - En tabell i appen översätter katalogens namn till bildens, till exempel Hummer → Europeisk hummer.
  - **Saknas silhuetten** står cirkeln tom i samma färg, så att raderna linjerar. Ingen annan art visas
    i dess ställe.
- **Ikonen är dekor** (`aria-hidden`). Arten och livsstadiet står redan i kartans namn.

## Silhuetterna och skriptet

**Indata** är Artfaktas bilder, en per art, med artens svenska namn som filnamn. Mårten har dem lokalt.
De läggs inte i repot. En bild har vit bakgrund, svart bakgrund (Europeisk hummer) eller genomskinlig
bakgrund (Krabbtaska).

**Skriptet** heter `publicering/inst/skript/silhuetter.R` och tar mappen med bilderna som argument.

1. **Bakgrunden** är den färg som dominerar längs bildens kant, eller genomskinligheten. Bildpunkter
   nära den färgen, som hänger ihop med kanten, är bakgrund. Allt annat är fisken. Ljusa partier inne i
   fisken, som en vit buk, räknas därmed till fisken.
2. **Små fläckar** tas bort, och bara delar som är minst 2 % av den största behålls.
3. **Konturen** görs om till polygoner och förenklas till ungefär 1 % av bildens bredd. Den skrivs som
   en SVG-sökväg med bildens bredd och höjd.

**Utdata:**
- `webb/src/assets/arter/silhuetter.json`: `{ "<art>": { "w": n, "h": n, "d": "M… Z" } }`, nycklat
  på bildens artnamn.
- `webb/src/assets/arter/monster-sidhuvud.svg`: remsan till sidhuvudet.
- `webb/src/assets/arter/monster-meny.svg`: mönstret till menypanelen.

Mönstren slumpas med ett fast frö, så att samma bilder ger samma mönster. De byggs av arterna i
katalogen som har en silhuett, högst 24 arter.

**Kontrollen:** skriptet skriver ut vilka arter i katalogen som saknar bild. I dag gäller det Fenknot,
Femtömmad skärlånga, Nordkalmar, Strandkrabba, Vahls ålbrosme och Östersjöflundra.

**Webben** importerar `silhuetter.json` vid bygget. Ikonerna ritas som inline SVG, så att färgen kan
styras med CSS.

## Tillgänglighet

- **Axe-granskningen** körs som i dag i alla vyer. Den ska vara utan anmärkningar.
- **Ett enhetstest** kontrollerar kontrasten för de nya färgparen:
  - texten mot sidorna och mot den valda raden;
  - vitt mot Havsvik och mot Havsdjup;
  - fokusramen mot sina bakgrunder.
- **Menypanelen:**
  - fokus följer beskrivningen ovan;
  - dold med `hidden` eller `inert` när den är stängd;
  - stängknappen har en etikett.
- **Tillgänglighetsredogörelsen** behöver inte ändras.

## Det byggaren avgör

- **Hur menypanelen glider in:** transform och övergångstid, högst 200 ms.
- **Hur namntabellen ser ut och var den ligger i koden.**
- **Exakta avstånd i korten**, med skisserna som riktmärke.
- **Om skriptet använder `terra` eller `magick`** för att läsa bilderna, med samma resultat som i skissen.

## Öppna punkter för Mårten

- **Bilder för de sex arter som saknas.** Tills de finns står cirklarna tomma.
- **Granskning i mobilen** när bygget ligger ute.

## Tillägg 26 november 01:14–01:22: ny startsida

Mårten tyckte att startsidan kändes ofärdig: allt låg till vänster, och listan med 75 kartor var
lång. Han godkände skissen "Startsidan, nytt förslag" (01:21) och ville ha en knapp längst ned för
att visa alla (01:22). Projektkorten under sökrutan tas bort (01:11).

- **Överst** ligger en ruta i sidornas färg, centrerad i högst 1200 px:
  - till vänster rubriken "Hitta en fiskkarta", en mening om portalen (Merriweather) och sökrutan
    med knappen Sök;
  - till höger kortet "Så läser du kartorna", med teckenförklaringen för klassade kartor (Turkos och
    Havsdjup) och kontinuerliga kartor (havsskalan), och en länk till Om-sidan.
  - På mobil hamnar kortet längst ned på sidan.
- **Under rutan** ligger filtren till vänster i ett vitt kort, 17rem brett, och arterna till höger.
  Fältet Art visas inte i filtren, eftersom korten är artlistan. Det visas ändå om adressen har
  ett art-filter.
- **Ett kort per art:**
  - artens silhuett i Havsvik, namnet och det latinska namnet;
  - en knapp per karta. Knappens text är kartans namn utan artnamnet, till exempel "Uppväxt
    västkusten". Länkens tillgängliga namn är hela kartnamnet.
  - Korten står i bokstavsordning, och knapparna i kartnamnets ordning.
  - En karta utan art får ett eget kort med kartans namn och knappen "Öppna kartan".
  - På mobil står silhuetten till vänster om namnet.
- **Rubriken** ovanför korten anger antalet arter och kartor, till exempel "58 arter, 75 kartor".
- **Högst 12 kort visas först.** Fler visas med knappen "Visa alla 58 arter" längst ned. Knappen
  visas också vid sökning och filter, om träffarna är fler än 12. En ny sökning eller ett nytt filter
  visar åter 12.
- **Kartvyns lista** behåller artikonerna.
