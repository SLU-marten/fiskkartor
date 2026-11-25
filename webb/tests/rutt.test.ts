import { describe, expect, it } from 'vitest';
import { byggRutt, sprak, tolkaRutt } from '../src/lib/rutt';

describe('tolkaRutt', () => {
  it('läser vy, id och parametrar', () => {
    const r = tolkaRutt('#/karta/torsk-1?lang=en&x=1');
    expect(r.vy).toBe('karta');
    expect(r.id).toBe('torsk-1');
    expect(r.q.get('lang')).toBe('en');
    expect(r.q.get('x')).toBe('1');
    expect(sprak(r)).toBe('en');
  });

  it('tom eller okänd hash ger startsidan på svenska', () => {
    expect(tolkaRutt('').vy).toBe('start');
    expect(tolkaRutt('#').vy).toBe('start');
    expect(tolkaRutt('#/finns-inte').vy).toBe('start');
    expect(sprak(tolkaRutt('#/'))).toBe('sv');
  });

  it('karta utan id ger startsidan', () => {
    expect(tolkaRutt('#/karta/').vy).toBe('start');
  });
});

describe('byggRutt', () => {
  const exempel = [
    '#/',
    '#/?q=r%C3%B6dsp%C3%A4tta&lang=en',
    '#/karta/torsk-1?lang=en&x=1',
    '#/om?lang=en',
    '#/karta/a-1?v=2&lager=kontinuerlig&x=600000&y=6600000&upp=25',
  ];
  it.each(exempel)('tur och retur för %s', (s) => {
    expect(byggRutt(tolkaRutt(s))).toBe(s);
  });

  it('börjar alltid med #, så att sökväg och ?data= ligger kvar', () => {
    expect(byggRutt({ vy: 'om', q: new URLSearchParams() })).toBe('#/om');
    expect(byggRutt({ vy: 'start', q: new URLSearchParams('q=å') })).toBe('#/?q=%C3%A5');
  });
});
