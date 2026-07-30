/**
 * Tests voor de pure patroon-event-generator (v2-principe: geen Tone-import,
 * dus volledig testbaar in jsdom — live en export putten uit dezelfde events).
 */

import { describe, it, expect } from 'vitest';
import type { Sample } from '../../types';
import type { SequencerSequence, SequencerTrack } from '../../types/sequencer';
import { SEQ_DECLICK_IN_SECONDS } from '../../types/sequencer';
import {
  eventsAtStep,
  generatePatternEvents,
  patternDurationSeconds,
} from '../sequencerEvents';

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
    id: overrides.id ?? 'track-a',
    sampleId: 'kick',
    steps: [true, false, false, false],
    mode: 'ring',
    ...overrides,
  };
}

function sequence(tracks: SequencerTrack[], lengthSteps = 4): SequencerSequence {
  return {
    id: 'seq-1',
    name: 'Test',
    lengthSteps,
    bpm: 120,
    tracks,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('generatePatternEvents', () => {
  it('genereert alleen events voor actieve stappen, met juiste timeOffsets', () => {
    const seq = sequence([track({ steps: [true, false, true, false] })]);
    const events = generatePatternEvents(seq, samples);
    expect(events).toHaveLength(2);
    // Bij 120 BPM: 1 vakje = 0.5 s
    expect(events[0]).toMatchObject({ stepIndex: 0, timeOffset: 0 });
    expect(events[1]).toMatchObject({ stepIndex: 2, timeOffset: 1.0 });
  });

  it('neemt trim op in de events (trimStart + effectieve duur + declick)', () => {
    const seq = sequence([
      track({ sampleId: 'zee', trimStart: 1.0, trimEnd: 2.5 }),
    ]);
    const [event] = generatePatternEvents(seq, samples);
    expect(event.trimStart).toBe(1.0);
    expect(event.duration).toBe(1.5);
    expect(event.declickIn).toBe(SEQ_DECLICK_IN_SECONDS);
  });

  it('geeft géén declick bij een ongetrimde start', () => {
    const [event] = generatePatternEvents(sequence([track()]), samples);
    expect(event.declickIn).toBe(0);
    expect(event.trimStart).toBe(0);
    expect(event.duration).toBe(0.4);
  });

  it('filtert gemute sporen en sporen zonder sample weg', () => {
    const seq = sequence([
      track({ mute: true }),
      track({ id: 'track-b', sampleId: null }),
    ]);
    expect(generatePatternEvents(seq, samples)).toHaveLength(0);
  });

  it('filtert sporen met een niet-geladen buffer via hasBuffer', () => {
    const seq = sequence([
      track(),
      track({ id: 'track-b', sampleId: 'zee' }),
    ]);
    const events = generatePatternEvents(seq, samples, {
      hasBuffer: (id) => id === 'kick',
    });
    expect(events).toHaveLength(1);
    expect(events[0].sampleId).toBe('kick');
  });

  it('slaat events met duur 0 over (kapotte trim)', () => {
    const seq = sequence([track({ trimStart: 3, trimEnd: 1, sampleId: 'zee' })]);
    expect(generatePatternEvents(seq, samples)).toHaveLength(0);
  });

  it('zet choke-vlag bij mode cut en neemt spoorvolume mee', () => {
    const seq = sequence([track({ mode: 'cut', volume: 0.5 })]);
    const [event] = generatePatternEvents(seq, samples);
    expect(event.choke).toBe(true);
    expect(event.gain).toBe(0.5);
  });

  it('is BPM-geparametriseerd (90 BPM → vakje = 2/3 s)', () => {
    const seq = { ...sequence([track({ steps: [false, true, false, false] })]), bpm: 90 };
    const [event] = generatePatternEvents(seq, samples);
    expect(event.timeOffset).toBeCloseTo(60 / 90, 10);
  });

  it('sorteert events op tijd en dan op spoorindex', () => {
    const seq = sequence([
      track({ id: 'a', steps: [false, true, false, false] }),
      track({ id: 'b', steps: [true, true, false, false], sampleId: 'zee' }),
    ]);
    const events = generatePatternEvents(seq, samples);
    expect(events.map((e) => `${e.stepIndex}:${e.trackId}`)).toEqual([
      '0:b',
      '1:a',
      '1:b',
    ]);
  });

  it('negeert stappen buiten lengthSteps (na verkorten)', () => {
    // steps-array is hier bewust langer dan lengthSteps
    const seq = sequence(
      [track({ steps: [false, false, true, true, true, true, true, true] })],
      4
    );
    const events = generatePatternEvents(seq, samples);
    expect(events.map((e) => e.stepIndex)).toEqual([2, 3]);
  });
});

describe('eventsAtStep', () => {
  it('geeft alleen de events van dat vakje', () => {
    const seq = sequence([
      track({ steps: [true, true, false, false] }),
      track({ id: 'b', sampleId: 'zee', steps: [false, true, false, false] }),
    ]);
    const events = generatePatternEvents(seq, samples);
    expect(eventsAtStep(events, 1)).toHaveLength(2);
    expect(eventsAtStep(events, 2)).toHaveLength(0);
  });
});

describe('patternDurationSeconds', () => {
  it('16 vakjes op 120 BPM = 8 seconden', () => {
    const seq = sequence([track()], 16);
    expect(patternDurationSeconds(seq)).toBe(8);
  });
});
