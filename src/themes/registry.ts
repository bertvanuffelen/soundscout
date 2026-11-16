/**
 * Thema-register (V2 Fase 3): de synchrone kant van het themaplatform.
 *
 *  - Samenvattingen van alle gepubliceerde thema's (voor kiezers, opdrachten,
 *    catalogus): direct beschikbaar uit de index die in de bundel zit, daarna
 *    ververst van het netwerk (`refreshThemeIndex`).
 *  - Volledige thema's: `basis` zit in de bundel (werkt offline en bij het
 *    allereerste bezoek zonder één verzoek); de rest wordt op aanvraag geladen
 *    (`loadTheme`) en daarna synchroon geserveerd (`getLoadedTheme`).
 *  - De teksten uit index en manifest worden als i18n-sleutels geregistreerd,
 *    zodat `t('themes.basis.name')`, `t(sample.name)` enz. exact blijven werken.
 *
 * Bron van de data: één `ThemeRepository` (repository.ts). Vandaag statische
 * bestanden; een Supabase-versie wordt later met `setThemeRepository` ingeplugd.
 */

import { create } from 'zustand';
import i18n from '../i18n';
import type { ThemeConfig } from '../data/themes/types';
import { logger } from '../utils/logger';
import { manifestToSummary, manifestToThemeConfig, themeTextResources, indexEntryToSummary, compareThemes, type ThemeSummary } from './mapping';
import { createStaticThemeRepository, parseIndex, parseManifest, type LoadedManifest, type ThemeRepository } from './repository';
// Kopieën van public/themes/basis/manifest.json en public/themes/index.json,
// geschreven door scripts/export-theme-manifests.mjs (Vite importeert niet uit public/).
import basisManifestJson from './bundled/basis.manifest.json';
import indexSeedJson from './bundled/index.json';

export const THEME_INDEX_URL = '/themes/index.json';
export const BUNDLED_THEME_ID = 'basis';
const BASIS_MANIFEST_URL = '/themes/basis/manifest.json';

// --- Bundel: basis + index-zaadje (geparsed bij het laden van de module) ---

const bundledBasis: LoadedManifest = {
  manifest: parseManifest(basisManifestJson, 'bundel:basis'),
  url: BASIS_MANIFEST_URL,
};
const indexSeed = parseIndex(indexSeedJson, 'bundel:index');

// --- Toestand (zustand, zodat componenten op wijzigingen kunnen abonneren) ---

interface RegistryState {
  summaries: ThemeSummary[];
  themes: Record<string, ThemeConfig>;
  /** Telt op bij elke wijziging (index ververst, thema geladen). */
  revision: number;
}

export const useThemeRegistry = create<RegistryState>()(() => ({
  summaries: [],
  themes: {},
  revision: 0,
}));

function registerTexts(resources: Record<string, Record<string, string>>): void {
  for (const [lang, flat] of Object.entries(resources)) {
    if (Object.keys(flat).length > 0) i18n.addResources(lang, 'translation', flat);
  }
}

function setSummaries(summaries: ThemeSummary[]): void {
  for (const s of summaries) registerTexts(s.textResources);
  // basis blijft altijd bestaan, ook als een index hem (per ongeluk) mist
  const list = summaries.some((s) => s.id === BUNDLED_THEME_ID)
    ? summaries
    : [...summaries, manifestToSummary(bundledBasis.manifest, bundledBasis.url)];
  useThemeRegistry.setState((s) => ({ summaries: [...list].sort(compareThemes), revision: s.revision + 1 }));
}

function registerManifest(loaded: LoadedManifest): ThemeConfig {
  const { manifest, url } = loaded;
  registerTexts(themeTextResources(manifest));
  const config = manifestToThemeConfig(manifest, url);
  useThemeRegistry.setState((s) => ({
    themes: { ...s.themes, [manifest.id]: config },
    // Een thema dat (nog) niet in de index stond, toch in de lijst opnemen
    summaries: s.summaries.some((x) => x.id === manifest.id)
      ? s.summaries
      : [...s.summaries, manifestToSummary(manifest, url)].sort(compareThemes),
    revision: s.revision + 1,
  }));
  return config;
}

// --- Bron ---

let repository: ThemeRepository = createStaticThemeRepository({ indexUrl: THEME_INDEX_URL, bundled: [bundledBasis] });
const inflight = new Map<string, Promise<ThemeConfig | undefined>>();

/** Vervang de bron (tests; later de Supabase-implementatie). Wist geladen thema's behalve basis. */
export function setThemeRepository(next: ThemeRepository): void {
  repository = next;
  inflight.clear();
  initRegistry();
}

function initRegistry(): void {
  useThemeRegistry.setState({ themes: {}, summaries: [] });
  setSummaries(indexSeed.themes.map((entry) => indexEntryToSummary(entry, THEME_INDEX_URL)));
  registerManifest(bundledBasis);
}

initRegistry();

// --- Synchrone lezers ---

export function getThemeSummaries(): ThemeSummary[] {
  return useThemeRegistry.getState().summaries;
}

export function getThemeSummary(id: string | null | undefined): ThemeSummary | undefined {
  if (!id) return undefined;
  return useThemeRegistry.getState().summaries.find((s) => s.id === id);
}

/** Het volledige thema als het al geladen is (basis altijd), anders undefined. */
export function getLoadedTheme(id: string): ThemeConfig | undefined {
  return useThemeRegistry.getState().themes[id];
}

// --- Asynchroon laden ---

/** Haal de actuele index op. Mislukt dat (offline), dan blijft de vorige lijst staan. */
export async function refreshThemeIndex(): Promise<boolean> {
  try {
    setSummaries(await repository.listThemes());
    return true;
  } catch (error) {
    logger.warn('[themes] index niet ververst', error);
    return false;
  }
}

/**
 * Laad een volledig thema (eenmaal; daarna uit het geheugen).
 * @returns het thema, of undefined als het niet bestaat of niet te laden is
 */
export function loadTheme(id: string): Promise<ThemeConfig | undefined> {
  const loaded = getLoadedTheme(id);
  if (loaded) return Promise.resolve(loaded);
  let pending = inflight.get(id);
  if (!pending) {
    pending = repository
      .getManifest(id)
      .then((result) => (result ? registerManifest(result) : undefined))
      .catch((error) => {
        logger.warn(`[themes] thema "${id}" niet geladen`, error);
        return undefined;
      })
      .finally(() => inflight.delete(id));
    inflight.set(id, pending);
  }
  return pending;
}

/**
 * Bestaat dit thema? Kijkt eerst in de bekende lijst; een onbekend id kan een
 * net gepubliceerd thema zijn, dus dan eerst de index verversen.
 */
export async function resolveThemeSummary(id: string): Promise<ThemeSummary | undefined> {
  const known = getThemeSummary(id);
  if (known) return known;
  await refreshThemeIndex();
  return getThemeSummary(id);
}
