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
  mute: z.boolean().optional(),
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
  fromTemplate: z.boolean().optional(),
  label: z.string().max(30).optional(),
  // #65 Clip Loop
  loop: z.boolean().optional(),
  loopDurationBeats: z.number().positive().optional(),
});

export const TrackSchema = z.object({
  id: z.string(),
  clips: z.array(ClipSchema),
  volume: z.number().optional(),
  mute: z.boolean().optional(),
  color: z.string().optional(),
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
// SECTIONS (Musical Form / Vormschema)
// =============================================================================

export const SectionSchema = z.object({
  id: z.string(),
  endBeat: z.number().min(0),
  color: z.string(),
  label: z.string().max(50).optional(),
  fromStoryboard: z.boolean().optional(),
  // Storytelling fields (#41) — optional, not yet in UI
  title: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
});

// =============================================================================
// COMPOSITION DATA (Supabase JSONB)
// =============================================================================

// Praatplaat snapshot (#72) — persisted so praatplaat-compositions can be
// fully reconstructed when re-opened.
export const ActivePraatplaatSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string(),
  classId: z.string(),
  classCode: z.string(),
  themeId: z.string(),
  locationId: z.string(),
});

export const PraatplaatPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const CompositionDataSchema = z.object({
  tracks: z.array(TrackSchema),
  bpm: z.number().positive(),
  totalBeats: z.number().positive(),
  isLooping: z.boolean(),
  samples: z.array(SampleSchema),
  sections: z.array(SectionSchema).optional(),
  storyboardId: z.string().optional(),
  praatplaat: ActivePraatplaatSchema.optional(),
  praatplaatPosition: PraatplaatPositionSchema.optional(),
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
  sections: z.array(SectionSchema).optional(),
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
  storyboardId: z.string().optional(),
  praatplaat: ActivePraatplaatSchema.optional(),
  praatplaatPosition: PraatplaatPositionSchema.optional(),
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
