import { describe, it, expect } from 'vitest';
import {
  getClipBounds,
  boundsOverlap,
  wouldOverlap,
  findSmartSnapPosition,
  createSampleMap,
  clipFitsInTimeline,
} from '../clipCollision';
import type { Clip, Sample, Track } from '../../types';

// Mock samples for testing
const mockSamples: Sample[] = [
  {
    id: 'sample-1',
    name: 'Sample 1',
    locationId: 'loc-1',
    audioUrl: '/audio/sample-1.mp3',
    duration: 2, // 4 beats at 120 BPM
    icon: 'Music',
    color: '#FF0000',
  },
  {
    id: 'sample-2',
    name: 'Sample 2',
    locationId: 'loc-1',
    audioUrl: '/audio/sample-2.mp3',
    duration: 1, // 2 beats at 120 BPM
    icon: 'Bird',
    color: '#00FF00',
  },
  {
    id: 'sample-3',
    name: 'Sample 3',
    locationId: 'loc-1',
    audioUrl: '/audio/sample-3.mp3',
    duration: 4, // 8 beats at 120 BPM
    icon: 'Dog',
    color: '#0000FF',
  },
  {
    id: 'sample-4',
    name: 'Sample 4',
    locationId: 'loc-1',
    audioUrl: '/audio/sample-4.mp3',
    duration: 0.5, // 1 beat at 120 BPM
    icon: 'Cat',
    color: '#FFFF00',
  },
];

