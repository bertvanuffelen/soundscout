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
 */
import { existsSync, readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { prepare, writeJson } from './helpers';

interface Fixture {
  name: string;
  what: string;
  duration: number;
  soloTrackIndex?: number | null;
  tracks: Array<{
    id: string;
    volume?: number;
    mute?: boolean;
    clips: Array<Record<string, unknown>>;
  }>;
}

const fx = (over: Record<string, unknown>) => ({ volume: 0, pitch: 0, reverb: 0, fadeIn: 0, fadeOut: 0, ...over });

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
}

for (const fixture of FIXTURES) {
  test(`gouden render · ${fixture.name}`, async ({ page, browser }) => {
    await prepare(page);
    await page.goto('/');

    const render = (): Promise<RenderStats> => page.evaluate(async (f) => {
      const { getTheme } = await import('/src/data/themes/index.ts');
      const ae = await import('/src/utils/audioExport.ts');
      const samples = getTheme('basis').samples;
      const used = new Set(f.tracks.flatMap((t) => t.clips.map((c) => c.sampleId as string)));
      const { bufferMap, failedIds } = await ae.preloadBuffers(samples.filter((s: { id: string }) => used.has(s.id)));
      await ae.ensurePitchBuffers(f.tracks, bufferMap);
      const renderOnce = (): Promise<AudioBuffer> => ae.renderOffline(f.tracks, samples, f.duration, bufferMap, {
        soloTrackIndex: f.soloTrackIndex ?? null,
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

    const goldenPath = `e2e/golden/audio/${fixture.name}.json`;
    if (process.env.UPDATE_GOLDEN || !existsSync(goldenPath)) {
      writeJson(goldenPath, {
        fixture: fixture.name,
        what: fixture.what,
        chromium: browser.version(),
        platform: process.platform,
        ...first,
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
    if (first.sha256 !== golden.sha256) {
      test.info().annotations.push({
        type: 'info',
        description: `PCM-hash wijkt af van goud (Chromium ${browser.version()} vs ${golden.chromium}); omhullende valt binnen de marge.`,
      });
    }
  });
}
