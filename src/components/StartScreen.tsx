/**
 * StartScreen - Welcome screen with game start and tutorial
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Info, HelpCircle, Instagram, Facebook, Linkedin, Youtube, BookOpen } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { storageService } from '../services/StorageService';
import { initializeNewComposition } from '../utils/compositionInit';
import { Button, Modal, LanguageSwitcher } from './ui';
import { FeedbackModal } from './feedback';
import { ThemeSelectionModal } from './ThemeSelectionModal';
import { ShareCodeInput } from './share';

export function StartScreen() {
  const { t } = useTranslation();
  const goToCompositions = useAppStore((s) => s.goToCompositions);
  const goToTeacher = useAppStore((s) => s.goToTeacher);
  const [isLoading, setIsLoading] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showThemeSelection, setShowThemeSelection] = useState(false);
  const [hasCompositions, setHasCompositions] = useState(false);

  // Check if there are saved compositions
  useEffect(() => {
    const compositions = storageService.getCompositions();
    setHasCompositions(compositions.length > 0);
  }, []);

  const handleNewComposition = () => {
    // Show theme selection modal
    setShowThemeSelection(true);
  };

  const handleSelectTheme = async (themeId: string) => {
    setIsLoading(true);
    try {
      await initializeNewComposition({ themeId });
      setShowThemeSelection(false);
    } finally {
      setIsLoading(false);
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

        </div>

        {/* Share code input */}
        <div className="mt-6 sm:mt-8 w-full max-w-[280px] sm:max-w-xs">
          <ShareCodeInput />
        </div>

        <Button
          onClick={() => setShowTutorial(true)}
          variant="ghost"
          size="lg"
          className="mt-3 sm:mt-4 w-full max-w-[280px] sm:max-w-xs text-brand-300 hover:text-white hover:bg-brand-800 md:text-text-muted md:hover:text-text-main md:hover:bg-neutral-100"
        >
          {t('start.howItWorks')}
        </Button>

        {/* Teacher link - subtle at bottom */}
        <div className="mt-6 sm:mt-8">
          <button
            onClick={goToTeacher}
            className="text-brand-400 hover:text-white md:text-text-muted md:hover:text-text-main text-sm underline underline-offset-2 transition-colors"
          >
            {t('start.teacherLink')}
          </button>
        </div>

      </div>

      {/* Language switcher */}
      <div className="mt-6">
        <LanguageSwitcher variant="dark" className="md:hidden" />
        <LanguageSwitcher variant="light" className="hidden md:inline-flex" />
      </div>

      {/* Footer */}
      <footer className="mt-4 flex items-center gap-3 text-brand-400 md:text-text-muted">
        <span className="text-sm">{t('start.createdBy')}</span>
        <button
          onClick={() => setShowAbout(true)}
          className="p-1.5 hover:text-white md:hover:text-text-main hover:bg-brand-800 md:hover:bg-neutral-200 rounded-full transition-colors"
          title={t('start.aboutButton')}
        >
          <Info className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowFeedback(true)}
          className="p-1.5 hover:text-white md:hover:text-text-main hover:bg-brand-800 md:hover:bg-neutral-200 rounded-full transition-colors"
          title={t('feedback.helpButton')}
        >
          <HelpCircle className="w-4 h-4" />
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
          <div className="w-px h-4 bg-brand-700 md:bg-neutral-300" />
          <a
            href="?storytelling=true"
            className="p-1.5 hover:text-white md:hover:text-text-main hover:bg-brand-800 md:hover:bg-neutral-200 rounded-full transition-colors"
            title="Storytelling mode"
          >
            <BookOpen className="w-4 h-4" />
          </a>
        </div>
      </footer>

      {/* About modal */}
      <Modal
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
        title={t('start.aboutTitle')}
      >
        <div className="space-y-4 text-text-main">
          <p>
            {t('start.aboutText1')}
          </p>
          <p>
            {t('start.aboutText2')}
          </p>
          <p>
            {t('start.aboutText3')}
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

      {/* Feedback modal */}
      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        mode="feedback"
      />

      {/* Theme selection modal */}
      <ThemeSelectionModal
        isOpen={showThemeSelection}
        onClose={() => setShowThemeSelection(false)}
        onSelectTheme={handleSelectTheme}
        isLoading={isLoading}
      />
    </div>
  );
}
