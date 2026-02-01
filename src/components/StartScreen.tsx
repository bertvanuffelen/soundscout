/**
 * StartScreen - Welcome screen with game start and tutorial
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { storageService } from '../services/StorageService';
import { Button, Modal } from './ui';
import { logger } from '../utils/logger';

export function StartScreen() {
  const { t } = useTranslation();
  const goToMap = useGameStore((s) => s.goToMap);
  const goToCompositions = useGameStore((s) => s.goToCompositions);
  const clearAllTracks = useTimelineStore((s) => s.clearAllTracks);
  const clearLibrary = useLibraryStore((s) => s.clearLibrary);
  const { initAudio } = useAudioEngine();

  const [isLoading, setIsLoading] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasCompositions, setHasCompositions] = useState(false);

  // Check if there are saved compositions
  useEffect(() => {
    const compositions = storageService.getCompositions();
    setHasCompositions(compositions.length > 0);
  }, []);

  const handleNewComposition = async () => {
    setIsLoading(true);
    // Always start fresh with empty timeline and library
    clearAllTracks();
    clearLibrary();
    try {
      await initAudio();
      goToMap();
    } catch {
      logger.warn('Audio initialization failed, continuing anyway.');
      goToMap();
    }
  };

  const tutorialSteps = t('start.tutorialSteps', {
    returnObjects: true,
  }) as string[];

  return (
    <div className="min-h-screen bg-screen-start flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Title */}
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-sky-700 tracking-tight mb-3 sm:mb-4">
          {t('app.title')}
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl text-sky-600 font-medium">
          {t('start.tagline')}
        </p>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-3 sm:gap-4 w-full max-w-[280px] sm:max-w-xs">
        <Button
          onClick={handleNewComposition}
          isLoading={isLoading}
          size="lg"
          className="w-full"
        >
          {isLoading ? t('start.loading') : t('start.newComposition')}
        </Button>

        {hasCompositions && (
          <Button
            onClick={goToCompositions}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            <FolderOpen className="w-5 h-5 mr-1.5 sm:mr-2" />
            {t('start.myCompositions')}
          </Button>
        )}

        <Button
          onClick={() => setShowTutorial(true)}
          variant="ghost"
          size="lg"
          className="w-full"
        >
          {t('start.howItWorks')}
        </Button>
      </div>

      {/* Tutorial modal */}
      <Modal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        title={t('start.tutorialTitle')}
      >
        <ol className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
          {tutorialSteps.map((step, i) => (
            <li key={i} className="flex gap-2 sm:gap-3 items-start">
              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-amber-400 text-amber-900 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm">
                {i + 1}
              </span>
              <span className="text-gray-700 text-base sm:text-lg leading-snug pt-0.5">
                {step}
              </span>
            </li>
          ))}
        </ol>

        <Button
          onClick={() => setShowTutorial(false)}
          variant="secondary"
          className="w-full bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white"
        >
          {t('start.closeTutorial')}
        </Button>
      </Modal>
    </div>
  );
}
