import { afterAll, beforeAll, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { startaRangeServer } from './range-server';

const FIXTURES = fileURLToPath(new URL('./fixtures', import.meta.url));
let server: Awaited<ReturnType<typeof startaRangeServer>>;

beforeAll(async () => {
  server = await startaRangeServer(FIXTURES);
});
afterAll(async () => {
  await server.stang();
});

it('svarar 206 med Content-Range och CORS-huvuden på en byte-range', async () => {
  const svar = await fetch(`${server.url}/test_klassad.tif`, { headers: { Range: 'bytes=0-15' } });
  expect(svar.status).toBe(206);
  const kropp = new Uint8Array(await svar.arrayBuffer());
  expect(kropp.length).toBe(16);
  expect([[73, 73, 42, 0], [73, 73, 43, 0]]).toContainEqual(Array.from(kropp.slice(0, 4)));
  expect(svar.headers.get('content-range')).toMatch(/^bytes 0-15\/\d+$/);
  expect(svar.headers.get('accept-ranges')).toBe('bytes');
  expect(svar.headers.get('access-control-allow-origin')).toBe('*');
  expect(svar.headers.get('access-control-expose-headers')).toContain('Content-Range');
});

it('svarar 200 med hela filen utan Range', async () => {
  const svar = await fetch(`${server.url}/test_klassad.tif`);
  expect(svar.status).toBe(200);
  expect((await svar.arrayBuffer()).byteLength).toBe(Number(svar.headers.get('content-length')));
});

it('svarar 404 för en fil som saknas och 403 utanför roten', async () => {
  expect((await fetch(`${server.url}/saknas.tif`)).status).toBe(404);
  expect((await fetch(`${server.url}/..%2frange-server.ts`)).status).toBe(403);
});
