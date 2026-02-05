import { create } from 'zustand';
import type { Clip, Sample, Track, TimelineState } from '../types';
import {
  DEFAULT_BPM,
  DEFAULT_TOTAL_BEATS,
  DEFAULT_TRACK_COUNT,
} from '../constants/config';
import {
  findSmartSnapPosition,
  createSampleMap,
  type SmartSnapResult,
} from '../utils/clipCollision';
import { getClipEndBeat } from '../utils/audio';
import { generateClipId } from '../utils/uuid';

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

  // Clip actions (with smart snap support)
  addClip: (
    trackIndex: number,
    clip: Clip,
    sample: Sample,
    allSamples: Sample[],
  ) => SmartSnapResult;
  removeClip: (trackIndex: number, clipId: string) => void;
  moveClip: (
    fromTrackIndex: number,
    toTrackIndex: number,
    clipId: string,
    newStartBeat: number,
    sample: Sample,
    allSamples: Sample[],
  ) => SmartSnapResult;

  // Clip trim action
  updateClipTrim: (
    trackIndex: number,
    clipId: string,
    trimStart: number,
    trimEnd: number,
  ) => void;

  // Clip duplicate action
  duplicateClip: (
    trackIndex: number,
    clipId: string,
    sample: Sample,
    allSamples: Sample[],
  ) => SmartSnapResult & { newClipId?: string };

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

  addClip: (trackIndex, clip, sample, allSamples) => {
    const state = get();
    const sampleMap = createSampleMap(allSamples);

    // Validate track index
    if (trackIndex < 0 || trackIndex >= state.tracks.length) {
      return { trackIndex, startBeat: clip.startBeat, reason: 'rejected' };
    }

    // Use smart snap to find optimal position
    const result = findSmartSnapPosition(
      state.tracks,
      trackIndex,
      clip,
      sample,
      sampleMap,
      state.bpm,
      state.totalBeats,
    );

    // If rejected, don't add the clip
    if (result.reason === 'rejected') {
      return result;
    }

    // Create the clip with the final position
    const finalClip: Clip = { ...clip, startBeat: result.startBeat };

    set((prev) => ({
      tracks: prev.tracks.map((t, i) =>
        i === result.trackIndex ? { ...t, clips: [...t.clips, finalClip] } : t,
      ),
    }));

    return result;
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

  moveClip: (fromTrackIndex, toTrackIndex, clipId, newStartBeat, sample, allSamples) => {
    const state = get();
    const sampleMap = createSampleMap(allSamples);

    // Validate track indices
    if (
      fromTrackIndex < 0 ||
      fromTrackIndex >= state.tracks.length ||
      toTrackIndex < 0 ||
      toTrackIndex >= state.tracks.length
    ) {
      return { trackIndex: toTrackIndex, startBeat: newStartBeat, reason: 'rejected' };
    }

    // Find the clip being moved
    const existingClip = state.tracks[fromTrackIndex].clips.find(
      (c) => c.id === clipId,
    );
    if (!existingClip) {
      return { trackIndex: toTrackIndex, startBeat: newStartBeat, reason: 'rejected' };
    }

    // Create a temporary clip with the desired new position
    const tempClip: Clip = { ...existingClip, startBeat: newStartBeat };

    // Use smart snap to find optimal position (exclude the clip being moved)
    const result = findSmartSnapPosition(
      state.tracks,
      toTrackIndex,
      tempClip,
      sample,
      sampleMap,
      state.bpm,
      state.totalBeats,
      clipId, // Exclude this clip from collision checks
    );

    // If rejected, don't move the clip
    if (result.reason === 'rejected') {
      return result;
    }

    // Create the final moved clip
    const movedClip: Clip = { ...existingClip, startBeat: result.startBeat };

    set((prev) => ({
      tracks: prev.tracks.map((t, i) => {
        if (i === fromTrackIndex && i === result.trackIndex) {
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
        if (i === result.trackIndex) {
          // Add to destination
          return { ...t, clips: [...t.clips, movedClip] };
        }
        return t;
      }),
    }));

    return result;
  },

  updateClipTrim: (trackIndex, clipId, trimStart, trimEnd) => {
    set((prev) => ({
      tracks: prev.tracks.map((track, i) =>
        i === trackIndex
          ? {
              ...track,
              clips: track.clips.map((clip) =>
                clip.id === clipId
                  ? { ...clip, trimStart, trimEnd }
                  : clip,
              ),
            }
          : track,
      ),
    }));
  },

  duplicateClip: (trackIndex, clipId, sample, allSamples) => {
    const state = get();
    const sampleMap = createSampleMap(allSamples);

    // Find the original clip
    const track = state.tracks[trackIndex];
    if (!track) {
      return { trackIndex, startBeat: 0, reason: 'rejected' };
    }

    const originalClip = track.clips.find((c) => c.id === clipId);
    if (!originalClip) {
      return { trackIndex, startBeat: 0, reason: 'rejected' };
    }

    // Calculate desired position (directly after original clip)
    const originalEndBeat = getClipEndBeat(originalClip, sample, state.bpm);
    const desiredStartBeat = Math.ceil(originalEndBeat);

    // Create new clip with same trim settings
    const newClipId = generateClipId();
    const newClip: Clip = {
      id: newClipId,
      sampleId: originalClip.sampleId,
      startBeat: desiredStartBeat,
      trimStart: originalClip.trimStart,
      trimEnd: originalClip.trimEnd,
      effects: originalClip.effects,
    };

    // Use smart snap to find optimal position
    const result = findSmartSnapPosition(
      state.tracks,
      trackIndex,
      newClip,
      sample,
      sampleMap,
      state.bpm,
      state.totalBeats,
    );

    // If rejected, don't add the clip
    if (result.reason === 'rejected') {
      return result;
    }

    // Create the final clip with the snapped position
    const finalClip: Clip = { ...newClip, startBeat: result.startBeat };

    set((prev) => ({
      tracks: prev.tracks.map((t, i) =>
        i === result.trackIndex
          ? { ...t, clips: [...t.clips, finalClip] }
          : t,
      ),
    }));

    return { ...result, newClipId };
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
