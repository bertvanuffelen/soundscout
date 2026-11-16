/**
 * Fase 0 — gouden audio-renders.
 *
 * Rendert vaste composities via de ECHTE exportketen (preloadBuffers →
 * ensurePitchBuffers → renderOffline: zelfde audioEvents + audioGraph als live)
 * in een echte browser, en vergelijkt het resultaat met een opgeslagen "gouden"
 * meting. Verandert een refactor (Fase 1/6) de klank, dan faalt deze test.
 *
 * Vergelijking:
 *  - HARD: lengte, en de omhullende (RMS per 100 ms) binnen een kleine marge;
 *  - HARD: twee renders achter elkaar wijken niet hoorbaar af (< −60 dBFS);
 *    of ze bit-identiek zijn wordt gemeten en in de gouden file vastgelegd;
 *  - INFO: de SHA-256 van de 16-bit PCM. Die kan tussen Chromium-versies of
 *    machines verschillen (MP3-decodering), dus een afwijking is een melding.
 *
 * Nieuwe gouden waarden schrijven:  UPDATE_GOLDEN=1 npx playwright test audio-golden
 *
 * V2 Fase 4: vijf extra composities (tempo 90/135 met uitgerekte loop en
 * onuitgerekte sfx, Vervormen-effecten, melodie met bibliotheekstem en met
 * synth-stem). Die moeten bovendien door de export-validator komen ZONDER
 * realtime-vangnet (`validate: true`). De vier oorspronkelijke fixtures
 * (120 BPM, geen nieuwe effecten) moeten ongewijzigd blijven.
 */
