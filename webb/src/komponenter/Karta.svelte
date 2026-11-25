<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import 'ol/ol.css';
  import Pekarvarde from './Pekarvarde.svelte';
  import { skapaKarta, type Bakgrund, type KartFil, type Kartan } from '../karta/karta';
  import type { Klass, Roll } from '../lib/katalog';
  import { kartlage } from '../lib/permalank';
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
    /** Vyn från en permanent länk. Saknas den anpassas vyn efter kartan. Läses bara första gången. */
    start?: { x: number; y: number; upp: number };
    onflytt?: (lage: { x: number; y: number; upp: number }) => void;
    onklar?: (kartan: Kartan) => void;
  };
  let { kf, roll, klasser, opacitet, bakgrund, cartoNyckel, dataUrl, lang, start, onflytt, onklar }: Props = $props();

  let mal: HTMLDivElement;
  let kartan = $state<Kartan | null>(null);
  let laddar = $state(true);
  let fel = $state(false);
  let visad = '';

  onMount(() => {
    kartan = skapaKarta(mal, { bakgrund, cartoNyckel, dataUrl });
    onklar?.(kartan);
    kartan.karta.on('moveend', () => {
      if (kartan) onflytt?.(kartlage(kartan.karta));
    });
    kartan.karta.on('rendercomplete', () => {
      if (kartan?.lager()?.getSource()?.getState() === 'ready') laddar = false;
    });
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
    if (forsta && start) {
      kartan.karta.getView().setCenter([start.x, start.y]);
      kartan.karta.getView().setResolution(start.upp);
    } else if (forsta) {
      kartan.passa().catch(() => (fel = true));
    }
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
  {#if kartan}
    <Pekarvarde {kartan} {kf} {roll} {klasser} {dataUrl} {lang} />
  {/if}
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
</style>
