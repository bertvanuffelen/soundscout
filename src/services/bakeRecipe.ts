/**
 * bakeRecipe — pure beschrijving van een gebakken buffer (V2 Fase 4).
 *
 * Een recept zegt hoe een brongeluid vóór het afspelen wordt omgezet:
 *
 *   bron ─► [reverse] ─► [speed: tape-resample] ─► [pitch + stretch: Signalsmith] ─► buffer
 *          └──────── synchrone stap ────────┘    └────── asynchrone stap ──────┘
 *
 * - reverse: monsters omkeren (puur JS, synchroon)
 * - speed:   bandsnelheid — toonhoogte én lengte samen; resampling met
 *            4-punts Hermite-interpolatie (puur JS, synchroon, deterministisch)
 * - pitch:   semitonen, duurbehoudend (Signalsmith Stretch, async)
 * - stretch: lengte-factor zonder toonhoogte (tempo voor loops; Signalsmith)
 *
 * Alle drie de motoren (live, preview, export) spelen dezelfde gebakken
 * buffer af — dat is de garantie "één motor". Deze module is bewust puur
 * (geen Tone, geen Web Audio) zodat sleutels, wiskunde en DSP testbaar zijn.
 */

import type { Clip, Sample } from '../types';
import { getClipSpeed, getTempoStretchRatio } from '../utils/audio';

// --- Recept ---

export interface BakeRecipe {
  /** Semitonen, duurbehoudend (0 = geen) */
  pitch: number;
  /** Lengte-factor zonder toonhoogte (1 = geen; >1 = langer/trager) */
  stretch: number;
  /** Bandsnelheid (1 = geen; 2 = dubbel zo snel en een octaaf hoger) */
  speed: number;
  /** Achterstevoren */
  reverse: boolean;
}

export const NEUTRAL_RECIPE: Readonly<BakeRecipe> = Object.freeze({
  pitch: 0,
  stretch: 1,
  speed: 1,
  reverse: false,
});

/** Afronding van de sleutel — voorkomt dubbele bakes door float-ruis */
const KEY_DECIMALS = 6;
function round(value: number): number {
  return Number(value.toFixed(KEY_DECIMALS));
}

/**
 * Normaliseer: ongeldige waarden → neutraal, en waarden die op de sleutel-
 * precisie neutraal zijn (bv. stretch 1.0000000001) → exact neutraal. De
 * waarden zelf blijven onafgerond (exacte lengtes); alleen de SLEUTEL rondt af.
 */
export function normalizeRecipe(recipe: Partial<BakeRecipe> | undefined): BakeRecipe {
  const finite = (v: number | undefined, fallback: number, positive = false) =>
    v !== undefined && Number.isFinite(v) && (!positive || v > 0) ? v : fallback;
  let pitch = finite(recipe?.pitch, 0);
  let stretch = finite(recipe?.stretch, 1, true);
  let speed = finite(recipe?.speed, 1, true);
  if (round(pitch) === 0) pitch = 0;
  if (round(stretch) === 1) stretch = 1;
  if (round(speed) === 1) speed = 1;
  return { pitch, stretch, speed, reverse: recipe?.reverse === true };
}

export function isNeutralRecipe(recipe: BakeRecipe | undefined): boolean {
  if (!recipe) return true;
  return recipe.pitch === 0 && recipe.stretch === 1 && recipe.speed === 1 && !recipe.reverse;
}

/** Heeft het recept de synchrone stap (reverse/speed) nodig? */
export function hasSyncStage(recipe: BakeRecipe): boolean {
  return recipe.reverse || recipe.speed !== 1;
}

/** Heeft het recept de Signalsmith-stap (pitch/stretch) nodig? */
export function hasAsyncStage(recipe: BakeRecipe): boolean {
  return recipe.pitch !== 0 || recipe.stretch !== 1;
}

/** Alleen de synchrone stap van een recept */
export function syncStageOf(recipe: BakeRecipe): BakeRecipe {
  return { ...NEUTRAL_RECIPE, speed: recipe.speed, reverse: recipe.reverse };
}

/** Lengte van de gebakken buffer t.o.v. de bron (pitch telt niet mee) */
export function recipeLengthFactor(recipe: BakeRecipe): number {
  return recipe.stretch / recipe.speed;
}

/**
 * Cache-/budget-sleutel. Een recept met alléén pitch geeft exact de oude
 * pitch-sleutel `sampleId|semitonen` (memoryBudget.pitchKey) — bestaande
 * pins, statistiek en tests blijven daardoor gelijk.
 */
export function recipeKey(sampleId: string, recipe: BakeRecipe): string {
  const r = normalizeRecipe(recipe);
  const base = `${sampleId}|${round(r.pitch)}`;
  if (r.stretch === 1 && r.speed === 1 && !r.reverse) return base;
  return `${base}|t${round(r.stretch)}|v${round(r.speed)}${r.reverse ? '|r' : ''}`;
}

