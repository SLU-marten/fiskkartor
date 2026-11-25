<script lang="ts">
  import Filter from '../komponenter/Filter.svelte';
  import Sokfalt from '../komponenter/Sokfalt.svelte';
  import Traffar from '../komponenter/Traffar.svelte';
  import { FALTNAMN, type Faltnamn, type Karta } from '../lib/katalog';
  import { byggRutt, medParametrar, skrivRutt, type Rutt, type Sprak } from '../lib/rutt';
  import { fasetter, filterFranQ, forslag, sok, type Fasett } from '../lib/sok';
  import { antalKartor, t } from '../lib/text';

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

  // Ett kort per projekt: antal kartor, källor och år.
  const projekt = $derived.by(() => {
    const grupper = new Map<string, Karta[]>();
    for (const k of kartor) grupper.set(k.projekt, [...(grupper.get(k.projekt) ?? []), k]);
    return [...grupper].map(([namn, ks]) => {
      const ar = ks.map((k) => k.ar);
      const min = Math.min(...ar);
      const max = Math.max(...ar);
      return { namn, antal: ks.length, kallor: kallText(namn, ks), ar: min === max ? String(min) : `${min}–${max}` };
    }).sort((a, b) => b.antal - a.antal);
  });

  // "Nationell marin kartering (Ryssja)", "… (Trål)" blir "Nationell marin kartering (Ryssja, Trål)".
  // En källa som heter som projektet nämns inte.
  function kallText(projekt: string, ks: Karta[]): string {
    const kallor = [...new Set(ks.map((k) => k.kalla))].filter((k) => k !== projekt).sort(sv.compare);
    const delar = kallor.map((k) => /^(.*) \((.*)\)$/.exec(k));
    if (kallor.length > 1 && delar.every((d) => d && d[1] === delar[0]![1])) {
      return `${delar[0]![1]} (${delar.map((d) => d![2]).join(', ')})`;
    }
    return kallor.join(', ');
  }

  // På smala skärmar är filtret hopfällt, så att träffarna syns direkt.
  const bred = typeof matchMedia === 'function' ? matchMedia('(min-width: 52rem)').matches : true;

  function kartlank(id: string): string {
    const p = new URLSearchParams();
    if (lang === 'en') p.set('lang', 'en');
    return byggRutt({ vy: 'karta', id, q: p });
  }

  function skriv(text: string) {
    skrivRutt(medParametrar(rutt, { q: text.trim() ? text : null }), 'ersatt');
  }

  function vaxla(falt: Faltnamn, varde: string) {
    const p = new URLSearchParams(rutt.q);
    const valda = p.getAll(falt);
    p.delete(falt);
    for (const v of valda.includes(varde) ? valda.filter((x) => x !== varde) : [...valda, varde]) p.append(falt, v);
    skrivRutt({ ...rutt, q: p }, 'ny');
  }

  function rensa() {
    skrivRutt(medParametrar(rutt, Object.fromEntries(FALTNAMN.map((f) => [f, null]))), 'ny');
  }
</script>

<section class="topp">
  <h1>{t('hitta_karta', lang)}</h1>
  <Sokfalt
    varde={q}
    forslag={forslag(kartor, q)}
    etikett={t('sok_etikett', lang)}
    platshallare={t('sok_platshallare', lang)}
    onskriv={skriv}
    onval={skriv}
  />
  <ul class="projekt">
    {#each projekt as p (p.namn)}
      <li>
        <button
          type="button"
          data-testid={`projekt-${p.namn}`}
          aria-pressed={filter.projekt.includes(p.namn)}
          onclick={() => vaxla('projekt', p.namn)}
        >
          <strong>{p.namn}</strong>
          <span>{antalKartor(p.antal, lang)}, {p.ar}.{p.kallor ? ` ${p.kallor}.` : ''}</span>
        </button>
      </li>
    {/each}
  </ul>
</section>

<div class="innehall">
  <aside aria-label={t('filter_rubrik', lang)}>
    <details open={bred || harFilter}>
      <summary><h2>{t('filter_rubrik', lang)}</h2></summary>
      <Filter fasetter={faset} {filter} {lang} onvaxla={vaxla} />
    </details>
  </aside>
  <section aria-live="polite">
    <div class="rad">
      <h2>{antalKartor(traffar.length, lang)}</h2>
      {#if harFilter}
        <button type="button" class="rensa" onclick={rensa}>{t('rensa_filter', lang)}</button>
      {/if}
    </div>
    {#if traffar.length}
      <Traffar kartor={traffar} lank={kartlank} />
    {:else}
      <p>{t('inga_traffar', lang)}</p>
    {/if}
  </section>
</div>

<style>
  .topp {
    padding: 2rem 1.25rem 1.5rem;
    border-bottom: 1px solid var(--linje);
    background: var(--yta);
  }
  h1 {
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    letter-spacing: -0.01em;
  }
  .projekt {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    list-style: none;
    margin: 1.25rem 0 0;
    padding: 0;
  }
  .projekt button {
    display: grid;
    gap: 0.15rem;
    max-width: 26rem;
    text-align: left;
    padding: 0.7rem 0.9rem;
    border: 1px solid var(--linje);
    border-left: 4px solid var(--accent);
    border-radius: 4px;
    background: var(--papper);
    cursor: pointer;
  }
  .projekt button[aria-pressed='true'] {
    background: var(--accent-ljus);
    border-color: var(--accent);
  }
  .projekt span {
    color: var(--dampad);
    font-size: 0.92rem;
  }
  .innehall {
    display: grid;
    grid-template-columns: minmax(14rem, 20rem) minmax(0, 46rem);
    gap: 2rem;
    padding: 1.5rem 1.25rem 3rem;
  }
  h2 {
    font-size: 1.15rem;
  }
  summary {
    cursor: pointer;
    margin-bottom: 0.5rem;
  }
  summary h2 {
    display: inline;
  }
  .rad {
    display: flex;
    align-items: baseline;
    gap: 1rem;
  }
  .rensa {
    border: 0;
    background: none;
    padding: 0;
    color: var(--accent);
    text-decoration: underline;
    cursor: pointer;
  }
  @media (max-width: 52rem) {
    .innehall {
      grid-template-columns: 1fr;
    }
  }
</style>