// Helper functions
function createClip(sampleId: string, startBeat: number, trimStart?: number, trimEnd?: number): Clip {
  return {
    id: `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sampleId,
    startBeat,
    ...(trimStart !== undefined && { trimStart }),
    ...(trimEnd !== undefined && { trimEnd }),
  };
}

function createEmptyTrack(id: string): Track {
  return { id, clips: [] };
}

function createTrackWithClips(id: string, clips: Clip[]): Track {
  return { id, clips };
}

describe('clipCollision.ts utilities', () => {
  // =============================================================================
  // getClipBounds Tests
  // =============================================================================

  describe('getClipBounds', () => {
    const bpm = 120;

    it('should calculate bounds for untrimmed clip', () => {
      const clip = createClip('sample-1', 0);
      const bounds = getClipBounds(clip, mockSamples[0], bpm);

      expect(bounds.startBeat).toBe(0);
      expect(bounds.endBeat).toBe(4); // 2 seconds = 4 beats
    });

    it('should calculate bounds for clip starting at non-zero position', () => {
      const clip = createClip('sample-1', 8);
      const bounds = getClipBounds(clip, mockSamples[0], bpm);

      expect(bounds.startBeat).toBe(8);
      expect(bounds.endBeat).toBe(12); // 8 + 4
    });

    it('should respect trim boundaries in bounds calculation', () => {
      // sample-1 is 2 seconds, trim to 0.5-1.5 seconds = 1 second = 2 beats
      const clip = createClip('sample-1', 0, 0.5, 1.5);
      const bounds = getClipBounds(clip, mockSamples[0], bpm);

      expect(bounds.startBeat).toBe(0);
      expect(bounds.endBeat).toBe(2);
    });

    it('should handle long samples', () => {
      const clip = createClip('sample-3', 0);
      const bounds = getClipBounds(clip, mockSamples[2], bpm);

      expect(bounds.startBeat).toBe(0);
      expect(bounds.endBeat).toBe(8); // 4 seconds = 8 beats
    });

    it('should handle short samples', () => {
      const clip = createClip('sample-4', 0);
      const bounds = getClipBounds(clip, mockSamples[3], bpm);

      expect(bounds.startBeat).toBe(0);
      expect(bounds.endBeat).toBe(1); // 0.5 seconds = 1 beat
    });

    it('should calculate bounds for trimmed clip at non-zero start', () => {
      const clip = createClip('sample-1', 4, 0, 1);
      const bounds = getClipBounds(clip, mockSamples[0], bpm);

      expect(bounds.startBeat).toBe(4);
      expect(bounds.endBeat).toBe(6); // 1 second = 2 beats, 4 + 2 = 6
    });
  });

  // =============================================================================
  // boundsOverlap Tests
  // =============================================================================

  describe('boundsOverlap', () => {
    it('should detect overlap: contained within', () => {
      const bounds1 = { startBeat: 0, endBeat: 10 };
      const bounds2 = { startBeat: 2, endBeat: 5 };

      expect(boundsOverlap(bounds1, bounds2)).toBe(true);
    });

    it('should detect overlap: partial overlap left', () => {
      const bounds1 = { startBeat: 0, endBeat: 5 };
      const bounds2 = { startBeat: 3, endBeat: 8 };

      expect(boundsOverlap(bounds1, bounds2)).toBe(true);
    });

    it('should detect overlap: partial overlap right', () => {
      const bounds1 = { startBeat: 5, endBeat: 10 };
      const bounds2 = { startBeat: 0, endBeat: 7 };

      expect(boundsOverlap(bounds1, bounds2)).toBe(true);
    });

    it('should detect no overlap: adjacent but not overlapping (touching at boundary)', () => {
      const bounds1 = { startBeat: 0, endBeat: 5 };
      const bounds2 = { startBeat: 5, endBeat: 10 };

      // Overlap detection uses < and >, so touching boundaries do NOT overlap
      expect(boundsOverlap(bounds1, bounds2)).toBe(false);
    });

    it('should detect no overlap: clearly separated', () => {
      const bounds1 = { startBeat: 0, endBeat: 5 };
      const bounds2 = { startBeat: 10, endBeat: 15 };

      expect(boundsOverlap(bounds1, bounds2)).toBe(false);
    });

    it('should detect no overlap: reversed order', () => {
      const bounds1 = { startBeat: 10, endBeat: 15 };
      const bounds2 = { startBeat: 0, endBeat: 5 };

      expect(boundsOverlap(bounds1, bounds2)).toBe(false);
    });

    it('should detect overlap: identical bounds', () => {
      const bounds1 = { startBeat: 0, endBeat: 5 };
      const bounds2 = { startBeat: 0, endBeat: 5 };

      expect(boundsOverlap(bounds1, bounds2)).toBe(true);
    });

    it('should detect overlap: one beat difference', () => {
      const bounds1 = { startBeat: 0, endBeat: 5 };
      const bounds2 = { startBeat: 4, endBeat: 10 };

      expect(boundsOverlap(bounds1, bounds2)).toBe(true);
    });
  });

  // =============================================================================
  // wouldOverlap Tests
  // =============================================================================

  describe('wouldOverlap', () => {
    const bpm = 120;
    const sampleMap = createSampleMap(mockSamples);

    it('should return false for empty track', () => {
      const track = createEmptyTrack('track-1');
      const newClip = createClip('sample-1', 0);

      expect(wouldOverlap(track, newClip, mockSamples[0], sampleMap, bpm)).toBe(false);
    });

    it('should return true when clip overlaps existing clip', () => {
      const clip1 = createClip('sample-1', 0); // beats 0-4
      const track = createTrackWithClips('track-1', [clip1]);

      const newClip = createClip('sample-1', 2); // trying to place at 2-6, overlaps 0-4
      expect(wouldOverlap(track, newClip, mockSamples[0], sampleMap, bpm)).toBe(true);
    });

    it('should return false when clip is after existing clip (non-overlapping)', () => {
      const clip1 = createClip('sample-1', 0); // beats 0-4
      const track = createTrackWithClips('track-1', [clip1]);

      const newClip = createClip('sample-2', 4); // trying to place at 4-6, no overlap
      expect(wouldOverlap(track, newClip, mockSamples[1], sampleMap, bpm)).toBe(false);
    });

    it('should return false when clip is before existing clip', () => {
      const clip1 = createClip('sample-1', 4); // beats 4-8
      const track = createTrackWithClips('track-1', [clip1]);

      const newClip = createClip('sample-2', 0); // trying to place at 0-2, no overlap
      expect(wouldOverlap(track, newClip, mockSamples[1], sampleMap, bpm)).toBe(false);
    });

    it('should handle multiple clips on track', () => {
      // sample-1 is 2s = 4 beats, sample-2 is 1s = 2 beats
      const clip1 = createClip('sample-1', 0); // 0-4
      const clip2 = createClip('sample-2', 8); // 8-10
      const track = createTrackWithClips('track-1', [clip1, clip2]);

      // Try to place sample-2 at beat 4 (4-6, no overlap with either clip)
      const newClip = createClip('sample-2', 4);
      expect(wouldOverlap(track, newClip, mockSamples[1], sampleMap, bpm)).toBe(false);
    });

    it('should return true when overlapping multiple clips', () => {
      const clip1 = createClip('sample-4', 0); // 0-1
      const clip2 = createClip('sample-4', 2); // 2-3
      const track = createTrackWithClips('track-1', [clip1, clip2]);

      // Try to place at 0.5-2.5 (overlaps both)
      const newClip = createClip('sample-1', 0);
      newClip.startBeat = 0;
      expect(wouldOverlap(track, newClip, mockSamples[0], sampleMap, bpm)).toBe(true);
    });

    it('should exclude specified clip from overlap check', () => {
      const clip1 = createClip('sample-1', 0); // 0-4
      const clip2 = createClip('sample-2', 8); // 8-10
      const track = createTrackWithClips('track-1', [clip1, clip2]);

      // Try to place clip1 at its original position (should not conflict with itself)
      expect(wouldOverlap(track, clip1, mockSamples[0], sampleMap, bpm, clip1.id)).toBe(false);
    });

    it('should handle clips with trimming', () => {
      // sample-1 is 2 seconds, trim to 0.5-1.5 seconds = 1 second = 2 beats
      const clip1 = createClip('sample-1', 0, 0.5, 1.5); // effective: 0-2
      const track = createTrackWithClips('track-1', [clip1]);

      const newClip = createClip('sample-2', 2); // 2-4, no overlap
      expect(wouldOverlap(track, newClip, mockSamples[1], sampleMap, bpm)).toBe(false);
    });

    it('should return false when existing clip has unknown sample', () => {
      const clip1 = createClip('unknown-sample', 0);
      const track = createTrackWithClips('track-1', [clip1]);

      const newClip = createClip('sample-1', 0);
      expect(wouldOverlap(track, newClip, mockSamples[0], sampleMap, bpm)).toBe(false);
    });
  });

  // =============================================================================
  // findSmartSnapPosition Tests
  // =============================================================================

  describe('findSmartSnapPosition', () => {
    const bpm = 120;
    const totalBeats = 32;
    const sampleMap = createSampleMap(mockSamples);

    function createTracks(count: number): Track[] {
      return Array.from({ length: count }, (_, i) => createEmptyTrack(`track-${i}`));
    }

    it('should return original position when no overlap on target track', () => {
      const tracks = createTracks(4);
      const newClip = createClip('sample-1', 0);

      const result = findSmartSnapPosition(tracks, 0, newClip, mockSamples[0], sampleMap, bpm, totalBeats);

      expect(result.reason).toBe('original');
      expect(result.trackIndex).toBe(0);
      expect(result.startBeat).toBe(0);
    });

    it('should shift clip after blocking clip when overlap detected', () => {
      const tracks = createTracks(4);
      const clip1 = createClip('sample-1', 0); // 0-4
      tracks[0].clips = [clip1];

      // Try to place at beat 2 (overlaps clip1)
      const newClip = createClip('sample-2', 2);

      const result = findSmartSnapPosition(tracks, 0, newClip, mockSamples[1], sampleMap, bpm, totalBeats);

      expect(result.reason).toBe('shifted');
      expect(result.trackIndex).toBe(0);
      expect(result.startBeat).toBe(4); // Shifted to after clip1
    });

    it('should try track below when no space on target track after shift', () => {
      const tracks = createTracks(4);

      // Fill track 0 completely
      const clip1 = createClip('sample-1', 0); // 0-4
      const clip2 = createClip('sample-1', 4); // 4-8
      const clip3 = createClip('sample-1', 8); // 8-12
      const clip4 = createClip('sample-1', 12); // 12-16
      tracks[0].clips = [clip1, clip2, clip3, clip4];

      // Try to place at beat 2 (can't shift on track 0, should go to track 1)
      const newClip = createClip('sample-1', 2);

      const result = findSmartSnapPosition(tracks, 0, newClip, mockSamples[0], sampleMap, bpm, totalBeats);

      expect(result.reason).toBe('track_below');
      expect(result.trackIndex).toBe(1);
      expect(result.startBeat).toBe(2); // Same horizontal position on lower track
    });

    it('should reject placement when no space anywhere', () => {
      const tracks = createTracks(2);

      // Fill all tracks with clips at position 0-4 AND at position 4-8
      // This prevents any placement on either track
      for (let i = 0; i < tracks.length; i++) {
        const clip1 = createClip('sample-1', 0); // 0-4
        const clip2 = createClip('sample-1', 4); // 4-8
        tracks[i].clips = [clip1, clip2];
      }

      // Try to place a 4-beat clip at position 2 (overlaps both clips)
      // Should try to shift, but all positions up to beat 28 will fail due to space
      const newClip = createClip('sample-1', 2);

      const result = findSmartSnapPosition(tracks, 0, newClip, mockSamples[0], sampleMap, bpm, totalBeats);

      // Even after shift, it can't find space on track 0 (occupied), and track 1 is also full
      expect(result.reason).toBe('rejected');
      expect('rejectReason' in result && result.rejectReason).toBe('no_space');
    });

    it('should return original even if clip extends beyond timeline (validation happens elsewhere)', () => {
      const tracks = createTracks(4);

      // sample-1 is 4 beats, so at position 30 it would end at 34 > 32
      // The function returns 'original' without checking against totalBeats at this point
      const newClip = createClip('sample-1', 30);

      const result = findSmartSnapPosition(tracks, 0, newClip, mockSamples[0], sampleMap, bpm, totalBeats);

      // Function returns 'original' - validation of totalBeats happens in the final rejection check
      // only after strategies 1-3 have been evaluated
      expect(result.reason).toBe('original');
      expect(result.trackIndex).toBe(0);
      expect(result.startBeat).toBe(30);
    });

    it('should correctly determine reject reason as no_space when position is valid but no room', () => {
      const tracks = createTracks(2);

      // Fill both tracks completely with adjacent clips
      for (let i = 0; i < tracks.length; i++) {
        const clip1 = createClip('sample-1', 0); // 0-4
        const clip2 = createClip('sample-1', 4); // 4-8
        const clip3 = createClip('sample-1', 8); // 8-12
        const clip4 = createClip('sample-1', 12); // 12-16
        tracks[i].clips = [clip1, clip2, clip3, clip4];
      }

      // Try to place at beat 6 (overlaps multiple clips, no free space on either track)
      const newClip = createClip('sample-1', 6);

      const result = findSmartSnapPosition(tracks, 0, newClip, mockSamples[0], sampleMap, bpm, totalBeats);

      // Should reject with no_space (not out_of_bounds)
      expect(result.reason).toBe('rejected');
      expect('rejectReason' in result && result.rejectReason).toBe('no_space');
    });

    it('should exclude specified clip from overlap check during move', () => {
      const tracks = createTracks(4);
      const clip1 = createClip('sample-1', 0); // 0-4
      tracks[0].clips = [clip1];

      // Move clip1 to its own position (should succeed)
      const result = findSmartSnapPosition(tracks, 0, clip1, mockSamples[0], sampleMap, bpm, totalBeats, clip1.id);

      expect(result.reason).toBe('original');
      expect(result.startBeat).toBe(0);
    });

    it('should handle multiple blocking clips and choose closest one', () => {
      const tracks = createTracks(4);

      // Place multiple overlapping clips on target track
      // sample-1 is 2s = 4 beats at 120 BPM
      const clip1 = createClip('sample-1', 0); // 0-4
      const clip2 = createClip('sample-1', 8); // 8-12
      tracks[0].clips = [clip1, clip2];

      // Try to place 4-beat clip at beat 2 (overlaps clip1 0-4)
      // Should shift to after clip1, which is beat 4
      // At beat 4, it occupies 4-8, which doesn't overlap clip2 at 8-12
      const newClip = createClip('sample-1', 2);

      const result = findSmartSnapPosition(tracks, 0, newClip, mockSamples[0], sampleMap, bpm, totalBeats);

      expect(result.reason).toBe('shifted');
      expect(result.startBeat).toBe(4); // After clip1 which ends at 4
    });

    it('should handle trimmed clips correctly', () => {
      const tracks = createTracks(4);

      // Place trimmed clip: sample-1 (2s) trimmed to 0.5-1.5s = 1s = 2 beats
      const clip1 = createClip('sample-1', 0, 0.5, 1.5);
      tracks[0].clips = [clip1];

      // Try to place another 2-beat clip at beat 1 (would overlap trimmed clip)
      const newClip = createClip('sample-2', 1);

      const result = findSmartSnapPosition(tracks, 0, newClip, mockSamples[1], sampleMap, bpm, totalBeats);

      expect(result.reason).toBe('shifted');
      expect(result.startBeat).toBe(2); // After trimmed clip
    });

    it('should try all tracks below before rejecting', () => {
      const tracks = createTracks(4);

      // Fill track 0 and 1 with a clip at beat 0-4, and another at beat 4-8
      // This prevents shifting on both tracks
      for (let i = 0; i < 2; i++) {
        const clip1 = createClip('sample-1', 0); // 0-4
        const clip2 = createClip('sample-1', 4); // 4-8
        tracks[i].clips = [clip1, clip2];
      }

      // Try to place at beat 2 (overlaps both clips on track 0)
      // Can't shift to beat 8 because that's occupied by clip2
      // So should try track 1 - same problem
      // Then try track 2 - empty, should succeed
      const newClip = createClip('sample-1', 2);

      const result = findSmartSnapPosition(tracks, 0, newClip, mockSamples[0], sampleMap, bpm, totalBeats);

      expect(result.reason).toBe('track_below');
      expect(result.trackIndex).toBe(2);
    });

    it('should not place on track above target (only below)', () => {
      const tracks = createTracks(4);

      // Fill track 2 with overlapping clips: 0-4 and 4-8
      const clip1 = createClip('sample-1', 0); // 0-4
      const clip2 = createClip('sample-1', 4); // 4-8
      tracks[2].clips = [clip1, clip2];

      // Try to place at beat 2 on track 2 (overlaps both)
      // Can't shift (beat 8 occupied), so should try track 3 (below)
      // NOT track 1 (above)
      const newClip = createClip('sample-1', 2);

      const result = findSmartSnapPosition(tracks, 2, newClip, mockSamples[0], sampleMap, bpm, totalBeats);

      expect(result.reason).toBe('track_below');
      expect(result.trackIndex).toBe(3);
    });
  });

  // =============================================================================
  // createSampleMap Tests
  // =============================================================================

  describe('createSampleMap', () => {
    it('should create a map from sample array', () => {
      const map = createSampleMap(mockSamples);

      expect(map.size).toBe(mockSamples.length);
      mockSamples.forEach((sample) => {
        expect(map.get(sample.id)).toEqual(sample);
      });
    });

    it('should handle empty array', () => {
      const map = createSampleMap([]);

      expect(map.size).toBe(0);
    });

    it('should handle single sample', () => {
      const map = createSampleMap([mockSamples[0]]);

      expect(map.size).toBe(1);
      expect(map.get('sample-1')).toEqual(mockSamples[0]);
    });

    it('should overwrite duplicate sample IDs (last one wins)', () => {
      const sample1 = { ...mockSamples[0], duration: 2 };
      const sample2 = { ...mockSamples[0], duration: 3 };

      const map = createSampleMap([sample1, sample2]);

      expect(map.size).toBe(1);
      expect(map.get('sample-1')?.duration).toBe(3); // Last one
    });
  });

  // =============================================================================
  // clipFitsInTimeline Tests
  // =============================================================================

  describe('clipFitsInTimeline', () => {
    const bpm = 120;
    const totalBeats = 32;

    it('should return true for clip at start', () => {
      const clip = createClip('sample-1', 0);
      expect(clipFitsInTimeline(clip, mockSamples[0], bpm, totalBeats)).toBe(true);
    });

    it('should return true for clip in middle', () => {
      const clip = createClip('sample-1', 10);
      expect(clipFitsInTimeline(clip, mockSamples[0], bpm, totalBeats)).toBe(true);
    });

    it('should return true for clip at end boundary', () => {
      // sample-1 is 2s = 4 beats, placed at beat 28 = ends at 32 (exactly at boundary)
      const clip = createClip('sample-1', 28);
      expect(clipFitsInTimeline(clip, mockSamples[0], bpm, totalBeats)).toBe(true);
    });

    it('should return false when clip extends beyond timeline', () => {
      // sample-1 is 2s = 4 beats, placed at beat 30 = ends at 34 (beyond 32)
      const clip = createClip('sample-1', 30);
      expect(clipFitsInTimeline(clip, mockSamples[0], bpm, totalBeats)).toBe(false);
    });

    it('should return false when clip starts before timeline', () => {
      const clip = createClip('sample-1', -1);
      expect(clipFitsInTimeline(clip, mockSamples[0], bpm, totalBeats)).toBe(false);
    });

    it('should return true for trimmed clip that fits', () => {
      // sample-1 trimmed to 0.5-1.5s = 1s = 2 beats, at beat 30 = ends at 32
      const clip = createClip('sample-1', 30, 0.5, 1.5);
      expect(clipFitsInTimeline(clip, mockSamples[0], bpm, totalBeats)).toBe(true);
    });

    it('should return false for trimmed clip that extends beyond', () => {
      // sample-1 trimmed to 0.5-1.5s = 1s = 2 beats, at beat 31 = ends at 33 (beyond)
      const clip = createClip('sample-1', 31, 0.5, 1.5);
      expect(clipFitsInTimeline(clip, mockSamples[0], bpm, totalBeats)).toBe(false);
    });

    it('should handle short samples', () => {
      // sample-4 is 0.5s = 1 beat
      const clip = createClip('sample-4', 31);
      expect(clipFitsInTimeline(clip, mockSamples[3], bpm, totalBeats)).toBe(true);
    });

    it('should handle long samples', () => {
      // sample-3 is 4s = 8 beats, at beat 24 = ends at 32
      const clip = createClip('sample-3', 24);
      expect(clipFitsInTimeline(clip, mockSamples[2], bpm, totalBeats)).toBe(true);
    });

    it('should return false for long sample beyond boundary', () => {
      // sample-3 is 4s = 8 beats, at beat 25 = ends at 33 (beyond 32)
      const clip = createClip('sample-3', 25);
      expect(clipFitsInTimeline(clip, mockSamples[2], bpm, totalBeats)).toBe(false);
    });
  });

  // =============================================================================
  // Integration Scenarios
  // =============================================================================

  describe('integration scenarios', () => {
    const bpm = 120;
    const totalBeats = 32;
    const sampleMap = createSampleMap(mockSamples);

    it('should handle a complete studio workflow: place, overlap, shift, track_below', () => {
      const tracks = Array.from({ length: 4 }, (_, i) => createEmptyTrack(`track-${i}`));

      // Step 1: Place first clip (should succeed)
      const clip1 = createClip('sample-3', 0); // 8 beats
      const result1 = findSmartSnapPosition(tracks, 0, clip1, mockSamples[2], sampleMap, bpm, totalBeats);
      expect(result1.reason).toBe('original');
      tracks[0].clips.push(clip1);

      // Step 2: Place second clip overlapping first (should shift)
      const clip2 = createClip('sample-1', 2);
      const result2 = findSmartSnapPosition(tracks, 0, clip2, mockSamples[0], sampleMap, bpm, totalBeats);
      expect(result2.reason).toBe('shifted');
      expect(result2.startBeat).toBe(8); // After clip1
      tracks[0].clips.push({ ...clip2, startBeat: result2.startBeat });

      // Step 3: Fill track 0 more
      const clip3 = createClip('sample-1', 12); // 12-16
      tracks[0].clips.push(clip3);

      const clip4 = createClip('sample-1', 16); // 16-20
      tracks[0].clips.push(clip4);

      // Step 4: Try to place on full track 0 (should go to track 1)
      const clip5 = createClip('sample-1', 8);
      const result5 = findSmartSnapPosition(tracks, 0, clip5, mockSamples[0], sampleMap, bpm, totalBeats);
      expect(result5.reason).toBe('track_below');
      expect(result5.trackIndex).toBe(1);
    });

    it('should handle complex trim scenarios with collision detection', () => {
      const tracks = [createEmptyTrack('track-1')];

      // Place a trimmed clip that occupies beats 0-2
      const clip1 = createClip('sample-1', 0, 0.5, 1.5); // 1 second = 2 beats
      tracks[0].clips = [clip1];

      // Try to place another clip at beat 1 (should shift after clip1 at beat 2)
      const clip2 = createClip('sample-2', 1);
      const result = findSmartSnapPosition(tracks, 0, clip2, mockSamples[1], sampleMap, bpm, totalBeats);

      expect(result.reason).toBe('shifted');
      expect(result.startBeat).toBe(2);
    });
  });
});
