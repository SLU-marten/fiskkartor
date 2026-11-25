<script lang="ts">
  // Ikoner i Font Awesome-stil, som SLU:s webb använder. Banorna är kopierade ur
  // @fortawesome/free-solid-svg-icons 6.7.2 (faSliders, faChevronLeft).
  // Font Awesome Free, CC BY 4.0, https://fontawesome.com/license/free
  type Namn = 'reglage' | 'pil-vanster';
  let { namn, storlek = 16 }: { namn: Namn; storlek?: number } = $props();

  const IKONER: Record<Namn, { bredd: number; hojd: number; d: string }> = {
    reglage: {
      bredd: 512,
      hojd: 512,
      d: 'M0 416c0 17.7 14.3 32 32 32l54.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48L480 448c17.7 0 32-14.3 32-32s-14.3-32-32-32l-246.7 0c-12.3-28.3-40.5-48-73.3-48s-61 19.7-73.3 48L32 384c-17.7 0-32 14.3-32 32zm128 0a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zM320 256a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm32-80c-32.8 0-61 19.7-73.3 48L32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l246.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48l54.7 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-54.7 0c-12.3-28.3-40.5-48-73.3-48zM192 128a32 32 0 1 1 0-64 32 32 0 1 1 0 64zm73.3-64C253 35.7 224.8 16 192 16s-61 19.7-73.3 48L32 64C14.3 64 0 78.3 0 96s14.3 32 32 32l86.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48L480 128c17.7 0 32-14.3 32-32s-14.3-32-32-32L265.3 64z',
    },
    'pil-vanster': {
      bredd: 320,
      hojd: 512,
      d: 'M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l192 192c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 246.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192z',
    },
  };
  const ikon = $derived(IKONER[namn]);
</script>

<svg aria-hidden="true" focusable="false" viewBox={`0 0 ${ikon.bredd} ${ikon.hojd}`} height={storlek} width={(storlek * ikon.bredd) / ikon.hojd} fill="currentColor"
  ><path d={ikon.d} /></svg
>
