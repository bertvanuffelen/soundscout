/**
 * PitchBufferService — de bake-service: elk vervormd geluid als vooraf
 * gebakken buffer (Audio Engine v2 Fase 3, uitgebreid in V2 Fase 4).
 *
 * Oorspronkelijk alleen pitch: Tone.PitchShift (granulaire delay-lijn) was
 * de bewezen bron van de export-korrelkliks (docs/audio/
 * ONDERZOEK-EXPORT-EFFECTGLITCH.md §15), dus pitch wordt één keer per
 * (sample, semitonen) duurbehoudend gerenderd met Signalsmith Stretch (WASM)
 * en daarna als gewone buffer afgespeeld — live, preview én export.
 *
 * Sinds V2 Fase 4 bakt dezelfde service een RECEPT (bakeRecipe.ts):
 *
 *   bron ─► [reverse] ─► [speed] ─────────────► [pitch + stretch] ─► buffer
 *           synchroon, puur JS (altijd exact)     async, Signalsmith
 *
 * - Cache per sample + genormaliseerde receptsleutel; parallelle aanvragen
 *   worden ontdubbeld; alles telt mee in het geheugenbudget (categorie
 *   'pitch' = "gebakken buffers") en is vast te pinnen via collectPins.
 * - Een recept met alléén pitch heeft exact de oude sleutel en rendert exact
 *   zoals vóór Fase 4 (de vier oorspronkelijke gouden renders blijven gelijk).
 * - Exports awaiten alle bakes (ensureForEvents); live bakt fire-and-forget
 *   bij het inplannen en pakt een bake per event op zodra hij klaar is.
 *
 * Terugval (worklet niet beschikbaar, of de bake is live nog niet klaar):
 * - reverse + speed: géén terugval nodig — puur JS, synchroon, altijd exact.
 * - pitch:   Tone.PitchShift in de keten (het oude gedrag; kwaliteit lager).
 * - stretch: tape-stijl `playbackRate = 1/stretch` op de player. De loop
 *            blijft dan exact op het tellenraster, maar de toonhoogte
 *            verschuift mee (−5 st @ 90, −2,3 st @ 105, +2 st @ 135 BPM)
 *            tot de echte bake klaar is. Liever op de maat dan uit de maat.
 */

import * as Tone from 'tone';
import type { Track } from '../types';
import type { ClipEffectsConfig } from './audioEvents';
import { logger } from '../utils/logger';
import {
  decodedAudioBudget,
  decodedBytes,
  type DecodedAudioBudget,
} from './audio/memoryBudget';
import {
  applySyncStage,
  hasAsyncStage,
  hasSyncStage,
  isNeutralRecipe,
  normalizeRecipe,
  recipeKey,
  syncStageOf,
  type BakeRecipe,
} from './bakeRecipe';
import { getClipSpeed } from '../utils/audio';

/** Signalsmith Stretch node-factory (lazy geladen, ~110 KB incl. WASM) */
type StretchNode = AudioWorkletNode & {
  addBuffers: (buffers: Float32Array[]) => Promise<number>;
  schedule: (change: Record<string, number | boolean>) => Promise<unknown>;
  stop: (when?: number) => Promise<unknown>;
};
type StretchFactory = (
  context: BaseAudioContext,
  options?: AudioWorkletNodeOptions
) => Promise<StretchNode>;

/**
 * Harde bovengrens per bake. Een bake duurt ~50-80 ms per 3 s sample, dus dit
 * is ruim — het is geen prestatiegrens maar een deadlock-vangnet.
 *
 * Aanleiding (13-8-2026): toen de CSP WebAssembly weigerde, riep Emscripten
 * intern `abort()` aan en settelde de promise waar wij op wachtten NOOIT.
 * `ensurePitchBuffers` wacht op alle bakes, dus de MP3-export bleef eeuwig op
 * 30% hangen — geen foutmelding, geen afbreekknop. Een derde partij die niet
 * antwoordt mag de export nooit kunnen blokkeren.
 */
const BAKE_TIMEOUT_MS = 15_000;

/** Verliest de race als `promise` niet binnen `ms` settelt. */
function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => Error): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(onTimeout()), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

/**
 * De pitch-worklet kon niet registreren. Dat is een eigenschap van de
 * omgeving (ontbrekende AudioWorklet-steun, of een CSP die `blob:` in
 * script-src verbiedt), niet van deze ene clip — dus latchen we de service
 * uit in plaats van hem per clip opnieuw te laten falen.
 */
