import { create } from 'zustand';
import type { Clip, Track, Section, Sample, TimelineState } from '../types';
import { SECTION_COLORS } from '../types';
import {
  DEFAULT_BPM,
  DEFAULT_TOTAL_BEATS,
  DEFAULT_TRACK_COUNT,
  VOLUME_MIN_DB,
  VOLUME_MAX_DB,
  MAX_SECTIONS,
} from '../constants/config';
import {
  findSmartSnapPosition,
  createSampleMap,
  type SmartSnapResult,
} from '../utils/clipCollision';
import { getEffectiveClipEndBeat } from '../utils/audio';
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
  sections: Section[];

  /** Incremented on every audio-relevant change (#22). Used by useRescheduleOnChange. */
  audioVersion: number;

  // Section actions (musical form / vormschema)
  addSection: (endBeat: number, color?: string, label?: string, fromStoryboard?: boolean) => boolean;
  removeSection: (sectionId: string) => void;
  updateSection: (sectionId: string, updates: Partial<Pick<Section, 'color' | 'label' | 'endBeat'>>) => void;
  clearSections: () => void;

  // Clip actions (with smart snap support)
  addClip: (
    trackIndex: number,
    clip: Clip,
    samples: Sample[],
  ) => SmartSnapResult;
  removeClip: (trackIndex: number, clipId: string) => void;
  moveClip: (
    fromTrackIndex: number,
    toTrackIndex: number,
    clipId: string,
    newStartBeat: number,
    samples: Sample[],
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
    samples: Sample[],
  ) => SmartSnapResult & { newClipId?: string };

  // Track volume/mute actions
  updateTrackVolume: (trackIndex: number, volumeDb: number) => void;
  setTrackMute: (trackIndex: number, muted: boolean) => void;

  // Clip volume/mute actions
  updateClipVolume: (trackIndex: number, clipId: string, volumeDb: number) => void;
  setClipMute: (trackIndex: number, clipId: string, muted: boolean) => void;

  // Clip label (#66)
  updateClipLabel: (trackIndex: number, clipId: string, label: string) => void;

  // Track color (#67)
  updateTrackColor: (trackIndex: number, color: string | undefined) => void;

  // Clip loop (#65)
  setClipLoop: (trackIndex: number, clipId: string, loop: boolean, durationBeats?: number) => void;
  resizeClipLoop: (trackIndex: number, clipId: string, loopDurationBeats: number) => void;

  // Clip effects (#33) — pitch + reverb
  updateClipPitch: (trackIndex: number, clipId: string, pitch: number) => void;
  updateClipReverb: (trackIndex: number, clipId: string, reverb: number) => void;

  // Track actions
  clearTrack: (trackIndex: number) => void;
  clearAllTracks: () => void;

  // Settings
  setLooping: (looping: boolean) => void;

  // Load saved composition
  loadTimeline: (timeline: TimelineState) => void;

  // Get current state as TimelineState
  getTimelineState: () => TimelineState;

  // Selectors
  selectHasClips: () => boolean;
  selectClipCount: () => number;
  selectHasNoClips: () => boolean;
}

