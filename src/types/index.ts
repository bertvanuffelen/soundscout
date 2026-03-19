// ============================================================
// SoundScout - Type Definitions
// ============================================================

// --- Enums & Type Aliases ---

/**
 * All possible screens in the game.
 * 'map' and 'compositions' added for Fase 4/5.
 */
export type GameScreen =
  | 'start'
  | 'compose-mode'
  | 'map'
  | 'location'
  | 'studio'
  | 'stage'
  | 'compositions'
  | 'teacher'
  | 'shared';

// --- Storytelling (#41) ---

/** Composition mode selected after theme choice */
export type ComposeMode = 'free' | 'image' | 'storyboard';

/** A single image within a storyboard */
export interface StoryboardImage {
  /** Unique identifier within storyboard */
  id: string;
  /** Path to image in /public/images/themes/{themeId}/storyboards/ */
  url: string;
  /** i18n key for the image label (e.g. "Ochtend") */
  label: string;
}

/** A storyboard: a sequence of images (or a single image) tied to a theme */
export interface Storyboard {
  /** Unique identifier within theme (e.g. 'stad-dag') */
  id: string;
  /** Theme this storyboard belongs to */
  themeId: string;
  /** i18n key for storyboard name */
  name: string;
  /** i18n key for storyboard description */
  description: string;
  /** Thumbnail image for selection screen */
  coverImage: string;
  /** Images in fixed order. 1 image = single image mode, 2+ = slideshow */
  images: StoryboardImage[];
}

export type VisualHint = 'glow' | 'pulse' | 'none';

// --- Location & Hotspot ---

export interface Location {
  id: string;
  name: string;
  description: string;
  backgroundImage: string;
  ambientAudio: string;
  hotspots: Hotspot[];
  unlocked: boolean;
}

export interface Hotspot {
  id: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  /** @deprecated Now uses universal DEFAULT_HOTSPOT_RADIUS from config.ts */
  radius?: number; // percentage of container width (optional, ignored)
  sampleId: string;
  visualHint: VisualHint;
}

// --- Sample ---

export interface Sample {
  /** Unique identifier for the sample */
  id: string;
  /** i18n key for the sample name */
  name: string;
  /** ID of the location where this sample was collected */
  locationId: string;
  /** URL to the audio file */
  audioUrl: string;
  /** Duration of the sample in seconds */
  duration: number;
  /** Lucide icon name representing the sample (e.g. 'Bird', 'Dog') */
  icon: string;
  /** Hex color code for timeline visualization (e.g. "#FF5733") */
  color: string;
}

// --- Audio Loading State ---

export type AudioLoadingState = 'idle' | 'loading' | 'ready' | 'error';

// --- Recorder (current session only) ---

export interface RecorderState {
  slots: (Sample | null)[]; // max 6 slots
  maxSlots: number;
}

// --- Library (persistent across sessions) ---

export interface LibraryState {
  samples: Sample[]; // all collected samples
}

// --- Clip Effects (Fase 5) ---

/**
 * Audio effects that can be applied to individual clips.
 * All values have sensible defaults (neutral/off).
 */
export interface ClipEffects {
  /** Volume adjustment in dB (-60 to +6, default 0) */
  volume: number;
  /** Whether this clip is muted (default false) */
  mute?: boolean;
  /** Pitch shift in semitones (-12 to +12, default 0) */
  pitch: number;
  /** Reverb wet mix percentage (0-100, default 0) */
  reverb: number;
  /** Stereo panning (-1 left to +1 right, default 0 center) */
  pan: number;
}

/**
 * Default clip effects (neutral/off)
 */
export const DEFAULT_CLIP_EFFECTS: ClipEffects = {
  volume: 0,
  pitch: 0,
  reverb: 0,
  pan: 0,
};

// --- Sections (Fase 5 - Vormschema / Musical Form) ---

/**
 * A section divides the timeline into labeled parts (e.g. Intro, A, B).
 * Sections are defined by their end beat; the first section starts at beat 0,
 * subsequent sections start where the previous one ended.
 */
export interface Section {
  /** Unique identifier (UUID) */
  id: string;
  /** Beat where this section ends */
  endBeat: number;
  /** Color from SECTION_COLORS palette */
  color: string;
  /** Optional label (e.g. "A", "Intro", "Refrein") */
  label?: string;
  /** If true, section was auto-created for a storyboard slide — cannot be deleted (#41) */
  fromStoryboard?: boolean;
  // Prepared for #41 Storytelling (not yet in UI):
  /** Section title for storytelling mode */
  title?: string;
  /** Section description for storytelling mode */
  description?: string;
  /** Image URL for storytelling mode */
  imageUrl?: string;
}

