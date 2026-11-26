# WCAG-granskning av Fiskkartor

**Datum:** 25 november 2026, uppdaterad 26 november 2026 efter fas 4 (havslooken). **Nivå:** WCAG 2.1 AA, som krävs av lagen (2018:1937) om tillgänglighet till
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
| 1.4.4 Ändra textstorlek | 200 % zoom (640 × 360) | test `zoom 200 %` och testerna för liggande läge | Lagerval och greppet går att nå. Slutgranskningen fann att Lagerval-rutan gick utanför fönstret och att skalstocken låg över zoomknapparna. | Rättat: rutan skrollar inuti sig själv, och skalstocken döljs när kartan är låg. |
| 1.4.10 Omflödning | 320 px bredd: start, Om, tillgänglighet, kartvy. Liggande telefoner: 844 × 390, 844 × 340, 667 × 375, 568 × 320 och 640 × 360, med och utan notis | test `omflödning vid 320 px` och `mobil liggande …` | Ingen vågrät rullning. Slutgranskningen fann att kartan krympte till 0 px på låga skärmar med en notis. | Rättat: kartan får alltid minst min(8rem, 35 % av höjden), och fliken skrollar i stället. |
| 1.4.11 Kontrast för icke-text | Kanter på fält och reglage, fokusram | `farger.test.ts` | Kanter 3,4:1 och fokusram 7:1 mot vitt. Över kartan ligger ramen mellan två vita ringar. | – |
| 1.4.12 Textavstånd | Utökade avstånd i kartvyn | test `textavstånd` | Inget klipps i panelen eller i knapparna. | – |
| 2.1.1 Tangentbord | Hela flödet: sök, förslag, träff, karta, Lagerval, lagerbyte och nedladdning | test `tangentbord: hela flödet` och `kartan går att flytta och zooma med tangentbordet` | Allt nås. Kartan gick först inte att flytta med tangentbordet. | Rättat: kartan har ett tabbstopp (en ram runt kartan), och piltangenter och plus och minus flyttar och zoomar. Värdet under pekaren kräver fortfarande mus eller tryck, och det står i redogörelsen. |
| 2.4.1 Hoppa förbi block | Hopplänk | test `hopplänken går förbi sidhuvudet` | Fungerar. | – |
| 2.4.2 Sidan har titel | Titel per vy | test `varje vy har en egen titel` | Fungerar. | – |
| 2.4.3 Fokusordning | Ordning i sidhuvud, karta och panel | tangentbordstestet | Logisk. | – |
| 2.4.6 Rubriker och etiketter | Namn på knappar och landmärken | `ariaSnapshot()` | Zoomknapparna hette "+" och "–", och sidhuvudets meny saknade namn. | Rättat: "Zooma in" och "Zooma ut" (Zoom in och Zoom out på engelska), och menyn heter "Huvudmeny". |
| 2.4.7 Synligt fokus | Fokusram i varje steg, även på dolda radioknappar | tangentbordstestet och `zoomknapparna har profilens fokusram` | Fokus syns i alla steg. För radioknapparna i Lagerval visas ramen på etiketten. Slutgranskningen fann att zoomknapparna hade OpenLayers grå ram på 1 px. | Rättat: samma gröna ram med vita ringar som övriga kontroller. |
| 2.4.3 Fokusordning (dolt innehåll) | Fokus när Lagerval eller mobilmenyn är öppen | test `fokus som lämnar …` | Slutgranskningen fann att Tab kunde leda till kontroller under den öppna rutan. | Rättat: rutan och menyn stängs när fokus lämnar dem. |
| 1.4.1 Användning av färg (tvingade färger) | Valt alternativ i Lagerval i Windows hög kontrast | test `tvingade färger …` | Slutgranskningen fann att det valda alternativet bara visades med bakgrundsfärg. | Rättat: systemets markeringsfärger i tvingat färgläge. |
| 3.1.1 och 3.1.2 Språk | `lang` på sidan, citeringen och latinska namn | test och genomläsning | Sidan följer språkvalet, citeringen har kartans språk och vetenskapliga namn har `lang="la"`. | – |
| 3.2.3 Konsekvent navigering | Sidhuvud och sidfot | genomläsning | Samma på alla sidor. Kartvyn har ingen sidfot. | – |
| 4.1.2 Namn, roll och värde | Lagerval, menyknappen, greppet och reglaget | tester och axe | `aria-expanded` följer läget, och reglaget har värdet i procent som text. | – |
| 4.1.3 Statusmeddelanden | Kopierad, Sparar bilden, Laddar kartan och fel | genomläsning | `role="status"`, `aria-live` och `role="alert"` finns. | – |
| Skärmläsare | VoiceOver eller NVDA på en karta | – | Inte gjort ännu (Mårten). | – |

