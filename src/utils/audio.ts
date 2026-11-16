import type { Clip, ClipSpeed, Sample } from '../types';
import { CLIP_SPEEDS } from '../types';
import { ALLOWED_BPMS, DEFAULT_BPM, REFERENCE_BPM } from '../constants/config';
import { resolveSampleKind } from './sampleKinds';
import { logger } from './logger';

// =============================================================================
// TEMPO (V2 Fase 4)
// =============================================================================

/** Is dit een van de vier toegestane tempi? */
export function isAllowedBpm(bpm: unknown): bpm is (typeof ALLOWED_BPMS)[number] {
  return typeof bpm === 'number' && (ALLOWED_BPMS as readonly number[]).includes(bpm);
}

/**
 * Tempo uit opgeslagen of binnenkomende data: alleen 90/105/120/135 mag.
 * Alles anders valt terug op 120 met een waarschuwing — nooit een crash.
 */
export function normalizeBpm(bpm: unknown): number {
  if (isAllowedBpm(bpm)) return bpm;
  if (bpm !== undefined && bpm !== null) {
    logger.warn('Ongeldig tempo in compositie — terug naar standaardtempo', { bpm, fallback: DEFAULT_BPM });
  }
  return DEFAULT_BPM;
}

/**
 * Uitrekfactor (lengte-vermenigvuldiger) voor het compositietempo: loops
 * houden hun muzikale lengte in tellen (8,0 s @ 120 → 10,667 s @ 90), losse
 * geluiden worden nooit uitgerekt (factor 1; hun lengte in tellen verandert).
 */
export function getTempoStretchRatio(sample: Pick<Sample, 'id' | 'kind'>, bpm: number): number {
  if (resolveSampleKind(sample) !== 'loop') return 1;
  if (!(bpm > 0) || bpm === REFERENCE_BPM) return 1;
  return REFERENCE_BPM / bpm;
}

/** Bandsnelheid van een clip, genormaliseerd op CLIP_SPEEDS (anders 1). */
export function getClipSpeed(clip: Pick<Clip, 'effects'>): ClipSpeed {
  const speed = clip.effects?.speed;
  return speed !== undefined && (CLIP_SPEEDS as readonly number[]).includes(speed) ? speed : 1;
}

/**
 * Hoeveel langer (of korter) een clip klinkt dan zijn brongeluid:
 * tempo-uitrekking ÷ bandsnelheid. Pitch verandert de lengte niet
 * (duurbehoudend), reverse ook niet.
 */
export function getClipLengthFactor(
  clip: Pick<Clip, 'effects'>,
  sample: Pick<Sample, 'id' | 'kind'>,
  bpm: number,
): number {
  return getTempoStretchRatio(sample, bpm) / getClipSpeed(clip);
}

/**
 * Speelduur van één (loop-)iteratie in seconden op de tijdlijn: de getrimde
 * bronduur × lengtefactor. Trim blijft in BRON-seconden staan (wat de
 * leerling in de golfvorm ziet), los van tempo of snelheid.
 */
export function getClipPlaybackDuration(clip: Clip, sample: Sample, bpm: number): number {
  return getClipDuration(clip, sample) * getClipLengthFactor(clip, sample, bpm);
}

/**
 * Convert beats to seconds based on BPM.
 * At 120 BPM, 1 beat = 0.5 seconds.
 */
export function beatsToSeconds(beats: number, bpm: number): number {
  return (beats / bpm) * 60;
}

/**
 * Convert seconds to beats based on BPM.
 */
export function secondsToBeats(seconds: number, bpm: number): number {
  return (seconds / 60) * bpm;
}

/**
 * Calculate the end beat of a clip (startBeat + sample duration in beats).
 * @deprecated Use getClipEndBeat instead (accounts for trimming)
 */
export function getSampleEndBeat(
  clip: Clip,
  sample: Sample,
  bpm: number,
): number {
  const durationInBeats = secondsToBeats(sample.duration, bpm);
  return clip.startBeat + durationInBeats;
}

// =============================================================================
// CLIP TRIMMING UTILITIES
// =============================================================================

/**
 * Get the trimmed duration of a clip in SOURCE seconds (respects trim
 * boundaries, ignores tempo-stretch and speed). If no trim is set, returns
 * the full sample duration. For timeline length use getClipPlaybackDuration.
 */
export function getClipDuration(clip: Clip, sample: Sample): number {
  const start = clip.trimStart ?? 0;
  const end = clip.trimEnd ?? sample.duration;
  return end - start;
}

/**
 * Get the effective duration of one clip iteration in beats: trim, tempo-
 * stretch (loops) and speed included. Collision, clip width, loop iterations
 * and seek all build on this.
 */
export function getClipDurationBeats(
  clip: Clip,
  sample: Sample,
  bpm: number,
): number {
  return secondsToBeats(getClipPlaybackDuration(clip, sample, bpm), bpm);
}

/**
 * Calculate the end beat of a clip (respects trim boundaries).
 */
export function getClipEndBeat(
  clip: Clip,
  sample: Sample,
  bpm: number,
): number {
  const durationBeats = getClipDurationBeats(clip, sample, bpm);
  return clip.startBeat + durationBeats;
}

/**
 * Get the trim start position in seconds (defaults to 0).
 */
export function getClipTrimStart(clip: Clip): number {
  return clip.trimStart ?? 0;
}

/**
 * Get the trim end position in seconds (defaults to sample duration).
 */
export function getClipTrimEnd(clip: Clip, sample: Sample): number {
  return clip.trimEnd ?? sample.duration;
}

// =============================================================================
// LOOP-AWARE UTILITIES (#65)
// =============================================================================

/**
 * Get the effective visual/scheduling width of a clip in beats.
 * For looping clips: returns loopDurationBeats.
 * For normal clips: returns trimmed sample duration in beats.
 */
export function getEffectiveClipDurationBeats(
  clip: Clip,
  sample: Sample,
  bpm: number,
): number {
  if (clip.loop && clip.loopDurationBeats) {
    return clip.loopDurationBeats;
  }
  return getClipDurationBeats(clip, sample, bpm);
}

/**
 * Calculate the end beat of a clip (loop-aware).
 * Uses loopDurationBeats for looping clips.
 */
export function getEffectiveClipEndBeat(
  clip: Clip,
  sample: Sample,
  bpm: number,
): number {
  return clip.startBeat + getEffectiveClipDurationBeats(clip, sample, bpm);
}

/**
 * Vind de sectie (het bereik tussen twee sectie-markeringen) waarin een gegeven
 * beat valt. Secties dragen alleen een `endBeat`; een sectie loopt van de vorige
 * `endBeat` (of 0) tot de eigen `endBeat`, en het staartstuk ná de laatste
 * markering loopt door tot `totalBeats`.
 *
 * Gebruikt door de loop-keuze "Deze sectie": loop het stuk waar de afspeellijn
 * op dat moment staat (testronde 6).
 *
 * @returns het bereik `{ startBeat, endBeat }`, of `null` als er geen secties
 *          zijn (dan ís de hele compositie het enige "stuk").
 */
export function sectionAt(
  beat: number,
  sections: { endBeat: number }[],
  totalBeats: number,
): { startBeat: number; endBeat: number } | null {
  if (sections.length === 0) return null;
  const bounds = sections.map((s) => s.endBeat).sort((a, b) => a - b);
  let lo = 0;
  for (const hi of bounds) {
    if (beat < hi) return { startBeat: lo, endBeat: hi };
    lo = hi;
  }
  // Beat valt na de laatste markering → staartstuk tot het einde van de tijdlijn.
  return { startBeat: lo, endBeat: totalBeats };
}
