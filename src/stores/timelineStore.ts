import { create } from 'zustand';
import type { Clip, Track, TimelineState } from '../types';
import {
  DEFAULT_BPM,
  DEFAULT_TOTAL_BEATS,
  DEFAULT_TRACK_COUNT,
} from '../constants/config';

function createEmptyTracks(): Track[] {
  return Array.from({ length: DEFAULT_TRACK_COUNT }, (_, i) => ({
    id: `track-${i + 1}`,
    clips: [],
  }));
}

interface TimelineStore {
  tracks: Track[];
  bpm: number;
  totalBeats: number;
  isLooping: boolean;

  // Clip actions
  addClip: (trackIndex: number, clip: Clip) => boolean;
  removeClip: (trackIndex: number, clipId: string) => void;
  moveClip: (
    fromTrackIndex: number,
    toTrackIndex: number,
    clipId: string,
    newStartBeat: number,
  ) => boolean;

  // Track actions
  clearTrack: (trackIndex: number) => void;
  clearAllTracks: () => void;

  // Settings
  setLooping: (looping: boolean) => void;

  // Load saved composition
  loadTimeline: (timeline: TimelineState) => void;

  // Get current state as TimelineState
  getTimelineState: () => TimelineState;
}

export const useTimelineStore = create<TimelineStore>()((set, get) => ({
  tracks: createEmptyTracks(),
  bpm: DEFAULT_BPM,
  totalBeats: DEFAULT_TOTAL_BEATS,
  isLooping: false,

  addClip: (trackIndex, clip) => {
    const state = get();

    // Validate track index
    if (trackIndex < 0 || trackIndex >= state.tracks.length) return false;

    // Check for overlap: no two clips can start at the same beat on the same track
    const track = state.tracks[trackIndex];
    const hasOverlap = track.clips.some((c) => c.startBeat === clip.startBeat);
    if (hasOverlap) return false;

    set((prev) => ({
      tracks: prev.tracks.map((t, i) =>
        i === trackIndex ? { ...t, clips: [...t.clips, clip] } : t,
      ),
    }));

    return true;
  },

  removeClip: (trackIndex, clipId) => {
    set((prev) => ({
      tracks: prev.tracks.map((t, i) =>
        i === trackIndex
          ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) }
          : t,
      ),
    }));
  },

  moveClip: (fromTrackIndex, toTrackIndex, clipId, newStartBeat) => {
    const state = get();

    // Validate track indices
    if (
      fromTrackIndex < 0 ||
      fromTrackIndex >= state.tracks.length ||
      toTrackIndex < 0 ||
      toTrackIndex >= state.tracks.length
    ) {
      return false;
    }

    // Find the clip being moved
    const clip = state.tracks[fromTrackIndex].clips.find(
      (c) => c.id === clipId,
    );
    if (!clip) return false;

    // Check for overlap at destination (exclude the clip being moved)
    const destTrack = state.tracks[toTrackIndex];
    const hasOverlap = destTrack.clips.some(
      (c) => c.id !== clipId && c.startBeat === newStartBeat,
    );
    if (hasOverlap) return false;

    const movedClip: Clip = { ...clip, startBeat: newStartBeat };

    set((prev) => ({
      tracks: prev.tracks.map((t, i) => {
        if (i === fromTrackIndex && i === toTrackIndex) {
          // Moving within same track
          return {
            ...t,
            clips: t.clips.map((c) => (c.id === clipId ? movedClip : c)),
          };
        }
        if (i === fromTrackIndex) {
          // Remove from source
          return { ...t, clips: t.clips.filter((c) => c.id !== clipId) };
        }
        if (i === toTrackIndex) {
          // Add to destination
          return { ...t, clips: [...t.clips, movedClip] };
        }
        return t;
      }),
    }));

    return true;
  },

  clearTrack: (trackIndex) => {
    set((prev) => ({
      tracks: prev.tracks.map((t, i) =>
        i === trackIndex ? { ...t, clips: [] } : t,
      ),
    }));
  },

  clearAllTracks: () => {
    set({ tracks: createEmptyTracks() });
  },

  setLooping: (looping) => {
    set({ isLooping: looping });
  },

  loadTimeline: (timeline) => {
    set({
      tracks: timeline.tracks,
      bpm: timeline.bpm,
      totalBeats: timeline.totalBeats,
      isLooping: timeline.isLooping,
    });
  },

  getTimelineState: () => {
    const state = get();
    return {
      tracks: state.tracks,
      bpm: state.bpm,
      totalBeats: state.totalBeats,
      isPlaying: false, // Always false when saving
      isLooping: state.isLooping,
      currentBeat: 0,
    };
  },
}));
