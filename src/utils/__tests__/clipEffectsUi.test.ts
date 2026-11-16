/**
 * V2 Fase 4 — hulpjes voor Vervormen en het tempo (fades klemmen, overlap,
 * gewijzigde velden).
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  NEUTRAL_VERVORMEN,
  changedVervormenFields,
  clampFades,
  findOverlappingClipIds,
  hasClipEffects,
  toVervormenValues,
} from '../clipEffectsUi';
import { clearSampleKindRegistry } from '../sampleKinds';
import type { Clip, Sample } from '../../types';

const sample = (id: string, duration: number, kind?: 'sfx' | 'loop'): Sample => ({
  id, name: id, locationId: 'l', audioUrl: '', duration, icon: 'music', color: '#123456', kind,
});

afterEach(() => clearSampleKindRegistry());

describe('clampFades', () => {
  it('laat passende fades staan', () => {
    expect(clampFades(1, 1, 4)).toEqual({ fadeIn: 1, fadeOut: 1 });
  });
  it('krimpt naar verhouding en blijft binnen de clip', () => {
    const r = clampFades(2, 2, 2);
    expect(r).toEqual({ fadeIn: 1, fadeOut: 1 });
    const odd = clampFades(1.5, 1.5, 1.25);
    expect(odd.fadeIn + odd.fadeOut).toBeLessThanOrEqual(1.25);
  });
});

describe('changedVervormenFields / hasClipEffects', () => {
  it('geeft precies de gewijzigde velden', () => {
    const initial = toVervormenValues({ volume: 0, pitch: 2, reverb: 0, fadeIn: 0, fadeOut: 0 });
    const next = { ...initial, speed: 2 as const, reverse: true };
    expect(changedVervormenFields(initial, next)).toEqual({ speed: 2, reverse: true });
    expect(changedVervormenFields(initial, initial)).toEqual({});
  });
  it('herkent alle klank- en vervormeffecten, niet volume', () => {
    expect(hasClipEffects(undefined)).toBe(false);
    expect(hasClipEffects({ volume: -6, pitch: 0, reverb: 0, fadeIn: 0, fadeOut: 0 })).toBe(false);
    expect(hasClipEffects({ ...NEUTRAL_VERVORMEN, volume: 0, speed: 2 })).toBe(true);
    expect(hasClipEffects({ ...NEUTRAL_VERVORMEN, volume: 0, filter: -30 })).toBe(true);
    expect(hasClipEffects({ ...NEUTRAL_VERVORMEN, volume: 0, reverse: true })).toBe(true);
  });
});

describe('findOverlappingClipIds (tempo-overlap)', () => {
  // sfx van 2 s = 4 tellen @120, 6 tellen @180… en 3 tellen @90
  const samples = new Map([['fx', sample('fx', 2)], ['loop', sample('loop', 8, 'loop')]]);
  const get = (id: string) => samples.get(id);
  const clips: Clip[] = [
    { id: 'a', sampleId: 'fx', startBeat: 0 },
    { id: 'b', sampleId: 'fx', startBeat: 4 },
    { id: 'c', sampleId: 'loop', startBeat: 8 },
  ];

  it('op 120 sluiten ze netjes aan (geen overlap)', () => {
    expect(findOverlappingClipIds(clips, get, 120).size).toBe(0);
  });
  it('sneller tempo: losse geluiden groeien in tellen en overlappen', () => {
    // @135: 2 s = 4,5 tel → a overlapt b, b overlapt de loop (die 16 tellen blijft)
    expect([...findOverlappingClipIds(clips, get, 135)].sort()).toEqual(['a', 'b', 'c']);
  });
  it('trager tempo: losse geluiden krimpen, geen overlap', () => {
    expect(findOverlappingClipIds(clips, get, 90).size).toBe(0);
  });
});
