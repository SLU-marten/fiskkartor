<script lang="ts">
  // Tillgänglighetsredogörelse enligt lagen (2018:1937) om tillgänglighet till digital offentlig
  // service och DIGG:s krav på innehåll. Listan över brister och datumen hålls aktuella efter varje
  // granskning (se docs/wcag-granskning.md).
  import type { Sprak } from '../lib/rutt';

  let { lang }: { lang: Sprak } = $props();
  const KONTAKT = 'SLU-Aqua-fiskkartor@slu.se';
  const DIGG = 'https://www.digg.se/tdosanmalan';
  const BEDOMD = '2026-11-25';
  const UPPDATERAD = '2026-11-25';
</script>

<article class="sida">
  {#if lang === 'en'}
    <h1>Accessibility of Fish maps</h1>
    <p class="lopande">
      The Swedish University of Agricultural Sciences (SLU) is responsible for this website. We want as many people as
      possible to be able to use it. This statement describes how Fish maps meets the Swedish Act on accessibility to
      digital public services, the known accessibility problems and how you can report problems to us so that we can
      fix them.
    </p>
    <h2>How accessible is the website?</h2>
    <p class="lopande">The website is partially compliant with the Act, because of the problems described below.</p>
    <h2>What can you do if you cannot use parts of the website?</h2>
    <p class="lopande">
      If you need content from the website in another form, contact us at
      <a href={`mailto:${KONTAKT}`}>{KONTAKT}</a> and we will help you.
    </p>
    <h2>Report problems with the accessibility of the website</h2>
    <p class="lopande">
      We always try to improve the accessibility of the website. If you find problems that are not described on this
      page, or if you think we do not meet the requirements of the Act, write to
      <a href={`mailto:${KONTAKT}`}>{KONTAKT}</a> so that we know about the problem.
    </p>
    <h2>Contact the supervisory authority</h2>
    <p class="lopande">
      The Agency for Digital Government (Digg) is responsible for supervision of the Act. If you are not satisfied with
      how we handle your comments, you can <a href={DIGG}>contact Digg and report it</a>.
    </p>
    <h2>Technical information about the accessibility of the website</h2>
    <p class="lopande">
      The website is partially compliant with the Act, because of the problems described below. The requirements are
      those of the European standard EN 301 549, which refers to WCAG 2.1 level AA.
    </p>
    <h3>Content that is not accessible</h3>
    <ul class="lopande">
      <li>
        The map images cannot be read with a screen reader. Maps that are not intended for navigation are exempt from
        the Act (section 9, point 2). The content of each map is available in other ways: the map files can be
        downloaded, and the metadata can be read on the map's page and downloaded as text.
      </li>
      <li>
        The value under the pointer needs a mouse or a tap on the map. It cannot be reached with the keyboard. The same
        values are in the downloadable map files.
      </li>
    </ul>
    <h2>How we tested the website</h2>
    <p class="lopande">
      We have reviewed the website ourselves, with automated tests and a manual review against WCAG 2.1 AA. The latest
      assessment was made on {BEDOMD}.
    </p>
    <p class="lopande">This statement was last updated on {UPPDATERAD}.</p>
  {:else}
    <h1>Tillgänglighet för Fiskkartor</h1>
    <p class="lopande">
      Sveriges lantbruksuniversitet (SLU) står bakom den här webbplatsen. Vi vill att så många som möjligt ska kunna
      använda den. Det här dokumentet beskriver hur Fiskkartor uppfyller lagen om tillgänglighet till digital
      offentlig service, eventuella kända tillgänglighetsproblem och hur du kan rapportera brister till oss så att vi
      kan åtgärda dem.
    </p>
    <h2>Hur tillgänglig är webbplatsen?</h2>
    <p class="lopande">Webbplatsen är delvis förenlig med lagen, på grund av de brister som beskrivs nedan.</p>
    <h2>Vad kan du göra om du inte kan använda delar av webbplatsen?</h2>
    <p class="lopande">
      Om du behöver innehåll från webbplatsen i en annan form kan du kontakta oss på
      <a href={`mailto:${KONTAKT}`}>{KONTAKT}</a>, så hjälper vi dig.
    </p>
    <h2>Rapportera brister i webbplatsens tillgänglighet</h2>
    <p class="lopande">
      Vi strävar hela tiden efter att förbättra webbplatsens tillgänglighet. Om du upptäcker problem som inte beskrivs
      på den här sidan, eller om du anser att vi inte uppfyller lagens krav, skriv till
      <a href={`mailto:${KONTAKT}`}>{KONTAKT}</a> så att vi får kännedom om problemet.
    </p>
    <h2>Kontakta tillsynsmyndigheten</h2>
    <p class="lopande">
      Myndigheten för digital förvaltning (Digg) har ansvaret för tillsyn över lagen om tillgänglighet till digital
      offentlig service. Om du inte är nöjd med hur vi hanterar dina synpunkter kan du
      <a href={DIGG}>kontakta Digg och påtala det</a>.
    </p>
    <h2>Teknisk information om webbplatsens tillgänglighet</h2>
    <p class="lopande">
      Webbplatsen är delvis förenlig med lagen om tillgänglighet till digital offentlig service, på grund av de brister
      som beskrivs nedan. Kraven är den europeiska standarden EN 301 549, som hänvisar till WCAG 2.1 på nivå AA.
    </p>
    <h3>Innehåll som inte är tillgängligt</h3>
    <ul class="lopande">
      <li>
        Kartbilderna kan inte läsas med skärmläsare. Kartor som inte är avsedda för navigering omfattas inte av lagen
        (9 § 2 p. lagen 2018:1937). Varje kartas innehåll går att nå på andra sätt: kartfilerna kan laddas ned, och
        metadatan kan läsas på kartans sida och laddas ned som text.
      </li>
      <li>
        Värdet under pekaren kräver mus eller ett tryck på kartan. Det går inte att nå med tangentbordet. Samma värden
        finns i kartfilerna som kan laddas ned.
      </li>
    </ul>
    <h2>Hur vi testat webbplatsen</h2>
    <p class="lopande">
      Vi har gjort en egen granskning av webbplatsen, med automatiska tester och en manuell granskning mot WCAG 2.1
      AA. Den senaste bedömningen gjordes den {BEDOMD}.
    </p>
    <p class="lopande">Redogörelsen uppdaterades senast den {UPPDATERAD}.</p>
  {/if}
</article>

<style>
  .sida {
    max-width: 42rem;
    padding: 2rem 1.5rem 1rem;
  }
  h1 {
    font-size: clamp(1.75rem, 4vw, 2.25rem);
  }
  h2 {
    font-size: 1.25rem;
    margin-top: 1.75rem;
  }
  h3 {
    font-size: 1.1rem;
    margin-top: 1.25rem;
  }
</style>
