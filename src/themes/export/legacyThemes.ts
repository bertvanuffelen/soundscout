/**
 * De drie TypeScript-thema's van vóór V2 Fase 3, als bron voor de eenmalige
 * conversie naar manifesten en als fixture voor de gelijkwaardigheidstest.
 *
 * De app importeert dit bestand NIET (alleen het script en de tests). Zodra de
 * TS-thema's verwijderd worden, verdwijnt dit bestand mee — zie docs/v2/THEMES.md §7.
 */

import type { ThemeConfig } from '../../data/themes/types';
import { basisTheme } from '../../data/themes/basis';
import { winterspelenTheme } from '../../data/themes/winterspelen';
import { piratenTheme } from '../../data/themes/piraten';
import nl from '../../i18n/locales/nl.json';
import en from '../../i18n/locales/en.json';
import { themeConfigToManifest } from '../convert';
import type { ThemeManifest } from '../manifest';

/** Volgorde = de volgorde van de oude registry (kiezers tonen ze zo). */
export const LEGACY_THEMES: Array<{ theme: ThemeConfig; sort: number }> = [
  { theme: basisTheme, sort: 10 },
  { theme: winterspelenTheme, sort: 20 },
  { theme: piratenTheme, sort: 30 },
];

export const LEGACY_LOCALES = { nl, en } as { nl: Record<string, unknown>; en: Record<string, unknown> };

export function convertLegacyThemes(): ThemeManifest[] {
  return LEGACY_THEMES.map(({ theme, sort }) => themeConfigToManifest(theme, LEGACY_LOCALES, { sort }));
}
