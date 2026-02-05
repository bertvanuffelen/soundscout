/**
 * Locations for the 'winterspelen' theme.
 *
 * TODO: Configureer hotspots via de Locatie Editor (/editor)
 */

import type { Location } from '../../../types';

export const locations: Location[] = [
  {
    id: 'winterdorp',
    name: 'themes.winterspelen.locations.winterdorp',
    description: 'themes.winterspelen.locations.winterdorp_desc',
    backgroundImage: '/images/themes/winterspelen/winterdorp.jpg',
    ambientAudio: '',
    unlocked: true,
    hotspots: [
      // TODO: Voeg hotspots toe via Locatie Editor
      { id: 'winterdorp-1', x: 30, y: 50, radius: 8, sampleId: 'winterdorp-placeholder-1', visualHint: 'glow' },
      { id: 'winterdorp-2', x: 70, y: 50, radius: 8, sampleId: 'winterdorp-placeholder-2', visualHint: 'glow' },
    ],
  },
  {
    id: 'bobsleebaan',
    name: 'themes.winterspelen.locations.bobsleebaan',
    description: 'themes.winterspelen.locations.bobsleebaan_desc',
    backgroundImage: '/images/themes/winterspelen/bobsleebaan.jpg',
    ambientAudio: '',
    unlocked: true,
    hotspots: [
      { id: 'bobsleebaan-1', x: 30, y: 50, radius: 8, sampleId: 'bobsleebaan-placeholder-1', visualHint: 'glow' },
      { id: 'bobsleebaan-2', x: 70, y: 50, radius: 8, sampleId: 'bobsleebaan-placeholder-2', visualHint: 'glow' },
    ],
  },
  {
    id: 'skipiste',
    name: 'themes.winterspelen.locations.skipiste',
    description: 'themes.winterspelen.locations.skipiste_desc',
    backgroundImage: '/images/themes/winterspelen/skipiste.jpg',
    ambientAudio: '',
    unlocked: true,
    hotspots: [
      { id: 'skipiste-publiek', x: 43.1, y: 67.1, radius: 8, sampleId: 'skipiste-publiek', visualHint: 'pulse' },
      { id: 'skipiste-robot-beeps', x: 36.7, y: 83.4, radius: 8, sampleId: 'skipiste-robot-beeps', visualHint: 'pulse' },
      { id: 'skipiste-snowboard', x: 84.4, y: 48.7, radius: 8, sampleId: 'skipiste-snowboard', visualHint: 'pulse' },
      { id: 'skipiste-stoeltjeslift', x: 72.9, y: 18.1, radius: 8, sampleId: 'skipiste-stoeltjeslift', visualHint: 'pulse' },
      { id: 'skipiste-schans', x: 52.3, y: 39.4, radius: 8, sampleId: 'skipiste-schans', visualHint: 'pulse' },
      { id: 'skipiste-ski-raket', x: 9.9, y: 34.2, radius: 8, sampleId: 'skipiste-ski-raket', visualHint: 'pulse' },
    ],
  },
  {
    id: 'ijsarena',
    name: 'themes.winterspelen.locations.ijsarena',
    description: 'themes.winterspelen.locations.ijsarena_desc',
    backgroundImage: '/images/themes/winterspelen/ijsarena.jpg',
    ambientAudio: '',
    unlocked: true,
    hotspots: [
      { id: 'ijsarena-1', x: 30, y: 50, radius: 8, sampleId: 'ijsarena-placeholder-1', visualHint: 'glow' },
      { id: 'ijsarena-2', x: 70, y: 50, radius: 8, sampleId: 'ijsarena-placeholder-2', visualHint: 'glow' },
    ],
  },
];
