/**
 * Melodie-tab (V2 Fase 4): store-acties, wisselregel Ritme ⇄ Melodie,
 * spiegeling naar de compositie en serialisatie van een melodie-sequence.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSequencerStore } from '../sequencerStore';
import { useTimelineStore } from '../timelineStore';
import {
  createDefaultMelodySequence,
  createDefaultSequence,
  createSequenceSample,
  isSequenceEmpty,
  melodyRowCount,
  midiToNoteName,
  velocityLevelOf,
  VELOCITY_LEVELS,
} from '../../utils/sequencer';
import { melodyRowToMidi } from '../../services/sequencerEvents';
import { SequencerSequenceSchema, CompositionDataSchema } from '../../utils/schemas';
import { loadSequences, saveSequences } from '../../services/sequencerStorage';
import { MELODY_DEFAULT_OCTAVES, SEQ_MAX_SWING, type SequencerSequence } from '../../types/sequencer';

function setActive(seq: SequencerSequence, mode: 'lab' | 'studio' = 'lab') {
  useSequencerStore.setState({
    sequences: [seq],
    activeSequenceId: seq.id,
    openSequenceId: null,
    isPlaying: false,
    hasHydrated: true,
    mode,
  });
}

function active(): SequencerSequence {
  const seq = useSequencerStore.getState().activeSequence();
  if (!seq) throw new Error('geen actieve sequence');
  return seq;
}

const store = () => useSequencerStore.getState();

describe('melodie — hulpjes', () => {
  it('rijen: toonladder × octaven; rij 0 = grondtoon, hoger = hogere noot', () => {
    const melody = createDefaultMelodySequence('M').melody!;
    // Diatonisch (C D E F G A B) sinds 17-11
    expect(melodyRowCount(melody)).toBe(7 * MELODY_DEFAULT_OCTAVES);
    const names = Array.from({ length: 6 }, (_, row) => {
      const { name, octave } = midiToNoteName(melodyRowToMidi(row, melody));
      return `${name}${octave}`;
    });
    expect(names).toEqual(['C4', 'D4', 'E4', 'F4', 'G4', 'A4']);
  });

  it('velocityLevelOf kiest de dichtstbijzijnde stand', () => {
    expect(velocityLevelOf(undefined)).toBe('loud');
    expect(velocityLevelOf(1)).toBe('loud');
    expect(velocityLevelOf(0.7)).toBe('medium');
    expect(velocityLevelOf(0.4)).toBe('soft');
    expect(velocityLevelOf(0.1)).toBe('soft');
  });

  it('isSequenceEmpty kijkt naar stappen (ritme) of noten (melodie)', () => {
    const rhythm = createDefaultSequence('R');
    expect(isSequenceEmpty(rhythm)).toBe(true);
    rhythm.tracks[0].steps[2] = true;
    expect(isSequenceEmpty(rhythm)).toBe(false);
    const melody = createDefaultMelodySequence('M');
    expect(isSequenceEmpty(melody)).toBe(true);
    melody.melody!.notes.push({ step: 0, row: 0 });
    expect(isSequenceEmpty(melody)).toBe(false);
  });

  it('virtuele sample van een melodie krijgt het muzieknoot-icoon', () => {
    expect(createSequenceSample(createDefaultMelodySequence('M')).icon).toBe('Music');
    expect(createSequenceSample(createDefaultSequence('R')).icon).toBe('Grid3x3');
  });
});

describe('melodie — wisselregel Ritme ⇄ Melodie', () => {
  beforeEach(() => {
    localStorage.clear();
    setActive(createDefaultSequence('Seq'));
  });

  it('lege sequence wisselt direct van soort (zelfde id, naam en kleur)', () => {
    const before = active();
    expect(store().setSequenceKind('melody')).toBe(true);
    const after = active();
    expect(after.id).toBe(before.id);
    expect(after.name).toBe(before.name);
    expect(after.color).toBe(before.color);
    expect(after.kind).toBe('melody');
    expect(after.melody?.notes).toEqual([]);
    expect(after.tracks).toHaveLength(1);

    expect(store().setSequenceKind('rhythm')).toBe(true);
    expect(active().kind).toBe('rhythm');
    expect(active().melody).toBeUndefined();
    expect(active().tracks).toHaveLength(3);
  });

  it('niet-lege sequence wisselt NIET (UI biedt een nieuwe sequence aan)', () => {
    store().toggleStep(active().tracks[0].id, 0);
    const before = active();
    expect(store().setSequenceKind('melody')).toBe(false);
    expect(active()).toEqual(before);
  });

  it('createSequence met kind maakt een verse melodie die actief wordt', () => {
    store().createSequence('Deuntje', 'melody');
    expect(store().sequences).toHaveLength(2);
    expect(active().kind).toBe('melody');
    expect(active().name).toBe('Deuntje');
    // eigen kleur, niet die van de eerste
    expect(active().color).not.toBe(store().sequences[0].color);
  });
});

describe('melodie — noten, stem, octaven, swing en sterkte', () => {
  beforeEach(() => {
    localStorage.clear();
    setActive(createDefaultMelodySequence('Mel'));
  });

  it('tik met de kwast: erbij → andere sterkte = wijzigen → zelfde sterkte = weg', () => {
    expect(store().toggleMelodyNote(3, 4)).toBe('added');
    expect(active().melody!.notes).toEqual([{ step: 3, row: 4 }]);

    expect(store().toggleMelodyNote(3, 4, VELOCITY_LEVELS.soft)).toBe('changed');
    expect(active().melody!.notes).toEqual([{ step: 3, row: 4, velocity: 0.4 }]);

    expect(store().toggleMelodyNote(3, 4, VELOCITY_LEVELS.soft)).toBe('removed');
    expect(active().melody!.notes).toEqual([]);
  });

  it('akkoord: meerdere rijen in één vakje', () => {
    store().toggleMelodyNote(0, 0);
    store().toggleMelodyNote(0, 2);
    expect(active().melody!.notes).toHaveLength(2);
  });

  it('negeert vakjes/rijen buiten het raster', () => {
    expect(store().toggleMelodyNote(16, 0)).toBe('ignored');
    expect(store().toggleMelodyNote(0, 14)).toBe('ignored');
    expect(store().toggleMelodyNote(-1, 0)).toBe('ignored');
    expect(active().melody!.notes).toEqual([]);
  });

  it('octaven 1..3; minder octaven laat de noten boven het bereik vallen', () => {
    store().toggleMelodyNote(0, 1);
    store().toggleMelodyNote(1, 7); // tweede octaaf
    store().setMelodyOctaves(3);
    expect(active().melody!.octaves).toBe(3);
    store().setMelodyOctaves(9);
    expect(active().melody!.octaves).toBe(3);
    store().setMelodyOctaves(1);
    expect(active().melody!.octaves).toBe(1);
    expect(active().melody!.notes).toEqual([{ step: 0, row: 1 }]);
    store().setMelodyOctaves(0);
    expect(active().melody!.octaves).toBe(1);
  });

  it('korter patroon laat noten buiten de lengte vallen (zelfde regel als ritme)', () => {
    store().toggleMelodyNote(2, 0);
    store().toggleMelodyNote(14, 0);
    store().setLength(-4);
    expect(active().lengthSteps).toBe(12);
    expect(active().melody!.notes).toEqual([{ step: 2, row: 0 }]);
  });

  it('stem: synth-preset of bibliotheekgeluid', () => {
    store().setMelodyVoice({ type: 'synth', preset: 'pluck' });
    expect(active().melody!.voice).toEqual({ type: 'synth', preset: 'pluck' });
    store().setMelodyVoice({ type: 'sample', sampleId: 'park-birds' });
    expect(active().melody!.voice).toEqual({ type: 'sample', sampleId: 'park-birds' });
  });

  it('swing wordt geklemd op 0..SEQ_MAX_SWING en afgerond', () => {
    store().setSwing(0.25);
    expect(active().swing).toBe(0.25);
    store().setSwing(2);
    expect(active().swing).toBe(SEQ_MAX_SWING);
    store().setSwing(-1);
    expect(active().swing).toBe(0);
    store().setSwing(0.333333);
    expect(active().swing).toBe(0.33);
  });
});

describe('ritme — aanslagsterkte per vakje (model)', () => {
  beforeEach(() => {
    localStorage.clear();
    setActive(createDefaultSequence('R'));
  });

  it('setStepVelocity vult de lijst aan; alles standaard → veld weg', () => {
    const trackId = active().tracks[0].id;
    store().setStepVelocity(trackId, 2, 0.4);
    const velocities = active().tracks[0].velocities!;
    expect(velocities).toHaveLength(16);
    expect(velocities[2]).toBe(0.4);
    expect(velocities[0]).toBe(1);
    store().setStepVelocity(trackId, 2, 1);
    expect(active().tracks[0].velocities).toBeUndefined();
  });
});

describe('studio-modus — spiegelen naar de compositie', () => {
  beforeEach(() => {
    localStorage.clear();
    useTimelineStore.getState().setSequences([]);
  });

  it('elke melodie-mutatie spiegelt naar timelineStore en bumpt audioVersion', () => {
    const seq = createDefaultMelodySequence('Mel');
    setActive(seq, 'studio');
    const v0 = useTimelineStore.getState().audioVersion;

    store().toggleMelodyNote(0, 3);
    const v1 = useTimelineStore.getState().audioVersion;
    expect(v1).toBeGreaterThan(v0);
    expect(useTimelineStore.getState().sequences[0].melody?.notes).toEqual([{ step: 0, row: 3 }]);

    store().setMelodyVoice({ type: 'synth', preset: 'bright' });
    store().setSwing(0.2);
    store().setMelodyOctaves(3);
    const mirrored = useTimelineStore.getState().sequences[0];
    expect(useTimelineStore.getState().audioVersion).toBeGreaterThan(v1);
    expect(mirrored.melody?.voice).toEqual({ type: 'synth', preset: 'bright' });
    expect(mirrored.swing).toBe(0.2);
    expect(mirrored.melody?.octaves).toBe(3);
  });

  it('dupliceren kopieert de noten diep (kopie bewerken raakt het origineel niet)', () => {
    setActive(createDefaultMelodySequence('Mel'), 'studio');
    store().toggleMelodyNote(0, 0);
    const originalId = active().id;
    store().duplicateSequence(originalId, ' (kopie)');
    store().toggleMelodyNote(5, 5);
    const original = store().sequences.find((s) => s.id === originalId)!;
    expect(original.melody!.notes).toEqual([{ step: 0, row: 0 }]);
    expect(active().melody!.notes).toHaveLength(2);
  });
});

describe('serialisatie van een melodie-sequence', () => {
  function sampleMelody(): SequencerSequence {
    const seq = createDefaultMelodySequence('Deuntje', { type: 'sample', sampleId: 'park-birds' });
    seq.swing = 0.3;
    seq.melody!.octaves = 3;
    seq.melody!.notes = [
      { step: 0, row: 0 },
      { step: 1, row: 12, velocity: 0.4 },
      { step: 1, row: 2, velocity: 0.7 },
    ];
    return seq;
  }

  it('JSON + Zod round-trip is verliesvrij', () => {
    const seq = sampleMelody();
    const parsed = SequencerSequenceSchema.parse(JSON.parse(JSON.stringify(seq)));
    expect(parsed).toEqual(seq);
  });

  it('in een compositie (CompositionDataSchema) blijft de melodie intact', () => {
    const seq = sampleMelody();
    const data = {
      tracks: [],
      bpm: 120,
      totalBeats: 128,
      isLooping: false,
      samples: [],
      sequences: [seq],
    };
    const parsed = CompositionDataSchema.parse(JSON.parse(JSON.stringify(data)));
    expect(parsed.sequences?.[0]).toEqual(seq);
  });

  it('lab-opslag (localStorage) bewaart en laadt de melodie', () => {
    localStorage.clear();
    const seq = sampleMelody();
    saveSequences([seq]);
    expect(loadSequences()).toEqual([seq]);
  });
});
