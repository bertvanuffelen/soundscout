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
import { useTimelineStore } from '../stores/timelineStore';
import { logger } from '../utils/logger';
import type { Sample, Track } from '../types';

export function useAudioEngine() {
  const [isAudioReady, setIsAudioReady] = useState(audioService.isReady());
  const [audioError, setAudioError] = useState<string | null>(null);

  const setCurrentBeat = useAudioStore((s) => s.setCurrentBeat);
  const setIsPlaying = useAudioStore((s) => s.setIsPlaying);

  // Subscribe to beat updates from AudioService
  useEffect(() => {
    const unsubscribe = audioService.onBeatUpdate((beat) => {
      setCurrentBeat(beat);
    });
    return unsubscribe;
  }, [setCurrentBeat]);

  // Subscribe to playback end events (auto-stop when all clips finished)
  useEffect(() => {
    const unsubscribe = audioService.onPlaybackEnd(() => {
      setIsPlaying(false);
    });
    return unsubscribe;
  }, [setIsPlaying]);

  // --- Initialization ---

  const initAudio = useCallback(async () => {
    try {
      setAudioError(null);
      await audioService.initialize();
      setIsAudioReady(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize audio';
      setAudioError(msg);
      logger.error('Audio initialization failed', { error: msg });
      throw err;
    }
  }, []);

  // --- Sample Loading ---

  const loadSample = useCallback(async (sample: Sample) => {
    return audioService.loadSample(sample);
  }, []);

  const loadSamples = useCallback(
    async (
      samples: Sample[],
      onProgress?: (loaded: number, total: number) => void,
      signal?: AbortSignal
    ) => {
      return audioService.loadSamples(samples, onProgress, signal);
    },
    []
  );

  const isSampleLoaded = useCallback((sampleId: string): boolean => {
    return audioService.isSampleLoaded(sampleId);
  }, []);

  // --- Sample Playback (Preview) ---

  const playSample = useCallback((sampleId: string) => {
    try {
      audioService.playSample(sampleId);
    } catch (err) {
      logger.warn('Failed to play sample', { sampleId, error: err });
    }
  }, []);

  const stopSample = useCallback((sampleId: string) => {
    audioService.stopSample(sampleId);
  }, []);

  const stopAll = useCallback(() => {
    audioService.stopAllSamples();
  }, []);

  // --- Timeline Playback ---

  const scheduleTimeline = useCallback((tracks: Track[], samples: Sample[]) => {
    // Sequences horen bij de compositie (fase 2) — imperatief meelezen
    const sequences = useTimelineStore.getState().sequences;
    audioService.scheduleTimeline(tracks, samples, sequences);
  }, []);

  const playTimeline = useCallback((fromBeat: number = 0) => {
    audioService.play(fromBeat);
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

  const setTransportLoop = useCallback((
    loop: boolean,
    totalBeats: number,
    region: { startBeat: number; endBeat: number } | null = null,
  ) => {
    audioService.setLoop(loop, totalBeats, region);
  }, []);

  const getCurrentBeat = useCallback((): number => {
    return audioService.getCurrentBeat();
  }, []);

  const seekTo = useCallback((beat: number) => {
    audioService.seek(beat);
  }, []);

  const rescheduleWhilePlaying = useCallback(
    (tracks: Track[], samples: Sample[], looping: boolean, totalBeats: number) => {
      // Verse sequences meelezen zodat live patroon-edits hoorbaar worden
      const sequences = useTimelineStore.getState().sequences;
      audioService.rescheduleWhilePlaying(tracks, samples, looping, totalBeats, sequences);
    }, []
  );

  // --- Ambient Audio ---

  const loadAmbient = useCallback(async (url: string) => {
    return audioService.loadAmbient(url);
  }, []);

  const playAmbient = useCallback(() => {
    audioService.playAmbient();
  }, []);

  const stopAmbient = useCallback((fade = true) => {
    audioService.stopAmbient(fade);
  }, []);

  const setAmbientVolume = useCallback((db: number) => {
    audioService.setAmbientVolume(db);
  }, []);

  return {
    // Audio context
    initAudio,
    isAudioReady,
    audioError,

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
    seekTo,
    rescheduleWhilePlaying,
    hasActiveSchedule: useCallback((currentVersion?: number) => audioService.hasActiveSchedule(currentVersion), []),
    setScheduledVersion: useCallback((version: number) => audioService.setScheduledVersion(version), []),

    // Ambient audio
    loadAmbient,
    playAmbient,
    stopAmbient,
    setAmbientVolume,
  };
}
