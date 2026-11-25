<script lang="ts">
  // Greppet överst i mobilpanelen. Ett tryck växlar läge, ett svep uppåt eller nedåt väljer läge.
  // touch-action: none behövs, annars tar webbläsaren över vertikala svep (sidskroll,
  // dra-för-att-uppdatera) och skickar pointercancel i stället för pointerup.
  import { greppBeslut } from '../lib/flik';
  import type { Sprak } from '../lib/rutt';
  import { t } from '../lib/text';

  let { uppe, lang, onvaxla }: { uppe: boolean; lang: Sprak; onvaxla: (uppe: boolean) => void } = $props();

  let startY: number | null = null;
  // När pekaren redan har växlat läget ignoreras click som följer. En pekskärm ger ibland ingen
  // click alls efter ett tryck (greppet har pekarfångst), så tryck och svep hanteras i pointerup.
  // Tangentbord och skärmläsare ger bara click, utan pekarhändelser före.
  let pekareVaxlade = -Infinity;

  function ned(e: PointerEvent) {
    startY = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function upp(e: PointerEvent) {
    if (startY === null) return;
    const svar = greppBeslut(uppe, e.clientY - startY) ?? !uppe;
    startY = null;
    pekareVaxlade = performance.now();
    onvaxla(svar);
  }
  function klick() {
    if (performance.now() - pekareVaxlade < 500) return;
    onvaxla(!uppe);
  }
</script>

<button
  type="button"
  class="grepp"
  aria-expanded={uppe}
  aria-label={t(uppe ? 'visa_mindre' : 'visa_mer', lang)}
  onpointerdown={ned}
  onpointerup={upp}
  onpointercancel={() => (startY = null)}
  onclick={klick}
>
  <span class="streck"></span>
</button>

<style>
  .grepp {
    display: none;
  }
  @media (max-width: 60rem) {
    .grepp {
      display: block;
      width: 100%;
      height: 44px;
      margin: 0;
      padding: 0;
      border: 0;
      background: none;
      cursor: grab;
      touch-action: none;
    }
    @media (max-height: 30rem) {
      .grepp {
        height: 28px;
      }
    }
    .streck {
      display: block;
      margin: 0 auto;
      width: 40px;
      height: 4px;
      border-radius: 2px;
      background: var(--kant);
    }
  }
</style>
