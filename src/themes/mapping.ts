/**
 * Van manifest naar runtime (V2 Fase 3). Puur — geen browser-API's, geen
 * i18n-instantie — zodat het ook in Node en in de tests draait.
 *
 *  - `manifestToThemeConfig`  manifest → de bestaande `ThemeConfig` (alle consumenten blijven werken)
 *  - `manifestToIndexEntry`   manifest → regel in public/themes/index.json
 *  - `indexEntryToSummary`    indexregel → `ThemeSummary` (wat kiezers nodig hebben)
 *  - `themeTextResources`     teksten → platte i18n-sleutels per taal
 *
 * De i18n-sleutels blijven exact wat ze waren: opgeslagen composities en
 * bibliotheken bewaren `sample.name` als sleutel, die moet blijven werken.
 */

import type { Location, Sample } from '../types';
import type { ThemeConfig, MapConfig, ThemeColors, LocationPosition } from '../data/themes/types';
import type {
  ThemeManifest,
  ThemeIndexEntry,
  ManifestLocation,
  ManifestSample,
  PartialLanguageTexts,
} from './manifest';

// --- Samenvatting (zonder het volledige manifest) ---

export interface LocationSummary {
  id: string;
  /** i18n-sleutel */
  name: string;
  /** i18n-sleutel */
  description: string;
  backgroundImage: string;
}

/** Wat kiezers, opdrachten en de catalogus van een thema weten zonder het manifest te laden. */
export interface ThemeSummary {
  id: string;
  version: number;
  /** i18n-sleutel */
  name: string;
  /** i18n-sleutel */
  description: string;
  isPublic: boolean;
  activeFrom?: string;
  activeUntil?: string;
  sort?: number;
  colors?: ThemeColors;
  map: Pick<MapConfig, 'backgroundImage' | 'backgroundImageByLocale'>;
  locationCount: number;
  sampleCount: number;
  locations: LocationSummary[];
  /** Thema- en locatieteksten als i18n-sleutels per taal (zie themeTextResources). */
  textResources: Record<string, Record<string, string>>;
}

// --- i18n-sleutels ---

/** De standaard-i18n-sleutels van een thema (zelfde conventie als themeCodegen). */
export const themeTextKeys = {
  name: (themeId: string) => `themes.${themeId}.name`,
  description: (themeId: string) => `themes.${themeId}.description`,
  locationName: (themeId: string, locationId: string) => `themes.${themeId}.locations.${locationId}`,
  locationDescription: (themeId: string, locationId: string) => `themes.${themeId}.locations.${locationId}_desc`,
  sample: (themeId: string, sampleId: string) => `themes.${themeId}.samples.${sampleId}`,
};

function locationKeys(themeId: string, location: Pick<ManifestLocation, 'id' | 'textKeys'>) {
  return location.textKeys ?? {
    name: themeTextKeys.locationName(themeId, location.id),
    description: themeTextKeys.locationDescription(themeId, location.id),
  };
}

function sampleKey(themeId: string, sample: Pick<ManifestSample, 'id' | 'textKey'>): string {
  return sample.textKey ?? themeTextKeys.sample(themeId, sample.id);
}

// --- Mediapaden ---

/** Map van een bestand-URL ('/themes/basis/manifest.json' → '/themes/basis/'). */
export function dirnameUrl(url: string): string {
  const cut = url.lastIndexOf('/');
  return cut === -1 ? './' : url.slice(0, cut + 1);
}

const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:/i;
const PATH_ORIGIN = 'https://path.invalid';

/** Join met normalisatie van `..`; een root-pad blijft een root-pad, een URL een URL. */
function joinUrl(base: string, path: string): string {
  if (ABSOLUTE_URL.test(path) || path.startsWith('/')) return path;
  if (ABSOLUTE_URL.test(base)) return new URL(path, base).href;
  const rootBase = base.startsWith('/') ? base : `/${base}`;
  const url = new URL(path, PATH_ORIGIN + (rootBase.endsWith('/') ? rootBase : `${rootBase}/`));
  return url.pathname + url.search + url.hash;
}

