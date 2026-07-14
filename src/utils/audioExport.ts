/**
 * Audio Export Utilities
 *
 * Provides functions to export timeline compositions as WAV or MP3 files.
 * Uses Tone.Offline for sample-accurate offline rendering.
 */

import * as Tone from 'tone';
import toWav from 'audiobuffer-to-wav';
import type { Track, Sample } from '../types';
import { DEFAULT_BPM } from '../constants/config';
import { beatsToSeconds, getClipTrimStart, getClipDuration } from './audio';
import { logger } from './logger';

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
}

export interface Mp3ExportOptions extends ExportOptions {
  /** MP3 bitrate in kbps (default: 128) */
  bitrate?: number;
}

export type ExportProgressCallback = (progress: number) => void;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Preload all sample buffers for offline rendering.
 * Buffers must be loaded BEFORE calling Tone.Offline.
 */
export async function preloadBuffers(
  samples: Sample[],
  onProgress?: ExportProgressCallback
): Promise<Map<string, Tone.ToneAudioBuffer>> {
  const bufferMap = new Map<string, Tone.ToneAudioBuffer>();
  let loaded = 0;

  await Promise.all(
    samples.map(async (sample) => {
      try {
        const buffer = new Tone.ToneAudioBuffer();
        await buffer.load(sample.audioUrl);
        bufferMap.set(sample.id, buffer);
      } catch (err) {
        logger.warn(`Failed to preload buffer for "${sample.id}"`, err);
      }
      loaded++;
      onProgress?.(loaded / samples.length * 0.3); // 0-30% for loading
    })
  );

  return bufferMap;
}

/**
 * Calculate total duration of timeline in seconds.
 */
