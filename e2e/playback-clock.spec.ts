/**
 * Fase 1 — de afspeelklok.
 *
 * Bewaakt het nieuwe gedrag:
 *  - tijdens afspelen wijzigt `audioStore.currentBeat` NIET (0 store-updates);
 *  - de afspeellijn beweegt wél, per frame, direct in de DOM;
 *  - de hoorbare positie loopt achter op de transportklok (lookahead +
 *    uitvoervertraging) en nooit ervoor;
 *  - bij pauze blijft de lijn staan en kent de store de rustpositie;
 *  - toetsenbord-seek en terugspoelen verplaatsen de lijn in rust.
 */
import { test, expect } from '@playwright/test';
import { prepare } from './helpers';

test('afspeelklok: speelt, pauzeert, zoekt en spoelt terug', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await prepare(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Nieuwe soundscape' }).click();
  await page.getByRole('button', { name: 'Volgende' }).click();
  await page.getByRole('button', { name: /De Stad/ }).click();
  await page.getByTitle('De Kinderboerderij').click();
  await page.locator('button.hotspot').first().waitFor({ timeout: 20000 });
  for (let i = 0; i < 3; i++) {
    await page.locator('button.hotspot:not([disabled])').first().click({ force: true });
    await page.waitForTimeout(300);
  }
  await page.getByRole('button', { name: 'Naar Studio' }).click();
  await page.getByRole('heading', { name: 'Studio' }).waitFor();
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const { useTimelineStore } = await import('/src/stores/timelineStore.ts');
    const { useLibraryStore } = await import('/src/stores/libraryStore.ts');
    const samples = useLibraryStore.getState().librarySamples;
    samples.forEach((sample: { id: string }, i: number) => {
      for (const start of [0, 16, 32]) {
        useTimelineStore.getState().addClip(i, { id: `clk-${i}-${start}`, sampleId: sample.id, startBeat: start }, samples);
      }
    });
  });
  await page.locator('[role="listitem"]').first().waitFor();

  const handle = page.getByRole('slider', { name: 'Afspeelpositie' });
  const leftPercent = () => handle.evaluate((el) => parseFloat((el as HTMLElement).style.left || '0'));
  const state = () => page.evaluate(async () => {
    const { useAudioStore } = await import('/src/stores/audioStore.ts');
    const { audioService } = await import('/src/services/AudioService.ts');
    const { useTimelineStore } = await import('/src/stores/timelineStore.ts');
    return {
      storeBeat: useAudioStore.getState().currentBeat,
      isPlaying: useAudioStore.getState().isPlaying,
      transportBeat: audioService.getCurrentBeat(),
      audibleBeat: audioService.getAudibleBeat(),
      totalBeats: useTimelineStore.getState().totalBeats,
    };
  });

  expect(await leftPercent()).toBe(0);

  // --- Afspelen ---
  await page.getByRole('button', { name: 'Afspelen', exact: true }).click();
  await page.waitForTimeout(1500);
  const playing = await state();
  const leftWhilePlaying = await leftPercent();
  expect(playing.isPlaying).toBe(true);
  expect(playing.storeBeat, 'de store wijzigt niet tijdens afspelen').toBe(0);
  expect(leftWhilePlaying, 'de afspeellijn beweegt').toBeGreaterThan(0);
  expect(playing.audibleBeat, 'hoorbaar loopt nooit voor op de transportklok').toBeLessThanOrEqual(playing.transportBeat);
  // lookahead (0,1 s = 0,2 tel) + uitvoervertraging: tussen 0,1 en 1,5 tel achter
  const lag = playing.transportBeat - playing.audibleBeat;
  expect(lag).toBeGreaterThan(0.1);
  expect(lag).toBeLessThan(1.5);
  test.info().annotations.push({ type: 'meting', description: `hoorbaar loopt ${lag.toFixed(3)} tel achter op de transportklok` });

  // --- Pauzeren: lijn staat stil, store kent de rustpositie ---
  await page.getByRole('button', { name: 'Pauze', exact: true }).click();
  await page.waitForTimeout(200);
  const paused = await state();
  const leftPaused = await leftPercent();
  expect(paused.isPlaying).toBe(false);
  expect(paused.storeBeat).toBeGreaterThan(1);
  expect(leftPaused).toBeCloseTo((paused.storeBeat / paused.totalBeats) * 100, 3);
  await page.waitForTimeout(500);
  expect(await leftPercent(), 'de lijn staat stil tijdens pauze').toBe(leftPaused);

  // --- Toetsenbord: één tel vooruit ---
  await handle.focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  const sought = await state();
  expect(sought.storeBeat).toBeCloseTo(paused.storeBeat + 1, 3);
  expect(await leftPercent()).toBeCloseTo((sought.storeBeat / sought.totalBeats) * 100, 3);
  await expect(handle).toHaveAttribute('aria-valuenow', String(Math.round(sought.storeBeat)));

  // --- Hervatten en weer pauzeren: gaat verder, niet terug naar 0 ---
  await page.getByRole('button', { name: 'Afspelen', exact: true }).click();
  await page.waitForTimeout(800);
  expect(await leftPercent()).toBeGreaterThan(leftPaused);
  await page.getByRole('button', { name: 'Pauze', exact: true }).click();

  // --- Terugspoelen ---
  await page.getByRole('button', { name: 'Terug', exact: true }).click();
  await page.waitForTimeout(200);
  expect((await state()).storeBeat).toBe(0);
  expect(await leftPercent()).toBe(0);
});
