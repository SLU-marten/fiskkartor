// Startsidans artkort: kartorna samlade per art, med en kort etikett per karta.
import type { Karta } from './katalog';

export type ArtGrupp = {
  nyckel: string;
  /** Kortets rubrik: arten, eller kartans namn för en karta utan art. */
  namn: string;
  latin: string | null;
  art: string | null;
  kartor: { karta: Karta; etikett: string | null }[];
};

const sv = new Intl.Collator('sv');

/** Titeln utan artnamnet i början, med första bokstaven versal ("Torsk vuxen västkusten" → "Vuxen västkusten"). */
function etikett(titel: string, art: string): string {
  const borjar = titel.toLocaleLowerCase('sv').startsWith(art.toLocaleLowerCase('sv'));
  const rest = borjar ? titel.slice(art.length).replace(/^[\s,.:;–-]+/, '') : titel;
  return rest ? rest.charAt(0).toLocaleUpperCase('sv') + rest.slice(1) : titel;
}

/** Grupper per art (utan hänsyn till skiftläge) i bokstavsordning; kartorna i titelordning. */
export function grupperaArter(kartor: Karta[]): ArtGrupp[] {
  const grupper = new Map<string, ArtGrupp>();
  for (const k of kartor) {
    const art = k.falt.art?.trim() || null;
    const nyckel = art ? `art:${art.toLocaleLowerCase('sv')}` : `karta:${k.id}`;
    const g = grupper.get(nyckel) ?? {
      nyckel,
      namn: art ?? k.titel,
      latin: k.falt.vetenskapligt_namn ?? null,
      art,
      kartor: [],
    };
    g.kartor.push({ karta: k, etikett: art ? etikett(k.titel, art) : null });
    grupper.set(nyckel, g);
  }
  const ut = [...grupper.values()].sort((a, b) => sv.compare(a.namn, b.namn));
  for (const g of ut) {
    g.kartor.sort((a, b) => sv.compare(a.karta.titel, b.karta.titel));
    skiljAt(g.kartor);
  }
  return ut;
}

// Etiketter som krockar inom ett kort får årtalet, och krockar de ändå källan och årtalet.
function skiljAt(kartor: ArtGrupp['kartor']) {
  const krockar = (fn: (k: ArtGrupp['kartor'][number]) => string) => {
    const antal = new Map<string, number>();
    for (const k of kartor) if (k.etikett) antal.set(fn(k), (antal.get(fn(k)) ?? 0) + 1);
    return (k: ArtGrupp['kartor'][number]) => !!k.etikett && (antal.get(fn(k)) ?? 0) > 1;
  };
  const samma = krockar((k) => k.etikett!);
  const sammaAr = krockar((k) => `${k.etikett} ${k.karta.ar}`);
  for (const k of kartor) {
    if (!samma(k)) continue;
    k.etikett = sammaAr(k) ? `${k.etikett} (${k.karta.kalla}, ${k.karta.ar})` : `${k.etikett} (${k.karta.ar})`;
  }
}
