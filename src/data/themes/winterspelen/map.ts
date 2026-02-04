/**
 * Map configuration for the 'winterspelen' theme.
 */

import type { MapConfig } from '../types';

export const mapConfig: MapConfig = {
  backgroundImage: '/images/themes/winterspelen/plattegrond.png',

  // TODO: Pas x/y posities aan naar de juiste plekken op de plattegrond
  locationPositions: [
    { locationId: 'winterdorp', x: 25, y: 70 },
    { locationId: 'bobsleebaan', x: 75, y: 30 },
    { locationId: 'skipiste', x: 50, y: 50 },
    { locationId: 'ijsarena', x: 20, y: 25 },
  ],
};