/**
 * Recept voor een gewone clip op de tijdlijn: clip-pitch, bandsnelheid,
 * reverse, en tempo-uitrekking als de sample een loop is.
 * Geeft undefined bij een neutraal recept (geen bake nodig).
 */
export function clipRecipe(
  clip: Pick<Clip, 'effects'>,
  sample: Pick<Sample, 'id' | 'kind'>,
  bpm: number
): BakeRecipe | undefined {
  const recipe = normalizeRecipe({
    pitch: clip.effects?.pitch ?? 0,
    stretch: getTempoStretchRatio(sample, bpm),
    speed: getClipSpeed(clip),
    reverse: clip.effects?.reverse === true,
  });
  return isNeutralRecipe(recipe) ? undefined : recipe;
}

// --- DSP (puur, op Float32Array) ---

/** Monsters omkeren (nieuwe arrays; de bron blijft onaangeroerd) */
export function reverseChannels(channels: readonly Float32Array[]): Float32Array[] {
  return channels.map((data) => {
    const out = new Float32Array(data.length);
    for (let i = 0, j = data.length - 1; i < data.length; i++, j--) out[i] = data[j];
    return out;
  });
}

/** Aantal frames na resampling met bandsnelheid `speed` */
export function resampledLength(length: number, speed: number): number {
  return Math.max(1, Math.round(length / speed));
}

/**
 * Bandsnelheid: resample met 4-punts, 3e-orde Hermite-interpolatie.
 * Uitvoer-frame i leest bron-positie i·speed. Puur en deterministisch
 * (zelfde invoer → bit-identieke uitvoer, in elke browser en in Node).
 */
export function resampleChannels(channels: readonly Float32Array[], speed: number): Float32Array[] {
  if (speed === 1) return channels.map((c) => new Float32Array(c));
  return channels.map((src) => {
    const n = src.length;
    const outLength = resampledLength(n, speed);
    const out = new Float32Array(outLength);
    const at = (k: number) => (k < 0 ? src[0] : k >= n ? (n > 0 ? src[n - 1] : 0) : src[k]);
    for (let i = 0; i < outLength; i++) {
      const pos = i * speed;
      const k = Math.floor(pos);
      const t = pos - k;
      const xm1 = at(k - 1), x0 = at(k), x1 = at(k + 1), x2 = at(k + 2);
      const c0 = x0;
      const c1 = 0.5 * (x1 - xm1);
      const c2 = xm1 - 2.5 * x0 + 2 * x1 - 0.5 * x2;
      const c3 = 0.5 * (x2 - xm1) + 1.5 * (x0 - x1);
      out[i] = ((c3 * t + c2) * t + c1) * t + c0;
    }
    return out;
  });
}

/**
 * Anti-aliasfilter vóór versnellen: 4e-orde Butterworth-low-pass (twee
 * RBJ-biquads, Q 0.5412 en 1.3066) op 0.45 · Nyquist / speed. Zonder dit
 * zou speed 2 hoge tonen terugspiegelen als schelle bijtonen.
 */
export function antiAliasChannels(channels: readonly Float32Array[], speed: number): Float32Array[] {
  if (speed <= 1) return channels.map((c) => new Float32Array(c));
  const w0 = Math.PI * (0.9 / speed); // 0.45 · fs/2 / speed, als hoek (rad/sample)
  const sections = [0.5412, 1.3066].map((q) => {
    const alpha = Math.sin(w0) / (2 * q);
    const cos = Math.cos(w0);
    const a0 = 1 + alpha;
    return {
      b0: (1 - cos) / 2 / a0,
      b1: (1 - cos) / a0,
      b2: (1 - cos) / 2 / a0,
      a1: (-2 * cos) / a0,
      a2: (1 - alpha) / a0,
    };
  });
  return channels.map((src) => {
    let data: Float32Array = new Float32Array(src);
    for (const { b0, b1, b2, a1, a2 } of sections) {
      const out = new Float32Array(data.length);
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = 0; i < data.length; i++) {
        const x0 = data[i];
        const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
        out[i] = y0;
        x2 = x1; x1 = x0; y2 = y1; y1 = y0;
      }
      data = out;
    }
    return data;
  });
}

/** De synchrone stap (reverse → speed) op ruwe kanaaldata */
export function applySyncStage(channels: readonly Float32Array[], recipe: BakeRecipe): Float32Array[] {
  const reversed = recipe.reverse ? reverseChannels(channels) : channels.map((c) => new Float32Array(c));
  if (recipe.speed === 1) return reversed;
  return resampleChannels(antiAliasChannels(reversed, recipe.speed), recipe.speed);
}
