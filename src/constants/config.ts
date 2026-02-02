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

// =============================================================================
// TIMELINE
// =============================================================================

/** Default number of beats in the timeline */
export const DEFAULT_TOTAL_BEATS = 128;

/** Number of beats visible in viewport (rest is scrollable) */
export const VISIBLE_BEATS = 64;

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

/** Delay in milliseconds before touch drag activates */
export const TOUCH_ACTIVATION_DELAY_MS = 200;

/** Tolerance in pixels for touch movement during activation delay */
export const TOUCH_ACTIVATION_TOLERANCE = 8;

// =============================================================================
// HOTSPOTS
// =============================================================================

/** Default hotspot radius as percentage of container width */
export const DEFAULT_HOTSPOT_RADIUS = 4;
