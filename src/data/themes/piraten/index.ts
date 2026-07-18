/**
 * Piraten Theme (Monkey Island-sfeer) — visueel geïntegreerd; audio volgt.
 */

import type { ThemeConfig } from '../types';
import { locations } from './locations';
import { samples } from './samples';
import { mapConfig } from './map';

export const piratenTheme: ThemeConfig = {
  id: 'piraten',
  name: 'themes.piraten.name',
  description: 'themes.piraten.description',
  isPublic: true, // besluit 18-7: thema is compleet (22 echte geluiden) en gaat publiek mee

  locations,
  samples,
  map: mapConfig,

  colors: {
    primary: '#0E8C8C',
    accent: '#E8A02C',
    mapBackground: '#F3E1BE',
  },
};
