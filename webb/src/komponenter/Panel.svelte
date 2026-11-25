<script lang="ts">
  import Metadata from './Metadata.svelte';
  import Nedladdning from './Nedladdning.svelte';
  import type { Kartan } from '../karta/karta';
  import { sparaSomBild } from '../lib/bild';
  import { citeringstext, versionslank } from '../lib/citering';
  import type { Karta, Roll, Version } from '../lib/katalog';
  import { byggRutt, medParametrar, type Rutt, type Sprak } from '../lib/rutt';
  import { t, versionSaknas, visaVersion } from '../lib/text';

  type Props = {
    karta: Karta;
    version: Version;
    roll: Roll;
    dataUrl: string;
    lang: Sprak;
    kartan: Kartan | null;
    rutt: Rutt;
  };
  let { karta, version, roll, dataUrl, lang, kartan, rutt }: Props = $props();

  // ?v= med en version som inte finns: den aktuella visas, och det sägs.
  const begard = $derived(rutt.q.get('v'));
  const saknadVersion = $derived(begard !== null && String(version.version) !== begard ? begard : null);

  let bildstatus = $state('');
  let sparar = $state(false);
  async function sparaBild() {
    if (!kartan || sparar) return;
    bildstatus = '';
    sparar = true;
    const enhet =
      !version.kontinuerlig || version.kontinuerlig.enhet === 'sannolikhet' ? t('sannolikhet', lang) : version.kontinuerlig.enhet;
    try {
      const { blob, utanBakgrund } = await sparaSomBild(
        kartan.karta,
        { titel: karta.titel, roll, klasser: version.klassad.klasser, enhet },
        `${t('kartdata', lang)}: SLU Aqua, ${karta.kalla}. ${karta.titel}, version ${version.version}.`,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${karta.id}_v${version.version}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      if (utanBakgrund) bildstatus = t('bild_utan_bakgrund', lang);
    } catch {
      bildstatus = t('bild_fel', lang);
    } finally {
      sparar = false;
    }
  }

  // Citeringen pekar på kartan och versionen, inte på vyn (sidans adress utan ?data= och index.html).
  const bas = `${location.origin}${location.pathname.replace(/index\.html$/, '')}`;
  const citering = $derived(citeringstext(karta, version, versionslank(bas, karta.id, version.version), new Date(), lang));
  let kopierat = $state('');
  let lankKopierad = $state('');
  async function kopiera() {
    try {
      await navigator.clipboard.writeText(citering);
      kopierat = t('kopierad', lang);
    } catch {
      kopierat = t('kopiera_fel', lang);
    }
  }
  async function kopieraLank() {
    try {
      await navigator.clipboard.writeText(location.href);
      lankKopierad = t('kopierad', lang);
    } catch {
      lankKopierad = t('kopiera_fel', lang);
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

{#if !karta.visas}
  <p class="notis" role="note">{t('inte_aktuell', lang)}</p>
{/if}
{#if version.version !== karta.aktuellVersion}
  <p class="notis" role="note">
    {t('nyare_version', lang)}
    <a href={byggRutt(medParametrar(rutt, { v: null }))}>{visaVersion(karta.aktuellVersion, lang)}</a>
  </p>
{/if}
{#if saknadVersion}
  <p class="notis" role="note">{versionSaknas(saknadVersion, version.version, lang)}</p>
{/if}

<h1>{karta.titel}</h1>


<p>
  <button type="button" class="knapp" onclick={kopieraLank}>{t('kopiera_lank', lang)}</button>
  <span role="status">{lankKopierad}</span>
</p>
<p>
  <button type="button" class="knapp" onclick={sparaBild} disabled={!kartan || sparar} aria-busy={sparar}>
    {sparar ? t('sparar_bild', lang) : t('spara_bild', lang)}
  </button>
  <span role="status">{bildstatus}</span>
</p>

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
  /* Kartans namn står kvar överst när panelen skrollas. Bakgrunden täcker texten under.
     top tar bort panelens utfyllnad (1rem), som annars blir en glipa ovanför rubriken. */
  h1 {
    font-size: 1.35rem;
    position: sticky;
    top: -1rem;
    z-index: 1;
    margin: 0 -1.25rem 0.75rem;
    padding: 0.5rem 1.25rem;
    background: var(--yta);
    border-bottom: 1px solid var(--linje);
  }
  /* På mobil skrollar hela sidan, och fönstret har ingen utfyllnad att ta bort. */
  @media (max-width: 60rem) {
    h1 {
      top: 0;
    }
  }
  :global(.panel h2) {
    font-size: 1.05rem;
    margin-top: 1.4rem;
  }
  .notis {
    margin: 0 0 1rem;
    padding: 0.5rem 0.75rem;
    background: var(--notis);
    border-left: 4px solid var(--notis-kant);
  }
  .citering {
    font-size: 0.92rem;
    margin: 0 0 0.5rem;
    overflow-wrap: anywhere;
  }
  .knapp {
    border: 1px solid var(--gron);
    background: var(--yta);
    color: var(--gron);
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
