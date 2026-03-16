/**
 * Theme Registry
 *
 * Central registry for all themes in SoundScout.
 * Handles URL parameter detection and theme loading.
 */

import type { ThemeConfig } from './types';
import { basisTheme } from './basis';
import { winterspelenTheme } from './winterspelen';

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
 */
export function getThemeStoryboards(themeId: string): ThemeConfig['storyboards'] {
  return themes[themeId]?.storyboards ?? [];
}

/**
 * Find a storyboard by ID across all themes.
 * Used when loading a composition/template that references a storyboardId.
 */
export function findStoryboardById(storyboardId: string): { themeId: string; storyboard: NonNullable<ThemeConfig['storyboards']>[number] } | undefined {
  for (const [themeId, theme] of Object.entries(themes)) {
    const sb = theme.storyboards?.find((s) => s.id === storyboardId);
    if (sb) return { themeId, storyboard: sb };
  }
  return undefined;
}
