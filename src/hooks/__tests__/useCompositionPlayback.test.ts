/**
 * useCompositionPlayback (V2 Fase 1): de afspeelpositie gaat niet meer door
 * React-state. getBeat() is stabiel en geeft tijdens afspelen de hoorbare
 * positie, in rust de rustpositie.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const engine = vi.hoisted(() => ({
  audible: 0,
  current: 0,
  scheduled: false,
  endCallbacks: new Set<() => void>(),
}));

vi.mock('../../services/AudioService', () => ({
  audioService: {
    initialize: vi.fn(async () => undefined),
    loadSamples: vi.fn(async () => []),
    stop: vi.fn(() => { engine.scheduled = false; }),
    pause: vi.fn(),
    play: vi.fn(),
    seek: vi.fn(),
    setLoop: vi.fn(),
    scheduleTimeline: vi.fn(() => { engine.scheduled = true; }),
    hasActiveSchedule: () => engine.scheduled,
    getAudibleBeat: () => engine.audible,
    getCurrentBeat: () => engine.current,
    onPlaybackEnd: (cb: () => void) => {
      engine.endCallbacks.add(cb);
      return () => engine.endCallbacks.delete(cb);
    },
  },
}));

import { useCompositionPlayback } from '../useCompositionPlayback';
import { audioService } from '../../services/AudioService';
import { wrapBeat, previewPosition } from '../../services/audibleBeat';
import type { CompositionData } from '../../types';

const composition = (overrides: Partial<CompositionData> = {}) => ({
  tracks: [],
  samples: [],
  bpm: 120,
  totalBeats: 32,
  isLooping: false,
  ...overrides,
}) as unknown as CompositionData;

async function mount(data: CompositionData, options?: Parameters<typeof useCompositionPlayback>[1]) {
  let renders = 0;
  const view = renderHook(() => {
    renders += 1;
    return useCompositionPlayback(data, options);
  });
  // autoLoad loopt via setTimeout(0) + een async load
  await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
  return { view, renderCount: () => renders };
}

describe('wrapBeat', () => {
  it('begrenst op het einde zonder loop en nooit negatief', () => {
    expect(wrapBeat(10, 32, false)).toBe(10);
    expect(wrapBeat(40, 32, false)).toBe(32);
    expect(wrapBeat(-1, 32, false)).toBe(0);
    expect(wrapBeat(NaN, 32, false)).toBe(0);
  });

  it('loopt rond met loop', () => {
    expect(wrapBeat(40, 32, true)).toBe(8);
    expect(wrapBeat(32, 32, true)).toBe(0);
  });

  it('geeft 0 bij een lege compositie', () => {
    expect(wrapBeat(5, 0, true)).toBe(0);
    expect(wrapBeat(5, 0, false)).toBe(0);
  });
});

describe('previewPosition', () => {
  it('loopt van de start tot het einde en is daarna klaar', () => {
    expect(previewPosition(0, 1.5, 2)).toBe(1.5);
    expect(previewPosition(0.5, 1.5, 2)).toBe(2);
    expect(previewPosition(2, 1.5, 2)).toBeNull();
    expect(previewPosition(3, 1.5, 2)).toBeNull();
  });
});

describe('useCompositionPlayback — getBeat', () => {
  beforeEach(() => {
    engine.audible = 0;
    engine.current = 0;
    engine.scheduled = false;
    engine.endCallbacks.clear();
    vi.clearAllMocks();
  });

  it('getBeat is stabiel en de positie veroorzaakt geen renders', async () => {
    const { view, renderCount } = await mount(composition());
    expect(view.result.current.state).toBe('ready');
    const getBeat = view.result.current.getBeat;

    act(() => view.result.current.play());
    const rendersWhilePlaying = renderCount();

    engine.audible = 3;
    expect(view.result.current.getBeat()).toBe(3);
    engine.audible = 7.5;
    expect(view.result.current.getBeat()).toBe(7.5);

    expect(renderCount()).toBe(rendersWhilePlaying);
    expect(view.result.current.getBeat).toBe(getBeat);
    expect(view.result.current).not.toHaveProperty('currentBeat');
  });

  it('begrenst op het einde zonder loop en loopt rond met loop', async () => {
    const plain = await mount(composition({ isLooping: true }), { respectLoop: false });
    act(() => plain.view.result.current.play());
    engine.audible = 40;
    expect(plain.view.result.current.getBeat()).toBe(32);
    plain.view.unmount();

    const looping = await mount(composition({ isLooping: true }));
    act(() => looping.view.result.current.play());
    engine.audible = 40;
    expect(looping.view.result.current.getBeat()).toBe(8);
    expect(audioService.setLoop).toHaveBeenLastCalledWith(true, 32);
  });

  it('pauze bewaart de positie van de motor; hervatten start daar', async () => {
    const { view } = await mount(composition());
    act(() => view.result.current.play());
    engine.audible = 9.8;
    engine.current = 10;

    act(() => view.result.current.pause());
    expect(view.result.current.state).toBe('paused');
    engine.audible = 99; // rust: de hoorbare klok telt niet meer mee
    expect(view.result.current.getBeat()).toBe(10);

    act(() => view.result.current.play());
    expect(audioService.play).toHaveBeenLastCalledWith(10);
    expect(audioService.scheduleTimeline).toHaveBeenCalledTimes(1); // hervat op de bestaande Part
  });

  it('seek in rust verplaatst de positie; stop zet hem op 0', async () => {
    const { view } = await mount(composition());
    act(() => view.result.current.seek(12));
    expect(view.result.current.getBeat()).toBe(12);
    expect(audioService.seek).toHaveBeenCalledWith(12);

    act(() => view.result.current.play());
    expect(audioService.play).toHaveBeenLastCalledWith(12);

    act(() => view.result.current.stop());
    expect(view.result.current.getBeat()).toBe(0);
    expect(view.result.current.state).toBe('ready');
  });

  it('einde van de compositie: terug naar 0, klaar, en onEnded één keer', async () => {
    const onEnded = vi.fn();
    const { view } = await mount(composition(), { onEnded });
    act(() => view.result.current.play());
    engine.audible = 31;

    act(() => engine.endCallbacks.forEach((cb) => cb()));
    expect(view.result.current.state).toBe('ready');
    expect(view.result.current.getBeat()).toBe(0);
    expect(onEnded).toHaveBeenCalledTimes(1);
  });
});
