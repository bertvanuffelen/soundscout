/**
 * Scherm ↔ pad (V2 Fase 2). Eén tabel, gebruikt door de routes, de koppeling
 * met de appStore en de afhandeling van oude links.
 */
import type { GameScreen } from '../types';

/** De vaste paden. Paden met een `$`-deel krijgen hun waarde uit de appStore. */
export const SCREEN_PATHS = {
  start: '/',
  'compose-mode': '/nieuw',
  map: '/kaart',
  location: '/locatie/$locationId',
  studio: '/studio',
  stage: '/podium',
  compositions: '/composities',
  teacher: '/docent',
  shared: '/gedeeld/$code',
  tutorial: '/uitleg',
  'teacher-guide': '/handleiding',
  'praatplaat-select': '/praatplaat/plek',
  'assignment-landing': '/opdracht',
  'shared-praatplaat': '/praatplaat/gedeeld/$code',
  'shared-album': '/album/$code',
} as const satisfies Record<GameScreen, string>;

/** Wat de appStore weet over "welk scherm" — de velden die in het pad staan. */
export interface ScreenState {
  currentScreen: GameScreen;
  currentLocationId: string | null;
  shareCode: string | null;
  sharedPraatplaatCode: string | null;
  sharedAlbumCode: string | null;
}

const segment = (value: string) => encodeURIComponent(value);

/**
 * Het pad dat bij een scherm-toestand hoort. Ontbreekt de waarde voor een
 * `$`-deel, dan valt het terug zoals de app dat altijd deed: een locatie
 * zonder id is de kaart, een gedeeld scherm zonder code is het startscherm.
 */
export function pathForScreen(state: ScreenState): string {
  switch (state.currentScreen) {
    case 'location':
      return state.currentLocationId ? `/locatie/${segment(state.currentLocationId)}` : SCREEN_PATHS.map;
    case 'shared':
      return state.shareCode ? `/gedeeld/${segment(state.shareCode)}` : SCREEN_PATHS.start;
    case 'shared-praatplaat':
      return state.sharedPraatplaatCode ? `/praatplaat/gedeeld/${segment(state.sharedPraatplaatCode)}` : SCREEN_PATHS.start;
    case 'shared-album':
      return state.sharedAlbumCode ? `/album/${segment(state.sharedAlbumCode)}` : SCREEN_PATHS.start;
    default:
      return SCREEN_PATHS[state.currentScreen] ?? SCREEN_PATHS.start;
  }
}
