/**
 * ClubView - Performance/playback screen
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
  Music,
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
import { cn } from '../../utils/cn';

interface AudienceMember {
  icon: LucideIcon;
  className: string;
}

const AUDIENCE: AudienceMember[] = [
  { icon: Baby, className: 'text-pink-300' },
  { icon: User, className: 'text-blue-300' },
  { icon: PersonStanding, className: 'text-amber-300' },
  { icon: UserRound, className: 'text-purple-300' },
  { icon: User, className: 'text-cyan-300' },
  { icon: PersonStanding, className: 'text-green-300' },
  { icon: UserRound, className: 'text-orange-300' },
  { icon: User, className: 'text-red-300' },
  { icon: Dog, className: 'text-yellow-300' },
  { icon: Cat, className: 'text-emerald-300' },
];

export function ClubView() {
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
    <div className="min-h-screen flex flex-col bg-club-bg text-white overflow-hidden">
      {/* Background: solid color — replace with podium/stage artwork when available */}
      {/* Stage lights effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 left-1/4 w-64 h-96 bg-accent-400/10 rotate-12 blur-3xl" />
        <div className="absolute -top-20 right-1/4 w-64 h-96 bg-club-highlight-muted/10 -rotate-12 blur-3xl" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-80 bg-white/5 blur-3xl" />
      </div>

      {/* Navigation */}
      <div className="relative z-10 flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToStudio}
          className="bg-white/10 hover:bg-white/20 active:bg-white/30 text-white"
        >
          <span className="hidden sm:inline">{t('club.backToStudio')}</span>
          <span className="sm:hidden">{t('common.back')}</span>
        </Button>
        <h1 className="text-base sm:text-lg font-bold text-accent-300">{t('club.title')}</h1>
        <div className="w-16 sm:w-24" /> {/* Spacer for centering */}
      </div>

      {/* Main stage area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 gap-4 sm:gap-6">
        {/* Composition name input */}
        <div className="w-full max-w-[280px] sm:max-w-sm">
          <label className="block text-[10px] sm:text-xs text-club-text font-medium mb-1 text-center">
            {t('club.nameComposition')}
          </label>
          <input
            type="text"
            value={compositionName}
            onChange={(e) => setCompositionName(e.target.value)}
            placeholder={t('club.namePlaceholder')}
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/10 border-2 border-club-border/30 rounded-lg sm:rounded-xl text-center text-white text-base sm:text-lg font-semibold placeholder:text-club-border/50 focus:outline-none focus:border-accent-400/60 transition-colors"
          />
        </div>

        {/* Stage visual / Now playing indicator */}
        <div className="relative flex items-center justify-center">
          <div
            className={`
              w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center
              bg-gradient-to-br from-accent-400/30 to-club-highlight/30
              border-2 border-accent-400/40
              ${isPlaying ? 'animate-stage-pulse' : ''}
            `}
          >
            <Music className="w-10 h-10 sm:w-12 sm:h-12 text-accent-300" />
          </div>

          {/* Animated rings when playing */}
          {isPlaying && (
            <>
              <div className="absolute inset-0 w-28 h-28 sm:w-36 sm:h-36 rounded-full border-2 border-accent-400/20 animate-stage-ring-1" />
              <div className="absolute -inset-3 sm:-inset-4 w-34 h-34 sm:w-44 sm:h-44 rounded-full border border-club-highlight-muted/15 animate-stage-ring-2" />
              <div className="absolute -inset-6 sm:-inset-8 w-40 h-40 sm:w-52 sm:h-52 rounded-full border border-club-text/10 animate-stage-ring-3" />
            </>
          )}
        </div>

        {/* Now playing text */}
        {isPlaying && (
          <p className="text-accent-300 text-xs sm:text-sm font-medium animate-pulse">
            {t('club.nowPlaying')}
          </p>
        )}

        {/* Playback controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={isPlaying ? handleStop : handlePlay}
            className={cn(
              'w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full transition-all cursor-pointer',
              'bg-accent-400 hover:bg-accent-500 active:bg-accent-600 active:scale-95 text-accent-900 shadow-lg shadow-accent-400/30'
            )}
          >
            {isPlaying ? <Square className="w-5 h-5 sm:w-6 sm:h-6" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>
          <button
            onClick={handlePlayAgain}
            className={cn(
              'w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all cursor-pointer',
              'bg-white/15 hover:bg-white/25 active:bg-white/35 active:scale-95 text-white shadow-md'
            )}
            title={t('club.playAgain')}
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-1 sm:mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveClick}
            disabled={saveSuccess}
            className="bg-accent-500/30 hover:bg-accent-500/50 text-accent-200 disabled:opacity-70"
          >
            {saveSuccess ? (
              <>
                <Check size={16} className="mr-1.5" />
                {t('club.saved')}
              </>
            ) : (
              <>
                <Save size={16} className="mr-1.5" />
                {t('club.save')}
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            disabled={exportState === 'exporting'}
            className="bg-success-500/30 hover:bg-success-500/50 text-success-200 disabled:opacity-50"
          >
            {exportState === 'exporting' ? (
              <>
                <Loader2 size={16} className="mr-1.5 animate-spin" />
                {t('club.exporting')} {progress}%
              </>
            ) : (
              <>
                <Download size={16} className="mr-1.5" />
                {t('club.download')}
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNewModal(true)}
            className="bg-club-highlight/30 hover:bg-club-highlight/50 text-club-highlight-text"
          >
            {t('club.newComposition')}
          </Button>
        </div>

        {/* Export error message */}
        {error && (
          <p className="text-error-400 text-sm text-center">{error}</p>
        )}

        {/* Export success message */}
        {exportState === 'success' && (
          <p className="text-success-400 text-sm text-center">{t('club.exportSuccess')}</p>
        )}
      </div>

      {/* Audience */}
      <div className="relative z-10 px-2 sm:px-4 py-3 sm:py-4">
        <div className={`flex justify-center gap-2 sm:gap-3 ${isPlaying ? 'animate-audience-bounce' : ''}`}>
          {AUDIENCE.map((member, i) => {
            const Icon = member.icon;
            return (
              <span
                key={i}
                className="select-none"
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
        title={t('club.newComposition')}
        size="sm"
        className="bg-club-surface border-club-surface-border text-white"
      >
        <p className="text-club-text-muted text-sm mb-6 leading-relaxed text-center">
          {t('club.newCompositionConfirm')}
        </p>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => setShowNewModal(false)}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white"
          >
            {t('club.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleNewComposition}
            className="flex-1 bg-club-highlight hover:bg-club-highlight-hover"
          >
            {t('club.newComposition')}
          </Button>
        </div>
      </Modal>

      {/* Save warning modal */}
      <Modal
        isOpen={showSaveWarning}
        onClose={() => setShowSaveWarning(false)}
        title={t('club.saveTitle')}
        size="sm"
        className="bg-club-surface border-club-surface-border text-white"
      >
        <p className="text-club-text-muted text-sm mb-4 leading-relaxed">
          {t('club.saveWarning')}
        </p>
        <label className="flex items-center gap-2 text-sm text-club-text-muted mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={dontShowWarningAgain}
            onChange={(e) => setDontShowWarningAgain(e.target.checked)}
            className="rounded border-club-border bg-club-surface"
          />
          {t('club.dontShowAgain')}
        </label>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => setShowSaveWarning(false)}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white"
          >
            {t('club.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveConfirm}
            className="flex-1 bg-accent-500 hover:bg-accent-600"
          >
            {t('club.save')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
