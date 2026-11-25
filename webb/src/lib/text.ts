// Gränssnittets texter på svenska och engelska. Kartornas metadata visas på det språk den är skriven på.
import type { Faltnamn } from './katalog';
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
  hitta_karta: { sv: 'Hitta en fiskkarta', en: 'Find a fish map' },
  sok_etikett: { sv: 'Sök art, område eller projekt', en: 'Search species, area or project' },
  sok_platshallare: { sv: 'Till exempel torsk, Gadus morhua eller Östersjön', en: 'For example cod, Gadus morhua or Baltic' },
  filter_rubrik: { sv: 'Filtrera', en: 'Filter' },
  rensa_filter: { sv: 'Rensa filter', en: 'Clear filters' },
  visa_farre: { sv: 'Visa färre', en: 'Show fewer' },
  inga_traffar: {
    sv: 'Inga kartor matchar. Ta bort ett filter eller ändra sökningen.',
    en: 'No maps match. Remove a filter or change the search.',
  },
  falt_projekt: { sv: 'Projekt', en: 'Project' },
  falt_art: { sv: 'Art', en: 'Species' },
  falt_livsstadium: { sv: 'Livsstadium', en: 'Life stage' },
  falt_havsomrade: { sv: 'Havsområde', en: 'Sea area' },
  falt_kalla: { sv: 'Källa', en: 'Source' },
  falt_ar: { sv: 'År', en: 'Year' },
  falt_rodlista: { sv: 'Rödlistan', en: 'Red List' },
  falt_fiskbarometern: { sv: 'Fiskbarometern', en: 'Fiskbarometern' },
  falt_livsmiljo: { sv: 'Livsmiljö', en: 'Habitat' },
  falt_simblasa: { sv: 'Simblåsa', en: 'Swim bladder' },
} as const satisfies Record<string, Record<Sprak, string>>;

export type Nyckel = keyof typeof TEXT;

export function t(nyckel: Nyckel, lang: Sprak): string {
  return TEXT[nyckel][lang];
}

/** "1 karta", "3 kartor" / "1 map", "3 maps". */
export function antalKartor(n: number, lang: Sprak): string {
  if (lang === 'en') return `${n} ${n === 1 ? 'map' : 'maps'}`;
  return `${n} ${n === 1 ? 'karta' : 'kartor'}`;
}

/** "Visa alla (31)" / "Show all (31)". */
export function visaAlla(n: number, lang: Sprak): string {
  return lang === 'en' ? `Show all (${n})` : `Visa alla (${n})`;
}

/** Etiketten för ett filterfält. */
export function faltEtikett(f: Faltnamn, lang: Sprak): string {
  return t(`falt_${f}` as Nyckel, lang);
}
