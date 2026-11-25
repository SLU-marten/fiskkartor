import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Karta } from '../src/lib/katalog';
import { citeringstext, nedladdningsnamn, versionslank } from '../src/lib/citering';
import { metadataSomText } from '../src/lib/metadatatext';

const las = (id: string, projekt: string): Karta =>
  JSON.parse(readFileSync(new URL(`./fixtures/data/kartor/${projekt}/${id}/metadata.json`, import.meta.url), 'utf8'));
const TORSK = las('torsk-test', 'nmk');
const PBS = las('pbs-test', 'panbalticscope');
const IDAG = new Date('2026-11-25T12:00:00');

describe('versionslank', () => {
  it('bara karta och version, ingen kartvy', () => {
    expect(versionslank('https://slu-marten.github.io/fiskkartor/', 'torsk-test', 1)).toBe(
      'https://slu-marten.github.io/fiskkartor/#/karta/torsk-test?v=1',
    );
  });
});

describe('citeringstext', () => {
  const lank = versionslank('https://x.se/', 'torsk-test', 1);
  it('svensk citering', () => {
    expect(citeringstext(TORSK, TORSK.versioner[0], lank, IDAG, 'sv')).toBe(
      'Testsson m fl 2021. Torsk större än 20 cm, uppväxt, västkusten (test) (2021), version 1. SLU Aqua. ' +
        'https://x.se/#/karta/torsk-test?v=1 (hämtad 2026-11-25).',
    );
  });
  it('engelsk citering', () => {
    expect(citeringstext(PBS, PBS.versioner[1], 'L', IDAG, 'en')).toBe(
      'Test et al. 2024. Perch spawning, Baltic Sea (test) (2024), version 2. SLU Aqua. L (retrieved 2026-11-25).',
    );
  });
  it('en citering som slutar med punkt ger inte två punkter', () => {
    const k = { ...TORSK, citering: 'Testsson m fl 2021. ' };
    expect(citeringstext(k, TORSK.versioner[0], 'L', IDAG, 'sv')).toMatch(/^Testsson m fl 2021\. Torsk/);
    expect(citeringstext(k, TORSK.versioner[0], 'L', IDAG, 'sv')).not.toContain('..');
  });
});

describe('nedladdningsnamn', () => {
  it('beskrivande filnamn med id och version', () => {
    expect(nedladdningsnamn('torsk-test', 1, 'klassad')).toBe('torsk-test_v1_klassad.tif');
    expect(nedladdningsnamn('torsk-test', 1, 'kontinuerlig')).toBe('torsk-test_v1_kontinuerlig.tif');
    expect(nedladdningsnamn('pbs-test', 2, 'metadata.json')).toBe('pbs-test_v2_metadata.json');
    expect(nedladdningsnamn('pbs-test', 2, 'metadata.txt')).toBe('pbs-test_v2_metadata.txt');
  });
});

describe('metadataSomText', () => {
  it('alla ifyllda fält, filerna med hash och klasserna, med svenska etiketter', () => {
    const text = metadataSomText(TORSK, TORSK.versioner[0], 'sv');
    expect(text).toContain('Torsk större än 20 cm, uppväxt, västkusten (test)');
    expect(text).toContain('Kvalitet: Testdata med kända värden.');
    expect(text).toContain('Rödlistan: Starkt hotad (EN)');
    expect(text).not.toContain('Fiskbarometern');
    expect(text).toContain('Licens: CC BY 4.0');
    expect(text).toContain(`SHA-256: ${TORSK.versioner[0].klassad.sha256}`);
    expect(text).toContain('5 = Viktigt');
    expect(text).toContain('EPSG:3006, 25 m');
    expect(text).toContain('Version 1, publicerad 2026-11-01');
  });
  it('engelska etiketter', () => {
    const text = metadataSomText(PBS, PBS.versioner[1], 'en');
    expect(text).toContain('Quality: Test data in English.');
    expect(text).toContain('Version 2, published 2026-11-25');
    expect(text).toContain('0 = Ej viktigt område (not coloured)');
  });
});
