# WCAG-granskning av Fiskkartor

**Datum:** 25 november 2026. **Nivå:** WCAG 2.1 AA, som krävs av lagen (2018:1937) om tillgänglighet till
digital offentlig service. **Vem:** egen granskning, gjord av Claude med Playwright. Skärmläsartestet återstår, och
Mårten gör det.

Granskningen sammanfattas i tillgänglighetsredogörelsen på `#/tillganglighet`. Den uppdateras när något i tabellen
ändras.

## Så gick granskningen till

- **Automatiskt:** axe (`@axe-core/playwright`, reglerna `wcag2a`, `wcag2aa`, `wcag21a` och `wcag21aa`) körs i
  `webb/tests/tillganglighet.spec.ts`. Det sker vid 1280 × 720 för sju vyer och vid 375 × 812 för fem vyer, däribland
  kartvyn med Lagerval öppen, mobilpanelen nere och uppe och mobilmenyn öppen. Resultatet är 0 överträdelser.
  Kontrollen själv provades mot en sida med kända fel (bild utan alt-text och grå text), och den hittade båda.
- **Manuellt, med automatiska tester där det går:** tangentbord, omflödning, zoom, textavstånd, sidtitlar, språk,
  statusmeddelanden, landmärken och rubriker, och kontrasten för färgparen i `webb/tests/farger.test.ts`.
  Testerna ligger i `tillganglighet.spec.ts` och `app.spec.ts`. Landmärken och rubriker kontrollerades med
  `ariaSnapshot()` för startsidan och kartvyn.

## Resultat

| Kriterium | Vad som kontrollerades | Hur | Resultat | Åtgärd |
|---|---|---|---|---|
| 1.1.1 Icke-textuellt innehåll | Logotypen, ikoner och kartbilden | axe och genomläsning | Logotypen har alt-text. Ikonerna är `aria-hidden` bredvid synlig text. Kartbilden har ingen textversion. | Kartor som inte är avsedda för navigering är undantagna (9 § 2 p.). Innehållet finns i filerna och metadatan. |
| 1.3.1 Information och relationer | Landmärken, rubriker, formulär och listor | `ariaSnapshot()` och axe | Panelen var ett `complementary` med sidans `h1` inuti. | Rättat: panelen är en `region` med kartans namn. Teckenförklaringen har ingen rubrik före `h1`. |
| 1.4.3 Kontrast (text) | Alla färgpar för text | `farger.test.ts` och axe | Alla klarar minst 4,5:1. | – |
| 1.4.4 Ändra textstorlek | 200 % zoom (640 × 360) | test `zoom 200 %` | Lagerval och greppet går att nå. | – |
| 1.4.10 Omflödning | 320 px bredd: start, Om, tillgänglighet, kartvy | test `omflödning vid 320 px` | Ingen vågrät rullning. | – |
| 1.4.11 Kontrast för icke-text | Kanter på fält och reglage, fokusram | `farger.test.ts` | Kanter 3,4:1 och fokusram 7:1 mot vitt. Över kartan ligger ramen mellan två vita ringar. | – |
| 1.4.12 Textavstånd | Utökade avstånd i kartvyn | test `textavstånd` | Inget klipps i panelen eller i knapparna. | – |
| 2.1.1 Tangentbord | Hela flödet: sök, förslag, träff, karta, Lagerval, lagerbyte och nedladdning | test `tangentbord: hela flödet` och `kartan går att flytta och zooma med tangentbordet` | Allt nås. Kartan gick först inte att flytta med tangentbordet. | Rättat: kartan har ett tabbstopp (en ram runt kartan), och piltangenter och plus och minus flyttar och zoomar. Värdet under pekaren kräver fortfarande mus eller tryck, och det står i redogörelsen. |
| 2.4.1 Hoppa förbi block | Hopplänk | test `hopplänken går förbi sidhuvudet` | Fungerar. | – |
| 2.4.2 Sidan har titel | Titel per vy | test `varje vy har en egen titel` | Fungerar. | – |
| 2.4.3 Fokusordning | Ordning i sidhuvud, karta och panel | tangentbordstestet | Logisk. | – |
| 2.4.6 Rubriker och etiketter | Namn på knappar och landmärken | `ariaSnapshot()` | Zoomknapparna hette "+" och "–", och sidhuvudets meny saknade namn. | Rättat: "Zooma in" och "Zooma ut" (Zoom in och Zoom out på engelska), och menyn heter "Huvudmeny". |
| 2.4.7 Synligt fokus | Fokusram i varje steg, även på dolda radioknappar | tangentbordstestet | Fokus syns i alla steg. För radioknapparna i Lagerval visas ramen på etiketten. | – |
| 3.1.1 och 3.1.2 Språk | `lang` på sidan, citeringen och latinska namn | test och genomläsning | Sidan följer språkvalet, citeringen har kartans språk och vetenskapliga namn har `lang="la"`. | – |
| 3.2.3 Konsekvent navigering | Sidhuvud och sidfot | genomläsning | Samma på alla sidor. Kartvyn har ingen sidfot. | – |
| 4.1.2 Namn, roll och värde | Lagerval, menyknappen, greppet och reglaget | tester och axe | `aria-expanded` följer läget, och reglaget har värdet i procent som text. | – |
| 4.1.3 Statusmeddelanden | Kopierad, Sparar bilden, Laddar kartan och fel | genomläsning | `role="status"`, `aria-live` och `role="alert"` finns. | – |
| Skärmläsare | VoiceOver eller NVDA på en karta | – | Inte gjort ännu (Mårten). | – |

## Kvar att göra

- Skärmläsartest på en riktig karta, på dator och mobil.
- När den riktiga logotypen finns på plats: ta bort `test.fixme` för logotypen i `app.spec.ts`.
