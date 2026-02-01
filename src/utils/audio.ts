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
 */
export function getSampleEndBeat(
  clip: Clip,
  sample: Sample,
  bpm: number,
): number {
  const durationInBeats = secondsToBeats(sample.duration, bpm);
  return clip.startBeat + durationInBeats;
}
