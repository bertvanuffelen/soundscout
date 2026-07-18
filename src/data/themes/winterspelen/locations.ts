/**
 * Locations for the 'winterspelen' theme.
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
      { id: 'winterdorp-wakingup', x: 56, y: 36.3, radius: 8, sampleId: 'winterdorp-wakingup', visualHint: 'pulse' },
      { id: 'winterdorp-jumprope', x: 16.9, y: 81.4, radius: 8, sampleId: 'winterdorp-jumprope', visualHint: 'pulse' },
      { id: 'winterdorp-hospital', x: 89.5, y: 46.6, radius: 8, sampleId: 'winterdorp-hospital', visualHint: 'pulse' },
      { id: 'winterdorp-hond', x: 45.3, y: 87.1, radius: 8, sampleId: 'winterdorp-hond', visualHint: 'pulse' },
      { id: 'winterdorp-electric', x: 62, y: 68.9, radius: 8, sampleId: 'winterdorp-electric', visualHint: 'pulse' },
      { id: 'winterdorp-eating', x: 36.7, y: 38.1, radius: 8, sampleId: 'winterdorp-eating', visualHint: 'pulse' },
      { id: 'winterdorp-coffee', x: 12.1, y: 56.2, radius: 8, sampleId: 'winterdorp-coffee', visualHint: 'pulse' },
    ],
  },
  {
    id: 'bobslee',
    name: 'themes.winterspelen.locations.bobslee',
    description: 'themes.winterspelen.locations.bobslee_desc',
    backgroundImage: '/images/themes/winterspelen/bobsleebaan.jpg',
    ambientAudio: '',
    unlocked: true,
    hotspots: [
      { id: 'bobslee-kapot', x: 49.7, y: 54.2, radius: 8, sampleId: 'bobslee-kapot', visualHint: 'pulse' },
      { id: 'bobslee-reparatie', x: 74.8, y: 74.1, radius: 8, sampleId: 'bobslee-reparatie', visualHint: 'pulse' },
      { id: 'bobslee-ziekenboeg', x: 88.2, y: 63.5, radius: 8, sampleId: 'bobslee-ziekenboeg', visualHint: 'pulse' },
      { id: 'bobslee-drone', x: 55.8, y: 7.3, radius: 8, sampleId: 'bobslee-drone', visualHint: 'pulse' },
      { id: 'bobslee-curlingisnext', x: 17.1, y: 74.4, radius: 8, sampleId: 'bobslee-curlingisnext', visualHint: 'pulse' },
      { id: 'bobslee-bobslee', x: 28.4, y: 19.2, radius: 8, sampleId: 'bobslee-bobslee', visualHint: 'pulse' },
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
      { id: 'ijsarena-go-team-robo', x: 62.2, y: 91.2, radius: 8, sampleId: 'ijsarena-go-team-robo', visualHint: 'pulse' },
      { id: 'ijsarena-alarm', x: 33.5, y: 73.7, radius: 8, sampleId: 'ijsarena-alarm', visualHint: 'pulse' },
      { id: 'ijsarena-brancard', x: 94, y: 40.8, radius: 8, sampleId: 'ijsarena-brancard', visualHint: 'pulse' },
      { id: 'ijsarena-juichen', x: 55, y: 35.2, radius: 8, sampleId: 'ijsarena-juichen', visualHint: 'pulse' },
      { id: 'ijsarena-lamp', x: 45.3, y: 12, radius: 8, sampleId: 'ijsarena-lamp', visualHint: 'pulse' },
      { id: 'ijsarena-werkplaats', x: 12.5, y: 40.8, radius: 8, sampleId: 'ijsarena-werkplaats', visualHint: 'pulse' },
      { id: 'ijsarena-puck', x: 73.1, y: 51.3, radius: 8, sampleId: 'ijsarena-puck', visualHint: 'pulse' },
      { id: 'ijsarena-wagen', x: 89.1, y: 85.8, radius: 8, sampleId: 'ijsarena-wagen', visualHint: 'pulse' },
    ],
  },
];
