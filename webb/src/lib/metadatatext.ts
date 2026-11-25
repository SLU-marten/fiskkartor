// Kartans metadata som läsbar textfil för nedladdning.
import type { Fil, Karta, Version } from './katalog';
import type { Sprak } from './rutt';

const ETIKETTER = {
  sv: {
    projekt: 'Projekt', kalla: 'Källa', citering: 'Citering', ar: 'År', kvalitet: 'Kvalitet', licens: 'Licens',
    kontakt: 'Kontakt', doi: 'DOI', art: 'Art', vetenskapligt_namn: 'Vetenskapligt namn', livsstadium: 'Livsstadium',
    havsomrade: 'Havsområde', omrade: 'Område', rodlista: 'Rödlistan', fiskbarometern: 'Fiskbarometern',
    simblasa: 'Simblåsa', livsmiljo: 'Livsmiljö', version: 'Version', publicerad: 'publicerad',
    klassad: 'Klassad fil', kontinuerlig: 'Kontinuerlig fil (sannolikhet × 1000)', klasser: 'Klasser',
    ofargad: 'ofärgad', identitet: 'Kart-id',
  },
  en: {
    projekt: 'Project', kalla: 'Source', citering: 'Citation', ar: 'Year', kvalitet: 'Quality', licens: 'Licence',
    kontakt: 'Contact', doi: 'DOI', art: 'Species', vetenskapligt_namn: 'Scientific name', livsstadium: 'Life stage',
    havsomrade: 'Sea area', omrade: 'Area', rodlista: 'Red List', fiskbarometern: 'Fiskbarometern',
    simblasa: 'Swim bladder', livsmiljo: 'Habitat', version: 'Version', publicerad: 'published',
    klassad: 'Classified file', kontinuerlig: 'Continuous file (probability × 1000)', klasser: 'Classes',
    ofargad: 'not coloured', identitet: 'Map id',
  },
} as const;

/** Etikett för ett fält i `falt`, eller undefined för fält portalen inte känner till. */
export function faltetikett(nyckel: string, lang: Sprak): string | undefined {
  return (ETIKETTER[lang] as Record<string, string>)[nyckel];
}

function filrader(rubrik: string, f: Fil): string[] {
  const namn = f.fil.split('/').pop();
  return [`${rubrik}: ${namn}`, `  EPSG:${f.epsg}, ${f.upplosning} m`, `  ${f.bytes} bytes`, `  SHA-256: ${f.sha256}`];
}

export function metadataSomText(k: Karta, v: Version, lang: Sprak): string {
  const e = ETIKETTER[lang];
  const rad = (etikett: string, varde: string | number | null | undefined) =>
    varde === null || varde === undefined || varde === '' ? [] : [`${etikett}: ${varde}`];
  const ut: string[] = [k.titel, '='.repeat(Math.min(k.titel.length, 80)), ''];
  ut.push(...rad(e.identitet, k.id), ...rad(e.projekt, k.projekt), ...rad(e.kalla, k.kalla), ...rad(e.ar, k.ar));
  ut.push(...rad(e.citering, k.citering), ...rad(e.kvalitet, k.kvalitet), ...rad(e.doi, k.doi));
  ut.push(...rad(e.licens, k.licens), ...rad(e.kontakt, k.kontakt));
  for (const [nyckel, varde] of Object.entries(k.falt)) {
    ut.push(...rad(faltetikett(nyckel, lang) ?? nyckel, varde));
  }
  ut.push('', `${e.version} ${v.version}, ${e.publicerad} ${v.publicerad}`);
  ut.push(...filrader(e.klassad, v.klassad));
  ut.push(`  ${e.klasser}:`);
  for (const kl of v.klassad.klasser) ut.push(`    ${kl.varde} = ${kl.namn}${kl.farg ? '' : ` (${e.ofargad})`}`);
  if (v.kontinuerlig) ut.push(...filrader(e.kontinuerlig, v.kontinuerlig));
  return `${ut.join('\n')}\n`;
}
