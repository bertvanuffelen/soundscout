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

  describe('extendTimeline (B2, "+ 8 maten")', () => {
    it('verlengt totalBeats en verhoogt audioVersion', () => {
      useTimelineStore.setState({ totalBeats: 128, audioVersion: 0 });
      useTimelineStore.getState().extendTimeline(32);
      expect(useTimelineStore.getState().totalBeats).toBe(160);
      expect(useTimelineStore.getState().audioVersion).toBe(1);
    });

    it('klemt op MAX_TOTAL_BEATS (256) en verhoogt dan audioVersion niet', () => {
      useTimelineStore.setState({ totalBeats: 240, audioVersion: 0 });
      useTimelineStore.getState().extendTimeline(32);
      expect(useTimelineStore.getState().totalBeats).toBe(256);
      // Op het maximum: nogmaals verlengen doet niets
      const versionAtMax = useTimelineStore.getState().audioVersion;
      useTimelineStore.getState().extendTimeline(32);
      expect(useTimelineStore.getState().totalBeats).toBe(256);
      expect(useTimelineStore.getState().audioVersion).toBe(versionAtMax);
    });
  });

  describe('addTrack + solo (B3)', () => {
    it('voegt sporen toe tot MAX_TRACK_COUNT (12) en verhoogt audioVersion', () => {
      useTimelineStore.setState({
        tracks: Array.from({ length: 8 }, (_, i) => ({ id: `track-${i + 1}`, clips: [] })),
        audioVersion: 0,
      });
      useTimelineStore.getState().addTrack();
      expect(useTimelineStore.getState().tracks).toHaveLength(9);
      expect(useTimelineStore.getState().audioVersion).toBe(1);

      // Tot het maximum vullen
      for (let i = 0; i < 10; i++) useTimelineStore.getState().addTrack();
      expect(useTimelineStore.getState().tracks).toHaveLength(12);
      const versionAtMax = useTimelineStore.getState().audioVersion;
      useTimelineStore.getState().addTrack();
      expect(useTimelineStore.getState().tracks).toHaveLength(12);
      expect(useTimelineStore.getState().audioVersion).toBe(versionAtMax);
    });

    it('solo is sessie-state: gezet via setSoloTrack, gewist door loadTimeline en clearAllTracks', () => {
      useTimelineStore.getState().setSoloTrack(2);
      expect(useTimelineStore.getState().soloTrackIndex).toBe(2);

      useTimelineStore.getState().clearAllTracks();
      expect(useTimelineStore.getState().soloTrackIndex).toBeNull();

      useTimelineStore.getState().setSoloTrack(1);
      useTimelineStore.getState().loadTimeline({
        tracks: [{ id: 'track-1', clips: [] }],
        bpm: 120,
        totalBeats: 128,
        isLooping: false,
      });
      expect(useTimelineStore.getState().soloTrackIndex).toBeNull();
    });

    it('solo staat niet in de opgeslagen TimelineState', () => {
      useTimelineStore.getState().setSoloTrack(3);
      const state = useTimelineStore.getState().getTimelineState();
      expect('soloTrackIndex' in state).toBe(false);
    });
  });

  describe('loopRegion (B4, sectie-loop)', () => {
    it('regio zetten schakelt ook isLooping in (één mentaal model)', () => {
      useTimelineStore.setState({ isLooping: false, loopRegion: null });
      useTimelineStore.getState().setLoopRegion({ startBeat: 16, endBeat: 48 });
      expect(useTimelineStore.getState().loopRegion).toEqual({ startBeat: 16, endBeat: 48 });
      expect(useTimelineStore.getState().isLooping).toBe(true);
    });

    it('regio wissen laat isLooping met rust (hele-tijdlijn-loop blijft)', () => {
      useTimelineStore.setState({ isLooping: true, loopRegion: { startBeat: 0, endBeat: 32 } });
      useTimelineStore.getState().setLoopRegion(null);
      expect(useTimelineStore.getState().loopRegion).toBeNull();
      expect(useTimelineStore.getState().isLooping).toBe(true);
    });

    it('is sessie-state: gewist door loadTimeline en clearAllTracks', () => {
      useTimelineStore.getState().setLoopRegion({ startBeat: 0, endBeat: 16 });
      useTimelineStore.getState().clearAllTracks();
      expect(useTimelineStore.getState().loopRegion).toBeNull();

      useTimelineStore.getState().setLoopRegion({ startBeat: 0, endBeat: 16 });
      useTimelineStore.getState().loadTimeline({
        tracks: [{ id: 'track-1', clips: [] }],
        bpm: 120,
        totalBeats: 128,
        isLooping: false,
      });
      expect(useTimelineStore.getState().loopRegion).toBeNull();
    });
  });

  describe('addClip', () => {
    it('should add a clip to the specified track', () => {
      const store = useTimelineStore.getState();
      const clip = createClip('sample-1', 0);

      const result = store.addClip(0, clip, mockSamples);

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

      store.addClip(0, createClip('sample-1', 0), mockSamples);
      store.addClip(1, createClip('sample-2', 4), mockSamples);
      store.addClip(2, createClip('sample-3', 8), mockSamples);

      const tracks = useTimelineStore.getState().tracks;
      expect(tracks[0].clips).toHaveLength(1);
      expect(tracks[1].clips).toHaveLength(1);
      expect(tracks[2].clips).toHaveLength(1);
    });

    it('should use smart snap when clips overlap', () => {
      const store = useTimelineStore.getState();

      // Add first clip at beat 0 (duration 4 beats)
      store.addClip(0, createClip('sample-1', 0), mockSamples);

      // Try to add second clip at beat 2 (would overlap)
      // Smart snap should shift it to beat 4 (after first clip)
      const result = store.addClip(
        0,
        createClip('sample-2', 2),
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
      store.addClip(0, createClip('sample-3', 0), mockSamples);
      store.addClip(0, createClip('sample-3', 8), mockSamples);
      store.addClip(0, createClip('sample-3', 16), mockSamples);
      store.addClip(0, createClip('sample-3', 24), mockSamples);

      // Try to add clip at beat 4 - should go to track 1
      const result = store.addClip(
        0,
        createClip('sample-1', 4),
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
        mockSamples,
      );

      expect(result.reason).toBe('rejected');
    });

    it('should return rejected for unknown sample', () => {
      const store = useTimelineStore.getState();

      const result = store.addClip(
        0,
        createClip('unknown-sample', 0),
        mockSamples,
      );

      expect(result.reason).toBe('rejected');
    });
  });

  describe('removeClip', () => {
    it('should remove a clip by ID', () => {
      const store = useTimelineStore.getState();
      const clip = createClip('sample-1', 0);

      store.addClip(0, clip, mockSamples);
      store.removeClip(0, clip.id);

      const tracks = useTimelineStore.getState().tracks;
      expect(tracks[0].clips).toHaveLength(0);
    });

    it('should not affect other clips when removing one', () => {
      const store = useTimelineStore.getState();
      const clip1 = createClip('sample-1', 0);
      const clip2 = createClip('sample-2', 8);

      store.addClip(0, clip1, mockSamples);
      store.addClip(0, clip2, mockSamples);
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

      store.addClip(0, clip, mockSamples);
      const result = store.moveClip(0, 0, clip.id, 8, mockSamples);

      expect(result.reason).toBe('original');
      const movedClip = useTimelineStore.getState().tracks[0].clips[0];
      expect(movedClip.startBeat).toBe(8);
    });

    it('should move a clip to a different track', () => {
      const store = useTimelineStore.getState();
      const clip = createClip('sample-1', 0);

      store.addClip(0, clip, mockSamples);
      const result = store.moveClip(0, 2, clip.id, 4, mockSamples);

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

      store.addClip(0, clip1, mockSamples);
      store.addClip(0, clip2, mockSamples);

      // Try to move clip2 to beat 2 (would overlap with clip1 at beats 0-4)
      const result = store.moveClip(0, 0, clip2.id, 2, mockSamples);

      // Should be shifted to beat 4 (after clip1)
      expect(result.reason).toBe('shifted');
      expect(result.startBeat).toBe(4);

      const clips = useTimelineStore.getState().tracks[0].clips;
      const movedClip = clips.find((c) => c.id === clip2.id);
      expect(movedClip?.startBeat).toBe(4);
    });

    it('should return rejected for unknown sample', () => {
      const store = useTimelineStore.getState();
      const clip = createClip('sample-1', 0);

      store.addClip(0, clip, mockSamples);

      // Pass empty samples to simulate unknown sample
      const result = store.moveClip(0, 0, clip.id, 8, []);

      expect(result.reason).toBe('rejected');
    });
  });

  describe('duplicateClip', () => {
    it('should duplicate a clip with same sample and trim settings', () => {
      const store = useTimelineStore.getState();
      const clip = createClip('sample-1', 0);

      store.addClip(0, clip, mockSamples);
      const result = store.duplicateClip(0, clip.id, mockSamples);

      expect(result.reason).toBe('original');
      expect(result.newClipId).toBeDefined();

      const clips = useTimelineStore.getState().tracks[0].clips;
      expect(clips).toHaveLength(2);
      expect(clips[1].sampleId).toBe('sample-1');
      expect(clips[1].id).toBe(result.newClipId);
    });

    it('should return rejected for unknown clip', () => {
      const store = useTimelineStore.getState();

      const result = store.duplicateClip(0, 'unknown-clip-id', mockSamples);

      expect(result.reason).toBe('rejected');
    });

    it('should return rejected for unknown sample', () => {
      const store = useTimelineStore.getState();
      const clip = createClip('sample-1', 0);

      store.addClip(0, clip, mockSamples);

      // Pass empty samples to simulate unknown sample
      const result = store.duplicateClip(0, clip.id, []);

      expect(result.reason).toBe('rejected');
    });
  });

  describe('updateClipTrim', () => {
    it('should update clip trim values', () => {
      const store = useTimelineStore.getState();
      const clip = createClip('sample-1', 0);

      store.addClip(0, clip, mockSamples);
      store.updateClipTrim(0, clip.id, 0.5, 1.5);

      const updatedClip = useTimelineStore.getState().tracks[0].clips[0];
      expect(updatedClip.trimStart).toBe(0.5);
      expect(updatedClip.trimEnd).toBe(1.5);
    });
  });

  describe('clearAllTracks', () => {
    it('should remove all clips from all tracks', () => {
      const store = useTimelineStore.getState();

      store.addClip(0, createClip('sample-1', 0), mockSamples);
      store.addClip(1, createClip('sample-2', 4), mockSamples);
      store.addClip(2, createClip('sample-3', 8), mockSamples);

      store.clearAllTracks();

      const tracks = useTimelineStore.getState().tracks;
      tracks.forEach((track) => {
        expect(track.clips).toHaveLength(0);
      });
    });

    it('should preserve sections when clearing tracks', () => {
      const store = useTimelineStore.getState();

      store.addSection(8);
      store.addSection(16);
      expect(useTimelineStore.getState().sections).toHaveLength(2);

      store.addClip(0, createClip('sample-1', 0), mockSamples);
      store.clearAllTracks();

      // Sections must survive clear
      expect(useTimelineStore.getState().sections).toHaveLength(2);
      // But clips are gone
      useTimelineStore.getState().tracks.forEach((track) => {
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
