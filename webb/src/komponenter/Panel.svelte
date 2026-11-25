<script lang="ts">
  import Legend from './Legend.svelte';
  import Metadata from './Metadata.svelte';
  import Nedladdning from './Nedladdning.svelte';
  import type { Bakgrund } from '../karta/karta';
  import { citeringstext, versionslank } from '../lib/citering';
  import type { Karta, Roll, Version } from '../lib/katalog';
  import { byggRutt, type Sprak } from '../lib/rutt';
  import { t } from '../lib/text';

  type Props = {
    karta: Karta;
    version: Version;
    roll: Roll;
    opacitet: number;
    bakgrund: Bakgrund;
    dataUrl: string;
    lang: Sprak;
    satt: (andra: Record<string, string | null>) => void;
  };
  let { karta, version, roll, opacitet, bakgrund, dataUrl, lang, satt }: Props = $props();

  // Citeringen pekar på kartan och versionen, inte på vyn (sidans adress utan ?data= och index.html).
  const bas = `${location.origin}${location.pathname.replace(/index\.html$/, '')}`;
  const citering = $derived(citeringstext(karta, version, versionslank(bas, karta.id, version.version), new Date(), lang));
  let kopierat = $state('');
  async function kopiera() {
    try {
      await navigator.clipboard.writeText(citering);
      kopierat = t('kopierad', lang);
    } catch {
      kopierat = t('kopiera_fel', lang);
    }
  }
  $effect(() => {
    void citering;
    kopierat = '';
  });

  const versioner = $derived([...karta.versioner].sort((a, b) => b.version - a.version));
  function versionLank(v: number): string {
    const q = new URLSearchParams();
    if (v !== karta.aktuellVersion) q.set('v', String(v));
    if (lang === 'en') q.set('lang', 'en');
    return byggRutt({ vy: 'karta', id: karta.id, q });
  }
</script>

<h1>{karta.titel}</h1>

{#if version.kontinuerlig}
  <fieldset>
    <legend>{t('visa_lager', lang)}</legend>
    {#each ['klassad', 'kontinuerlig'] as const as r (r)}
      <label>
        <input type="radio" name="lager" value={r} checked={roll === r} onchange={() => satt({ lager: r === 'klassad' ? null : r })} />
        {t(r === 'klassad' ? 'lager_klassad' : 'lager_kontinuerlig', lang)}
      </label>
    {/each}
  </fieldset>
{/if}

<Legend {version} {roll} {lang} />

<label class="reglage">
  {t('opacitet', lang)}
  <input type="range" min="0" max="1" step="0.05" value={opacitet}
    oninput={(e) => satt({ opacitet: e.currentTarget.value === '1' ? null : e.currentTarget.value })} />
</label>
<fieldset>
  <legend>{t('bakgrundskarta', lang)}</legend>
  {#each ['carto', 'ingen'] as const as b (b)}
    <label>
      <input type="radio" name="bakgrund" value={b} checked={bakgrund === b} onchange={() => satt({ bakgrund: b === 'carto' ? null : b })} />
      {t(b === 'carto' ? 'bakgrund_carto' : 'bakgrund_ingen', lang)}
    </label>
  {/each}
</fieldset>

<Nedladdning {karta} {version} {dataUrl} {lang} />

<section>
  <h2>{t('citera', lang)}</h2>
  <p class="citering" lang={karta.sprak}>{citering}</p>
  <button type="button" class="knapp" onclick={kopiera}>{t('kopiera_citering', lang)}</button>
  <span role="status">{kopierat}</span>
</section>

<Metadata {karta} {lang} />

<section data-testid="versioner">
  <h2>{t('versioner', lang)}</h2>
  <ul>
    {#each versioner as v (v.version)}
      <li>
        {#if v.version === version.version}
          <strong aria-current="page">Version {v.version}</strong> ({v.publicerad}), {t('visas_nu', lang)}
        {:else}
          <a href={versionLank(v.version)}>Version {v.version}</a> ({v.publicerad})
        {/if}
      </li>
    {/each}
  </ul>
</section>

<style>
  h1 {
    font-size: 1.35rem;
  }
  :global(.panel h2) {
    font-size: 1.05rem;
    margin-top: 1.4rem;
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
    margin: 1rem 0;
  }
  .reglage input {
    width: 100%;
  }
  .citering {
    font-size: 0.92rem;
    margin: 0 0 0.5rem;
    overflow-wrap: anywhere;
  }
  .knapp {
    border: 1px solid var(--accent);
    background: var(--yta);
    color: var(--accent);
    border-radius: 4px;
    padding: 0.3rem 0.7rem;
    cursor: pointer;
  }
  [role='status'] {
    margin-left: 0.5rem;
    font-size: 0.9rem;
  }
  ul {
    margin: 0;
    padding-left: 1.1rem;
  }
</style>
