/**
 * SubmissionPlayer - Modal voor het afspelen van een leerling compositie
 *
 * Gebruikt de AudioService om de compositie af te spelen.
 */

import { useState, useEffect, useCallback } from 'react';
import { X, Music, AlertCircle, Play, Square, RotateCcw } from 'lucide-react';
import type { Submission } from '../../hooks/useSubmissions';
import { audioService } from '../../services/AudioService';
import { Button } from '../ui/Button';

interface SubmissionPlayerProps {
  submission: Submission;
  onClose: () => void;
}

type PlayerState = 'loading' | 'ready' | 'playing' | 'error';

export function SubmissionPlayer({ submission, onClose }: SubmissionPlayerProps) {
  const { student_name, composition_name, composition_data, created_at } = submission;
  const [playerState, setPlayerState] = useState<PlayerState>('loading');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
  const isLooping = composition_data?.isLooping || false;

  const trackCount = tracks.length;
  const clipCount = tracks.reduce(
    (total: number, track: any) => total + (track.clips?.length || 0),
    0
  );

  // Initialize audio en laad samples
  useEffect(() => {
    let isMounted = true;

    const initAudio = async () => {
      try {
        // Initialize audio context (needs user gesture, but modal open counts)
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
      // Stop playback on unmount
      audioService.stop();
    };
  }, [samples]);

  // Play handler
  const handlePlay = useCallback(() => {
    audioService.scheduleTimeline(tracks, samples);
    audioService.setLoop(isLooping, totalBeats);
    audioService.play();
    setPlayerState('playing');
  }, [tracks, samples, isLooping, totalBeats]);

  // Stop handler
  const handleStop = useCallback(() => {
    audioService.stop();
    setPlayerState('ready');
  }, []);

  // Play again handler
  const handlePlayAgain = useCallback(() => {
    audioService.stop();
    setTimeout(() => {
      audioService.scheduleTimeline(tracks, samples);
      audioService.setLoop(isLooping, totalBeats);
      audioService.play();
      setPlayerState('playing');
    }, 50);
  }, [tracks, samples, isLooping, totalBeats]);

  // Close handler - stop audio first
  const handleClose = useCallback(() => {
    audioService.stop();
    onClose();
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {composition_name}
            </h2>
            <p className="text-gray-600">
              Door: <span className="font-medium">{student_name}</span>
            </p>
            <p className="text-gray-400 text-sm">
              {formattedDate}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Compositie info */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{trackCount}</div>
              <div className="text-gray-500 text-sm">Tracks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{clipCount}</div>
              <div className="text-gray-500 text-sm">Clips</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{samples.length}</div>
              <div className="text-gray-500 text-sm">Samples</div>
            </div>
          </div>
        </div>

        {/* Player area */}
        <div className="bg-gradient-to-br from-amber-100 to-amber-50 rounded-xl p-6 mb-4">
          {/* Loading state */}
          {playerState === 'loading' && (
            <div className="text-center">
              <Music className="w-12 h-12 text-amber-500 mx-auto mb-3 animate-pulse" />
              <p className="text-gray-600 mb-2">Samples laden...</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="text-gray-400 text-sm mt-1">{loadingProgress}%</p>
            </div>
          )}

          {/* Error state */}
          {playerState === 'error' && (
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-600 mb-2">{errorMessage}</p>
              <p className="text-gray-400 text-sm">
                Probeer de pagina te verversen.
              </p>
            </div>
          )}

          {/* Ready state */}
          {playerState === 'ready' && (
            <div className="text-center">
              <button
                onClick={handlePlay}
                className="w-20 h-20 mx-auto bg-amber-500 hover:bg-amber-600 active:bg-amber-700 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-95"
              >
                <Play className="w-10 h-10" />
              </button>
              <p className="text-gray-600 mt-3">Klik om af te spelen</p>
            </div>
          )}

          {/* Playing state */}
          {playerState === 'playing' && (
            <div className="text-center">
              <div className="flex justify-center gap-4 mb-4">
                <button
                  onClick={handleStop}
                  className="w-16 h-16 bg-gray-600 hover:bg-gray-700 active:bg-gray-800 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-95"
                  title="Stop"
                >
                  <Square className="w-7 h-7" />
                </button>
                <button
                  onClick={handlePlayAgain}
                  className="w-16 h-16 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-95"
                  title="Opnieuw afspelen"
                >
                  <RotateCcw className="w-7 h-7" />
                </button>
              </div>
              <div className="flex justify-center gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-6 bg-amber-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </div>
              <p className="text-amber-700 mt-3 font-medium">Nu aan het spelen...</p>
            </div>
          )}
        </div>

        {/* Close button */}
        <Button
          variant="secondary"
          size="md"
          onClick={handleClose}
          className="w-full"
        >
          Sluiten
        </Button>
      </div>
    </div>
  );
}

export default SubmissionPlayer;
