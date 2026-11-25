<script lang="ts">
  import Karta from '../komponenter/Karta.svelte';
  import Traffar from '../komponenter/Traffar.svelte';
  import type { Bakgrund } from '../karta/karta';
  import { aktuellVersion, kartfil, synliga, type Karta as KartaTyp, type Roll } from '../lib/katalog';
  import { byggRutt, medParametrar, skrivRutt, type Rutt, type Sprak } from '../lib/rutt';
  import { antalKartor, t } from '../lib/text';

  type Props = { kartor: KartaTyp[]; rutt: Rutt; lang: Sprak; dataUrl: string; cartoNyckel: string };
  let { kartor, rutt, lang, dataUrl, cartoNyckel }: Props = $props();

  const sv = new Intl.Collator('sv');
  const karta = $derived(kartor.find((k) => k.id === rutt.id));
  const lista = $derived([...synliga(kartor)].sort((a, b) => sv.compare(a.titel, b.titel)));
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
    document.querySelector('.lista [aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
  });

  function satt(andra: Record<string, string | null>) {
    skrivRutt(medParametrar(rutt, andra), 'ersatt');
  }
  function lank(id: string): string {
    const q = new URLSearchParams();
    if (lang === 'en') q.set('lang', 'en');
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
  <div class="kartvy">
    <nav class="lista" aria-label={t('alla_kartor', lang)}>
      <details open>
        <summary>{t('alla_kartor', lang)} <span>({antalKartor(lista.length, lang)})</span></summary>
        <Traffar kartor={lista} {lank} aktiv={karta.id} />
      </details>
    </nav>
    <div class="kartyta">
      <Karta
        kf={kartfil(fil)}
        {roll}
        klasser={version.klassad.klasser}
        {opacitet}
        {bakgrund}
        {cartoNyckel}
        {dataUrl}
        {lang}
      />
    </div>
    <aside class="panel">
      <h1>{karta.titel}</h1>
      {#if version.kontinuerlig}
        <fieldset>
          <legend>{t('visa_lager', lang)}</legend>
          {#each ['klassad', 'kontinuerlig'] as const as r (r)}
            <label>
              <input type="radio" name="lager" value={r} checked={roll === r}
                onchange={() => satt({ lager: r === 'klassad' ? null : r })} />
              {t(r === 'klassad' ? 'lager_klassad' : 'lager_kontinuerlig', lang)}
            </label>
          {/each}
        </fieldset>
      {/if}
      <label class="reglage">
        {t('opacitet', lang)}
        <input type="range" min="0" max="1" step="0.05" value={opacitet}
          oninput={(e) => satt({ opacitet: e.currentTarget.value === '1' ? null : e.currentTarget.value })} />
      </label>
      <fieldset>
        <legend>{t('bakgrundskarta', lang)}</legend>
        {#each ['carto', 'ingen'] as const as b (b)}
          <label>
            <input type="radio" name="bakgrund" value={b} checked={bakgrund === b}
              onchange={() => satt({ bakgrund: b === 'carto' ? null : b })} />
            {t(b === 'carto' ? 'bakgrund_carto' : 'bakgrund_ingen', lang)}
          </label>
        {/each}
      </fieldset>
    </aside>
  </div>
{/if}

<style>
  .kartvy {
    display: grid;
    grid-template-columns: minmax(13rem, 17rem) minmax(0, 1fr) minmax(16rem, 21rem);
    height: calc(100vh - 3.4rem);
  }
  .lista {
    overflow: auto;
    padding: 0.75rem 1rem;
    border-right: 1px solid var(--linje);
    font-size: 0.95rem;
  }
  summary {
    font-weight: 700;
    cursor: pointer;
  }
  summary span {
    font-weight: 400;
    color: var(--dampad);
  }
  .kartyta {
    min-height: 24rem;
  }
  .panel {
    overflow: auto;
    padding: 1rem 1.25rem;
    border-left: 1px solid var(--linje);
    background: var(--yta);
  }
  .panel h1 {
    font-size: 1.35rem;
  }
  fieldset {
    border: 0;
    margin: 0 0 1rem;
    padding: 0;
  }
  legend {
    font-weight: 700;
    padding: 0;
    margin-bottom: 0.25rem;
  }
  fieldset label {
    display: inline-flex;
    gap: 0.35rem;
    margin-right: 1rem;
  }
  .reglage {
    display: grid;
    font-weight: 700;
    margin-bottom: 1rem;
  }
  .reglage input {
    width: 100%;
  }
  .tom {
    max-width: 40rem;
    padding: 2rem 1.25rem;
  }
  @media (max-width: 60rem) {
    .kartvy {
      grid-template-columns: 1fr;
      height: auto;
    }
    .kartyta {
      height: 70vh;
    }
    .lista {
      border-right: 0;
      border-bottom: 1px solid var(--linje);
    }
  }
</style>
