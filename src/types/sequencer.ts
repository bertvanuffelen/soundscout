/**
 * Sequencer Lab — types en constanten (dev-only prototype).
 *
 * Bewust een eigen bestand: raakt src/types/index.ts niet, zodat het
 * prototype nul invloed heeft op bestaande schema's en opslag.
 */

// --- Constanten ---

/** Minimale patroonlengte in vakjes (1 maat van 4 tellen) */
export const SEQ_MIN_STEPS = 4;
/** Maximale patroonlengte in vakjes (8 maten) */
export const SEQ_MAX_STEPS = 32;
/** Standaard patroonlengte (4 maten van 4 tellen) */
export const SEQ_DEFAULT_STEPS = 16;
/** Stapgrootte van de +/− lengteknoppen (1 maat) */
export const SEQ_STEP_INCREMENT = 4;
/** Aantal sporen bij een nieuwe sequence */
export const SEQ_DEFAULT_TRACKS = 3;
/** Maximaal aantal sporen */
export const SEQ_MAX_TRACKS = 8;
/** Vast tempo in v1 (veld bestaat zodat een slider later triviaal is) */
export const SEQ_DEFAULT_BPM = 120;
/** Micro-fade-in (s) op getrimde starts — klikvrij (niet-nulpunt-start) */
export const SEQ_DECLICK_IN_SECONDS = 0.003;
/** Micro-fade-out (s) bij choke-stop — klikvrij afkappen */
export const SEQ_CHOKE_FADE_SECONDS = 0.01;

// --- Fase 2: sequence-clips op de montagelijn ---

/**
 * Een sequence-clip is een gewone Clip waarvan sampleId naar een VIRTUELE
 * sample verwijst: `seq:<sequenceId>`. De virtuele sample (duur = vakjes ×
 * tel-duur) wordt on-the-fly aan de sample-lijsten toegevoegd, waardoor
 * collision, clip-breedte, loop-uitrekken, dupliceren en undo ongewijzigd
 * blijven werken. Bij het inplannen (audioEvents) wordt het patroon
 * uitgepakt naar gewone geluids-events.
 */
export const SEQUENCE_SAMPLE_PREFIX = 'seq:';
/**
 * Kleurenpalet voor sequence-bundels/-clips. De EERSTE kleur is altijd het
 * oker-geel van de huisstijl (accent-500) — zo blijft "sequence = geel" de
 * eerste indruk. Daarna variaties (warme oker-familie eerst, dan bredere
 * kleuren) zodat meerdere sequences uit elkaar te houden zijn. Herkenbaar
 * blijven ze door raster-icoon, stippelrand en blokjespatroon.
 */
export const SEQUENCE_COLORS = [
  '#F59E0B', // oker-geel (accent-500) — altijd als eerste
  '#B45309', // brons (accent-700)
  '#FBBF24', // licht amber (accent-300)
  '#EA580C', // oranje
  '#84CC16', // limoen
  '#0D9488', // teal
  '#6366F1', // indigo
  '#DB2777', // magenta
] as const;

/** Standaardkleur (= de eerste uit het palet) */
export const SEQUENCE_COLOR = SEQUENCE_COLORS[0];
/** Lucide-icoon voor sequence-bundels */
export const SEQUENCE_ICON = 'Grid3x3';

// --- Datamodel ---

/** Gedrag van een spoor wanneer een nieuwe stap start terwijl de vorige nog klinkt */
export type SequencerTrackMode = 'ring' | 'cut';

export interface SequencerTrack {
  id: string;
  /** Gekoppeld geluid; null = leeg spoor ("kies een geluid") */
  sampleId: string | null;
  /** Eén boolean per vakje; lengte === sequence.lengthSteps (store bewaakt dit) */
  steps: boolean[];
  /** 'ring' = uitklinken/overlappen (default) · 'cut' = choke (afkappen) */
  mode: SequencerTrackMode;
  /** Trim-start in seconden (0 = begin sample) */
  trimStart?: number;
  /** Trim-einde in seconden (undefined = einde sample) */
  trimEnd?: number;
  /** Lineaire gain 0..1 (default 1) */
  volume?: number;
  mute?: boolean;
  /**
   * Aanslagsterkte per vakje 0..1 (V2 Fase 4), vermenigvuldigd met `volume`.
   * Afwezig of korter dan `steps` = 1 voor de ontbrekende vakjes.
   */
  velocities?: number[];
}

