/**
 * Theme Registry — publieke API voor de rest van de app.
 *
 * Sinds V2 Fase 3 komen thema's uit manifesten (src/themes/, docs/v2/THEMES.md),
 * niet meer uit TypeScript-objecten. Synchrone lezers kijken in het register:
 *  - samenvattingen (`ThemeSummary`) van alle gepubliceerde thema's zijn er altijd
 *    (index in de bundel, ververst van het netwerk);
 *  - een VOLLEDIG thema (`getTheme`) alleen als het geladen is: `basis` altijd,
 *    andere na `loadTheme(id)` (de themeStore doet dat bij `setTheme`/`?theme=`).
 */

import type { ThemeConfig, MapConfig } from './types';
import type { Storyboard } from '../../types';
import { praatplaatImages, isAvailableForStudent } from '../praatplaatImages';
import { storyboards as allStoryboards, getStoryboardsForTheme } from '../storyboards';
import {
  getLoadedTheme,
  getThemeSummaries,
  getThemeSummary,
  loadTheme,
  refreshThemeIndex,
  resolveThemeSummary,
  BUNDLED_THEME_ID,
} from '../../themes/registry';
import type { ThemeSummary, LocationSummary } from '../../themes/mapping';

// Export types
export type { ThemeConfig, MapConfig, LocationPosition, ThemeColors } from './types';
export type { ThemeSummary, LocationSummary };
export { loadTheme, refreshThemeIndex, resolveThemeSummary, getThemeSummary };

/** Default theme ID (used when no URL param or invalid param) */
export const DEFAULT_THEME_ID = BUNDLED_THEME_ID;

/**
 * Het volledige thema, als het geladen is (basis altijd). Voor een thema dat
 * nog niet geladen is: `await loadTheme(id)`. Voor alleen naam/kaart/zichtbaarheid:
 * `getThemeSummary(id)` (altijd synchroon beschikbaar).
 */
export function getTheme(id: string): ThemeConfig | undefined {
  return getLoadedTheme(id);
}

/**
 * Get the default theme (bundled, always available).
 */
export function getDefaultTheme(): ThemeConfig {
  return getLoadedTheme(DEFAULT_THEME_ID)!;
}

/**
 * Valt de huidige datum binnen het seizoensvenster van een thema?
 * Zonder venster (activeFrom/activeUntil ontbreken) is een thema altijd
 * in seizoen. Ondersteunt jaargrens-overlap ('11-15' t/m '01-15').
 */
export function isThemeInSeason(theme: Pick<ThemeConfig, 'activeFrom' | 'activeUntil'>, date: Date = new Date()): boolean {
  const { activeFrom, activeUntil } = theme;
  if (!activeFrom || !activeUntil) return true;

  const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  if (activeFrom <= activeUntil) {
    return mmdd >= activeFrom && mmdd <= activeUntil;
  }
  // Venster over de jaargrens heen (bv. november → januari)
  return mmdd >= activeFrom || mmdd <= activeUntil;
}

/**
 * Resolve the map background image for the active language.
 *
 * The map is the only theme image that deliberately contains text (place labels),
 * so themes may ship a translated variant via `map.backgroundImageByLocale`.
 * Falls back to the default image when a theme has no variant for this language.
 *
 * Always use this instead of reading `theme.map.backgroundImage` directly, otherwise
 * an English session gets the Dutch map.
 */
export function getMapBackgroundImage(
  map: Pick<MapConfig, 'backgroundImage' | 'backgroundImageByLocale'> | undefined,
  language: string,
): string {
  if (!map) return '';
  // 'en-US' -> 'en'
  const lang = language.split('-')[0];
  return map.backgroundImageByLocale?.[lang] ?? map.backgroundImage;
}

/**
 * Alle thema's die een docent aan een vrije-compositie-opdracht kan koppelen.
 * Alleen publieke thema's die in seizoen zijn (verborgen ?theme=-only
 * thema's tellen niet mee).
 */
export function getAssignableThemes(): ThemeSummary[] {
  return getThemeSummaries().filter((theme) => theme.isPublic && isThemeInSeason(theme));
}

/**
 * Docent-kiezers: álle publieke thema's, óók buiten seizoen (seizoensregel
 * 17-7: docenten zien buiten-seizoen materiaal mét badge en beslissen zelf;
 * leerling-kiezers blijven het seizoensfilter volgen via getPublicThemes).
 */
export function getTeacherThemes(): ThemeSummary[] {
  return getThemeSummaries().filter((theme) => theme.isPublic);
}

