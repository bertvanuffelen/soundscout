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
  // Bevestigd door Bert (16-11-2026): deze drie zijn muziek en rekken mee met het tempo.
  piraten: {
    'grogkroeg-accordeon': 'loop',
    'schip-zeemanslied': 'loop',
    'jungle-trommels': 'loop',
  },
};

/**
 * V2 release (17-11-2026) — tweede bewuste uitbreiding: hotspots die de
 * ontwerpregels braken (veilige zone 12–88 %, 44 px afstand op de kleinste
 * scène, zie src/themes/rules.ts) zijn verschoven. Elke nieuwe plek is op het
 * scènebeeld gekozen: hetzelfde voorwerp, of een gelijk voorwerp in hetzelfde
 * beeld (de drone in bobslee, de meeuw in haven). Alleen x/y wijzigt; ids,
 * samples en teksten blijven, dus opgeslagen composities merken niets.
 */
export const LEGACY_HOTSPOT_MOVES: Record<string, Record<string, { x: number; y: number }>> = {
  basis: {
    'gymzaal-fluitje': { x: 68.0, y: 58.2 },            // was 67.1/57.8 — te dicht bij "vallen"
    'klaslokaal-lachen-emoji': { x: 61.5, y: 86.0 },    // was 54.8/82.7 — nu op de lachende robot, los van "tekenen"
    'speeltuin-zandbak': { x: 20.0, y: 62.0 },          // was 22.9/67.6 — hoger in de zandbak, los van "vissen"
  },
  winterspelen: {
    'bobslee-drone': { x: 30.5, y: 73.5 },              // was 55.8/7.3 (boven de veilige zone) — de drone bij "Curling is next"
    'skipiste-publiek': { x: 45.0, y: 64.0 },           // was 43.1/67.1 — te dicht bij "robot-beeps"
    'ijsarena-go-team-robo': { x: 60.5, y: 84.5 },      // was 62.2/91.2 (onder de veilige zone) — op het bordje
  },
  piraten: {
    'grogkroeg-dobbel': { x: 60.4, y: 84.0 },           // was 58.3/92.3 — de dobbelsteen in de hand
    'grogkroeg-fluit': { x: 74.5, y: 47.5 },            // was 80.4/51.4 — links van het hoofd, bij de fluit
    'grogkroeg-accordeon': { x: 84.5, y: 59.5 },        // was 80.3/61.8 — rechterkant van de accordeon
    'grogkroeg-vat': { x: 94.0, y: 75.0 },              // was 90.7/71.2 — verder op het liggende vat
    'haven-meeuwen': { x: 79.5, y: 57.9 },              // was 49.1/12.8 — de meeuw met de vis, rechts
    'schip-anker': { x: 75.5, y: 87.5 },                // was 76.2/88.9 — de ring van het anker
    'schip-kanon': { x: 27.5, y: 76.5 },                // was 31/74.5 — op de loop, los van "zeemanslied"
    'jungle-vogels': { x: 79.7, y: 13.0 },              // was 79.7/11.2 — net in de veilige zone, op de tak
    'voodoohut-windgong': { x: 4.5, y: 27.0 },          // was 6/34.4 — hoger in de windgong, los van "gefluister"
  },
};

/** Fixture + LEGACY_HOTSPOT_MOVES (zonder de fixture zelf te muteren). */
function withHotspotMoves(entry: { theme: ThemeConfig; sort: number }): { theme: ThemeConfig; sort: number } {
  const moves = LEGACY_HOTSPOT_MOVES[entry.theme.id];
  if (!moves) return entry;
  return {
    ...entry,
    theme: {
      ...entry.theme,
      locations: entry.theme.locations.map((l) => ({
        ...l,
        hotspots: l.hotspots.map((h) => (moves[h.id] ? { ...h, ...moves[h.id] } : h)),
      })),
    },
  };
}

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
].map(withSampleKinds).map(withHotspotMoves);

export const LEGACY_LOCALES = { nl, en } as { nl: Record<string, unknown>; en: Record<string, unknown> };

export function convertLegacyThemes(): ThemeManifest[] {
  return LEGACY_THEMES.map(({ theme, sort }) => themeConfigToManifest(theme, LEGACY_LOCALES, { sort }));
}
