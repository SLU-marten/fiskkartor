<script lang="ts">
  import { FALTNAMN, type Faltnamn } from '../lib/katalog';
  import type { Fasett, Filter } from '../lib/sok';
  import { lika, synligaVarden } from '../lib/sok';
  import type { Sprak } from '../lib/rutt';
  import { faltEtikett, t, visaAlla } from '../lib/text';

  type Props = {
    fasetter: Record<Faltnamn, Fasett>;
    filter: Filter;
    lang: Sprak;
    onvaxla: (falt: Faltnamn, varde: string) => void;
    /** Fält som inte visas, om de inte har valda värden. */
    dolda?: Faltnamn[];
    /** Fält under en hopfälld "Fler filter", som är öppen när något av dem har valda värden. */
    fler?: Faltnamn[];
  };
  let { fasetter, filter, lang, onvaxla, dolda = [], fler = [] }: Props = $props();
  const visas = (falt: Faltnamn) => (fasetter[falt].length > 0 && !dolda.includes(falt)) || filter[falt].length > 0;
  const forsta = $derived(FALTNAMN.filter((f) => !fler.includes(f) && visas(f)));
  const ovriga = $derived(FALTNAMN.filter((f) => fler.includes(f) && visas(f)));
  const flerValda = $derived(ovriga.some((f) => filter[f].length > 0));
  // "Fler filter" öppnas när något av fälten har valda värden, men fälls aldrig ihop av sig själv:
  // den som väljer bort det sista värdet ska inte tappa sin plats.
  let flerOppen = $state(false);
  $effect.pre(() => {
    if (flerValda) flerOppen = true;
  });
  let alla = $state<Partial<Record<Faltnamn, boolean>>>({});
</script>

{#snippet grupp(falt: Faltnamn)}
  {@const varden = synligaVarden(fasetter[falt], filter[falt], !!alla[falt])}
  <fieldset>
    <legend>{faltEtikett(falt, lang)}</legend>
    <div class="chips">
      {#each varden as v (v.varde)}
        <button type="button" aria-pressed={filter[falt].some((x) => lika(x, v.varde))} onclick={() => onvaxla(falt, v.varde)}>
          {v.varde}&nbsp;<span class="antal">({v.antal})</span>
        </button>
      {/each}
      {#each filter[falt].filter((x) => !fasetter[falt].some((v) => lika(v.varde, x))) as x (x)}
        <button type="button" aria-pressed="true" onclick={() => onvaxla(falt, x)}>
          {x}&nbsp;<span class="antal">(0)</span>
        </button>
      {/each}
    </div>
    {#if fasetter[falt].length > 8}
      <button type="button" class="fler" onclick={() => (alla[falt] = !alla[falt])} aria-expanded={!!alla[falt]}>
        {alla[falt] ? t('visa_farre', lang) : visaAlla(fasetter[falt].length, lang)}
      </button>
    {/if}
  </fieldset>
{/snippet}

{#each forsta as falt (falt)}
  {@render grupp(falt)}
{/each}
{#if ovriga.length}
  <details class="fler-filter" bind:open={flerOppen}>
    <summary>{t('fler_filter', lang)}</summary>
    {#each ovriga as falt (falt)}
      {@render grupp(falt)}
    {/each}
  </details>
{/if}

<style>
  fieldset {
    border: 0;
    margin: 0 0 1.1rem;
    padding: 0;
  }
  legend {
    font-weight: 500;
    margin-bottom: 0.4rem;
    padding: 0;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  /* Ett långt värde radbryts vänsterställt; rundningen är en halv rad, så att en kort knapp blir
     en pille och en lång en rundad ruta. */
  .chips button {
    border: 1px solid var(--kant);
    background: var(--yta);
    border-radius: 1.1rem;
    min-height: 32px;
    padding: 0.2rem 0.75rem;
    cursor: pointer;
    font-size: 0.95rem;
    text-align: left;
  }
  .chips button:hover {
    border-color: var(--tema);
  }
  .chips button[aria-pressed='true'] {
    background: var(--tema);
    border-color: var(--tema);
    color: var(--yta);
  }
  .fler-filter summary {
    margin: 0.25rem 0 0.9rem;
    color: var(--tema);
    cursor: pointer;
  }
  @media (max-width: 40rem) {
    .chips button {
      min-height: 44px;
    }
  }
  .antal {
    opacity: 0.75;
    white-space: nowrap;
  }
  /* Vitt med 75 % täckning på Havsvik är bara 3,7:1; på ett valt värde är antalet helt vitt. */
  .chips button[aria-pressed='true'] .antal {
    opacity: 1;
  }
  .fler {
    margin-top: 0.4rem;
    border: 0;
    background: none;
    padding: 0;
    color: var(--tema);
    text-decoration: underline;
    cursor: pointer;
  }
</style>
