<script lang="ts">
  import type { Sprak, Vy } from '../lib/rutt';
  import { t } from '../lib/text';

  let { lang, lank }: { lang: Sprak; lank: (vy: Vy) => string } = $props();
  const KONTAKT = 'SLU-Aqua-fiskkartor@slu.se';
</script>

<footer class="sidfot">
  <p>{t('portalnamn', lang)}, {t('institution', lang)}, SLU</p>
  <ul>
    <li><a href={lank('om')}>{t('meny_om', lang)}</a></li>
    <li><a href={lank('tillganglighet')}>{t('meny_tillganglighet', lang)}</a></li>
    <li><a href={`mailto:${KONTAKT}`}>{KONTAKT}</a></li>
  </ul>
</footer>

<style>
  .sidfot {
    margin-top: 3rem;
    padding: 1.5rem 1.5rem 2.25rem;
    background: var(--tema-mork);
    color: #ffffff;
    font-size: 0.95rem;
  }
  .sidfot a {
    color: #ffffff;
  }
  .sidfot :focus-visible {
    outline-color: #ffffff;
  }
  p {
    margin: 0 0 0.5rem;
  }
  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
</style>