// --- Melodie (V2 Fase 4 — datamodel + events; UI volgt) ---

/** 'rhythm' = het bestaande stappenraster (default) · 'melody' = notenraster */
export type SequenceKind = 'rhythm' | 'melody';

/** Pentatonische standaardtoonladder: C D E G A (semitonen boven de grondtoon) */
export const MELODY_DEFAULT_SCALE: readonly number[] = [0, 2, 4, 7, 9];
/** Grondtoon van rij 0 als MIDI-noot (60 = C4) */
export const MELODY_DEFAULT_ROOT = 60;
/** Aantal octaven in het raster (rijen = scale.length × octaves) */
export const MELODY_DEFAULT_OCTAVES = 2;
export const MELODY_MAX_OCTAVES = 3;
/** Swing-bovengrens: 0.5 = de achtertel schuift een halve tel op */
export const SEQ_MAX_SWING = 0.5;
/** Ingebouwde synth-klanken (deterministisch gerenderd, zie synthVoice.ts) */
export const SYNTH_PRESETS = ['soft', 'bright', 'pluck'] as const;
export type SynthPreset = (typeof SYNTH_PRESETS)[number];

/**
 * De stem van een melodie: een bibliotheekgeluid (per noot getransponeerd
 * via de bake-service — `baseNote` = de toonhoogte die het geluid zelf
 * heeft, default MELODY_DEFAULT_ROOT) of een ingebouwde synth.
 */
export type MelodyVoice =
  | { type: 'sample'; sampleId: string | null; baseNote?: number }
  | { type: 'synth'; preset: SynthPreset };

/** Eén noot in het melodieraster */
export interface MelodyNote {
  /** Vakje (0-gebaseerd, < lengthSteps) */
  step: number;
  /** Rij in het raster: 0 = grondtoon; rij r = scale[r % n] + 12·floor(r / n) */
  row: number;
  /** Lengte in vakjes (default 1) */
  length?: number;
  /** Aanslagsterkte 0..1 (default 1) */
  velocity?: number;
}

export interface MelodyPattern {
  /** MIDI-noot van rij 0 */
  root: number;
  /** Toonladder in semitonen boven de grondtoon, oplopend */
  scale: number[];
  /** 1..MELODY_MAX_OCTAVES */
  octaves: number;
  voice: MelodyVoice;
  /** Meerdere noten per vakje mag (akkoorden) */
  notes: MelodyNote[];
  /** Lineaire gain 0..1 (default 1) */
  volume?: number;
  mute?: boolean;
}

export interface SequencerSequence {
  id: string;
  name: string;
  /** Kleur uit SEQUENCE_COLORS (undefined = eerste kleur, oker-geel) */
  color?: string;
  /** 4..32, veelvoud van 4 */
  lengthSteps: number;
  /**
   * Tempo voor het LAB. Op de tijdlijn volgt een sequence altijd het tempo
   * van de compositie (1 vakje = 1 tel), dit veld wordt daar genegeerd.
   */
  bpm: number;
  /** 1..8 sporen (ritme). Een melodie-sequence houdt ≥1 leeg spoor (oudere clients). */
  tracks: SequencerTrack[];
  /** Default 'rhythm' (afwezig = ritme, zoals vóór V2 Fase 4) */
  kind?: SequenceKind;
  /** Swing 0..0.5 op de achtertellen (oneven vakjes); default 0 */
  swing?: number;
  /** Alleen bij kind 'melody' */
  melody?: MelodyPattern;
  /** ISO-tijdstempels */
  createdAt: string;
  updatedAt: string;
}
