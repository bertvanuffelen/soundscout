/**
 * V2 Fase 4 — tempo, Vervormen-effecten en melodie in de gedeelde
 * event-bron (audioEvents/sequencerEvents) + synth-determinisme + schema's.
 */
import { describe, it, expect, afterEach } from 'vitest';
import type { Clip, ClipEffects, Sample, Track } from '../../types';
import type { SequencerSequence } from '../../types/sequencer';
import {
  generateClipEvents,
  echoDelaySeconds,
  echoTailSeconds,
  filterSettings,
  reverbTailSeconds,
} from '../audioEvents';
import {
  generatePatternEvents,
  melodyRowToMidi,
  melodyRowToSemitones,
  stepTimeOffset,
  gainToDb,
} from '../sequencerEvents';
import {
  renderSynthNote,
  midiToFrequency,
  parseSynthSampleId,
  synthSampleId,
  SYNTH_NOTE_SECONDS,
} from '../synthVoice';
import {
  getClipDurationBeats,
  getClipPlaybackDuration,
  getEffectiveClipEndBeat,
  getTempoStretchRatio,
  normalizeBpm,
  secondsToBeats,
} from '../../utils/audio';
import {
  clearSampleKindRegistry,
  registerSampleKinds,
  resolveSampleKind,
} from '../../utils/sampleKinds';
import { createDefaultMelodySequence, createSequenceSample } from '../../utils/sequencer';
import {
  ClipEffectsSchema,
  CompositionDataSchema,
  SampleSchema,
  SequencerSequenceSchema,
  TimelineStateSchema,
} from '../../utils/schemas';

// --- Fixtures ---

const sample = (id: string, duration: number, kind?: 'loop' | 'sfx'): Sample => ({
  id, name: id, locationId: 'x', audioUrl: `/${id}.mp3`, duration, icon: 'Music', color: '#000000',
  ...(kind ? { kind } : {}),
});
const LOOP = sample('drums', 8, 'loop');
const SFX = sample('koe', 4);
const fx = (over: Partial<ClipEffects>): ClipEffects => ({ volume: 0, pitch: 0, reverb: 0, fadeIn: 0, fadeOut: 0, ...over });
const track = (...clips: Clip[]): Track => ({ id: 't', clips });
const clip = (over: Partial<Clip>): Clip => ({ id: 'c', sampleId: 'koe', startBeat: 0, ...over });

afterEach(() => clearSampleKindRegistry());

// =============================================================================
// Tempo
// =============================================================================

describe('tempo — uitrekfactor per tempo', () => {
  it.each([
    [90, 120 / 90],
    [105, 120 / 105],
    [120, 1],
    [135, 120 / 135],
  ])('loop @ %i BPM rekt met factor %f, sfx nooit', (bpm, ratio) => {
    expect(getTempoStretchRatio(LOOP, bpm)).toBeCloseTo(ratio, 12);
    expect(getTempoStretchRatio(SFX, bpm)).toBe(1);
  });

  it('een 8,0 s loop blijft 16 tellen in elk tempo (8,0 s → 10,667 s @ 90)', () => {
    for (const bpm of [90, 105, 120, 135]) {
      const c = clip({ sampleId: 'drums' });
      expect(getClipDurationBeats(c, LOOP, bpm)).toBeCloseTo(16, 9);
    }
    expect(getClipPlaybackDuration(clip({ sampleId: 'drums' }), LOOP, 90)).toBeCloseTo(10.6667, 4);
  });

  it('een sfx houdt zijn seconden; zijn lengte in tellen volgt het tempo', () => {
    expect(getClipDurationBeats(clip({}), SFX, 120)).toBeCloseTo(8, 9);
    expect(getClipDurationBeats(clip({}), SFX, 90)).toBeCloseTo(6, 9);
    expect(getClipDurationBeats(clip({}), SFX, 135)).toBeCloseTo(9, 9);
  });

  it('normalizeBpm: alleen 90/105/120/135, anders 120', () => {
    expect([90, 105, 120, 135].map(normalizeBpm)).toEqual([90, 105, 120, 135]);
    expect([100, 0, NaN, '120', undefined].map(normalizeBpm)).toEqual([120, 120, 120, 120, 120]);
  });
});

