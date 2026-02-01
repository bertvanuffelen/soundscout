/**
 * Locations for the 'test-metro' theme.
 *
 * This is a TEST theme - only accessible via ?theme=test-metro
 * Contains placeholder data for testing the theme system.
 */

import type { Location } from '../../../types';

export const locations: Location[] = [
  {
    id: 'metro',
    name: 'locations.metro.name',
    description: 'locations.metro.description',
    backgroundImage: '/images/themes/test-metro/metro.png',
    ambientAudio: '',
    unlocked: true,
    hotspots: [
      {
        id: 'metro-train',
        x: 50,
        y: 40,
        radius: 5,
        sampleId: 'metro-train',
        visualHint: 'pulse',
      },
      {
        id: 'metro-announcement',
        x: 20,
        y: 30,
        radius: 4,
        sampleId: 'metro-announcement',
        visualHint: 'glow',
      },
      {
        id: 'metro-doors',
        x: 70,
        y: 50,
        radius: 4,
        sampleId: 'metro-doors',
        visualHint: 'pulse',
      },
    ],
  },
];
