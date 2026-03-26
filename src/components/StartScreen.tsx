/**
 * StartScreen - Welcome screen with game start and tutorial
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Play, Info, HelpCircle, MessageCircleQuestion, Instagram, Facebook, Linkedin, Youtube, BookOpen } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { useTimelineStore } from '../stores/timelineStore';
import { storageService } from '../services/StorageService';
import { initializeNewComposition } from '../utils/compositionInit';
import { Button, Modal, LanguageSwitcher } from './ui';
import { FeedbackModal } from './feedback';
import { ThemeSelectionModal } from './ThemeSelectionModal';
import { ShareCodeInput } from './share';

export function StartScreen() {
  const { t } = useTranslation();
  const goToCompositions = useAppStore((s) => s.goToCompositions);
  const goToStudio = useAppStore((s) => s.goToStudio);
  const goToTeacher = useAppStore((s) => s.goToTeacher);
  const goToTutorial = useAppStore((s) => s.goToTutorial);
  const hasClipsInProgress = useTimelineStore((s) => s.selectHasClips());
  const [isLoading, setIsLoading] = useState(false);
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
          {/* Continue button — shown when composition in progress (#64) */}
          {hasClipsInProgress && (
            <Button
              onClick={goToStudio}
              size="lg"
              className="w-full"
            >
              <Play className="w-5 h-5 mr-1.5 sm:mr-2" />
              {t('start.continueComposition')}
            </Button>
          )}

          <Button
            onClick={handleNewComposition}
            isLoading={isLoading}
            variant={hasClipsInProgress ? 'secondary' : 'primary'}
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

        <div className="flex flex-col items-center gap-1 mt-3 sm:mt-4 w-full max-w-[280px] sm:max-w-xs">
          <Button
            onClick={goToTutorial}
            variant="ghost"
            size="lg"
            className="w-full text-brand-300 hover:text-white hover:bg-brand-800 md:text-text-muted md:hover:text-text-main md:hover:bg-neutral-100"
          >
            {t('start.howItWorks')}
          </Button>
          <button
            onClick={() => setShowFeedback(true)}
            className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-white hover:bg-brand-800 md:text-text-muted md:hover:text-text-main md:hover:bg-neutral-100 rounded-lg px-3 py-1.5 transition-colors"
          >
            <MessageCircleQuestion className="w-4 h-4" />
            {t('start.feedbackHint')}
          </button>
        </div>

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
