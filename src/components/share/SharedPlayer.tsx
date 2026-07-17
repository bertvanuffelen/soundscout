/**
 * SharedPlayer - Publieke read-only player voor gedeelde composities
 *
 * Wordt geopend via:
 * 1. URL met ?share=CODE query parameter
 * 2. Code invoer op het startscherm
 *
 * Hergebruikt Timeline component in read-only modus.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Music,
  AlertCircle,
  Play,
  Pause,
  SkipBack,
  ArrowLeft,
} from 'lucide-react';
import { getSharedComposition } from '../../lib/submissions';
import { isValidCompositionData } from '../../utils/compositionData';
import { resolveStoryboard } from '../../utils/resolveStoryboard';
import { useCompositionPlayback } from '../../hooks/useCompositionPlayback';
import { Timeline } from '../studio/Timeline';
import { StoryboardViewer } from '../ui/StoryboardViewer';
import { Button } from '../ui';
import { DEFAULT_BPM } from '../../constants/config';
import type { CompositionData } from '../../types';

interface SharedPlayerProps {
  code: string;
  onBack: () => void;
}

/** Data-fase (vóór audio); zodra audio start neemt de playback-hook het over */
type DataPhase = 'loading-data' | 'waiting-gesture' | 'audio' | 'not-found' | 'error';

