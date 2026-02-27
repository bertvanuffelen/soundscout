import { describe, it, expect } from 'vitest';
import {
  beatsToSeconds,
  secondsToBeats,
  getSampleEndBeat,
  getClipDuration,
  getClipDurationBeats,
  getClipEndBeat,
  getClipTrimStart,
  getClipTrimEnd,
} from '../audio';
import type { Clip, Sample } from '../../types';

// Mock samples for testing
const mockSample: Sample = {
  id: 'sample-1',
  name: 'Test Sample',
  locationId: 'loc-1',
  audioUrl: '/audio/test.mp3',
  duration: 2.5, // 2.5 seconds
  icon: 'Music',
  color: '#FF0000',
};

const longSample: Sample = {
  id: 'sample-2',
  name: 'Long Sample',
  locationId: 'loc-1',
  audioUrl: '/audio/long.mp3',
  duration: 8, // 8 seconds
  icon: 'Bird',
  color: '#00FF00',
};

const shortSample: Sample = {
  id: 'sample-3',
  name: 'Short Sample',
  locationId: 'loc-1',
  audioUrl: '/audio/short.mp3',
  duration: 0.5, // 0.5 seconds
  icon: 'Dog',
  color: '#0000FF',
};

// Helper to create a clip
function createClip(sampleId: string, startBeat: number, trimStart?: number, trimEnd?: number): Clip {
  return {
    id: `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sampleId,
    startBeat,
    ...(trimStart !== undefined && { trimStart }),
    ...(trimEnd !== undefined && { trimEnd }),
  };
}

describe('audio.ts utilities', () => {
  // =============================================================================
  // BPM Conversion Tests
  // =============================================================================

  describe('beatsToSeconds', () => {
    it('should convert beats to seconds at 120 BPM', () => {
      expect(beatsToSeconds(1, 120)).toBe(0.5);
      expect(beatsToSeconds(2, 120)).toBe(1);
      expect(beatsToSeconds(4, 120)).toBe(2);
      expect(beatsToSeconds(8, 120)).toBe(4);
    });

    it('should convert beats to seconds at 60 BPM', () => {
      expect(beatsToSeconds(1, 60)).toBe(1);
      expect(beatsToSeconds(2, 60)).toBe(2);
      expect(beatsToSeconds(4, 60)).toBe(4);
    });

    it('should convert beats to seconds at 180 BPM', () => {
      expect(beatsToSeconds(1, 180)).toBeCloseTo(0.333, 2);
      expect(beatsToSeconds(3, 180)).toBe(1);
      expect(beatsToSeconds(6, 180)).toBe(2);
    });

    it('should handle 0 beats', () => {
      expect(beatsToSeconds(0, 120)).toBe(0);
      expect(beatsToSeconds(0, 60)).toBe(0);
    });

    it('should handle fractional beats', () => {
      expect(beatsToSeconds(0.5, 120)).toBe(0.25);
      expect(beatsToSeconds(1.5, 120)).toBe(0.75);
    });

    it('should handle high BPM', () => {
      expect(beatsToSeconds(1, 240)).toBe(0.25);
      expect(beatsToSeconds(4, 240)).toBe(1);
    });
  });

  describe('secondsToBeats', () => {
    it('should convert seconds to beats at 120 BPM', () => {
      expect(secondsToBeats(0.5, 120)).toBe(1);
      expect(secondsToBeats(1, 120)).toBe(2);
      expect(secondsToBeats(2, 120)).toBe(4);
      expect(secondsToBeats(4, 120)).toBe(8);
    });

    it('should convert seconds to beats at 60 BPM', () => {
      expect(secondsToBeats(1, 60)).toBe(1);
      expect(secondsToBeats(2, 60)).toBe(2);
      expect(secondsToBeats(4, 60)).toBe(4);
    });

    it('should convert seconds to beats at 180 BPM', () => {
      expect(secondsToBeats(1, 180)).toBe(3);
      expect(secondsToBeats(2, 180)).toBe(6);
    });

    it('should handle 0 seconds', () => {
      expect(secondsToBeats(0, 120)).toBe(0);
      expect(secondsToBeats(0, 60)).toBe(0);
    });

    it('should handle fractional seconds', () => {
      expect(secondsToBeats(0.25, 120)).toBe(0.5);
      expect(secondsToBeats(0.75, 120)).toBe(1.5);
    });

    it('should be inverse of beatsToSeconds', () => {
      const beats = 5;
      const bpm = 120;
      const seconds = beatsToSeconds(beats, bpm);
      const backtToBeats = secondsToBeats(seconds, bpm);
      expect(backtToBeats).toBe(beats);
    });
  });

  // =============================================================================
  // Deprecated getSampleEndBeat Tests
  // =============================================================================

  describe('getSampleEndBeat (deprecated)', () => {
    it('should calculate end beat of a clip at 120 BPM', () => {
      const clip = createClip('sample-1', 0);
      // sample-1 is 2.5 seconds = 5 beats at 120 BPM
      expect(getSampleEndBeat(clip, mockSample, 120)).toBe(5);
    });

    it('should calculate end beat starting from non-zero position', () => {
      const clip = createClip('sample-1', 8);
      // Starts at beat 8, duration is 5 beats
      expect(getSampleEndBeat(clip, mockSample, 120)).toBe(13);
    });

    it('should calculate end beat at 60 BPM', () => {
      const clip = createClip('sample-1', 0);
      // 2.5 seconds = 2.5 beats at 60 BPM
      expect(getSampleEndBeat(clip, mockSample, 60)).toBe(2.5);
    });

    it('should handle long samples', () => {
      const clip = createClip('sample-2', 0);
      // 8 seconds = 16 beats at 120 BPM
      expect(getSampleEndBeat(clip, longSample, 120)).toBe(16);
    });

    it('should handle short samples', () => {
      const clip = createClip('sample-3', 0);
      // 0.5 seconds = 1 beat at 120 BPM
      expect(getSampleEndBeat(clip, shortSample, 120)).toBe(1);
    });

    it('should ignore trim boundaries (legacy behavior)', () => {
      // getSampleEndBeat does NOT respect trimming - it uses full sample duration
      const clip = createClip('sample-1', 0, 0.5, 1.5);
      // Even though trimmed to 1 second, it should return 5 beats (full duration)
      expect(getSampleEndBeat(clip, mockSample, 120)).toBe(5);
    });
  });

  // =============================================================================
  // Clip Trimming: getClipDuration Tests
  // =============================================================================

  describe('getClipDuration', () => {
    it('should return full sample duration when no trim is set', () => {
      const clip = createClip('sample-1', 0);
      expect(getClipDuration(clip, mockSample)).toBe(2.5);
    });

    it('should return full duration when trimStart is 0 and trimEnd is undefined', () => {
      const clip = createClip('sample-1', 0, 0);
      expect(getClipDuration(clip, mockSample)).toBe(2.5);
    });

    it('should respect trimStart and trimEnd boundaries', () => {
      // Trim from 0.5s to 2s = 1.5s duration
      const clip = createClip('sample-1', 0, 0.5, 2);
      expect(getClipDuration(clip, mockSample)).toBe(1.5);
    });

    it('should respect only trimStart when trimEnd is undefined', () => {
      // Trim from 1s to end (2.5s) = 1.5s duration
      const clip = createClip('sample-1', 0, 1);
      expect(getClipDuration(clip, mockSample)).toBe(1.5);
    });

    it('should respect only trimEnd when trimStart is undefined', () => {
      // Trim from start (0s) to 1.5s = 1.5s duration
      const clip = createClip('sample-1', 0, undefined, 1.5);
      expect(getClipDuration(clip, mockSample)).toBe(1.5);
    });

    it('should handle zero-length trim edge case', () => {
      // Trim where start equals end = 0 duration
      const clip = createClip('sample-1', 0, 1, 1);
      expect(getClipDuration(clip, mockSample)).toBe(0);
    });

    it('should handle full-sample trim boundaries', () => {
      const clip = createClip('sample-1', 0, 0, 2.5);
      expect(getClipDuration(clip, mockSample)).toBe(2.5);
    });

    it('should work with long samples', () => {
      const clip = createClip('sample-2', 0, 2, 6);
      expect(getClipDuration(clip, longSample)).toBe(4);
    });
  });

  // =============================================================================
  // Clip Trimming: getClipDurationBeats Tests
  // =============================================================================

  describe('getClipDurationBeats', () => {
    it('should return duration in beats for untrimmed clip at 120 BPM', () => {
      const clip = createClip('sample-1', 0);
      // 2.5 seconds = 5 beats at 120 BPM
      expect(getClipDurationBeats(clip, mockSample, 120)).toBe(5);
    });

    it('should return duration in beats for trimmed clip at 120 BPM', () => {
      // Trim from 0.5s to 2s = 1.5s = 3 beats at 120 BPM
      const clip = createClip('sample-1', 0, 0.5, 2);
      expect(getClipDurationBeats(clip, mockSample, 120)).toBe(3);
    });

    it('should respect trimStart only at 120 BPM', () => {
      // Trim from 1s to end (2.5s) = 1.5s = 3 beats
      const clip = createClip('sample-1', 0, 1);
      expect(getClipDurationBeats(clip, mockSample, 120)).toBe(3);
    });

    it('should respect trimEnd only at 120 BPM', () => {
      // Trim from start to 1.5s = 1.5s = 3 beats
      const clip = createClip('sample-1', 0, undefined, 1.5);
      expect(getClipDurationBeats(clip, mockSample, 120)).toBe(3);
    });

    it('should return correct beats at 60 BPM', () => {
      const clip = createClip('sample-1', 0);
      // 2.5 seconds = 2.5 beats at 60 BPM
      expect(getClipDurationBeats(clip, mockSample, 60)).toBe(2.5);
    });

    it('should return correct beats at 180 BPM', () => {
      const clip = createClip('sample-1', 0);
      // 2.5 seconds = 7.5 beats at 180 BPM
      expect(getClipDurationBeats(clip, mockSample, 180)).toBe(7.5);
    });

    it('should handle zero-length trim', () => {
      const clip = createClip('sample-1', 0, 1, 1);
      expect(getClipDurationBeats(clip, mockSample, 120)).toBe(0);
    });

    it('should handle long samples with trim', () => {
      const clip = createClip('sample-2', 0, 1, 7);
      // 6 seconds = 12 beats at 120 BPM
      expect(getClipDurationBeats(clip, longSample, 120)).toBe(12);
    });
  });

  // =============================================================================
  // Clip Trimming: getClipEndBeat Tests
  // =============================================================================

  describe('getClipEndBeat', () => {
    it('should calculate end beat for untrimmed clip at 120 BPM', () => {
      const clip = createClip('sample-1', 0);
      // Duration is 5 beats, so end is 0 + 5 = 5
      expect(getClipEndBeat(clip, mockSample, 120)).toBe(5);
    });

    it('should calculate end beat starting from non-zero position', () => {
      const clip = createClip('sample-1', 8);
      // Duration is 5 beats, so end is 8 + 5 = 13
      expect(getClipEndBeat(clip, mockSample, 120)).toBe(13);
    });

    it('should respect trim boundaries in calculation', () => {
      // Trim from 0.5s to 2s = 1.5s = 3 beats at 120 BPM
      const clip = createClip('sample-1', 4, 0.5, 2);
      // 4 + 3 = 7
      expect(getClipEndBeat(clip, mockSample, 120)).toBe(7);
    });

    it('should calculate end beat at 60 BPM', () => {
      const clip = createClip('sample-1', 0);
      // 2.5 seconds = 2.5 beats at 60 BPM
      expect(getClipEndBeat(clip, mockSample, 60)).toBe(2.5);
    });

    it('should handle trimStart only', () => {
      // Trim from 1s to end (2.5s) = 1.5s = 3 beats at 120 BPM
      const clip = createClip('sample-1', 0, 1);
      expect(getClipEndBeat(clip, mockSample, 120)).toBe(3);
    });

    it('should handle trimEnd only', () => {
      // Trim from start to 1.5s = 1.5s = 3 beats at 120 BPM
      const clip = createClip('sample-1', 0, undefined, 1.5);
      expect(getClipEndBeat(clip, mockSample, 120)).toBe(3);
    });

    it('should handle zero-length trim', () => {
      const clip = createClip('sample-1', 10, 1, 1);
      expect(getClipEndBeat(clip, mockSample, 120)).toBe(10);
    });

    it('should calculate correctly for long samples', () => {
      const clip = createClip('sample-2', 8);
      // 8 seconds = 16 beats at 120 BPM, starts at 8, ends at 24
      expect(getClipEndBeat(clip, longSample, 120)).toBe(24);
    });

    it('should calculate correctly for short samples', () => {
      const clip = createClip('sample-3', 20);
      // 0.5 seconds = 1 beat at 120 BPM, starts at 20, ends at 21
      expect(getClipEndBeat(clip, shortSample, 120)).toBe(21);
    });
  });

  // =============================================================================
  // Trim Helper: getClipTrimStart Tests
  // =============================================================================

  describe('getClipTrimStart', () => {
    it('should return 0 when trimStart is undefined', () => {
      const clip = createClip('sample-1', 0);
      expect(getClipTrimStart(clip)).toBe(0);
    });

    it('should return trimStart value when set', () => {
      const clip = createClip('sample-1', 0, 0.5);
      expect(getClipTrimStart(clip)).toBe(0.5);
    });

    it('should return 0 explicitly set', () => {
      const clip = createClip('sample-1', 0, 0);
      expect(getClipTrimStart(clip)).toBe(0);
    });

    it('should return fractional trimStart', () => {
      const clip = createClip('sample-1', 0, 1.25);
      expect(getClipTrimStart(clip)).toBe(1.25);
    });

    it('should return high trimStart values', () => {
      const clip = createClip('sample-1', 0, 7.8);
      expect(getClipTrimStart(clip)).toBe(7.8);
    });
  });

  // =============================================================================
  // Trim Helper: getClipTrimEnd Tests
  // =============================================================================

  describe('getClipTrimEnd', () => {
    it('should return sample duration when trimEnd is undefined', () => {
      const clip = createClip('sample-1', 0);
      expect(getClipTrimEnd(clip, mockSample)).toBe(2.5);
    });

    it('should return trimEnd value when set', () => {
      const clip = createClip('sample-1', 0, undefined, 1.5);
      expect(getClipTrimEnd(clip, mockSample)).toBe(1.5);
    });

    it('should return sample duration when trimEnd equals it', () => {
      const clip = createClip('sample-1', 0, undefined, 2.5);
      expect(getClipTrimEnd(clip, mockSample)).toBe(2.5);
    });

    it('should return fractional trimEnd', () => {
      const clip = createClip('sample-1', 0, undefined, 0.75);
      expect(getClipTrimEnd(clip, mockSample)).toBe(0.75);
    });

    it('should return correct trimEnd for long sample', () => {
      const clip = createClip('sample-2', 0, undefined, 6.5);
      expect(getClipTrimEnd(clip, longSample)).toBe(6.5);
    });

    it('should default to sample duration for different samples', () => {
      const clip1 = createClip('sample-1', 0);
      const clip2 = createClip('sample-2', 0);

      expect(getClipTrimEnd(clip1, mockSample)).toBe(2.5);
      expect(getClipTrimEnd(clip2, longSample)).toBe(8);
    });
  });

  // =============================================================================
  // Integration Tests
  // =============================================================================

  describe('integration scenarios', () => {
    it('should handle a clip from start to end with no trim', () => {
      const clip = createClip('sample-1', 0);
      const bpm = 120;

      const duration = getClipDuration(clip, mockSample);
      const durationBeats = getClipDurationBeats(clip, mockSample, bpm);
      const endBeat = getClipEndBeat(clip, mockSample, bpm);

      expect(duration).toBe(2.5);
      expect(durationBeats).toBe(5);
      expect(endBeat).toBe(5);
    });

    it('should handle a trimmed clip in the middle of a long sample', () => {
      const clip = createClip('sample-1', 4, 0.5, 2);
      const bpm = 120;

      const duration = getClipDuration(clip, mockSample);
      const durationBeats = getClipDurationBeats(clip, mockSample, bpm);
      const endBeat = getClipEndBeat(clip, mockSample, bpm);

      expect(duration).toBe(1.5);
      expect(durationBeats).toBe(3);
      expect(endBeat).toBe(7); // 4 + 3
    });

    it('should handle multiple clips sequentially', () => {
      const bpm = 120;

      // mockSample is 2.5s = 5 beats
      const clip1 = createClip('sample-1', 0); // 0-5 beats
      const end1 = getClipEndBeat(clip1, mockSample, bpm);

      // Place clip2 after clip1, longSample is 8s = 16 beats
      const clip2 = createClip('sample-2', Math.ceil(end1)); // 5-21 beats
      const end2 = getClipEndBeat(clip2, longSample, bpm);

      expect(end1).toBe(5);
      expect(end2).toBe(5 + 16); // 21, not 22
    });

    it('should handle clips with different BPM values', () => {
      const clip = createClip('sample-1', 0);

      const beats120 = getClipDurationBeats(clip, mockSample, 120);
      const beats60 = getClipDurationBeats(clip, mockSample, 60);
      const beats180 = getClipDurationBeats(clip, mockSample, 180);

      // 2.5 seconds should convert correctly at each BPM
      expect(beats120).toBe(5); // 2.5 * (120 / 60)
      expect(beats60).toBe(2.5); // 2.5 * (60 / 60)
      expect(beats180).toBe(7.5); // 2.5 * (180 / 60)
    });

    it('should maintain consistency with deprecated getSampleEndBeat for untrimmed clips', () => {
      const clip = createClip('sample-1', 8);
      const bpm = 120;

      const deprecatedResult = getSampleEndBeat(clip, mockSample, bpm);
      const newResult = getClipEndBeat(clip, mockSample, bpm);

      // For untrimmed clips, both should match
      expect(deprecatedResult).toBe(newResult);
    });
  });
});