/** De basis waartegen relatieve mediapaden worden opgelost. */
export function resolveAssetBase(manifestUrl: string, assetBase: string | undefined): string {
  const dir = dirnameUrl(manifestUrl);
  if (!assetBase) return dir;
  const base = joinUrl(dir, assetBase);
  return base.endsWith('/') ? base : `${base}/`;
}

export function resolveAsset(base: string, path: string): string {
  return joinUrl(base, path);
}

/** Mediapaden van een kaart (nl = standaard, andere talen als variant). */
function mapImages(image: Record<string, string>, base: string): Pick<MapConfig, 'backgroundImage' | 'backgroundImageByLocale'> {
  const { nl, ...rest } = image;
  const byLocale = Object.fromEntries(Object.entries(rest).map(([lang, p]) => [lang, resolveAsset(base, p)]));
  return {
    backgroundImage: resolveAsset(base, nl),
    ...(Object.keys(byLocale).length > 0 ? { backgroundImageByLocale: byLocale } : {}),
  };
}

// --- Manifest → ThemeConfig ---

/**
 * Bouw de runtime-`ThemeConfig` uit een manifest.
 * @param manifestUrl adres waar het manifest vandaan kwam (basis voor relatieve paden)
 */
export function manifestToThemeConfig(manifest: ThemeManifest, manifestUrl: string): ThemeConfig {
  const base = resolveAssetBase(manifestUrl, manifest.assetBase);
  const id = manifest.id;

  const locations: Location[] = manifest.locations.map((loc) => {
    const keys = locationKeys(id, loc);
    return {
      id: loc.id,
      name: keys.name,
      description: keys.description,
      backgroundImage: resolveAsset(base, loc.image),
      ambientAudio: loc.ambient ? resolveAsset(base, loc.ambient) : '',
      unlocked: loc.unlocked ?? true,
      hotspots: loc.hotspots.map((h) => ({
        id: h.id,
        x: h.x,
        y: h.y,
        ...(h.radius !== undefined ? { radius: h.radius } : {}),
        sampleId: h.sampleId,
        visualHint: h.visualHint,
      })),
    };
  });

  const samples: Sample[] = manifest.samples.map((s) => ({
    id: s.id,
    name: sampleKey(id, s),
    locationId: s.locationId,
    audioUrl: resolveAsset(base, s.file),
    duration: s.duration,
    icon: s.icon,
    color: s.color,
  }));

  const locationPositions: LocationPosition[] = manifest.map.positions.map((p) => ({
    locationId: p.locationId,
    x: p.x,
    y: p.y,
    ...(p.size ? { size: p.size } : {}),
    ...(p.icon ? { iconUrl: resolveAsset(base, p.icon) } : {}),
  }));

  return {
    id,
    name: themeTextKeys.name(id),
    description: themeTextKeys.description(id),
    isPublic: manifest.isPublic,
    ...(manifest.season ? { activeFrom: manifest.season.from, activeUntil: manifest.season.until } : {}),
    locations,
    samples,
    map: { ...mapImages(manifest.map.image, base), locationPositions },
    ...(manifest.colors ? { colors: manifest.colors } : {}),
  };
}

// --- Manifest → indexregel → samenvatting ---

/** @param manifestPath pad van het manifest relatief aan index.json ('basis/manifest.json') */
export function manifestToIndexEntry(manifest: ThemeManifest, manifestPath: string): ThemeIndexEntry {
  const texts = Object.fromEntries(
    Object.entries(manifest.texts).map(([lang, t]) => {
      const { samples: _samples, ...rest } = t as PartialLanguageTexts;
      void _samples;
      return [lang, rest];
    }),
  ) as ThemeIndexEntry['texts'];
  return {
    id: manifest.id,
    version: manifest.version,
    manifest: manifestPath,
    isPublic: manifest.isPublic,
    ...(manifest.season ? { season: manifest.season } : {}),
    ...(manifest.sort !== undefined ? { sort: manifest.sort } : {}),
    ...(manifest.assetBase ? { assetBase: manifest.assetBase } : {}),
    ...(manifest.colors ? { colors: manifest.colors } : {}),
    map: { image: manifest.map.image },
    locationCount: manifest.locations.length,
    sampleCount: manifest.samples.length,
    locations: manifest.locations.map((l) => ({ id: l.id, image: l.image, ...(l.textKeys ? { textKeys: l.textKeys } : {}) })),
    texts,
  };
}

