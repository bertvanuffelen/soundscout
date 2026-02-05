/**
 * useLocationAudio - Manages audio for location scene
 *
 * Handles:
 * - Loading samples when location changes (with progress tracking)
 * - Automatic retry on failure
 * - Playing/stopping sample previews
 * - Ambient audio playback (optional)
 * - Cleanup on unmount
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { useAudioEngine } from './useAudioEngine';
import type { Sample } from '../types';

interface UseLocationAudioProps {
  samples: Sample[];
  locationId: string | null;
  /** Optional URL for ambient audio (loops in background) */
  ambientUrl?: string;
}

interface UseLocationAudioResult {
  /** True while samples are loading */
  isLoading: boolean;
  /** Loading progress (0-100) */
  loadingProgress: number;
  /** True if some samples failed to load */
  hasError: boolean;
  /** Number of samples that failed to load */
  failedCount: number;
  /** Retry loading failed samples */
  retry: () => void;
  /** Play a sample by ID */
  playSample: (sampleId: string) => void;
  /** Stop a sample by ID */
  stopSample: (sampleId: string) => void;
  /** Stop all samples */
  stopAll: () => void;
}

export function useLocationAudio({
  samples,
  locationId,
  ambientUrl,
}: UseLocationAudioProps): UseLocationAudioResult {
  const {
    loadSamples,
    playSample,
    stopSample,
    stopAll,
    loadAmbient,
    playAmbient,
    stopAmbient,
  } = useAudioEngine();

  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [failedCount, setFailedCount] = useState(0);

  // Track samples to retry
  const failedSamplesRef = useRef<Sample[]>([]);

  // Track AbortController for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Stabilize samples reference - only change when content actually changes
  const prevSampleIdsRef = useRef<string>('');
  const currentSampleIds = samples.map(s => s.id).sort().join(',');
  const samplesChanged = prevSampleIdsRef.current !== currentSampleIds;
  if (samplesChanged) {
    prevSampleIdsRef.current = currentSampleIds;
  }

  // Load audio samples when location changes
  const loadAllSamples = useCallback(
    async (samplesToLoad: Sample[], signal?: AbortSignal) => {
      // CRITICAL: Check abort FIRST before any state updates
      // This prevents infinite render loops when effect cleanup triggers
      if (signal?.aborted) return;

      if (samplesToLoad.length === 0) {
        setIsLoading(false);
        setLoadingProgress(100);
        return;
      }

      setIsLoading(true);
      setHasError(false);
      setFailedCount(0);
      setLoadingProgress(0);
      failedSamplesRef.current = [];

      const results = await loadSamples(samplesToLoad, (loaded, total) => {
        // Don't update state if aborted
        if (signal?.aborted) return;
        setLoadingProgress(Math.round((loaded / total) * 100));
      }, signal);

      // Don't update state if aborted
      if (signal?.aborted) return;

      // Check for failures (exclude aborted results)
      const failed = results.filter((r) => !r.success && r.error !== 'Aborted');
      if (failed.length > 0) {
        // Store failed samples for retry
        failedSamplesRef.current = samplesToLoad.filter((s) =>
          failed.some((f) => f.sampleId === s.id)
        );
        setHasError(true);
        setFailedCount(failed.length);
      }

      setIsLoading(false);
    },
    [loadSamples]
  );

  // Initial load when location changes
  // Uses currentSampleIds for stable dependency (not samples array reference)
  useEffect(() => {
    // Abort previous loading operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this load
    const controller = new AbortController();
    abortControllerRef.current = controller;

    loadAllSamples(samples, controller.signal);

    // Cleanup: abort on unmount or when deps change
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Use stable currentSampleIds instead of samples array
  }, [locationId, currentSampleIds, loadAllSamples]);

  // Handle ambient audio
  useEffect(() => {
    if (!ambientUrl) return;

    // Load and play ambient audio
    loadAmbient(ambientUrl).then((success) => {
      if (success) {
        playAmbient();
      }
    });

    // Cleanup: stop ambient with fade
    return () => {
      stopAmbient();
    };
  }, [ambientUrl, loadAmbient, playAmbient, stopAmbient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  // Retry handler
  const retry = useCallback(() => {
    if (failedSamplesRef.current.length > 0) {
      // Abort any in-progress loading
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      loadAllSamples(failedSamplesRef.current, controller.signal);
    }
  }, [loadAllSamples]);

  const handlePlaySample = useCallback(
    (sampleId: string) => {
      playSample(sampleId);
    },
    [playSample]
  );

  const handleStopSample = useCallback(
    (sampleId: string) => {
      stopSample(sampleId);
    },
    [stopSample]
  );

  return {
    isLoading,
    loadingProgress,
    hasError,
    failedCount,
    retry,
    playSample: handlePlaySample,
    stopSample: handleStopSample,
    stopAll,
  };
}
