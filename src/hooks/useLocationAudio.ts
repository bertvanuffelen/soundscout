/**
 * useLocationAudio - Manages audio for location scene
 *
 * Handles:
 * - Loading samples when location changes
 * - Playing/stopping sample previews
 * - Cleanup on unmount
 */

import { useCallback, useEffect, useState } from 'react';
import { useAudioEngine } from './useAudioEngine';
import type { Sample } from '../types';

interface UseLocationAudioProps {
  samples: Sample[];
  locationId: string | null;
}

interface UseLocationAudioResult {
  isLoading: boolean;
  playSample: (sampleId: string) => void;
  stopSample: (sampleId: string) => void;
  stopAll: () => void;
}

export function useLocationAudio({
  samples,
  locationId,
}: UseLocationAudioProps): UseLocationAudioResult {
  const { loadSamples, playSample, stopSample, stopAll } = useAudioEngine();
  const [isLoading, setIsLoading] = useState(true);

  // Load audio samples when location changes
  useEffect(() => {
    if (samples.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    loadSamples(samples).then(() => {
      setIsLoading(false);
    });
  }, [locationId, samples, loadSamples]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

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
    playSample: handlePlaySample,
    stopSample: handleStopSample,
    stopAll,
  };
}
