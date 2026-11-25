<script lang="ts">
  import type { Karta } from '../lib/katalog';

  type Props = { kartor: Karta[]; lank: (id: string) => string; aktiv?: string };
  let { kartor, lank, aktiv }: Props = $props();
</script>

<ul class="traffar">
  {#each kartor as k (k.id)}
    <li data-testid="traff">
      <a href={lank(k.id)} aria-current={k.id === aktiv ? 'page' : undefined}>{k.titel}</a>
      <span class="kalla">{k.kalla}, {k.ar}</span>
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
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--linje);
  }
  a {
    display: block;
    font-weight: 700;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  a[aria-current='page'] {
    color: var(--black);
  }
  .kalla {
    display: block;
    color: var(--dampad);
    font-size: 0.92rem;
  }
</style>
