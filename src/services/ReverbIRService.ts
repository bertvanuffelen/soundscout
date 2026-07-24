/**
 * ReverbIRService — deterministische impulse responses voor de clip-reverb.
 *
 * Vervangt Tone.Reverb (Audio Engine v2, Fase 2). Tone.Reverb genereerde per
 * clip een eigen IR van rúís via een geneste offline render: asynchroon
 * (`ready`-await nodig), per render nét anders (echte random) en fragiel in
 * de export. Deze service bouwt hetzelfde soort IR — exponentieel vervallende
 * witte ruis — maar met een geseede PRNG en pure wiskunde:
 *
 * - deterministisch: elke export klinkt identiek aan de vorige én aan live
 * - synchroon: geen ready-await, geen geneste offline contexts
 * - gecachet per (decay-bucket, sampleRate) — max ~7 buckets per rate
 *
 * De envelope volgt Tone.Reverb: amplitude ≈ exp(-6t/decay), lengte = decay.
 * (Tone gebruikt exponentialApproachValueAtTime met timeConstant decay/6.)
 */

import { reverbDecay } from './audioEvents';

/** Decay-bucket-stap in seconden (1.5–4.5s → max 7 buckets) */
const DECAY_BUCKET_STEP = 0.5;

/** Vaste seeds per kanaal — verschillend voor gedecorreleerde stereo-galm */
const CHANNEL_SEEDS = [0x536e6421, 0x53636f75]; // "Snd!", "Scou"

const irCache = new Map<string, AudioBuffer>();

/** mulberry32 — kleine, snelle geseede PRNG (uniform in [0,1)) */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rond een decay af op de bucket-stap (klein, onhoorbaar verschil) */
export function bucketDecay(decaySeconds: number): number {
  return Math.round(decaySeconds / DECAY_BUCKET_STEP) * DECAY_BUCKET_STEP;
}

/** Maak een leeg AudioBuffer, onafhankelijk van welke context actief is */
function createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer {
  return new AudioBuffer({ numberOfChannels: channels, length, sampleRate });
}

/**
 * Genereer (of haal uit cache) de IR voor een decay in seconden.
 * Puur en synchroon — veilig aan te roepen vanuit een Tone.Offline-callback.
 */
export function getReverbIRForDecay(decaySeconds: number, sampleRate: number): AudioBuffer {
  const decay = bucketDecay(decaySeconds);
  const key = `${decay}@${sampleRate}`;
  const cached = irCache.get(key);
  if (cached) return cached;

  const length = Math.max(1, Math.round(decay * sampleRate));
  const buffer = createBuffer(2, length, sampleRate);
  // Envelope: exp(-6t/decay) — zelfde afname als Tone.Reverb's
  // exponentialApproachValueAtTime(0, 0, decay) met timeConstant decay/6
  const k = 6 / (decay * sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const rand = mulberry32(CHANNEL_SEEDS[channel]);
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (rand() * 2 - 1) * Math.exp(-k * i);
    }
  }

  irCache.set(key, buffer);
  return buffer;
}

/**
 * IR voor een reverb-effectwaarde 0..100 (de app-schaal).
 * decay = 1.5 + reverb/100·3 (gedeelde formule in audioEvents).
 */
export function getReverbIR(reverbAmount: number, sampleRate: number): AudioBuffer {
  return getReverbIRForDecay(reverbDecay(reverbAmount), sampleRate);
}

/** Cache legen (tests/geheugen) */
export function clearReverbIRCache(): void {
  irCache.clear();
}
