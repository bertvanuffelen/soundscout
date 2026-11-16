/**
 * sequencerEvents — de éne bron van waarheid voor patroon-events.
 *
 * Zelfde principe als audioEvents.ts in Audio Engine v2: deze module is
 * bewust PUUR (geen Tone-import) zodat de event-generatie in jsdom/vitest
 * getest kan worden én zodat live afspelen (SequencerEngine) en
 * tijdlijn-integratie/offline export (audioEvents) uit exact dezelfde events
 * putten. Live en export kunnen daardoor niet uit elkaar groeien.
 *
 * V2 Fase 4: ritme-sequences kennen nu ook swing (achtertellen schuiven op)
 * en aanslagsterkte per vakje; melodie-sequences (kind 'melody') leveren
 * per noot een gewoon event — een bibliotheekgeluid met een pitch-recept, of
 * een synth-noot onder een synthetische sample-id (synthVoice.ts). Default
 * (geen swing, geen velocities, ritme) = exact de events van vóór Fase 4.
 */

import type { Sample } from '../types';
import {
  MELODY_DEFAULT_ROOT,
  SEQ_CHOKE_FADE_SECONDS,
  SEQ_DECLICK_IN_SECONDS,
  SEQ_MAX_SWING,
  type MelodyPattern,
  type SequencerSequence,
} from '../types/sequencer';
import { effectiveDuration } from '../utils/sequencer';
import { getTempoStretchRatio } from '../utils/audio';
import { isNeutralRecipe, normalizeRecipe, type BakeRecipe } from './bakeRecipe';
import { SYNTH_NOTE_SECONDS, synthSampleId } from './synthVoice';

// --- Types ---

export interface PatternEvent {
  /** Vakje waarin dit event start (0-gebaseerd) */
  stepIndex: number;
  /** Starttijd in seconden t.o.v. het patroonbegin (stepIndex * 60/bpm, + swing) */
  timeOffset: number;
  trackId: string;
  trackIndex: number;
  sampleId: string;
  /** Offset in de (gebakken) buffer in seconden */
  trimStart: number;
  /** Speelduur van dit event in seconden (effectieve, getrimde duur) */
  duration: number;
  /** Lineaire gain 0..1: spoorvolume × aanslagsterkte */
  gain: number;
  /** Alleen het spoorvolume (voor een spoorbus in de live sequencer) */
  trackGain: number;
  /** Aanslagsterkte 0..1 (1 = vol) */
  velocity: number;
  /** True bij mode 'cut': een nieuwe stap op dit spoor stopt de vorige */
  choke: boolean;
  /** Micro-fade-in (s) tegen klikken; alleen > 0 bij een getrimde start */
  declickIn: number;
  /** Micro-fade-out (s) aan het einde (melodienoten worden afgekapt), anders 0 */
  declickOut: number;
  /** Bake-recept (pitch per noot, tempo-stretch voor loops) — undefined = geen */
  recipe?: BakeRecipe;
}

export interface GeneratePatternOptions {
  /**
   * Filter: alleen events voor samples waarvan de buffer geladen is.
   * Live gebruikt de engine dit; puur/testen laat het weg. Synthetische
   * synth-ids komen hier niet langs (die zijn altijd beschikbaar).
   */
  hasBuffer?: (sampleId: string) => boolean;
  /**
   * Tempo waarin het patroon klinkt. Op de tijdlijn is dat het
   * compositietempo (1 vakje = 1 tel); default het tempo van de sequence.
   */
  bpm?: number;
}

// --- Hulpjes ---

/** Swing geklemd op [0, SEQ_MAX_SWING] */
export function clampSwing(swing: number | undefined): number {
  if (!Number.isFinite(swing) || !swing || swing <= 0) return 0;
  return Math.min(SEQ_MAX_SWING, swing);
}

/**
 * Starttijd van een vakje met swing: de achtertellen (oneven vakjes)
 * schuiven `swing × vakjesduur` op. Swing 0 = recht.
 */
