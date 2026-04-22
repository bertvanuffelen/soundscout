/**
 * AudioService - Singleton class for managing all audio playback
 *
 * This service wraps Tone.js and provides a clean interface for:
 * - Loading and caching audio samples
 * - Playing individual samples (preview)
 * - Scheduling and playing timeline compositions
 * - Managing playback state and loop settings
 */

import * as Tone from 'tone';
import type { Clip, Sample, Track } from '../types';
import { beatsToSeconds, getClipTrimStart, getClipDuration, getEffectiveClipEndBeat } from '../utils/audio';
import { createWaveformData, type WaveformData } from '../utils/waveform';
import {
  DEFAULT_BPM,
  PLAYHEAD_UPDATE_INTERVAL_MS,
  AUDIO_LOAD_TIMEOUT_MS,
  AUDIO_LOAD_MAX_RETRIES,
  AUDIO_LOAD_CONCURRENCY,
  AMBIENT_AUDIO_VOLUME_DB,
  AMBIENT_AUDIO_FADE_SECONDS,
} from '../constants/config';
import { logger } from '../utils/logger';
import { audioDiag } from '../utils/audioDiagnostics';

type BeatUpdateCallback = (beat: number) => void;
type PlaybackEndCallback = () => void;
type LoadingProgressCallback = (loaded: number, total: number) => void;

export interface SampleLoadResult {
  sampleId: string;
  success: boolean;
  error?: string;
}

export class AudioService {
  private static instance: AudioService | null = null;

  // Audio buffers: raw ToneAudioBuffer storage — NO audio graph footprint.
  // Used by scheduleTimeline() to create on-demand players.
  private buffers: Map<string, Tone.ToneAudioBuffer> = new Map();

  // Preview players: minimal Tone.Player per sample for playSample()/playSampleRegion().
  // Connected to Destination but only active during preview — negligible overhead.
  private players: Map<string, Tone.Player> = new Map();
  private waveformCache: Map<string, WaveformData> = new Map();
  private isInitialized = false;
  private playheadIntervalId: number | null = null;
  private beatUpdateCallbacks: Set<BeatUpdateCallback> = new Set();
  private playbackEndCallbacks: Set<PlaybackEndCallback> = new Set();

  // Auto-stop: beat position where the last clip finishes (0 = not calculated)
  private lastActiveBeat: number = 0;

  // Ambient audio
  private ambientPlayer: Tone.Player | null = null;
  private ambientVolume: Tone.Volume | null = null;
  private isAmbientPlaying = false;
  private ambientFadeTimeout: ReturnType<typeof setTimeout> | null = null;

  // Timeline Part (for seek support)
  private timelinePart: Tone.Part | null = null;

  // Timeline data (for active clip detection during seek)
  private scheduledTracks: Track[] = [];
  private scheduledSamples: Sample[] = [];

  // Effect chains (#33, #79): isolated players + effect nodes for clips with effects
  private effectChains: Array<{
    player: Tone.Player;
    nodes: Tone.ToneAudioNode[];
    fadeGain: Tone.Gain | null;
  }> = [];

  // Mapping from clipId to effectChainIndex (for seek support)
  private clipEffectChainMap: Map<string, number> = new Map();

  // Last AudioContext time each shared player was started — shared across
  // startActiveClips() and the Tone.Part callback to prevent
  // "Start time must be strictly greater than previous start time" crashes.
  private sharedPlayerLastStart: Map<string, number> = new Map();

  // Whether scheduleTimeline() has been called and the Part + effect chains
  // are still valid. Set true in scheduleTimeline(), stays true through
  // pause(), cleared on stop()/disposeEffectChains(). Allows resume without
  // a costly reschedule (Fase 1 audio dropout fix).
  private _isScheduled = false;

  // The audioVersion at the time of the last scheduleTimeline() call.
  // Used by callers to detect if timeline data changed since last schedule
  // (e.g. edits while paused in the studio).
  private _scheduledAtVersion: number = -1;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  /**
   * Whether a valid schedule (Tone.Part + effect chains) exists and can be
   * resumed without a full reschedule. True after scheduleTimeline(), stays
   * true through pause(), cleared on stop().
   *
   * @param currentVersion - If provided, also checks that the schedule was
   *   built against this audioVersion. Returns false if the timeline data
   *   changed since the last schedule (e.g. edits while paused in studio).
   */
  hasActiveSchedule(currentVersion?: number): boolean {
    if (!this._isScheduled) return false;
    if (currentVersion !== undefined && currentVersion !== this._scheduledAtVersion) return false;
    return true;
  }

  /** Store the audioVersion at schedule time for staleness detection. */
  setScheduledVersion(version: number): void {
    this._scheduledAtVersion = version;
  }

