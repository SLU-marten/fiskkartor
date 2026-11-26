<script lang="ts">
  // Rund ikon med artens silhuett. Fisken är stor för vuxna och liten för lek och uppväxt.
  // Saknas silhuetten är cirkeln tom: hellre ingen fisk än fel art.
  import { arVuxen, silhuettFor } from '../lib/arter';

  type Props = { art?: string | null; livsstadium?: string | null; kompakt?: boolean };
  let { art, livsstadium, kompakt = false }: Props = $props();

  const silhuett = $derived(silhuettFor(art));
  const bredd = $derived(arVuxen(livsstadium) ? (kompakt ? 28 : 34) : kompakt ? 16 : 20);
</script>

<span class="artikon" class:kompakt aria-hidden="true">
  {#if silhuett}
    <svg viewBox={`0 0 ${silhuett.w} ${silhuett.h}`} width={bredd} height={(bredd * silhuett.h) / silhuett.w}>
      <path d={silhuett.d} fill="#ffffff" />
    </svg>
  {/if}
</span>

<style>
  .artikon {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--tema);
  }
  .kompakt {
    width: 36px;
    height: 36px;
  }
  svg {
    display: block;
  }
  /* Tvingade färger tar bort bakgrunden: en kant och systemets textfärg håller ikonen synlig. */
  @media (forced-colors: active) {
    .artikon {
      border: 1px solid CanvasText;
    }
    path {
      fill: CanvasText;
    }
  }
</style>
