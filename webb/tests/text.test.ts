import { expect, it } from 'vitest';
import { TEXT, sidtitel, t } from '../src/lib/text';

it('varje text finns på svenska och engelska', () => {
  for (const [nyckel, varde] of Object.entries(TEXT)) {
    expect(varde.sv.trim(), `${nyckel} (sv)`).not.toBe('');
    expect(varde.en.trim(), `${nyckel} (en)`).not.toBe('');
  }
});

it('t ger texten på valt språk', () => {
  expect(t('portalnamn', 'sv')).toBe('Fiskkartor');
  expect(t('portalnamn', 'en')).toBe('Fish maps');
});

it('sidtitel: vyn först, sedan portalens namn', () => {
  expect(sidtitel('Om portalen', 'sv')).toBe('Om portalen – Fiskkartor');
  expect(sidtitel(null, 'en')).toBe('Fish maps');
});
