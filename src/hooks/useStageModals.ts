/**
 * useStageModals - Modal state management voor StageView
 *
 * Beheert open/dicht state van:
 * - New composition confirmation modal
 * - Share with teacher modal
 * - Share link modal
 */

import { useState, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useAudioEngine } from './useAudioEngine';

export function useStageModals() {
  const currentLocationId = useGameStore((s) => s.currentLocationId);
  const setScreen = useGameStore((s) => s.setScreen);
  const goToLocation = useGameStore((s) => s.goToLocation);
  const clearLibrary = useLibraryStore((s) => s.clearLibrary);
  const clearAllTracks = useTimelineStore((s) => s.clearAllTracks);
  const { stopAll } = useAudioEngine();

  const [showNewModal, setShowNewModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);

  const handleNewComposition = useCallback(() => {
    stopAll();
    clearAllTracks();
    clearLibrary();
    setShowNewModal(false);
    if (currentLocationId) {
      goToLocation(currentLocationId);
    } else {
      setScreen('start');
    }
  }, [stopAll, clearAllTracks, clearLibrary, currentLocationId, goToLocation, setScreen]);

  return {
    showNewModal,
    setShowNewModal,
    showShareModal,
    setShowShareModal,
    showShareLinkModal,
    setShowShareLinkModal,
    handleNewComposition,
  };
}
