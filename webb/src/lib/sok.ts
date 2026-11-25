// Sök, filter och förslag på startsidan. Allt sker i webbläsaren över katalogen.
import { FALTNAMN, type Faltnamn, type Karta } from './katalog';

export type Filter = Record<Faltnamn, string[]>;
export type Fasett = { varde: string; antal: number }[];

const sv = new Intl.Collator('sv');

/** Gemener utan diakritiska tecken (å/ä/ö blir a/a/o), med trimmade blanksteg. */
export function normalisera(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim();
}

export function tomtFilter(): Filter {
  return Object.fromEntries(FALTNAMN.map((f) => [f, []])) as unknown as Filter;
}

/** Kartans värde i ett filterfält, som text (null när fältet är tomt). */
export function faltvarde(k: Karta, f: Faltnamn): string | null {
  if (f === 'projekt') return k.projekt;
  if (f === 'kalla') return k.kalla;
  if (f === 'ar') return String(k.ar);
  return k.falt[f] ?? null;
}

function sokbarText(k: Karta): string {
  const f = k.falt;
  return normalisera(
    [k.titel, f.art, f.vetenskapligt_namn, f.livsstadium, f.havsomrade, f.omrade, k.projekt, k.kalla]
      .filter(Boolean)
      .join(' '),
  );
}

/** Kartor där alla ord i `q` finns och som matchar filtret (OCH mellan fält, ELLER inom ett fält). */
export function sok(kartor: Karta[], q: string, filter: Filter): Karta[] {
  const ord = normalisera(q).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return kartor.filter((k) => {
    for (const f of FALTNAMN) {
      const valda = filter[f];
      if (valda.length && !valda.includes(faltvarde(k, f) ?? '')) return false;
    }
    if (!ord.length) return true;
    const text = sokbarText(k);
    return ord.every((o) => text.includes(o));
  });
}

/** Värden och antal per filterfält bland kartorna, vanligast först och sedan i bokstavsordning. */
export function fasetter(kartor: Karta[]): Record<Faltnamn, Fasett> {
  const ut = {} as Record<Faltnamn, Fasett>;
  for (const f of FALTNAMN) {
    const antal = new Map<string, number>();
    for (const k of kartor) {
      const v = faltvarde(k, f);
      if (v) antal.set(v, (antal.get(v) ?? 0) + 1);
    }
    ut[f] = [...antal]
      .map(([varde, n]) => ({ varde, antal: n }))
      .sort((a, b) => b.antal - a.antal || sv.compare(a.varde, b.varde));
  }
  return ut;
}

/** De `max` vanligaste värdena plus alla valda, eller alla när `visaAlla`. */
export function synligaVarden(fasett: Fasett, valda: string[], visaAlla: boolean, max = 8): Fasett {
  if (visaAlla || fasett.length <= max) return fasett;
  const topp = fasett.slice(0, max);
  return [...topp, ...fasett.slice(max).filter((v) => valda.includes(v.varde))];
}

/** Förslag medan man skriver: titlar, artnamn och vetenskapliga namn som innehåller texten. */
export function forslag(kartor: Karta[], q: string, max = 8): string[] {
  const n = normalisera(q);
  if (n.length < 2) return [];
  const kandidater = new Set<string>();
  for (const k of kartor) {
    for (const s of [k.titel, k.falt.art, k.falt.vetenskapligt_namn]) if (s) kandidater.add(s);
  }
  const rang = (s: string): number => {
    const t = normalisera(s);
    if (t.startsWith(n)) return 0;
    if (t.split(/[\s,()–-]+/).some((o) => o.startsWith(n))) return 1;
    return t.includes(n) ? 2 : -1;
  };
  return [...kandidater]
    .map((s) => ({ s, r: rang(s) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || sv.compare(a.s, b.s))
    .slice(0, max)
    .map((x) => x.s);
}

/** Filtret som det står i adressen: ett parameterpar per valt värde, t.ex. art=Torsk&art=Sill. */
export function filterFranQ(q: URLSearchParams): Filter {
  const f = tomtFilter();
  for (const n of FALTNAMN) f[n] = q.getAll(n);
  return f;
}
