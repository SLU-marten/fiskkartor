import { expect, it } from 'vitest';
import { DRAG_GRANS, greppBeslut } from '../src/lib/flik';

it('gränsen för ett svep är 40 px', () => expect(DRAG_GRANS).toBe(40));

it.each([
  [false, -60, true], [true, -60, true], [true, 60, false], [false, 60, false], [false, 0, null], [true, 39, null],
] as const)('greppBeslut(%s, %s) = %s', (uppe, dy, svar) => expect(greppBeslut(uppe, dy)).toBe(svar));
