import { describe, it, expect, beforeEach } from 'vitest';
import { useTimelineStore } from '../timelineStore';
import type { Clip, Sample } from '../../types';

// Mock samples for testing
const mockSamples: Sample[] = [
  {
    id: 'sample-1',
    name: 'Test Sample 1',
    locationId: 'loc-1',
    audioUrl: '/audio/test1.mp3',
    duration: 2, // 2 seconds = 4 beats at 120 BPM
    icon: 'Music',
    color: '#FF0000',
  },
  {
    id: 'sample-2',
    name: 'Test Sample 2',
    locationId: 'loc-1',
    audioUrl: '/audio/test2.mp3',
    duration: 1, // 1 second = 2 beats at 120 BPM
    icon: 'Bird',
    color: '#00FF00',
  },
  {
    id: 'sample-3',
    name: 'Test Sample 3',
    locationId: 'loc-1',
    audioUrl: '/audio/test3.mp3',
    duration: 4, // 4 seconds = 8 beats at 120 BPM
    icon: 'Dog',
    color: '#0000FF',
  },
];

// Helper to get sample by ID
function getSample(sampleId: string): Sample {
  return mockSamples.find((s) => s.id === sampleId) ?? mockSamples[0];
}

// Helper to create a clip
function createClip(sampleId: string, startBeat: number): Clip {
  return {
    id: `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sampleId,
    startBeat,
  };
}

describe('timelineStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTimelineStore.setState({
      tracks: [
        { id: 'track-1', clips: [] },
        { id: 'track-2', clips: [] },
        { id: 'track-3', clips: [] },
        { id: 'track-4', clips: [] },
      ],
      bpm: 120,
      totalBeats: 32,
      isLooping: false,
    });
  });

  describe('addClip', () => {
    it('should add a clip to the specified track', () => {
      const store = useTimelineStore.getState();
      const clip = createClip('sample-1', 0);
      const sample = getSample('sample-1');

      const result = store.addClip(0, clip, sample, mockSamples);

      expect(result.reason).toBe('original');
      const tracks = useTimelineStore.getState().tracks;
      expect(tracks[0].clips).toHaveLength(1);
      expect(tracks[0].clips[0]).toMatchObject({
        sampleId: 'sample-1',
        startBeat: 0,
      });
    });

    it('should add clips to different tracks', () => {
      const store = useTimelineStore.getState();

      store.addClip(0, createClip('sample-1', 0), getSample('sample-1'), mockSamples);
      store.addClip(1, createClip('sample-2', 4), getSample('sample-2'), mockSamples);
      store.addClip(2, createClip('sample-3', 8), getSample('sample-3'), mockSamples);

      const tracks = useTimelineStore.getState().tracks;
      expect(tracks[0].clips).toHaveLength(1);
      expect(tracks[1].clips).toHaveLength(1);
      expect(tracks[2].clips).toHaveLength(1);
    });

    it('should use smart snap when clips overlap', () => {
      const store = useTimelineStore.getState();

      // Add first clip at beat 0 (duration 4 beats)
      store.addClip(0, createClip('sample-1', 0), getSample('sample-1'), mockSamples);

      // Try to add second clip at beat 2 (would overlap)
      // Smart snap should shift it to beat 4 (after first clip)
      const result = store.addClip(
        0,
        createClip('sample-2', 2),
        getSample('sample-2'),
        mockSamples,
      );

      expect(result.reason).toBe('shifted');
      expect(result.startBeat).toBe(4);

      const clips = useTimelineStore.getState().tracks[0].clips;
      expect(clips).toHaveLength(2);
      expect(clips[1].startBeat).toBe(4);
    });

    it('should place clip on track below if no space on target track', () => {
      const store = useTimelineStore.getState();

      // Fill track 0 with a long clip
      store.addClip(0, createClip('sample-3', 0), getSample('sample-3'), mockSamples);
      store.addClip(0, createClip('sample-3', 8), getSample('sample-3'), mockSamples);
      store.addClip(0, createClip('sample-3', 16), getSample('sample-3'), mockSamples);
      store.addClip(0, createClip('sample-3', 24), getSample('sample-3'), mockSamples);

      // Try to add clip at beat 4 - should go to track 1
      const result = store.addClip(
        0,
        createClip('sample-1', 4),
        getSample('sample-1'),
        mockSamples,
      );

      expect(result.reason).toBe('track_below');
      expect(result.trackIndex).toBe(1);

      const tracks = useTimelineStore.getState().tracks;
      expect(tracks[1].clips).toHaveLength(1);
      expect(tracks[1].clips[0].startBeat).toBe(4);
    });

    it('should return rejected for invalid track index', () => {
      const store = useTimelineStore.getState();

      const result = store.addClip(
        10,
        createClip('sample-1', 0),
        getSample('sample-1'),
        mockSamples,
      );

      expect(result.reason).toBe('rejected');
    });
  });

  describe('removeClip', () => {
    it('should remove a clip by ID', () => {
      const store = useTimelineStore.getState();
      const clip = createClip('sample-1', 0);

      store.addClip(0, clip, getSample('sample-1'), mockSamples);
      store.removeClip(0, clip.id);

      const tracks = useTimelineStore.getState().tracks;
      expect(tracks[0].clips).toHaveLength(0);
    });

    it('should not affect other clips when removing one', () => {
      const store = useTimelineStore.getState();
      const clip1 = createClip('sample-1', 0);
      const clip2 = createClip('sample-2', 8);

      store.addClip(0, clip1, getSample('sample-1'), mockSamples);
      store.addClip(0, clip2, getSample('sample-2'), mockSamples);
      store.removeClip(0, clip1.id);

      const clips = useTimelineStore.getState().tracks[0].clips;
      expect(clips).toHaveLength(1);
      expect(clips[0].sampleId).toBe('sample-2');
    });
  });

  describe('moveClip', () => {
    it('should move a clip to a new position on the same track', () => {
      const store = useTimelineStore.getState();
      const clip = createClip('sample-1', 0);
      const sample = getSample('sample-1');

      store.addClip(0, clip, sample, mockSamples);
      const result = store.moveClip(0, 0, clip.id, 8, sample, mockSamples);

      expect(result.reason).toBe('original');
      const movedClip = useTimelineStore.getState().tracks[0].clips[0];
      expect(movedClip.startBeat).toBe(8);
    });

    it('should move a clip to a different track', () => {
      const store = useTimelineStore.getState();
      const clip = createClip('sample-1', 0);
      const sample = getSample('sample-1');

      store.addClip(0, clip, sample, mockSamples);
      const result = store.moveClip(0, 2, clip.id, 4, sample, mockSamples);

      expect(result.reason).toBe('original');
      const tracks = useTimelineStore.getState().tracks;
      expect(tracks[0].clips).toHaveLength(0);
      expect(tracks[2].clips).toHaveLength(1);
      expect(tracks[2].clips[0].startBeat).toBe(4);
    });

    it('should use smart snap when moving to an overlapping position', () => {
      const store = useTimelineStore.getState();
      const clip1 = createClip('sample-1', 0);
      const clip2 = createClip('sample-2', 8);
      const sample1 = getSample('sample-1');
      const sample2 = getSample('sample-2');

      store.addClip(0, clip1, sample1, mockSamples);
      store.addClip(0, clip2, sample2, mockSamples);

      // Try to move clip2 to beat 2 (would overlap with clip1 at beats 0-4)
      const result = store.moveClip(0, 0, clip2.id, 2, sample2, mockSamples);

      // Should be shifted to beat 4 (after clip1)
      expect(result.reason).toBe('shifted');
      expect(result.startBeat).toBe(4);

      const clips = useTimelineStore.getState().tracks[0].clips;
      const movedClip = clips.find((c) => c.id === clip2.id);
      expect(movedClip?.startBeat).toBe(4);
    });
  });

  describe('updateClipTrim', () => {
    it('should update clip trim values', () => {
      const store = useTimelineStore.getState();
      const clip = createClip('sample-1', 0);

      store.addClip(0, clip, getSample('sample-1'), mockSamples);
      store.updateClipTrim(0, clip.id, 0.5, 1.5);

      const updatedClip = useTimelineStore.getState().tracks[0].clips[0];
      expect(updatedClip.trimStart).toBe(0.5);
      expect(updatedClip.trimEnd).toBe(1.5);
    });
  });

  describe('clearAllTracks', () => {
    it('should remove all clips from all tracks', () => {
      const store = useTimelineStore.getState();

      store.addClip(0, createClip('sample-1', 0), getSample('sample-1'), mockSamples);
      store.addClip(1, createClip('sample-2', 4), getSample('sample-2'), mockSamples);
      store.addClip(2, createClip('sample-3', 8), getSample('sample-3'), mockSamples);

      store.clearAllTracks();

      const tracks = useTimelineStore.getState().tracks;
      tracks.forEach((track) => {
        expect(track.clips).toHaveLength(0);
      });
    });
  });

  describe('setLooping', () => {
    it('should update the looping state', () => {
      const store = useTimelineStore.getState();

      store.setLooping(true);
      expect(useTimelineStore.getState().isLooping).toBe(true);

      store.setLooping(false);
      expect(useTimelineStore.getState().isLooping).toBe(false);
    });
  });
});