class PitchEngineUnavailableError extends Error {
  constructor(cause: unknown) {
    super('pitch-worklet kon niet registreren');
    this.name = 'PitchEngineUnavailableError';
    this.cause = cause;
  }
}

/** Hoe een event daadwerkelijk wordt afgespeeld (uitkomst van resolvePlan) */
export interface PlaybackPlan {
  buffer: Tone.ToneAudioBuffer | AudioBuffer;
  /** Keten-effecten die nog in de graph moeten (pitch alleen als terugval) */
  effects: ClipEffectsConfig | undefined;
  /** Offset in `buffer` (buffer-seconden) */
  offset: number;
  /** Speelduur in buffer-seconden (Tone.Player deelt zelf door playbackRate) */
  duration: number;
  /** 1 behalve bij de tape-terugval voor stretch */
  playbackRate: number;
}

/** Wat elke bron-buffer-vorm oplevert als ruwe AudioBuffer */
function rawBuffer(buffer: Tone.ToneAudioBuffer | AudioBuffer): AudioBuffer | undefined {
  if (buffer instanceof Tone.ToneAudioBuffer) {
    return buffer.loaded ? (buffer.get() as AudioBuffer | undefined) : undefined;
  }
  return buffer;
}

/** Effecten zonder pitch; undefined als er dan niets meer over is */
function withoutPitch(effects: ClipEffectsConfig | undefined): ClipEffectsConfig | undefined {
  if (!effects) return undefined;
  const residual = { ...effects, pitch: 0 };
  const hasGraphWork =
    residual.reverb > 0 ||
    residual.fadeIn > 0 ||
    residual.fadeOut > 0 ||
    (residual.echo ?? 0) > 0 ||
    (residual.filter ?? 0) !== 0;
  return hasGraphWork ? residual : undefined;
}

export class PitchBufferService {
  private static instance: PitchBufferService | null = null;

  private cache = new Map<string, AudioBuffer>();
  /** sleutel → sample-id (voor prune; sleutels bevatten meerdere '|') */
  private keySample = new Map<string, string>();
  private pending = new Map<string, Promise<AudioBuffer | null>>();
  private factoryPromise: Promise<StretchFactory | null> | null = null;
  /** false zodra de omgeving bewezen niet ondersteunt (→ terugval) */
  private supported = true;

  /**
   * Gebakken buffers tellen mee in het geheugenbudget (V2 Fase 3). Het budget
   * mag een bake opruimen als die nergens meer gebruikt wordt; een volgend
   * gebruik bakt hem gewoon opnieuw.
   */
  private readonly budget: DecodedAudioBudget;

  constructor(budget: DecodedAudioBudget = decodedAudioBudget) {
    this.budget = budget;
  }

  static getInstance(): PitchBufferService {
    if (!PitchBufferService.instance) {
      PitchBufferService.instance = new PitchBufferService();
    }
    return PitchBufferService.instance;
  }

  /** Is de Signalsmith-stap (pitch/stretch) in deze omgeving beschikbaar? */
  get isAsyncStageSupported(): boolean {
    return this.supported;
  }

  /** Bake opslaan + boeken in het budget, daarna het budget bewaken */
  private store(key: string, sampleId: string, rendered: AudioBuffer): void {
    this.cache.set(key, rendered);
    this.keySample.set(key, sampleId);
    this.budget.register(key, {
      category: 'pitch',
      sampleId,
      pitchKey: key,
      bytes: decodedBytes(rendered),
      evict: () => { this.cache.delete(key); this.keySample.delete(key); },
    });
    this.budget.enforce({ category: 'pitch', id: key });
  }

  private forget(key: string): void {
    this.cache.delete(key);
    this.keySample.delete(key);
    this.budget.unregister('pitch', key);
  }

  private lookup(key: string): AudioBuffer | undefined {
    const baked = this.cache.get(key);
    if (baked) this.budget.touch('pitch', key);
    return baked;
  }

  private loadFactory(): Promise<StretchFactory | null> {
    if (!this.factoryPromise) {
      this.factoryPromise = import('signalsmith-stretch')
        .then((mod) => (mod.default ?? mod) as unknown as StretchFactory)
        .catch((err) => {
          // Structureel: zonder de bibliotheek is er geen pitch-bake mogelijk.
          // Error-niveau, want dit betekent dat de export op de PitchShift-
          // keten rendert — precies wat Audio Engine v2 moest uitbannen.
          logger.error('signalsmith-stretch kon niet laden — PitchShift-fallback actief (exportkwaliteit gedegradeerd)', err);
          this.supported = false;
          return null;
        });
    }
    return this.factoryPromise;
  }

