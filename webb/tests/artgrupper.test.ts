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
