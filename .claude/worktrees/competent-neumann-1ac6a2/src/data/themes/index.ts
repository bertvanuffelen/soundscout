/**
 * Theme Registry
 *
 * Central registry for all themes in SoundScout.
 * Handles URL parameter detection and theme loading.
 */

import type { ThemeConfig } from './types';
import type { Storyboard } from '../../types';
import { basisTheme } from './basis';
import { winterspelenTheme } from './winterspelen';
import { praatplaatImages, isAvailableForStudent } from '../praatplaatImages';
import { storyboards as allStoryboards, getStoryboardsForTheme } from '../storyboards';

// Export types
export type { ThemeConfig, MapConfig, LocationPosition, ThemeColors } from './types';

/**
 * All available themes.
 * Add new themes here.
 */
const themes: Record<string, ThemeConfig> = {
  basis: basisTheme,
  winterspelen: winterspelenTheme,
};

/** Default theme ID (used when no URL param or invalid param) */
export const DEFAULT_THEME_ID = 'basis';

/**
 * Get a theme by ID.
 */
export function getTheme(id: string): ThemeConfig | undefined {
  return themes[id];
}

/**
 * Get the default theme.
 */
export function getDefaultTheme(): ThemeConfig {
  return themes[DEFAULT_THEME_ID];
}

/**
 * Get theme ID from URL parameter.
 * Falls back to default if param missing or invalid.
 *
 * Usage: ?theme=basis or ?theme=test-metro
 */
export function getThemeIdFromUrl(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_ID;
  }

  const params = new URLSearchParams(window.location.search);
  const themeId = params.get('theme');

  // Validate theme exists
  if (themeId && themes[themeId]) {
    return themeId;
  }

  return DEFAULT_THEME_ID;
}

/**
 * Get all public themes (for future dropdown).
 */
export function getPublicThemes(): ThemeConfig[] {
  return Object.values(themes).filter((t) => t.isPublic);
}

/**
 * Check if a theme ID is valid.
 */
export function isValidTheme(id: string): boolean {
  return id in themes;
}

/**
 * Get all locations across all themes, grouped by theme ID.
 * Used by LocationEditor to populate the dropdown.
 */
export function getAllLocationsByTheme(): Array<{ themeId: string; themeName: string; locations: ThemeConfig['locations'] }> {
  return Object.entries(themes).map(([id, theme]) => ({
    themeId: id,
    themeName: theme.name,
    locations: theme.locations,
  }));
}

/**
 * Get storyboards for a theme (empty array if none).
 * Leest uit de standalone `storyboards`-registry (niet uit `theme.storyboards`).
 */
export function getThemeStoryboards(themeId: string): Storyboard[] {
  return getStoryboardsForTheme(themeId);
}

/** Eén storyboard met de bron-thema erbij (voor cross-theme pickers). */
export interface StoryboardWithTheme {
  themeId: string;
  themeName: string;
  storyboard: Storyboard;
}

/**
 * Alle compositie-afbeeldingen (single-image storyboards) over alle thema's heen.
 * Gebruik in `ImagePickerModal` zodat de leerling direct een afbeelding kiest;
 * het thema (en dus de geluiden) volgt impliciet uit `storyboard.themeId`.
 */
export function getAllCompositionImages(): StoryboardWithTheme[] {
  // Losse compositie-afbeeldingen leven in `praatplaatImages` (los van thema's).
  // Theme-storyboards (single-image of niet) worden hier niet meer meegenomen —
  // multi-image storyboards horen thuis in `getAllMultiImageStoryboards`.
  const result: StoryboardWithTheme[] = [];

  for (const img of praatplaatImages.filter(isAvailableForStudent)) {
    const themeId = img.themeId;
    if (!themeId || !themes[themeId]) continue;
    const virtualStoryboard: Storyboard = {
      id: img.id,
      themeId,
      name: img.nameKey,
      description: '',
      coverImage: img.imageUrl,
      images: [{ id: img.id, url: img.imageUrl, label: img.nameKey }],
    };
    result.push({
      themeId,
      themeName: themes[themeId].name,
      storyboard: virtualStoryboard,
    });
  }

  return result;
}

/**
 * Alle multi-image storyboards over alle thema's heen.
 * Leest uit de standalone `storyboards`-registry. Gebruik in
 * `StoryboardPickerModal`.
 */
export function getAllMultiImageStoryboards(): StoryboardWithTheme[] {
  const result: StoryboardWithTheme[] = [];
  for (const sb of allStoryboards) {
    if (sb.images.length <= 1) continue;
    const theme = themes[sb.themeId];
    if (!theme) continue;
    result.push({ themeId: theme.id, themeName: theme.name, storyboard: sb });
  }
  return result;
}

/**
 * Find a storyboard by ID across all themes.
 * Also supports virtual location storyboards (id format: "location-{locationId}").
 * Used when loading a composition/template that references a storyboardId.
 */
export function findStoryboardById(storyboardId: string): { themeId: string; storyboard: Storyboard } | undefined {
  // Check standalone storyboards registry first
  const sb = allStoryboards.find((s) => s.id === storyboardId);
  if (sb && themes[sb.themeId]) {
    return { themeId: sb.themeId, storyboard: sb };
  }

  // Check universele praatplaat-afbeeldingen (id prefix "pp-") — deze hebben
  // géén echte storyboard-entry maar worden on-the-fly opgebouwd.
  if (storyboardId.startsWith('pp-')) {
    const img = praatplaatImages.find((p) => p.id === storyboardId);
    if (img && img.themeId && themes[img.themeId]) {
      return {
        themeId: img.themeId,
        storyboard: {
          id: img.id,
          themeId: img.themeId,
          name: img.nameKey,
          description: '',
          coverImage: img.imageUrl,
          images: [{ id: img.id, url: img.imageUrl, label: img.nameKey }],
        },
      };
    }
  }

  // Check for virtual location storyboards (e.g. "location-boerderij")
  if (storyboardId.startsWith('location-')) {
    const locationId = storyboardId.slice('location-'.length);
    for (const [themeId, theme] of Object.entries(themes)) {
      const location = theme.locations.find((loc) => loc.id === locationId);
      if (location) {
        return {
          themeId,
          storyboard: {
            id: storyboardId,
            themeId,
            name: location.name,
            description: location.description,
            coverImage: location.backgroundImage,
            images: [{ id: location.id, url: location.backgroundImage, label: location.name }],
          },
        };
      }
    }
  }

  return undefined;
}
