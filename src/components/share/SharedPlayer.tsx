/**
 * SharedPlayer - Publieke read-only player voor gedeelde composities
 *
 * Wordt geopend via:
 * 1. URL met ?share=CODE query parameter
 * 2. Code invoer op het startscherm
 *
 * Hergebruikt Timeline component in read-only modus.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Music,
  AlertCircle,
  Play,
  Pause,
  SkipBack,
  ArrowLeft,
} from 'lucide-react';
import * as Tone from 'tone';
import { audioService } from '../../services/AudioService';
import { getSharedComposition } from '../../lib/submissions';
import { isValidCompositionData } from '../../utils/compositionData';
import { findStoryboardById } from '../../data/themes';
import { Timeline } from '../studio/Timeline';
import { StoryboardViewer } from '../ui/StoryboardViewer';
import { Button } from '../ui';
import { DEFAULT_BPM } from '../../constants/config';
import type { Track, Sample, Section, Storyboard } from '../../types';

interface SharedPlayerProps {
  code: string;
  onBack: () => void;
}

type PlayerState = 'loading-data' | 'waiting-gesture' | 'loading-audio' | 'ready' | 'playing' | 'paused' | 'error' | 'not-found' | 'expired';

export function SharedPlayer({ code, onBack }: SharedPlayerProps) {
  const { t } = useTranslation();
  const [playerState, setPlayerState] = useState<PlayerState>('loading-data');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentBeat, setCurrentBeat] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Composition data from Supabase
  const [compositionName, setCompositionName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [totalBeats, setTotalBeats] = useState(16);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [isLooping, setIsLooping] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);

  // Refs for beat tracking
  const bpmRef = useRef(bpm);
  const totalBeatsRef = useRef(totalBeats);
  const isLoopingRef = useRef(isLooping);

  useEffect(() => {
    bpmRef.current = bpm;
    totalBeatsRef.current = totalBeats;
    isLoopingRef.current = isLooping;
  }, [bpm, totalBeats, isLooping]);

  // --- Fetch composition data ---
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const result = await getSharedComposition(code);

        if (!isMounted) return;

        if (!result) {
          setPlayerState('not-found');
          return;
        }

        // Store composition data
        setCompositionName(result.composition_name);
        setStudentName(result.student_name);


        const data = result.composition_data;

        // Runtime validatie van compositie data uit Supabase
        if (!isValidCompositionData(data)) {
          setErrorMessage(t('share.notFound'));
          setPlayerState('error');
          return;
        }

        setTracks(data.tracks);
        setSamples(data.samples);
        setTotalBeats(data.totalBeats);
        setBpm(data.bpm);
        setIsLooping(data.isLooping);
        setSections(data.sections ?? []);

        // Resolve storyboard if composition was made with one
        if (data.storyboardId) {
          const found = findStoryboardById(data.storyboardId);
          if (found) {
            setStoryboard(found.storyboard);
          }
        }

        // Wacht op user gesture voordat we audio initialiseren
        // (Chrome blokkeert AudioContext zonder user interaction)
        setPlayerState('waiting-gesture');
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : t('share.errorGeneric'));
          setPlayerState('error');
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      audioService.stop();
    };
  }, [code, t]);

  // --- Beat tracking ---
  useEffect(() => {
    if (playerState === 'playing') {
      intervalRef.current = setInterval(() => {
        const seconds = Tone.Transport.seconds;
        const beat = (seconds / 60) * bpmRef.current;

        if (isLoopingRef.current && totalBeatsRef.current > 0) {
          setCurrentBeat(beat % totalBeatsRef.current);
        } else {
          setCurrentBeat(Math.min(beat, totalBeatsRef.current));
        }
      }, 33);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [playerState]);

  // --- Audio initialiseren na user gesture ---
  const handleStartAudio = useCallback(async () => {
    setPlayerState('loading-audio');
    try {
      await audioService.initialize();

      if (samples.length === 0) {
        setErrorMessage(t('share.notFound'));
        setPlayerState('error');
        return;
      }

      await audioService.loadSamples(samples, (loaded, total) => {
        setLoadingProgress(Math.round((loaded / total) * 100));
      });

      setPlayerState('ready');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t('share.errorGeneric'));
      setPlayerState('error');
    }
  }, [samples, t]);

  // --- Playback controls ---
  // Mirror the regular player pattern: always reschedule + play from currentBeat.
  // This ensures the hybrid seek approach (startActiveClips) works correctly.
  const handlePlayPause = useCallback(() => {
    if (playerState === 'playing') {
      audioService.pause();
      setPlayerState('paused');
    } else {
      audioService.scheduleTimeline(tracks, samples);
      audioService.setLoop(isLooping, totalBeats);
      audioService.play(currentBeat);
      setPlayerState('playing');
    }
  }, [playerState, tracks, samples, isLooping, totalBeats, currentBeat]);

  const handleStop = useCallback(() => {
    audioService.stop();
    setCurrentBeat(0);
    setPlayerState('ready');
  }, []);

  // Seek handler — for playhead scrubbing
  const handleSeek = useCallback((beat: number) => {
    setCurrentBeat(beat);
    // Use audioService.seek() to update transport + notify listeners
    audioService.seek(beat);
  }, []);

  const handleBack = useCallback(() => {
    audioService.stop();
    onBack();
  }, [onBack]);

  // Derived state
  const showTimeline = playerState === 'ready' || playerState === 'playing' || playerState === 'paused';
  const isPlaying = playerState === 'playing';

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
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
        {playerState === 'loading-data' && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <Music className="w-16 h-16 text-accent-500 mx-auto mb-4 animate-pulse" />
              <p className="text-white font-medium">{t('share.loading')}</p>
            </div>
          </div>
        )}

        {/* Waiting for user gesture to unlock audio */}
        {playerState === 'waiting-gesture' && (
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
        {playerState === 'loading-audio' && (
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
        {playerState === 'not-found' && (
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
        {playerState === 'error' && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-xs">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <p className="text-red-400 font-medium mb-4">{errorMessage}</p>
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
                className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full shadow-md transition-all cursor-pointer bg-primary-500 hover:bg-primary-600 active:bg-primary-700 active:scale-95 text-white"
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
