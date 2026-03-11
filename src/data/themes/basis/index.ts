/**
 * Basis Theme
 *
 * The default theme for SoundScout.
 * Contains the Boerderij location.
 */

import type { ThemeConfig } from '../types';
import { locations } from './locations';
import { samples } from './samples';
import { mapConfig } from './map';
import { storyboards } from './storyboards';

export const basisTheme: ThemeConfig = {
  id: 'basis',
  name: 'themes.basis.name',
  description: 'themes.basis.description',
  isPublic: true,

  locations,
  samples,
  map: mapConfig,
  storyboards,

  // Default colors (no override needed)
  colors: undefined,
};
