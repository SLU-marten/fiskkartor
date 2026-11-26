# Artsilhuetter

Appen visar silhuetter av arterna på två ställen:
- i mönstret i sidhuvudet och i mobilmenyn;
- som en rund ikon framför varje karta i träfflistorna.

Silhuetterna görs ur Artfaktas illustrationer (SLU Artdatabanken) av skriptet
`publicering/inst/skript/silhuetter.R`.

## Lägga till en art

1. **Spara bilden.** Hämta artens bild från Artfakta, under sidan Information, och spara den i
   mappen med bilderna. Filnamnet är artens svenska namn som i katalogens fält `art`, till exempel
   `Torsk.jpg` eller `Femtömmad skärlånga.png`.
   - Bakgrunden kan vara vit, svart eller genomskinlig.
   - Bara arten ska finnas i bilden.
2. **Kör skriptet från repots rot:**

   ```sh
   Rscript publicering/inst/skript/silhuetter.R <mapp med bilderna> <katalog.json>
   ```

   `katalog.json` är katalogen på grenen `data` (`katalog/katalog.json`).
3. **Läs utskriften.** Skriptet säger hur många silhuetter det gjorde och vilka arter i katalogen
   som saknar bild. En art som saknar bild får en tom cirkel i listan, aldrig en annan arts fisk.
4. **Committa de tre filerna** i `webb/src/assets/arter/`: `silhuetter.json`, `monster-sidhuvud.svg`
   och `monster-meny.svg`.

## Bra att veta

- **Bildfilerna läggs inte i repot.** Repot är publikt och filerna är stora. Bara silhuetterna, som
  räknas fram ur bilderna, ligger i repot.
- **Namn som skiljer sig:** katalogens namn översätts till bildens i två tabeller, `ART_ALIAS` i
  `publicering/R/silhuetter.R` och `ALIAS` i `webb/src/lib/arter.ts`. Ändra båda.
  - Hummer → Europeisk hummer.
  - Östersjöflundra → Skrubbskädda.

  När flera arter står med snedstreck ("Braxen/björkna") används den första.
- **Mönstren** använder en fast lista med 24 arter (`MONSTERARTER` i skriptet). Mönstret blir
  detsamma varje gång samma bilder körs. En torsk ligger alltid under namnet Fiskkartor.
- **Fiskens storlek i ikonen** följer fältet `livsstadium`: stor för vuxen, liten för lek och uppväxt.
