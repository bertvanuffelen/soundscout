/**
 * sequencerStore — state van het Sequencer Lab (dev-only prototype).
 *
 * Puur state + persistentie; de audio-engine leest deze store imperatief
 * per tick (getState) en wordt hier bewust NIET aangeroepen — dat houdt de
 * store volledig testbaar zonder Tone-mocks en voorkomt circulaire imports.
 * Elke mutatie zet updatedAt en bewaart gedebounced naar localStorage.
 */

import { create } from 'zustand';
import { generateId } from '../utils/uuid';
import {
  clampLengthSteps,
  createDefaultSequence,
  createEmptyTrack,
  nextSequenceColor,
  resizeSteps,
} from '../utils/sequencer';
import { loadSequences, saveSequences } from '../services/sequencerStorage';
import { useTimelineStore } from './timelineStore';
import {
  SEQ_MAX_TRACKS,
  type SequencerSequence,
  type SequencerTrackMode,
} from '../types/sequencer';

/**
 * Persistentie-modus (fase 2):
 * - 'lab'    → eigen localStorage-sleutel (het /sequencer-prototype)
 * - 'studio' → sequences horen bij de compositie; elke mutatie wordt
 *              direct gespiegeld naar timelineStore.setSequences (die
 *              audioVersion bumpt, dus live reschedule + opslaan werken).
 */
type SequencerPersistMode = 'lab' | 'studio';

// --- Persistentie (gedebounced voor lab, direct voor studio) ---

const SAVE_DEBOUNCE_MS = 500;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function persistSequences(
  mode: SequencerPersistMode,
  getSequences: () => SequencerSequence[]
): void {
  if (mode === 'studio') {
    // Direct spiegelen: de compositie is de bron van waarheid
    useTimelineStore.getState().setSequences(getSequences());
    return;
  }
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveSequences(getSequences());
  }, SAVE_DEBOUNCE_MS);
}

// --- Store ---

interface SequencerStore {
  sequences: SequencerSequence[];
  activeSequenceId: string | null;
  isPlaying: boolean;
  hasHydrated: boolean;
  /** 'lab' (localStorage) of 'studio' (gespiegeld naar de compositie) */
  mode: SequencerPersistMode;

  /** Actieve sequence (of null) — voor imperatieve reads: getState().activeSequence() */
  activeSequence: () => SequencerSequence | null;

  /** Laad uit localStorage (lab); maak een verse default als er niets (geldigs) is */
  hydrate: (defaultName: string) => void;

  /**
   * Studio-modus (fase 2): laad de sequences van de huidige compositie.
   * Vervangt de store-inhoud volledig; mutaties spiegelen daarna direct
   * naar timelineStore. Aanroepen bij het openen van de studio.
   */
  hydrateForStudio: (sequences: SequencerSequence[]) => void;

  /** Open een specifieke sequence in de studio-tab (of sluit met null) */
  openSequenceId: string | null;
  setOpenSequenceId: (id: string | null) => void;

  // Stappen & lengte
  toggleStep: (trackId: string, stepIndex: number) => void;
  setLength: (delta: number) => void;

  // Sporen
  addTrack: () => void;
  removeTrack: (trackId: string) => void;
  setTrackSample: (trackId: string, sampleId: string) => void;
  setTrackMode: (trackId: string, mode: SequencerTrackMode) => void;
  setTrackTrim: (trackId: string, trimStart: number, trimEnd: number) => void;
  setTrackVolume: (trackId: string, volume: number) => void;
  toggleTrackMute: (trackId: string) => void;

  // Sequences
  createSequence: (name: string) => void;
  renameSequence: (id: string, name: string) => void;
  duplicateSequence: (id: string, copySuffix: string) => void;
  deleteSequence: (id: string, fallbackName: string) => void;
  setActiveSequence: (id: string) => void;

  setIsPlaying: (value: boolean) => void;
}

/** Immutable update van de actieve sequence + updatedAt + gedebouncede save */
type SequenceUpdater = (seq: SequencerSequence) => SequencerSequence;