import { existsSync, readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { prepare, writeJson } from './helpers';

interface Fixture {
  name: string;
  what: string;
  duration: number;
  soloTrackIndex?: number | null;
  /** Compositietempo (default 120) */
  bpm?: number;
  /** Sequencer-patronen (ritme of melodie) */
  sequences?: Array<Record<string, unknown>>;
  /** Moet door de export-validator zonder realtime-vangnet (V2 Fase 4) */
  validate?: boolean;
  tracks: Array<{
    id: string;
    volume?: number;
    mute?: boolean;
    clips: Array<Record<string, unknown>>;
  }>;
}

const fx = (over: Record<string, unknown>) => ({ volume: 0, pitch: 0, reverb: 0, fadeIn: 0, fadeOut: 0, ...over });

/** Melodie-sequence (V2 Fase 4) met één leeg ritmespoor (schema-eis) */
const melodySeq = (id: string, voice: Record<string, unknown>, notes: Array<Record<string, unknown>>, swing = 0) => ({
  id, name: id, lengthSteps: 16, bpm: 120, createdAt: '', updatedAt: '',
  tracks: [{ id: `${id}-r`, sampleId: null, steps: Array(16).fill(false), mode: 'ring' }],
  kind: 'melody',
  swing,
  melody: { root: 60, scale: [0, 2, 4, 7, 9], octaves: 2, voice, notes },
});

/** Zelfde compositie in twee tempi: uitgerekte loop + onuitgerekte sfx */
const tempoTracks = [
  { id: 't1', clips: [{ id: 'c1', sampleId: 'muziekwinkel-drums', startBeat: 0 }] },
  { id: 't2', clips: [{ id: 'c2', sampleId: 'boerderij-koe', startBeat: 8 }] },
];

const FIXTURES: Fixture[] = [
  {
    name: 'plain',
    what: 'Drie clips op drie sporen, geen effecten',
    duration: 12,
    tracks: [
      { id: 't1', clips: [{ id: 'c1', sampleId: 'boerderij-lach', startBeat: 0 }] },
      { id: 't2', clips: [{ id: 'c2', sampleId: 'boerderij-geit', startBeat: 4 }] },
      { id: 't3', clips: [{ id: 'c3', sampleId: 'boerderij-hond', startBeat: 8 }] },
    ],
  },
  {
    name: 'effects',
    what: 'Toonhoogte (+5 en −7), galm, fade in/uit, clipvolume',
    duration: 14,
    tracks: [
      { id: 't1', clips: [{ id: 'c1', sampleId: 'boerderij-koe', startBeat: 0, effects: fx({ pitch: 5, reverb: 40 }) }] },
      { id: 't2', clips: [{ id: 'c2', sampleId: 'boerderij-kippen', startBeat: 2, effects: fx({ fadeIn: 1.5, fadeOut: 2, volume: -6 }) }] },
      { id: 't3', clips: [{ id: 'c3', sampleId: 'boerderij-paard', startBeat: 10, effects: fx({ pitch: -7, reverb: 80 }) }] },
    ],
  },
  {
    name: 'loop-trim-mute',
    what: 'Loopende getrimde clip, spoorvolume, gemute spoor en gemute clip',
    duration: 14,
    tracks: [
      { id: 't1', volume: -3, clips: [{ id: 'c1', sampleId: 'boerderij-geit', startBeat: 0, trimStart: 0.5, trimEnd: 2.5, loop: true, loopDurationBeats: 16 }] },
      { id: 't2', mute: true, clips: [{ id: 'c2', sampleId: 'boerderij-lach', startBeat: 0 }] },
      { id: 't3', clips: [
        { id: 'c3', sampleId: 'boerderij-hond', startBeat: 4 },
        { id: 'c4', sampleId: 'boerderij-koe', startBeat: 12, effects: fx({ mute: true }) },
      ] },
    ],
  },
  {
    name: 'solo',
    what: 'Solo op spoor 2: alleen dat spoor klinkt',
    duration: 10,
    soloTrackIndex: 1,
    tracks: [
      { id: 't1', clips: [{ id: 'c1', sampleId: 'boerderij-lach', startBeat: 0 }] },
      { id: 't2', clips: [{ id: 'c2', sampleId: 'boerderij-hond', startBeat: 0 }] },
    ],
  },
  // --- V2 Fase 4 ---
  {
    name: 'tempo-90',
    what: 'Tempo 90: drumloop uitgerekt naar 16 tellen (10,667 s), koe-sfx niet uitgerekt',
    duration: 12,
    bpm: 90,
    validate: true,
    tracks: tempoTracks,
  },
  {
    name: 'tempo-135',
    what: 'Tempo 135: dezelfde compositie — loop ingekort naar 16 tellen (7,111 s), sfx ongewijzigd',
    duration: 9,
    bpm: 135,
    validate: true,
    tracks: tempoTracks,
  },
  {
    name: 'vervormen',
    what: 'Vervormen: snelheid, achterstevoren, echo en filter (los en gecombineerd met pitch)',
    duration: 14,
    validate: true,
    tracks: [
      { id: 't1', clips: [{ id: 'c1', sampleId: 'boerderij-koe', startBeat: 0, effects: fx({ speed: 2, filter: 40 }) }] },
      { id: 't2', clips: [{ id: 'c2', sampleId: 'boerderij-hond', startBeat: 4, trimStart: 1, trimEnd: 5, effects: fx({ reverse: true, echo: 60 }) }] },
      { id: 't3', clips: [{ id: 'c3', sampleId: 'boerderij-paard', startBeat: 10, effects: fx({ speed: 0.75, filter: -60, echo: 30 }) }] },
      { id: 't4', clips: [{ id: 'c4', sampleId: 'boerderij-geit', startBeat: 14, effects: fx({ speed: 1.5, reverse: true, pitch: 3 }) }] },
    ],
  },
  {
    name: 'melodie-sample',
    what: 'Melodie met bibliotheekstem (fluitje, per noot gebakken pitch), swing 0,3 en aanslagsterkte',
    duration: 10,
    validate: true,
    sequences: [melodySeq('mel-s', { type: 'sample', sampleId: 'gymzaal-fluitje', baseNote: 67 }, [
      { step: 0, row: 0 }, { step: 1, row: 1, velocity: 0.5 }, { step: 2, row: 2 }, { step: 3, row: 3, velocity: 0.6 },
      { step: 4, row: 4, length: 2 }, { step: 6, row: 3 }, { step: 7, row: 2, velocity: 0.4 },
      { step: 8, row: 5, length: 2 }, { step: 10, row: 4 }, { step: 11, row: 2, velocity: 0.7 },
      { step: 12, row: 0, length: 4 },
    ], 0.3)],
    tracks: [{ id: 't1', clips: [{ id: 'c1', sampleId: 'seq:mel-s', startBeat: 0 }] }],
  },
  {
    name: 'melodie-synth',
    what: 'Melodie met ingebouwde synth-stem (zacht), akkoorden en aanslagsterkte, plus tokkel-stem',
    duration: 10,
    validate: true,
    sequences: [
      melodySeq('mel-soft', { type: 'synth', preset: 'soft' }, [
        { step: 0, row: 0, length: 4 }, { step: 0, row: 2, length: 4, velocity: 0.6 },
        { step: 4, row: 3, length: 4 }, { step: 4, row: 5, length: 4, velocity: 0.6 },
        { step: 8, row: 4, length: 4 }, { step: 12, row: 7, length: 4, velocity: 0.8 },
      ]),
      melodySeq('mel-pluck', { type: 'synth', preset: 'pluck' }, [
        { step: 1, row: 5 }, { step: 3, row: 7, velocity: 0.5 }, { step: 5, row: 8 }, { step: 7, row: 6, velocity: 0.5 },
        { step: 9, row: 5 }, { step: 11, row: 9, velocity: 0.5 }, { step: 13, row: 7 }, { step: 15, row: 5, velocity: 0.5 },
      ], 0.2),
    ],
    tracks: [
      { id: 't1', clips: [{ id: 'c1', sampleId: 'seq:mel-soft', startBeat: 0 }] },
      { id: 't2', clips: [{ id: 'c2', sampleId: 'seq:mel-pluck', startBeat: 0 }] },
    ],
  },
];

interface RenderStats {
  sampleRate: number;
  length: number;
  channels: number;
  peak: number;
  rms: number;
  envelope: number[];
  sha256: string;
  failedIds: string[];
  /** Vergelijking met een tweede render in dezelfde sessie. */
  repeat: { identical: boolean; maxSampleDiff: number; differingSamples: number };
  /** Oordeel van de export-validator (validateOrCapture) */
  validator: { suspicious: boolean; reasons: string[]; usedRealtimeFallback: boolean | null };
}

for (const fixture of FIXTURES) {
  test(`gouden render · ${fixture.name}`, async ({ page, browser }) => {
    await prepare(page);
    await page.goto('/');

    const render = (): Promise<RenderStats> => page.evaluate(async (f) => {
      const { getTheme } = await import('/src/data/themes/index.ts');
      const ae = await import('/src/utils/audioExport.ts');
      const rv = await import('/src/utils/renderValidation.ts');
      const samples = getTheme('basis').samples;
      const bpm = f.bpm ?? 120;
      const sequences = f.sequences ?? [];
      const used = new Set(f.tracks.flatMap((t) => t.clips.map((c) => c.sampleId as string)));
      for (const seq of sequences as Array<{ tracks: Array<{ sampleId: string | null }>; melody?: { voice: { type: string; sampleId?: string } } }>) {
        seq.tracks.forEach((t) => { if (t.sampleId) used.add(t.sampleId); });
        if (seq.melody?.voice.type === 'sample' && seq.melody.voice.sampleId) used.add(seq.melody.voice.sampleId);
      }
      const { bufferMap, failedIds } = await ae.preloadBuffers(samples.filter((s: { id: string }) => used.has(s.id)));
      // Echte exportketen: álle bakes vooraf (pitch, speed, reverse, stretch, melodie)
      await ae.ensurePitchBuffers(f.tracks, bufferMap, samples, { bpm, sequences });
      const renderOnce = (): Promise<AudioBuffer> => ae.renderOffline(f.tracks, samples, f.duration, bufferMap, {
        soloTrackIndex: f.soloTrackIndex ?? null,
        bpm,
        sequences,
      });
      const buffer = await renderOnce();
      const again = await renderOnce();
      let maxSampleDiff = 0, differingSamples = 0;
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const a = buffer.getChannelData(ch), b = again.getChannelData(ch);
        for (let i = 0; i < a.length; i++) {
          const d = Math.abs(a[i] - b[i]);
          if (d > 0) differingSamples++;
          if (d > maxSampleDiff) maxSampleDiff = d;
        }
      }

      const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
      let peak = 0, sumSq = 0;
      const pcm = new Int16Array(buffer.length * channels.length);
      for (let i = 0; i < buffer.length; i++) {
        for (let ch = 0; ch < channels.length; ch++) {
          const v = channels[ch][i];
          const a = Math.abs(v);
          if (a > peak) peak = a;
          sumSq += v * v;
          pcm[i * channels.length + ch] = Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
        }
      }
      const win = Math.round(buffer.sampleRate / 10);
      const envelope: number[] = [];
      for (let start = 0; start < buffer.length; start += win) {
        let s = 0, n = 0;
        for (let i = start; i < Math.min(buffer.length, start + win); i++) {
          for (let ch = 0; ch < channels.length; ch++) { s += channels[ch][i] ** 2; n++; }
        }
        envelope.push(Number(Math.sqrt(s / n).toFixed(5)));
      }
      // Export-validator: zelfde oordeel als exportToMp3/exportToVideo
      let validator = { suspicious: false, reasons: [] as string[], usedRealtimeFallback: null as boolean | null };
      const analysis = rv.analyzeAudioBuffer(buffer);
      validator = { suspicious: analysis.suspicious, reasons: analysis.reasons, usedRealtimeFallback: null };
      if (f.validate) {
        const verdict = await ae.validateOrCapture(buffer, f.tracks, samples, f.duration, undefined, sequences, bpm);
        validator.usedRealtimeFallback = verdict.usedRealtimeFallback;
      }
      const digest = await crypto.subtle.digest('SHA-256', pcm.buffer);
      const sha256 = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
      return {
        sampleRate: buffer.sampleRate,
        length: buffer.length,
        channels: channels.length,
        peak: Number(peak.toFixed(5)),
        rms: Number(Math.sqrt(sumSq / (buffer.length * channels.length)).toFixed(5)),
        envelope,
        sha256,
        failedIds,
        repeat: { identical: differingSamples === 0, maxSampleDiff, differingSamples },
        validator,
      };
    }, fixture);

    const first = await render();

    expect(first.failedIds, 'alle geluiden moeten laden').toEqual([]);
    expect(first.rms, 'de render mag niet stil zijn').toBeGreaterThan(0.001);
    // Herhaalbaarheid: twee renders achter elkaar moeten (vrijwel) gelijk zijn.
    // Fase 0-bevinding: ze zijn NIET altijd bit-identiek; het verschil wordt
    // gemeten en vastgelegd. Hoorbaar verschil (> −60 dBFS) laat de test falen.
    test.info().annotations.push({
      type: 'herhaalbaarheid',
      description: first.repeat.identical
        ? 'bit-identiek'
        : `niet bit-identiek: ${first.repeat.differingSamples} samples, max verschil ${first.repeat.maxSampleDiff.toExponential(2)}`,
    });
    expect(first.repeat.maxSampleDiff, 'twee renders achter elkaar wijken hoorbaar af').toBeLessThan(0.001);
    test.info().annotations.push({
      type: 'validator',
      description: first.validator.suspicious ? `verdacht: ${first.validator.reasons.join('; ')}` : 'akkoord',
    });
    if (fixture.validate) {
      expect(first.validator.suspicious, `validator keurt de render af: ${first.validator.reasons.join('; ')}`).toBe(false);
      expect(first.validator.usedRealtimeFallback, 'export viel terug op de realtime-opname').toBe(false);
    }

    const goldenPath = `e2e/golden/audio/${fixture.name}.json`;
    if (process.env.UPDATE_GOLDEN || !existsSync(goldenPath)) {
      // Het validator-oordeel hoort bij de run, niet bij de gouden meting
      const { validator: _validator, ...stats } = first;
      void _validator;
      writeJson(goldenPath, {
        fixture: fixture.name,
        what: fixture.what,
        chromium: browser.version(),
        platform: process.platform,
        ...stats,
      });
      test.info().annotations.push({ type: 'golden', description: `gouden waarden geschreven: ${goldenPath}` });
      return;
    }

    const golden = JSON.parse(readFileSync(goldenPath, 'utf8')) as RenderStats & { chromium: string };
    expect(first.sampleRate).toBe(golden.sampleRate);
    expect(first.length, 'lengte van de render').toBe(golden.length);
    expect(first.envelope.length).toBe(golden.envelope.length);
    const maxDiff = Math.max(...first.envelope.map((v, i) => Math.abs(v - golden.envelope[i])));
    expect(maxDiff, 'omhullende (RMS per 100 ms) wijkt af van de gouden render').toBeLessThan(0.002);
    expect(Math.abs(first.peak - golden.peak), 'piekniveau wijkt af').toBeLessThan(0.01);
    test.info().annotations.push({
      type: 'pcm',
      description: first.sha256 === golden.sha256 ? 'PCM bit-identiek aan goud' : 'PCM wijkt af van goud',
    });
    if (first.sha256 !== golden.sha256) {
      test.info().annotations.push({
        type: 'info',
        description: `PCM-hash wijkt af van goud (Chromium ${browser.version()} vs ${golden.chromium}); omhullende valt binnen de marge.`,
      });
    }
  });
}
