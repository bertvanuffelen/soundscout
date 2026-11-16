/**
 * ThemeStore - Theme management
 *
 * Manages the active theme for SoundScout.
 * Reads theme from URL parameter on initialization.
 *
 * Usage:
 * - Default: loads 'basis' theme (in de bundel, synchroon)
 * - URL param: ?theme=winterspelen laadt dat thema (manifest, asynchroon)
 *
 * Sinds V2 Fase 3 kan het laden van een thema even duren (manifest ophalen):
 * `initTheme` zet `isInitialized` pas als het thema er is (AppShell toont tot
 * dan "Laden…"), en `setTheme` geeft een Promise die klaar is zodra het nieuwe
 * thema actief is. Voor een thema dat al geladen is gebeurt alles synchroon.
 */

import { create } from 'zustand';
import type { Location, Sample } from '../types';
import {
  type ThemeConfig,
  type MapConfig,
  getTheme,
  getDefaultTheme,
  loadTheme,
  resolveThemeSummary,
  refreshThemeIndex,
  DEFAULT_THEME_ID,
} from '../data/themes';

interface ThemeStore {
  /** Active theme ID */
  activeThemeId: string;

  /** Loaded theme config (null before init) */
  theme: ThemeConfig | null;

  /** Whether theme has been initialized */
  isInitialized: boolean;

  /** Thema-id dat nu geladen wordt (null = niets onderweg) */
  loadingThemeId: string | null;

  /**
   * Initialize theme from URL parameter.
   * Should be called once on app startup. Resolves when the theme is active.
   */
  initTheme: () => Promise<void>;

  /**
   * Switch to a different theme. Resolves when it is active (immediately if
   * already loaded). An unknown or unloadable theme leaves the current one.
   * @param id Theme ID to load
   */
  setTheme: (id: string) => Promise<void>;

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

let initPromise: Promise<void> | null = null;

/** Laatste setTheme-aanvraag; een oudere die later klaar is, wint niet. */
let latestRequest = 0;

export const useThemeStore = create<ThemeStore>()((set, get) => ({
  activeThemeId: DEFAULT_THEME_ID,
  theme: null,
  isInitialized: false,
  loadingThemeId: null,

  initTheme: async () => {
    // Only initialize once
    if (get().isInitialized || initPromise) return initPromise ?? undefined;

    initPromise = (async () => {
      const requested = new URLSearchParams(window.location.search).get('theme');
      // Bekend id → laden; onbekend id → eerst de index verversen (net
      // gepubliceerd thema?), anders het standaardthema (URL-contract)
      const known = requested ? await resolveThemeSummary(requested) : undefined;
      const theme = (known ? await loadTheme(known.id) : undefined) ?? getDefaultTheme();

      // Een setTheme() die intussen al een thema koos, wint
      if (!get().isInitialized) {
        set({ activeThemeId: theme.id, theme, isInitialized: true });
      }
      if (import.meta.env.DEV) {
        console.log(`[ThemeStore] Loaded theme: ${theme.id}`);
      }
      // Lijst van thema's op de achtergrond actualiseren (nieuw/gewijzigd gepubliceerd)
      if (!requested || known) void refreshThemeIndex();
    })();
    return initPromise;
  },

  setTheme: async (id: string) => {
    const request = ++latestRequest;
    const cached = getTheme(id);
    if (cached) {
      set({ activeThemeId: id, theme: cached, isInitialized: true, loadingThemeId: null });
      return;
    }

    set({ loadingThemeId: id });
    const known = await resolveThemeSummary(id);
    const theme = known ? await loadTheme(id) : undefined;
    if (request !== latestRequest) return; // een nieuwere keuze is al gemaakt
    if (!theme) {
      console.warn(`[ThemeStore] Theme not found: ${id}`);
      set({ loadingThemeId: null });
      return;
    }

    set({
      activeThemeId: id,
      theme,
      isInitialized: true,
      loadingThemeId: null,
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