/**
 * Fixed color palette for sections.
 * 8 distinct, accessible colors for timeline visualization.
 */
export const SECTION_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3',
  '#C7CEEA', '#F38181', '#AA96DA', '#FCBAD3',
] as const;

// --- Timeline (internal beat-based, visual is time-agnostic) ---

export interface TimelineState {
  tracks: Track[];
  bpm: number; // fixed internal value (e.g. 120), not user-adjustable
  totalBeats: number; // total length of timeline in beats
  isPlaying: boolean;
  isLooping: boolean;
  currentBeat: number; // current playback position in beats
  /** Optional sections for musical form (vormschema) */
  sections?: Section[];
}

export interface Track {
  id: string;
  clips: Clip[];
  /** Track volume in dB (-60 to +6, default 0) */
  volume?: number;
  /** Whether the entire track is muted (default false) */
  mute?: boolean;
  /** Optional track color for colored sidebar (#67) */
  color?: string;
}

/**
 * Fixed color palette for track sidebar (#67).
 * 8 distinct, accessible colors matching the 8 tracks.
 */
export const TRACK_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
] as const;

export interface Clip {
  id: string;
  sampleId: string;
  startBeat: number; // position on timeline in beats
  /** Optional audio effects for this clip (Fase 5) */
  effects?: ClipEffects;

  // Trim boundaries (optional, default = hele sample)
  /** Start positie van trim in seconden (0 = begin sample) */
  trimStart?: number;
  /** Eind positie van trim in seconden (undefined = eind sample) */
  trimEnd?: number;

  /** Whether this clip originated from a template (locked when templateClipsLocked = true) */
  fromTemplate?: boolean;

  /** Optional short label for the clip (#66, e.g. "wind", "tikken") */
  label?: string;

  // Loop (#65) — clip repeats the (trimmed) sample until loopDurationBeats
  /** When true, clip repeats the trimmed sample to fill loopDurationBeats */
  loop?: boolean;
  /** Total clip width in beats when looping. Only meaningful when loop=true. */
  loopDurationBeats?: number;
}

// --- Game State ---

export interface GameState {
  currentScreen: GameScreen;
  currentLocationId: string | null;
}

// --- Composition Metadata ---

/**
 * Computed metadata about a composition.
 * Auto-generated when saving.
 */
export interface CompositionMetadata {
  /** Total duration in seconds */
  duration: number;
  /** Number of tracks with at least one clip */
  trackCount: number;
  /** Total number of clips across all tracks */
  clipCount: number;
  /** Unique location IDs from which samples were used */
  locations: string[];
}

// --- Saved Composition (Fase 4) ---

/**
 * A saved composition with all necessary data for playback and sharing.
 */
export interface SavedComposition {
  /** Unique identifier (UUID) */
  id: string;
  /** User-provided name */
  name: string;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** Full timeline state */
  timeline: TimelineState;
  /** Snapshot of samples used (for offline playback) */
  samples: Sample[];
  /** Computed metadata */
  metadata: CompositionMetadata;
  /** Optional share code (e.g., "PARK-7X3K") */
  shareCode?: string;
  /** ISO timestamp when shared */
  sharedAt?: string;
  /** Storyboard ID if composed with storytelling (#41) */
  storyboardId?: string;
}

// --- Composition Data Transfer Object ---

/**
 * Data format voor compositie-overdracht tussen systemen.
 * Gebruikt bij: submissions naar docent, publieke luisterlinks, en Supabase opslag.
 * Bevat alle informatie die nodig is om een compositie af te spelen.
 */
export interface CompositionData {
  /** All tracks with their clips */
  tracks: Track[];
  /** BPM (beats per minute) */
  bpm: number;
  /** Total timeline length in beats */
  totalBeats: number;
  /** Whether looping was enabled */
  isLooping: boolean;
  /** Snapshot of all samples used in the composition */
  samples: Sample[];
  /** Optional sections for musical form (vormschema) */
  sections?: Section[];
  /** Storyboard ID if composed with storytelling (#41) */
  storyboardId?: string;
}

// --- Template (Fase 5 - Docent-aangemaakt sjabloon) ---

/**
 * Granular lock options for a template (#59).
 * Controls what students can and cannot modify.
 * Default: all locked (true), new clips allowed (true).
 */
export interface TemplateLockOptions {
  /** Template clips cannot be moved, deleted, trimmed, or duplicated */
  clipsLocked: boolean;
  /** Sections cannot be added, deleted, resized, or edited */
  sectionsLocked: boolean;
  /** Library is fixed — student cannot collect extra samples from locations */
  libraryLocked: boolean;
  /** Student can add new clips from available samples to empty spots */
  allowNewClips: boolean;
}

