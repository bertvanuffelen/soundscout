/**
 * Audio Export Utilities
 *
 * Provides functions to export timeline compositions as WAV or MP3 files.
 * Uses Tone.Offline for sample-accurate offline rendering.
 */

import * as Tone from 'tone';
import type { Track, Sample } from '../types';
import { DEFAULT_BPM } from '../constants/config';
import { logger } from './logger';
import { generateClipEvents } from '../services/audioEvents';
import { buildClipChain, scheduleFadeCurves } from '../services/audioGraph';
import { pitchBufferService } from '../services/PitchBufferService';
import { analyzeAudioBuffer, formatRenderAnalysis } from './renderValidation';
import { audioService } from '../services/AudioService';

// =============================================================================
// Types
// =============================================================================

export interface ExportOptions {
  /** Sample rate in Hz (default: 44100) */
  sampleRate?: number;
  /** Number of audio channels (default: 2 for stereo) */
  channels?: number;
  /** Tempo van de compositie in BPM (default: DEFAULT_BPM). Zonder deze
   *  parameter zou de export het vaste standaardtempo gebruiken en bij een
   *  ooit-variabel tempo verkeerd renderen. */
  bpm?: number;
  /** Solo-spoor (D6): export = wat je hoort. null/undefined = geen solo. */
  soloTrackIndex?: number | null;
}

export interface Mp3ExportOptions extends ExportOptions {
  /** MP3 bitrate in kbps (default: 128) */
  bitrate?: number;
}

export type ExportProgressCallback = (progress: number) => void;

// =============================================================================
// Helper Functions
// =============================================================================

export interface PreloadResult {
  bufferMap: Map<string, Tone.ToneAudioBuffer>;
  /** Sample-ids die niet geladen konden worden (404/netwerk) */
  failedIds: string[];
}

/**
 * Preload all sample buffers for offline rendering.
 * Buffers must be loaded BEFORE calling Tone.Offline.
 * Laadfouten worden verzameld i.p.v. stil geslikt (exports-audit #1):
 * de aanroeper beslist of dat een waarschuwing aan de gebruiker wordt.
 */
export async function preloadBuffers(
  samples: Sample[],
  onProgress?: ExportProgressCallback
): Promise<PreloadResult> {
  const bufferMap = new Map<string, Tone.ToneAudioBuffer>();
  const failedIds: string[] = [];
  let loaded = 0;

  await Promise.all(
    samples.map(async (sample) => {
      try {
        // Hergebruik buffers die de studio al geladen heeft (audit #15) —
        // scheelt een dubbele download/decodeer-slag per sample
        const existing = audioService.getLoadedBuffer(sample.id);
        if (existing) {
          bufferMap.set(sample.id, existing);
        } else {
          const buffer = new Tone.ToneAudioBuffer();
          await buffer.load(sample.audioUrl);
          bufferMap.set(sample.id, buffer);
        }
      } catch (err) {
        logger.warn(`Failed to preload buffer for "${sample.id}"`, err);
        failedIds.push(sample.id);
      }
      loaded++;
      onProgress?.(loaded / samples.length * 0.3); // 0-30% for loading
    })
  );

  return { bufferMap, failedIds };
}

/**
 * Bak alle pitch-buffers voor deze tijdlijn (Fase 3). VÓÓR renderOffline
 * awaiten: de export mag nooit op de PitchShift-fallback renderen zolang
 * Signalsmith beschikbaar is.
 */
export async function ensurePitchBuffers(
  tracks: Track[],
  bufferMap: Map<string, Tone.ToneAudioBuffer>
): Promise<void> {
  await pitchBufferService.ensureForTracks(tracks, (sampleId) => {
    const buffer = bufferMap.get(sampleId);
    return buffer?.loaded ? (buffer.get() as AudioBuffer | undefined) : undefined;
  });
}

/**
 * Sample-ids die op de tijdlijn gebruikt worden maar geen buffer hebben —
 * die geluiden ontbreken in de export en verdienen een gebruikersmelding.
 */
export function findMissingSampleIds(
  tracks: Track[],
  bufferMap: Map<string, Tone.ToneAudioBuffer>
): string[] {
  const used = new Set(tracks.flatMap((t) => t.clips.map((c) => c.sampleId)));
  return [...used].filter((id) => !bufferMap.has(id));
}

