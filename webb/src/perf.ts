// Prestandasida: visar en COG utan bakgrundskarta och mäter rendering.
// perf.html?cog=<url>&roll=klassad|kontinuerlig&epsg=<n>&res=<m>[&lon=&lat=&z=]
import Map from 'ol/Map.js';
import DragPan from 'ol/interaction/DragPan.js';
import { defaults as standardInteraktioner } from 'ol/interaction/defaults.js';
import View from 'ol/View.js';
import { fromLonLat, toLonLat, transform, transformExtent } from 'ol/proj.js';
import type { Coordinate } from 'ol/coordinate.js';
import { registreraProjektioner } from './karta/projektioner';
import { klassadStil, kontinuerligStil, type Klass } from './karta/stil';
import { markUpplosning, skapaCogLager } from './karta/lager';

declare global {
  interface Window {
    __perf: {
      rendercomplete: number;
      /** performance.now() vid senast räknade rendercomplete */
      senast: number;
      /** performance.now() när musknappen senast släpptes */
      slapp: number;
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

const lager = skapaCogLager(
  new URL(cog, location.href).href,
  epsg,
  nodata,
  klassad ? klassadStil(STANDARDKLASSER) : kontinuerligStil(SKALA, 0, 1, nodata),
);
const vy = new View({ projection: 'EPSG:3857' });
// Panorering utan glid (kinetic), så att tiden efter en dragning bara mäter hämtning och rendering.
const karta = new Map({
  target: 'karta',
  layers: [lager],
  view: vy,
  controls: [],
  interactions: standardInteraktioner({ dragPan: false }).extend([new DragPan()]),
});

window.__perf = {
  rendercomplete: 0,
  senast: 0,
  slapp: 0,
  pixelFor(x, y, e) {
    return karta.getPixelFromCoordinate(transform([x, y], `EPSG:${e}`, 'EPSG:3857')) as [number, number];
  },
};
// Kartan säger rendercomplete även innan COG-filens huvud är läst (inga rutor väntar ännu).
// Räkna bara när källan är klar, så att mätningen tar med hämtningen av kartdata.
karta.on('rendercomplete', () => {
  if (lager.getSource()?.getState() !== 'ready') return;
  window.__perf.rendercomplete += 1;
  window.__perf.senast = performance.now();
});
document.addEventListener('pointerup', () => (window.__perf.slapp = performance.now()), true);

if (q.has('lon') && q.has('lat') && q.has('z')) {
  vy.setCenter(fromLonLat([Number(q.get('lon')), Number(q.get('lat'))]));
  vy.setZoom(Number(q.get('z')));
} else {
  lager
    .getSource()!
    .getView()
    .then((v) => vy.fit(transformExtent(v.extent!, v.projection!, 'EPSG:3857'), { padding: [16, 16, 16, 16] }));
}

const varde = document.getElementById('varde')!;

function text(data: ArrayLike<number> | null, koordinat: Coordinate): string {
  if (!data || data.length === 0) return '—';
  const v = data[0];
  const alfa = data.length > 1 ? data[data.length - 1] : 1;
  if (alfa === 0 || v === nodata) return '—';
  if (klassad) return STANDARDKLASSER.find((k) => k.varde === v)?.namn ?? '—';
  const lat = toLonLat(koordinat, 'EPSG:3857')[1];
  const ungefar = markUpplosning(vy, lat) > 1.5 * res ? '≈' : '';
  return ungefar + (v / SKALA).toFixed(2);
}

karta.on('pointermove', (e) => {
  const data = lager.getData(e.pixel) as ArrayLike<number> | null;
  varde.textContent = text(data, e.coordinate);
});
