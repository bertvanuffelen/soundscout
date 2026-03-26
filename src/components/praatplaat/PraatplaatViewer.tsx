/**
 * PraatplaatViewer - Docent presenteert de praatplaat (#72)
 *
 * Fullscreen weergave van de praatplaat-afbeelding met iconen op posities
 * waar leerlingen composities hebben ingestuurd. Klikken op een icoon
 * speelt de compositie af. Bij meerdere op dezelfde plek: dropdown selectie.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, Square, RefreshCw } from 'lucide-react';
import { getPraatplaatSubmissions } from '../../lib/praatplaat';
import type { PraatplaatSubmission, PraatplaatRow } from '../../lib/praatplaat';
import { PraatplaatSpot } from './PraatplaatSpot';
import { SubmissionPlayer } from '../teacher/SubmissionPlayer';
import { Button } from '../ui/Button';
import { AudioService } from '../../services/AudioService';
import { logger } from '../../utils/logger';

// --- Clustering: groepeer nearby submissions ---

interface SpotCluster {
  x: number;
  y: number;
  submissions: PraatplaatSubmission[];
}

const CLUSTER_THRESHOLD = 0.05; // 5% van de afbeelding

function clusterSubmissions(submissions: PraatplaatSubmission[]): SpotCluster[] {
  const clusters: SpotCluster[] = [];

  for (const sub of submissions) {
    // Zoek bestaand cluster dichtbij
    const nearbyCluster = clusters.find(
      (c) =>
        Math.abs(c.x - sub.position_x) < CLUSTER_THRESHOLD &&
        Math.abs(c.y - sub.position_y) < CLUSTER_THRESHOLD
    );

    if (nearbyCluster) {
      nearbyCluster.submissions.push(sub);
      // Herbereken centroïde
      const total = nearbyCluster.submissions.length;
      nearbyCluster.x =
        nearbyCluster.submissions.reduce((sum, s) => sum + s.position_x, 0) / total;
      nearbyCluster.y =
        nearbyCluster.submissions.reduce((sum, s) => sum + s.position_y, 0) / total;
    } else {
      clusters.push({
        x: sub.position_x,
        y: sub.position_y,
        submissions: [sub],
      });
    }
  }

  return clusters;
}

// --- Component ---

interface PraatplaatViewerProps {
  praatplaat: PraatplaatRow;
  onClose: () => void;
}

export function PraatplaatViewer({ praatplaat, onClose }: PraatplaatViewerProps) {
  const { t } = useTranslation();
  const audioService = useRef(AudioService.getInstance());

  const [submissions, setSubmissions] = useState<PraatplaatSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Playback state
  const [playingSubmissionId, setPlayingSubmissionId] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  // Clusters
  const [clusters, setClusters] = useState<SpotCluster[]>([]);

  // Dropdown state voor multi-submission spots
  const [dropdownCluster, setDropdownCluster] = useState<SpotCluster | null>(null);

  // --- Data laden ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPraatplaatSubmissions(praatplaat.id);
      setSubmissions(data);
      setClusters(clusterSubmissions(data));
    } catch (err) {
      logger.error('PraatplaatViewer fetch failed:', err);
      setError(err instanceof Error ? err.message : t('teacher.praatplaat.fetchSubmissionsError'));
    } finally {
      setLoading(false);
    }
  }, [praatplaat.id, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Afspelen ---
  const handleSpotClick = useCallback((cluster: SpotCluster) => {
    if (cluster.submissions.length === 1) {
      const sub = cluster.submissions[0];
      if (playingSubmissionId === sub.id) {
        // Stop afspelen
        audioService.current.stop();
        setPlayingSubmissionId(null);
      } else {
        // Start afspelen — open in SubmissionPlayer (bestaand component)
        setPlayingSubmissionId(sub.id);
        setShowTimeline(true);
      }
    } else {
      // Meerdere submissions: toon dropdown
      setDropdownCluster(cluster);
    }
  }, [playingSubmissionId]);

  const handleSubmissionSelect = useCallback((sub: PraatplaatSubmission) => {
    setDropdownCluster(null);
    setPlayingSubmissionId(sub.id);
    setShowTimeline(true);
  }, []);

  const handleStop = useCallback(() => {
    audioService.current.stop();
    setPlayingSubmissionId(null);
    setShowTimeline(false);
  }, []);

  const playingSubmission = submissions.find((s) => s.id === playingSubmissionId);

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
      <div className="flex-1 flex items-center justify-center min-h-0 p-4 pt-16">
        <div className="relative w-full max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-2xl">
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
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <span className="text-white font-medium text-sm truncate mr-4">
              {playingSubmission.student_name} — {playingSubmission.composition_name}
            </span>
            <div className="flex items-center gap-2">
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

      {/* SubmissionPlayer overlay (bestaand component hergebruikt) */}
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

export default PraatplaatViewer;
