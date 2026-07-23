/**
 * Video Export — Orchestratie
 *
 * Combineert storyboard-afbeeldingen + audio tot een video (MP4 of WebM).
 * Hergebruikt de bestaande Tone.Offline audio rendering uit audioExport.ts.
 *
 * Flow:
 * 1. Engine detectie (WebCodecs of MediaRecorder)
 * 2. Audio renderen via Tone.Offline
 * 3. Afbeeldingen preloaden als ImageBitmap
 * 4. Image timeline berekenen (sections → seconden)
 * 5. Video renderen via geselecteerde engine
 */

import type { Track, Sample, Section, Storyboard } from '../types';
import { DEFAULT_BPM } from '../constants/config';
import { beatsToSeconds } from './audio';
import { preloadBuffers, renderOffline, calculateTimelineDuration, findMissingSampleIds } from './audioExport';
import { preloadImages, computeImageTimeline } from './canvasFrameRenderer';
import { detectBestEngine } from './videoExportEngines';
import type { EngineName } from './videoExportEngines';
import { logger } from './logger';
import i18n from '../i18n';

// =============================================================================
// Types
// =============================================================================

export interface VideoExportOptions {
  /** Video breedte in pixels (default: 1920) */
  width?: number;
  /** Video hoogte in pixels (default: 1080) */
  height?: number;
  /** Frames per seconde (default: 30) */
  fps?: number;
  /** Crossfade duur in seconden (default: 0.5) */
  crossfadeDuration?: number;
  /** Tempo van de compositie in BPM (default: DEFAULT_BPM) — zie audioExport */
  bpm?: number;
  /** Solo-spoor (D6): export = wat je hoort. null/undefined = geen solo. */
  soloTrackIndex?: number | null;
}

export interface VideoExportResult {
  /** De video als Blob */
  blob: Blob;
  /** Bestandsextensie ('mp4' of 'webm') */
  extension: string;
  /** MIME type */
  mimeType: string;
  /** Welke engine is gebruikt */
  engineName: EngineName;
  /** Tijdlijn-samples die niet geladen konden worden (ontbreken in de video) */
  missingSampleIds: string[];
  /** Aantal storyboard-afbeeldingen dat niet geladen kon worden (zwart segment) */
  missingImages: number;
}

export type VideoProgressCallback = (percent: number) => void;

// =============================================================================
// Main Export Function
// =============================================================================

/**
 * Exporteer een storyboard-compositie als video.
 *
 * @throws Error als geen engine beschikbaar is of als de timeline leeg is
 */
export async function exportToVideo(
  storyboard: Storyboard,
  tracks: Track[],
  samples: Sample[],
  totalBeats: number,
  sections: Section[],
  options: VideoExportOptions = {},
  onProgress?: VideoProgressCallback,
): Promise<VideoExportResult> {
  const {
    width = 1920,
    height = 1080,
    fps = 30,
    crossfadeDuration = 0.5,
    bpm = DEFAULT_BPM,
    soloTrackIndex = null,
  } = options;

  logger.info('[videoExport] Starting video export', {
    images: storyboard.images.length,
    width,
    height,
    fps,
    crossfadeDuration,
  });

  // --- Fase 1: Engine detectie (0–2%) ---
  onProgress?.(0);
  const engine = await detectBestEngine();

  if (!engine) {
    throw new Error(i18n.t('stage.videoNotSupported'));
  }

  logger.info(`[videoExport] Using engine: ${engine.name}`);
  onProgress?.(2);

  // --- Fase 2: Audio renderen (2–25%) ---
  // Video-duur = maximum van audio-duur en volledige timeline-duur.
  // Zo wordt het storyboard volledig getoond, ook als de laatste secties stil zijn.
  const audioDuration = calculateTimelineDuration(tracks, samples, bpm, soloTrackIndex);
  const timelineDuration = beatsToSeconds(totalBeats, bpm) + 0.5;
  const duration = Math.max(audioDuration, timelineDuration);

  if (audioDuration <= 0.5 && storyboard.images.length === 0) {
    throw new Error(i18n.t('stage.videoNoContent'));
  }

  const { bufferMap } = await preloadBuffers(samples, (p) => {
    // preloadBuffers progress: 0–0.3 → map naar 2–10%
    onProgress?.(2 + Math.round(p * 27));
  });
  // Ontbrekende geluiden zichtbaar maken i.p.v. stil weglaten (exports-audit #1)
  const missingSampleIds = findMissingSampleIds(tracks, bufferMap);

  const audioBuffer = await renderOffline(
    tracks,
    samples,
    duration,
    bufferMap,
    { sampleRate: 44100, channels: 2, bpm, soloTrackIndex },
    (p) => {
      // renderOffline progress: 0.3–0.7 → map naar 10–25%
      onProgress?.(10 + Math.round((p - 0.3) * 37.5));
    },
  );

  onProgress?.(25);

  // --- Fase 3: Afbeeldingen laden (25–35%) ---
  const imageUrls = storyboard.images.map((img) => img.url);
  const imageCache = await preloadImages(imageUrls);

  if (imageCache.size === 0) {
    throw new Error(i18n.t('stage.videoNoImages'));
  }
  // Deels mislukte beelden → zwart segment; meld het aantal (exports-audit #2)
  const missingImages = imageUrls.length - imageCache.size;

  onProgress?.(35);

  // --- Fase 4: Image timeline berekenen (35%) ---
  // Compositie-bpm gebruiken (exports-audit #13): beeldwissels moeten
  // hetzelfde tempo volgen als de audio-render hierboven
  const imageTimeline = computeImageTimeline(
    imageUrls,
    totalBeats,
    sections,
    bpm,
  );

  logger.info('[videoExport] Image timeline computed', {
    segments: imageTimeline.length,
    audioDuration: audioBuffer.duration,
    videoDuration: duration,
  });

  // --- Fase 5: Video renderen (35–100%) ---
  const blob = await engine.render({
    imageTimeline,
    imageCache,
    audioBuffer,
    videoDuration: duration,
    width,
    height,
    fps,
    crossfadeDuration,
    onProgress: (enginePercent) => {
      // Engine progress: 0–100 → map naar 35–100%
      onProgress?.(35 + Math.round(enginePercent * 0.65));
    },
  });

  logger.info('[videoExport] Export complete', {
    engine: engine.name,
    size: blob.size,
    extension: engine.fileExtension,
  });

  return {
    blob,
    extension: engine.fileExtension,
    mimeType: engine.mimeType,
    engineName: engine.name,
    missingSampleIds,
    missingImages,
  };
}
