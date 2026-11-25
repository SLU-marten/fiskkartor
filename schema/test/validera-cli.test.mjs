import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const skript = fileURLToPath(new URL('../validera.mjs', import.meta.url));
const exempel = fileURLToPath(new URL('../exempel/katalog.json', import.meta.url));
const kor = (fil) => spawnSync(process.execPath, [skript, fil], { encoding: 'utf8' });

test('validera.mjs godkänner exemplet', () => {
  assert.equal(kor(exempel).status, 0);
});

test('validera.mjs underkänner en trasig katalog och skriver felen', () => {
  const k = JSON.parse(readFileSync(exempel, 'utf8'));
  k.kartor[0].id = 'Torsk Större';
  const fil = join(mkdtempSync(join(tmpdir(), 'katalog-')), 'katalog.json');
  writeFileSync(fil, JSON.stringify(k));
  const res = kor(fil);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /kartor\/0\/id/);
});
