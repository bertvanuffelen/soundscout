/**
 * engine — pure mock-logica voor de studio: effecten ("Vervormen"), sequences
 * (Ritme + Melodie) en de Luisterspiegel-analyse. Geen React, geen Tone.js.
 *
 * LET OP (mockup): toonhoogte is hier gewone afspeelsnelheid, dus een hogere
 * toon wordt ook korter. De echte V2-bouw gebruikt de bestaande Signalsmith
 * pre-bake (duurbehoudend) — zie v2-architecture-proposal.md §2.3/§4.1.
 */

import { BEAT_SEC } from './liteAudio';

// --- Effecten ---

export interface Fx {
  /** Bestaand: toonhoogte in halve tonen (-12..12). */
  pitch: number;
  /** Bestaand: galm 0..100. */
  reverb: number;
  /** Bestaand: fades in seconden. */
  fadeIn: number;
  fadeOut: number;
  /** Nieuw: achterstevoren. */
  reverse: boolean;
  /** Nieuw: snelheid (0.5 / 0.75 / 1 / 1.5 / 2). */
  speed: number;
  /** Nieuw: echo 0..100. */
  echo: number;
  /** Nieuw: filter -100 (dof) .. 0 .. 100 (scherp). */
  filter: number;
}

export const NO_FX: Fx = { pitch: 0, reverb: 0, fadeIn: 0, fadeOut: 0, reverse: false, speed: 1, echo: 0, filter: 0 };

export function hasFx(fx: Fx | undefined): boolean {
  return !!fx && JSON.stringify(fx) !== JSON.stringify(NO_FX);
}

/** Lengte van een geluid ná effecten (zonder galm-/echostaart), in seconden. */
export function fxDuration(sourceDuration: number, fx: Fx | undefined): number {
  if (!fx) return sourceDuration;
  return sourceDuration / (fx.speed * 2 ** (fx.pitch / 12));
}

/** Deterministische galm-IR (geseede ruis met uitsterf), zoals ReverbIRService. */
function makeImpulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(seconds * ctx.sampleRate);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  let seed = 1234567;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 2147483648 - 1;
  };
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = rand() * (1 - i / length) ** 2.4;
  }
  return buffer;
}

export async function renderFx(source: AudioBuffer, fx: Fx): Promise<AudioBuffer> {
  const rate = fx.speed * 2 ** (fx.pitch / 12);
  const body = source.duration / rate;
  const tail = Math.max(fx.reverb > 0 ? 1.6 : 0, fx.echo > 0 ? 1.8 : 0);
  const channels = Math.max(2, source.numberOfChannels);
  const off = new OfflineAudioContext(channels, Math.ceil((body + tail) * source.sampleRate), source.sampleRate);

  let buffer = source;
  if (fx.reverse) {
    buffer = off.createBuffer(source.numberOfChannels, source.length, source.sampleRate);
    for (let ch = 0; ch < source.numberOfChannels; ch++) {
      buffer.copyToChannel(Float32Array.from(source.getChannelData(ch)).reverse(), ch);
    }
  }

  const src = off.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  let node: AudioNode = src;

  if (fx.filter !== 0) {
    const biquad = off.createBiquadFilter();
    if (fx.filter < 0) {
      biquad.type = 'lowpass';
      biquad.frequency.value = 18000 * 2 ** ((fx.filter / 100) * 5.5);
    } else {
      biquad.type = 'highpass';
      biquad.frequency.value = 40 * 2 ** ((fx.filter / 100) * 6.5);
    }
    node.connect(biquad);
    node = biquad;
  }

  // Fades (zelfde vorm als de app: in x², uit (1-x)²)
  const fade = off.createGain();
  const fadeIn = Math.min(fx.fadeIn, body / 2), fadeOut = Math.min(fx.fadeOut, body / 2);
  const curve = (fn: (x: number) => number) => Float32Array.from({ length: 64 }, (_, i) => fn(i / 63));
  if (fadeIn > 0.01) fade.gain.setValueCurveAtTime(curve((x) => x * x), 0, fadeIn);
  if (fadeOut > 0.01) fade.gain.setValueCurveAtTime(curve((x) => (1 - x) ** 2), body - fadeOut, fadeOut);
  node.connect(fade);
  node = fade;

  node.connect(off.destination);

  if (fx.reverb > 0) {
    const convolver = off.createConvolver();
    convolver.buffer = makeImpulse(off, 1.6);
    const wet = off.createGain();
    wet.gain.value = (fx.reverb / 100) * 0.9;
    node.connect(convolver);
    convolver.connect(wet);
    wet.connect(off.destination);
  }
  if (fx.echo > 0) {
    const delay = off.createDelay(1);
    delay.delayTime.value = 0.28;
    const feedback = off.createGain();
    feedback.gain.value = 0.2 + (fx.echo / 100) * 0.4;
    const wet = off.createGain();
    wet.gain.value = (fx.echo / 100) * 0.8;
    node.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(off.destination);
  }

  src.start();
  return off.startRendering();
}

