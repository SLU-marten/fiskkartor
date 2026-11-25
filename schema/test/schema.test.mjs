import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const las = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const schema = las('../katalog.schema.json');
const exempel = las('../exempel/katalog.json');
const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validera = ajv.compile(schema);
const kopia = () => structuredClone(exempel);

test('exempel validerar', () => {
  assert.equal(validera(exempel), true, JSON.stringify(validera.errors));
});

test('id måste vara slug', () => {
  const k = kopia(); k.kartor[0].id = 'Torsk Större';
  assert.equal(validera(k), false);
});

test('klassad krävs', () => {
  const k = kopia(); delete k.kartor[0].versioner[0].klassad;
  assert.equal(validera(k), false);
});

test('kontinuerlig får vara null', () => {
  const k = kopia(); k.kartor[0].versioner[0].kontinuerlig = null;
  assert.equal(validera(k), true, JSON.stringify(validera.errors));
});

test('skala måste vara 1000', () => {
  const k = kopia(); k.kartor[0].versioner[0].kontinuerlig.skala = 1;
  assert.equal(validera(k), false);
});

test('båda hasharna krävs', () => {
  const k = kopia(); delete k.kartor[0].versioner[0].klassad.kallaSha256;
  assert.equal(validera(k), false);
});

test('farg krävs', () => {
  const k = kopia(); delete k.kartor[0].farg;
  assert.equal(validera(k), false);
});

test('format på en version är ett heltal från 1', () => {
  const k = kopia(); k.kartor[0].versioner[0].format = 2;
  assert.equal(validera(k), true, JSON.stringify(validera.errors));
  k.kartor[0].versioner[0].format = 0;
  assert.equal(validera(k), false);
  k.kartor[0].versioner[0].format = 1.5;
  assert.equal(validera(k), false);
});

test('vy3006 kräver fil, sha256 och bytes', () => {
  const k = kopia();
  const f = k.kartor[0].versioner[0].klassad;
  f.vy3006 = { fil: 'kartor/x/v1/visning_3006.tif', sha256: 'c'.repeat(64), bytes: 10 };
  assert.equal(validera(k), true, JSON.stringify(validera.errors));
  delete f.vy3006.sha256;
  assert.equal(validera(k), false);
});
