import { describe, expect, it } from 'vitest';
import { dataRot } from '../src/lib/datarot';

const SIDA = 'https://slu-marten.github.io/fiskkartor/index.html?x=1#/karta/torsk';

describe('dataRot', () => {
  it('ger data/ när ?data= saknas eller är tom', () => {
    expect(dataRot('', SIDA)).toBe('data/');
    expect(dataRot('?lang=en', SIDA)).toBe('data/');
    expect(dataRot('?data=', SIDA)).toBe('data/');
  });

  it('behåller en mapp på samma webbplats, relativ eller absolut', () => {
    expect(dataRot('?data=/tests/fixtures/data/', SIDA)).toBe('/tests/fixtures/data/');
    expect(dataRot('?data=data/test/portal/', SIDA)).toBe('data/test/portal/');
    expect(dataRot('?data=https://slu-marten.github.io/annat/', SIDA)).toBe('https://slu-marten.github.io/annat/');
  });

  it('avvisar en annan webbplats och andra protokoll', () => {
    expect(dataRot('?data=https://example.com/data/', SIDA)).toBe('data/');
    expect(dataRot('?data=//example.com/data/', SIDA)).toBe('data/');
    expect(dataRot('?data=http://slu-marten.github.io/data/', SIDA)).toBe('data/');
    expect(dataRot('?data=javascript:alert(1)', SIDA)).toBe('data/');
    expect(dataRot('?data=data:text/plain,x', SIDA)).toBe('data/');
  });
});