export function calculateTimelineDuration(
  tracks: Track[],
  samples: Sample[],
  bpm: number = DEFAULT_BPM
): number {
  const sampleMap = new Map(samples.map((s) => [s.id, s]));
  let maxEndTime = 0;

  tracks.forEach((track) => {
    track.clips.forEach((clip) => {
      const sample = sampleMap.get(clip.sampleId);
      if (!sample) return;

      const startSeconds = beatsToSeconds(clip.startBeat, bpm);
      // Use loop duration if looping, otherwise trimmed sample duration
      const effectiveDuration = clip.loop && clip.loopDurationBeats
        ? beatsToSeconds(clip.loopDurationBeats, bpm)
        : getClipDuration(clip, sample);
      const endSeconds = startSeconds + effectiveDuration;
      maxEndTime = Math.max(maxEndTime, endSeconds);
    });
  });

  // Add a small buffer at the end (0.5 seconds)
  return maxEndTime + 0.5;
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
// Fade Curve Helpers (#79)
// =============================================================================

/**
 * Create a fade curve matching AudioService.createFadeCurve.
 * - Fade-in: x² — gradual build from silence to full volume
 * - Fade-out: (1-x)² — smooth descent from full volume to silence
 */
function createFadeCurve(type: 'in' | 'out', steps: number = 128): number[] {
  const curve: number[] = new Array(steps);
  for (let i = 0; i < steps; i++) {
    const progress = i / (steps - 1);
    if (type === 'in') {
      curve[i] = progress * progress;
    } else {
      curve[i] = (1 - progress) * (1 - progress);
    }
  }
  return curve;
}

const fadeInCurve = createFadeCurve('in');
const fadeOutCurve = createFadeCurve('out');

/**
 * Schedule fade-in and/or fade-out curves on a Gain node.
 */
function scheduleFadeCurves(
  fadeGain: Tone.Gain,
  time: number,
  duration: number,
  fadeIn: number,
  fadeOut: number,
): void {
  const gainParam = fadeGain.gain;
  if (fadeIn > 0) {
    gainParam.setValueAtTime(0, time);
    gainParam.setValueCurveAtTime(fadeInCurve, time, fadeIn);
  }
  if (fadeOut > 0) {
    const fadeOutStart = time + duration - fadeOut;
    if (fadeOutStart >= time + fadeIn) {
      gainParam.setValueCurveAtTime(fadeOutCurve, fadeOutStart, fadeOut);
    }
  }
}

// =============================================================================
// Core Rendering Function
// =============================================================================

/**
 * Render timeline to AudioBuffer using Tone.Offline.
 */
export async function renderOffline(
  tracks: Track[],
  samples: Sample[],
  duration: number,
  bufferMap: Map<string, Tone.ToneAudioBuffer>,
  options: ExportOptions = {},
  onProgress?: ExportProgressCallback
): Promise<AudioBuffer> {
  const { sampleRate = 44100, channels = 2, bpm = DEFAULT_BPM } = options;

  logger.info('Starting offline render', { duration, sampleRate, channels });

  // Create sample lookup map
  const sampleMap = new Map(samples.map((s) => [s.id, s]));

  // Render offline using Tone.Offline
  const renderedToneBuffer = await Tone.Offline(
    ({ transport }) => {
      transport.bpm.value = bpm;

      // Schedule all clips (with loop + effects support)
      tracks.forEach((track) => {
        const trackVolume = track.volume ?? 0;
        const trackMuted = track.mute ?? false;

        track.clips.forEach((clip) => {
          const buffer = bufferMap.get(clip.sampleId);
          const sample = sampleMap.get(clip.sampleId);

          if (!buffer || !sample) return;

          // Skip muted clips/tracks
          const clipMuted = clip.effects?.mute ?? false;
          if (trackMuted || clipMuted) return;

          // Calculate combined volume (track + clip)
          const clipVolume = clip.effects?.volume ?? 0;
          const totalVolumeDb = trackVolume + clipVolume;

          // Build audio chain: player → [effects] → [fadeGain] → volume → destination
          const hasEffects = ((clip.effects?.pitch ?? 0) !== 0) ||
                             ((clip.effects?.reverb ?? 0) > 0) ||
                             ((clip.effects?.fadeIn ?? 0) > 0) ||
                             ((clip.effects?.fadeOut ?? 0) > 0);

          let targetNode: Tone.ToneAudioNode;
          let fadeGain: Tone.Gain | null = null;
          if (hasEffects) {
            const chainNodes: Tone.ToneAudioNode[] = [];

            if ((clip.effects?.pitch ?? 0) !== 0) {
              chainNodes.push(new Tone.PitchShift({ pitch: clip.effects!.pitch }));
            }
            if ((clip.effects?.reverb ?? 0) > 0) {
              const reverb = new Tone.Reverb({
                decay: 1.5 + (clip.effects!.reverb / 100) * 3,
              });
              reverb.wet.value = clip.effects!.reverb / 100;
              chainNodes.push(reverb);
            }

            // FadeGain node (#79) — separate from volume for independent control
            const clipFadeIn = clip.effects?.fadeIn ?? 0;
            const clipFadeOut = clip.effects?.fadeOut ?? 0;
            if (clipFadeIn > 0 || clipFadeOut > 0) {
              fadeGain = new Tone.Gain(1);
              chainNodes.push(fadeGain);
            }

            const vol = new Tone.Volume(totalVolumeDb);
            chainNodes.push(vol);

            // Connect chain: node[0] → node[1] → ... → destination
            for (let i = 0; i < chainNodes.length - 1; i++) {
              chainNodes[i].connect(chainNodes[i + 1]);
            }
            chainNodes[chainNodes.length - 1].toDestination();
            targetNode = chainNodes[0];
          } else {
            targetNode = new Tone.Volume(totalVolumeDb).toDestination();
          }

          const player = new Tone.Player(buffer).connect(targetNode);
          const startSeconds = beatsToSeconds(clip.startBeat, bpm);
          const trimStart = getClipTrimStart(clip);
          const singleDuration = getClipDuration(clip, sample);

          // Fade durations (#79)
          const fadeIn = clip.effects?.fadeIn ?? 0;
          const fadeOut = clip.effects?.fadeOut ?? 0;

          // Loop logic (#65): schedule multiple events for looping clips
          if (clip.loop && clip.loopDurationBeats) {
            const totalSeconds = beatsToSeconds(clip.loopDurationBeats, bpm);
            let offset = 0;
            let iterIndex = 0;

            while (offset < totalSeconds - 0.001) {
              const remaining = totalSeconds - offset;
              const dur = Math.min(singleDuration, remaining);
              const scheduleTime = startSeconds + offset;
              const isFirst = iterIndex === 0;
              const isLast = offset + singleDuration >= totalSeconds - 0.001;
              const eventFadeIn = isFirst ? fadeIn : 0;
              const eventFadeOut = isLast ? fadeOut : 0;
              transport.schedule((time) => {
                // Schedule fade curves (#79)
                if (fadeGain) {
                  scheduleFadeCurves(fadeGain, time, dur, eventFadeIn, eventFadeOut);
                }
                player.start(time, trimStart, dur);
              }, scheduleTime);
              offset += singleDuration;
              iterIndex++;
            }
          } else {
            transport.schedule((time) => {
              // Schedule fade curves (#79)
              if (fadeGain) {
                scheduleFadeCurves(fadeGain, time, singleDuration, fadeIn, fadeOut);
              }
              player.start(time, trimStart, singleDuration);
            }, startSeconds);
          }
        });
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

/**
 * Export timeline as WAV file.
 */
export async function exportToWav(
  tracks: Track[],
  samples: Sample[],
  options: ExportOptions = {},
  onProgress?: ExportProgressCallback
): Promise<Blob> {
  onProgress?.(0);

  // Calculate duration
  const duration = calculateTimelineDuration(tracks, samples, options.bpm);
  if (duration <= 0.5) {
    throw new Error('No clips on timeline');
  }

  // Preload all buffers
  const bufferMap = await preloadBuffers(samples, onProgress);

  // Render offline
  const audioBuffer = await renderOffline(
    tracks,
    samples,
    duration,
    bufferMap,
    options,
    onProgress
  );

  // Convert to WAV
  const wavArrayBuffer = toWav(audioBuffer);
  onProgress?.(0.9);

  const blob = new Blob([wavArrayBuffer], { type: 'audio/wav' });
  onProgress?.(1);

  logger.info('WAV export complete', { size: blob.size });
  return blob;
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
): Promise<Blob> {
  const { bitrate = 128 } = options;
  onProgress?.(0);

  // Calculate duration
  const duration = calculateTimelineDuration(tracks, samples, options.bpm);
  if (duration <= 0.5) {
    throw new Error('No clips on timeline');
  }

  // Preload all buffers
  const bufferMap = await preloadBuffers(samples, onProgress);

  // Render offline
  const audioBuffer = await renderOffline(
    tracks,
    samples,
    duration,
    bufferMap,
    options,
    onProgress
  );

  // Encode to MP3
  const mp3Blob = await encodeToMp3(audioBuffer, bitrate, onProgress);

  logger.info('MP3 export complete', { size: mp3Blob.size, bitrate });
  return mp3Blob;
}

/**
 * Encode AudioBuffer to MP3 using lamejs.
 */
async function encodeToMp3(
  audioBuffer: AudioBuffer,
  kbps: number,
  onProgress?: ExportProgressCallback
): Promise<Blob> {
  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const totalSamples = audioBuffer.length;

  // Dynamically load lamejs (TP5-3: -169KB from initial bundle)
  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const encoder = new Mp3Encoder(channels, sampleRate, kbps);
  const mp3Chunks: ArrayBuffer[] = [];

  // Get channel data
  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel =
    channels > 1 ? audioBuffer.getChannelData(1) : leftChannel;

  // Convert to Int16
  const leftInt16 = floatTo16BitPCM(leftChannel);
  const rightInt16 = floatTo16BitPCM(rightChannel);

  // Encode in chunks (1152 samples per MP3 frame)
  const blockSize = 1152;
  let processedSamples = 0;

  for (let i = 0; i < totalSamples; i += blockSize) {
    const leftChunk = leftInt16.subarray(i, Math.min(i + blockSize, totalSamples));
    const rightChunk = rightInt16.subarray(i, Math.min(i + blockSize, totalSamples));

    const mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) {
      // Convert Int8Array to ArrayBuffer
      mp3Chunks.push(new Uint8Array(mp3buf).buffer);
    }

    processedSamples += blockSize;
    // Progress from 70% to 95%
    onProgress?.(0.7 + (processedSamples / totalSamples) * 0.25);
  }

  // Flush remaining data
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
