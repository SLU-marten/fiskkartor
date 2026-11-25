import type View from 'ol/View.js';
import WebGLTileLayer, { type Style } from 'ol/layer/WebGLTile.js';
import GeoTIFF from 'ol/source/GeoTIFF.js';

/**
 * Ett kartlager som läser en Cloud-Optimized GeoTIFF direkt med HTTP Range.
 * Värdena lämnas orörda (normalize: false) och ritas utan utjämning (interpolate: false),
 * så att stilen får de lagrade talen och cellgränserna syns skarpt.
 */
export function skapaCogLager(url: string, epsg: number, nodata: number, stil: Style): WebGLTileLayer {
  const source = new GeoTIFF({
    sources: [{ url, nodata }],
    normalize: false,
    interpolate: false,
    projection: `EPSG:${epsg}`,
  });
  return new WebGLTileLayer({ source, style: stil });
}

/** Markupplösning i meter för en Web Mercator-vy vid en viss latitud. */
export function markUpplosning(vy: View, lat: number): number {
  return (vy.getResolution() ?? Number.NaN) * Math.cos((lat * Math.PI) / 180);
}
