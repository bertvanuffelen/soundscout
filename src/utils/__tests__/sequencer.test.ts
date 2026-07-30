/**
 * Tests voor de pure sequencer-helpers.
 */

import { describe, it, expect } from 'vitest';
import type { Sample } from '../../types';
import {
  clampLengthSteps,
  createDefaultSequence,
  createEmptyTrack,
  effectiveDuration,
  resizeSteps,
  stepSpanCells,
} from '../sequencer';
import {
  SEQ_DEFAULT_BPM,
  SEQ_DEFAULT_STEPS,
  SEQ_DEFAULT_TRACKS,
  SEQ_MAX_STEPS,
  SEQ_MIN_STEPS,
} from '../../types/sequencer';

const sample = (duration: number): Sample => ({
  id: 'test-sample',
  name: 'samples.test',
  locationId: 'loc',
  audioUrl: '/audio/test.mp3',
  duration,
  icon: 'Bird',
  color: '#FF5733',
});

describe('resizeSteps', () => {
  it('kapt af bij verkorten en behoudt de eerste stappen', () => {
    expect(resizeSteps([true, false, true, true], 2)).toEqual([true, false]);
  });

  it('vult aan met false bij verlengen', () => {
    expect(resizeSteps([true, true], 4)).toEqual([true, true, false, false]);
  });

  it('laat gelijke lengte ongemoeid', () => {
    expect(resizeSteps([true, false], 2)).toEqual([true, false]);
  });
});

describe('effectiveDuration', () => {
  it('geeft volledige duur zonder trim', () => {
    expect(effectiveDuration(sample(4))).toBe(4);
  });

  it('past trimStart en trimEnd toe', () => {
    expect(effectiveDuration(sample(4), 1, 3)).toBe(2);
  });

  it('klemt trimEnd op de sampleduur', () => {
    expect(effectiveDuration(sample(4), 1, 99)).toBe(3);
  });

  it('geeft nooit negatief (kapotte trim)', () => {
    expect(effectiveDuration(sample(4), 3, 1)).toBe(0);
  });
});

describe('stepSpanCells', () => {
  // Bij 120 BPM duurt 1 vakje (1 tel) 0.5 s
  it('kort geluid → 1 vakje', () => {
    expect(stepSpanCells(0.4, 120)).toBe(1);
  });

  it('0.6 s → 2 vakjes', () => {
    expect(stepSpanCells(0.6, 120)).toBe(2);
  });

  it('2.0 s → 4 vakjes', () => {
    expect(stepSpanCells(2.0, 120)).toBe(4);
  });

  it('altijd minimaal 1 vakje, ook bij duur 0', () => {
    expect(stepSpanCells(0, 120)).toBe(1);
  });

  it('is BPM-geparametriseerd (60 BPM → 1 vakje = 1 s)', () => {
    expect(stepSpanCells(2.0, 60)).toBe(2);
  });
});

describe('clampLengthSteps', () => {
  it('klemt op minimum en maximum', () => {
    expect(clampLengthSteps(0)).toBe(SEQ_MIN_STEPS);
    expect(clampLengthSteps(999)).toBe(SEQ_MAX_STEPS);
    expect(clampLengthSteps(20)).toBe(20);
  });
});

describe('createDefaultSequence / createEmptyTrack', () => {
  it('maakt een sequence met 3 lege sporen van 16 vakjes op 120 BPM', () => {
    const seq = createDefaultSequence('Test');
    expect(seq.name).toBe('Test');
    expect(seq.lengthSteps).toBe(SEQ_DEFAULT_STEPS);
    expect(seq.bpm).toBe(SEQ_DEFAULT_BPM);
    expect(seq.tracks).toHaveLength(SEQ_DEFAULT_TRACKS);
    for (const track of seq.tracks) {
      expect(track.sampleId).toBeNull();
      expect(track.mode).toBe('ring');
      expect(track.steps).toHaveLength(SEQ_DEFAULT_STEPS);
      expect(track.steps.every((s) => s === false)).toBe(true);
    }
  });

  it('geeft sporen unieke ids', () => {
    const seq = createDefaultSequence('Test');
    const ids = new Set(seq.tracks.map((t) => t.id));
    expect(ids.size).toBe(seq.tracks.length);
  });

  it('createEmptyTrack volgt de gevraagde lengte', () => {
    expect(createEmptyTrack(8).steps).toHaveLength(8);
  });
});
