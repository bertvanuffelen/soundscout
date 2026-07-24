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
import {
  clipHasEffects,
  generateClipEvents,
  type ClipEvent,
  type ClipEffectsConfig,
} from './audioEvents';
import {
  buildClipChain,
  scheduleFadeCurves,
  scheduleFadeCurvesAtOffset,
} from './audioGraph';
import { pitchBufferService } from './PitchBufferService';
import {
  buildLimiterProcessorCode,
  applyLimiterToChannels,
} from './masterLimiter';

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

  // Auto-stop: beat waarop het laatste geluid is uitgestorven, inclusief
  // galmstaart (D12) — gelijk aan wat de export rendert. 0 = niet berekend.
  private autoStopBeat: number = 0;

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

  // Active on-demand sources: created by Part callback and startActiveClips().
  // Each entry is a player + its effect nodes, auto-disposed when done.
  // This replaces the old upfront effectChains[] approach.
  private activeSources: Set<{
    player: Tone.Player;
    nodes: Tone.ToneAudioNode[];
  }> = new Set();

  // Whether scheduleTimeline() has been called and the Part is still valid.
  // Set true in scheduleTimeline(), stays true through pause(), cleared on
  // stop(). Allows resume without a costly reschedule (Fase 1 fix).
  private _isScheduled = false;

  // The audioVersion at the time of the last scheduleTimeline() call.
  // Used by callers to detect if timeline data changed since last schedule
  // (e.g. edits while paused in the studio).
  private _scheduledAtVersion: number = -1;

  // Track buses: 8 Gain nodes (one per track) → masterBus → Destination.
  // Lazy-initialized on first scheduleTimeline() call. Persist across
  // schedule/stop cycles — only disposed in dispose().
  // Total permanent nodes: 9 (8 buses + 1 master). Was 170+ before refactor.
  private trackBuses: Tone.Gain[] = [];
  private masterBus: Tone.Volume | null = null;

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
    // Master-limiter klaarzetten (fire-and-forget; herroutet de master zodra
    // de worklet geladen is — tot die tijd master → Destination zonder limiter)
    void this.ensureMasterLimiter();
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
    // Stop any currently playing preview before starting a new one
    this.stopAllSamples();
    this.stopPreviewWithEffects();
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

    // Stop any currently playing preview before starting a new one
    this.stopAllSamples();
    this.stopPreviewWithEffects();
    logger.audio('playRegion', { sampleId, offset: offsetSeconds, duration: durationSeconds });
    player.start(Tone.now(), offsetSeconds, durationSeconds);
  }

  // Preview effect chain (for EffectsModal preview)
  private previewChain: { player: Tone.Player; nodes: Tone.ToneAudioNode[] } | null = null;
  // Race-guard: alleen de laatst gestarte preview mag gaan spelen (na bake-await)
  private previewToken: object | null = null;

  /**
   * Play a sample region with effects applied (for EffectsModal preview).
   * Creates a temporary isolated player with pitch, reverb, and fade.
   */
  async playSampleWithEffects(
    sampleId: string,
    offsetSeconds: number,
    durationSeconds: number,
    effects: { pitch: number; reverb: number; fadeIn: number; fadeOut: number },
  ): Promise<void> {
    // Stop any currently playing preview before starting a new one
    this.stopAllSamples();
    this.stopPreviewWithEffects();

    const buffer = this.buffers.get(sampleId);
    if (!buffer || !buffer.loaded) {
      logger.warn(`Sample "${sampleId}" not loaded for effects preview`);
      return;
    }

    // Pitch als gebakken buffer (Fase 3): de preview klinkt daarmee exact
    // als de timeline én de export. Bake is snel (~50-100 ms) en gecachet.
    const previewToken = {};
    this.previewToken = previewToken;
    if (effects.pitch !== 0) {
      const source = buffer.get() as AudioBuffer | undefined;
      if (source) {
        await pitchBufferService.bake(sampleId, effects.pitch, source);
      }
      // Klikte de gebruiker intussen een nieuwe preview aan? Dan afbreken.
      if (this.previewToken !== previewToken) return;
    }
    const resolved = pitchBufferService.resolveForPlayback(sampleId, effects, buffer);

    // Zelfde gedeelde keten als de timeline en de export (audioGraph):
    // player → [pitchShift-fallback] → [reverb] → [fadeGain] → volume → destination
    const chain = buildClipChain(0, resolved.effects);
    const player = new Tone.Player(resolved.buffer);
    player.connect(chain.input);
    chain.output.connect(Tone.getDestination());

    // Schedule fade curves
    const now = Tone.now() + 0.05;
    if (chain.fadeGain) {
      scheduleFadeCurves(chain.fadeGain, now, durationSeconds, effects.fadeIn, effects.fadeOut);
    }

    // Start playback
    player.start(now, offsetSeconds, durationSeconds);

    this.previewChain = { player, nodes: chain.nodes };
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

  // ==========================================================================
  // TIMELINE SCHEDULING & PLAYBACK
  // ==========================================================================

  // --- Track bus infrastructure ---

  /** Basisaantal track-buses; groeit dynamisch mee met tracks.length (B3) */
  private static readonly TRACK_BUS_COUNT = 8;

  /** Solo-spoor (monitoring): alle andere buses krijgen gain 0. Sessie-state,
   *  wordt niet opgeslagen in composities. */
  private soloTrackIndex: number | null = null;

  /** Actieve loop-regio ("Loop deze sectie", B4) — bewaard zodat een live
   *  reschedule (#22) de regio behoudt. Sessie-state. */
  private loopRegion: { startBeat: number; endBeat: number } | null = null;

  /**
   * Ensure at least `count` track buses exist. Lazy-initialized and
   * grow-only (B3: "+ spoor" tot 12 — vóór deze fix waren buses vast 8 en
   * zou spoor 9+ zonder mute-controle rechtstreeks naar Destination gaan).
   * Buses persist across schedule/stop cycles for efficiency.
   */
  private ensureTrackBuses(count: number = AudioService.TRACK_BUS_COUNT): void {
    if (!this.masterBus) {
      this.masterBus = new Tone.Volume(0);
      this.connectMasterOutput();
    }
    while (this.trackBuses.length < count) {
      this.trackBuses.push(new Tone.Gain(1).connect(this.masterBus));
    }
  }

  // --- Master-limiter (Audio Engine v2) ---

  /** Live limiter-node op de master (zelfde kernel als offline/vangnet) */
  private limiterNode: AudioWorkletNode | null = null;
  /** Context waarvoor de limiter is opgezet (contexts wisselen na dispose) */
  private limiterContext: object | null = null;

  /**
   * Verbind de master met zijn uitgang: via de limiter als die klaar is,
   * anders rechtstreeks naar Destination. Ook gebruikt om de routing te
   * herstellen na captureRender.
   */
  private connectMasterOutput(): void {
    if (!this.masterBus) return;
    if (this.limiterNode && this.limiterContext === Tone.getContext()) {
      this.masterBus.connect(this.limiterNode);
    } else {
      this.masterBus.toDestination();
    }
  }

  /**
   * Zet de master-limiter op: lookahead brickwall (−1 dBFS) als
   * AudioWorklet ná de masterBus. Exact dezelfde DSP-kernel als de offline
   * export en het vangnet (masterLimiter.ts) — live == export blijft gelden.
   * Faalt stil naar "geen live limiter" op oude browsers; de export heeft
   * de limiter dan alsnog (pure JS).
   */
  /**
   * Alle SoundScout-processors in ÉÉN worklet-module. Tone's context-wrapper
   * ondersteunt effectief maar één addAudioWorkletModule per context: een
   * twééde module registreert schijnbaar "ok", maar nodes ervan gooien
   * NotSupportedError (empirisch vastgesteld 24-7). Meerdere processors in
   * één module werken wél onbeperkt.
   */
  private buildDspWorkletCode(): string {
    return buildLimiterProcessorCode() + '\n' + this.buildCaptureWorkletCode();
  }

  /**
   * Maak een worklet-node uit de gedeelde DSP-module; registreer die module
   * precies één keer per context. Het register hangt aan het cóntext-object
   * zelf, zodat een tweede service-instantie op dezelfde context (HMR in
   * dev) niet dubbel registreert (dubbele registerProcessor met dezelfde
   * naam gooit NotSupportedError).
   */
  private async createWorkletNode(
    ctx: ReturnType<typeof Tone.getContext>,
    name: string,
    options: AudioWorkletNodeOptions
  ): Promise<AudioWorkletNode> {
    const holder = ctx as unknown as {
      __soundscoutDspModule?: Promise<void>;
    };
    if (!holder.__soundscoutDspModule) {
      const url = URL.createObjectURL(
        new Blob([this.buildDspWorkletCode()], { type: 'application/javascript' })
      );
      holder.__soundscoutDspModule = ctx.addAudioWorkletModule(url);
    }
    try {
      await holder.__soundscoutDspModule;
    } catch (err) {
      // Mislukte registratie niet cachen — volgende poging mag opnieuw
      holder.__soundscoutDspModule = undefined;
      throw err;
    }
    return ctx.createAudioWorkletNode(name, options);
  }

  private async ensureMasterLimiter(): Promise<void> {
    const ctx = Tone.getContext();
    if (this.limiterNode && this.limiterContext === ctx) return;
    try {
      const node = await this.createWorkletNode(ctx, 'soundscout-limiter', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2],
        channelCount: 2,
      });
      Tone.connect(node, Tone.getDestination());
      this.limiterNode = node;
      this.limiterContext = ctx;
      // Bestaat de master al, herroute die dan door de limiter
      if (this.masterBus) {
        try { this.masterBus.disconnect(); } catch { /* ignore */ }
        this.masterBus.connect(node);
      }
      logger.info('Master-limiter actief (−1 dBFS, 5ms lookahead, 150ms release)');
    } catch (err) {
      logger.warn('Master-limiter-worklet niet beschikbaar — live zonder limiter (export limit wél)', err);
    }
  }

  /**
   * Update track bus states from track data.
   * Called at the start of scheduleTimeline() to sync bus gains.
   *
   * Bus handles mute + solo (gain = 0 or 1). Track volume is still baked
   * into per-clip chains for backward compatibility.
   */
  private updateTrackBuses(tracks: Track[]): void {
    this.ensureTrackBuses(Math.max(AudioService.TRACK_BUS_COUNT, tracks.length));
    tracks.forEach((track, index) => {
      if (index >= this.trackBuses.length) return;
      const bus = this.trackBuses[index];
      const muted = track.mute ?? false;
      const soloedOut = this.soloTrackIndex !== null && this.soloTrackIndex !== index;
      // Bus handles mute/solo; track volume still in per-clip chains
      bus.gain.value = muted || soloedOut ? 0 : 1;
    });
  }

  /**
   * Zet het solo-spoor (of null = geen solo). Past direct de bus-gains toe
   * op de huidige schedule — geen reschedule nodig, werkt live tijdens
   * afspelen (B3).
   */
  setSoloTrack(index: number | null): void {
    this.soloTrackIndex = index;
    if (this.trackBuses.length > 0 && this.scheduledTracks.length > 0) {
      this.updateTrackBuses(this.scheduledTracks);
    }
    logger.audio('solo track', { index });
  }

  /**
   * Dispose track buses and master bus.
   * Only called from dispose() — buses persist across schedule cycles.
   */
  private disposeTrackBuses(): void {
    this.trackBuses.forEach((bus) => {
      try { bus.dispose(); } catch { /* ignore */ }
    });
    this.trackBuses = [];
    if (this.masterBus) {
      try { this.masterBus.dispose(); } catch { /* ignore */ }
      this.masterBus = null;
    }
    if (this.limiterNode) {
      try { this.limiterNode.disconnect(); } catch { /* ignore */ }
      this.limiterNode = null;
      this.limiterContext = null;
    }
  }

  // --- Effect chain helpers (#33) ---

  /**
   * Create an on-demand player with optional effects, routed through a track bus.
   * Used by Part callback and startActiveClips() — each call creates a fresh
   * player that auto-disposes when done (via onstop callback).
   *
   * The player shares the source ToneAudioBuffer — no extra memory.
   * Routes: player → [effects] → volume → trackBus[trackIndex]
   * De keten zelf komt uit de gedeelde audioGraph-builder (Audio Engine v2).
   *
   * Returns the created source entry (added to activeSources) and the
   * fadeGain node (if applicable, for external fade curve scheduling).
   */
  private createOnDemandPlayer(
    buffer: Tone.ToneAudioBuffer | AudioBuffer,
    volumeDb: number,
    trackIndex: number,
    effects?: ClipEffectsConfig,
  ): { player: Tone.Player; fadeGain: Tone.Gain | null; source: { player: Tone.Player; nodes: Tone.ToneAudioNode[] } } {
    const chain = buildClipChain(volumeDb, effects);
    const { nodes, fadeGain } = chain;

    // Create player from shared buffer
    const player = new Tone.Player(buffer);

    // Chain: player → [effects] → volume → trackBus
    const destination = this.trackBuses[trackIndex] || Tone.getDestination();
    player.connect(chain.input);
    chain.output.connect(destination);

    // Track in activeSources for lifecycle management
    const source = { player, nodes };
    this.activeSources.add(source);

    // Auto-dispose when player finishes (fire-and-forget pattern)
    player.onstop = () => {
      this.activeSources.delete(source);
      try { player.dispose(); } catch { /* ignore */ }
      nodes.forEach((node) => {
        try { node.dispose(); } catch { /* ignore */ }
      });
    };

    return { player, fadeGain, source };
  }

  /**
   * Stop and dispose all active on-demand sources.
   * Called on pause (with dispose) and stop.
   */
  private disposeActiveSources(): void {
    this.activeSources.forEach(({ player, nodes }) => {
      // Remove onstop to prevent it from firing during manual dispose
      player.onstop = () => {};
      try { player.stop(); } catch { /* ignore */ }
      try { player.dispose(); } catch { /* ignore */ }
      nodes.forEach((node) => {
        try { node.dispose(); } catch { /* ignore */ }
      });
    });
    this.activeSources.clear();
  }

  scheduleTimeline(tracks: Track[], samples: Sample[]): void {
    const scheduleStartTime = performance.now();
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

    // Dispose any lingering on-demand sources from previous schedule
    this.disposeActiveSources();

    // Ensure track buses exist (lazy init, groeit mee met tracks.length)
    // and sync mute/solo
    this.updateTrackBuses(tracks);

    // Pitch-bakes klaarzetten (Fase 3, fire-and-forget): de Part-callback
    // lost per event op, dus zodra een bake klaar is gebruiken volgende
    // events hem vanzelf — geen reschedule nodig. Eerste afspeelbeurt kan
    // nog op de PitchShift-fallback lopen; de export wacht wél op de bakes.
    void pitchBufferService.ensureForTracks(tracks, (sampleId) => {
      const buf = this.buffers.get(sampleId);
      return buf?.loaded ? (buf.get() as AudioBuffer | undefined) : undefined;
    });

    // Gedeelde event-generatie (Audio Engine v2): identiek aan wat de export
    // gebruikt — loop-iteraties, per-iteratie-fades, mute, volumes.
    const generated = generateClipEvents(tracks, samples, {
      bpm: DEFAULT_BPM,
      // Solo wordt live dynamisch via bus-gains geregeld (setSoloTrack),
      // dus hier NIET in de events bakken.
      hasBuffer: (sampleId) => {
        const buffer = this.buffers.get(sampleId);
        return !!buffer && buffer.loaded;
      },
    });
    const { events, totalClipCount, mutedClipCount } = generated;

    // Auto-stop-grens: hoorbaar einde incl. galmstaart (D12 — live laat de
    // reverb nu net als de export uitklinken)
    this.autoStopBeat = Math.max(generated.lastContentBeat, generated.lastAudibleBeat);

    // Create Tone.Part with ON-DEMAND player creation in callback.
    // Each event creates a fresh player → effects → trackBus, plays it,
    // and auto-disposes when done. No upfront chain allocation.
    this.timelinePart = new Tone.Part<ClipEvent>(
      (time, event) => {
        if (event.isMuted) return;

        // Get buffer for this sample
        const buffer = this.buffers.get(event.sampleId);
        if (!buffer) return;

        // Pitch als gebakken buffer (Fase 3): is er een Signalsmith-bake in
        // de cache, dan speelt die zonder PitchShift-node; anders fallback.
        const resolved = pitchBufferService.resolveForPlayback(
          event.sampleId, event.effects, buffer
        );

        // Create on-demand player with effects, routed to track bus
        const { player, fadeGain } = this.createOnDemandPlayer(
          resolved.buffer, event.volumeDb, event.trackIndex, resolved.effects
        );

        // Schedule fade curves on the fadeGain node (#79) — gedeelde planner
        if (fadeGain) {
          scheduleFadeCurves(fadeGain, time, event.duration, event.fadeIn, event.fadeOut);
        }

        try {
          player.start(time, event.trimStart, event.duration);
          audioDiag.partCallback({
            scheduledTime: time,
            audioContextCurrentTime: Tone.getContext().rawContext.currentTime,
            sampleId: event.sampleId,
            effectChainIndex: undefined,
            success: true,
          });
        } catch (e) {
          logger.warn('On-demand player start failed', { sampleId: event.sampleId, error: e });
          audioDiag.partCallback({
            scheduledTime: time,
            audioContextCurrentTime: Tone.getContext().rawContext.currentTime,
            sampleId: event.sampleId,
            effectChainIndex: undefined,
            success: false,
            error: e instanceof Error ? e.message : String(e),
          });
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
      effectChains: 0,  // No upfront chains — all on-demand now
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
   * Returns clips with adjusted trimStart, duration, trackIndex, and effects
   * config for on-demand player creation.
   */
  private getActiveClipsAtBeat(beat: number): Array<{
    clip: Clip;
    sample: Sample;
    adjustedTrimStart: number;
    remainingDuration: number;
    volumeDb: number;
    isMuted: boolean;
    trackIndex: number;
    effects?: { pitch: number; reverb: number; fadeIn: number; fadeOut: number };
  }> {
    const activeClips: Array<{
      clip: Clip;
      sample: Sample;
      adjustedTrimStart: number;
      remainingDuration: number;
      volumeDb: number;
      isMuted: boolean;
      trackIndex: number;
      effects?: { pitch: number; reverb: number; fadeIn: number; fadeOut: number };
    }> = [];

    const sampleMap = new Map(this.scheduledSamples.map((s) => [s.id, s]));

    this.scheduledTracks.forEach((track, trackIndex) => {
      const trackVolume = track.volume ?? 0;
      const trackMuted = track.mute ?? false;

      track.clips.forEach((clip) => {
        const sample = sampleMap.get(clip.sampleId);
        const buffer = this.buffers.get(clip.sampleId);

        if (!sample || !buffer || !buffer.loaded) return;
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
          const posInLoop = elapsedSeconds % singleDuration;
          adjustedTrimStart = originalTrimStart + posInLoop;
          const remainingInIteration = singleDuration - posInLoop;
          const totalRemaining = beatsToSeconds(clip.loopDurationBeats, DEFAULT_BPM) - elapsedSeconds;
          remainingDuration = Math.min(remainingInIteration, totalRemaining);
        } else {
          adjustedTrimStart = originalTrimStart + elapsedSeconds;
          remainingDuration = singleDuration - elapsedSeconds;
        }

        // Build effects config if clip has non-default effects
        const effects = clipHasEffects(clip) ? {
          pitch: clip.effects?.pitch ?? 0,
          reverb: clip.effects?.reverb ?? 0,
          fadeIn: clip.effects?.fadeIn ?? 0,
          fadeOut: clip.effects?.fadeOut ?? 0,
        } : undefined;

        // Only add if there's still something to play (minimum 10ms)
        if (remainingDuration > 0.01) {
          activeClips.push({
            clip,
            sample,
            adjustedTrimStart,
            remainingDuration,
            volumeDb: trackVolume + clipVolume,
            isMuted: trackMuted || clipMuted,
            trackIndex,
            effects,
          });
        }
      });
    });

    return activeClips;
  }

  /**
   * Start all clips that are active at the given beat position.
   * Creates on-demand players for each active clip, routed through track buses.
   * Handles fade curve scheduling for seek into fade-in/fade-out zones.
   */
  private startActiveClips(seekBeat: number): void {
    const activeClips = this.getActiveClipsAtBeat(seekBeat);
    if (activeClips.length === 0) return;

    const startTime = Tone.now() + 0.05;

    activeClips.forEach(({ adjustedTrimStart, remainingDuration, clip, sample, isMuted, volumeDb, trackIndex, effects }) => {
      if (isMuted) return;

      const buffer = this.buffers.get(clip.sampleId);
      if (!buffer) return;

      // Pitch als gebakken buffer (Fase 3) — zelfde resolutie als de Part
      const resolved = pitchBufferService.resolveForPlayback(
        clip.sampleId, effects, buffer
      );

      // Create on-demand player routed to track bus
      const { player, fadeGain } = this.createOnDemandPlayer(
        resolved.buffer, volumeDb, trackIndex, resolved.effects
      );

      // Schedule fade curves for seek position (#79) — gedeelde planner
      // UX-FADE-LOOP: fade per iteratie — effectiveElapsed binnen de huidige
      // (loop-)iteratie bepaalt de tussenwaarde en het curve-restant.
      if (fadeGain && effects) {
        const elapsedBeats = seekBeat - clip.startBeat;
        const elapsedSeconds = beatsToSeconds(elapsedBeats, DEFAULT_BPM);
        const singleDuration = getClipDuration(clip, sample);
        const effectiveElapsed = (clip.loop && clip.loopDurationBeats)
          ? elapsedSeconds % singleDuration
          : elapsedSeconds;
        scheduleFadeCurvesAtOffset(
          fadeGain, startTime, effectiveElapsed, singleDuration,
          effects.fadeIn, effects.fadeOut,
        );
      }

      player.start(startTime, adjustedTrimStart, remainingDuration);
      logger.audio('startActiveClip (on-demand)', {
        sampleId: clip.sampleId,
        seekBeat,
        adjustedTrimStart,
        remainingDuration,
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
      activeSourceCount: Array.from(this.activeSources).reduce((count, { player }) => {
        try { return count + (player.state === 'started' ? 1 : 0); } catch { return count; }
      }, 0),
      effectChainCount: this.activeSources.size,
      isScheduled: this._isScheduled,
      getTransportSeconds: () => transport.seconds,
    }));
  }

  pause(): void {
    const transport = Tone.getTransport();
    audioDiag.pause(this.getCurrentBeat(), this.activeSources.size, 0);
    audioDiag.stopSnapshots();
    transport.pause();
    // Dispose all on-demand sources — on resume, Part callback and
    // startActiveClips() will create fresh players. This is safe because
    // on-demand players are lightweight and share the same buffers.
    this.disposeActiveSources();
    // Stop preview players (they're independent of the transport)
    this.players.forEach((player) => {
      try { player.stop(); } catch { /* ignore */ }
    });
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
    // Dispose all on-demand sources
    this.disposeActiveSources();
    // Stop preview players
    this.players.forEach((player) => {
      try { player.stop(); } catch { /* ignore */ }
    });
    this._isScheduled = false;
    this.stopPlayheadUpdates();
    // Notify listeners that we're back at beat 0
    this.beatUpdateCallbacks.forEach((cb) => cb(0));
  }

  /**
   * Zet transport-loop. Zonder regio: hele tijdlijn (huidig gedrag).
   * Met regio ("Loop deze sectie", B4): loopt exact dat stuk — afspelen
   * vóór de regio speelt eerst tot loopEnd en springt dan naar loopStart
   * (DAW-standaardgedrag van Tone.Transport).
   */
  setLoop(
    enabled: boolean,
    totalBeats: number,
    region: { startBeat: number; endBeat: number } | null = null,
  ): void {
    // Onthouden zodat rescheduleWhilePlaying (#22) de regio kan behouden
    this.loopRegion = enabled ? region : null;
    const transport = Tone.getTransport();
    transport.loop = enabled;
    if (enabled && region) {
      transport.loopStart = beatsToSeconds(region.startBeat, DEFAULT_BPM);
      transport.loopEnd = beatsToSeconds(region.endBeat, DEFAULT_BPM);
    } else if (enabled) {
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

    // 1. Stop all sources + transport so play(currentBeat) re-seeds cleanly
    this.disposeActiveSources();
    this.players.forEach((p) => { try { p.stop(); } catch { /* ignore */ } });
    transport.cancel();
    transport.stop();
    this.stopPlayheadUpdates();

    // 2. Full reschedule (disposes old Part + active sources, builds new Part)
    this.scheduleTimeline(tracks, samples);
    this.setLoop(looping, totalBeats, this.loopRegion);

    // 3. Resume playback from the same position
    this.play(currentBeat);
  }

  // ==========================================================================
  // REALTIME-CAPTURE-VANGNET (Audio Engine v2, Fase 4)
  // ==========================================================================

  private buildCaptureWorkletCode(): string {
    // De worklet vangt ALLES vanaf zijn geboorte, frame-geïndexeerd; de
    // main thread knipt het exacte venster uit. Zo maakt de latentie van
    // het start-bericht (module-compile kan honderden ms duren) niet uit.
    return `
        class SoundScoutCapture extends AudioWorkletProcessor {
          constructor() {
            super();
            this.capturing = true;
            this.bufs = [];
            this.count = 0;
            this.port.onmessage = (e) => {
              const d = e.data;
              if (d.cmd === 'ping') { this.port.postMessage({ type: 'pong' }); }
              if (d.cmd === 'flush') {
                this.capturing = false;
                this.flush();
                this.port.postMessage({ type: 'end' });
              }
            };
          }
          flush() {
            if (this.bufs.length) {
              this.port.postMessage({ type: 'chunks', chunks: this.bufs });
              this.bufs = [];
              this.count = 0;
            }
          }
          process(inputs) {
            if (!this.capturing) return true;
            const inp = inputs[0];
            if (!inp || !inp[0]) {
              // Inactieve input (bv. na de laatste clip) = stilte — óók
              // vastleggen, anders mist het venster zijn stille staart.
              const zeros = new Float32Array(128);
              this.bufs.push({ f: currentFrame, L: zeros, R: zeros });
            } else {
              this.bufs.push({
                f: currentFrame,
                L: inp[0].slice(0),
                R: (inp[1] || inp[0]).slice(0),
              });
            }
            if (++this.count >= 64) this.flush();
            return true;
          }
        }
        registerProcessor('soundscout-capture', SoundScoutCapture);
      `;
  }

  /**
   * Vangnet-export: speel de compositie via de échte live motor af (onhoorbaar,
   * master → capture → gain 0) en neem de output sample-exact op. Duurt zo
   * lang als de compositie, maar klinkt per definitie als live. Wordt alleen
   * gebruikt wanneer de validator de offline render afkeurt (Fase 4).
   */
  async captureRender(
    tracks: Track[],
    samples: Sample[],
    durationSeconds: number,
    onProgress?: (fraction: number) => void,
  ): Promise<AudioBuffer> {
    await this.initialize();
    const ctx = Tone.getContext();
    const sampleRate = ctx.sampleRate;

    const cap = await this.createWorkletNode(ctx, 'soundscout-capture', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 2,
      channelCountMode: 'explicit',
    });
    type CaptureChunk = { f: number; L: Float32Array; R: Float32Array };
    const collected: CaptureChunk[] = [];
    let endResolve: () => void = () => {};
    const endPromise = new Promise<void>((resolve) => { endResolve = resolve; });
    let pongResolve: () => void = () => {};
    const pongPromise = new Promise<void>((resolve) => { pongResolve = resolve; });
    cap.port.onmessage = (e) => {
      const d = e.data as { type: string; chunks?: CaptureChunk[] };
      if (d.type === 'chunks' && d.chunks) collected.push(...d.chunks);
      if (d.type === 'pong') pongResolve();
      if (d.type === 'end') endResolve();
    };

    // Onhoorbaar meeluisteren: master → capture → gain(0) → destination
    const silent = new Tone.Gain(0).toDestination();
    this.ensureTrackBuses(Math.max(AudioService.TRACK_BUS_COUNT, tracks.length));
    const master = this.masterBus!;
    master.disconnect();
    master.connect(cap);
    Tone.connect(cap, silent);

    const transport = Tone.getTransport();
    let startFrame = 0;
    const totalFrames = Math.ceil(durationSeconds * sampleRate);
    try {
      // Schone transport-uitgangspositie vóór het plannen
      try { transport.cancel(); transport.stop(); transport.seconds = 0; } catch { /* ignore */ }
      this.scheduleTimeline(tracks, samples);
      this.setLoop(false, 0, null);

      // Handshake: pas als de worklet aantoonbaar draait het startmoment
      // kiezen — anders kan module-compile-latentie het venster missen.
      cap.port.postMessage({ cmd: 'ping' });
      await Promise.race([pongPromise, new Promise((r) => setTimeout(r, 3000))]);

      const raw = ctx.rawContext;
      const startAt = raw.currentTime + 0.2;
      startFrame = Math.round(startAt * sampleRate);
      transport.start(startAt, 0);

      // Wachten tot alle frames gerenderd zijn. Bewust op de cóntext-klok
      // (raw.currentTime): transport.seconds is rond de start onbetrouwbaar
      // (lookahead-race) en kan de lus te vroeg laten aflopen.
      const endTime = startAt + durationSeconds + 0.1;
      const deadline = performance.now() + (durationSeconds + 15) * 1000;
      await new Promise<void>((resolve) => {
        const tick = () => {
          const now = raw.currentTime;
          onProgress?.(Math.min(1, Math.max(0, (now - startAt) / durationSeconds)));
          if (now >= endTime || performance.now() > deadline) resolve();
          else setTimeout(tick, 100);
        };
        tick();
      });

      cap.port.postMessage({ cmd: 'flush' });
      await Promise.race([endPromise, new Promise((r) => setTimeout(r, 2000))]);
    } finally {
      // Motor stoppen en routing herstellen
      try { transport.cancel(); transport.stop(); transport.seconds = 0; } catch { /* ignore */ }
      this.disposeActiveSources();
      this._isScheduled = false;
      try { master.disconnect(); } catch { /* ignore */ }
      this.connectMasterOutput();
      try { cap.disconnect(); } catch { /* ignore */ }
      try { silent.dispose(); } catch { /* ignore */ }
    }

    // Frame-geïndexeerde chunks in het exacte venster [startFrame, +totalFrames)
    const buffer = new AudioBuffer({ numberOfChannels: 2, length: totalFrames, sampleRate });
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    let framesWritten = 0;
    collected.forEach(({ f, L, R }) => {
      const from = Math.max(0, startFrame - f);
      const to = Math.min(L.length, startFrame + totalFrames - f);
      if (to <= from) return;
      const dest = f + from - startFrame;
      left.set(L.subarray(from, to), dest);
      right.set(R.subarray(from, to), dest);
      framesWritten += to - from;
    });
    if (framesWritten < totalFrames * 0.9) {
      throw new Error(
        `Realtime capture onvolledig (${framesWritten}/${totalFrames} frames)`
      );
    }
    // Master-limiter — de capture tapt vóór de live limiter af, dus hier
    // dezelfde kernel toepassen zodat de opname klinkt als de live uitgang
    applyLimiterToChannels([left, right], sampleRate);
    logger.info('Realtime capture afgerond', { durationSeconds, sampleRate, framesWritten, totalFrames });
    return buffer;
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

      // Auto-stop: when not looping and playhead passed the audible end
      // (incl. galmstaart — D12: live laat de reverb net als de export uitklinken)
      if (!transport.loop && this.autoStopBeat > 0 && currentBeat >= this.autoStopBeat) {
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
    // Pitch-bakes van verdwenen samples ook opruimen (Fase 3)
    pitchBufferService.prune(activeSampleIds);
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

    // Dispose track buses
    this.disposeTrackBuses();

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
    this.autoStopBeat = 0;
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
