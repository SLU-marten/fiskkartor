# Fiskkartor

Kartportal för SLU Aquas kartor över viktiga områden för fisk. Portalen är en statisk webbplats:
kartorna ligger som Cloud-Optimized GeoTIFF (COG) och ritas direkt i webbläsaren, så ingen server
behöver driftas. Användare kan visa kartor i full upplösning, läsa metadata och ladda ner filerna.

- `publicering/` – R-paket som kontrollerar, konverterar och publicerar kartor.
- `schema/` – JSON-schemat för `katalog.json`, avtalet mellan R-skriptet och webbappen.
- `webb/` – webbappen (Vite, TypeScript, OpenLayers).
- `katalog/katalog.xlsx` – katalogtabellen. Här läggs nya kartor till.
- `docs/` – design, byggplan och rapporter.

## Publicera en karta

Du behöver R (med paketen i `publicering/DESCRIPTION`), Git och gärna `gh` (GitHub CLI, inloggad).

1. **Första gången på en dator:** hämta det publicerade dataträdet, så att tidigare versioner följer med.
   ```r
   pkgload::load_all("publicering")
   repo <- "https://github.com/SLU-marten/fiskkartor"
   hamta_data(repo, "_data")
   ```
2. **Fyll i katalogen.** Lägg till eller ändra raden i `katalog/katalog.xlsx` (en rad per karta).
   `id` blir kartans permanenta adress. Filvägarna är relativa till mappen med källfilerna.
3. **Publicera.** En karta: `publicera("<id>", filrot = "C:/Github Projects/Vindkraft lst", mal = mal_lokal("_data"))`.
   Alla: `publicera_alla(filrot = "C:/Github Projects/Vindkraft lst", mal = mal_lokal("_data"))`.
   Rader med fel får status `fel` och ett meddelande som säger vad som ska rättas.
   En ändrad rasterfil ger en ny version (`v2`, `v3` …); gamla filer skrivs aldrig över.
4. **Skicka.** `skicka_data("_data", repo)`. Den vägrar om filer är för stora (100 MB per fil,
   950 MB totalt) eller om publicerade kartfiler saknas lokalt – kör då `hamta_data()` först.
5. **Kontrollera** efter någon minut på <https://slu-marten.github.io/fiskkartor/>.
   Startar inte publiceringen själv, tryck på "Run workflow" under Actions → pages.
