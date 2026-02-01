/**
 * CompositionsView - Screen showing all saved compositions
 *
 * Features:
 * - List of saved compositions (newest first)
 * - Open composition in Studio
 * - Play composition in Club
 * - Delete composition
 */

import { useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Music, AlertTriangle } from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { storageService } from '../../services/StorageService';
import type { SavedComposition } from '../../types';
import { Button } from '../ui';
import { CompositionCard } from './CompositionCard';

export function CompositionsView() {
  const { t } = useTranslation();
  const goToStart = useGameStore((s) => s.goToStart);
  const goToStudio = useGameStore((s) => s.goToStudio);
  const goToClub = useGameStore((s) => s.goToClub);
  const goToMap = useGameStore((s) => s.goToMap);
  const setCurrentCompositionId = useGameStore((s) => s.setCurrentCompositionId);

  const loadTimeline = useTimelineStore((s) => s.loadTimeline);
  const loadLibrary = useLibraryStore((s) => s.loadLibrary);

  const [compositions, setCompositions] = useState<SavedComposition[]>([]);

  // Load compositions on mount
  useEffect(() => {
    const saved = storageService.getCompositions();
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

  const handleOpenComposition = useCallback(
    (composition: SavedComposition) => {
      // Track which composition we're editing
      setCurrentCompositionId(composition.id);
      // Load timeline and library into stores
      loadTimeline(composition.timeline);
      loadLibrary(composition.samples);
      // Navigate to Studio
      goToStudio();
    },
    [setCurrentCompositionId, loadTimeline, loadLibrary, goToStudio]
  );

  const handlePlayComposition = useCallback(
    (composition: SavedComposition) => {
      // Track which composition we're editing
      setCurrentCompositionId(composition.id);
      // Load timeline and library into stores
      loadTimeline(composition.timeline);
      loadLibrary(composition.samples);
      // Navigate to Club
      goToClub();
    },
    [setCurrentCompositionId, loadTimeline, loadLibrary, goToClub]
  );

  const handleDeleteComposition = useCallback((id: string) => {
    storageService.deleteComposition(id);
    setCompositions((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleNewComposition = useCallback(() => {
    goToMap();
  }, [goToMap]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700 px-2 sm:px-4 py-2 sm:py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-slate-400 hover:text-white active:text-white"
          >
            <ArrowLeft className="w-4 h-4 sm:w-[18px] sm:h-[18px] mr-0.5 sm:mr-1" />
            {t('compositions.back')}
          </Button>
          <h1 className="text-base sm:text-lg font-bold text-accent-300">
            {t('compositions.title')}
          </h1>
          <div className="w-16 sm:w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {compositions.length === 0 ? (
          /* Empty state */
          <div className="text-center py-12 sm:py-16">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Music className="w-7 h-7 sm:w-8 sm:h-8 text-slate-500" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-300 mb-2">
              {t('compositions.emptyTitle')}
            </h2>
            <p className="text-sm sm:text-base text-slate-500 mb-5 sm:mb-6">
              {t('compositions.emptyDescription')}
            </p>
            <Button variant="primary" onClick={handleNewComposition}>
              {t('compositions.startNew')}
            </Button>
          </div>
        ) : (
          /* Compositions list */
          <div className="space-y-2 sm:space-y-3">
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
            <div className="pt-3 sm:pt-4">
              <Button
                variant="secondary"
                onClick={handleNewComposition}
                className="w-full"
              >
                {t('compositions.startNew')}
              </Button>
            </div>
          </div>
        )}

        {/* Warning notice */}
        <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2 sm:gap-3">
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-amber-200/80">
            {t('compositions.storageWarning')}
          </p>
        </div>
      </main>
    </div>
  );
}
