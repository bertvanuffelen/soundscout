/**
 * StartScreen — V2-startscherm (donkerblauw, amber accent).
 *
 * Merk op één regel, kop en de hoofdknoppen (designronde nov 2026):
 *  - zonder werk: primair "Nieuwe soundscape" (wizard), dan "Ik heb een code"
 *    (op een telefoon bovenaan: in de klas de meest gebruikte ingang) en
 *    "Kies een wereld" (direct vrij componeren in een publiek thema);
 *  - met werk: primair "Ga verder" (met titel · klas · tijd), dan "Nieuwe
 *    soundscape" en "Ik heb een code".
 * Daaronder alleen wat relevant is: podium, Mijn soundscapes, seizoensthema,
 * docentreactie. "Voor docenten" en de taal staan rechtsboven (StartHeader).
 * Het beeld (StartHero) is één knop naar "Nieuwe soundscape"; het startscherm is stil.
 */

import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Play, Sparkles, Compass, Mail, Loader2, Theater, Star, KeyRound } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { useTimelineStore } from '../stores/timelineStore';
import { storageService } from '../services/StorageService';
import { useCompositionsVersion } from '../hooks/useCompositionsVersion';
import { useDarkPage } from '../hooks/useDarkPage';
import { useLibraryStore } from '../stores/libraryStore';
import { readWorkInProgress } from '../services/workInProgress';
import { isOwnSitting, markOwnSitting } from '../services/sitting';
import { setWorkAside } from '../utils/finishSession';
import {
  initializeNewComposition,
  initializeCompositionFromStoryboard,
} from '../utils/compositionInit';
import { Button, Modal } from './ui';
import { cn } from '../utils/cn';
import { StartHeader } from './start/StartHeader';
import { StartHero } from './start/StartHero';
import { StartFooter } from './start/StartFooter';
import { logger } from '../utils/logger';
import type { SavedOnlineComposition } from '../lib/submissions';
import type { ReceivedFeedback } from '../types';
import { StickerIcon } from '../utils/stickerMap';
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
// Lazy: de wereldkiezer ("Kies een wereld") zit in hetzelfde stuk als de wizard.
const ThemePicker = lazy(() =>
  import('./start/ThemePicker').then((m) => ({ default: m.ThemePicker }))
);
import { ShareCodeModal } from './share';
import { PrivacyModal } from './PrivacyModal';
import { NewWorkChoiceModal } from './common/NewWorkChoiceModal';
import type { Storyboard } from '../types';