/**
 * Calculate total duration of timeline in seconds.
 *
 * Gebruikt de gedeelde event-generatie: hoorbaar einde inclusief galmstaart
 * (exports-audit #5), exclusief gemute/weggesoloede clips — de export duurt
 * precies zo lang als wat je hoort.
 */
export function calculateTimelineDuration(
  tracks: Track[],
  samples: Sample[],
  bpm: number = DEFAULT_BPM,
  soloTrackIndex: number | null = null
): number {
  const { lastAudibleSeconds } = generateClipEvents(tracks, samples, {
    bpm,
    soloTrackIndex,
  });
  // Add a small buffer at the end (0.5 seconds)
  return lastAudibleSeconds + 0.5;
}

/**
 * Convert Float32 audio samples to Int16 PCM.
 * Required for MP3 encoding.
 */
function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

// =============================================================================
// Core Rendering Function
// =============================================================================

/**
 * Render timeline to AudioBuffer using Tone.Offline.
 *
 * Audio Engine v2: gebruikt exact dezelfde event-generatie
 * (generateClipEvents) en ketenbouwer (buildClipChain) als de live motor.
 * Per event een vérse keten en player (ook per loop-iteratie — D1/D2/D3),
 * fades op elke iteratie zoals live (D4), bus-structuur (D5) en solo/mute
 * in de events gebakken (D6). Zie docs/audio/PLAN-AUDIO-ENGINE-V2.md.
 */
export async function renderOffline(
  tracks: Track[],
  samples: Sample[],
  duration: number,
  bufferMap: Map<string, Tone.ToneAudioBuffer>,
  options: ExportOptions = {},
  onProgress?: ExportProgressCallback
): Promise<AudioBuffer> {
  const {
    sampleRate = 44100,
    channels = 2,
    bpm = DEFAULT_BPM,
    soloTrackIndex = null,
  } = options;

  logger.info('Starting offline render', { duration, sampleRate, channels });

  // Gedeelde event-generatie — identiek aan AudioService.scheduleTimeline
  const generated = generateClipEvents(tracks, samples, {
    bpm,
    soloTrackIndex,
    hasBuffer: (sampleId) => bufferMap.has(sampleId),
  });

  // Render offline using Tone.Offline
  const renderedToneBuffer = await Tone.Offline(
    async ({ transport }) => {
      transport.bpm.value = bpm;

      // Bus-structuur zoals live: trackBus per spoor → master → destination.
      // Mute/solo zit al in de events (isMuted), dus alle buses op gain 1.
      const masterBus = new Tone.Volume(0).toDestination();
      const trackBuses = tracks.map(() => new Tone.Gain(1).connect(masterBus));

      // Reverb is sinds Fase 2 een deterministische Convolver-IR
      // (ReverbIRService) — synchroon, dus géén ready-await meer nodig.
      generated.events.forEach((event) => {
        if (event.isMuted) return;
        const buffer = bufferMap.get(event.sampleId);
        if (!buffer) return;

        // Pitch als gebakken buffer (Fase 3) — exportflows hebben de bakes
        // vooraf ge-await via ensurePitchBuffers, dus dit is vrijwel altijd
        // de Signalsmith-buffer; anders PitchShift-fallback (zoals live).
        const resolved = pitchBufferService.resolveForPlayback(
          event.sampleId, event.effects, buffer
        );

        // Verse keten + player per event (gedeelde builder)
        const chain = buildClipChain(event.volumeDb, resolved.effects);

        const player = new Tone.Player(resolved.buffer);
        player.connect(chain.input);
        chain.output.connect(trackBuses[event.trackIndex] ?? masterBus);

        const { time, trimStart, duration: eventDuration, fadeIn, fadeOut } = event;
        transport.schedule((t) => {
          if (chain.fadeGain) {
            scheduleFadeCurves(chain.fadeGain, t, eventDuration, fadeIn, fadeOut);
          }
          player.start(t, trimStart, eventDuration);
        }, time);
      });

      // Start transport immediately in offline context
      transport.start(0);
    },
    duration,
    channels,
    sampleRate
  );

  onProgress?.(0.7); // 70% after rendering

  // Convert ToneAudioBuffer to native AudioBuffer
  const renderedBuffer = renderedToneBuffer.get() as AudioBuffer;
  logger.info('Offline render complete', { length: renderedBuffer.length });

  return renderedBuffer;
}

