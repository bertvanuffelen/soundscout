import { describe, it, expect } from 'vitest';
import { fitContain } from '../fitContain';

describe('fitContain', () => {
  it('vult de hoogte bij een liggend beeld in een breed kader (digibord)', () => {
    expect(fitContain(2000, 800, 16 / 9)).toEqual({ width: 800 * (16 / 9), height: 800 });
  });

  it('vult de breedte bij een liggend beeld in een staand kader (telefoon)', () => {
    const r = fitContain(351, 600, 1920 / 1072);
    expect(r.width).toBe(351);
    expect(r.height).toBeCloseTo(351 / (1920 / 1072), 5);
  });

  it('vult de hoogte bij een staand beeld in een staand kader dat breed genoeg is', () => {
    expect(fitContain(500, 800, 0.5)).toEqual({ width: 400, height: 800 });
  });

  it('past exact bij gelijke verhouding', () => {
    expect(fitContain(1600, 900, 16 / 9)).toEqual({ width: 1600, height: 900 });
  });

  it('geeft 0×0 bij lege of ongeldige invoer', () => {
    expect(fitContain(0, 600, 1.5)).toEqual({ width: 0, height: 0 });
    expect(fitContain(400, 0, 1.5)).toEqual({ width: 0, height: 0 });
    expect(fitContain(400, 600, 0)).toEqual({ width: 0, height: 0 });
    expect(fitContain(400, 600, Number.NaN)).toEqual({ width: 0, height: 0 });
    expect(fitContain(400, 600, Number.POSITIVE_INFINITY)).toEqual({ width: 0, height: 0 });
  });
});
