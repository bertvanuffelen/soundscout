/**
 * SubmissionPlayer - Fullscreen modal voor het bekijken en afspelen van een leerling compositie
 *
 * Features:
 * - Fullscreen modal met timeline weergave (read-only)
 * - Playhead die meebeweegt tijdens afspelen
 * - Play/Pause en Stop controls
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Music, AlertCircle, Play, Pause, Square } from 'lucide-react';
import * as Tone from 'tone';
import type { Submission } from '../../hooks/useSubmissions';
import { audioService } from '../../services/AudioService';
import { Timeline } from '../studio/Timeline';
import { DEFAULT_BPM } from '../../constants/config';

interface SubmissionPlayerProps {
  submission: Submission;
  onClose: () => void;
}

type PlayerState = 'loading' | 'ready' | 'playing' | 'paused' | 'error';

export function SubmissionPlayer({ submission, onClose }: SubmissionPlayerProps) {
  const { student_name, composition_name, composition_data, created_at } = submission;
  const [playerState, setPlayerState] = useState<PlayerState>('loading');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentBeat, setCurrentBeat] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  const isLooping = composition_data?.isLooping || false;

  const trackCount = tracks.filter((t: any) => t.clips?.length > 0).length;
  const clipCount = tracks.reduce(
    (total: number, track: any) => total + (track.clips?.length || 0),
    0
  );

  // Store values in refs to avoid recreating the update function
  const bpmRef = useRef(bpm);
  const totalBeatsRef = useRef(totalBeats);
  const isLoopingRef = useRef(isLooping);

  // Keep refs in sync
  useEffect(() => {
    bpmRef.current = bpm;
    totalBeatsRef.current = totalBeats;
    isLoopingRef.current = isLooping;
  }, [bpm, totalBeats, isLooping]);

  // Beat tracking via setInterval (more stable than RAF for this use case)
  useEffect(() => {
    if (playerState === 'playing') {
      // Update at ~30fps for smooth but stable playhead movement
      intervalRef.current = setInterval(() => {
        const seconds = Tone.Transport.seconds;
        const beat = (seconds / 60) * bpmRef.current;

        // Handle looping: wrap beat position
        if (isLoopingRef.current && totalBeatsRef.current > 0) {
          setCurrentBeat(beat % totalBeatsRef.current);
        } else {
          setCurrentBeat(Math.min(beat, totalBeatsRef.current));
        }
      }, 33); // ~30fps
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

  // Initialize audio en laad samples
  useEffect(() => {
    let isMounted = true;

    const initAudio = async () => {
      try {
        // Initialize audio context
        await audioService.initialize();

        if (!isMounted) return;

        if (samples.length === 0) {
          setErrorMessage('Geen samples gevonden in deze compositie');
          setPlayerState('error');
          return;
        }

        // Load samples
        const results = await audioService.loadSamples(samples, (loaded, total) => {
          if (isMounted) {
            setLoadingProgress(Math.round((loaded / total) * 100));
          }
        });

        if (!isMounted) return;

        // Check for errors
        const failedSamples = results.filter(r => !r.success);
        if (failedSamples.length > 0) {
          console.warn('Sommige samples konden niet worden geladen:', failedSamples);
        }

        setPlayerState('ready');
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : 'Kon audio niet laden');
          setPlayerState('error');
        }
      }
    };

    initAudio();

    return () => {
      isMounted = false;
      audioService.stop();
    };
  }, [samples]);

  // Play/Pause toggle handler
  const handlePlayPause = useCallback(() => {
    if (playerState === 'playing') {
      // Pause
      audioService.pause();
      setPlayerState('paused');
    } else {
      // Play or resume
      if (playerState === 'paused') {
        // Resume from current position
        audioService.play();
      } else {
        // Start fresh
        audioService.scheduleTimeline(tracks, samples);
        audioService.setLoop(isLooping, totalBeats);
        audioService.play();
      }
      setPlayerState('playing');
    }
  }, [playerState, tracks, samples, isLooping, totalBeats]);

  // Stop handler
  const handleStop = useCallback(() => {
    audioService.stop();
    setCurrentBeat(0);
    setPlayerState('ready');
  }, []);

  // Close handler - stop audio first
  const handleClose = useCallback(() => {
    audioService.stop();
    onClose();
  }, [onClose]);

  // Determine if we should show the timeline (not during loading/error)
  const showTimeline = playerState !== 'loading' && playerState !== 'error';
  const isPlaying = playerState === 'playing';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-3 sm:p-4 md:p-6 z-50">
      <div className="bg-bg-surface rounded-2xl shadow-2xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
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
            Door: <span className="font-medium text-text-main">{student_name}</span>
            <span className="mx-2">•</span>
            {formattedDate}
          </p>

          {/* Metadata */}
          <div className="flex gap-4 sm:gap-6 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-xl font-bold text-accent-600">{trackCount}</span>
              <span className="text-text-muted text-sm">Tracks</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-xl font-bold text-accent-600">{clipCount}</span>
              <span className="text-text-muted text-sm">Clips</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-xl font-bold text-accent-600">{samples.length}</span>
              <span className="text-text-muted text-sm">Samples</span>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Loading state */}
          {playerState === 'loading' && (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-xs">
                <Music className="w-16 h-16 text-accent-500 mx-auto mb-4 animate-pulse" />
                <p className="text-text-main font-medium mb-3">Samples laden...</p>
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
          {playerState === 'error' && (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-xs">
                <AlertCircle className="w-16 h-16 text-error-500 mx-auto mb-4" />
                <p className="text-error-600 font-medium mb-2">{errorMessage}</p>
                <p className="text-text-muted text-sm">
                  Probeer de pagina te verversen.
                </p>
              </div>
            </div>
          )}

          {/* Timeline (read-only) */}
          {showTimeline && (
            <div className="flex-1 overflow-hidden">
              <Timeline
                tracks={tracks}
                bpm={bpm}
                totalBeats={totalBeats}
                currentBeat={currentBeat}
                isPlaying={isPlaying}
                onRemoveClip={() => {}}
                snapPreview={null}
                readOnly={true}
                samples={samples}
              />
            </div>
          )}
        </div>

        {/* Transport controls */}
        {showTimeline && (
          <div className="px-4 sm:px-6 py-4 sm:py-6 border-t border-border-subtle bg-neutral-50 shrink-0">
            <div className="flex justify-center gap-4">
              {/* Play/Pause button */}
              <button
                onClick={handlePlayPause}
                className="w-16 h-16 sm:w-20 sm:h-20 bg-accent-400 hover:bg-accent-500 active:bg-accent-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-accent-400/30 transition-all active:scale-95"
                title={isPlaying ? 'Pauzeren' : 'Afspelen'}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 sm:w-10 sm:h-10" />
                ) : (
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 ml-1" />
                )}
              </button>

              {/* Stop button */}
              <button
                onClick={handleStop}
                className="w-16 h-16 sm:w-20 sm:h-20 bg-accent-400 hover:bg-accent-500 active:bg-accent-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-accent-400/30 transition-all active:scale-95"
                title="Stoppen"
              >
                <Square className="w-7 h-7 sm:w-8 sm:h-8" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SubmissionPlayer;
