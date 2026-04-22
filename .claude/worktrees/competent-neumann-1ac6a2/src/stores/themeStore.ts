/**
 * ThemeStore - Theme management
 *
 * Manages the active theme for SoundScout.
 * Reads theme from URL parameter on initialization.
 *
 * Usage:
 * - Default: loads 'basis' theme
 * - URL param: ?theme=test-metro loads that theme
 */

import { create } from 'zustand';
import type { Location, Sample } from '../types';
import {
  type ThemeConfig,
  type MapConfig,
  getTheme,
  getDefaultTheme,
  getThemeIdFromUrl,
  DEFAULT_THEME_ID,
} from '../data/themes';

interface ThemeStore {
  /** Active theme ID */
  activeThemeId: string;

  /** Loaded theme config (null before init) */
  theme: ThemeConfig | null;

  /** Whether theme has been initialized */
  isInitialized: boolean;

  /**
   * Initialize theme from URL parameter.
   * Should be called once on app startup.
   */
  initTheme: () => void;

  /**
   * Switch to a different theme.
   * @param id Theme ID to load
   */
  setTheme: (id: string) => void;

  // --- Getters ---

  /** Get all locations from active theme */
  getLocations: () => Location[];

  /** Get all samples from active theme */
  getSamples: () => Sample[];

  /** Get a specific location by ID */
  getLocationById: (id: string) => Location | undefined;

  /** Get a specific sample by ID */
  getSampleById: (id: string) => Sample | undefined;

  /** Get samples for a specific location */
  getSamplesByLocationId: (locationId: string) => Sample[];

  /** Get map configuration */
  getMapConfig: () => MapConfig | undefined;
}

export const useThemeStore = create<ThemeStore>()((set, get) => ({
  activeThemeId: DEFAULT_THEME_ID,
  theme: null,
  isInitialized: false,

  initTheme: () => {
    // Only initialize once
    if (get().isInitialized) return;

    const themeId = getThemeIdFromUrl();
    const theme = getTheme(themeId) ?? getDefaultTheme();

    set({
      activeThemeId: themeId,
      theme,
      isInitialized: true,
    });

    // Log theme loading for debugging
    if (import.meta.env.DEV) {
      console.log(`[ThemeStore] Loaded theme: ${themeId}`);
    }
  },

  setTheme: (id: string) => {
    const theme = getTheme(id);
    if (!theme) {
      console.warn(`[ThemeStore] Theme not found: ${id}`);
      return;
    }

    set({
      activeThemeId: id,
      theme,
    });
  },

  // --- Getters ---

  getLocations: () => {
    return get().theme?.locations ?? [];
  },

  getSamples: () => {
    return get().theme?.samples ?? [];
  },

  getLocationById: (id: string) => {
    return get().theme?.locations.find((loc) => loc.id === id);
  },

  getSampleById: (id: string) => {
    return get().theme?.samples.find((s) => s.id === id);
  },

  getSamplesByLocationId: (locationId: string) => {
    return get().theme?.samples.filter((s) => s.locationId === locationId) ?? [];
  },

  getMapConfig: () => {
    return get().theme?.map;
  },
}));
