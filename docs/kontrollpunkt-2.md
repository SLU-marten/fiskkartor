# Kontrollpunkt 2 – kartvisaren (fas 2)

**Status:** klar för teamets granskning, 25 november 2026. Uppdaterad samma kväll efter en extern
granskning av fas 2.
**Portal:** <https://slu-marten.github.io/fiskkartor/>
**Plan:** `docs/superpowers/plans/2026-11-25-fas-2-kartvisare.md` · **Design:** `docs/superpowers/specs/2026-11-25-kartportal-design.md`

## Vad som finns nu

- **Startsida.** Sök med förslag på art, vetenskapligt namn och titel. Versaler, å, ä och ö spelar ingen
  roll. Det finns kort per projekt och filter för nio fält; grupper med fler än åtta värden fälls ihop.
  Fiskbarometern är inget filter men visas i metadatan. Under filtren visas träfflistan. Sökning och
  filter står i adressen, så de överlever omladdning och bakåtknappen.
- **Kartvy i SWEREF 99 TM** med CARTO Positron som bakgrund. Man kan växla mellan klassad och
  kontinuerlig karta, ställa opacitet och välja bakgrund. Listan till vänster visar träffarna från
  startsidan. På mobil är listan hopfälld, så att kartan syns direkt.
- **Värde under pekaren:**
  - I full upplösning visas det exakta värdet.
  - **Klassade kartor**, utzoomat: översiktens klass med ≈ och texten "Översiktsvärde – zooma in för
    exakt värde". Inget hämtas. En MAX-översikt färgar hela rutan om en cell har data, så ett exakt
    punktvärde ("—") skulle motsäga färgen (beslutat efter den externa granskningen).
  - **Kontinuerliga kartor**, upp till 2× originalets cellstorlek: ≈ tills det exakta värdet har hämtats.
    Längre ut visas översiktsvärdet med ≈.
  - Värdet räknas om när man zoomar eller kartan laddar klart, även om pekaren står still.
  - Koordinater visas i SWEREF 99 TM och WGS84.
- **Panel med:**
  - legend;
  - nedladdning av originalfilerna med beskrivande namn (`<id>_v<n>_klassad.tif` osv.), av
    metadata som JSON (`<id>_metadata.json`, alla versioner) och som text (för versionen);
  - citering med en knapp för att kopiera;
  - metadata (kontakt blir länk bara för e-post eller webbadress; DOI kan vara rent eller en länk);
  - alla versioner;
  - knapparna "Kopiera länk till vyn" och "Spara som bild". Spara som bild visar att den arbetar och
    ger ett fel efter 20 s om kartan aldrig blir klar.
- **Länkar.** Vyn (centrum, zoom, lager, opacitet, bakgrund, språk) står i adressen. Särskilda lägen:
  - en dold karta visas med notisen "inte längre aktuell";
  - en äldre version visas med en länk till den nyare, och länken behåller vyn;
  - en version som inte finns ger "Version 9 finns inte. Visar version 2.";
  - en okänd karta ger "Kartan finns inte".
- **Om-sidan** på svenska och engelska, med citeringsråd, licens och kontakt.

## Publiceringen

- **Alla 75 kartor är publicerade som version 2** (filformat 2), med MAX-översikter för de klassade
  kartorna. 16 rader är dolda, och inga gav fel. Version 1 finns kvar oförändrad.
- **Visningskopior i SWEREF 99 TM** finns för alla 75 kartor. Ingen ligger i 3006 från början: 26 i
  4326, 22 i 25833, 19 i 3035 och 8 i 3857.
  - Kopian får halva den minsta cellstorleken på marken någonstans i kartan, så att ingen cell
    försvinner.
  - Granskningen visade att den första regeln gjorde upp till 11 % av cellerna osynliga. Efter
    rättelsen mättes 0 osynliga celler på en karta i vart och ett av de fyra koordinatsystemen.
  - Kopiorna (`*_3006.tif`) får göras om, eftersom de aldrig laddas ned eller citeras. Originalen
    skyddas som förut.
  - Kartvisaren läser varje fil med `?h=<början av SHA-256>`. En omgjord kopia blandas då aldrig med
    delar av en cachad äldre, även om servern ger lång cachetid.
  - Publiceringen varnar när en kopia skulle bli större än en miljard celler. Det händer till exempel
    om en 25 m-karta levereras i 3857 eller 3035; leverera sådana i SWEREF 99 TM.
- **25 m-kartan för abborre** (48 000 × 19 840 celler): MAX-översikterna tar 66 s och filen blir
  3,4 MB. Hela kartan med kontinuerlig fil publiceras på 202 s.
