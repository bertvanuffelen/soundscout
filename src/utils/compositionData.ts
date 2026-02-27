/**
 * Runtime validatie voor CompositionData
 *
 * Nodig omdat data uit Supabase (JSONB) als `unknown` binnenkomt.
 * TypeScript types beschermen alleen compile-time, niet runtime.
 *
 * Gebruikt zod schemas uit schemas.ts voor deep validation.
 */

import type { CompositionData } from '../types';
import { CompositionDataSchema } from './schemas';

/**
 * Type guard die controleert of data een geldige CompositionData structuur heeft.
 * Valideert de volledige structuur inclusief tracks, clips, en samples.
 */
export function isValidCompositionData(data: unknown): data is CompositionData {
  return CompositionDataSchema.safeParse(data).success;
}

/**
 * Probeer unknown data te parsen als CompositionData.
 * Retourneert null als de data niet geldig is.
 */
export function parseCompositionData(data: unknown): CompositionData | null {
  const result = CompositionDataSchema.safeParse(data);
  return result.success ? (result.data as CompositionData) : null;
}