// --- Sequences ---

export const SEQ_STEPS = 16;

export interface RhythmRow {
  soundId: string | null;
  steps: boolean[];
}

export type SequenceKind = 'rhythm' | 'melody';

export interface MockSequence {
  id: string;
  name: string;
  kind: SequenceKind;
  rows: RhythmRow[];
  melody: boolean[][];
  color: string;
  /** Gerenderde buffer (mock: in de echte bouw rendert het recept per apparaat). */
  buffer?: AudioBuffer;
}

/** Pentatonisch (klinkt altijd goed), hoog → laag. */
export const NOTES: Array<[string, number]> = [['A', 440], ['G', 392], ['E', 329.63], ['D', 293.66], ['C', 261.63]];
export const NOTE_COLORS = ['#9B59B6', '#3498DB', '#00BCD4', '#4CAF50', '#F39C12'];
/** Ritme: 1 vakje = 1 tel (zoals de bestaande sequencer). Melodie: 1 vakje = halve tel. */
export const RHYTHM_STEP_SEC = BEAT_SEC;
export const MELODY_STEP_SEC = BEAT_SEC / 2;

export function emptyRows(count = 3): RhythmRow[] {
  return Array.from({ length: count }, () => ({ soundId: null, steps: Array.from({ length: SEQ_STEPS }, () => false) }));
}

export function emptyMelody(): boolean[][] {
  return NOTES.map(() => Array.from({ length: SEQ_STEPS }, () => false));
}

export function sequenceDuration(kind: SequenceKind): number {
  return SEQ_STEPS * (kind === 'rhythm' ? RHYTHM_STEP_SEC : MELODY_STEP_SEC);
}

export function scheduleNote(ctx: BaseAudioContext, dest: AudioNode, freq: number, when: number): void {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(0.3, when + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.42);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(when);
  osc.stop(when + 0.45);
}

export async function renderSequence(
  seq: Pick<MockSequence, 'kind' | 'rows' | 'melody'>,
  getBuffer: (soundId: string) => Promise<AudioBuffer | null>,
): Promise<AudioBuffer> {
  const sampleRate = 44100;
  const duration = sequenceDuration(seq.kind);
  const off = new OfflineAudioContext(2, Math.ceil((duration + (seq.kind === 'melody' ? 0.5 : 0)) * sampleRate), sampleRate);
  if (seq.kind === 'melody') {
    seq.melody.forEach((row, r) => row.forEach((on, s) => {
      if (on) scheduleNote(off, off.destination, NOTES[r][1], s * MELODY_STEP_SEC);
    }));
  } else {
    for (const row of seq.rows) {
      if (!row.soundId) continue;
      const buffer = await getBuffer(row.soundId);
      if (!buffer) continue;
      row.steps.forEach((on, s) => {
        if (!on) return;
        const src = off.createBufferSource();
        src.buffer = buffer;
        src.connect(off.destination);
        src.start(s * RHYTHM_STEP_SEC);
      });
    }
  }
  return off.startRendering();
}

// --- Luisterspiegel: vragenbank + analyse (100% lokaal, op regels) ---

export type MirrorRule = 'busy-peak' | 'silence' | 'repeat' | 'no-repeat' | 'few-sounds' | 'many-sounds' | 'always';

export interface MirrorQuestion {
  id: string;
  rule: MirrorRule;
  /** Tekst met plaatshouders {deel} en {geluid}. */
  text: string;
  active: boolean;
}

export const RULE_LABELS: Record<MirrorRule, string> = {
  'busy-peak': 'Eén deel is het drukst',
  silence: 'Er is een stil deel',
  repeat: 'Een geluid komt terug',
  'no-repeat': 'Geen enkel geluid komt terug',
  'few-sounds': 'Weinig verschillende geluiden',
  'many-sounds': 'Veel verschillende geluiden',
  always: 'Past altijd',
};

