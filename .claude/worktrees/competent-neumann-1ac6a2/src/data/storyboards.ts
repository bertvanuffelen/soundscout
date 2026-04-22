/**
 * Standalone Storyboard Registry
 *
 * Multi-image storyboards losgekoppeld van thema's. Het thema (en dus de
 * geluiden) volgt impliciet uit `storyboard.themeId`.
 *
 * Afbeeldingen staan in `/public/images/storyboards/{id}/`.
 * Conventie: frame-1.jpg is tegelijk ook de cover-afbeelding.
 *
 * Om een nieuw storyboard toe te voegen:
 *   1. Maak de map `/public/images/storyboards/{id}/`
 *   2. Plaats frames (frame-1.jpg, frame-2.jpg, ...); frame-1 = cover
 *   3. Voeg een entry toe aan deze lijst
 *   4. Voeg i18n-keys toe onder `storyboards.{id}.*`
 */

import type { Storyboard } from '../types';

export const storyboards: Storyboard[] = [
  {
    id: 'verspringen',
    themeId: 'basis',
    name: 'storyboards.verspringen.name',
    description: 'storyboards.verspringen.description',
    coverImage: '/images/storyboards/verspringen/verspringen-2.jpg',
    images: [
      {
        id: 'start',
        url: '/images/storyboards/verspringen/verspringen-1.jpg',
        label: 'storyboards.verspringen.start',
      },
      {
        id: 'sprong',
        url: '/images/storyboards/verspringen/verspringen-2.jpg',
        label: 'storyboards.verspringen.sprong',
      },
      {
        id: 'landing',
        url: '/images/storyboards/verspringen/verspringen-3.jpg',
        label: 'storyboards.verspringen.landing',
      },
    ],
  },
];

/** Alle storyboards voor een bepaald thema. */
export function getStoryboardsForTheme(themeId: string): Storyboard[] {
  return storyboards.filter((sb) => sb.themeId === themeId);
}

/** Vind een storyboard op id. */
export function findStoryboard(id: string): Storyboard | undefined {
  return storyboards.find((sb) => sb.id === id);
}