export function StartScreen() {
  const { t, i18n } = useTranslation();
  // Loopt op zodra de lokale opslag klaar (of van buitenaf veranderd) is
  const storageVersion = useCompositionsVersion();
  const goToCompositions = useAppStore((s) => s.goToCompositions);
  const goToStudio = useAppStore((s) => s.goToStudio);
  const goToStage = useAppStore((s) => s.goToStage);
  const goToTutorial = useAppStore((s) => s.goToTutorial);
  const classSession = useAppStore((s) => s.classSession);
  // Werk = clips óf verzamelde geluiden; overleeft herladen (A1)
  const hasClips = useTimelineStore((s) => s.selectHasClips());
  const hasCollected = useLibraryStore((s) => s.librarySamples.length > 0);
  const hasClipsInProgress = hasClips || hasCollected;
  const currentCompositionId = useAppStore((s) => s.currentCompositionId);
  const compositionTitle = useAppStore((s) => s.compositionTitle);
  // Onderregel van "Verder werken": titel · klas
  const continueDetail = useMemo(() => {
    if (!hasClipsInProgress) return '';
    const name = compositionTitle.trim()
      || (currentCompositionId ? storageService.getCompositionById(currentCompositionId)?.name : undefined);
    // Tijd van het laatst onthouden werk (E1): zo ziet een kind op een
    // gedeelde computer dat dit misschien niet zijn werk is
    const savedAt = readWorkInProgress()?.savedAt;
    let when: string | undefined;
    if (savedAt) {
      const d = new Date(savedAt);
      const time = d.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
      when = d.toDateString() === new Date().toDateString()
        ? t('start.continueToday', { time })
        : d.toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' });
    }
    return [name, classSession?.className, when].filter(Boolean).join(' · ');
    // storageVersion: de naam komt uit de opslag, die net na het laden klaar is
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasClipsInProgress, compositionTitle, currentCompositionId, classSession, t, i18n.language, storageVersion]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [hasCompositions, setHasCompositions] = useState(false);
  // Sketch A (#78): "Nieuwe compositie" doorloopt twee modals achter elkaar:
  // eerst soort compositie kiezen, dáárna pas thema. "Ik heb een code" opent
  // een aparte modal met dezelfde chrome.
  const [showComposeWizard, setShowComposeWizard] = useState(false);
  // Een "mee naar huis"-link (#code=…) opent de code-modal meteen
  const pendingSaveCode = useAppStore((s) => s.pendingSaveCode);
  const [showCodeModal, setShowCodeModal] = useState(() => !!pendingSaveCode);
  const [showNewConfirm, setShowNewConfirm] = useState(false);
  // Wat er weggaat bij "opnieuw beginnen": de verzamelde geluiden als blokjes
  const librarySamples = useLibraryStore((st) => st.librarySamples);
  const discardPreview = useMemo(
    () => ({ shown: librarySamples.slice(0, 5), more: Math.max(0, librarySamples.length - 5) }),
    [librarySamples],
  );
  // Gedeeld apparaat (mockup B3): staat er werk dat niet in deze zitting is
  // gemaakt of bevestigd, dan eerst vragen van wie het is (services/sitting.ts)
  const [ownerAnswered, setOwnerAnswered] = useState(false);
  const needsOwnerCheck = hasClipsInProgress && !ownerAnswered && !isOwnSitting();
  const handleOwnerMine = () => {
    markOwnSitting();
    setOwnerAnswered(true);
    goToStudio();
  };
  const handleOwnerOther = () => {
    setWorkAside();
    setOwnerAnswered(true);
  };

  // Donkere pagina-achtergrond (geen witte rand bij doorveren)
  useDarkPage();

  // Check if there are saved compositions
  useEffect(() => {
    const compositions = storageService.getCompositions();
    setHasCompositions(compositions.length > 0);
  }, [storageVersion]);

  // Doorverwijzing vanaf een ander scherm (O7): bv. het opdrachtscherm zonder
  // opdracht vraagt om het codevenster of de wizard meteen te openen.
  const pendingStartAction = useAppStore((s) => s.pendingStartAction);
  useEffect(() => {
    if (!pendingStartAction) return;
    useAppStore.getState().setPendingStartAction(null);
    if (pendingStartAction === 'code') setShowCodeModal(true);
    else handleNewComposition();
    // handleNewComposition is een gewone functie in deze component; we willen
    // alleen reageren op een nieuwe doorverwijzing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingStartAction]);

  // Stille check op nieuwe docent-feedback (migratie 026): als dit apparaat
  // een klas-inzending met bewaarcode heeft, kijk of de docent heeft
  // gereageerd sinds de vorige keer. Faalt geruisloos (offline, migratie
  // nog niet gedraaid, code verlopen).
  const [feedbackNotice, setFeedbackNotice] = useState<{
    compositionName: string;
    saveCode: string;
    feedback: ReceivedFeedback;
    saved: SavedOnlineComposition;
  } | null>(null);
  const [showFeedbackNotice, setShowFeedbackNotice] = useState(false);
  const [noticeLoading, setNoticeLoading] = useState(false);

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
          saved,
        });
      } catch {
        // stil — melding is nice-to-have, nooit blokkerend
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Klik op de reactie-melding → direct naar het podium mét de compositie en
  // het feedbackblok (testronde 2: feedback woont op het podium). Faalt het
  // laden, dan valt de melding terug op de oude feedback-modal.
  const handleOpenFeedbackNotice = async () => {
    if (!feedbackNotice || noticeLoading) return;
    setNoticeLoading(true);
    try {
      const { openSavedComposition } = await import('../utils/compositionInit');
      await openSavedComposition(feedbackNotice.saved, feedbackNotice.saveCode, 'stage');
      setFeedbackNotice(null);
    } catch (err) {
      logger.warn('Reactie-melding: compositie openen mislukt — toon modal', err);
      setShowFeedbackNotice(true);
    } finally {
      setNoticeLoading(false);
    }
  };

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

  // Wat de leerling wil starten, vastgehouden tijdens een tussenvraag
  // (klaskeuze of "je werk gaat verloren"): de wizard, de wereldkiezer of
  // het seizoensthema. Zo gelden dezelfde waarschuwingen voor alle drie.
  type StartIntent = 'wizard' | 'world' | 'seasonal';
  const pendingIntentRef = useRef<StartIntent>('wizard');
  const [showWorldPicker, setShowWorldPicker] = useState(false);

  // Klasbewuste "Nieuwe compositie" (A2): in een klas eerst kiezen tussen
  // nog één voor deze opdracht of zelf iets nieuws (verlaat de klas)
  const [showNewWorkChoice, setShowNewWorkChoice] = useState(false);
  const [newWorkLoading, setNewWorkLoading] = useState(false);
  const [newWorkError, setNewWorkError] = useState<string | null>(null);
  const submissionSynced = useAppStore((s) => s.submissionSynced);

  // Seizoensthema-chip: alléén zichtbaar als een publiek thema een
  // seizoensvenster heeft (week 4). Klik = direct een nieuwe compositie in
  // dat thema; met werk-in-uitvoering eerst de bestaande waarschuwing.
  const seasonalTheme = useMemo(
    () => getPublicThemes().find((th) => th.activeFrom && th.activeUntil) ?? null,
    []
  );

  /** Voer de gekozen start uit (na eventuele waarschuwing). */
  const proceed = (intent: StartIntent) => {
    if (intent === 'world') setShowWorldPicker(true);
    else if (intent === 'seasonal' && seasonalTheme) void handleSelectTheme(seasonalTheme.id);
    else openWizard();
  };

  const handleSameAssignment = async () => {
    setNewWorkLoading(true);
    setNewWorkError(null);
    const { startAnotherForCurrentAssignment } = await import('../utils/compositionInit');
    const result = await startAnotherForCurrentAssignment();
    setNewWorkLoading(false);
    if (result === 'ok') setShowNewWorkChoice(false);
    else setNewWorkError(t('newWork.error'));
  };

  const handleFreshWork = () => {
    setShowNewWorkChoice(false);
    // De keuze-modal waarschuwde al; de klas-context wordt gewist zodra er
    // een thema/storyboard gekozen is (handleSelectTheme/-Storyboard)
    proceed(pendingIntentRef.current);
  };

  /** "Nieuwe soundscape" en "Kies een wereld": klas → keuze, werk → waarschuwing. */
  const startFresh = (intent: 'wizard' | 'world') => {
    pendingIntentRef.current = intent;
    if (classSession) {
      setNewWorkError(null);
      setShowNewWorkChoice(true);
      return;
    }
    if (hasClipsInProgress) {
      // Waarschuw dat de huidige compositie verloren gaat
      setShowNewConfirm(true);
    } else {
      proceed(intent);
    }
  };

  const handleNewComposition = () => startFresh('wizard');
  const handleChooseWorld = () => startFresh('world');

  const handleSeasonalTheme = () => {
    if (!seasonalTheme) return;
    pendingIntentRef.current = 'seasonal';
    if (hasClipsInProgress) {
      setShowNewConfirm(true);
    } else {
      proceed('seasonal');
    }
  };

  const handleConfirmNewComposition = () => {
    setShowNewConfirm(false);
    proceed(pendingIntentRef.current);
  };

  const handleSelectTheme = async (themeId: string) => {
    setIsLoading(true);
    try {
      // Bewuste nieuwe compositie: oude storyboard/praatplaat/klas-context weg
      useAppStore.getState().resetCompositionContext();
      // Een thema kiezen = vrij componeren. De modus wordt pas hier gezet,
      // niet al bij "Volgende" in de wizard (B25).
      useAppStore.getState().setComposeMode('free');
      await initializeNewComposition({ themeId });
      setShowComposeWizard(false);
      setShowWorldPicker(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectStoryboard = async (storyboard: Storyboard) => {
    setIsLoading(true);
    try {
      // Bewuste nieuwe compositie: oude context weg vóór de storyboard-init
      useAppStore.getState().resetCompositionContext();
      await initializeCompositionFromStoryboard(storyboard);
      setShowComposeWizard(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Strook "verder waar je was": alleen als er iets is om naar terug te gaan
  const showContinueStrip = (hasClipsInProgress && !!classSession) || hasCompositions || !!seasonalTheme || !!feedbackNotice;
  const stripButton =
    'inline-flex items-center gap-2 min-h-11 px-4 py-2 rounded-full text-sm font-bold transition-colors';
  // Secundaire hoofdknop: rustig, wel even groot als de primaire
  const secondaryMain =
    'w-full sm:w-auto lg:px-6 lg:text-lg 2xl:px-8 2xl:text-xl short:w-auto short:min-h-12 short:py-2 short:text-lg bg-white/10 hover:bg-white/20 ring-1 ring-white/30 text-white';
  const primaryMain =
    'w-full sm:w-auto lg:px-6 lg:text-lg 2xl:px-8 2xl:text-xl short:w-auto short:min-h-12 short:py-2 short:text-lg';


  return (
    <div className="relative min-h-dvh bg-brand-900 text-white flex flex-col overflow-x-hidden">
      {/* Statische gloed (geen animatie, geen canvas) */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--color-brand-700),transparent_55%)] opacity-60"
        aria-hidden="true"
      />

      <StartHeader onTeachers={() => { window.location.href = '/teacher'; }} />

      <main className="relative z-10 flex-1 w-full max-w-[1440px] mx-auto px-safe [--safe-min:1rem] sm:[--safe-min:2rem] py-4 sm:py-6 short:py-2 grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] short:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 short:gap-6 items-center">
        <section className="flex flex-col items-center lg:items-start short:items-start text-center lg:text-left short:text-left gap-4 sm:gap-6 short:gap-3 min-w-0">
          {/* Merk op één regel, op kopgrootte; het amber is voor de hoofdknop */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img
              src="/images/overige/logo-soundscout-white.svg"
              alt=""
              width={576}
              height={502}
              className="h-9 sm:h-11 xl:h-12 short:h-8 w-auto"
            />
            <p className="text-2xl sm:text-3xl xl:text-4xl short:text-xl font-extrabold tracking-tight leading-none">
              SoundScout
            </p>
          </div>

          <h1 className="text-3xl sm:text-4xl xl:text-5xl short:text-2xl font-extrabold tracking-tight leading-tight text-balance">
            {t('start.headline')}
          </h1>

          {needsOwnerCheck ? (
            /* Gedeeld apparaat (mockup B3): eerst vragen van wie dit werk is */
            <div
              role="group"
              aria-label={t('start.ownerCheck.title')}
              data-testid="owner-check"
              className="flex flex-col gap-3 w-full sm:w-auto sm:min-w-[340px] rounded-3xl bg-white/10 ring-1 ring-white/20 p-4 sm:p-5 text-left"
            >
              <p className="text-lg sm:text-xl font-extrabold">{t('start.ownerCheck.title')}</p>
              {continueDetail && (
                <p className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-brand-100 truncate">{continueDetail}</p>
              )}
              <Button onClick={handleOwnerMine} size="lg" className="w-full">
                {t('start.ownerCheck.mine')}
              </Button>
              <Button onClick={handleOwnerOther} variant="ghost" size="lg" className="w-full bg-white/10 hover:bg-white/20 ring-1 ring-white/30 text-white">
                {t('start.ownerCheck.other')}
              </Button>
            </div>
          ) : (
            <>
          {/* Hoofdknoppen: één primaire (amber), de rest rustig maar even groot */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap short:flex-row short:flex-wrap justify-center lg:justify-start short:justify-start gap-3 w-full sm:w-auto">
            {hasClipsInProgress ? (
              <>
                {/* Verder werken (#64) gaat voor zodra er werk is */}
                <Button onClick={goToStudio} size="lg" className={cn(primaryMain, 'text-left')}>
                  <Play className="w-5 h-5 mr-2 shrink-0" aria-hidden="true" />
                  <span className="flex flex-col leading-tight min-w-0">
                    <span>{t('start.continueComposition')}</span>
                    {continueDetail && (
                      <span className="text-xs font-semibold opacity-80 truncate">{continueDetail}</span>
                    )}
                  </span>
                </Button>
                <Button onClick={handleNewComposition} isLoading={isLoading} variant="ghost" size="lg" className={secondaryMain}>
                  <Sparkles className="w-5 h-5 mr-2 shrink-0" aria-hidden="true" />
                  {isLoading ? t('start.loading') : t('start.newComposition')}
                </Button>
              </>
            ) : (
              <Button onClick={handleNewComposition} isLoading={isLoading} size="lg" className={primaryMain}>
                <Sparkles className="w-5 h-5 mr-2 shrink-0" aria-hidden="true" />
                {isLoading ? t('start.loading') : t('start.newComposition')}
              </Button>
            )}
            {/* Klascode: in de klas de eerste stap, op een telefoon daarom bovenaan */}
            <Button
              onClick={() => setShowCodeModal(true)}
              variant="ghost"
              size="lg"
              className={cn(secondaryMain, 'order-first sm:order-none short:order-none')}
            >
              <KeyRound className="w-5 h-5 mr-2 shrink-0" aria-hidden="true" />
              {t('start.haveCode')}
            </Button>
            {!hasClipsInProgress && (
              <Button onClick={handleChooseWorld} variant="ghost" size="lg" className={secondaryMain}>
                <Compass className="w-5 h-5 mr-2 shrink-0" aria-hidden="true" />
                {t('start.chooseWorld')}
              </Button>
            )}
          </div>

          {/* Verder waar je was — alleen wat er echt is */}
          {showContinueStrip && (
            <div
              role="group"
              aria-label={t('start.continueLabel')}
              className="flex flex-wrap justify-center lg:justify-start short:justify-start gap-2 w-full sm:w-auto"
            >
              {/* "Je hebt een reactie!" (docent-feedback, migratie 026) */}
              {feedbackNotice && (
                <button
                  type="button"
                  onClick={handleOpenFeedbackNotice}
                  disabled={noticeLoading}
                  className={cn(stripButton, 'bg-accent-100 text-accent-900 ring-2 ring-accent-300 hover:bg-accent-50 disabled:opacity-70 text-left')}
                >
                  {noticeLoading
                    ? <Loader2 className="w-5 h-5 text-accent-700 shrink-0 animate-spin" aria-hidden="true" />
                    : <Mail className="w-5 h-5 text-accent-700 shrink-0" aria-hidden="true" />}
                  {t('studentFeedback.noticeButton', { name: feedbackNotice.compositionName })}
                </button>
              )}

              {/* Podium-shortcut (testronde 2): in een klas is het podium de feedback-plek */}
              {hasClipsInProgress && classSession && (
                <button
                  type="button"
                  onClick={goToStage}
                  className={cn(stripButton, 'bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/20')}
                >
                  <Theater className="w-5 h-5 shrink-0" aria-hidden="true" />
                  {t('start.toStage')}
                </button>
              )}

              {hasCompositions && (
                <button
                  type="button"
                  onClick={goToCompositions}
                  className={cn(stripButton, 'bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/20')}
                >
                  <FolderOpen className="w-5 h-5 shrink-0" aria-hidden="true" />
                  {t('start.myCompositions')}
                </button>
              )}

              {/* Seizoensthema: verschijnt alleen in het seizoen — "de app leeft" */}
              {seasonalTheme && (
                <button
                  type="button"
                  onClick={handleSeasonalTheme}
                  className={cn(stripButton, 'bg-accent-400/15 text-accent-200 ring-1 ring-accent-400/60 hover:bg-accent-400/25')}
                >
                  <Sparkles className="w-5 h-5 shrink-0 text-accent-300" aria-hidden="true" />
                  {t('start.newTheme', { name: t(seasonalTheme.name) })}
                </button>
              )}
            </div>
          )}
            </>
          )}
        </section>

        <StartHero onStart={handleNewComposition} />
      </main>

      <StartFooter
        onTutorial={goToTutorial}
        onFeedback={() => setShowFeedback(true)}
        onPrivacy={() => setShowPrivacy(true)}
      />

      {/* Kies een wereld: alleen de publieke thema's, kiezen = vrij componeren */}
      {showWorldPicker && (
        <Modal
          isOpen
          onClose={() => setShowWorldPicker(false)}
          title={t('themeSelection.title')}
          size="xl"
          showClose
        >
          <Suspense fallback={null}>
            <ThemePicker onSelectTheme={handleSelectTheme} isLoading={isLoading} />
          </Suspense>
        </Modal>
      )}
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

      {/* Klasbewuste nieuwe soundscape (A2) */}
      {classSession && (
        <NewWorkChoiceModal
          isOpen={showNewWorkChoice}
          onClose={() => setShowNewWorkChoice(false)}
          className={classSession.className}
          isPraatplaat={classSession.assignmentType === 'praatplaat'}
          handedIn={submissionSynced}
          onSameAssignment={handleSameAssignment}
          onFresh={handleFreshWork}
          isLoading={newWorkLoading}
          error={newWorkError}
        />
      )}

      {/* Waarschuwing: actieve compositie wordt gewist (mockup B4, "weinig
          woorden"). Laat zien wát je weggooit in plaats van het uit te leggen;
          de knoppen zeggen wat er gebeurt. Veilige keuze = primair. */}
      <Modal
        isOpen={showNewConfirm}
        onClose={() => setShowNewConfirm(false)}
        title={t('start.discard.title')}
        size="sm"
      >
        <div className="flex flex-wrap justify-center gap-1.5 mb-6" data-testid="discard-preview">
          {discardPreview.shown.map((smp) => (
            <span
              key={smp.id}
              className="inline-flex items-center min-h-9 px-3 rounded-lg text-sm font-extrabold text-white"
              style={{ backgroundColor: smp.color }}
            >
              {t(smp.name)}
            </span>
          ))}
          {discardPreview.more > 0 && (
            <span className="inline-flex items-center min-h-9 px-3 rounded-lg text-sm font-extrabold bg-neutral-100 text-text-muted">
              +{discardPreview.more}
            </span>
          )}
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <Button
            variant="danger"
            onClick={handleConfirmNewComposition}
            className="flex-1"
          >
            {t('start.discard.confirm')}
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowNewConfirm(false)}
            className="flex-1"
          >
            {t('start.discard.keep')}
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
            isLoading={isLoading}
          />
        </Suspense>
      )}

      {/* Code modal — "Ik heb een code" */}
      <ShareCodeModal
        isOpen={showCodeModal || !!pendingSaveCode}
        onClose={() => {
          setShowCodeModal(false);
          useAppStore.getState().setPendingSaveCode(null);
        }}
        initialCode={pendingSaveCode}
      />

      {/* First-run intro: eenmalige uitleg-animatie vóór de eerste compositie */}
      <Modal
        isOpen={showFirstRunIntro}
        onClose={handleIntroDone}
        title={t('start.introTitle')}
        size="xl"
        showClose
        footer={(
          <div className="flex justify-center">
            <Button variant="primary" size="lg" onClick={handleIntroDone} className="w-full sm:w-auto sm:min-w-[240px]">
              {t('start.introStart')}
            </Button>
          </div>
        )}
      >
        {/* Lager scherm = smallere animatie, zodat alles in beeld past (E11) */}
        <div className="mx-auto rounded-2xl overflow-hidden border border-border-subtle bg-bg-surface" style={{ maxWidth: 'min(100%, calc((100dvh - 330px) * 1.78))' }}>
          <OnboardingAnimation />
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
            <div className="mb-3 flex justify-center" aria-hidden="true">
              <StickerIcon sticker={feedbackNotice.feedback.sticker} fallback size={48} />
            </div>
            {feedbackNotice.feedback.sticker && (
              <p className="text-lg font-extrabold text-text-main mb-1">
                {t(`teacher.feedback.stickers.${feedbackNotice.feedback.sticker}`)}
              </p>
            )}
            {feedbackNotice.feedback.level != null && (
              <div className="flex justify-center gap-0.5 mb-2" aria-label={t('teacher.feedback.levelTitle', { level: feedbackNotice.feedback.level, word: t(`common.starLevels.${feedbackNotice.feedback.level}`) })}>
                {Array.from({ length: feedbackNotice.feedback.level }, (_, i) => (
                  <Star key={i} className="w-6 h-6 text-accent-500 fill-accent-500" aria-hidden="true" />
                ))}
                <span className="ml-1.5 self-center text-sm font-bold text-accent-800">{t(`common.starLevels.${feedbackNotice.feedback.level}`)}</span>
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
