<script lang="ts">
  import type { Karta } from '../lib/katalog';
  import { doiLank, kontaktLank } from '../lib/lankar';
  import { faltetikett } from '../lib/metadatatext';
  import type { Sprak } from '../lib/rutt';
  import { t } from '../lib/text';

  let { karta, lang }: { karta: Karta; lang: Sprak } = $props();
  // Etiketterna följer gränssnittets språk, texterna det språk de är skrivna på (sprak).
  const rader = $derived(
    [
      ['kvalitet', karta.kvalitet],
      ['kalla', karta.kalla],
      ['projekt', karta.projekt === karta.kalla ? null : karta.projekt],
      ['ar', String(karta.ar)],
      ['citering', karta.citering],
      ...Object.entries(karta.falt),
    ].filter((r): r is [string, string] => typeof r[1] === 'string' && r[1] !== ''),
  );
</script>

<section data-testid="metadata">
  <h2>{t('om_kartan', lang)}</h2>
  <dl>
    {#each rader as [nyckel, varde] (nyckel)}
      <dt>{faltetikett(nyckel, lang) ?? nyckel}</dt>
      <dd lang={nyckel === 'vetenskapligt_namn' ? 'la' : karta.sprak} class:lopande={nyckel === 'kvalitet'}>{varde}</dd>
    {/each}
    {#if karta.doi}
      <dt>{faltetikett('doi', lang)}</dt>
      <dd><a href={doiLank(karta.doi)}>{karta.doi}</a></dd>
    {/if}
    <dt>{faltetikett('licens', lang)}</dt>
    <dd>{karta.licens}</dd>
    <dt>{faltetikett('kontakt', lang)}</dt>
    <dd>
      {#if kontaktLank(karta.kontakt)}<a href={kontaktLank(karta.kontakt)}>{karta.kontakt}</a>{:else}{karta.kontakt}{/if}
    </dd>
  </dl>
</section>

<style>
  h2 {
    font-size: 1.05rem;
  }
  dl {
    margin: 0;
  }
  /* Rubriken liten och dämpad, värdet större och mörkt: tydlig skillnad mellan dem. */
  dt {
    font-weight: 400;
    font-size: 0.85rem;
    color: var(--dampad);
    margin-top: 0.85rem;
  }
  dt:first-child {
    margin-top: 0;
  }
  dd {
    margin: 0.1rem 0 0;
    font-size: 1.05rem;
    color: var(--text);
    overflow-wrap: anywhere;
  }
</style>
