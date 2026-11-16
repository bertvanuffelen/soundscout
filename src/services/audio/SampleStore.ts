/**
 * SampleStore — opslag en laden van geluidsbuffers (V2 Fase 1: afgesplitst
 * uit AudioService, gedrag ongewijzigd).
 *
 *  - buffers:       primaire opslag (ToneAudioBuffer, geen voetafdruk in de audiograaf)
 *  - players:       één preview-Player per uniek geluid
 *  - waveformCache: berekende golfvormen
 *
 * AudioService blijft het aanspreekpunt en delegeert hierheen.
 *
 * Geheugenbudget (V2 Fase 3, docs/v2/AUDIO-MEMORY.md): elke geladen buffer
 * wordt in `decodedAudioBudget` geboekt; na elk laadblok ruimt het budget
 * zo nodig de minst recent gebruikte, niet-vastgepinde buffers op via
 * `evict()`. Een opgeruimd geluid blijft "bekend" (url in `known`) en laadt
 * bij het volgende gebruik gewoon opnieuw via `loadSample`.
 */

import * as Tone from 'tone';
import type { Sample } from '../../types';
import { createWaveformData, type WaveformData } from '../../utils/waveform';
import { AUDIO_LOAD_TIMEOUT_MS, AUDIO_LOAD_MAX_RETRIES, AUDIO_LOAD_CONCURRENCY } from '../../constants/config';
import { logger } from '../../utils/logger';
import { decodedAudioBudget, decodedBytes, type DecodedAudioBudget } from './memoryBudget';

export type LoadingProgressCallback = (loaded: number, total: number) => void;

export interface SampleLoadResult {
  sampleId: string;
  success: boolean;
  error?: string;
}

/**
 * Hoeveel recente laadverzoeken als werkset beschermd blijven (pinregel f).
 * Drie dekt de gelijktijdige laders in de praktijk: bibliotheek (studio/
 * podium) + locatie-hotspots of de compositie van de presentatiespeler.
 */
const RECENT_REQUESTS_KEPT = 3;

export class SampleStore {
  readonly buffers: Map<string, Tone.ToneAudioBuffer> = new Map();
  readonly players: Map<string, Tone.Player> = new Map();
  readonly waveformCache: Map<string, WaveformData> = new Map();

  /** Elk ooit geladen geluid (klein: alleen metadata) — voor herladen na opruimen */
  private readonly known: Map<string, Sample> = new Map();
  /** Sample-ids van de laatste laadverzoeken (nieuwste achteraan) */
  private recentRequests: string[][] = [];

  private readonly budget: DecodedAudioBudget;

  constructor(budget: DecodedAudioBudget = decodedAudioBudget) {
    this.budget = budget;
  }

  // --- Laden ---

  async loadSample(sample: Sample): Promise<SampleLoadResult> {
    const result = await this.loadSampleInternal(sample);
    this.budget.enforce({ category: 'sample', id: sample.id });
    return result;
  }

  private loadSampleInternal(sample: Sample): Promise<SampleLoadResult> {
    this.known.set(sample.id, sample);
    if (this.buffers.has(sample.id)) {
      this.budget.touch('sample', sample.id);
      return Promise.resolve({ sampleId: sample.id, success: true });
    }
    return this.decodeSample(sample);
  }