export const useSequencerStore = create<SequencerStore>()((set, get) => {
  const updateActive = (updater: SequenceUpdater): void => {
    const { activeSequenceId } = get();
    if (!activeSequenceId) return;
    set((state) => ({
      sequences: state.sequences.map((seq) =>
        seq.id === activeSequenceId
          ? { ...updater(seq), updatedAt: new Date().toISOString() }
          : seq
      ),
    }));
    persistSequences(get().mode, () => get().sequences);
  };

  const updateTrack = (
    trackId: string,
    trackUpdater: (
      track: SequencerSequence['tracks'][number]
    ) => SequencerSequence['tracks'][number]
  ): void => {
    updateActive((seq) => ({
      ...seq,
      tracks: seq.tracks.map((track) =>
        track.id === trackId ? trackUpdater(track) : track
      ),
    }));
  };

  return {
    sequences: [],
    activeSequenceId: null,
    isPlaying: false,
    hasHydrated: false,
    mode: 'lab' as SequencerPersistMode,
    openSequenceId: null,

    activeSequence: () => {
      const { sequences, activeSequenceId } = get();
      return sequences.find((seq) => seq.id === activeSequenceId) ?? null;
    },

    hydrate: (defaultName) => {
      // Opnieuw laden als we uit studio-modus komen (composities en het lab
      // delen de store, maar nooit elkaars data)
      if (get().hasHydrated && get().mode === 'lab') return;
      let sequences = loadSequences();
      if (sequences.length === 0) {
        sequences = [createDefaultSequence(defaultName)];
        saveSequences(sequences);
      }
      set({
        sequences,
        activeSequenceId: sequences[0].id,
        hasHydrated: true,
        mode: 'lab',
        openSequenceId: null,
        isPlaying: false,
      });
    },

    hydrateForStudio: (sequences) => {
      set({
        sequences,
        activeSequenceId: sequences[0]?.id ?? null,
        hasHydrated: true,
        mode: 'studio',
        openSequenceId: null,
        isPlaying: false,
      });
    },

    setOpenSequenceId: (id) => {
      set({ openSequenceId: id });
      if (id) set({ activeSequenceId: id });
    },

    // --- Stappen & lengte ---

    toggleStep: (trackId, stepIndex) => {
      updateTrack(trackId, (track) => {
        if (stepIndex < 0 || stepIndex >= track.steps.length) return track;
        const steps = [...track.steps];
        steps[stepIndex] = !steps[stepIndex];
        return { ...track, steps };
      });
    },

    setLength: (delta) => {
      updateActive((seq) => {
        const newLength = clampLengthSteps(seq.lengthSteps + delta);
        if (newLength === seq.lengthSteps) return seq;
        return {
          ...seq,
          lengthSteps: newLength,
          tracks: seq.tracks.map((track) => ({
            ...track,
            steps: resizeSteps(track.steps, newLength),
          })),
        };
      });
    },

    // --- Sporen ---

    addTrack: () => {
      updateActive((seq) => {
        if (seq.tracks.length >= SEQ_MAX_TRACKS) return seq;
        return {
          ...seq,
          tracks: [...seq.tracks, createEmptyTrack(seq.lengthSteps)],
        };
      });
    },

    removeTrack: (trackId) => {
      updateActive((seq) => {
        if (seq.tracks.length <= 1) return seq;
        return {
          ...seq,
          tracks: seq.tracks.filter((track) => track.id !== trackId),
        };
      });
    },

    setTrackSample: (trackId, sampleId) => {
      // Nieuwe sample → trim resetten (die hoorde bij het vorige geluid)
      updateTrack(trackId, (track) => ({
        ...track,
        sampleId,
        trimStart: undefined,
        trimEnd: undefined,
      }));
    },

    setTrackMode: (trackId, mode) => {
      updateTrack(trackId, (track) => ({ ...track, mode }));
    },

    setTrackTrim: (trackId, trimStart, trimEnd) => {
      updateTrack(trackId, (track) => ({ ...track, trimStart, trimEnd }));
    },

    setTrackVolume: (trackId, volume) => {
      updateTrack(trackId, (track) => ({
        ...track,
        volume: Math.min(1, Math.max(0, volume)),
      }));
    },

    toggleTrackMute: (trackId) => {
      updateTrack(trackId, (track) => ({ ...track, mute: !track.mute }));
    },

    // --- Sequences ---

    createSequence: (name) => {
      const seq = createDefaultSequence(name, nextSequenceColor(get().sequences));
      set((state) => ({
        sequences: [...state.sequences, seq],
        activeSequenceId: seq.id,
      }));
      persistSequences(get().mode, () => get().sequences);
    },

    renameSequence: (id, name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      set((state) => ({
        sequences: state.sequences.map((seq) =>
          seq.id === id
            ? { ...seq, name: trimmed.slice(0, 60), updatedAt: new Date().toISOString() }
            : seq
        ),
      }));
      persistSequences(get().mode, () => get().sequences);
    },

    duplicateSequence: (id, copySuffix) => {
      const source = get().sequences.find((seq) => seq.id === id);
      if (!source) return;
      const now = new Date().toISOString();
      const copy: SequencerSequence = {
        ...source,
        id: generateId(),
        name: `${source.name}${copySuffix}`.slice(0, 60),
        // Kopie krijgt een eigen kleur — anders zijn origineel en kopie
        // visueel niet te onderscheiden op de montagelijn
        color: nextSequenceColor(get().sequences),
        tracks: source.tracks.map((track) => ({
          ...track,
          id: generateId(),
          steps: [...track.steps],
        })),
        createdAt: now,
        updatedAt: now,
      };
      set((state) => ({
        sequences: [...state.sequences, copy],
        activeSequenceId: copy.id,
      }));
      persistSequences(get().mode, () => get().sequences);
    },

    deleteSequence: (id, fallbackName) => {
      set((state) => {
        let sequences = state.sequences.filter((seq) => seq.id !== id);
        // Nooit met lege lijst achterblijven — vervang door een verse default
        if (sequences.length === 0) {
          sequences = [createDefaultSequence(fallbackName)];
        }
        const activeSequenceId =
          state.activeSequenceId === id
            ? sequences[0].id
            : state.activeSequenceId;
        return { sequences, activeSequenceId };
      });
      persistSequences(get().mode, () => get().sequences);
    },

    setActiveSequence: (id) => {
      if (!get().sequences.some((seq) => seq.id === id)) return;
      set({ activeSequenceId: id });
    },

    setIsPlaying: (value) => set({ isPlaying: value }),
  };
});
