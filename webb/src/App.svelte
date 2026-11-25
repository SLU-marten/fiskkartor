<script lang="ts">
  import { onMount } from 'svelte';
  import { lasKatalog, synliga, type Karta } from './lib/katalog';
  import Start from './vyer/Start.svelte';
  import Kartvy from './vyer/Kartvy.svelte';
  import Om from './vyer/Om.svelte';
  import Tillganglighet from './vyer/Tillganglighet.svelte';
  import Sidhuvud from './komponenter/Sidhuvud.svelte';
  import Sidfot from './komponenter/Sidfot.svelte';
  import { byggRutt, medParametrar, RUTT_ANDRAD, sprak, tolkaRutt, type Rutt, type Vy } from './lib/rutt';
  import { sidtitel, t } from './lib/text';

  // Datamappen ligger bredvid sidan. ?data=<url> pekar om den, för tester.
  const dataUrl = new URLSearchParams(location.search).get('data') ?? 'data/';
  const cartoNyckel = import.meta.env.VITE_CARTO_NYCKEL ?? '';

  let rutt = $state<Rutt>(tolkaRutt(location.hash));
  const lang = $derived(sprak(rutt));
  let kartor = $state<Karta[] | null>(null);
  let fel = $state<string | null>(null);

  function lank(vy: Vy, id?: string): string {
    const q = new URLSearchParams();
    if (lang === 'en') q.set('lang', 'en');
    return byggRutt({ vy, id, q });
  }
  const spraklank = $derived(byggRutt(medParametrar(rutt, { lang: lang === 'sv' ? 'en' : null })));

  async function hamtaKatalog() {
    fel = null;
    try {
      kartor = await lasKatalog(dataUrl);
    } catch (e) {
      fel = (e as Error).message;
    }
  }

  onMount(() => {
    const uppdatera = () => (rutt = tolkaRutt(location.hash));
    for (const h of ['hashchange', 'popstate', RUTT_ANDRAD]) window.addEventListener(h, uppdatera);
    hamtaKatalog();
    return () => {
      for (const h of ['hashchange', 'popstate', RUTT_ANDRAD]) window.removeEventListener(h, uppdatera);
    };
  });

  // Varje vy har en egen titel (WCAG 2.4.2). I kartvyn är kartans namn vyns namn.
  const titel = $derived.by(() => {
    if (rutt.vy === 'om') return sidtitel(t('meny_om', lang), lang);
    if (rutt.vy === 'tillganglighet') return sidtitel(t('meny_tillganglighet', lang), lang);
    if (rutt.vy === 'karta') {
      if (kartor === null) return sidtitel(null, lang);
      return sidtitel(kartor.find((k) => k.id === rutt.id)?.titel ?? t('karta_finns_inte', lang), lang);
    }
    return sidtitel(t('meny_start', lang), lang);
  });

  $effect(() => {
    document.documentElement.lang = lang;
    document.title = titel;
  });
</script>

<Sidhuvud {lang} vy={rutt.vy} {lank} {spraklank} />

<main id="innehall" tabindex="-1">
  {#if rutt.vy === 'om'}
    <Om {lang} />
  {:else if rutt.vy === 'tillganglighet'}
    <Tillganglighet {lang} />
  {:else if fel}
    <p class="sida" role="alert">{t('katalog_fel', lang)} ({fel})</p>
    <button onclick={hamtaKatalog}>{t('forsok_igen', lang)}</button>
  {:else if kartor === null}
    <p class="sida" aria-live="polite">{t('laddar_katalog', lang)}</p>
  {:else if rutt.vy === 'start'}
    <Start kartor={synliga(kartor)} {rutt} {lang} />
  {:else if rutt.vy === 'karta'}
    <Kartvy {kartor} {rutt} {lang} {dataUrl} {cartoNyckel} />
  {/if}
</main>

{#if rutt.vy !== 'karta'}
  <Sidfot {lang} {lank} />
{/if}

<style>
  main:focus {
    outline: none;
  }
  .sida {
    padding: 1.25rem;
  }
</style>
