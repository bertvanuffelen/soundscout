/**
 * Zod Validation Schemas
 *
 * Runtime validation for data at system boundaries:
 * - localStorage reads (compositions, library, preferences)
 * - Supabase responses (shared compositions, submissions)
 *
 * These schemas complement TypeScript's compile-time checks
 * with runtime validation for untrusted data sources.
 */

import { z } from 'zod';

// =============================================================================
// CORE SCHEMAS
// =============================================================================

export const ClipEffectsSchema = z.object({
  volume: z.number(),
  pitch: z.number(),
  reverb: z.number(),
  pan: z.number(),
});

export const ClipSchema = z.object({
  id: z.string(),
  sampleId: z.string(),
  startBeat: z.number().min(0),
  effects: ClipEffectsSchema.optional(),
  trimStart: z.number().min(0).optional(),
  trimEnd: z.number().min(0).optional(),
});

export const TrackSchema = z.object({
  id: z.string(),
  clips: z.array(ClipSchema),
});

export const SampleSchema = z.object({
  id: z.string(),
  name: z.string(),
  locationId: z.string(),
  audioUrl: z.string(),
  duration: z.number().positive(),
  icon: z.string(),
  color: z.string(),
});

// =============================================================================
// COMPOSITION DATA (Supabase JSONB)
// =============================================================================

export const CompositionDataSchema = z.object({
  tracks: z.array(TrackSchema),
  bpm: z.number().positive(),
  totalBeats: z.number().positive(),
  isLooping: z.boolean(),
  samples: z.array(SampleSchema),
});

// =============================================================================
// TIMELINE STATE (internal)
// =============================================================================

export const TimelineStateSchema = z.object({
  tracks: z.array(TrackSchema),
  bpm: z.number().positive(),
  totalBeats: z.number().positive(),
  isPlaying: z.boolean(),
  isLooping: z.boolean(),
  currentBeat: z.number().min(0),
});

// =============================================================================
// SAVED COMPOSITION (localStorage)
// =============================================================================

export const CompositionMetadataSchema = z.object({
  duration: z.number().min(0),
  trackCount: z.number().min(0),
  clipCount: z.number().min(0),
  locations: z.array(z.string()),
});

export const SavedCompositionSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  timeline: TimelineStateSchema,
  samples: z.array(SampleSchema),
  metadata: CompositionMetadataSchema,
  shareCode: z.string().optional(),
  sharedAt: z.string().optional(),
});

// =============================================================================
// USER PREFERENCES (localStorage)
// =============================================================================

export const UserPreferencesSchema = z.object({
  masterVolume: z.number().min(0).max(1),
  language: z.string(),
  showHints: z.boolean(),
});

// =============================================================================
// LIBRARY STATE (localStorage)
// =============================================================================

export const LibraryStateSchema = z.object({
  samples: z.array(SampleSchema),
});

// =============================================================================
// PARSE HELPERS
// =============================================================================

/**
 * Safely parse composition data from an untrusted source (Supabase JSONB).
 * Returns null if validation fails.
 */
export function parseCompositionData(data: unknown) {
  const result = CompositionDataSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Safely parse saved compositions from localStorage.
 * Filters out any invalid compositions and returns only valid ones.
 */
export function parseSavedCompositions(data: unknown) {
  if (!Array.isArray(data)) return [];
  return data.filter((item) => SavedCompositionSchema.safeParse(item).success);
}

/**
 * Safely parse user preferences from localStorage.
 * Returns null if validation fails (caller should use defaults).
 */
export function parseUserPreferences(data: unknown) {
  const result = UserPreferencesSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Safely parse library state from localStorage.
 * Returns null if validation fails.
 */
export function parseLibraryState(data: unknown) {
  const result = LibraryStateSchema.safeParse(data);
  return result.success ? result.data : null;
}
