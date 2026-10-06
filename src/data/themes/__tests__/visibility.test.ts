/**
 * Tests voor zichtbaarheid van thema's in kiezers (isPublic).
 *
 * Een verborgen thema (`isPublic: false`) valt samen met zijn storyboards en
 * praatplaten uit álle kiezers, maar blijft laadbaar voor lopende opdrachten,
 * bewaarcodes en ?theme= (besluit 6-10: piraten verborgen tot de geluiden af zijn).
 */

import { describe, it, expect } from 'vitest';
import {
  getAllCompositionImages,
  getAllMultiImageStoryboards,
  getPublicThemes,
  getTeacherThemes,
  getAssignableThemes,
  findStoryboardById,
  getTheme,
  isThemeVisible,
} from '../index';
import { getPraatplaatCatalog } from '../../praatplaatCatalog';
import { storyboards } from '../../storyboards';

describe('zichtbaarheid van thema\'s in kiezers', () => {
  it('toont in de afbeeldingen-kiezer alleen afbeeldingen van zichtbare thema\'s', () => {
    for (const entry of getAllCompositionImages()) {
      expect(isThemeVisible(entry.themeId)).toBe(true);
    }
  });

  it('toont in de storyboard-kiezer alleen storyboards van zichtbare thema\'s', () => {
    for (const entry of getAllMultiImageStoryboards()) {
      expect(isThemeVisible(entry.themeId)).toBe(true);
    }
  });

  it('toont in de praatplaat-catalogus geen afbeeldingen of locaties van verborgen thema\'s', () => {
    for (const entry of getPraatplaatCatalog()) {
      if (entry.themeId === 'general') continue;
      expect(isThemeVisible(entry.themeId)).toBe(true);
    }
  });

  it('houdt de thema-kiezers in lijn met isThemeVisible', () => {
    for (const list of [getPublicThemes(), getTeacherThemes(), getAssignableThemes()]) {
      for (const theme of list) {
        expect(isThemeVisible(theme.id)).toBe(true);
      }
    }
  });

  it('blijft elk geregistreerd storyboard vinden, ook van een verborgen thema (lopende opdrachten)', () => {
    for (const sb of storyboards) {
      expect(findStoryboardById(sb.id)?.storyboard.id).toBe(sb.id);
    }
  });

  it('verbergt piraten, maar het thema blijft laadbaar', () => {
    expect(isThemeVisible('piraten')).toBe(false);
    expect(getTheme('piraten')).toBeDefined();
    expect(getAllMultiImageStoryboards().some((e) => e.themeId === 'piraten')).toBe(false);
    expect(getPraatplaatCatalog().some((e) => e.themeId === 'piraten')).toBe(false);
  });

  it('geeft false voor onbekende of lege thema-ids', () => {
    expect(isThemeVisible(undefined)).toBe(false);
    expect(isThemeVisible(null)).toBe(false);
    expect(isThemeVisible('bestaat-niet')).toBe(false);
  });
});
