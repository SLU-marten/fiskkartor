import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { kontrast } from '../src/lib/kontrast';

// Färgerna ur SLU:s profil (stil Hav), som de står i stil.css. Varje par som används för text eller kontroller
// ska klara WCAG 2.1 AA: 4,5:1 för text och 3:1 för kanter på kontroller.
const css = readFileSync(new URL('../src/stil.css', import.meta.url), 'utf8');
const v = Object.fromEntries([...css.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));

it('kontrast räknar som WCAG', () => {
  expect(kontrast('#000000', '#ffffff')).toBeCloseTo(21, 1);
  expect(kontrast('#007681', '#ffffff')).toBeCloseTo(5.37, 1);
});

it.each([
  ['text', 'yta', 4.5], ['text', 'mjuk', 4.5], ['text', 'markering', 4.5], ['text', 'notis', 4.5], ['text', 'sida', 4.5],
  ['dampad', 'yta', 4.5], ['dampad', 'mjuk', 4.5], ['dampad', 'sida', 4.5], ['dampad', 'markering', 4.5],
  ['tema', 'yta', 4.5], ['tema', 'sida', 4.5], ['tema-mork', 'yta', 4.5], ['yta', 'tema', 4.5], ['yta', 'tema-mork', 4.5],
  ['fel', 'fel-yta', 4.5], ['kant', 'yta', 3],
] as const)('%s mot %s klarar %s:1', (a, b, krav) => {
  expect(v[a], a).toBeDefined();
  expect(v[b], b).toBeDefined();
  expect(kontrast(v[a], v[b])).toBeGreaterThanOrEqual(krav);
});
