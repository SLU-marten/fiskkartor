import { expect, it } from 'vitest';
import View from 'ol/View.js';
import { transform } from 'ol/proj.js';
import proj4 from 'proj4';
import { klassadStil, kontinuerligStil, type Klass } from '../src/karta/stil';
import { markUpplosning } from '../src/karta/lager';
import { registreraProjektioner, TILLATNA_EPSG } from '../src/karta/projektioner';

const PBS: Klass[] = [
  { varde: 0, namn: 'Ej viktigt område', farg: false },
  { varde: 5, namn: 'Viktigt', farg: true },
  { varde: 10, namn: 'Mycket viktigt', farg: true },
];

// Plockar ut färgen för ett klassvärde ur case-uttrycket
function fargFor(stil: ReturnType<typeof klassadStil>, varde: number): number[] {
  const uttryck = stil.color as unknown[];
  for (let i = 1; i < uttryck.length - 1; i += 2) {
    if (JSON.stringify(uttryck[i]) === JSON.stringify(['==', ['band', 1], varde])) return uttryck[i + 1] as number[];
  }
  throw new Error(`ingen färg för ${varde}`);
}
const ljushet = ([r, g, b]: number[]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

it('klassadStil gör ofärgade klasser genomskinliga och mörkare färg för högre värde', () => {
  const stil = klassadStil(PBS);
  expect(JSON.stringify(stil.color)).toContain('["==",["band",1],0],[0,0,0,0]');
  const fem = fargFor(stil, 5);
  const tio = fargFor(stil, 10);
  expect(fem[3]).toBeGreaterThan(0);
  expect(tio[3]).toBeGreaterThan(0);
  expect(ljushet(tio)).toBeLessThan(ljushet(fem));
  const uttryck = stil.color as unknown[];
  expect(uttryck[0]).toBe('case');
  expect(uttryck[uttryck.length - 1]).toEqual([0, 0, 0, 0]);
});

it('kontinuerligStil gör nodata genomskinligt innan färgskalan', () => {
  const stil = kontinuerligStil(1000, 0, 1);
  expect(JSON.stringify(stil.color)).toContain('["==",["band",1],65535],[0,0,0,0]');
  expect(JSON.stringify(stil.color)).toContain('["/",["band",1],1000]');
});

it('markUpplosning ger markens upplösning i meter för en Web Mercator-vy', () => {
  const vy = new View({ center: [0, 0], resolution: 38.22 });
  expect(markUpplosning(vy, 60)).toBeCloseTo(19.11, 2);
});

it('registreraProjektioner ger samma transformation som proj4', () => {
  registreraProjektioner();
  const punkt = [603762.5, 6597487.5];
  const ol = transform(punkt, 'EPSG:3006', 'EPSG:4326');
  const p4 = proj4('EPSG:3006', 'EPSG:4326', punkt);
  expect(Math.abs(ol[0] - p4[0])).toBeLessThan(1e-5);
  expect(Math.abs(ol[1] - p4[1])).toBeLessThan(1e-5);
  expect(ol[1]).toBeGreaterThan(59);
  expect(ol[1]).toBeLessThan(60);
  const laea = transform([4803762.5, 4047487.5], 'EPSG:3035', 'EPSG:4326');
  expect(laea[1]).toBeGreaterThan(55);
  expect(TILLATNA_EPSG).toEqual([3006, 3035, 25833, 4326, 3857]);
});
