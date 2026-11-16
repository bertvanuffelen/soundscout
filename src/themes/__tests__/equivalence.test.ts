/**
 * Gelijkwaardigheidspoort (V2 Fase 3): de gepubliceerde manifesten in
 * public/themes/ leveren EXACT de oude TypeScript-thema's op, en elke
 * thema-/locatie-/sampletekst is in nl en en woord voor woord gelijk aan wat
 * de vertaalbestanden gaven. Pas als deze test groen is mogen de TS-thema's weg.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import i18n from '../../i18n';
import { LEGACY_THEMES, LEGACY_LOCALES, convertLegacyThemes } from '../export/legacyThemes';
import { lookupKey, stableJson } from '../convert';
import { ThemeManifestSchema } from '../manifest';
import { manifestToThemeConfig, themeTextResources } from '../mapping';
import { getTheme, loadTheme, getThemeSummary, getMapBackgroundImage } from '../../data/themes';

function readManifest(id: string) {
  const raw = readFileSync(join(process.cwd(), 'public', 'themes', id, 'manifest.json'), 'utf8');
  return { raw, manifest: ThemeManifestSchema.parse(JSON.parse(raw)) };
}

/** Alle i18n-sleutels die een thema gebruikt. */
function keysOf(theme: (typeof LEGACY_THEMES)[number]['theme']): string[] {
  return [
    theme.name,
    theme.description,
    ...theme.locations.flatMap((l) => [l.name, l.description]),
    ...theme.samples.map((s) => s.name),
  ];
}

describe('bundel-kopieën', () => {
  it.each([
    ['src/themes/bundled/basis.manifest.json', 'public/themes/basis/manifest.json'],
    ['src/themes/bundled/index.json', 'public/themes/index.json'],
  ])('%s is gelijk aan %s (npm run themes:index)', (bundled, published) => {
    expect(readFileSync(join(process.cwd(), bundled), 'utf8')).toBe(readFileSync(join(process.cwd(), published), 'utf8'));
  });
});

describe.each(LEGACY_THEMES.map(({ theme }) => [theme.id, theme] as const))('thema %s', (id, original) => {
  const { raw, manifest } = readManifest(id);
  const url = `/themes/${id}/manifest.json`;

  it('het gepubliceerde manifest is actueel (conversie levert hetzelfde bestand)', () => {
    const converted = convertLegacyThemes().find((m) => m.id === id)!;
    expect(raw).toBe(stableJson(converted));
  });

  it('manifest → ThemeConfig is gelijk aan het oorspronkelijke TS-thema', () => {
    expect(manifestToThemeConfig(manifest, url)).toEqual(original);
  });

  it('de app (registry/loader) levert hetzelfde thema', async () => {
    expect(await loadTheme(id)).toEqual(original);
    expect(getTheme(id)).toEqual(original);
  });

  it('de samenvatting voor kiezers klopt met het thema', () => {
    const summary = getThemeSummary(id)!;
    expect(summary.isPublic).toBe(original.isPublic);
    expect(summary.name).toBe(original.name);
    expect(summary.description).toBe(original.description);
    expect(summary.map.backgroundImage).toBe(original.map.backgroundImage);
    expect(summary.map.backgroundImageByLocale).toEqual(original.map.backgroundImageByLocale);
    expect(summary.locationCount).toBe(original.locations.length);
    expect(summary.sampleCount).toBe(original.samples.length);
    expect(summary.locations).toEqual(
      original.locations.map((l) => ({ id: l.id, name: l.name, description: l.description, backgroundImage: l.backgroundImage })),
    );
    for (const lang of ['nl', 'en']) {
      expect(getMapBackgroundImage(summary.map, lang)).toBe(getMapBackgroundImage(original.map, lang));
    }
  });

  it.each(['nl', 'en'] as const)('elke tekst is in %s identiek aan de vertaalbestanden', (lang) => {
    const resources = themeTextResources(manifest)[lang] ?? {};
    const keys = keysOf(original);
    expect(keys.length).toBeGreaterThan(5);
    for (const key of keys) {
      // Wat de app vóór Fase 3 toonde: de taal zelf, anders terugval op nl
      const before = lookupKey(LEGACY_LOCALES[lang], key) ?? lookupKey(LEGACY_LOCALES.nl, key);
      const fromManifest = resources[key] ?? themeTextResources(manifest).nl[key];
      expect(fromManifest, key).toBe(before);
      // En wat i18next nu daadwerkelijk teruggeeft
      expect(i18n.t(key, { lng: lang }), key).toBe(before);
    }
  });
});
