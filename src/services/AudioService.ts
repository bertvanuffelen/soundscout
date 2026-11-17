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
import type { ClipEffects, Sample, SampleKind, Track } from '../types';
import type { SequencerSequence } from '../types/sequencer';
import { beatsToSeconds, normalizeBpm, secondsToBeats } from '../utils/audio';
import type { WaveformData } from '../utils/waveform';
import {
  DEFAULT_BPM,
  PLAYHEAD_UPDATE_INTERVAL_MS,
} from '../constants/config';
import { logger } from '../utils/logger';
import { audioDiag } from '../utils/audioDiagnostics';
import {
  generateClipEvents,
  toEffectsConfig,
  type ClipEvent,
  type ClipEffectsConfig,
} from './audioEvents';
import {
  buildClipChain,
  createPlanPlayer,
  scheduleFadeCurves,
  scheduleFadeCurvesAtOffset,
} from './audioGraph';
import { pitchBufferService } from './PitchBufferService';
import {
  clipRecipe,
  hasAsyncStage,
  hasSyncStage,
  NEUTRAL_RECIPE,
  recipeKey,
  recipeLengthFactor,
  syncStageOf,
  type BakeRecipe,
} from './bakeRecipe';
import { getSynthBuffer, isSynthSampleId } from './synthVoice';
import { resolveSampleKind } from '../utils/sampleKinds';
import { sanitizeLatency, secondsToAudibleBeat } from './audibleBeat';
import { SampleStore, type LoadingProgressCallback, type SampleLoadResult } from './audio/SampleStore';
import { AmbientPlayer } from './audio/AmbientPlayer';
import {
  decodedAudioBudget,
  type AudioMemoryStats,
  type PinSet,
} from './audio/memoryBudget';
import { addSampleIdPins, addSessionPins, addTimelinePins, createPinSet } from './audio/audioPins';
import { buildCaptureWorkletCode } from './audio/captureWorklet';
import {
  buildLimiterProcessorCode,
  applyLimiterToChannels,
} from './masterLimiter';
import { logFirstSound } from '../utils/usageStats';

type BeatUpdateCallback = (beat: number) => void;

/** Alle sleutels waaronder de bakes van een event in de cache staan (pins) */
function bakeKeysOf(sampleId: string, recipe: BakeRecipe | undefined): string[] {
  if (!recipe) return [];
  const keys = [recipeKey(sampleId, recipe)];
  if (hasSyncStage(recipe) && hasAsyncStage(recipe)) {
    keys.push(recipeKey(sampleId, syncStageOf(recipe)));
  }
  return keys;
}
type PlaybackEndCallback = () => void;
export type { SampleLoadResult } from './audio/SampleStore';

export class AudioService {
  private static instance: AudioService | null = null;

  // Audio buffers: raw ToneAudioBuffer storage — NO audio graph footprint.
  // Used by scheduleTimeline() to create on-demand players.
  private readonly sampleStore = new SampleStore();
  private get buffers(): Map<string, Tone.ToneAudioBuffer> {
    return this.sampleStore.buffers;
  }

  // Preview players: minimal Tone.Player per sample for playSample()/playSampleRegion().
  // Connected to Destination but only active during preview — negligible overhead.
  private get players(): Map<string, Tone.Player> {
    return this.sampleStore.players;
  }
  private isInitialized = false;
  private playheadIntervalId: number | null = null;
  private beatUpdateCallbacks: Set<BeatUpdateCallback> = new Set();
  private playbackEndCallbacks: Set<PlaybackEndCallback> = new Set();

  // Auto-stop: beat waarop het laatste geluid is uitgestorven, inclusief
  // galmstaart (D12) — gelijk aan wat de export rendert. 0 = niet berekend.
  private autoStopBeat: number = 0;

  // Ambient audio
  private readonly ambient = new AmbientPlayer();

  // Timeline Part (for seek support)
  private timelinePart: Tone.Part | null = null;

