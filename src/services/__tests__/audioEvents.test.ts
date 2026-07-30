import { describe, it, expect } from 'vitest';
import {
  generateClipEvents,
  clipHasEffects,
  reverbDecay,
  reverbTailSeconds,
  createFadeCurve,
} from '../audioEvents';
import type { Track, Sample, Clip } from '../../types';

// BPM 120 → 1 beat = 0.5s
const BPM = 120;

const sample = (id: string, duration: number): Sample =>
  ({ id, name: id, icon: 'x', audioUrl: `/x/${id}.mp3`, duration, locationId: 'loc' }) as Sample;

const clip = (overrides: Partial<Clip> & { id: string; sampleId: string; startBeat: number }): Clip =>
  ({ durationBeats: 4, ...overrides }) as Clip;

const track = (clips: Clip[], overrides: Partial<Track> = {}): Track =>
  ({ id: 't', clips, volume: 0, mute: false, ...overrides }) as Track;

describe('generateClipEvents', () => {
  const samples = [sample('piano', 2), sample('drums', 1)];

  it('genereert één event voor een gewone clip', () => {
    const result = generateClipEvents(
      [track([clip({ id: 'c1', sampleId: 'piano', startBeat: 4 })])],
      samples,
      { bpm: BPM }
    );
    expect(result.events).toHaveLength(1);
    const e = result.events[0];
    expect(e.time).toBe(2); // beat 4 @ 120bpm
    expect(e.duration).toBe(2); // volledige sample
    expect(e.trimStart).toBe(0);
    expect(e.isMuted).toBe(false);
    expect(e.effects).toBeUndefined();
    expect(result.totalClipCount).toBe(1);
    expect(result.lastContentBeat).toBe(8); // 4 + 2s=4 beats
    expect(result.lastAudibleSeconds).toBe(4); // 2 + 2
  });

  it('genereert één event per loop-iteratie, laatste afgekapt', () => {
    // drums (1s) loopt 5 beats = 2.5s → 2 hele + 1 halve iteratie
    const result = generateClipEvents(
      [track([clip({ id: 'c1', sampleId: 'drums', startBeat: 0, loop: true, loopDurationBeats: 5 })])],
      samples,
      { bpm: BPM }
    );
    expect(result.events).toHaveLength(3);
    expect(result.events.map((e) => e.time)).toEqual([0, 1, 2]);
    expect(result.events.map((e) => e.duration)).toEqual([1, 1, 0.5]);
  });

  it('zet fades op élke loop-iteratie (pulse, UX-FADE-LOOP)', () => {
    const result = generateClipEvents(
      [track([clip({
        id: 'c1', sampleId: 'drums', startBeat: 0, loop: true, loopDurationBeats: 4,
        effects: { volume: 0, pitch: 0, reverb: 0, fadeIn: 0.2, fadeOut: 0.3 },
      })])],
      samples,
      { bpm: BPM }
    );
    expect(result.events).toHaveLength(2);
    result.events.forEach((e) => {
      expect(e.fadeIn).toBe(0.2);
      expect(e.fadeOut).toBe(0.3);
      expect(e.effects).toBeDefined();
    });
  });

  it('combineert track- en clipvolume in dB en respecteert mute', () => {
    const result = generateClipEvents(
      [
        track([clip({
          id: 'c1', sampleId: 'piano', startBeat: 0,
          effects: { volume: -6, pitch: 0, reverb: 0, fadeIn: 0, fadeOut: 0, mute: true },
        })], { volume: -3 }),
        track([clip({ id: 'c2', sampleId: 'drums', startBeat: 0 })], { mute: true }),
      ],
      samples,
      { bpm: BPM }
    );
    expect(result.events[0].volumeDb).toBe(-9);
    expect(result.events[0].isMuted).toBe(true); // clip-mute
    expect(result.events[1].isMuted).toBe(true); // track-mute
    expect(result.mutedClipCount).toBe(2);
    // alles gemute → niets hoorbaar
    expect(result.lastAudibleSeconds).toBe(0);
  });

  it('bakt solo in de events wanneer soloTrackIndex is meegegeven (D6)', () => {
    const tracks = [
      track([clip({ id: 'c1', sampleId: 'piano', startBeat: 0 })]),
      track([clip({ id: 'c2', sampleId: 'drums', startBeat: 0 })]),
    ];
    const result = generateClipEvents(tracks, samples, { bpm: BPM, soloTrackIndex: 1 });
    expect(result.events[0].isMuted).toBe(true); // weggesoloed
    expect(result.events[1].isMuted).toBe(false); // solo-spoor
    // zonder solo: beide hoorbaar
    const noSolo = generateClipEvents(tracks, samples, { bpm: BPM });
    expect(noSolo.events.every((e) => !e.isMuted)).toBe(true);
  });

  it('telt de galmstaart mee in lastAudibleSeconds (audit #5)', () => {
    const result = generateClipEvents(
      [track([clip({
        id: 'c1', sampleId: 'piano', startBeat: 0,
        effects: { volume: 0, pitch: 0, reverb: 50, fadeIn: 0, fadeOut: 0 },
      })])],
      samples,
      { bpm: BPM }
    );
    // 2s clip + staart (1.5 + 0.5*3 = 3s) = 5s
    expect(result.lastAudibleSeconds).toBe(5);
    expect(result.lastContentBeat).toBe(4); // staart telt niet als inhoud
  });

  it('respecteert trim (trimStart/trimEnd) in event-duur en offset', () => {
    const result = generateClipEvents(
      [track([clip({ id: 'c1', sampleId: 'piano', startBeat: 0, trimStart: 0.5, trimEnd: 1.5 })])],
      samples,
      { bpm: BPM }
    );
    expect(result.events[0].trimStart).toBe(0.5);
    expect(result.events[0].duration).toBe(1);
  });

  it('slaat clips zonder geladen buffer over via hasBuffer', () => {
    const result = generateClipEvents(
      [track([
        clip({ id: 'c1', sampleId: 'piano', startBeat: 0 }),
        clip({ id: 'c2', sampleId: 'drums', startBeat: 8 }),
      ])],
      samples,
      { bpm: BPM, hasBuffer: (id) => id === 'piano' }
    );
    expect(result.events).toHaveLength(1);
    expect(result.events[0].sampleId).toBe('piano');
    expect(result.totalClipCount).toBe(1);
  });

  it('slaat clips van onbekende samples over', () => {
    const result = generateClipEvents(
      [track([clip({ id: 'c1', sampleId: 'bestaat-niet', startBeat: 0 })])],
      samples,
      { bpm: BPM }
    );
    expect(result.events).toHaveLength(0);
    expect(result.lastAudibleSeconds).toBe(0);
  });
});

