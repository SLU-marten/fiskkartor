// Gränssnittets texter på svenska och engelska. Kartornas metadata visas på det språk den är skriven på.
import type { Sprak } from './rutt';

export const TEXT = {
  portalnamn: { sv: 'Fiskkartor', en: 'Fish maps' },
  undertitel: {
    sv: 'Viktiga områden för fisk i svenska hav och kustvatten – SLU Aqua',
    en: 'Important areas for fish in Swedish seas and coastal waters – SLU Aqua',
  },
  byt_sprak: { sv: 'In English', en: 'På svenska' },
  meny_start: { sv: 'Kartor', en: 'Maps' },
  meny_om: { sv: 'Om portalen', en: 'About' },
  laddar_katalog: { sv: 'Hämtar kartkatalogen …', en: 'Loading the map catalogue …' },
  katalog_fel: { sv: 'Kartkatalogen kunde inte hämtas.', en: 'The map catalogue could not be loaded.' },
  forsok_igen: { sv: 'Försök igen', en: 'Try again' },
  kontakt: { sv: 'Frågor', en: 'Questions' },
} as const satisfies Record<string, Record<Sprak, string>>;

export type Nyckel = keyof typeof TEXT;

export function t(nyckel: Nyckel, lang: Sprak): string {
  return TEXT[nyckel][lang];
}