export const DEFAULT_QUESTIONS: MirrorQuestion[] = [
  { id: 'q1', rule: 'busy-peak', text: 'Deel {deel} is het drukst. Is dat ook het spannendste moment?', active: true },
  { id: 'q2', rule: 'busy-peak', text: 'In deel {deel} klinkt het meeste tegelijk. Hoor je elk geluid nog?', active: true },
  { id: 'q3', rule: 'silence', text: 'In deel {deel} is het stil. Wilde je dat zo?', active: true },
  { id: 'q4', rule: 'silence', text: 'Wat gebeurt er in je verhaal tijdens de stilte in deel {deel}?', active: true },
  { id: 'q5', rule: 'repeat', text: 'Je gebruikt {geluid} vaker. Waarom komt dat geluid terug?', active: true },
  { id: 'q6', rule: 'no-repeat', text: 'Geen geluid komt terug. Zou een herhaling je soundscape helpen?', active: true },
  { id: 'q7', rule: 'few-sounds', text: 'Je koos weinig geluiden. Wat maakt juist deze belangrijk?', active: true },
  { id: 'q8', rule: 'many-sounds', text: 'Je gebruikt veel geluiden. Welke is het belangrijkst?', active: true },
  { id: 'q9', rule: 'always', text: 'Hoe begint je soundscape? En hoe eindigt hij?', active: true },
  { id: 'q10', rule: 'always', text: 'Wat zou een luisteraar zich voorstellen bij jouw soundscape?', active: true },
];

export const MIRROR_PARTS = 4;

export interface MirrorClip {
  soundId: string;
  startBeat: number;
  lengthBeats: number;
}

export interface MirrorAnalysis {
  totalBeats: number;
  density: number[];
  busiestPart: number | null;
  silentPart: number | null;
  repeatedSound: string | null;
  distinct: number;
  matches: Set<MirrorRule>;
}

export function analyseMirror(clips: MirrorClip[]): MirrorAnalysis {
  const end = Math.max(16, ...clips.map((c) => c.startBeat + c.lengthBeats));
  const totalBeats = Math.ceil(end / 16) * 16;
  const partBeats = totalBeats / MIRROR_PARTS;
  const density = Array.from({ length: MIRROR_PARTS }, () => 0);
  const counts = new Map<string, number>();
  for (const clip of clips) {
    counts.set(clip.soundId, (counts.get(clip.soundId) ?? 0) + 1);
    for (let p = 0; p < MIRROR_PARTS; p++) {
      const from = p * partBeats, to = from + partBeats;
      if (clip.startBeat < to && clip.startBeat + clip.lengthBeats > from) density[p] += 1;
    }
  }
  const max = Math.max(...density);
  const busiestPart = max >= 2 && density.filter((d) => d === max).length === 1 ? density.indexOf(max) : null;
  const silentIdx = density.indexOf(0);
  const silentPart = clips.length > 0 && silentIdx >= 0 ? silentIdx : null;
  const repeatedSound = [...counts.entries()].find(([, n]) => n >= 2)?.[0] ?? null;
  const distinct = counts.size;

  const matches = new Set<MirrorRule>(['always']);
  if (busiestPart !== null) matches.add('busy-peak');
  if (silentPart !== null) matches.add('silence');
  if (repeatedSound) matches.add('repeat');
  if (!repeatedSound && clips.length >= 3) matches.add('no-repeat');
  if (distinct > 0 && distinct <= 2) matches.add('few-sounds');
  if (distinct >= 5) matches.add('many-sounds');
  return { totalBeats, density, busiestPart, silentPart, repeatedSound, distinct, matches };
}

/** Kiest max. 2 vragen: eerst specifieke regels, dan "past altijd"; wisselt per `roll`. */
export function pickQuestions(bank: MirrorQuestion[], a: MirrorAnalysis, roll: number): MirrorQuestion[] {
  const fits = bank.filter((q) => q.active && a.matches.has(q.rule));
  const rotate = <T,>(arr: T[], n: number) => (arr.length ? [...arr.slice(n % arr.length), ...arr.slice(0, n % arr.length)] : arr);
  const picked: MirrorQuestion[] = [];
  const usedRules = new Set<MirrorRule>();
  for (const q of rotate(fits.filter((x) => x.rule !== 'always'), roll)) {
    if (usedRules.has(q.rule)) continue;
    picked.push(q);
    usedRules.add(q.rule);
    if (picked.length === 2) return picked;
  }
  for (const q of rotate(fits.filter((x) => x.rule === 'always'), roll)) {
    picked.push(q);
    if (picked.length === 2) break;
  }
  return picked;
}