export interface ThemeSeasonInfo {
  inSeason: boolean;
  /** Maand (1-12) waarin het thema weer opent; null als in seizoen of zonder venster */
  returnsInMonth: number | null;
}

/** Seizoenstatus van een thema, voor badges op docent-materiaal. */
export function getThemeSeasonInfo(themeId: string | null | undefined, date: Date = new Date()): ThemeSeasonInfo {
  const theme = getThemeSummary(themeId);
  if (!theme || isThemeInSeason(theme, date)) {
    return { inSeason: true, returnsInMonth: null };
  }
  return { inSeason: false, returnsInMonth: Number(theme.activeFrom!.slice(0, 2)) };
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

  // Bekend thema (index), of een nog onbekend id dat de themeStore na het
  // verversen van de index opnieuw controleert (resolveThemeSummary)
  if (themeId && getThemeSummary(themeId)) {
    return themeId;
  }

  return DEFAULT_THEME_ID;
}

/**
 * Thema's voor de kiezer: de openbare thema's (binnen seizoen), plus het thema
 * uit een ?theme=-link als dat verborgen of buiten seizoen is. Zo'n link is
 * een bewuste keuze (docent, beheerder die een verborgen thema test); zonder
 * deze aanvulling laadde het thema wel, maar kon de leerling de kaart nooit
 * bereiken, omdat de kiezer het niet toonde (stagingtest 16-11, blok G).
 */
export function getPickerThemes(urlThemeId: string | null): ThemeSummary[] {
  const themes = getPublicThemes();
  if (!urlThemeId || themes.some((th) => th.id === urlThemeId)) return themes;
  const linked = getThemeSummary(urlThemeId);
  return linked ? [linked, ...themes] : themes;
}

/**
 * Get all public themes (for pickers). Respecteert het seizoensvenster:
 * een thema buiten seizoen verschijnt niet in kiezers, maar blijft via
 * ?theme= gewoon werken.
 */
export function getPublicThemes(): ThemeSummary[] {
  return getThemeSummaries().filter((t) => t.isPublic && isThemeInSeason(t));
}

/**
 * Check if a theme ID is valid.
 */
export function isValidTheme(id: string): boolean {
  return !!getThemeSummary(id);
}

/**
 * Alle locaties (volledig, mét hotspots) van de GELADEN thema's, per thema.
 * Voor de locatie-editor (dev): die laadt eerst alle thema's (`loadTheme`).
 */
export function getAllLocationsByTheme(): Array<{ themeId: string; themeName: string; locations: ThemeConfig['locations'] }> {
  return getThemeSummaries()
    .map((summary) => getLoadedTheme(summary.id))
    .filter((theme): theme is ThemeConfig => !!theme)
    .map((theme) => ({ themeId: theme.id, themeName: theme.name, locations: theme.locations }));
}

/**
 * Locatie-samenvattingen (naam, beeld) van ALLE gepubliceerde thema's, per thema —
 * zonder manifesten te laden. Voor de praatplaat-catalogus.
 */
export function getAllLocationSummariesByTheme(): Array<{ themeId: string; themeName: string; locations: LocationSummary[] }> {
  return getThemeSummaries().map((theme) => ({ themeId: theme.id, themeName: theme.name, locations: theme.locations }));
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
 * Is dit thema zichtbaar in kiezers? Verborgen thema's (`isPublic: false`)
 * vallen samen met hun storyboards en praatplaten uit alle kiezers; laden via
 * een lopende opdracht, een bewaarcode of ?theme= blijft werken.
 */
export function isThemeVisible(themeId: string | null | undefined): boolean {
  return !!getThemeSummary(themeId)?.isPublic;
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
    const theme = getThemeSummary(themeId);
    if (!themeId || !theme?.isPublic) continue;
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
      themeName: theme.name,
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
    const theme = getThemeSummary(sb.themeId);
    if (!theme?.isPublic) continue;
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
  if (sb && getThemeSummary(sb.themeId)) {
    return { themeId: sb.themeId, storyboard: sb };
  }

  // Check universele praatplaat-afbeeldingen (id prefix "pp-") — deze hebben
  // géén echte storyboard-entry maar worden on-the-fly opgebouwd.
  if (storyboardId.startsWith('pp-')) {
    const img = praatplaatImages.find((p) => p.id === storyboardId);
    if (img && img.themeId && getThemeSummary(img.themeId)) {
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
    for (const theme of getThemeSummaries()) {
      const location = theme.locations.find((loc) => loc.id === locationId);
      if (location) {
        const themeId = theme.id;
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
