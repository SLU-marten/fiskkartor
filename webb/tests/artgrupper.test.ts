import { expect, it } from 'vitest';
import type { Karta } from '../src/lib/katalog';
import { grupperaArter } from '../src/lib/artgrupper';

function karta(id: string, titel: string, art: string | null): Karta {
  return {
    id, titel, projekt: 'NMK', kalla: 'K', citering: 'C', ar: 2021, kvalitet: null, licens: 'CC BY 4.0',
    kontakt: 'a@slu.se', sprak: 'sv', doi: null, farg: 'YlGnBu', visas: true, metadata: `kartor/${id}/metadata.json`,
    falt: { art }, aktuellVersion: 1, versioner: [],
  };
}

const KARTOR = [
  karta('t2', 'Torsk vuxen västkusten', 'Torsk'),
  karta('t1', 'Torsk <20 cm västkusten', 'torsk '),
  karta('t3', 'Torsk större än 20 cm, uppväxt', 'Torsk'),
  karta('b', 'Braxen/björkna uppväxt ostkusten', 'Braxen/björkna'),
  karta('a', 'Perch spawning', 'Abborre'),
  karta('x', 'Trålfångst, en klass', null),
];

it('grupperaArter samlar en arts kartor utan hänsyn till skiftläge och sorterar', () => {
  const g = grupperaArter(KARTOR);
  expect(g.map((x) => x.namn)).toEqual(['Abborre', 'Braxen/björkna', 'Torsk', 'Trålfångst, en klass']);
  const torsk = g.find((x) => x.namn === 'Torsk')!;
  expect(torsk.kartor.map((k) => k.karta.id)).toEqual(['t1', 't3', 't2']);
  expect(torsk.art).toBe('Torsk');
});

it('etiketten är kartans namn utan artnamnet', () => {
  const g = grupperaArter(KARTOR);
  const etiketter = (namn: string) => g.find((x) => x.namn === namn)!.kartor.map((k) => k.etikett);
  expect(etiketter('Torsk')).toEqual(['<20 cm västkusten', 'Större än 20 cm, uppväxt', 'Vuxen västkusten']);
  expect(etiketter('Braxen/björkna')).toEqual(['Uppväxt ostkusten']);
  expect(etiketter('Abborre')).toEqual(['Perch spawning']);
});

it('en karta utan art får ett eget kort med kartans namn', () => {
  const g = grupperaArter(KARTOR).find((x) => x.nyckel === 'karta:x')!;
  expect(g.namn).toBe('Trålfångst, en klass');
  expect(g.art).toBeNull();
  expect(g.kartor[0].etikett).toBeNull();
});

it('etiketter som krockar inom ett kort får årtalet, och annars källan', () => {
  const k1 = { ...karta('g1', 'Gädda uppväxt ostkusten', 'Gädda'), ar: 2021 };
  const k2 = { ...karta('g2', 'Gädda uppväxt ostkusten', 'Gädda'), ar: 2024 };
  const k3 = { ...karta('g3', 'Gädda uppväxt ostkusten', 'Gädda'), ar: 2024, kalla: 'PanBalticScope' };
  const g = grupperaArter([k1, k2]).find((x) => x.namn === 'Gädda')!;
  expect(g.kartor.map((k) => k.etikett)).toEqual(['Uppväxt ostkusten (2021)', 'Uppväxt ostkusten (2024)']);
  const h = grupperaArter([k1, k2, k3]).find((x) => x.namn === 'Gädda')!;
  expect(h.kartor.map((k) => k.etikett).sort()).toEqual([
    'Uppväxt ostkusten (2021)',
    'Uppväxt ostkusten (K, 2024)',
    'Uppväxt ostkusten (PanBalticScope, 2024)',
  ]);
});

it('länknamnet är hela kartnamnet och innehåller etiketten, också när etiketter krockar', () => {
  const k1 = { ...karta('g1', 'Gädda uppväxt ostkusten', 'Gädda'), ar: 2021 };
  const k2 = { ...karta('g2', 'Gädda uppväxt ostkusten', 'Gädda'), ar: 2024 };
  const k3 = { ...karta('g3', 'Gädda uppväxt ostkusten', 'Gädda'), ar: 2024, kalla: 'PanBalticScope' };
  const g = grupperaArter([k1, k2, k3, karta('g4', 'Gädda vuxen', 'Gädda')]).find((x) => x.namn === 'Gädda')!;
  const namn = g.kartor.map((k) => k.namn);
  expect(new Set(namn).size).toBe(4);
  for (const k of g.kartor) expect(k.namn.toLocaleLowerCase('sv')).toContain(k.etikett!.toLocaleLowerCase('sv'));
  expect(g.kartor.find((k) => k.karta.id === 'g4')!.namn).toBe('Gädda vuxen');
  expect(g.kartor.find((k) => k.karta.id === 'g1')!.namn).toBe('Gädda uppväxt ostkusten (2021)');
});

