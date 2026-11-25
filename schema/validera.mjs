#!/usr/bin/env node
// Kontrollerar en katalog.json mot katalog.schema.json.
// Användning: node schema/validera.mjs <katalog.json>
// Avslutar med 0 när filen är giltig, annars 1 och Ajv:s fel på stderr.
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const fil = process.argv[2];
if (!fil) {
  console.error('Användning: node schema/validera.mjs <katalog.json>');
  process.exit(2);
}

const schema = JSON.parse(readFileSync(new URL('./katalog.schema.json', import.meta.url), 'utf8'));
const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validera = ajv.compile(schema);

let data;
try {
  data = JSON.parse(readFileSync(fil, 'utf8'));
} catch (e) {
  console.error(`${fil}: kan inte läsa JSON (${e.message})`);
  process.exit(1);
}

if (!validera(data)) {
  console.error(`${fil}: följer inte schemat`);
  console.error(ajv.errorsText(validera.errors, { separator: '\n', dataVar: 'katalog' }));
  process.exit(1);
}
console.log(`${fil}: giltig`);
