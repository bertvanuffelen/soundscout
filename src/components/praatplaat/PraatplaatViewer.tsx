/**
 * PraatplaatViewer - Docent presenteert de praatplaat (#72)
 *
 * Sinds M5 een dunne schil om het universele PresentationSurface
 * (mode 'teacher-present' + interactiveBoard): de plaat met klikbare,
 * geclusterde spots; klik = die inzending afspelen; zijpaneel =
 * inzendingenlijst; doorspelen, montagelijn-toggle en fullscreen komen
 * gratis mee. Deze schil laadt alleen nog de inzendingen en dekt de
 * voorstadia (laden / fout / leeg / preview zonder klas).
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2 } from 'lucide-react';
import { getPraatplaatSubmissions } from '../../lib/praatplaat';
import type { PraatplaatRow } from '../../lib/praatplaat';
import type { Submission } from '../../hooks/useSubmissions';
import { PresentationSurface } from '../presentation/PresentationSurface';
import { Button } from '../ui/Button';
import { logger } from '../../utils/logger';

interface PraatplaatViewerProps {
  praatplaat: PraatplaatRow;
  /** Als classId is opgegeven, worden alleen submissions van die klas getoond. Zonder: alleen de afbeelding. */
  classId?: string;
  onClose: () => void;
}

export function PraatplaatViewer({ praatplaat, classId, onClose }: PraatplaatViewerProps) {
  const { t } = useTranslation();

  const [playlist, setPlaylist] = useState<Submission[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!classId) {
      // Geen classId = preview-modus: alleen de afbeelding
      setPlaylist([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getPraatplaatSubmissions(praatplaat.id, classId);
      // Positie uit de submission-kolommen in de compositie injecteren,
      // zodat de surface-spots (praatplaatPosition) altijd kloppen
      setPlaylist(data.map((sub) => ({
        id: sub.id,
        student_name: sub.student_name,
        composition_name: sub.composition_name,
        composition_data: {
          ...sub.composition_data,
          praatplaatPosition: sub.composition_data?.praatplaatPosition
            ?? { x: sub.position_x, y: sub.position_y },
        },
        created_at: sub.created_at,
      })));
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

  // --- Voorstadia: laden / fout / leeg (surface vereist ≥1 item) ---
  if (loading || error || !playlist || playlist.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-brand-900 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2.5 shrink-0">
          <span className="text-brand-200 text-sm font-semibold truncate">{praatplaat.name}</span>
          <button
            onClick={onClose}
            className="p-2 text-brand-300 hover:text-white rounded-lg hover:bg-brand-800 transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 min-h-0 relative flex items-center justify-center p-3">
          <img
            src={praatplaat.image_url}
            alt={praatplaat.name}
            className="h-full w-auto max-w-full rounded-xl object-contain"
            draggable={false}
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
              <Loader2 className="w-10 h-10 text-white animate-spin" aria-hidden="true" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-bg-surface rounded-xl px-6 py-4 text-center max-w-xs">
                <p className="text-error-600 text-sm mb-2">{error}</p>
                <Button variant="secondary" size="sm" onClick={fetchData}>
                  {t('common.retry')}
                </Button>
              </div>
            </div>
          )}
          {!loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-bg-surface/90 rounded-2xl px-8 py-6 text-center max-w-sm">
                <p className="text-text-main font-medium mb-1">
                  {t('teacher.praatplaat.viewer.emptyTitle')}
                </p>
                <p className="text-text-muted text-sm">
                  {t('teacher.praatplaat.viewer.emptyDescription')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <PresentationSurface
      playlist={playlist}
      mode="teacher-present"
      onClose={onClose}
      interactiveBoard={{ imageUrl: praatplaat.image_url, name: praatplaat.name }}
    />
  );
}

export default PraatplaatViewer;
