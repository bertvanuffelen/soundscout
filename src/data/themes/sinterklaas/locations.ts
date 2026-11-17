/**
 * Locaties voor het thema 'sinterklaas'.
 * Hotspot-posities: schattingen uit de thema-studio (.thema-studio/sinterklaas/LOGBOEK.md),
 * vooraf getoetst aan de V2-ontwerpregels (veilige zone 12–88 %, 44 px afstand op de
 * kleinste scène). Fijnafstemming via /editor.
 * LET OP: stoomboot.jpg is nog niet goedgekeurd en ontbreekt nog (zie INTEGRATIE.md).
 */

import type { Location } from '../../../types';

export const locations: Location[] = [
  {
    id: 'stoomboot',
    name: 'themes.sinterklaas.locations.stoomboot',
    description: 'themes.sinterklaas.locations.stoomboot_desc',
    backgroundImage: '/images/themes/sinterklaas/stoomboot.jpg',
    ambientAudio: '',
    unlocked: true,
    hotspots: [
      { id: 'stoomboot-fluit', x: 25, y: 25, sampleId: 'stoomboot-fluit', visualHint: 'pulse' },
      { id: 'stoomboot-machine', x: 24, y: 62, sampleId: 'stoomboot-machine', visualHint: 'pulse' },
      { id: 'stoomboot-golven', x: 12, y: 85, sampleId: 'stoomboot-golven', visualHint: 'pulse' },
      { id: 'stoomboot-bel', x: 63, y: 42, sampleId: 'stoomboot-bel', visualHint: 'pulse' },
      { id: 'stoomboot-juichen', x: 80, y: 48, sampleId: 'stoomboot-juichen', visualHint: 'pulse' },
      { id: 'stoomboot-fanfare', x: 90, y: 60, sampleId: 'stoomboot-fanfare', visualHint: 'pulse' },
    ],
  },
  {
    id: 'dak',
    name: 'themes.sinterklaas.locations.dak',
    description: 'themes.sinterklaas.locations.dak_desc',
    backgroundImage: '/images/themes/sinterklaas/dak.jpg',
    ambientAudio: '',
    unlocked: true,
    hotspots: [
      { id: 'dak-hoeven', x: 50, y: 60, sampleId: 'dak-hoeven', visualHint: 'pulse' },
      { id: 'dak-hinnik', x: 61, y: 37, sampleId: 'dak-hinnik', visualHint: 'pulse' },
      { id: 'dak-wind', x: 27, y: 17, sampleId: 'dak-wind', visualHint: 'pulse' },
      { id: 'dak-schoorsteen', x: 73, y: 43, sampleId: 'dak-schoorsteen', visualHint: 'pulse' },
      { id: 'dak-torenklok', x: 86, y: 17, sampleId: 'dak-torenklok', visualHint: 'pulse' },
      { id: 'dak-sluipen', x: 15, y: 80, sampleId: 'dak-sluipen', visualHint: 'pulse' },
    ],
  },
  {
    id: 'pakjeskamer',
    name: 'themes.sinterklaas.locations.pakjeskamer',
    description: 'themes.sinterklaas.locations.pakjeskamer_desc',
    backgroundImage: '/images/themes/sinterklaas/pakjeskamer.jpg',
    ambientAudio: '',
    unlocked: true,
    hotspots: [
      { id: 'pakjeskamer-papier', x: 13, y: 32, sampleId: 'pakjeskamer-papier', visualHint: 'pulse' },
      { id: 'pakjeskamer-plakband', x: 33, y: 62, sampleId: 'pakjeskamer-plakband', visualHint: 'pulse' },
      { id: 'pakjeskamer-schaar', x: 44, y: 74, sampleId: 'pakjeskamer-schaar', visualHint: 'pulse' },
      { id: 'pakjeskamer-lopendeband', x: 62, y: 55, sampleId: 'pakjeskamer-lopendeband', visualHint: 'pulse' },
      { id: 'pakjeskamer-inpakmachine', x: 82, y: 52, sampleId: 'pakjeskamer-inpakmachine', visualHint: 'pulse' },
      { id: 'pakjeskamer-speeldoos', x: 90, y: 22, sampleId: 'pakjeskamer-speeldoos', visualHint: 'pulse' },
    ],
  },
  {
    id: 'bakkerij',
    name: 'themes.sinterklaas.locations.bakkerij',
    description: 'themes.sinterklaas.locations.bakkerij_desc',
    backgroundImage: '/images/themes/sinterklaas/bakkerij.jpg',
    ambientAudio: '',
    unlocked: true,
    hotspots: [
      { id: 'bakkerij-deeg', x: 15, y: 45, sampleId: 'bakkerij-deeg', visualHint: 'pulse' },
      { id: 'bakkerij-strooien', x: 52, y: 22, sampleId: 'bakkerij-strooien', visualHint: 'pulse' },
      { id: 'bakkerij-ovenbel', x: 75, y: 20, sampleId: 'bakkerij-ovenbel', visualHint: 'pulse' },
      { id: 'bakkerij-deegmachine', x: 31, y: 40, sampleId: 'bakkerij-deegmachine', visualHint: 'pulse' },
      { id: 'bakkerij-knabbelen', x: 73, y: 70, sampleId: 'bakkerij-knabbelen', visualHint: 'pulse' },
      { id: 'bakkerij-ritme', x: 52, y: 58, sampleId: 'bakkerij-ritme', visualHint: 'pulse' },
    ],
  },
  {
    id: 'huiskamer',
    name: 'themes.sinterklaas.locations.huiskamer',
    description: 'themes.sinterklaas.locations.huiskamer_desc',
    backgroundImage: '/images/themes/sinterklaas/huiskamer.jpg',
    ambientAudio: '',
    unlocked: true,
    hotspots: [
      { id: 'huiskamer-klop', x: 8, y: 40, sampleId: 'huiskamer-klop', visualHint: 'pulse' },
      { id: 'huiskamer-deurbel', x: 17, y: 17, sampleId: 'huiskamer-deurbel', visualHint: 'pulse' },
      { id: 'huiskamer-haard', x: 43, y: 48, sampleId: 'huiskamer-haard', visualHint: 'pulse' },
      { id: 'huiskamer-voetstappen', x: 86, y: 40, sampleId: 'huiskamer-voetstappen', visualHint: 'pulse' },
      { id: 'huiskamer-zak', x: 64, y: 72, sampleId: 'huiskamer-zak', visualHint: 'pulse' },
      { id: 'huiskamer-piano', x: 26, y: 40, sampleId: 'huiskamer-piano', visualHint: 'pulse' },
    ],
  },
];
