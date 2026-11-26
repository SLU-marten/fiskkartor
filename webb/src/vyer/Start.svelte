<script lang="ts">
  import Artkort from '../komponenter/Artkort.svelte';
  import Filter from '../komponenter/Filter.svelte';
  import Lasa from '../komponenter/Lasa.svelte';
  import Sokfalt from '../komponenter/Sokfalt.svelte';
  import { tick } from 'svelte';
  import { grupperaArter } from '../lib/artgrupper';
  import { FALTNAMN, type Faltnamn, type Karta } from '../lib/katalog';
  import { byggRutt, medParametrar, skrivRutt, type Rutt, type Sprak } from '../lib/rutt';
  import { fasetter, filterFranQ, forslag, lika, sok, type Fasett } from '../lib/sok';
  import { antalArterKartor, t, visaAllaArter } from '../lib/text';

  type Props = { kartor: Karta[]; rutt: Rutt; lang: Sprak };
  let { kartor, rutt, lang }: Props = $props();

  const sv = new Intl.Collator('sv');
  const q = $derived(rutt.q.get('q') ?? '');
  const filter = $derived(filterFranQ(rutt.q));
  const traffar = $derived([...sok(kartor, q, filter)].sort((a, b) => sv.compare(a.titel, b.titel)));
  // Antalen för ett fält räknas med alla andra filter, så att flera värden i samma fält går att välja.
  const faset = $derived(
    Object.fromEntries(FALTNAMN.map((f) => [f, fasetter(sok(kartor, q, { ...filter, [f]: [] }))[f]])) as Record<
      Faltnamn,
      Fasett
    >,
  );
  const harFilter = $derived(FALTNAMN.some((f) => filter[f].length > 0));
  // Arten är dold i filtret; finns inget annat fält med värden säger filterkortet det i stället.
  const harFasetter = $derived(FALTNAMN.some((f) => filter[f].length > 0 || (f !== 'art' && faset[f].length > 0)));

  // Kartorna som artkort. Högst MAX kort först; en ny sökning eller ett nytt filter visar åter MAX.
  const MAX = 12;
  const grupper = $derived(grupperaArter(traffar));
  const antalArter = $derived(grupper.filter((g) => g.art).length);
  // Att alla visas står i adressen (alla=1), så att Tillbaka från en karta visar samma lista. En ny
  // sökning eller ett nytt filter tar bort det.
  const allaArter = $derived(rutt.q.get('alla') === '1');
  const synliga = $derived(allaArter ? grupper : grupper.slice(0, MAX));

  async function visaAllaKort() {
    skrivRutt(medParametrar(rutt, { alla: '1' }), 'ersatt');
    await tick();
    // Fokus till det första nya kortet, så att Tab fortsätter där listan växte.
    document.querySelectorAll<HTMLElement>('ul.rutnat > li')[MAX]?.querySelector<HTMLElement>('a')?.focus();
  }

  const sprakQ = $derived(new URLSearchParams(lang === 'en' ? { lang: 'en' } : {}));

  // På smala skärmar är filtret hopfällt, så att träffarna syns direkt. På en telefon är
  // platshållaren i sökfältet kortare, så att den får plats.
  const bred = typeof matchMedia === 'function' ? matchMedia('(min-width: 52rem)').matches : true;
  const telefon = typeof matchMedia === 'function' ? matchMedia('(max-width: 40rem)').matches : false;
  // Filtret öppnas när ett filter är valt, men fälls aldrig ihop av sig själv.
  let filterOppet = $state(bred);
  $effect.pre(() => {
    if (harFilter) filterOppet = true;
  });

  // Sökningen och filtren följer med till kartvyn, så att listan där visar samma träffar.
  function kartlank(id: string): string {
    return byggRutt({ vy: 'karta', id, q: new URLSearchParams(rutt.q) });
  }

  function skriv(text: string) {
    skrivRutt(medParametrar(rutt, { q: text.trim() ? text : null, alla: null }), 'ersatt');
  }

  function vaxla(falt: Faltnamn, varde: string) {
    const p = new URLSearchParams(rutt.q);
    const valda = p.getAll(falt);
    p.delete(falt);
    p.delete('alla');
    const vald = valda.some((x) => lika(x, varde));
    for (const v of vald ? valda.filter((x) => !lika(x, varde)) : [...valda, varde]) p.append(falt, v);
    skrivRutt({ ...rutt, q: p }, 'ny');
  }

  function rensa() {
    skrivRutt(medParametrar(rutt, { alla: null, ...Object.fromEntries(FALTNAMN.map((f) => [f, null])) }), 'ny');
  }

  // Utan träffar: töm sökningen och filtren och flytta fokus till rubriken över alla kort.
  function visaAllt() {
    skrivRutt(medParametrar(rutt, { q: null, alla: null, ...Object.fromEntries(FALTNAMN.map((f) => [f, null])) }), 'ny');
    void tick().then(() => document.getElementById('traffrubrik')?.focus());
  }
</script>

