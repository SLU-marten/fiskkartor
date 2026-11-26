<script lang="ts">
  // Ett kort per art: silhuetten, namnet, det latinska namnet och en knapp per karta. Knappens text
  // är kartans namn utan artnamnet; länkens namn för skärmläsare är hela kartnamnet, som innehåller
  // knappens text. En karta utan art har knappen "Öppna kartan", och länken heter "Öppna kartan:"
  // och kartans namn.
  import type { ArtGrupp } from '../lib/artgrupper';
  import { silhuettFor } from '../lib/arter';
  import type { Sprak } from '../lib/rutt';
  import { t } from '../lib/text';

  let { grupp, lank, lang }: { grupp: ArtGrupp; lank: (id: string) => string; lang: Sprak } = $props();
  const silhuett = $derived(grupp.art ? silhuettFor(grupp.art) : null);
  // Silhuetten ryms i 104 × 46 px.
  const skala = $derived(silhuett ? Math.min(104 / silhuett.w, 46 / silhuett.h) : 1);
</script>

<article class="artkort" class:enkel={grupp.kartor.length === 1}>
  <div class="bild">
    {#if silhuett}
      <svg viewBox={`0 0 ${silhuett.w} ${silhuett.h}`} width={silhuett.w * skala} height={silhuett.h * skala} aria-hidden="true">
        <path d={silhuett.d} />
      </svg>
    {/if}
  </div>
  <div class="text">
    <h3>{grupp.namn}</h3>
    {#if grupp.latin}<p class="latin" lang="la">{grupp.latin}</p>{/if}
    <ul>
      {#each grupp.kartor as { karta, etikett, namn } (karta.id)}
        <li data-testid="traff">
          <a class="knapp" href={lank(karta.id)}
            ><svg class="ikon" viewBox="0 0 24 24" aria-hidden="true"
              ><path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20Z M9 4v13.5 M15 6.5V20" /></svg
            ><span class="visuellt-dold">{etikett ? namn : `${t('oppna_karta', lang)}: ${namn}`}</span><span aria-hidden="true"
              >{etikett ?? t('oppna_karta', lang)}</span
            ></a
          >
        </li>
      {/each}
    </ul>
  </div>
</article>

<style>
  .artkort {
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    background: var(--yta);
    border: 1px solid var(--kortkant);
    border-radius: 4px;
  }
  .bild {
    height: 52px;
    display: flex;
    align-items: center;
  }
  .bild path {
    fill: var(--tema);
  }
  h3 {
    margin: 0;
    font-size: 1.2rem;
  }
  .latin {
    margin: 0.1rem 0 0;
    font-size: 0.9rem;
    font-style: italic;
    color: var(--dampad);
  }
  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0.65rem 0 0;
    padding: 0;
    list-style: none;
  }
  .artkort {
    position: relative;
  }
  /* Kartlänkarna ska inte se ut som filterknapparna (piller med kant): rundade hörn, tonad yta och
     en liten kartikon. */
  .knapp {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    min-height: 34px;
    padding: 0.2rem 0.7rem 0.2rem 0.55rem;
    border-radius: 4px;
    background: var(--sida);
    color: var(--tema);
    font-size: 0.9rem;
    line-height: 1.25;
    text-decoration: none;
  }
  .knapp:hover {
    background: var(--tema);
    color: #ffffff;
  }
  .ikon {
    flex: none;
    width: 16px;
    height: 16px;
  }
  .ikon path {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linejoin: round;
  }
  /* Ett kort med en enda karta är klickbart i sin helhet. */
  .enkel .knapp::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 4px;
  }
  .enkel {
    cursor: pointer;
  }
  .enkel:hover {
    border-color: var(--tema);
  }
  /* Mobil: silhuetten till vänster om texten. */
  @media (max-width: 40rem) {
    .artkort {
      flex-direction: row;
      align-items: flex-start;
      gap: 0.9rem;
    }
    .bild {
      flex: none;
      width: 76px;
      justify-content: center;
    }
    .bild svg {
      max-width: 76px;
      height: auto;
    }
    .text {
      min-width: 0;
    }
    .knapp {
      min-height: 44px;
    }
  }
  @media (forced-colors: active) {
    .bild path {
      fill: CanvasText;
    }
    .knapp {
      border-color: LinkText;
    }
  }
</style>