describe('effect-helpers', () => {
  it('clipHasEffects herkent niet-default effecten', () => {
    expect(clipHasEffects(clip({ id: 'c', sampleId: 's', startBeat: 0 }))).toBe(false);
    expect(clipHasEffects(clip({
      id: 'c', sampleId: 's', startBeat: 0,
      effects: { volume: 0, pitch: 0, reverb: 0, fadeIn: 0, fadeOut: 0 },
    }))).toBe(false);
    expect(clipHasEffects(clip({
      id: 'c', sampleId: 's', startBeat: 0,
      effects: { volume: 0, pitch: 5, reverb: 0, fadeIn: 0, fadeOut: 0 },
    }))).toBe(true);
  });

  it('reverbDecay/reverbTailSeconds volgen de vaste formule', () => {
    expect(reverbDecay(0)).toBe(1.5);
    expect(reverbDecay(100)).toBe(4.5);
    expect(reverbTailSeconds(0)).toBe(0);
    expect(reverbTailSeconds(50)).toBe(3);
  });

  it('fade-curves zijn x² en (1-x)²', () => {
    const fadeIn = createFadeCurve('in', 3);
    const fadeOut = createFadeCurve('out', 3);
    expect(fadeIn).toEqual([0, 0.25, 1]);
    expect(fadeOut).toEqual([1, 0.25, 0]);
  });
});

// =============================================================================
// Sequence-clips (fase 2) — patroon-uitpakken naar geluids-events
// =============================================================================

import type { SequencerSequence, SequencerTrack } from '../../types/sequencer';
import { sequenceSampleId } from '../../utils/sequencer';

const seqTrack = (
  overrides: Partial<SequencerTrack> & { id: string; sampleId: string }
): SequencerTrack => ({
  steps: [true, false, false, false],
  mode: 'ring',
  ...overrides,
});

