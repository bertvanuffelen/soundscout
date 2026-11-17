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
import { ALLOWED_BPMS, DEFAULT_BPM } from '../constants/config';
import { CLIP_SPEEDS } from '../types';
import { logger } from './logger';

// =============================================================================
// CORE SCHEMAS
// =============================================================================

/**
 * Optioneel veld dat bij ongeldige waarden stil wegvalt (= neutraal) in
 * plaats van de hele compositie af te keuren. Voor de Vervormen-effecten
 * (V2 Fase 4): oude data zonder het veld én rommel in het veld laden allebei.
 */
function lenient<T extends z.ZodTypeAny>(schema: T) {
  return schema.optional().catch(undefined);
}

export const ClipEffectsSchema = z.object({
  volume: z.number(),
  mute: z.boolean().optional(),
  pitch: z.number(),
  reverb: z.number(),
  fadeIn: z.number().optional().default(0),
  fadeOut: z.number().optional().default(0),
  // V2 Fase 4 — Vervormen. Afwezig = neutraal; zo blijft elke bestaande
  // compositie, bewaarcode, inzending en template ongewijzigd laden.
  // (Een oudere client strip't deze onbekende velden: z.object is niet strict.)
  speed: lenient(z.literal(CLIP_SPEEDS)),
  reverse: lenient(z.boolean()),
  echo: lenient(z.number().min(0).max(100)),
  filter: lenient(z.number().min(-100).max(100)),
});

/**
 * Tempo: alleen de vier toegestane waarden. Iets anders (oude of
 * gemanipuleerde data) valt terug op 120 met een waarschuwing — nooit een
 * afgekeurde compositie.
 */
export const BpmSchema = z.unknown().transform((value): number => {
  if (typeof value === 'number' && (ALLOWED_BPMS as readonly number[]).includes(value)) {
    return value;
  }
  logger.warn('Ongeldig tempo in opgeslagen data — terug naar standaardtempo', {
    bpm: value,
    fallback: DEFAULT_BPM,
  });
  return DEFAULT_BPM;
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
  // Geluidseffect (designronde nov 2026)
  effectSoundId: z.string().max(64).optional(),
});

/** Geluidseffect: brongeluid + Vervormen-instellingen (chip in de bibliotheek) */
export const EffectSoundSchema = z.object({
  id: z.string().max(64),
  name: z.string().min(1).max(60),
  sourceSampleId: z.string(),
  effects: ClipEffectsSchema.partial(),
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
  /** V2 Fase 4: 'loop' rekt mee met het tempo. Afwezig/ongeldig = onbekend (register). */
  kind: lenient(z.enum(['sfx', 'loop'])),
});

// =============================================================================
// SEQUENCER (fase 2 — sequences geëmbed in de compositie)
// =============================================================================

export const SequencerTrackSchema = z.object({
  id: z.string(),
  sampleId: z.string().nullable(),
  steps: z.array(z.boolean()).min(4).max(32),
  mode: z.enum(['ring', 'cut']),
  trimStart: z.number().min(0).optional(),
  trimEnd: z.number().min(0).optional(),
  volume: z.number().min(0).max(1).optional(),
  mute: z.boolean().optional(),
  /** V2 Fase 4: aanslagsterkte per vakje (0..1 → gain); afwezig = alles 1 */
  velocities: lenient(z.array(z.number().min(0).max(1)).max(32)),
});

// --- Melodie-sequence (V2 Fase 4, alleen datamodel + events) ---

export const MelodyVoiceSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('sample'),
    sampleId: z.string().nullable(),
    baseNote: z.number().int().min(0).max(127).optional(),
  }),
  z.object({
    type: z.literal('synth'),
    preset: z.enum(['soft', 'bright', 'pluck']),
  }),
]);

export const MelodyNoteSchema = z.object({
  step: z.number().int().min(0).max(31),
  row: z.number().int().min(0).max(35),
  length: z.number().int().min(1).max(32).optional(),
  velocity: z.number().min(0).max(1).optional(),
});

export const MelodyPatternSchema = z.object({
  root: z.number().int().min(24).max(96),
  scale: z.array(z.number().int().min(0).max(11)).min(1).max(12),
  octaves: z.number().int().min(1).max(3),
  voice: MelodyVoiceSchema,
  notes: z.array(MelodyNoteSchema).max(512),
  volume: z.number().min(0).max(1).optional(),
  mute: z.boolean().optional(),
});

export const SequencerSequenceSchema = z.object({
  id: z.string(),
  name: z.string().max(60),
  color: z.string().optional(),
  lengthSteps: z.number().int().min(4).max(32),
  bpm: z.number().positive(),
  tracks: z.array(SequencerTrackSchema).min(1).max(8),
  // V2 Fase 4. Afwezig = 'rhythm' zonder swing — exact het gedrag van vóór.
  // Een melodie-sequence houdt bewust ≥1 (leeg) ritmespoor in `tracks`, zodat
  // een oudere client hem als stille ritme-sequence leest i.p.v. af te keuren.
  kind: lenient(z.enum(['rhythm', 'melody'])),
  swing: lenient(z.number().min(0).max(0.5)),
  melody: lenient(MelodyPatternSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
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
  /** Formaat van de data (buildCompositionData.ts, migratie 046); ontbreekt bij V1-werk */
  formatVersion: z.number().int().positive().optional(),
  tracks: z.array(TrackSchema),
  bpm: BpmSchema,
  totalBeats: z.number().positive(),
  isLooping: z.boolean(),
  samples: z.array(SampleSchema),
  sections: z.array(SectionSchema).optional(),
  storyboardId: z.string().optional(),
  praatplaat: ActivePraatplaatSchema.optional(),
  praatplaatPosition: PraatplaatPositionSchema.optional(),
  /** Sequencer-patronen (fase 2) — levend bewerkbaar, geëmbed */
  sequences: z.array(SequencerSequenceSchema).optional(),
  /** Geluidseffecten (designronde nov 2026) */
  effectSounds: z.array(EffectSoundSchema).max(50).optional(),
});

// =============================================================================
// TIMELINE STATE (internal)
// =============================================================================

export const TimelineStateSchema = z.object({
  tracks: z.array(TrackSchema),
  bpm: BpmSchema,
  totalBeats: z.number().positive(),
  isLooping: z.boolean(),
  sections: z.array(SectionSchema).optional(),
  /** Sequencer-patronen (fase 2) — levend bewerkbaar, geëmbed */
  sequences: z.array(SequencerSequenceSchema).optional(),
  /** Geluidseffecten (designronde nov 2026) */
  effectSounds: z.array(EffectSoundSchema).max(50).optional(),
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
