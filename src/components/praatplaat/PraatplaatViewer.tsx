/**
 * PraatplaatViewer - Docent presenteert de praatplaat (#72)
 *
 * Fullscreen weergave van de praatplaat-afbeelding met iconen op posities
 * waar leerlingen composities hebben ingestuurd. Klikken op een icoon
 * speelt de compositie af. Bij meerdere op dezelfde plek: dropdown selectie.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, Square, RefreshCw, ListMusic } from 'lucide-react';
import { getPraatplaatSubmissions } from '../../lib/praatplaat';
import type { PraatplaatSubmission, PraatplaatRow } from '../../lib/praatplaat';
import { clusterSubmissions, type SpotCluster } from '../../utils/praatplaatClustering';
import { PraatplaatSpot } from './PraatplaatSpot';
import { SubmissionPlayer } from '../teacher/SubmissionPlayer';
import { Button } from '../ui/Button';
import { audioService } from '../../services/AudioService';
import { logger } from '../../utils/logger';

// --- Component ---

interface PraatplaatViewerProps {
  praatplaat: PraatplaatRow;
  /** Als classId is opgegeven, worden alleen submissions van die klas getoond. Zonder: alleen de afbeelding. */
  classId?: string;
  onClose: () => void;
}

export function PraatplaatViewer({ praatplaat, classId, onClose }: PraatplaatViewerProps) {
  const { t } = useTranslation();

  const [submissions, setSubmissions] = useState<PraatplaatSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Playback state
  const [playingSubmissionId, setPlayingSubmissionId] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [errorSubmissionId, setErrorSubmissionId] = useState<string | null>(null);

  // SubmissionPlayer lifecycle — decoupled from playingSubmissionId so that
  // onPlaybackEnd (which clears playingSubmissionId) doesn't unmount the player.
  // Stores a snapshot of the submission data when "show timeline" is clicked.
  const [timelineSubmission, setTimelineSubmission] = useState<PraatplaatSubmission | null>(null);

  // Clusters
  const [clusters, setClusters] = useState<SpotCluster<PraatplaatSubmission>[]>([]);

  // Dropdown state voor multi-submission spots
  const [dropdownCluster, setDropdownCluster] = useState<SpotCluster<PraatplaatSubmission> | null>(null);

  // --- Data laden (alleen als classId is opgegeven) ---
  const fetchData = useCallback(async () => {
    if (!classId) {
      // Geen classId = preview-modus, geen submissions laden
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getPraatplaatSubmissions(praatplaat.id, classId);
      setSubmissions(data);
      setClusters(clusterSubmissions(data));
    } catch (err) {
      logger.error('PraatplaatViewer fetch failed:', err);
      setError(err instanceof Error ? err.message : t('teacher.praatplaat.fetchSubmissionsError'));
    } finally {
      setLoading(false);
    }
  }, [praatplaat.id, classId, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // --- Direct afspelen ---
  const playSubmission = useCallback(async (sub: PraatplaatSubmission) => {
    // Stop current playback
    audioService.stop();

    if (playingSubmissionId === sub.id) {
      // Toggle off
      setPlayingSubmissionId(null);
      return;
    }

    setPlayingSubmissionId(sub.id);
    setAudioLoading(true);

    try {
      await audioService.initialize();

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
      logger.error('PraatplaatViewer playback failed:', err);
      setErrorSubmissionId(sub.id);
      setPlayingSubmissionId(null);
      setAudioLoading(false);
      // Auto-clear error after 3 seconds
      setTimeout(() => setErrorSubmissionId(null), 3000);
    }
  }, [playingSubmissionId]);

  // --- Afspelen ---
  const handleSpotClick = useCallback((cluster: SpotCluster<PraatplaatSubmission>) => {
    if (cluster.submissions.length === 1) {
      playSubmission(cluster.submissions[0]);
    } else {
      // Meerdere submissions: toon dropdown
      setDropdownCluster(cluster);
    }
  }, [playSubmission]);

  const handleSubmissionSelect = useCallback((sub: PraatplaatSubmission) => {
    setDropdownCluster(null);
    playSubmission(sub);
  }, [playSubmission]);

  const playingSubmission = submissions.find((s) => s.id === playingSubmissionId);

  const handleStop = useCallback(() => {
    audioService.stop();
    setPlayingSubmissionId(null);
    setTimelineSubmission(null);
  }, []);

  const handleShowTimeline = useCallback(() => {
    // Stop direct playback and open SubmissionPlayer with a snapshot
    // of the current submission data. SubmissionPlayer then fully owns audio.
    audioService.stop();
    if (playingSubmission) {
      setTimelineSubmission(playingSubmission);
    }
  }, [playingSubmission]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <header className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
        <h1 className="text-white font-semibold text-lg truncate mr-4">
          {praatplaat.name}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchData}
            className="text-white/70 hover:text-white"
            title={t('teacher.classDetail.refreshTitle')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-2"
            aria-label={t('common.close')}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Praatplaat afbeelding + spots */}
      <div className="flex-1 flex items-center justify-center min-h-0 p-2 pt-14">
        <div className="relative w-full max-w-7xl aspect-video rounded-xl overflow-hidden shadow-2xl">
          <img
            src={praatplaat.image_url}
            alt={praatplaat.name}
            className="w-full h-full object-cover"
            draggable={false}
          />

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="bg-white rounded-xl px-6 py-4 text-center max-w-xs">
                <p className="text-error-600 text-sm mb-2">{error}</p>
                <Button variant="secondary" size="sm" onClick={fetchData}>
                  {t('common.retry')}
                </Button>
              </div>
            </div>
          )}

          {/* Spots */}
          {!loading && clusters.map((cluster, i) => (
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
              {/* Backdrop */}
              <div
                className="absolute inset-0 z-30"
                onClick={() => setDropdownCluster(null)}
              />
              {/* Dropdown menu */}
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
                    className="w-full text-left px-4 py-2 text-sm hover:bg-primary-50 transition-colors truncate"
                  >
                    {sub.student_name}
                  </button>
                ))}
              </div>
            </>
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

      {/* Empty state */}
      {!loading && !error && submissions.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 rounded-2xl px-8 py-6 text-center max-w-sm pointer-events-auto">
            <p className="text-text-main font-medium mb-1">
              {t('teacher.praatplaat.viewer.emptyTitle')}
            </p>
            <p className="text-text-muted text-sm">
              {t('teacher.praatplaat.viewer.emptyDescription')}
            </p>
          </div>
        </div>
      )}

      {/* SubmissionPlayer overlay — lifecycle decoupled from playingSubmissionId */}
      {timelineSubmission && (
        <SubmissionPlayer
          submission={{
            id: timelineSubmission.id,
            student_name: timelineSubmission.student_name,
            composition_name: timelineSubmission.composition_name,
            composition_data: timelineSubmission.composition_data,
            created_at: timelineSubmission.created_at,
          }}
          onClose={() => {
            setTimelineSubmission(null);
            setPlayingSubmissionId(null);
          }}
        />
      )}
    </div>
  );
}

export default PraatplaatViewer;
