/**
 * Theme System Types
 *
 * Defines the structure for themes in SoundScout.
 * Each theme contains its own locations, samples, and map configuration.
 */

import type { Location, Sample } from '../../types';

/**
 * Position of a location on the map.
 */
export interface LocationPosition {
  /** Location ID (must match a location in the theme) */
  locationId: string;

  /** X position as percentage (0-100) */
  x: number;

  /** Y position as percentage (0-100) */
  y: number;

  /** Optional: custom icon URL for the map */
  iconUrl?: string;

  /** Size of the marker (default: 'md') */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Map configuration for a theme.
 */
export interface MapConfig {
  /** Background image for the map */
  backgroundImage: string;

  /** Positions of locations on the map */
  locationPositions: LocationPosition[];
}

/**
 * Optional color overrides for a theme.
 */
export interface ThemeColors {
  /** Primary color (buttons, accents) */
  primary?: string;

  /** Accent color (highlights) */
  accent?: string;

  /** Map background color (fallback if no image) */
  mapBackground?: string;
}

/**
 * Complete theme configuration.
 */
export interface ThemeConfig {
  /** Unique identifier, used in URL param */
  id: string;

  /** Display name (i18n key) */
  name: string;

  /** Description (i18n key) */
  description: string;

  /**
   * Is this theme visible to users?
   * false = only accessible via ?theme=xxx URL parameter
   */
  isPublic: boolean;

  /**
   * Seizoensvenster (optioneel), formaat 'MM-DD'. Buiten het venster
   * verdwijnt het thema uit de publieke kiezers (thema-picker, vrije
   * opdracht); directe toegang via ?theme= blijft altijd werken.
   * Jaargrens-overlap wordt ondersteund (bv. activeFrom '11-15' met
   * activeUntil '01-15' = half november t/m half januari).
   * Beide velden samen zetten, anders geldt het venster niet.
   */
  activeFrom?: string;
  activeUntil?: string;

  /** All locations in this theme */
  locations: Location[];

  /** All samples in this theme */
  samples: Sample[];

  /** Map configuration */
  map: MapConfig;

  /** Optional color overrides */
  colors?: ThemeColors;
}
