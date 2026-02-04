/**
 * Winterspelen Theme
 *
 * Winter sports themed locations for SoundScout.
 */

import type { ThemeConfig } from '../types';
import { locations } from './locations';
import { samples } from './samples';
import { mapConfig } from './map';

export const winterspelenTheme: ThemeConfig = {
  id: 'winterspelen',
  name: 'themes.winterspelen.name',
  description: 'themes.winterspelen.description',
  isPublic: false, // Set to true when ready for public use

  locations,
  samples,
  map: mapConfig,

  // Winter theme colors (optional)
  colors: {
    primary: '#3B82F6', // blue-500
    accent: '#60A5FA',  // blue-400
    mapBackground: '#E0F2FE', // sky-100
  },
};
