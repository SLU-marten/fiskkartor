<script lang="ts">
  // Sidhuvudet i Havsvik med ett mönster av fisksiluetter: SLU:s vita logotyp överst till vänster
  // (den fria zonen är inbyggd i bilden), portalens namn och institutionen. Under 40rem ligger menyn
  // bakom en knapp.
  import logotyp from '../assets/slu-logotyp-vit.png';
  import { tick } from 'svelte';
  import type { Sprak, Vy } from '../lib/rutt';
  import { t } from '../lib/text';

  type Props = { lang: Sprak; vy: Vy; lank: (vy: Vy) => string; spraklank: string };
  let { lang, vy, lank, spraklank }: Props = $props();

  let oppen = $state(false);
  let rot: HTMLElement;
  let knapp: HTMLButtonElement;
  let stangknapp: HTMLButtonElement;
  let slojan: HTMLDivElement;

  function stang(fokus: boolean) {
    oppen = false;
    if (fokus) knapp.focus();
  }

  // Medan menyn är öppen stänger Escape den (och fokus går tillbaka till knappen), och ett klick
  // utanför sidhuvudet stänger den. Lyssnarna finns bara medan menyn är öppen.
  $effect(() => {
    if (!oppen) return;
    const utanfor = (e: PointerEvent) => {
      if (!rot.contains(e.target as Node)) stang(false);
    };
    const tangent = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stang(true);
    };
    // Fokus som lämnar sidhuvudet stänger menyn, så att fokus inte hamnar under den.
    const lamnar = (e: FocusEvent) => {
      const nasta = e.relatedTarget as Node | null;
      if (nasta && !rot.contains(nasta)) stang(false);
    };
    // Ett tryck på den nedtonade ytan bakom mobilpanelen stänger menyn.
    const pa_slojan = () => stang(false);
    document.addEventListener('pointerdown', utanfor);
    rot.addEventListener('keydown', tangent);
    rot.addEventListener('focusout', lamnar);
    slojan.addEventListener('pointerdown', pa_slojan);
    // På mobil får stängknappen fokus när panelen öppnas.
    void tick().then(() => {
      if (oppen && stangknapp.offsetParent !== null) stangknapp.focus();
    });
    return () => {
      slojan.removeEventListener('pointerdown', pa_slojan);
      document.removeEventListener('pointerdown', utanfor);
      rot.removeEventListener('keydown', tangent);
      rot.removeEventListener('focusout', lamnar);
    };
  });

  // Hopplänken flyttar fokus till innehållet utan att ändra hash-rutten.
  function hoppa(e: MouseEvent) {
    e.preventDefault();
    document.getElementById('innehall')?.focus();
  }
</script>

<header class="sidhuvud" bind:this={rot}>
  <a class="hopp" href="#innehall" onclick={hoppa}>{t('hoppa', lang)}</a>
  <img class="logotyp" src={logotyp} alt={t('slu_alt', lang)} />
  <div class="namnrad">
    <a class="namn" href={lank('start')}>{t('portalnamn', lang)}</a>
    <span class="institution">{t('institution', lang)}</span>
  </div>
  <button
    type="button"
    class="menyknapp"
    aria-expanded={oppen}
    aria-controls="huvudmeny"
    bind:this={knapp}
    onclick={() => (oppen = !oppen)}
    ><svg class="streck" viewBox="0 0 24 24" aria-hidden="true"
      ><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" /></svg
    >{t('meny', lang)}</button
  >
  <div class="slojan" class:oppen bind:this={slojan} aria-hidden="true"></div>
  <nav id="huvudmeny" class:oppen aria-label={t('huvudmeny', lang)}>
    <div class="panelhuvud">
      <span class="panelnamn">{t('portalnamn', lang)}</span>
      <button type="button" class="stang" aria-label={t('stang_meny', lang)} bind:this={stangknapp} onclick={() => stang(true)}
        ><svg viewBox="0 0 24 24" aria-hidden="true"
          ><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg
        ></button
      >
    </div>
    <a href={lank('start')} aria-current={vy === 'start' ? 'page' : undefined} onclick={() => stang(false)}>{t('meny_start', lang)}</a>
    <a href={lank('om')} aria-current={vy === 'om' ? 'page' : undefined} onclick={() => stang(false)}>{t('meny_om', lang)}</a>
    <a
      class="bara-mobil"
      href={lank('tillganglighet')}
      aria-current={vy === 'tillganglighet' ? 'page' : undefined}
      onclick={() => stang(false)}>{t('meny_tillganglighet', lang)}</a
    >
    <a href={spraklank} hreflang={lang === 'sv' ? 'en' : 'sv'} data-testid="sprak" onclick={() => stang(false)}>{t('byt_sprak', lang)}</a>
    <p class="avsandare">{t('avsandare', lang)}</p>
  </nav>
</header>

