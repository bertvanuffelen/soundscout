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
import { useGameStore } from '../stores/gameStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useTimelineStore } from '../stores/timelineStore';
import { storageService } from '../services/StorageService';

export function useStageSave() {
  const currentCompositionId = useGameStore((s) => s.currentCompositionId);
  const librarySamples = useLibraryStore((s) => s.librarySamples);
  const tracks = useTimelineStore((s) => s.tracks);
  const bpm = useTimelineStore((s) => s.bpm);
  const totalBeats = useTimelineStore((s) => s.totalBeats);
  const isLooping = useTimelineStore((s) => s.isLooping);

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
    const timelineState = {
      tracks,
      bpm,
      totalBeats,
      isPlaying: false,
      isLooping,
      currentBeat: 0,
    };

    if (currentCompositionId) {
      storageService.updateComposition(currentCompositionId, {
        name: compositionName.trim(),
        timeline: timelineState,
        samples: librarySamples,
      });
    } else {
      storageService.saveComposition(compositionName.trim(), timelineState, librarySamples);
    }

    setShowSaveWarning(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  }, [compositionName, tracks, bpm, totalBeats, isLooping, librarySamples, currentCompositionId]);

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
