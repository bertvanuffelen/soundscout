/**
 * Fase 0 — geheugen- en framebasislijn.
 *
 * Legt vast (docs/v2/baseline/perf-baseline.json):
 *  1. per thema: aantal geluiden, MP3-bytes en GEDECODEERDE bytes in het
 *     geheugen (float-PCM) — de open vraag uit het voorstel (§1);
 *  2. tijdens 6 s afspelen in de studio: frametijden, lange taken, en hoe vaak
 *     `audioStore.currentBeat` per seconde wijzigt (elke wijziging = een
 *     React-render van de tijdlijn; doel Fase 1: 0);
 *  3. JS-heap en aantal DOM-nodes in de studio.
 *
 * LET OP: dit draait in headless Chromium op een ontwikkelmachine. Het is een
 * vergelijkingsbasis vóór/na, GEEN meting van een school-iPad of Chromebook.
 *
 * Deze test meet alleen; hij faalt niet op de getallen.
 */
import { test, expect } from '@playwright/test';
import { prepare, writeJson } from './helpers';

test.describe.configure({ mode: 'serial' });

test('geheugen per thema + afspeelbasislijn', async ({ page, browser }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  await prepare(page);
  await page.goto('/');

  // --- 1. Gedecodeerd geheugen per thema ---
  const themes = await page.evaluate(async () => {
    const { getTheme } = await import('/src/data/themes/index.ts');
    const out = [];
    for (const id of ['basis', 'winterspelen', 'piraten']) {
      const theme = getTheme(id);
      if (!theme) continue;
      let mp3Bytes = 0, decodedBytes = 0, seconds = 0, failed = 0;
      const ctx = new OfflineAudioContext(2, 1, 44100);
      for (const sample of theme.samples) {
        try {
          const res = await fetch(sample.audioUrl);
          const data = await res.arrayBuffer();
          mp3Bytes += data.byteLength;
          const buffer = await ctx.decodeAudioData(data);
          decodedBytes += buffer.length * buffer.numberOfChannels * 4;
          seconds += buffer.duration;
        } catch {
          failed += 1;
        }
      }
      out.push({
        theme: id,
        locations: theme.locations.length,
        samples: theme.samples.length,
        failed,
        audioSeconds: Math.round(seconds),
        mp3MB: Number((mp3Bytes / 1048576).toFixed(2)),
        decodedMB: Number((decodedBytes / 1048576).toFixed(1)),
        decodedPerMp3: Number((decodedBytes / Math.max(1, mp3Bytes)).toFixed(1)),
      });
    }
    return out;
  });

  // --- 2. Studio met 12 clips, 6 s afspelen ---
  await page.getByRole('button', { name: 'Nieuwe soundscape' }).click();
  await page.getByRole('button', { name: 'Volgende' }).click();
  await page.getByRole('button', { name: /De Stad/ }).click();
  await page.getByTitle('De Kinderboerderij').click();
  await page.locator('button.hotspot').first().waitFor({ timeout: 20000 });
  for (let i = 0; i < 6; i++) {
    await page.locator('button.hotspot:not([disabled])').first().click({ force: true });
    await page.waitForTimeout(300);
  }
  await page.getByRole('button', { name: 'Naar Studio' }).click();
  await page.getByRole('heading', { name: 'Studio' }).waitFor();
  await page.waitForTimeout(1500);

  const clipCount = await page.evaluate(async () => {
    const { useTimelineStore } = await import('/src/stores/timelineStore.ts');
    const { useLibraryStore } = await import('/src/stores/libraryStore.ts');
    const samples = useLibraryStore.getState().librarySamples;
    let n = 0;
    samples.forEach((sample: { id: string }, i: number) => {
      for (const start of [0, 16]) {
        useTimelineStore.getState().addClip(i % 6, { id: `perf-${i}-${start}`, sampleId: sample.id, startBeat: start + i }, samples);
        n += 1;
      }
    });
    return n;
  });
  await page.locator('[role="listitem"]').first().waitFor();

  const idle = await page.evaluate(() => ({
    domNodes: document.querySelectorAll('*').length,
    heapMB: 'memory' in performance
      ? Number(((performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize / 1048576).toFixed(1))
      : null,
  }));

  await page.getByRole('button', { name: 'Afspelen' }).click();
  await page.waitForTimeout(1000); // aanloop

  const playback = await page.evaluate(async () => {
    const { useAudioStore } = await import('/src/stores/audioStore.ts');
    let beatUpdates = 0, last = useAudioStore.getState().currentBeat;
    const unsub = useAudioStore.subscribe((s: { currentBeat: number }) => {
      if (s.currentBeat !== last) { beatUpdates += 1; last = s.currentBeat; }
    });
    let longTasks = 0;
    const po = new PerformanceObserver((list) => { longTasks += list.getEntries().length; });
    try { po.observe({ entryTypes: ['longtask'] }); } catch { /* niet ondersteund */ }

    const frames: number[] = [];
    const seconds = 6;
    await new Promise<void>((resolve) => {
      const start = performance.now();
      let prev = start;
      const tick = (now: number) => {
        frames.push(now - prev);
        prev = now;
        if (now - start < seconds * 1000) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    unsub();
    po.disconnect();
    const sorted = [...frames].sort((a, b) => a - b);
    const playing = useAudioStore.getState().isPlaying;
    return {
      seconds,
      stillPlaying: playing,
      fps: Number((frames.length / seconds).toFixed(1)),
      frameMsP50: Number(sorted[Math.floor(sorted.length * 0.5)].toFixed(1)),
      frameMsP95: Number(sorted[Math.floor(sorted.length * 0.95)].toFixed(1)),
      frameMsMax: Number(sorted[sorted.length - 1].toFixed(1)),
      framesOver33ms: frames.filter((f) => f > 33.4).length,
      longTasks,
      currentBeatUpdatesPerSecond: Number((beatUpdates / seconds).toFixed(1)),
    };
  });

  const after = await page.evaluate(() => ({
    heapMB: 'memory' in performance
      ? Number(((performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize / 1048576).toFixed(1))
      : null,
  }));

  writeJson('docs/v2/baseline/perf-baseline.json', {
    measuredAt: new Date().toISOString().slice(0, 10),
    environment: {
      note: 'Headless Chromium op een ontwikkelmachine — vergelijkingsbasis, geen schoolapparaat.',
      chromium: browser.version(),
      platform: process.platform,
      viewport: '1366x768',
    },
    themes,
    studio: { clips: clipCount, ...idle, heapAfterPlaybackMB: after.heapMB },
    playback,
  });

  expect(themes.length).toBeGreaterThan(0);
  expect(playback.fps).toBeGreaterThan(0);
});