/** Default lock options: everything locked, new clips allowed */
export const DEFAULT_LOCK_OPTIONS: TemplateLockOptions = {
  clipsLocked: true,
  sectionsLocked: true,
  libraryLocked: true,
  allowNewClips: true,
};

/**
 * A template created by a teacher for students to work with.
 * Contains pre-filled clips, samples, sections, and optional instructions.
 */
export interface Template {
  /** Unique identifier (Supabase UUID) */
  id: string;
  /** Template name */
  name: string;
  /** Optional description */
  description?: string;
  /** Teacher who created the template */
  teacherName: string;
  /** Full composition data (tracks, samples, sections) */
  compositionData: CompositionData;
  /** Optional instructions for the student (Markdown) */
  instructions?: string;
  /** Granular lock options (#59) */
  lockOptions: TemplateLockOptions;
  /**
   * @deprecated Use lockOptions.clipsLocked instead.
   * Kept for backward compatibility with existing Supabase rows.
   */
  clipsLocked?: boolean;
  /** ISO timestamp of creation */
  createdAt: string;
}

// --- Legacy Composition (deprecated) ---

/**
 * @deprecated Use SavedComposition instead
 */
export interface Composition {
  id: string;
  name: string;
  createdAt: string;
  timeline: TimelineState;
  librarySamples: Sample[];
}

// --- Storage Keys ---

/**
 * Type-safe keys for localStorage.
 */
export type StorageKey =
  | 'soundscout:compositions'
  | 'soundscout:library'
  | 'soundscout:preferences'
  | 'soundscout:version';

// --- User Preferences ---

/**
 * User preferences stored in localStorage.
 */
export interface UserPreferences {
  /** Master volume (0-1) */
  masterVolume: number;
  /** Preferred language code */
  language: string;
  /** Whether to show tutorial hints */
  showHints: boolean;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  masterVolume: 0.8,
  language: 'nl',
  showHints: true,
};

// ============================================================
// User & Class System (Fase 4 - Supabase Integration)
// ============================================================

/**
 * User roles in the application.
 * - guest: Default, no account needed
 * - student: Identified by name (no login required)
 * - teacher: Authenticated via Supabase (has dashboard access)
 */
export type UserRole = 'guest' | 'student' | 'teacher';

/**
 * Information about a class/group.
 * Created by teachers, used by students to share compositions.
 */
export interface ClassInfo {
  /** Unique identifier (Supabase UUID) */
  id: string;
  /** Display name (e.g., "Groep 5B") */
  name: string;
  /** Unique join code (e.g., "KLAS-5B-2025") */
  classCode: string;
  /** Teacher who created this class */
  teacherId: string;
  /** ISO timestamp of creation */
  createdAt: string;
  /** Whether the class is active */
  isActive: boolean;
}

/**
 * Current user session state.
 * Stored in useUserStore, persisted to localStorage.
 */
export interface UserSession {
  /** Current role */
  role: UserRole;

  // Teacher-specific (set after Supabase auth)
  /** Supabase user ID */
  teacherId?: string;
  /** Display name */
  teacherName?: string;

  // Student-specific (no auth needed)
  /** Currently joined class code */
  activeClassCode?: string;
  /** Student's chosen display name */
  studentName?: string;
}

/**
 * Default session (guest, not in any class)
 */
export const DEFAULT_USER_SESSION: UserSession = {
  role: 'guest',
};

// ============================================================
// Shared Composition (Server-stored via Supabase)
// ============================================================

/**
 * A composition uploaded to Supabase for sharing.
 *
 * KEY DIFFERENCE from SavedComposition:
 * - SavedComposition: stored LOCALLY in localStorage (private)
 * - SharedComposition: stored on SUPABASE SERVER (can be shared)
 *
 * When a user "shares" a SavedComposition, it gets converted to
 * a SharedComposition and uploaded to the server.
 */
export interface SharedComposition {
  /** Unique identifier (Supabase UUID) */
  id: string;
  /** User-provided name */
  name: string;
  /** Optional student name (if shared as student) */
  studentName?: string;
  /** Class code if shared with a class */
  classCode?: string;
  /** Unique share code for public access (e.g., "ABCD-1234") */
  shareCode: string;
  /** Full timeline state (JSON in Supabase) */
  timeline: TimelineState;
  /** Snapshot of samples used */
  samples: Sample[];
  /** Computed metadata */
  metadata: CompositionMetadata;
  /** ISO timestamp of upload */
  createdAt: string;
  /** Number of times played via share link */
  playsCount: number;
}
