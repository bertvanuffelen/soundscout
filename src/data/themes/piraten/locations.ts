/**
 * Locations for the 'piraten' theme.
 * Hotspot-posities: startadvies uit de thema-studio; fijnafstemming via /editor.
 */

import type { Location } from '../../../types';

export const locations: Location[] = [
  {
    id: 'grogkroeg',
    name: 'themes.piraten.locations.grogkroeg',
    description: 'themes.piraten.locations.grogkroeg_desc',
    backgroundImage: '/images/themes/piraten/grogkroeg.jpg',
    ambientAudio: '',
    unlocked: true,
    hotspots: [
      { id: 'grogkroeg-accordeon', x: 52, y: 40, sampleId: 'grogkroeg-accordeon', visualHint: 'pulse' },
      { id: 'grogkroeg-kroezen', x: 40, y: 28, sampleId: 'grogkroeg-kroezen', visualHint: 'pulse' },
      { id: 'grogkroeg-papegaai', x: 78, y: 22, sampleId: 'grogkroeg-papegaai', visualHint: 'pulse' },
      { id: 'grogkroeg-lach', x: 24, y: 44, sampleId: 'grogkroeg-lach', visualHint: 'pulse' },
      { id: 'grogkroeg-deur', x: 90, y: 34, sampleId: 'grogkroeg-deur', visualHint: 'pulse' },
      { id: 'grogkroeg-dobbel', x: 66, y: 62, sampleId: 'grogkroeg-dobbel', visualHint: 'pulse' },
      { id: 'grogkroeg-vat', x: 84, y: 60, sampleId: 'grogkroeg-vat', visualHint: 'pulse' },
      { id: 'grogkroeg-fluit', x: 14, y: 40, sampleId: 'grogkroeg-fluit', visualHint: 'pulse' },
    ],
  },
  {
    id: 'haven',
    name: 'themes.piraten.locations.haven',
    description: 'themes.piraten.locations.haven_desc',
    backgroundImage: '/images/themes/piraten/haven.jpg',
    ambientAudio: '',
    unlocked: true,
    hotspots: [
      { id: 'haven-meeuwen', x: 12, y: 30, sampleId: 'haven-meeuwen', visualHint: 'pulse' },
      { id: 'haven-golven', x: 30, y: 58, sampleId: 'haven-golven', visualHint: 'pulse' },
      { id: 'haven-scheepsbel', x: 44, y: 26, sampleId: 'haven-scheepsbel', visualHint: 'pulse' },
      { id: 'haven-katrol', x: 26, y: 44, sampleId: 'haven-katrol', visualHint: 'pulse' },
      { id: 'haven-kraan', x: 58, y: 32, sampleId: 'haven-kraan', visualHint: 'pulse' },
      { id: 'haven-kist', x: 68, y: 44, sampleId: 'haven-kist', visualHint: 'pulse' },
      { id: 'haven-boei', x: 84, y: 64, sampleId: 'haven-boei', visualHint: 'pulse' },
    ],
  },
  {
    id: 'schip',
    name: 'themes.piraten.locations.schip',
    description: 'themes.piraten.locations.schip_desc',
    backgroundImage: '/images/themes/piraten/schip.jpg',
    ambientAudio: '',
    unlocked: true,
    hotspots: [
      { id: 'schip-zeilen', x: 30, y: 20, sampleId: 'schip-zeilen', visualHint: 'pulse' },
      { id: 'schip-kanon', x: 20, y: 66, sampleId: 'schip-kanon', visualHint: 'pulse' },
      { id: 'schip-anker', x: 84, y: 72, sampleId: 'schip-anker', visualHint: 'pulse' },
      { id: 'schip-zeemanslied', x: 50, y: 50, sampleId: 'schip-zeemanslied', visualHint: 'pulse' },
      { id: 'schip-wind', x: 66, y: 22, sampleId: 'schip-wind', visualHint: 'pulse' },
      { id: 'schip-stuurwiel', x: 24, y: 38, sampleId: 'schip-stuurwiel', visualHint: 'pulse' },
      { id: 'schip-kraaiennest', x: 60, y: 14, sampleId: 'schip-kraaiennest', visualHint: 'pulse' },
    ],
  },
  {
    id: 'jungle',
    name: 'themes.piraten.locations.jungle',
    description: 'themes.piraten.locations.jungle_desc',
    backgroundImage: '/images/themes/piraten/jungle.jpg',
    ambientAudio: '',
    unlocked: true,
    hotspots: [
      { id: 'jungle-apen', x: 14, y: 20, sampleId: 'jungle-apen', visualHint: 'pulse' },
      { id: 'jungle-vogels', x: 80, y: 16, sampleId: 'jungle-vogels', visualHint: 'pulse' },
      { id: 'jungle-waterval', x: 84, y: 44, sampleId: 'jungle-waterval', visualHint: 'pulse' },
      { id: 'jungle-trommels', x: 22, y: 40, sampleId: 'jungle-trommels', visualHint: 'pulse' },
      { id: 'jungle-krekels', x: 60, y: 66, sampleId: 'jungle-krekels', visualHint: 'pulse' },
      { id: 'jungle-kokosnoot', x: 48, y: 30, sampleId: 'jungle-kokosnoot', visualHint: 'pulse' },
      { id: 'jungle-slang', x: 40, y: 70, sampleId: 'jungle-slang', visualHint: 'pulse' },
    ],
  },
  {
    id: 'voodoohut',
    name: 'themes.piraten.locations.voodoohut',
    description: 'themes.piraten.locations.voodoohut_desc',
    backgroundImage: '/images/themes/piraten/voodoohut.jpg',
    ambientAudio: '',
    unlocked: true,
    hotspots: [
      { id: 'voodoohut-ketel', x: 48, y: 58, sampleId: 'voodoohut-ketel', visualHint: 'pulse' },
      { id: 'voodoohut-botten', x: 20, y: 50, sampleId: 'voodoohut-botten', visualHint: 'pulse' },
      { id: 'voodoohut-gong', x: 78, y: 40, sampleId: 'voodoohut-gong', visualHint: 'pulse' },
      { id: 'voodoohut-windgong', x: 10, y: 32, sampleId: 'voodoohut-windgong', visualHint: 'pulse' },
      { id: 'voodoohut-fluister', x: 14, y: 44, sampleId: 'voodoohut-fluister', visualHint: 'pulse' },
      { id: 'voodoohut-druppel', x: 66, y: 20, sampleId: 'voodoohut-druppel', visualHint: 'pulse' },
      { id: 'voodoohut-raaf', x: 86, y: 20, sampleId: 'voodoohut-raaf', visualHint: 'pulse' },
    ],
  },
];
