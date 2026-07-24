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

describe('analyzeRender — herkalibratie 24-7 (alleen echte glitch-signaturen)', () => {
  it('keurt een schone sinus goed', () => {
    const result = analyzeRender({ channelData: [cleanSine(2)], sampleRate: SR });
    expect(result.suspicious).toBe(false);
    expect(result.clickCount).toBe(0);
    expect(result.clickTrain).toBe(false);
    expect(result.maxJump).toBeLessThan(0.1);
    expect(result.reasons).toEqual([]);
  });

  it('telt losse kliks informatief, zonder af te keuren', () => {
    const data = cleanSine(2);
    injectClick(data, 0.5, 0.25);
    injectClick(data, 1.3, 0.25);
    const result = analyzeRender({ channelData: [data], sampleRate: SR });
    expect(result.clickCount).toBeGreaterThan(0);
    expect(result.clickTrain).toBe(false);
    expect(result.suspicious).toBe(false);
  });

  it('keurt VEEL onregelmatige transiënten NIET af (drums zijn muziek, geen glitch)', () => {
    // Nabootsing van Berts eerste echte export: honderden sprongen 0.35-0.55
    // op onregelmatige muzikale posities — géén afkeuring waard
    // (zachte drager zodat klik+draaggolf onder de extreme-drempel blijft)
    const data = cleanSine(10, 0.2);
    let t = 0.13;
    const irregular = [0.31, 0.17, 0.23, 0.41, 0.19, 0.29, 0.37];
    for (let i = 0; t < 9.5; i++) {
      injectClick(data, t, 0.27); // sprong ~0.54
      t += irregular[i % irregular.length];
    }
    const result = analyzeRender({ channelData: [data], sampleRate: SR });
    expect(result.clickCount).toBeGreaterThan(20);
    expect(result.clickTrain).toBe(false);
    expect(result.suspicious).toBe(false);
  });

  it('keurt een REGELMATIG drumritme niet af (16e noten @120bpm = 125ms)', () => {
    const data = cleanSine(4);
    for (let t = 0.2; t < 3.8; t += 0.125) {
      injectClick(data, t, 0.3);
    }
    const result = analyzeRender({ channelData: [data], sampleRate: SR });
    // 8 Hz is muzikaal tempo-gebied, buiten het korrelbereik (9-50 Hz)
    expect(result.clickTrain).toBe(false);
    expect(result.suspicious).toBe(false);
  });

  it('herkent een 12Hz-klik-trein (PitchShift-signatuur)', () => {
    const data = cleanSine(2);
    for (let t = 0.2; t < 1.8; t += 1 / 12) {
      injectClick(data, t, 0.3);
    }
    const result = analyzeRender({ channelData: [data], sampleRate: SR });
    expect(result.clickTrain).toBe(true);
    expect(result.suspicious).toBe(true);
    expect(result.clickTrainIntervalSec).not.toBeNull();
    expect(1 / result.clickTrainIntervalSec!).toBeGreaterThan(9);
    expect(1 / result.clickTrainIntervalSec!).toBeLessThan(15);
    expect(result.reasons.join(' ')).toContain('klik-trein');
  });

  it('herkent óók een korte 12Hz-passage van ~0.4s (zoals Berts glitch-bestand)', () => {
    // Test-23-7 had 5 klik-clusters op 2.304/2.387/2.471/2.554/2.638s
    const data = cleanSine(5);
    [2.304, 2.387, 2.471, 2.554, 2.638].forEach((t) => injectClick(data, t, 0.35));
    // plus wat losse muzikale transiënten elders — mogen niet storen
    [0.5, 1.2, 3.9, 4.4].forEach((t) => injectClick(data, t, 0.25));
    const result = analyzeRender({ channelData: [data], sampleRate: SR });
    expect(result.clickTrain).toBe(true);
    expect(result.suspicious).toBe(true);
  });

  it('keurt af op VEEL extreme sprongen (catastrofale modus, amplitude ~2x)', () => {
    const data = cleanSine(2);
    // 12 extreme sprongen ≥0.9 op onregelmatige posities
    const times = [0.2, 0.33, 0.51, 0.68, 0.79, 0.97, 1.14, 1.29, 1.42, 1.61, 1.75, 1.88];
    times.forEach((t) => {
      const i = Math.round(t * SR);
      data[i] = 0.95;
      data[i + 1] = -0.95;
    });
    const result = analyzeRender({ channelData: [data], sampleRate: SR });
    expect(result.extremeJumpCount).toBeGreaterThanOrEqual(10);
    expect(result.suspicious).toBe(true);
    expect(result.reasons.join(' ')).toContain('extreme sprongen');
  });

  it('keurt één losse extreme sprong NIET af (kan hard muzikaal materiaal zijn)', () => {
    const data = cleanSine(1);
    const i = Math.round(0.5 * SR);
    data[i] = 0.95;
    data[i + 1] = -0.95; // sprong van 1.9
    const result = analyzeRender({ channelData: [data], sampleRate: SR });
    expect(result.maxJump).toBeGreaterThan(1.5);
    expect(result.extremeJumpCount).toBeLessThan(10);
    expect(result.suspicious).toBe(false);
  });

  it('meet peak en bijna-clipping', () => {
    const data = cleanSine(1, 0.999);
    const result = analyzeRender({ channelData: [data], sampleRate: SR });
    expect(result.peak).toBeGreaterThan(0.98);
    expect(result.nearClipSamples).toBeGreaterThan(0);
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
    for (let t = 0.2; t < 1.8; t += 1 / 12) injectClick(data, t, 0.3);
    const bad = analyzeRender({ channelData: [data], sampleRate: SR });
    expect(formatRenderAnalysis(bad)).toContain('VERDACHT');
  });
});
