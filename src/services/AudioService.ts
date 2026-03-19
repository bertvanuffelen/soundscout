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

  // Effect chains (#33): isolated players + effect nodes for clips with pitch/reverb
  private effectChains: Array<{
    player: Tone.Player;
    nodes: Tone.ToneAudioNode[];
  }> = [];

  // Mapping from clipId to effectChainIndex (for seek support)
  private clipEffectChainMap: Map<string, number> = new Map();

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
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
    if (this.players.has(sample.id)) {
      return { sampleId: sample.id, success: true };
    }

    try {
      const player = new Tone.Player({
        url: sample.audioUrl,
      }).toDestination();

      await player.load(sample.audioUrl);
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
    if (this.players.has(sample.id)) {
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
    const player = this.players.get(sampleId);
    return player?.loaded ?? false;
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

    const player = this.players.get(sampleId);
    if (!player || !player.loaded || !player.buffer) {
      return null;
    }

    // Extract the underlying AudioBuffer from Tone.js
    const toneBuffer = player.buffer;
    if (!toneBuffer || toneBuffer.length === 0) {
      return null;
    }

    // Get the raw AudioBuffer
    // Tone.js ToneAudioBuffer wraps the native AudioBuffer
    const audioBuffer = toneBuffer.get() as AudioBuffer | undefined;
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

  /** Check if a clip has non-default pitch or reverb effects */
  private clipHasEffects(clip: Clip): boolean {
    const fx = clip.effects;
    if (!fx) return false;
    return (fx.pitch !== 0 && fx.pitch !== undefined) ||
           (fx.reverb !== 0 && fx.reverb !== undefined);
  }

  /** Create an isolated player with effect nodes for a clip */
  private createEffectChain(
    sourcePlayer: Tone.Player,
    clip: Clip,
    volumeDb: number,
  ): { player: Tone.Player; nodes: Tone.ToneAudioNode[] } {
    const fx = clip.effects!;
    const nodes: Tone.ToneAudioNode[] = [];

    // Build chain nodes (order: pitch → reverb → volume → destination)
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

    // Volume node (always needed)
    nodes.push(new Tone.Volume(volumeDb));

    // Create isolated player using the source player's buffer
    const player = new Tone.Player(sourcePlayer.buffer);

    // Chain: player → [pitchShift] → [reverb] → volume → destination
    if (nodes.length > 0) {
      player.chain(...nodes, Tone.getDestination());
    } else {
      player.toDestination();
    }

    return { player, nodes };
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
  }

  scheduleTimeline(tracks: Track[], samples: Sample[]): void {
    const transport = Tone.getTransport();
    transport.cancel(); // Clear previous schedule
    transport.bpm.value = DEFAULT_BPM;

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
      effectChainIndex?: number;  // Index in this.effectChains for clips with pitch/reverb
    };

    // Build events array for Tone.Part
    const events: ClipEvent[] = [];

    tracks.forEach((track) => {
      const trackVolume = track.volume ?? 0;
      const trackMuted = track.mute ?? false;

      track.clips.forEach((clip) => {
        const player = this.players.get(clip.sampleId);
        const sample = sampleMap.get(clip.sampleId);

        if (!player || !player.loaded || !sample) return;

        const clipVolume = clip.effects?.volume ?? 0;
        const clipMuted = clip.effects?.mute ?? false;
        const volumeDb = trackVolume + clipVolume;
        const isMuted = trackMuted || clipMuted;
        const trimStart = getClipTrimStart(clip);
        const singleDuration = getClipDuration(clip, sample);

        // Create effect chain for clips with pitch/reverb (#33)
        let effectChainIndex: number | undefined;
        if (this.clipHasEffects(clip) && !isMuted) {
          const chain = this.createEffectChain(player, clip, volumeDb);
          effectChainIndex = this.effectChains.length;
          this.effectChains.push(chain);
          this.clipEffectChainMap.set(clip.id, effectChainIndex);
        }

        // Loop logic (#65): generate multiple events for looping clips
        if (clip.loop && clip.loopDurationBeats) {
          const totalSeconds = beatsToSeconds(clip.loopDurationBeats, DEFAULT_BPM);
          const startSeconds = beatsToSeconds(clip.startBeat, DEFAULT_BPM);
          let offset = 0;

          while (offset < totalSeconds - 0.001) {
            const remaining = totalSeconds - offset;
            const dur = Math.min(singleDuration, remaining);
            events.push({
              time: startSeconds + offset,
              sampleId: clip.sampleId,
              trimStart,
              duration: dur,
              volumeDb,
              isMuted,
              effectChainIndex,
            });
            offset += singleDuration;
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

    // Create Tone.Part with events (object format with time property)
    this.timelinePart = new Tone.Part<ClipEvent>(
      (time, event) => {
        if (event.isMuted) return; // Skip muted clips/tracks

        // Use effect chain if available (#33)
        if (event.effectChainIndex !== undefined) {
          const chain = this.effectChains[event.effectChainIndex];
          if (chain?.player) {
            chain.player.start(time, event.trimStart, event.duration);
          }
          return;
        }

        // Default: use shared player
        const player = this.players.get(event.sampleId);
        if (player?.loaded) {
          player.volume.setValueAtTime(event.volumeDb, time);
          player.start(time, event.trimStart, event.duration);
        }
      },
      events
    );

    // Start Part at transport position 0
    this.timelinePart.start(0);
  }

  /**
   * Check if a clip is active (playing) at a specific beat position.
   * A clip is active if: startBeat <= beat < endBeat (loop-aware)
   */
  private isClipActiveAtBeat(clip: Clip, sample: Sample, beat: number): boolean {
    const clipEndBeat = getEffectiveClipEndBeat(clip, sample, DEFAULT_BPM);
    return clip.startBeat <= beat && beat < clipEndBeat;
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
   * NOTE: Clips with effect chains have their own isolated players and can all start.
   * Clips using the shared player are deduplicated by sampleId (Tone.Player limitation)
   * — we pick the one with the longest remaining duration.
   */
  private startActiveClips(seekBeat: number): void {
    const activeClips = this.getActiveClipsAtBeat(seekBeat);

    if (activeClips.length === 0) return;

    // Separate clips with effect chains (own player each) from shared-player clips.
    // Shared-player clips must be deduplicated by sampleId (Tone.Player limitation).
    const effectClips: typeof activeClips = [];
    const sharedClipsBySample = new Map<string, typeof activeClips[0]>();

    activeClips.forEach((clipData) => {
      if (this.clipEffectChainMap.has(clipData.clip.id)) {
        // Has its own isolated player — no deduplication needed
        effectClips.push(clipData);
      } else {
        // Uses shared player — deduplicate by sampleId, keep longest remaining
        const existing = sharedClipsBySample.get(clipData.clip.sampleId);
        if (!existing || clipData.remainingDuration > existing.remainingDuration) {
          sharedClipsBySample.set(clipData.clip.sampleId, clipData);
        }
      }
    });

    // Start all clips at the same time with small buffer
    const startTime = Tone.now() + 0.05;

    // Start effect chain clips
    effectClips.forEach(({ adjustedTrimStart, remainingDuration, clip, isMuted }) => {
      if (isMuted) return;
      const chainIndex = this.clipEffectChainMap.get(clip.id)!;
      const chain = this.effectChains[chainIndex];
      if (chain?.player) {
        chain.player.start(startTime, adjustedTrimStart, remainingDuration);
        logger.audio('startActiveClip (effect chain)', {
          sampleId: clip.sampleId,
          seekBeat,
          adjustedTrimStart,
          remainingDuration,
        });
      }
    });

    // Start shared-player clips
    sharedClipsBySample.forEach(({ player, adjustedTrimStart, remainingDuration, clip, volumeDb, isMuted }) => {
      if (isMuted) return;
      player.volume.setValueAtTime(volumeDb, startTime);
      player.start(startTime, adjustedTrimStart, remainingDuration);
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

    // Start clips that are already active at the seek position
    // (their start event is in the "past" but they should still be playing)
    if (fromBeat > 0) {
      this.startActiveClips(fromBeat);
    }

    // Start transport for future clips (handled by Tone.Part)
    transport.start('+0.05', offsetSeconds);
    this.startPlayheadUpdates();
  }

  pause(): void {
    const transport = Tone.getTransport();
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
    this.effectChains.forEach(({ player }) => {
      try { player.stop(); } catch { /* ignore */ }
    });
    this.stopPlayheadUpdates();
  }

  stop(): void {
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
   * Stops all players, rebuilds Tone.Part with current tracks, and resumes
   * from the same beat position. Used when clips are added/moved/deleted
   * or effects change during playback.
   */
  rescheduleWhilePlaying(tracks: Track[], samples: Sample[], looping: boolean, totalBeats: number): void {
    const currentBeat = this.getCurrentBeat();

    // 1. Stop all active players (shared + effect chains)
    this.players.forEach((p) => { try { p.stop(); } catch { /* ignore */ } });
    this.effectChains.forEach(({ player }) => { try { player.stop(); } catch { /* ignore */ } });
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
   * Dispose players that are no longer needed.
   * Call during theme switches to prevent unbounded memory growth.
   *
   * @param activeSampleIds - IDs of samples that should be kept loaded
   */
  disposeUnusedPlayers(activeSampleIds: Set<string>): void {
    let disposedCount = 0;
    for (const [sampleId, player] of this.players) {
      if (!activeSampleIds.has(sampleId)) {
        player.dispose();
        this.players.delete(sampleId);
        this.waveformCache.delete(sampleId);
        disposedCount++;
      }
    }
    if (disposedCount > 0) {
      logger.info(`Disposed ${disposedCount} unused audio players`);
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

    // Dispose sample players
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
