/**
 * Map configuration for the 'basis' theme.
 *
 * Defines the visual layout of the city map.
 */

import type { MapConfig } from '../types';

export const mapConfig: MapConfig = {
  // Background image for the map (city overview)
  backgroundImage: '/images/themes/basis/plattegrond.jpg',

  // Positions of locations on the map
  // Note: size is optional, defaults to 'md' (40x40px mobile, 64x64px desktop)
  locationPositions: [
    { locationId: 'boerderij', x: 12.7, y: 80.6 },
    { locationId: 'speeltuin', x: 64.6, y: 39.1 },
    { locationId: 'gymzaal', x: 11.2, y: 46.9 },
    { locationId: 'muziekwinkel', x: 32.8, y: 23.8 },
    { locationId: 'klaslokaal', x: 81.3, y: 25.9 },
  ],
};