## Fas 4: havslooken

Fas 4 gav appen SLU:s havsfärger, fisksiluetter, en meny som glider in på telefon och en ny startsida med artkort.
Axe och hela testsviten kördes igen, med 0 överträdelser. Det här kontrollerades särskilt:

| Kriterium | Vad som kontrollerades | Hur | Resultat |
|---|---|---|---|
| 1.1.1 Icke-textuellt innehåll | Fiskmönstret i sidhuvudet och menyn, silhuetterna i artkort och listor, kartikonen i kortens länkar | genomläsning och axe | Allt är dekor: mönstret är en bakgrundsbild och silhuetterna och ikonerna är `aria-hidden`. Artens namn står alltid som text bredvid. |
| 1.4.3 Kontrast (text) | Vit text på Havsvik (sidhuvud, knappar, valda filter), Havsvik på sidans bakgrund, vit text på Havsdjup (sidfot, menyknapp) | `farger.test.ts` och axe | Vitt på Havsvik 5,37:1, och minst 4,69:1 där en fisk ligger bakom texten (fiskarna är vita med 7,5 % täckning). Havsvik på sidans bakgrund 4,84:1. Vitt på Havsdjup 10,3:1. |
| 1.4.11 Kontrast för icke-text | Kanter på filterknapparna och sökfältet | `farger.test.ts` | Kanterna är 3,4:1 mot vitt. Kortens kanter är dekor och avgränsar inget reglage. |
| 1.4.10 Omflödning | Startsidans rutnät och filterkort vid 320 px | test `omflödning vid 320 px` | Ingen vågrät rullning. Långa filtervärden radbryts inuti knappen. |
| 2.1.1 Tangentbord, 2.4.3 Fokusordning | Menyn på telefon | tester i `app.spec.ts` | Fokus flyttas till Stäng menyn när menyn öppnas. Escape och Stäng menyn stänger den och lämnar fokus på Meny, och menyn stängs när fokus lämnar den. Stängd är menyn `visibility: hidden` och går inte att tabba till. |
| 2.4.7 Synligt fokus | Fokusramen i sidhuvudet, menyn och sidfoten | genomläsning och tester | På Havsvik och Havsdjup är ramen vit. |
| 2.5.5 Målstorlek (AAA, frivilligt) | Kartlänkar, filterknappar och sökknappen på telefon | test `mobil: kartlänkar och filterknappar är minst 44 px höga` | Minst 44 px höga. |
| 4.1.2 Namn, roll och värde | Kartlänkarna i artkorten och sökknappen | tester | Länken heter hela kartans namn, även när kortet visar en kortare etikett. Sökknappen heter Sök också när den bara visar förstoringsglaset. |

## Slutgranskning

En fristående granskare läste hela grenen efter de sju uppgifterna. Utöver raderna ovan rättades att ett tryck
på greppet efter ett svep med fingret inte gjorde något, att teckenförklaringen täckte värdet under pekaren på smala
datorskärmar (961–1070 px) och att redogörelsen blandade ihop brister med innehåll som inte omfattas av lagen. Varje
rättelse har ett test som först föll.

## Kvar att göra

- Skärmläsartest på en riktig karta, på dator och mobil.
