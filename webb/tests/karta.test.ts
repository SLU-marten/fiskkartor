import { expect, it } from 'vitest';
import { cartoUrl } from '../src/karta/bakgrund';

it('cartoUrl lägger bara till nyckeln när den finns', () => {
  expect(cartoUrl('')).toBe('https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png');
  expect(cartoUrl('abc')).toBe('https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png?key=abc');
  expect(cartoUrl('a b')).toMatch(/\?key=a%20b$/);
});
