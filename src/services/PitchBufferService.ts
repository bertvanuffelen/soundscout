/**
 * PitchBufferService — pitch als vooraf gebakken buffer (Audio Engine v2, Fase 3).
 *
 * Vervangt Tone.PitchShift (granulaire delay-lijn-shifter; de bewezen bron
 * van de export-korrelkliks, zie docs/audio/ONDERZOEK-EXPORT-EFFECTGLITCH.md
 * §15) door Signalsmith Stretch (WASM, MIT): de volledige sample wordt één
 * keer per (sample, semitonen) duurbehoudend gepitcht in een eigen
 * OfflineAudioContext en gecachet. Daarna spelen live, preview én export een
 * gewone buffer af — geen pitch-DSP meer in de graph, dus:
 *
 * - identieke klank in live en export (en veel hoger van kwaliteit)
 * - geen live-CPU-limiet meer ("max 2-3 pitch-clips tegelijk" vervalt)
 * - snellere offline render (PitchShift was de dure node)
 *
 * Spike-metingen (24-7): bake ~50-80 ms per 3 s sample, onset-afwijking
 * ≤ 1.3 ms (latency wordt door de node zelf gecompenseerd), duur behouden,
 * toonhoogte exact, nul kliks.
 *
 * Valt terug op de oude Tone.PitchShift-keten wanneer de worklet niet
 * beschikbaar is (oude browsers) of een bake mislukt — resolveForPlayback
 * geeft dan gewoon de originele buffer + effects terug.
 */

import * as Tone from 'tone';
import type { Track } from '../types';
import type { ClipEffectsConfig } from './audioEvents';
import { logger } from '../utils/logger';

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

export class PitchBufferService {
  private static instance: PitchBufferService | null = null;

  private cache = new Map<string, AudioBuffer>();
  private pending = new Map<string, Promise<AudioBuffer | null>>();
  private factoryPromise: Promise<StretchFactory | null> | null = null;
  /** false zodra de omgeving bewezen niet ondersteunt (→ PitchShift-fallback) */
  private supported = true;

  static getInstance(): PitchBufferService {
    if (!PitchBufferService.instance) {
      PitchBufferService.instance = new PitchBufferService();
    }
    return PitchBufferService.instance;
  }

  private key(sampleId: string, semitones: number): string {
    return `${sampleId}|${semitones}`;
  }

  private loadFactory(): Promise<StretchFactory | null> {
    if (!this.factoryPromise) {
      this.factoryPromise = import('signalsmith-stretch')
        .then((mod) => (mod.default ?? mod) as unknown as StretchFactory)
        .catch((err) => {
          logger.warn('signalsmith-stretch kon niet laden — PitchShift-fallback actief', err);
          this.supported = false;
          return null;
        });
    }
    return this.factoryPromise;
  }

  /** Gebakken buffer, of undefined als (nog) niet beschikbaar */
  getBaked(sampleId: string, semitones: number): AudioBuffer | undefined {
    return this.cache.get(this.key(sampleId, semitones));
  }

  /**
   * Bak een gepitchte versie van een sample (dedupliceert parallelle
   * aanvragen). Geeft null terug bij niet-ondersteunde omgeving of fout —
   * de aanroeper valt dan terug op de PitchShift-keten.
   */
  bake(sampleId: string, semitones: number, source: AudioBuffer): Promise<AudioBuffer | null> {
    if (!this.supported || semitones === 0) return Promise.resolve(null);
    const key = this.key(sampleId, semitones);
    const cached = this.cache.get(key);
    if (cached) return Promise.resolve(cached);
    const inFlight = this.pending.get(key);
    if (inFlight) return inFlight;

    const job = this.renderPitched(source, semitones)
      .then((rendered) => {
        this.cache.set(key, rendered);
        logger.audio('pitch gebakken', { sampleId, semitones, ms: rendered.duration });
        return rendered;
      })
      .catch((err) => {
        // Structureel (geen worklet) of incidenteel — in beide gevallen is de
        // PitchShift-fallback het juiste antwoord; bij ontbrekende
        // AudioWorklet-steun schakelen we definitief uit.
        if (typeof AudioWorkletNode === 'undefined') this.supported = false;
        logger.warn('Pitch-bake mislukt — PitchShift-fallback voor deze clip', {
          sampleId, semitones, err,
        });
        return null;
      })
      .finally(() => {
        this.pending.delete(key);
      });
    this.pending.set(key, job);
    return job;
  }

  /** De daadwerkelijke offline render door Signalsmith Stretch */
  private async renderPitched(source: AudioBuffer, semitones: number): Promise<AudioBuffer> {
    const factory = await this.loadFactory();
    if (!factory) throw new Error('signalsmith-stretch niet beschikbaar');

    const channels = Math.max(1, Math.min(2, source.numberOfChannels));
    const ctx = new OfflineAudioContext(channels, source.length, source.sampleRate);
    const node = await factory(ctx, {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [channels],
    });
    const channelData: Float32Array[] = [];
    for (let c = 0; c < channels; c++) {
      channelData.push(source.getChannelData(c));
    }
    await node.addBuffers(channelData);
    node.connect(ctx.destination);
    // Duurbehoudend (rate 1) — de node compenseert zijn eigen latency
    await node.schedule({ output: 0, input: 0, rate: 1, semitones, active: true });
    return ctx.startRendering();
  }

  /**
   * Bak alle (sample, pitch)-combinaties die op de tijdlijn voorkomen.
   * Aanroepen vóór een export (await!) en fire-and-forget bij schedule/edit.
   */
  async ensureForTracks(
    tracks: Track[],
    getSource: (sampleId: string) => AudioBuffer | undefined
  ): Promise<void> {
    if (!this.supported) return;
    const jobs: Promise<AudioBuffer | null>[] = [];
    const seen = new Set<string>();
    tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        const semitones = clip.effects?.pitch ?? 0;
        if (semitones === 0) return;
        const key = this.key(clip.sampleId, semitones);
        if (seen.has(key) || this.cache.has(key)) return;
        seen.add(key);
        const source = getSource(clip.sampleId);
        if (!source) return;
        jobs.push(this.bake(clip.sampleId, semitones, source));
      });
    });
    if (jobs.length > 0) await Promise.all(jobs);
  }

  /**
   * Los een event op voor afspelen/renderen: is er een gebakken buffer, dan
   * die buffer + effects zónder pitch (geen PitchShift-node meer); anders
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
    const residual =
      effects.reverb > 0 || effects.fadeIn > 0 || effects.fadeOut > 0
        ? { ...effects, pitch: 0 }
        : undefined;
    return { buffer: baked, effects: residual };
  }

  /** Ruim bakken op van samples die niet meer in gebruik zijn (themawissel) */
  prune(keepSampleIds: Set<string>): void {
    for (const key of this.cache.keys()) {
      const sampleId = key.slice(0, key.lastIndexOf('|'));
      if (!keepSampleIds.has(sampleId)) this.cache.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
    this.pending.clear();
  }
}

export const pitchBufferService = PitchBufferService.getInstance();
