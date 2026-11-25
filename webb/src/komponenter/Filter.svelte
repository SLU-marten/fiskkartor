<script lang="ts">
  import { FALTNAMN, type Faltnamn } from '../lib/katalog';
  import type { Fasett, Filter } from '../lib/sok';
  import { synligaVarden } from '../lib/sok';
  import type { Sprak } from '../lib/rutt';
  import { faltEtikett, t, visaAlla } from '../lib/text';

  type Props = {
    fasetter: Record<Faltnamn, Fasett>;
    filter: Filter;
    lang: Sprak;
    onvaxla: (falt: Faltnamn, varde: string) => void;
  };
  let { fasetter, filter, lang, onvaxla }: Props = $props();
  let alla = $state<Partial<Record<Faltnamn, boolean>>>({});
</script>

{#each FALTNAMN as falt (falt)}
  {#if fasetter[falt].length || filter[falt].length}
    {@const varden = synligaVarden(fasetter[falt], filter[falt], !!alla[falt])}
    <fieldset>
      <legend>{faltEtikett(falt, lang)}</legend>
      <div class="chips">
        {#each varden as v (v.varde)}
          <button type="button" aria-pressed={filter[falt].includes(v.varde)} onclick={() => onvaxla(falt, v.varde)}>
            {v.varde} <span class="antal">({v.antal})</span>
          </button>
        {/each}
        {#each filter[falt].filter((x) => !fasetter[falt].some((v) => v.varde === x)) as x (x)}
          <button type="button" aria-pressed="true" onclick={() => onvaxla(falt, x)}>
            {x} <span class="antal">(0)</span>
          </button>
        {/each}
      </div>
      {#if fasetter[falt].length > 8}
        <button type="button" class="fler" onclick={() => (alla[falt] = !alla[falt])} aria-expanded={!!alla[falt]}>
          {alla[falt] ? t('visa_farre', lang) : visaAlla(fasetter[falt].length, lang)}
        </button>
      {/if}
    </fieldset>
  {/if}
{/each}

<style>
  fieldset {
    border: 0;
    margin: 0 0 1.1rem;
    padding: 0;
  }
  legend {
    font-weight: 700;
    margin-bottom: 0.4rem;
    padding: 0;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .chips button {
    border: 1px solid var(--linje);
    background: var(--yta);
    border-radius: 999px;
    padding: 0.2rem 0.7rem;
    cursor: pointer;
    font-size: 0.95rem;
  }
  .chips button:hover {
    border-color: var(--accent);
  }
  .chips button[aria-pressed='true'] {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
  .antal {
    opacity: 0.75;
  }
  .fler {
    margin-top: 0.4rem;
    border: 0;
    background: none;
    padding: 0;
    color: var(--accent);
    text-decoration: underline;
    cursor: pointer;
  }
</style>
