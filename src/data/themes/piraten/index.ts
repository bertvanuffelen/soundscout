/**
 * Piraten Theme (Monkey Island-sfeer) — visueel en hotspots af; 12 geluiden zijn
 * nog dummy-tonen (9 sfx + 3 loops), zie BRONNEN.md.
 */

import type { ThemeConfig } from '../types';
import { locations } from './locations';
import { samples } from './samples';
import { mapConfig } from './map';

export const piratenTheme: ThemeConfig = {
  id: 'piraten',
  name: 'themes.piraten.name',
  description: 'themes.piraten.description',
  // Besluit Bert 6-10: verborgen tot alle geluiden op orde zijn (12 dummy-tonen).
  // Verbergt het thema én zijn storyboards/praatplaat uit alle kiezers; lopende
  // opdrachten en ?theme=piraten blijven gewoon werken.
  isPublic: false,

  locations,
  samples,
  map: mapConfig,

  colors: {
    primary: '#0E8C8C',
    accent: '#E8A02C',
    mapBackground: '#F3E1BE',
  },
};
