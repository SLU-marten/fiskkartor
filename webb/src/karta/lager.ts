import type View from 'ol/View.js';
import WebGLTileLayer, { type Style } from 'ol/layer/WebGLTile.js';
import GeoTIFF from 'ol/source/GeoTIFF.js';

export type LagerVal = { transition?: number; preload?: number; reserv?: number };

/**
 * Ett kartlager som läser en Cloud-Optimized GeoTIFF direkt med HTTP Range.
 * Värdena lämnas orörda (normalize: false) och ritas utan utjämning (interpolate: false),
 * så att stilen får de lagrade talen och cellgränserna syns skarpt.
 *
 * Lugn zoom (beslut vid kontrollpunkt 1): ingen intoning av nya rutor (transition 0), grövre nivåer
 * hålls laddade (preload Infinity) och ersättningsrutor får vara högst en nivå grövre (reserv 1).
 */
export function skapaCogLager(url: string, epsg: number, nodata: number, stil: Style, val: LagerVal = {}): WebGLTileLayer {
  const source = new GeoTIFF({
    sources: [{ url, nodata }],
    normalize: false,
    interpolate: false,
    projection: `EPSG:${epsg}`,
    transition: val.transition ?? 0,
  });
  const lager = new WebGLTileLayer({ source, style: stil, preload: val.preload ?? Infinity });
  begransaReserv(lager, val.reserv ?? 1);
  return lager;
}

/**
 * Medan skarpa rutor laddas visar OpenLayers en grövre nivå förstorad, hur grov som helst. Grova
 * översikter täcker mycket mer yta (en cell har värde om någon undercell har det), så kartan sväller
 * och krymper. Här begränsas ersättningen till n nivåer grövre; resten lämnas tomt tills det laddats.
 * findAltTiles_ är intern i OpenLayers: finns den inte görs ingen begränsning (och svaret blir undefined).
 */
export function begransaReserv(lager: WebGLTileLayer, n: number): number | undefined {
  const renderare = lager.getRenderer() as unknown as {
    findAltTiles_?: (grid: unknown, koord: number[], altZ: number, uppslag: unknown) => boolean;
  };
  const original = renderare.findAltTiles_;
  if (typeof original !== 'function') return undefined;
  renderare.findAltTiles_ = (grid, koord, altZ, uppslag) =>
    altZ < koord[0] - n ? false : original.call(renderare, grid, koord, altZ, uppslag);
  (lager as unknown as { reserv?: number }).reserv = n;
  return n;
}

/** Ersättningsgränsen som satts på lagret (undefined om OpenLayers saknar den interna funktionen). */
export function reservFor(lager: WebGLTileLayer): number | undefined {
  return (lager as unknown as { reserv?: number }).reserv;
}

/** Markupplösning i meter för en Web Mercator-vy vid en viss latitud. */
export function markUpplosning(vy: View, lat: number): number {
  return (vy.getResolution() ?? Number.NaN) * Math.cos((lat * Math.PI) / 180);
}
