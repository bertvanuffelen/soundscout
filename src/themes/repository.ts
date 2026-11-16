/**
 * Waar thema's vandaan komen (V2 Fase 3). Eén interface; vandaag één
 * implementatie (statische bestanden onder /themes/), later een tweede
 * (Supabase Storage, versies per thema) die exact dezelfde vorm teruggeeft.
 * De rest van de app ziet alleen `ThemeRepository` via registry.ts.
 *
 * Elke externe JSON gaat door Zod; een manifest met een integriteitsfout
 * (dubbele ids, hotspot zonder sample, ...) wordt geweigerd.
 */

import {
  ThemeIndexSchema,
  ThemeManifestSchema,
  type ThemeIndex,
  type ThemeManifest,
} from './manifest';
import { indexEntryToSummary, compareThemes, manifestToThemeConfig, resolveAsset, dirnameUrl, type ThemeSummary } from './mapping';
import { checkManifest, integrityErrors } from './rules';
import type { ThemeConfig } from '../data/themes/types';

/** Een geladen manifest met het adres waar het vandaan kwam (basis voor mediapaden). */
export interface LoadedManifest {
  manifest: ThemeManifest;
  url: string;
}

export interface ThemeRepository {
  /** De gepubliceerde thema's (zonder hun volledige manifest). */
  listThemes(): Promise<ThemeSummary[]>;
  /** Het volledige manifest van één thema, of null als het niet bestaat of niet te laden is. */
  getManifest(id: string): Promise<LoadedManifest | null>;
  /** Het runtime-thema, of null. */
  getTheme(id: string): Promise<ThemeConfig | null>;
}

export class ThemeLoadError extends Error {}

type FetchJson = (url: string) => Promise<unknown>;

const defaultFetchJson: FetchJson = async (url) => {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new ThemeLoadError(`${url}: HTTP ${response.status}`);
  return response.json();
};

/** Parse + integriteitscontrole van een manifest. Gooit bij een fout. */
export function parseManifest(json: unknown, source: string): ThemeManifest {
  const parsed = ThemeManifestSchema.safeParse(json);
  if (!parsed.success) {
    throw new ThemeLoadError(`${source}: ongeldig manifest — ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
  const broken = integrityErrors(checkManifest(parsed.data));
  if (broken.length > 0) {
    throw new ThemeLoadError(`${source}: ${broken.slice(0, 3).map((i) => i.message).join('; ')}`);
  }
  return parsed.data;
}

export function parseIndex(json: unknown, source: string): ThemeIndex {
  const parsed = ThemeIndexSchema.safeParse(json);
  if (!parsed.success) {
    throw new ThemeLoadError(`${source}: ongeldige thema-index — ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
  return parsed.data;
}

export interface StaticRepositoryOptions {
  /** Adres van de index, standaard '/themes/index.json'. */
  indexUrl?: string;
  fetchJson?: FetchJson;
  /** Manifesten die in de bundel zitten (basis): nooit een netwerkverzoek. */
  bundled?: LoadedManifest[];
}

/**
 * Leest de gepubliceerde statische bestanden: `/themes/index.json` en
 * `/themes/<id>/manifest.json` (zoals `scripts/export-theme-manifests.mjs` ze schrijft).
 */
export function createStaticThemeRepository(options: StaticRepositoryOptions = {}): ThemeRepository {
  const indexUrl = options.indexUrl ?? '/themes/index.json';
  const fetchJson = options.fetchJson ?? defaultFetchJson;
  const bundled = new Map((options.bundled ?? []).map((m) => [m.manifest.id, m]));
  let indexPromise: Promise<ThemeIndex> | null = null;

  const loadIndex = () => {
    indexPromise ??= fetchJson(indexUrl)
      .then((json) => parseIndex(json, indexUrl))
      .catch((error) => {
        indexPromise = null; // volgende keer opnieuw proberen
        throw error;
      });
    return indexPromise;
  };

  const getManifest = async (id: string): Promise<LoadedManifest | null> => {
    const fromBundle = bundled.get(id);
    if (fromBundle) return fromBundle;
    // Het pad staat in de index; valt die weg, dan de vaste conventie
    let url = resolveAsset(dirnameUrl(indexUrl), `${id}/manifest.json`);
    try {
      const entry = (await loadIndex()).themes.find((t) => t.id === id);
      if (!entry) return null;
      url = resolveAsset(dirnameUrl(indexUrl), entry.manifest);
    } catch {
      // index onbereikbaar: probeer het manifest op de conventie-plek
    }
    const manifest = parseManifest(await fetchJson(url), url);
    if (manifest.id !== id) throw new ThemeLoadError(`${url}: id "${manifest.id}" ≠ "${id}"`);
    return { manifest, url };
  };

  return {
    async listThemes() {
      const index = await loadIndex();
      return index.themes.map((entry) => indexEntryToSummary(entry, indexUrl)).sort(compareThemes);
    },
    getManifest,
    async getTheme(id) {
      const loaded = await getManifest(id);
      return loaded ? manifestToThemeConfig(loaded.manifest, loaded.url) : null;
    },
  };
}
