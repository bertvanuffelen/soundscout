/**
 * Fase 1 — de afspeelklok in de presentatieschermen en in de voorbeeld-vensters.
 *
 * 1. PresentationSurface (via een lokale testopstelling, zie
 *    e2e/harness/presentationHarness.tsx — de echte schermen halen hun data uit
 *    Supabase en zitten deels achter een login):
 *     - tijdens afspelen beweegt de afspeellijn, maar React rendert NIET mee;
 *     - pauze houdt de lijn vast, hervatten gaat verder, terugspoelen zet hem op 0;
 *     - aan het einde springt de lijn terug; met "Doorspelen" start de volgende.
 * 2. Trim- en effectenvenster in de studio: de voorbeeld-afspeellijn loopt over
 *    de golfvorm en verdwijnt aan het einde.
 */
import { test, expect, type Page } from '@playwright/test';
import { prepare } from './helpers';

test('presentatiescherm: afspeellijn loopt zonder React-renders', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await prepare(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Nieuwe soundscape' }).waitFor();
  await page.evaluate(async () => {
    const harness = await import('/e2e/harness/presentationHarness.tsx');
    harness.mountPresentation();
  });

  const surface = page.locator('#presentation-harness');
  const handle = surface.getByRole('slider', { name: 'Afspeelpositie' });
  const play = surface.getByRole('button', { name: 'Afspelen', exact: true });
  const pause = surface.getByRole('button', { name: 'Pauzeren', exact: true });
  const leftPercent = () => handle.evaluate((el) => parseFloat((el as HTMLElement).style.left || '0'));
  const commits = () => page.evaluate(() => window.__presentation!.commits);

  await handle.waitFor({ timeout: 20000 });
  await expect(play).toBeEnabled();
  expect(await leftPercent()).toBe(0);

  // --- Afspelen: de lijn beweegt, React niet ---
  await play.click();
  await pause.waitFor();
  await page.waitForTimeout(500);
  const commitsBefore = await commits();
  const leftA = await leftPercent();
  await page.waitForTimeout(1000);
  const leftB = await leftPercent();
  const commitsDuring = (await commits()) - commitsBefore;
  expect(leftA, 'de afspeellijn is vertrokken').toBeGreaterThan(0);
  expect(leftB, 'de afspeellijn loopt door').toBeGreaterThan(leftA);
  expect(commitsDuring, 'geen React-renders tijdens één seconde afspelen').toBe(0);
  test.info().annotations.push({ type: 'meting', description: `React-commits tijdens 1 s afspelen: ${commitsDuring}` });

  // --- Pauze: de lijn staat stil ---
  await pause.click();
  await play.waitFor();
  await page.waitForTimeout(150);
  const leftPaused = await leftPercent();
  expect(leftPaused).toBeGreaterThan(0);
  await page.waitForTimeout(400);
  expect(await leftPercent(), 'de lijn staat stil tijdens pauze').toBe(leftPaused);

  // --- Hervatten gaat verder, niet terug naar 0 ---
  await play.click();
  await pause.waitFor();
  await page.waitForTimeout(500);
  expect(await leftPercent()).toBeGreaterThan(leftPaused);
  await pause.click();
  await play.waitFor();

  // --- Terugspoelen ---
  await surface.getByRole('button', { name: 'Terug', exact: true }).click();
  await page.waitForTimeout(150);
  expect(await leftPercent()).toBe(0);

  // --- Einde zonder Doorspelen: terug naar 0, blijft op 1/2 ---
  await play.click();
  await pause.waitFor();
  await play.waitFor({ timeout: 15000 });
  await page.waitForTimeout(150);
  expect(await leftPercent(), 'na het einde staat de lijn weer vooraan').toBe(0);
  await expect(surface.getByText('· 1/2')).toBeVisible();

  // --- Einde mét Doorspelen: de volgende start vanzelf ---
  await surface.getByRole('button', { name: 'Doorspelen' }).click();
  await play.click();
  await expect(surface.getByText('· 2/2')).toBeVisible({ timeout: 15000 });
  await pause.waitFor({ timeout: 15000 });
  await page.waitForTimeout(600);
  expect(await leftPercent(), 'de volgende compositie speelt').toBeGreaterThan(0);
});

async function openStudioWithClip(page: Page): Promise<void> {
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
    useTimelineStore.getState().addClip(0, { id: 'preview-clip', sampleId: samples[0].id, startBeat: 0 }, samples);
  });
  await page.locator('[role="listitem"]').first().click();
}

for (const modal of [
  { name: 'trimvenster', open: 'Inkorten' },
  { name: 'effectenvenster', open: 'Vervormen' },
]) {
  test(`${modal.name}: voorbeeld-afspeellijn loopt en verdwijnt`, async ({ page }) => {
    await openStudioWithClip(page);
    await page.getByRole('button', { name: modal.open, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('canvas').waitFor();
    const line = dialog.locator('canvas + div');
    await expect(line).toBeHidden();

    await dialog.getByRole('button', { name: 'Voorbeeld' }).click();
    await expect(line).toBeVisible();
    const left = () => line.evaluate((el) => parseFloat((el as HTMLElement).style.left || '0'));
    const first = await left();
    await page.waitForTimeout(400);
    expect(await left(), 'de lijn loopt over de golfvorm').toBeGreaterThan(first);

    // Aan het einde van het geluid verdwijnt de lijn vanzelf
    await expect(line).toBeHidden({ timeout: 15000 });

    // Opnieuw starten en zelf stoppen
    await dialog.getByRole('button', { name: 'Voorbeeld' }).click();
    await expect(line).toBeVisible();
    await dialog.getByRole('button', { name: 'Voorbeeld' }).click();
    await expect(line).toBeHidden();
  });
}
