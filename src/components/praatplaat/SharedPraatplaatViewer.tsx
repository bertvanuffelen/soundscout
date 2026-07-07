/**
 * SharedPraatplaatViewer - Publieke read-only praatplaat-viewer (#73)
 *
 * Wordt geopend via:
 * 1. URL met ?pp-share=CODE query parameter
 * 2. 8-karakter code invoer op het startscherm
 *
 * Toont de praatplaat-afbeelding met leerlingcomposities als klikbare spots.
 * Geen login vereist. Audio init vereist user gesture (browser policy).
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Square, Volume2, ListMusic } from 'lucide-react';
import * as Tone from 'tone';
import { getSharedPraatplaat } from '../../lib/praatplaat';
import type { SharedPraatplaatData } from '../../lib/praatplaat';
import { clusterSubmissions, type SpotCluster } from '../../utils/praatplaatClustering';
import { PraatplaatSpot } from './PraatplaatSpot';
import { SubmissionPlayer } from '../teacher/SubmissionPlayer';
import { Button } from '../ui/Button';
import { audioService } from '../../services/AudioService';
import { logger } from '../../utils/logger';

// --- Types ---

type SharedSubmission = SharedPraatplaatData['submissions'][number];

type ViewerState = 'loading' | 'waiting-gesture' | 'ready' | 'error' | 'not-found' | 'expired';

interface SharedPraatplaatViewerProps {
  code: string;
  onBack: () => void;
}

// --- Component ---

export function SharedPraatplaatViewer({ code, onBack }: SharedPraatplaatViewerProps) {
  const { t } = useTranslation();

  const [viewerState, setViewerState] = useState<ViewerState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<SharedPraatplaatData | null>(null);
  const [clusters, setClusters] = useState<SpotCluster<SharedSubmission>[]>([]);

  // Playback state
  const [playingSubmissionId, setPlayingSubmissionId] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [errorSubmissionId, setErrorSubmissionId] = useState<string | null>(null);

  // Dropdown state voor multi-submission spots
  const [dropdownCluster, setDropdownCluster] = useState<SpotCluster<SharedSubmission> | null>(null);

  // --- Data laden ---
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setViewerState('loading');
      try {
        const result = await getSharedPraatplaat(code);

        if (cancelled) return;

        if (!result) {
          setViewerState('not-found');
          return;
        }

        setData(result);
        setClusters(clusterSubmissions(result.submissions));
        setViewerState('waiting-gesture');
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : t('sharedPraatplaat.fetchError');
        if (msg.includes('verlopen') || msg.includes('expired')) {
          setViewerState('expired');
        } else {
          setErrorMessage(msg);
          setViewerState('error');
        }
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [code, t]);

  // --- Audio init (user gesture vereist) ---
  const handleStartListening = useCallback(async () => {
    try {
      await Tone.start();
      await audioService.initialize();
      setViewerState('ready');
    } catch (err) {
      logger.error('SharedPraatplaatViewer audio init failed:', err);
      setErrorMessage(t('sharedPraatplaat.audioError'));
      setViewerState('error');
    }
  }, [t]);

  // Auto-stop listener
  useEffect(() => {
    const unsubscribe = audioService.onPlaybackEnd(() => {
      setPlayingSubmissionId(null);
    });
    return unsubscribe;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioService.stop();
    };
  }, []);

  // --- Afspelen ---
  const playSubmission = useCallback(async (sub: SharedSubmission) => {
    audioService.stop();

    if (playingSubmissionId === sub.id) {
      setPlayingSubmissionId(null);
      return;
    }

    setPlayingSubmissionId(sub.id);
    setAudioLoading(true);

    try {
      const samples = sub.composition_data?.samples || [];
      const tracks = sub.composition_data?.tracks || [];
      const totalBeats = sub.composition_data?.totalBeats || 16;
      const isLooping = sub.composition_data?.isLooping || false;

      if (samples.length > 0) {
        await audioService.loadSamples(samples);
      }

      audioService.scheduleTimeline(tracks, samples);
      audioService.setLoop(isLooping, totalBeats);
      audioService.play(0);
      setAudioLoading(false);
    } catch (err) {
      logger.error('SharedPraatplaatViewer playback failed:', err);
      setErrorSubmissionId(sub.id);
      setPlayingSubmissionId(null);
      setAudioLoading(false);
      setTimeout(() => setErrorSubmissionId(null), 3000);
    }
  }, [playingSubmissionId]);

  const handleSpotClick = useCallback((cluster: SpotCluster<SharedSubmission>) => {
    if (cluster.submissions.length === 1) {
      playSubmission(cluster.submissions[0]);
    } else {
      setDropdownCluster(cluster);
    }
  }, [playSubmission]);

  const handleSubmissionSelect = useCallback((sub: SharedSubmission) => {
    setDropdownCluster(null);
    playSubmission(sub);
  }, [playSubmission]);

  const handleStop = useCallback(() => {
    audioService.stop();
    setPlayingSubmissionId(null);
    setShowTimeline(false);
  }, []);

  const handleShowTimeline = useCallback(() => {
    audioService.stop();
    setShowTimeline(true);
  }, []);

  const playingSubmission = data?.submissions.find((s) => s.id === playingSubmissionId);

  // --- Pre-ready states ---

  if (viewerState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-app">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-accent-400 animate-spin mx-auto mb-4" />
          <p className="text-text-muted">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (viewerState === 'not-found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-app">
        <div className="text-center max-w-sm px-6">
          <p className="text-text-main font-semibold text-lg mb-2">
            {t('sharedPraatplaat.notFoundTitle')}
          </p>
          <p className="text-text-muted text-sm mb-6">
            {t('sharedPraatplaat.notFoundDescription')}
          </p>
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('sharedPraatplaat.backToStart')}
          </Button>
        </div>
      </div>
    );
  }

  if (viewerState === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-app">
        <div className="text-center max-w-sm px-6">
          <p className="text-text-main font-semibold text-lg mb-2">
            {t('sharedPraatplaat.expiredTitle')}
          </p>
          <p className="text-text-muted text-sm mb-6">
            {t('sharedPraatplaat.expiredDescription')}
          </p>
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('sharedPraatplaat.backToStart')}
          </Button>
        </div>
      </div>
    );
  }

  if (viewerState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-app">
        <div className="text-center max-w-sm px-6">
          <p className="text-error-600 font-semibold text-lg mb-2">
            {t('sharedPraatplaat.errorTitle')}
          </p>
          <p className="text-text-muted text-sm mb-6">
            {errorMessage || t('sharedPraatplaat.errorDescription')}
          </p>
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('sharedPraatplaat.backToStart')}
          </Button>
        </div>
      </div>
    );
  }

  if (viewerState === 'waiting-gesture') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-app">
        <div className="text-center max-w-md px-6">
          {data && (
            <h1 className="text-text-main font-bold text-2xl mb-2">
              {data.praatplaat.name}
            </h1>
          )}
          <p className="text-text-muted text-sm mb-2">
            {data && data.submissions.length > 0
              ? t('sharedPraatplaat.submissionCount', { count: data.submissions.length })
              : t('sharedPraatplaat.noSubmissions')
            }
          </p>
          <p className="text-text-muted text-sm mb-8">
            {t('sharedPraatplaat.gestureHint')}
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={handleStartListening}
          >
            <Volume2 className="w-5 h-5 mr-2" />
            {t('sharedPraatplaat.startListening')}
          </Button>
          <div className="mt-4">
            <button
              onClick={onBack}
              className="text-text-muted text-sm hover:text-text-main transition-colors"
            >
              {t('sharedPraatplaat.backToStart')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Ready state: praatplaat met spots ---

  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <header className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
        <h1 className="text-white font-semibold text-lg truncate mr-4">
          {data.praatplaat.name}
        </h1>
        <button
          onClick={onBack}
          className="text-white/70 hover:text-white p-2 flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('sharedPraatplaat.backToStart')}
        </button>
      </header>

      {/* Praatplaat afbeelding + spots */}
      <div className="flex-1 flex items-center justify-center min-h-0 p-2 pt-14">
        <div className="relative w-full max-w-7xl aspect-video rounded-xl overflow-hidden shadow-2xl">
          <img
            src={data.praatplaat.image_url}
            alt={data.praatplaat.name}
            className="w-full h-full object-cover"
            draggable={false}
          />

          {/* Spots */}
          {clusters.map((cluster, i) => (
            <PraatplaatSpot
              key={i}
              submissions={cluster.submissions}
              x={cluster.x}
              y={cluster.y}
              isPlaying={cluster.submissions.some((s) => s.id === playingSubmissionId)}
              hasError={cluster.submissions.some((s) => s.id === errorSubmissionId)}
              onClick={() => handleSpotClick(cluster)}
            />
          ))}

          {/* Dropdown voor multi-submission spot */}
          {dropdownCluster && (
            <>
              <div
                className="absolute inset-0 z-30"
                onClick={() => setDropdownCluster(null)}
              />
              <div
                className="absolute z-40 bg-white rounded-xl shadow-2xl py-1 min-w-[160px] max-h-[200px] overflow-y-auto -translate-x-1/2"
                style={{
                  left: `${dropdownCluster.x * 100}%`,
                  top: `${Math.min(dropdownCluster.y * 100 + 5, 80)}%`,
                }}
              >
                {dropdownCluster.submissions.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSubmissionSelect(sub)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-accent-50 transition-colors truncate"
                  >
                    {sub.student_name}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Empty state */}
          {data.submissions.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/90 rounded-2xl px-8 py-6 text-center max-w-sm">
                <p className="text-text-main font-medium mb-1">
                  {t('sharedPraatplaat.emptyTitle')}
                </p>
                <p className="text-text-muted text-sm">
                  {t('sharedPraatplaat.emptyDescription')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Afspeel-balk onderin */}
      {playingSubmission && (
        <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-4 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span className="text-white font-medium text-sm truncate mr-4">
              {audioLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('teacher.submissionPlayer.loading')}
                </span>
              ) : (
                <>{playingSubmission.student_name} — {playingSubmission.composition_name}</>
              )}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleShowTimeline}
              >
                <ListMusic className="w-4 h-4 mr-1" />
                {t('teacher.praatplaat.viewer.showTimeline')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleStop}
              >
                <Square className="w-4 h-4 mr-1" />
                {t('teacher.praatplaat.viewer.stop')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SubmissionPlayer overlay */}
      {showTimeline && playingSubmission && (
        <SubmissionPlayer
          submission={{
            id: playingSubmission.id,
            student_name: playingSubmission.student_name,
            composition_name: playingSubmission.composition_name,
            composition_data: playingSubmission.composition_data,
            created_at: playingSubmission.created_at,
          }}
          onClose={() => {
            setShowTimeline(false);
            setPlayingSubmissionId(null);
          }}
        />
      )}
    </div>
  );
}

export default SharedPraatplaatViewer;
