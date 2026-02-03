/**
 * StartScreen - Welcome screen with game start and tutorial
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Info, Instagram, Facebook, Linkedin, Youtube } from 'lucide-react';
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
  const goToTeacher = useGameStore((s) => s.goToTeacher);
  const clearAllTracks = useTimelineStore((s) => s.clearAllTracks);
  const clearLibrary = useLibraryStore((s) => s.clearLibrary);
  const { initAudio } = useAudioEngine();

  const [isLoading, setIsLoading] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
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
    <div className="min-h-screen bg-brand-900 md:bg-bg-app flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Card container - white card on desktop, transparent on mobile */}
      <div className="w-full max-w-md md:bg-bg-surface md:rounded-2xl md:shadow-xl md:p-8 lg:p-12 flex flex-col items-center">
        {/* Logo + Title */}
        <div className="text-center mb-6 sm:mb-8">
          {/* White logo for mobile (dark background) */}
          <img
            src="/images/overige/logo-soundscout-white.svg"
            alt="SoundScout Logo"
            className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 md:hidden"
          />
          {/* Dark logo for desktop (light background) */}
          <img
            src="/images/overige/logo-soundscout.svg"
            alt="SoundScout Logo"
            className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 hidden md:block"
          />
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white md:text-text-main tracking-tight mb-2 sm:mb-3">
            {t('app.title')}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-brand-300 md:text-text-muted font-semibold">
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
            className="w-full text-brand-300 hover:text-white hover:bg-brand-800 md:text-text-muted md:hover:text-text-main md:hover:bg-neutral-100"
          >
            {t('start.howItWorks')}
          </Button>
        </div>

        {/* Teacher link - subtle at bottom */}
        <div className="mt-8 sm:mt-10">
          <button
            onClick={goToTeacher}
            className="text-brand-400 hover:text-white md:text-text-muted md:hover:text-text-main text-sm underline underline-offset-2 transition-colors"
          >
            Ben je docent?
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 flex items-center gap-3 text-brand-400 md:text-text-muted">
        <span className="text-sm">Gemaakt door Bert van Uffelen</span>
        <button
          onClick={() => setShowAbout(true)}
          className="p-1.5 hover:text-white md:hover:text-text-main hover:bg-brand-800 md:hover:bg-neutral-200 rounded-full transition-colors"
          title="Over deze app"
        >
          <Info className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-brand-700 md:bg-neutral-300" />
        <div className="flex items-center gap-2">
          <a
            href="https://www.instagram.com/bvanuffelen/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:text-white md:hover:text-text-main hover:bg-brand-800 md:hover:bg-neutral-200 rounded-full transition-colors"
            title="Instagram"
          >
            <Instagram className="w-4 h-4" />
          </a>
          <a
            href="https://www.facebook.com/bvanuffelen"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:text-white md:hover:text-text-main hover:bg-brand-800 md:hover:bg-neutral-200 rounded-full transition-colors"
            title="Facebook"
          >
            <Facebook className="w-4 h-4" />
          </a>
          <a
            href="https://www.linkedin.com/in/bvanuffelen/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:text-white md:hover:text-text-main hover:bg-brand-800 md:hover:bg-neutral-200 rounded-full transition-colors"
            title="LinkedIn"
          >
            <Linkedin className="w-4 h-4" />
          </a>
          <a
            href="https://www.youtube.com/@BertvanUffelen"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:text-white md:hover:text-text-main hover:bg-brand-800 md:hover:bg-neutral-200 rounded-full transition-colors"
            title="YouTube"
          >
            <Youtube className="w-4 h-4" />
          </a>
        </div>
      </footer>

      {/* About modal */}
      <Modal
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
        title="Over deze app"
      >
        <div className="space-y-4 text-text-main">
          <p>
            SoundScout is gemaakt door Bert van Uffelen, muziekdocent en ontwikkelaar van creatieve digitale tools voor het onderwijs.
          </p>
          <p>
            Benieuwd naar meer apps, workshops of muzikale ideeën? Of wil je een training waarin je leert hoe je technologie effectief inzet in de muziekles?
          </p>
          <p>
            Neem een kijkje op mijn LinkedIn-profiel:
          </p>
          <a
            href="https://www.linkedin.com/in/bvanuffelen/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-brand-700 hover:text-brand-800 font-semibold underline underline-offset-2"
          >
            linkedin.com/in/bvanuffelen
          </a>
        </div>
      </Modal>

      {/* Tutorial modal */}
      <Modal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        title={t('start.tutorialTitle')}
      >
        <ol className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
          {tutorialSteps.map((step, i) => (
            <li key={i} className="flex gap-2 sm:gap-3 items-start">
              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-brand-800 text-white rounded-full flex items-center justify-center font-bold text-xs sm:text-sm">
                {i + 1}
              </span>
              <span className="text-text-main text-base sm:text-lg leading-snug pt-0.5">
                {step}
              </span>
            </li>
          ))}
        </ol>

        <Button
          onClick={() => setShowTutorial(false)}
          variant="secondary"
          className="w-full bg-brand-800 hover:bg-brand-700 active:bg-brand-900 text-white border-0 shadow-[0_3px_0_0_rgba(15,23,42,0.5)]"
        >
          {t('start.closeTutorial')}
        </Button>
      </Modal>
    </div>
  );
}
