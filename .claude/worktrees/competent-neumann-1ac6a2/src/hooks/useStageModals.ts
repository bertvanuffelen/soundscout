/**
 * useStageModals - Modal state management voor StageView
 *
 * Beheert open/dicht state van:
 * - New composition confirmation modal
 * - Share with teacher modal
 * - Share link modal
 */

import { useState, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useAudioEngine } from './useAudioEngine';

export function useStageModals() {
  const goToStart = useAppStore((s) => s.goToStart);
  const clearLibrary = useLibraryStore((s) => s.clearLibrary);
  const clearAllTracks = useTimelineStore((s) => s.clearAllTracks);
  const { stopAll } = useAudioEngine();

  const [showNewModal, setShowNewModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);
  const [showSaveOnlineModal, setShowSaveOnlineModal] = useState(false);

  const handleNewComposition = useCallback(() => {
    stopAll();
    clearAllTracks();
    clearLibrary();
    setShowNewModal(false);
    // Always go to start screen so the user can choose a theme
    goToStart();
  }, [stopAll, clearAllTracks, clearLibrary, goToStart]);

  return {
    showNewModal,
    setShowNewModal,
    showShareModal,
    setShowShareModal,
    showShareLinkModal,
    setShowShareLinkModal,
    showSaveOnlineModal,
    setShowSaveOnlineModal,
    handleNewComposition,
  };
}