- **Storlek:** dataträdet är 195 MB, väl under gränsen på 1 GB för GitHub Pages. Kartorna tar 67 MB,
  testfilerna från fas 1 68 MB och 25 m-testkatalogen 60 MB.

## 25 m-kartan i kartvisaren

För att se att Svelte-gränssnittet inte gör zoomen sämre finns 25 m-kartan i en egen testkatalog:
<https://slu-marten.github.io/fiskkartor/?data=data/test/portal/#/karta/abborre-25m-test>

Mätningen gjordes med `webb/scripts/zoom-app.mts`. Den kör 12 hjulsteg på två platser med samma
nätverk som vid kontrollpunkt 1 (40 ms fördröjning, 10 Mbit/s), med CARTO-lagret och pekarvärdet igång.

| Plats | Sida | Zoomen klar | Längsta bildruta | 95 % av bildrutorna inom | Bildrutor över 50 ms |
|---|---|---|---|---|---|
| 59,33° N 18,9° E | kartvisaren | 2,0 s | 33 ms | 17 ms | 0 |
| 59,33° N 18,9° E | perf.html | 2,3 s | 50 ms | 50 ms | 0 |
| 56,9° N 16,5° E | kartvisaren | 2,0 s | 33 ms | 17 ms | 0 |
| 56,9° N 16,5° E | perf.html | 2,4 s | 50 ms | 50 ms | 3 |

Kartvisaren är inte långsammare. Kartytan är ungefär hälften så stor som perf.html:s helskärm och
hämtar därför färre rutor.

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
- Vitest: 64 av 64.
- Playwright: 44 godkända och 5 överhoppade (25 m-prestandatesterna).
- CI är grön på Ubuntu och Windows.

## Checklista för teamet

- [ ] Hitta en karta med sökfältet (prova "rödspätta" utan prickar) och med filtren.
- [ ] Öppna kartan, läs metadata och kvalitet, och byt mellan klassad och kontinuerlig.
- [ ] Håll pekaren över ett färgat område, zooma in och ut och se hur värdet ändras.
- [ ] Ladda ned den klassade kartan, den kontinuerliga och metadatan.
- [ ] Öppna två kartor i QGIS eller ArcGIS mot en bakgrundskarta: en NMK Yngel-karta (omskriven från
      IGNF LAEA till EPSG:3035) och en PanBalticScope-karta (EPSG:3857). Kontrollera att de hamnar
      exakt rätt längs kusten.
- [ ] Kopiera citeringen och länken till vyn, och öppna länken i en annan webbläsare.
- [ ] Spara kartan som bild.
- [ ] Byt till engelska och tillbaka.
- [ ] Prova på mobilen.
- [ ] Zooma och panorera i 25 m-testkartan (länken ovan).

## Kända begränsningar

- **Fas 3:** SLU:s grafiska profil, en utdragbar panel på mobil och tillgänglighetsredogörelsen.
- **Servern måste klara HTTP Range.** Utan det säger kartvyn "Kartfilen kunde inte hämtas".
  aqua.slu.se klarar det för sina egna filer.
- **Version 1 visas med notisen "Det finns en nyare version".** Version 2 är samma data med nya
  översikter.

## Fas 3: grafisk profil

SLU:s grafiska profil:
<https://internt.slu.se/stod-service/admin-stod/kommunikation-och-marknadsforing/varumarke-och-grafisk-profil/grafisk-profil/>.
Sidorna går att läsa utan inloggning. Utgångspunkter:

- **Typsnitt för webben:** Roboto Condensed för rubriker, ingresser, text och knappar, och Merriweather
  för brödtext (båda fria). Light eller regular, ingen tung fetstil, få vikter.
- **Färger:** identitetsfärgerna är grönt och rött på vit bakgrund. Koderna står på en separat sida,
  på den interna MW-webben och på beta.slu.se.
- **Logotyp:** profilen och dess delar får bara användas när SLU är avsändare, och då med SLU:s
  logotyp.
- **Tillgänglighet:** sparsamt med färgad text, och då med hög kontrast.

## Öppna beslut

- **Licens:** CC BY 4.0 är preliminär.
- **Långsiktig plats:** aqua.slu.se. Peter Ljungberg har sagt att en plats där är gratis. Frågor om
  utrymme och uppladdning med skript är skickade.
- **Bakgrundskartan:** vi fortsätter med CARTO tills vidare (beslut 25 november). Nyckeln syns i
  webbläsaren, så den ska vara begränsad till portalens adresser hos CARTO, och aqua.slu.se läggs
  till vid flytten. Lantmäteriets karta via en proxy på slu.se är en möjlig senare förbättring.
- **De 16 dolda kartorna från 2025:** originalfilerna saknas.
