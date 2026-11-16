/**
 * audioPins — welke gedecodeerde buffers zijn NU in gebruik (V2 Fase 3)?
 *
 * Het geheugenbudget (memoryBudget.ts) ruimt nooit een buffer op die hier
 * vastgepind is. Bron van waarheid, samengevoegd door
 * `AudioService.collectPins()` (de enige provider van het budget):
 *
 *  (a) clips op de tijdlijn van de huidige compositie — timelineStore, incl.
 *      de geluiden in sequence-patronen (`seq:`-clips pakken uit naar hun
 *      patroon-geluiden; álle sequences van de compositie tellen mee)
 *  (b) recorder-slots en bibliotheek van de huidige sessie — libraryStore
 *  (c) wat de motor speelt of ingepland heeft — AudioService.scheduledTracks
 *      (+ sequences); dekt ook de presentatie-/podiumspeler, die tracks
 *      plant die niet in timelineStore staan, en de realtime-vangnet-opname
 *  (d) een export in uitvoering — de export rendert de tijdlijn (a)/(c); en
 *      opruimen disposet de ToneAudioBuffer bewust NIET, dus een buffer die
 *      de export al vasthoudt blijft geldig (zie SampleStore.evict)
 *  (e) wat er nu als preview klinkt — AudioService.preview*
 *  (f) de laatst gevraagde werksets — SampleStore.getRecentRequestIds()
 *      (bv. de hotspots van de locatie waar het kind nu staat, of de
 *      compositie die de presentatiespeler net geladen heeft maar nog niet
 *      gepland)
 *
 * Pitch-bakes worden per (sample, semitonen) vastgepind: alleen de
 * toonhoogtes die echt op de tijdlijn of in de preview staan. Sinds V2 Fase 4
 * pinnen we per bake-RECEPT (pitch/speed/reverse/tempo-stretch, ook van
 * uitgepakte sequence-stappen) zodra de samples en het tempo bekend zijn.
 */

import type { Sample, Track } from '../../types';
import type { SequencerSequence } from '../../types/sequencer';
import { getSequenceIdFromSampleId } from '../../utils/sequencer';
import { useTimelineStore } from '../../stores/timelineStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { pitchKey } from './memoryBudget';
import { generateClipEvents } from '../audioEvents';
import { hasAsyncStage, hasSyncStage, recipeKey, syncStageOf } from '../bakeRecipe';

/** Veranderlijke variant voor het opbouwen */
export interface MutablePinSet {
  sampleIds: Set<string>;
  pitchKeys: Set<string>;
}

export function createPinSet(): MutablePinSet {
  return { sampleIds: new Set(), pitchKeys: new Set() };
}

/**
 * Voeg de geluiden van een tijdlijn toe: gewone clips (+ hun pitch) en de
 * patroon-geluiden van ALLE meegegeven sequences (ook nog niet geplaatste —
 * een open sequence wordt gewoon bewerkt en beluisterd).
 */
export function addTimelinePins(
  pins: MutablePinSet,
  tracks: readonly Track[],
  sequences: readonly SequencerSequence[] = [],
  context?: { samples: readonly Sample[]; bpm: number }
): MutablePinSet {
  for (const track of tracks) {
    for (const clip of track.clips) {
      if (getSequenceIdFromSampleId(clip.sampleId)) continue; // via sequences hieronder
      pins.sampleIds.add(clip.sampleId);
      const semitones = clip.effects?.pitch ?? 0;
      if (semitones !== 0) pins.pitchKeys.add(pitchKey(clip.sampleId, semitones));
    }
  }
  for (const sequence of sequences) {
    for (const patternTrack of sequence.tracks) {
      if (patternTrack.sampleId) pins.sampleIds.add(patternTrack.sampleId);
    }
    const voice = sequence.kind === 'melody' ? sequence.melody?.voice : undefined;
    if (voice?.type === 'sample' && voice.sampleId) pins.sampleIds.add(voice.sampleId);
  }
  if (context) addBakePins(pins, tracks, sequences, context.samples, context.bpm);
  return pins;
}

/**
 * Pin de bake-recepten van een tijdlijn (V2 Fase 4) — via dezelfde
 * event-generatie als live en export, dus exact de buffers die zullen spelen.
 */
export function addBakePins(
  pins: MutablePinSet,
  tracks: readonly Track[],
  sequences: readonly SequencerSequence[],
  samples: readonly Sample[],
  bpm: number
): MutablePinSet {
  const { events } = generateClipEvents([...tracks], [...samples], { bpm, sequences: [...sequences] });
  for (const event of events) {
    if (!event.recipe) continue;
    pins.pitchKeys.add(recipeKey(event.sampleId, event.recipe));
    if (hasSyncStage(event.recipe) && hasAsyncStage(event.recipe)) {
      pins.pitchKeys.add(recipeKey(event.sampleId, syncStageOf(event.recipe)));
    }
  }
  return pins;
}

export function addSampleIdPins(pins: MutablePinSet, ids: Iterable<string | null | undefined>): MutablePinSet {
  for (const id of ids) {
    if (id) pins.sampleIds.add(id);
  }
  return pins;
}

/** (a) + (b): de sessie-stores. */
export function addSessionPins(pins: MutablePinSet): MutablePinSet {
  const timeline = useTimelineStore.getState();
  const library = useLibraryStore.getState();
  addTimelinePins(pins, timeline.tracks, timeline.sequences ?? [], {
    samples: library.librarySamples,
    bpm: timeline.bpm,
  });
  addSampleIdPins(pins, library.librarySamples.map((s) => s.id));
  addSampleIdPins(pins, library.recorderSlots.map((s) => s?.id));
  return pins;
}
