/**
 * Map configuration for the 'piraten' theme.
 */

import type { MapConfig } from '../types';

export const mapConfig: MapConfig = {
  backgroundImage: '/images/themes/piraten/plattegrond.jpg',
  backgroundImageByLocale: {
    en: '/images/themes/piraten/plattegrond-en.jpg',
  },

  locationPositions: [
    { locationId: 'grogkroeg', x: 16, y: 40 },
    { locationId: 'haven', x: 38, y: 18 },
    { locationId: 'schip', x: 48, y: 48 },
    { locationId: 'jungle', x: 72, y: 30 },
    { locationId: 'voodoohut', x: 62, y: 72 },
  ],
};
