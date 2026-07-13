/**
 * StartScreen - Welcome screen with game start and tutorial
 */

import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Play, Info, HelpCircle, MessageCircleQuestion, Instagram, Facebook, Linkedin, Youtube, Shield, KeyRound, Sparkles, GraduationCap } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { useTimelineStore } from '../stores/timelineStore';
import { storageService } from '../services/StorageService';
import {
  initializeNewComposition,
  initializeCompositionFromStoryboard,
} from '../utils/compositionInit';
import { Button, Modal, LanguageSwitcher } from './ui';
import { Star } from 'lucide-react';
import type { ReceivedFeedback } from '../types';
import { getStickerEmoji } from './teacher/FeedbackPanel';
import { OnboardingAnimation } from './common/OnboardingAnimation';
import { hasSeenFirstRun, markFirstRunSeen } from '../utils/firstRun';
import { getPublicThemes } from '../data/themes';
// Lazy: FeedbackModal sleept @emailjs/browser mee — pas laden bij openen.
const FeedbackModal = lazy(() =>
  import('./feedback').then((m) => ({ default: m.FeedbackModal }))
);
// Lazy: de wizard sleept ComposePreview (~1000 regels animatie) mee — pas
// laden wanneer de leerling echt op "Nieuwe compositie" tikt.
const NewCompositionWizard = lazy(() => import('./start/NewCompositionWizard'));
import { ShareCodeModal } from './share';
import { PrivacyModal } from './PrivacyModal';
import type { Storyboard } from '../types';

