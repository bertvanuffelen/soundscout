/**
 * Tests voor SequencerEngine — de Clock-callback wordt handmatig aangeroepen
 * met fake times, zodat we sample-accurate scheduling, trim-args, declick,
 * choke, wraparound en mute kunnen verifiëren zonder echte AudioContext.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as Tone from 'tone';
import type { Sample } from '../../types';
import type { SequencerSequence, SequencerTrack } from '../../types/sequencer';
import { SequencerEngine } from '../SequencerEngine';
import { useSequencerStore } from '../../stores/sequencerStore';

const samples: Sample[] = [
  {
    id: 'kick',
    name: 'samples.kick',
    locationId: 'loc',
    audioUrl: '/audio/kick.mp3',
    duration: 0.4,
    icon: 'Drum',
    color: '#111111',
  },
  {
    id: 'zee',
    name: 'samples.zee',
    locationId: 'loc',
    audioUrl: '/audio/zee.mp3',
    duration: 4.0,
    icon: 'Waves',
    color: '#2266AA',
  },
];

function track(overrides: Partial<SequencerTrack> = {}): SequencerTrack {
  return {
    id: 'track-a',
    sampleId: 'kick',
    steps: [true, false, false, false],
    mode: 'ring',
    ...overrides,
  };
}

function seedSequence(tracks: SequencerTrack[], lengthSteps = 4): void {
  const seq: SequencerSequence = {
    id: 'seq-1',
    name: 'Test',
    lengthSteps,
    bpm: 120,
    tracks,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  useSequencerStore.setState({
    sequences: [seq],
    activeSequenceId: seq.id,
    isPlaying: false,
    hasHydrated: true,
  });
}

/** Mock-helpers */
const ClockMock = vi.mocked(Tone.Clock);
const PlayerMock = vi.mocked(Tone.Player);

function clockCallback(): (time: number) => void {
  const call = ClockMock.mock.calls.at(-1);
  if (!call) throw new Error('Clock niet geconstrueerd');
  return call[0] as (time: number) => void;
}

function playerInstance(index: number) {
  const result = PlayerMock.mock.results[index];
  if (!result) throw new Error(`Geen player-instantie ${index}`);
  return result.value as {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    fadeIn: number;
    fadeOut: number;
    onstop?: () => void;
  };
}

async function makeEngine(tracks: SequencerTrack[], lengthSteps = 4) {
  seedSequence(tracks, lengthSteps);
  const engine = new SequencerEngine();
  engine.setSamples(samples);
  await engine.ensureBuffer(samples[0]);
  await engine.ensureBuffer(samples[1]);
  await engine.start();
  return engine;
}

