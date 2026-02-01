/**
 * useAudioEngine - React hook wrapper around AudioService
 *
 * This hook provides a React-friendly interface to the AudioService singleton.
 * It handles:
 * - Syncing beat updates to the audio store
 * - Syncing play/pause/stop state to the audio store
 * - Cleanup on unmount
 */

import { useCallback, useEffect, useState } from 'react';
import { audioService } from '../services/AudioService';
import { useAudioStore } from '../stores/audioStore';
import type { Sample, Track } from '../types';

export function useAudioEngine() {
  const [isAudioReady, setIsAudioReady] = useState(audioService.isReady());

  const setCurrentBeat = useAudioStore((s) => s.setCurrentBeat);
  const setIsPlaying = useAudioStore((s) => s.setIsPlaying);

  // Subscribe to beat updates from AudioService
  useEffect(() => {
    const unsubscribe = audioService.onBeatUpdate((beat) => {
      setCurrentBeat(beat);
    });
    return unsubscribe;
  }, [setCurrentBeat]);

  // --- Initialization ---

  const initAudio = useCallback(async () => {
    await audioService.initialize();
    setIsAudioReady(true);
  }, []);

  // --- Sample Loading ---

  const loadSample = useCallback(async (sample: Sample) => {
    return audioService.loadSample(sample);
  }, []);

  const loadSamples = useCallback(async (samples: Sample[]) => {
    return audioService.loadSamples(samples);
  }, []);

  const isSampleLoaded = useCallback((sampleId: string): boolean => {
    return audioService.isSampleLoaded(sampleId);
  }, []);

  // --- Sample Playback (Preview) ---

  const playSample = useCallback((sampleId: string) => {
    audioService.playSample(sampleId);
  }, []);

  const stopSample = useCallback((sampleId: string) => {
    audioService.stopSample(sampleId);
  }, []);

  const stopAll = useCallback(() => {
    audioService.stopAllSamples();
  }, []);

  // --- Timeline Playback ---

  const scheduleTimeline = useCallback((tracks: Track[], samples: Sample[]) => {
    audioService.scheduleTimeline(tracks, samples);
  }, []);

  const playTimeline = useCallback(() => {
    audioService.play();
    setIsPlaying(true);
  }, [setIsPlaying]);

  const pauseTimeline = useCallback(() => {
    audioService.pause();
    setIsPlaying(false);
  }, [setIsPlaying]);

  const stopTimeline = useCallback(() => {
    audioService.stop();
    setIsPlaying(false);
  }, [setIsPlaying]);

  const setTransportLoop = useCallback((loop: boolean, totalBeats: number) => {
    audioService.setLoop(loop, totalBeats);
  }, []);

  const getCurrentBeat = useCallback((): number => {
    return audioService.getCurrentBeat();
  }, []);

  return {
    // Audio context
    initAudio,
    isAudioReady,

    // Sample loading
    loadSample,
    loadSamples,
    isSampleLoaded,

    // Sample playback (preview)
    playSample,
    stopSample,
    stopAll,

    // Timeline playback
    scheduleTimeline,
    playTimeline,
    pauseTimeline,
    stopTimeline,
    setTransportLoop,
    getCurrentBeat,
  };
}
