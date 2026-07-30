/**
 * Tests voor sequencerStore (patroon: setState-reset in beforeEach,
 * zie timelineStore.test.ts).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSequencerStore } from '../sequencerStore';
import { createDefaultSequence } from '../../utils/sequencer';
import {
  SEQ_DEFAULT_STEPS,
  SEQ_MAX_STEPS,
  SEQ_MAX_TRACKS,
  SEQ_MIN_STEPS,
} from '../../types/sequencer';

function freshState() {
  const seq = createDefaultSequence('Test');
  useSequencerStore.setState({
    sequences: [seq],
    activeSequenceId: seq.id,
    isPlaying: false,
    hasHydrated: true,
  });
  return seq;
}

function active() {
  const seq = useSequencerStore.getState().activeSequence();
  if (!seq) throw new Error('geen actieve sequence');
  return seq;
}

describe('sequencerStore', () => {
  beforeEach(() => {
    localStorage.clear();
    freshState();
  });

  // --- Stappen ---

  it('toggleStep zet een stap aan en weer uit', () => {
    const trackId = active().tracks[0].id;
    useSequencerStore.getState().toggleStep(trackId, 3);
    expect(active().tracks[0].steps[3]).toBe(true);
    useSequencerStore.getState().toggleStep(trackId, 3);
    expect(active().tracks[0].steps[3]).toBe(false);
  });

  it('toggleStep negeert een index buiten bereik', () => {
    const trackId = active().tracks[0].id;
    useSequencerStore.getState().toggleStep(trackId, 99);
    expect(active().tracks[0].steps.every((s) => !s)).toBe(true);
  });

  it('mutaties zetten updatedAt bij', () => {
    const before = active().updatedAt;
    const trackId = active().tracks[0].id;
    useSequencerStore.getState().toggleStep(trackId, 0);
    expect(active().updatedAt >= before).toBe(true);
  });

  // --- Lengte ---

  it('setLength(+4) verlengt en vult alle sporen aan met false', () => {
    useSequencerStore.getState().setLength(4);
    expect(active().lengthSteps).toBe(SEQ_DEFAULT_STEPS + 4);
    for (const track of active().tracks) {
      expect(track.steps).toHaveLength(SEQ_DEFAULT_STEPS + 4);
    }
  });

  it('setLength(-4) verkort en behoudt de eerste stappen', () => {
    const trackId = active().tracks[0].id;
    useSequencerStore.getState().toggleStep(trackId, 0);
    useSequencerStore.getState().toggleStep(trackId, 15);
    useSequencerStore.getState().setLength(-4);
    expect(active().lengthSteps).toBe(12);
    expect(active().tracks[0].steps[0]).toBe(true);
    expect(active().tracks[0].steps).toHaveLength(12);
  });

  it('setLength klemt op minimum en maximum', () => {
    useSequencerStore.getState().setLength(-999);
    expect(active().lengthSteps).toBe(SEQ_MIN_STEPS);
    useSequencerStore.getState().setLength(999);
    expect(active().lengthSteps).toBe(SEQ_MAX_STEPS);
  });

  // --- Sporen ---

  it('addTrack voegt toe tot maximaal 8 sporen', () => {
    const { addTrack } = useSequencerStore.getState();
    for (let i = 0; i < 20; i++) addTrack();
    expect(active().tracks).toHaveLength(SEQ_MAX_TRACKS);
  });

  it('nieuw spoor volgt de actuele patroonlengte', () => {
    useSequencerStore.getState().setLength(4);
    useSequencerStore.getState().addTrack();
    const tracks = active().tracks;
    expect(tracks[tracks.length - 1].steps).toHaveLength(20);
  });

  it('removeTrack houdt minimaal 1 spoor over', () => {
    const ids = active().tracks.map((t) => t.id);
    const { removeTrack } = useSequencerStore.getState();
    for (const id of ids) removeTrack(id);
    expect(active().tracks).toHaveLength(1);
  });

  it('setTrackSample reset de trim van het vorige geluid', () => {
    const trackId = active().tracks[0].id;
    const store = useSequencerStore.getState();
    store.setTrackSample(trackId, 'kick');
    store.setTrackTrim(trackId, 0.5, 1.5);
    store.setTrackSample(trackId, 'zee');
    const track = active().tracks[0];
    expect(track.sampleId).toBe('zee');
    expect(track.trimStart).toBeUndefined();
    expect(track.trimEnd).toBeUndefined();
  });

  it('setTrackMode / toggleTrackMute / setTrackVolume werken per spoor', () => {
    const trackId = active().tracks[1].id;
    const store = useSequencerStore.getState();
    store.setTrackMode(trackId, 'cut');
    store.toggleTrackMute(trackId);
    store.setTrackVolume(trackId, 2); // wordt geklemd
    const track = active().tracks[1];
    expect(track.mode).toBe('cut');
    expect(track.mute).toBe(true);
    expect(track.volume).toBe(1);
    expect(active().tracks[0].mode).toBe('ring');
  });

  // --- Sequences ---

  it('createSequence maakt aan en activeert', () => {
    useSequencerStore.getState().createSequence('Tweede');
    const state = useSequencerStore.getState();
    expect(state.sequences).toHaveLength(2);
    expect(active().name).toBe('Tweede');
  });

  it('duplicateSequence kopieert by value met nieuwe ids', () => {
    const source = active();
    useSequencerStore.getState().toggleStep(source.tracks[0].id, 2);
    useSequencerStore.getState().duplicateSequence(source.id, ' (kopie)');

    const copy = active();
    expect(copy.id).not.toBe(source.id);
    expect(copy.name).toBe('Test (kopie)');
    expect(copy.tracks[0].id).not.toBe(source.tracks[0].id);
    expect(copy.tracks[0].steps[2]).toBe(true);

    // Wijziging in de kopie raakt het origineel niet
    useSequencerStore.getState().toggleStep(copy.tracks[0].id, 5);
    const original = useSequencerStore
      .getState()
      .sequences.find((s) => s.id === source.id);
    expect(original?.tracks[0].steps[5]).toBe(false);
  });

  it('deleteSequence van de laatste levert een verse default op', () => {
    const id = active().id;
    useSequencerStore.getState().deleteSequence(id, 'Vers');
    const state = useSequencerStore.getState();
    expect(state.sequences).toHaveLength(1);
    expect(state.sequences[0].id).not.toBe(id);
    expect(state.sequences[0].name).toBe('Vers');
    expect(state.activeSequenceId).toBe(state.sequences[0].id);
  });

  it('renameSequence trimt en weigert lege namen', () => {
    const id = active().id;
    useSequencerStore.getState().renameSequence(id, '   ');
    expect(active().name).toBe('Test');
    useSequencerStore.getState().renameSequence(id, '  Piratenbeat  ');
    expect(active().name).toBe('Piratenbeat');
  });

  // --- Hydrate ---

  it('hydrate maakt een default sequence als de opslag leeg is', () => {
    useSequencerStore.setState({
      sequences: [],
      activeSequenceId: null,
      isPlaying: false,
      hasHydrated: false,
    });
    useSequencerStore.getState().hydrate('Mijn eerste');
    const state = useSequencerStore.getState();
    expect(state.hasHydrated).toBe(true);
    expect(state.sequences).toHaveLength(1);
    expect(state.sequences[0].name).toBe('Mijn eerste');
    expect(state.activeSequenceId).toBe(state.sequences[0].id);
  });

  it('hydrate laadt bestaande opslag (incl. droppen van ongeldige entries)', () => {
    const stored = createDefaultSequence('Uit opslag');
    localStorage.setItem(
      'soundscout:sequencer-lab',
      JSON.stringify({
        version: 1,
        sequences: [stored, { id: 'kapot' }],
      })
    );
    useSequencerStore.setState({
      sequences: [],
      activeSequenceId: null,
      isPlaying: false,
      hasHydrated: false,
    });
    useSequencerStore.getState().hydrate('Fallback');
    const state = useSequencerStore.getState();
    expect(state.sequences).toHaveLength(1);
    expect(state.sequences[0].name).toBe('Uit opslag');
  });
});
