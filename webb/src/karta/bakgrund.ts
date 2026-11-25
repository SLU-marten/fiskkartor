import TileLayer from 'ol/layer/Tile.js';
import XYZ from 'ol/source/XYZ.js';

const CARTO = 'https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png';
export const CARTO_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, © <a href="https://carto.com/attributions">CARTO</a>';

/** CARTO Positron. Nyckeln läggs bara till när den finns (en webbläsarnyckel, begränsad till portalens adresser). */
export function cartoUrl(nyckel: string): string {
  return nyckel ? `${CARTO}?key=${encodeURIComponent(nyckel)}` : CARTO;
}

/** Bakgrundskartan som lager. className skiljer den från datalagret, t.ex. när kartan sparas som bild. */
export function skapaCarto(nyckel: string): TileLayer<XYZ> {
  return new TileLayer({
    className: 'bakgrund',
    source: new XYZ({ url: cartoUrl(nyckel), crossOrigin: 'anonymous', maxZoom: 20, attributions: CARTO_ATTRIBUTION }),
  });
}
