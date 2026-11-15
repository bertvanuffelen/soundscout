/**
 * Luisterspiegel — vormkaart-analyse + vragenkeuze (podiumstap).
 *
 * 100% lokaal en op regels: alleen de clips op de montagelijn worden gelezen.
 * Geen AI, geen netwerk, niets wordt bewaard. Puur en zonder React, zodat
 * elke regel testbaar is.
 *
 * Uitgangspunten:
 * - lengte van een clip = wat je hoort (trim en loop tellen mee);
 * - gedempte sporen tellen niet mee (het podium speelt ze ook niet);
 * - een sequence-clip (`seq:<id>`) is één geluid: geef de sample-lijst mee
 *   die met `withSequenceSamples` is aangevuld;
 * - de soundscape loopt van tel 0 tot het einde van de laatste clip en wordt
 *   in vier gelijke delen verdeeld.
 */

import type { Clip, Sample, Track } from '../types';
import { DEFAULT_BPM } from '../constants/config';
import { getClipDurationBeats, getEffectiveClipDurationBeats } from './audio';

// --- Types ---

export type MirrorRule =
  | 'busy-peak'
  | 'silence'
  | 'repeat'
  | 'no-repeat'
  | 'few-sounds'
  | 'many-sounds'
  | 'always';

export interface MirrorQuestion {
  id: string;
  rule: MirrorRule;
  /** i18n-sleutel; plaatshouders `{{part}}` en `{{sound}}` */
  textKey: string;
}

/** Eén blok op de vormkaart */
export interface MirrorBlock {
  clipId: string;
  /** Index van het spoor op de montagelijn */
  trackIndex: number;
  sampleId: string;
  color: string;
  startBeat: number;
  lengthBeats: number;
}

export interface MirrorAnalysis {
  blocks: MirrorBlock[];
  /** Sporen met hoorbare clips, van boven naar beneden */
  trackIndexes: number[];
  /** Einde van de laatste clip (minimaal 1, zodat delen nooit 0 breed zijn) */
  totalBeats: number;
  /** Aantal clips dat in elk deel klinkt */
  density: number[];
  /** Index van het drukste deel; null als geen deel er duidelijk uitspringt */
  busiestPart: number | null;
  /** Index van het eerste stille deel; null als er geen is */
  silentPart: number | null;
  /** sampleId van het geluid dat het vaakst terugkomt; null als niets terugkomt */
  repeatedSampleId: string | null;
  /** Aantal verschillende geluiden */
  distinct: number;
  /** Regels die op deze soundscape passen */
  matches: Set<MirrorRule>;
}

// --- Constanten ---

export const MIRROR_PARTS = 4;
export const MAX_MIRROR_QUESTIONS = 2;
/** T/m dit aantal verschillende geluiden heet het "weinig" */
export const FEW_SOUNDS_MAX = 2;
/** Vanaf dit aantal verschillende geluiden heet het "veel" */
export const MANY_SOUNDS_MIN = 5;

const EPSILON = 1e-6;

/**
 * Ingebouwde vragenbank. De teksten staan in i18n (`luisterspiegel.questions.*`).
 * Later komt deze lijst uit het beheer-dashboard; `pickQuestions` neemt daarom
 * de bank als parameter.
 */
export const LUISTERSPIEGEL_QUESTIONS: MirrorQuestion[] = [
  { id: 'busyPeak1', rule: 'busy-peak', textKey: 'luisterspiegel.questions.busyPeak1' },
  { id: 'busyPeak2', rule: 'busy-peak', textKey: 'luisterspiegel.questions.busyPeak2' },
  { id: 'silence1', rule: 'silence', textKey: 'luisterspiegel.questions.silence1' },
  { id: 'silence2', rule: 'silence', textKey: 'luisterspiegel.questions.silence2' },
  { id: 'repeat1', rule: 'repeat', textKey: 'luisterspiegel.questions.repeat1' },
  { id: 'repeat2', rule: 'repeat', textKey: 'luisterspiegel.questions.repeat2' },
  { id: 'noRepeat1', rule: 'no-repeat', textKey: 'luisterspiegel.questions.noRepeat1' },
  { id: 'fewSounds1', rule: 'few-sounds', textKey: 'luisterspiegel.questions.fewSounds1' },
  { id: 'manySounds1', rule: 'many-sounds', textKey: 'luisterspiegel.questions.manySounds1' },
  { id: 'always1', rule: 'always', textKey: 'luisterspiegel.questions.always1' },
  { id: 'always2', rule: 'always', textKey: 'luisterspiegel.questions.always2' },
];

// --- Analyse ---

/** Speelt een loopende clip het geluid meer dan één keer af? */
function loopRepeats(clip: Clip, sample: Sample, bpm: number): boolean {
  if (!clip.loop || !clip.loopDurationBeats) return false;
  return clip.loopDurationBeats > getClipDurationBeats(clip, sample, bpm) + EPSILON;
}