<style>
  /* SLU:s PNG-fil (slu_logo_webb.zip) har den fria zonen inbyggd: märket är halva bildens höjd och
     marginalen en fjärdedel på varje sida. Bilden fyller därför sidhuvudets höjd och ligger mot
     vänsterkanten: 72 px ger ett märke på 36 px. På mobil 68 px, så att märket når 9 mm (34 px). */
  .sidhuvud {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    height: 4.5rem;
    box-sizing: border-box;
    padding: 0 1.5rem 0 0;
    /* Bandet i Havsvik med fiskmönstret (publicering/inst/skript/silhuetter.R). Mönstret är lika
       högt som sidhuvudet och upprepas i sidled. z-index lägger sidhuvudet över innehållet nedanför. */
    z-index: 10;
    background: var(--tema) url('../assets/arter/monster-sidhuvud.svg') 0 0 / auto 100% repeat-x;
    color: #ffffff;
  }
  .sidhuvud :focus-visible {
    outline-color: #ffffff;
  }
  .logotyp {
    display: block;
    height: 72px;
    width: auto;
  }
  .namnrad {
    display: flex;
    flex-direction: column;
    line-height: 1.15;
  }
  .namn {
    font-weight: 500;
    font-size: 1.4rem;
    text-decoration: none;
    color: #ffffff;
  }
  .institution {
    font-size: 0.85rem;
    color: #ffffff;
  }
  nav {
    margin-left: auto;
    display: flex;
    gap: 1.5rem;
  }
  nav a {
    color: #ffffff;
  }
  nav a[aria-current='page'] {
    text-decoration: none;
    border-bottom: 2px solid #ffffff;
  }
  .menyknapp {
    display: none;
    align-items: center;
    gap: 0.5rem;
    margin-left: auto;
    min-height: 44px;
    padding: 0 0.85rem;
    border: 0;
    border-radius: 2px;
    background: var(--tema-mork);
    color: #ffffff;
    cursor: pointer;
  }
  .streck {
    width: 20px;
    height: 20px;
  }
  .hopp {
    position: absolute;
    left: 0.5rem;
    top: 0.5rem;
    z-index: 20;
    padding: 0.5rem 0.75rem;
    background: var(--yta);
    color: var(--tema);
    border: 2px solid var(--tema);
    border-radius: 4px;
    transform: translateY(-200%);
  }
  .hopp:focus {
    transform: none;
  }
  @media (max-width: 60rem) {
    .sidhuvud {
      height: 4.25rem;
      padding: 0 0.75rem 0 0;
    }
    .logotyp {
      height: 68px;
    }
    .namn {
      font-size: 1.2rem;
    }
    .institution {
      font-size: 0.8rem;
    }
  }
  .panelhuvud,
  .bara-mobil,
  .avsandare,
  .slojan {
    display: none;
  }
  /* Mobil: menyn är en panel i Havsvik som glider in från höger, med fiskmönstret (varje art en gång)
     och en nedtonad yta bakom. Stängd är den osynlig, så att Tab inte når länkarna. */
  @media (max-width: 40rem) {
    .menyknapp {
      display: flex;
    }
    nav {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 2;
      width: min(316px, 85vw);
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 0;
      margin: 0;
      padding: 0.5rem 1.25rem 1.5rem;
      overflow-y: auto;
      background: var(--tema) url('../assets/arter/monster-meny.svg') 0 0 / 100% auto no-repeat;
      color: #ffffff;
      transform: translateX(100%);
      visibility: hidden;
      transition:
        transform 200ms ease,
        visibility 0s linear 200ms;
    }
    nav.oppen {
      transform: none;
      visibility: visible;
      transition: transform 200ms ease;
    }
    .panelhuvud {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 52px;
      border-bottom: 1px solid rgb(255 255 255 / 30%);
    }
    .panelnamn {
      font-size: 1.5rem;
      font-weight: 500;
    }
    .stang {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      margin-right: -0.5rem;
      border: 0;
      background: transparent;
      color: #ffffff;
      cursor: pointer;
    }
    .stang svg {
      width: 24px;
      height: 24px;
    }
    nav a,
    .bara-mobil {
      display: flex;
      align-items: center;
      min-height: 52px;
      padding-left: 0.75rem;
      border-bottom: 1px solid rgb(255 255 255 / 30%);
      font-size: 1.15rem;
      text-decoration: none;
    }
    nav a[aria-current='page'] {
      border-bottom: 1px solid rgb(255 255 255 / 30%);
      box-shadow: inset 4px 0 0 #ffffff;
    }
    .avsandare {
      display: block;
      margin: 1.25rem 0 0;
      font-size: 0.95rem;
      line-height: 1.45;
    }
    .slojan.oppen {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 1;
      background: rgb(0 20 24 / 50%);
    }
  }
  @media (max-width: 40rem) and (prefers-reduced-motion: reduce) {
    nav,
    nav.oppen {
      transition: none;
    }
  }
  @media (max-width: 22.5rem) {
    .institution {
      display: none;
    }
  }
  /* Tvingade färger tar bort bakgrunden; texten och länkarna får systemets färger. */
  @media (forced-colors: active) {
    .sidhuvud,
    .institution {
      color: CanvasText;
    }
    .namn,
    nav a {
      color: LinkText;
    }
    .sidhuvud :focus-visible {
      outline-color: Highlight;
    }
  }
</style>