describe('SequencerEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('start() maakt een eigen Clock op bpm/60 Hz (geen Tone.Transport)', async () => {
    const engine = await makeEngine([track()]);
    expect(ClockMock).toHaveBeenCalledTimes(1);
    const clockArgs = ClockMock.mock.calls[0] as unknown as [unknown, number];
    expect(clockArgs[1]).toBe(2); // 120 BPM → 2 Hz
    expect(vi.mocked(Tone.getTransport)).not.toHaveBeenCalled();
    expect(engine.isPlaying).toBe(true);
  });

  it('tick spawnt alleen players voor actieve stappen, gestart op het door de klok geleverde time-argument', async () => {
    await makeEngine([track({ steps: [true, false, true, false] })]);
    const tick = clockCallback();

    tick(1.0); // stap 0 → actief
    expect(PlayerMock).toHaveBeenCalledTimes(1);
    expect(playerInstance(0).start).toHaveBeenCalledWith(1.0, 0, 0.4);

    tick(1.5); // stap 1 → leeg
    expect(PlayerMock).toHaveBeenCalledTimes(1);

    tick(2.0); // stap 2 → actief
    expect(PlayerMock).toHaveBeenCalledTimes(2);
    expect(playerInstance(1).start).toHaveBeenCalledWith(2.0, 0, 0.4);
  });

  it('trim komt terug in start(time, trimStart, duur) + declick-fade-in', async () => {
    await makeEngine([
      track({ sampleId: 'zee', trimStart: 1.0, trimEnd: 2.5 }),
    ]);
    clockCallback()(3.0);

    const player = playerInstance(0);
    expect(player.start).toHaveBeenCalledWith(3.0, 1.0, 1.5);
    expect(player.fadeIn).toBeCloseTo(0.003, 10);
    expect(player.fadeOut).toBeCloseTo(0.01, 10);
  });

  it("choke ('cut'): een nieuwe stap stopt de vorige player op hetzelfde spoor", async () => {
    await makeEngine([
      track({ mode: 'cut', steps: [true, true, false, false] }),
    ]);
    const tick = clockCallback();

    tick(0.5); // stap 0
    tick(1.0); // stap 1 → moet player van stap 0 stoppen
    expect(playerInstance(0).stop).toHaveBeenCalledWith(1.0);
    expect(PlayerMock).toHaveBeenCalledTimes(2);
  });

  it("'ring' laat de vorige player uitklinken (geen stop)", async () => {
    await makeEngine([
      track({ mode: 'ring', steps: [true, true, false, false] }),
    ]);
    const tick = clockCallback();
    tick(0.5);
    tick(1.0);
    expect(playerInstance(0).stop).not.toHaveBeenCalled();
  });

  it('wraparound: na lengthSteps ticks begint de teller opnieuw', async () => {
    const engine = await makeEngine([track({ steps: [false, false, false, false] })]);
    const tick = clockCallback();
    for (let i = 0; i < 4; i++) tick(i * 0.5);
    expect(engine.getCurrentStep()).toBe(3);
    tick(2.0);
    expect(engine.getCurrentStep()).toBe(0);
  });

  it('gemute sporen en sporen zonder geladen buffer spawnen niets', async () => {
    const engine = await makeEngine([track({ mute: true })]);
    clockCallback()(1.0);
    expect(PlayerMock).not.toHaveBeenCalled();
    engine.stop();
  });

  it('live editing: een tijdens het afspelen aangezette stap klinkt bij de eerstvolgende tick', async () => {
    await makeEngine([track({ steps: [false, false, false, false] })]);
    const tick = clockCallback();
    tick(0.5); // stap 0, niets
    expect(PlayerMock).not.toHaveBeenCalled();

    // Leerling klikt stap 1 aan tijdens het afspelen
    const trackId = useSequencerStore.getState().activeSequence()?.tracks[0].id;
    useSequencerStore.getState().toggleStep(trackId as string, 1);

    tick(1.0); // stap 1 → klinkt direct
    expect(PlayerMock).toHaveBeenCalledTimes(1);
  });

  it('verkorten tijdens afspelen vouwt de playhead terug (modulo op verse lengte)', async () => {
    const engine = await makeEngine([track({ steps: Array(8).fill(false) })], 8);
    const tick = clockCallback();
    for (let i = 0; i < 6; i++) tick(i * 0.5); // stepIndex → 6
    useSequencerStore.getState().setLength(-4); // 8 → 4 vakjes
    tick(3.0);
    expect(engine.getCurrentStep()).toBe(2); // 6 % 4
  });

  it('stop() stopt de klok en alle klinkende players en reset de playhead', async () => {
    const engine = await makeEngine([track({ steps: [true, true, true, true] })]);
    const tick = clockCallback();
    tick(0.5);
    tick(1.0);

    engine.stop();

    const clockInstance = ClockMock.mock.results[0].value as {
      stop: ReturnType<typeof vi.fn>;
      dispose: ReturnType<typeof vi.fn>;
    };
    expect(clockInstance.stop).toHaveBeenCalled();
    expect(clockInstance.dispose).toHaveBeenCalled();
    expect(playerInstance(0).stop).toHaveBeenCalled();
    expect(playerInstance(1).stop).toHaveBeenCalled();
    expect(engine.isPlaying).toBe(false);
    expect(engine.getCurrentStep()).toBe(0);
  });

  it('onstop-callback disposet de player (fire-and-forget lifecycle)', async () => {
    await makeEngine([track()]);
    clockCallback()(1.0);
    const player = playerInstance(0);
    expect(player.onstop).toBeDefined();
    player.onstop?.();
    expect(
      (player as unknown as { dispose: ReturnType<typeof vi.fn> }).dispose
    ).toHaveBeenCalled();
  });

  it('previewSample maakt een losse player met directe start', async () => {
    seedSequence([track()]);
    const engine = new SequencerEngine();
    engine.setSamples(samples);
    await engine.previewSample(samples[0]);
    expect(PlayerMock).toHaveBeenCalledTimes(1);
    expect(playerInstance(0).start).toHaveBeenCalledWith('+0.05');
  });

  it('mislukte bufferlading degradeert netjes (geen crash, spoor stil)', async () => {
    seedSequence([track()]);
    const engine = new SequencerEngine();
    engine.setSamples(samples);

    // Laat de eerstvolgende buffer-load falen
    const BufferMock = vi.mocked(Tone.ToneAudioBuffer);
    BufferMock.mockImplementationOnce(function () {
      return {
        load: vi.fn().mockRejectedValue(new Error('404')),
        loaded: false,
        duration: 0,
        get: vi.fn().mockReturnValue(null),
        dispose: vi.fn(),
      } as unknown as Tone.ToneAudioBuffer;
    });

    await engine.ensureBuffer(samples[0]);
    expect(engine.hasBuffer('kick')).toBe(false);

    await engine.start();
    clockCallback()(1.0);
    expect(PlayerMock).not.toHaveBeenCalled();
  });
});
