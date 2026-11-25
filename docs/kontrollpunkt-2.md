# Kontrollpunkt 2 – kartvisaren (fas 2)

**Status:** klar för teamets granskning, 25 november 2026.
**Portal:** <https://slu-marten.github.io/fiskkartor/>
**Plan:** `docs/superpowers/plans/2026-11-25-fas-2-kartvisare.md` · **Design:** `docs/superpowers/specs/2026-11-25-kartportal-design.md`

## Vad som finns nu

- **Startsida.** Sök med förslag på art, vetenskapligt namn och titel. Versaler, å, ä och ö spelar ingen
  roll. Det finns kort per projekt och filter för nio fält (Fiskbarometern är inget filter, men visas i metadatan); grupper med fler än åtta värden fälls ihop.
  Under filtren visas träfflistan. Sökning och filter står i adressen, så de överlever omladdning och
  bakåtknappen.
- **Kartvy i SWEREF 99 TM** med CARTO Positron som bakgrund. Man kan växla mellan klassad och
  kontinuerlig karta, ställa opacitet och välja bakgrund. Listan till vänster visar träffarna från
  startsidan. På mobil är listan hopfälld, så att kartan syns direkt.
- **Värde under pekaren i tre lägen** (beslutat 25 november):
  - Fullt inzoomat visas det exakta värdet.
  - Upp till fyra gånger kartans upplösning visas ≈ tills det exakta värdet har hämtats.
  - Längre ut visas översiktsvärdet med ≈ och texten "Översiktsvärde – zooma in för exakt värde".
  - Värdet räknas om när man zoomar eller kartan laddar klart, även om pekaren står still.
  - Koordinater visas i SWEREF 99 TM och WGS84.
- **Panel med:**
  - legend;
  - nedladdning av originalfilerna med beskrivande namn (`<id>_v<n>_klassad.tif` osv.) och av
    metadata som JSON och text;
  - citering med en knapp för att kopiera;
  - metadata;
  - alla versioner;
  - knapparna "Kopiera länk till vyn" och "Spara som bild".
- **Länkar.** Vyn (centrum, zoom, lager, opacitet, bakgrund, språk) står i adressen. En dold karta
  visas med notisen "inte längre aktuell", en äldre version med en länk till den nyare, och en okänd
  karta med "Kartan finns inte".
- **Om-sidan** på svenska och engelska, med citeringsråd, licens och kontakt.

## Publiceringen

- **Alla 75 kartor är publicerade som version 2** (filformat 2), med MAX-översikter för de klassade
  kartorna. 16 rader är dolda, och inga gav fel. Version 1 finns kvar oförändrad.
- **Visningskopior i SWEREF 99 TM** finns för alla 75 kartor. Ingen ligger i 3006 från början: 26 i
  4326, 22 i 25833, 19 i 3035 och 8 i 3857.
  - Kopian får halva den minsta cellstorleken på marken någonstans i kartan, så att ingen cell
    försvinner.
  - Granskningen visade att den första regeln (samma cellstorlek, mätt vid mittlatituden) gjorde
    upp till 11 % av cellerna osynliga i kartan. Efter rättelsen mättes 0 osynliga celler på en
    karta i vart och ett av de fyra koordinatsystemen.
  - Efter Mårtens beslut får kopiorna (`*_3006.tif`) göras om, eftersom de aldrig laddas ned eller
    citeras. Originalen skyddas som förut.
- **25 m-kartan för abborre** (48 000 × 19 840 celler): MAX-översikterna tar 66 s och filen blir
  3,4 MB. Visningskopian av 3857-varianten tar 122 s.
- **Storlek:** dataträdet är 135 MB (kartorna 67 MB och perf-testfilerna 68 MB), väl under gränsen
  på 1 GB för GitHub Pages.

## Kontrollerat på Pages (25 november, i Mårtens webbläsare)

| Kontroll | Resultat |
|---|---|
| Startsidan listar alla kartor | 75 kartor, alla version 2 |
| Testkartor i katalogen | Inga |
| Kartor i fyra koordinatsystem (3035, 3857, 4326, 25833) | Alla öppnas och läser sin visningskopia `v2/visning_3006.tif` |
| Värde under pekaren | T.ex. "Mycket viktigt", "Viktigt", "≈ Ej viktigt område" med förklaringen |
| CARTO-rutor | Alla 234 med nyckeln, svar 200 |
| Permanent länk i ny flik | Samma centrum, upplösning, lager och språk |
| Nedladdning | Originalfilen, SHA-256 som i katalogen, namnet `akta-tunga-uppvaxt-vastkusten-2021_v2_klassad.tif` |
| Konsolfel | Inga |

**Tester:**
- R-sviten: alla tester godkända.
- Schemat: 11 av 11.
- Vitest: 54 av 54.
- Playwright: 41 godkända och 5 överhoppade (25 m-prestandatesterna).
- CI är grön på Ubuntu och Windows.

## Checklista för teamet

- [ ] Hitta en karta med sökfältet (prova "rödspätta" utan prickar) och med filtren.
- [ ] Öppna kartan, läs metadata och kvalitet, och byt mellan klassad och kontinuerlig.
- [ ] Håll pekaren över ett färgat område, zooma in och ut och se hur värdet ändras.
- [ ] Ladda ned den klassade kartan, den kontinuerliga och metadatan. Öppna dem i QGIS eller ArcGIS.
- [ ] Kopiera citeringen och länken till vyn, och öppna länken i en annan webbläsare.
- [ ] Spara kartan som bild.
- [ ] Byt till engelska och tillbaka.
- [ ] Prova på mobilen.

## Kända begränsningar

- **Fas 3:** SLU:s grafiska profil, en utdragbar panel på mobil och tillgänglighetsredogörelsen.
- **Servern måste klara HTTP Range.** Utan det säger kartvyn "Kartfilen kunde inte hämtas".
  aqua.slu.se klarar det för sina egna filer.
- **Version 1 visas med notisen "Det finns en nyare version".** Version 2 är samma data med nya
  översikter.
- **Ett exakt värde kan skilja sig från färgen.** Vid kontrollen gav en syntetisk pekare "—" över en
  färgad ruta på en gles kustkarta (braxen) i utzoomat läge. I full upplösning saknar just den punkten
  data, så "—" är rätt i punkten. Att det exakta värdet visades där är dock oväntat: kartan var så
  utzoomad att översiktsvärdet borde ha visats. Prova för hand.
- **Mindre fynd från granskningen** som inte är åtgärdade:
  - länken "Visa version N" tar inte med lager och vy;
  - en okänd version (`?v=9`) visar den aktuella utan notis;
  - "Spara som bild" visar inget medan den arbetar;
  - kontakt antas vara en e-postadress och DOI ett rent nummer;
  - metadata.json heter `_v<n>` fast den inte är versionerad.

## Öppna beslut

- **Licens:** CC BY 4.0 är preliminär.
- **Långsiktig plats:** aqua.slu.se. Peter Ljungberg har sagt att en plats där är gratis. Frågor om
  utrymme och uppladdning med skript är skickade.
- **De 16 dolda kartorna från 2025:** originalfilerna saknas.
- **Granskningens mindre fynd:** vilka av dem som ska tas i fas 3.
