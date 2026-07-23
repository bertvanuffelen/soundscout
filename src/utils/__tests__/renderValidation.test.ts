import { describe, it, expect } from 'vitest';
import { analyzeRender, formatRenderAnalysis } from '../renderValidation';

const SR = 44100;

/** 440Hz-sinus met randfades — gegarandeerd zonder discontinuïteiten */
function cleanSine(seconds: number, amplitude = 0.8): Float32Array {
  const n = Math.round(SR * seconds);
  const data = new Float32Array(n);
  const fade = Math.round(SR * 0.02);
  for (let i = 0; i < n; i++) {
    let a = amplitude;
    if (i < fade) a *= i / fade;
    if (i > n - fade) a *= (n - i) / fade;
    data[i] = a * Math.sin((2 * Math.PI * 440 * i) / SR);
  }
  return data;
}

/** Injecteer een harde sprong (klik) op tijdstip t */
function injectClick(data: Float32Array, tSec: number, size = 0.8): void {
  const i = Math.round(tSec * SR);
  for (let k = 0; k < 4; k++) {
    if (i + k < data.length) data[i + k] = size * (k % 2 === 0 ? 1 : -1);
  }
}

describe('analyzeRender', () => {
  it('keurt een schone sinus goed', () => {
    const result = analyzeRender({ channelData: [cleanSine(2)], sampleRate: SR });
    expect(result.suspicious).toBe(false);
    expect(result.clickCount).toBe(0);
    expect(result.clickTrain).toBe(false);
    expect(result.maxJump).toBeLessThan(0.1);
    expect(result.reasons).toEqual([]);
  });

  it('telt losse kliks maar keurt 1-2 inherente korrelklikjes niet af', () => {
    const data = cleanSine(2);
    // realistische korrelklikjes: sprong ~0.5 (zoals gemeten in onderzoek §15.2)
    injectClick(data, 0.5, 0.25);
    injectClick(data, 1.3, 0.25);
    const result = analyzeRender({ channelData: [data], sampleRate: SR });
    expect(result.clickCount).toBeGreaterThan(0);
    expect(result.clickTrain).toBe(false);
    // een paar losse klikjes (inherent granulair artefact) is geen afkeuring
    expect(result.suspicious).toBe(false);
  });

  it('herkent een 12Hz-klik-trein (PitchShift-signatuur)', () => {
    const data = cleanSine(2);
    for (let t = 0.2; t < 1.8; t += 1 / 12) {
      injectClick(data, t, 0.6);
    }
    const result = analyzeRender({ channelData: [data], sampleRate: SR });
    expect(result.clickTrain).toBe(true);
    expect(result.suspicious).toBe(true);
    expect(result.clickTrainIntervalSec).not.toBeNull();
    // interval ~1/12s → frequentie ~12Hz
    expect(1 / result.clickTrainIntervalSec!).toBeGreaterThan(9);
    expect(1 / result.clickTrainIntervalSec!).toBeLessThan(15);
    expect(result.reasons.join(' ')).toContain('klik-trein');
  });

  it('keurt af op extreem veel kliks, ook zonder regelmaat', () => {
    const data = cleanSine(3);
    // 25 kliks op onregelmatige (niet-treinvormige) posities
    const irregular = [0.11, 0.13, 0.45, 0.46, 0.9, 1.5, 1.52, 1.9, 2.0, 2.05,
      2.3, 2.31, 2.5, 2.52, 2.7, 2.71, 2.8, 2.81, 2.85, 2.86, 2.9, 2.91, 2.95, 2.96, 2.98];
    irregular.forEach((t) => injectClick(data, t, 0.7));
    const result = analyzeRender({ channelData: [data], sampleRate: SR });
    expect(result.clickCount).toBeGreaterThanOrEqual(20);
    expect(result.suspicious).toBe(true);
  });

  it('keurt af op een extreme sprong (catastrofale modus, amplitude ~2x)', () => {
    const data = cleanSine(1);
    const i = Math.round(0.5 * SR);
    data[i] = 0.95;
    data[i + 1] = -0.95; // sprong van 1.9
    const result = analyzeRender({ channelData: [data], sampleRate: SR });
    expect(result.maxJump).toBeGreaterThan(1.5);
    expect(result.suspicious).toBe(true);
  });

  it('meet peak en bijna-clipping', () => {
    const data = cleanSine(1, 0.999);
    const result = analyzeRender({ channelData: [data], sampleRate: SR });
    expect(result.peak).toBeGreaterThan(0.98);
    expect(result.nearClipSamples).toBeGreaterThan(0);
    // luid maar continu → niet verdacht
    expect(result.suspicious).toBe(false);
  });

  it('analyseert meerdere kanalen samen', () => {
    const left = cleanSine(1);
    const right = cleanSine(1);
    injectClick(right, 0.4);
    const result = analyzeRender({ channelData: [left, right], sampleRate: SR });
    expect(result.clickCount).toBeGreaterThan(0);
  });

  it('formatteert een leesbare logregel', () => {
    const clean = analyzeRender({ channelData: [cleanSine(1)], sampleRate: SR });
    expect(formatRenderAnalysis(clean)).toContain('schoon');
    const data = cleanSine(2);
    for (let t = 0.2; t < 1.8; t += 1 / 12) injectClick(data, t, 0.6);
    const bad = analyzeRender({ channelData: [data], sampleRate: SR });
    expect(formatRenderAnalysis(bad)).toContain('VERDACHT');
  });
});
