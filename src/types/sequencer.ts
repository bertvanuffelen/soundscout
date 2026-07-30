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
}

export interface SequencerSequence {
  id: string;
  name: string;
  /** 4..32, veelvoud van 4 */
  lengthSteps: number;
  /** Vast 120 in v1 */
  bpm: number;
  /** 1..8 sporen */
  tracks: SequencerTrack[];
  /** ISO-tijdstempels */
  createdAt: string;
  updatedAt: string;
}
