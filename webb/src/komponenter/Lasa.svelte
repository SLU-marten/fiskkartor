<script lang="ts">
  // "Så läser du kartorna": teckenförklaringen för klassade och kontinuerliga kartor, i kartans färger.
  import { klassfarger, KONTINUERLIGA_STEG } from '../karta/stil';
  import type { Sprak } from '../lib/rutt';
  import { t } from '../lib/text';

  let { lang, lank, id }: { lang: Sprak; lank: string; id: string } = $props();
  const [viktigt, mycket] = klassfarger(2).map((f) => `rgb(${f.join(' ')})`);
  const skala = `linear-gradient(90deg, ${KONTINUERLIGA_STEG.join(', ')})`;
</script>

<aside class="lasa" aria-labelledby={id}>
  <h2 {id}>{t('lasa_rubrik', lang)}</h2>
  <p>{t('lasa_klassad', lang)}</p>
  <ul class="klasser">
    <li><span class="ruta" style:background={viktigt}></span>{t('viktigt', lang)}</li>
    <li><span class="ruta" style:background={mycket}></span>{t('mycket_viktigt', lang)}</li>
  </ul>
  <p>{t('lasa_kontinuerlig', lang)}</p>
  <div class="skala" style:background={skala} aria-hidden="true"></div>
  <p class="andar" aria-hidden="true"><span>{t('lag', lang)}</span><span>{t('hog', lang)}</span></p>
  <a href={lank}>{t('lasa_lank', lang)}</a>
</aside>

<style>
  .lasa {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.4rem 1.5rem;
    background: var(--yta);
    border: 1px solid var(--kortkant);
    border-radius: 4px;
    font-size: 0.95rem;
  }
  h2 {
    margin: 0;
    font-size: 1.2rem;
  }
  p {
    margin: 0;
    line-height: 1.45;
  }
  .klasser {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .klasser li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .ruta {
    width: 22px;
    height: 14px;
  }
  .skala {
    height: 12px;
    margin-bottom: -0.5rem;
  }
  .andar {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: var(--dampad);
  }
  @media (forced-colors: active) {
    .ruta,
    .skala {
      forced-color-adjust: none;
    }
  }
</style>