  /** Get the audioVersion from the last schedule (for external comparison). */
  getScheduledVersion(): number {
    return this._scheduledAtVersion;
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Unlock the Web Audio context on the first user gesture.
   * Call this once from a top-level click/touch handler so that browsers
   * with strict autoplay policies (tablets, Chromebooks) allow audio later.
   * Safe to call multiple times — only acts once.
   */
  static unlockAudioContext(): void {
    if (Tone.getContext().state === 'running') return;
    Tone.start().catch(() => {
      // Silently ignore — will retry on next gesture via initialize()
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await Tone.start();
    this.isInitialized = true;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  // ==========================================================================
  // SAMPLE LOADING
  // ==========================================================================

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

  // ==========================================================================
  // SAMPLE PLAYBACK (Preview)
  // ==========================================================================

  playSample(sampleId: string): void {
    const player = this.players.get(sampleId);
    if (!player || !player.loaded) {
      logger.warn(`Sample "${sampleId}" not loaded, skipping`);
      return;
    }
    logger.audio('play', { sampleId });
    player.start();
  }

  stopSample(sampleId: string): void {
    const player = this.players.get(sampleId);
    if (player?.state === 'started') {
      player.stop();
    }
  }

  stopAllSamples(): void {
    this.players.forEach((player) => {
      if (player.state === 'started') {
        player.stop();
      }
    });
  }

  /**
   * Play a specific region of a sample (for trim preview).
   *
   * @param sampleId - The sample to play
   * @param offsetSeconds - Start offset in seconds
   * @param durationSeconds - Duration to play in seconds
   */
  playSampleRegion(
    sampleId: string,
    offsetSeconds: number,
    durationSeconds: number,
  ): void {
    const player = this.players.get(sampleId);
    if (!player || !player.loaded) {
      logger.warn(`Sample "${sampleId}" not loaded for region playback`);
      return;
    }

    logger.audio('playRegion', { sampleId, offset: offsetSeconds, duration: durationSeconds });
    player.start(Tone.now(), offsetSeconds, durationSeconds);
  }

  // Preview effect chain (for EffectsModal preview)
  private previewChain: { player: Tone.Player; nodes: Tone.ToneAudioNode[] } | null = null;

  /**
   * Play a sample region with effects applied (for EffectsModal preview).
   * Creates a temporary isolated player with pitch, reverb, and fade.
   */
  playSampleWithEffects(
    sampleId: string,
    offsetSeconds: number,
    durationSeconds: number,
    effects: { pitch: number; reverb: number; fadeIn: number; fadeOut: number },
  ): void {
    // Clean up any previous preview chain
    this.stopPreviewWithEffects();

    const buffer = this.buffers.get(sampleId);
    if (!buffer || !buffer.loaded) {
      logger.warn(`Sample "${sampleId}" not loaded for effects preview`);
      return;
    }

    const nodes: Tone.ToneAudioNode[] = [];

    // Build chain: player → [pitchShift] → [reverb] → [fadeGain] → destination
    if (effects.pitch !== 0) {
      nodes.push(new Tone.PitchShift({ pitch: effects.pitch }));
    }

    if (effects.reverb > 0) {
      const reverb = new Tone.Reverb({
        decay: 1.5 + (effects.reverb / 100) * 3,
      });
      reverb.wet.value = effects.reverb / 100;
      nodes.push(reverb);
    }

    // FadeGain node for fade-in/out
    let fadeGain: Tone.Gain | null = null;
    if (effects.fadeIn > 0 || effects.fadeOut > 0) {
      fadeGain = new Tone.Gain(1);
      nodes.push(fadeGain);
    }

    // Create isolated player from the shared buffer
    const player = new Tone.Player(buffer);

    if (nodes.length > 0) {
      player.chain(...nodes, Tone.getDestination());
    } else {
      player.toDestination();
    }

    // Schedule fade curves
    const now = Tone.now() + 0.05;
    if (fadeGain) {
      const gainParam = fadeGain.gain;
      if (effects.fadeIn > 0) {
        const curve = this.createFadeCurve('in');
        gainParam.setValueAtTime(0, now);
        gainParam.setValueCurveAtTime(curve, now, effects.fadeIn);
      }
      if (effects.fadeOut > 0) {
        const fadeOutStart = now + durationSeconds - effects.fadeOut;
        if (fadeOutStart >= now + effects.fadeIn) {
          const curve = this.createFadeCurve('out');
          gainParam.setValueCurveAtTime(curve, fadeOutStart, effects.fadeOut);
        }
      }
    }

    // Start playback
    player.start(now, offsetSeconds, durationSeconds);

    this.previewChain = { player, nodes };
    logger.audio('playWithEffects', { sampleId, effects });
  }

  /**
   * Stop effects preview playback and dispose temporary chain.
   */
  stopPreviewWithEffects(): void {
    if (this.previewChain) {
      try { this.previewChain.player.stop(); } catch { /* ignore */ }
      try { this.previewChain.player.dispose(); } catch { /* ignore */ }
      this.previewChain.nodes.forEach((node) => {
        try { node.dispose(); } catch { /* ignore */ }
      });
      this.previewChain = null;
    }
  }

  // ==========================================================================
  // WAVEFORM DATA
  // ==========================================================================

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
   * Clear waveform cache for a specific sample.
   */
  clearWaveformCache(sampleId?: string): void {
    if (sampleId) {
      this.waveformCache.delete(sampleId);
    } else {
      this.waveformCache.clear();
    }
  }

  // ==========================================================================
  // TIMELINE SCHEDULING & PLAYBACK
  // ==========================================================================

  // --- Effect chain helpers (#33) ---

  /** Check if a clip has non-default effects (pitch, reverb, or fade) */
  private clipHasEffects(clip: Clip): boolean {
    const fx = clip.effects;
    if (!fx) return false;
    return (fx.pitch !== 0 && fx.pitch !== undefined) ||
           (fx.reverb !== 0 && fx.reverb !== undefined) ||
           (fx.fadeIn > 0) ||
           (fx.fadeOut > 0);
  }

  /**
   * Create a fade curve for setValueCurveAtTime.
   * - Fade-in: x² — gradual build from silence to full volume
   * - Fade-out: (1-x)² — smooth descent from full volume to silence
   * Symmetric equal-power pair. Matches the visual curve in Waveform.tsx.
   */
  private createFadeCurve(type: 'in' | 'out', steps: number = 128): number[] {
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

  /**
   * Create a simple isolated player with volume control only (no effects).
   * Used for polyphonic playback: each clip gets its own player so multiple
   * clips of the same sample can play simultaneously without conflicts.
   * The player uses the shared ToneAudioBuffer — no extra memory.
   */
  private createSimpleChain(
    buffer: Tone.ToneAudioBuffer,
    volumeDb: number,
  ): { player: Tone.Player; nodes: Tone.ToneAudioNode[]; fadeGain: Tone.Gain | null } {
    const volumeNode = new Tone.Volume(volumeDb);
    const player = new Tone.Player(buffer);
    player.chain(volumeNode, Tone.getDestination());
    return { player, nodes: [volumeNode], fadeGain: null };
  }

  /** Create an isolated player with effect nodes for a clip */
  private createEffectChain(
    buffer: Tone.ToneAudioBuffer,
    clip: Clip,
    volumeDb: number,
  ): { player: Tone.Player; nodes: Tone.ToneAudioNode[]; fadeGain: Tone.Gain | null } {
    const fx = clip.effects!;
    const nodes: Tone.ToneAudioNode[] = [];

    // Build chain nodes (order: pitch → reverb → fadeGain → volume → destination)
    if (fx.pitch !== 0 && fx.pitch !== undefined) {
      nodes.push(new Tone.PitchShift({ pitch: fx.pitch }));
    }

    if (fx.reverb > 0) {
      const reverb = new Tone.Reverb({
        decay: 1.5 + (fx.reverb / 100) * 3,
      });
      reverb.wet.value = fx.reverb / 100;
      nodes.push(reverb);
    }

    // FadeGain node (#79) — separate from clip volume for independent control
    let fadeGain: Tone.Gain | null = null;
    if (fx.fadeIn > 0 || fx.fadeOut > 0) {
      fadeGain = new Tone.Gain(1); // starts at 1, curve scheduled later
      nodes.push(fadeGain);
    }

    // Volume node (always needed)
    nodes.push(new Tone.Volume(volumeDb));

    // Create isolated player using the shared buffer
    const player = new Tone.Player(buffer);

    // Chain: player → [pitchShift] → [reverb] → [fadeGain] → volume → destination
    if (nodes.length > 0) {
      player.chain(...nodes, Tone.getDestination());
    } else {
      player.toDestination();
    }

    return { player, nodes, fadeGain };
  }

  /** Dispose all effect chains (players + nodes) */
  private disposeEffectChains(): void {
    this.effectChains.forEach(({ player, nodes }) => {
      try { player.stop(); } catch { /* ignore */ }
      try { player.dispose(); } catch { /* ignore */ }
      nodes.forEach((node) => {
        try { node.dispose(); } catch { /* ignore */ }
      });
    });
    this.effectChains = [];
    this.clipEffectChainMap.clear();
    this._isScheduled = false;
  }

  scheduleTimeline(tracks: Track[], samples: Sample[]): void {
    const scheduleStartTime = performance.now();
    const transport = Tone.getTransport();
    transport.cancel(); // Clear previous schedule
    transport.bpm.value = DEFAULT_BPM;

    // Reset dedup map so a fresh schedule starts clean
    this.sharedPlayerLastStart.clear();

    // Store timeline data for active clip detection during seek
    this.scheduledTracks = tracks;
    this.scheduledSamples = samples;

    // Dispose previous Part (important for memory)
    if (this.timelinePart) {
      this.timelinePart.dispose();
      this.timelinePart = null;
    }

    // Dispose previous effect chains
    this.disposeEffectChains();
    this.clipEffectChainMap.clear();

    // Build lookup map for quick sample access
    const sampleMap = new Map(samples.map((s) => [s.id, s]));

    // Define event type for Tone.Part (using object format with time property)
    type ClipEvent = {
      time: number;
      sampleId: string;
      trimStart: number;
      duration: number;
      volumeDb: number;  // Combined track + clip volume
      isMuted: boolean;  // Track or clip muted
      effectChainIndex?: number;  // Index in this.effectChains for clips with effects
      fadeIn?: number;   // Fade-in duration in seconds (#79)
      fadeOut?: number;  // Fade-out duration in seconds (#79)
    };

    // Build events array for Tone.Part
    const events: ClipEvent[] = [];
    let totalClipCount = 0;
    let mutedClipCount = 0;

    tracks.forEach((track) => {
      const trackVolume = track.volume ?? 0;
      const trackMuted = track.mute ?? false;

      track.clips.forEach((clip) => {
        const buffer = this.buffers.get(clip.sampleId);
        const sample = sampleMap.get(clip.sampleId);

        if (!buffer || !buffer.loaded || !sample) return;
        totalClipCount++;

        const clipVolume = clip.effects?.volume ?? 0;
        const clipMuted = clip.effects?.mute ?? false;
        const volumeDb = trackVolume + clipVolume;
        const isMuted = trackMuted || clipMuted;
        const trimStart = getClipTrimStart(clip);
        const singleDuration = getClipDuration(clip, sample);

        // Create an isolated player for EVERY non-muted clip (#polyphony).
        // Each player shares the same ToneAudioBuffer — no extra memory.
        // Clips with effects get the full chain (pitch/reverb/fade);
        // clips without effects get a simple volume-only chain.
        let effectChainIndex: number | undefined;
        if (isMuted) mutedClipCount++;
        if (!isMuted) {
          if (this.clipHasEffects(clip)) {
            const chain = this.createEffectChain(buffer, clip, volumeDb);
            effectChainIndex = this.effectChains.length;
            this.effectChains.push(chain);
          } else {
            const chain = this.createSimpleChain(buffer, volumeDb);
            effectChainIndex = this.effectChains.length;
            this.effectChains.push(chain);
          }
          this.clipEffectChainMap.set(clip.id, effectChainIndex);
        }

        // Fade durations (#79)
        const fadeIn = clip.effects?.fadeIn ?? 0;
        const fadeOut = clip.effects?.fadeOut ?? 0;

        // Loop logic (#65): generate multiple events for looping clips
        if (clip.loop && clip.loopDurationBeats) {
          const totalSeconds = beatsToSeconds(clip.loopDurationBeats, DEFAULT_BPM);
          const startSeconds = beatsToSeconds(clip.startBeat, DEFAULT_BPM);
          let offset = 0;
          let iterIndex = 0;

          while (offset < totalSeconds - 0.001) {
            const remaining = totalSeconds - offset;
            const dur = Math.min(singleDuration, remaining);
            const isFirst = iterIndex === 0;
            const isLast = offset + singleDuration >= totalSeconds - 0.001;
            events.push({
              time: startSeconds + offset,
              sampleId: clip.sampleId,
              trimStart,
              duration: dur,
              volumeDb,
              isMuted,
              effectChainIndex,
              fadeIn: isFirst ? fadeIn : 0,      // Only first iteration fades in
              fadeOut: isLast ? fadeOut : 0,      // Only last iteration fades out
            });
            offset += singleDuration;
            iterIndex++;
          }
        } else {
          // Normal clip (not looped)
          events.push({
            time: beatsToSeconds(clip.startBeat, DEFAULT_BPM),
            sampleId: clip.sampleId,
            trimStart,
            duration: singleDuration,
            volumeDb,
            isMuted,
            effectChainIndex,
            fadeIn,
            fadeOut,
          });
        }
      });
    });

    // Calculate lastActiveBeat: the beat where the last clip finishes playing
    // Used for auto-stop when not looping — now loop-aware
    this.lastActiveBeat = 0;
    tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        const sample = sampleMap.get(clip.sampleId);
        if (!sample) return;
        const endBeat = getEffectiveClipEndBeat(clip, sample, DEFAULT_BPM);
        if (endBeat > this.lastActiveBeat) {
          this.lastActiveBeat = endBeat;
        }
      });
    });

    // Pre-compute fade curves (#79)
    const fadeInCurve = this.createFadeCurve('in');
    const fadeOutCurve = this.createFadeCurve('out');

    // Create Tone.Part with events (object format with time property)
    this.timelinePart = new Tone.Part<ClipEvent>(
      (time, event) => {
        if (event.isMuted) return; // Skip muted clips/tracks

        // Use effect chain if available (#33, #79)
        if (event.effectChainIndex !== undefined) {
          const chain = this.effectChains[event.effectChainIndex];
          if (chain?.player) {
            // Schedule fade curves on the fadeGain node (#79)
            if (chain.fadeGain) {
              const gainParam = chain.fadeGain.gain;
              if (event.fadeIn && event.fadeIn > 0) {
                gainParam.setValueAtTime(0, time);
                gainParam.setValueCurveAtTime(fadeInCurve, time, event.fadeIn);
              }
              if (event.fadeOut && event.fadeOut > 0) {
                const fadeOutStart = time + event.duration - event.fadeOut;
                // Only schedule if fade-out starts after fade-in ends
                if (fadeOutStart >= time + (event.fadeIn ?? 0)) {
                  gainParam.setValueCurveAtTime(fadeOutCurve, fadeOutStart, event.fadeOut);
                }
              }
            }
            try {
              chain.player.start(time, event.trimStart, event.duration);
              audioDiag.partCallback({
                scheduledTime: time,
                audioContextCurrentTime: Tone.getContext().rawContext.currentTime,
                sampleId: event.sampleId,
                effectChainIndex: event.effectChainIndex,
                success: true,
              });
            } catch (e) {
              // Safety net: looping clips can rarely hit timing edge cases
              logger.warn('Effect chain player start failed', { effectChainIndex: event.effectChainIndex, error: e });
              audioDiag.partCallback({
                scheduledTime: time,
                audioContextCurrentTime: Tone.getContext().rawContext.currentTime,
                sampleId: event.sampleId,
                effectChainIndex: event.effectChainIndex,
                success: false,
                error: e instanceof Error ? e.message : String(e),
              });
            }
          }
          return;
        }

        // Fallback: shared player path. Since every non-muted clip now gets
        // its own isolated player (#polyphony), this should only fire for
        // edge cases (e.g., a muted clip that somehow reaches here).
        logger.warn('Part callback using shared player fallback — should not happen', { sampleId: event.sampleId });
        const player = this.players.get(event.sampleId);
        if (player?.loaded) {
          const lastStart = this.sharedPlayerLastStart.get(event.sampleId) ?? -1;
          if (time <= lastStart) {
            // Same or earlier time — skip (already started by startActiveClips or earlier Part event)
            logger.audio('Skipping duplicate shared player start', {
              sampleId: event.sampleId,
              time,
              lastStart,
            });
            return;
          }
          this.sharedPlayerLastStart.set(event.sampleId, time);
          try {
            player.volume.setValueAtTime(event.volumeDb, time);
            player.start(time, event.trimStart, event.duration);
            audioDiag.partCallback({
              scheduledTime: time,
              audioContextCurrentTime: Tone.getContext().rawContext.currentTime,
              sampleId: event.sampleId,
              effectChainIndex: undefined,
              success: true,
            });
          } catch (e) {
            logger.warn('Shared player start failed', { sampleId: event.sampleId, time, error: e });
            audioDiag.partCallback({
              scheduledTime: time,
              audioContextCurrentTime: Tone.getContext().rawContext.currentTime,
              sampleId: event.sampleId,
              effectChainIndex: undefined,
              success: false,
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }
      },
      events
    );

    // Start Part at transport position 0
    this.timelinePart.start(0);

    // Diagnostics: log schedule completion with timing and stats
    audioDiag.scheduleEnd({
      durationMs: performance.now() - scheduleStartTime,
      totalClips: totalClipCount,
      totalEvents: events.length,
      effectChains: this.effectChains.length,
      mutedClips: mutedClipCount,
      audioContext: Tone.getContext().rawContext as AudioContext,
    });

    // Mark schedule as active — resume can skip reschedule (Fase 1)
    this._isScheduled = true;
  }

  /**
   * Check if a clip is active (playing) at a specific beat position.
   * A clip is active if: startBeat < beat < endBeat (loop-aware)
   *
   * Uses strict < for startBeat to avoid double-starting clips:
   * clips starting exactly at the seek position are handled by Tone.Part,
   * not by startActiveClips(). Using <= would cause both to start the same
   * player at the same time, triggering "Start time must be strictly greater
   * than previous start time" errors.
   */
  private isClipActiveAtBeat(clip: Clip, sample: Sample, beat: number): boolean {
    const clipEndBeat = getEffectiveClipEndBeat(clip, sample, DEFAULT_BPM);
    return clip.startBeat < beat && beat < clipEndBeat;
  }

  /**
   * Get all clips that are active at a specific beat position,
   * with calculated playback parameters for immediate start.
   *
   * Returns clips with adjusted trimStart and duration for seek playback.
   */
  private getActiveClipsAtBeat(beat: number): Array<{
    clip: Clip;
    sample: Sample;
    player: Tone.Player;
    adjustedTrimStart: number;
    remainingDuration: number;
    volumeDb: number;
    isMuted: boolean;
  }> {
    const activeClips: Array<{
      clip: Clip;
      sample: Sample;
      player: Tone.Player;
      adjustedTrimStart: number;
      remainingDuration: number;
      volumeDb: number;
      isMuted: boolean;
    }> = [];

    const sampleMap = new Map(this.scheduledSamples.map((s) => [s.id, s]));

    this.scheduledTracks.forEach((track) => {
      const trackVolume = track.volume ?? 0;
      const trackMuted = track.mute ?? false;

      track.clips.forEach((clip) => {
        const sample = sampleMap.get(clip.sampleId);
        const player = this.players.get(clip.sampleId);

        if (!sample || !player || !player.loaded) return;
        if (!this.isClipActiveAtBeat(clip, sample, beat)) return;

        const clipVolume = clip.effects?.volume ?? 0;
        const clipMuted = clip.effects?.mute ?? false;

        // Calculate how much time has elapsed since clip start
        const elapsedBeats = beat - clip.startBeat;
        const elapsedSeconds = beatsToSeconds(elapsedBeats, DEFAULT_BPM);

        // Calculate original trim parameters
        const originalTrimStart = getClipTrimStart(clip);
        const singleDuration = getClipDuration(clip, sample);

        // Calculate adjusted parameters for seek playback — loop-aware (#65)
        let adjustedTrimStart: number;
        let remainingDuration: number;

        if (clip.loop && clip.loopDurationBeats) {
          // For looping clips: calculate position within current loop iteration
          const posInLoop = elapsedSeconds % singleDuration;
          adjustedTrimStart = originalTrimStart + posInLoop;
          const remainingInIteration = singleDuration - posInLoop;
          const totalRemaining = beatsToSeconds(clip.loopDurationBeats, DEFAULT_BPM) - elapsedSeconds;
          remainingDuration = Math.min(remainingInIteration, totalRemaining);
        } else {
          adjustedTrimStart = originalTrimStart + elapsedSeconds;
          remainingDuration = singleDuration - elapsedSeconds;
        }

        // Only add if there's still something to play (minimum 10ms)
        if (remainingDuration > 0.01) {
          activeClips.push({
            clip,
            sample,
            player,
            adjustedTrimStart,
            remainingDuration,
            volumeDb: trackVolume + clipVolume,
            isMuted: trackMuted || clipMuted,
          });
        }
      });
    });

    return activeClips;
  }

  /**
   * Start all clips that are active at the given beat position.
   * These clips have their start moment in the "past" relative to seek position,
   * so they need to be started immediately with adjusted offset and duration.
   *
   * Every non-muted clip has its own isolated player (#polyphony), so all
   * active clips can start simultaneously without conflicts.
   */
  private startActiveClips(seekBeat: number): void {
    const activeClips = this.getActiveClipsAtBeat(seekBeat);

    if (activeClips.length === 0) return;

    // Separate clips with isolated players from shared-player clips (fallback).
    // Since #polyphony, all non-muted clips should have isolated players.
    const effectClips: typeof activeClips = [];
    const sharedClipsBySample = new Map<string, typeof activeClips[0]>();

    activeClips.forEach((clipData) => {
      if (this.clipEffectChainMap.has(clipData.clip.id)) {
        effectClips.push(clipData);
      } else {
        // Fallback: shared player (shouldn't happen for non-muted clips)
        const existing = sharedClipsBySample.get(clipData.clip.sampleId);
        if (!existing || clipData.remainingDuration > existing.remainingDuration) {
          sharedClipsBySample.set(clipData.clip.sampleId, clipData);
        }
      }
    });

    // Start all clips at the same time with small buffer
    const startTime = Tone.now() + 0.05;

    // Start effect chain clips
    effectClips.forEach(({ adjustedTrimStart, remainingDuration, clip, sample, isMuted }) => {
      if (isMuted) return;
      const chainIndex = this.clipEffectChainMap.get(clip.id)!;
      const chain = this.effectChains[chainIndex];
      if (chain?.player) {
        // Schedule fade curves for seek position (#79)
        if (chain.fadeGain) {
          const fadeIn = clip.effects?.fadeIn ?? 0;
          const fadeOut = clip.effects?.fadeOut ?? 0;
          const elapsedBeats = seekBeat - clip.startBeat;
          const elapsedSeconds = beatsToSeconds(elapsedBeats, DEFAULT_BPM);
          const singleDuration = getClipDuration(clip, sample);

          // For looping clips, calculate elapsed within current iteration
          const effectiveElapsed = (clip.loop && clip.loopDurationBeats)
            ? elapsedSeconds % singleDuration
            : elapsedSeconds;
          const totalClipDuration = (clip.loop && clip.loopDurationBeats)
            ? beatsToSeconds(clip.loopDurationBeats, DEFAULT_BPM)
            : singleDuration;

          const gainParam = chain.fadeGain.gain;

          // Determine if we're in a fade-in zone
          if (fadeIn > 0 && effectiveElapsed < fadeIn) {
            // Seeking into middle of fade-in
            const progress = effectiveElapsed / fadeIn;
            const currentValue = progress * progress; // x² fade-in
            const remainingFade = fadeIn - effectiveElapsed;
            // Set current value, then schedule remaining curve
            const remainingCurve = this.createFadeCurve('in');
            const startIdx = Math.floor(progress * remainingCurve.length);
            const partialCurve = remainingCurve.slice(startIdx);
            if (partialCurve.length >= 2) {
              gainParam.setValueAtTime(currentValue, startTime);
              gainParam.setValueCurveAtTime(partialCurve, startTime, remainingFade);
            } else {
              gainParam.setValueAtTime(currentValue, startTime);
            }
          } else {
            // Past fade-in, set gain to 1
            gainParam.setValueAtTime(1, startTime);
          }

          // Schedule fade-out if applicable
          if (fadeOut > 0) {
            const fadeOutStartInClip = totalClipDuration - fadeOut;
            if (elapsedSeconds >= fadeOutStartInClip) {
              // Already in fade-out zone
              const fadeOutElapsed = elapsedSeconds - fadeOutStartInClip;
              const progress = fadeOutElapsed / fadeOut;
              const currentValue = (1 - progress) * (1 - progress); // exponential fade-out
              const remainingFade = fadeOut - fadeOutElapsed;
              const remainingCurve = this.createFadeCurve('out');
              const startIdx = Math.floor(progress * remainingCurve.length);
              const partialCurve = remainingCurve.slice(startIdx);
              if (partialCurve.length >= 2) {
                gainParam.setValueAtTime(currentValue, startTime);
                gainParam.setValueCurveAtTime(partialCurve, startTime, remainingFade);
              } else {
                gainParam.setValueAtTime(currentValue, startTime);
              }
            } else {
              // Not yet in fade-out, schedule it for the future
              const fadeOutStartFromNow = fadeOutStartInClip - elapsedSeconds;
              const fadeOutCurve = this.createFadeCurve('out');
              gainParam.setValueCurveAtTime(fadeOutCurve, startTime + fadeOutStartFromNow, fadeOut);
            }
          }
        }

        chain.player.start(startTime, adjustedTrimStart, remainingDuration);
        logger.audio('startActiveClip (effect chain)', {
          sampleId: clip.sampleId,
          seekBeat,
          adjustedTrimStart,
          remainingDuration,
        });
      }
    });

    // Start shared-player clips and record in instance-level dedup map
    // so the Part callback knows not to re-start the same player.
    sharedClipsBySample.forEach(({ player, adjustedTrimStart, remainingDuration, clip, volumeDb, isMuted }) => {
      if (isMuted) return;
      player.volume.setValueAtTime(volumeDb, startTime);
      player.start(startTime, adjustedTrimStart, remainingDuration);
      this.sharedPlayerLastStart.set(clip.sampleId, startTime);
      logger.audio('startActiveClip', {
        sampleId: clip.sampleId,
        seekBeat,
        adjustedTrimStart,
        remainingDuration,
        volumeDb,
      });
    });
  }

  /**
   * Start timeline playback from a specific beat position.
   * Uses transport.start() with offset to support seeking.
   *
   * For clips that are already active at the seek position (started before
   * but still playing), we start them immediately with adjusted parameters.
   * Future clips are handled normally by Tone.Part.
   *
   * @param fromBeat - Beat position to start from (default: 0)
   */
  play(fromBeat: number = 0): void {
    const transport = Tone.getTransport();
    const offsetSeconds = beatsToSeconds(fromBeat, DEFAULT_BPM);

    audioDiag.play(fromBeat, offsetSeconds, transport.state);

    // Start clips that are already active at the seek position
    // (their start event is in the "past" but they should still be playing)
    if (fromBeat > 0) {
      this.startActiveClips(fromBeat);
    }

    // Start transport for future clips (handled by Tone.Part)
    transport.start('+0.05', offsetSeconds);
    this.startPlayheadUpdates();

    // Start periodic health snapshots for diagnostics
    audioDiag.startSnapshots(() => ({
      timestamp: Date.now(),
      transportState: transport.state,
      transportPosition: transport.seconds,
      audioContextTime: Tone.getContext().rawContext.currentTime,
      audioContextState: Tone.getContext().rawContext.state,
      activeSourceCount: this.effectChains.reduce((count, chain) => {
        // Check if the player's internal state is "started"
        try { return count + (chain.player.state === 'started' ? 1 : 0); } catch { return count; }
      }, 0),
      effectChainCount: this.effectChains.length,
      isScheduled: this._isScheduled,
      getTransportSeconds: () => transport.seconds,
    }));
  }

  pause(): void {
    const transport = Tone.getTransport();
    const fadeGainCount = this.effectChains.filter(c => c.fadeGain !== null).length;
    audioDiag.pause(this.getCurrentBeat(), this.effectChains.length, fadeGainCount);
    audioDiag.stopSnapshots();
    transport.pause();
    // Stop all currently playing samples — they continue independently
    // of the transport once started. On resume, handlePlay re-schedules
    // everything and startActiveClips() restarts from the paused position.
    this.players.forEach((player) => {
      try {
        player.stop();
      } catch {
        // Player may not be started - ignore
      }
    });
    // Stop effect chain players too (but DON'T dispose — needed for resume)
    // Also cancel any scheduled fadeGain automation curves — stale curves
    // would conflict with freshly scheduled ones when the Part fires on resume.
    this.effectChains.forEach(({ player, fadeGain }) => {
      try { player.stop(); } catch { /* ignore */ }
      if (fadeGain) {
        try {
          fadeGain.gain.cancelScheduledValues(0);
          fadeGain.gain.setValueAtTime(1, Tone.now());
        } catch { /* ignore */ }
      }
    });
    // Clear dedup map so stale entries from this session don't block the next play()
    this.sharedPlayerLastStart.clear();
    this.stopPlayheadUpdates();
  }

  stop(): void {
    audioDiag.stop();
    const transport = Tone.getTransport();
    // Cancel all scheduled events FIRST to prevent lookahead-buffered
    // player.start() calls from firing after transport.stop()
    transport.cancel();
    transport.stop();
    transport.seconds = 0;
    // Force-stop all players regardless of state (covers edge cases
    // where a player was scheduled but not yet in 'started' state)
    this.players.forEach((player) => {
      try {
        player.stop();
      } catch {
        // Player may not be started - ignore
      }
    });
    // Stop + dispose effect chains (#33)
    this.disposeEffectChains();
    // Clear dedup map so stale entries don't block the next play()
    this.sharedPlayerLastStart.clear();
    this.stopPlayheadUpdates();
    // Notify listeners that we're back at beat 0
    this.beatUpdateCallbacks.forEach((cb) => cb(0));
  }

  setLoop(enabled: boolean, totalBeats: number): void {
    const transport = Tone.getTransport();
    transport.loop = enabled;
    if (enabled) {
      transport.loopStart = 0;
      transport.loopEnd = beatsToSeconds(totalBeats, DEFAULT_BPM);
    }
  }

  /**
   * Reschedule the timeline while playback is active (#22).
   * Stops transport + all players, rebuilds Tone.Part with current tracks,
   * and resumes from the same beat position. Used when clips are added/moved/
   * deleted or effects change during playback.
   *
   * The transport MUST be stopped before scheduleTimeline() so the new Part
   * doesn't fire events at the old transport position. play(currentBeat) then
   * cleanly restarts with the +0.05s buffer that startActiveClips() relies on.
   */
  rescheduleWhilePlaying(tracks: Track[], samples: Sample[], looping: boolean, totalBeats: number): void {
    audioDiag.rescheduleTriggered(`live edit at beat ${this.getCurrentBeat().toFixed(2)}`);
    const currentBeat = this.getCurrentBeat();
    const transport = Tone.getTransport();

    // 1. Stop players + transport so play(currentBeat) re-seeds cleanly
    this.players.forEach((p) => { try { p.stop(); } catch { /* ignore */ } });
    this.effectChains.forEach(({ player }) => { try { player.stop(); } catch { /* ignore */ } });
    transport.cancel();
    transport.stop();
    this.stopPlayheadUpdates();

    // 2. Full reschedule (disposes old Part + effect chains, builds new ones)
    this.scheduleTimeline(tracks, samples);
    this.setLoop(looping, totalBeats);

    // 3. Resume playback from the same position
    this.play(currentBeat);
  }

  // ==========================================================================
  // PLAYHEAD / BEAT UPDATES
  // ==========================================================================

  private startPlayheadUpdates(): void {
    if (this.playheadIntervalId !== null) {
      clearInterval(this.playheadIntervalId);
    }

    const transport = Tone.getTransport();

    this.playheadIntervalId = window.setInterval(() => {
      const seconds = transport.seconds;
      const currentBeat = (seconds / 60) * DEFAULT_BPM;
      this.beatUpdateCallbacks.forEach((cb) => cb(currentBeat));

      // Auto-stop: when not looping and playhead passed last clip end
      if (!transport.loop && this.lastActiveBeat > 0 && currentBeat >= this.lastActiveBeat) {
        this.stop();
        this.playbackEndCallbacks.forEach((cb) => cb());
      }
    }, PLAYHEAD_UPDATE_INTERVAL_MS);
  }

  private stopPlayheadUpdates(): void {
    if (this.playheadIntervalId !== null) {
      clearInterval(this.playheadIntervalId);
      this.playheadIntervalId = null;
    }
  }

  /**
   * Subscribe to beat updates. Returns unsubscribe function.
   */
  onBeatUpdate(callback: BeatUpdateCallback): () => void {
    this.beatUpdateCallbacks.add(callback);
    return () => {
      this.beatUpdateCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to playback end events (auto-stop when all clips finished).
   * Returns unsubscribe function.
   */
  onPlaybackEnd(callback: PlaybackEndCallback): () => void {
    this.playbackEndCallbacks.add(callback);
    return () => {
      this.playbackEndCallbacks.delete(callback);
    };
  }

  getCurrentBeat(): number {
    const seconds = Tone.getTransport().seconds;
    return (seconds / 60) * DEFAULT_BPM;
  }

  /**
   * Seek to a specific beat position.
   * Only works when transport is stopped or paused.
   */
  seek(beat: number): void {
    const transport = Tone.getTransport();
    const seconds = beatsToSeconds(beat, DEFAULT_BPM);
    transport.seconds = seconds;
    // Notify listeners of new position
    this.beatUpdateCallbacks.forEach((cb) => cb(beat));
  }

  // ==========================================================================
  // AMBIENT AUDIO
  // ==========================================================================

  /**
   * Load ambient audio for a location.
   * Returns true if loaded successfully, false otherwise.
   */
  async loadAmbient(url: string): Promise<boolean> {
    if (!url) return false;

    // Stop and dispose previous ambient
    this.stopAmbient(false);
    this.ambientPlayer?.dispose();
    this.ambientPlayer = null;

    // Initialize volume node if needed
    if (!this.ambientVolume) {
      this.ambientVolume = new Tone.Volume(AMBIENT_AUDIO_VOLUME_DB).toDestination();
    }

    try {
      this.ambientPlayer = new Tone.Player({
        url,
        loop: true,
        fadeIn: 0.5,
        fadeOut: 0.5,
      }).connect(this.ambientVolume);

      await Tone.loaded();
      logger.info('Ambient audio loaded', { url });
      return true;
    } catch (err) {
      logger.warn('Failed to load ambient audio', {
        url,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Start playing ambient audio (loops continuously).
   */
  playAmbient(): void {
    if (!this.ambientPlayer?.loaded || this.isAmbientPlaying) return;

    // Reset volume to normal level
    if (this.ambientVolume) {
      this.ambientVolume.volume.value = AMBIENT_AUDIO_VOLUME_DB;
    }

    this.ambientPlayer.start();
    this.isAmbientPlaying = true;
    logger.audio('playAmbient', {});
  }

  /**
   * Stop ambient audio with optional fade out.
   */
  stopAmbient(fade = true): void {
    // Always clear any pending fade timeout first
    if (this.ambientFadeTimeout) {
      clearTimeout(this.ambientFadeTimeout);
      this.ambientFadeTimeout = null;
    }

    // Cancel any in-progress volume ramp to prevent it firing on a disposed node
    if (this.ambientVolume) {
      this.ambientVolume.volume.cancelScheduledValues(Tone.now());
    }

    if (!this.ambientPlayer || !this.isAmbientPlaying) return;

    if (fade && this.ambientVolume) {
      // Fade out then stop
      this.ambientVolume.volume.rampTo(-60, AMBIENT_AUDIO_FADE_SECONDS);
      this.ambientFadeTimeout = setTimeout(() => {
        this.ambientPlayer?.stop();
        this.isAmbientPlaying = false;
        this.ambientFadeTimeout = null;
      }, AMBIENT_AUDIO_FADE_SECONDS * 1000);
    } else {
      this.ambientPlayer.stop();
      this.isAmbientPlaying = false;
    }
  }

  /**
   * Set ambient audio volume.
   * @param db Volume in decibels (e.g., -15)
   */
  setAmbientVolume(db: number): void {
    if (this.ambientVolume) {
      this.ambientVolume.volume.value = db;
    }
  }

  /**
   * Check if ambient audio is currently playing.
   */
  isAmbientAudioPlaying(): boolean {
    return this.isAmbientPlaying;
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Dispose buffers and preview players that are no longer needed.
   * Call during theme switches to prevent unbounded memory growth.
   *
   * @param activeSampleIds - IDs of samples that should be kept loaded
   */
  disposeUnusedPlayers(activeSampleIds: Set<string>): void {
    let disposedCount = 0;
    for (const [sampleId, buffer] of this.buffers) {
      if (!activeSampleIds.has(sampleId)) {
        buffer.dispose();
        this.buffers.delete(sampleId);
        // Also dispose the corresponding preview player
        const player = this.players.get(sampleId);
        if (player) {
          player.dispose();
          this.players.delete(sampleId);
        }
        this.waveformCache.delete(sampleId);
        disposedCount++;
      }
    }
    if (disposedCount > 0) {
      logger.info(`Disposed ${disposedCount} unused audio buffers`);
    }
  }

  dispose(): void {
    this.stopPlayheadUpdates();

    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();

    // Dispose timeline Part
    if (this.timelinePart) {
      this.timelinePart.dispose();
      this.timelinePart = null;
    }

    // Clear timeline data
    this.scheduledTracks = [];
    this.scheduledSamples = [];

    // Dispose audio buffers
    this.buffers.forEach((buffer) => {
      buffer.dispose();
    });
    this.buffers.clear();

    // Dispose preview players
    this.players.forEach((player) => {
      player.dispose();
    });
    this.players.clear();
    this.waveformCache.clear();

    // Dispose ambient audio (clear fade timeout first)
    if (this.ambientFadeTimeout) {
      clearTimeout(this.ambientFadeTimeout);
      this.ambientFadeTimeout = null;
    }
    this.stopAmbient(false);
    this.ambientPlayer?.dispose();
    this.ambientPlayer = null;
    this.ambientVolume?.dispose();
    this.ambientVolume = null;

    this.beatUpdateCallbacks.clear();
    this.playbackEndCallbacks.clear();
    this.lastActiveBeat = 0;
    this.isInitialized = false;
  }

  /**
   * Reset for testing purposes only
   */
  static resetInstance(): void {
    if (AudioService.instance) {
      AudioService.instance.dispose();
      AudioService.instance = null;
    }
  }
}

// Export singleton instance
export const audioService = AudioService.getInstance();