// =============================================================================
// Export Functions
// =============================================================================

export interface Mp3ExportResult {
  blob: Blob;
  /** Tijdlijn-samples die niet geladen konden worden en dus in de MP3 ontbreken */
  missingSampleIds: string[];
  /** True als de validator de offline render afkeurde en het realtime-vangnet is gebruikt */
  usedRealtimeFallback: boolean;
}

/**
 * Valideer een offline render en val zo nodig terug op de realtime capture
 * (Fase 4). Geeft de definitieve buffer + of het vangnet is gebruikt.
 */
export async function validateOrCapture(
  audioBuffer: AudioBuffer,
  tracks: Track[],
  samples: Sample[],
  duration: number,
  onProgress?: (fraction: number) => void
): Promise<{ buffer: AudioBuffer; usedRealtimeFallback: boolean }> {
  const analysis = analyzeAudioBuffer(audioBuffer);
  logger.info('Export-validatie: ' + formatRenderAnalysis(analysis));
  if (!analysis.suspicious) {
    return { buffer: audioBuffer, usedRealtimeFallback: false };
  }
  logger.warn('Offline render verdacht — realtime-capture-vangnet wordt gebruikt', {
    reasons: analysis.reasons,
  });
  try {
    const captured = await audioService.captureRender(tracks, samples, duration, onProgress);
    const capturedAnalysis = analyzeAudioBuffer(captured);
    logger.info('Vangnet-validatie: ' + formatRenderAnalysis(capturedAnalysis));
    // Nooit stilte exporteren: is de capture (vrijwel) stil terwijl de
    // offline render dat niet was, dan is de opname mislukt — liever de
    // verdachte render dan een leeg bestand.
    if (capturedAnalysis.peak < 0.001 && analysis.peak >= 0.001) {
      logger.warn('Realtime-vangnet leverde stilte — offline render tóch gebruikt');
      return { buffer: audioBuffer, usedRealtimeFallback: false };
    }
    return { buffer: captured, usedRealtimeFallback: true };
  } catch (err) {
    logger.warn('Realtime-vangnet mislukt — offline render tóch gebruikt', err);
    return { buffer: audioBuffer, usedRealtimeFallback: false };
  }
}

/**
 * Export timeline as MP3 file.
 * Uses lamejs for in-browser MP3 encoding.
 */
export async function exportToMp3(
  tracks: Track[],
  samples: Sample[],
  options: Mp3ExportOptions = {},
  onProgress?: ExportProgressCallback
): Promise<Mp3ExportResult> {
  const { bitrate = 128 } = options;
  onProgress?.(0);

  // lamejs vroeg laden (exports-audit #14): een chunk-load-fout valt dan
  // vóór de dure render, niet erna
  const lamejsPromise = import('@breezystack/lamejs');
  lamejsPromise.catch(() => { /* fout komt terug bij de await in encodeToMp3 */ });

  // Calculate duration
  const duration = calculateTimelineDuration(
    tracks, samples, options.bpm, options.soloTrackIndex ?? null
  );
  if (duration <= 0.5) {
    throw new Error('No clips on timeline');
  }

  // Preload all buffers + pitch-bakes
  const { bufferMap } = await preloadBuffers(samples, onProgress);
  const missingSampleIds = findMissingSampleIds(tracks, bufferMap);
  await ensurePitchBuffers(tracks, bufferMap);

  // Render offline
  const renderedBuffer = await renderOffline(
    tracks,
    samples,
    duration,
    bufferMap,
    options,
    onProgress
  );

  // Fase 4: objectieve validatie + realtime-vangnet als de render verdacht is
  const { buffer: audioBuffer, usedRealtimeFallback } = await validateOrCapture(
    renderedBuffer, tracks, samples, duration,
    (fraction) => onProgress?.(0.3 + fraction * 0.4)
  );

  // Encode to MP3
  const mp3Blob = await encodeToMp3(audioBuffer, bitrate, onProgress, lamejsPromise);

  logger.info('MP3 export complete', {
    size: mp3Blob.size, bitrate, missingSampleIds, usedRealtimeFallback,
  });
  return { blob: mp3Blob, missingSampleIds, usedRealtimeFallback };
}