export const useTimelineStore = create<TimelineStore>()((set, get) => ({
  tracks: createEmptyTracks(),
  bpm: DEFAULT_BPM,
  totalBeats: DEFAULT_TOTAL_BEATS,
  isLooping: false,
  sections: [],
  audioVersion: 0,

  // --- Section Actions ---

  addSection: (endBeat, color, label, fromStoryboard) => {
    const state = get();

    // Validate limits
    if (state.sections.length >= MAX_SECTIONS) return false;
    if (endBeat <= 0 || endBeat > state.totalBeats) return false;

    // Reject duplicate endBeat
    if (state.sections.some((s) => s.endBeat === endBeat)) return false;

    // Auto-pick next color from palette if not provided
    const nextColor = color ?? SECTION_COLORS[state.sections.length % SECTION_COLORS.length];

    const newSection: Section = {
      id: crypto.randomUUID(),
      endBeat,
      color: nextColor,
      label,
      ...(fromStoryboard ? { fromStoryboard: true } : {}),
    };

    set((prev) => ({
      sections: [...prev.sections, newSection].sort((a, b) => a.endBeat - b.endBeat),
    }));
    return true;
  },

  removeSection: (sectionId) => {
    const section = get().sections.find((s) => s.id === sectionId);
    // Protect storyboard-linked sections from deletion (#41)
    if (section?.fromStoryboard) return;
    set((prev) => ({
      sections: prev.sections.filter((s) => s.id !== sectionId),
    }));
  },

  updateSection: (sectionId, updates) => {
    set((prev) => {
      const updated = prev.sections.map((s) =>
        s.id === sectionId ? { ...s, ...updates } : s,
      );
      // Re-sort when endBeat changes to maintain order
      if (updates.endBeat !== undefined) {
        updated.sort((a, b) => a.endBeat - b.endBeat);
      }
      return { sections: updated };
    });
  },

  clearSections: () => {
    set({ sections: [] });
  },

  // --- Clip Actions ---

  addClip: (trackIndex, clip, samples) => {
    const state = get();
    const allSamples = samples;
    const sample = allSamples.find((s) => s.id === clip.sampleId);

    // Validate track index
    if (trackIndex < 0 || trackIndex >= state.tracks.length) {
      return { trackIndex, startBeat: clip.startBeat, reason: 'rejected', rejectReason: 'invalid_track' };
    }

    // Validate sample exists
    if (!sample) {
      return { trackIndex, startBeat: clip.startBeat, reason: 'rejected', rejectReason: 'invalid_track' };
    }

    const sampleMap = createSampleMap(allSamples);

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
      audioVersion: prev.audioVersion + 1,
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
      audioVersion: prev.audioVersion + 1,
    }));
  },

  moveClip: (fromTrackIndex, toTrackIndex, clipId, newStartBeat, samples) => {
    const state = get();
    const allSamples = samples;

    // Validate track indices
    if (
      fromTrackIndex < 0 ||
      fromTrackIndex >= state.tracks.length ||
      toTrackIndex < 0 ||
      toTrackIndex >= state.tracks.length
    ) {
      return { trackIndex: toTrackIndex, startBeat: newStartBeat, reason: 'rejected', rejectReason: 'invalid_track' };
    }

    // Find the clip being moved
    const existingClip = state.tracks[fromTrackIndex].clips.find(
      (c) => c.id === clipId,
    );
    if (!existingClip) {
      return { trackIndex: toTrackIndex, startBeat: newStartBeat, reason: 'rejected', rejectReason: 'invalid_track' };
    }

    // Get the sample for the clip being moved
    const sample = allSamples.find((s) => s.id === existingClip.sampleId);
    if (!sample) {
      return { trackIndex: toTrackIndex, startBeat: newStartBeat, reason: 'rejected', rejectReason: 'invalid_track' };
    }

    const sampleMap = createSampleMap(allSamples);

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
      audioVersion: prev.audioVersion + 1,
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
      audioVersion: prev.audioVersion + 1,
    }));
  },

  duplicateClip: (trackIndex, clipId, samples) => {
    const state = get();
    const allSamples = samples;

    // Find the original clip
    const track = state.tracks[trackIndex];
    if (!track) {
      return { trackIndex, startBeat: 0, reason: 'rejected', rejectReason: 'invalid_track' };
    }

    const originalClip = track.clips.find((c) => c.id === clipId);
    if (!originalClip) {
      return { trackIndex, startBeat: 0, reason: 'rejected', rejectReason: 'invalid_track' };
    }

    // Get the sample for the clip being duplicated
    const sample = allSamples.find((s) => s.id === originalClip.sampleId);
    if (!sample) {
      return { trackIndex, startBeat: 0, reason: 'rejected', rejectReason: 'invalid_track' };
    }

    const sampleMap = createSampleMap(allSamples);

    // Calculate desired position (directly after original clip — loop-aware)
    const originalEndBeat = getEffectiveClipEndBeat(originalClip, sample, state.bpm);
    const desiredStartBeat = Math.ceil(originalEndBeat);

    // Create new clip with same trim settings, label, effects, and loop
    const newClipId = generateClipId();
    const newClip: Clip = {
      id: newClipId,
      sampleId: originalClip.sampleId,
      startBeat: desiredStartBeat,
      trimStart: originalClip.trimStart,
      trimEnd: originalClip.trimEnd,
      effects: originalClip.effects,
      label: originalClip.label,
      loop: originalClip.loop,
      loopDurationBeats: originalClip.loopDurationBeats,
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
      audioVersion: prev.audioVersion + 1,
    }));

    return { ...result, newClipId };
  },

  updateTrackVolume: (trackIndex, volumeDb) => {
    const clamped = Math.max(VOLUME_MIN_DB, Math.min(VOLUME_MAX_DB, volumeDb));
    set((prev) => ({
      tracks: prev.tracks.map((t, i) =>
        i === trackIndex ? { ...t, volume: clamped } : t,
      ),
      audioVersion: prev.audioVersion + 1,
    }));
  },

  setTrackMute: (trackIndex, muted) => {
    set((prev) => ({
      tracks: prev.tracks.map((t, i) =>
        i === trackIndex ? { ...t, mute: muted } : t,
      ),
      audioVersion: prev.audioVersion + 1,
    }));
  },

  updateClipVolume: (trackIndex, clipId, volumeDb) => {
    const clamped = Math.max(VOLUME_MIN_DB, Math.min(VOLUME_MAX_DB, volumeDb));
    set((prev) => ({
      tracks: prev.tracks.map((track, i) =>
        i === trackIndex
          ? {
              ...track,
              clips: track.clips.map((clip) =>
                clip.id === clipId
                  ? {
                      ...clip,
                      effects: {
                        ...(clip.effects ?? { volume: 0, pitch: 0, reverb: 0, pan: 0 }),
                        volume: clamped,
                      },
                    }
                  : clip,
              ),
            }
          : track,
      ),
      audioVersion: prev.audioVersion + 1,
    }));
  },

  setClipMute: (trackIndex, clipId, muted) => {
    set((prev) => ({
      tracks: prev.tracks.map((track, i) =>
        i === trackIndex
          ? {
              ...track,
              clips: track.clips.map((clip) =>
                clip.id === clipId
                  ? {
                      ...clip,
                      effects: {
                        ...(clip.effects ?? { volume: 0, pitch: 0, reverb: 0, pan: 0 }),
                        mute: muted,
                      },
                    }
                  : clip,
              ),
            }
          : track,
      ),
      audioVersion: prev.audioVersion + 1,
    }));
  },

  updateClipLabel: (trackIndex, clipId, label) => {
    set((prev) => ({
      tracks: prev.tracks.map((track, i) =>
        i === trackIndex
          ? {
              ...track,
              clips: track.clips.map((clip) =>
                clip.id === clipId
                  ? { ...clip, label: label || undefined }
                  : clip,
              ),
            }
          : track,
      ),
    }));
  },

  updateTrackColor: (trackIndex, color) => {
    set((prev) => ({
      tracks: prev.tracks.map((t, i) =>
        i === trackIndex ? { ...t, color } : t,
      ),
    }));
  },

  // --- Clip Loop (#65) ---

  setClipLoop: (trackIndex, clipId, loop, durationBeats) => {
    set((prev) => ({
      tracks: prev.tracks.map((track, i) =>
        i === trackIndex
          ? {
              ...track,
              clips: track.clips.map((clip) =>
                clip.id === clipId
                  ? {
                      ...clip,
                      loop: loop || undefined,
                      loopDurationBeats: loop ? durationBeats : undefined,
                    }
                  : clip,
              ),
            }
          : track,
      ),
      audioVersion: prev.audioVersion + 1,
    }));
  },

  resizeClipLoop: (trackIndex, clipId, loopDurationBeats) => {
    set((prev) => ({
      tracks: prev.tracks.map((track, i) =>
        i === trackIndex
          ? {
              ...track,
              clips: track.clips.map((clip) =>
                clip.id === clipId
                  ? {
                      ...clip,
                      loop: true,
                      loopDurationBeats,
                    }
                  : clip,
              ),
            }
          : track,
      ),
      audioVersion: prev.audioVersion + 1,
    }));
  },

  // --- Clip Effects (#33) — Pitch + Reverb ---

  updateClipPitch: (trackIndex, clipId, pitch) => {
    const clamped = Math.max(-12, Math.min(12, Math.round(pitch)));
    set((prev) => ({
      tracks: prev.tracks.map((track, i) =>
        i === trackIndex
          ? {
              ...track,
              clips: track.clips.map((clip) =>
                clip.id === clipId
                  ? {
                      ...clip,
                      effects: {
                        ...(clip.effects ?? { volume: 0, pitch: 0, reverb: 0, pan: 0 }),
                        pitch: clamped,
                      },
                    }
                  : clip,
              ),
            }
          : track,
      ),
      audioVersion: prev.audioVersion + 1,
    }));
  },

  updateClipReverb: (trackIndex, clipId, reverb) => {
    const clamped = Math.max(0, Math.min(100, reverb));
    set((prev) => ({
      tracks: prev.tracks.map((track, i) =>
        i === trackIndex
          ? {
              ...track,
              clips: track.clips.map((clip) =>
                clip.id === clipId
                  ? {
                      ...clip,
                      effects: {
                        ...(clip.effects ?? { volume: 0, pitch: 0, reverb: 0, pan: 0 }),
                        reverb: clamped,
                      },
                    }
                  : clip,
              ),
            }
          : track,
      ),
      audioVersion: prev.audioVersion + 1,
    }));
  },

  clearTrack: (trackIndex) => {
    set((prev) => ({
      tracks: prev.tracks.map((t, i) =>
        i === trackIndex ? { ...t, clips: [] } : t,
      ),
      audioVersion: prev.audioVersion + 1,
    }));
  },

  clearAllTracks: () => {
    set((prev) => ({
      tracks: createEmptyTracks(),
      audioVersion: prev.audioVersion + 1,
    }));
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
      sections: timeline.sections ?? [],
    });
  },

  getTimelineState: () => {
    const state = get();
    return {
      tracks: state.tracks,
      bpm: state.bpm,
      totalBeats: state.totalBeats,
      isLooping: state.isLooping,
      sections: state.sections.length > 0 ? state.sections : undefined,
    };
  },

  selectHasClips: () => {
    return get().tracks.some((track) => track.clips.length > 0);
  },

  selectClipCount: () => {
    return get().tracks.reduce((sum, track) => sum + track.clips.length, 0);
  },

  selectHasNoClips: () => {
    return get().tracks.every((track) => track.clips.length === 0);
  },
}));
