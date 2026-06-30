/**
 * CompositionsView - Screen showing all saved compositions
 *
 * Features:
 * - List of saved compositions (newest first)
 * - Open composition in Studio
 * - Play composition on Stage
 * - Delete composition
 */

import { useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Music, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { storageService } from '../../services/StorageService';
import { hydrateCompositionContext } from '../../utils/compositionInit';
import type { SavedComposition } from '../../types';
import { Button } from '../ui';
import { CompositionCard } from './CompositionCard';

export function CompositionsView() {
  const { t } = useTranslation();
  const goToStart = useAppStore((s) => s.goToStart);
  const goToStudio = useAppStore((s) => s.goToStudio);
  const goToStage = useAppStore((s) => s.goToStage);
  const goToMap = useAppStore((s) => s.goToMap);
  const setCurrentCompositionId = useAppStore((s) => s.setCurrentCompositionId);
  const setClassSession = useAppStore((s) => s.setClassSession);
  const setSubmissionId = useAppStore((s) => s.setSubmissionId);
  const clearClassSession = useAppStore((s) => s.clearClassSession);

  const loadTimeline = useTimelineStore((s) => s.loadTimeline);
  const loadLibrary = useLibraryStore((s) => s.loadLibrary);

  const [compositions, setCompositions] = useState<SavedComposition[]>([]);
  const [droppedCount, setDroppedCount] = useState(0);

  // Load compositions on mount
  useEffect(() => {
    const saved = storageService.getCompositions();
    // Aantal corrupte/weggefilterde entries zichtbaar maken (mirror lastSaveError)
    setDroppedCount(storageService.lastLoadDroppedCount);
    // Sort by updatedAt descending (newest first)
    saved.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    setCompositions(saved);
  }, []);

  const handleBack = useCallback(() => {
    goToStart();
  }, [goToStart]);

  // Restore classSession context from a saved composition
  const restoreClassSession = useCallback(
    (composition: SavedComposition) => {
      if (composition.classSession) {
        setClassSession(composition.classSession);
        if (composition.submissionId) {
          setSubmissionId(composition.submissionId);
        }
      } else {
        clearClassSession();
      }
    },
    [setClassSession, setSubmissionId, clearClassSession]
  );

  const handleOpenComposition = useCallback(
    (composition: SavedComposition) => {
      // Track which composition we're editing
      setCurrentCompositionId(composition.id);
      // Restore klascode context if present
      restoreClassSession(composition);
      // Load timeline and library into stores
      loadTimeline(composition.timeline);
      loadLibrary(composition.samples);
      // Restore storyboard / praatplaat / compose-mode context (#41, #72)
      hydrateCompositionContext({
        storyboardId: composition.storyboardId,
        praatplaat: composition.praatplaat,
        praatplaatPosition: composition.praatplaatPosition,
      });
      // Navigate to Studio
      goToStudio();
    },
    [setCurrentCompositionId, restoreClassSession, loadTimeline, loadLibrary, goToStudio]
  );

  const handlePlayComposition = useCallback(
    (composition: SavedComposition) => {
      // Track which composition we're editing
      setCurrentCompositionId(composition.id);
      // Restore klascode context if present
      restoreClassSession(composition);
      // Load timeline and library into stores
      loadTimeline(composition.timeline);
      loadLibrary(composition.samples);
      // Restore storyboard / praatplaat / compose-mode context (#41, #72)
      hydrateCompositionContext({
        storyboardId: composition.storyboardId,
        praatplaat: composition.praatplaat,
        praatplaatPosition: composition.praatplaatPosition,
      });
      // Navigate to Stage
      goToStage();
    },
    [setCurrentCompositionId, restoreClassSession, loadTimeline, loadLibrary, goToStage]
  );

  const handleDeleteComposition = useCallback((id: string) => {
    const deleted = storageService.deleteComposition(id);
    // Only update UI if deletion succeeded
    if (deleted) {
      setCompositions((prev) => prev.filter((c) => c.id !== id));
    }
    // If deletion failed, logger will have recorded the error
  }, []);

  const handleNewComposition = useCallback(() => {
    goToMap();
  }, [goToMap]);

  return (
    <div className="min-h-screen bg-bg-app">
      {/* Header - branding donkerblauw */}
      <header className="bg-brand-900 px-3 sm:px-4 py-3 sm:py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleBack}
            className="bg-brand-700 text-white border-brand-600 hover:bg-brand-600"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">{t('compositions.back')}</span>
            <span className="sm:hidden">{t('common.back')}</span>
          </Button>
          <h1 className="text-lg sm:text-xl font-bold text-white">
            {t('compositions.title')}
          </h1>
          <div className="w-16 sm:w-24" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Corrupte/onleesbare composities zichtbaar maken (buiten de empty/list-
            conditional zodat hij ook bij volledig corrupte opslag verschijnt) */}
        {droppedCount > 0 && (
          <div
            className="mb-4 p-4 bg-warning-50 border border-warning-500 rounded-xl flex items-start gap-3"
            role="alert"
          >
            <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-warning-600">
              {t('compositions.corruptLoadWarning', { count: droppedCount })}
            </p>
          </div>
        )}
        {compositions.length === 0 ? (
          /* Empty state */
          <div className="bg-bg-surface rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4">
              <Music className="w-8 h-8 text-brand-600" />
            </div>
            <h2 className="text-xl font-semibold text-text-main mb-2">
              {t('compositions.emptyTitle')}
            </h2>
            <p className="text-text-muted mb-6">
              {t('compositions.emptyDescription')}
            </p>
            <Button variant="primary" onClick={handleNewComposition}>
              {t('compositions.startNew')}
            </Button>
          </div>
        ) : (
          /* Compositions list */
          <div className="space-y-3">
            {compositions.map((composition) => (
              <CompositionCard
                key={composition.id}
                composition={composition}
                onOpen={handleOpenComposition}
                onPlay={handlePlayComposition}
                onDelete={handleDeleteComposition}
              />
            ))}

            {/* New composition button */}
            <div className="pt-4">
              <Button
                variant="primary"
                onClick={handleNewComposition}
                className="w-full"
              >
                {t('compositions.startNew')}
              </Button>
            </div>
          </div>
        )}

        {/* Warning notice */}
        <div className="mt-8 p-4 bg-primary-50 border border-primary-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-primary-700">
            {t('compositions.storageWarning')}
          </p>
        </div>
      </main>
    </div>
  );
}

export default CompositionsView;
