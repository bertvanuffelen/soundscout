/**
 * De drie thema's van vóór V2 Fase 3, BEVROREN als JSON (16-11-2026, vlak
 * vóór het verwijderen van src/data/themes/winterspelen en /piraten).
 *
 * Deze fixtures zijn exact de oude TypeScript-objecten (gemaakt met de
 * oude bron, daarna gecontroleerd door de gelijkwaardigheidstest). Ze houden
 * de poort permanent: de gepubliceerde manifesten moeten deze thema's blijven
 * opleveren. De app importeert dit bestand NIET (alleen script en tests).
 */

import type { ThemeConfig } from '../../data/themes/types';
import basisFixture from '../__tests__/fixtures/legacy-basis.json';
import winterspelenFixture from '../__tests__/fixtures/legacy-winterspelen.json';
import piratenFixture from '../__tests__/fixtures/legacy-piraten.json';
import nl from '../../i18n/locales/nl.json';
import en from '../../i18n/locales/en.json';
import { themeConfigToManifest } from '../convert';
import type { ThemeManifest } from '../manifest';

/**
 * V2 Fase 4 — bewuste, expliciete uitbreiding van de bevroren thema's: welke
 * samples muziekloops zijn (`kind: 'loop'`, rekken mee met het tempo). De
 * fixtures zelf blijven onaangeroerd; deze lijst is het enige verschil, en
 * de gelijkwaardigheidstest vergelijkt het manifest met fixture + deze lijst.
 *
 * Alleen de zes muziekwinkel-loops van basis (8,005 s mp3 = 8,0 s + encoder-
 * padding, 120 BPM, gemaakt als loop). Kandidaten die nog bevestigd moeten
 * worden (zelfde lengte, klinken als muziek): piraten grogkroeg-accordeon,
 * schip-zeemanslied, jungle-trommels — bewust NIET gemarkeerd.
 */
export const LEGACY_SAMPLE_KINDS: Record<string, Record<string, 'loop' | 'sfx'>> = {
  basis: {
    'muziekwinkel-drums': 'loop',
    'muziekwinkel-brass': 'loop',
    'muziekwinkel-bass': 'loop',
    'muziekwinkel-guitar': 'loop',
    'muziekwinkel-strings': 'loop',
    'muziekwinkel-piano': 'loop',
  },
};

/** Fixture + LEGACY_SAMPLE_KINDS (zonder de fixture zelf te muteren). */
function withSampleKinds(entry: { theme: ThemeConfig; sort: number }): { theme: ThemeConfig; sort: number } {
  const kinds = LEGACY_SAMPLE_KINDS[entry.theme.id];
  if (!kinds) return entry;
  return {
    ...entry,
    theme: {
      ...entry.theme,
      samples: entry.theme.samples.map((s) => (kinds[s.id] ? { ...s, kind: kinds[s.id] } : s)),
    },
  };
}

/** Volgorde = de volgorde van de oude registry (kiezers tonen ze zo). */
export const LEGACY_THEMES: Array<{ theme: ThemeConfig; sort: number }> = [
  basisFixture as unknown as { theme: ThemeConfig; sort: number },
  winterspelenFixture as unknown as { theme: ThemeConfig; sort: number },
  piratenFixture as unknown as { theme: ThemeConfig; sort: number },
].map(withSampleKinds);

export const LEGACY_LOCALES = { nl, en } as { nl: Record<string, unknown>; en: Record<string, unknown> };

export function convertLegacyThemes(): ThemeManifest[] {
  return LEGACY_THEMES.map(({ theme, sort }) => themeConfigToManifest(theme, LEGACY_LOCALES, { sort }));
}
