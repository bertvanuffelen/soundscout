/**
 * SubmissionPlayer - Fullscreen modal voor het bekijken en afspelen van een leerling compositie
 *
 * Features:
 * - Fullscreen modal met timeline weergave (read-only)
 * - Playhead die meebeweegt tijdens afspelen
 * - Play/Pause en Stop controls
 */

import { useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Music, AlertCircle, Play, Pause, SkipBack, ImageIcon } from 'lucide-react';
import type { Submission } from '../../hooks/useSubmissions';
import type { FeedbackSticker } from '../../lib/submissions';
import { Timeline } from '../studio/Timeline';
import { StoryboardViewer } from '../ui/StoryboardViewer';
import { FeedbackPanel } from './FeedbackPanel';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { useCompositionPlayback } from '../../hooks/useCompositionPlayback';
import { resolveStoryboard } from '../../utils/resolveStoryboard';
import { DEFAULT_BPM } from '../../constants/config';

interface SubmissionPlayerProps {
  submission: Submission;
  onClose: () => void;
  /** Feedback-paneel tonen + opslaan (alleen docent-context, migratie 026) */
  onSetFeedback?: (feedback: {
    sticker: FeedbackSticker | null;
    level: number | null;
    text: string | null;
  }) => Promise<void>;
  /** "Gezien"-stempel bij openen (alleen docent-context) */
  onMarkSeen?: () => void;
}

