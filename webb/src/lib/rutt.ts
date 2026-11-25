// Rutter i adressens hash: #/ (start), #/karta/<id> (karta) och #/om. Parametrar efter "?".
// Hashen gör att sidan fungerar som statiska filer utan serverregler.

export type Vy = 'start' | 'karta' | 'om';
export type Rutt = { vy: Vy; id?: string; q: URLSearchParams };
export type Sprak = 'sv' | 'en';

// En avklippt länk (t.ex. "abc%") ska ge "kartan finns inte", inte en krasch.
function avkoda(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function tolkaRutt(hash: string): Rutt {
  const utan = hash.replace(/^#/, '');
  const i = utan.indexOf('?');
  const sokvag = i < 0 ? utan : utan.slice(0, i);
  const q = new URLSearchParams(i < 0 ? '' : utan.slice(i + 1));
  const delar = sokvag.split('/').filter(Boolean);
  if (delar[0] === 'karta' && delar[1]) return { vy: 'karta', id: avkoda(delar[1]), q };
  if (delar[0] === 'om') return { vy: 'om', q };
  return { vy: 'start', q };
}

/** Alltid en ren hash ("#/…"), så att sökvägen och ?data= ligger kvar när den skrivs. */
export function byggRutt(r: Rutt): string {
  const sokvag = r.vy === 'karta' ? `karta/${encodeURIComponent(r.id ?? '')}` : r.vy === 'om' ? 'om' : '';
  const q = r.q.toString();
  return `#/${sokvag}${q ? `?${q}` : ''}`;
}

export function sprak(r: Rutt): Sprak {
  return r.q.get('lang') === 'en' ? 'en' : 'sv';
}

/** En kopia av rutten med ändrade parametrar (null tar bort en parameter). */
export function medParametrar(r: Rutt, andra: Record<string, string | null>): Rutt {
  const q = new URLSearchParams(r.q);
  for (const [k, v] of Object.entries(andra)) {
    if (v === null) q.delete(k);
    else q.set(k, v);
  }
  return { ...r, q };
}

export const RUTT_ANDRAD = 'ruttandrad';

/**
 * Skriver rutten i adressfältet. `ny` för ändringar man vill kunna backa till (filter, språk,
 * en ny karta), `ersatt` för sådant som ändras hela tiden (skrivande, panorering).
 */
export function skrivRutt(r: Rutt, satt: 'ny' | 'ersatt'): void {
  const hash = byggRutt(r);
  if (hash === location.hash) return;
  if (satt === 'ny') history.pushState(null, '', hash);
  else history.replaceState(null, '', hash);
  window.dispatchEvent(new Event(RUTT_ANDRAD));
}