/**
 * Encode AudioBuffer to MP3 — bij voorkeur in een Web Worker (audit #12:
 * de encode van een lange compositie blokkeerde de UI), met de oude
 * main-thread-encode als fallback.
 */
async function encodeToMp3(
  audioBuffer: AudioBuffer,
  kbps: number,
  onProgress?: ExportProgressCallback,
  lamejsPromise?: Promise<typeof import('@breezystack/lamejs')>
): Promise<Blob> {
  const channels = audioBuffer.numberOfChannels;
  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = channels > 1 ? audioBuffer.getChannelData(1) : leftChannel;
  const leftInt16 = floatTo16BitPCM(leftChannel);
  const rightInt16 = floatTo16BitPCM(rightChannel);

  try {
    return await encodeInWorker(leftInt16, rightInt16, audioBuffer.sampleRate, kbps, onProgress);
  } catch (err) {
    logger.warn('MP3-worker niet beschikbaar — encode op de main thread', err);
    return encodeOnMainThread(leftInt16, rightInt16, audioBuffer.sampleRate, kbps, onProgress, lamejsPromise);
  }
}

function encodeInWorker(
  left: Int16Array,
  right: Int16Array,
  sampleRate: number,
  kbps: number,
  onProgress?: ExportProgressCallback
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('../workers/mp3EncoderWorker.ts', import.meta.url), {
        type: 'module',
      });
    } catch (err) {
      reject(err);
      return;
    }
    const cleanup = () => worker.terminate();
    worker.onerror = (event) => {
      cleanup();
      reject(event.error ?? new Error(event.message || 'MP3-worker-fout'));
    };
    worker.onmessage = (event) => {
      const data = event.data as
        | { type: 'progress'; processed: number; total: number }
        | { type: 'done'; chunks: ArrayBuffer[] }
        | { type: 'error'; message: string };
      if (data.type === 'progress') {
        // Progress from 70% to 95%
        onProgress?.(0.7 + (data.processed / data.total) * 0.25);
      } else if (data.type === 'done') {
        cleanup();
        onProgress?.(1);
        resolve(new Blob(data.chunks, { type: 'audio/mp3' }));
      } else {
        cleanup();
        reject(new Error(data.message));
      }
    };
    // Bewust géén transferables: bij een worker-fout ná verzending moeten de
    // arrays nog bruikbaar zijn voor de main-thread-fallback
    worker.postMessage({ left, right, sampleRate, bitrate: kbps });
  });
}

async function encodeOnMainThread(
  leftInt16: Int16Array,
  rightInt16: Int16Array,
  sampleRate: number,
  kbps: number,
  onProgress?: ExportProgressCallback,
  lamejsPromise?: Promise<typeof import('@breezystack/lamejs')>
): Promise<Blob> {
  const { Mp3Encoder } = await (lamejsPromise ?? import('@breezystack/lamejs'));
  const encoder = new Mp3Encoder(2, sampleRate, kbps);
  const mp3Chunks: ArrayBuffer[] = [];
  const totalSamples = leftInt16.length;
  const blockSize = 1152;

  for (let i = 0; i < totalSamples; i += blockSize) {
    const end = Math.min(i + blockSize, totalSamples);
    const mp3buf = encoder.encodeBuffer(leftInt16.subarray(i, end), rightInt16.subarray(i, end));
    if (mp3buf.length > 0) {
      mp3Chunks.push(new Uint8Array(mp3buf).buffer);
    }
    onProgress?.(0.7 + (end / totalSamples) * 0.25);
  }
  const mp3End = encoder.flush();
  if (mp3End.length > 0) {
    mp3Chunks.push(new Uint8Array(mp3End).buffer);
  }
  onProgress?.(1);
  return new Blob(mp3Chunks, { type: 'audio/mp3' });
}

/**
 * Trigger browser download of a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
