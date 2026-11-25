<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import 'ol/ol.css';
  import { skapaKarta, type Bakgrund, type KartFil, type Kartan, NODATA } from '../karta/karta';
  import type { Klass, Roll } from '../lib/katalog';
  import type { Sprak } from '../lib/rutt';
  import { t } from '../lib/text';

  type Props = {
    kf: KartFil;
    roll: Roll;
    klasser: Klass[];
    opacitet: number;
    bakgrund: Bakgrund;
    cartoNyckel: string;
    dataUrl: string;
    lang: Sprak;
  };
  let { kf, roll, klasser, opacitet, bakgrund, cartoNyckel, dataUrl, lang }: Props = $props();

  let mal: HTMLDivElement;
  let kartan = $state<Kartan | null>(null);
  let laddar = $state(true);
  let fel = $state(false);
  let varde = $state('');
  let visad = '';

  function text(data: ArrayLike<number> | null): string {
    if (!data || data.length === 0) return '—';
    const v = data[0];
    const alfa = data.length > 1 ? data[data.length - 1] : 1;
    if (alfa === 0 || v === NODATA[roll]) return '—';
    if (roll === 'klassad') return klasser.find((k) => k.varde === v)?.namn ?? '—';
    return (v / 1000).toFixed(2);
  }

  onMount(() => {
    kartan = skapaKarta(mal, { bakgrund, cartoNyckel, dataUrl });
    kartan.karta.on('rendercomplete', () => {
      if (kartan?.lager()?.getSource()?.getState() === 'ready') laddar = false;
    });
    kartan.karta.on('pointermove', (e) => {
      const data = kartan?.lager()?.getData(e.pixel) as ArrayLike<number> | null;
      varde = text(data);
    });
    mal.addEventListener('pointerleave', () => (varde = ''));
  });
  onDestroy(() => kartan?.karta.setTarget(undefined));

  $effect(() => {
    if (!kartan) return;
    const nyckel = `${kf.fil}|${roll}|${JSON.stringify(klasser)}`;
    if (nyckel === visad) return;
    const forsta = visad === '';
    visad = nyckel;
    fel = false;
    const lager = kartan.visa(kf, roll, klasser);
    lager.getSource()?.on('change', () => {
      if (lager.getSource()?.getState() === 'error') fel = true;
    });
    if (forsta) kartan.passa().catch(() => (fel = true));
  });
  $effect(() => kartan?.setOpacitet(opacitet));
  $effect(() => kartan?.setBakgrund(bakgrund));
</script>

<div class="karta" bind:this={mal}>
  {#if fel}
    <p class="status" role="alert">{t('kartfil_fel', lang)}</p>
  {:else if laddar}
    <p class="status" aria-live="polite">{t('laddar_karta', lang)}</p>
  {/if}
  <output class="varde" aria-label={t('varde_under_pekaren', lang)} data-testid="varde" hidden={!varde}>{varde}</output>
</div>

<style>
  .karta {
    position: relative;
    width: 100%;
    height: 100%;
    background: #eef2f3;
  }
  .status {
    position: absolute;
    z-index: 2;
    top: 0.75rem;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    padding: 0.35rem 0.8rem;
    background: var(--yta);
    border: 1px solid var(--linje);
    border-radius: 4px;
  }
  .status[role='alert'] {
    background: var(--notis);
    border-color: var(--notis-kant);
  }
  .varde {
    position: absolute;
    z-index: 2;
    left: 0.75rem;
    bottom: 2.6rem;
    padding: 0.3rem 0.65rem;
    background: rgb(23 48 59 / 88%);
    color: #fff;
    border-radius: 4px;
    font-weight: 700;
    pointer-events: none;
  }
</style>