describe('loop of sfx', () => {
  it('veld op de sample → register → sfx', () => {
    expect(resolveSampleKind({ id: 'a', kind: 'loop' })).toBe('loop');
    expect(resolveSampleKind({ id: 'a' })).toBe('sfx');
    registerSampleKinds([{ id: 'a', kind: 'loop' }]);
    // Een kopie zonder kind (bibliotheek/opgeslagen compositie) vindt het register
    expect(resolveSampleKind({ id: 'a' })).toBe('loop');
    expect(resolveSampleKind({ id: 'a', kind: 'sfx' })).toBe('sfx');
  });

  it('sequence-samples volgen het tempo: altijd lengthSteps tellen breed', () => {
    const seq = { ...createDefaultMelodySequence('m'), lengthSteps: 12 };
    const virtual = createSequenceSample(seq);
    expect(resolveSampleKind(virtual)).toBe('loop');
    for (const bpm of [90, 120, 135]) {
      expect(getClipDurationBeats(clip({ sampleId: virtual.id }), virtual, bpm)).toBeCloseTo(12, 9);
    }
  });

  it('het basisthema markeert precies de zes muziekwinkel-loops', async () => {
    const { getTheme } = await import('../../data/themes');
    const loops = getTheme('basis')!.samples.filter((s) => s.kind === 'loop').map((s) => s.id).sort();
    expect(loops).toEqual([
      'muziekwinkel-bass', 'muziekwinkel-brass', 'muziekwinkel-drums',
      'muziekwinkel-guitar', 'muziekwinkel-piano', 'muziekwinkel-strings',
    ]);
  });
});

describe('tempo in de events', () => {
  it('loop @ 90: uitgerekt recept, event 10,667 s; sfx: geen recept, 4 s', () => {
    const tracks = [track(clip({ sampleId: 'drums' })), track(clip({ id: 'c2', sampleId: 'koe', startBeat: 16 }))];
    const { events, lastContentBeat } = generateClipEvents(tracks, [LOOP, SFX], { bpm: 90 });
    expect(events[0].recipe?.stretch).toBeCloseTo(4 / 3, 9);
    expect(events[0].duration).toBeCloseTo(32 / 3, 9);
    expect(events[1].recipe).toBeUndefined();
    expect(events[1].time).toBeCloseTo(16 * (60 / 90), 9);
    expect(events[1].duration).toBe(4);
    // sfx van 4 s @ 90 BPM = 6 tellen → einde op tel 22
    expect(lastContentBeat).toBeCloseTo(22, 9);
  });

  it('@ 120 BPM zonder effecten: exact de events van vóór Fase 4 (geen recept)', () => {
    const { events } = generateClipEvents([track(clip({ sampleId: 'drums', trimStart: 1, trimEnd: 5 }))], [LOOP], { bpm: 120 });
    expect(events).toHaveLength(1);
    expect(events[0]).not.toHaveProperty('recipe');
    expect(events[0].trimStart).toBe(1);
    expect(events[0].duration).toBe(4);
  });
});

// =============================================================================
// Vervormen
// =============================================================================

describe('effectieve cliplengte met speed/stretch/trim/loop', () => {
  it('speed 2 halveert, speed 0.5 verdubbelt (sfx, trim in bron-seconden)', () => {
    const c = clip({ trimStart: 1, trimEnd: 3, effects: fx({ speed: 2 }) });
    expect(getClipPlaybackDuration(c, SFX, 120)).toBe(1);
    expect(getClipDurationBeats(c, SFX, 120)).toBe(2);
    expect(getClipPlaybackDuration({ ...c, effects: fx({ speed: 0.5 }) }, SFX, 120)).toBe(4);
  });

  it('speed × tempo-stretch vermenigvuldigen', () => {
    const c = clip({ sampleId: 'drums', effects: fx({ speed: 2 }) });
    // 8 s × (120/90) / 2 = 5,333 s = 8 tellen @ 90
    expect(getClipDurationBeats(c, LOOP, 90)).toBeCloseTo(8, 9);
  });

  it('loop-iteraties gebruiken de effectieve lengte', () => {
    const c = clip({ trimStart: 0, trimEnd: 2, loop: true, loopDurationBeats: 4, effects: fx({ speed: 2 }) });
    // 2 s bron / 2 = 1 s per iteratie; 4 tellen @ 120 = 2 s → 2 iteraties
    const { events } = generateClipEvents([track(c)], [SFX], { bpm: 120 });
    expect(events.map((e) => e.time)).toEqual([0, 1]);
    expect(events.map((e) => e.duration)).toEqual([1, 1]);
    expect(events[0].trimStart).toBe(0);
    expect(getEffectiveClipEndBeat(c, SFX, 120)).toBe(4);
  });

  it('reverse + trim: trim geldt op het omgekeerde geluid zoals de leerling het ziet', () => {
    // Bron 4 s, reverse, trim 1..3 s: de gebakken (omgekeerde) buffer wordt
    // vanaf 1 s gelezen — dat is bron-seconde 3..1 achterstevoren.
    const c = clip({ trimStart: 1, trimEnd: 3, effects: fx({ reverse: true }) });
    const { events } = generateClipEvents([track(c)], [SFX], { bpm: 120 });
    expect(events[0].recipe).toMatchObject({ reverse: true, speed: 1, stretch: 1 });
    expect(events[0].trimStart).toBe(1);
    expect(events[0].duration).toBe(2);
  });

  it('trim schaalt mee in de gebakken buffer bij speed', () => {
    const c = clip({ trimStart: 1, trimEnd: 3, effects: fx({ speed: 0.5 }) });
    const { events } = generateClipEvents([track(c)], [SFX], { bpm: 120 });
    expect(events[0].trimStart).toBe(2);
    expect(events[0].duration).toBe(4);
  });
});