export function SubmissionPlayer({ submission, onClose, onSetFeedback, onMarkSeen }: SubmissionPlayerProps) {
  const { t } = useTranslation();

  // "Gezien"-stempel: eenmalig bij openen (ref zodat een wisselende callback
  // geen tweede aanroep triggert)
  const markSeenRef = useRef(onMarkSeen);
  markSeenRef.current = onMarkSeen;
  useEffect(() => {
    markSeenRef.current?.();
  }, []);
  const { student_name, composition_name, composition_data, created_at } = submission;

  // Format datum
  const formattedDate = new Date(created_at).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Haal info uit composition_data als beschikbaar
  const tracks = composition_data?.tracks || [];
  const samples = composition_data?.samples || [];
  const totalBeats = composition_data?.totalBeats || 16;
  const bpm = composition_data?.bpm || DEFAULT_BPM;

  const storyboard = resolveStoryboard(composition_data);
  const sections = composition_data?.sections ?? [];

  // Gedeeld afspeel-fundament (presentatiescherm fase 1): laden (met
  // progress), transport met pause/resume, beat-tracking en einde-afspelen.
  // respectLoop default aan: een loopende compositie loopt hier ook echt.
  const {
    state: playbackState,
    currentBeat,
    loadingProgress,
    errorMessage,
    play: playComposition,
    pause: pauseComposition,
    stop: stopComposition,
    seek: seekComposition,
  } = useCompositionPlayback(composition_data ?? null);

  const trackCount = tracks.filter((t) => t.clips?.length > 0).length;
  const clipCount = tracks.reduce(
    (total, track) => total + (track.clips?.length || 0),
    0
  );

  // Play/Pause toggle handler (pause/resume + schedule zit in de hook)
  const handlePlayPause = useCallback(() => {
    if (playbackState === 'playing') {
      pauseComposition();
    } else {
      playComposition();
    }
  }, [playbackState, playComposition, pauseComposition]);

  const handleStop = useCallback(() => {
    stopComposition();
  }, [stopComposition]);

  // Seek handler - for playhead scrubbing
  const handleSeek = useCallback((beat: number) => {
    seekComposition(beat);
  }, [seekComposition]);

  // Close handler - stop audio first
  const handleClose = useCallback(() => {
    stopComposition();
    onClose();
  }, [stopComposition, onClose]);

  // Dialog-gedrag (bug 2b: Escape sloot deze overlay niet): Escape,
  // focus-trap en scroll-lock via de gedeelde hook. autoFocus uit zodat de
  // focus niet ongevraagd naar de sluitknop springt bij het openen.
  const dialogRef = useModalBehavior(handleClose, { autoFocus: false });

  // Determine if we should show the timeline (not during loading/error)
  // Geen samples = niets af te spelen: toon de bestaande foutstaat
  const noSamples = samples.length === 0;
  const effectiveState = noSamples ? 'error' : playbackState;
  const showTimeline = effectiveState !== 'loading' && effectiveState !== 'idle' && effectiveState !== 'error';
  const isPlaying = effectiveState === 'playing';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-3 sm:p-4 md:p-6 z-50">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={composition_name}
        className="bg-bg-surface rounded-2xl shadow-2xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="relative px-4 sm:px-6 py-4 border-b border-border-subtle shrink-0">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-text-muted hover:text-text-main p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Composition info */}
          <h2 className="text-xl sm:text-2xl font-bold text-text-main pr-12">
            {composition_name}
          </h2>
          <p className="text-text-muted mt-1">
            {t('teacher.submissionPlayer.by')} <span className="font-medium text-text-main">{student_name}</span>
            <span className="mx-2">•</span>
            {formattedDate}
          </p>

          {/* Metadata */}
          <div className="flex gap-4 sm:gap-6 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-xl font-bold text-accent-600">{trackCount}</span>
              <span className="text-text-muted text-sm">{t('common.tracks')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-xl font-bold text-accent-600">{clipCount}</span>
              <span className="text-text-muted text-sm">{t('common.clips')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-xl font-bold text-accent-600">{samples.length}</span>
              <span className="text-text-muted text-sm">{t('common.samples')}</span>
            </div>
            {storyboard && (
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-accent-600" />
                <span className="text-text-muted text-sm">{t('teacher.submissionPlayer.withStoryboard')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Loading state */}
          {(effectiveState === 'loading' || effectiveState === 'idle') && (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-xs">
                <Music className="w-16 h-16 text-accent-500 mx-auto mb-4 animate-pulse" />
                <p className="text-text-main font-medium mb-3">{t('teacher.submissionPlayer.loading')}</p>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div
                    className="bg-accent-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                <p className="text-text-muted text-sm mt-2">{loadingProgress}%</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {effectiveState === 'error' && (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-xs">
                <AlertCircle className="w-16 h-16 text-error-500 mx-auto mb-4" />
                <p className="text-error-600 font-medium mb-2">{noSamples ? t('teacher.submissionPlayer.noSamplesError') : errorMessage ?? t('teacher.submissionPlayer.audioLoadError')}</p>
                <p className="text-text-muted text-sm">
                  {t('teacher.submissionPlayer.errorHint')}
                </p>
              </div>
            </div>
          )}

          {/* Storyboard + Timeline */}
          {showTimeline && (
            <div className={`flex-1 flex min-h-0 overflow-hidden ${storyboard ? 'flex-col' : ''}`}>
              {/* Storyboard image (synced with playhead) */}
              {storyboard && (
                <div className="shrink-0 border-b border-border-subtle bg-neutral-50">
                  <StoryboardViewer
                    storyboard={storyboard}
                    currentBeat={currentBeat}
                    totalBeats={totalBeats}
                    sections={sections}
                    compact
                    isPlaying={isPlaying}
                    onPlayPause={handlePlayPause}
                    onStop={handleStop}
                  />
                </div>
              )}

              {/* Timeline (read-only) */}
              <div className="flex-1 overflow-hidden min-h-0">
                <Timeline
                  tracks={tracks}
                  bpm={bpm}
                  totalBeats={totalBeats}
                  currentBeat={currentBeat}
                  isPlaying={isPlaying}
                  onSeek={handleSeek}
                  snapPreview={null}
                  readOnly={true}
                  samples={samples}
                  sections={sections}
                />
              </div>
            </div>
          )}
        </div>

        {/* Docent-feedback (alleen in docent-context) */}
        {onSetFeedback && (
          <FeedbackPanel submission={submission} onSave={onSetFeedback} />
        )}

        {/* Transport controls */}
        {showTimeline && (
          <div className="px-4 sm:px-6 py-4 sm:py-6 border-t border-border-subtle bg-neutral-50 shrink-0">
            <div className="flex justify-center gap-4">
              {/* Play/Pause button */}
              <button
                onClick={handlePlayPause}
                className="w-16 h-16 sm:w-20 sm:h-20 bg-accent-400 hover:bg-accent-500 active:bg-accent-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-accent-400/30 transition-all active:scale-95"
                title={isPlaying ? t('common.pause') : t('common.play')}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 sm:w-10 sm:h-10" />
                ) : (
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 ml-1" />
                )}
              </button>

              {/* Rewind button */}
              <button
                onClick={handleStop}
                className="w-16 h-16 sm:w-20 sm:h-20 bg-accent-400 hover:bg-accent-500 active:bg-accent-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-accent-400/30 transition-all active:scale-95"
                title={t('transport.rewind')}
              >
                <SkipBack className="w-8 h-8 sm:w-10 sm:h-10" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SubmissionPlayer;
