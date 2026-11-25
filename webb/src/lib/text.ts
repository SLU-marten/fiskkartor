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
  alla_kartor: { sv: 'Alla kartor', en: 'All maps' },
  traffar: { sv: 'Träffar', en: 'Results' },
  visa_lager: { sv: 'Visa', en: 'Show' },
  lager_klassad: { sv: 'Klassad', en: 'Classified' },
  lager_kontinuerlig: { sv: 'Kontinuerlig', en: 'Continuous' },
  opacitet: { sv: 'Opacitet', en: 'Opacity' },
  bakgrundskarta: { sv: 'Bakgrundskarta', en: 'Background map' },
  bakgrund_carto: { sv: 'CARTO', en: 'CARTO' },
  bakgrund_ingen: { sv: 'Ingen', en: 'None' },
  laddar_karta: { sv: 'Laddar kartan …', en: 'Loading the map …' },
  kartfil_fel: {
    sv: 'Kartfilen kunde inte hämtas. Ladda om sidan eller försök igen senare.',
    en: 'The map file could not be loaded. Reload the page or try again later.',
  },
  karta_finns_inte: { sv: 'Kartan finns inte', en: 'Map not found' },
  karta_finns_inte_text: {
    sv: 'Det finns ingen karta med den adressen. Den kan ha bytt namn, eller så är länken fel.',
    en: 'There is no map at this address. It may have been renamed, or the link is wrong.',
  },
  till_alla_kartor: { sv: 'Till alla kartor', en: 'To all maps' },
  varde_under_pekaren: { sv: 'Värde under pekaren', en: 'Value under the pointer' },
  legend: { sv: 'Teckenförklaring', en: 'Legend' },
  sannolikhet: { sv: 'Sannolikhet', en: 'Probability' },
  om_kartan: { sv: 'Om kartan', en: 'About the map' },
  citera: { sv: 'Citera kartan', en: 'Cite the map' },
  kopiera_citering: { sv: 'Kopiera citering', en: 'Copy citation' },
  kopierad: { sv: 'Kopierad', en: 'Copied' },
  kopiera_fel: { sv: 'Kunde inte kopiera. Markera texten och kopiera den själv.', en: 'Could not copy. Select the text and copy it yourself.' },
  ladda_ned: { sv: 'Ladda ned', en: 'Download' },
  klassad_karta: { sv: 'Klassad karta', en: 'Classified map' },
  kontinuerlig_karta: { sv: 'Kontinuerlig karta', en: 'Continuous map' },
  metadata_json: { sv: 'Metadata (JSON)', en: 'Metadata (JSON)' },
  metadata_text: { sv: 'Metadata (text)', en: 'Metadata (text)' },
  original_info: {
    sv: 'Kartfilerna laddas ned som de publicerades, i sitt eget koordinatsystem',
    en: 'The map files are downloaded as published, in their own coordinate system',
  },
  versioner: { sv: 'Versioner', en: 'Versions' },
  inte_aktuell: {
    sv: 'Kartan är inte längre aktuell. Den finns kvar här så att länkar och citeringar fungerar.',
    en: 'This map is no longer current. It remains here so that links and citations keep working.',
  },
  nyare_version: { sv: 'Det finns en nyare version av kartan.', en: 'There is a newer version of this map.' },
  kopiera_lank: { sv: 'Kopiera länk till vyn', en: 'Copy link to this view' },
  spara_bild: { sv: 'Spara som bild', en: 'Save as image' },
  bild_utan_bakgrund: {
    sv: 'Bakgrundskartan tillåter inte export – sparar utan bakgrund',
    en: 'The background map does not allow export – saving without it',
  },
  bild_fel: { sv: 'Bilden kunde inte sparas. Försök igen.', en: 'The image could not be saved. Try again.' },
  kartdata: { sv: 'Kartdata', en: 'Map data' },
  visas_nu: { sv: 'visas nu', en: 'shown now' },
  oversiktsvarde: { sv: 'Översiktsvärde – zooma in för exakt värde', en: 'Overview value – zoom in for the exact value' },
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

/** "Visa version 2" / "Show version 2". */
export function visaVersion(n: number, lang: Sprak): string {
  return lang === 'en' ? `Show version ${n}` : `Visa version ${n}`;
}