  // --- Oude pitch-API (blijft werken voor bestaande aanroepers) ---

  /** Gebakken pitch-buffer, of undefined als (nog) niet beschikbaar */
  getBaked(sampleId: string, semitones: number): AudioBuffer | undefined {
    return this.getBakedRecipe(sampleId, { pitch: semitones });
  }

  /**
   * Bak een gepitchte versie van een sample (dedupliceert parallelle
   * aanvragen). Geeft null terug bij niet-ondersteunde omgeving of fout —
   * de aanroeper valt dan terug op de PitchShift-keten.
   */
  bake(sampleId: string, semitones: number, source: AudioBuffer): Promise<AudioBuffer | null> {
    if (semitones === 0) return Promise.resolve(null);
    return this.bakeRecipe(sampleId, { pitch: semitones }, source);
  }

  // --- Recept-API (V2 Fase 4) ---

  /** De volledig gebakken buffer voor een recept, of undefined */
  getBakedRecipe(sampleId: string, recipe: Partial<BakeRecipe>): AudioBuffer | undefined {
    const normalized = normalizeRecipe(recipe);
    if (isNeutralRecipe(normalized)) return undefined;
    return this.lookup(recipeKey(sampleId, normalized));
  }

  /**
   * De synchrone stap (reverse/speed) direct berekenen en cachen. Synchroon,
   * dus ook bruikbaar in de Part-callback. Undefined als het recept geen
   * synchrone stap heeft of de omgeving geen AudioBuffer kent (Node/jsdom).
   */
  getSyncStage(sampleId: string, recipe: BakeRecipe, source: AudioBuffer): AudioBuffer | undefined {
    if (!hasSyncStage(recipe) || typeof AudioBuffer === 'undefined') return undefined;
    const stageRecipe = syncStageOf(recipe);
    const key = recipeKey(sampleId, stageRecipe);
    const cached = this.lookup(key);
    if (cached) return cached;
    const channels: Float32Array[] = [];
    for (let c = 0; c < source.numberOfChannels; c++) channels.push(source.getChannelData(c));
    const processed = applySyncStage(channels, stageRecipe);
    const out = new AudioBuffer({
      numberOfChannels: processed.length,
      length: processed[0]?.length ?? 1,
      sampleRate: source.sampleRate,
    });
    processed.forEach((data, c) => out.copyToChannel(data as Float32Array<ArrayBuffer>, c));
    this.store(key, sampleId, out);
    return out;
  }

  /**
   * Bak een recept (dedupliceert parallelle aanvragen). Resolvet met de
   * gebakken buffer, of null als het recept neutraal is of de async stap
   * niet beschikbaar is (de aanroeper valt dan terug — zie de kop).
   */
  bakeRecipe(sampleId: string, recipe: Partial<BakeRecipe>, source: AudioBuffer): Promise<AudioBuffer | null> {
    const normalized = normalizeRecipe(recipe);
    if (isNeutralRecipe(normalized)) return Promise.resolve(null);
    const key = recipeKey(sampleId, normalized);
    const cached = this.lookup(key);
    if (cached) return Promise.resolve(cached);

    // Alleen reverse/speed: synchroon klaar
    if (!hasAsyncStage(normalized)) {
      return Promise.resolve(this.getSyncStage(sampleId, normalized, source) ?? null);
    }
    if (!this.supported) return Promise.resolve(null);

    const inFlight = this.pending.get(key);
    if (inFlight) return inFlight;

    const stageInput = hasSyncStage(normalized)
      ? this.getSyncStage(sampleId, normalized, source) ?? source
      : source;

    // Timeout treedt op als structurele fout naar buiten: dan latcht de
    // service uit en slaan de resterende clips direct over, in plaats van
    // elk hun eigen 15 seconden te verspillen.
    const job = withTimeout(
      this.renderPitched(stageInput, normalized.pitch, normalized.stretch),
      BAKE_TIMEOUT_MS,
      () => new PitchEngineUnavailableError(
        new Error(`pitch-bake gaf geen antwoord binnen ${BAKE_TIMEOUT_MS} ms`)
      )
    )
      .then((rendered) => {
        this.store(key, sampleId, rendered);
        logger.audio('buffer gebakken', { sampleId, recipe: normalized, s: rendered.duration });
        return rendered;
      })
      .catch((err) => {
        // Structureel vs. incidenteel. LET OP: `typeof AudioWorkletNode` is
        // géén betrouwbare test — bij een CSP die blob: in script-src
        // verbiedt bestaat AudioWorkletNode gewoon, alleen het láden van de
        // module wordt geblokkeerd. Daarom latchen we op het fouttype.
        const structural =
          err instanceof PitchEngineUnavailableError ||
          typeof AudioWorkletNode === 'undefined';
        if (structural) {
          this.supported = false;
          logger.error(
            'Pitch-bake niet beschikbaar in deze omgeving — PitchShift-fallback voor de hele sessie ' +
              '(exportkwaliteit gedegradeerd; controleer of de CSP blob: toestaat in script-src)',
            { sampleId, recipe: normalized, err }
          );
        } else {
          logger.warn('Pitch-bake mislukt — fallback voor deze clip', {
            sampleId, recipe: normalized, err,
          });
        }
        return null;
      })
      .finally(() => {
        this.pending.delete(key);
      });
    this.pending.set(key, job);
    return job;
  }