export function analyseMirror(
  tracks: Track[],
  samples: Sample[],
  bpm: number = DEFAULT_BPM,
): MirrorAnalysis {
  const sampleById = new Map(samples.map((s) => [s.id, s]));
  const blocks: MirrorBlock[] = [];
  /** Hoe vaak een geluid klinkt: elke clip telt, een loop telt als terugkomen */
  const uses = new Map<string, number>();

  tracks.forEach((track, trackIndex) => {
    if (track.mute) return;
    for (const clip of track.clips) {
      const sample = sampleById.get(clip.sampleId);
      if (!sample) continue;
      const lengthBeats = getEffectiveClipDurationBeats(clip, sample, bpm);
      if (!(lengthBeats > 0)) continue;
      blocks.push({
        clipId: clip.id,
        trackIndex,
        sampleId: clip.sampleId,
        color: sample.color,
        startBeat: clip.startBeat,
        lengthBeats,
      });
      uses.set(clip.sampleId, (uses.get(clip.sampleId) ?? 0) + (loopRepeats(clip, sample, bpm) ? 2 : 1));
    }
  });

  const totalBeats = Math.max(1, ...blocks.map((b) => b.startBeat + b.lengthBeats));
  const partBeats = totalBeats / MIRROR_PARTS;
  const density = Array.from({ length: MIRROR_PARTS }, (_, part) => {
    const from = part * partBeats;
    const to = from + partBeats;
    return blocks.filter((b) => b.startBeat < to - EPSILON && b.startBeat + b.lengthBeats > from + EPSILON).length;
  });

  const max = Math.max(...density);
  const busiestPart = max >= 2 && density.filter((d) => d === max).length === 1 ? density.indexOf(max) : null;
  const silentIndex = density.indexOf(0);
  const silentPart = blocks.length > 0 && silentIndex >= 0 ? silentIndex : null;

  let repeatedSampleId: string | null = null;
  let mostUses = 1;
  for (const [sampleId, count] of uses) {
    if (count > mostUses) {
      mostUses = count;
      repeatedSampleId = sampleId;
    }
  }
  const distinct = uses.size;

  const matches = new Set<MirrorRule>(['always']);
  if (busiestPart !== null) matches.add('busy-peak');
  if (silentPart !== null) matches.add('silence');
  if (repeatedSampleId) matches.add('repeat');
  if (!repeatedSampleId && blocks.length >= 3) matches.add('no-repeat');
  if (distinct > 0 && distinct <= FEW_SOUNDS_MAX) matches.add('few-sounds');
  if (distinct >= MANY_SOUNDS_MIN) matches.add('many-sounds');

  return {
    blocks,
    trackIndexes: [...new Set(blocks.map((b) => b.trackIndex))].sort((a, b) => a - b),
    totalBeats,
    density,
    busiestPart,
    silentPart,
    repeatedSampleId,
    distinct,
    matches,
  };
}

// --- Vragen kiezen ---

function rotate<T>(items: T[], by: number): T[] {
  if (items.length === 0) return items;
  const n = ((by % items.length) + items.length) % items.length;
  return [...items.slice(n), ...items.slice(0, n)];
}

/** Vragen uit de bank die op deze soundscape passen */
export function fittingQuestions(bank: MirrorQuestion[], analysis: MirrorAnalysis): MirrorQuestion[] {
  return bank.filter((q) => analysis.matches.has(q.rule));
}

/**
 * Kiest hooguit twee vragen: eerst vragen die bij iets opvallends horen (één
 * per regel), daarna de vragen die altijd passen. `roll` wisselt de keuze
 * ("Andere vragen"); dezelfde `roll` geeft altijd dezelfde vragen.
 */
export function pickQuestions(bank: MirrorQuestion[], analysis: MirrorAnalysis, roll: number): MirrorQuestion[] {
  const fits = fittingQuestions(bank, analysis);
  const picked: MirrorQuestion[] = [];
  const usedRules = new Set<MirrorRule>();
  for (const q of rotate(fits.filter((x) => x.rule !== 'always'), roll)) {
    if (usedRules.has(q.rule)) continue;
    picked.push(q);
    usedRules.add(q.rule);
    if (picked.length === MAX_MIRROR_QUESTIONS) return picked;
  }
  for (const q of rotate(fits.filter((x) => x.rule === 'always'), roll)) {
    picked.push(q);
    if (picked.length === MAX_MIRROR_QUESTIONS) break;
  }
  return picked;
}

/** Het deel (1-4) waar een vraag over gaat, voor de plaatshouder `{{part}}` */
export function questionPart(question: MirrorQuestion, analysis: MirrorAnalysis): number {
  const index = question.rule === 'silence' ? analysis.silentPart : analysis.busiestPart;
  return (index ?? 0) + 1;
}