describe('echo en filter', () => {
  it('echo-vertraging is een halve tel in het compositietempo', () => {
    expect(echoDelaySeconds(120)).toBe(0.25);
    expect(echoDelaySeconds(90)).toBeCloseTo(1 / 3, 12);
  });

  it('echo-staart telt mee in lastAudibleSeconds (export-lengte + auto-stop)', () => {
    const c = clip({ effects: fx({ echo: 60 }) });
    const { events, lastAudibleSeconds, lastAudibleBeat } = generateClipEvents([track(c)], [SFX], { bpm: 120 });
    const tail = echoTailSeconds(60, 0.25);
    expect(tail).toBeGreaterThan(1);
    expect(events[0].effects).toMatchObject({ echo: 60, echoDelay: 0.25 });
    expect(lastAudibleSeconds).toBeCloseTo(4 + tail, 9);
    expect(lastAudibleBeat).toBeCloseTo(secondsToBeats(4 + tail, 120), 9);
  });

  it('echo + galm: de langste staart wint', () => {
    const c = clip({ effects: fx({ echo: 10, reverb: 80 }) });
    const { lastAudibleSeconds } = generateClipEvents([track(c)], [SFX], { bpm: 120 });
    expect(lastAudibleSeconds).toBeCloseTo(4 + Math.max(reverbTailSeconds(80), echoTailSeconds(10, 0.25)), 9);
  });

  it('meer echo = langere staart; 0 = geen', () => {
    expect(echoTailSeconds(0, 0.25)).toBe(0);
    expect(echoTailSeconds(100, 0.25)).toBeGreaterThan(echoTailSeconds(20, 0.25));
  });

  it('filter: −100..0 low-pass dalend, 0 uit, 0..+100 high-pass stijgend', () => {
    expect(filterSettings(0)).toBeNull();
    expect(filterSettings(-100)).toEqual({ type: 'lowpass', frequency: expect.closeTo(250, 6) });
    expect(filterSettings(100)).toEqual({ type: 'highpass', frequency: expect.closeTo(3000, 6) });
    expect(filterSettings(-50)!.frequency).toBeLessThan(filterSettings(-10)!.frequency);
    expect(filterSettings(50)!.frequency).toBeGreaterThan(filterSettings(10)!.frequency);
  });

  it('geen echo/filter = geen extra velden in de effects-config', () => {
    const { events } = generateClipEvents([track(clip({ effects: fx({ reverb: 20 }) }))], [SFX], { bpm: 120 });
    expect(Object.keys(events[0].effects!).sort()).toEqual(['fadeIn', 'fadeOut', 'pitch', 'reverb']);
  });
});

// =============================================================================
// Sequencer: swing, velocity, melodie
// =============================================================================

const baseSeq = (over: Partial<SequencerSequence>): SequencerSequence => ({
  id: 's', name: 's', lengthSteps: 4, bpm: 120, createdAt: '', updatedAt: '',
  tracks: [{ id: 'tr', sampleId: 'koe', steps: [true, true, true, true], mode: 'ring' }],
  ...over,
});

