/**
 * Video Export Engines — Dual-Engine Architectuur
 *
 * Primary: WebCodecs + Mediabunny (MP4, H.264 + AAC)
 * Fallback: MediaRecorder (WebM, VP8 + Opus)
 *
 * `detectBestEngine()` kiest automatisch op basis van browser capabilities.
 * Geïnspireerd door CueCanvas v2 dual-engine patroon.
 */

import type { ImageSegment } from './canvasFrameRenderer';
import { renderFrame } from './canvasFrameRenderer';
import { logger } from './logger';

// =============================================================================
// Types
// =============================================================================

export type EngineName = 'webcodecs' | 'mediarecorder';

export interface VideoEngine {
  name: EngineName;
  fileExtension: string;
  mimeType: string;
  render(data: EngineRenderData): Promise<Blob>;
}

export interface EngineRenderData {
  imageTimeline: ImageSegment[];
  imageCache: Map<string, ImageBitmap>;
  audioBuffer: AudioBuffer;
  /** Totale video-duur in seconden (kan langer zijn dan audioBuffer) */
  videoDuration: number;
  width: number;
  height: number;
  fps: number;
  crossfadeDuration: number;
  onProgress: (percent: number) => void;
}

// =============================================================================
// Engine Detection
// =============================================================================

/**
 * Detecteer de beste beschikbare video export engine.
 *
 * Voorkeursvolgorde:
 * 1. WebCodecs + H.264 hardware encoding → MP4
 * 2. WebCodecs + H.264 software encoding → MP4 (fallback als GPU geen H.264 ondersteunt)
 * 3. MediaRecorder → WebM (laatste redmiddel)
 *
 * Retourneert null als geen enkele engine beschikbaar is.
 */
export async function detectBestEngine(): Promise<VideoEngine | null> {
  // De WebCodecs-engine rendert naar een OffscreenCanvas; zonder die API zou hij
  // pas bij render-tijd crashen. Neem 'm daarom op in de capability-check, zodat we
  // netjes doorvallen naar de MediaRecorder-fallback (die een DOM-canvas gebruikt).
  const hasOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';
  if (
    hasOffscreenCanvas &&
    typeof VideoEncoder !== 'undefined' &&
    typeof VideoFrame !== 'undefined'
  ) {
    // Probeer H.264 met hardware acceleratie (snel, GPU-based)
    const hwCodec = await checkH264Support('no-preference');
    if (hwCodec) {
      logger.info(`[videoEngine] WebCodecs engine selected (${hwCodec} hardware)`);
      return createWebCodecsEngine('no-preference', hwCodec);
    }

    // Probeer H.264 met software encoding (langzamer, maar werkt altijd in Chrome)
    const swCodec = await checkH264Support('prefer-software');
    if (swCodec) {
      logger.info(`[videoEngine] WebCodecs engine selected (${swCodec} software)`);
      return createWebCodecsEngine('prefer-software', swCodec);
    }

    logger.info('[videoEngine] H.264 not supported (neither hardware nor software)');
  } else {
    logger.info('[videoEngine] WebCodecs/OffscreenCanvas not available', {
      OffscreenCanvas: typeof OffscreenCanvas,
      VideoEncoder: typeof VideoEncoder,
      VideoFrame: typeof VideoFrame,
    });
  }

  // Probeer MediaRecorder (fallback)
  if (typeof MediaRecorder !== 'undefined') {
    logger.info('[videoEngine] MediaRecorder engine selected (fallback)');
    return createMediaRecorderEngine();
  }

  logger.warn('[videoEngine] No video export engine available');
  return null;
}

/**
 * H.264 profielen in volgorde van voorkeur.
 * Baseline (42001f) is het meest compatibel voor playback, maar niet alle
 * machines ondersteunen Baseline *encoding*. Main (4d0028) en High (640028)
 * worden breder ondersteund door GPU encoders.
 */
const H264_PROFILES = [
  'avc1.4d0028', // Main Profile Level 4.0 — breed ondersteund voor encoding
  'avc1.640028', // High Profile Level 4.0 — beste kwaliteit
  'avc1.42001f', // Baseline Profile Level 3.1 — maximale playback-compatibiliteit
] as const;

/**
 * Check of H.264 encoding beschikbaar is met de gegeven acceleratie-modus.
 * Probeert meerdere profielen en retourneert het eerste dat werkt.
 */
async function checkH264Support(
  hardwareAcceleration: HWAccel,
): Promise<string | null> {
  for (const codec of H264_PROFILES) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width: 1920,
        height: 1080,
        bitrate: 4_000_000,
        framerate: 30,
        hardwareAcceleration,
      });
      if (support.supported) {
        logger.info(`[videoEngine] H.264 ${codec} + ${hardwareAcceleration} = supported`);
        return codec;
      }
    } catch {
      // Profiel niet ondersteund, probeer volgende
    }
  }
  logger.info(`[videoEngine] No H.264 profile supported with ${hardwareAcceleration}`);
  return null;
}

