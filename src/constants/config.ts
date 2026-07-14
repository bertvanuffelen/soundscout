/**
 * SoundScout Configuration Constants
 * Single source of truth for all magic numbers and configuration values
 */

// =============================================================================
// AUDIO
// =============================================================================

/** Default tempo in beats per minute */
export const DEFAULT_BPM = 120;

/** Interval for playhead position updates in milliseconds */
export const PLAYHEAD_UPDATE_INTERVAL_MS = 50;

/** Timeout for loading a single audio sample in milliseconds */
export const AUDIO_LOAD_TIMEOUT_MS = 15000;

/** Maximum number of retry attempts for loading a sample */
export const AUDIO_LOAD_MAX_RETRIES = 2;

/** Maximum number of samples to load in parallel */
export const AUDIO_LOAD_CONCURRENCY = 3;

/** Default volume for ambient audio in dB (relative to samples) */
export const AMBIENT_AUDIO_VOLUME_DB = -15;

/** Fade duration for ambient audio in seconds */
export const AMBIENT_AUDIO_FADE_SECONDS = 1.5;

// =============================================================================
// TIMELINE
// =============================================================================

/** Default number of beats in the timeline */
export const DEFAULT_TOTAL_BEATS = 128;

/** Maximum number of beats (64 maten × 4) — grens van de "+ 8 maten"-tegel */
export const MAX_TOTAL_BEATS = 256;

/** Beats per "+ 8 maten"-uitbreiding (8 maten × 4) */
export const EXTEND_BEATS_STEP = 32;

/** Number of beats visible in viewport at default zoom (rest is scrollable) */
export const VISIBLE_BEATS = 64;

/** Zoom: minimum multiplier (most zoomed out — fit all beats) */
export const ZOOM_MIN = 0.5;

/** Zoom: maximum multiplier (most zoomed in) */
export const ZOOM_MAX = 4;

/** Zoom: step size for +/- buttons */
export const ZOOM_STEP = 0.25;

/** Zoom: default for desktop (fit-to-width, multiplier 1.0 = all beats visible) */
export const ZOOM_DEFAULT_DESKTOP = 1.0;

/** Zoom: default for mobile (zoomed in so beats are workable) */
export const ZOOM_DEFAULT_MOBILE = 2.0;

/** Default number of tracks in the timeline */
export const DEFAULT_TRACK_COUNT = 8;

/** Width of the track label area in pixels */
export const TRACK_LABEL_WIDTH_PX = 24;

/** Minimum width of a clip in pixels */
export const CLIP_MIN_WIDTH_PX = 24;

// =============================================================================
// RECORDER
// =============================================================================

/** Maximum number of samples that can be held in the recorder */
export const MAX_RECORDER_SLOTS = 6;

// =============================================================================
// DRAG AND DROP / TOUCH
// =============================================================================

/** Distance in pixels before pointer drag activates */
export const POINTER_ACTIVATION_DISTANCE = 8;

/** Delay in milliseconds before touch drag activates.
 *  200ms voelde traag op iPad (TODO 2026-04); 150ms is de dnd-kit-aanbeveling
 *  en onderscheidt nog steeds scrollen van slepen (i.c.m. tolerance). */
export const TOUCH_ACTIVATION_DELAY_MS = 150;

/** Tolerance in pixels for touch movement during activation delay (higher = more forgiving on tablets) */
export const TOUCH_ACTIVATION_TOLERANCE = 10;

// =============================================================================
// HOTSPOTS
// =============================================================================

/** Default hotspot radius as percentage of container width */
export const DEFAULT_HOTSPOT_RADIUS = 4;

// =============================================================================
// CLIP EDITING / TRIMMING
// =============================================================================

/** Minimum trim duration in seconds (prevents clips from becoming too short) */
export const MIN_TRIM_DURATION_SECONDS = 0.1;

/** Waveform resolution - number of peaks to extract from audio */
export const WAVEFORM_PEAK_COUNT = 100;

/** Waveform bar width in pixels */
export const WAVEFORM_BAR_WIDTH_PX = 3;

/** Waveform gap between bars in pixels */
export const WAVEFORM_GAP_PX = 1;

// =============================================================================
// SECTIONS (Musical Form)
// =============================================================================

/** Maximum number of sections on the timeline */
export const MAX_SECTIONS = 16;

/** Maximum length of a section label */
export const SECTION_LABEL_MAX_LENGTH = 50;

// =============================================================================
// VOLUME
// =============================================================================

/** Minimum volume in dB (essentially silent) */
export const VOLUME_MIN_DB = -60;

/** Maximum volume in dB (slight boost allowed) */
export const VOLUME_MAX_DB = 6;

/** Default volume in dB (unity gain) */
export const VOLUME_DEFAULT_DB = 0;

/** Volume slider step size in dB */
export const VOLUME_STEP_DB = 1;
