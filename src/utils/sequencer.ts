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

/** Maak een verse standaard-sequence (3 lege sporen, 16 vakjes, 120 BPM) */
export function createDefaultSequence(name: string): SequencerSequence {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name,
    lengthSteps: SEQ_DEFAULT_STEPS,
    bpm: SEQ_DEFAULT_BPM,
    tracks: Array.from({ length: SEQ_DEFAULT_TRACKS }, () =>
      createEmptyTrack(SEQ_DEFAULT_STEPS)
    ),
    createdAt: now,
    updatedAt: now,
  };
}