  // Timeline data (for active clip detection during seek)
  private scheduledTracks: Track[] = [];
  /** Sequencer-patronen van de huidige schedule (fase 2) */
  private scheduledSequences: SequencerSequence[] = [];
  /** De events van de huidige schedule — bron voor seek (V2 Fase 4) */
  private scheduledEvents: ClipEvent[] = [];
  /** Bake-sleutels van de huidige schedule (geheugenbudget-pins) */
  private scheduledBakeKeys: string[] = [];

  /**
   * Tempo van de huidige schedule (V2 Fase 4). Elke tel↔seconde-omrekening
   * van de motor (afspelen, seek, loop, auto-stop, afspeellijn) gebruikt
   * dit — gezet door scheduleTimeline met het tempo van de compositie.
   */
  private bpm: number = DEFAULT_BPM;

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
    // Het geheugenbudget vraagt "wat is in gebruik?" altijd hier op (V2 Fase 3)
    decodedAudioBudget.setPinProvider(() => this.collectPins());
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
  // SAMPLE LOADING (gedelegeerd aan SampleStore — V2 Fase 1)
  // ==========================================================================

  loadSample(sample: Sample): Promise<SampleLoadResult> {
    return this.sampleStore.loadSample(sample);
  }

  loadSamples(
    samples: Sample[],
    onProgress?: LoadingProgressCallback,
    signal?: AbortSignal
  ): Promise<SampleLoadResult[]> {
    return this.sampleStore.loadSamples(samples, onProgress, signal);
  }

  isSampleLoaded(sampleId: string): boolean {
    return this.sampleStore.isSampleLoaded(sampleId);
  }

  // ==========================================================================
  // SAMPLE PLAYBACK (Preview)
  // ==========================================================================

  playSample(sampleId: string): void {
    logFirstSound();
    const player = this.players.get(sampleId);
    if (!player || !player.loaded) {
      // Door het geheugenbudget opgeruimd? Dan transparant herladen en
      // alsnog spelen — tenzij er intussen een andere preview is gestart.
      if (this.sampleStore.canReload(sampleId)) {
        const token = {};
        this.previewToken = token;
        this.previewSampleId = sampleId;
        void this.sampleStore.reload(sampleId).then((ok) => {
          if (ok && this.previewToken === token) this.playSample(sampleId);
        });
        return;
      }
      logger.warn(`Sample "${sampleId}" not loaded, skipping`);
      return;
    }
    // Stop any currently playing preview before starting a new one
    this.stopAllSamples();
    this.stopPreviewWithEffects();
    this.previewToken = {}; // deze preview is nu de actuele (race-guard)
    this.markPreview(sampleId);
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
    this.previewToken = {}; // deze preview is nu de actuele (race-guard)
    this.markPreview(sampleId);
    logger.audio('playRegion', { sampleId, offset: offsetSeconds, duration: durationSeconds });
    player.start(Tone.now(), offsetSeconds, durationSeconds);
  }

  // Preview effect chain (for EffectsModal preview)
  private previewChain: { player: Tone.Player; nodes: Tone.ToneAudioNode[] } | null = null;
  // Race-guard: alleen de laatst gestarte preview mag gaan spelen (na bake-await)
  private previewToken: object | null = null;
  // Pinregel (e): wat er als laatste gepreviewd is (blijft staan tot de volgende)
  private previewSampleId: string | null = null;
  private previewBakeKeys: string[] = [];

  private markPreview(sampleId: string, recipe?: BakeRecipe): void {
    this.previewSampleId = sampleId;
    this.previewBakeKeys = bakeKeysOf(sampleId, recipe);
    this.sampleStore.touch(sampleId);
  }

