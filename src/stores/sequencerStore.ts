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
  createDefaultMelodySequence,
  createDefaultSequence,
  createEmptyTrack,
  isSequenceEmpty,
  melodyRowCount,
  nextSequenceColor,
  resizeSteps,
} from '../utils/sequencer';
import { loadSequences, saveSequences } from '../services/sequencerStorage';
import { useTimelineStore } from './timelineStore';
import {
  MELODY_MAX_OCTAVES,
  SEQ_MAX_SWING,
  SEQ_MAX_TRACKS,
  type MelodyVoice,
  type SequenceKind,
  type SequencerSequence,
  type SequencerTrackMode,
} from '../types/sequencer';

/** Resultaat van een tik in het melodieraster (voor de directe voorbeluistering) */
export type MelodyNoteToggleResult = 'added' | 'changed' | 'removed' | 'ignored';

/** Maak een verse sequence van het gevraagde soort */
function createSequenceOfKind(name: string, kind: SequenceKind, color: string): SequencerSequence {
  return kind === 'melody'
    ? createDefaultMelodySequence(name, undefined, color)
    : createDefaultSequence(name, color);
}

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
  /** Aanslagsterkte van één ritmevakje (0..1); 1 = standaard */
  setStepVelocity: (trackId: string, stepIndex: number, velocity: number) => void;
  /** Swing van de actieve sequence (0..SEQ_MAX_SWING) */
  setSwing: (swing: number) => void;

  // Ritme ⇄ Melodie (V2 Fase 4)
  /**
   * Wissel het soort van de actieve sequence. Mag alleen zolang die nog
   * leeg is (geen stappen/noten) — anders gebeurt er niets en geeft hij
   * false terug; de UI biedt dan een nieuwe sequence aan.
   */
  setSequenceKind: (kind: SequenceKind) => boolean;

  // Melodie
  /**
   * Tik op een melodievakje met de gekozen sterkte ("kwast"): leeg → noot
   * erbij; noot met een andere sterkte → sterkte wordt de kwast; noot met
   * dezelfde sterkte → noot weg.
   */
  toggleMelodyNote: (step: number, row: number, velocity?: number) => MelodyNoteToggleResult;
  setMelodyVoice: (voice: MelodyVoice) => void;
  /** 1..MELODY_MAX_OCTAVES; noten boven het nieuwe bereik vervallen */
  setMelodyOctaves: (octaves: number) => void;

  // Sporen
  addTrack: () => void;
  removeTrack: (trackId: string) => void;
  setTrackSample: (trackId: string, sampleId: string) => void;
  setTrackMode: (trackId: string, mode: SequencerTrackMode) => void;
  setTrackTrim: (trackId: string, trimStart: number, trimEnd: number) => void;
  setTrackVolume: (trackId: string, volume: number) => void;
  toggleTrackMute: (trackId: string) => void;

  // Sequences
  createSequence: (name: string, kind?: SequenceKind) => void;
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
            ...(track.velocities
              ? { velocities: track.velocities.slice(0, newLength) }
              : {}),
          })),
          // Zelfde regel als bij ritme: wat buiten het patroon valt, vervalt
          ...(seq.melody
            ? {
                melody: {
                  ...seq.melody,
                  notes: seq.melody.notes.filter((note) => note.step < newLength),
                },
              }
            : {}),
        };
      });
    },

    setStepVelocity: (trackId, stepIndex, velocity) => {
      updateTrack(trackId, (track) => {
        if (stepIndex < 0 || stepIndex >= track.steps.length) return track;
        const velocities = Array.from(
          { length: track.steps.length },
          (_, i) => track.velocities?.[i] ?? 1
        );
        velocities[stepIndex] = Math.min(1, Math.max(0, velocity));
        // Alles standaard → veld weglaten (schoon model, = gedrag vóór Fase 4)
        return velocities.every((v) => v === 1)
          ? { ...track, velocities: undefined }
          : { ...track, velocities };
      });
    },

    setSwing: (swing) => {
      const clamped = Number.isFinite(swing)
        ? Math.round(Math.min(SEQ_MAX_SWING, Math.max(0, swing)) * 100) / 100
        : 0;
      updateActive((seq) => ({ ...seq, swing: clamped }));
    },

    // --- Ritme ⇄ Melodie ---

    setSequenceKind: (kind) => {
      const seq = get().activeSequence();
      if (!seq) return false;
      const current: SequenceKind = seq.kind ?? 'rhythm';
      if (current === kind) return true;
      if (!isSequenceEmpty(seq)) return false;
      updateActive((s) => {
        // Zelfde id/naam/kleur/lengte (clips op de montagelijn blijven geldig)
        const fresh = createSequenceOfKind(s.name, kind, s.color ?? '');
        const tracks =
          kind === 'melody'
            ? [createEmptyTrack(s.lengthSteps)]
            : fresh.tracks.map(() => createEmptyTrack(s.lengthSteps));
        const next: SequencerSequence = {
          ...s,
          kind,
          tracks,
          melody: kind === 'melody' ? fresh.melody : undefined,
        };
        if (kind === 'rhythm') delete next.melody;
        return next;
      });
      return true;
    },

    // --- Melodie ---

    toggleMelodyNote: (step, row, velocity = 1) => {
      const seq = get().activeSequence();
      const melody = seq?.melody;
      if (!seq || seq.kind !== 'melody' || !melody) return 'ignored';
      if (step < 0 || step >= seq.lengthSteps) return 'ignored';
      if (row < 0 || row >= melodyRowCount(melody)) return 'ignored';
      const v = Math.min(1, Math.max(0, velocity));
      const existing = melody.notes.find((n) => n.step === step && n.row === row);
      let result: MelodyNoteToggleResult;
      let notes = melody.notes;
      if (!existing) {
        result = 'added';
        notes = [...notes, v === 1 ? { step, row } : { step, row, velocity: v }];
      } else if (Math.abs((existing.velocity ?? 1) - v) < 1e-6) {
        result = 'removed';
        notes = notes.filter((n) => n !== existing);
      } else {
        result = 'changed';
        notes = notes.map((n) => {
          if (n !== existing) return n;
          const { velocity: _old, ...rest } = n;
          void _old;
          return v === 1 ? rest : { ...rest, velocity: v };
        });
      }
      updateActive((s) => (s.melody ? { ...s, melody: { ...s.melody, notes } } : s));
      return result;
    },

    setMelodyVoice: (voice) => {
      updateActive((seq) =>
        seq.melody ? { ...seq, melody: { ...seq.melody, voice } } : seq
      );
    },

    setMelodyOctaves: (octaves) => {
      updateActive((seq) => {
        if (!seq.melody) return seq;
        const clamped = Math.min(MELODY_MAX_OCTAVES, Math.max(1, Math.round(octaves)));
        if (clamped === seq.melody.octaves) return seq;
        const rows = seq.melody.scale.length * clamped;
        return {
          ...seq,
          melody: {
            ...seq.melody,
            octaves: clamped,
            notes: seq.melody.notes.filter((note) => note.row < rows),
          },
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

    createSequence: (name, kind = 'rhythm') => {
      const seq = createSequenceOfKind(name, kind, nextSequenceColor(get().sequences));
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
          ...(track.velocities ? { velocities: [...track.velocities] } : {}),
        })),
        ...(source.melody
          ? {
              melody: {
                ...source.melody,
                scale: [...source.melody.scale],
                voice: { ...source.melody.voice },
                notes: source.melody.notes.map((note) => ({ ...note })),
              },
            }
          : {}),
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
        // Lab: nooit met een lege lijst achterblijven — vervang door een verse
        // default. Studio NIET: daar verscheen die verse lege sequence als chip
        // in de bibliotheek ("er komt vanzelf een lege sequence", stagingtest
        // 16-11). Een compositie zonder sequences is gewoon geldig.
        if (sequences.length === 0 && state.mode === 'lab') {
          sequences = [createDefaultSequence(fallbackName)];
        }
        const activeSequenceId =
          state.activeSequenceId === id
            ? (sequences[0]?.id ?? null)
            : state.activeSequenceId;
        const openSequenceId = state.openSequenceId === id ? null : state.openSequenceId;
        return { sequences, activeSequenceId, openSequenceId };
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
