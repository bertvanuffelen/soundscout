/**
 * V2 Fase 4 — bake-recepten: sleutels, caching/ontdubbeling en de pure DSP
 * (reverse, bandsnelheid).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NEUTRAL_RECIPE,
  applySyncStage,
  clipRecipe,
  isNeutralRecipe,
  normalizeRecipe,
  recipeKey,
  recipeLengthFactor,
  resampleChannels,
  resampledLength,
  reverseChannels,
  syncStageOf,
} from '../bakeRecipe';
import { pitchKey } from '../audio/memoryBudget';
import { PitchBufferService } from '../PitchBufferService';
import { DecodedAudioBudget } from '../audio/memoryBudget';

// --- Minimale AudioBuffer voor jsdom ---
class FakeAudioBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  private data: Float32Array[];
  constructor({ numberOfChannels, length, sampleRate }: { numberOfChannels: number; length: number; sampleRate: number }) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.data = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }
  get duration() { return this.length / this.sampleRate; }
  getChannelData(c: number) { return this.data[c]; }
  copyToChannel(src: Float32Array, c: number) { this.data[c].set(src); }
}

function ramp(n: number): AudioBuffer {
  const b = new FakeAudioBuffer({ numberOfChannels: 1, length: n, sampleRate: 1000 });
  for (let i = 0; i < n; i++) b.getChannelData(0)[i] = i / n;
  return b as unknown as AudioBuffer;
}

describe('recipeKey', () => {
  it('pitch-only recept = exact de oude pitch-sleutel (pins/statistiek ongewijzigd)', () => {
    expect(recipeKey('koe', { ...NEUTRAL_RECIPE, pitch: 5 })).toBe(pitchKey('koe', 5));
    expect(recipeKey('koe', { ...NEUTRAL_RECIPE, pitch: -7 })).toBe('koe|-7');
  });

  it('elk recept-onderdeel geeft een eigen sleutel', () => {
    const keys = new Set([
      recipeKey('a', { ...NEUTRAL_RECIPE, pitch: 2 }),
      recipeKey('a', { ...NEUTRAL_RECIPE, pitch: 2, stretch: 4 / 3 }),
      recipeKey('a', { ...NEUTRAL_RECIPE, pitch: 2, speed: 2 }),
      recipeKey('a', { ...NEUTRAL_RECIPE, pitch: 2, reverse: true }),
      recipeKey('b', { ...NEUTRAL_RECIPE, pitch: 2 }),
    ]);
    expect(keys.size).toBe(5);
  });

  it('float-ruis geeft geen dubbele bakes', () => {
    const a = recipeKey('a', { ...NEUTRAL_RECIPE, stretch: 120 / 90 });
    const b = recipeKey('a', { ...NEUTRAL_RECIPE, stretch: 1.3333333333333335 });
    expect(a).toBe(b);
  });

  it('normalizeRecipe maakt rommel neutraal', () => {
    expect(normalizeRecipe({ pitch: NaN, stretch: -1, speed: 0 })).toEqual(NEUTRAL_RECIPE);
    expect(isNeutralRecipe(normalizeRecipe(undefined))).toBe(true);
  });
});

describe('clipRecipe', () => {
  const sfx = { id: 'koe' };
  const loop = { id: 'drums', kind: 'loop' as const };

  it('geen effecten, sfx of 120 BPM → geen recept (geen bake)', () => {
    expect(clipRecipe({ effects: undefined }, sfx, 90)).toBeUndefined();
    expect(clipRecipe({ effects: undefined }, loop, 120)).toBeUndefined();
  });

  it('loop bij 90 BPM wordt uitgerekt, sfx niet', () => {
    expect(clipRecipe({}, loop, 90)?.stretch).toBeCloseTo(4 / 3, 6);
    expect(clipRecipe({}, sfx, 90)).toBeUndefined();
  });

  it('speed × pitch: beide in het recept, lengte alleen door speed + stretch', () => {
    const r = clipRecipe({ effects: { volume: 0, pitch: 3, reverb: 0, fadeIn: 0, fadeOut: 0, speed: 2, reverse: true } }, loop, 135)!;
    expect(r).toMatchObject({ pitch: 3, speed: 2, reverse: true });
    expect(r.stretch).toBeCloseTo(120 / 135, 6);
    expect(recipeLengthFactor(r)).toBeCloseTo(120 / 135 / 2, 6);
    expect(syncStageOf(r)).toEqual({ pitch: 0, stretch: 1, speed: 2, reverse: true });
  });

  it('ongeldige speed telt als 1', () => {
    const fx = { volume: 0, pitch: 0, reverb: 0, fadeIn: 0, fadeOut: 0, speed: 3 as unknown as 2 };
    expect(clipRecipe({ effects: fx }, sfx, 120)).toBeUndefined();
  });
});

describe('DSP', () => {
  it('reverse keert de monsters om en laat de bron intact', () => {
    const src = new Float32Array([1, 2, 3, 4]);
    const [out] = reverseChannels([src]);
    expect([...out]).toEqual([4, 3, 2, 1]);
    expect([...src]).toEqual([1, 2, 3, 4]);
  });

  it('bandsnelheid: lengte = bron / speed, deterministisch', () => {
    const src = new Float32Array(1000).map((_, i) => Math.sin(i / 10));
    expect(resampledLength(1000, 2)).toBe(500);
    expect(resampledLength(1000, 0.75)).toBe(1333);
    const a = applySyncStage([src], { ...NEUTRAL_RECIPE, speed: 1.5 });
    const b = applySyncStage([src], { ...NEUTRAL_RECIPE, speed: 1.5 });
    expect(a[0].length).toBe(667);
    expect(a[0]).toEqual(b[0]);
  });

  it('resample met speed 0.5 interpoleert tussen de bronmonsters', () => {
    const [out] = resampleChannels([new Float32Array([0, 1, 2, 3, 4, 5, 6, 7])], 0.5);
    expect(out.length).toBe(16);
    expect(out[2]).toBeCloseTo(1, 6);
    expect(out[3]).toBeCloseTo(1.5, 6); // lineair verloop → Hermite exact
  });
});

describe('PitchBufferService — recepten cachen en ontdubbelen', () => {
  let service: PitchBufferService;

  beforeEach(() => {
    (globalThis as Record<string, unknown>).AudioBuffer = FakeAudioBuffer;
    service = new PitchBufferService(new DecodedAudioBudget());
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as Record<string, unknown>).AudioBuffer;
  });

  it('async stap: parallelle aanvragen = één render, daarna uit de cache', async () => {
    const render = vi
      .spyOn(service as unknown as { renderPitched: (s: AudioBuffer, p: number, t?: number) => Promise<AudioBuffer> }, 'renderPitched')
      .mockImplementation(async (s) => s);
    const source = ramp(100);
    const recipe = { ...NEUTRAL_RECIPE, stretch: 4 / 3 };
    const [a, b] = await Promise.all([
      service.bakeRecipe('loop', recipe, source),
      service.bakeRecipe('loop', recipe, source),
    ]);
    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith(source, 0, recipe.stretch);
    expect(a).toBe(b);
    expect(service.getBakedRecipe('loop', recipe)).toBe(a);
    await service.bakeRecipe('loop', recipe, source);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('pitch-only gaat door de oude renderPitched(source, semitonen) — ongewijzigd', async () => {
    const render = vi
      .spyOn(service as unknown as { renderPitched: (s: AudioBuffer, p: number, t?: number) => Promise<AudioBuffer> }, 'renderPitched')
      .mockImplementation(async (s) => s);
    await service.bake('koe', 5, ramp(10));
    expect(render).toHaveBeenCalledWith(expect.anything(), 5, 1);
    expect(service.getBaked('koe', 5)).toBeDefined();
  });

  it('reverse + speed zijn synchroon en exact (geen worklet nodig)', async () => {
    const render = vi.spyOn(service as unknown as { renderPitched: () => Promise<AudioBuffer> }, 'renderPitched');
    const out = await service.bakeRecipe('x', { ...NEUTRAL_RECIPE, reverse: true }, ramp(4));
    expect(render).not.toHaveBeenCalled();
    expect([...out!.getChannelData(0)]).toEqual([0.75, 0.5, 0.25, 0]);
  });

  it('reverse + pitch: Signalsmith krijgt de al omgekeerde buffer', async () => {
    const render = vi
      .spyOn(service as unknown as { renderPitched: (s: AudioBuffer, p: number, t?: number) => Promise<AudioBuffer> }, 'renderPitched')
      .mockImplementation(async (s) => s);
    await service.bakeRecipe('x', { ...NEUTRAL_RECIPE, reverse: true, pitch: 4 }, ramp(4));
    const input = render.mock.calls[0][0];
    expect(input.getChannelData(0)[0]).toBeCloseTo(0.75, 6);
  });

  it('resolvePlan zonder bake: tape-terugval voor stretch houdt de timing', () => {
    const source = ramp(100);
    const plan = service.resolvePlan('loop', { ...NEUTRAL_RECIPE, stretch: 4 / 3 }, undefined, source, 4, 8);
    expect(plan.buffer).toBe(source);
    expect(plan.playbackRate).toBeCloseTo(0.75, 6);
    // buffer-seconden; Tone.Player deelt de duur door de rate → 8 s echt
    expect(plan.offset).toBeCloseTo(3, 6);
    expect(plan.duration / plan.playbackRate).toBeCloseTo(8, 6);
  });

  it('resolvePlan zonder bake: pitch valt terug op PitchShift in de keten', () => {
    const plan = service.resolvePlan('koe', { ...NEUTRAL_RECIPE, pitch: 5 }, undefined, ramp(10), 0, 1);
    expect(plan.effects?.pitch).toBe(5);
    expect(plan.playbackRate).toBe(1);
  });

  it('resolvePlan met bake: geen pitch meer in de keten, offsets ongewijzigd', async () => {
    vi.spyOn(service as unknown as { renderPitched: (s: AudioBuffer) => Promise<AudioBuffer> }, 'renderPitched')
      .mockImplementation(async (s) => s);
    const recipe = { ...NEUTRAL_RECIPE, pitch: 5 };
    const baked = await service.bakeRecipe('koe', recipe, ramp(10));
    const plan = service.resolvePlan('koe', recipe, { pitch: 5, reverb: 30, fadeIn: 0, fadeOut: 0 }, ramp(10), 1, 2);
    expect(plan.buffer).toBe(baked);
    expect(plan.effects).toEqual({ pitch: 0, reverb: 30, fadeIn: 0, fadeOut: 0 });
    expect([plan.offset, plan.duration, plan.playbackRate]).toEqual([1, 2, 1]);
  });

  it('prune ruimt recepten op per sample (ook sleutels met meerdere |)', async () => {
    await service.bakeRecipe('x', { ...NEUTRAL_RECIPE, reverse: true, speed: 2 }, ramp(8));
    expect(service.size).toBe(1);
    service.prune(new Set(['y']));
    expect(service.size).toBe(0);
  });
});
