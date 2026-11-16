/**
 * Eenmalige migratie (V2 Fase 3): een bestaand TypeScript-thema + de
 * vertaalbestanden → manifest. Gebruikt door `scripts/export-theme-manifests.mjs`
 * en door de gelijkwaardigheidstest. Puur (draait in Node).
 *
 * Mediapaden worden relatief aan `assetBase: '/'` geschreven; de media zelf
 * blijven staan waar ze staan (/audio/themes/…, /images/themes/…).
 */

import type { ThemeConfig } from '../data/themes/types';
import { MANIFEST_SCHEMA_VERSION, ThemeManifestSchema, type ThemeManifest, type PartialLanguageTexts } from './manifest';
import { themeTextKeys } from './mapping';

type LocaleJson = Record<string, unknown>;

/** Waarde van een i18n-sleutel ('a.b.c') in een geneste vertaal-JSON. */
export function lookupKey(json: LocaleJson, key: string): string | undefined {
  let node: unknown = json;
  for (const part of key.split('.')) {
    if (!node || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** '/audio/x.mp3' → 'audio/x.mp3' (relatief aan assetBase '/'). */
function rel(path: string): string {
  return path.startsWith('/') ? path.slice(1) : path;
}

export interface ConvertOptions {
  version?: number;
  sort?: number;
}

/**
 * @param locales vertaalbestanden per taal; `nl` verplicht
 */
export function themeConfigToManifest(
  theme: ThemeConfig,
  locales: { nl: LocaleJson } & Record<string, LocaleJson>,
  options: ConvertOptions = {},
): ThemeManifest {
  const id = theme.id;

  // Alleen vaste sleutels vastleggen waar ze afwijken van de standaard
  const locationTextKeys = (loc: ThemeConfig['locations'][number]) =>
    loc.name === themeTextKeys.locationName(id, loc.id) && loc.description === themeTextKeys.locationDescription(id, loc.id)
      ? undefined
      : { name: loc.name, description: loc.description };
  const sampleTextKey = (s: ThemeConfig['samples'][number]) =>
    s.name === themeTextKeys.sample(id, s.id) ? undefined : s.name;

  if (theme.name !== themeTextKeys.name(id) || theme.description !== themeTextKeys.description(id)) {
    throw new Error(`[convert] ${id}: themanaam/-omschrijving volgen niet de standaardsleutel`);
  }

  const texts: Record<string, PartialLanguageTexts> = {};
  for (const [lang, json] of Object.entries(locales)) {
    const get = (key: string) => lookupKey(json, key);
    const locations: NonNullable<PartialLanguageTexts['locations']> = {};
    for (const loc of theme.locations) {
      const name = get(loc.name);
      const description = get(loc.description);
      if (name === undefined && description === undefined) continue;
      locations[loc.id] = {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
      };
    }
    const samples: Record<string, string> = {};
    for (const s of theme.samples) {
      const name = get(s.name);
      if (name !== undefined) samples[s.id] = name;
    }
    const name = get(theme.name);
    const description = get(theme.description);
    texts[lang] = {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      locations,
      samples,
    };
  }

  const manifest = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    id,
    version: options.version ?? 1,
    status: 'published' as const,
    isPublic: theme.isPublic,
    ...(theme.activeFrom && theme.activeUntil ? { season: { from: theme.activeFrom, until: theme.activeUntil } } : {}),
    ...(options.sort !== undefined ? { sort: options.sort } : {}),
    assetBase: '/',
    ...(theme.colors && Object.keys(theme.colors).length > 0 ? { colors: theme.colors } : {}),
    map: {
      image: {
        nl: rel(theme.map.backgroundImage),
        ...Object.fromEntries(Object.entries(theme.map.backgroundImageByLocale ?? {}).map(([l, p]) => [l, rel(p)])),
      },
      positions: theme.map.locationPositions.map((p) => ({
        locationId: p.locationId,
        x: p.x,
        y: p.y,
        ...(p.size ? { size: p.size } : {}),
        ...(p.iconUrl ? { icon: rel(p.iconUrl) } : {}),
      })),
    },
    locations: theme.locations.map((loc) => {
      const textKeys = locationTextKeys(loc);
      return {
        id: loc.id,
        image: rel(loc.backgroundImage),
        ...(loc.ambientAudio ? { ambient: rel(loc.ambientAudio) } : {}),
        ...(loc.unlocked === false ? { unlocked: false } : {}),
        hotspots: loc.hotspots.map((h) => ({
          id: h.id,
          x: h.x,
          y: h.y,
          ...(h.radius !== undefined ? { radius: h.radius } : {}),
          sampleId: h.sampleId,
          visualHint: h.visualHint,
        })),
        ...(textKeys ? { textKeys } : {}),
      };
    }),
    samples: theme.samples.map((s) => {
      const textKey = sampleTextKey(s);
      return {
        id: s.id,
        locationId: s.locationId,
        file: rel(s.audioUrl),
        duration: s.duration,
        icon: s.icon,
        color: s.color,
        ...(s.kind ? { kind: s.kind } : {}),
        ...(textKey ? { textKey } : {}),
      };
    }),
    texts,
  };

  // Valideren: een migratie die geen geldig manifest oplevert is een fout
  return ThemeManifestSchema.parse(manifest);
}

/** Stabiele sleutelvolgorde voor diff-vriendelijke JSON (objecten gesorteerd, arrays ongemoeid). */
export function stableJson(value: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, sort((v as Record<string, unknown>)[k])]));
    }
    return v;
  };
  return `${JSON.stringify(sort(value), null, 2)}\n`;
}
