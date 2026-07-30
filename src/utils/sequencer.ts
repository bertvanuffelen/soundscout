/**
 * Sequencer Lab — pure helpers (geen Tone, geen React).
 */

import type { Sample } from '../types';
import { generateId } from './uuid';
import {
  SEQ_DEFAULT_BPM,
  SEQ_DEFAULT_STEPS,
  SEQ_DEFAULT_TRACKS,
  SEQ_MAX_STEPS,
  SEQ_MIN_STEPS,
  SEQUENCE_COLOR,
  SEQUENCE_COLORS,
  SEQUENCE_ICON,
  SEQUENCE_SAMPLE_PREFIX,
  type SequencerSequence,
  type SequencerTrack,
} from '../types/sequencer';

/** Pas een steps-array aan naar een nieuwe lengte: afkappen of aanvullen met false */
export function resizeSteps(steps: boolean[], newLength: number): boolean[] {
  if (newLength <= steps.length) {
    return steps.slice(0, newLength);
  }
  return [...steps, ...Array<boolean>(newLength - steps.length).fill(false)];
}

/** Effectieve (getrimde) duur van een sample in seconden */
export function effectiveDuration(
  sample: Sample,
  trimStart?: number,
  trimEnd?: number
): number {
  const start = Math.max(0, trimStart ?? 0);
  const end = Math.min(sample.duration, trimEnd ?? sample.duration);
  return Math.max(0, end - start);
}

/**
 * Hoeveel vakjes beslaat een geluid van deze duur? (voedt de duur-arcering)
 * 1 vakje = 1 tel = 60/bpm seconden. Altijd minimaal 1.
 */
export function stepSpanCells(effectiveDurationSec: number, bpm: number): number {
  const stepSeconds = 60 / bpm;
  return Math.max(1, Math.ceil(effectiveDurationSec / stepSeconds));
}

/** Klem een gewenste lengte op [SEQ_MIN_STEPS, SEQ_MAX_STEPS] */
export function clampLengthSteps(length: number): number {
  return Math.min(SEQ_MAX_STEPS, Math.max(SEQ_MIN_STEPS, length));
}

/** Maak een leeg spoor */
export function createEmptyTrack(lengthSteps: number): SequencerTrack {
  return {
    id: generateId(),
    sampleId: null,
    steps: Array<boolean>(lengthSteps).fill(false),
    mode: 'ring',
  };
}

// --- Fase 2: virtuele samples voor sequence-clips op de montagelijn ---

/** sampleId van de virtuele sample die bij een sequence hoort */
export function sequenceSampleId(sequenceId: string): string {
  return `${SEQUENCE_SAMPLE_PREFIX}${sequenceId}`;
}

/** Is dit sampleId een sequence-verwijzing? */
export function isSequenceSampleId(sampleId: string): boolean {
  return sampleId.startsWith(SEQUENCE_SAMPLE_PREFIX);
}

/** Haal het sequenceId uit een `seq:`-sampleId (of null) */
export function getSequenceIdFromSampleId(sampleId: string): string | null {
  return isSequenceSampleId(sampleId)
    ? sampleId.slice(SEQUENCE_SAMPLE_PREFIX.length)
    : null;
}

/**
 * Virtuele Sample voor een sequence: duur = vakjes × tel-duur. Hierdoor
 * werken collision, clip-breedte en loop-uitrekken zonder aanpassingen.
 * Wordt NOOIT gepersisteerd (afgeleid) en heeft geen audioUrl.
 */
export function createSequenceSample(sequence: SequencerSequence): Sample {
  return {
    id: sequenceSampleId(sequence.id),
    name: sequence.name,
    locationId: 'sequencer',
    audioUrl: '',
    duration: (sequence.lengthSteps * 60) / sequence.bpm,
    icon: SEQUENCE_ICON,
    color: sequence.color ?? SEQUENCE_COLOR,
  };
}

/**
 * Eerstvolgende vrije kleur uit het palet (oker-geel voorop). Zijn alle
 * kleuren in gebruik, dan wordt er cyclisch verder geteld.
 */
export function nextSequenceColor(existing: SequencerSequence[]): string {
  const used = new Set(existing.map((seq) => seq.color ?? SEQUENCE_COLOR));
  const free = SEQUENCE_COLORS.find((color) => !used.has(color));
  return free ?? SEQUENCE_COLORS[existing.length % SEQUENCE_COLORS.length];
}

/** Sample-lijst aangevuld met de virtuele sequence-samples */
export function withSequenceSamples(
  samples: Sample[],
  sequences: SequencerSequence[]
): Sample[] {
  if (sequences.length === 0) return samples;
  return [...samples, ...sequences.map(createSequenceSample)];
}

/** Maak een verse standaard-sequence (3 lege sporen, 16 vakjes, 120 BPM) */
export function createDefaultSequence(
  name: string,
  color: string = SEQUENCE_COLOR
): SequencerSequence {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name,
    color,
    lengthSteps: SEQ_DEFAULT_STEPS,
    bpm: SEQ_DEFAULT_BPM,
    tracks: Array.from({ length: SEQ_DEFAULT_TRACKS }, () =>
      createEmptyTrack(SEQ_DEFAULT_STEPS)
    ),
    createdAt: now,
    updatedAt: now,
  };
}
