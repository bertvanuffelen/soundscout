/**
 * useUndoRedoTimeline - Undo/Redo voor timeline bewerkingen
 *
 * Snapshot-based: bij elke track-wijziging wordt een kopie opgeslagen.
 * Undo herstelt de vorige snapshot, redo gaat weer vooruit.
 *
 * Max 50 snapshots (~250KB geheugen).
 * History wordt gereset bij het laden van een opgeslagen compositie.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useTimelineStore } from '../stores/timelineStore';
import type { Track } from '../types';

const MAX_HISTORY = 50;

/** Deep clone tracks array (clips zijn shallow-safe: alleen primitieven) */
function cloneTracks(tracks: Track[]): Track[] {
  return tracks.map((t) => ({
    ...t,
    clips: t.clips.map((c) => ({ ...c })),
  }));
}

/** Check of twee track-arrays identiek zijn (snelle vergelijking via JSON) */
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

export function useUndoRedoTimeline() {
  // History stack: array of track snapshots
  const historyRef = useRef<Track[][]>([]);
  // Current position in history (-1 = niet geïnitialiseerd)
  const indexRef = useRef(-1);
  // Flag om eigen wijzigingen (undo/redo) te negeren
  const isRestoringRef = useRef(false);

  // Initialiseer met huidige state
  useEffect(() => {
    const currentTracks = useTimelineStore.getState().tracks;
    historyRef.current = [cloneTracks(currentTracks)];
    indexRef.current = 0;
  }, []);

  // Luister naar track-wijzigingen in de store
  useEffect(() => {
    const unsubscribe = useTimelineStore.subscribe(
      (state, prevState) => {
        // Negeer als wij zelf aan het herstellen zijn
        if (isRestoringRef.current) return;

        // Negeer als tracks niet veranderd zijn
        if (state.tracks === prevState.tracks) return;

        const newTracks = state.tracks;
        const currentIndex = indexRef.current;
        const history = historyRef.current;

        // Negeer als snapshot identiek is aan huidige positie
        if (currentIndex >= 0 && tracksEqual(newTracks, history[currentIndex])) {
          return;
        }

        // Verwijder toekomstige history (na undo → nieuwe actie = redo verdwijnt)
        const newHistory = history.slice(0, currentIndex + 1);

        // Voeg nieuwe snapshot toe
        newHistory.push(cloneTracks(newTracks));

        // Beperk tot MAX_HISTORY
        if (newHistory.length > MAX_HISTORY) {
          newHistory.shift();
        }

        historyRef.current = newHistory;
        indexRef.current = newHistory.length - 1;
      }
    );
    return unsubscribe;
  }, []);

  const undo = useCallback(() => {
    const index = indexRef.current;
    if (index <= 0) return; // Niets om te undo'en

    const newIndex = index - 1;
    const snapshot = historyRef.current[newIndex];

    isRestoringRef.current = true;
    useTimelineStore.getState().loadTimeline({
      tracks: cloneTracks(snapshot),
      bpm: useTimelineStore.getState().bpm,
      totalBeats: useTimelineStore.getState().totalBeats,
      isPlaying: false,
      isLooping: useTimelineStore.getState().isLooping,
      currentBeat: 0,
    });
    indexRef.current = newIndex;
    isRestoringRef.current = false;
  }, []);

  const redo = useCallback(() => {
    const index = indexRef.current;
    const history = historyRef.current;
    if (index >= history.length - 1) return; // Niets om te redo'en

    const newIndex = index + 1;
    const snapshot = history[newIndex];

    isRestoringRef.current = true;
    useTimelineStore.getState().loadTimeline({
      tracks: cloneTracks(snapshot),
      bpm: useTimelineStore.getState().bpm,
      totalBeats: useTimelineStore.getState().totalBeats,
      isPlaying: false,
      isLooping: useTimelineStore.getState().isLooping,
      currentBeat: 0,
    });
    indexRef.current = newIndex;
    isRestoringRef.current = false;
  }, []);

  const canUndo = indexRef.current > 0;
  const canRedo = indexRef.current < historyRef.current.length - 1;

  return { undo, redo, canUndo, canRedo };
}
