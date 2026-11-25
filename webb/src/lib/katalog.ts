// Katalogens typer (speglar schema/katalog.schema.json) och inläsning.

export type Roll = 'klassad' | 'kontinuerlig';
export type Epsg = 3006 | 3035 | 25833 | 4326 | 3857;
export type Klass = { varde: number; namn: string; farg: boolean };
export type Vy3006 = { fil: string; sha256: string; bytes: number };

export type Fil = {
  fil: string;
  sha256: string;
  kallaSha256: string;
  bytes: number;
  epsg: Epsg;
  upplosning: number;
  vy3006?: Vy3006;
};
export type KlassadFil = Fil & { klasser: Klass[] };
export type KontinuerligFil = Fil & {
  skala: 1000;
  enhet: string;
  min: number;
  max: number;
  p2: number;
  p98: number;
};

export type Version = {
  version: number;
  publicerad: string;
  format?: number;
  klassad: KlassadFil;
  kontinuerlig: KontinuerligFil | null;
};

/** Fälten som går att filtrera på, i den ordning de visas. */
export const FALTNAMN = [
  'projekt',
  'art',
  'livsstadium',
  'havsomrade',
  'kalla',
  'ar',
  'rodlista',
  'fiskbarometern',
  'livsmiljo',
  'simblasa',
] as const;
export type Faltnamn = (typeof FALTNAMN)[number];

export type Karta = {
  id: string;
  titel: string;
  projekt: string;
  kalla: string;
  citering: string;
  ar: number;
  kvalitet: string | null;
  licens: string;
  kontakt: string;
  sprak: 'sv' | 'en';
  doi: string | null;
  farg: string;
  visas: boolean;
  metadata: string;
  falt: Record<string, string | null>;
  aktuellVersion: number;
  versioner: Version[];
};

/** Läser katalog/katalog.json under datamappen (t.ex. "data/"). */
export async function lasKatalog(dataUrl: string): Promise<Karta[]> {
  const url = new URL('katalog/katalog.json', new URL(dataUrl, globalThis.location?.href ?? dataUrl));
  const svar = await fetch(url);
  if (!svar.ok) throw new Error(`Katalogen kunde inte hämtas (${svar.status})`);
  const json = (await svar.json()) as { kartor: Karta[] };
  return json.kartor;
}

/** Kartor som ska synas i listor och sök. Dolda kartor nås bara via sin länk. */
export function synliga(kartor: Karta[]): Karta[] {
  return kartor.filter((k) => k.visas);
}

/** Vald version om den finns, annars kartans aktuella version. */
export function aktuellVersion(k: Karta, v?: number): Version {
  const vald = v === undefined ? undefined : k.versioner.find((x) => x.version === v);
  return vald ?? k.versioner.find((x) => x.version === k.aktuellVersion) ?? k.versioner[k.versioner.length - 1];
}

/**
 * Filen som visas i kartan och dess koordinatsystem, som ett par: visningskopian i SWEREF 99 TM
 * när den finns, annars originalet. Nedladdning använder alltid `fil`.
 */
export function kartfil(f: Fil): { fil: string; epsg: number } {
  return f.vy3006 ? { fil: f.vy3006.fil, epsg: 3006 } : { fil: f.fil, epsg: f.epsg };
}
