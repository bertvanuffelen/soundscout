/**
 * StageView - Performance/playback screen
 *
 * Uses extracted hooks for:
 * - Audio cleanup (useAudioCleanup)
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Play,
  Square,
  RotateCcw,
  User,
  UserRound,
  Baby,
  PersonStanding,
  Dog,
  Cat,
  Download,
  Loader2,
  Save,
  Check,
  Send,
  Link2,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { useAudioStore } from '../../stores/audioStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useAudioCleanup } from '../../hooks/useAudioCleanup';
import { useAudioExport } from '../../hooks/useAudioExport';
import { storageService } from '../../services/StorageService';
import { Button, Modal } from '../ui';
import { ShareWithTeacherModal, ShareLinkModal } from '../share';
import { cn } from '../../utils/cn';

interface AudienceMember {
  icon: LucideIcon;
  className: string;
}

const AUDIENCE: AudienceMember[] = [
  { icon: Baby, className: 'text-pink-400' },
  { icon: User, className: 'text-blue-400' },
  { icon: PersonStanding, className: 'text-amber-400' },
  { icon: UserRound, className: 'text-purple-400' },
  { icon: User, className: 'text-cyan-400' },
  { icon: PersonStanding, className: 'text-green-400' },
  { icon: UserRound, className: 'text-orange-400' },
  { icon: User, className: 'text-red-400' },
  { icon: Dog, className: 'text-yellow-400' },
  { icon: Cat, className: 'text-emerald-400' },
];

export function StageView() {
  const { t } = useTranslation();
  const setScreen = useGameStore((s) => s.setScreen);
  const currentLocationId = useGameStore((s) => s.currentLocationId);
  const currentCompositionId = useGameStore((s) => s.currentCompositionId);
  const goToLocation = useGameStore((s) => s.goToLocation);

  const librarySamples = useLibraryStore((s) => s.librarySamples);
  const clearLibrary = useLibraryStore((s) => s.clearLibrary);

  const tracks = useTimelineStore((s) => s.tracks);
  const bpm = useTimelineStore((s) => s.bpm);
  const totalBeats = useTimelineStore((s) => s.totalBeats);
  const isLooping = useTimelineStore((s) => s.isLooping);
  const clearAllTracks = useTimelineStore((s) => s.clearAllTracks);

  const isPlaying = useAudioStore((s) => s.isPlaying);

  const {
    loadSamples,
    scheduleTimeline,
    playTimeline,
    stopTimeline,
    stopAll,
  } = useAudioEngine();

  const [compositionName, setCompositionName] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showSaveWarning, setShowSaveWarning] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dontShowWarningAgain, setDontShowWarningAgain] = useState(() => {
    return localStorage.getItem('soundscout:hideSaveWarning') === 'true';
  });

  // Audio export hook
  const { exportState, progress, error, exportMp3 } = useAudioExport();

  // Audio cleanup on unmount
  useAudioCleanup();

  // Load composition name when editing an existing composition
  useEffect(() => {
    if (currentCompositionId) {
      const composition = storageService.getCompositionById(currentCompositionId);
      if (composition) {
        setCompositionName(composition.name);
      }
    }
  }, [currentCompositionId]);

  // Load samples on mount
  useEffect(() => {
    if (librarySamples.length > 0) {
      loadSamples(librarySamples);
    }
  }, [librarySamples, loadSamples]);

  const handlePlay = useCallback(() => {
    scheduleTimeline(tracks, librarySamples);
    playTimeline();
  }, [scheduleTimeline, playTimeline, librarySamples, tracks]);

  const handleStop = useCallback(() => {
    stopTimeline();
  }, [stopTimeline]);

  const handlePlayAgain = useCallback(() => {
    stopTimeline();
    // Small delay to let transport reset before re-scheduling
    setTimeout(() => {
      scheduleTimeline(tracks, librarySamples);
      playTimeline();
    }, 50);
  }, [stopTimeline, scheduleTimeline, playTimeline, librarySamples, tracks]);

  const handleBackToStudio = useCallback(() => {
    stopAll();
    setScreen('studio');
  }, [stopAll, setScreen]);

  const handleNewComposition = useCallback(() => {
    stopAll();
    clearAllTracks();
    clearLibrary();
    setShowNewModal(false);
    if (currentLocationId) {
      goToLocation(currentLocationId);
    } else {
      setScreen('start');
    }
  }, [stopAll, clearAllTracks, clearLibrary, currentLocationId, goToLocation, setScreen]);

  const handleExport = useCallback(() => {
    const filename = compositionName.trim() || 'mijn-compositie';
    exportMp3(tracks, librarySamples, filename);
  }, [exportMp3, tracks, librarySamples, compositionName]);

  const handleSaveClick = useCallback(() => {
    // Validate name
    if (!compositionName.trim()) {
      // Focus on input - name is required
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      input?.focus();
      return;
    }

    // Check if we should show warning
    if (!dontShowWarningAgain) {
      setShowSaveWarning(true);
    } else {
      performSave();
    }
  }, [compositionName, dontShowWarningAgain]);

  const performSave = useCallback(() => {
    const timelineState = {
      tracks,
      bpm,
      totalBeats,
      isPlaying: false,
      isLooping,
      currentBeat: 0,
    };

    if (currentCompositionId) {
      // Update existing composition
      storageService.updateComposition(currentCompositionId, {
        name: compositionName.trim(),
        timeline: timelineState,
        samples: librarySamples,
      });
    } else {
      // Create new composition
      storageService.saveComposition(compositionName.trim(), timelineState, librarySamples);
    }

    setShowSaveWarning(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  }, [compositionName, tracks, bpm, totalBeats, isLooping, librarySamples, currentCompositionId]);

  const handleSaveConfirm = useCallback(() => {
    if (dontShowWarningAgain) {
      localStorage.setItem('soundscout:hideSaveWarning', 'true');
    }
    performSave();
  }, [dontShowWarningAgain, performSave]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 overflow-hidden">
      {/* Stage lights background effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Top lights - spreading down */}
        <div className="absolute -top-32 left-1/4 w-96 h-[500px] bg-gradient-to-b from-purple-500/20 via-purple-500/5 to-transparent rotate-12 blur-3xl" />
        <div className="absolute -top-32 right-1/4 w-96 h-[500px] bg-gradient-to-b from-pink-500/20 via-pink-500/5 to-transparent -rotate-12 blur-3xl" />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-[400px] bg-gradient-to-b from-amber-400/15 via-amber-400/5 to-transparent blur-3xl" />

        {/* Side ambient lights */}
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-gradient-to-r from-blue-500/15 via-blue-500/5 to-transparent blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-gradient-to-l from-cyan-500/15 via-cyan-500/5 to-transparent blur-3xl" />

        {/* Bottom ambient glow */}
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
        <div className="w-16 sm:w-28" /> {/* Spacer for centering */}
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

          {/* Playback controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={isPlaying ? handleStop : handlePlay}
              className={cn(
                'w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full transition-all cursor-pointer',
                'bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white',
                'shadow-[0_6px_0_0_rgba(180,83,9,0.5)] hover:shadow-[0_6px_0_0_rgba(146,64,14,0.5)]',
                'active:shadow-[0_2px_0_0_rgba(180,83,9,0.5)] active:translate-y-[4px]'
              )}
            >
              {isPlaying ? <Square className="w-6 h-6 sm:w-8 sm:h-8" /> : <Play className="w-6 h-6 sm:w-8 sm:h-8 ml-1" />}
            </button>
            <button
              onClick={handlePlayAgain}
              className={cn(
                'w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full transition-all cursor-pointer',
                'bg-neutral-200 hover:bg-neutral-300 active:bg-neutral-400 text-neutral-700',
                'shadow-[0_4px_0_0_rgba(100,100,100,0.3)]',
                'active:shadow-[0_1px_0_0_rgba(100,100,100,0.3)] active:translate-y-[3px]'
              )}
              title={t('stage.playAgain')}
            >
              <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Now playing indicator */}
          {isPlaying && (
            <p className="text-primary-600 text-sm font-semibold animate-pulse">
              {t('stage.nowPlaying')}
            </p>
          )}

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

      {/* Audience at bottom */}
      <div className="relative z-10 bg-bg-surface border-t border-border-subtle px-4 py-3 sm:py-4">
        <div className={`flex justify-center gap-2 sm:gap-3 ${isPlaying ? 'animate-audience-bounce' : ''}`}>
          {AUDIENCE.map((member, i) => {
            const Icon = member.icon;
            return (
              <span
                key={i}
                className={cn('select-none transition-transform', member.className)}
                style={isPlaying ? { animationDelay: `${i * 0.12}s` } : undefined}
              >
                <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
              </span>
            );
          })}
        </div>
      </div>

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
          }}
          onClose={() => setShowShareLinkModal(false)}
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
          }}
          onClose={() => setShowShareModal(false)}
          onSuccess={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
