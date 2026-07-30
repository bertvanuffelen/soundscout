/**
 * Tests voor findMissingSampleIds — het "geluid ontbreekt"-vals-alarm bij
 * sequence-clips (testronde 7): een `seq:`-verwijzing is geen ontbrekend
 * geluid; gecheckt worden de échte patroon-geluiden.
 */

import { describe, it, expect } from 'vitest';
import type * as Tone from 'tone';
import type { Track } from '../../types';
import type { SequencerSequence } from '../../types/sequencer';
import { findMissingSampleIds } from '../audioExport';

const bufferMap = (ids: string[]) =>
  new Map(ids.map((id) => [id, {} as Tone.ToneAudioBuffer]));

const track = (sampleIds: string[]): Track =>
  ({
    id: 't1',
    clips: sampleIds.map((sampleId, i) => ({
      id: `c${i}`,
      sampleId,
      startBeat: i * 4,
    })),
  }) as Track;

const sequence: SequencerSequence = {
  id: 'seq-1',
  name: 'Beat',
  lengthSteps: 16,
  bpm: 120,
  tracks: [
    { id: 'a', sampleId: 'kick', steps: [true], mode: 'ring' },
    { id: 'b', sampleId: 'zee', steps: [true], mode: 'cut' },
    { id: 'c', sampleId: null, steps: [false], mode: 'ring' },
  ],
  createdAt: '', updatedAt: '',
};

describe('findMissingSampleIds', () => {
  it('een sequence-clip is géén ontbrekend geluid als de patroon-geluiden geladen zijn', () => {
    const result = findMissingSampleIds(
      [track(['seq:seq-1'])],
      bufferMap(['kick', 'zee']),
      [sequence]
    );
    expect(result).toEqual([]);
  });

  it('meldt wél de onderliggende patroon-geluiden die echt ontbreken', () => {
    const result = findMissingSampleIds(
      [track(['seq:seq-1'])],
      bufferMap(['kick']),
      [sequence]
    );
    expect(result).toEqual(['zee']);
  });

  it('gewone clips blijven zoals voorheen gecontroleerd', () => {
    const result = findMissingSampleIds(
      [track(['piano', 'drums'])],
      bufferMap(['piano']),
      []
    );
    expect(result).toEqual(['drums']);
  });

  it('een sequence-clip zonder bijbehorende sequence levert geen vals alarm op', () => {
    const result = findMissingSampleIds(
      [track(['seq:weg'])],
      bufferMap([]),
      []
    );
    expect(result).toEqual([]);
  });
});
