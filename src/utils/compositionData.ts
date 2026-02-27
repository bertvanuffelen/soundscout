/**
 * Runtime validatie voor CompositionData
 *
 * Nodig omdat data uit Supabase (JSONB) als `unknown` binnenkomt.
 * TypeScript types beschermen alleen compile-time, niet runtime.
 */

import type { CompositionData } from '../types';

/**
 * Type guard die controleert of data een geldige CompositionData structuur heeft.
 * Controleert alleen top-level structuur — geen deep validation van tracks/samples.
 */
export function isValidCompositionData(data: unknown): data is CompositionData {
  if (!data || typeof data !== 'object') return false;

  const d = data as Record<string, unknown>;

  return (
    Array.isArray(d.tracks) &&
    typeof d.bpm === 'number' &&
    typeof d.totalBeats === 'number' &&
    typeof d.isLooping === 'boolean' &&
    Array.isArray(d.samples)
  );
}

/**
 * Probeer unknown data te parsen als CompositionData.
 * Retourneert null als de data niet geldig is.
 */
export function parseCompositionData(data: unknown): CompositionData | null {
  if (isValidCompositionData(data)) {
    return data;
  }
  return null;
}