export function StartScreen() {
  const { t } = useTranslation();
  const goToCompositions = useAppStore((s) => s.goToCompositions);
  const goToStudio = useAppStore((s) => s.goToStudio);
  const goToTutorial = useAppStore((s) => s.goToTutorial);
  const hasClipsInProgress = useTimelineStore((s) => s.selectHasClips());
  const [isLoading, setIsLoading] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [hasCompositions, setHasCompositions] = useState(false);
  // Sketch A (#78): "Nieuwe compositie" doorloopt twee modals achter elkaar:
  // eerst soort compositie kiezen, dáárna pas thema. "Ik heb een code" opent
  // een aparte modal met dezelfde chrome.
  const [showComposeWizard, setShowComposeWizard] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showNewConfirm, setShowNewConfirm] = useState(false);

  // Check if there are saved compositions
  useEffect(() => {
    const compositions = storageService.getCompositions();
    setHasCompositions(compositions.length > 0);
  }, []);

  // Stille check op nieuwe docent-feedback (migratie 026): als dit apparaat
  // een klas-inzending met bewaarcode heeft, kijk of de juf/meester heeft
  // gereageerd sinds de vorige keer. Faalt geruisloos (offline, migratie
  // nog niet gedraaid, code verlopen).
  const [feedbackNotice, setFeedbackNotice] = useState<{
    compositionName: string;
    saveCode: string;
    feedback: ReceivedFeedback;
  } | null>(null);
  const [showFeedbackNotice, setShowFeedbackNotice] = useState(false);

  useEffect(() => {
    const info = storageService.getClassFeedbackCode();
    if (!info) return;
    let cancelled = false;

    (async () => {
      try {
        const { loadSavedComposition } = await import('../lib/submissions');
        const saved = await loadSavedComposition(info.saveCode);
        if (cancelled || !saved?.feedback_at) return;
        if (saved.feedback_at === info.lastSeenFeedbackAt) return;
        setFeedbackNotice({
          compositionName: saved.composition_name,
          saveCode: info.saveCode,
          feedback: {
            sticker: saved.feedback_sticker ?? null,
            level: saved.feedback_level ?? null,
            text: saved.feedback_text ?? null,
            at: saved.feedback_at,
          },
        });
      } catch {
        // stil — melding is nice-to-have, nooit blokkerend
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const handleDismissFeedbackNotice = () => {
    if (feedbackNotice) {
      const info = storageService.getClassFeedbackCode();
      if (info) {
        storageService.setClassFeedbackCode({
          ...info,
          lastSeenFeedbackAt: feedbackNotice.feedback.at,
        });
      }
    }
    setShowFeedbackNotice(false);
    setFeedbackNotice(null);
  };

  // First-run intro: bij de allereerste "Nieuwe compositie" eerst de
  // "In 4 stappen"-animatie tonen (week 3, onboarding). Daarna nooit meer.
  const [showFirstRunIntro, setShowFirstRunIntro] = useState(false);

  const openWizard = () => {
    if (!hasSeenFirstRun('onboarding-intro')) {
      setShowFirstRunIntro(true);
    } else {
      setShowComposeWizard(true);
    }
  };

  const handleIntroDone = () => {
    markFirstRunSeen('onboarding-intro');
    setShowFirstRunIntro(false);
    setShowComposeWizard(true);
  };

  const handleNewComposition = () => {
    seasonalPendingRef.current = false;
    if (hasClipsInProgress) {
      // Waarschuw dat de huidige compositie verloren gaat
      setShowNewConfirm(true);
    } else {
      // Geen actieve compositie — open de wizard (met eenmalige intro)
      openWizard();
    }
  };

  // Seizoensthema-chip: alléén zichtbaar als een publiek thema een
  // seizoensvenster heeft (week 4). Klik = direct een nieuwe compositie in
  // dat thema; met werk-in-uitvoering eerst de bestaande waarschuwing.
  const seasonalTheme = useMemo(
    () => getPublicThemes().find((th) => th.activeFrom && th.activeUntil) ?? null,
    []
  );
  const seasonalPendingRef = useRef(false);

  const handleSeasonalTheme = () => {
    if (!seasonalTheme) return;
    if (hasClipsInProgress) {
      seasonalPendingRef.current = true;
      setShowNewConfirm(true);
    } else {
      void handleSelectTheme(seasonalTheme.id);
    }
  };

  const handleConfirmNewComposition = () => {
    setShowNewConfirm(false);
    if (seasonalPendingRef.current && seasonalTheme) {
      seasonalPendingRef.current = false;
      void handleSelectTheme(seasonalTheme.id);
    } else {
      openWizard();
    }
  };

  const handleSelectTheme = async (themeId: string) => {
    setIsLoading(true);
    try {
      await initializeNewComposition({ themeId });
      setShowComposeWizard(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectStoryboard = async (storyboard: Storyboard) => {
    setIsLoading(true);
    try {
      await initializeCompositionFromStoryboard(storyboard);
      setShowComposeWizard(false);
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

        {/* "Je hebt een reactie!"-melding (docent-feedback, migratie 026) */}
        {feedbackNotice && (
          <button
            type="button"
            onClick={() => setShowFeedbackNotice(true)}
            className="mb-4 w-full max-w-[280px] sm:max-w-xs flex items-center gap-2.5 rounded-2xl border-2 border-accent-300 bg-accent-50 px-4 py-3 text-left shadow-md hover:bg-accent-100 transition-colors animate-pulse hover:animate-none"
          >
            <span className="text-2xl" aria-hidden="true">💌</span>
            <span className="text-sm font-bold text-text-main">
              {t('studentFeedback.noticeButton', { name: feedbackNotice.compositionName })}
            </span>
          </button>
        )}

        {/* Seizoensthema-chip: verschijnt alleen als een publiek thema een
            seizoensvenster heeft — "de app leeft" zonder extra ruis */}
        {seasonalTheme && (
          <button
            type="button"
            onClick={handleSeasonalTheme}
            className="mb-4 inline-flex items-center gap-2 rounded-full border-2 border-accent-300 bg-accent-50 px-4 py-2 text-sm font-bold text-accent-800 shadow-md hover:bg-accent-100 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-accent-600" />
            {t('start.newTheme', { name: t(seasonalTheme.name) })}
          </button>
        )}

        {/* Primaire keuzes — Sketch A (#78):
            twee gelijkwaardige CTAs, plus "Verder werken" als er nog clips
            zijn. Code-invoer verschijnt pas na expliciete klik. */}
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
            <Sparkles className="w-5 h-5 mr-1.5 sm:mr-2" />
            {isLoading ? t('start.loading') : t('start.newComposition')}
          </Button>

          <Button
            onClick={() => setShowCodeModal(true)}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            <KeyRound className="w-5 h-5 mr-1.5 sm:mr-2" />
            {t('start.haveCode')}
          </Button>

          {hasCompositions && (
            <Button
              onClick={goToCompositions}
              variant="ghost"
              size="lg"
              className="w-full"
            >
              <FolderOpen className="w-5 h-5 mr-1.5 sm:mr-2" />
              {t('start.myCompositions')}
            </Button>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 mt-6 sm:mt-8 w-full max-w-[280px] sm:max-w-xs">
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

        {/* Teacher link — als knop, gelijkgetrokken met de andere CTA's */}
        <div className="mt-6 sm:mt-8 w-full max-w-[280px] sm:max-w-xs">
          <Button
            onClick={() => { window.location.href = '/teacher'; }}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            <GraduationCap className="w-5 h-5 mr-1.5 sm:mr-2" />
            {t('start.teacherLink')}
          </Button>
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
        <button
          onClick={() => setShowPrivacy(true)}
          className="p-1.5 hover:text-white md:hover:text-text-main hover:bg-brand-800 md:hover:bg-neutral-200 rounded-full transition-colors"
          title={t('privacy.button')}
        >
          <Shield className="w-4 h-4" />
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
      {showFeedback && (
        <Suspense fallback={null}>
          <FeedbackModal
            isOpen={showFeedback}
            onClose={() => setShowFeedback(false)}
            mode="feedback"
          />
        </Suspense>
      )}

      {/* Waarschuwing: actieve compositie wordt gewist */}
      <Modal
        isOpen={showNewConfirm}
        onClose={() => { seasonalPendingRef.current = false; setShowNewConfirm(false); }}
        title={t('start.newComposition')}
        size="sm"
      >
        <p className="text-text-muted text-sm mb-6 leading-relaxed text-center">
          {t('start.newCompositionConfirm')}
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowNewConfirm(false)}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmNewComposition}
            className="flex-1"
          >
            {t('start.newCompositionStart')}
          </Button>
        </div>
      </Modal>

      {/* Nieuwe compositie — begeleide wizard (modus → bijpassende keuze).
          Alleen gemount wanneer open, zodat de stap-state elke keer vers is. */}
      {showComposeWizard && (
        <Suspense fallback={null}>
          <NewCompositionWizard
            onClose={() => setShowComposeWizard(false)}
            onStartFree={handleSelectTheme}
            onStartStoryboard={handleSelectStoryboard}
            onHaveCode={() => { setShowComposeWizard(false); setShowCodeModal(true); }}
            isLoading={isLoading}
          />
        </Suspense>
      )}

      {/* Code modal — "Ik heb een code" */}
      <ShareCodeModal
        isOpen={showCodeModal}
        onClose={() => setShowCodeModal(false)}
      />

      {/* First-run intro: eenmalige uitleg-animatie vóór de eerste compositie */}
      <Modal
        isOpen={showFirstRunIntro}
        onClose={handleIntroDone}
        title={t('start.introTitle')}
        size="xl"
      >
        <div className="rounded-2xl overflow-hidden border border-border-subtle bg-bg-surface mb-4">
          <OnboardingAnimation />
        </div>
        <div className="flex justify-center">
          <Button variant="primary" size="lg" onClick={handleIntroDone} className="w-full sm:w-auto sm:min-w-[240px]">
            {t('start.introStart')}
          </Button>
        </div>
      </Modal>

      {/* Docent-feedback modal (migratie 026) */}
      <Modal
        isOpen={showFeedbackNotice && !!feedbackNotice}
        onClose={handleDismissFeedbackNotice}
        title={t('studentFeedback.modalTitle')}
        size="sm"
      >
        {feedbackNotice && (
          <div className="text-center">
            <div className="text-5xl mb-3" aria-hidden="true">
              {getStickerEmoji(feedbackNotice.feedback.sticker) ?? '💌'}
            </div>
            {feedbackNotice.feedback.sticker && (
              <p className="text-lg font-extrabold text-text-main mb-1">
                {t(`teacher.feedback.stickers.${feedbackNotice.feedback.sticker}`)}
              </p>
            )}
            {feedbackNotice.feedback.level != null && (
              <div className="flex justify-center gap-0.5 mb-2" aria-label={t('teacher.feedback.levelTitle', { level: feedbackNotice.feedback.level })}>
                {Array.from({ length: feedbackNotice.feedback.level }, (_, i) => (
                  <Star key={i} className="w-6 h-6 text-accent-500 fill-accent-500" />
                ))}
              </div>
            )}
            {feedbackNotice.feedback.text && (
              <p className="text-text-muted text-sm mb-4 leading-relaxed">
                &ldquo;{feedbackNotice.feedback.text}&rdquo;
              </p>
            )}
            <p className="text-text-muted text-xs mb-5">
              {t('studentFeedback.modalHint', { code: feedbackNotice.saveCode })}
            </p>
            <Button variant="primary" onClick={handleDismissFeedbackNotice} className="w-full">
              {t('studentFeedback.modalClose')}
            </Button>
          </div>
        )}
      </Modal>

      {/* Privacy modal */}
      <PrivacyModal
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
      />
    </div>
  );
}
