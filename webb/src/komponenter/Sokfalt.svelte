<script lang="ts">
  // Sökfält med förslag (ARIA combobox): pil upp/ned väljer, Enter använder förslaget, Escape stänger.
  type Props = {
    varde: string;
    forslag: string[];
    etikett: string;
    platshallare: string;
    onskriv: (v: string) => void;
    onval: (v: string) => void;
  };
  let { varde, forslag, etikett, platshallare, onskriv, onval }: Props = $props();

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
    font-weight: 700;
    margin-bottom: 0.35rem;
  }
  input {
    box-sizing: border-box;
    width: 100%;
    font: inherit;
    font-size: 1.3rem;
    padding: 0.6rem 0.8rem;
    border: 2px solid var(--black);
    border-radius: 6px;
    background: var(--yta);
    color: inherit;
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
    box-shadow: 0 6px 18px rgb(23 48 59 / 12%);
  }
  li {
    padding: 0.4rem 0.8rem;
    cursor: pointer;
  }
  li[aria-selected='true'],
  li:hover {
    background: var(--accent-ljus);
  }
</style>
