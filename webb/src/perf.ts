// Prestandasida: visar en COG utan bakgrundskarta och mäter rendering.
// perf.html?cog=<url>&roll=klassad|kontinuerlig&epsg=<n>&res=<m>[&lon=&lat=&z=]
//   [&vy=3857|3006]  vyns projektion (3006 = SWEREF 99 TM, ingen omprojicering av 3006-kartor)
//   [&transition=ms] intoning av nya rutor (portalens standard 0, OpenLayers 250)
//   [&preload=n]     håll n grövre nivåer laddade (portalens standard Infinity, OpenLayers 0)
//   [&reserv=n]      visa som ersättning bara rutor högst n nivåer grövre (portalens standard 1)
//   [&bakgrund=carto] CARTO Positron under kartlagret (nyckel från bygget, VITE_CARTO_NYCKEL, eller &nyckel=)
import Map from 'ol/Map.js';
import DragPan from 'ol/interaction/DragPan.js';
import { defaults as standardInteraktioner } from 'ol/interaction/defaults.js';
import View from 'ol/View.js';
import Attribution from 'ol/control/Attribution.js';
import { fromLonLat, toLonLat, transform, transformExtent } from 'ol/proj.js';
import type { Coordinate } from 'ol/coordinate.js';
import { registreraProjektioner } from './karta/projektioner';
import { klassadStil, kontinuerligStil, type Klass } from './karta/stil';
import { markUpplosning, reservFor, skapaCogLager } from './karta/lager';
import { skapaCarto } from './karta/bakgrund';

declare global {
  interface Window {
    __perf: {
      rendercomplete: number;
      /** performance.now() vid senast räknade rendercomplete */
      senast: number;
      /** performance.now() när musknappen senast släpptes */
      slapp: number;
      vyProjektion: string;
      /** satt när reserv=n är aktivt */
      reserv?: number;
      pixelFor(x: number, y: number, epsg: number): [number, number];
    };
  }
}

const STANDARDKLASSER: Klass[] = [
  { varde: 5, namn: 'Viktigt', farg: true },
  { varde: 10, namn: 'Mycket viktigt', farg: true },
];
const SKALA = 1000;

registreraProjektioner();
const q = new URLSearchParams(location.search);
const cog = q.get('cog');
if (!cog) throw new Error('perf.html behöver ?cog=<url>');
const klassad = (q.get('roll') ?? 'klassad') === 'klassad';
const epsg = Number(q.get('epsg') ?? 3006);
const res = Number(q.get('res') ?? 25);
const nodata = klassad ? 255 : 65535;
const vyProjektion = q.get('vy') === '3006' ? 'EPSG:3006' : 'EPSG:3857';
const tal = (namn: string) => (q.has(namn) ? Number(q.get(namn)) : undefined);

const lager = skapaCogLager(
  new URL(cog, location.href).href,
  epsg,
  nodata,
  klassad ? klassadStil(STANDARDKLASSER) : kontinuerligStil(SKALA, 0, 1, nodata),
  { transition: tal('transition'), preload: tal('preload'), reserv: tal('reserv') },
);
const vy = new View({ projection: vyProjektion });

// CARTO:s nyckel är en webbläsarnyckel, begränsad till portalens adresser hos CARTO.
const cartoNyckel = q.get('nyckel') ?? import.meta.env.VITE_CARTO_NYCKEL ?? '';
const bakgrund = q.get('bakgrund') === 'carto' ? [skapaCarto(cartoNyckel)] : [];
// Panorering utan glid (kinetic), så att tiden efter en dragning bara mäter hämtning och rendering.
const karta = new Map({
  target: 'karta',
  layers: [...bakgrund, lager],
  view: vy,
  controls: bakgrund.length ? [new Attribution({ collapsible: false })] : [],
  interactions: standardInteraktioner({ dragPan: false }).extend([new DragPan()]),
});

window.__perf = {
  rendercomplete: 0,
  senast: 0,
  slapp: 0,
  vyProjektion,
  pixelFor(x, y, e) {
    return karta.getPixelFromCoordinate(transform([x, y], `EPSG:${e}`, vyProjektion)) as [number, number];
  },
};
// Kartan säger rendercomplete även innan COG-filens huvud är läst (inga rutor väntar ännu).
// Räkna bara när källan är klar, så att mätningen tar med hämtningen av kartdata.
window.__perf.reserv = reservFor(lager);

karta.on('rendercomplete', () => {
  if (lager.getSource()?.getState() !== 'ready') return;
  window.__perf.rendercomplete += 1;
  window.__perf.senast = performance.now();
});
document.addEventListener('pointerup', () => (window.__perf.slapp = performance.now()), true);

// Markupplösning i meter: Web Mercator krymper med latituden, SWEREF 99 TM är redan i meter.
const markres = (lat: number) => (vyProjektion === 'EPSG:3857' ? markUpplosning(vy, lat) : (vy.getResolution() ?? NaN));

if (q.has('lon') && q.has('lat') && q.has('z')) {
  const lat = Number(q.get('lat'));
  vy.setCenter(fromLonLat([Number(q.get('lon')), lat], vyProjektion));
  if (vyProjektion === 'EPSG:3857') vy.setZoom(Number(q.get('z')));
  // Samma markupplösning som Web Mercator-zoomen z vid den latituden.
  else vy.setResolution((156543.03392804097 / 2 ** Number(q.get('z'))) * Math.cos((lat * Math.PI) / 180));
} else {
  lager
    .getSource()!
    .getView()
    .then((v) => vy.fit(transformExtent(v.extent!, v.projection!, vyProjektion), { padding: [16, 16, 16, 16] }));
}

const varde = document.getElementById('varde')!;

function text(data: ArrayLike<number> | null, koordinat: Coordinate): string {
  if (!data || data.length === 0) return '—';
  const v = data[0];
  const alfa = data.length > 1 ? data[data.length - 1] : 1;
  if (alfa === 0 || v === nodata) return '—';
  if (klassad) return STANDARDKLASSER.find((k) => k.varde === v)?.namn ?? '—';
  const lat = toLonLat(koordinat, vyProjektion)[1];
  const ungefar = markres(lat) > 1.5 * res ? '≈' : '';
  return ungefar + (v / SKALA).toFixed(2);
}

karta.on('pointermove', (e) => {
  const data = lager.getData(e.pixel) as ArrayLike<number> | null;
  varde.textContent = text(data, e.coordinate);
});