  /**
   * De daadwerkelijke offline render door Signalsmith Stretch: `semitones`
   * duurbehoudend, en optioneel `stretch` als lengte-factor (rate = 1/stretch).
   * Met stretch 1 exact de render van vóór V2 Fase 4.
   */
  private async renderPitched(source: AudioBuffer, semitones: number, stretch = 1): Promise<AudioBuffer> {
    const factory = await this.loadFactory();
    if (!factory) throw new Error('signalsmith-stretch niet beschikbaar');

    const channels = Math.max(1, Math.min(2, source.numberOfChannels));
    const length = stretch === 1 ? source.length : Math.max(1, Math.round(source.length * stretch));
    const ctx = new OfflineAudioContext(channels, length, source.sampleRate);
    // Node-creatie apart: faalt dit, dan kan de worklet in GEEN enkele
    // context registreren (omgeving/CSP) — zie PitchEngineUnavailableError.
    // Faalt een latere stap, dan ligt het aan deze specifieke clip.
    let node: StretchNode;
    try {
      node = await factory(ctx, {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [channels],
      });
    } catch (err) {
      throw new PitchEngineUnavailableError(err);
    }
    const channelData: Float32Array[] = [];
    for (let c = 0; c < channels; c++) {
      channelData.push(source.getChannelData(c));
    }
    await node.addBuffers(channelData);
    node.connect(ctx.destination);
    // rate 1 = duurbehoudend; rate 1/stretch = uitrekken zonder toonhoogte.
    // De node compenseert zijn eigen latency.
    await node.schedule({ output: 0, input: 0, rate: 1 / stretch, semitones, active: true });
    return ctx.startRendering();
  }

  // --- Voorbereiden (export: await; live: fire-and-forget) ---

  /**
   * Bak alle recepten van een lijst events (clips én uitgepakte sequence-
   * stappen). Synchrone stappen worden direct berekend, async stappen
   * parallel gebakken. Exports awaiten dit; de live motor niet.
   */
  async ensureForEvents(
    events: ReadonlyArray<{ sampleId: string; recipe?: BakeRecipe }>,
    getSource: (sampleId: string) => AudioBuffer | undefined
  ): Promise<void> {
    const jobs: Promise<AudioBuffer | null>[] = [];
    const seen = new Set<string>();
    for (const event of events) {
      if (!event.recipe || isNeutralRecipe(event.recipe)) continue;
      const key = recipeKey(event.sampleId, event.recipe);
      if (seen.has(key) || this.cache.has(key)) continue;
      seen.add(key);
      const source = getSource(event.sampleId);
      if (!source) continue;
      jobs.push(this.bakeRecipe(event.sampleId, event.recipe, source));
    }
    if (jobs.length > 0) await Promise.all(jobs);
  }