const sequence = (
  tracks: SequencerTrack[],
  lengthSteps = 4,
  id = 'seq-1'
): SequencerSequence => ({
  id,
  name: 'Beat',
  lengthSteps,
  bpm: 120,
  tracks,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('generateClipEvents — sequence-clips (fase 2)', () => {
  const samples = [sample('piano', 2), sample('drums', 1)];

  it('pakt een sequence-clip uit naar events van de onderliggende samples', () => {
    const seq = sequence([
      seqTrack({ id: 'a', sampleId: 'drums', steps: [true, false, true, false] }),
    ]);
    const result = generateClipEvents(
      [track([clip({ id: 'c1', sampleId: sequenceSampleId('seq-1'), startBeat: 4 })])],
      samples,
      { bpm: BPM, sequences: [seq] }
    );
    // Clip start op beat 4 (=2s); stappen 0 en 2 → 2s en 3s
    expect(result.events).toHaveLength(2);
    expect(result.events.map((e) => e.time)).toEqual([2, 3]);
    expect(result.events.every((e) => e.sampleId === 'drums')).toBe(true);
    expect(result.totalClipCount).toBe(1);
    // Patroonbreedte = lengthSteps tellen: 4 + 4 = 8
    expect(result.lastContentBeat).toBe(8);
  });

  it('uitrekken (clip.loop) herhaalt het patroon tot loopDurationBeats', () => {
    const seq = sequence([seqTrack({ id: 'a', sampleId: 'drums' })]);
    const result = generateClipEvents(
      [track([clip({
        id: 'c1', sampleId: sequenceSampleId('seq-1'), startBeat: 0,
        loop: true, loopDurationBeats: 12,
      })])],
      samples,
      { bpm: BPM, sequences: [seq] }
    );
    // Stap 0 van elke iteratie: 0s, 2s, 4s (3 iteraties van 4 tellen)
    expect(result.events.map((e) => e.time)).toEqual([0, 2, 4]);
    expect(result.lastContentBeat).toBe(12);
  });

  it('zonder bijbehorende sequence worden er geen events gemaakt (graceful)', () => {
    const result = generateClipEvents(
      [track([clip({ id: 'c1', sampleId: sequenceSampleId('bestaat-niet'), startBeat: 0 })])],
      samples,
      { bpm: BPM, sequences: [] }
    );
    expect(result.events).toHaveLength(0);
    expect(result.totalClipCount).toBe(0);
  });

  it('choke (cut): een volgende stap kapt het vorige event op dat spoor af', () => {
    const seq = sequence([
      seqTrack({
        id: 'a', sampleId: 'piano', mode: 'cut',
        steps: [true, true, false, false],
      }),
    ]);
    const result = generateClipEvents(
      [track([clip({ id: 'c1', sampleId: sequenceSampleId('seq-1'), startBeat: 0 })])],
      samples,
      { bpm: BPM, sequences: [seq] }
    );
    // Piano duurt 2s; stap 1 begint op 0.5s → eerste event afgekapt op 0.5s.
    // Het tweede event wordt op de clipgrens (4 tellen = 2s) afgekapt: 1.5s.
    expect(result.events).toHaveLength(2);
    expect(result.events[0].duration).toBe(0.5);
    expect(result.events[1].duration).toBe(1.5);
    // Choke krijgt een micro-fade-out (klikvrij) via de effects-config
    expect(result.events[0].effects?.fadeOut).toBeCloseTo(0.01, 10);
  });

  it('choke werkt ook over de iteratiegrens heen', () => {
    const seq = sequence([
      seqTrack({
        id: 'a', sampleId: 'piano', mode: 'cut',
        steps: [false, false, false, true],
      }),
    ]);
    const result = generateClipEvents(
      [track([clip({
        id: 'c1', sampleId: sequenceSampleId('seq-1'), startBeat: 0,
        loop: true, loopDurationBeats: 8,
      })])],
      samples,
      { bpm: BPM, sequences: [seq] }
    );
    // Stap 3 van iteratie 1 (t=1.5) wordt gechoked door stap 3 van iteratie 2 (t=3.5)
    expect(result.events.map((e) => e.time)).toEqual([1.5, 3.5]);
    expect(result.events[0].duration).toBe(2); // 3.5 - 1.5
  });

  it('spoorvolume (lineair) wordt omgerekend naar dB in volumeDb', () => {
    const seq = sequence([
      seqTrack({ id: 'a', sampleId: 'drums', volume: 0.5 }),
    ]);
    const result = generateClipEvents(
      [track([clip({ id: 'c1', sampleId: sequenceSampleId('seq-1'), startBeat: 0 })])],
      samples,
      { bpm: BPM, sequences: [seq] }
    );
    expect(result.events[0].volumeDb).toBeCloseTo(20 * Math.log10(0.5), 5);
  });

  it('mute op het montagelijn-spoor dempt alle patroon-events', () => {
    const seq = sequence([seqTrack({ id: 'a', sampleId: 'drums' })]);
    const result = generateClipEvents(
      [track(
        [clip({ id: 'c1', sampleId: sequenceSampleId('seq-1'), startBeat: 0 })],
        { mute: true }
      )],
      samples,
      { bpm: BPM, sequences: [seq] }
    );
    expect(result.events.every((e) => e.isMuted)).toBe(true);
    expect(result.mutedClipCount).toBe(1);
  });

  it('trim van een sequencer-spoor komt terug in de events (declick-fade-in)', () => {
    const seq = sequence([
      seqTrack({ id: 'a', sampleId: 'piano', trimStart: 0.5, trimEnd: 1.0 }),
    ]);
    const result = generateClipEvents(
      [track([clip({ id: 'c1', sampleId: sequenceSampleId('seq-1'), startBeat: 0 })])],
      samples,
      { bpm: BPM, sequences: [seq] }
    );
    expect(result.events[0].trimStart).toBe(0.5);
    expect(result.events[0].duration).toBe(0.5);
    expect(result.events[0].effects?.fadeIn).toBeCloseTo(0.003, 10);
  });

  it('gemixte tijdlijn: gewone clips en sequence-clips samen', () => {
    const seq = sequence([seqTrack({ id: 'a', sampleId: 'drums' })]);
    const result = generateClipEvents(
      [track([
        clip({ id: 'c1', sampleId: 'piano', startBeat: 0 }),
        clip({ id: 'c2', sampleId: sequenceSampleId('seq-1'), startBeat: 8 }),
      ])],
      samples,
      { bpm: BPM, sequences: [seq] }
    );
    expect(result.totalClipCount).toBe(2);
    expect(result.events.map((e) => e.sampleId)).toEqual(['piano', 'drums']);
    expect(result.events[1].time).toBe(4); // beat 8
  });
});
