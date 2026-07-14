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
  isPublic: false, // alleen via ?theme=piraten (nog niet zichtbaar voor gebruikers)

  locations,
  samples,
  map: mapConfig,

  colors: {
    primary: '#0E8C8C',
    accent: '#E8A02C',
    mapBackground: '#F3E1BE',
  },
};
