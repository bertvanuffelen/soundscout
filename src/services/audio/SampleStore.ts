/**
 * SampleStore — opslag en laden van geluidsbuffers (V2 Fase 1: afgesplitst
 * uit AudioService, gedrag ongewijzigd).
 *
 *  - buffers:       primaire opslag (ToneAudioBuffer, geen voetafdruk in de audiograaf)
 *  - players:       één preview-Player per uniek geluid
 *  - waveformCache: berekende golfvormen
 *
 * AudioService blijft het aanspreekpunt en delegeert hierheen. Dit is de plek
 * waar in een latere fase het geheugenbudget per apparaat komt (voorstel §2.6).
 */

import * as Tone from 'tone';
import type { Sample } from '../../types';
import { createWaveformData, type WaveformData } from '../../utils/waveform';
import { AUDIO_LOAD_TIMEOUT_MS, AUDIO_LOAD_MAX_RETRIES, AUDIO_LOAD_CONCURRENCY } from '../../constants/config';
import { logger } from '../../utils/logger';

export type LoadingProgressCallback = (loaded: number, total: number) => void;

export interface SampleLoadResult {
  sampleId: string;
  success: boolean;
  error?: string;
}

export class SampleStore {
  readonly buffers: Map<string, Tone.ToneAudioBuffer> = new Map();
  readonly players: Map<string, Tone.Player> = new Map();
  readonly waveformCache: Map<string, WaveformData> = new Map();

  // --- Laden ---

  async loadSample(sample: Sample): Promise<SampleLoadResult> {
    if (this.buffers.has(sample.id)) {
      return { sampleId: sample.id, success: true };
    }

    try {
      // Load into a ToneAudioBuffer — no audio graph footprint.
      // This is the primary storage used by scheduleTimeline().
      const buffer = new Tone.ToneAudioBuffer();
      await buffer.load(sample.audioUrl);
      this.buffers.set(sample.id, buffer);

      // Also create a preview Player for playSample()/playSampleRegion().
      // This is the only permanent Player per sample (one per unique sample,
      // typically 6 — negligible overhead vs 85+ per-clip Players before).
      const player = new Tone.Player(buffer).toDestination();
      this.players.set(sample.id, player);

      return { sampleId: sample.id, success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.warn(`Failed to load sample "${sample.id}"`, {
        url: sample.audioUrl,
        error: errorMsg,
      });
      return { sampleId: sample.id, success: false, error: errorMsg };
    }
  }

  /**
   * Load multiple samples with parallel loading, retry, and timeout support.
   *
   * Features:
   * - Parallel loading with controlled concurrency (max 3 at a time)
   * - Automatic retry on failure (up to 2 retries with exponential backoff)
   * - Timeout protection (15 seconds per sample)
   * - AbortSignal support for cancellation (e.g., when navigating away)
   */
  async loadSamples(
    samples: Sample[],
    onProgress?: LoadingProgressCallback,
    signal?: AbortSignal
  ): Promise<SampleLoadResult[]> {
    const results: SampleLoadResult[] = [];
    let loaded = 0;

    // Process in batches for controlled concurrency
    for (let i = 0; i < samples.length; i += AUDIO_LOAD_CONCURRENCY) {
      // Check if aborted before processing next batch
      if (signal?.aborted) {
        logger.info('Sample loading aborted');
        break;
      }

      const batch = samples.slice(i, i + AUDIO_LOAD_CONCURRENCY);

      const batchResults = await Promise.allSettled(
        batch.map((sample) => this.loadSampleWithRetry(sample, AUDIO_LOAD_MAX_RETRIES, signal))
      );

      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            sampleId: batch[idx].id,
            success: false,
            error: result.reason?.message || 'Unknown error',
          });
        }
      });

      loaded += batch.length;
      onProgress?.(loaded, samples.length);
    }

    return results;
  }

  /**
   * Load a sample with automatic retry on failure.
   */
  private async loadSampleWithRetry(
    sample: Sample,
    maxRetries = AUDIO_LOAD_MAX_RETRIES,
    signal?: AbortSignal
  ): Promise<SampleLoadResult> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Check if aborted before each attempt
      if (signal?.aborted) {
        return { sampleId: sample.id, success: false, error: 'Aborted' };
      }

      const result = await this.loadSampleWithTimeout(sample);
      if (result.success) return result;

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        logger.info(`Retrying sample "${sample.id}" (attempt ${attempt + 2}/${maxRetries + 1})`);
      }
    }

    return {
      sampleId: sample.id,
      success: false,
      error: `Failed after ${maxRetries + 1} attempts`,
    };
  }

  /**
   * Load a sample with timeout protection.
   */
  private async loadSampleWithTimeout(sample: Sample): Promise<SampleLoadResult> {
    // Skip if already loaded
    if (this.buffers.has(sample.id)) {
      return { sampleId: sample.id, success: true };
    }

    const timeoutPromise = new Promise<SampleLoadResult>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), AUDIO_LOAD_TIMEOUT_MS)
    );

    try {
      return await Promise.race([this.loadSample(sample), timeoutPromise]);
    } catch (err) {
      return {
        sampleId: sample.id,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  isSampleLoaded(sampleId: string): boolean {
    const buffer = this.buffers.get(sampleId);
    return buffer?.loaded ?? false;
  }

  // --- Golfvormen ---

  /**
   * Get waveform data for a sample (cached).
   *
   * Returns null if sample is not loaded or has no buffer.
   */
  getWaveform(sampleId: string): WaveformData | null {
    // Check cache first
    if (this.waveformCache.has(sampleId)) {
      return this.waveformCache.get(sampleId)!;
    }

    const buffer = this.buffers.get(sampleId);
    if (!buffer || !buffer.loaded) {
      return null;
    }

    if (buffer.length === 0) {
      return null;
    }

    // Get the raw AudioBuffer from ToneAudioBuffer
    const audioBuffer = buffer.get() as AudioBuffer | undefined;
    if (!audioBuffer) {
      return null;
    }

    // Generate waveform data
    const waveformData = createWaveformData(audioBuffer);

    // Cache it
    this.waveformCache.set(sampleId, waveformData);

    return waveformData;
  }

  /**
   * Reeds geladen buffer voor hergebruik door de export (audit #15) —
   * scheelt een dubbele download/decodeer-slag bij exporteren vanuit de app.
   */
  getLoadedBuffer(sampleId: string): Tone.ToneAudioBuffer | undefined {
    const buffer = this.buffers.get(sampleId);
    return buffer && buffer.loaded ? buffer : undefined;
  }

  /**
   * Clear waveform cache for a specific sample.
   */
  clearWaveformCache(sampleId?: string): void {
    if (sampleId) {
      this.waveformCache.delete(sampleId);
    } else {
      this.waveformCache.clear();
    }
  }
}
