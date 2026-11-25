<script lang="ts">
  // Sidhuvudet enligt SLU:s profil: logotypen i färg överst till vänster med en fri zon på halva
  // logotypens höjd, portalens namn och institutionen. Under 40rem ligger menyn bakom en knapp.
  import logotyp from '../assets/slu-logotyp.png';
  import type { Sprak, Vy } from '../lib/rutt';
  import { t } from '../lib/text';

  type Props = { lang: Sprak; vy: Vy; lank: (vy: Vy) => string; spraklank: string };
  let { lang, vy, lank, spraklank }: Props = $props();

  let oppen = $state(false);
  let rot: HTMLElement;
  let knapp: HTMLButtonElement;

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
    document.addEventListener('pointerdown', utanfor);
    rot.addEventListener('keydown', tangent);
    rot.addEventListener('focusout', lamnar);
    return () => {
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
    onclick={() => (oppen = !oppen)}>{t('meny', lang)}</button
  >
  <nav id="huvudmeny" class:oppen aria-label={t('huvudmeny', lang)}>
    <a href={lank('start')} aria-current={vy === 'start' ? 'page' : undefined} onclick={() => stang(false)}>{t('meny_start', lang)}</a>
    <a href={lank('om')} aria-current={vy === 'om' ? 'page' : undefined} onclick={() => stang(false)}>{t('meny_om', lang)}</a>
    <a href={spraklank} hreflang={lang === 'sv' ? 'en' : 'sv'} data-testid="sprak" onclick={() => stang(false)}>{t('byt_sprak', lang)}</a>
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
    /* Linjen är en skugga och inte en kant, så att logotypens vita bakgrund (hela höjden) inte
       täcker den. z-index lägger den över innehållet nedanför. */
    box-shadow: 0 1px 0 var(--linje);
    z-index: 10;
    background: var(--yta);
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
    color: var(--text);
  }
  .institution {
    font-size: 0.85rem;
    color: var(--dampad);
  }
  nav {
    margin-left: auto;
    display: flex;
    gap: 1.5rem;
  }
  nav a[aria-current='page'] {
    color: var(--text);
    text-decoration: none;
    border-bottom: 2px solid var(--gron);
  }
  .menyknapp {
    display: none;
    margin-left: auto;
    min-height: 44px;
    padding: 0 0.75rem;
    border: 1px solid var(--gron);
    border-radius: 4px;
    background: var(--yta);
    color: var(--gron);
    cursor: pointer;
  }
  .hopp {
    position: absolute;
    left: 0.5rem;
    top: 0.5rem;
    z-index: 20;
    padding: 0.5rem 0.75rem;
    background: var(--yta);
    border: 2px solid var(--gron);
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
  @media (max-width: 40rem) {
    .menyknapp {
      display: block;
    }
    nav {
      display: none;
    }
    nav.oppen {
      display: flex;
      flex-direction: column;
      gap: 0;
      position: absolute;
      top: 100%;
      right: 0;
      left: 0;
      z-index: 15;
      background: var(--yta);
      border-bottom: 1px solid var(--linje);
      box-shadow: 0 4px 8px rgb(0 0 0 / 12%);
    }
    nav.oppen a {
      padding: 0.75rem 1rem;
      border-top: 1px solid var(--linje);
    }
  }
  @media (max-width: 22.5rem) {
    .institution {
      display: none;
    }
  }
</style>
