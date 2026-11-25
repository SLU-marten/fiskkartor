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

Instruktionen skrivs i fas 1 (kontrollpunkt 1).
