<script lang="ts">
  import type { Karta } from '../lib/katalog';
  import Artikon from './Artikon.svelte';

  type Props = { kartor: Karta[]; lank: (id: string) => string; aktiv?: string; kompakt?: boolean };
  let { kartor, lank, aktiv, kompakt = false }: Props = $props();
</script>

<ul class="traffar">
  {#each kartor as k (k.id)}
    <li data-testid="traff" class:kompakt>
      <Artikon art={k.falt.art} livsstadium={k.falt.livsstadium} {kompakt} />
      <span class="text">
        <a href={lank(k.id)} aria-current={k.id === aktiv ? 'page' : undefined}>{k.titel}</a>
        <span class="kalla">{k.kalla}, {k.ar}</span>
      </span>
    </li>
  {/each}
</ul>

<style>
  .traffar {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--linje);
  }
  li.kompakt {
    gap: 10px;
  }
  .text {
    min-width: 0;
    flex: 1;
  }
  a {
    display: block;
    font-weight: 500;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  a[aria-current='page'] {
    color: var(--text);
    background: var(--markering);
    margin: 0 -0.5rem;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
  }
  .kalla {
    display: block;
    color: var(--dampad);
    font-size: 0.92rem;
  }
</style>
