<script lang="ts">
  import { nedladdningsnamn } from '../lib/citering';
  import type { Karta, Version } from '../lib/katalog';
  import { metadataSomText } from '../lib/metadatatext';
  import type { Sprak } from '../lib/rutt';
  import { t } from '../lib/text';

  let { karta, version, dataUrl, lang }: { karta: Karta; version: Version; dataUrl: string; lang: Sprak } = $props();

  const bas = $derived(new URL(dataUrl, location.href));
  const storlek = (b: number) => {
    const tal = new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'sv-SE', { maximumFractionDigits: 1 });
    return b < 1e6 ? `${tal.format(b / 1e3)} kB` : `${tal.format(b / 1e6)} MB`;
  };
  // Textfilen byggs i webbläsaren. Adressen släpps när kartan eller språket byts.
  let textUrl = $state('');
  $effect(() => {
    const url = URL.createObjectURL(new Blob([metadataSomText(karta, version, lang)], { type: 'text/plain;charset=utf-8' }));
    textUrl = url;
    return () => URL.revokeObjectURL(url);
  });
</script>

<section id="nedladdning" data-testid="nedladdning">
  <h2>{t('ladda_ned', lang)}</h2>
  <ul>
    <li>
      <a href={new URL(version.klassad.fil, bas).href} download={nedladdningsnamn(karta.id, version.version, 'klassad')}>
        {t('klassad_karta', lang)}</a> <span>(GeoTIFF, {storlek(version.klassad.bytes)})</span>
    </li>
    {#if version.kontinuerlig}
      <li>
        <a href={new URL(version.kontinuerlig.fil, bas).href}
          download={nedladdningsnamn(karta.id, version.version, 'kontinuerlig')}>{t('kontinuerlig_karta', lang)}</a>
        <span>(GeoTIFF, {storlek(version.kontinuerlig.bytes)})</span>
      </li>
    {/if}
    <li>
      <a href={new URL(karta.metadata, bas).href} download={nedladdningsnamn(karta.id, version.version, 'metadata.json')}>
        {t('metadata_json', lang)}</a>
    </li>
    <li>
      <a href={textUrl} download={nedladdningsnamn(karta.id, version.version, 'metadata.txt')}>{t('metadata_text', lang)}</a>
    </li>
  </ul>
  <p class="info lopande">{t('original_info', lang)} (EPSG:{version.klassad.epsg}).</p>
</section>

<style>
  h2 {
    font-size: 1.05rem;
  }
  ul {
    margin: 0;
    padding-left: 1.1rem;
  }
  li {
    margin-bottom: 0.2rem;
  }
  span,
  .info {
    color: var(--dampad);
    font-size: 0.9rem;
  }
</style>
