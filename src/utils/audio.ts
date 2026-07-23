import type { Clip, Sample } from '../types';

/**
 * Convert beats to seconds based on BPM.
 * At 120 BPM, 1 beat = 0.5 seconds.
 */
export function beatsToSeconds(beats: number, bpm: number): number {
  return (beats / bpm) * 60;
}

/**
 * Convert seconds to beats based on BPM.
 */
export function secondsToBeats(seconds: number, bpm: number): number {
  return (seconds / 60) * bpm;
}

/**
 * Calculate the end beat of a clip (startBeat + sample duration in beats).
 * @deprecated Use getClipEndBeat instead (accounts for trimming)
 */
export function getSampleEndBeat(
  clip: Clip,
  sample: Sample,
  bpm: number,
): number {
  const durationInBeats = secondsToBeats(sample.duration, bpm);
  return clip.startBeat + durationInBeats;
}

// =============================================================================
// CLIP TRIMMING UTILITIES
// =============================================================================

/**
 * Get the effective duration of a clip in seconds (respects trim boundaries).
 * If no trim is set, returns the full sample duration.
 */
export function getClipDuration(clip: Clip, sample: Sample): number {
  const start = clip.trimStart ?? 0;
  const end = clip.trimEnd ?? sample.duration;
  return end - start;
}

/**
 * Get the effective duration of a clip in beats (respects trim boundaries).
 */
export function getClipDurationBeats(
  clip: Clip,
  sample: Sample,
  bpm: number,
): number {
  const durationSeconds = getClipDuration(clip, sample);
  return secondsToBeats(durationSeconds, bpm);
}

/**
 * Calculate the end beat of a clip (respects trim boundaries).
 */
export function getClipEndBeat(
  clip: Clip,
  sample: Sample,
  bpm: number,
): number {
  const durationBeats = getClipDurationBeats(clip, sample, bpm);
  return clip.startBeat + durationBeats;
}

/**
 * Get the trim start position in seconds (defaults to 0).
 */
export function getClipTrimStart(clip: Clip): number {
  return clip.trimStart ?? 0;
}

/**
 * Get the trim end position in seconds (defaults to sample duration).
 */
export function getClipTrimEnd(clip: Clip, sample: Sample): number {
  return clip.trimEnd ?? sample.duration;
}

// =============================================================================
// LOOP-AWARE UTILITIES (#65)
// =============================================================================

/**
 * Get the effective visual/scheduling width of a clip in beats.
 * For looping clips: returns loopDurationBeats.
 * For normal clips: returns trimmed sample duration in beats.
 */
export function getEffectiveClipDurationBeats(
  clip: Clip,
  sample: Sample,
  bpm: number,
): number {
  if (clip.loop && clip.loopDurationBeats) {
    return clip.loopDurationBeats;
  }
  return getClipDurationBeats(clip, sample, bpm);
}

/**
 * Calculate the end beat of a clip (loop-aware).
 * Uses loopDurationBeats for looping clips.
 */
export function getEffectiveClipEndBeat(
  clip: Clip,
  sample: Sample,
  bpm: number,
): number {
  return clip.startBeat + getEffectiveClipDurationBeats(clip, sample, bpm);
}

/**
 * Vind de sectie (het bereik tussen twee sectie-markeringen) waarin een gegeven
 * beat valt. Secties dragen alleen een `endBeat`; een sectie loopt van de vorige
 * `endBeat` (of 0) tot de eigen `endBeat`, en het staartstuk ná de laatste
 * markering loopt door tot `totalBeats`.
 *
 * Gebruikt door de loop-keuze "Deze sectie": loop het stuk waar de afspeellijn
 * op dat moment staat (testronde 6).
 *
 * @returns het bereik `{ startBeat, endBeat }`, of `null` als er geen secties
 *          zijn (dan ís de hele compositie het enige "stuk").
 */
export function sectionAt(
  beat: number,
  sections: { endBeat: number }[],
  totalBeats: number,
): { startBeat: number; endBeat: number } | null {
  if (sections.length === 0) return null;
  const bounds = sections.map((s) => s.endBeat).sort((a, b) => a - b);
  let lo = 0;
  for (const hi of bounds) {
    if (beat < hi) return { startBeat: lo, endBeat: hi };
    lo = hi;
  }
  // Beat valt na de laatste markering → staartstuk tot het einde van de tijdlijn.
  return { startBeat: lo, endBeat: totalBeats };
}
