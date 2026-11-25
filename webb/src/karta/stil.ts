import type { Style } from 'ol/layer/WebGLTile.js';

/** En klass ur katalog.json: värde i rastret, namn i legenden och om den ska färgas. */
export type Klass = { varde: number; namn: string; farg: boolean };

type Farg = [number, number, number, number];

/** ColorBrewer YlGnBu, nio steg från ljust till mörkt. */
export const YLGNBU: [number, number, number][] = [
  [255, 255, 217], [237, 248, 177], [199, 233, 180], [127, 205, 187], [65, 182, 196],
  [29, 145, 192], [34, 94, 168], [37, 52, 148], [8, 29, 88],
];

const GENOMSKINLIG: Farg = [0, 0, 0, 0];
const ogenomskinlig = ([r, g, b]: [number, number, number]): Farg => [r, g, b, 1];

// Färg nummer i av n, från mellanljust till mörkt, så att även den lägsta klassen syns mot kartan.
function klassfarg(i: number, n: number): Farg {
  const t = n === 1 ? 0.75 : 0.4 + (0.5 * i) / (n - 1);
  return ogenomskinlig(YLGNBU[Math.round(t * (YLGNBU.length - 1))]);
}

/** Klassad karta: varje färgad klass får en YlGnBu-färg i värdeordning; ofärgade klasser och nodata blir genomskinliga. */
export function klassadStil(klasser: Klass[]): Style {
  const fargade = klasser.filter((k) => k.farg).sort((a, b) => a.varde - b.varde);
  const uttryck: unknown[] = ['case'];
  for (const k of klasser) {
    if (!k.farg) uttryck.push(['==', ['band', 1], k.varde], GENOMSKINLIG);
  }
  fargade.forEach((k, i) => uttryck.push(['==', ['band', 1], k.varde], klassfarg(i, fargade.length)));
  uttryck.push(GENOMSKINLIG);
  return { color: uttryck as Style['color'] };
}

/**
 * Kontinuerlig karta: lagrat värde / skala tolkas som 0–1 och färgas med fem YlGnBu-steg mellan min och max.
 * Nodata fångas först, annars skulle OpenLayers klampa 65535 till den mörkaste färgen.
 */
export function kontinuerligStil(skala: number, min: number, max: number, nodata = 65535): Style {
  const hog = max > min ? max : min + 1e-6;
  const steg = [0, 2, 4, 6, 8].map((i) => ogenomskinlig(YLGNBU[i]));
  const skalan: unknown[] = ['interpolate', ['linear'], ['/', ['band', 1], skala]];
  steg.forEach((f, i) => skalan.push(min + ((hog - min) * i) / (steg.length - 1), f));
  return { color: ['case', ['==', ['band', 1], nodata], GENOMSKINLIG, skalan] as Style['color'] };
}

/** Färgerna i legenden: de färgade klasserna i värdeordning med samma färg som i kartan. */
export function legendfarger(klasser: Klass[]): { klass: Klass; rgb: string }[] {
  const fargade = klasser.filter((k) => k.farg).sort((a, b) => a.varde - b.varde);
  return fargade.map((klass, i) => {
    const [r, g, b] = klassfarg(i, fargade.length);
    return { klass, rgb: `rgb(${r} ${g} ${b})` };
  });
}

/** Den kontinuerliga skalans fem steg som CSS-färger, från 0 till 1. */
export const KONTINUERLIGA_STEG = [0, 2, 4, 6, 8].map((i) => `rgb(${YLGNBU[i].join(' ')})`);
