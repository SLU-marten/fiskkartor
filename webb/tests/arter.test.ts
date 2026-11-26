import { expect, it } from 'vitest';
import { artnyckel, arVuxen, silhuettFor } from '../src/lib/arter';

it('artnyckel hittar arten trots skiftläge, blanksteg och snedstreck', () => {
  expect(artnyckel('Torsk')).toBe('Torsk');
  expect(artnyckel(' torsk ')).toBe('Torsk');
  expect(artnyckel('Braxen/björkna')).toBe('Braxen');
  expect(artnyckel('Hummer')).toBe('Europeisk hummer');
  expect(artnyckel('Östersjöflundra')).toBe('Skrubbskädda');
});

it('artnyckel ger null för okänd eller tom art, aldrig en annan art', () => {
  expect(artnyckel('Fisk som inte finns')).toBeNull();
  expect(artnyckel('')).toBeNull();
  expect(artnyckel('  ')).toBeNull();
  expect(artnyckel(null)).toBeNull();
  expect(artnyckel(undefined)).toBeNull();
});

it('silhuettFor ger artens mått och sökväg', () => {
  const s = silhuettFor('Torsk')!;
  expect(s.w).toBeGreaterThan(s.h);
  expect(s.d).toMatch(/^M\d/);
  expect(silhuettFor('Fisk som inte finns')).toBeNull();
});

it('arVuxen gäller bara vuxen', () => {
  expect(arVuxen('Vuxen')).toBe(true);
  expect(arVuxen(' vuxen')).toBe(true);
  for (const s of ['Uppväxt', 'uppväxt', 'Lek', '', null, undefined]) expect(arVuxen(s)).toBe(false);
});