describe('ritme: swing en aanslagsterkte', () => {
  it('swing schuift alleen de oneven vakjes op', () => {
    const events = generatePatternEvents(baseSeq({ swing: 0.25 }), [SFX]);
    expect(events.map((e) => e.timeOffset)).toEqual([0, 0.5 + 0.125, 1, 1.5 + 0.125]);
    expect(stepTimeOffset(3, 0.5, 9)).toBe(1.5 + 0.25); // geklemd op 0.5
  });

  it('velocity vermenigvuldigt met het spoorvolume; 0 = geen event', () => {
    const seq = baseSeq({});
    seq.tracks[0] = { ...seq.tracks[0], volume: 0.5, velocities: [1, 0.5, 0] };
    const events = generatePatternEvents(seq, [SFX]);
    expect(events.map((e) => e.gain)).toEqual([0.5, 0.25, 0.5]);
    expect(events.map((e) => e.stepIndex)).toEqual([0, 1, 3]);
    expect(events[1].trackGain).toBe(0.5);
  });

  it('default (geen swing/velocities) = exact het oude patroon', () => {
    const events = generatePatternEvents(baseSeq({}), [SFX]);
    expect(events.map((e) => [e.timeOffset, e.gain, e.velocity])).toEqual([[0, 1, 1], [0.5, 1, 1], [1, 1, 1], [1.5, 1, 1]]);
  });

  it('op de tijdlijn volgt het patroon het compositietempo (1 vakje = 1 tel)', () => {
    const seq = baseSeq({ swing: 0 });
    const clipOnTimeline = clip({ sampleId: 'seq:s' });
    const { events } = generateClipEvents([track(clipOnTimeline)], [SFX], { bpm: 90, sequences: [seq] });
    expect(events.map((e) => e.time)).toEqual([0, 1, 2, 3].map((s) => (s * 60) / 90));
  });
});

describe('melodie', () => {
  it('pentatonisch raster: C D E G A, daarna het volgende octaaf', () => {
    const scale = [0, 2, 4, 7, 9];
    expect([0, 1, 2, 3, 4, 5, 6, 9].map((r) => melodyRowToSemitones(r, scale))).toEqual([0, 2, 4, 7, 9, 12, 14, 21]);
    expect(melodyRowToMidi(5, { root: 60, scale })).toBe(72);
  });

  it('synth-stem: elke noot wordt een synthetische sample-id', () => {
    const seq = createDefaultMelodySequence('m', { type: 'synth', preset: 'pluck' });
    seq.melody!.notes = [{ step: 0, row: 0 }, { step: 2, row: 7, length: 2, velocity: 0.5 }];
    const events = generatePatternEvents(seq, []);
    expect(events.map((e) => e.sampleId)).toEqual([synthSampleId('pluck', 60), synthSampleId('pluck', 76)]);
    expect(events[1].duration).toBe(1); // 2 vakjes @ 120
    expect(events[1].gain).toBe(0.5);
    expect(events.every((e) => e.declickOut > 0 && !e.recipe)).toBe(true);
  });

  it('bibliotheekstem: pitch-recept = noot − baseNote, lengte afgekapt op het geluid', () => {
    const voiceSample = sample('fluit', 0.75);
    const seq = createDefaultMelodySequence('m', { type: 'sample', sampleId: 'fluit', baseNote: 62 });
    seq.melody!.notes = [{ step: 1, row: 1, length: 4 }];
    const [event] = generatePatternEvents(seq, [voiceSample]);
    // rij 1 = D4 = 62 = baseNote → 0 semitonen → neutraal, geen bake
    expect(event.recipe).toBeUndefined();
    expect(event.duration).toBe(0.75);
  });

  it('bibliotheekstem transponeert', () => {
    const seq = createDefaultMelodySequence('m', { type: 'sample', sampleId: 'fluit' });
    seq.melody!.notes = [{ step: 0, row: 3 }];
    const [event] = generatePatternEvents(seq, [sample('fluit', 2)]);
    expect(event.recipe?.pitch).toBe(7);
  });

  it('swing en velocity werken ook in een melodie', () => {
    const seq = createDefaultMelodySequence('m');
    seq.swing = 0.5;
    seq.melody!.notes = [{ step: 1, row: 0, velocity: 0.25 }];
    const [event] = generatePatternEvents(seq, []);
    expect(event.timeOffset).toBe(0.75);
    expect(gainToDb(event.gain)).toBeCloseTo(-12.04, 2);
  });

  it('melodie op de tijdlijn wordt gewone ClipEvents (zelfde pad als ritme)', () => {
    const seq = createDefaultMelodySequence('m', { type: 'synth', preset: 'soft' });
    seq.melody!.notes = [{ step: 0, row: 0 }, { step: 3, row: 4 }];
    const { events } = generateClipEvents([track(clip({ sampleId: `seq:${seq.id}` }))], [], { bpm: 120, sequences: [seq] });
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({ sampleId: synthSampleId('soft', 69), time: 1.5, fadeOut: 0.01 });
  });

  it('gemute melodie of noten buiten het raster: geen events', () => {
    const seq = createDefaultMelodySequence('m');
    seq.melody!.notes = [{ step: 0, row: 10 }, { step: 99, row: 0 }];
    expect(generatePatternEvents(seq, [])).toEqual([]);
    seq.melody!.notes = [{ step: 0, row: 0 }];
    seq.melody!.mute = true;
    expect(generatePatternEvents(seq, [])).toEqual([]);
  });
});

