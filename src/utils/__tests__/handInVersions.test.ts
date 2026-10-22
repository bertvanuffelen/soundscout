/**
 * Fase 2.8: versies bij inleveren/bewaren.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { compositionFingerprint, getVersion, recordVersion } from '../handInVersions';
import type { CompositionData } from '../../types';

const data = (startBeat: number): CompositionData => ({
  tracks: [{ id: 't1', clips: [{ id: 'c1', sampleId: 's1', startBeat }] }],
  bpm: 120, totalBeats: 128, isLooping: false, samples: [],
} as unknown as CompositionData);

describe('handInVersions', () => {
  beforeEach(() => localStorage.clear());

  it('vingerafdruk verandert bij een andere clip of titel', () => {
    const a = compositionFingerprint(data(0), 'Storm');
    expect(compositionFingerprint(data(0), 'Storm')).toBe(a);
    expect(compositionFingerprint(data(4), 'Storm')).not.toBe(a);
    expect(compositionFingerprint(data(0), 'Andere titel')).not.toBe(a);
  });

  it('telt versies op, maar niet bij dezelfde inhoud', () => {
    const fp1 = compositionFingerprint(data(0), 'Storm');
    expect(recordVersion('sub-1', fp1).version).toBe(1);
    expect(recordVersion('sub-1', fp1).version).toBe(1);
    const fp2 = compositionFingerprint(data(8), 'Storm');
    expect(recordVersion('sub-1', fp2).version).toBe(2);
    expect(getVersion('sub-1')?.fingerprint).toBe(fp2);
    expect(getVersion('onbekend')).toBeNull();
    expect(getVersion(null)).toBeNull();
  });
});
