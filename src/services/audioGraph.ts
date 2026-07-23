/**
 * audioGraph — de éne gedeelde effectketen-bouwer (Audio Engine v2).
 *
 * Bouwt per afspeel-event een verse keten
 *   Player → [PitchShift] → [Reverb] → [fadeGain] → Volume → bestemming
 * en plant fade-curves. Gebruikt door:
 * - AudioService.createOnDemandPlayer (live timeline)
 * - AudioService.playSampleWithEffects (EffectsModal-preview)
 * - renderOffline in audioExport.ts (MP3- en video-export)
 *
 * Eén implementatie = live en export kunnen niet meer uit elkaar groeien
 * (de architectuurfout achter de export-glitch, zie
 * docs/audio/PLAN-AUDIO-ENGINE-V2.md §2.1).
 */

import * as Tone from 'tone';
import {
  FADE_IN_CURVE,
  FADE_OUT_CURVE,
  reverbDecay,
  type ClipEffectsConfig,
} from './audioEvents';

// --- Ketenbouw ---

export interface ClipChain {
  /** Alle nodes ná de player, in volgorde (voor player.chain(...nodes, dest)) */
  nodes: Tone.ToneAudioNode[];
  /** Gain-node voor fades, of null als de clip geen fades heeft */
  fadeGain: Tone.Gain | null;
  /**
   * Reverb-node indien aanwezig — de offline render moet vóór transport.start
   * op `reverb.ready` wachten (de IR wordt asynchroon gegenereerd en de
   * offline klok wacht daar niet op; zie TONEJS-KENNISBANK).
   */
  reverb: Tone.Reverb | null;
  /** Alles in één keer opruimen (voor fire-and-forget-afhandeling) */
  dispose: () => void;
}

/**
 * Bouw de effect-nodes voor één clip-event.
 * De aanroeper verbindt: `player.chain(...chain.nodes, destination)`.
 */
export function buildClipChain(
  volumeDb: number,
  effects?: ClipEffectsConfig
): ClipChain {
  const nodes: Tone.ToneAudioNode[] = [];
  let fadeGain: Tone.Gain | null = null;
  let reverb: Tone.Reverb | null = null;

  if (effects) {
    if (effects.pitch !== 0) {
      nodes.push(new Tone.PitchShift({ pitch: effects.pitch }));
    }
    if (effects.reverb > 0) {
      reverb = new Tone.Reverb({ decay: reverbDecay(effects.reverb) });
      reverb.wet.value = effects.reverb / 100;
      nodes.push(reverb);
    }
    if (effects.fadeIn > 0 || effects.fadeOut > 0) {
      fadeGain = new Tone.Gain(1);
      nodes.push(fadeGain);
    }
  }

  // Volume-node (altijd) — track+clip-volume per keten gebakken
  nodes.push(new Tone.Volume(volumeDb));

  return {
    nodes,
    fadeGain,
    reverb,
    dispose: () => {
      nodes.forEach((node) => {
        try { node.dispose(); } catch { /* ignore */ }
      });
    },
  };
}

// --- Fade-planning (#79) ---

/**
 * Plan fade-in/fade-out-curves op een fadeGain, vanaf het begin van een event.
 * Identiek gedrag voor live Part-callback en offline render.
 */
export function scheduleFadeCurves(
  fadeGain: Tone.Gain,
  time: number,
  duration: number,
  fadeIn: number,
  fadeOut: number
): void {
  const gainParam = fadeGain.gain;
  if (fadeIn > 0) {
    gainParam.setValueAtTime(0, time);
    gainParam.setValueCurveAtTime(FADE_IN_CURVE as number[], time, fadeIn);
  }
  if (fadeOut > 0) {
    const fadeOutStart = time + duration - fadeOut;
    if (fadeOutStart >= time + fadeIn) {
      gainParam.setValueCurveAtTime(FADE_OUT_CURVE as number[], fadeOutStart, fadeOut);
    }
  }
}

/**
 * Plan fades voor een clip die mídden in zijn verloop instapt (seek).
 * `effectiveElapsed` = verstreken tijd binnen de huidige (loop-)iteratie.
 * Berekent de tussenwaarde met dezelfde curve-formule en plant het restant
 * via slice() — gedrag ongewijzigd overgenomen uit startActiveClips (#79).
 */
export function scheduleFadeCurvesAtOffset(
  fadeGain: Tone.Gain,
  startTime: number,
  effectiveElapsed: number,
  singleDuration: number,
  fadeIn: number,
  fadeOut: number
): void {
  const gainParam = fadeGain.gain;

  // Fade-in-zone (binnen de huidige iteratie)
  if (fadeIn > 0 && effectiveElapsed < fadeIn) {
    const progress = effectiveElapsed / fadeIn;
    const currentValue = progress * progress; // x² fade-in
    const remainingFade = fadeIn - effectiveElapsed;
    const startIdx = Math.floor(progress * FADE_IN_CURVE.length);
    const partialCurve = FADE_IN_CURVE.slice(startIdx) as number[];
    gainParam.setValueAtTime(currentValue, startTime);
    if (partialCurve.length >= 2) {
      gainParam.setValueCurveAtTime(partialCurve, startTime, remainingFade);
    }
  } else {
    gainParam.setValueAtTime(1, startTime);
  }

  // Fade-out (per iteratie, niet over de totale loopduur)
  if (fadeOut > 0) {
    const fadeOutStartInIteration = singleDuration - fadeOut;
    if (effectiveElapsed >= fadeOutStartInIteration) {
      // Al ín de fade-out-zone van deze iteratie
      const fadeOutElapsed = effectiveElapsed - fadeOutStartInIteration;
      const progress = fadeOutElapsed / fadeOut;
      const currentValue = (1 - progress) * (1 - progress);
      const remainingFade = fadeOut - fadeOutElapsed;
      const startIdx = Math.floor(progress * FADE_OUT_CURVE.length);
      const partialCurve = FADE_OUT_CURVE.slice(startIdx) as number[];
      gainParam.setValueAtTime(currentValue, startTime);
      if (partialCurve.length >= 2) {
        gainParam.setValueCurveAtTime(partialCurve, startTime, remainingFade);
      }
    } else {
      const fadeOutStartFromNow = fadeOutStartInIteration - effectiveElapsed;
      gainParam.setValueCurveAtTime(
        FADE_OUT_CURVE as number[],
        startTime + fadeOutStartFromNow,
        fadeOut
      );
    }
  }
}