export function stepTimeOffset(step: number, stepSeconds: number, swing: number): number {
  const base = step * stepSeconds;
  return step % 2 === 1 ? base + clampSwing(swing) * stepSeconds : base;
}

/** Aanslagsterkte 0..1 (geklemd; ontbrekend = 1) */
function clampVelocity(velocity: number | undefined): number {
  if (velocity === undefined || !Number.isFinite(velocity)) return 1;
  return Math.min(1, Math.max(0, velocity));
}

/**
 * Semitonen boven de grondtoon voor een rij in het melodieraster:
 * rij r → scale[r mod n] + 12·floor(r / n).
 */
export function melodyRowToSemitones(row: number, scale: readonly number[]): number {
  const n = scale.length;
  if (n === 0) return 0;
  const octave = Math.floor(row / n);
  return scale[((row % n) + n) % n] + 12 * octave;
}

/** MIDI-noot van een rij in een melodiepatroon */
export function melodyRowToMidi(row: number, melody: Pick<MelodyPattern, 'root' | 'scale'>): number {
  return melody.root + melodyRowToSemitones(row, melody.scale);
}

// --- Generatie ---

/**
 * Genereer alle afspeel-events van één sequence-patroon, gesorteerd op tijd.
 * Sporen zonder sample, gemute sporen en niet-geladen buffers leveren geen
 * events; een event-duur van 0 (kapotte trim) wordt overgeslagen.
 */
export function generatePatternEvents(
  sequence: SequencerSequence,
  samples: Sample[],
  options: GeneratePatternOptions = {}
): PatternEvent[] {
  if (sequence.kind === 'melody') {
    return generateMelodyEvents(sequence, samples, options);
  }
  const { hasBuffer } = options;
  const bpm = options.bpm ?? sequence.bpm;
  const stepSeconds = 60 / bpm;
  const swing = clampSwing(sequence.swing);
  const sampleById = new Map(samples.map((s) => [s.id, s]));
  const events: PatternEvent[] = [];

  sequence.tracks.forEach((track, trackIndex) => {
    if (!track.sampleId || track.mute) return;
    if (hasBuffer && !hasBuffer(track.sampleId)) return;

    const sample = sampleById.get(track.sampleId);
    if (!sample) return;

    // Loops rekken mee met het tempo; trim staat in bron-seconden
    const stretch = getTempoStretchRatio(sample, bpm);
    const trimStart = Math.max(0, track.trimStart ?? 0) * stretch;
    const duration = effectiveDuration(sample, track.trimStart, track.trimEnd) * stretch;
    if (duration <= 0) return;
    const recipe = stretch !== 1 ? normalizeRecipe({ stretch }) : undefined;

    const trackGain = track.volume ?? 1;
    const choke = track.mode === 'cut';
    const declickIn = trimStart > 0 ? SEQ_DECLICK_IN_SECONDS : 0;

    for (let step = 0; step < sequence.lengthSteps; step++) {
      if (!track.steps[step]) continue;
      const velocity = clampVelocity(track.velocities?.[step]);
      if (velocity === 0) continue;
      events.push({
        stepIndex: step,
        timeOffset: stepTimeOffset(step, stepSeconds, swing),
        trackId: track.id,
        trackIndex,
        sampleId: track.sampleId,
        trimStart,
        duration,
        gain: trackGain * velocity,
        trackGain,
        velocity,
        choke,
        declickIn,
        declickOut: 0,
        ...(recipe ? { recipe } : {}),
      });
    }
  });

  events.sort((a, b) => a.timeOffset - b.timeOffset || a.trackIndex - b.trackIndex);
  return events;
}

/** Spoor-id van de melodielaag in de events (choke/bus-administratie) */
export const MELODY_TRACK_ID = 'melody';