// =============================================================================
// WebCodecs Engine (Primary) — MP4 via Mediabunny
// =============================================================================

type HWAccel = 'no-preference' | 'prefer-hardware' | 'prefer-software';

function createWebCodecsEngine(hardwareAcceleration: HWAccel = 'no-preference', codecString?: string): VideoEngine {
  return {
    name: 'webcodecs',
    fileExtension: 'mp4',
    mimeType: 'video/mp4',

    async render(data: EngineRenderData): Promise<Blob> {
      const {
        imageTimeline,
        imageCache,
        audioBuffer,
        videoDuration,
        width,
        height,
        fps,
        crossfadeDuration,
        onProgress,
      } = data;

      // Dynamisch import voor tree-shaking (Vite code-split)
      const {
        Output,
        BufferTarget,
        Mp4OutputFormat,
        CanvasSource,
        AudioBufferSource,
      } = await import('mediabunny');

      const totalFrames = Math.ceil(videoDuration * fps);
      const frameDuration = 1 / fps;

      // --- Output setup ---
      const target = new BufferTarget();
      const output = new Output({
        format: new Mp4OutputFormat(),
        target,
      });

      // --- Video track via CanvasSource ---
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d')!;

      const videoSource = new CanvasSource(canvas, {
        codec: 'avc',
        ...(codecString ? { fullCodecString: codecString } : {}),
        bitrate: 4_000_000,
        keyFrameInterval: 5, // Keyframe elke 5 seconden
        hardwareAcceleration,
      });
      output.addVideoTrack(videoSource);

      // --- Audio track via AudioBufferSource ---
      const audioSource = new AudioBufferSource({
        codec: 'aac',
        bitrate: 128_000,
      });
      output.addAudioTrack(audioSource);

      // --- Start output ---
      await output.start();

      // --- Video Frame Loop ---
      for (let i = 0; i < totalFrames; i++) {
        const time = i / fps;

        renderFrame(ctx, time, imageTimeline, imageCache, width, height, crossfadeDuration);

        await videoSource.add(time, frameDuration);

        // Yield naar main thread elke 10 frames om UI responsive te houden
        if (i % 10 === 0) {
          onProgress(Math.round((i / totalFrames) * 80));
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      videoSource.close();
      onProgress(80);

      // --- Audio ---
      await audioSource.add(audioBuffer);
      audioSource.close();

      onProgress(95);

      // --- Finalize ---
      await output.finalize();

      onProgress(100);

      return new Blob([target.buffer!], { type: 'video/mp4' });
    },
  };
}

// =============================================================================
// MediaRecorder Engine (Fallback) — WebM
// =============================================================================

function createMediaRecorderEngine(): VideoEngine {
  return {
    name: 'mediarecorder',
    fileExtension: 'webm',
    mimeType: 'video/webm',

    async render(data: EngineRenderData): Promise<Blob> {
      const {
        imageTimeline,
        imageCache,
        audioBuffer,
        videoDuration,
        width,
        height,
        fps,
        crossfadeDuration,
        onProgress,
      } = data;

      // --- Canvas + Video Stream ---
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      const videoStream = canvas.captureStream(fps);

      // --- Audio Stream ---
      const audioContext = new AudioContext({ sampleRate: audioBuffer.sampleRate });
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);

      // Combineer video + audio streams
      const combinedStream = new MediaStream([
        ...videoStream.getTracks(),
        ...destination.stream.getTracks(),
      ]);

      // --- MediaRecorder Setup ---
      const mimeType = selectMimeType();
      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 4_000_000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      // --- Start Recording + Audio ---
      recorder.start(100); // Chunk elke 100ms
      source.start();

      onProgress(5);

      // --- Frame Loop (realtime) ---
      const frameInterval = 1000 / fps;
      const startTime = performance.now();

      await new Promise<void>((resolve) => {
        const drawFrame = () => {
          const elapsed = (performance.now() - startTime) / 1000;

          if (elapsed >= videoDuration) {
            resolve();
            return;
          }

          renderFrame(ctx, elapsed, imageTimeline, imageCache, width, height, crossfadeDuration);

          onProgress(5 + Math.round((elapsed / videoDuration) * 90));

          setTimeout(drawFrame, frameInterval);
        };

        drawFrame();
      });

      onProgress(95);

      // --- Stop ---
      source.stop();
      recorder.stop();
      await audioContext.close();

      // Wacht tot recorder klaar is
      const blob = await new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          const result = new Blob(chunks, { type: mimeType || 'video/webm' });
          resolve(result);
        };
      });

      onProgress(100);

      return blob;
    },
  };
}

/**
 * Selecteer het beste beschikbare MIME type voor MediaRecorder.
 */
function selectMimeType(): string {
  const options = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp8',
    'video/webm',
  ];

  for (const mime of options) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }

  return 'video/webm';
}
