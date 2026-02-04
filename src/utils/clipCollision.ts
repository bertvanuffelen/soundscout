/**
 * Clip Collision Detection & Smart Snap Utilities
 *
 * Provides functions for detecting clip overlaps and finding optimal
 * placement positions using smart snap logic.
 */

import type { Clip, Sample, Track } from '../types';
import { getClipDurationBeats } from './audio';

// =============================================================================
// TYPES
// =============================================================================

export interface ClipBounds {
  startBeat: number;
  endBeat: number;
}

export interface SmartSnapResult {
  trackIndex: number;
  startBeat: number;
  reason: 'original' | 'shifted' | 'track_below' | 'rejected';
}

// =============================================================================
// CORE COLLISION FUNCTIONS
// =============================================================================

/**
 * Get the beat boundaries of a clip (start and end position).
 */
export function getClipBounds(
  clip: Clip,
  sample: Sample,
  bpm: number,
): ClipBounds {
  const durationBeats = getClipDurationBeats(clip, sample, bpm);
  return {
    startBeat: clip.startBeat,
    endBeat: clip.startBeat + durationBeats,
  };
}

/**
 * Check if two clip bounds overlap.
 * Two ranges overlap if one starts before the other ends AND ends after the other starts.
 */
export function boundsOverlap(bounds1: ClipBounds, bounds2: ClipBounds): boolean {
  return bounds1.startBeat < bounds2.endBeat && bounds1.endBeat > bounds2.startBeat;
}

/**
 * Check if a new clip would overlap with any existing clips on a track.
 *
 * @param track - The track to check against
 * @param newClip - The clip being placed
 * @param newSample - The sample for the new clip
 * @param sampleMap - Map of sampleId -> Sample for looking up existing clip samples
 * @param bpm - Current BPM
 * @param excludeClipId - Optional clip ID to exclude (for move operations)
 */
export function wouldOverlap(
  track: Track,
  newClip: Clip,
  newSample: Sample,
  sampleMap: Map<string, Sample>,
  bpm: number,
  excludeClipId?: string,
): boolean {
  const newBounds = getClipBounds(newClip, newSample, bpm);

  return track.clips.some((existingClip) => {
    // Skip the clip being moved
    if (excludeClipId && existingClip.id === excludeClipId) return false;

    const existingSample = sampleMap.get(existingClip.sampleId);
    if (!existingSample) return false;

    const existingBounds = getClipBounds(existingClip, existingSample, bpm);
    return boundsOverlap(newBounds, existingBounds);
  });
}

// =============================================================================
// SMART SNAP LOGIC
// =============================================================================

/**
 * Find the best position for a clip using smart snap.
 *
 * Strategy:
 * 1. Try original position on target track
 * 2. If overlap, try placing directly after the blocking clip (same track)
 * 3. If still no space, try tracks below
 * 4. If all fail, reject placement
 *
 * @param tracks - All tracks in the timeline
 * @param targetTrackIndex - The track the user dropped the clip on
 * @param newClip - The clip being placed (with desired startBeat)
 * @param newSample - The sample for the clip
 * @param sampleMap - Map of sampleId -> Sample
 * @param bpm - Current BPM
 * @param totalBeats - Total beats in timeline
 * @param excludeClipId - Optional clip ID to exclude (for move operations)
 */
export function findSmartSnapPosition(
  tracks: Track[],
  targetTrackIndex: number,
  newClip: Clip,
  newSample: Sample,
  sampleMap: Map<string, Sample>,
  bpm: number,
  totalBeats: number,
  excludeClipId?: string,
): SmartSnapResult {
  const clipDurationBeats = getClipDurationBeats(newClip, newSample, bpm);

  // Strategy 1: Try original position on target track
  const targetTrack = tracks[targetTrackIndex];
  if (!wouldOverlap(targetTrack, newClip, newSample, sampleMap, bpm, excludeClipId)) {
    return {
      trackIndex: targetTrackIndex,
      startBeat: newClip.startBeat,
      reason: 'original',
    };
  }

  // Strategy 2: Find blocking clip and try placing after it
  const newBounds = getClipBounds(newClip, newSample, bpm);
  const blockingClips = targetTrack.clips
    .filter((c) => c.id !== excludeClipId)
    .map((c) => {
      const sample = sampleMap.get(c.sampleId);
      if (!sample) return null;
      return { clip: c, bounds: getClipBounds(c, sample, bpm) };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .filter(({ bounds }) => boundsOverlap(newBounds, bounds))
    .sort((a, b) => a.bounds.endBeat - b.bounds.endBeat);

  if (blockingClips.length > 0) {
    // Try placing directly after the first blocking clip (snap to beat)
    const shiftedStartBeat = Math.ceil(blockingClips[0].bounds.endBeat);

    // Check if it fits within timeline bounds
    if (shiftedStartBeat + clipDurationBeats <= totalBeats) {
      const shiftedClip = { ...newClip, startBeat: shiftedStartBeat };

      if (!wouldOverlap(targetTrack, shiftedClip, newSample, sampleMap, bpm, excludeClipId)) {
        return {
          trackIndex: targetTrackIndex,
          startBeat: shiftedStartBeat,
          reason: 'shifted',
        };
      }
    }
  }

  // Strategy 3: Try tracks below
  for (let i = targetTrackIndex + 1; i < tracks.length; i++) {
    if (!wouldOverlap(tracks[i], newClip, newSample, sampleMap, bpm, excludeClipId)) {
      return {
        trackIndex: i,
        startBeat: newClip.startBeat,
        reason: 'track_below',
      };
    }
  }

  // Strategy 4: No valid position found
  return {
    trackIndex: targetTrackIndex,
    startBeat: newClip.startBeat,
    reason: 'rejected',
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a sample map from an array of samples for efficient lookup.
 */
export function createSampleMap(samples: Sample[]): Map<string, Sample> {
  return new Map(samples.map((s) => [s.id, s]));
}

/**
 * Check if a clip fits within the timeline bounds.
 */
export function clipFitsInTimeline(
  clip: Clip,
  sample: Sample,
  bpm: number,
  totalBeats: number,
): boolean {
  const endBeat = clip.startBeat + getClipDurationBeats(clip, sample, bpm);
  return clip.startBeat >= 0 && endBeat <= totalBeats;
}
