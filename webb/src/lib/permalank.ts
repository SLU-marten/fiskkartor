// Permanenta länkar till en kartvy: karta, version, lager, centrum, upplösning, bakgrund, opacitet och språk.
import type Map from 'ol/Map.js';
import type { Roll } from './katalog';
import { byggRutt, type Sprak } from './rutt';

export type Lage = {
  x: number;
  y: number;
  upp: number;
  v?: number;
  lager: Roll;
  bakgrund: 'carto' | 'ingen';
  opacitet: number;
  lang: Sprak;
};

const tre = (n: number) => Number(n.toPrecision(3));

/** Vyns centrum (SWEREF 99 TM, m) och upplösning (m per pixel). */
export function kartlage(karta: Map): Pick<Lage, 'x' | 'y' | 'upp'> {
  const vy = karta.getView();
  const [x, y] = vy.getCenter() ?? [0, 0];
  return { x, y, upp: vy.getResolution() ?? 1 };
}

/** Hashen för en vy. x och y avrundas till hela meter, upp till tre värdesiffror; standardvärden utelämnas. */
export function tillUrl(id: string, lage: Lage): string {
  const q = new URLSearchParams();
  if (lage.v !== undefined) q.set('v', String(lage.v));
  if (lage.lager === 'kontinuerlig') q.set('lager', 'kontinuerlig');
  q.set('x', String(Math.round(lage.x)));
  q.set('y', String(Math.round(lage.y)));
  q.set('upp', String(tre(lage.upp)));
  if (lage.bakgrund === 'ingen') q.set('bakgrund', 'ingen');
  if (lage.opacitet < 1) q.set('opacitet', String(Math.round(lage.opacitet * 100) / 100));
  if (lage.lang === 'en') q.set('lang', 'en');
  return byggRutt({ vy: 'karta', id, q });
}

/** Läser de giltiga fälten ur adressen. Det som saknas eller är ogiltigt utelämnas, så standardvärdena gäller. */
export function franUrl(q: URLSearchParams): Partial<Lage> {
  const ut: Partial<Lage> = {};
  const tal = (namn: string) => (q.has(namn) ? Number(q.get(namn)) : Number.NaN);
  const x = tal('x');
  const y = tal('y');
  const upp = tal('upp');
  const v = tal('v');
  const o = tal('opacitet');
  if (Number.isFinite(x)) ut.x = x;
  if (Number.isFinite(y)) ut.y = y;
  if (Number.isFinite(upp) && upp > 0) ut.upp = tre(upp);
  if (Number.isInteger(v) && v >= 1) ut.v = v;
  const lager = q.get('lager');
  if (lager === 'klassad' || lager === 'kontinuerlig') ut.lager = lager;
  const bakgrund = q.get('bakgrund');
  if (bakgrund === 'carto' || bakgrund === 'ingen') ut.bakgrund = bakgrund;
  if (Number.isFinite(o) && o >= 0 && o <= 1) ut.opacitet = o;
  const lang = q.get('lang');
  if (lang === 'sv' || lang === 'en') ut.lang = lang;
  return ut;
}
