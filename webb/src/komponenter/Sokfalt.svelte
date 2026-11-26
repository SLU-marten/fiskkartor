<script lang="ts">
  // Sökfält med förslag (ARIA combobox): pil upp/ned väljer, Enter använder förslaget, Escape stänger.
  type Props = {
    varde: string;
    forslag: string[];
    etikett: string;
    platshallare: string;
    onskriv: (v: string) => void;
    onval: (v: string) => void;
    /** Knappen Sök: sökningen sker redan medan man skriver, så knappen tar en till träffarna. */
    onsok?: () => void;
    sokknapp?: string;
  };
  let { varde, forslag, etikett, platshallare, onskriv, onval, onsok, sokknapp }: Props = $props();

  let oppen = $state(false);
  let aktiv = $state(-1);
  const visas = $derived(oppen && forslag.length > 0);

  function valj(s: string) {
    onval(s);
    oppen = false;
    aktiv = -1;
  }

  function tangent(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' && forslag.length) {
      e.preventDefault();
      oppen = true;
      aktiv = (aktiv + 1) % forslag.length;
    } else if (e.key === 'ArrowUp' && forslag.length) {
      e.preventDefault();
      aktiv = aktiv <= 0 ? forslag.length - 1 : aktiv - 1;
    } else if (e.key === 'Enter' && visas && aktiv >= 0) {
      e.preventDefault();
      valj(forslag[aktiv]);
    } else if (e.key === 'Escape') {
      oppen = false;
      aktiv = -1;
    }
  }
</script>

<div class="sokfalt">
  <label for="sok">{etikett}</label>
  <div class="rad">
  <input
    id="sok"
    type="search"
    role="combobox"
    autocomplete="off"
    spellcheck="false"
    aria-autocomplete="list"
    aria-controls="sok-forslag"
    aria-expanded={visas}
    aria-activedescendant={visas && aktiv >= 0 ? `forslag-${aktiv}` : undefined}
    placeholder={platshallare}
    value={varde}
    oninput={(e) => {
      onskriv(e.currentTarget.value);
      oppen = true;
      aktiv = -1;
    }}
    onkeydown={tangent}
    onblur={() => (oppen = false)}
    onfocus={() => (oppen = true)}
  />
  {#if sokknapp}
    <button type="button" class="sokknapp" onclick={() => onsok?.()}
      ><svg viewBox="0 0 24 24" aria-hidden="true"
        ><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="2" fill="none" /><path
          d="M15.5 15.5 21 21"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        /></svg
      ><span class="sokknapp-text">{sokknapp}</span></button
    >
  {/if}
  </div>
  <ul id="sok-forslag" role="listbox" hidden={!visas} aria-label={etikett}>
    {#each forslag as s, i (s)}
      <li
        id={`forslag-${i}`}
        role="option"
        aria-selected={i === aktiv}
        onmousedown={(e) => {
          e.preventDefault();
          valj(s);
        }}
      >
        {s}
      </li>
    {/each}
  </ul>
</div>

<style>
  .sokfalt {
    position: relative;
    max-width: 44rem;
  }
  label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.35rem;
  }
  .rad {
    display: flex;
  }
  input {
    box-sizing: border-box;
    flex: 1;
    min-width: 0;
    width: 100%;
    font: inherit;
    font-size: 1.15rem;
    height: 48px;
    padding: 0 0.9rem;
    border: 1px solid var(--kant);
    border-radius: 4px;
    background: var(--yta);
    color: inherit;
  }
  .rad:has(.sokknapp) input {
    border-right: 0;
    border-radius: 4px 0 0 4px;
  }
  .sokknapp {
    flex: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 1.25rem;
    border: 0;
    border-radius: 0 4px 4px 0;
    background: var(--tema);
    color: #ffffff;
    font-size: 1.05rem;
    cursor: pointer;
  }
  .sokknapp:hover {
    background: var(--tema-mork);
  }
  .sokknapp svg {
    width: 22px;
    height: 22px;
  }
  /* På en telefon får fältet platsen: knappen visar bara förstoringsglaset men heter fortfarande Sök. */
  @media (max-width: 40rem) {
    input {
      font-size: 1.05rem;
    }
    .sokknapp {
      width: 48px;
      padding: 0;
      justify-content: center;
    }
    .sokknapp-text {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  }
  input::placeholder {
    color: var(--dampad);
  }
  ul {
    position: absolute;
    z-index: 10;
    left: 0;
    right: 0;
    margin: 0.25rem 0 0;
    padding: 0.25rem 0;
    list-style: none;
    background: var(--yta);
    border: 1px solid var(--linje);
    border-radius: 6px;
    box-shadow: 0 6px 18px rgb(0 0 0 / 12%);
  }
  li {
    padding: 0.4rem 0.8rem;
    cursor: pointer;
  }
  li[aria-selected='true'],
  li:hover {
    background: var(--markering);
  }
</style>
