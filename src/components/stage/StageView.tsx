/**
 * StageView - Performance/playback screen (layout + orchestration)
 *
 * Delegates to:
 * - StagePlayback — playback controls + audience
 * - useStageSave — save/warning logic
 * - useStageModals — modal state management
 * - useAudioCleanup — audio cleanup on unmount
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  Loader2,
  Save,
  Check,
  Send,
  Link2,
  ArrowLeft,
  FileText,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { useAuth } from '../../contexts/AuthContext';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useAudioCleanup } from '../../hooks/useAudioCleanup';
import { useAudioExport } from '../../hooks/useAudioExport';
import { useStageSave } from '../../hooks/useStageSave';
import { useStageModals } from '../../hooks/useStageModals';
import { Button, Modal } from '../ui';
import { ShareWithTeacherModal, ShareLinkModal } from '../share';
import { SaveAsTemplateModal } from './SaveAsTemplateModal';
import { StagePlayback, StageAudience } from './StagePlayback';
import { StorytellingDisplay } from './StorytellingDisplay';

export function StageView() {
  const { t } = useTranslation();
  const setScreen = useAppStore((s) => s.setScreen);
  const activeStoryboard = useAppStore((s) => s.activeStoryboard);
  const librarySamples = useLibraryStore((s) => s.librarySamples);
  const tracks = useTimelineStore((s) => s.tracks);
  const bpm = useTimelineStore((s) => s.bpm);
  const totalBeats = useTimelineStore((s) => s.totalBeats);
  const isLooping = useTimelineStore((s) => s.isLooping);
  const sections = useTimelineStore((s) => s.sections);
  const { stopAll } = useAudioEngine();

  // Template feature: only for logged-in teachers
  const { isTeacher } = useAuth();
  const showTemplateOption = isTeacher;
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Audio export hook
  const { exportState, progress, error, exportMp3 } = useAudioExport();

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
  } = useStageSave();

  // Modal state (extracted hook)
  const {
    showNewModal,
    setShowNewModal,
    showShareModal,
    setShowShareModal,
    showShareLinkModal,
    setShowShareLinkModal,
    handleNewComposition,
  } = useStageModals();

  const handleBackToStudio = useCallback(() => {
    stopAll();
    setScreen('studio');
  }, [stopAll, setScreen]);

  const handleExport = useCallback(() => {
    const filename = compositionName.trim() || 'mijn-compositie';
    exportMp3(tracks, librarySamples, filename);
  }, [exportMp3, tracks, librarySamples, compositionName]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 overflow-hidden">
      {/* Stage lights background effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-96 h-[500px] bg-gradient-to-b from-purple-500/20 via-purple-500/5 to-transparent rotate-12 blur-3xl" />
        <div className="absolute -top-32 right-1/4 w-96 h-[500px] bg-gradient-to-b from-pink-500/20 via-pink-500/5 to-transparent -rotate-12 blur-3xl" />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-[400px] bg-gradient-to-b from-amber-400/15 via-amber-400/5 to-transparent blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-gradient-to-r from-blue-500/15 via-blue-500/5 to-transparent blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-gradient-to-l from-cyan-500/15 via-cyan-500/5 to-transparent blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-80 h-60 bg-gradient-to-t from-emerald-500/10 via-emerald-500/5 to-transparent blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 w-80 h-60 bg-gradient-to-t from-rose-500/10 via-rose-500/5 to-transparent blur-3xl" />
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
        <h1 className="text-lg sm:text-xl font-bold text-text-main">{t('stage.title')}</h1>
        <div className="w-16 sm:w-28" />
      </div>

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
              className="w-full px-4 py-3 bg-neutral-50 border-2 border-border-subtle rounded-xl text-center text-text-main text-lg font-semibold placeholder:text-text-muted/50 focus:outline-none focus:border-primary-400 transition-colors"
            />
          </div>

          {/* Storytelling image display (#41) */}
          {activeStoryboard && <StorytellingDisplay />}

          {/* Playback controls (extracted component) */}
          <StagePlayback />

          {/* Action buttons */}
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button
              variant="primary"
              size="lg"
              onClick={handleSaveClick}
              disabled={saveSuccess}
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
                  {t('stage.save')}
                </>
              )}
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={handleExport}
              disabled={exportState === 'exporting'}
              className="w-full"
            >
              {exportState === 'exporting' ? (
                <>
                  <Loader2 size={20} className="mr-2 animate-spin" />
                  {t('stage.exporting')} {progress}%
                </>
              ) : (
                <>
                  <Download size={20} className="mr-2" />
                  {t('stage.download')}
                </>
              )}
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={() => setShowShareLinkModal(true)}
              disabled={!compositionName.trim()}
              className="w-full"
              title={!compositionName.trim() ? t('stage.nameRequired') : ''}
            >
              <Link2 size={20} className="mr-2" />
              {t('share.shareLink')}
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={() => setShowShareModal(true)}
              disabled={!compositionName.trim()}
              className="w-full"
              title={!compositionName.trim() ? t('stage.nameRequired') : ''}
            >
              <Send size={20} className="mr-2" />
              {t('stage.shareWithTeacher')}
            </Button>

            {/* Opslaan als template — alleen voor docenten met dev flag */}
            {showTemplateOption && (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setShowTemplateModal(true)}
                disabled={!compositionName.trim()}
                className="w-full"
                title={!compositionName.trim() ? t('stage.nameRequired') : ''}
              >
                <FileText size={20} className="mr-2" />
                {t('templates.saveAsTemplate')}
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