<section class="hero">
  <div class="behallare hero-rutnat">
    <div class="intro">
      <h1>{t('hitta_karta', lang)}</h1>
      <p class="ingress lopande">{t('start_ingress', lang)}</p>
      <Sokfalt
        varde={q}
        forslag={forslag(kartor, q)}
        etikett={t('sok_etikett', lang)}
        platshallare={t(telefon ? 'sok_platshallare_kort' : 'sok_platshallare', lang)}
        onskriv={skriv}
        onval={skriv}
        sokknapp={t('sok_knapp', lang)}
        onsok={() => document.getElementById('traffrubrik')?.focus()}
      />
    </div>
    <div class="bara-dator"><Lasa {lang} lank={byggRutt({ vy: 'om', q: sprakQ })} id="lasa-dator" /></div>
  </div>
</section>

<div class="behallare innehall">
  <aside class="filterkort" aria-label={t('filter_rubrik', lang)}>
    <details bind:open={filterOppet}>
      <summary><h2>{t('filter_rubrik', lang)}</h2></summary>
      {#if harFasetter}
        <Filter fasetter={faset} {filter} {lang} onvaxla={vaxla} dolda={['art']} fler={['rodlista', 'livsmiljo', 'simblasa']} />
      {:else}
        <p class="dampad">{t('inga_filter', lang)}</p>
      {/if}
    </details>
  </aside>
  <section class="arter">
    <div class="rad">
      <h2 id="traffrubrik" tabindex="-1" aria-live="polite">{antalArterKartor(antalArter, traffar.length, lang)}</h2>
      {#if harFilter}
        <button type="button" class="rensa" onclick={rensa}>{t('rensa_filter', lang)}</button>
      {/if}
    </div>
    {#if traffar.length}
      <ul class="rutnat">
        {#each synliga as grupp (grupp.nyckel)}
          <li><Artkort {grupp} lank={kartlank} {lang} /></li>
        {/each}
      </ul>
      {#if grupper.length > synliga.length}
        <button type="button" class="visa-alla" onclick={visaAllaKort}>{visaAllaArter(grupper.length, lang)}</button>
      {/if}
    {:else}
      <div class="tomt">
        <p>{t('inga_traffar', lang)}</p>
        <button type="button" class="visa-alla" onclick={visaAllt}>{t('visa_alla_kartor', lang)}</button>
      </div>
    {/if}
  </section>
  <div class="bara-mobil"><Lasa {lang} lank={byggRutt({ vy: 'om', q: sprakQ })} id="lasa-mobil" /></div>
</div>

<style>
  .hero {
    padding: 2.75rem 0 2.25rem;
  }
  .hero-rutnat {
    display: grid;
    grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr);
    gap: 3rem;
    align-items: start;
  }
  .intro {
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }
  h1 {
    margin: 0;
    font-size: clamp(2rem, 4vw, 2.9rem);
    font-weight: 400;
    line-height: 1.1;
  }
  .ingress {
    margin: 0 0 0.4rem;
    max-width: 36em;
    font-size: 1.1rem;
  }
  .innehall {
    display: grid;
    grid-template-columns: 18rem minmax(0, 1fr);
    gap: 2rem;
    align-items: start;
    padding-top: 0.25rem;
    padding-bottom: 3.5rem;
  }
  .filterkort {
    padding: 1.25rem;
    background: var(--yta);
    border: 1px solid var(--kortkant);
    border-radius: 4px;
  }
  summary h2 {
    display: inline;
    margin: 0;
    font-size: 1.2rem;
  }
  details[open] > summary {
    margin-bottom: 1rem;
  }
  .arter {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 0;
  }
  .rad {
    display: flex;
    align-items: baseline;
    gap: 1rem;
  }
  .rad h2 {
    margin: 0;
    font-size: 1.5rem;
  }
  .rensa {
    min-height: 36px;
    padding: 0 0.75rem;
    border: 1px solid var(--tema);
    border-radius: 4px;
    background: var(--yta);
    color: var(--tema);
    cursor: pointer;
  }
  .rutnat {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(12.5rem, 1fr));
    gap: 0.875rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .visa-alla {
    align-self: center;
    min-height: 48px;
    margin-top: 0.75rem;
    padding: 0 1.75rem;
    border: 1px solid var(--tema);
    border-radius: 4px;
    background: var(--yta);
    color: var(--tema);
    font-size: 1.05rem;
    cursor: pointer;
  }
  .visa-alla:hover {
    background: var(--tema);
    color: #ffffff;
  }
  .tomt {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 1.5rem;
    background: var(--yta);
    border: 1px solid var(--kortkant);
    border-radius: 4px;
  }
  .tomt p {
    margin: 0;
  }
  .tomt .visa-alla {
    align-self: flex-start;
    margin-top: 0.5rem;
  }
  .dampad {
    margin: 0;
    color: var(--dampad);
  }
  .bara-mobil {
    display: none;
  }
  @media (max-width: 60rem) {
    .hero-rutnat,
    .innehall {
      grid-template-columns: minmax(0, 1fr);
    }
    .bara-dator {
      display: none;
    }
    .bara-mobil {
      display: block;
    }
  }
  @media (max-width: 40rem) {
    .hero {
      padding: 1.5rem 0 1.25rem;
    }
    .innehall {
      gap: 0.75rem;
    }
    .rutnat {
      grid-template-columns: minmax(0, 1fr);
    }
    .visa-alla {
      align-self: stretch;
    }
  }
</style>
