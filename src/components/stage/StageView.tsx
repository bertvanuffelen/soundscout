/**
 * StageView — het podium v4 (fase 2)
 *
 * Schermvullend, net als de studio:
 * - kop: terug naar de studio · titel (meteen te bewerken) · klas/status
 * - links het beeld van de soundscape met de afspeelbalk (StageVisual)
 * - rechts "Jouw soundscape": opdrachtkaart en stappen (StageMission)
 *
 * De stappen komen uit `deriveStageSteps`; inleveren, bewaren en versies
 * uit `useStageSave` + `handInVersions`. Op een telefoon staan beeld en
 * stappen onder elkaar.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Pencil, GraduationCap, Monitor, Flag, Check, Lock } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { useAuth } from '../../contexts/useAuth';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useAudioCleanup } from '../../hooks/useAudioCleanup';
import { useAudioExport } from '../../hooks/useAudioExport';
import { useVideoExport } from '../../hooks/useVideoExport';
import { useStageSave } from '../../hooks/useStageSave';
import { useStageModals } from '../../hooks/useStageModals';
import { useLiveAssignment } from '../../hooks/useLiveAssignment';
import { Button, Modal } from '../ui';
import { ShareLinkModal } from '../share';
import { storageService } from '../../services/StorageService';
import { audioService } from '../../services/AudioService';
import { buildCompositionData } from '../../utils/buildCompositionData';
import { compositionFingerprint } from '../../utils/handInVersions';
import { deriveStageSteps } from '../../utils/stageSteps';
import { getPeerDone, setPeerDone } from '../../utils/peerProgress';
import { randomTitle } from '../../utils/randomTitles';
import { SaveAsTemplateModal } from './SaveAsTemplateModal';
import { PresentationSurface } from '../presentation/PresentationSurface';
import { PeerReviewModal } from './PeerReviewModal';
import { StageVisual } from './StageVisual';
import { StageMission } from './StageMission';
import { MusicCardModal } from './MusicCardModal';
import { JoinClassModal } from './JoinClassModal';
import { ClassSessionBadge } from '../ui/ClassSessionBadge';
import { NewWorkChoiceModal } from '../common/NewWorkChoiceModal';
import { logger } from '../../utils/logger';
import type { ActiveAssignment } from '../../lib/assignments';

export function StageView() {
  const { t, i18n } = useTranslation();
  const setScreen = useAppStore((s) => s.setScreen);
  const goToMap = useAppStore((s) => s.goToMap);
  const activeStoryboard = useAppStore((s) => s.activeStoryboard);
  const activePraatplaat = useAppStore((s) => s.activePraatplaat);
  const praatplaatPosition = useAppStore((s) => s.praatplaatPosition);
  const classSession = useAppStore((s) => s.classSession);
  const submissionId = useAppStore((s) => s.submissionId);
  const submissionSynced = useAppStore((s) => s.submissionSynced);
  const isSubmitting = useAppStore((s) => s.isSubmitting);
  const receivedFeedback = useAppStore((s) => s.receivedFeedback);
  const librarySamples = useLibraryStore((s) => s.librarySamples);
  const tracks = useTimelineStore((s) => s.tracks);
  const totalBeats = useTimelineStore((s) => s.totalBeats);
  const sections = useTimelineStore((s) => s.sections);
  const sequences = useTimelineStore((s) => s.sequences);
  const { stopAll, stopTimeline } = useAudioEngine();
  const { isTeacher } = useAuth();

  useAudioCleanup();
  // Docentwijzigingen live meenemen (fase 4.1)
  const assignmentChanged = useLiveAssignment();

  const { exportState, progress, error, warning: exportWarning, exportMp3 } = useAudioExport();
  const { videoExportState, videoProgress, videoError, videoWarning, exportVideo } = useVideoExport();

  const {
    compositionName,
    setCompositionName,
    saveError,
    submitFeedback,
    syncFeedback,
    classSaveCode,
    onlineSaveCode,
    isSavingOnline,
    versionInfo,
    handIn,
    saveOnline,
  } = useStageSave();

  const {
    showNewModal,
    setShowNewModal,
    showShareLinkModal,
    setShowShareLinkModal,
    handleNewComposition,
  } = useStageModals();

  // --- Lokale podium-staat ---
  const [listened, setListened] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [exported, setExported] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);
  const [showPeerReview, setShowPeerReview] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [peerDone, setPeerDoneState] = useState(() => getPeerDone(submissionId));
  const [feedbackSeenAt, setFeedbackSeenAt] = useState(() => storageService.getClassFeedbackCode()?.lastSeenFeedbackAt ?? null);
  useEffect(() => { setPeerDoneState(getPeerDone(submissionId)); }, [submissionId]);

  // Docent zette "zelf een titel typen" uit (migratie 037): de app kiest
  const titleLocked = !!classSession && classSession.studentsTypeTitle === false;
  useEffect(() => {
    if (titleLocked && !useAppStore.getState().compositionTitle.trim()) {
      setCompositionName(randomTitle(i18n.language));
    }
  }, [titleLocked, setCompositionName, i18n.language]);

  // Podium = altijd de volledige mix, één keer van begin tot eind (B22/B23)
  useEffect(() => {
    useTimelineStore.getState().setSoloTrack(null);
    audioService.setSoloTrack(null);
    audioService.setLoop(false, useTimelineStore.getState().totalBeats, null);
  }, []);

  // Feedback-thuis (testronde 2): stil de laatste docent-feedback ophalen
  useEffect(() => {
    if (!classSession || !classSaveCode) return;
    let cancelled = false;
    (async () => {
      try {
        const [{ loadSavedComposition }, { getPeerCompliments }] = await Promise.all([
          import('../../lib/submissions'),
          import('../../lib/peerFeedback'),
        ]);
        const [saved, compliments] = await Promise.all([
          loadSavedComposition(classSaveCode),
          getPeerCompliments(classSaveCode),
        ]);
        if (cancelled || !saved) return;
        if (saved.feedback_at || compliments.length > 0) {
          useAppStore.getState().setReceivedFeedback({
            sticker: saved.feedback_sticker ?? null,
            level: saved.feedback_level ?? null,
            text: saved.feedback_text ?? null,
            at: saved.feedback_at ?? null,
            compliments,
          });
        }
      } catch (err) {
        logger.warn('Feedback verversen op het podium mislukt', err);
      }
    })();
    return () => { cancelled = true; };
  }, [classSession, classSaveCode]);

  // Exporteren telt als klaar zodra er één geslaagd is
  useEffect(() => {
    if (exportState === 'success' || videoExportState === 'success') setExported(true);
  }, [exportState, videoExportState]);

  // --- Versies: is er iets veranderd sinds de laatste inlevering/bewaring? ---
  const currentFingerprint = useMemo(
    () => compositionFingerprint(buildCompositionData(), compositionName),
    // buildCompositionData leest de stores; deze afhankelijkheden dekken alles
    // wat in de vingerafdruk zit
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tracks, totalBeats, sections, sequences, praatplaatPosition, compositionName],
  );
  const changed = !!versionInfo && versionInfo.fingerprint !== currentFingerprint;

  const isPraatplaat = !!activePraatplaat && !!praatplaatPosition;
  const hasTeacherFeedback = !!receivedFeedback?.at;
  const steps = deriveStageSteps({
    inClass: !!classSession,
    isPraatplaat,
    listened,
    hasTitle: compositionName.trim().length > 0,
    handedIn: submissionSynced,
    changedSinceHandIn: !!classSession && changed,
    saved: !!onlineSaveCode,
    changedSinceSave: !classSession && changed,
    hasTeacherFeedback,
    feedbackRead: hasTeacherFeedback && !!feedbackSeenAt && feedbackSeenAt >= (receivedFeedback?.at ?? ''),
    peerEnabled: !!classSession?.peerReview?.chips?.length,
    peerDone,
    exported,
  });

  // --- Handelingen ---
  const handleBackToStudio = useCallback(() => {
    stopAll();
    stopTimeline();
    setScreen('studio');
  }, [stopAll, stopTimeline, setScreen]);

  const handleListen = () => {
    stopTimeline();
    setListened(true);
    setShowPresentation(true);
  };

  const handleMoveSpot = () => {
    stopTimeline();
    useAppStore.getState().goToPraatplaatMove();
  };

  const handleJoin = (classCode: string, assignment: ActiveAssignment) => {
    void (async () => {
      const { classSessionFromAssignment } = await import('../../utils/compositionInit');
      const session = classSessionFromAssignment(classCode, assignment);
      if (!session) return;
      // Bewaarcode en klas sluiten elkaar uit: vanaf nu loopt alles via de klas
      storageService.clearSaveOnlineInfo();
      useAppStore.getState().setClassSession(session);
      handIn();
    })();
  };

  const handleFeedbackRead = () => {
    const at = receivedFeedback?.at;
    if (!at) return;
    const info = storageService.getClassFeedbackCode();
    if (info) storageService.setClassFeedbackCode({ ...info, lastSeenFeedbackAt: at });
    setFeedbackSeenAt(at);
  };

  const handleStartPeer = () => {
    stopTimeline();
    setShowPeerReview(true);
  };

  const handleExport = () => {
    exportMp3(tracks, librarySamples, compositionName.trim() || 'mijn-soundscape');
  };

  const handleVideoExport = () => {
    if (!activeStoryboard) return;
    exportVideo(activeStoryboard, tracks, librarySamples, totalBeats, sections, compositionName.trim() || 'mijn-soundscape');
  };

  const handleMoreSounds = () => {
    stopAll();
    stopTimeline();
    goToMap();
  };

  // Klasbewuste "Nieuwe soundscape" (A2)
  const [newWorkLoading, setNewWorkLoading] = useState(false);
  const [newWorkError, setNewWorkError] = useState<string | null>(null);
  const isPraatplaatClass = classSession?.assignmentType === 'praatplaat' && !!activePraatplaat;

  const handleNewSpot = useCallback(() => {
    stopAll();
    stopTimeline();
    useTimelineStore.getState().resetTimeline();
    // Nieuwe plek = nieuwe inzending; klas en praatplaat blijven
    useAppStore.setState({ praatplaatPosition: null, submissionId: null, submissionSynced: false, currentCompositionId: null, compositionTitle: '' });
    useLibraryStore.getState().clearLibrary();
    useAppStore.getState().goToPraatplaatSelect();
  }, [stopAll, stopTimeline]);

  const handleSameAssignment = useCallback(async () => {
    if (isPraatplaatClass) {
      setShowNewModal(false);
      handleNewSpot();
      return;
    }
    stopAll();
    stopTimeline();
    setNewWorkLoading(true);
    setNewWorkError(null);
    const { startAnotherForCurrentAssignment } = await import('../../utils/compositionInit');
    const result = await startAnotherForCurrentAssignment();
    setNewWorkLoading(false);
    if (result === 'ok') setShowNewModal(false);
    else setNewWorkError(t('newWork.error'));
  }, [isPraatplaatClass, handleNewSpot, stopAll, stopTimeline, setShowNewModal, t]);

  // --- Meldingen in de rechterkolom ---
  const toasts = [
    assignmentChanged ? { type: 'info' as const, message: t('podium.assignmentChanged') } : null,
    submitFeedback,
    syncFeedback,
    saveError ? { type: 'error' as const, message: saveError } : null,
  ].filter((x): x is { type: 'success' | 'error' | 'info'; message: string } => !!x);
  const exportMessages = [
    error, videoError, exportWarning, videoWarning,
    exportState === 'success' ? t('stage.exportSuccess') : null,
    videoExportState === 'success' ? t('stage.videoExportSuccess') : null,
  ].filter((m): m is string => !!m);

  const cardCode = classSession ? classSaveCode : onlineSaveCode;
  const statusChip = classSession
    ? <ClassSessionBadge />
    : onlineSaveCode
      ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-1 text-xs font-bold text-success-600">
          <Check className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">{t('podium.saved')}</span>
        </span>
      )
      : <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold text-text-muted whitespace-nowrap">{t('podium.noClass')}</span>;

  return (
    <div className="h-dvh flex flex-col bg-brand-900 overflow-hidden">
      {/* Docentbalk: alleen voor een ingelogde docent */}
      {isTeacher && (
        <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 sm:px-5 py-2 bg-brand-800 text-white">
          <GraduationCap className="w-4 h-4 text-accent-400" aria-hidden="true" />
          <b className="text-sm">{t('podium.teacher.label')}</b>
          <span className="flex-1" />
          <Button variant="secondary" size="sm" onClick={() => { stopTimeline(); setShowPresentation(true); }}>
            <Monitor className="w-4 h-4 mr-1.5" aria-hidden="true" />
            {t('podium.teacher.present')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowTemplateModal(true)}>
            <Flag className="w-4 h-4 mr-1.5" aria-hidden="true" />
            {t('podium.teacher.template')}
          </Button>
        </div>
      )}

      {/* Kop: studio · titel · status */}
      <header className="shrink-0 flex items-center gap-2 sm:gap-3 bg-bg-surface border-b border-border-subtle px-3 sm:px-5 py-2.5">
        <Button variant="secondary" size="sm" onClick={handleBackToStudio} disabled={isSubmitting} aria-label={t('stage.backToStudio')}>
          <ArrowLeft className="w-4 h-4 sm:mr-1.5" aria-hidden="true" />
          <span className="hidden sm:inline">{t('podium.studio')}</span>
        </Button>
        <label className="flex-1 min-w-0 flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-neutral-50 focus-within:bg-neutral-50">
          <input
            type="text"
            value={compositionName}
            onChange={(e) => setCompositionName(e.target.value)}
            readOnly={titleLocked}
            placeholder={t('podium.titlePlaceholder')}
            aria-label={t('podium.titleLabel')}
            maxLength={40}
            className="flex-1 min-w-0 bg-transparent text-lg sm:text-xl font-extrabold text-text-main placeholder:text-text-muted/60 focus:outline-none truncate"
          />
          {titleLocked
            ? <Lock className="w-4 h-4 text-text-muted shrink-0" aria-hidden="true" />
            : <Pencil className="w-4 h-4 text-text-muted shrink-0" aria-hidden="true" />}
        </label>
        <div className="shrink-0">{statusChip}</div>
      </header>

      {/* Beeld + stappen */}
      <main className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        {/* min-h = beeld (min 220px) + afspeelbalk (80px): op een liggende
            telefoon is 46dvh maar ±170px en viel de inhoud over de stappen */}
        <div className="h-[46dvh] min-h-[300px] lg:h-auto lg:min-h-0 lg:flex-1 min-w-0 flex shrink-0 lg:shrink">
          <StageVisual zoomed={zoomed} onPlayed={() => setListened(true)} />
        </div>
        <aside className="lg:w-[360px] shrink-0 bg-bg-app lg:overflow-y-auto px-4 py-4">
          <StageMission
            steps={steps}
            session={classSession}
            isPraatplaat={isPraatplaat}
            toasts={toasts}
            onListen={handleListen}
            listened={listened}
            title={compositionName}
            onTitleChange={setCompositionName}
            titleLocked={titleLocked}
            zoomed={zoomed}
            onToggleZoom={() => setZoomed((v) => !v)}
            onMoveSpot={handleMoveSpot}
            isSubmitting={isSubmitting}
            versionInfo={versionInfo}
            onHandIn={handIn}
            onlineSaveCode={onlineSaveCode}
            isSavingOnline={isSavingOnline}
            onSave={() => void saveOnline()}
            onJoinClass={() => setShowJoin(true)}
            onFeedbackRead={handleFeedbackRead}
            peerDone={peerDone}
            onStartPeer={handleStartPeer}
            hasVideo={!!activeStoryboard}
            exportState={exportState}
            exportProgress={progress}
            videoExportState={videoExportState}
            videoProgress={videoProgress}
            exportMessages={exportMessages}
            onExportMp3={handleExport}
            onExportVideo={handleVideoExport}
            cardCode={cardCode}
            onOpenCard={() => setShowCard(true)}
            onShare={() => setShowShareLinkModal(true)}
            onBackToStudio={handleBackToStudio}
            onMoreSounds={handleMoreSounds}
            onNew={() => { setNewWorkError(null); setShowNewModal(true); }}
            onFinish={() => setShowFinish(true)}
            canFinish={!!classSession && submissionSynced}
          />
        </aside>
      </main>

      {/* Klas: nog één voor deze opdracht of zelf iets nieuws (A2) */}
      {classSession && (
        <NewWorkChoiceModal
          isOpen={showNewModal}
          onClose={() => setShowNewModal(false)}
          className={classSession.className}
          isPraatplaat={isPraatplaatClass}
          handedIn={submissionSynced}
          onSameAssignment={handleSameAssignment}
          onFresh={handleNewComposition}
          isLoading={newWorkLoading}
          error={newWorkError}
        />
      )}

      {/* Klaar, ik stop (E1): werk van deze gedeelde computer halen */}
      <Modal isOpen={showFinish} onClose={() => setShowFinish(false)} title={t('podium.finish.title')} size="sm">
        <p className="text-text-muted text-sm mb-3 leading-relaxed text-center">{t('podium.finish.text')}</p>
        {classSaveCode && (
          <p className="text-center mb-5 text-sm text-text-main">
            {t('podium.finish.code')}{' '}
            <span className="font-mono text-lg font-extrabold tracking-widest">{classSaveCode}</span>
          </p>
        )}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowFinish(false)} className="flex-1">{t('common.cancel')}</Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => {
              stopAll();
              stopTimeline();
              setShowFinish(false);
              void import('../../utils/finishSession').then(({ finishSession }) => finishSession());
            }}
          >
            {t('podium.finish.button')}
          </Button>
        </div>
      </Modal>

      {/* Zonder klas: bevestiging opnieuw beginnen */}
      <Modal isOpen={showNewModal && !classSession} onClose={() => setShowNewModal(false)} title={t('stage.newComposition')} size="sm">
        <p className="text-text-muted text-sm mb-6 leading-relaxed text-center">{t('stage.newCompositionConfirm')}</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowNewModal(false)} className="flex-1">{t('stage.cancel')}</Button>
          <Button variant="primary" onClick={handleNewComposition} className="flex-1">{t('stage.newComposition')}</Button>
        </div>
      </Modal>

      {/* Luister: schermvullende presentatie van de live soundscape (2.4) */}
      {showPresentation && (
        <PresentationSurface
          playlist={[{
            id: 'stage-live',
            student_name: '',
            composition_name: compositionName.trim() || t('podium.yourSoundscape'),
            composition_data: buildCompositionData(),
            created_at: new Date().toISOString(),
          }]}
          mode="public"
          onClose={() => setShowPresentation(false)}
          respectLoop
        />
      )}

      {/* Feedback klasgenoten (2.6) */}
      {classSession?.peerReview && submissionId && submissionSynced && (
        <PeerReviewModal
          isOpen={showPeerReview}
          onClose={() => setShowPeerReview(false)}
          classCode={classSession.classCode}
          ownSubmissionId={submissionId}
          chips={classSession.peerReview.chips}
          onReviewed={() => setPeerDoneState(setPeerDone(submissionId, getPeerDone(submissionId) + 1))}
          onCapReached={() => setPeerDoneState(setPeerDone(submissionId, 3))}
        />
      )}

      {cardCode && (
        <MusicCardModal
          isOpen={showCard}
          onClose={() => setShowCard(false)}
          code={cardCode}
          title={compositionName.trim() || t('podium.yourSoundscape')}
        />
      )}

      <JoinClassModal isOpen={showJoin} onClose={() => setShowJoin(false)} onJoin={handleJoin} />

      {showShareLinkModal && (
        <ShareLinkModal
          compositionName={compositionName.trim() || t('stage.defaultName')}
          compositionData={buildCompositionData()}
          onClose={() => setShowShareLinkModal(false)}
        />
      )}

      {showTemplateModal && (
        <SaveAsTemplateModal
          compositionData={buildCompositionData({ includePraatplaat: false })}
          defaultName={compositionName.trim() || t('stage.defaultName')}
          onClose={() => setShowTemplateModal(false)}
        />
      )}
    </div>
  );
}

export default StageView;