/** @param indexUrl adres van index.json (basis voor `entry.manifest`) */
export function indexEntryToSummary(entry: ThemeIndexEntry, indexUrl: string): ThemeSummary {
  const manifestUrl = resolveAsset(dirnameUrl(indexUrl), entry.manifest);
  const base = resolveAssetBase(manifestUrl, entry.assetBase);
  return {
    id: entry.id,
    version: entry.version,
    name: themeTextKeys.name(entry.id),
    description: themeTextKeys.description(entry.id),
    isPublic: entry.isPublic,
    ...(entry.season ? { activeFrom: entry.season.from, activeUntil: entry.season.until } : {}),
    ...(entry.sort !== undefined ? { sort: entry.sort } : {}),
    ...(entry.colors ? { colors: entry.colors } : {}),
    map: mapImages(entry.map.image, base),
    locationCount: entry.locationCount,
    sampleCount: entry.sampleCount,
    locations: entry.locations.map((l) => {
      const keys = locationKeys(entry.id, l);
      return { id: l.id, name: keys.name, description: keys.description, backgroundImage: resolveAsset(base, l.image) };
    }),
    textResources: themeTextResources({ id: entry.id, texts: entry.texts, locations: entry.locations }),
  };
}

/** Samenvatting rechtstreeks uit een (volledig) manifest. */
export function manifestToSummary(manifest: ThemeManifest, manifestUrl: string): ThemeSummary {
  const file = manifestUrl.slice(dirnameUrl(manifestUrl).length) || 'manifest.json';
  return indexEntryToSummary(manifestToIndexEntry(manifest, file), manifestUrl);
}

/** Volgorde in kiezers: `sort` oplopend (zonder sort achteraan), dan id. */
export function compareThemes(a: { sort?: number; id: string }, b: { sort?: number; id: string }): number {
  const sa = a.sort ?? Number.MAX_SAFE_INTEGER;
  const sb = b.sort ?? Number.MAX_SAFE_INTEGER;
  return sa !== sb ? sa - sb : a.id.localeCompare(b.id);
}

// --- Teksten → i18n ---

interface TextSource {
  id: string;
  texts: Record<string, PartialLanguageTexts>;
  locations: Array<Pick<ManifestLocation, 'id' | 'textKeys'>>;
  samples?: Array<Pick<ManifestSample, 'id' | 'textKey'>>;
}

/**
 * Teksten van een thema als platte i18n-sleutels per taal
 * (`{ nl: { 'themes.basis.name': 'De Stad', ... }, en: {...} }`).
 * Ontbrekende teksten in een taal worden weggelaten: i18next valt dan terug op nl.
 */
export function themeTextResources(source: TextSource): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const [lang, t] of Object.entries(source.texts)) {
    const flat: Record<string, string> = {};
    if (t.name) flat[themeTextKeys.name(source.id)] = t.name;
    if (t.description !== undefined) flat[themeTextKeys.description(source.id)] = t.description;
    for (const loc of source.locations) {
      const lt = t.locations?.[loc.id];
      if (!lt) continue;
      const keys = locationKeys(source.id, loc);
      if (lt.name) flat[keys.name] = lt.name;
      if (lt.description !== undefined) flat[keys.description] = lt.description;
    }
    for (const sample of source.samples ?? []) {
      const st = t.samples?.[sample.id];
      if (st) flat[sampleKey(source.id, sample)] = st;
    }
    out[lang] = flat;
  }
  return out;
}
