<script lang="ts">
  // Värdet under pekaren med koordinater. Nära full upplösning hämtas det exakta värdet när pekaren
  // stannat 250 ms; varje rörelse avbryter förra hämtningen, så ett gammalt svar visas aldrig.
  // Värdet räknas om när kartan flyttas eller zoomas under en stilla pekare, och när rutor börjar
  // eller slutar laddas: medan rutor laddas kan getData ge en grövre ersättningsruta.
  import { onDestroy } from 'svelte';
  import type MapBrowserEvent from 'ol/MapBrowserEvent.js';
  import { NODATA, VY, type KartFil, type Kartan } from '../karta/karta';
  import type { Klass, Roll } from '../lib/katalog';
  import type { Sprak } from '../lib/rutt';
  import { t } from '../lib/text';
  import { exaktVarde, formatera, koordinater, vardeLage } from '../lib/varde';

  type Props = {
    kartan: Kartan;
    kf: KartFil;
    roll: Roll;
    klasser: Klass[];
    /** Originalets cellstorlek i meter (katalogens upplosning). */
    upplosning: number;
    dataUrl: string;
    lang: Sprak;
  };
  let { kartan, kf, roll, klasser, upplosning, dataUrl, lang }: Props = $props();

  let text = $state('');
  let tips = $state(false);
  let koord = $state<{ sweref: string; wgs84: string } | null>(null);
  let pagaende: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pixel: [number, number] | null = null;
  let laddar = false;

  function avbryt() {
    pagaende?.abort();
    pagaende = null;
    clearTimeout(timer);
  }

  function lagrat(data: ArrayLike<number> | null): number | null {
    if (!data || data.length === 0) return null;
    const alfa = data.length > 1 ? data[data.length - 1] : 1;
    return alfa === 0 || data[0] === NODATA[roll] ? null : data[0];
  }

  function rorelse(e: MapBrowserEvent) {
    pixel = [e.pixel[0], e.pixel[1]];
    berakna();
  }

  function berakna() {
    avbryt();
    const lager = kartan.lager();
    const kalla = lager?.getSource();
    if (!lager || !kalla || !pixel) return;
    const koordinat = kartan.karta.getCoordinateFromPixel(pixel);
    if (!koordinat) return;
    const [x, y] = koordinat;
    koord = koordinater(x, y);
    const v = lagrat(lager.getData(pixel) as ArrayLike<number> | null);
    if (v === null) {
      // En översikt utan data betyder att ingen cell i rutan har data.
      text = '—';
      tips = false;
      return;
    }
    const vy = kartan.karta.getView();
    const grid = kalla.getTileGridForProjection(vy.getProjection());
    const upp = vy.getResolution() ?? 0;
    const maxZ = grid.getMaxZoom();
    const z = grid.getZForResolution(upp, (kalla as unknown as { zDirection?: number }).zDirection ?? 0);
    const lage = vardeLage(z, maxZ, upp, upplosning, roll);
    // Full upplösning som inte har laddats än: getData kan ha gett en grövre ruta.
    const vantar = lage === 'exakt' && laddar;
    if (lage === 'exakt' && !vantar) {
      text = formatera(v, roll, klasser);
      tips = false;
      return;
    }
    text = (roll === 'klassad' ? '≈ ' : '≈') + formatera(v, roll, klasser);
    tips = lage === 'oversikt';
    // Klassade kartor hämtar inget; värdet räknas om när rutorna har laddat klart.
    if (lage === 'oversikt' || (vantar && roll === 'klassad')) return;
    const ac = (pagaende = new AbortController());
    const url = new URL(kf.fil, new URL(dataUrl, location.href)).href;
    timer = setTimeout(async () => {
      try {
        const exakt = await exaktVarde(url, x, y, Number(VY.split(':')[1]), ac.signal);
        if (!ac.signal.aborted) text = formatera(exakt, roll, klasser);
      } catch {
        // Avbruten eller misslyckad hämtning: det ungefärliga värdet står kvar.
      }
    }, 250);
  }

  function lamna() {
    avbryt();
    pixel = null;
    text = '';
    koord = null;
  }

  const flyttad = () => berakna();
  const borjarLadda = () => {
    laddar = true;
    berakna();
  };
  const klarLaddad = () => {
    laddar = false;
    berakna();
  };

  $effect(() => {
    const k = kartan.karta;
    k.on('pointermove', rorelse);
    k.on('moveend', flyttad);
    k.on('loadstart', borjarLadda);
    k.on('loadend', klarLaddad);
    const mal = k.getTargetElement();
    mal?.addEventListener('pointerleave', lamna);
    return () => {
      k.un('pointermove', rorelse);
      k.un('moveend', flyttad);
      k.un('loadstart', borjarLadda);
      k.un('loadend', klarLaddad);
      mal?.removeEventListener('pointerleave', lamna);
    };
  });
  // Ett annat lager eller en annan fil: avbryt och börja om vid nästa rörelse.
  $effect(() => {
    void kf.fil;
    void roll;
    lamna();
  });
  onDestroy(avbryt);
</script>

<div class="pekare" hidden={!text}>
  <output aria-label={t('varde_under_pekaren', lang)} data-testid="varde">{text}</output>
  {#if tips}
    <span class="tips" data-testid="varde-tips">{t('oversiktsvarde', lang)}</span>
  {/if}
  {#if koord}
    <span class="koord" data-testid="koordinat-sweref">{koord.sweref}</span>
    <span class="koord" data-testid="koordinat-wgs84">{koord.wgs84}</span>
  {/if}
</div>

<style>
  .pekare {
    position: absolute;
    z-index: 2;
    left: 0.75rem;
    bottom: 2.6rem;
    display: grid;
    gap: 0.1rem;
    padding: 0.4rem 0.7rem;
    background: rgb(23 48 59 / 90%);
    color: #fff;
    border-radius: 4px;
    pointer-events: none;
  }
  .pekare[hidden] {
    display: none;
  }
  output {
    font-weight: 700;
    font-size: 1.05rem;
  }
  .tips {
    font-size: 0.85rem;
  }
  .koord {
    font-size: 0.8rem;
    opacity: 0.85;
    font-variant-numeric: tabular-nums;
  }
</style>
