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
  Square,
  ArrowLeft,
  Clock,
  Eye,
} from 'lucide-react';
import * as Tone from 'tone';
import { audioService } from '../../services/AudioService';
import { getSharedComposition } from '../../lib/submissions';
import { isValidCompositionData } from '../../utils/compositionData';
import { Timeline } from '../studio/Timeline';
import { Button } from '../ui';
import { DEFAULT_BPM } from '../../constants/config';
import type { Track, Sample } from '../../types';

interface SharedPlayerProps {
  code: string;
  onBack: () => void;
}

type PlayerState = 'loading-data' | 'loading-audio' | 'ready' | 'playing' | 'paused' | 'error' | 'not-found' | 'expired';

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
  const [createdAt, setCreatedAt] = useState('');
  const [viewCount, setViewCount] = useState(0);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [totalBeats, setTotalBeats] = useState(16);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [isLooping, setIsLooping] = useState(false);

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
        setCreatedAt(result.created_at);
        setViewCount(result.view_count);

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

        // Now load audio samples
        setPlayerState('loading-audio');

        await audioService.initialize();
        if (!isMounted) return;

        const loadedSamples = data.samples;
        if (loadedSamples.length === 0) {
          setErrorMessage(t('share.notFound'));
          setPlayerState('error');
          return;
        }

        await audioService.loadSamples(loadedSamples, (loaded, total) => {
          if (isMounted) {
            setLoadingProgress(Math.round((loaded / total) * 100));
          }
        });

        if (!isMounted) return;
        setPlayerState('ready');
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

  // --- Playback controls ---
  const handlePlayPause = useCallback(() => {
    if (playerState === 'playing') {
      audioService.pause();
      setPlayerState('paused');
    } else {
      if (playerState === 'paused') {
        audioService.play();
      } else {
        audioService.scheduleTimeline(tracks, samples);
        audioService.setLoop(isLooping, totalBeats);
        audioService.play();
      }
      setPlayerState('playing');
    }
  }, [playerState, tracks, samples, isLooping, totalBeats]);

  const handleStop = useCallback(() => {
    audioService.stop();
    setCurrentBeat(0);
    setPlayerState('ready');
  }, []);

  const handleBack = useCallback(() => {
    audioService.stop();
    onBack();
  }, [onBack]);

  // Format date
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  // Derived state
  const showTimeline = playerState === 'ready' || playerState === 'playing' || playerState === 'paused';
  const isPlaying = playerState === 'playing';

  const trackCount = tracks.filter((t) => t.clips?.length > 0).length;
  const clipCount = tracks.reduce(
    (total, track) => total + (track.clips?.length || 0),
    0
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      {/* Header */}
      <div className="bg-bg-surface border-b border-border-subtle px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
        <Button variant="secondary" size="sm" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span className="hidden sm:inline">{t('share.backToStart')}</span>
          <span className="sm:hidden">{t('common.back')}</span>
        </Button>
        <h1 className="text-lg sm:text-xl font-bold text-text-main">SoundScout</h1>
        <div className="w-16 sm:w-28" />
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
            {/* Composition info bar */}
            <div className="bg-bg-surface border-b border-border-subtle px-4 sm:px-6 py-3 shrink-0">
              <h2 className="text-xl sm:text-2xl font-bold text-text-main">
                {compositionName}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                <p className="text-text-muted text-sm">
                  {t('share.by')} <span className="font-medium text-text-main">{studentName}</span>
                </p>
                {formattedDate && (
                  <p className="text-text-muted text-sm flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formattedDate}
                  </p>
                )}
                {viewCount > 0 && (
                  <p className="text-text-muted text-sm flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {t('share.viewCount', { count: viewCount })}
                  </p>
                )}
              </div>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-accent-600">{trackCount}</span>
                  <span className="text-text-muted text-sm">{t('common.tracks')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-accent-600">{clipCount}</span>
                  <span className="text-text-muted text-sm">{t('common.clips')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-accent-600">{samples.length}</span>
                  <span className="text-text-muted text-sm">{t('common.samples')}</span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-hidden bg-bg-surface">
              <Timeline
                tracks={tracks}
                bpm={bpm}
                totalBeats={totalBeats}
                currentBeat={currentBeat}
                isPlaying={isPlaying}
                snapPreview={null}
                readOnly={true}
                samples={samples}
              />
            </div>

            {/* Transport controls */}
            <div className="px-4 sm:px-6 py-4 sm:py-6 border-t border-border-subtle bg-neutral-50 shrink-0">
              <div className="flex justify-center gap-4">
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
                <button
                  onClick={handleStop}
                  className="w-16 h-16 sm:w-20 sm:h-20 bg-accent-400 hover:bg-accent-500 active:bg-accent-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-accent-400/30 transition-all active:scale-95"
                  title={t('common.stop')}
                >
                  <Square className="w-7 h-7 sm:w-8 sm:h-8" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SharedPlayer;
