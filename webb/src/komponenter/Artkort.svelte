<script lang="ts">
  // Ett kort per art: silhuetten, namnet, det latinska namnet och en knapp per karta. Knappens text
  // är kartans namn utan artnamnet; länkens namn för skärmläsare är hela kartnamnet.
  import type { ArtGrupp } from '../lib/artgrupper';
  import { silhuettFor } from '../lib/arter';
  import type { Sprak } from '../lib/rutt';
  import { t } from '../lib/text';

  let { grupp, lank, lang }: { grupp: ArtGrupp; lank: (id: string) => string; lang: Sprak } = $props();
  const silhuett = $derived(grupp.art ? silhuettFor(grupp.art) : null);
  // Silhuetten ryms i 104 × 46 px.
  const skala = $derived(silhuett ? Math.min(104 / silhuett.w, 46 / silhuett.h) : 1);
</script>

<article class="artkort">
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
      {#each grupp.kartor as { karta, etikett } (karta.id)}
        <li data-testid="traff">
          <a class="knapp" href={lank(karta.id)}
            ><span class="visuellt-dold">{karta.titel}</span><span aria-hidden="true">{etikett ?? t('oppna_karta', lang)}</span></a
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
  path {
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
  .knapp {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0.15rem 0.75rem;
    border: 1px solid var(--kortkant);
    border-radius: 999px;
    background: var(--yta);
    color: var(--tema);
    font-size: 0.9rem;
    line-height: 1.25;
    text-decoration: none;
  }
  .knapp:hover {
    background: var(--markering);
    color: var(--text);
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
  }
  @media (forced-colors: active) {
    path {
      fill: CanvasText;
    }
    .knapp {
      border-color: LinkText;
    }
  }
</style>