  /**
   * Play a sample region with effects applied (for EffectsModal preview).
   * Creates a temporary isolated player through the SAME bake + chain path as
   * the timeline and the export: pitch, speed, reverse, tempo-stretch (loops),
   * filter, echo, reverb and fades.
   *
   * @param offsetSeconds   trim start in SOURCE seconds (as on the clip)
   * @param durationSeconds trimmed length in SOURCE seconds
   * @param options.bpm     composition tempo (default: tempo of the last schedule)
   * @param options.kind    sample kind override (default: resolveSampleKind)
   */
  async playSampleWithEffects(
    sampleId: string,
    offsetSeconds: number,
    durationSeconds: number,
    effects: Pick<ClipEffects, 'pitch' | 'reverb' | 'fadeIn' | 'fadeOut'> &
      Partial<Pick<ClipEffects, 'speed' | 'reverse' | 'echo' | 'filter'>>,
    options: { bpm?: number; kind?: SampleKind } = {},
  ): Promise<void> {
    // Stop any currently playing preview before starting a new one
    this.stopAllSamples();
    this.stopPreviewWithEffects();

    const buffer = this.buffers.get(sampleId);
    if (!buffer || !buffer.loaded) {
      logger.warn(`Sample "${sampleId}" not loaded for effects preview`);
      return;
    }

    const bpm = normalizeBpm(options.bpm ?? this.bpm);
    const sampleRef = { id: sampleId, kind: options.kind ?? resolveSampleKind({ id: sampleId }) };
    const recipe = clipRecipe({ effects: { volume: 0, ...effects } }, sampleRef, bpm);
    const lengthFactor = recipeLengthFactor(recipe ?? NEUTRAL_RECIPE);

    // Bake (pitch/stretch) vooraf: de preview klinkt daarmee exact als de
    // timeline én de export. Bake is snel (~50-100 ms) en gecachet.
    const previewToken = {};
    this.previewToken = previewToken;
    this.markPreview(sampleId, recipe);
    if (recipe && hasAsyncStage(recipe)) {
      const source = buffer.get() as AudioBuffer | undefined;
      if (source) {
        await pitchBufferService.bakeRecipe(sampleId, recipe, source);
      }
      // Klikte de gebruiker intussen een nieuwe preview aan? Dan afbreken.
      if (this.previewToken !== previewToken) return;
    }
    const outDuration = durationSeconds * lengthFactor;
    const plan = pitchBufferService.resolvePlan(
      sampleId,
      recipe,
      toEffectsConfig(effects, bpm),
      buffer,
      offsetSeconds * lengthFactor,
      outDuration,
    );

    // Zelfde gedeelde keten als de timeline en de export (audioGraph)
    const chain = buildClipChain(0, plan.effects);
    const player = createPlanPlayer(plan.buffer, plan.playbackRate);
    player.connect(chain.input);
    chain.output.connect(Tone.getDestination());

    // Schedule fade curves
    const now = Tone.now() + 0.05;
    if (chain.fadeGain) {
      scheduleFadeCurves(chain.fadeGain, now, outDuration, effects.fadeIn, effects.fadeOut);
    }

    // Start playback
    player.start(now, plan.offset, plan.duration);

    this.previewChain = { player, nodes: chain.nodes };
    logger.audio('playWithEffects', { sampleId, effects, bpm });
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
  // WAVEFORM DATA (gedelegeerd aan SampleStore — V2 Fase 1)
  // ==========================================================================

  getWaveform(sampleId: string): WaveformData | null {
    return this.sampleStore.getWaveform(sampleId);
  }

  /** Reeds geladen buffer voor hergebruik door de export (audit #15). */
  getLoadedBuffer(sampleId: string): Tone.ToneAudioBuffer | undefined {
    return this.sampleStore.getLoadedBuffer(sampleId);
  }

  clearWaveformCache(sampleId?: string): void {
    this.sampleStore.clearWaveformCache(sampleId);
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
    return buildLimiterProcessorCode() + '\n' + buildCaptureWorkletCode();
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
      // Error-niveau: dit is geen randgeval maar het wegvallen van een
      // garantie (geen bescherming tegen digitaal clippen bij harde mixen).
      // Meest voorkomende oorzaak in productie: een CSP zonder blob: in
      // script-src, waardoor de worklet-module niet mag laden.
      logger.error(
        'Master-limiter-worklet niet beschikbaar — live zonder limiter (export houdt zijn limiter); ' +
          'controleer of de CSP blob: toestaat in script-src',
        err
      );
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
    playbackRate = 1,
  ): { player: Tone.Player; fadeGain: Tone.Gain | null; source: { player: Tone.Player; nodes: Tone.ToneAudioNode[] } } {
    const chain = buildClipChain(volumeDb, effects);
    const { nodes, fadeGain, tailSeconds } = chain;

    // Create player from shared buffer
    const player = createPlanPlayer(buffer, playbackRate);

    // Chain: player → [effects] → volume → trackBus
    const destination = this.trackBuses[trackIndex] || Tone.getDestination();
    player.connect(chain.input);
    chain.output.connect(destination);

    // Track in activeSources for lifecycle management
    const source = { player, nodes };
    this.activeSources.add(source);

    // Auto-dispose when player finishes (fire-and-forget pattern).
    // Galm/echo (V2 Fase 4): de keten blijft tot de staart is uitgeklonken
    // (zoals in de export) en wordt dán opgeruimd. Tot die tijd blijft de
    // bron in activeSources, zodat pause/stop hem alsnog direct opruimt.
    const disposeNodes = () => {
      if (!this.activeSources.has(source)) return; // al opgeruimd (pause/stop)
      this.activeSources.delete(source);
      nodes.forEach((node) => {
        try { node.dispose(); } catch { /* ignore */ }
      });
    };
    player.onstop = () => {
      try { player.dispose(); } catch { /* ignore */ }
      if (tailSeconds > 0) {
        setTimeout(disposeNodes, tailSeconds * 1000 + 100);
      } else {
        disposeNodes();
      }
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

  /**
   * De bronbuffer voor een sample-id: een geladen sample, of een
   * synth-noot (melodie-sequences, V2 Fase 4) die synchroon gerenderd wordt.
   */
  private getSourceBuffer(sampleId: string): Tone.ToneAudioBuffer | AudioBuffer | undefined {
    if (isSynthSampleId(sampleId)) {
      return getSynthBuffer(sampleId, Tone.getContext().sampleRate);
    }
    const buffer = this.buffers.get(sampleId);
    return buffer?.loaded ? buffer : undefined;
  }

  /** Tempo van de huidige schedule (V2 Fase 4) */
  getBpm(): number {
    return this.bpm;
  }

  /**
   * @param bpm tempo van de compositie (90/105/120/135; anders 120). Alle
   *            tel↔seconde-omrekening van de motor volgt vanaf nu dit tempo.
   */
  scheduleTimeline(
    tracks: Track[],
    samples: Sample[],
    sequences: SequencerSequence[] = [],
    bpm: number = DEFAULT_BPM,
  ): void {
    const scheduleStartTime = performance.now();
    const transport = Tone.getTransport();
    transport.cancel(); // Clear previous schedule
    this.bpm = normalizeBpm(bpm);
    transport.bpm.value = this.bpm;

    // Store timeline data for active clip detection during seek
    this.scheduledTracks = tracks;
    this.scheduledSequences = sequences;

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

    // Gedeelde event-generatie (Audio Engine v2): identiek aan wat de export
    // gebruikt — loop-iteraties, per-iteratie-fades, mute, volumes, recepten.
    const generated = generateClipEvents(tracks, samples, {
      bpm: this.bpm,
      // Solo wordt live dynamisch via bus-gains geregeld (setSoloTrack),
      // dus hier NIET in de events bakken.
      hasBuffer: (sampleId) => isSynthSampleId(sampleId) || this.getSourceBuffer(sampleId) !== undefined,
      sequences,
    });
    const { events, totalClipCount, mutedClipCount } = generated;
    this.scheduledEvents = events;
    this.scheduledBakeKeys = events.flatMap((e) => bakeKeysOf(e.sampleId, e.recipe));

    // Bakes klaarzetten (fire-and-forget): de Part-callback lost per event
    // op, dus zodra een bake klaar is gebruiken volgende events hem vanzelf —
    // geen reschedule nodig. Tot dan de terugval (PitchShift/tape-rate, zie
    // PitchBufferService); de export wacht wél op de bakes.
    void pitchBufferService.ensureForEvents(events, (sampleId) => {
      const buf = this.getSourceBuffer(sampleId);
      if (!buf) return undefined;
      return buf instanceof Tone.ToneAudioBuffer ? (buf.get() as AudioBuffer | undefined) : buf;
    });

    // Auto-stop-grens: hoorbaar einde incl. galmstaart (D12 — live laat de
    // reverb nu net als de export uitklinken)
    this.autoStopBeat = Math.max(generated.lastContentBeat, generated.lastAudibleBeat);

    // Create Tone.Part with ON-DEMAND player creation in callback.
    // Each event creates a fresh player → effects → trackBus, plays it,
    // and auto-disposes when done. No upfront chain allocation.
    this.timelinePart = new Tone.Part<ClipEvent>(
      (time, event) => {
        if (event.isMuted) return;

        // Get buffer for this sample (of synth-noot)
        const buffer = this.getSourceBuffer(event.sampleId);
        if (!buffer) return;

        // Gebakken buffer (pitch/speed/reverse/stretch) als die klaar is;
        // anders de terugval — zie PitchBufferService.resolvePlan.
        const plan = pitchBufferService.resolvePlan(
          event.sampleId, event.recipe, event.effects, buffer,
          event.trimStart, event.duration
        );

        // Create on-demand player with effects, routed to track bus
        const { player, fadeGain } = this.createOnDemandPlayer(
          plan.buffer, event.volumeDb, event.trackIndex, plan.effects, plan.playbackRate
        );

        // Schedule fade curves on the fadeGain node (#79) — gedeelde planner
        if (fadeGain) {
          scheduleFadeCurves(fadeGain, time, event.duration, event.fadeIn, event.fadeOut);
        }

        try {
          player.start(time, plan.offset, plan.duration);
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
   * Start all events that are already sounding at the given beat position
   * (seek / resume mid-clip). V2 Fase 4: built from the SAME scheduled events
   * as the Part (loops, sequence steps, recipes, effects), so seek can't
   * diverge from playing from the start.
   *
   * Uses strict < for the event start to avoid double-starting: an event
   * starting exactly at the seek position is handled by Tone.Part.
   */
  private startActiveClips(seekBeat: number): void {
    const seekSeconds = beatsToSeconds(seekBeat, this.bpm);
    const startTime = Tone.now() + 0.05;

    for (const event of this.scheduledEvents) {
      if (event.isMuted) continue;
      if (!(event.time < seekSeconds && seekSeconds < event.time + event.duration)) continue;
      const elapsed = seekSeconds - event.time;
      const remaining = event.duration - elapsed;
      // Only if there's still something to play (minimum 10ms)
      if (remaining <= 0.01) continue;

      const buffer = this.getSourceBuffer(event.sampleId);
      if (!buffer) continue;

      // Zelfde resolutie als de Part (gebakken buffer of terugval)
      const plan = pitchBufferService.resolvePlan(
        event.sampleId, event.recipe, event.effects, buffer,
        event.trimStart + elapsed, remaining
      );

      const { player, fadeGain } = this.createOnDemandPlayer(
        plan.buffer, event.volumeDb, event.trackIndex, plan.effects, plan.playbackRate
      );

      // Fades for the seek position (#79) — gedeelde planner. Elk event is
      // één (loop-)iteratie, dus `elapsed` is de positie binnen die iteratie
      // (UX-FADE-LOOP: fade per iteratie).
      if (fadeGain) {
        scheduleFadeCurvesAtOffset(
          fadeGain, startTime, elapsed, event.duration,
          event.fadeIn, event.fadeOut,
        );
      }

      player.start(startTime, plan.offset, plan.duration);
      logger.audio('startActiveClip (on-demand)', {
        sampleId: event.sampleId,
        seekBeat,
        offset: plan.offset,
        remaining,
      });
    }
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
    const offsetSeconds = beatsToSeconds(fromBeat, this.bpm);

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
    // Meld de rustpositie (V2 Fase 1: tijdens afspelen komen er geen
    // positie-updates meer; bij pauze moet de store weten waar we staan).
    const pausedBeat = this.getCurrentBeat();
    this.beatUpdateCallbacks.forEach((cb) => cb(pausedBeat));
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
      transport.loopStart = beatsToSeconds(region.startBeat, this.bpm);
      transport.loopEnd = beatsToSeconds(region.endBeat, this.bpm);
    } else if (enabled) {
      transport.loopStart = 0;
      transport.loopEnd = beatsToSeconds(totalBeats, this.bpm);
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
  rescheduleWhilePlaying(
    tracks: Track[],
    samples: Sample[],
    looping: boolean,
    totalBeats: number,
    sequences?: SequencerSequence[],
    bpm: number = this.bpm,
  ): void {
    audioDiag.rescheduleTriggered(`live edit at beat ${this.getCurrentBeat().toFixed(2)}`);
    // Positie in TELLEN, gemeten in het oude tempo: na een tempowissel speelt
    // de afspeellijn verder op dezelfde tel (V2 Fase 4)
    const currentBeat = this.getCurrentBeat();
    const transport = Tone.getTransport();

    // 1. Stop all sources + transport so play(currentBeat) re-seeds cleanly
    this.disposeActiveSources();
    this.players.forEach((p) => { try { p.stop(); } catch { /* ignore */ } });
    transport.cancel();
    transport.stop();
    this.stopPlayheadUpdates();

    // 2. Full reschedule (disposes old Part + active sources, builds new Part)
    this.scheduleTimeline(tracks, samples, sequences ?? this.scheduledSequences, bpm);
    this.setLoop(looping, totalBeats, this.loopRegion);

    // 3. Resume playback from the same position
    this.play(currentBeat);
  }

  // ==========================================================================
  // REALTIME-CAPTURE-VANGNET (Audio Engine v2, Fase 4)
  // ==========================================================================


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
    sequences: SequencerSequence[] = [],
    bpm: number = DEFAULT_BPM,
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
      this.scheduleTimeline(tracks, samples, sequences, bpm);
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

    // V2 Fase 1: dit interval stuurt GEEN positie meer naar de UI. De
    // afspeellijn leest de hoorbare positie zelf, per frame, via
    // playbackClock/frameLoop. Het interval bewaakt alleen nog de auto-stop.
    this.playheadIntervalId = window.setInterval(() => {
      const currentBeat = secondsToBeats(transport.seconds, this.bpm);

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
   * Subscribe to POSITION CHANGES: seek, pause en stop (losse gebeurtenissen).
   * Sinds V2 Fase 1 komt hier tijdens afspelen niets meer binnen — de actuele
   * positie lees je per frame via `playbackClock.getBeat()`.
   * Returns unsubscribe function.
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
    return secondsToBeats(Tone.getTransport().seconds, this.bpm);
  }

  /**
   * De positie die je nu HOORT, in tellen (V2 Fase 1).
   *
   * `transport.seconds` loopt vooruit: Tone rekent met `now() = currentTime +
   * lookAhead` (0,1 s), zodat events op tijd ingepland kunnen worden. Daar
   * komt de uitvoervertraging van het apparaat nog bij (bluetooth, HDMI naar
   * een digibord). Voor beeld willen we de positie op het moment dat het
   * geluid de luidspreker verlaat: de transportpositie op
   * `currentTime − outputLatency`.
   *
   * Alleen voor weergave. Engine-logica (seek, auto-stop, reschedule) blijft
   * `getCurrentBeat()` gebruiken.
   */
  getAudibleBeat(): number {
    try {
      const raw = Tone.getContext().rawContext as AudioContext;
      const latency = sanitizeLatency(raw.outputLatency, raw.baseLatency);
      const seconds = Tone.getTransport().getSecondsAtTime(Tone.immediate() - latency);
      return secondsToAudibleBeat(seconds, this.bpm);
    } catch {
      return this.getCurrentBeat();
    }
  }

  /**
   * Seek to a specific beat position.
   * Only works when transport is stopped or paused.
   */
  seek(beat: number): void {
    const transport = Tone.getTransport();
    const seconds = beatsToSeconds(beat, this.bpm);
    transport.seconds = seconds;
    // Notify listeners of new position
    this.beatUpdateCallbacks.forEach((cb) => cb(beat));
  }

  // ==========================================================================
  // AMBIENT AUDIO (gedelegeerd aan AmbientPlayer — V2 Fase 1)
  // ==========================================================================

  loadAmbient(url: string): Promise<boolean> {
    return this.ambient.loadAmbient(url);
  }

  playAmbient(): void {
    this.ambient.playAmbient();
  }

  stopAmbient(fade = true): void {
    this.ambient.stopAmbient(fade);
  }

  setAmbientVolume(db: number): void {
    this.ambient.setAmbientVolume(db);
  }

  isAmbientAudioPlaying(): boolean {
    return this.ambient.isAmbientAudioPlaying();
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
    // Grove opruiming bij een themawissel. Het geheugenbudget (LRU) maakt dit
    // grotendeels overbodig, maar dit blijft: het ruimt meteen en volledig
    // op (incl. golfvormen) op een moment dat er gegarandeerd niets speelt.
    const disposedCount = this.sampleStore.removeUnused(activeSampleIds);
    if (disposedCount > 0) {
      logger.info(`Disposed ${disposedCount} unused audio buffers`);
    }
    // Pitch-bakes van verdwenen samples ook opruimen (Fase 3)
    pitchBufferService.prune(activeSampleIds);
  }

  // ==========================================================================
  // GEHEUGENBUDGET (V2 Fase 3 — docs/v2/AUDIO-MEMORY.md)
  // ==========================================================================

  /**
   * DE bron van waarheid voor "in gebruik": het budget ruimt nooit iets op
   * dat hier in zit. Zie audioPins.ts voor de regels (a)–(f).
   */
  collectPins(): PinSet {
    const pins = createPinSet();
    addSessionPins(pins); // (a) tijdlijn + sequences, (b) bibliotheek + recorder
    addTimelinePins(pins, this.scheduledTracks, this.scheduledSequences); // (c), (d)
    // Gebakken buffers van de huidige schedule (incl. uitgepakte sequence-
    // stappen en tempo-stretch — V2 Fase 4)
    this.scheduledBakeKeys.forEach((key) => pins.pitchKeys.add(key));
    addSampleIdPins(pins, [this.previewSampleId]); // (e)
    this.previewBakeKeys.forEach((key) => pins.pitchKeys.add(key));
    addSampleIdPins(pins, this.sampleStore.getRecentRequestIds()); // (f)
    return pins;
  }

  /** Gedecodeerd geheugen: totaal, per categorie, aantal, budget. */
  getMemoryStats(): AudioMemoryStats {
    return decodedAudioBudget.getStats();
  }

  /** Budget overschrijven in bytes (tests/afstemmen); `null` = automatisch. */
  setMemoryBudget(bytes: number | null): void {
    decodedAudioBudget.setBudgetBytes(bytes);
    decodedAudioBudget.enforce();
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
    this.scheduledEvents = [];
    this.scheduledBakeKeys = [];

    // Dispose track buses
    this.disposeTrackBuses();

    // Dispose audio buffers, preview players en golfvormen (+ budget afboeken)
    this.sampleStore.clear();
    this.previewSampleId = null;
    this.previewBakeKeys = [];

    // Dispose ambient audio
    this.ambient.dispose();

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

// Dev-only: geheugen uitlezen/afstemmen vanuit de console of een e2e-test
if (import.meta.env.DEV && typeof window !== 'undefined') {
  const w = window as unknown as {
    __soundscoutAudioStats?: () => AudioMemoryStats;
    __soundscoutAudioBudget?: (mb: number | null) => AudioMemoryStats;
  };
  w.__soundscoutAudioStats = () => AudioService.getInstance().getMemoryStats();
  w.__soundscoutAudioBudget = (mb) => {
    AudioService.getInstance().setMemoryBudget(mb === null ? null : mb * 1024 * 1024);
    return AudioService.getInstance().getMemoryStats();
  };
}
