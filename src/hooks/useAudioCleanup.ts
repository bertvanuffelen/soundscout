/**
 * useAudioCleanup - Hook for cleaning up audio on component unmount
 *
 * Stops all audio playback when the component unmounts.
 * Use this in components that play audio (StudioView, LocationScene, StageView).
 */

import { useEffect } from 'react';
import { audioService } from '../services/AudioService';
import { useAudioStore } from '../stores/audioStore';

export function useAudioCleanup() {
  useEffect(() => {
    return () => {
      audioService.stopAllSamples();
      // Ook de tijdlijn stoppen (E7, eindtest): anders speelt het podium
      // door op het startscherm (Tone-valkuil 2: transport loopt los door)
      if (useAudioStore.getState().isPlaying) {
        audioService.stop();
        useAudioStore.getState().stop();
      }
    };
  }, []);
}
