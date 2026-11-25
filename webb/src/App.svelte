<script lang="ts">
  import { onMount } from 'svelte';
  import { lasKatalog, synliga, type Karta } from './lib/katalog';
  import Start from './vyer/Start.svelte';
  import { byggRutt, medParametrar, RUTT_ANDRAD, sprak, tolkaRutt, type Rutt, type Vy } from './lib/rutt';
  import { t } from './lib/text';

  // Datamappen ligger bredvid sidan. ?data=<url> pekar om den, för tester.
  const dataUrl = new URLSearchParams(location.search).get('data') ?? 'data/';

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

  $effect(() => {
    document.documentElement.lang = lang;
    document.title = t('portalnamn', lang);
  });
</script>

<header class="sidhuvud">
  <a class="namn" href={lank('start')}>{t('portalnamn', lang)}</a>
  <nav>
    <a href={lank('start')} aria-current={rutt.vy === 'start' ? 'page' : undefined}>{t('meny_start', lang)}</a>
    <a href={lank('om')} aria-current={rutt.vy === 'om' ? 'page' : undefined}>{t('meny_om', lang)}</a>
    <a href={spraklank} hreflang={lang === 'sv' ? 'en' : 'sv'} data-testid="sprak">{t('byt_sprak', lang)}</a>
  </nav>
</header>

<main>
  {#if fel}
    <p class="sida" role="alert">{t('katalog_fel', lang)} ({fel})</p>
    <button onclick={hamtaKatalog}>{t('forsok_igen', lang)}</button>
  {:else if kartor === null}
    <p class="sida" aria-live="polite">{t('laddar_katalog', lang)}</p>
  {:else if rutt.vy === 'start'}
    <Start kartor={synliga(kartor)} {rutt} {lang} />
  {:else if rutt.vy === 'karta'}
    <div class="sida"><h1>{rutt.id}</h1></div>
  {:else}
    <div class="sida"><h1>{t('meny_om', lang)}</h1></div>
  {/if}
</main>

<style>
  .sidhuvud {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem 1.5rem;
    padding: 0.75rem 1.25rem;
    border-bottom: 1px solid #dde3e6;
    background: #fff;
  }
  .namn {
    font-weight: 700;
    font-size: 1.15rem;
    text-decoration: none;
    color: inherit;
  }
  nav {
    display: flex;
    gap: 1.25rem;
  }
  nav a[aria-current='page'] {
    font-weight: 600;
    text-decoration: none;
  }
  .sida {
    padding: 1.25rem;
  }
</style>
