/**
 * useAudioCleanup - Hook for cleaning up audio on component unmount
 *
 * Stops all audio playback when the component unmounts.
 * Use this in components that play audio (StudioView, LocationScene, StageView).
 */

import { useEffect } from 'react';
import { audioService } from '../services/AudioService';

export function useAudioCleanup() {
  useEffect(() => {
    return () => {
      audioService.stopAllSamples();
    };
  }, []);
}
