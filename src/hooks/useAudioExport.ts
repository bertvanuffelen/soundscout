/**
 * useAudioExport - React hook for exporting timeline compositions
 *
 * Provides state management and callbacks for audio export operations.
 */

import { useState, useCallback } from 'react';
import { exportToMp3, downloadBlob } from '../utils/audioExport';
import { useTimelineStore } from '../stores/timelineStore';
import type { Track, Sample } from '../types';
import { logger } from '../utils/logger';
import i18n from '../i18n';

export type ExportState = 'idle' | 'exporting' | 'success' | 'error';

interface UseAudioExportOptions {
  /** Default filename (without extension) */
  defaultFilename?: string;
}

interface UseAudioExportReturn {
  /** Current export state */
  exportState: ExportState;
  /** Export progress (0-100) */
  progress: number;
  /** Error message if export failed */
  error: string | null;
  /** Waarschuwing bij een geslaagde export met ontbrekende geluiden (audit #1) */
  warning: string | null;
  /** Start exporting to MP3 */
  exportMp3: (tracks: Track[], samples: Sample[], filename?: string) => Promise<void>;
  /** Reset state after export */
  reset: () => void;
}

export function useAudioExport(
  options: UseAudioExportOptions = {}
): UseAudioExportReturn {
  const { defaultFilename = 'mijn-compositie' } = options;

  const [exportState, setExportState] = useState<ExportState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const exportMp3 = useCallback(
    async (
      tracks: Track[],
      samples: Sample[],
      filename?: string
    ): Promise<void> => {
      setExportState('exporting');
      setProgress(0);
      setError(null);
      setWarning(null);

      try {
        logger.info('Starting MP3 export');

        // Compositie-tempo meegeven (B0): zonder dit zou de export het vaste
        // standaardtempo gebruiken zodra BPM ooit variabel wordt.
        // Solo meegeven (D6): export = wat je hoort — een gesoloed spoor
        // exporteert alleen dat spoor, gemute clips blijven stil.
        const { bpm, soloTrackIndex, sequences } = useTimelineStore.getState();
        const { blob, missingSampleIds, usedRealtimeFallback } = await exportToMp3(
          tracks, samples, { bitrate: 128, bpm, soloTrackIndex, sequences }, (p) => {
            setProgress(Math.round(p * 100));
          }
        );

        // Eerlijkheid boven stilte (audit #1): geslaagd mét ontbrekende
        // geluiden is een waarschuwing waard, geen stilzwijgen
        if (missingSampleIds.length > 0) {
          setWarning(i18n.t('stage.exportMissingSamples', { count: missingSampleIds.length }));
        } else if (usedRealtimeFallback) {
          // Fase 4: vangnet gebruikt — informeer eerlijk, geen fout
          setWarning(i18n.t('stage.exportRealtimeFallback'));
        }

        // Trigger download
        const finalFilename = `${filename || defaultFilename}.mp3`;
        downloadBlob(blob, finalFilename);

        setExportState('success');
        logger.info('MP3 export successful', { filename: finalFilename });

        // Auto-reset after success
        setTimeout(() => {
          setExportState('idle');
          setProgress(0);
        }, 3000);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : i18n.t('errors.export.mp3');
        logger.error('MP3 export failed', err);
        setError(errorMessage);
        setExportState('error');
      }
    },
    [defaultFilename]
  );

  const reset = useCallback(() => {
    setExportState('idle');
    setProgress(0);
    setError(null);
    setWarning(null);
  }, []);

  return {
    exportState,
    progress,
    error,
    warning,
    exportMp3,
    reset,
  };
}
