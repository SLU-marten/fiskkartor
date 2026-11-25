import type { Style } from 'ol/layer/WebGLTile.js';

/** En klass ur katalog.json: värde i rastret, namn i legenden och om den ska färgas. */
export type Klass = { varde: number; namn: string; farg: boolean };

type Farg = [number, number, number, number];

type Rgb = [number, number, number];

/** SLU:s havsskala ur färgpaletten: Himmel, Turkos, Havsvik och Havsdjup, från ljust till mörkt. */
export const HAVSSKALA: Rgb[] = [
  [106, 209, 227],
  [0, 176, 185],
  [0, 118, 129],
  [0, 72, 81],
];

const GENOMSKINLIG: Farg = [0, 0, 0, 0];
const ogenomskinlig = ([r, g, b]: Rgb): Farg => [r, g, b, 1];

// Klasserna använder Turkos → Havsvik → Havsdjup. Himmel är för ljus mot havet i bakgrundskartan.
const KLASSKALA = HAVSSKALA.slice(1);

function langs(skala: Rgb[], t: number): Rgb {
  const pos = t * (skala.length - 1);
  const i = Math.min(Math.floor(pos), skala.length - 2);
  const f = pos - i;
  return skala[i].map((v, k) => Math.round(v + (skala[i + 1][k] - v) * f)) as Rgb;
}

/** Färgerna för n färgade klasser i värdeordning. En klass blir Havsdjup, två Turkos och Havsdjup. */
export function klassfarger(n: number): Rgb[] {
  if (n === 1) return [KLASSKALA[KLASSKALA.length - 1]];
  return Array.from({ length: n }, (_, i) => langs(KLASSKALA, i / (n - 1)));
}

/** Klassad karta: varje färgad klass får en färg ur havsskalan i värdeordning; ofärgade klasser och nodata blir genomskinliga. */
export function klassadStil(klasser: Klass[]): Style {
  const fargade = klasser.filter((k) => k.farg).sort((a, b) => a.varde - b.varde);
  const uttryck: unknown[] = ['case'];
  for (const k of klasser) {
    if (!k.farg) uttryck.push(['==', ['band', 1], k.varde], GENOMSKINLIG);
  }
  const farger = klassfarger(fargade.length);
  fargade.forEach((k, i) => uttryck.push(['==', ['band', 1], k.varde], ogenomskinlig(farger[i])));
  uttryck.push(GENOMSKINLIG);
  return { color: uttryck as Style['color'] };
}

/**
 * Kontinuerlig karta: lagrat värde / skala tolkas som 0–1 och färgas längs havsskalan mellan min och max.
 * Nodata fångas först, annars skulle OpenLayers klampa 65535 till den mörkaste färgen.
 */
export function kontinuerligStil(skala: number, min: number, max: number, nodata = 65535): Style {
  const hog = max > min ? max : min + 1e-6;
  const steg = HAVSSKALA.map(ogenomskinlig);
  const skalan: unknown[] = ['interpolate', ['linear'], ['/', ['band', 1], skala]];
  steg.forEach((f, i) => skalan.push(min + ((hog - min) * i) / (steg.length - 1), f));
  return { color: ['case', ['==', ['band', 1], nodata], GENOMSKINLIG, skalan] as Style['color'] };
}

/** Färgerna i legenden: de färgade klasserna i värdeordning med samma färg som i kartan. */
export function legendfarger(klasser: Klass[]): { klass: Klass; rgb: string }[] {
  const fargade = klasser.filter((k) => k.farg).sort((a, b) => a.varde - b.varde);
  const farger = klassfarger(fargade.length);
  return fargade.map((klass, i) => ({ klass, rgb: `rgb(${farger[i].join(' ')})` }));
}

/** Den kontinuerliga skalans steg som CSS-färger, från 0 till 1. */
export const KONTINUERLIGA_STEG = HAVSSKALA.map((f) => `rgb(${f.join(' ')})`);
