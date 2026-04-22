/**
 * useStageSave - Save/warning logica voor StageView
 *
 * Beheert:
 * - Compositie opslaan (nieuw + bestaand)
 * - Save warning modal state
 * - "Niet meer tonen" checkbox
 * - Save success feedback
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useTimelineStore } from '../stores/timelineStore';
import { storageService } from '../services/StorageService';
import { updateSavedComposition, submitOrUpdateComposition } from '../lib/submissions';
import { submitPraatplaatComposition } from '../lib/praatplaat';
import { logger } from '../utils/logger';
import i18n from '../i18n';
import type { CompositionData } from '../types';

export function useStageSave() {
  const currentCompositionId = useAppStore((s) => s.currentCompositionId);
  const activeStoryboard = useAppStore((s) => s.activeStoryboard);
  const activePraatplaat = useAppStore((s) => s.activePraatplaat);
  const praatplaatPosition = useAppStore((s) => s.praatplaatPosition);
  const classSession = useAppStore((s) => s.classSession);
  const librarySamples = useLibraryStore((s) => s.librarySamples);
  const getTimelineState = useTimelineStore((s) => s.getTimelineState);

  const [compositionName, setCompositionName] = useState('');
  const [showSaveWarning, setShowSaveWarning] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [praatplaatSubmitted, setPraatplaatSubmitted] = useState(false);
  const [dontShowWarningAgain, setDontShowWarningAgain] = useState(() => {
    return localStorage.getItem('soundscout:hideSaveWarning') === 'true';
  });

  // Save error feedback (TP5-11: QuotaExceeded + generic failures)
  const [saveError, setSaveError] = useState<string | null>(null);

  // Klascode auto-submit feedback state
  const [submitFeedback, setSubmitFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Bewaarcode sync feedback state (TP5-12)
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Client-generated UUID for idempotent UPSERT (stable across retries)
  const clientIdRef = useRef<string | null>(null);

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

    // Read classSession context for persistence
    const currentClassSession = useAppStore.getState().classSession;
    const currentSubmissionId = useAppStore.getState().submissionId;

    if (currentCompositionId) {
      result = storageService.updateComposition(currentCompositionId, {
        name: compositionName.trim(),
        timeline: timelineState,
        samples: librarySamples,
        classSession: currentClassSession ?? undefined,
        submissionId: currentSubmissionId ?? undefined,
        // Persist praatplaat-context on update too — fixes heropen-bug voor
        // composities die al bestonden vóór deze fix (#72).
        storyboardId: activeStoryboard?.id,
        praatplaat: activePraatplaat ?? undefined,
        praatplaatPosition: praatplaatPosition ?? undefined,
      });
    } else {
      result = storageService.saveComposition(
        compositionName.trim(),
        timelineState,
        librarySamples,
        activeStoryboard?.id,
        currentClassSession ?? undefined,
        currentSubmissionId ?? undefined,
        activePraatplaat ?? undefined,
        praatplaatPosition ?? undefined,
      );
    }

    // Handle save failure (TP5-11)
    if (!result) {
      const errorType = storageService.lastSaveError;
      if (errorType === 'quota_exceeded') {
        setSaveError(i18n.t('stage.saveQuotaError'));
      } else {
        setSaveError(i18n.t('stage.saveGenericError'));
      }
      setTimeout(() => setSaveError(null), 6000);
      return;
    }

    // Success path
    if (result) {
      setSaveError(null);
      setShowSaveWarning(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      // Build compositionData once (shared by all remote sync paths)
      const { sections } = useTimelineStore.getState();
      const compositionData: CompositionData = {
        tracks: timelineState.tracks,
        bpm: timelineState.bpm,
        totalBeats: timelineState.totalBeats,
        isLooping: timelineState.isLooping,
        samples: librarySamples,
        sections: sections.length > 0 ? sections : undefined,
        storyboardId: activeStoryboard?.id,
        // Snapshot van praatplaat-context (#72) zodat online-bewaarcode en
        // templates de afbeelding + positie bij heropening kunnen herstellen.
        praatplaat: activePraatplaat ?? undefined,
        praatplaatPosition: praatplaatPosition ?? undefined,
      };

      // --- Universele klascode auto-submit ---
      if (classSession) {
        const { isSubmitting } = useAppStore.getState();
        if (!isSubmitting) {
          useAppStore.getState().setIsSubmitting(true);

          // Generate a stable client UUID for idempotent UPSERT
          const { submissionId } = useAppStore.getState();
          if (!clientIdRef.current) {
            clientIdRef.current = submissionId || crypto.randomUUID();
          }

          submitOrUpdateComposition({
            classCode: classSession.classCode,
            compositionName: compositionName.trim(),
            compositionData,
            clientId: clientIdRef.current,
            assignmentId: classSession.assignmentId,
            assignmentType: classSession.assignmentType,
            praatplaatPositionX: classSession.assignmentType === 'praatplaat' ? praatplaatPosition?.x : undefined,
            praatplaatPositionY: classSession.assignmentType === 'praatplaat' ? praatplaatPosition?.y : undefined,
          }).then((returnedId) => {
            useAppStore.getState().setSubmissionId(returnedId);
            useAppStore.getState().setSubmissionSynced(true);
            // Update clientIdRef to the server-confirmed ID for subsequent updates
            clientIdRef.current = returnedId;
            // Mark praatplaat as submitted so StageView shows success modal (#72 bugfix)
            if (classSession.assignmentType === 'praatplaat') {
              setPraatplaatSubmitted(true);
            }
            setSubmitFeedback({
              type: 'success',
              message: submissionId
                ? i18n.t('submissions.autoSubmitUpdated', { className: classSession.className })
                : i18n.t('submissions.autoSubmitSuccess', { className: classSession.className }),
            });
            setTimeout(() => setSubmitFeedback(null), 3000);
            logger.info('Klascode auto-submit geslaagd', { classCode: classSession.classCode, submissionId: returnedId });
          }).catch((err) => {
            useAppStore.getState().setSubmissionSynced(false);
            setSubmitFeedback({
              type: 'error',
              message: i18n.t('submissions.autoSubmitFailed'),
            });
            logger.warn('Klascode auto-submit mislukt', err);
          }).finally(() => {
            useAppStore.getState().setIsSubmitting(false);
          });
        }
      } else {
        // Auto-sync to online save if bewaarcode exists (#52-FASE2)
        // Only when NOT in klascode-flow (exclusive modes)
        const saveOnlineInfo = storageService.getSaveOnlineInfo();
        if (saveOnlineInfo) {
          // Non-blocking sync with user feedback (TP5-12)
          updateSavedComposition(
            saveOnlineInfo.saveCode,
            saveOnlineInfo.saveSecret,
            compositionData,
            compositionName.trim(),
          ).then(() => {
            logger.info('Online bewaarcode automatisch bijgewerkt', { code: saveOnlineInfo.saveCode });
            setSyncFeedback({
              type: 'success',
              message: i18n.t('stage.syncSuccess'),
            });
            setTimeout(() => setSyncFeedback(null), 3000);
          }).catch((err) => {
            logger.warn('Kon online bewaarcode niet bijwerken', err);
            setSyncFeedback({
              type: 'error',
              message: i18n.t('stage.syncFailed'),
            });
            // Keep error visible longer so user notices
            setTimeout(() => setSyncFeedback(null), 6000);
          });
        }

        // Auto-submit to praatplaat if active (#72) — legacy path (zonder classSession)
        if (activePraatplaat && praatplaatPosition && !praatplaatSubmitted) {
          // Fire-and-forget: auto-submit praatplaat composition
          submitPraatplaatComposition({
            classCode: activePraatplaat.classCode,
            praatplaatId: activePraatplaat.id,
            positionX: praatplaatPosition.x,
            positionY: praatplaatPosition.y,
            compositionName: compositionName.trim(),
            compositionData,
          }).then(() => {
            logger.info('Praatplaat compositie automatisch ingestuurd', { praatplaatId: activePraatplaat.id });
            setPraatplaatSubmitted(true);
          }).catch((err) => {
            logger.warn('Kon praatplaat compositie niet insturen', err);
          });
        }
      }
    }
    // If save failed (result is null), let the logger handle error reporting
  }, [compositionName, getTimelineState, librarySamples, currentCompositionId, activeStoryboard, activePraatplaat, praatplaatPosition, praatplaatSubmitted, classSession]);

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
    praatplaatSubmitted,
    saveError,
    submitFeedback,
    setSubmitFeedback,
    syncFeedback,
  };
}
