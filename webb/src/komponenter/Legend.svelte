<script lang="ts">
  import { KONTINUERLIGA_STEG, legendfarger } from '../karta/stil';
  import type { Version, Roll } from '../lib/katalog';
  import type { Sprak } from '../lib/rutt';
  import { t } from '../lib/text';

  let { version, roll, lang }: { version: Version; roll: Roll; lang: Sprak } = $props();
  const enhet = $derived(
    !version.kontinuerlig || version.kontinuerlig.enhet === 'sannolikhet' ? t('sannolikhet', lang) : version.kontinuerlig.enhet,
  );
</script>

<!-- Teckenförklaringen ligger i kartan, före panelens h1 i dokumentordningen. Därför ingen rubrik,
     utan en etikett som namnger regionen. -->
<section class="legend" data-testid="legend" aria-labelledby="legend-rubrik">
  <p class="rubrik" id="legend-rubrik">{t('legend', lang)}</p>
  {#if roll === 'klassad'}
    <ul>
      {#each legendfarger(version.klassad.klasser) as { klass, rgb } (klass.varde)}
        <li><span class="ruta" style:background={rgb}></span>{klass.namn}</li>
      {/each}
    </ul>
  {:else}
    <p class="enhet">{enhet}</p>
    <div class="skala" style:background={`linear-gradient(to right, ${KONTINUERLIGA_STEG.join(', ')})`}></div>
    <div class="steg"><span>0</span><span>0,5</span><span>1</span></div>
  {/if}
</section>

<style>
  .legend {
    position: absolute;
    right: 0.75rem;
    bottom: 2.25rem;
    z-index: 3;
    min-width: 9rem;
    padding: 0.55rem 0.8rem 0.4rem;
    background: var(--yta);
    border: 1px solid var(--linje);
    border-radius: 6px;
    font-size: 0.95rem;
  }
  .rubrik {
    margin: 0 0 0.3rem;
    font-size: 0.9rem;
    color: var(--dampad);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }
  .ruta {
    width: 1.1rem;
    height: 1.1rem;
    border-radius: 2px;
    border: 1px solid rgb(0 0 0 / 15%);
  }
  .enhet {
    margin: 0 0 0.3rem;
  }
  .skala {
    height: 0.8rem;
    border-radius: 2px;
  }
  .steg {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
  }
</style>
