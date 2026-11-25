// Citering och nedladdningsnamn.
import type { Karta, Version } from './katalog';
import type { Sprak } from './rutt';

/** Ren länk till en version av kartan, utan kartvy (centrum, zoom, opacitet). */
export function versionslank(bas: string, id: string, v: number): string {
  return `${bas}#/karta/${encodeURIComponent(id)}?v=${v}`;
}

const datum = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "<citering>. <titel> (<år>), version <n>. SLU Aqua. <länk> (hämtad <ÅÅÅÅ-MM-DD>)." */
export function citeringstext(k: Karta, v: Version, permalank: string, idag: Date, lang: Sprak = 'sv'): string {
  const citering = k.citering.trim().replace(/[.\s]+$/, '');
  const hamtad = lang === 'en' ? 'retrieved' : 'hämtad';
  return `${citering}. ${k.titel} (${k.ar}), version ${v.version}. SLU Aqua. ${permalank} (${hamtad} ${datum(idag)}).`;
}

export type Del = 'klassad' | 'kontinuerlig' | 'metadata.json' | 'metadata.txt';

/** Beskrivande filnamn vid nedladdning, i stället för visning.tif och radata.tif. */
export function nedladdningsnamn(id: string, v: number, del: Del): string {
  const slut = del === 'klassad' || del === 'kontinuerlig' ? `${del}.tif` : del;
  return `${id}_v${v}_${slut}`;
}
