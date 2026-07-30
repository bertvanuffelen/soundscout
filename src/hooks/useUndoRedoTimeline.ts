/**
 * useUndoRedoTimeline - Undo/Redo voor timeline bewerkingen
 *
 * Snapshot-based: bij elke track/section-wijziging wordt een kopie opgeslagen.
 * Undo herstelt de vorige snapshot, redo gaat weer vooruit.
 *
 * Max 50 snapshots (~250KB geheugen).
 * History wordt gereset bij het laden van een opgeslagen compositie.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useTimelineStore } from '../stores/timelineStore';
import { useAudioStore } from '../stores/audioStore';
import { audioService } from '../services/AudioService';
import type { Track, Section } from '../types';

const MAX_HISTORY = 50;

/** A snapshot of the timeline state that can be undone/redone */
interface TimelineSnapshot {
  tracks: Track[];
  sections: Section[];
}

/** Deep clone tracks array (clips zijn shallow-safe: alleen primitieven) */
function cloneTracks(tracks: Track[]): Track[] {
  return tracks.map((t) => ({
    ...t,
    clips: t.clips.map((c) => ({ ...c })),
  }));
}

/** Deep clone sections array (shallow-safe: alleen primitieven) */
function cloneSections(sections: Section[]): Section[] {
  return sections.map((s) => ({ ...s }));
}

/** Create a snapshot from current state */
function createSnapshot(tracks: Track[], sections: Section[]): TimelineSnapshot {
  return {
    tracks: cloneTracks(tracks),
    sections: cloneSections(sections),
  };
}

/** Check of twee track-arrays identiek zijn (snelle vergelijking) */
function tracksEqual(a: Track[], b: Track[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].clips.length !== b[i].clips.length) return false;
    for (let j = 0; j < a[i].clips.length; j++) {
      const ca = a[i].clips[j];
      const cb = b[i].clips[j];
      if (
        ca.id !== cb.id ||
        ca.sampleId !== cb.sampleId ||
        ca.startBeat !== cb.startBeat ||
        ca.trimStart !== cb.trimStart ||
        ca.trimEnd !== cb.trimEnd
      ) {
        return false;
      }
    }
  }
  return true;
}

/** Check of twee section-arrays identiek zijn */
function sectionsEqual(a: Section[], b: Section[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].id !== b[i].id ||
      a[i].endBeat !== b[i].endBeat ||
      a[i].color !== b[i].color ||
      a[i].label !== b[i].label
    ) {
      return false;
    }
  }
  return true;
}

/** Check of twee snapshots identiek zijn */
function snapshotsEqual(a: TimelineSnapshot, b: TimelineSnapshot): boolean {
  return tracksEqual(a.tracks, b.tracks) && sectionsEqual(a.sections, b.sections);
}

export function useUndoRedoTimeline() {
  // History stack: array of timeline snapshots
  const historyRef = useRef<TimelineSnapshot[]>([]);
  // Current position in history (-1 = niet geïnitialiseerd)
  const indexRef = useRef(-1);
  // Flag om eigen wijzigingen (undo/redo) te negeren
  const isRestoringRef = useRef(false);
  // Reactive state voor UI knoppen
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateCanFlags = useCallback(() => {
    setCanUndo(indexRef.current > 0);
    setCanRedo(indexRef.current < historyRef.current.length - 1);
  }, []);

  // Initialiseer met huidige state
  useEffect(() => {
    const state = useTimelineStore.getState();
    historyRef.current = [createSnapshot(state.tracks, state.sections)];
    indexRef.current = 0;
  }, []);

  // Luister naar track/section-wijzigingen in de store
  useEffect(() => {
    const unsubscribe = useTimelineStore.subscribe(
      (state, prevState) => {
        // Negeer als wij zelf aan het herstellen zijn
        if (isRestoringRef.current) return;

        // Negeer als tracks EN sections niet veranderd zijn
        if (state.tracks === prevState.tracks && state.sections === prevState.sections) return;

        const currentIndex = indexRef.current;
        const history = historyRef.current;
        const newSnapshot = createSnapshot(state.tracks, state.sections);

        // Negeer als snapshot identiek is aan huidige positie
        if (currentIndex >= 0 && snapshotsEqual(newSnapshot, history[currentIndex])) {
          return;
        }

        // Verwijder toekomstige history (na undo → nieuwe actie = redo verdwijnt)
        const newHistory = history.slice(0, currentIndex + 1);

        // Voeg nieuwe snapshot toe
        newHistory.push(newSnapshot);

        // Beperk tot MAX_HISTORY
        if (newHistory.length > MAX_HISTORY) {
          newHistory.shift();
        }

        historyRef.current = newHistory;
        indexRef.current = newHistory.length - 1;
        updateCanFlags();
      }
    );
    return unsubscribe;
  }, [updateCanFlags]);

  const undo = useCallback(() => {
    const index = indexRef.current;
    if (index <= 0) return; // Niets om te undo'en

    const newIndex = index - 1;
    const snapshot = historyRef.current[newIndex];

    // Force stop audio before restoring — prevents desync where old clips keep playing
    if (useAudioStore.getState().isPlaying) {
      audioService.stop();
    }

    isRestoringRef.current = true;
    useTimelineStore.getState().loadTimeline({
      tracks: cloneTracks(snapshot.tracks),
      bpm: useTimelineStore.getState().bpm,
      totalBeats: useTimelineStore.getState().totalBeats,
      isLooping: useTimelineStore.getState().isLooping,
      sections: cloneSections(snapshot.sections),
      // Sequences vallen buiten de undo-historie (fase 2) — huidige behouden
      sequences: useTimelineStore.getState().sequences,
    });
    indexRef.current = newIndex;
    isRestoringRef.current = false;
    updateCanFlags();
  }, [updateCanFlags]);

  const redo = useCallback(() => {
    const index = indexRef.current;
    const history = historyRef.current;
    if (index >= history.length - 1) return; // Niets om te redo'en

    const newIndex = index + 1;
    const snapshot = history[newIndex];

    // Force stop audio before restoring — prevents desync where old clips keep playing
    if (useAudioStore.getState().isPlaying) {
      audioService.stop();
    }

    isRestoringRef.current = true;
    useTimelineStore.getState().loadTimeline({
      tracks: cloneTracks(snapshot.tracks),
      bpm: useTimelineStore.getState().bpm,
      totalBeats: useTimelineStore.getState().totalBeats,
      isLooping: useTimelineStore.getState().isLooping,
      sections: cloneSections(snapshot.sections),
      // Sequences vallen buiten de undo-historie (fase 2) — huidige behouden
      sequences: useTimelineStore.getState().sequences,
    });
    indexRef.current = newIndex;
    isRestoringRef.current = false;
    updateCanFlags();
  }, [updateCanFlags]);

  return { undo, redo, canUndo, canRedo };
}
