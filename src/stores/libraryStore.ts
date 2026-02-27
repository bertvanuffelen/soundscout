import { create } from 'zustand';
import type { Sample } from '../types';
import { MAX_RECORDER_SLOTS } from '../constants/config';

interface LibraryStore {
  // Recorder: current session only (max 6 slots)
  recorderSlots: (Sample | null)[];

  // Library: persistent collection across sessions
  librarySamples: Sample[];

  // Recorder actions
  addToRecorder: (sample: Sample) => boolean;
  removeFromRecorder: (sampleId: string) => void;
  clearRecorder: () => void;

  // Transfer: recorder → library (called on "Naar Studio")
  transferRecorderToLibrary: () => void;

  // Full reset (for "Nieuwe compositie")
  clearLibrary: () => void;

  // Load saved composition
  loadLibrary: (samples: Sample[]) => void;

  // Query helpers
  isSampleCollected: (sampleId: string) => boolean;
  isSampleInRecorder: (sampleId: string) => boolean;
  isRecorderFull: () => boolean;
  getRecorderCount: () => number;
  getCollectedSampleIds: () => string[];
}

export const useLibraryStore = create<LibraryStore>()((set, get) => ({
  recorderSlots: Array(MAX_RECORDER_SLOTS).fill(null) as (Sample | null)[],
  librarySamples: [],

  addToRecorder: (sample) => {
    const state = get();

    // Check if recorder is full
    if (state.isRecorderFull()) return false;

    // Check if sample is already in current recorder
    if (state.isSampleInRecorder(sample.id)) return false;

    // Find first empty slot
    const emptyIndex = state.recorderSlots.findIndex((s) => s === null);
    if (emptyIndex === -1) return false;

    set((prev) => {
      const newSlots = [...prev.recorderSlots];
      newSlots[emptyIndex] = sample;
      return { recorderSlots: newSlots };
    });

    return true;
  },

  removeFromRecorder: (sampleId) => {
    set((prev) => ({
      recorderSlots: prev.recorderSlots.map((slot) =>
        slot?.id === sampleId ? null : slot,
      ),
    }));
  },

  clearRecorder: () => {
    set({
      recorderSlots: Array(MAX_RECORDER_SLOTS).fill(null) as (Sample | null)[],
    });
  },

  transferRecorderToLibrary: () => {
    const state = get();

    // Collect non-null samples from recorder that aren't already in library
    const newSamples = state.recorderSlots.filter(
      (slot): slot is Sample =>
        slot !== null && !state.isSampleCollected(slot.id),
    );

    if (newSamples.length === 0) {
      // Still clear recorder even if no new samples
      set({
        recorderSlots: Array(MAX_RECORDER_SLOTS).fill(null) as (Sample | null)[],
      });
      return;
    }

    set((prev) => ({
      librarySamples: [...prev.librarySamples, ...newSamples],
      recorderSlots: Array(MAX_RECORDER_SLOTS).fill(null) as (Sample | null)[],
    }));
  },

  clearLibrary: () => {
    set({
      recorderSlots: Array(MAX_RECORDER_SLOTS).fill(null) as (Sample | null)[],
      librarySamples: [],
    });
  },

  loadLibrary: (samples) => {
    set({
      recorderSlots: Array(MAX_RECORDER_SLOTS).fill(null) as (Sample | null)[],
      librarySamples: samples,
    });
  },

  // Derived from librarySamples — single source of truth
  isSampleCollected: (sampleId) => {
    return get().librarySamples.some((s) => s.id === sampleId);
  },

  isSampleInRecorder: (sampleId) => {
    return get().recorderSlots.some((slot) => slot?.id === sampleId);
  },

  isRecorderFull: () => {
    return get().recorderSlots.every((slot) => slot !== null);
  },

  getRecorderCount: () => {
    return get().recorderSlots.filter((slot) => slot !== null).length;
  },

  getCollectedSampleIds: () => {
    return get().librarySamples.map((s) => s.id);
  },
}));