/**
 * Events van een melodie-sequence: één per noot.
 * - stem 'sample': het bibliotheekgeluid, getransponeerd met een pitch-
 *   recept (noot − baseNote), duurbehoudend gebakken door de bake-service;
 * - stem 'synth': een vooraf gerenderde synth-noot (synthVoice.ts) onder
 *   `synth:<preset>:<midi>` — daarna gewoon sample-afspelen.
 * Duur = noot-lengte in vakjes (afgekapt op de lengte van het geluid), met
 * een micro-fade-out zodat het afkappen klikvrij is.
 */
function generateMelodyEvents(
  sequence: SequencerSequence,
  samples: Sample[],
  options: GeneratePatternOptions
): PatternEvent[] {
  const melody = sequence.melody;
  if (!melody || melody.mute) return [];
  const bpm = options.bpm ?? sequence.bpm;
  const stepSeconds = 60 / bpm;
  const swing = clampSwing(sequence.swing);
  const patternGain = melody.volume ?? 1;
  const rows = melody.scale.length * melody.octaves;

  let voiceSample: Sample | undefined;
  if (melody.voice.type === 'sample') {
    const id = melody.voice.sampleId;
    if (!id) return [];
    if (options.hasBuffer && !options.hasBuffer(id)) return [];
    voiceSample = samples.find((s) => s.id === id);
    if (!voiceSample) return [];
  }

  const events: PatternEvent[] = [];
  for (const note of melody.notes) {
    if (note.step < 0 || note.step >= sequence.lengthSteps) continue;
    if (note.row < 0 || note.row >= rows) continue;
    const velocity = clampVelocity(note.velocity);
    if (velocity === 0) continue;
    const midi = melodyRowToMidi(note.row, melody);
    const lengthSteps = Math.max(1, Math.min(note.length ?? 1, sequence.lengthSteps - note.step));
    const noteSeconds = lengthSteps * stepSeconds;

    let sampleId: string;
    let available: number;
    let recipe: BakeRecipe | undefined;
    if (melody.voice.type === 'synth') {
      sampleId = synthSampleId(melody.voice.preset, midi);
      available = SYNTH_NOTE_SECONDS;
    } else {
      sampleId = voiceSample!.id;
      const stretch = getTempoStretchRatio(voiceSample!, bpm);
      available = voiceSample!.duration * stretch;
      const r = normalizeRecipe({
        pitch: midi - (melody.voice.baseNote ?? MELODY_DEFAULT_ROOT),
        stretch,
      });
      recipe = isNeutralRecipe(r) ? undefined : r;
    }
    const duration = Math.min(noteSeconds, available);
    if (duration <= 0) continue;

    events.push({
      stepIndex: note.step,
      timeOffset: stepTimeOffset(note.step, stepSeconds, swing),
      trackId: MELODY_TRACK_ID,
      trackIndex: 0,
      sampleId,
      trimStart: 0,
      duration,
      gain: patternGain * velocity,
      trackGain: patternGain,
      velocity,
      choke: false,
      declickIn: 0,
      declickOut: SEQ_CHOKE_FADE_SECONDS,
      ...(recipe ? { recipe } : {}),
    });
  }
  events.sort((a, b) => a.timeOffset - b.timeOffset || a.sampleId.localeCompare(b.sampleId));
  return events;
}

/** Alle events die in één bepaald vakje starten (voor de live tick) */
export function eventsAtStep(
  events: PatternEvent[],
  stepIndex: number
): PatternEvent[] {
  return events.filter((e) => e.stepIndex === stepIndex);
}

/** Totale patroonduur in seconden (exclusief uitklinkende staarten) */
export function patternDurationSeconds(sequence: SequencerSequence, bpm: number = sequence.bpm): number {
  return sequence.lengthSteps * (60 / bpm);
}

/** Lineaire gain (0..1) naar dB, geklemd op −60 (stil) */
export function gainToDb(gain: number): number {
  if (gain <= 0.001) return -60;
  return 20 * Math.log10(gain);
}
