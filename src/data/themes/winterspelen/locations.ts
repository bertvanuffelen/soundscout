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
    backgroundImage: '/images/themes/winterspelen/winterdorp.png',
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
    backgroundImage: '/images/themes/winterspelen/bobsleebaan.png',
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
    backgroundImage: '/images/themes/winterspelen/skipiste.png',
    ambientAudio: '',
    unlocked: true,
    hotspots: [
      { id: 'skipiste-1', x: 30, y: 50, radius: 8, sampleId: 'skipiste-placeholder-1', visualHint: 'glow' },
      { id: 'skipiste-2', x: 70, y: 50, radius: 8, sampleId: 'skipiste-placeholder-2', visualHint: 'glow' },
    ],
  },
  {
    id: 'ijsarena',
    name: 'themes.winterspelen.locations.ijsarena',
    description: 'themes.winterspelen.locations.ijsarena_desc',
    backgroundImage: '/images/themes/winterspelen/ijsarena.png',
    ambientAudio: '',
    unlocked: true,
    hotspots: [
      { id: 'ijsarena-1', x: 30, y: 50, radius: 8, sampleId: 'ijsarena-placeholder-1', visualHint: 'glow' },
      { id: 'ijsarena-2', x: 70, y: 50, radius: 8, sampleId: 'ijsarena-placeholder-2', visualHint: 'glow' },
    ],
  },
];
