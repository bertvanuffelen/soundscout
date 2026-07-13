/**
 * Tests voor het seizoensvenster van thema's (isThemeInSeason).
 *
 * Het venster is 'MM-DD' t/m 'MM-DD', inclusief beide grenzen, met
 * ondersteuning voor jaargrens-overlap (bv. november → januari).
 */

import { describe, it, expect } from 'vitest';
import { isThemeInSeason } from '../index';
import type { ThemeConfig } from '../types';

// Minimale theme-stub — alleen de velden die isThemeInSeason leest
function themeWithWindow(activeFrom?: string, activeUntil?: string): ThemeConfig {
  return {
    id: 'test',
    name: 'themes.test.name',
    description: 'themes.test.description',
    isPublic: true,
    activeFrom,
    activeUntil,
    locations: [],
    samples: [],
    map: { backgroundImage: '', locationPositions: [] },
  };
}

describe('isThemeInSeason', () => {
  it('is altijd in seizoen zonder venster', () => {
    expect(isThemeInSeason(themeWithWindow(), new Date(2026, 5, 15))).toBe(true);
  });

  it('is altijd in seizoen met een half venster (alleen from of until)', () => {
    expect(isThemeInSeason(themeWithWindow('11-15', undefined), new Date(2026, 5, 15))).toBe(true);
    expect(isThemeInSeason(themeWithWindow(undefined, '01-15'), new Date(2026, 5, 15))).toBe(true);
  });

  describe('normaal venster (binnen één kalenderjaar)', () => {
    const winter = themeWithWindow('12-01', '02-28');
    const lente = themeWithWindow('03-01', '05-31');

    it('binnen het venster → true', () => {
      expect(isThemeInSeason(lente, new Date(2026, 3, 15))).toBe(true); // 15 april
    });

    it('op de grenzen → true (inclusief)', () => {
      expect(isThemeInSeason(lente, new Date(2026, 2, 1))).toBe(true);  // 1 maart
      expect(isThemeInSeason(lente, new Date(2026, 4, 31))).toBe(true); // 31 mei
    });

    it('buiten het venster → false', () => {
      expect(isThemeInSeason(lente, new Date(2026, 5, 1))).toBe(false);  // 1 juni
      expect(isThemeInSeason(winter, new Date(2026, 5, 15))).toBe(false); // 15 juni
    });
  });

  describe('venster over de jaargrens (bv. Sinterklaas/winter)', () => {
    const winter = themeWithWindow('11-15', '01-15');

    it('vóór de jaargrens (december) → true', () => {
      expect(isThemeInSeason(winter, new Date(2026, 11, 5))).toBe(true); // 5 december
    });

    it('ná de jaargrens (januari) → true', () => {
      expect(isThemeInSeason(winter, new Date(2027, 0, 10))).toBe(true); // 10 januari
    });

    it('op de grenzen → true (inclusief)', () => {
      expect(isThemeInSeason(winter, new Date(2026, 10, 15))).toBe(true); // 15 november
      expect(isThemeInSeason(winter, new Date(2027, 0, 15))).toBe(true);  // 15 januari
    });

    it('midden in de zomer → false', () => {
      expect(isThemeInSeason(winter, new Date(2026, 6, 1))).toBe(false); // 1 juli
    });
  });
});
