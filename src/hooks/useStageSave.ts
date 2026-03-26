/**
 * useStageSave - Save/warning logica voor StageView
 *
 * Beheert:
 * - Compositie opslaan (nieuw + bestaand)
 * - Save warning modal state
 * - "Niet meer tonen" checkbox
 * - Save success feedback
 */

import { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useTimelineStore } from '../stores/timelineStore';
import { storageService } from '../services/StorageService';
import { updateSavedComposition } from '../lib/submissions';
import { logger } from '../utils/logger';
import type { CompositionData } from '../types';

export function useStageSave() {
  const currentCompositionId = useAppStore((s) => s.currentCompositionId);
  const activeStoryboard = useAppStore((s) => s.activeStoryboard);
  const librarySamples = useLibraryStore((s) => s.librarySamples);
  const getTimelineState = useTimelineStore((s) => s.getTimelineState);

  const [compositionName, setCompositionName] = useState('');
  const [showSaveWarning, setShowSaveWarning] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dontShowWarningAgain, setDontShowWarningAgain] = useState(() => {
    return localStorage.getItem('soundscout:hideSaveWarning') === 'true';
  });

  // Load composition name when editing an existing composition
  useEffect(() => {
    if (currentCompositionId) {
      const composition = storageService.getCompositionById(currentCompositionId);
      if (composition) {
        setCompositionName(composition.name);
      }
    }
  }, [currentCompositionId]);

  const performSave = useCallback(() => {
    const timelineState = getTimelineState();

    let result: ReturnType<typeof storageService.saveComposition | typeof storageService.updateComposition>;

    if (currentCompositionId) {
      result = storageService.updateComposition(currentCompositionId, {
        name: compositionName.trim(),
        timeline: timelineState,
        samples: librarySamples,
      });
    } else {
      result = storageService.saveComposition(
        compositionName.trim(),
        timelineState,
        librarySamples,
        activeStoryboard?.id,
      );
    }

    // Only show success if save succeeded (result is not null)
    if (result) {
      setShowSaveWarning(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      // Auto-sync to online save if bewaarcode exists (#52-FASE2)
      const saveOnlineInfo = storageService.getSaveOnlineInfo();
      if (saveOnlineInfo) {
        const { sections } = useTimelineStore.getState();
        const compositionData: CompositionData = {
          tracks: timelineState.tracks,
          bpm: timelineState.bpm,
          totalBeats: timelineState.totalBeats,
          isLooping: timelineState.isLooping,
          samples: librarySamples,
          sections: sections.length > 0 ? sections : undefined,
          storyboardId: activeStoryboard?.id,
        };
        // Fire-and-forget: don't block local save on network issues
        updateSavedComposition(
          saveOnlineInfo.saveCode,
          saveOnlineInfo.saveSecret,
          compositionData,
          compositionName.trim(),
        ).then(() => {
          logger.info('Online bewaarcode automatisch bijgewerkt', { code: saveOnlineInfo.saveCode });
        }).catch((err) => {
          logger.warn('Kon online bewaarcode niet bijwerken', err);
        });
      }
    }
    // If save failed (result is null), let the logger handle error reporting
  }, [compositionName, getTimelineState, librarySamples, currentCompositionId, activeStoryboard]);

  const handleSaveClick = useCallback(() => {
    if (!compositionName.trim()) {
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      input?.focus();
      return;
    }

    if (!dontShowWarningAgain) {
      setShowSaveWarning(true);
    } else {
      performSave();
    }
  }, [compositionName, dontShowWarningAgain, performSave]);

  const handleSaveConfirm = useCallback(() => {
    if (dontShowWarningAgain) {
      localStorage.setItem('soundscout:hideSaveWarning', 'true');
    }
    performSave();
  }, [dontShowWarningAgain, performSave]);

  return {
    compositionName,
    setCompositionName,
    showSaveWarning,
    setShowSaveWarning,
    saveSuccess,
    dontShowWarningAgain,
    setDontShowWarningAgain,
    handleSaveClick,
    handleSaveConfirm,
  };
}
