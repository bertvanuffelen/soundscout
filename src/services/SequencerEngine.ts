/**
 * SequencerEngine — de audio-motor van het Sequencer Lab.
 *
 * Volledig los van AudioService en Tone.Transport (die wordt door de
 * bestaande engine vanaf 5 plekken gecanceld en staat vast op 120 BPM).
 * In plaats daarvan: een eigen Tone.Clock (webworker-ticker, immuun voor
 * tab-throttling) die per tel een precies AudioContext-`time`-argument
 * levert — het lookahead-schedulingpatroon ("Tale of Two Clocks").
 *
 * Audiokwaliteit:
 * - fire-and-forget players per stap (PERF-1: klein permanent node-budget);
 * - micro-fade-in op getrimde starts en micro-fade-out bij choke (klikvrij);
 * - keten per spoor: Gain → master-Gain (headroom −3 dB) → Limiter(−1 dB)
 *   → Destination — zelfde filosofie als de v2 master-limiter.
 *
 * De hoorbare logica (welke events, trim, choke, gains) komt uitsluitend
 * uit sequencerEvents.ts (puur) — dit bestand speelt die events alleen af.
 */

import * as Tone from 'tone';
import type { Sample } from '../types';
import {
  SEQ_CHOKE_FADE_SECONDS,
  SEQ_DEFAULT_BPM,
} from '../types/sequencer';
import { useSequencerStore } from '../stores/sequencerStore';
import { eventsAtStep, generatePatternEvents } from './sequencerEvents';
import { logger } from '../utils/logger';

/** Headroom op de master vóór de limiter (~−3 dB) */
const MASTER_HEADROOM_GAIN = 0.7;
/** Brickwall-plafond in dBFS (zelfde filosofie als de v2 master-limiter) */
const LIMITER_THRESHOLD_DB = -1;

export class SequencerEngine {
  private clock: Tone.Clock | null = null;
  private stepIndex = 0;
  /** Laatst geplande stap — voor de UI-playhead */
  private currentStep = 0;
  private _isPlaying = false;

  private master: Tone.Gain | null = null;
  private limiter: Tone.Limiter | null = null;
  private trackGains = new Map<string, Tone.Gain>();

  private buffers = new Map<string, Tone.ToneAudioBuffer>();
  private bufferPromises = new Map<string, Promise<void>>();

  /** Alle nu klinkende players (ring + cut) — voor stop() en dispose() */
  private activePlayers = new Set<Tone.Player>();
  /** Laatst gestarte player per spoor — voor choke ('cut') */
  private lastPlayer = new Map<string, Tone.Player>();

  private previewPlayer: Tone.Player | null = null;

  /** Beschikbare samples (gezet door de pagina; testbaar zonder themeStore) */
  private samples: Sample[] = [];

  // --- Setup ---

  setSamples(samples: Sample[]): void {
    this.samples = samples;
  }

  /** Laad de buffer van een sample (idempotent; fouten → warn + stil spoor) */
  ensureBuffer(sample: Sample): Promise<void> {
    if (this.buffers.get(sample.id)?.loaded) return Promise.resolve();
    const existing = this.bufferPromises.get(sample.id);
    if (existing) return existing;

    const buffer = new Tone.ToneAudioBuffer();
    const promise = buffer
      .load(sample.audioUrl)
      .then(() => {
        this.buffers.set(sample.id, buffer);
      })
      .catch((err: unknown) => {
        // Graceful degradation: spoor blijft stil, UI blijft bruikbaar
        logger.warn(`[SequencerEngine] Buffer laden mislukt: ${sample.id}`, err);
      })
      .finally(() => {
        this.bufferPromises.delete(sample.id);
      });
    this.bufferPromises.set(sample.id, promise);
    return promise;
  }

  hasBuffer = (sampleId: string): boolean => {
    return this.buffers.get(sampleId)?.loaded === true;
  };

  /** Ruwe AudioBuffer voor de trim-golfvorm (null als nog niet geladen) */
  getAudioBuffer(sampleId: string): AudioBuffer | null {
    const buffer = this.buffers.get(sampleId);
    if (!buffer?.loaded) return null;
    return buffer.get() ?? null;
  }

  // --- Keten ---

  private ensureGraph(): void {
    if (this.master && this.limiter) return;
    this.limiter = new Tone.Limiter(LIMITER_THRESHOLD_DB).toDestination();
    this.master = new Tone.Gain(MASTER_HEADROOM_GAIN);
    this.master.connect(this.limiter);
  }

  private getTrackGain(trackId: string): Tone.Gain {
    let gain = this.trackGains.get(trackId);
    if (!gain) {
      this.ensureGraph();
      gain = new Tone.Gain(1);
      gain.connect(this.master as Tone.Gain);
      this.trackGains.set(trackId, gain);
    }
    return gain;
  }

  /** Directe volumewijziging (raakt ook al klinkende staarten van dit spoor) */
  setTrackVolume(trackId: string, volume: number): void {
    const gain = this.trackGains.get(trackId);
    if (gain) gain.gain.value = Math.min(1, Math.max(0, volume));
  }