  private async decodeSample(sample: Sample): Promise<SampleLoadResult> {
    try {
      // Load into a ToneAudioBuffer — no audio graph footprint.
      // This is the primary storage used by scheduleTimeline().
      const buffer = new Tone.ToneAudioBuffer();
      await buffer.load(sample.audioUrl);
      // Een parallelle lading (bv. een retry na timeout) was sneller: houd
      // die aan en gooi deze weg, anders lekt er een preview-Player
      if (this.buffers.has(sample.id)) {
        buffer.dispose();
        return { sampleId: sample.id, success: true };
      }
      this.buffers.set(sample.id, buffer);

      // Also create a preview Player for playSample()/playSampleRegion().
      // This is the only permanent Player per sample (one per unique sample,
      // typically 6 — negligible overhead vs 85+ per-clip Players before).
      const player = new Tone.Player(buffer).toDestination();
      this.players.set(sample.id, player);

      this.budget.register(sample.id, {
        category: 'sample',
        sampleId: sample.id,
        bytes: decodedBytes(buffer),
        evict: () => this.evict(sample.id),
      });

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

    // Pinregel (f): deze werkset is "net gevraagd" en blijft beschermd tot er
    // RECENT_REQUESTS_KEPT nieuwere verzoeken zijn geweest
    this.recentRequests.push(samples.map((s) => s.id));
    if (this.recentRequests.length > RECENT_REQUESTS_KEPT) this.recentRequests.shift();

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
      // Na elk blok het budget bewaken (de eigen werkset is beschermd)
      this.budget.enforce();
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
      return await Promise.race([this.loadSampleInternal(sample), timeoutPromise]);
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

  // --- Geheugenbudget ---

  /** Pinregel (f): sample-ids van de laatste laadverzoeken */
  getRecentRequestIds(): Set<string> {
    return new Set(this.recentRequests.flat());
  }

  /** Markeer een geluid als gebruikt (LRU) — bv. bij een preview */
  touch(sampleId: string): void {
    this.budget.touch('sample', sampleId);
  }

  /** Is dit geluid ooit geladen en nu opgeruimd (dus herlaadbaar)? */
  canReload(sampleId: string): boolean {
    return !this.buffers.has(sampleId) && this.known.has(sampleId);
  }

  /** Laad een eerder opgeruimd geluid opnieuw via het gewone laadpad */
  async reload(sampleId: string): Promise<boolean> {
    const sample = this.known.get(sampleId);
    if (!sample) return false;
    const result = await this.loadSample(sample);
    return result.success;
  }

  /**
   * Ruim één geluid op (aangeroepen door het budget). De preview-Player is
   * een graph-node en wordt gedisposed (Tone-valkuil 5). De ToneAudioBuffer
   * zelf disposen we bewust NIET: een export die hem al vasthoudt (via
   * getLoadedBuffer) moet blijven werken. Zonder verwijzingen ruimt de GC
   * hem op; de Player had een eigen wrapper, dus die houdt niets vast.
   * De golfvorm (klein) blijft in de cache.
   */
  private evict(sampleId: string): void {
    const player = this.players.get(sampleId);
    if (player) {
      try { player.stop(); } catch { /* ignore */ }
      try { player.dispose(); } catch { /* ignore */ }
      this.players.delete(sampleId);
    }
    this.buffers.delete(sampleId);
  }

  /**
   * Grove opruiming bij een themawissel (disposeUnusedPlayers): alles wat
   * niet in `keepSampleIds` zit gaat weg, inclusief golfvorm. Geeft het
   * aantal opgeruimde geluiden terug.
   */
  removeUnused(keepSampleIds: Set<string>): number {
    let disposedCount = 0;
    for (const [sampleId, buffer] of this.buffers) {
      if (keepSampleIds.has(sampleId)) continue;
      buffer.dispose();
      this.buffers.delete(sampleId);
      const player = this.players.get(sampleId);
      if (player) {
        player.dispose();
        this.players.delete(sampleId);
      }
      this.waveformCache.delete(sampleId);
      this.budget.unregister('sample', sampleId);
      disposedCount++;
    }
    return disposedCount;
  }

  /** Alles weg (AudioService.dispose) */
  clear(): void {
    this.buffers.forEach((buffer, sampleId) => {
      buffer.dispose();
      this.budget.unregister('sample', sampleId);
    });
    this.buffers.clear();
    this.players.forEach((player) => player.dispose());
    this.players.clear();
    this.waveformCache.clear();
    this.recentRequests = [];
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
    if (buffer && buffer.loaded) {
      this.budget.touch('sample', sampleId);
      return buffer;
    }
    return undefined;
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
