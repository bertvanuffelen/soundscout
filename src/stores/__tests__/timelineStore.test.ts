import { describe, it, expect, beforeEach } from 'vitest';
import { useTimelineStore } from '../timelineStore';
import type { Clip } from '../../types';

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

      const result = store.addClip(0, clip);

      expect(result).toBe(true);
      const tracks = useTimelineStore.getState().tracks;
      expect(tracks[0].clips).toHaveLength(1);
      expect(tracks[0].clips[0]).toMatchObject({
        sampleId: 'sample-1',
        startBeat: 0,
      });
    });

    it('should add clips to different tracks', () => {
      const store = useTimelineStore.getState();

      store.addClip(0, createClip('sample-1', 0));
      store.addClip(1, createClip('sample-2', 4));
      store.addClip(2, createClip('sample-3', 8));

      const tracks = useTimelineStore.getState().tracks;
      expect(tracks[0].clips).toHaveLength(1);
      expect(tracks[1].clips).toHaveLength(1);
      expect(tracks[2].clips).toHaveLength(1);
    });

    it('should not allow clips at the same beat on the same track', () => {
      const store = useTimelineStore.getState();

      store.addClip(0, createClip('sample-1', 0));
      const result = store.addClip(0, createClip('sample-2', 0));

      expect(result).toBe(false);
      const clips = useTimelineStore.getState().tracks[0].clips;
      expect(clips).toHaveLength(1);
      expect(clips[0].sampleId).toBe('sample-1');
    });

    it('should return false for invalid track index', () => {
      const store = useTimelineStore.getState();

      const result = store.addClip(10, createClip('sample-1', 0));

      expect(result).toBe(false);
    });
  });

  describe('removeClip', () => {
    it('should remove a clip by ID', () => {
      const store = useTimelineStore.getState();
      const clip = createClip('sample-1', 0);

      store.addClip(0, clip);
      store.removeClip(0, clip.id);

      const tracks = useTimelineStore.getState().tracks;
      expect(tracks[0].clips).toHaveLength(0);
    });

    it('should not affect other clips when removing one', () => {
      const store = useTimelineStore.getState();
      const clip1 = createClip('sample-1', 0);
      const clip2 = createClip('sample-2', 4);

      store.addClip(0, clip1);
      store.addClip(0, clip2);
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

      store.addClip(0, clip);
      const result = store.moveClip(0, 0, clip.id, 8);

      expect(result).toBe(true);
      const movedClip = useTimelineStore.getState().tracks[0].clips[0];
      expect(movedClip.startBeat).toBe(8);
    });

    it('should move a clip to a different track', () => {
      const store = useTimelineStore.getState();
      const clip = createClip('sample-1', 0);

      store.addClip(0, clip);
      const result = store.moveClip(0, 2, clip.id, 4);

      expect(result).toBe(true);
      const tracks = useTimelineStore.getState().tracks;
      expect(tracks[0].clips).toHaveLength(0);
      expect(tracks[2].clips).toHaveLength(1);
      expect(tracks[2].clips[0].startBeat).toBe(4);
    });

    it('should not allow moving to an occupied beat', () => {
      const store = useTimelineStore.getState();
      const clip1 = createClip('sample-1', 0);
      const clip2 = createClip('sample-2', 4);

      store.addClip(0, clip1);
      store.addClip(0, clip2);
      const result = store.moveClip(0, 0, clip1.id, 4);

      expect(result).toBe(false);
      // clip1 should still be at beat 0
      const clips = useTimelineStore.getState().tracks[0].clips;
      const originalClip = clips.find((c) => c.id === clip1.id);
      expect(originalClip?.startBeat).toBe(0);
    });
  });

  describe('clearAllTracks', () => {
    it('should remove all clips from all tracks', () => {
      const store = useTimelineStore.getState();

      store.addClip(0, createClip('sample-1', 0));
      store.addClip(1, createClip('sample-2', 4));
      store.addClip(2, createClip('sample-3', 8));

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