export function SharedPlayer({ code, onBack }: SharedPlayerProps) {
  const { t } = useTranslation();
  const [dataPhase, setDataPhase] = useState<DataPhase>('loading-data');
  const [dataError, setDataError] = useState<string | null>(null);
  const [compositionName, setCompositionName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [data, setData] = useState<CompositionData | null>(null);

  const tracks = data?.tracks ?? [];
  const samples = data?.samples ?? [];
  const totalBeats = data?.totalBeats ?? 16;
  const bpm = data?.bpm ?? DEFAULT_BPM;
  const sections = data?.sections ?? [];
  const storyboard = resolveStoryboard(data);

  // Gedeeld afspeel-fundament (presentatiescherm fase 1). autoLoad=false:
  // de browser blokkeert AudioContext zonder gebaar, dus load() start pas
  // via de "Klik om te luisteren"-knop (gesture-gate).
  const {
    state: playbackState,
    currentBeat,
    loadingProgress,
    errorMessage: playbackError,
    load: loadComposition,
    play: playComposition,
    pause: pauseComposition,
    stop: stopComposition,
    seek: seekComposition,
  } = useCompositionPlayback(data, { autoLoad: false });

  // --- Fetch composition data ---
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const result = await getSharedComposition(code);

        if (!isMounted) return;

        if (!result) {
          setDataPhase('not-found');
          return;
        }

        setCompositionName(result.composition_name);
        setStudentName(result.student_name);

        // Runtime validatie van compositie data uit Supabase
        const composition = result.composition_data;
        if (!isValidCompositionData(composition)) {
          setDataError(t('share.notFound'));
          setDataPhase('error');
          return;
        }

        setData(composition);
        // Wacht op user gesture voordat we audio initialiseren
        // (Chrome blokkeert AudioContext zonder user interaction)
        setDataPhase('waiting-gesture');
      } catch (err) {
        if (isMounted) {
          setDataError(err instanceof Error ? err.message : t('share.errorGeneric'));
          setDataPhase('error');
        }
      }
    };

    fetchData();

    return () => { isMounted = false; };
  }, [code, t]);

  // --- Audio initialiseren na user gesture ---
  const handleStartAudio = useCallback(() => {
    if (samples.length === 0) {
      setDataError(t('share.notFound'));
      setDataPhase('error');
      return;
    }
    setDataPhase('audio');
    void loadComposition();
  }, [samples.length, loadComposition, t]);

  // --- Playback controls (transport zit in de hook) ---
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

  const handleSeek = useCallback((beat: number) => {
    seekComposition(beat);
  }, [seekComposition]);

  const handleBack = useCallback(() => {
    stopComposition();
    onBack();
  }, [stopComposition, onBack]);

  // Derived state: gecombineerde weergave-staat van data-fase + audio-fase
  const errorMessage = dataError ?? playbackError;
  const isError = dataPhase === 'error' || (dataPhase === 'audio' && playbackState === 'error');
  const isLoadingAudio = dataPhase === 'audio' && (playbackState === 'loading' || playbackState === 'idle');
  const showTimeline = dataPhase === 'audio' && !isError && !isLoadingAudio;
  const isPlaying = playbackState === 'playing';

  return (
    <div className="min-h-screen flex flex-col bg-brand-900">
      {/* Header — compact: back + title + author on one line */}
      <div className="bg-bg-surface border-b border-border-subtle px-3 sm:px-6 py-2 sm:py-3 flex items-center gap-3 shrink-0">
        <Button variant="secondary" size="sm" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span className="hidden sm:inline">{t('share.backToStart')}</span>
          <span className="sm:hidden">{t('common.back')}</span>
        </Button>
        <div className="flex-1 min-w-0 text-center">
          {showTimeline ? (
            <div className="truncate">
              <span className="font-bold text-text-main text-sm sm:text-base">{compositionName}</span>
              <span className="text-text-muted text-xs sm:text-sm ml-2">
                {t('share.by')} {studentName}
              </span>
            </div>
          ) : (
            <span className="text-sm sm:text-base font-bold text-text-main">SoundScout</span>
          )}
        </div>
        <div className="w-16 sm:w-20 shrink-0" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Loading data */}
        {dataPhase === 'loading-data' && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <Music className="w-16 h-16 text-accent-500 mx-auto mb-4 animate-pulse" />
              <p className="text-white font-medium">{t('share.loading')}</p>
            </div>
          </div>
        )}

        {/* Waiting for user gesture to unlock audio */}
        {dataPhase === 'waiting-gesture' && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-sm">
              <Music className="w-16 h-16 text-accent-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-1">
                {compositionName}
              </h2>
              <p className="text-neutral-400 text-sm mb-6">
                {t('share.by')} {studentName}
              </p>
              <Button variant="primary" size="lg" onClick={handleStartAudio}>
                <Play className="w-5 h-5 mr-2" />
                {t('share.openComposition')}
              </Button>
            </div>
          </div>
        )}

        {/* Loading audio */}
        {isLoadingAudio && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-xs">
              <Music className="w-16 h-16 text-accent-500 mx-auto mb-4 animate-pulse" />
              <p className="text-white font-medium mb-3">{t('share.loadingSamples')}</p>
              <div className="w-full bg-neutral-700 rounded-full h-2">
                <div
                  className="bg-accent-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="text-neutral-400 text-sm mt-2">{loadingProgress}%</p>
            </div>
          </div>
        )}

        {/* Not found */}
        {dataPhase === 'not-found' && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-xs">
              <AlertCircle className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
              <p className="text-white font-medium mb-2">{t('share.notFound')}</p>
              <p className="text-neutral-400 text-sm mb-6">{t('share.expired')}</p>
              <Button variant="primary" onClick={handleBack}>
                {t('share.backToStart')}
              </Button>
            </div>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-xs">
              <AlertCircle className="w-16 h-16 text-error-500 mx-auto mb-4" />
              <p className="text-error-400 font-medium mb-4">{errorMessage}</p>
              <Button variant="primary" onClick={handleBack}>
                {t('share.backToStart')}
              </Button>
            </div>
          </div>
        )}

        {/* Composition info + timeline */}
        {showTimeline && (
          <>
            {/* Storyboard viewer */}
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

            {/* Timeline */}
            <div className="flex-1 overflow-hidden bg-bg-surface">
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

            {/* Transport controls — matches studio TransportControls sizing */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 bg-white/90 border-t border-border-subtle shrink-0">
              <button
                onClick={handlePlayPause}
                className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full shadow-md transition-all cursor-pointer bg-accent-500 hover:bg-accent-600 active:bg-accent-700 active:scale-95 text-white"
                title={isPlaying ? t('common.pause') : t('common.play')}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
                ) : (
                  <Play className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
                )}
              </button>
              <button
                onClick={handleStop}
                className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-full shadow-sm transition-all cursor-pointer bg-neutral-200 hover:bg-neutral-300 active:bg-neutral-400 active:scale-95 text-neutral-600"
                title={t('transport.rewind')}
              >
                <SkipBack className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SharedPlayer;
