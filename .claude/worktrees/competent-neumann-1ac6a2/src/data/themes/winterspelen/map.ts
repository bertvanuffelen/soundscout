/**
 * Map configuration for the 'winterspelen' theme.
 */

import type { MapConfig } from '../types';

export const mapConfig: MapConfig = {
  backgroundImage: '/images/themes/winterspelen/plattegrond.jpg',

  locationPositions: [
    { locationId: 'winterdorp', x: 83.2, y: 78.8 },    // Olympisch dorp
    { locationId: 'bobslee', x: 24.3, y: 72.6 },
    { locationId: 'skipiste', x: 67.5, y: 31.9 },
    { locationId: 'ijsarena', x: 15.3, y: 23.3 },
  ],
};