describe('synth-stem: deterministisch', () => {
  it('zelfde noot = bit-identieke buffer; andere noot/preset = anders', () => {
    const a = renderSynthNote('soft', 60, 44100);
    const b = renderSynthNote('soft', 60, 44100);
    expect(a).toEqual(b);
    expect(a.length).toBe(SYNTH_NOTE_SECONDS * 44100);
    expect(renderSynthNote('soft', 62, 44100)).not.toEqual(a);
    expect(renderSynthNote('bright', 60, 44100)).not.toEqual(a);
  });

  it('klikvrij begin en einde, piek binnen de headroom', () => {
    for (const preset of ['soft', 'bright', 'pluck'] as const) {
      const data = renderSynthNote(preset, 72, 44100);
      expect(data[0]).toBe(0);
      expect(Math.abs(data[data.length - 1])).toBeLessThan(1e-4);
      expect(Math.max(...data.map(Math.abs))).toBeLessThanOrEqual(0.45);
    }
  });

  it('klinkt op de juiste toonhoogte (nuldoorgangen)', () => {
    const data = renderSynthNote('soft', 69, 44100); // A4 = 440 Hz
    let crossings = 0;
    for (let i = 1; i < 44100; i++) if (data[i - 1] <= 0 && data[i] > 0) crossings++;
    expect(crossings).toBeGreaterThan(430);
    expect(crossings).toBeLessThan(450);
    expect(midiToFrequency(69)).toBe(440);
  });

  it('id-codering heen en terug', () => {
    expect(parseSynthSampleId(synthSampleId('bright', 64))).toEqual({ preset: 'bright', midi: 64 });
    expect(parseSynthSampleId('synth:nope:64')).toBeNull();
    expect(parseSynthSampleId('koe')).toBeNull();
  });
});

// =============================================================================
// Schema-compatibiliteit
// =============================================================================

describe('schema: oude data laadt neutraal, rommel crasht niet', () => {
  const oldEffects = { volume: -3, pitch: 2, reverb: 10 };

  it('clip-effecten zonder de nieuwe velden: neutraal (geen velden)', () => {
    const parsed = ClipEffectsSchema.parse(oldEffects);
    expect(parsed).toEqual({ ...oldEffects, fadeIn: 0, fadeOut: 0 });
    expect(parsed.speed).toBeUndefined();
  });

  it('nieuwe velden worden bewaard; ongeldige vallen weg zonder de compositie af te keuren', () => {
    expect(ClipEffectsSchema.parse({ ...oldEffects, speed: 1.5, reverse: true, echo: 40, filter: -30 }))
      .toMatchObject({ speed: 1.5, reverse: true, echo: 40, filter: -30 });
    const junk = ClipEffectsSchema.parse({ ...oldEffects, speed: 3, reverse: 'ja', echo: 500, filter: 'x' });
    expect(junk).toEqual({ ...oldEffects, fadeIn: 0, fadeOut: 0 });
  });

  it('tijdlijn: ongeldig tempo → 120', () => {
    const base = { tracks: [], totalBeats: 128, isLooping: false };
    expect(TimelineStateSchema.parse({ ...base, bpm: 98 }).bpm).toBe(120);
    expect(TimelineStateSchema.parse({ ...base, bpm: 105 }).bpm).toBe(105);
    expect(CompositionDataSchema.parse({ ...base, samples: [], bpm: 999 }).bpm).toBe(120);
  });

  it('sample: kind optioneel en tolerant', () => {
    const s = { id: 'a', name: 'a', locationId: 'x', audioUrl: '', duration: 8, icon: 'M', color: '#000' };
    expect(SampleSchema.parse(s).kind).toBeUndefined();
    expect(SampleSchema.parse({ ...s, kind: 'loop' }).kind).toBe('loop');
    expect(SampleSchema.parse({ ...s, kind: 'vreemd' }).kind).toBeUndefined();
  });

  it('oude sequence zonder kind/swing parset als ritme; melodie-sequence parset volledig', () => {
    const old = baseSeq({});
    const parsedOld = SequencerSequenceSchema.parse(old);
    expect(parsedOld.kind).toBeUndefined();
    expect(generatePatternEvents(parsedOld as SequencerSequence, [SFX])).toHaveLength(4);

    const melody = createDefaultMelodySequence('m', { type: 'sample', sampleId: 'fluit' });
    melody.melody!.notes = [{ step: 0, row: 3, velocity: 0.5 }];
    melody.swing = 0.3;
    expect(SequencerSequenceSchema.parse(melody)).toEqual(melody);
  });
});
