import { describe, expect, it } from 'vitest';
import { franUrl, tillUrl, type Lage } from '../src/lib/permalank';
import { tolkaRutt } from '../src/lib/rutt';

const LAGE: Lage = { x: 613287.4, y: 6636712.6, upp: 37.12345, v: 2, lager: 'kontinuerlig', bakgrund: 'ingen', opacitet: 0.45, lang: 'en' };

describe('permalänk', () => {
  it('tur och retur för alla fält, med avrundning', () => {
    const hash = tillUrl('torsk-test', LAGE);
    const r = tolkaRutt(hash);
    expect(r.vy).toBe('karta');
    expect(r.id).toBe('torsk-test');
    expect(franUrl(r.q)).toEqual({ ...LAGE, x: 613287, y: 6636713, upp: 37.1 });
  });

  it('standardvärden skrivs inte ut', () => {
    const hash = tillUrl('a-1', { x: 1, y: 2, upp: 25, lager: 'klassad', bakgrund: 'carto', opacitet: 1, lang: 'sv' });
    expect(hash).toBe('#/karta/a-1?x=1&y=2&upp=25');
  });

  it('ogiltiga värden hoppas över', () => {
    const q = new URLSearchParams('x=abc&y=6600000&upp=-3&v=0&lager=x&bakgrund=y&opacitet=7&lang=fi');
    expect(franUrl(q)).toEqual({ y: 6600000 });
  });

  it('upp avrundas till tre värdesiffror', () => {
    expect(franUrl(tolkaRutt(tillUrl('a', { ...LAGE, upp: 0.123456 })).q).upp).toBe(0.123);
    expect(franUrl(tolkaRutt(tillUrl('a', { ...LAGE, upp: 4567.8 })).q).upp).toBe(4570);
  });
});
