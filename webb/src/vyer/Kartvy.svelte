<script lang="ts">
  import Karta from '../komponenter/Karta.svelte';
  import Panel from '../komponenter/Panel.svelte';
  import Lagerval from '../komponenter/Lagerval.svelte';
  import Legend from '../komponenter/Legend.svelte';
  import Grepp from '../komponenter/Grepp.svelte';
  import Ikon from '../komponenter/Ikon.svelte';
  import { tick } from 'svelte';
  import Traffar from '../komponenter/Traffar.svelte';
  import type { Bakgrund, Kartan } from '../karta/karta';
  import { aktuellVersion, FALTNAMN, kartfil, synliga, type Karta as KartaTyp, type Roll } from '../lib/katalog';
  import { franUrl } from '../lib/permalank';
  import { filterFranQ, sok } from '../lib/sok';
  import { byggRutt, medParametrar, skrivRutt, type Rutt, type Sprak } from '../lib/rutt';
  import { antalKartor, t } from '../lib/text';

  type Props = { kartor: KartaTyp[]; rutt: Rutt; lang: Sprak; dataUrl: string; cartoNyckel: string };
  let { kartor, rutt, lang, dataUrl, cartoNyckel }: Props = $props();

  const sv = new Intl.Collator('sv');
  const karta = $derived(kartor.find((k) => k.id === rutt.id));
  // Listan visar träffarna från startsidan (sökning och filter följer med i adressen), annars alla kartor.
  const sokning = $derived(rutt.q.has('q') || FALTNAMN.some((f) => rutt.q.has(f)));
  const lista = $derived(
    [...sok(synliga(kartor), rutt.q.get('q') ?? '', filterFranQ(rutt.q))].sort((a, b) => sv.compare(a.titel, b.titel)),
  );
  // På smala skärmar är listan hopfälld, så att kartan syns direkt.
  const bred = typeof matchMedia === 'function' ? matchMedia('(min-width: 60rem)').matches : true;
  const version = $derived(karta ? aktuellVersion(karta, rutt.q.has('v') ? Number(rutt.q.get('v')) : undefined) : null);
  const roll = $derived<Roll>(rutt.q.get('lager') === 'kontinuerlig' && version?.kontinuerlig ? 'kontinuerlig' : 'klassad');
  const fil = $derived(version ? (roll === 'kontinuerlig' ? version.kontinuerlig! : version.klassad) : null);
  const opacitet = $derived.by(() => {
    const o = Number(rutt.q.get('opacitet') ?? 1);
    return Number.isFinite(o) ? Math.min(1, Math.max(0, o)) : 1;
  });
  const bakgrund = $derived<Bakgrund>(rutt.q.get('bakgrund') === 'ingen' ? 'ingen' : 'carto');

  // Den öppna kartan ska synas i listan även när den ligger långt ned.
  $effect(() => {
    void karta?.id;
    if (bred) document.querySelector('.lista [aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
  });

  let kartan = $state<Kartan | null>(null);

  // Mobilpanelens läge. En ny karta öppnas alltid med panelen nere.
  let uppe = $state(false);
  $effect(() => {
    void karta?.id;
    uppe = false;
  });
  async function visaNedladdning() {
    uppe = true;
    await tick();
    document.getElementById('nedladdning')?.scrollIntoView({ block: 'start' });
  }

  // På mobil ersätts listan av en länk tillbaka till träffarna, med samma sökning, filter och språk.
  const traffLank = $derived.by(() => {
    const q = new URLSearchParams();
    for (const [k, v] of rutt.q) if (k === 'q' || k === 'lang' || (FALTNAMN as readonly string[]).includes(k)) q.append(k, v);
    return byggRutt({ vy: 'start', q });
  });

  // Vyn ur adressen, om länken har en. Kartan läser den bara när den öppnas.
  const start = $derived.by(() => {
    const l = franUrl(rutt.q);
    return l.x !== undefined && l.y !== undefined && l.upp !== undefined ? { x: l.x, y: l.y, upp: l.upp } : undefined;
  });
  function flytt(l: { x: number; y: number; upp: number }) {
    satt({ x: String(Math.round(l.x)), y: String(Math.round(l.y)), upp: String(Number(l.upp.toPrecision(3))) });
  }

  function satt(andra: Record<string, string | null>) {
    skrivRutt(medParametrar(rutt, andra), 'ersatt');
  }
  // Byte av karta i listan behåller sökningen och språket, men inte vyn eller lagret.
  function lank(id: string): string {
    const q = new URLSearchParams();
    for (const [k, v] of rutt.q) if (k === 'q' || k === 'lang' || (FALTNAMN as readonly string[]).includes(k)) q.append(k, v);
    return byggRutt({ vy: 'karta', id, q });
  }
</script>

{#if !karta || !version || !fil}
  <div class="tom">
    <h1>{t('karta_finns_inte', lang)}</h1>
    <p>{t('karta_finns_inte_text', lang)}</p>
    <p><a href={byggRutt({ vy: 'start', q: new URLSearchParams(lang === 'en' ? 'lang=en' : '') })}>{t('till_alla_kartor', lang)}</a></p>
  </div>
{:else}
  <div class="kartvy" class:uppe>
    <a class="tillbaka" href={traffLank}><Ikon namn="pil-vanster" storlek={14} />{t('till_traffarna', lang)} ({lista.length})</a>
    <nav class="lista" aria-label={t('alla_kartor', lang)}>
      <details open={bred}>
        <summary>{t(sokning ? 'traffar' : 'alla_kartor', lang)} <span>({antalKartor(lista.length, lang)})</span></summary>
        <Traffar kartor={lista} {lank} aktiv={karta.id} />
      </details>
    </nav>
    <div class="kartyta">
      {#key karta.id}
      <Karta
        kf={kartfil(fil)}
        {roll}
        klasser={version.klassad.klasser}
        upplosning={fil.upplosning}
        {opacitet}
        {bakgrund}
        {cartoNyckel}
        {dataUrl}
        {lang}
        {start}
        onflytt={flytt}
        onklar={(k) => (kartan = k)}
      />
      {/key}
      <Lagerval {version} {roll} {opacitet} {bakgrund} {lang} {satt} />
      <Legend {version} {roll} {lang} />
    </div>
    <section class="panel" aria-labelledby="kartans-namn">
      <Grepp {uppe} {lang} onvaxla={(v) => (uppe = v)} />
      <Panel {karta} {version} {roll} {dataUrl} {lang} {kartan} {rutt} {uppe} onladdaned={visaNedladdning} />
    </section>
  </div>
{/if}

<style>
  .kartvy {
    display: grid;
    grid-template-columns: minmax(13rem, 17rem) minmax(0, 1fr) minmax(16rem, 21rem);
    height: calc(100dvh - 4.5rem);
  }
  .lista {
    overflow: auto;
    padding: 0.75rem 1rem;
    border-right: 1px solid var(--linje);
    font-size: 0.95rem;
  }
  summary {
    font-weight: 500;
    cursor: pointer;
  }
  summary span {
    font-weight: 400;
    color: var(--dampad);
  }
  .kartyta {
    position: relative;
    min-height: 24rem;
    container: kartyta / size;
  }
  .tillbaka {
    display: none;
  }
  .panel {
    overflow: auto;
    padding: 1rem 1.25rem;
    border-left: 1px solid var(--linje);
    background: var(--yta);
  }
  .tom {
    max-width: 40rem;
    padding: 2rem 1.25rem;
  }
  /* Mobil: ingen sidskroll. Länkraden, kartan och panelen (fliken) delar fönstret. När fliken är
     uppe krymper kartan, och teckenförklaringen och värdet under pekaren döljs. */
  @media (max-width: 60rem) {
    .kartvy {
      grid-template-columns: 1fr;
      grid-template-rows: auto minmax(0, 1fr) auto;
      height: calc(100dvh - 3.5rem);
    }
    .lista {
      display: none;
    }
    .tillbaka {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      height: 44px;
      padding: 0 1rem;
      background: var(--mjuk);
      border-bottom: 1px solid var(--linje);
    }
    .kartyta {
      min-height: 0;
    }
    .panel {
      overflow: auto;
      padding: 0 1.25rem 0.75rem;
      border-left: 0;
      border-radius: 12px 12px 0 0;
      box-shadow: 0 -2px 8px rgb(0 0 0 / 15%);
    }
    .kartvy.uppe .panel {
      height: calc(100dvh - 12.5rem);
      box-sizing: border-box;
    }
    @media (max-height: 30rem) {
      .tillbaka {
        height: 36px;
      }
    }
    .kartvy.uppe :global(.legend),
    .kartvy.uppe :global(.pekare),
    .kartvy.uppe :global(.ol-zoom),
    .kartvy.uppe :global(.ol-scale-line) {
      display: none;
    }
  }
</style>
