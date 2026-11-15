/**
 * Luisterspiegel: vormkaart-analyse en vragenkeuze (100% lokaal, op regels).
 */

import { describe, it, expect } from 'vitest';
import {
  LUISTERSPIEGEL_QUESTIONS, MIRROR_PARTS, analyseMirror, fittingQuestions, pickQuestions, questionPart,
  type MirrorRule,
} from '../luisterspiegel';
import { createSequenceSample, withSequenceSamples } from '../sequencer';
import type { Clip, Sample, Track } from '../../types';
import type { SequencerSequence } from '../../types/sequencer';
import nl from '../../i18n/locales/nl.json';
import en from '../../i18n/locales/en.json';

// 120 BPM: 1 tel = 0,5 s. Een sample van 2 s is dus 4 tellen lang.
const sample = (id: string, duration = 2): Sample => ({
  id, name: `samples.${id}`, locationId: 'park', audioUrl: `/${id}.mp3`, duration, icon: 'Bird', color: '#3B82F6',
});
const SAMPLES = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => sample(id));

let counter = 0;
const clip = (sampleId: string, startBeat: number, extra: Partial<Clip> = {}): Clip => ({
  id: `clip-${++counter}`, sampleId, startBeat, ...extra,
});
const track = (clips: Clip[], extra: Partial<Track> = {}): Track => ({ id: `track-${++counter}`, clips, ...extra });

const rules = (tracks: Track[], samples = SAMPLES) => [...analyseMirror(tracks, samples).matches].sort();