  /**
   * Oude ingang: bak de (pitch/speed/reverse)-recepten van tijdlijnclips.
   * Kent geen tempo (stretch = 1) — gebruik voor exports ensureForEvents
   * (via audioExport.ensureBakedBuffers), dat ook loops uitrekt.
   */
  async ensureForTracks(
    tracks: Track[],
    getSource: (sampleId: string) => AudioBuffer | undefined
  ): Promise<void> {
    const events: Array<{ sampleId: string; recipe?: BakeRecipe }> = [];
    tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        events.push({
          sampleId: clip.sampleId,
          recipe: normalizeRecipe({
            pitch: clip.effects?.pitch ?? 0,
            speed: getClipSpeed(clip),
            reverse: clip.effects?.reverse === true,
          }),
        });
      });
    });
    await this.ensureForEvents(events, getSource);
  }

  // --- Afspelen ---

  /**
   * Los een event op voor afspelen/renderen. Volgorde:
   * 1. volledig gebakken buffer → die, zonder pitch in de keten;
   * 2. alleen een synchrone stap nodig → die direct berekenen;
   * 3. anders terugval: synchrone stap (indien nodig) + PitchShift voor
   *    pitch + tape-playbackRate voor stretch (zie de kop).
   *
   * `offset`/`duration` zijn in seconden van de volledig gebakken buffer
   * (= zoals ClipEvent ze levert); het plan vertaalt ze naar de buffer die
   * daadwerkelijk speelt.
   */
  resolvePlan(
    sampleId: string,
    recipe: BakeRecipe | undefined,
    effects: ClipEffectsConfig | undefined,
    fallbackBuffer: Tone.ToneAudioBuffer | AudioBuffer,
    offset: number,
    duration: number
  ): PlaybackPlan {
    const r = normalizeRecipe(recipe ?? { pitch: effects?.pitch ?? 0 });
    if (isNeutralRecipe(r)) {
      return { buffer: fallbackBuffer, effects, offset, duration, playbackRate: 1 };
    }
    const baked = this.lookup(recipeKey(sampleId, r));
    if (baked) {
      return { buffer: baked, effects: withoutPitch(effects), offset, duration, playbackRate: 1 };
    }
    const source = rawBuffer(fallbackBuffer);
    const stage = source ? this.getSyncStage(sampleId, r, source) : undefined;
    if (!hasAsyncStage(r) && stage) {
      return { buffer: stage, effects: withoutPitch(effects), offset, duration, playbackRate: 1 };
    }
    // Terugval: pitch via PitchShift (effects.pitch blijft staan), stretch
    // via tape-playbackRate zodat de timing op het raster blijft.
    const playbackRate = r.stretch !== 1 ? 1 / r.stretch : 1;
    const fallbackEffects =
      r.pitch !== 0
        ? { ...(effects ?? { reverb: 0, fadeIn: 0, fadeOut: 0, pitch: 0 }), pitch: r.pitch }
        : effects;
    return {
      buffer: stage ?? fallbackBuffer,
      effects: fallbackEffects,
      offset: offset * playbackRate,
      duration: duration * playbackRate,
      playbackRate,
    };
  }

  /**
   * Oude ingang (pitch-only): gebakken buffer + effects zónder pitch, of
   * ongewijzigd (PitchShift-fallback in de keten).
   */
  resolveForPlayback(
    sampleId: string,
    effects: ClipEffectsConfig | undefined,
    fallbackBuffer: Tone.ToneAudioBuffer | AudioBuffer
  ): { buffer: Tone.ToneAudioBuffer | AudioBuffer; effects: ClipEffectsConfig | undefined } {
    const semitones = effects?.pitch ?? 0;
    if (semitones === 0 || !effects) return { buffer: fallbackBuffer, effects };
    const baked = this.getBaked(sampleId, semitones);
    if (!baked) return { buffer: fallbackBuffer, effects };
    return { buffer: baked, effects: withoutPitch(effects) };
  }

  /** Ruim bakken op van samples die niet meer in gebruik zijn (themawissel) */
  prune(keepSampleIds: Set<string>): void {
    for (const [key, sampleId] of [...this.keySample.entries()]) {
      if (!keepSampleIds.has(sampleId)) this.forget(key);
    }
  }

  clear(): void {
    for (const key of [...this.cache.keys()]) this.forget(key);
    this.pending.clear();
  }

  /** Aantal gebakken buffers in de cache (tests, statistiek) */
  get size(): number {
    return this.cache.size;
  }
}

export const pitchBufferService = PitchBufferService.getInstance();
/** Nieuwe naam voor dezelfde service (V2 Fase 4) */
export const bakeService = pitchBufferService;
export type BakeService = PitchBufferService;
