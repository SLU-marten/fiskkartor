import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { fileURLToPath } from 'node:url';
import proj4 from 'proj4';
import { exaktVarde, formatera, koordinater, vardeLage } from '../src/lib/varde';
import { startaRangeServer } from './range-server';

const FIXTURES = fileURLToPath(new URL('./fixtures', import.meta.url));
let server: Awaited<ReturnType<typeof startaRangeServer>>;
beforeAll(async () => {
  server = await startaRangeServer(FIXTURES);
});
afterAll(async () => {
  await server.stang();
});

const PBS = [
  { varde: 0, namn: 'Ej viktigt område', farg: false },
  { varde: 5, namn: 'Viktigt', farg: true },
  { varde: 10, namn: 'Mycket viktigt', farg: true },
];

describe('formatera', () => {
  it('klassnamn, även för ofärgade klasser', () => {
    expect(formatera(0, 'klassad', PBS)).toBe('Ej viktigt område');
    expect(formatera(10, 'klassad', PBS)).toBe('Mycket viktigt');
  });
  it('sannolikhet med två decimaler', () => {
    expect(formatera(754, 'kontinuerlig', [])).toBe('0.75');
    expect(formatera(1000, 'kontinuerlig', [])).toBe('1.00');
  });
  it('nodata och okänd klass ger —', () => {
    expect(formatera(null, 'klassad', PBS)).toBe('—');
    expect(formatera(7, 'klassad', PBS)).toBe('—');
  });
});

describe('vardeLage', () => {
  it('full upplösning är exakt för båda kartorna', () => {
    expect(vardeLage(2, 2, 30, 25, 'klassad')).toBe('exakt');
    expect(vardeLage(2, 2, 30, 25, 'kontinuerlig')).toBe('exakt');
  });
  it('klassad: översiktsvärdet tills man zoomat in fullt, inget hämtas', () => {
    expect(vardeLage(1, 2, 40, 25, 'klassad')).toBe('oversikt');
  });
  it('kontinuerlig: det exakta värdet hämtas upp till 2× originalupplösningen', () => {
    expect(vardeLage(1, 2, 50, 25, 'kontinuerlig')).toBe('hamta');
    expect(vardeLage(0, 2, 50.1, 25, 'kontinuerlig')).toBe('oversikt');
  });
});

describe('exaktVarde', () => {
  it('läser en cell i full upplösning med få anrop', async () => {
    const spion = vi.spyOn(globalThis, 'fetch');
    const v = await exaktVarde(`${server.url}/test_kontinuerlig.tif`, 603762.5, 6597487.5, 3006, new AbortController().signal);
    expect(v).toBe(754);
    expect(spion.mock.calls.length).toBeLessThanOrEqual(3);
    spion.mockRestore();
  });
  it('utanför rastret ger null', async () => {
    expect(await exaktVarde(`${server.url}/test_kontinuerlig.tif`, 500000, 6500000, 3006, new AbortController().signal)).toBeNull();
  });
  it('en avbruten förfrågan avvisas med AbortError', async () => {
    const ac = new AbortController();
    ac.abort();
    await expect(exaktVarde(`${server.url}/test_klassad.tif`, 603762.5, 6597487.5, 3006, ac.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});

describe('koordinater', () => {
  it('SWEREF 99 TM i meter och WGS84 med fem decimaler', () => {
    const k = koordinater(613287.5, 6636712.5);
    expect(k.sweref).toBe('N 6636713, E 613288');
    const [lon, lat] = proj4('+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs', 'WGS84', [613287.5, 6636712.5]);
    expect(k.wgs84).toBe(`${lat.toFixed(5)}° N, ${lon.toFixed(5)}° E`);
  });
});
