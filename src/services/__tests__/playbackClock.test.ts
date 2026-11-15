import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sanitizeLatency, secondsToAudibleBeat } from '../audibleBeat';
import { subscribeFrame, frameSubscriberCount } from '../frameLoop';

// playbackClock importeert AudioService (Tone); test de pure fabriek los.
vi.mock('../AudioService', () => ({ audioService: { getAudibleBeat: () => 0 } }));
import { createPlaybackClock } from '../playbackClock';

describe('audibleBeat', () => {
  it('gebruikt outputLatency als die bruikbaar is', () => {
    expect(sanitizeLatency(0.12, 0.01)).toBe(0.12);
  });

  it('valt terug op baseLatency en daarna op 0', () => {
    expect(sanitizeLatency(undefined, 0.02)).toBe(0.02);
    expect(sanitizeLatency(NaN, 0)).toBe(0);
    expect(sanitizeLatency(0, undefined)).toBe(0);
    expect(sanitizeLatency(-1, -1)).toBe(0);
  });

  it('begrenst onzinnig grote waarden (bv. verkeerde eenheid)', () => {
    expect(sanitizeLatency(40, 0)).toBe(0.5);
  });

  it('rekent seconden om naar tellen en wordt nooit negatief', () => {
    expect(secondsToAudibleBeat(1, 120)).toBe(2);
    expect(secondsToAudibleBeat(-0.2, 120)).toBe(0);
    expect(secondsToAudibleBeat(NaN, 120)).toBe(0);
  });
});

describe('createPlaybackClock', () => {
  it('geeft tijdens afspelen de hoorbare positie, in rust de rustpositie', () => {
    let playing = false;
    const clock = createPlaybackClock({
      isPlaying: () => playing,
      playingBeat: () => 12.5,
      restingBeat: () => 4,
    });
    expect(clock.getBeat()).toBe(4);
    playing = true;
    expect(clock.getBeat()).toBe(12.5);
    expect(clock.isPlaying()).toBe(true);
  });
});

describe('frameLoop', () => {
  let callbacks: Array<(t: number) => void>;

  beforeEach(() => {
    callbacks = [];
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
      callbacks.push(cb);
      return callbacks.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const tick = (t: number) => {
    const pending = callbacks;
    callbacks = [];
    pending.forEach((cb) => cb(t));
  };

  it('draait één lus voor alle abonnees', () => {
    const a = vi.fn(), b = vi.fn();
    const offA = subscribeFrame(a);
    const offB = subscribeFrame(b);
    expect(callbacks).toHaveLength(1); // één rAF, niet twee
    tick(16);
    expect(a).toHaveBeenCalledWith(16);
    expect(b).toHaveBeenCalledWith(16);
    offA();
    offB();
  });

  it('stopt zodra niemand meer luistert', () => {
    const off = subscribeFrame(vi.fn());
    expect(frameSubscriberCount()).toBe(1);
    off();
    expect(frameSubscriberCount()).toBe(0);
    tick(16);
    expect(callbacks).toHaveLength(0);
  });

  it('één falende abonnee legt de rest niet stil', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const good = vi.fn();
    const offBad = subscribeFrame(() => { throw new Error('kapot'); });
    const offGood = subscribeFrame(good);
    tick(16);
    expect(good).toHaveBeenCalled();
    expect(callbacks).toHaveLength(1); // lus loopt door
    offBad();
    offGood();
    err.mockRestore();
  });
});
