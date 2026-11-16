/**
 * clipEffectsUi — kleine, pure hulpjes voor de Vervormen-modal, de clip-
 * weergave en de tijdlijn (V2 Fase 4).
 *
 * - Welke effecten staan "aan" (voor het sterretje op de clip en de knop)?
 * - Fades klemmen op de lengte zoals je hem HOORT (na snelheid en tempo).
 * - Welke clips op een spoor overlappen elkaar (na een tempowissel)?
 */

import type { Clip, ClipEffects, ClipSpeed, Sample } from '../types';
import { getEffectiveClipDurationBeats } from './audio';

/** De bewerkbare Vervormen-waarden, met de neutrale stand ingevuld. */
export interface VervormenValues {
  pitch: number;
  reverb: number;
  fadeIn: number;
  fadeOut: number;
  speed: ClipSpeed;
  reverse: boolean;
  echo: number;
  filter: number;
}

export const NEUTRAL_VERVORMEN: VervormenValues = {
  pitch: 0,
  reverb: 0,
  fadeIn: 0,
  fadeOut: 0,
  speed: 1,
  reverse: false,
  echo: 0,
  filter: 0,
};

/** Effecten van een clip als volledige Vervormen-waarden (afwezig = neutraal). */
export function toVervormenValues(effects: Partial<ClipEffects> | undefined): VervormenValues {
  return {
    pitch: effects?.pitch ?? 0,
    reverb: effects?.reverb ?? 0,
    fadeIn: effects?.fadeIn ?? 0,
    fadeOut: effects?.fadeOut ?? 0,
    speed: effects?.speed ?? 1,
    reverse: effects?.reverse === true,
    echo: effects?.echo ?? 0,
    filter: effects?.filter ?? 0,
  };
}

/** Alleen de velden die verschillen van `initial` (voor updateClipEffects). */
export function changedVervormenFields(
  initial: VervormenValues,
  next: VervormenValues,
): Partial<ClipEffects> {
  const patch: Partial<ClipEffects> = {};
  (Object.keys(next) as Array<keyof VervormenValues>).forEach((key) => {
    if (next[key] !== initial[key]) {
      (patch as Record<string, unknown>)[key] = next[key];
    }
  });
  return patch;
}

/**
 * Staat er een klank- of vervormeffect aan? (volume en dempen tellen niet:
 * die hebben hun eigen knop.)
 */
export function hasClipEffects(effects: Partial<ClipEffects> | undefined): boolean {
  if (!effects) return false;
  const v = toVervormenValues(effects);
  return (
    v.pitch !== 0 ||
    v.reverb > 0 ||
    v.fadeIn > 0 ||
    v.fadeOut > 0 ||
    v.speed !== 1 ||
    v.reverse ||
    v.echo > 0 ||
    v.filter !== 0
  );
}

/**
 * Klem fade in + fade out (seconden zoals gehoord) op `duration`: passen ze
 * samen niet, dan krimpen ze naar verhouding. Afgerond op 0,1 s, en nooit
 * samen langer dan de clip.
 */
export function clampFades(
  fadeIn: number,
  fadeOut: number,
  duration: number,
): { fadeIn: number; fadeOut: number } {
  const total = fadeIn + fadeOut;
  if (total <= duration || total <= 0) return { fadeIn, fadeOut };
  const scale = Math.max(0, duration) / total;
  let nextIn = Math.round(fadeIn * scale * 10) / 10;
  let nextOut = Math.round(fadeOut * scale * 10) / 10;
  // Afronden kan er net overheen gaan: dan naar beneden
  if (nextIn + nextOut > duration) {
    nextIn = Math.floor(fadeIn * scale * 10) / 10;
    nextOut = Math.floor(fadeOut * scale * 10) / 10;
  }
  return { fadeIn: nextIn, fadeOut: nextOut };
}

const OVERLAP_EPSILON = 1e-6;

/**
 * Clips op één spoor die elkaar overlappen. Normaal kan dat niet (de
 * smart snap voorkomt het), maar na een tempowissel veranderen losse
 * geluiden van lengte in tellen en kunnen ze over hun buurman heen vallen.
 * We verschuiven dan niets — we laten het zien.
 */
export function findOverlappingClipIds(
  clips: readonly Clip[],
  getSample: (id: string) => Sample | undefined,
  bpm: number,
): Set<string> {
  const spans: Array<{ id: string; start: number; end: number }> = [];
  for (const clip of clips) {
    const sample = getSample(clip.sampleId);
    if (!sample) continue;
    spans.push({
      id: clip.id,
      start: clip.startBeat,
      end: clip.startBeat + getEffectiveClipDurationBeats(clip, sample, bpm),
    });
  }
  spans.sort((a, b) => a.start - b.start);

  const overlapping = new Set<string>();
  for (let i = 0; i < spans.length; i++) {
    for (let j = i + 1; j < spans.length; j++) {
      if (spans[j].start >= spans[i].end - OVERLAP_EPSILON) break;
      overlapping.add(spans[i].id);
      overlapping.add(spans[j].id);
    }
  }
  return overlapping;
}