describe('analyseMirror', () => {
  it('lege soundscape: alleen de vragen die altijd passen', () => {
    const a = analyseMirror([track([]), track([])], SAMPLES);
    expect(a.blocks).toEqual([]);
    expect(a.density).toEqual([0, 0, 0, 0]);
    expect(a.busiestPart).toBeNull();
    expect(a.silentPart).toBeNull();
    expect(a.repeatedSampleId).toBeNull();
    expect(a.distinct).toBe(0);
    expect([...a.matches]).toEqual(['always']);
    expect(a.totalBeats).toBeGreaterThan(0);
  });

  it('verdeelt de soundscape in vier gelijke delen tot het einde van de laatste clip', () => {
    // Vier clips van 4 tellen achter elkaar: 16 tellen, elk deel één clip
    const a = analyseMirror([track([clip('a', 0), clip('b', 4), clip('c', 8), clip('d', 12)])], SAMPLES);
    expect(a.totalBeats).toBe(16);
    expect(a.density).toHaveLength(MIRROR_PARTS);
    expect(a.density).toEqual([1, 1, 1, 1]);
    expect(a.busiestPart).toBeNull();
    expect(a.silentPart).toBeNull();
  });

  it('vindt het drukste deel', () => {
    const a = analyseMirror([
      track([clip('a', 0), clip('b', 4), clip('c', 8), clip('d', 12)]),
      track([clip('e', 8)]),
      track([clip('f', 8)]),
    ], SAMPLES);
    expect(a.density).toEqual([1, 1, 3, 1]);
    expect(a.busiestPart).toBe(2);
    expect(a.matches.has('busy-peak')).toBe(true);
  });

  it('geen drukste deel als twee delen even druk zijn', () => {
    const a = analyseMirror([
      track([clip('a', 0), clip('b', 4), clip('c', 8), clip('d', 12)]),
      track([clip('e', 0), clip('f', 12)]),
    ], SAMPLES);
    expect(a.density).toEqual([2, 1, 1, 2]);
    expect(a.busiestPart).toBeNull();
    expect(a.matches.has('busy-peak')).toBe(false);
  });

  it('vindt een stil deel', () => {
    // Clip op 0-4 en op 12-16: deel 2 en 3 zijn stil, het eerste telt
    const a = analyseMirror([track([clip('a', 0), clip('b', 12)])], SAMPLES);
    expect(a.density).toEqual([1, 0, 0, 1]);
    expect(a.silentPart).toBe(1);
    expect(a.matches.has('silence')).toBe(true);
  });

  it('een clip die precies op een deelgrens eindigt telt niet in het volgende deel', () => {
    const a = analyseMirror([track([clip('a', 0), clip('b', 12)])], SAMPLES);
    expect(a.density[1]).toBe(0);
  });

  it('vindt het geluid dat terugkomt (het vaakst gebruikte)', () => {
    const a = analyseMirror([track([clip('a', 0), clip('b', 4), clip('b', 8), clip('a', 12), clip('b', 16)])], SAMPLES);
    expect(a.repeatedSampleId).toBe('b');
    expect(a.distinct).toBe(2);
    expect(a.matches.has('repeat')).toBe(true);
    expect(a.matches.has('no-repeat')).toBe(false);
  });

  it('geen herhaling: pas vanaf drie clips een vraag daarover', () => {
    expect(rules([track([clip('a', 0), clip('b', 4)])])).not.toContain('no-repeat');
    expect(rules([track([clip('a', 0), clip('b', 4), clip('c', 8)])])).toContain('no-repeat');
  });

  it('weinig en veel verschillende geluiden', () => {
    expect(rules([track([clip('a', 0)])])).toContain('few-sounds');
    expect(rules([track([clip('a', 0), clip('b', 4)])])).toContain('few-sounds');
    const three = rules([track([clip('a', 0), clip('b', 4), clip('c', 8)])]);
    expect(three).not.toContain('few-sounds');
    expect(three).not.toContain('many-sounds');
    expect(rules([track([clip('a', 0), clip('b', 4), clip('c', 8), clip('d', 12), clip('e', 16)])])).toContain('many-sounds');
  });

  it('gedempte sporen tellen niet mee', () => {
    const a = analyseMirror([
      track([clip('a', 0)]),
      track([clip('b', 0), clip('b', 20), clip('c', 40)], { mute: true }),
    ], SAMPLES);
    expect(a.blocks).toHaveLength(1);
    expect(a.trackIndexes).toEqual([0]);
    expect(a.totalBeats).toBe(4);
    expect(a.distinct).toBe(1);
    expect(a.repeatedSampleId).toBeNull();
  });

  it('alles gedempt = leeg', () => {
    const a = analyseMirror([track([clip('a', 0)], { mute: true })], SAMPLES);
    expect(a.blocks).toEqual([]);
    expect([...a.matches]).toEqual(['always']);
  });

  it('een getrimde clip is zo lang als je hoort', () => {
    // Sample van 8 s (16 tellen), getrimd tot 1 s..3 s = 4 tellen
    const long = sample('long', 8);
    const a = analyseMirror([track([clip('long', 0, { trimStart: 1, trimEnd: 3 })])], [long]);
    expect(a.blocks[0].lengthBeats).toBe(4);
    expect(a.totalBeats).toBe(4);
  });

  it('een loopende clip is zo lang als de loop en telt als herhaling', () => {
    const a = analyseMirror([track([clip('a', 0, { loop: true, loopDurationBeats: 16 })])], SAMPLES);
    expect(a.blocks[0].lengthBeats).toBe(16);
    expect(a.density).toEqual([1, 1, 1, 1]);
    expect(a.repeatedSampleId).toBe('a');
    expect(a.distinct).toBe(1);
  });

  it('een loop van precies één keer is geen herhaling', () => {
    const a = analyseMirror([track([clip('a', 0, { loop: true, loopDurationBeats: 4 })])], SAMPLES);
    expect(a.repeatedSampleId).toBeNull();
  });

  it('een sequence-clip telt als één geluid', () => {
    const sequence = {
      id: 's1', name: 'Mijn ritme', bpm: 120, lengthSteps: 16, color: '#F59E0B', tracks: [],
    } as unknown as SequencerSequence;
    const samples = withSequenceSamples(SAMPLES, [sequence]);
    const seqId = createSequenceSample(sequence).id;
    const a = analyseMirror([track([clip(seqId, 0), clip('a', 16)])], samples);
    expect(seqId.startsWith('seq:')).toBe(true);
    expect(a.blocks).toHaveLength(2);
    expect(a.blocks[0]).toMatchObject({ sampleId: seqId, lengthBeats: 16, color: '#F59E0B' });
    expect(a.distinct).toBe(2);
    expect(a.repeatedSampleId).toBeNull();
  });

  it('slaat clips zonder bekend geluid over', () => {
    const a = analyseMirror([track([clip('onbekend', 0), clip('a', 4)])], SAMPLES);
    expect(a.blocks.map((b) => b.sampleId)).toEqual(['a']);
  });

  it('onthoudt op welk spoor een blok staat', () => {
    const a = analyseMirror([track([]), track([clip('a', 0)]), track([]), track([clip('b', 0)])], SAMPLES);
    expect(a.trackIndexes).toEqual([1, 3]);
  });
});

