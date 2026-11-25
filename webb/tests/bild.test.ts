import { expect, it, vi } from 'vitest';
import type Map from 'ol/Map.js';
import { sparaSomBild } from '../src/lib/bild';

it('sparaSomBild ger upp efter tidsgränsen när kartan aldrig blir klar', async () => {
  const lyssnare: unknown[] = [];
  const karta = {
    once: (_typ: string, f: unknown) => lyssnare.push(f),
    un: (_typ: string, f: unknown) => lyssnare.splice(lyssnare.indexOf(f), 1),
    renderSync: () => {},
  } as unknown as Map;
  await expect(sparaSomBild(karta, { titel: 't', roll: 'klassad', klasser: [], enhet: '' }, 'a', 50)).rejects.toThrow(
    'Tidsgränsen',
  );
  expect(lyssnare).toHaveLength(0);
});

it('sparaSomBild ritar inte efter tidsgränsen när typsnitten laddas långsamt', async () => {
  const lyssnare: unknown[] = [];
  let renderingar = 0;
  const karta = {
    once: (_typ: string, f: unknown) => lyssnare.push(f),
    un: (_typ: string, f: unknown) => lyssnare.splice(lyssnare.indexOf(f), 1),
    renderSync: () => (renderingar += 1),
  } as unknown as Map;
  const fonts = { load: () => new Promise((klar) => setTimeout(klar, 80)) };
  vi.stubGlobal('document', { fonts });
  try {
    await expect(sparaSomBild(karta, { titel: 't', roll: 'klassad', klasser: [], enhet: '' }, 'a', 20)).rejects.toThrow(
      'Tidsgränsen',
    );
    await new Promise((klar) => setTimeout(klar, 150));
    expect(lyssnare).toHaveLength(0);
    expect(renderingar).toBe(0);
  } finally {
    vi.unstubAllGlobals();
  }
});
