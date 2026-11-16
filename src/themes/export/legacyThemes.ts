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

/** Volgorde = de volgorde van de oude registry (kiezers tonen ze zo). */
export const LEGACY_THEMES: Array<{ theme: ThemeConfig; sort: number }> = [
  basisFixture as unknown as { theme: ThemeConfig; sort: number },
  winterspelenFixture as unknown as { theme: ThemeConfig; sort: number },
  piratenFixture as unknown as { theme: ThemeConfig; sort: number },
];

export const LEGACY_LOCALES = { nl, en } as { nl: Record<string, unknown>; en: Record<string, unknown> };

export function convertLegacyThemes(): ThemeManifest[] {
  return LEGACY_THEMES.map(({ theme, sort }) => themeConfigToManifest(theme, LEGACY_LOCALES, { sort }));
}
