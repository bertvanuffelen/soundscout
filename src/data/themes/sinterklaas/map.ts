/**
 * Kaartconfiguratie voor het thema 'sinterklaas'.
 */

import type { MapConfig } from '../types';

export const mapConfig: MapConfig = {
  backgroundImage: '/images/themes/sinterklaas/plattegrond.jpg',
  backgroundImageByLocale: {
    en: '/images/themes/sinterklaas/plattegrond-en.jpg',
  },

  locationPositions: [
    { locationId: 'stoomboot', x: 17, y: 62 },
    { locationId: 'dak', x: 48, y: 22 },
    { locationId: 'pakjeskamer', x: 78, y: 35 },
    { locationId: 'bakkerij', x: 61, y: 70 },
    { locationId: 'huiskamer', x: 82, y: 72 },
  ],
};
