import { afterAll, beforeAll, expect, it } from 'vitest';
import { copyFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aktuellVersion, kartfil, kartUrl, lasKatalog, synliga, type Fil } from '../src/lib/katalog';
import { startaRangeServer } from './range-server';

const EXEMPEL = fileURLToPath(new URL('../../schema/exempel/katalog.json', import.meta.url));
let server: Awaited<ReturnType<typeof startaRangeServer>>;

beforeAll(async () => {
  const rot = mkdtempSync(join(tmpdir(), 'katalog-'));
  mkdirSync(join(rot, 'katalog'));
  copyFileSync(EXEMPEL, join(rot, 'katalog', 'katalog.json'));
  server = await startaRangeServer(rot);
});
afterAll(async () => {
  await server.stang();
});

it('lasKatalog läser kartorna från datamappen', async () => {
  const kartor = await lasKatalog(`${server.url}/`);
  expect(kartor).toHaveLength(1);
  expect(kartor[0].id).toBe('berggylta-uppvaxt-vastkusten-2021');
  expect(synliga(kartor)).toHaveLength(1);
  expect(synliga([{ ...kartor[0], visas: false }])).toHaveLength(0);
});

it('lasKatalog ger ett begripligt fel när katalogen saknas', async () => {
  await expect(lasKatalog(`${server.url}/finns-inte/`)).rejects.toThrow('Katalogen kunde inte hämtas (404)');
});

it('kartfil ger visningskopian med EPSG 3006 när den finns, annars originalet', async () => {
  const [karta] = await lasKatalog(`${server.url}/`);
  const v = aktuellVersion(karta);
  expect(kartfil(v.klassad)).toEqual({
    fil: 'kartor/nmk/berggylta-uppvaxt-vastkusten-2021/v1/visning_3006.tif',
    epsg: 3006,
    hash: 'cccccccccccc',
  });
  expect(kartfil(v.kontinuerlig as Fil)).toEqual({
    fil: 'kartor/nmk/berggylta-uppvaxt-vastkusten-2021/v1/radata.tif',
    epsg: 25833,
    hash: 'aaaaaaaaaaaa',
  });
});

it('aktuellVersion ger vald version om den finns, annars den aktuella', async () => {
  const [karta] = await lasKatalog(`${server.url}/`);
  const tva = { ...karta, aktuellVersion: 2, versioner: [karta.versioner[0], { ...karta.versioner[0], version: 2 }] };
  expect(aktuellVersion(tva).version).toBe(2);
  expect(aktuellVersion(tva, 1).version).toBe(1);
  expect(aktuellVersion(tva, 7).version).toBe(2);
});

it('kartUrl lägger filens hash i adressen, så att en omgjord visningskopia aldrig blandas med en cachad', () => {
  expect(kartUrl({ fil: 'kartor/a/v2/visning_3006.tif', epsg: 3006, hash: 'abc123' }, 'https://x.se/fiskkartor/data/')).toBe(
    'https://x.se/fiskkartor/data/kartor/a/v2/visning_3006.tif?h=abc123',
  );
});
