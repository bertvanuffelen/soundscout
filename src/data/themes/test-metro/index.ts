/**
 * Test Metro Theme
 *
 * A TEST theme for development purposes.
 * Only accessible via URL: ?theme=test-metro
 *
 * Note: Audio files don't exist yet - this is for testing the theme system.
 */

import type { ThemeConfig } from '../types';
import { locations } from './locations';
import { samples } from './samples';
import { mapConfig } from './map';

export const testMetroTheme: ThemeConfig = {
  id: 'test-metro',
  name: 'themes.test-metro.name',
  description: 'themes.test-metro.description',
  isPublic: false, // Only accessible via URL param

  locations,
  samples,
  map: mapConfig,

  colors: {
    primary: '#3B82F6', // blue
    accent: '#EF4444', // red
  },
};
