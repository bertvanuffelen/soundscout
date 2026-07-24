/**
 * useVideoExport - React hook for exporting storyboard compositions as video
 *
 * Follows the same pattern as useAudioExport.
 * Detects the best available engine on mount (WebCodecs or MediaRecorder).
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { exportToVideo } from '../utils/videoExport';
import { detectBestEngine } from '../utils/videoExportEngines';
import type { EngineName } from '../utils/videoExportEngines';
import { downloadBlob } from '../utils/audioExport';
import { useTimelineStore } from '../stores/timelineStore';
import type { Track, Sample, Section, Storyboard } from '../types';
import { logger } from '../utils/logger';
import i18n from '../i18n';

export type VideoExportState = 'idle' | 'exporting' | 'success' | 'error' | 'unsupported';

interface UseVideoExportOptions {
  /** Default filename (without extension) */
  defaultFilename?: string;
}

interface UseVideoExportReturn {
  /** Current export state */
  videoExportState: VideoExportState;
  /** Export progress (0-100) */
  videoProgress: number;
  /** Error message if export failed */
  videoError: string | null;
  /** Waarschuwing bij geslaagde export met ontbrekende geluiden/beelden (audit #1/#2) */
  videoWarning: string | null;
  /** Which engine is available ('webcodecs' | 'mediarecorder' | null) */
  engineName: EngineName | null;
  /** File extension that will be produced ('mp4' or 'webm') */
  fileExtension: string | null;
  /** Start exporting video */
  exportVideo: (
    storyboard: Storyboard,
    tracks: Track[],
    samples: Sample[],
    totalBeats: number,
    sections: Section[],
    filename?: string,
  ) => Promise<void>;
  /** Reset state */
  reset: () => void;
}

export function useVideoExport(
  options: UseVideoExportOptions = {},
): UseVideoExportReturn {
  const { defaultFilename = 'mijn-compositie' } = options;

  const [videoExportState, setVideoExportState] = useState<VideoExportState>('idle');
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoWarning, setVideoWarning] = useState<string | null>(null);
  const [engineName, setEngineName] = useState<EngineName | null>(null);
  const [fileExtension, setFileExtension] = useState<string | null>(null);

  // Detect engine on mount
  const detectedRef = useRef(false);

  useEffect(() => {
    if (detectedRef.current) return;
    detectedRef.current = true;

    detectBestEngine().then((engine) => {
      if (engine) {
        setEngineName(engine.name);
        setFileExtension(engine.fileExtension);
        logger.info(`[useVideoExport] Engine detected: ${engine.name} (${engine.fileExtension})`);
      } else {
        setVideoExportState('unsupported');
        logger.info('[useVideoExport] No video export engine available');
      }
    });
  }, []);

  const exportVideo = useCallback(
    async (
      storyboard: Storyboard,
      tracks: Track[],
      samples: Sample[],
      totalBeats: number,
      sections: Section[],
      filename?: string,
    ): Promise<void> => {
      setVideoExportState('exporting');
      setVideoProgress(0);
      setVideoError(null);
      setVideoWarning(null);

      try {
        logger.info('[useVideoExport] Starting video export');

        const result = await exportToVideo(
          storyboard,
          tracks,
          samples,
          totalBeats,
          sections,
          // Compositie-tempo (B0) + solo (D6) meegeven — zie useAudioExport
          {
            bpm: useTimelineStore.getState().bpm,
            soloTrackIndex: useTimelineStore.getState().soloTrackIndex,
          },
          (percent) => {
            setVideoProgress(percent);
          },
        );

        // Eerlijkheid boven stilte (audit #1/#2): geslaagd mét ontbrekende
        // onderdelen is een waarschuwing waard
        const warnings: string[] = [];
        if (result.missingSampleIds.length > 0) {
          warnings.push(i18n.t('stage.exportMissingSamples', { count: result.missingSampleIds.length }));
        }
        if (result.missingImages > 0) {
          warnings.push(i18n.t('stage.videoMissingImages', { count: result.missingImages }));
        }
        if (result.usedRealtimeFallback) {
          // Fase 4: realtime-vangnet gebruikt voor de audio — informatief
          warnings.push(i18n.t('stage.exportRealtimeFallback'));
        }
        if (warnings.length > 0) setVideoWarning(warnings.join(' '));

        // Trigger download
        const finalFilename = `${filename || defaultFilename}.${result.extension}`;
        downloadBlob(result.blob, finalFilename);

        setVideoExportState('success');
        logger.info('[useVideoExport] Video export successful', {
          filename: finalFilename,
          engine: result.engineName,
          size: result.blob.size,
        });

        // Auto-reset after success
        setTimeout(() => {
          setVideoExportState('idle');
          setVideoProgress(0);
        }, 3000);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : i18n.t('errors.export.video');
        logger.error('[useVideoExport] Video export failed', err);
        setVideoError(errorMessage);
        setVideoExportState('error');
      }
    },
    [defaultFilename],
  );

  const reset = useCallback(() => {
    setVideoExportState(engineName ? 'idle' : 'unsupported');
    setVideoProgress(0);
    setVideoError(null);
    setVideoWarning(null);
  }, [engineName]);

  return {
    videoExportState,
    videoProgress,
    videoError,
    videoWarning,
    engineName,
    fileExtension,
    exportVideo,
    reset,
  };
}