describe('pickQuestions', () => {
  const analysisWith = (matches: MirrorRule[]) => ({
    ...analyseMirror([], SAMPLES),
    matches: new Set<MirrorRule>(['always', ...matches]),
  });

  it('lege soundscape: twee vragen die altijd passen', () => {
    const picked = pickQuestions(LUISTERSPIEGEL_QUESTIONS, analyseMirror([], SAMPLES), 0);
    expect(picked).toHaveLength(2);
    expect(picked.every((q) => q.rule === 'always')).toBe(true);
  });

  it('kiest hooguit twee vragen, van verschillende regels', () => {
    const a = analysisWith(['busy-peak', 'silence', 'repeat', 'many-sounds']);
    for (let roll = 0; roll < 12; roll++) {
      const picked = pickQuestions(LUISTERSPIEGEL_QUESTIONS, a, roll);
      expect(picked).toHaveLength(2);
      expect(picked[0].rule).not.toBe(picked[1].rule);
      expect(picked.every((q) => a.matches.has(q.rule))).toBe(true);
    }
  });

  it('opvallende regels gaan voor "past altijd"', () => {
    const picked = pickQuestions(LUISTERSPIEGEL_QUESTIONS, analysisWith(['silence']), 0);
    expect(picked.map((q) => q.rule)).toEqual(['silence', 'always']);
  });

  it('stelt nooit een vraag over iets wat niet klopt', () => {
    const picked = pickQuestions(LUISTERSPIEGEL_QUESTIONS, analysisWith(['few-sounds']), 3);
    expect(picked.some((q) => ['busy-peak', 'silence', 'repeat', 'many-sounds', 'no-repeat'].includes(q.rule))).toBe(false);
  });

  it('"Andere vragen" geeft een andere keuze; dezelfde roll dezelfde vragen', () => {
    const a = analysisWith(['busy-peak', 'silence']);
    const first = pickQuestions(LUISTERSPIEGEL_QUESTIONS, a, 0).map((q) => q.id);
    const second = pickQuestions(LUISTERSPIEGEL_QUESTIONS, a, 1).map((q) => q.id);
    expect(second).not.toEqual(first);
    expect(pickQuestions(LUISTERSPIEGEL_QUESTIONS, a, 0).map((q) => q.id)).toEqual(first);
  });

  it('een lege bank geeft geen vragen', () => {
    expect(pickQuestions([], analysisWith(['silence']), 0)).toEqual([]);
  });

  it('fittingQuestions telt alle passende vragen', () => {
    expect(fittingQuestions(LUISTERSPIEGEL_QUESTIONS, analysisWith([])).length).toBe(2);
  });

  it('questionPart: stilte-vraag wijst naar het stille deel, anders naar het drukste', () => {
    const a = { ...analysisWith(['silence', 'busy-peak']), silentPart: 3, busiestPart: 1 };
    const silence = LUISTERSPIEGEL_QUESTIONS.find((q) => q.rule === 'silence')!;
    const busy = LUISTERSPIEGEL_QUESTIONS.find((q) => q.rule === 'busy-peak')!;
    expect(questionPart(silence, a)).toBe(4);
    expect(questionPart(busy, a)).toBe(2);
  });
});

describe('vragenbank', () => {
  const allRules: MirrorRule[] = ['busy-peak', 'silence', 'repeat', 'no-repeat', 'few-sounds', 'many-sounds', 'always'];

  it('heeft voor elke regel een vraag en unieke ids', () => {
    for (const rule of allRules) {
      expect(LUISTERSPIEGEL_QUESTIONS.some((q) => q.rule === rule)).toBe(true);
    }
    expect(new Set(LUISTERSPIEGEL_QUESTIONS.map((q) => q.id)).size).toBe(LUISTERSPIEGEL_QUESTIONS.length);
  });

  it('elke vraag staat in het Nederlands én het Engels, met de juiste plaatshouder', () => {
    for (const q of LUISTERSPIEGEL_QUESTIONS) {
      const key = q.textKey.split('.').pop()!;
      const texts = [
        (nl.luisterspiegel.questions as Record<string, string>)[key],
        (en.luisterspiegel.questions as Record<string, string>)[key],
      ];
      for (const text of texts) {
        expect(text, q.textKey).toBeTruthy();
        expect(text.includes('{{part}}')).toBe(q.rule === 'busy-peak' || q.rule === 'silence');
        expect(text.includes('{{sound}}')).toBe(q.rule === 'repeat');
      }
    }
  });
});
