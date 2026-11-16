/**
 * synthVoice — ingebouwde synth-stem voor melodie-sequences (V2 Fase 4).
 *
 * Elke synth-noot wordt één keer deterministisch gerenderd naar een buffer
 * en daarna als gewone sample afgespeeld onder een synthetische sample-id
 * `synth:<preset>:<midi>`. Zo lopen live, preview en export door exact
 * hetzelfde pad als elk ander geluid (één motor — Tone.js-valkuil 8).
 *
 * Bewust additieve synthese in puur JS in plaats van een
 * OfflineAudioContext-oscillator: even deterministisch, maar synchroon (dus
 * beschikbaar in de Part-callback zonder te wachten), bandbeperkt (geen
 * aliasing: harmonischen boven 0.45·fs worden weggelaten) en in Node/vitest
 * te testen.
 */

import { SYNTH_PRESETS, type SynthPreset } from '../types/sequencer';
import { decodedAudioBudget, decodedBytes } from './audio/memoryBudget';

export const SYNTH_SAMPLE_PREFIX = 'synth:';
/** Lengte van een gerenderde noot (s); langere noten worden hierop afgekapt */
export const SYNTH_NOTE_SECONDS = 2;
/** Piekniveau van een noot (headroom voor akkoorden + andere sporen) */
const SYNTH_PEAK = 0.45;

interface PresetSpec {
  /** Amplitude per harmonische k (1-gebaseerd) */
  harmonic: (k: number) => number;
  maxHarmonics: number;
  attack: number;
  /** Tijdconstante van het exponentiële uitsterven (s) */
  decay: number;
  /** Uitfaden over de laatste seconden van de buffer (klikvrij einde) */
  release: number;
}

const PRESETS: Record<SynthPreset, PresetSpec> = {
  // Zacht: grondtoon + wat octaaf, langzaam aanzetten, lang doorklinken
  soft: { harmonic: (k) => (k === 1 ? 1 : k === 2 ? 0.25 : k === 3 ? 0.08 : 0), maxHarmonics: 3, attack: 0.02, decay: 1.2, release: 0.15 },
  // Helder: zaagtand-achtig (1/k), snel aanzetten
  bright: { harmonic: (k) => 1 / k, maxHarmonics: 12, attack: 0.005, decay: 0.6, release: 0.1 },
  // Tokkel: driehoek-achtig (oneven harmonischen, 1/k²), kort
  pluck: { harmonic: (k) => (k % 2 === 1 ? 1 / (k * k) : 0), maxHarmonics: 9, attack: 0.002, decay: 0.25, release: 0.05 },
};

/** Frequentie (Hz) van een MIDI-noot (69 = A4 = 440 Hz) */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function isSynthSampleId(sampleId: string): boolean {
  return sampleId.startsWith(SYNTH_SAMPLE_PREFIX);
}

export function synthSampleId(preset: SynthPreset, midi: number): string {
  return `${SYNTH_SAMPLE_PREFIX}${preset}:${Math.round(midi)}`;
}

export function parseSynthSampleId(sampleId: string): { preset: SynthPreset; midi: number } | null {
  if (!isSynthSampleId(sampleId)) return null;
  const [preset, midiText] = sampleId.slice(SYNTH_SAMPLE_PREFIX.length).split(':');
  const midi = Number(midiText);
  if (!(SYNTH_PRESETS as readonly string[]).includes(preset) || !Number.isInteger(midi)) return null;
  return { preset: preset as SynthPreset, midi };
}

/**
 * Render één synth-noot (mono). Puur: zelfde (preset, midi, sampleRate) →
 * bit-identieke uitvoer.
 */
export function renderSynthNote(preset: SynthPreset, midi: number, sampleRate: number): Float32Array {
  const spec = PRESETS[preset];
  const length = Math.round(SYNTH_NOTE_SECONDS * sampleRate);
  const out = new Float32Array(length);
  const f0 = midiToFrequency(midi);
  const nyquistLimit = 0.45 * sampleRate;

  const partials: Array<{ w: number; amp: number }> = [];
  for (let k = 1; k <= spec.maxHarmonics; k++) {
    const amp = spec.harmonic(k);
    if (amp === 0 || f0 * k >= nyquistLimit) continue;
    partials.push({ w: (2 * Math.PI * f0 * k) / sampleRate, amp });
  }
  const norm = partials.reduce((sum, p) => sum + p.amp, 0) || 1;

  const attackFrames = Math.max(1, Math.round(spec.attack * sampleRate));
  const releaseFrames = Math.max(1, Math.round(spec.release * sampleRate));
  const releaseStart = length - releaseFrames;

  for (let i = 0; i < length; i++) {
    let v = 0;
    for (const p of partials) v += p.amp * Math.sin(p.w * i);
    const t = i / sampleRate;
    let env = Math.exp(-t / spec.decay);
    if (i < attackFrames) env *= i / attackFrames;
    if (i >= releaseStart) env *= (length - i) / releaseFrames;
    out[i] = (SYNTH_PEAK * v * env) / norm;
  }
  return out;
}

// --- Cache van AudioBuffers (alleen in de browser) ---

const cache = new Map<string, AudioBuffer>();

/**
 * AudioBuffer voor een synthetische sample-id, of undefined als de id geen
 * geldige synth-id is of de omgeving geen AudioBuffer kent. Gecachet per
 * (id, sampleRate) en geboekt in het geheugenbudget; opruimen is
 * onschadelijk (een volgende aanvraag rendert opnieuw, synchroon).
 */
export function getSynthBuffer(sampleId: string, sampleRate: number): AudioBuffer | undefined {
  const parsed = parseSynthSampleId(sampleId);
  if (!parsed || typeof AudioBuffer === 'undefined') return undefined;
  const key = `${sampleId}@${sampleRate}`;
  const cached = cache.get(key);
  if (cached) {
    decodedAudioBudget.touch('pitch', key);
    return cached;
  }
  const data = renderSynthNote(parsed.preset, parsed.midi, sampleRate);
  const buffer = new AudioBuffer({ numberOfChannels: 1, length: data.length, sampleRate });
  buffer.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
  cache.set(key, buffer);
  decodedAudioBudget.register(key, {
    category: 'pitch',
    sampleId,
    pitchKey: key,
    bytes: decodedBytes(buffer),
    evict: () => { cache.delete(key); },
  });
  return buffer;
}

/** Alleen voor tests / themawissel */
export function clearSynthCache(): void {
  for (const key of cache.keys()) decodedAudioBudget.unregister('pitch', key);
  cache.clear();
}
