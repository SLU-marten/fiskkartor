<script lang="ts">
  import type { Sprak } from '../lib/rutt';

  let { lang }: { lang: Sprak } = $props();
  const KONTAKT = 'SLU-Aqua-fiskkartor@slu.se';
</script>

<article class="om">
  {#if lang === 'en'}
    <h1>About Fish maps</h1>
    <p>
      Fish maps collects SLU Aqua's maps of important areas for fish in Swedish seas and coastal waters, from projects
      such as the Swedish national marine mapping (NMK) and PanBalticScope. You can search the maps, view them, read how
      they were made and download the original files.
    </p>
    <h2>Classified and continuous maps</h2>
    <p>
      The classified map shows areas as important or very important. Where a map has one, the continuous map shows the
      model's probability from 0 to 1. When you zoom out, each cell shows the highest class within it, so that small
      important areas do not disappear. The value under the pointer is then marked with ≈ until you zoom in.
    </p>
    <h2>How to cite</h2>
    <p>
      Use the citation on the map's page. It names the map's version and has a link that always shows that version.
      A map is never changed after publication: new data gives a new version, and older versions stay available.
    </p>
    <h2>Licence</h2>
    <p>The maps may be used under CC BY 4.0 (preliminary): state the source. The licence will be confirmed later.</p>
    <p>Background map © OpenStreetMap contributors, © CARTO.</p>
    <h2>Contact</h2>
    <p>Questions and comments: <a href={`mailto:${KONTAKT}`}>{KONTAKT}</a></p>
  {:else}
    <h1>Om Fiskkartor</h1>
    <p>
      Fiskkartor samlar SLU Aquas kartor över viktiga områden för fisk i svenska hav och kustvatten, från projekt som
      Nationell marin kartering (NMK) och PanBalticScope. Här kan du söka bland kartorna, titta på dem, läsa hur de är
      gjorda och ladda ned originalfilerna.
    </p>
    <h2>Klassad och kontinuerlig karta</h2>
    <p>
      Den klassade kartan visar områden som viktiga eller mycket viktiga. Där den finns visar den kontinuerliga kartan
      modellens sannolikhet från 0 till 1. När du zoomar ut visar varje ruta den högsta klassen inom sig, så att små
      viktiga områden inte försvinner. Värdet under pekaren markeras då med ≈ tills du zoomar in.
    </p>
    <h2>Så citerar du en karta</h2>
    <p>
      Använd citeringen på kartans sida. Den anger kartans version och har en länk som alltid visar just den versionen.
      En karta ändras aldrig efter publicering: nya data ger en ny version, och äldre versioner finns kvar.
    </p>
    <h2>Licens</h2>
    <p>Kartorna får användas enligt CC BY 4.0 (preliminärt): ange källan. Licensen bekräftas senare.</p>
    <p>Bakgrundskarta © OpenStreetMap-bidragsgivare, © CARTO.</p>
    <h2>Kontakt</h2>
    <p>Frågor och synpunkter: <a href={`mailto:${KONTAKT}`}>{KONTAKT}</a></p>
  {/if}
</article>

<style>
  .om {
    max-width: 40rem;
    padding: 2rem 1.25rem 3rem;
  }
  h1 {
    font-size: clamp(1.75rem, 4vw, 2.25rem);
  }
  h2 {
    font-size: 1.2rem;
    margin-top: 1.75rem;
  }
</style>
