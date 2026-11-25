<script lang="ts">
  // Lagerval i kartan (alternativ 2): en knapp överst till höger som öppnar en ruta med Visa,
  // Opacitet och Bakgrundskarta. Rutan är stängd från början. Escape stänger den och ger knappen
  // fokus; ett klick utanför stänger den. Valen skrivs i adressen som tidigare.
  import Ikon from './Ikon.svelte';
  import type { Bakgrund } from '../karta/karta';
  import type { Roll, Version } from '../lib/katalog';
  import type { Sprak } from '../lib/rutt';
  import { t } from '../lib/text';

  type Props = {
    version: Version;
    roll: Roll;
    opacitet: number;
    bakgrund: Bakgrund;
    lang: Sprak;
    satt: (andra: Record<string, string | null>) => void;
  };
  let { version, roll, opacitet, bakgrund, lang, satt }: Props = $props();

  let oppen = $state(false);
  let rot: HTMLDivElement;
  let knapp: HTMLButtonElement;

  $effect(() => {
    if (!oppen) return;
    const utanfor = (e: PointerEvent) => {
      if (!rot.contains(e.target as Node)) oppen = false;
    };
    const tangent = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      oppen = false;
      knapp.focus();
    };
    // Fokus som lämnar komponenten (Tab förbi sista valet) stänger rutan, så att fokus aldrig
    // hamnar på något som rutan täcker.
    const lamnar = (e: FocusEvent) => {
      const nasta = e.relatedTarget as Node | null;
      if (nasta && !rot.contains(nasta)) oppen = false;
    };
    document.addEventListener('pointerdown', utanfor);
    rot.addEventListener('keydown', tangent);
    rot.addEventListener('focusout', lamnar);
    return () => {
      document.removeEventListener('pointerdown', utanfor);
      rot.removeEventListener('keydown', tangent);
      rot.removeEventListener('focusout', lamnar);
    };
  });

  const procent = $derived(Math.round(opacitet * 100));
</script>

<div class="lagerval" bind:this={rot}>
  <button type="button" class="knapp" aria-expanded={oppen} aria-controls="lagerval-ruta" bind:this={knapp} onclick={() => (oppen = !oppen)}>
    <Ikon namn="reglage" storlek={16} />
    {t('lagerval', lang)}
  </button>
  <div id="lagerval-ruta" class="ruta" hidden={!oppen}>
    {#if version.kontinuerlig}
      <fieldset>
        <legend>{t('visa_lager', lang)}</legend>
        <div class="delad">
          {#each ['klassad', 'kontinuerlig'] as const as r (r)}
            <label>
              <input class="radio" type="radio" name="lager" value={r} checked={roll === r}
                onchange={() => satt({ lager: r === 'klassad' ? null : r })} />
              {t(r === 'klassad' ? 'lager_klassad' : 'lager_kontinuerlig', lang)}
            </label>
          {/each}
        </div>
      </fieldset>
    {/if}
    <div class="reglage">
      <div class="rad">
        <label for="lagerval-opacitet">{t('opacitet', lang)}</label>
        <span aria-hidden="true">{procent} %</span>
      </div>
      <input id="lagerval-opacitet" type="range" min="0" max="1" step="0.05" value={opacitet} aria-valuetext={`${procent} %`}
        oninput={(e) => satt({ opacitet: e.currentTarget.value === '1' ? null : e.currentTarget.value })} />
    </div>
    <fieldset>
      <legend>{t('bakgrundskarta', lang)}</legend>
      <div class="delad">
        {#each ['carto', 'ingen'] as const as b (b)}
          <label>
            <input class="radio" type="radio" name="bakgrund" value={b} checked={bakgrund === b}
              onchange={() => satt({ bakgrund: b === 'carto' ? null : b })} />
            {t(b === 'carto' ? 'bakgrund_carto' : 'bakgrund_ingen', lang)}
          </label>
        {/each}
      </div>
    </fieldset>
  </div>
</div>

<style>
  .lagerval {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 5;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }
  .knapp {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: 40px;
    padding: 0 0.9rem;
    border: 1px solid var(--gron);
    border-radius: 4px;
    background: var(--gron);
    color: var(--yta);
    cursor: pointer;
  }
  .knapp:hover {
    background: var(--gron-mork);
  }
  /* Rutan ryms i kartytan (en storlekscontainer) och skrollar inuti när kartan är låg. */
  .ruta {
    max-height: calc(100cqh - 4.5rem);
    overflow-y: auto;
    width: 15.5rem;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    padding: 0.75rem 0.9rem;
    background: var(--yta);
    border: 1px solid var(--linje);
    border-radius: 6px;
    box-shadow: 0 1px 4px rgb(0 0 0 / 12%);
  }
  fieldset {
    border: 0;
    margin: 0;
    padding: 0;
  }
  legend,
  .rad label {
    padding: 0;
    margin-bottom: 0.25rem;
    color: var(--dampad);
    font-size: 0.9rem;
  }
  .delad {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .delad label {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 36px;
    border: 1px solid var(--gron);
    color: var(--gron);
    background: var(--yta);
    cursor: pointer;
  }
  .delad label:first-child {
    border-radius: 4px 0 0 4px;
  }
  .delad label:last-child {
    border-radius: 0 4px 4px 0;
    border-left: 0;
  }
  .delad label:has(input:checked) {
    background: var(--gron);
    color: var(--yta);
  }
  /* Den inbyggda radioknappen täcker etiketten men syns inte. Klick träffar den direkt, och fokus
     visas på etiketten. */
  .radio {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }
  .delad label:has(input:focus-visible) {
    position: relative;
    z-index: 1;
    outline: 3px solid var(--gron);
    outline-offset: 2px;
    box-shadow: 0 0 0 7px var(--yta);
  }
  /* Tvingade färger (t.ex. Windows hög kontrast) tar bort bakgrundsfärgen, så det valda
     alternativet markeras med systemets markeringsfärger. */
  @media (forced-colors: active) {
    .delad label:has(input:checked) {
      forced-color-adjust: none;
      background: Highlight;
      color: HighlightText;
    }
  }
  .rad {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    color: var(--dampad);
  }
  .reglage input {
    width: 100%;
    accent-color: var(--gron);
  }
  @media (max-width: 60rem) {
    .knapp {
      height: 44px;
    }
  }
</style>
