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
  const goToStartWith = useAppStore((s) => s.goToStartWith);
  const resetCompositionContext = useAppStore((s) => s.resetCompositionContext);
  const clearLibrary = useLibraryStore((s) => s.clearLibrary);
  const resetTimeline = useTimelineStore((s) => s.resetTimeline);
  const { stopAll } = useAudioEngine();

  const [showNewModal, setShowNewModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);
  const [showSaveOnlineModal, setShowSaveOnlineModal] = useState(false);

  const handleNewComposition = useCallback(() => {
    stopAll();
    // Volledige reset (B24): ook secties/sequences/lengte
    resetTimeline();
    clearLibrary();
    // Bewuste nieuwe start: wis ook storyboard/praatplaat/template/klas-
    // sessie (goToStart doet dat sinds testronde 3 niet meer)
    resetCompositionContext();
    setShowNewModal(false);
    // Terug naar start mét de nieuwe-soundscape-wizard direct open
    goToStartWith('new');
  }, [stopAll, resetTimeline, clearLibrary, resetCompositionContext, goToStartWith]);

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
