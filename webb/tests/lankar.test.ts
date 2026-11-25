import { describe, expect, it } from 'vitest';
import { doiLank, kontaktLank } from '../src/lib/lankar';

describe('kontaktLank', () => {
  it('e-post blir mailto', () => expect(kontaktLank('SLU-Aqua-fiskkartor@slu.se')).toBe('mailto:SLU-Aqua-fiskkartor@slu.se'));
  it('en webbadress blir en länk', () => expect(kontaktLank('https://www.slu.se/aqua')).toBe('https://www.slu.se/aqua'));
  it('ett namn blir ingen länk', () => expect(kontaktLank('Mårten Erlandsson, SLU Aqua')).toBeNull());
});

describe('doiLank', () => {
  it('ett rent DOI får doi.org framför', () => expect(doiLank('10.1234/abc')).toBe('https://doi.org/10.1234/abc'));
  it('en hel länk används som den är', () => expect(doiLank('https://doi.org/10.1234/abc')).toBe('https://doi.org/10.1234/abc'));
  it('prefixet doi: tas bort', () => expect(doiLank('doi:10.1234/abc')).toBe('https://doi.org/10.1234/abc'));
});
