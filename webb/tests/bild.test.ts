import { expect, it } from 'vitest';
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