  // --- Transport ---

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  async start(): Promise<void> {
    if (this._isPlaying) return;
    // Zelfde unlock-patroon als AudioService.unlockAudioContext()
    if (Tone.getContext().state !== 'running') {
      await Tone.start();
    }
    this.ensureGraph();

    const bpm =
      useSequencerStore.getState().activeSequence()?.bpm ?? SEQ_DEFAULT_BPM;
    this.stepIndex = 0;
    this.currentStep = 0;
    // 1 tick = 1 tel: frequentie = bpm/60 Hz (2 Hz bij 120 BPM).
    // Latere BPM-slider: this.clock.frequency.value = bpm / 60.
    this.clock = new Tone.Clock(this.tick, bpm / 60);
    this.clock.start();
    this._isPlaying = true;
  }

  stop(): void {
    if (this.clock) {
      this.clock.stop();
      this.clock.dispose();
      this.clock = null;
    }
    // Alle klinkende players expliciet stoppen (fadeOut maakt het klikvrij);
    // hun onstop-callback ruimt zichzelf op.
    for (const player of this.activePlayers) {
      try {
        player.stop();
      } catch {
        // al gestopt/disposed — negeren
      }
    }
    this.stopPreview();
    this.stepIndex = 0;
    this.currentStep = 0;
    this._isPlaying = false;
  }

  // --- De tick (hart van de engine) ---
  // KRITIEK: altijd het `time`-argument gebruiken, nooit Tone.now()
  // (kennisbank §7) — dan zijn alle starts sample-accuraat.

  private tick = (time: number): void => {
    const sequence = useSequencerStore.getState().activeSequence();
    if (!sequence) return;

    // Verse lengte per tick: verkorten tijdens afspelen vouwt netjes terug
    const step = this.stepIndex % sequence.lengthSteps;
    this.currentStep = step;

    const events = generatePatternEvents(sequence, this.samples, {
      hasBuffer: this.hasBuffer,
    });

    for (const event of eventsAtStep(events, step)) {
      const buffer = this.buffers.get(event.sampleId);
      if (!buffer) continue;

      const trackGain = this.getTrackGain(event.trackId);
      trackGain.gain.setValueAtTime(event.gain, time);

      // Choke: nieuwe stap op een 'cut'-spoor stopt de vorige (met fade-out)
      if (event.choke) {
        const previous = this.lastPlayer.get(event.trackId);
        if (previous) {
          try {
            previous.stop(time);
          } catch {
            // al gestopt — negeren
          }
        }
      }

      // Fire-and-forget player (PERF-1-patroon): onstop → dispose
      const player = new Tone.Player(buffer);
      player.fadeIn = event.declickIn;
      player.fadeOut = SEQ_CHOKE_FADE_SECONDS;
      player.connect(trackGain);
      player.onstop = () => {
        try {
          player.dispose();
        } catch {
          // al disposed — negeren
        }
        this.activePlayers.delete(player);
        if (this.lastPlayer.get(event.trackId) === player) {
          this.lastPlayer.delete(event.trackId);
        }
      };
      player.start(time, event.trimStart, event.duration);
      this.activePlayers.add(player);
      // Altijd bijhouden (ook bij 'ring'): als het spoor later naar 'cut'
      // wisselt, kan de klinkende staart alsnog gechoked worden.
      this.lastPlayer.set(event.trackId, player);
    }

    this.stepIndex = (step + 1) % sequence.lengthSteps;
  };

  // --- Preview (sample-picker) ---

  async previewSample(sample: Sample): Promise<void> {
    await this.ensureBuffer(sample);
    const buffer = this.buffers.get(sample.id);
    if (!buffer) return;

    if (Tone.getContext().state !== 'running') {
      await Tone.start();
    }
    this.ensureGraph();
    this.stopPreview();

    const player = new Tone.Player(buffer);
    player.fadeOut = SEQ_CHOKE_FADE_SECONDS;
    player.connect(this.master as Tone.Gain);
    player.onstop = () => {
      try {
        player.dispose();
      } catch {
        // al disposed — negeren
      }
      if (this.previewPlayer === player) this.previewPlayer = null;
    };
    // Directe (niet-geplande) start: kleine offset is hier wél correct
    player.start('+0.05');
    this.previewPlayer = player;
  }

  stopPreview(): void {
    if (this.previewPlayer) {
      try {
        this.previewPlayer.stop();
      } catch {
        // al gestopt — negeren
      }
      this.previewPlayer = null;
    }
  }

  // --- Opruimen (pagina-unmount) ---

  dispose(): void {
    this.stop();
    for (const gain of this.trackGains.values()) gain.dispose();
    this.trackGains.clear();
    this.master?.dispose();
    this.master = null;
    this.limiter?.dispose();
    this.limiter = null;
    for (const buffer of this.buffers.values()) buffer.dispose();
    this.buffers.clear();
    this.bufferPromises.clear();
    this.lastPlayer.clear();
    this.activePlayers.clear();
  }
}

/** Module-singleton (zoals audioService), maar volledig los ervan */
export const sequencerEngine = new SequencerEngine();
