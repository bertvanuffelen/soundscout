import { describe, it, expect } from 'vitest';
import {
  applyLimiterToChannels,
  createLimiterKernel,
  LIMITER_CEILING,
  LIMITER_LOOKAHEAD_MS,
  LIMITER_ATTACK_MS,
  LIMITER_RELEASE_MS,
  buildLimiterProcessorCode,
} from '../masterLimiter';

const SR = 48000;

function sine(seconds: number, amplitude: number, freq = 440): Float32Array {
  const n = Math.round(SR * seconds);
  const data = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    data[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / SR);
  }
  return data;
}

const peakOf = (data: Float32Array) => {
  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    const v = Math.abs(data[i]);
    if (v > peak) peak = v;
  }
  return peak;
};

const maxJumpOf = (data: Float32Array) => {
  let max = 0;
  for (let i = 1; i < data.length; i++) {
    const j = Math.abs(data[i] - data[i - 1]);
    if (j > max) max = j;
  }
  return max;
};

describe('masterLimiter', () => {
  it('houdt een te luid signaal exact onder het plafond (brickwall)', () => {
    const left = sine(1, 1.6);
    const right = sine(1, 1.6);
    const stats = applyLimiterToChannels([left, right], SR);
    expect(peakOf(left)).toBeLessThanOrEqual(LIMITER_CEILING + 1e-6);
    expect(peakOf(right)).toBeLessThanOrEqual(LIMITER_CEILING + 1e-6);
    expect(stats.inputPeak).toBeGreaterThan(1.5);
    expect(stats.outputPeak).toBeLessThanOrEqual(LIMITER_CEILING + 1e-6);
    expect(stats.maxReductionDb).toBeGreaterThan(4); // ~-5.1 dB reductie nodig
  });

  it('is transparant onder het plafond (unity gain, sample-uitgelijnd)', () => {
    const original = sine(1, 0.5);
    const processed = new Float32Array(original);
    const stats = applyLimiterToChannels([processed], SR);
    expect(stats.maxReductionDb).toBe(0);
    // Sample-uitgelijnd én (vrijwel) bit-identiek
    let maxDiff = 0;
    for (let i = 0; i < original.length; i++) {
      const d = Math.abs(original[i] - processed[i]);
      if (d > maxDiff) maxDiff = d;
    }
    expect(maxDiff).toBeLessThan(1e-6);
  });

  it('introduceert geen kliks bij het limiten (lookahead-attack is glad)', () => {
    // Stilte → plots keihard: de klassieke limiter-stresstest
    const data = new Float32Array(SR);
    for (let i = Math.round(0.5 * SR); i < SR; i++) {
      data[i] = 1.8 * Math.sin((2 * Math.PI * 220 * i) / SR);
    }
    const before = maxJumpOf(data);
    applyLimiterToChannels([data], SR);
    // Het gelimite signaal mag geen grotere sprongen bevatten dan de bron
    expect(maxJumpOf(data)).toBeLessThanOrEqual(before);
    expect(peakOf(data)).toBeLessThanOrEqual(LIMITER_CEILING + 1e-6);
  });

  it('herstelt de gain na een luide passage (release)', () => {
    const data = new Float32Array(SR * 2);
    // 0-0.5s luid (1.5), daarna zacht (0.3)
    for (let i = 0; i < SR * 2; i++) {
      const amp = i < SR * 0.5 ? 1.5 : 0.3;
      data[i] = amp * Math.sin((2 * Math.PI * 330 * i) / SR);
    }
    applyLimiterToChannels([data], SR);
    // Aan het eind (ruim na de release van 150ms) is het zachte deel weer
    // vrijwel op vol niveau
    let tailPeak = 0;
    for (let i = Math.round(1.5 * SR); i < 2 * SR; i++) {
      const v = Math.abs(data[i]);
      if (v > tailPeak) tailPeak = v;
    }
    expect(tailPeak).toBeGreaterThan(0.29);
  });

  it('is deterministisch (twee runs, identieke output)', () => {
    const a = sine(0.5, 1.4);
    const b = new Float32Array(a);
    applyLimiterToChannels([a], SR);
    applyLimiterToChannels([b], SR);
    for (let i = 0; i < a.length; i += 997) {
      expect(a[i]).toBe(b[i]);
    }
  });

  it('blokgewijze verwerking (live, 128 samples) == hele buffer (offline)', () => {
    // De kerngarantie: live worklet en offline bewerking zijn dezelfde DSP
    const source = sine(0.5, 1.5, 220);
    const offline = new Float32Array(source);
    applyLimiterToChannels([offline], SR);

    const kernel = createLimiterKernel(
      SR, LIMITER_CEILING, LIMITER_LOOKAHEAD_MS, LIMITER_ATTACK_MS, LIMITER_RELEASE_MS
    );
    const latency = kernel.latencySamples;
    const padded = new Float32Array(source.length + latency);
    padded.set(source);
    const blockOut = new Float32Array(padded.length);
    for (let start = 0; start < padded.length; start += 128) {
      const block = padded.slice(start, Math.min(start + 128, padded.length));
      kernel.processBlock([block]);
      blockOut.set(block, start);
    }
    // Vergelijk (blokresultaat is `latency` vertraagd)
    let maxDiff = 0;
    for (let i = 0; i < source.length; i++) {
      const d = Math.abs(offline[i] - blockOut[i + latency]);
      if (d > maxDiff) maxDiff = d;
    }
    expect(maxDiff).toBeLessThan(1e-6);
  });

  it('processor-code bevat de geëmbedde kernel en registratie', () => {
    const code = buildLimiterProcessorCode();
    expect(code).toContain('createLimiterKernel');
    expect(code).toContain("registerProcessor('soundscout-limiter'");
    expect(code).toContain(String(LIMITER_LOOKAHEAD_MS));
    expect(code).toContain(String(LIMITER_RELEASE_MS));
  });
});
