/**
 * StageView - Performance/playback screen (layout + orchestration)
 *
 * Delegates to:
 * - StagePlayback — playback controls + audience
 * - useStageSave — save/warning logic
 * - useStageModals — modal state management
 * - useAudioCleanup — audio cleanup on unmount
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Save,
  Check,
  ArrowLeft,
  MapPin,
  Headphones,
} from 'lucide-react';
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
import { Button, Modal } from '../ui';
import { ShareWithTeacherModal, ShareLinkModal, SaveOnlineModal } from '../share';
import { storageService } from '../../services/StorageService';
import { SaveAsTemplateModal } from './SaveAsTemplateModal';
import { StageActionsModal } from './StageActionsModal';
import { PresentationSurface } from '../presentation/PresentationSurface';
import { PeerReviewModal } from './PeerReviewModal';
import { StagePlayback, StageAudience } from './StagePlayback';
import { StorytellingDisplay } from './StorytellingDisplay';
import { ClassSessionBadge } from '../ui/ClassSessionBadge';
import { FeedbackBanner } from '../common/FeedbackBanner';
import { logger } from '../../utils/logger';

export function StageView() {
  const { t } = useTranslation();
  const setScreen = useAppStore((s) => s.setScreen);
  const activeStoryboard = useAppStore((s) => s.activeStoryboard);
  const classSession = useAppStore((s) => s.classSession);
  const librarySamples = useLibraryStore((s) => s.librarySamples);
  const tracks = useTimelineStore((s) => s.tracks);
  const bpm = useTimelineStore((s) => s.bpm);
  const totalBeats = useTimelineStore((s) => s.totalBeats);
  const isLooping = useTimelineStore((s) => s.isLooping);
  const sections = useTimelineStore((s) => s.sections);
  const { stopAll } = useAudioEngine();

  // Template feature: only for logged-in teachers
  const { isTeacher } = useAuth();
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);

  // Presenteren op het digibord (fase 2): snapshot van de live compositie
  // in het universele presentatiescherm — puur weergave, geen opslag
  // (activePraatplaat wordt verderop al gelezen voor de succes-modal)
  const praatplaatPosition = useAppStore((s) => s.praatplaatPosition);
  const [showPresentation, setShowPresentation] = useState(false);

  // Peer-review "Luister naar klasgenoten" (migratie 027): beschikbaar zodra
  // de eigen inzending gesynchroniseerd is en de docent het aan heeft staan
  const submissionId = useAppStore((s) => s.submissionId);
  const submissionSynced = useAppStore((s) => s.submissionSynced);
  const [showPeerReview, setShowPeerReview] = useState(false);
  const peerReviewAvailable = !!classSession?.peerReview?.chips?.length && !!submissionId && submissionSynced;

  // Audio export hook
  const { exportState, progress, error, warning: exportWarning, exportMp3 } = useAudioExport();

  // Video export hook (storyboard/image mode only)
  const {
    videoExportState,
    videoProgress,
    videoError,
    videoWarning,
    exportVideo,
  } = useVideoExport();

  // Audio cleanup on unmount
  useAudioCleanup();

  // Save logic (extracted hook)
  const {
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
    classSaveCode,
  } = useStageSave();

  // Podium = feedback-thuis (testronde 2): bij het openen stil de laatste
  // docent-feedback + klasgenoot-beoordelingen ophalen zodra we een eigen
  // bewaarcode kennen. Faalt geruisloos (nice-to-have); het feedbackblok
  // verschijnt alleen als er echt iets te tonen is.
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

  // Modal state (extracted hook)
  const {
    showNewModal,
    setShowNewModal,
    showShareModal,
    setShowShareModal,
    showShareLinkModal,
    setShowShareLinkModal,
    showSaveOnlineModal,
    setShowSaveOnlineModal,
    handleNewComposition,
  } = useStageModals();

  // Praatplaat success modal
  const activePraatplaat = useAppStore((s) => s.activePraatplaat);
  const goToPraatplaatSelect = useAppStore((s) => s.goToPraatplaatSelect);
  const clearAllTracks = useTimelineStore((s) => s.clearAllTracks);
  const [praatplaatSuccessDismissed, setPraatplaatSuccessDismissed] = useState(false);
  const [showNewSpotModal, setShowNewSpotModal] = useState(false);
  const showPraatplaatSuccess = praatplaatSubmitted && !!activePraatplaat && !praatplaatSuccessDismissed;

  const handleNewSpot = useCallback(() => {
    stopAll();
    clearAllTracks();
    // Clear position + submissionId but keep activePraatplaat + classSession
    // so student can pick a new spot and create a NEW submission
    useAppStore.setState({ praatplaatPosition: null, submissionId: null, submissionSynced: false });
    useLibraryStore.getState().clearLibrary();
    setPraatplaatSuccessDismissed(true);
    goToPraatplaatSelect();
  }, [stopAll, clearAllTracks, goToPraatplaatSelect]);

  const handleBackToStudio = useCallback(() => {
    stopAll();
    setScreen('studio');
  }, [stopAll, setScreen]);

  const handleExport = useCallback(() => {
    const filename = compositionName.trim() || 'mijn-compositie';
    exportMp3(tracks, librarySamples, filename);
  }, [exportMp3, tracks, librarySamples, compositionName]);

  const handleVideoExport = useCallback(() => {
    if (!activeStoryboard) return;
    const filename = compositionName.trim() || 'mijn-compositie';
    exportVideo(activeStoryboard, tracks, librarySamples, totalBeats, sections, filename);
  }, [exportVideo, activeStoryboard, tracks, librarySamples, totalBeats, sections, compositionName]);

  return (
    <div className="min-h-screen flex flex-col bg-brand-900 overflow-hidden">
      {/* Stage lights background effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-96 h-[500px] bg-gradient-to-b from-stage-light-purple/20 via-stage-light-purple/5 to-transparent rotate-12 blur-3xl" />
        <div className="absolute -top-32 right-1/4 w-96 h-[500px] bg-gradient-to-b from-stage-light-pink/20 via-stage-light-pink/5 to-transparent -rotate-12 blur-3xl" />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-[400px] bg-gradient-to-b from-stage-light-amber/15 via-stage-light-amber/5 to-transparent blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-gradient-to-r from-stage-light-blue/15 via-stage-light-blue/5 to-transparent blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-gradient-to-l from-stage-light-cyan/15 via-stage-light-cyan/5 to-transparent blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-80 h-60 bg-gradient-to-t from-stage-light-emerald/10 via-stage-light-emerald/5 to-transparent blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 w-80 h-60 bg-gradient-to-t from-stage-light-pink/10 via-stage-light-pink/5 to-transparent blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative z-10 bg-bg-surface border-b border-border-subtle px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleBackToStudio}
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span className="hidden sm:inline">{t('stage.backToStudio')}</span>
          <span className="sm:hidden">{t('common.back')}</span>
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg sm:text-xl font-bold text-text-main">{t('stage.title')}</h1>
          <ClassSessionBadge />
        </div>
        <div className="w-16 sm:w-28" />
      </div>

      {/* Submit feedback toast */}
      {submitFeedback && (
        <div
          className={`relative z-20 mx-auto mt-2 px-4 py-2 rounded-lg text-sm font-medium text-center max-w-sm transition-all ${
            submitFeedback.type === 'success'
              ? 'bg-success-600/90 text-white'
              : 'bg-error-600/90 text-white cursor-pointer'
          }`}
          onClick={submitFeedback.type === 'error' ? () => setSubmitFeedback(null) : undefined}
          role={submitFeedback.type === 'error' ? 'alert' : 'status'}
        >
          {submitFeedback.message}
        </div>
      )}

      {/* Save error toast (TP5-11) */}
      {saveError && (
        <div className="relative z-20 mx-auto mt-2 px-4 py-2 rounded-lg text-sm font-medium text-center max-w-sm bg-error-600/90 text-white" role="alert">
          {saveError}
        </div>
      )}

      {/* Bewaarcode sync feedback toast (TP5-12) */}
      {syncFeedback && (
        <div
          className={`relative z-20 mx-auto mt-2 px-4 py-2 rounded-lg text-sm font-medium text-center max-w-sm ${
            syncFeedback.type === 'success'
              ? 'bg-success-600/90 text-white'
              : 'bg-warning-600/90 text-white'
          }`}
          role={syncFeedback.type === 'error' ? 'alert' : 'status'}
        >
          {syncFeedback.message}
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-bg-surface rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col items-center gap-6 sm:gap-8">
          {/* Title */}
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-text-main tracking-tight">
              {t('stage.subtitle')}
            </h2>
            <p className="text-sm sm:text-base text-text-muted mt-1">
              {t('stage.nameComposition')}
            </p>
          </div>

          {/* Composition name input */}
          <div className="w-full max-w-sm">
            <input
              type="text"
              value={compositionName}
              onChange={(e) => setCompositionName(e.target.value)}
              placeholder={t('stage.namePlaceholder')}
              className="w-full px-4 py-3 bg-neutral-50 border-2 border-border-subtle rounded-xl text-center text-text-main text-lg font-semibold placeholder:text-text-muted/50 focus:outline-none focus:border-accent-400 transition-colors"
            />
          </div>

          {/* Storytelling image display (#41) */}
          {activeStoryboard && <StorytellingDisplay />}

          {/* Playback controls (extracted component) */}
          <StagePlayback />

          {/* Feedbackblok (testronde 2): docent-feedback + klasgenoot-
              beoordelingen — rendert alleen als er echt iets te tonen is */}
          <FeedbackBanner />

          {/* Action buttons — één ingang: "Opslaan & Delen" opent de
              gecombineerde modal (testronde 3, ontwerp Bert) */}
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowActionsModal(true)}
              className="w-full"
            >
              {saveSuccess ? (
                <>
                  <Check size={20} className="mr-2" />
                  {t('stage.saved')}
                </>
              ) : (
                <>
                  <Save size={20} className="mr-2" />
                  {t('stage.saveAndShare')}
                </>
              )}
            </Button>

            {/* Peer-review: luister naar klasgenoten (migratie 027) */}
            {peerReviewAvailable && (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setShowPeerReview(true)}
                className="w-full"
              >
                <Headphones size={20} className="mr-2" />
                {t('peerReview.openButton')}
              </Button>
            )}

            {/* "Nieuwe plek" button — visible after praatplaat submission */}
            {praatplaatSubmitted && activePraatplaat && (
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setShowNewSpotModal(true)}
                className="w-full text-text-muted hover:text-text-main"
              >
                <MapPin size={20} className="mr-2" />
                {t('stage.praatplaatNewSpot')}
              </Button>
            )}

            <Button
              variant="ghost"
              size="lg"
              onClick={() => setShowNewModal(true)}
              className="w-full text-text-muted hover:text-text-main"
            >
              {t('stage.newComposition')}
            </Button>
          </div>

          {/* Export error/success messages */}
          {error && (
            <p className="text-error-500 text-sm text-center">{error}</p>
          )}
          {exportState === 'success' && (
            <p className="text-success-600 text-sm text-center">{t('stage.exportSuccess')}</p>
          )}
          {videoError && (
            <p className="text-error-500 text-sm text-center">{videoError}</p>
          )}
          {videoExportState === 'success' && (
            <p className="text-success-600 text-sm text-center">{t('stage.videoExportSuccess')}</p>
          )}
          {praatplaatSubmitted && !showPraatplaatSuccess && (
            <p className="text-success-600 text-sm text-center font-medium">{t('stage.praatplaatSubmitted')}</p>
          )}

          {/* Persoonlijke bewaarcode na inleveren (feedback-terugweg, migratie 026) */}
          {classSession && classSaveCode && (
            <div className="w-full max-w-xs rounded-2xl border-2 border-accent-200 bg-accent-50 px-4 py-3 text-center">
              <p className="text-sm font-bold text-text-main">
                {t('stage.yourCodeTitle')}{' '}
                <span className="font-mono text-lg font-extrabold tracking-widest text-accent-700">
                  {classSaveCode}
                </span>
              </p>
              <p className="text-xs text-text-muted mt-1">
                {t('stage.yourCodeHint')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Audience at bottom (extracted component) */}
      <StageAudience />

      {/* New composition confirmation modal */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title={t('stage.newComposition')}
        size="sm"
      >
        <p className="text-text-muted text-sm mb-6 leading-relaxed text-center">
          {t('stage.newCompositionConfirm')}
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowNewModal(false)}
            className="flex-1"
          >
            {t('stage.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleNewComposition}
            className="flex-1"
          >
            {t('stage.newComposition')}
          </Button>
        </div>
      </Modal>

      {/* Save warning modal */}
      <Modal
        isOpen={showSaveWarning}
        onClose={() => setShowSaveWarning(false)}
        title={t('stage.saveTitle')}
        size="sm"
      >
        <p className="text-text-muted text-sm mb-4 leading-relaxed">
          {t('stage.saveWarning')}
        </p>
        <label className="flex items-center gap-2 text-sm text-text-muted mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={dontShowWarningAgain}
            onChange={(e) => setDontShowWarningAgain(e.target.checked)}
            className="rounded border-border-subtle"
          />
          {t('stage.dontShowAgain')}
        </label>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowSaveWarning(false)}
            className="flex-1"
          >
            {t('stage.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveConfirm}
            className="flex-1"
          >
            {t('stage.save')}
          </Button>
        </div>
      </Modal>

      {/* Praatplaat success modal (#72) */}
      <Modal
        isOpen={showPraatplaatSuccess}
        onClose={() => setPraatplaatSuccessDismissed(true)}
        title={t('stage.praatplaatSuccessTitle')}
        size="sm"
      >
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-success-50 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-success-600" />
          </div>
          <p className="text-text-muted text-sm mb-6 leading-relaxed">
            {t('stage.praatplaatSuccessMessage')}
          </p>
          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              onClick={() => setPraatplaatSuccessDismissed(true)}
              className="w-full"
            >
              {t('stage.praatplaatContinue')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowNewSpotModal(true)}
              className="w-full"
            >
              <MapPin className="w-4 h-4 mr-1.5" />
              {t('stage.praatplaatNewSpot')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* New spot confirmation modal (UX-DEST-5) */}
      <Modal
        isOpen={showNewSpotModal}
        onClose={() => setShowNewSpotModal(false)}
        title={t('stage.praatplaatNewSpot')}
        size="sm"
      >
        <p className="text-text-muted text-sm mb-6 leading-relaxed text-center">
          {t('stage.newSpotConfirm')}
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowNewSpotModal(false)}
            className="flex-1"
          >
            {t('stage.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={() => { setShowNewSpotModal(false); handleNewSpot(); }}
            className="flex-1"
          >
            {t('stage.praatplaatNewSpot')}
          </Button>
        </div>
      </Modal>

      {/* Opslaan & Delen — gecombineerde modal (testronde 3) */}
      {showActionsModal && (
        <StageActionsModal
          compositionName={compositionName}
          hasStoryboard={!!activeStoryboard}
          isTeacher={isTeacher}
          hasClassSession={!!classSession}
          className={classSession?.className ?? null}
          classSaveCode={classSaveCode}
          submissionSynced={submissionSynced}
          saveSuccess={saveSuccess}
          exportState={exportState}
          exportProgress={progress}
          videoExportState={videoExportState}
          videoProgress={videoProgress}
          exportError={error}
          videoError={videoError}
          exportWarning={exportWarning}
          videoWarning={videoWarning}
          onSave={handleSaveClick}
          onPresent={() => { stopAll(); setShowPresentation(true); }}
          onExportMp3={handleExport}
          onExportVideo={handleVideoExport}
          onSaveOnline={() => setShowSaveOnlineModal(true)}
          onShareLink={() => setShowShareLinkModal(true)}
          onShareTeacher={() => setShowShareModal(true)}
          onSaveTemplate={() => setShowTemplateModal(true)}
          onClose={() => setShowActionsModal(false)}
        />
      )}

      {/* Presenteren op het digibord — snapshot van de live compositie */}
      {showPresentation && (
        <PresentationSurface
          playlist={[{
            id: 'stage-live',
            student_name: '',
            composition_name: compositionName.trim() || t('stage.defaultName'),
            composition_data: {
              tracks,
              bpm,
              totalBeats,
              isLooping,
              samples: librarySamples,
              sections: sections.length > 0 ? sections : undefined,
              storyboardId: activeStoryboard?.id,
              praatplaat: activePraatplaat ?? undefined,
              praatplaatPosition: praatplaatPosition ?? undefined,
            },
            created_at: new Date().toISOString(),
          }]}
          mode="public"
          onClose={() => setShowPresentation(false)}
          respectLoop
        />
      )}

      {/* Peer-review: luister naar klasgenoten (migratie 027) */}
      {peerReviewAvailable && classSession?.peerReview && submissionId && (
        <PeerReviewModal
          isOpen={showPeerReview}
          onClose={() => setShowPeerReview(false)}
          classCode={classSession.classCode}
          ownSubmissionId={submissionId}
          chips={classSession.peerReview.chips}
        />
      )}

      {/* Save online modal (#52) */}
      {showSaveOnlineModal && (
        <SaveOnlineModal
          compositionName={compositionName.trim() || t('stage.defaultName')}
          compositionData={{
            tracks,
            bpm,
            totalBeats,
            isLooping,
            samples: librarySamples,
            sections: sections.length > 0 ? sections : undefined,
            storyboardId: activeStoryboard?.id,
          }}
          onClose={() => setShowSaveOnlineModal(false)}
          onSaved={(saveCode, saveSecret) => {
            storageService.setSaveOnlineInfo(saveCode, saveSecret, compositionName.trim());
          }}
        />
      )}

      {/* Share link modal */}
      {showShareLinkModal && (
        <ShareLinkModal
          compositionName={compositionName.trim() || t('stage.defaultName')}
          compositionData={{
            tracks,
            bpm,
            totalBeats,
            isLooping,
            samples: librarySamples,
            sections: sections.length > 0 ? sections : undefined,
            storyboardId: activeStoryboard?.id,
          }}
          onClose={() => setShowShareLinkModal(false)}
        />
      )}

      {/* Save as template modal */}
      {showTemplateModal && (
        <SaveAsTemplateModal
          compositionData={{
            tracks,
            bpm,
            totalBeats,
            isLooping,
            samples: librarySamples,
            sections: sections.length > 0 ? sections : undefined,
            storyboardId: activeStoryboard?.id,
          }}
          defaultName={compositionName.trim() || t('stage.defaultName')}
          onClose={() => setShowTemplateModal(false)}
        />
      )}

      {/* Share with teacher modal */}
      {showShareModal && (
        <ShareWithTeacherModal
          compositionName={compositionName.trim() || t('stage.defaultName')}
          compositionData={{
            tracks,
            bpm,
            totalBeats,
            isLooping,
            samples: librarySamples,
            sections: sections.length > 0 ? sections : undefined,
            storyboardId: activeStoryboard?.id,
          }}
          onClose={() => setShowShareModal(false)}
          onSuccess={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

export default StageView;
