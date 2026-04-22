import { create } from 'zustand';
import type { AudioLoadingState } from '../types';

interface AudioStore {
  // Playback state
  isPlaying: boolean;
  currentBeat: number;

  // Loading state
  loadingState: AudioLoadingState;
  loadingProgress: number; // 0-100
  failedSamples: string[];

  // Playback actions
  setIsPlaying: (playing: boolean) => void;
  setCurrentBeat: (beat: number) => void;

  // Loading actions
  setLoadingState: (state: AudioLoadingState) => void;
  setLoadingProgress: (progress: number) => void;
  addFailedSample: (sampleId: string) => void;
  clearFailedSamples: () => void;

  // Legacy actions (for backwards compatibility)
  play: () => void;
  pause: () => void;
  stop: () => void;
}

export const useAudioStore = create<AudioStore>()((set) => ({
  isPlaying: false,
  currentBeat: 0,
  loadingState: 'idle',
  loadingProgress: 0,
  failedSamples: [],

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  setCurrentBeat: (beat) => set({ currentBeat: beat }),

  setLoadingState: (loadingState) => set({ loadingState }),

  setLoadingProgress: (loadingProgress) => set({ loadingProgress }),

  addFailedSample: (sampleId) =>
    set((state) => ({
      failedSamples: [...state.failedSamples, sampleId],
    })),

  clearFailedSamples: () => set({ failedSamples: [] }),

  // Legacy actions
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  stop: () => set({ isPlaying: false, currentBeat: 0 }),
}));
