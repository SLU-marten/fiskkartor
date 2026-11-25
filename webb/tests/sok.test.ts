import { describe, expect, it } from 'vitest';
import { FALTNAMN, type Faltnamn, type Karta } from '../src/lib/katalog';
import { fasetter, forslag, normalisera, sok, synligaVarden, tomtFilter } from '../src/lib/sok';

function karta(id: string, titel: string, falt: Record<string, string | null>, ovrigt: Partial<Karta> = {}): Karta {
  return {
    id, titel, projekt: 'NMK', kalla: 'Nationell marin kartering (Trål)', citering: 'C', ar: 2021,
    kvalitet: null, licens: 'CC BY 4.0', kontakt: 'a@slu.se', sprak: 'sv', doi: null, farg: 'YlGnBu',
    visas: true, metadata: `kartor/${id}/metadata.json`, falt, aktuellVersion: 1, versioner: [], ...ovrigt,
  };
}

const KARTOR = [
  karta('rodspatta', 'Rödspätta, uppväxt, västkusten', { art: 'Rödspätta', vetenskapligt_namn: 'Pleuronectes platessa', livsstadium: 'uppväxt', havsomrade: 'Västkusten' }),
  karta('torsk-v', 'Torsk, uppväxt, västkusten', { art: 'Torsk', vetenskapligt_namn: 'Gadus morhua', livsstadium: 'uppväxt', havsomrade: 'Västkusten' }),
  karta('torsk-o', 'Torsk, lek, Östersjön', { art: 'Torsk', vetenskapligt_namn: 'Gadus morhua', livsstadium: 'lek', havsomrade: 'Östersjön' }, { projekt: 'PanBalticScope', kalla: 'PanBalticScope', ar: 2024 }),
  karta('abborre', 'Abborre, lek, Östersjön', { art: 'Abborre', vetenskapligt_namn: 'Perca fluviatilis', livsstadium: 'lek', havsomrade: 'Östersjön' }, { projekt: 'PanBalticScope', kalla: 'PanBalticScope', ar: 2024 }),
];
const ids = (k: Karta[]) => k.map((x) => x.id);

describe('normalisera', () => {
  it('tar bort versaler, prickar och ringar', () => {
    expect(normalisera('  Rödspätta Å ')).toBe('rodspatta a');
  });
});

describe('sok', () => {
  it('hittar Rödspätta utan prickar', () => {
    expect(ids(sok(KARTOR, 'rodspatta', tomtFilter()))).toEqual(['rodspatta']);
  });
  it('alla ord ska finnas, i titel, art, vetenskapligt namn eller område', () => {
    expect(ids(sok(KARTOR, 'gadus lek', tomtFilter()))).toEqual(['torsk-o']);
    expect(ids(sok(KARTOR, '', tomtFilter()))).toHaveLength(4);
  });
  it('filter: OCH mellan fält, ELLER inom ett fält', () => {
    const f = { ...tomtFilter(), art: ['Torsk', 'Abborre'], havsomrade: ['Östersjön'] };
    expect(ids(sok(KARTOR, '', f))).toEqual(['torsk-o', 'abborre']);
    expect(ids(sok(KARTOR, '', { ...tomtFilter(), ar: ['2021'] }))).toEqual(['rodspatta', 'torsk-v']);
  });
});

describe('fasetter', () => {
  it('räknar värdena i träffarna, vanligast först', () => {
    const traffar = sok(KARTOR, '', { ...tomtFilter(), livsstadium: ['uppväxt'] });
    const f = fasetter(traffar);
    expect(f.art).toEqual([
      { varde: 'Rödspätta', antal: 1 },
      { varde: 'Torsk', antal: 1 },
    ]);
    expect(f.projekt).toEqual([{ varde: 'NMK', antal: 2 }]);
    expect(f.rodlista).toEqual([]);
    const summa = (n: Faltnamn) => f[n].reduce((s, v) => s + v.antal, 0);
    expect(summa('livsstadium')).toBe(traffar.length);
  });
});

describe('synligaVarden', () => {
  const tolv = Array.from({ length: 12 }, (_, i) => ({ varde: `v${i}`, antal: 12 - i }));
  it('visar de 8 vanligaste, och alla med visaAlla', () => {
    expect(synligaVarden(tolv, [], false)).toHaveLength(8);
    expect(synligaVarden(tolv, [], true)).toHaveLength(12);
  });
  it('ett valt ovanligt värde syns ändå', () => {
    const v = synligaVarden(tolv, ['v11'], false).map((x) => x.varde);
    expect(v).toHaveLength(9);
    expect(v).toContain('v11');
  });
});

describe('forslag', () => {
  it('föreslår titel, art och vetenskapligt namn oberoende av versaler och prickar', () => {
    expect(forslag(KARTOR, 'TORS')).toEqual(['Torsk', 'Torsk, lek, Östersjön', 'Torsk, uppväxt, västkusten']);
    expect(forslag(KARTOR, 'gadu')).toEqual(['Gadus morhua']);
    expect(forslag(KARTOR, 'rödsp')).toEqual(['Rödspätta', 'Rödspätta, uppväxt, västkusten']);
  });
  it('ord som börjar med texten kommer före ord som bara innehåller den', () => {
    expect(forslag(KARTOR, 'ost')[0]).toBe('Abborre, lek, Östersjön');
  });
  it('ingenting för en enda bokstav', () => {
    expect(forslag(KARTOR, 't')).toEqual([]);
  });
});

describe('filterfälten', () => {
  it('Fiskbarometern är inget filter (värdena är långa bedömningstexter)', () => {
    expect(FALTNAMN).not.toContain('fiskbarometern');
    expect(Object.keys(fasetter([]))).not.toContain('fiskbarometern');
  });
});
