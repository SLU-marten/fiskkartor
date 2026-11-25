// Värdet under pekaren: text för ett lagrat värde, när det exakta värdet ska hämtas och hämtningen.
import { fromUrl, type GeoTIFF } from 'geotiff';
import proj4 from 'proj4';
import { UTM33 } from '../karta/projektioner';
import type { Klass, Roll } from './katalog';

/** Klassnamn eller sannolikhet med två decimaler. null (nodata) och okända klasser blir "—". */
export function formatera(v: number | null, roll: Roll, klasser: Klass[], skala = 1000): string {
  if (v === null || Number.isNaN(v)) return '—';
  if (roll === 'klassad') return klasser.find((k) => k.varde === v)?.namn ?? '—';
  return (v / skala).toFixed(2);
}

export type VardeLage = 'exakt' | 'hamta' | 'oversikt';

/**
 * Vad pekarvärdet bygger på (beslut vid planeringen av fas 2):
 * - exakt: vyn använder full upplösning, värdet i rutan är exakt;
 * - hamta: upp till fyra gånger dataupplösningen visas översiktsvärdet med ≈ tills det exakta har hämtats;
 * - oversikt: längre ut visas översiktsvärdet med ≈ och inget hämtas. En skärmpixel täcker då
 *   tusentals celler, så en enskild cell är inte det man ser.
 */
export function vardeLage(z: number, maxZ: number, vyUpp: number, dataUpp: number): VardeLage {
  if (z >= maxZ) return 'exakt';
  return vyUpp <= 4 * dataUpp ? 'hamta' : 'oversikt';
}

const filer = new Map<string, Promise<GeoTIFF>>();

function avbruten(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('Förfrågan avbröts', 'AbortError');
}

/**
 * Lagrat värde i full upplösning vid (x, y), givet i koordinatsystemet `epsg`. Läser bara cellens
 * block med HTTP Range; filens huvud hämtas en gång per adress. null utanför rastret och för nodata.
 */
export async function exaktVarde(url: string, x: number, y: number, epsg: number, signal: AbortSignal): Promise<number | null> {
  avbruten(signal);
  let tiff = filer.get(url);
  if (!tiff) {
    tiff = fromUrl(url);
    filer.set(url, tiff);
    tiff.catch(() => filer.delete(url));
  }
  const bild = await (await tiff).getImage(0);
  avbruten(signal);
  const nycklar = bild.getGeoKeys() as { ProjectedCSTypeGeoKey?: number; GeographicTypeGeoKey?: number } | null;
  const filEpsg = nycklar?.ProjectedCSTypeGeoKey ?? nycklar?.GeographicTypeGeoKey;
  if (filEpsg && filEpsg !== epsg) [x, y] = proj4(`EPSG:${epsg}`, `EPSG:${filEpsg}`, [x, y]);
  const [x0, y0] = bild.getOrigin();
  const [rx, ry] = bild.getResolution();
  const kol = Math.floor((x - x0) / rx);
  const rad = Math.floor((y - y0) / ry);
  if (kol < 0 || rad < 0 || kol >= bild.getWidth() || rad >= bild.getHeight()) return null;
  const data = await bild.readRasters({ window: [kol, rad, kol + 1, rad + 1], signal });
  avbruten(signal);
  const v = Number((data[0] as ArrayLike<number>)[0]);
  const nodata = bild.getGDALNoData();
  return nodata !== null && v === nodata ? null : v;
}

/** Koordinater för en punkt i SWEREF 99 TM, i SWEREF 99 TM (hela meter) och WGS84 (fem decimaler). */
export function koordinater(x: number, y: number): { sweref: string; wgs84: string } {
  const [lon, lat] = proj4(UTM33, 'WGS84', [x, y]);
  return {
    sweref: `N ${Math.round(y)}, E ${Math.round(x)}`,
    wgs84: `${lat.toFixed(5)}° N, ${lon.toFixed(5)}° E`,
  };
}
