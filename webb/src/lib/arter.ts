// Artsilhuetterna ur Artfaktas bilder (publicering/inst/skript/silhuetter.R, docs/silhuetter.md).
import silhuetter from '../assets/arter/silhuetter.json';

export type Silhuett = { w: number; h: number; d: string };

const SILHUETTER = silhuetter as Record<string, Silhuett>;

// Katalogens artnamn som har en annan bild. Samma tabell finns i publicering/R/silhuetter.R.
const ALIAS: Record<string, string> = { hummer: 'Europeisk hummer', östersjöflundra: 'Skrubbskädda' };

const NYCKLAR = new Map(Object.keys(SILHUETTER).map((k) => [k.toLocaleLowerCase('sv'), k]));

/**
 * Bildens artnamn för katalogens fält `art`: trimmat, delen före första "/", översatt via ALIAS och
 * utan hänsyn till skiftläge. Okänd eller tom art ger null, aldrig en annan art.
 */
export function artnyckel(art: string | null | undefined): string | null {
  const forsta = (art ?? '').split('/')[0].trim().normalize('NFC').toLocaleLowerCase('sv');
  if (!forsta) return null;
  const namn = (ALIAS[forsta] ?? forsta).toLocaleLowerCase('sv');
  return NYCKLAR.get(namn) ?? null;
}

export function silhuettFor(art: string | null | undefined): Silhuett | null {
  const nyckel = artnyckel(art);
  return nyckel ? SILHUETTER[nyckel] : null;
}

/** Sant bara för livsstadiet "vuxen" (skiftläge och blanksteg spelar ingen roll). */
export function arVuxen(livsstadium: string | null | undefined): boolean {
  return (livsstadium ?? '').trim().toLocaleLowerCase('sv') === 'vuxen';
}
